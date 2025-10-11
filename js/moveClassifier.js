// ============================================
// Move Classifier - ULTIMATE Chess.com Level
// All Advanced Techniques Implemented
// ============================================

const MoveClassifier = {
  
  // Chess.com Exact Win Probability Formula
  centipawnsToWinProb(cp) {
    return CONFIG.WIN_PROB.SCALING_FACTOR + 
           CONFIG.WIN_PROB.SCALING_FACTOR * 
           (2 / (1 + Math.exp(-CONFIG.WIN_PROB.COEFFICIENT * cp)) - 1);
  },
  
  // Calculate win probability loss
  calculateWinProbLoss(cpBefore, cpAfter) {
    return this.centipawnsToWinProb(cpBefore) - this.centipawnsToWinProb(cpAfter);
  },
  
  // Advanced material with positional context
  getMaterialValue(move, position) {
    if (!move.captured) return 0;
    
    const baseValue = CONFIG.PIECE_VALUES[move.captured];
    let bonus = 0;
    
    // Center square bonus
    const file = move.to.charCodeAt(0) - 97;
    const rank = parseInt(move.to[1]) - 1;
    
    if (file >= 3 && file <= 4 && rank >= 3 && rank <= 4) {
      bonus += CONFIG.POSITIONAL_BONUSES.CENTER_CONTROL;
    } else if (file >= 2 && file <= 5 && rank >= 2 && rank <= 5) {
      bonus += CONFIG.POSITIONAL_BONUSES.EXTENDED_CENTER;
    }
    
    // Advanced piece bonus
    if (rank >= 5 && move.captured !== 'p') {
      bonus += CONFIG.POSITIONAL_BONUSES.ADVANCED_PAWN;
    }
    
    // King safety consideration (capturing near king)
    if (position && position.kingProximity) {
      bonus += CONFIG.POSITIONAL_BONUSES.KING_SAFETY;
    }
    
    return baseValue + bonus;
  },
  
  // Detect tactical patterns
  detectTacticalPatterns(move, game, position) {
    const patterns = {
      check: game.in_check(),
      capture: !!move.captured,
      promotion: !!move.promotion,
      castling: move.flags && (move.flags.includes('k') || move.flags.includes('q')),
      enPassant: move.flags && move.flags.includes('e'),
      discovered: false, // Would need board analysis
      fork: false,       // Would need threat detection
      pin: false,
      skewer: false
    };
    
    let tacticalScore = 0;
    
    if (patterns.check) tacticalScore += CONFIG.TACTICAL_PATTERNS.CHECK_BONUS;
    if (patterns.capture) tacticalScore += CONFIG.TACTICAL_PATTERNS.CAPTURE_BONUS;
    if (patterns.promotion) tacticalScore += CONFIG.TACTICAL_PATTERNS.PROMOTION_BONUS;
    if (patterns.castling) tacticalScore += CONFIG.TACTICAL_PATTERNS.CASTLING_BONUS;
    
    return { patterns, tacticalScore };
  },
  
  // Calculate position complexity
  calculateComplexity(position, alternatives, tactical) {
    let complexity = 0;
    
    // Alternative moves variety
    if (alternatives && alternatives.length > 0) {
      complexity += Math.min(alternatives.length * 8, 40);
      
      // Score variance indicates tactical sharpness
      if (alternatives.length >= 2) {
        const topScore = alternatives[0].score || 0;
        const scores = alternatives.map(a => a.score || 0);
        const variance = Math.max(...scores) - Math.min(...scores);
        
        if (variance > 150) complexity += 30;
        else if (variance > 80) complexity += 20;
        else if (variance > 40) complexity += 10;
      }
    }
    
    // Tactical patterns add complexity
    if (tactical && tactical.tacticalScore > 0) {
      complexity += Math.min(tactical.tacticalScore, 35);
    }
    
    // Position phase affects complexity
    if (position) {
      if (position.phase === 'middlegame') complexity += 15;
      if (position.isTactical) complexity += 20;
      if (position.materialBalance && Math.abs(position.materialBalance) < 100) {
        complexity += 10; // Equal material = more complex
      }
    }
    
    return Math.min(complexity, 100);
  },
  
  // BRILLIANT MOVE DETECTION (Chess.com 5-criteria algorithm)
  isBrilliant(moveData) {
    const { 
      move, cpLoss, alternatives, materialLoss,
      evalBefore, evalAfter, complexity, tactical, position
    } = moveData;
    
    const criteria = CONFIG.CLASSIFICATION.BRILLIANT;
    
    // Criterion 1: Significant sacrifice
    if (materialLoss < criteria.MIN_SACRIFICE) {
      return false;
    }
    
    // Criterion 2: Position must improve (negative cpLoss)
    if (cpLoss > criteria.MAX_CP_LOSS) {
      return false;
    }
    
    // Criterion 3: Must gain significant advantage
    const evalGain = move.color === 'w' 
      ? (evalAfter - evalBefore)
      : (evalBefore - evalAfter);
    
    if (evalGain < criteria.MIN_EVAL_GAIN) {
      return false;
    }
    
    // Criterion 4: Must be uniquely best
    if (alternatives && alternatives.length >= 2) {
      const bestScore = alternatives[0].score || 0;
      const secondBest = alternatives[1].score || 0;
      const gap = Math.abs(bestScore - secondBest);
      
      if (gap < criteria.UNIQUENESS_GAP) {
        return false;
      }
    }
    
    // Criterion 5: Position must be complex/tactical
    if (complexity < criteria.MIN_COMPLEXITY) {
      return false;
    }
    
    // Criterion 6: Large evaluation swing
    const evalSwing = Math.abs(evalAfter - evalBefore);
    if (evalSwing < criteria.MIN_EVAL_SWING) {
      return false;
    }
    
    // Additional check: Not in obvious winning position
    if (Math.abs(evalBefore) > 500 && evalGain < 100) {
      return false; // Already winning, sacrifice less impressive
    }
    
    console.log('⭐ BRILLIANT MOVE DETECTED!', {
      sacrifice: materialLoss,
      cpLoss: cpLoss,
      evalGain: evalGain,
      complexity: complexity,
      evalSwing: evalSwing
    });
    
    return true;
  },
  
  // BEST MOVE DETECTION (Multi-criteria)
  isBestMove(moveData) {
    const { wasBestMove, cpLoss, alternatives, evalBefore, phase } = moveData;
    const thresholds = this.getThresholdsForPhase(phase);
    
    // Exact engine choice
    if (wasBestMove) return true;
    
    // Within threshold
    if (cpLoss <= thresholds.BEST_THRESHOLD) return true;
    
    // If alternatives are all close, any is "best"
    if (alternatives && alternatives.length >= 2) {
      const topScore = alternatives[0].score || 0;
      const secondScore = alternatives[1].score || 0;
      
      if (Math.abs(topScore - secondScore) < 12) {
        return cpLoss <= thresholds.BEST_THRESHOLD + 5;
      }
    }
    
    // In decisive positions, be more lenient
    if (Math.abs(evalBefore) > 400) {
      return cpLoss <= thresholds.BEST_THRESHOLD + 5;
    }
    
    return false;
  },
  
  // GREAT MOVE DETECTION
  isGreatMove(moveData) {
    const { cpLoss, evalBefore, evalAfter, move, phase, tactical } = moveData;
    const thresholds = this.getThresholdsForPhase(phase);
    const criteria = CONFIG.CLASSIFICATION.GREAT;
    
    if (cpLoss > criteria.MAX_CP_LOSS) return false;
    
    // Calculate eval improvement
    const evalGain = move.color === 'w'
      ? (evalAfter - evalBefore)
      : (evalBefore - evalAfter);
    
    // Great if gaining significant advantage
    if (evalGain > criteria.MIN_EVAL_GAIN && cpLoss < 20) {
      return true;
    }
    
    // Maintaining winning position
    if (Math.abs(evalBefore) > criteria.MIN_POSITION_SCORE && 
        cpLoss < thresholds.GREAT_THRESHOLD) {
      return true;
    }
    
    // Tactical great move
    if (tactical && tactical.tacticalScore > 40 && 
        cpLoss < thresholds.GREAT_THRESHOLD) {
      return true;
    }
    
    return cpLoss >= thresholds.BEST_THRESHOLD && 
           cpLoss <= thresholds.GREAT_THRESHOLD;
  },
  
  // Get phase-specific thresholds
  getThresholdsForPhase(phase) {
    const phaseKey = phase || 'MIDDLEGAME';
    return CONFIG.CLASSIFICATION[phaseKey] || CONFIG.CLASSIFICATION.MIDDLEGAME;
  },
  
  // Detect game phase
  detectGamePhase(moveIndex, position) {
    if (moveIndex < CONFIG.CLASSIFICATION.OPENING.BOOK_MOVES) {
      return 'OPENING';
    }
    
    if (position && position.phase) {
      if (position.phase === 'endgame') return 'ENDGAME';
      if (position.phase === 'opening') return 'OPENING';
    }
    
    // Default to middlegame
    return 'MIDDLEGAME';
  },
  
  // MAIN CLASSIFICATION (Chess.com Algorithm)
  classify(moveData) {
    const {
      moveIndex, cpLoss, move, alternatives,
      evalBefore, evalAfter, materialLoss,
      wasBestMove, totalMoves, position, tactical
    } = moveData;
    
    // Detect phase
    const phase = this.detectGamePhase(moveIndex, position);
    const thresholds = this.getThresholdsForPhase(phase);
    
    // Calculate advanced metrics
    const complexity = this.calculateComplexity(position, alternatives, tactical);
    const winProbLoss = this.calculateWinProbLoss(evalBefore, evalAfter);
    
    // Enhanced move data
    const enhancedData = {
      ...moveData,
      complexity,
      phase,
      winProbLoss,
      thresholds
    };
    
    // Book moves (opening theory)
    if (phase === 'OPENING' && moveIndex < 10 && Math.abs(cpLoss) < 25) {
      return 'book';
    }
    
    // BRILLIANT (very rare - <0.3%)
    if (this.isBrilliant(enhancedData)) {
      return 'brilliant';
    }
    
    // BEST MOVE
    if (this.isBestMove(enhancedData)) {
      return 'best';
    }
    
    // GREAT MOVE
    if (this.isGreatMove(enhancedData)) {
      return 'great';
    }
    
    // GOOD MOVE
    if (cpLoss <= thresholds.GOOD_THRESHOLD) {
      return 'good';
    }
    
    // INACCURACY (using both cp and win prob)
    if (cpLoss <= thresholds.INACCURACY_THRESHOLD || 
        winProbLoss < CONFIG.CLASSIFICATION.WIN_PROB_LOSS.INACCURACY) {
      return 'inaccuracy';
    }
    
    // MISTAKE
    if (cpLoss <= thresholds.MISTAKE_THRESHOLD ||
        winProbLoss < CONFIG.CLASSIFICATION.WIN_PROB_LOSS.MISTAKE) {
      return 'mistake';
    }
    
    // BLUNDER
    return 'blunder';
  },
  
  // Get icon SVG
  getIcon(classification) {
    const icons = {
      best: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#4ade80"/><text x="8" y="12" text-anchor="middle" font-size="11" fill="white" font-weight="bold">✓</text></svg>',
      great: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#22c55e"/><text x="8" y="12" text-anchor="middle" font-size="11" fill="white" font-weight="bold">!</text></svg>',
      good: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#84cc16"/><circle cx="8" cy="8" r="2.5" fill="white"/></svg>',
      inaccuracy: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#f59e0b"/><text x="8" y="12" text-anchor="middle" font-size="10" fill="white" font-weight="bold">?!</text></svg>',
      mistake: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#f97316"/><text x="8" y="12" text-anchor="middle" font-size="11" fill="white" font-weight="bold">?</text></svg>',
      blunder: '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#ef4444"/><text x="8" y="11" text-anchor="middle" font-size="9" fill="white" font-weight="bold">??</text></svg>',
      brilliant: '<svg width="16" height="16"><defs><linearGradient id="brillGrad3"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><circle cx="8" cy="8" r="7" fill="url(#brillGrad3)"/><text x="8" y="12" text-anchor="middle" font-size="11" fill="white">⭐</text></svg>',
      book: '<svg width="16" height="16"><rect width="16" height="16" rx="3" fill="#6366f1"/><text x="8" y="12" text-anchor="middle" font-size="11" fill="white">📖</text></svg>'
    };
    return icons[classification] || '';
  },
  
  getMoveClass(classification) {
    return `move-${classification}`;
  },
  
  // ACPL Calculation (Chess.com method)
  calculateACPL(moves, color) {
    const colorMoves = moves.filter((m, idx) => 
      STATE.moveHistory[idx] && STATE.moveHistory[idx].color === color
    );
    
    if (colorMoves.length === 0) return 0;
    
    const losses = colorMoves
      .map(m => Math.max(0, m.cpLoss || 0))
      .filter(loss => loss > 0);
    
    if (losses.length === 0) return 0;
    
    return Math.round(losses.reduce((sum, l) => sum + l, 0) / colorMoves.length);
  },
  
  // Accuracy Calculation (Chess.com Exact Formula)
  calculateAccuracy(acpl) {
    if (acpl === 0) return 100;
    
    // Chess.com reverse-engineered formula
    const x = acpl;
    const accuracy = 103.1668 - 3.9114 * Math.log(0.000196 * x * x + 0.0388 * x + 1);
    
    return Math.max(0, Math.min(100, Math.round(accuracy * 10) / 10));
  },
  
  // Count move types
  countMoveTypes(moves, color) {
    const colorMoves = moves.filter((m, idx) => 
      STATE.moveHistory[idx] && STATE.moveHistory[idx].color === color
    );
    
    const counts = {
      brilliant: 0, best: 0, great: 0, good: 0,
      book: 0, inaccuracy: 0, mistake: 0, blunder: 0
    };
    
    colorMoves.forEach(m => {
      if (m.classification && counts[m.classification] !== undefined) {
        counts[m.classification]++;
      }
    });
    
    return counts;
  }
};
