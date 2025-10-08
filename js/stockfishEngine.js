// ============================================
// Configuration & Constants
// ============================================

const CONFIG = {
  // Engine Settings
  ENGINE: {
    HASH_SIZE: 128,
    THREADS: 2,
    SKILL_LEVEL: 20,
    MULTI_PV: 3,
    
    // Analysis Depths
    QUICK_DEPTH: 12,
    STANDARD_DEPTH: 16,
    DEEP_DEPTH: 20,
    
    // Timeouts
    TIMEOUT_MS: 30000,  // Increased to 30 seconds
    MOVE_DELAY_MS: 500  // Small delay between moves
  },
  
  // Move Classification Thresholds (Centipawns)
  CLASSIFICATION: {
    BOOK_MOVES: 10,        // First 10 moves are book
    BEST_THRESHOLD: 15,    // ±15 cp
    GREAT_THRESHOLD: 30,   // 15-30 cp loss
    GOOD_THRESHOLD: 60,    // 30-60 cp loss
    INACCURACY_THRESHOLD: 150,  // 60-150 cp loss
    MISTAKE_THRESHOLD: 300,     // 150-300 cp loss
    // Above 300 = Blunder
    
    // Brilliant Detection
    BRILLIANT_SACRIFICE_MIN: 300,  // Minimum sacrifice value
    BRILLIANT_EVAL_GAIN: 50,       // Minimum eval improvement
    BRILLIANT_UNIQUENESS: 100      // Much better than 2nd best
  },
  
  // Piece Values (Centipawns)
  PIECE_VALUES: {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 0
  },
  
  // Win Probability Calculation
  WIN_PROB: {
    COEFFICIENT: 0.00368208  // Chess.com standard
  },
  
  // UI Settings
  UI: {
    EVAL_CLAMP_MIN: -1500,
    EVAL_CLAMP_MAX: 1500,
    GRAPH_MAX_POINTS: 100,
    ANIMATION_DURATION: 300
  },
  
  // Stockfish CDN
  STOCKFISH_URL: 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js'
};

// Global State
const STATE = {
  game: null,
  board: null,
  moveHistory: [],
  currentMoveIndex: -1,
  analysisData: {},
  gameMetadata: {
    white: 'White',
    black: 'Black',
    whiteElo: '',
    blackElo: '',
    event: '',
    date: ''
  },
  scrollLocked: false,
  isAnalyzing: false,
  evalChart: null
};
