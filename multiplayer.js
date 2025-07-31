// Socket.IO connection
const socket = io();

socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Socket disconnected');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
});

// Game state
let gameState = {
    roomId: null,
    playerName: null,
    players: {},
    gameActive: false,
    winner: null,
    currentWord: null
};

// DOM elements
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const loginForm = document.getElementById('login-form');
const playerNameInput = document.getElementById('player-name');
// Room ID input was removed - always use 'default' room
const loginError = document.getElementById('login-error');
const roomIdDisplay = document.getElementById('room-id-display');
const playerCount = document.getElementById('player-count');
const playerNameDisplay = document.getElementById('player-name-display');
const resetGameBtn = document.getElementById('reset-game-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const gameOverModal = document.getElementById('game-over-modal');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');
const playAgainBtn = document.getElementById('play-again-btn');

// Chat elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

// Game variables
let currentRow = 0;
let currentCol = 0;
let gameOver = false;
let won = false;

// Commentary system variables
let commentaryEnabled = true;
let lastCommentaryTime = 0;
let commentaryQueue = [];
let playerStats = new Map(); // Track individual player statistics

// Initialize game
function initGame() {
    try {
        console.log('Initializing game...');
        createGameBoard();
        console.log('Game board created');
        createKeyboard();
        console.log('Keyboard created');
        // Ensure keyboard starts with clean colors
        clearKeyboardColors();
        setupEventListeners();
        console.log('Event listeners set up');
    } catch (error) {
        console.error('Error in initGame:', error);
    }
}

// Create game board
function createGameBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    for (let row = 0; row < 6; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'board-row';
        
        for (let col = 0; col < 5; col++) {
            const tile = document.createElement('div');
            tile.className = 'board-tile';
            tile.dataset.state = 'empty';
            tile.dataset.row = row;
            tile.dataset.col = col;
            rowDiv.appendChild(tile);
        }
        
        gameBoard.appendChild(rowDiv);
    }
}

// Create keyboard
function createKeyboard() {
    const keyboardContainer = document.getElementById('keyboard-container');
    keyboardContainer.innerHTML = '';
    
    const keyboard = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['Enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'Backspace']
    ];
    
    keyboard.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        
        row.forEach(key => {
            const button = document.createElement('button');
            
            // Use symbols for special keys to save space
            if (key === 'Backspace') {
                button.textContent = '⌫';
                button.setAttribute('aria-label', 'Backspace');
            } else if (key === 'Enter') {
                button.textContent = '↵';
                button.setAttribute('aria-label', 'Enter');
            } else {
                button.textContent = key;
            }
            
            button.dataset.key = key.toLowerCase();
            
            if (key === 'Enter' || key === 'Backspace') {
                button.className = 'wide-button';
            }
            
            rowDiv.appendChild(button);
        });
        
        keyboardContainer.appendChild(rowDiv);
    });
}

// Track event listener references for cleanup
let keydownListener = null;
let keyboardClickListener = null;
let masterResetListener = null;
let eventListenersSetup = false;
let masterResetInProgress = false;

// Setup event listeners
function setupEventListeners() {
    if (eventListenersSetup) {
        console.log('Event listeners already set up, skipping...');
        return;
    }
    
    console.log('Setting up event listeners...');
    eventListenersSetup = true;
    
    // Remove existing listeners first
    cleanupEventListeners();
    
    // Keyboard events
    keydownListener = handleKeyPress;
    document.addEventListener('keydown', keydownListener);
    
    // Keyboard click events
    keyboardClickListener = (e) => {
        if (e.target.tagName === 'BUTTON') {
            const key = e.target.dataset.key;
            if (key === 'enter') {
                handleEnter();
            } else if (key === 'backspace') {
                handleBackspace();
            } else {
                handleLetter(key);
            }
        }
    };
    document.getElementById('keyboard-container').addEventListener('click', keyboardClickListener);

    // Reset game button
    resetGameBtn.addEventListener('click', () => {
        socket.emit('reset-game');
    });

    // Leave room button
    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to leave the room?\n\nYou will return to the login screen.')) {
                // Set flag to prevent session restoration
                sessionStorage.setItem('voluntarily-left-room', 'true');
                sessionStorage.setItem('left-room-timestamp', Date.now().toString());
                socket.emit('leave-room');
            }
        });
    }

    // Play again button
    playAgainBtn.addEventListener('click', () => {
        gameOverModal.style.display = 'none';
        socket.emit('reset-game');
    });

    // Master reset button - prevent duplicate listeners
    const masterResetBtn = document.getElementById('master-reset-btn');
    if (masterResetBtn && !masterResetListener) {
        masterResetListener = () => {
            // Prevent multiple simultaneous resets
            if (masterResetInProgress) {
                console.log('Master reset already in progress, ignoring duplicate request');
                return;
            }
            
            if (confirm('🚨 MASTER RESET 🚨\n\nThis will:\n• Clear ALL players from ALL rooms\n• Reset ALL game boards\n• Clear server cache\n• Start completely fresh\n\nAre you sure you want to continue?')) {
                console.log('Master reset initiated by user');
                masterResetInProgress = true;
                socket.emit('master-reset');
            }
        };
        masterResetBtn.addEventListener('click', masterResetListener);
    }
}

// Cleanup event listeners
function cleanupEventListeners() {
    if (keydownListener) {
        document.removeEventListener('keydown', keydownListener);
        keydownListener = null;
    }
    if (keyboardClickListener) {
        const keyboardContainer = document.getElementById('keyboard-container');
        if (keyboardContainer) {
            keyboardContainer.removeEventListener('click', keyboardClickListener);
        }
        keyboardClickListener = null;
    }
    if (masterResetListener) {
        const masterResetBtn = document.getElementById('master-reset-btn');
        if (masterResetBtn) {
            masterResetBtn.removeEventListener('click', masterResetListener);
        }
        masterResetListener = null;
    }
}

