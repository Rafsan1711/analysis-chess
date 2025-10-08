// ============================================
// Move Classifier - Chess.com Level Analysis
// ============================================

const MoveClassifier = {
  
  // Calculate win probability from centipawns (Chess.com formula)
  centipawnsToWinProb(cp) {
    return 50 + 50 * (2 / (1 + Math.exp(-CONFIG.WIN_PROB.COEFFICIENT * cp)) - 1);
  },
  
  // Calculate material value of a move
  getMaterialLoss(move) {
    if (!move.captured) return 0;
    return CONFIG.PIECE_VALUES[move.captured] || 0;
  },
  
  // Check if move is a sacrifice
  isSacrifice(move, evalBefore, evalAfter) {
    const materialLoss = this.getMaterialLoss(move);
    if (materialLoss < CONFIG.CLASSIFICATION.BRILLIANT_SACRIFICE_MIN) {
      return false;
    }
    
    // Check if evaluation improved despite material loss
    const evalGain = move.color === 'w' 
      ? evalAfter - evalBefore 
      : evalBefore - evalAfter;
    
    return evalGain > CONFIG.CLASSIFICATION.BRILLIANT_EVAL_GAIN;
  },
  
  // Detect brilliant move
  isBrilliant(moveData) {
    const { move, cpLoss, alternatives, materialLoss } = moveData;
    
    // Must be a sacrifice
    if (materialLoss < CONFIG.CLASSIFICATION.BRILLIANT_SACRIFICE_MIN) {
      return false;
    }
    
    // Must improve position (negative cpLoss)
    if (cpLoss > 0) {
      return false;
    }
    
    // Must be significantly better than alternatives
    if (alternatives && alternatives.length > 1) {
      const bestScore = alternatives[0].score;
      const secondBest = alternatives[1].score;
      const advantage = Math.abs(bestScore - secondBest);
      
      if (advantage < CONFIG.CLASSIFICATION.BRILLIANT_UNIQUENESS) {
        return false;
      }
    }
    
    return true;
  },
  
  // Main classification function
  classify(moveData) {
    const { 
      moveIndex, 
      cpLoss, 
      move, 
      alternatives,
      evalBefore,
      evalAfter,
      materialLoss
    } = moveData;
    
    // Book moves (opening theory)
    if (moveIndex < CONFIG.CLASSIFICATION.BOOK_MOVES) {
      return 'book';
    }
    
    // Check for brilliant move
    if (this.isBrilliant(moveData)) {
      return 'brilliant';
    }
    
    // Best move (within threshold or exact engine choice)
    if (Math.abs(cpLoss) <= CONFIG.CLASSIFICATION.BEST_THRESHOLD) {
      return 'best';
    }
    
    // Great move
    if (cpLoss <= CONFIG.CLASSIFICATION.GREAT_THRESHOLD) {
      return 'great';
    }
    
    // Good move
    if (cpLoss <= CONFIG.CLASSIFICATION.GOOD_THRESHOLD) {
      return 'good';
    }
    
    // Inaccuracy
    if (cpLoss <= CONFIG.CLASSIFICATION.INACCURACY_THRESHOLD) {
      return 'inaccuracy';
    }
    
    // Mistake
    if (cpLoss <= CONFIG.CLASSIFICATION.MISTAKE_THRESHOLD) {
      return 'mistake';
    }
    
    // Blunder
    return 'blunder';
  },
  
  // Get move icon SVG
  getIcon(classification) {
    const icons = {
      best: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#4ade80"/><text x="8" y="12" text-anchor="middle" font-size="11" fill="white" font-weight="bold">✓</text></svg>',
      
      great: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#22c55e"/><text x="8" y="12" text-anchor="middle" font-size="11" fill="white" font-weight="bold">!</text></svg>',
      
      good: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#84cc16"/><circle cx="8" cy="8" r="2.5" fill="white"/></svg>',
      
      inaccuracy: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#f59e0b"/><text x="8" y="12" text-anchor="middle" font-size="10" fill="white" font-weight="bold">?!</text></svg>',
      
      mistake: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#f97316"/><text x="8" y="12" text-anchor="middle" font-size="11" fill="white" font-weight="bold">?</text></svg>',
      
      blunder: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#ef4444"/><text x="8" y="11" text-anchor="middle" font-size="9" fill="white" font-weight="bold">??</text></svg>',
      
      brilliant: '<svg width="16" height="16"><defs><linearGradient id="brillGrad2"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><circle cx="8" cy="8" r="7" fill="url(#brillGrad2)"/><text x="8" y="12" text-anchor="middle" font-size="11" fill="white">⭐</text></svg>',
      
      book: '<svg width="16" height="16"><rect width="16" height="16" rx="3" fill="#6366f1"/><text x="8" y="12" text-anchor="middle" font-size="11" fill="white">📖</text></svg>'
    };
    
    return icons[classification] || '';
  },
  
  // Get CSS class for move quality
  getMoveClass(classification) {
    return `move-${classification}`;
  },
  
  // Calculate ACPL (Average Centipawn Loss)
  calculateACPL(moves, color) {
    const colorMoves = moves.filter((m, idx) => {
      const moveColor = STATE.moveHistory[idx].color;
      return moveColor === color;
    });
    
    if (colorMoves.length === 0) return 0;
    
    const totalLoss = colorMoves.reduce((sum, m) => {
      return sum + (m.cpLoss > 0 ? m.cpLoss : 0);
    }, 0);
    
    return Math.round(totalLoss / colorMoves.length);
  },
  
  // Calculate accuracy percentage (Chess.com formula)
  calculateAccuracy(acpl) {
    if (acpl === 0) return 100;
    
    // Chess.com approximate formula
    const accuracy = 103.4 - (0.382 * acpl) - (0.00217 * acpl * acpl);
    
    return Math.max(0, Math.min(100, Math.round(accuracy * 10) / 10));
  },
  
  // Count move types for statistics
  countMoveTypes(moves, color) {
    const colorMoves = moves.filter((m, idx) => {
      const moveColor = STATE.moveHistory[idx].color;
      return moveColor === color;
    });
    
    const counts = {
      brilliant: 0,
      best: 0,
      great: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0
    };
    
    colorMoves.forEach(m => {
      if (m.classification && counts[m.classification] !== undefined) {
        counts[m.classification]++;
      }
    });
    
    return counts;
  }
};
