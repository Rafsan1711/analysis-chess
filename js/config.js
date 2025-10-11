// ============================================
// Configuration & Constants - ULTIMATE OPTIMIZED
// ============================================

const CONFIG = {
  // Engine Settings (Maximum Performance)
  ENGINE: {
    HASH_SIZE: 512,        // Maximum hash for strong analysis
    THREADS: Math.min(navigator.hardwareConcurrency || 4, 8), // Auto-detect CPU cores
    SKILL_LEVEL: 20,       // Maximum strength
    MULTI_PV: 5,           // Top 5 moves for brilliant detection
    
    // Analysis Depths (Chess.com uses 18-24)
    QUICK_DEPTH: 14,       // Fast scan
    STANDARD_DEPTH: 18,    // Standard analysis
    DEEP_DEPTH: 24,        // Maximum accuracy
    TACTICAL_DEPTH: 20,    // For forcing moves
    
    // Timeouts (Optimized)
    TIMEOUT_MS: 45000,     // 45 seconds for complex positions
    MOVE_DELAY_MS: 150,    // Minimal delay
    ANALYSIS_BATCH_SIZE: 3 // Analyze 3 moves in parallel
  },
  
  // Move Classification Thresholds (Chess.com Exact - Reverse Engineered)
  CLASSIFICATION: {
    // Opening phase (moves 1-12)
    OPENING: {
      BOOK_MOVES: 12,
      BEST_THRESHOLD: 12,
      GREAT_THRESHOLD: 28,
      GOOD_THRESHOLD: 55,
      INACCURACY_THRESHOLD: 110,
      MISTAKE_THRESHOLD: 210
    },
    
    // Middlegame phase (moves 13-40)
    MIDDLEGAME: {
      BEST_THRESHOLD: 10,
      GREAT_THRESHOLD: 25,
      GOOD_THRESHOLD: 50,
      INACCURACY_THRESHOLD: 100,
      MISTAKE_THRESHOLD: 200
    },
    
    // Endgame phase (< 10 pieces)
    ENDGAME: {
      BEST_THRESHOLD: 8,
      GREAT_THRESHOLD: 20,
      GOOD_THRESHOLD: 40,
      INACCURACY_THRESHOLD: 80,
      MISTAKE_THRESHOLD: 150
    },
    
    // Brilliant Detection (Very Strict - <0.3% of moves)
    BRILLIANT: {
      MIN_SACRIFICE: 280,        // Minimum material sacrifice
      MIN_EVAL_GAIN: 60,         // Must gain advantage
      UNIQUENESS_GAP: 100,       // Must be much better than 2nd best
      MIN_COMPLEXITY: 40,        // Position must be complex
      MIN_EVAL_SWING: 120,       // Large position change
      MAX_CP_LOSS: -20           // Must not lose centipawns
    },
    
    // Great Move Criteria
    GREAT: {
      MAX_CP_LOSS: 25,
      MIN_EVAL_GAIN: 40,
      MIN_POSITION_SCORE: 200
    },
    
    // Win Probability Loss Thresholds (Alternative method)
    WIN_PROB_LOSS: {
      INACCURACY: 8,   // 8% win probability loss
      MISTAKE: 15,     // 15% loss
      BLUNDER: 25      // 25%+ loss
    }
  },
  
  // Piece Values (Refined - Chess.com uses these)
  PIECE_VALUES: {
    p: 100,
    n: 305,
    b: 333,
    r: 563,
    q: 950,
    k: 0
  },
  
  // Positional Bonuses (Advanced evaluation)
  POSITIONAL_BONUSES: {
    CENTER_CONTROL: 25,
    EXTENDED_CENTER: 15,
    ADVANCED_PAWN: 20,
    KING_SAFETY: 30,
    PIECE_MOBILITY: 10,
    PAWN_STRUCTURE: 15,
    DEVELOPMENT: 20
  },
  
  // Win Probability Calculation (Chess.com exact formula)
  WIN_PROB: {
    COEFFICIENT: 0.00368208,  // Exact coefficient
    SCALING_FACTOR: 50        // Scaling to 0-100%
  },
  
  // Tactical Pattern Detection
  TACTICAL_PATTERNS: {
    CHECK_BONUS: 30,
    CAPTURE_BONUS: 20,
    PROMOTION_BONUS: 40,
    CASTLING_BONUS: 15,
    FORK_BONUS: 35,
    PIN_BONUS: 30,
    SKEWER_BONUS: 35,
    DISCOVERED_ATTACK: 40
  },
  
  // UI Settings
  UI: {
    EVAL_CLAMP_MIN: -2000,
    EVAL_CLAMP_MAX: 2000,
    GRAPH_MAX_POINTS: 150,
    ANIMATION_DURATION: 250,
    UPDATE_THROTTLE: 100
  },
  
  // Performance Optimization
  PERFORMANCE: {
    ENABLE_CACHE: true,
    CACHE_MAX_SIZE: 1000,
    ENABLE_PARALLEL: true,
    PREFETCH_NEXT: true,
    LAZY_LOAD_STATS: false
  },
  
  // Stockfish CDN
  STOCKFISH_URL: 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js',
  
  // Debug mode
  DEBUG: false
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
  evalChart: null,
  analysisStartTime: 0,
  totalAnalysisTime: 0,
  cacheHits: 0,
  cacheMisses: 0
};

// Performance monitoring
const PERFORMANCE_STATS = {
  analysisCount: 0,
  averageDepth: 0,
  cacheHitRate: 0,
  totalTime: 0
};