// Join game
function joinGame() {
    const playerName = playerNameInput.value.trim();
    const roomId = 'default'; // Always use default room now
    
    console.log('Attempting to join game:', { playerName, roomId });
    console.log('Socket connected:', socket.connected);
    console.log('Socket ID:', socket.id);
    
    if (!playerName) {
        loginError.textContent = 'Please enter your name';
        return;
    }
    
    if (playerName.length > 20) {
        loginError.textContent = 'Name must be 20 characters or less';
        return;
    }
    
    // Check if socket is connected, if not, wait for connection
    if (!socket.connected) {
        console.log('Socket not connected, attempting to connect...');
        loginError.textContent = 'Connecting...';
        
        socket.connect();
        
        // Wait for connection before proceeding
        socket.on('connect', () => {
            console.log('Socket connected, now joining game...');
            loginError.textContent = '';
            proceedWithJoin(playerName, roomId);
        });
        
        // Timeout if connection fails
        setTimeout(() => {
            if (!socket.connected) {
                loginError.textContent = 'Connection failed. Please refresh and try again.';
            }
        }, 5000);
        
        return;
    }
    
    proceedWithJoin(playerName, roomId);
}

function proceedWithJoin(playerName, roomId) {
    gameState.playerName = playerName;
    gameState.roomId = roomId;
    
    // Save basic session for future restoration
    saveBasicSession();
    
    console.log('Emitting join-room event with socket:', socket.id);
    
    // Check if we're immediately after a master reset
    const masterResetFlag = sessionStorage.getItem('master-reset-performed');
    const isAfterReset = masterResetFlag === 'true';
    
    if (isAfterReset && !socket.connected) {
        console.log('Attempting join after master reset, waiting for reconnection...');
        loginError.textContent = 'Reconnecting...';
        
        // Wait for socket to reconnect before proceeding
        const checkConnection = () => {
            if (socket.connected) {
                console.log('Socket reconnected, proceeding with join...');
                loginError.textContent = '';
                socket.emit('join-room', { roomId, playerName });
            } else {
                setTimeout(checkConnection, 500);
            }
        };
        checkConnection();
    } else {
        socket.emit('join-room', { roomId, playerName });
    }
    
    // Add a timeout to detect if join is not responding (extended for post-reset scenarios)
    const timeoutDelay = isAfterReset ? 8000 : 5000;
    setTimeout(() => {
        if (loginScreen.classList.contains('active')) {
            console.warn('Join game seems to be taking too long, still on login screen');
            loginError.textContent = 'Connection issue. Please try again.';
        }
    }, timeoutDelay);
}

// Socket event handlers
socket.on('game-state', (state) => {
    try {
        console.log('Received game-state:', state);
        
        // Store previous state for commentary analysis
        const prevGameState = { ...gameState };
        
        // Preserve current player name before merging state
        const currentPlayerName = gameState.playerName;
        gameState = { ...gameState, ...state };
        
        // Extract player name from server data if available, otherwise preserve current
        const currentPlayer = state.players?.[socket.id];
        if (currentPlayer?.name) {
            gameState.playerName = currentPlayer.name;
        } else if (currentPlayerName) {
            // Preserve the player name if server data doesn't have it
            gameState.playerName = currentPlayerName;
        }
        
        console.log('Updated gameState.playerName:', gameState.playerName);
        
        // If this is the first game state after joining, transition to game screen
        if (loginScreen.classList.contains('active')) {
            console.log('Transitioning to game screen');
            // Clear any error messages since we successfully joined
            if (loginError) loginError.textContent = '';
            loginScreen.classList.remove('active');
            gameScreen.classList.add('active');
            initGame();
        }
        
        updateUI();
        
        // Analyze game state for commentary triggers
        if (prevGameState.players) {
            analyzeGameStateForCommentary(prevGameState, gameState);
        }
        
        // Save basic session info only (server handles game state)
        if (gameState.playerName && gameState.roomId) {
            saveBasicSession();
        }
    } catch (error) {
        console.error('Error handling game-state:', error);
    }
});

socket.on('player-joined', (data) => {
    showMessage(`${data.playerName} joined the game`);
    playerCount.textContent = `Players: ${data.playerCount}/5`;
    
    // Commentary for new player
    triggerCommentary('playerJoin', 'welcoming');
});

socket.on('player-left', (data) => {
    showMessage(`${data.playerName} left the game`);
    playerCount.textContent = `Players: ${data.playerCount}/5`;
    
    // Commentary for player leaving
    triggerCommentary('playerLeave', 'casual');
});

socket.on('game-started', (state) => {
    gameState = { ...gameState, ...state };
    gameOver = false;
    won = false;
    currentRow = 0;
    currentCol = 0;
    resetGameBtn.style.display = 'none';
    
    // Clear keyboard colors for new game
    clearKeyboardColors();
    
    showMessage('Game started!');
    updateUI();
    
    // Commentary for game start
    triggerCommentary('gameStart', 'dramatic');
});

socket.on('play-again-triggered', (data) => {
    showMessage(`${data.playerName} started a new game!`, 'success');
    
    // Hide play again button from modal for all players
    gameOverModal.style.display = 'none';
});

socket.on('game-ended', (data) => {
    gameOver = true;
    
    // Trigger confetti and win sound for all players when there's a winner
    if (data.winner) {
        createConfetti();
        playWinSound();
    }
    
    if (data.winner === gameState.playerName) {
        showGameOverModal('Congratulations!', 'You won!');
    } else if (data.winner) {
        showGameOverModal('Game Over', `${data.winner} won! The word was ${data.word.toUpperCase()}`);
    } else {
        showGameOverModal('Game Over', `The word was ${data.word.toUpperCase()}`);
    }
    resetGameBtn.style.display = 'inline-block';
    
    // Clear session when game ends
    clearSession();
});

