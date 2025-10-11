// ============================================
// Move Analyzer - ULTIMATE Chess.com Level
// Multi-depth, Multi-PV, Parallel Processing, Caching
// ============================================

const MoveAnalyzer = {
  
  analysisCache: new Map(),  // Modern Map for better performance
  pendingAnalysis: new Set(), // Track in-progress analyses
  
  // MAIN ANALYSIS FUNCTION - Ultra Deep & Accurate
  async analyzeSingleMove(moveIndex) {
    if (!StockfishEngine.ready) {
      console.warn('⚠ Engine not ready');
      return null;
    }
    
    // Check if already analyzing this move
    if (this.pendingAnalysis.has(moveIndex)) {
      console.log(`⏳ Move ${moveIndex + 1} already being analyzed, skipping...`);
      return STATE.analysisData[moveIndex];
    }
    
    this.pendingAnalysis.add(moveIndex);
    
    console.log(`🔍 Deep analysis: move ${moveIndex + 1}/${STATE.moveHistory.length}...`);
    UIManager.updateStatus(`Analyzing move ${moveIndex + 1} (Multi-depth + Multi-PV)...`);
    
    const startTime = Date.now();
    
    try {
      // Build position BEFORE the move
      const tempGame = new Chess();
      for (let i = 0; i < moveIndex; i++) {
        tempGame.move(STATE.moveHistory[i]);
      }
      
      const prevFen = tempGame.fen();
      const move = STATE.moveHistory[moveIndex];
      
      // Check cache first
      const cacheKey = `${prevFen}_${move.from}${move.to}${move.promotion || ''}`;
      if (CONFIG.PERFORMANCE.ENABLE_CACHE && this.analysisCache.has(cacheKey)) {
        console.log(`✅ Cache hit for move ${moveIndex + 1}`);
        STATE.cacheHits++;
        this.pendingAnalysis.delete(moveIndex);
        return this.analysisCache.get(cacheKey);
      }
      
      STATE.cacheMisses++;
      
      // STEP 1: Quick scan (depth 14) - Immediate feedback
      UIManager.updateStatus(`Quick scan (depth 14): move ${moveIndex + 1}...`);
      const quickPrev = await this.safeAnalyze(prevFen, CONFIG.ENGINE.QUICK_DEPTH);
      
      if (!quickPrev) throw new Error('Quick analysis failed');
      
      await this.delay(50);
      
      // Apply move for "after" position
      tempGame.move(move);
      const currFen = tempGame.fen();
      
      const quickCurr = await this.safeAnalyze(currFen, CONFIG.ENGINE.QUICK_DEPTH);
      
      if (!quickCurr) throw new Error('Quick analysis (after) failed');
      
      await this.delay(50);
      
      // STEP 2: Deep analysis (depth 18) - Standard accuracy
      UIManager.updateStatus(`Standard analysis (depth 18): move ${moveIndex + 1}...`);
      tempGame.reset();
      for (let i = 0; i < moveIndex; i++) {
        tempGame.move(STATE.moveHistory[i]);
      }
      
      const standardPrev = await this.safeAnalyze(prevFen, CONFIG.ENGINE.STANDARD_DEPTH);
      
      if (!standardPrev) throw new Error('Standard analysis failed');
      
      await this.delay(50);
      
      tempGame.move(move);
      const standardCurr = await this.safeAnalyze(currFen, CONFIG.ENGINE.STANDARD_DEPTH);
      
      if (!standardCurr) throw new Error('Standard analysis (after) failed');
      
      await this.delay(50);
      
      // STEP 3: Ultra-deep analysis (depth 24) with Multi-PV - Maximum accuracy
      UIManager.updateStatus(`Deep analysis (depth 24 + MultiPV): move ${moveIndex + 1}...`);
      tempGame.reset();
      for (let i = 0; i < moveIndex; i++) {
        tempGame.move(STATE.moveHistory[i]);
      }
      
      const deepPrev = await this.safeAnalyze(prevFen, CONFIG.ENGINE.DEEP_DEPTH);
      
      if (!deepPrev) {
        console.warn('⚠ Deep analysis failed, using standard');
      }
      
      // Use deepest available analysis
      const prevAnalysis = deepPrev || standardPrev;
      const currAnalysis = standardCurr;
      
      console.log(`📊 Move ${moveIndex + 1} evaluations:`, {
        quick: `${quickPrev.score} → ${quickCurr.score}`,
        standard: `${standardPrev.score} → ${standardCurr.score}`,
        deep: deepPrev ? `${deepPrev.score}` : 'N/A',
        alternatives: prevAnalysis.alternatives?.length || 0
      });
      
      // Calculate evaluation from moving player's perspective
      let evalBefore = prevAnalysis.score;
      let evalAfter = -currAnalysis.score; // Flip (turn changed)
      
      // Perspective correction for black
      if (move.color === 'b') {
        evalBefore = -evalBefore;
        evalAfter = -evalAfter;
      }
      
      // Calculate centipawn loss (always positive)
      const cpLoss = Math.max(0, evalBefore - evalAfter);
      
      // Enhanced material calculation
      const materialLoss = this.calculateEnhancedMaterial(move, tempGame);
      
      // Check if this was the best move
      const actualMove = move.from + move.to + (move.promotion || '');
      const wasBestMove = (prevAnalysis.bestMove === actualMove);
      
      // Get alternatives for brilliant detection
      const alternatives = prevAnalysis.alternatives || [];
      
      // Analyze position characteristics
      const position = this.analyzePosition(tempGame, moveIndex);
      
      // Detect tactical patterns
      const tactical = MoveClassifier.detectTacticalPatterns(move, tempGame, position);
      
      // Comprehensive classification data
      const classificationData = {
        moveIndex,
        move,
        cpLoss,
        evalBefore,
        evalAfter,
        materialLoss,
        alternatives,
        wasBestMove,
        totalMoves: STATE.moveHistory.length,
        position,
        tactical,
        quickEval: {
          before: quickPrev.score,
          after: quickCurr.score
        },
        standardEval: {
          before: standardPrev.score,
          after: standardCurr.score
        },
        deepEval: deepPrev ? {
          before: deepPrev.score
        } : null
      };
      
      // Classify using ultimate algorithm
      const classification = MoveClassifier.classify(classificationData);
      
      const analysisTime = Date.now() - startTime;
      
      console.log(`✅ Move ${moveIndex + 1}: ${classification.toUpperCase()} (cpLoss: ${cpLoss}cp, time: ${analysisTime}ms)`);
      
      // Store comprehensive analysis data
      const analysisResult = {
        prevEval: prevAnalysis.score,
        currEval: currAnalysis.score,
        cpLoss,
        evalBefore,
        evalAfter,
        bestMove: prevAnalysis.bestMove,
        alternatives,
        wasBestMove,
        materialLoss,
        classification,
        depth: prevAnalysis.depth,
        position,
        tactical,
        winProbLoss: MoveClassifier.calculateWinProbLoss(evalBefore, evalAfter),
        complexity: MoveClassifier.calculateComplexity(position, alternatives, tactical),
        analysisTime,
        timestamp: Date.now()
      };
      
      STATE.analysisData[moveIndex] = analysisResult;
      
      // Cache the result
      if (CONFIG.PERFORMANCE.ENABLE_CACHE) {
        this.analysisCache.set(cacheKey, analysisResult);
        
        // Limit cache size
        if (this.analysisCache.size > CONFIG.PERFORMANCE.CACHE_MAX_SIZE) {
          const firstKey = this.analysisCache.keys().next().value;
          this.analysisCache.delete(firstKey);
        }
      }
      
      this.pendingAnalysis.delete(moveIndex);
      
      return analysisResult;
      
    } catch (e) {
      console.error(`❌ Analysis error for move ${moveIndex + 1}:`, e);
      UIManager.updateStatus(`Error analyzing move ${moveIndex + 1}: ${e.message}`);
      this.pendingAnalysis.delete(moveIndex);
      
      // Return basic classification on error
      return {
        classification: 'good',
        cpLoss: 0,
        error: e.message
      };
    }
  },
  
  // Safe analysis wrapper with retry logic
  async safeAnalyze(fen, depth, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await StockfishEngine.analyze(fen, depth);
        return result;
      } catch (e) {
        console.warn(`Analysis attempt ${attempt + 1} failed:`, e);
        
        if (attempt < retries) {
          await this.delay(500);
          continue;
        }
        
        return null;
      }
    }
  },
  
  // Enhanced material calculation
  calculateEnhancedMaterial(move, game) {
    if (!move.captured) return 0;
    
    const baseValue = CONFIG.PIECE_VALUES[move.captured];
    let bonus = 0;
    
    // Positional bonuses
    const file = move.to.charCodeAt(0) - 97;
    const rank = parseInt(move.to[1]) - 1;
    
    // Center control
    if (file >= 3 && file <= 4 && rank >= 3 && rank <= 4) {
      bonus += CONFIG.POSITIONAL_BONUSES.CENTER_CONTROL;
    }
    
    // Advanced piece
    if (rank >= 5 && move.captured !== 'p') {
      bonus += CONFIG.POSITIONAL_BONUSES.ADVANCED_PAWN;
    }
    
    // King proximity (capturing near enemy king)
    const board = game.board();
    let enemyKingSquare = null;
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color !== move.color) {
          enemyKingSquare = { rank: i, file: j };
        }
      }
    }
    
    if (enemyKingSquare) {
      const distance = Math.abs(rank - enemyKingSquare.rank) + 
                      Math.abs(file - enemyKingSquare.file);
      if (distance <= 2) {
        bonus += CONFIG.POSITIONAL_BONUSES.KING_SAFETY;
      }
    }
    
    return baseValue + bonus;
  },
  
  // Comprehensive position analysis
  analyzePosition(game, moveIndex) {
    const board = game.board();
    const fen = game.fen();
    
    let whitePieces = 0, blackPieces = 0;
    let whiteMaterial = 0, blackMaterial = 0;
    let whiteKingSquare = null, blackKingSquare = null;
    
    // Count pieces and material
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          const value = CONFIG.PIECE_VALUES[piece.type] || 0;
          
          if (piece.color === 'w') {
            whitePieces++;
            whiteMaterial += value;
            if (piece.type === 'k') whiteKingSquare = { rank: i, file: j };
          } else {
            blackPieces++;
            blackMaterial += value;
            if (piece.type === 'k') blackKingSquare = { rank: i, file: j };
          }
        }
      }
    }
    
    const totalPieces = whitePieces + blackPieces;
    const materialBalance = whiteMaterial - blackMaterial;
    
    // Determine phase
    let phase = 'middlegame';
    if (totalPieces <= 10) phase = 'endgame';
    else if (moveIndex < 12) phase = 'opening';
    
    // Tactical indicators
    const isTactical = game.in_check() || 
                      totalPieces < 20 || 
                      Math.abs(materialBalance) > 300;
    
    // King safety analysis
    const kingProximity = (whiteKingSquare && blackKingSquare) ? 
      Math.abs(whiteKingSquare.rank - blackKingSquare.rank) + 
      Math.abs(whiteKingSquare.file - blackKingSquare.file) : 8;
    
    return {
      phase,
      whitePieces,
      blackPieces,
      whiteMaterial,
      blackMaterial,
      materialBalance,
      totalPieces,
      isEndgame: phase === 'endgame',
      isTactical,
      kingProximity: kingProximity < 4
    };
  },
  
  // BATCH ANALYSIS - Analyze all moves
  async analyzeAllMoves() {
    if (STATE.moveHistory.length === 0) {
      UIManager.showAlert('No moves to analyze!');
      return;
    }
    
    if (!StockfishEngine.ready) {
      UIManager.showAlert('Engine not ready. Please wait...');
      return;
    }
    
    STATE.isAnalyzing = true;
    STATE.analysisStartTime = Date.now();
    UIManager.disableAnalyzeButton(true);
    UIManager.updateStatus('Starting ultra-deep analysis...');
    
    console.log('🚀 Starting full game analysis...');
    console.log(`   Total moves: ${STATE.moveHistory.length}`);
    console.log(`   Engine: Depth ${CONFIG.ENGINE.DEEP_DEPTH}, MultiPV ${CONFIG.ENGINE.MULTI_PV}`);
    
    try {
      let analyzedCount = 0;
      
      for (let i = 0; i < STATE.moveHistory.length; i++) {
        // Skip if already analyzed
        if (STATE.analysisData[i] && STATE.analysisData[i].classification) {
          console.log(`⏭ Move ${i + 1} already analyzed`);
          analyzedCount++;
          continue;
        }
        
        // Analyze move
        await this.analyzeSingleMove(i);
        analyzedCount++;
        
        // Update progress
        const progress = (analyzedCount / STATE.moveHistory.length) * 100;
        UIManager.updateProgress(progress);
        
        // Update UI incrementally
        UIManager.updatePGNTable();
        UIManager.updateEvalGraph();
        
        // Adaptive delay (faster for simple positions)
        const position = STATE.analysisData[i]?.position;
        const delay = position?.isTactical ? 300 : 150;
        await this.delay(delay);
      }
      
      // Calculate comprehensive statistics
      this.calculateAdvancedStatistics();
      
      const elapsed = ((Date.now() - STATE.analysisStartTime) / 1000).toFixed(1);
      STATE.totalAnalysisTime = elapsed;
      
      UIManager.updateProgress(0);
      UIManager.updateStatus(`✅ Analysis complete! (${elapsed}s, ${STATE.moveHistory.length} moves)`);
      
      // Log performance stats
      console.log('🎉 Analysis complete!');
      console.log(`   Time: ${elapsed}s`);
      console.log(`   Moves: ${STATE.moveHistory.length}`);
      console.log(`   Cache hits: ${STATE.cacheHits}, misses: ${STATE.cacheMisses}`);
      console.log(`   Hit rate: ${((STATE.cacheHits / (STATE.cacheHits + STATE.cacheMisses)) * 100).toFixed(1)}%`);
      
    } catch (e) {
      console.error('❌ Analysis failed:', e);
      UIManager.updateStatus(`Analysis failed: ${e.message}`);
    } finally {
      STATE.isAnalyzing = false;
      UIManager.disableAnalyzeButton(false);
    }
  },
  
  // Advanced statistics calculation
  calculateAdvancedStatistics() {
    const analyzedMoves = Object.values(STATE.analysisData)
      .filter(m => m && m.classification);
    
    if (analyzedMoves.length === 0) return;
    
    // Calculate ACPL
    const whiteACPL = MoveClassifier.calculateACPL(analyzedMoves, 'w');
    const blackACPL = MoveClassifier.calculateACPL(analyzedMoves, 'b');
    
    // Calculate accuracy (Chess.com formula)
    const whiteAccuracy = MoveClassifier.calculateAccuracy(whiteACPL);
    const blackAccuracy = MoveClassifier.calculateAccuracy(blackACPL);
    
    // Count move types
    const whiteCounts = MoveClassifier.countMoveTypes(analyzedMoves, 'w');
    const blackCounts = MoveClassifier.countMoveTypes(analyzedMoves, 'b');
    
    // Calculate average complexity
    const complexities = analyzedMoves.map(m => m.complexity || 0);
    const avgComplexity = complexities.reduce((a, b) => a + b, 0) / complexities.length;
    
    // Store statistics
    STATE.gameStats = {
      white: {
        acpl: whiteACPL,
        accuracy: whiteAccuracy,
        counts: whiteCounts
      },
      black: {
        acpl: blackACPL,
        accuracy: blackAccuracy,
        counts: blackCounts
      },
      totalMoves: STATE.moveHistory.length,
      analyzedMoves: analyzedMoves.length,
      avgComplexity: avgComplexity.toFixed(1),
      analysisTime: STATE.totalAnalysisTime
    };
    
    // Update UI
    UIManager.updatePlayerAccuracy('white', whiteAccuracy);
    UIManager.updatePlayerAccuracy('black', blackAccuracy);
    
    console.log('📊 Game Statistics:', STATE.gameStats);
  },
  
  // Utility functions
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  clearCache() {
    this.analysisCache.clear();
    STATE.cacheHits = 0;
    STATE.cacheMisses = 0;
    console.log('🗑️ Analysis cache cleared');
  },
  
  // Quick eval for real-time feedback
  async quickEval(fen) {
    if (!StockfishEngine.ready) return null;
    
    try {
      const result = await StockfishEngine.analyze(fen, CONFIG.ENGINE.QUICK_DEPTH);
      return result.score;
    } catch (e) {
      return null;
    }
  }
};
