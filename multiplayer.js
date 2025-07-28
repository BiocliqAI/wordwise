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
const roomIdInput = document.getElementById('room-id');
const loginError = document.getElementById('login-error');
const roomIdDisplay = document.getElementById('room-id-display');
const playerCount = document.getElementById('player-count');
const playerNameDisplay = document.getElementById('player-name-display');
const resetGameBtn = document.getElementById('reset-game-btn');
const gameOverModal = document.getElementById('game-over-modal');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');
const playAgainBtn = document.getElementById('play-again-btn');

// Game variables
let currentRow = 0;
let currentCol = 0;
let gameOver = false;
let won = false;

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
    const roomId = roomIdInput.value.trim() || 'default';
    
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
});

socket.on('player-left', (data) => {
    showMessage(`${data.playerName} left the game`);
    playerCount.textContent = `Players: ${data.playerCount}/5`;
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
});

socket.on('game-ended', (data) => {
    gameOver = true;
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
        
        // Force transition to game screen
        loginScreen.classList.remove('active');
        gameScreen.classList.add('active');
        
        // Initialize the game
        initGame();
        updateUI();
        
        console.log('Successfully restored to game screen');
    } catch (error) {
        console.error('Error handling rejoin-success:', error);
    }
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
        if (roomIdInput) {
            roomIdInput.value = '';
            roomIdInput.blur();
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
            
            if (color === 'green') {
                tile.dataset.state = 'correct';
            } else if (color === 'yellow') {
                tile.dataset.state = 'present';
            } else if (color === 'gray') {
                tile.dataset.state = 'absent';
            } else if (letter) {
                tile.dataset.state = 'tbd';
            } else {
                tile.dataset.state = 'empty';
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
    name.textContent = player.name + (isCurrentPlayer ? ' (You)' : '');
    
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
    
    // Focus on name input
    if (playerNameInput) {
        playerNameInput.focus();
    }
});

// Check and restore session from localStorage
function checkAndRestoreSession() {
    console.log('=== SESSION RESTORATION CHECK ===');
    console.log('Checking for existing session...');
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
        
        const savedSession = localStorage.getItem('wordle-session');
        console.log('Raw localStorage data:', savedSession);
        
        if (savedSession) {
            const session = JSON.parse(savedSession);
            console.log('Found saved session:', session);
            
            // Check if session is still valid (not too old)
            const sessionAge = Date.now() - session.timestamp;
            console.log('Session age (hours):', sessionAge / (1000 * 60 * 60));
            
            if (sessionAge < 24 * 60 * 60 * 1000) { // 24 hours
                console.log('Session valid, restoring...');
                gameState.playerName = session.playerName;
                gameState.roomId = session.roomId;
                
                // Wait for socket to connect before rejoining
                if (socket.connected) {
                    console.log('Socket already connected, rejoining immediately...');
                    socket.emit('rejoin-room', { 
                        roomId: session.roomId, 
                        playerName: session.playerName 
                    });
                } else {
                    console.log('Socket not connected yet, waiting...');
                    socket.on('connect', () => {
                        console.log('Socket connected, now rejoining...');
                        socket.emit('rejoin-room', { 
                            roomId: session.roomId, 
                            playerName: session.playerName 
                        });
                    });
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

// Make function available globally for debugging
window.clearMasterResetFlags = clearMasterResetFlags;

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