socket.on('room-full', () => {
    loginError.textContent = 'Room is full (max 5 players)';
});

socket.on('invalid-guess', (reason) => {
    showMessage(reason, 'error');
    
    // Commentary for invalid word attempts
    updatePlayerStats(socket.id, 'invalidWord');
    triggerCommentary('invalidWord', 'sarcastic');
});

socket.on('rejoin-success', (state) => {
    try {
        console.log('Rejoin successful! Received state:', state);
        
        // Preserve current player name before merging state
        const currentPlayerName = gameState.playerName;
        gameState = { ...gameState, ...state };
        
        // Extract player name from server data if available, otherwise preserve current
        const currentPlayer = state.players?.[socket.id];
        if (currentPlayer?.name) {
            gameState.playerName = currentPlayer.name;
        } else if (currentPlayerName) {
            // Preserve the player name if server data doesn't have it
            gameState.playerName = currentPlayerName;
        }
        
        console.log('Rejoin - Updated gameState.playerName:', gameState.playerName);
        
        // Force transition to game screen with detailed logging
        console.log('Before screen transition:');
        console.log('- loginScreen has active class:', loginScreen.classList.contains('active'));
        console.log('- gameScreen has active class:', gameScreen.classList.contains('active'));
        
        loginScreen.classList.remove('active');
        gameScreen.classList.add('active');
        
        console.log('After screen transition:');
        console.log('- loginScreen has active class:', loginScreen.classList.contains('active'));
        console.log('- gameScreen has active class:', gameScreen.classList.contains('active'));
        
        // Initialize the game
        initGame();
        updateUI();
        
        console.log('Successfully restored to game screen');
    } catch (error) {
        console.error('Error handling rejoin-success:', error);
    }
});

socket.on('rejoin-failed', (data) => {
    console.log('Rejoin failed:', data.reason);
    
    // Clear session data since rejoin failed
    localStorage.removeItem('wordle-session');
    
    // Show login screen
    loginScreen.classList.add('active');
    gameScreen.classList.remove('active');
    
    // Reset game state
    gameState = {
        roomId: null,
        playerName: null,
        players: {},
        gameActive: false,
        winner: null,
        currentWord: null
    };
});

socket.on('master-reset-complete', () => {
    try {
        console.log('Master reset complete - clearing all local data');
        
        // Clear ALL storage completely
        localStorage.clear();
        sessionStorage.clear();
        
        // Set persistent flag to prevent session restoration
        sessionStorage.setItem('master-reset-performed', 'true');
        sessionStorage.setItem('master-reset-timestamp', Date.now().toString());
        
        // Double-check: explicitly remove any session data that might persist
        localStorage.removeItem('wordle-session');
        localStorage.removeItem('wordle-game-state');
        
        console.log('Master reset flags set:', {
            flag: sessionStorage.getItem('master-reset-performed'),
            timestamp: sessionStorage.getItem('master-reset-timestamp')
        });
        
        // Reset game state completely
        gameState = {
            roomId: null,
            playerName: null,
            players: {},
            gameActive: false,
            winner: null,
            currentWord: null
        };
        
        // Clean up existing event listeners and reset flags
        cleanupEventListeners();
        eventListenersSetup = false;
        masterResetInProgress = false;
        
        // Reset UI state
        currentRow = 0;
        currentCol = 0;
        gameOver = false;
        won = false;
        
        // Force return to login screen
        gameScreen.classList.remove('active');
        loginScreen.classList.add('active');
        
        // Clear login form completely
        if (playerNameInput) {
            playerNameInput.value = '';
            playerNameInput.blur();
        }
        if (loginError) loginError.textContent = '';
        
        // Clear any existing game board
        const gameBoard = document.getElementById('game-board');
        if (gameBoard) gameBoard.innerHTML = '';
        
        // Clear keyboard and its colors
        const keyboardContainer = document.getElementById('keyboard-container');
        if (keyboardContainer) {
            keyboardContainer.innerHTML = '';
        } else {
            // If keyboard exists, just clear colors
            clearKeyboardColors();
        }
        
        // Force socket to reconnect after master reset
        setTimeout(() => {
            if (!socket.connected) {
                console.log('Socket not connected after master reset, forcing reconnection...');
                socket.connect();
                
                // Clear any lingering error messages after reconnection
                setTimeout(() => {
                    if (loginError) loginError.textContent = '';
                }, 1000);
            } else {
                // Clear error message if socket is already connected
                if (loginError) loginError.textContent = '';
            }
        }, 1000); // Reduced delay from 2000ms to 1000ms
        
        alert('🔄 Master Reset Complete!\n\nAll players cleared.\nAll boards reset.\nServer cache cleared.\n\nYou can now start fresh!');
        
    } catch (error) {
        console.error('Error handling master-reset-complete:', error);
    }
});

// Chat message received
socket.on('chat-message', (data) => {
    displayChatMessage(data);
});

// Player kicked event
socket.on('player-kicked', (data) => {
    alert(`⚠️ You have been disconnected!\n\n${data.reason}\n\nYou can rejoin with a different name.`);
    
    // Clear session and return to login
    clearSession();
    gameState = {
        roomId: null,
        playerName: null,
        players: {},
        gameActive: false,
        winner: null,
        currentWord: null
    };
    
    // Return to login screen
    gameScreen.classList.remove('active');
    loginScreen.classList.add('active');
    
    // Clear login form
    if (playerNameInput) playerNameInput.value = '';
    if (loginError) loginError.textContent = '';
});

