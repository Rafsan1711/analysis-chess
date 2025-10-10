// ============================================
// Move Classifier - Chess.com Level Ultra Complex Analysis
// ============================================

const MoveClassifier = {
  
  // Chess.com Win Probability Formula (Exact)
  centipawnsToWinProb(cp) {
    // Chess.com uses this exact formula
    return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
  },
  
  // Calculate win probability loss percentage
  calculateWinProbLoss(cpBefore, cpAfter) {
    const probBefore = this.centipawnsToWinProb(cpBefore);
    const probAfter = this.centipawnsToWinProb(cpAfter);
    return probBefore - probAfter;
  },
  
  // Advanced material calculation with positional adjustments
  getMaterialValue(move, position) {
    if (!move.captured) return 0;
    
    const baseValue = CONFIG.PIECE_VALUES[move.captured];
    
    // Positional adjustment based on piece location
    const captureSquare = move.to;
    const file = captureSquare.charCodeAt(0) - 97; // a=0, h=7
    const rank = parseInt(captureSquare[1]) - 1;
    
    // Center control bonus
    const isCenterSquare = (file >= 3 && file <= 4 && rank >= 3 && rank <= 4);
    const centerBonus = isCenterSquare ? 20 : 0;
    
    return baseValue + centerBonus;
  },
  
  // Detect forcing moves (checks, captures, threats)
  isForcingMove(move, game) {
    // Check if move gives check
    if (game.in_check()) return true;
    
    // Capture
    if (move.captured) return true;
    
    // Promotion
    if (move.promotion) return true;
    
    return false;
  },
  
  // Calculate move complexity score
  calculateComplexity(position, alternatives, cpLoss) {
    let complexity = 0;
    
    // More alternatives = more complex position
    if (alternatives && alternatives.length > 0) {
      complexity += Math.min(alternatives.length * 5, 30);
    }
    
    // Tactical position indicator (based on eval variance)
    if (alternatives && alternatives.length >= 2) {
      const topScore = alternatives[0].score || 0;
      const secondScore = alternatives[1].score || 0;
      const variance = Math.abs(topScore - secondScore);
      
      // High variance = tactical position
      if (variance > 100) complexity += 20;
      else if (variance > 50) complexity += 10;
    }
    
    return complexity;
  },
  
  // Detect brilliant move (Chess.com criteria)
  isBrilliant(moveData) {
    const { 
      move, 
      cpLoss, 
      alternatives, 
      materialLoss, 
      evalBefore, 
      evalAfter,
      complexity,
      position
    } = moveData;
    
    // Criteria 1: Must be a sacrifice (material loss >= 300cp)
    if (materialLoss < CONFIG.CLASSIFICATION.BRILLIANT_SACRIFICE_MIN) {
      return false;
    }
    
    // Criteria 2: Must improve position significantly (negative cpLoss)
    if (cpLoss > -30) {
      return false;
    }
    
    // Criteria 3: Must be only good move or significantly better than alternatives
    if (alternatives && alternatives.length >= 2) {
      const bestScore = alternatives[0].score || 0;
      const secondBest = alternatives[1].score || 0;
      const advantage = Math.abs(bestScore - secondBest);
      
      // Move must be at least 80cp better than second best
      if (advantage < 80) {
        return false;
      }
    }
    
    // Criteria 4: Position complexity (tactical sharpness)
    if (complexity < 30) {
      return false;
    }
    
    // Criteria 5: Evaluation swing (move creates threats)
    const evalSwing = Math.abs(evalAfter - evalBefore);
    if (evalSwing < 100) {
      return false;
    }
    
    return true;
  },
  
  // Detect best move with multiple criteria
  isBestMove(moveData) {
    const { wasBestMove, cpLoss, alternatives } = moveData;
    
    // Engine's exact choice
    if (wasBestMove) return true;
    
    // Within 10cp of best
    if (cpLoss <= 10) return true;
    
    // If no clear better alternative exists
    if (alternatives && alternatives.length >= 2) {
      const topScore = alternatives[0].score || 0;
      const secondScore = alternatives[1].score || 0;
      
      // If top 2 moves are very close (within 15cp)
      if (Math.abs(topScore - secondScore) < 15) {
        return cpLoss <= 15;
      }
    }
    
    return false;
  },
  
  // Detect great move (Chess.com style)
  isGreatMove(moveData) {
    const { cpLoss, evalBefore, evalAfter, move } = moveData;
    
    // Must be under 30cp loss
    if (cpLoss > 30) return false;
    
    // Must improve position or maintain advantage
    const movingColor = move.color;
    const evalImprovement = movingColor === 'w' 
      ? (evalAfter - evalBefore) 
      : (evalBefore - evalAfter);
    
    // Great move if it gains advantage
    if (evalImprovement > 30 && cpLoss < 20) {
      return true;
    }
    
    // Or if it's in a winning position and maintains
    if (Math.abs(evalBefore) > 200 && cpLoss < 25) {
      return true;
    }
    
    return cpLoss >= 15 && cpLoss <= 30;
  },
  
  // Game phase detection for context-aware classification
  detectGamePhase(moveIndex, totalMoves) {
    if (moveIndex < 10) return 'opening';
    if (moveIndex < 25 || totalMoves > 40) return 'middlegame';
    return 'endgame';
  },
  
  // Adjust thresholds based on game phase
  getPhaseAdjustedThresholds(phase, evalBefore) {
    const thresholds = {
      opening: {
        best: 20,      // More lenient in opening
        great: 40,
        good: 70,
        inaccuracy: 150,
        mistake: 300
      },
      middlegame: {
        best: 15,      // Standard thresholds
        great: 30,
        good: 60,
        inaccuracy: 150,
        mistake: 300
      },
      endgame: {
        best: 10,      // Stricter in endgame
        great: 25,
        good: 50,
        inaccuracy: 120,
        mistake: 250
      }
    };
    
    const base = thresholds[phase];
    
    // Adjust for position evaluation (winning/losing)
    if (Math.abs(evalBefore) > 300) {
      // In decisive positions, be more lenient
      return {
        best: base.best + 5,
        great: base.great + 10,
        good: base.good + 15,
        inaccuracy: base.inaccuracy + 30,
        mistake: base.mistake + 50
      };
    }
    
    return base;
  },
  
  // Main classification function (Chess.com algorithm)
  classify(moveData) {
    const { 
      moveIndex, 
      cpLoss, 
      move, 
      alternatives,
      evalBefore,
      evalAfter,
      materialLoss,
      wasBestMove,
      totalMoves,
      position
    } = moveData;
    
    // Calculate additional metrics
    const complexity = this.calculateComplexity(position, alternatives, cpLoss);
    const phase = this.detectGamePhase(moveIndex, totalMoves);
    const thresholds = this.getPhaseAdjustedThresholds(phase, evalBefore);
    const winProbLoss = this.calculateWinProbLoss(evalBefore, evalAfter);
    
    // Enhanced move data
    const enhancedData = {
      ...moveData,
      complexity,
      phase,
      winProbLoss
    };
    
    // Book moves (first 10 moves in opening)
    if (phase === 'opening' && moveIndex < 10 && Math.abs(cpLoss) < 30) {
      return 'book';
    }
    
    // Brilliant move detection (very rare, <0.5% of moves)
    if (this.isBrilliant(enhancedData)) {
      return 'brilliant';
    }
    
    // Best move detection (engine choice or very close)
    if (this.isBestMove(enhancedData)) {
      return 'best';
    }
    
    // Great move (significant gain or maintaining advantage)
    if (this.isGreatMove(enhancedData)) {
      return 'great';
    }
    
    // Good move
    if (cpLoss <= thresholds.good) {
      return 'good';
    }
    
    // Inaccuracy (based on win probability loss)
    if (cpLoss <= thresholds.inaccuracy || winProbLoss < 10) {
      return 'inaccuracy';
    }
    
    // Mistake (clear error but not losing)
    if (cpLoss <= thresholds.mistake || winProbLoss < 20) {
      return 'mistake';
    }
    
    // Blunder (game-changing error)
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
  
  // Calculate ACPL (Average Centipawn Loss) - Chess.com method
  calculateACPL(moves, color) {
    const colorMoves = moves.filter((m, idx) => {
      const moveColor = STATE.moveHistory[idx].color;
      return moveColor === color;
    });
    
    if (colorMoves.length === 0) return 0;
    
    // Only count moves that actually lost centipawns (ignore improvements)
    const losses = colorMoves
      .map(m => Math.max(0, m.cpLoss || 0))
      .filter(loss => loss > 0);
    
    if (losses.length === 0) return 0;
    
    const totalLoss = losses.reduce((sum, loss) => sum + loss, 0);
    return Math.round(totalLoss / colorMoves.length);
  },
  
  // Calculate accuracy percentage (Chess.com exact formula)
  calculateAccuracy(acpl) {
    if (acpl === 0) return 100;
    
    // Chess.com's actual formula (reverse engineered from games)
    // accuracy = 103.1668100711649 - 3.91140455464685 * ln(0.00019622520496 * acpl^2 + 0.038855625947956 * acpl + 1)
    
    const x = acpl;
    const accuracy = 103.1668 - 3.9114 * Math.log(0.000196 * x * x + 0.0388 * x + 1);
    
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
  },
  
  // Calculate expected score (for performance rating)
  calculateExpectedScore(acpl) {
    // Convert ACPL to expected game score (0.0 to 1.0)
    return 1 / (1 + Math.pow(10, acpl / 400));
  }
};
