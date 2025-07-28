# Multiplayer Wordle

A real-time multiplayer Wordle game built with Node.js, Express, and Socket.IO. Play Wordle with up to 5 players in the same room with persistent game state across browser refreshes and server restarts.

## Features

### 🎮 Multiplayer Gameplay
- **Up to 5 players** per room
- **Real-time synchronization** - see other players' progress live
- **Custom room IDs** or join default room
- **Player status tracking** with mini-boards showing each player's progress

### 🔄 Complete State Persistence
- **Browser refresh recovery** - rejoin exactly where you left off
- **Server restart resilience** - all game progress saved to disk
- **Board state preservation** - all guesses, colors, and positions maintained
- **Word consistency** - same challenge word until game ends
- **Session management** - automatic reconnection within 24 hours

### 🎯 Game Features
- **Standard Wordle rules** - 6 attempts to guess a 5-letter word
- **Color-coded feedback** - green (correct), yellow (present), gray (absent)
- **Interactive keyboard** - click or type with visual feedback
- **Win/lose detection** - individual player outcomes
- **New game functionality** - reset with new word

## Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Persistence**: File-based JSON storage
- **Real-time**: WebSocket communication

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd multiplayer-wordle
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:5002
   ```

## How to Play

1. **Enter your name** and optionally a room ID
2. **Click "Join Game"** to enter the multiplayer room
3. **Wait for other players** or start with single player mode
4. **Type your guess** using keyboard or on-screen buttons
5. **Press ENTER** to submit your 5-letter word
6. **View feedback** - colors indicate letter correctness
7. **Continue guessing** until you win or use all 6 attempts

## Game Persistence

### Browser Refresh Recovery
- Automatically saves session to localStorage after each guess
- Rejoins same room with same player name
- Restores complete board state with all previous guesses
- Maintains keyboard color states and current position

### Server Restart Recovery  
- Game rooms and player data saved to `game-rooms.json`
- All progress restored when server restarts
- Challenge word preserved until game naturally ends
- Players can reconnect even after server downtime

## Architecture

### Client-Server Communication
```
Client ←→ Socket.IO ←→ Server ←→ File Storage
```

### Key Components
- **GameRoom Class**: Manages room state, players, and word logic
- **Player Objects**: Store individual game progress and connection status
- **Session Management**: localStorage + server-side player tracking
- **State Synchronization**: Real-time updates via Socket.IO events

## API Events

### Client → Server
- `join-room`: Join or create a game room
- `rejoin-room`: Reconnect with existing player data
- `make-guess`: Submit a 5-letter word guess
- `reset-game`: Start a new game (new word)

### Server → Client
- `game-state`: Complete room and player state update
- `rejoin-success`: Successful reconnection with restored state
- `game-started`: Game activated with enough players
- `game-ended`: Game finished (win/lose/timeout)
- `player-joined`/`player-left`: Player connection updates

## Configuration

### Server Settings
- **Port**: 5002 (configurable in server.js)
- **Max Players**: 5 per room
- **Session Timeout**: 24 hours
- **Room Cleanup**: 30 minutes after all players disconnect

### Word Lists
- **Target Words**: 2,397 common 5-letter words for daily solutions
- **Valid Guesses**: 2,798 acceptable words for validation
- Based on official Wordle word lists

## File Structure

```
multiplayer-wordle/
├── server.js              # Express server with Socket.IO
├── index.html             # Game UI and login screen
├── multiplayer.js         # Client-side game logic
├── styles.css             # Game styling and responsive design
├── words.js               # Word lists and validation
├── package.json           # Dependencies and scripts
├── game-rooms.json        # Persistent game state (auto-generated)
└── README.md             # This file
```

## Development

### Adding Features
1. **New game modes**: Modify GameRoom class logic
2. **Different word lengths**: Update board/validation logic  
3. **Enhanced UI**: Modify styles.css and index.html
4. **Additional persistence**: Extend saveRoomsToFile() function

### Debugging
- Server logs show detailed connection and game events
- Client console shows session restoration and game state updates
- Game state persisted in human-readable JSON format

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)  
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

---

🎮 **Enjoy playing Multiplayer Wordle with friends!** 

*Built with ❤️ using Node.js and Socket.IO*# Railway deployment trigger