// Leave room event
socket.on('left-room', () => {
    console.log('Successfully left room');
    
    // Clear ALL storage completely
    localStorage.clear();
    
    // Clear session and return to login
    clearSession();
    gameState = {
        roomId: null,
        playerName: null,
        players: {},
        gameActive: false,
        winner: null,
        currentWord: null
    };
    
    // Return to login screen
    gameScreen.classList.remove('active');
    loginScreen.classList.add('active');
    
    // Clear login form
    if (playerNameInput) playerNameInput.value = '';
    if (loginError) loginError.textContent = '';
    
    showMessage('You have left the room', 'success');
});

// AI Commentary event handler
socket.on('commentary', (data) => {
    console.log('AI Commentary received:', data);
    if (data.message) {
        showCommentaryToast(data.message, data.style || 'ai', 4000);
    }
});

// Update UI based on game state
function updateUI() {
    // Update room info
    roomIdDisplay.textContent = `Room: ${gameState.roomId}`;
    playerCount.textContent = `Players: ${gameState.playerCount || 1}/5`;
    playerNameDisplay.textContent = `Player: ${gameState.playerName || '-'}`;
    
    // Update game board
    updateGameBoard();
    
    // Update players panel
    updatePlayersPanel();
}

// Update game board
function updateGameBoard() {
    const currentPlayer = gameState.players[socket.id];
    if (!currentPlayer) {
        console.log('No current player found for socket:', socket.id);
        console.log('Available players:', Object.keys(gameState.players || {}));
        return;
    }
    
    console.log('Updating game board for player:', currentPlayer.name);
    console.log('Player board state:', currentPlayer.board);
    console.log('Player colors state:', currentPlayer.colors);
    console.log('Player currentRow from server:', currentPlayer.currentRow);
    
    // Debug: Log the exact data we're trying to display
    for (let r = 0; r < Math.min(currentPlayer.currentRow, 6); r++) {
        console.log(`Row ${r}: board=`, currentPlayer.board[r], 'colors=', currentPlayer.colors[r]);
    }
    
    // Update tiles
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 5; col++) {
            const tile = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            const letter = currentPlayer.board[row]?.[col] || '';
            const color = currentPlayer.colors[row]?.[col] || '';
            
            if (letter || color) {
                console.log(`Tile [${row}][${col}]: letter="${letter}", color="${color}"`);
            }
            
            tile.textContent = letter;
            
            // Debug: Show what we're about to do
            console.log(`Tile [${row}][${col}]: letter="${letter}", color="${color}", current_state="${tile.dataset.state}"`);
            
            if (color === 'green') {
                tile.dataset.state = 'correct';
                console.log(`✅ Set tile [${row}][${col}] to CORRECT (green) - final state: ${tile.dataset.state}`);
            } else if (color === 'yellow') {
                tile.dataset.state = 'present';
                console.log(`🟡 Set tile [${row}][${col}] to PRESENT (yellow) - final state: ${tile.dataset.state}`);
            } else if (color === 'gray') {
                tile.dataset.state = 'absent';
                console.log(`⚫ Set tile [${row}][${col}] to ABSENT (gray) - final state: ${tile.dataset.state}`);
            } else if (letter) {
                tile.dataset.state = 'tbd';
                console.log(`❓ Set tile [${row}][${col}] to TBD (has letter "${letter}" but no color) - final state: ${tile.dataset.state}`);
            } else {
                tile.dataset.state = 'empty';
                console.log(`⬜ Set tile [${row}][${col}] to EMPTY - final state: ${tile.dataset.state}`);
            }
        }
    }
    
    // Update keyboard
    updateKeyboard(currentPlayer);
    
    // Update game state
    gameOver = currentPlayer.gameOver;
    won = currentPlayer.won;
    currentRow = currentPlayer.currentRow;
    currentCol = 0;
    
    console.log(`Game state updated: currentRow=${currentRow}, currentCol=${currentCol}, gameOver=${gameOver}, won=${won}`);
}

// Update keyboard colors
function updateKeyboard(player) {
    const keyboardButtons = document.querySelectorAll('#keyboard-container button');
    
    keyboardButtons.forEach(button => {
        const key = button.dataset.key;
        if (!key) return;
        
        let state = '';
        
        // Check all rows for this letter
        for (let row = 0; row < player.colors.length; row++) {
            for (let col = 0; col < 5; col++) {
                if (player.board[row]?.[col]?.toLowerCase() === key) {
                    const color = player.colors[row][col];
                    if (color === 'green') {
                        state = 'correct';
                    } else if (color === 'yellow' && state !== 'correct') {
                        state = 'present';
                    } else if (color === 'gray' && !state) {
                        state = 'absent';
                    }
                }
            }
        }
        
        // Always set the state (or clear it if empty)
        if (state) {
            button.dataset.state = state;
        } else {
            button.removeAttribute('data-state');
        }
    });
}

// Clear all keyboard colors
function clearKeyboardColors() {
    const keyboardButtons = document.querySelectorAll('#keyboard-container button');
    keyboardButtons.forEach(button => {
        button.removeAttribute('data-state');
    });
}

// Update players panel
function updatePlayersPanel() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
    Object.entries(gameState.players).forEach(([socketId, player]) => {
        const playerCard = createPlayerCard(player, socketId === socket.id);
        playersList.appendChild(playerCard);
    });
}

