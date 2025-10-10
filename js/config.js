// ============================================
// Configuration & Constants
// ============================================

const CONFIG = {
  // Engine Settings (Optimized for Accuracy)
  ENGINE: {
    HASH_SIZE: 256,        // Increased for better performance
    THREADS: 4,            // More threads for complex positions
    SKILL_LEVEL: 20,       // Maximum strength
    MULTI_PV: 3,           // Top 3 moves for comparison
    
    // Analysis Depths (Chess.com uses 18-22)
    QUICK_DEPTH: 12,       // Fast preliminary scan
    STANDARD_DEPTH: 16,    // Standard analysis
    DEEP_DEPTH: 20,        // Deep accurate analysis
    
    // Timeouts
    TIMEOUT_MS: 30000,     // 30 seconds per position
    MOVE_DELAY_MS: 500     // Delay between moves to prevent overload
  },
  
  // Move Classification Thresholds (Chess.com Exact)
  CLASSIFICATION: {
    BOOK_MOVES: 10,        // First 10 moves in opening theory
    BEST_THRESHOLD: 10,    // ±10 cp (Chess.com standard)
    GREAT_THRESHOLD: 25,   // 10-25 cp loss
    GOOD_THRESHOLD: 50,    // 25-50 cp loss
    INACCURACY_THRESHOLD: 100,  // 50-100 cp loss
    MISTAKE_THRESHOLD: 200,     // 100-200 cp loss
    // Above 200 = Blunder
    
    // Brilliant Detection (very strict, <0.5% of moves)
    BRILLIANT_SACRIFICE_MIN: 300,  // Must sacrifice at least minor piece
    BRILLIANT_EVAL_GAIN: 50,       // Must gain significant advantage
    BRILLIANT_UNIQUENESS: 80       // Must be significantly better than alternatives
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
