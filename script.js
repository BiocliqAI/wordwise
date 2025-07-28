// Game state
let gameState = {
    currentRow: 0,
    currentCol: 0,
    currentGuess: '',
    targetWord: '',
    gameOver: false,
    gameWon: false,
    stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        guessDistribution: [0, 0, 0, 0, 0, 0]
    }
};

// DOM elements
const gameBoard = document.getElementById('game-board');
const keyboard = document.getElementById('keyboard');
const messageContainer = document.getElementById('message-container');

// Initialize game
function initGame() {
    loadStats();
    setTargetWord();
    setupEventListeners();
}

// Set target word with random selection
function setTargetWord() {
    const index = Math.floor(Math.random() * TARGET_WORDS.length);
    gameState.targetWord = TARGET_WORDS[index].toUpperCase();
    console.log('Target word:', gameState.targetWord); // For debugging
}

// Setup event listeners
function setupEventListeners() {
    // Keyboard button clicks
    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('click', () => handleKeyPress(key.dataset.key));
    });

    // Physical keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleKeyPress('ENTER');
        } else if (e.key === 'Backspace') {
            handleKeyPress('BACKSPACE');
        } else if (e.key.match(/[a-z]/i)) {
            handleKeyPress(e.key.toUpperCase());
        }
    });

    // New game button
    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', startNewGame);
    }
}

// Handle key press
function handleKeyPress(key) {
    if (gameState.gameOver) return;

    if (key === 'ENTER') {
        submitGuess();
    } else if (key === 'BACKSPACE') {
        deleteLetter();
    } else if (key.match(/[A-Z]/i) && gameState.currentCol < 5) {
        addLetter(key);
    }
}

// Add letter to current guess
function addLetter(letter) {
    if (gameState.currentCol < 5) {
        const tile = getTile(gameState.currentRow, gameState.currentCol);
        tile.textContent = letter;
        tile.classList.add('filled');
        gameState.currentGuess += letter;
        gameState.currentCol++;
    }
}

// Delete letter from current guess
function deleteLetter() {
    if (gameState.currentCol > 0) {
        gameState.currentCol--;
        const tile = getTile(gameState.currentRow, gameState.currentCol);
        tile.textContent = '';
        tile.classList.remove('filled');
        gameState.currentGuess = gameState.currentGuess.slice(0, -1);
    }
}

// Submit guess
function submitGuess() {
    if (gameState.currentCol !== 5) {
        showMessage('Not enough letters');
        return;
    }

    // Check if word is valid using both target words and valid guesses
    const allValidWords = new Set([...TARGET_WORDS, ...FINAL_VALID_GUESSES]);
    if (!allValidWords.has(gameState.currentGuess.toLowerCase())) {
        showMessage('Not in word list');
        return;
    }

    checkGuess();
}

// Check the guess
function checkGuess() {
    const guess = gameState.currentGuess;
    const target = gameState.targetWord;
    const results = [];
    const targetLetters = target.split('');
    const guessLetters = guess.split('');

    // First pass: mark correct positions
    for (let i = 0; i < 5; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            results[i] = 'correct';
            targetLetters[i] = null;
            guessLetters[i] = null;
        }
    }

    // Second pass: mark present letters
    for (let i = 0; i < 5; i++) {
        if (guessLetters[i] && targetLetters.includes(guessLetters[i])) {
            results[i] = 'present';
            targetLetters[targetLetters.indexOf(guessLetters[i])] = null;
        } else if (guessLetters[i]) {
            results[i] = 'absent';
        }
    }

    // Animate tiles
    animateTiles(results);
    
    // Update keyboard
    updateKeyboard(guess, results);
    
    // Check win/lose
    if (guess === target) {
        gameState.gameWon = true;
        gameState.gameOver = true;
        gameState.stats.gamesWon++;
        gameState.stats.currentStreak++;
        gameState.stats.maxStreak = Math.max(gameState.stats.maxStreak, gameState.stats.currentStreak);
        gameState.stats.guessDistribution[gameState.currentRow]++;
        saveStats();
        setTimeout(() => {
            showMessage('Genius!');
        }, 2000);
    } else if (gameState.currentRow === 5) {
        gameState.gameOver = true;
        gameState.stats.currentStreak = 0;
        saveStats();
        setTimeout(() => {
            showMessage(gameState.targetWord);
        }, 2000);
    }

    gameState.currentRow++;
    gameState.currentCol = 0;
    gameState.currentGuess = '';
    gameState.stats.gamesPlayed++;
    saveStats();
}

// Animate tiles
function animateTiles(results) {
    for (let i = 0; i < 5; i++) {
        const tile = getTile(gameState.currentRow, i);
        setTimeout(() => {
            tile.classList.add('flip');
            setTimeout(() => {
                tile.classList.add(results[i]);
                tile.classList.remove('flip');
            }, 250);
        }, i * 100);
    }
}

// Update keyboard
function updateKeyboard(guess, results) {
    for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const key = document.querySelector(`[data-key="${letter}"]`);
        if (key) {
            if (results[i] === 'correct') {
                key.classList.add('correct');
                key.classList.remove('present', 'absent');
            } else if (results[i] === 'present' && !key.classList.contains('correct')) {
                key.classList.add('present');
                key.classList.remove('absent');
            } else if (results[i] === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present')) {
                key.classList.add('absent');
            }
        }
    }
}

// Show message
function showMessage(message) {
    messageContainer.textContent = message;
    messageContainer.classList.add('show');
    setTimeout(() => {
        messageContainer.classList.remove('show');
    }, 2000);
}

// Get tile element
function getTile(row, col) {
    const rows = gameBoard.querySelectorAll('.row');
    const tiles = rows[row].querySelectorAll('.tile');
    return tiles[col];
}

// Load stats
function loadStats() {
    try {
        const stats = JSON.parse(localStorage.getItem('wordle-stats') || '{}');
        gameState.stats = {
            gamesPlayed: stats.gamesPlayed || 0,
            gamesWon: stats.gamesWon || 0,
            currentStreak: stats.currentStreak || 0,
            maxStreak: stats.maxStreak || 0,
            guessDistribution: stats.guessDistribution || [0, 0, 0, 0, 0, 0]
        };
    } catch (error) {
        console.warn('Failed to load stats from localStorage:', error);
    }
}

// Save stats
function saveStats() {
    try {
        localStorage.setItem('wordle-stats', JSON.stringify(gameState.stats));
    } catch (error) {
        console.warn('Failed to save stats to localStorage:', error);
    }
}

// Start new game
function startNewGame() {
    // Clear the game board
    const tiles = gameBoard.querySelectorAll('.tile');
    tiles.forEach(tile => {
        tile.textContent = '';
        tile.className = 'tile';
    });

    // Clear keyboard states
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('correct', 'present', 'absent');
    });

    // Reset game state
    gameState.currentRow = 0;
    gameState.currentCol = 0;
    gameState.currentGuess = '';
    gameState.gameOver = false;
    gameState.gameWon = false;

    // Set new target word
    setTargetWord();
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);