// Create player card
function createPlayerCard(player, isCurrentPlayer) {
    const card = document.createElement('div');
    card.className = 'player-card';
    
    const name = document.createElement('div');
    name.className = 'player-name';
    name.textContent = `${player.name} ${isCurrentPlayer ? '(You)' : ''}, wins: ${player.wins || 0}`;
    
    const status = document.createElement('div');
    status.className = 'player-status';
    if (player.won) {
        status.textContent = 'Won!';
        status.style.color = '#6aaa64';
    } else if (player.gameOver) {
        status.textContent = 'Lost';
        status.style.color = '#ff4d4d';
    } else if (gameState.gameActive) {
        status.textContent = `Row ${player.currentRow + 1}/6`;
    } else {
        status.textContent = 'Waiting...';
    }
    
    const miniBoard = document.createElement('div');
    miniBoard.className = 'mini-board';
    
    for (let row = 0; row < 6; row++) {
        const miniRow = document.createElement('div');
        miniRow.className = 'mini-row';
        
        for (let col = 0; col < 5; col++) {
            const miniTile = document.createElement('div');
            miniTile.className = 'mini-tile';
            
            const color = player.colors[row]?.[col];
            if (color) {
                miniTile.dataset.state = color === 'green' ? 'correct' : 
                                       color === 'yellow' ? 'present' : 'absent';
            } else {
                miniTile.dataset.state = 'empty';
            }
            
            miniRow.appendChild(miniTile);
        }
        
        miniBoard.appendChild(miniRow);
    }
    
    card.appendChild(name);
    card.appendChild(status);
    card.appendChild(miniBoard);
    
    return card;
}

// Handle key press
function handleKeyPress(e) {
    // Don't handle keystrokes if chat input is focused
    if (e.target === chatInput) return;
    
    if (gameOver || !gameState.gameActive) return;
    
    const key = e.key.toLowerCase();
    
    if (key === 'enter') {
        handleEnter();
    } else if (key === 'backspace') {
        handleBackspace();
    } else if (key.match(/[a-z]/)) {
        handleLetter(key);
    }
}

// Handle letter input
function handleLetter(letter) {
    if (currentCol < 5 && currentRow < 6) {
        const tile = document.querySelector(`[data-row="${currentRow}"][data-col="${currentCol}"]`);
        tile.textContent = letter;
        tile.dataset.state = 'tbd';
        currentCol++;
        
        // Track typing speed for commentary
        if (currentCol === 1) {
            window.wordStartTime = Date.now();
        } else if (currentCol === 5) {
            const typingTime = Date.now() - (window.wordStartTime || Date.now());
            if (typingTime < 2000) { // Less than 2 seconds for 5 letters
                updatePlayerStats(socket.id, 'fastTyping');
                if (Math.random() < 0.3) { // 30% chance to comment
                    triggerCommentary('fastTyping', 'impressed');
                }
            }
        }
    }
}

// Handle backspace
function handleBackspace() {
    if (currentCol > 0) {
        currentCol--;
        const tile = document.querySelector(`[data-row="${currentRow}"][data-col="${currentCol}"]`);
        tile.textContent = '';
        tile.dataset.state = 'empty';
    }
}

// Handle enter
function handleEnter() {
    if (currentCol !== 5) {
        showMessage('Not enough letters', 'error');
        return;
    }
    
    const guess = Array.from(document.querySelectorAll(`[data-row="${currentRow}"]`))
        .map(tile => tile.textContent)
        .join('');
    
    socket.emit('make-guess', { guess: guess.toLowerCase() });
}

// Show message
function showMessage(text, type = 'success') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }, 3000);
}

// Show game over modal
function showGameOverModal(title, message) {
    gameOverTitle.textContent = title;
    gameOverMessage.textContent = message;
    gameOverModal.style.display = 'flex';
}

// Chat functionality
function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message || !gameState.playerName || !gameState.roomId) return;
    
    // Send chat message to server
    socket.emit('chat-message', {
        message: message,
        playerName: gameState.playerName,
        roomId: gameState.roomId
    });
    
    // Clear input
    chatInput.value = '';
}

function displayChatMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    // Mark own messages differently
    if (data.playerName === gameState.playerName) {
        messageDiv.classList.add('own-message');
    } else {
        // Play sound for other players' messages (not your own)
        playChatSound();
    }
    
    const senderSpan = document.createElement('span');
    senderSpan.className = 'chat-sender';
    senderSpan.textContent = data.playerName + ':';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'chat-text';
    textSpan.textContent = data.message;
    
    messageDiv.appendChild(senderSpan);
    messageDiv.appendChild(textSpan);
    
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Limit chat history to 50 messages
    const messages = chatMessages.children;
    if (messages.length > 50) {
        chatMessages.removeChild(messages[0]);
    }
}

// Sound effects functions
function playChatSound() {
    try {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.log('Could not play chat sound:', error);
    }
}

function playWinSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Play a more elaborate celebratory melody
        const melody = [
            { freq: 523, time: 0.0, duration: 0.2 },  // C
            { freq: 659, time: 0.15, duration: 0.2 }, // E
            { freq: 784, time: 0.3, duration: 0.2 },  // G
            { freq: 1047, time: 0.45, duration: 0.3 }, // C (higher)
            { freq: 880, time: 0.6, duration: 0.2 },  // A
            { freq: 1047, time: 0.75, duration: 0.4 }, // C (sustain)
            // Add harmony
            { freq: 523, time: 0.45, duration: 0.6 },  // C harmony
            { freq: 659, time: 0.45, duration: 0.6 },  // E harmony
        ];
        
        melody.forEach((note) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(note.freq, audioContext.currentTime);
            oscillator.type = 'triangle';
            
            const startTime = audioContext.currentTime + note.time;
            const endTime = startTime + note.duration;
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
            
            oscillator.start(startTime);
            oscillator.stop(endTime);
        });
        
        // Add a celebratory drum-like sound
        setTimeout(() => {
            try {
                const drumContext = new (window.AudioContext || window.webkitAudioContext)();
                for (let i = 0; i < 3; i++) {
                    const oscillator = drumContext.createOscillator();
                    const gainNode = drumContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(drumContext.destination);
                    
                    oscillator.frequency.setValueAtTime(100, drumContext.currentTime);
                    oscillator.type = 'sawtooth';
                    
                    const startTime = drumContext.currentTime + (i * 0.1);
                    const duration = 0.05;
                    
                    gainNode.gain.setValueAtTime(0, startTime);
                    gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                    
                    oscillator.start(startTime);
                    oscillator.stop(startTime + duration);
                }
            } catch (error) {
                console.log('Could not play drum sound:', error);
            }
        }, 500);
        
    } catch (error) {
        console.log('Could not play win sound:', error);
    }
}

