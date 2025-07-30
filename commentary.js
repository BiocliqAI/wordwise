// Cheeky Commentary System
// Pre-generated commentary pool for various game situations

const COMMENTARY_POOL = {
    // Invalid word attempts
    invalidWord: {
        sarcastic: [
            "Creative spelling! Did you invent a new language?",
            "That's not a word... unless you're from another dimension",
            "Interesting choice! Dictionary writers hate this one trick",
            "Bold move! Too bad the English language disagrees",
            "I admire your confidence in that... word?"
        ],
        encouraging: [
            "Close! But let's stick to real words this time",
            "Nice try! The dictionary is your friend",
            "Almost there! Just needs to exist first",
            "Good attempt! Try something a bit more... wordy"
        ],
        dramatic: [
            "The word gods have rejected your offering!",
            "A valiant effort has been DENIED by the lexicon!",
            "The dictionary trembles... but stands firm!"
        ]
    },

    // Close guesses (4/5 letters correct)
    closeGuess: {
        encouraging: [
            "SO CLOSE! You're practically breathing on the answer!",
            "One letter away from glory! Don't give up now!",
            "The word is practically waving at you!",
            "You're in the neighborhood... ring some doorbells!"
        ],
        dramatic: [
            "THE TENSION IS UNBEARABLE! One letter stands between you and victory!",
            "So close you can taste it! (Does victory taste like letters?)",
            "One tiny letter is all that separates you from immortality!"
        ],
        sarcastic: [
            "Oh, just ONE letter off. No big deal, right?",
            "Close enough for horseshoes... but not for Wordle",
            "Almost perfect! Like a 99% on a test you studied all night for"
        ]
    },

    // First correct letter
    firstCorrect: {
        encouraging: [
            "There we go! First green letter unlocked!",
            "Progress! You've cracked the code... partially",
            "Green means go! You're on the right track!",
            "One down, four to go! Momentum building!"
        ],
        dramatic: [
            "BREAKTHROUGH! The fortress wall has been breached!",
            "First blood! I mean... first green letter!",
            "The dam has burst! One correct letter leads to victory!"
        ]
    },

    // Multiple yellow letters
    multipleYellow: {
        observational: [
            "Yellow fever is spreading! So many right letters, wrong places",
            "It's like a word scramble... you have the pieces!",
            "All the right ingredients, just need to rearrange the recipe"
        ],
        encouraging: [
            "You've got the letters! Now just shuffle them around",
            "Hot and cold at the same time! The word is hiding in plain sight"
        ]
    },

    // Taking too long to type
    slowTyping: {
        sarcastic: [
            "Take your time... we're not getting any younger here",
            "Writing a novel? It's just 5 letters!",
            "Are you consulting a thesaurus for each letter?",
            "The suspense is killing us... slowly"
        ],
        observational: [
            "Careful consideration... or keyboard paralysis?",
            "Sometimes the best moves take time... sometimes they don't"
        ]
    },

    // Lightning fast typing
    fastTyping: {
        impressed: [
            "Lightning fingers! Did you even think about that?",
            "Speed demon! Your keyboard is on fire!",
            "That was fast! Hope you aimed well",
            "Quick draw! Now let's see if it hits the target"
        ]
    },

    // Player wins
    playerWin: {
        celebration: [
            "BOOM! Victory dance time!",
            "And we have a winner! Take a bow!",
            "Nailed it! The word never stood a chance",
            "Flawless victory! The crowd goes wild!",
            "Winner winner, word dinner!"
        ]
    },

    // Multiple players struggling
    groupStruggle: {
        observational: [
            "Everyone's scratching their heads... this is a tough one!",
            "Collective confusion in the air... solidarity in struggle!",
            "When everyone's stuck, you know it's a good word",
            "Group therapy session in progress..."
        ],
        encouraging: [
            "Don't worry, even Shakespeare would be sweating this one",
            "Tough words build character! You've got this, team!"
        ]
    },

    // Player joins
    playerJoin: {
        welcoming: [
            "Fresh blood! Welcome to the word battlefield!",
            "Another brave soul enters the arena!",
            "The gang's all here! Well, more of it anyway",
            "New player spotted! May your guesses be ever accurate"
        ]
    },

    // Player leaves
    playerLeave: {
        dramatic: [
            "And then there were fewer... the struggle continues!",
            "One warrior has fallen... or just left for coffee",
            "The plot thickens as players vanish into the night!"
        ],
        casual: [
            "Bye! Don't let the door hit you on the way out",
            "Another one bites the dust... or just closed their browser"
        ]
    },

    // Game start
    gameStart: {
        dramatic: [
            "Let the word games... BEGIN!",
            "Fresh battlefield, fresh hopes, fresh disappointments!",
            "The letters await your challenge! Will you rise to meet them?"
        ],
        encouraging: [
            "New game, new chances! Make them count!",
            "Clean slate, clear minds, let's make some words!"
        ]
    },

    // All players stuck on same guess
    sameGuess: {
        observational: [
            "Great minds think alike... or is it fools seldom differ?",
            "Collective intelligence or collective stubbornness?",
            "When everyone makes the same mistake, is it still a mistake?"
        ]
    }
};

// Commentary styles for random selection
const COMMENTARY_STYLES = ['sarcastic', 'encouraging', 'dramatic', 'observational', 'impressed', 'celebration', 'welcoming', 'casual'];

// Get random commentary for a specific situation
function getRandomCommentary(situation, preferredStyle = null) {
    const situationComments = COMMENTARY_POOL[situation];
    if (!situationComments) return null;

    // If preferred style exists, use it; otherwise pick random style
    const availableStyles = Object.keys(situationComments);
    const style = (preferredStyle && availableStyles.includes(preferredStyle)) 
        ? preferredStyle 
        : availableStyles[Math.floor(Math.random() * availableStyles.length)];

    const comments = situationComments[style];
    return comments[Math.floor(Math.random() * comments.length)];
}

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { COMMENTARY_POOL, COMMENTARY_STYLES, getRandomCommentary };
} else if (typeof window !== 'undefined') {
    window.COMMENTARY_POOL = COMMENTARY_POOL;
    window.COMMENTARY_STYLES = COMMENTARY_STYLES;
    window.getRandomCommentary = getRandomCommentary;
}