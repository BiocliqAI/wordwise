const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5002;

// Add no-cache headers to prevent browser caching
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use(cors());

// Import word lists
const { TARGET_WORDS, FINAL_VALID_GUESSES } = require('./words.js');

// Debug word lists
console.log('TARGET_WORDS loaded:', TARGET_WORDS?.length || 0);
console.log('FINAL_VALID_GUESSES loaded:', FINAL_VALID_GUESSES?.length || 0);

// Game state
const gameRooms = new Map();
const MAX_PLAYERS = 5;

class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.currentWord = this.getRandomWord();
    this.gameActive = false;
    this.winner = null;
    this.startTime = null;
    this.playAgainRequested = false;
  }

  getRandomWord() {
    return TARGET_WORDS[Math.floor(Math.random() * TARGET_WORDS.length)];
  }

  addPlayer(socketId, playerName) {
    if (this.players.size >= MAX_PLAYERS) {
      return false;
    }

    const player = {
      id: socketId,
      name: playerName,
      board: Array(6).fill(null).map(() => Array(5).fill('')),
      colors: Array(6).fill(null).map(() => Array(5).fill('')),
      currentRow: 0,
      currentCol: 0,
      gameOver: false,
      won: false,
      connected: true
    };

    this.players.set(socketId, player);
    return true;
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      // Mark player as disconnected instead of deleting
      player.connected = false;
      player.disconnectedAt = Date.now();
      console.log(`Player ${player.name} marked as disconnected`);
    }
  }

  // Clean up truly disconnected players (not used for over 24 hours)
  cleanupDisconnectedPlayers() {
    const now = Date.now();
    const disconnectedPlayers = [];
    
    this.players.forEach((player, socketId) => {
      if (!player.connected && (now - player.disconnectedAt) > 24 * 60 * 60 * 1000) {
        disconnectedPlayers.push(socketId);
      }
    });
    
    disconnectedPlayers.forEach(socketId => {
      this.players.delete(socketId);
      console.log(`Cleaned up old disconnected player: ${socketId}`);
    });
  }

  makeGuess(socketId, guess) {
    const player = this.players.get(socketId);
    if (!player || player.gameOver || !this.gameActive) return false;

    // Validate guess
    if (!FINAL_VALID_GUESSES.includes(guess.toLowerCase())) {
      return { valid: false, reason: 'Invalid word' };
    }

    const word = this.currentWord;
    const colors = this.calculateColors(guess, word);
    
    // Update player board
    player.board[player.currentRow] = guess.split('');
    player.colors[player.currentRow] = colors;
    player.currentRow++;

    // Check win condition
    if (guess.toLowerCase() === word.toLowerCase()) {
      player.won = true;
      player.gameOver = true;
      this.winner = player.name;
      this.gameActive = false;
    } else if (player.currentRow >= 6) {
      player.gameOver = true;
    }

    return { valid: true, colors, gameOver: player.gameOver, won: player.won };
  }

  calculateColors(guess, word) {
    const colors = Array(5).fill('gray');
    const wordArray = word.toLowerCase().split('');
    const guessArray = guess.toLowerCase().split('');

    // First pass: mark greens
    for (let i = 0; i < 5; i++) {
      if (guessArray[i] === wordArray[i]) {
        colors[i] = 'green';
        wordArray[i] = null;
        guessArray[i] = null;
      }
    }

    // Second pass: mark yellows
    for (let i = 0; i < 5; i++) {
      if (guessArray[i] && wordArray.includes(guessArray[i])) {
        colors[i] = 'yellow';
        const index = wordArray.indexOf(guessArray[i]);
        wordArray[index] = null;
      }
    }

    return colors;
  }

  getGameState() {
    const playersState = {};
    this.players.forEach((player, socketId) => {
      playersState[socketId] = {
        name: player.name,
        board: player.board,
        colors: player.colors,
        currentRow: player.currentRow,
        gameOver: player.gameOver,
        won: player.won
      };
    });

    return {
      roomId: this.roomId,
      players: playersState,
      gameActive: this.gameActive,
      winner: this.winner,
      currentWord: this.currentWord,
      playerCount: this.players.size
    };
  }

  resetGame(newWord = false) {
    // Only generate new word if explicitly requested or no word exists
    if (newWord || !this.currentWord) {
      const oldWord = this.currentWord;
      this.currentWord = this.getRandomWord();
      console.log(`Word changed from "${oldWord}" to "${this.currentWord}" (newWord: ${newWord})`);
    } else {
      console.log(`Keeping existing word: "${this.currentWord}"`);
    }
    this.gameActive = true;
    this.winner = null;
    this.startTime = Date.now();
    this.playAgainRequested = false; // Reset play again flag

    this.players.forEach(player => {
      player.board = Array(6).fill(null).map(() => Array(5).fill(''));
      player.colors = Array(6).fill(null).map(() => Array(5).fill(''));
      player.currentRow = 0;
      player.currentCol = 0;
      player.gameOver = false;
      player.won = false;
    });
  }
}