function createConfetti() {
    // Create confetti container
    const confettiContainer = document.createElement('div');
    confettiContainer.id = 'confetti-container';
    confettiContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        overflow: hidden;
    `;
    document.body.appendChild(confettiContainer);
    
    // Generate confetti pieces
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];
    const confettiCount = 100;
    
    for (let i = 0; i < confettiCount; i++) {
        const confettiPiece = document.createElement('div');
        confettiPiece.style.cssText = `
            position: absolute;
            width: ${Math.random() * 10 + 5}px;
            height: ${Math.random() * 10 + 5}px;
            background-color: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            top: -10px;
            opacity: ${Math.random() * 0.8 + 0.2};
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            animation: confettiFall ${Math.random() * 3 + 2}s linear forwards;
        `;
        confettiContainer.appendChild(confettiPiece);
    }
    
    // Remove confetti after animation
    setTimeout(() => {
        if (confettiContainer.parentNode) {
            confettiContainer.parentNode.removeChild(confettiContainer);
        }
    }, 5000);
}

function setupChatEventListeners() {
    // Send button click
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', sendChatMessage);
    }
    
    // Enter key in chat input
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendChatMessage();
            }
        });
        
        // Prevent game keystrokes when chat is focused
        chatInput.addEventListener('focus', () => {
            console.log('Chat input focused - game keystrokes disabled');
        });
        
        chatInput.addEventListener('blur', () => {
            console.log('Chat input blurred - game keystrokes enabled');
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    console.log('Login form found:', !!loginForm);
    console.log('Player name input found:', !!playerNameInput);
    console.log('Socket.IO loaded:', typeof io !== 'undefined');
    console.log('Socket connected:', socket.connected);
    
    // Check for existing session and restore if found
    checkAndRestoreSession();
    
    // Set up login form listener immediately
    setupLoginEventListeners();
    
    // Set up chat event listeners
    setupChatEventListeners();
    
    // Focus on name input
    if (playerNameInput) {
        playerNameInput.focus();
    }
});

// Check and restore session from localStorage
function checkAndRestoreSession() {
    console.log('=== SESSION RESTORATION CHECK ===');
    console.log('Checking for existing session...');
    
    // If user is manually logging in (login screen is active and form has focus), skip restoration
    if (loginScreen.classList.contains('active') && 
        document.activeElement === playerNameInput && 
        playerNameInput.value.trim() !== '') {
        console.log('User is actively logging in, skipping session restoration');
        return false;
    }
    try {
        // Check if master reset was recently performed
        const masterResetFlag = sessionStorage.getItem('master-reset-performed');
        const masterResetTimestamp = sessionStorage.getItem('master-reset-timestamp');
        
        console.log('Master reset check:', {
            flag: masterResetFlag,
            timestamp: masterResetTimestamp,
            currentTime: Date.now()
        });
        
        if (masterResetFlag === 'true') {
            console.log('Master reset was performed, checking if still valid...');
            
            // Keep the flag for 24 hours after master reset to prevent any auto-login
            if (masterResetTimestamp) {
                const resetAge = Date.now() - parseInt(masterResetTimestamp);
                const resetAgeHours = resetAge / (1000 * 60 * 60);
                console.log(`Master reset age: ${resetAgeHours.toFixed(2)} hours`);
                
                if (resetAge < 24 * 60 * 60 * 1000) { // 24 hours
                    console.log('Master reset still active (within 24 hours), skipping session restoration');
                    return false;
                } else {
                    console.log('Master reset expired after 24 hours, clearing flags');
                    sessionStorage.removeItem('master-reset-performed');
                    sessionStorage.removeItem('master-reset-timestamp');
                }
            } else {
                // If no timestamp, skip session restoration to be safe
                console.log('Master reset flag found without timestamp, skipping session restoration for safety');
                return false;
            }
        }
        
        // Check if player voluntarily left the room recently
        const leftRoomFlag = sessionStorage.getItem('voluntarily-left-room');
        const leftRoomTimestamp = sessionStorage.getItem('left-room-timestamp');
        
        console.log('Voluntary leave check:', {
            flag: leftRoomFlag,
            timestamp: leftRoomTimestamp,
            currentTime: Date.now()
        });
        
        if (leftRoomFlag === 'true') {
            console.log('Player voluntarily left room, checking if still valid...');
            
            // Keep the flag for 1 hour after leaving to prevent auto-rejoin
            if (leftRoomTimestamp) {
                const leftAge = Date.now() - parseInt(leftRoomTimestamp);
                const leftAgeMinutes = leftAge / (1000 * 60);
                console.log(`Left room age: ${leftAgeMinutes.toFixed(2)} minutes`);
                
                if (leftAge < 60 * 60 * 1000) { // 1 hour
                    console.log('Voluntary leave still active (within 1 hour), skipping session restoration');
                    return false;
                } else {
                    console.log('Voluntary leave expired after 1 hour, clearing flags');
                    sessionStorage.removeItem('voluntarily-left-room');
                    sessionStorage.removeItem('left-room-timestamp');
                }
            } else {
                // If no timestamp, skip session restoration to be safe
                console.log('Voluntary leave flag found without timestamp, skipping session restoration for safety');
                return false;
            }
        }
        
        // Check if this is a brand new session (user just opened a new tab/window)
        const isNewSession = !sessionStorage.getItem('session-initialized');
        if (isNewSession) {
            console.log('Brand new session detected, skipping restoration to avoid conflicts');
            sessionStorage.setItem('session-initialized', 'true');
            return false;
        }

        const savedSession = localStorage.getItem('wordle-session');
        console.log('Raw localStorage data:', savedSession);
        
        if (savedSession) {
            const session = JSON.parse(savedSession);
            console.log('Found saved session:', session);
            
            // Check if session is still valid (not too old)
            const sessionAge = Date.now() - session.timestamp;
            const sessionAgeHours = sessionAge / (1000 * 60 * 60);
            console.log(`Session age: ${sessionAgeHours.toFixed(2)} hours (${sessionAge} ms)`);
            
            if (sessionAge < 24 * 60 * 60 * 1000) { // 24 hours
                console.log('Session valid, restoring...');
                gameState.playerName = session.playerName;
                gameState.roomId = session.roomId;
                
                // Wait for socket to connect before rejoining
                if (socket.connected) {
                    console.log('Socket already connected, rejoining immediately...');
                    setTimeout(() => {
                        socket.emit('rejoin-room', { 
                            roomId: session.roomId, 
                            playerName: session.playerName 
                        });
                    }, 100); // Small delay to ensure socket is fully ready
                } else {
                    console.log('Socket not connected yet, waiting...');
                    const rejoinHandler = () => {
                        console.log('Socket connected, now rejoining...');
                        socket.emit('rejoin-room', { 
                            roomId: session.roomId, 
                            playerName: session.playerName 
                        });
                        socket.off('connect', rejoinHandler); // Remove listener after use
                    };
                    socket.on('connect', rejoinHandler);
                }
                
                // Pre-fill the name in case rejoin fails
                if (playerNameInput) {
                    playerNameInput.value = session.playerName;
                }
                return true;
            } else {
                console.log('Session expired, clearing...');
                localStorage.removeItem('wordle-session');
            }
        } else {
            console.log('No saved session found');
        }
    } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem('wordle-session');
    }
    return false;
}

// Function to manually clear master reset flags (for debugging)
function clearMasterResetFlags() {
    sessionStorage.removeItem('master-reset-performed');
    sessionStorage.removeItem('master-reset-timestamp');
    console.log('Master reset flags manually cleared');
}

// Function to manually clear leave room flags (for debugging)
function clearLeaveRoomFlags() {
    sessionStorage.removeItem('voluntarily-left-room');
    sessionStorage.removeItem('left-room-timestamp');
    console.log('Leave room flags manually cleared');
}

// Function to clear all session flags (for debugging)
function clearAllSessionFlags() {
    clearMasterResetFlags();
    clearLeaveRoomFlags();
    localStorage.clear();
    console.log('All session flags and localStorage cleared');
}

// Force session restoration (for debugging/testing)
function forceSessionRestoration() {
    console.log('=== FORCING SESSION RESTORATION ===');
    
    // Clear any blocking flags
    sessionStorage.removeItem('master-reset-performed');
    sessionStorage.removeItem('master-reset-timestamp');
    sessionStorage.removeItem('voluntarily-left-room');
    sessionStorage.removeItem('left-room-timestamp');
    
    // Run the restoration check
    const restored = checkAndRestoreSession();
    console.log('Force restoration result:', restored);
    return restored;
}

// Make functions available globally for debugging
window.clearMasterResetFlags = clearMasterResetFlags;
window.clearLeaveRoomFlags = clearLeaveRoomFlags;
window.clearAllSessionFlags = clearAllSessionFlags;
window.forceSessionRestoration = forceSessionRestoration;

// Make commentary functions available globally
window.closeCommentaryModal = closeCommentaryModal;
window.triggerCommentary = triggerCommentary;

// Commentary System Functions
function showCommentaryToast(message, style = 'sarcastic', duration = 3000) {
    if (!commentaryEnabled) return;
    
    // Rate limiting: don't show too many comments too quickly
    const now = Date.now();
    if (now - lastCommentaryTime < 2000) return; // Min 2 seconds between comments
    lastCommentaryTime = now;
    
    const toast = document.getElementById('commentary-toast');
    if (!toast) return;
    
    // Clear existing classes and add new style
    toast.className = `commentary-toast ${style}`;
    toast.textContent = message;
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide toast after duration
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
    
    console.log(`Commentary [${style}]: ${message}`);
}

function showCommentaryModal(title, message, style = 'celebration') {
    if (!commentaryEnabled) return;
    
    const modal = document.getElementById('commentary-modal');
    const titleElement = document.getElementById('commentary-modal-title');
    const messageElement = document.getElementById('commentary-modal-message');
    
    if (!modal || !titleElement || !messageElement) return;
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 100);
    
    // Auto-close after 4 seconds
    setTimeout(() => {
        closeCommentaryModal();
    }, 4000);
    
    console.log(`Commentary Modal: ${title} - ${message}`);
}

function closeCommentaryModal() {
    const modal = document.getElementById('commentary-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function triggerCommentary(situation, preferredStyle = null, isSpecialMoment = false) {
    if (!commentaryEnabled || !window.getRandomCommentary) return;
    
    const comment = window.getRandomCommentary(situation, preferredStyle);
    if (!comment) return;
    
    if (isSpecialMoment) {
        showCommentaryModal('🎭 Commentary', comment, preferredStyle || 'dramatic');
    } else {
        showCommentaryToast(comment, preferredStyle);
    }
}

// Player statistics tracking
function updatePlayerStats(playerId, action, data = {}) {
    if (!playerStats.has(playerId)) {
        playerStats.set(playerId, {
            invalidAttempts: 0,
            closeGuesses: 0,
            correctLetters: 0,
            gamesPlayed: 0,
            fastTyping: 0,
            slowTyping: 0,
            lastActionTime: 0
        });
    }
    
    const stats = playerStats.get(playerId);
    const now = Date.now();
    
    switch (action) {
        case 'invalidWord':
            stats.invalidAttempts++;
            break;
        case 'closeGuess':
            stats.closeGuesses++;
            break;
        case 'correctLetter':
            stats.correctLetters++;
            break;
        case 'fastTyping':
            stats.fastTyping++;
            break;
        case 'slowTyping':
            stats.slowTyping++;
            break;
    }
    
    stats.lastActionTime = now;
}

// Analyze game state for commentary triggers
function analyzeGameStateForCommentary(prevState, newState) {
    if (!newState.players || !prevState.players) return;
    
    // Check each player for changes
    Object.keys(newState.players).forEach(playerId => {
        const prevPlayer = prevState.players[playerId];
        const newPlayer = newState.players[playerId];
        
        if (!prevPlayer || !newPlayer) return;
        
        // Check for close guesses (4/5 letters correct)
        const currentRowIndex = newPlayer.currentRow - 1;
        if (currentRowIndex >= 0 && newPlayer.colors[currentRowIndex]) {
            const correctCount = newPlayer.colors[currentRowIndex].filter(color => color === 'green').length;
            const presentCount = newPlayer.colors[currentRowIndex].filter(color => color === 'yellow').length;
            
            if (correctCount === 4) {
                triggerCommentary('closeGuess', 'encouraging');
                updatePlayerStats(playerId, 'closeGuess');
            } else if (correctCount === 1 && prevPlayer.currentRow !== newPlayer.currentRow) {
                triggerCommentary('firstCorrect', 'encouraging');
                updatePlayerStats(playerId, 'correctLetter');
            } else if (presentCount >= 3) {
                triggerCommentary('multipleYellow', 'observational');
            }
        }
        
        // Check for wins
        if (newPlayer.won && !prevPlayer.won) {
            triggerCommentary('playerWin', 'celebration', true);
        }
    });
}

// Save basic session to localStorage (server handles game state)
function saveBasicSession() {
    try {
        const session = {
            playerName: gameState.playerName,
            roomId: gameState.roomId,
            timestamp: Date.now()
        };
        localStorage.setItem('wordle-session', JSON.stringify(session));
        console.log('Basic session saved:', session);
    } catch (error) {
        console.error('Error saving session:', error);
    }
}

// Extract current game board state
function extractCurrentGameBoard() {
    const board = [];
    const colors = [];
    
    for (let row = 0; row < 6; row++) {
        const rowLetters = [];
        const rowColors = [];
        
        for (let col = 0; col < 5; col++) {
            const tile = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (tile) {
                rowLetters.push(tile.textContent || '');
                rowColors.push(tile.dataset.state || '');
            } else {
                rowLetters.push('');
                rowColors.push('');
            }
        }
        
        board.push(rowLetters);
        colors.push(rowColors);
    }
    
    return { board, colors };
}

// Extract keyboard state
function extractKeyboardState() {
    const keyboardState = {};
    const keys = document.querySelectorAll('#keyboard-container button[data-key]');
    
    keys.forEach(key => {
        const letter = key.dataset.key;
        const state = key.dataset.state || '';
        if (letter && letter.length === 1) { // Only single letters
            keyboardState[letter] = state;
        }
    });
    
    return keyboardState;
}

// Restore local game state from localStorage
function restoreLocalGameState() {
    try {
        const savedGameState = localStorage.getItem('wordle-game-state');
        if (savedGameState) {
            const localState = JSON.parse(savedGameState);
            console.log('Restoring local game state:', localState);
            
            // Restore board state
            if (localState.gameBoard) {
                restoreGameBoard(localState.gameBoard);
            }
            
            // Restore keyboard state
            if (localState.keyboardState) {
                restoreKeyboardState(localState.keyboardState);
            }
            
            // Restore game variables
            currentRow = localState.currentRow || 0;
            currentCol = localState.currentCol || 0;
            gameOver = localState.gameOver || false;
            won = localState.won || false;
            
            console.log('Local game state restored successfully');
            
            // Clean up the temporary storage
            localStorage.removeItem('wordle-game-state');
        }
    } catch (error) {
        console.error('Error restoring local game state:', error);
        localStorage.removeItem('wordle-game-state');
    }
}

// Restore game board visual state
function restoreGameBoard(gameBoard) {
    if (!gameBoard.board || !gameBoard.colors) return;
    
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 5; col++) {
            const tile = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (tile) {
                const letter = gameBoard.board[row]?.[col] || '';
                const color = gameBoard.colors[row]?.[col] || '';
                
                tile.textContent = letter;
                tile.dataset.state = color || 'empty';
                
                // Add filled class if there's a letter
                if (letter) {
                    tile.classList.add('filled');
                } else {
                    tile.classList.remove('filled');
                }
            }
        }
    }
}

// Restore keyboard visual state
function restoreKeyboardState(keyboardState) {
    Object.entries(keyboardState).forEach(([letter, state]) => {
        const key = document.querySelector(`#keyboard-container button[data-key="${letter}"]`);
        if (key && state) {
            key.dataset.state = state;
        }
    });
}

// Clear session from localStorage
function clearSession() {
    try {
        localStorage.removeItem('wordle-session');
        localStorage.removeItem('wordle-game-state');
        console.log('Session cleared');
    } catch (error) {
        console.error('Error clearing session:', error);
    }
}

// Setup login event listeners (separate from game event listeners)
function setupLoginEventListeners() {
    // Login form
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submitted!');
            joinGame();
        });
    }
}