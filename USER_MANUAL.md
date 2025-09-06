# Multiplayer Wordle - User Manual

Welcome to Multiplayer Wordle! This document will guide you through playing the game, from joining a room to celebrating your victory with friends.

## 1. Introduction

Multiplayer Wordle is a real-time, interactive word-guessing game based on the classic Wordle format. You can play with up to 5 players in the same room, see each other's progress live, and even chat while you play. The goal is simple: guess the secret 5-letter word in six attempts or fewer.

## 2. Getting Started: Joining a Game

Getting into a game is quick and easy.

1.  **Open the Game**: When you first load the application, you'll see the login screen.
2.  **Enter Your Name**: Type the name you want to use in the "Enter your name" field.
3.  **Join the Game**: Click the "Join Game" button.

You will automatically be placed in the default game room.

![Login Screen](https://i.imgur.com/example_login.png) <!-- Placeholder for an image -->

## 3. How to Play

Once you're in the game room, the main game board will appear.

### The Objective

The goal is to guess the secret 5-letter word. You have 6 attempts.

### Making a Guess

1.  **Type a 5-letter word**: You can use either your physical keyboard or the on-screen keyboard provided.
2.  **Submit Your Guess**: Press the "Enter" key (or the `↵` button on the on-screen keyboard).

The word must be a valid 5-letter word from the game's dictionary. If it's not, you'll see a "Not in word list" message.

### Understanding the Feedback

After each guess, the tiles on your board will change color to give you clues:

*   🟩 **Green**: The letter is in the word and in the correct position.
*   🟨 **Yellow**: The letter is in the word but in the wrong position.
*   ⬜ **Gray**: The letter is not in the word at all.

Use these clues to inform your next guess!

## 4. Multiplayer Features

What makes this game special is playing with others.

### Players Panel

On the right side of the screen, you'll find the **Players Panel**. This area shows:
*   A list of all players currently in the room.
*   Each player's win count.
*   A mini-board for each player, showing their real-time progress (and the colors of their guesses).

### Player Count

The header at the top of the screen shows the current number of players in the room (e.g., "Players: 3/5").

## 5. Game Controls

You have several controls available during the game.

*   **New Game Button**: After a game has ended (either by someone winning or everyone running out of guesses), this button will appear. Anyone can click it to start a new round with a new secret word for everyone.
*   **Leave Room Button**: If you need to exit the game, click this button. You will be returned to the login screen.
*   **Master Reset Button** (🔄): This is a powerful button located at the top-left of the game screen.
    *   **⚠️ WARNING**: This button will reset the *entire server*, clearing all players from all rooms and starting the game from scratch. Use it with extreme caution. You will be asked to confirm before the reset happens.

## 6. Chatting with Players

You can communicate with other players in real-time using the **Chat Panel** located below the main game area.

1.  Type your message into the input box.
2.  Click the "Send" button or press "Enter" on your keyboard.

Your messages will appear in the chat history, marked to distinguish them from other players' messages.

## 7. End of the Game

A game ends when a player correctly guesses the word or when all players have used all six attempts.

*   **If You Win**: A "Congratulations!" message will appear, and you'll see some celebratory confetti!
*   **If Someone Else Wins**: A "Game Over" message will appear, telling you who won and what the secret word was.
*   **If No One Wins**: A "Game Over" message will show the secret word.

After the game ends, the "Play Again" button appears in the pop-up modal, and the "New Game" button appears at the top. Click either to start a new round.

## 8. Advanced Features

### Session Persistence

The game saves your progress! If you accidentally refresh your browser, the game will automatically reconnect you to the same room with your name and restore your game board exactly as you left it.

### The Commentary System

Don't be surprised if the game offers some playful commentary on your guesses! An automated system will occasionally pop up with toasts and messages to comment on the gameplay, such as celebrating a great guess or lamenting a near miss. It's all part of the fun!

---

Enjoy playing Multiplayer Wordle!