// Load saved rooms on server start
function loadSavedRooms() {
  try {
    const fs = require('fs');
    if (fs.existsSync('game-rooms.json')) {
      const savedData = JSON.parse(fs.readFileSync('game-rooms.json', 'utf8'));
      console.log('Loading saved game rooms:', Object.keys(savedData));
      
      Object.entries(savedData).forEach(([roomId, roomData]) => {
        const room = new GameRoom(roomId);
        room.currentWord = roomData.currentWord;
        room.gameActive = roomData.gameActive;
        room.winner = roomData.winner;
        room.startTime = roomData.startTime;
        
        // Restore players
        Object.entries(roomData.players).forEach(([socketId, playerData]) => {
          room.players.set(socketId, { ...playerData, connected: false });
        });
        
        gameRooms.set(roomId, room);
      });
    }
  } catch (error) {
    console.error('Error loading saved rooms:', error);
  }
}

// Save rooms to file
function saveRoomsToFile() {
  try {
    const fs = require('fs');
    const roomsData = {};
    
    gameRooms.forEach((room, roomId) => {
      const players = {};
      room.players.forEach((player, socketId) => {
        players[socketId] = {
          name: player.name,
          board: player.board,
          colors: player.colors,
          currentRow: player.currentRow,
          currentCol: player.currentCol,
          gameOver: player.gameOver,
          won: player.won
        };
      });
      
      roomsData[roomId] = {
        currentWord: room.currentWord,
        gameActive: room.gameActive,
        winner: room.winner,
        startTime: room.startTime,
        players: players
      };
    });
    
    fs.writeFileSync('game-rooms.json', JSON.stringify(roomsData, null, 2));
    console.log('Game rooms saved to file');
  } catch (error) {
    console.error('Error saving rooms:', error);
  }
}

// Load saved rooms on startup
loadSavedRooms();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join-room', ({ roomId, playerName }) => {
    console.log('Player attempting to join:', { roomId, playerName, socketId: socket.id });
    let room = gameRooms.get(roomId);
    
    if (!room) {
      console.log('Creating new room:', roomId);
      room = new GameRoom(roomId);
      gameRooms.set(roomId, room);
    }

    // Check if player name already exists in the room
    let existingPlayerSocketId = null;
    for (const [socketId, player] of room.players) {
      if (player.name === playerName) {
        existingPlayerSocketId = socketId;
        break;
      }
    }

    // If player name exists, kick out the existing player
    if (existingPlayerSocketId) {
      console.log(`Kicking out existing player with name "${playerName}" (socket: ${existingPlayerSocketId})`);
      
      // Get the existing socket and disconnect it
      const existingSocket = io.sockets.sockets.get(existingPlayerSocketId);
      if (existingSocket) {
        existingSocket.emit('player-kicked', { 
          reason: `Another player joined with your name "${playerName}"` 
        });
        existingSocket.disconnect(true);
      }
      
      // Remove the existing player from the room
      room.players.delete(existingPlayerSocketId);
    }

    if (room.addPlayer(socket.id, playerName)) {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerName = playerName;

      // Send current game state to the new player
      const gameState = room.getGameState();
      console.log('Sending game-state:', JSON.stringify(gameState, null, 2));
      socket.emit('game-state', gameState);

      // Notify all players in the room
      io.to(roomId).emit('player-joined', {
        playerName,
        playerCount: room.players.size
      });

      // Start game if we have at least 1 player and game isn't active (changed for testing)
      if (room.players.size >= 1 && !room.gameActive) {
        room.resetGame(false); // Don't generate new word, keep existing one
        io.to(roomId).emit('game-started', room.getGameState());
      }
      
      // Save updated room state
      saveRoomsToFile();
    } else {
      socket.emit('room-full');
    }
  });

  socket.on('rejoin-room', ({ roomId, playerName }) => {
    console.log('Player attempting to rejoin:', { roomId, playerName, socketId: socket.id });
    const room = gameRooms.get(roomId);
    
    if (!room) {
      console.log('Room not found for rejoin, creating new room and joining');
      // Create new room and add player
      const newRoom = new GameRoom(roomId);
      gameRooms.set(roomId, newRoom);
      
      if (newRoom.addPlayer(socket.id, playerName)) {
        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerName = playerName;
        socket.emit('game-state', newRoom.getGameState());
        
        if (newRoom.players.size >= 1 && !newRoom.gameActive) {
          newRoom.resetGame(false);
          io.to(roomId).emit('game-started', newRoom.getGameState());
        }
      }
      return;
    }

    // Look for existing player data by name
    let existingPlayer = null;
    let oldSocketId = null;
    
    for (const [socketId, player] of room.players) {
      if (player.name === playerName) {
        existingPlayer = player;
        oldSocketId = socketId;
        break;
      }
    }

    if (existingPlayer) {
      console.log('Found existing player data, restoring...', {
        name: existingPlayer.name,
        currentRow: existingPlayer.currentRow,
        boardHasData: existingPlayer.board.some(row => row.some(cell => cell !== ''))
      });
      
      // Update player connection status and socket ID
      if (oldSocketId !== socket.id) {
        room.players.delete(oldSocketId);
      }
      existingPlayer.id = socket.id;
      existingPlayer.connected = true;
      delete existingPlayer.disconnectedAt;
      room.players.set(socket.id, existingPlayer);
      
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerName = playerName;

      // Send current game state to restore the player
      socket.emit('rejoin-success', room.getGameState());
      
      // Save updated room state
      saveRoomsToFile();
      
      console.log('Player rejoined successfully with restored state');
    } else {
      console.log('No existing player data found, treating as new join');
      // Treat as new player
      if (room.addPlayer(socket.id, playerName)) {
        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerName = playerName;
        socket.emit('rejoin-success', room.getGameState());
      } else {
        socket.emit('room-full');
      }
    }
  });

  socket.on('make-guess', ({ guess }) => {
    const room = gameRooms.get(socket.roomId);
    if (!room) return;

    const result = room.makeGuess(socket.id, guess);
    if (result.valid) {
      // Broadcast updated game state to all players
      io.to(socket.roomId).emit('game-state', room.getGameState());
      
      // Save game state to file
      saveRoomsToFile();
      
      // Check if game should end
      if (result.won) {
        // Someone won
        io.to(socket.roomId).emit('game-ended', {
          winner: room.winner,
          word: room.currentWord
        });
      } else {
        // Check if all players have lost (reached max attempts)
        const allPlayersLost = Array.from(room.players.values()).every(player => 
          player.gameOver && !player.won
        );
        
        if (allPlayersLost) {
          room.gameActive = false;
          io.to(socket.roomId).emit('game-ended', {
            winner: null,
            word: room.currentWord
          });
        }
      }
    } else {
      socket.emit('invalid-guess', result.reason);
    }
  });

  socket.on('reset-game', () => {
    const room = gameRooms.get(socket.roomId);
    if (room && room.players.size >= 1) {
      // Check if play again was already requested
      if (room.playAgainRequested) {
        console.log('Play again already requested by another player, ignoring');
        return;
      }
      
      // Mark play again as requested
      room.playAgainRequested = true;
      const playerName = room.players.get(socket.id)?.name || 'Someone';
      
      // Notify all players who triggered the reset
      io.to(socket.roomId).emit('play-again-triggered', { 
        playerName: playerName 
      });
      
      // Reset the game
      room.resetGame(true); // Generate new word for manual reset
      io.to(socket.roomId).emit('game-started', room.getGameState());
    }
  });

  socket.on('master-reset', () => {
    console.log('🔄 Master reset initiated by:', socket.id);
    
    try {
      // Clear all game rooms from memory
      gameRooms.clear();
      console.log('✅ All game rooms cleared from memory');
      
      // Delete the persistent storage file
      const fs = require('fs');
      if (fs.existsSync('game-rooms.json')) {
        fs.unlinkSync('game-rooms.json');
        console.log('✅ Persistent storage file deleted');
      }
      
      // Clear all socket rooms and disconnect all clients
      const sockets = io.sockets.sockets;
      sockets.forEach((clientSocket) => {
        // Clear socket properties
        delete clientSocket.roomId;
        delete clientSocket.playerName;
        // Leave all rooms
        clientSocket.rooms.forEach(room => {
          if (room !== clientSocket.id) {
            clientSocket.leave(room);
          }
        });
      });
      console.log('✅ All socket rooms cleared');
      
      // Notify all clients of the reset
      io.emit('master-reset-complete');
      console.log('✅ All clients notified of master reset');
      
      // Force disconnect all clients after a brief delay to ensure they receive the message
      setTimeout(() => {
        io.disconnectSockets();
        console.log('✅ All clients forcibly disconnected');
      }, 1500);
      
      console.log('🔄 Master reset completed successfully');
      
    } catch (error) {
      console.error('❌ Error during master reset:', error);
      socket.emit('master-reset-error', 'Reset failed: ' + error.message);
    }
  });

  socket.on('chat-message', ({ message, playerName, roomId }) => {
    console.log('Chat message received:', { message, playerName, roomId, socketId: socket.id });
    
    // Validate message
    if (!message || !playerName || !roomId) {
      console.log('Invalid chat message data');
      return;
    }
    
    // Validate message length
    if (message.length > 100) {
      console.log('Chat message too long');
      return;
    }
    
    // Check if socket is in the room
    if (socket.roomId !== roomId) {
      console.log('Socket not in specified room');
      return;
    }
    
    // Verify player exists in room
    const room = gameRooms.get(roomId);
    if (!room || !room.players.has(socket.id)) {
      console.log('Player not found in room');
      return;
    }
    
    // Broadcast message to all players in the room
    const chatData = {
      message: message.trim(),
      playerName: playerName,
      timestamp: Date.now()
    };
    
    io.to(roomId).emit('chat-message', chatData);
    console.log('Chat message broadcasted to room:', roomId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const room = gameRooms.get(socket.roomId);
    if (room) {
      const playerName = room.players.get(socket.id)?.name;
      room.removePlayer(socket.id);
      
      io.to(socket.roomId).emit('player-left', {
        playerName,
        playerCount: room.players.size
      });

      // Don't immediately delete rooms - keep them for rejoining
      if (room.players.size === 0) {
        console.log(`Room ${socket.roomId} is now empty, but keeping for potential rejoins`);
        // Set a timeout to delete the room after 30 minutes of inactivity
        setTimeout(() => {
          const currentRoom = gameRooms.get(socket.roomId);
          if (currentRoom && currentRoom.players.size === 0) {
            console.log(`Deleting inactive room: ${socket.roomId}`);
            gameRooms.delete(socket.roomId);
          }
        }, 30 * 60 * 1000); // 30 minutes
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Multiplayer Wordle server running on port ${PORT}`);
});