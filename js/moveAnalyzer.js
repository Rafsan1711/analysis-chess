// ============================================
// Move Analyzer - Ultra Complex Chess.com Level Engine
// ============================================

const MoveAnalyzer = {
  
  analysisCache: {},  // Cache for analyzed positions
  
  // Multi-depth progressive analysis
  async analyzeSingleMove(moveIndex) {
    if (!StockfishEngine.ready) {
      console.warn('⚠ Engine not ready');
      return null;
    }
    
    console.log(`🔍 Analyzing move ${moveIndex + 1} with multi-depth strategy...`);
    UIManager.updateStatus(`Deep analysis: move ${moveIndex + 1}...`);
    
    try {
      // Build position BEFORE the move
      const tempGame = new Chess();
      for (let i = 0; i < moveIndex; i++) {
        tempGame.move(STATE.moveHistory[i]);
      }
      
      const prevFen = tempGame.fen();
      const move = STATE.moveHistory[moveIndex];
      
      // Check cache first
      const cacheKey = `${prevFen}_${move.from}${move.to}`;
      if (this.analysisCache[cacheKey]) {
        console.log('✅ Using cached analysis');
        return this.analysisCache[cacheKey];
      }
      
      // Progressive depth analysis for accuracy
      // Step 1: Quick analysis (depth 12) for immediate feedback
      UIManager.updateStatus(`Quick scan: move ${moveIndex + 1}...`);
      const quickPrev = await StockfishEngine.analyze(prevFen, 12);
      await this.delay(100);
      
      tempGame.move(move);
      const currFen = tempGame.fen();
      const quickCurr = await StockfishEngine.analyze(currFen, 12);
      await this.delay(100);
      
      // Step 2: Deep analysis (depth 18) for accuracy
      UIManager.updateStatus(`Deep analysis: move ${moveIndex + 1}...`);
      const deepPrev = await StockfishEngine.analyze(prevFen, 18);
      await this.delay(100);
      
      tempGame.reset();
      for (let i = 0; i <= moveIndex; i++) {
        tempGame.move(STATE.moveHistory[i]);
      }
      const deepCurr = await StockfishEngine.analyze(currFen, 18);
      
      console.log(`📊 Move ${moveIndex + 1} - Quick:`, quickPrev.score, '→', quickCurr.score);
      console.log(`📊 Move ${moveIndex + 1} - Deep:`, deepPrev.score, '→', deepCurr.score);
      
      // Use deep analysis scores (more accurate)
      const prevAnalysis = deepPrev;
      const currAnalysis = deepCurr;
      
      // Calculate evaluation from moving player's perspective
      let evalBefore = prevAnalysis.score;
      let evalAfter = -currAnalysis.score; // Flip because turn changed
      
      // Perspective correction for black
      if (move.color === 'b') {
        evalBefore = -evalBefore;
        evalAfter = -evalAfter;
      }
      
      // Calculate centipawn loss (always positive for loss)
      const cpLoss = Math.max(0, evalBefore - evalAfter);
      
      // Enhanced material calculation
      const materialLoss = this.calculateEnhancedMaterial(move, tempGame);
      
      // Check if this was the best move
      const actualMove = move.from + move.to + (move.promotion || '');
      const wasBestMove = (prevAnalysis.bestMove === actualMove);
      
      // Calculate move alternatives (for brilliant detection)
      const alternatives = await this.getTopAlternatives(prevFen, prevAnalysis.bestMove);
      
      // Get position complexity
      const position = this.analyzePosition(tempGame);
      
      // Prepare comprehensive classification data
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
        quickEval: {
          before: quickPrev.score,
          after: quickCurr.score
        },
        deepEval: {
          before: deepPrev.score,
          after: deepCurr.score
        }
      };
      
      // Classify using ultra-complex algorithm
      const classification = MoveClassifier.classify(classificationData);
      
      console.log(`✅ Move ${moveIndex + 1}: ${classification.toUpperCase()} (cpLoss: ${cpLoss}cp, eval: ${evalBefore} → ${evalAfter})`);
      
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
        winProbLoss: MoveClassifier.calculateWinProbLoss(evalBefore, evalAfter),
        complexity: MoveClassifier.calculateComplexity(position, alternatives, cpLoss)
      };
      
      STATE.analysisData[moveIndex] = analysisResult;
      
      // Cache the result
      this.analysisCache[cacheKey] = analysisResult;
      
      return analysisResult;
      
    } catch (e) {
      console.error(`❌ Analysis error for move ${moveIndex + 1}:`, e);
      UIManager.updateStatus(`Analysis error: ${e}`);
      throw e;
    }
  },
  
  // Calculate enhanced material with positional context
  calculateEnhancedMaterial(move, game) {
    if (!move.captured) return 0;
    
    const baseValue = CONFIG.PIECE_VALUES[move.captured];
    
    // Positional bonuses
    let bonus = 0;
    
    // Center square capture bonus
    const file = move.to.charCodeAt(0) - 97;
    const rank = parseInt(move.to[1]) - 1;
    if (file >= 3 && file <= 4 && rank >= 3 && rank <= 4) {
      bonus += 20;
    }
    
    // Advanced piece capture bonus
    if (rank >= 5 && move.captured !== 'p') {
      bonus += 15;
    }
    
    return baseValue + bonus;
  },
  
  // Get top alternative moves for comparison
  async getTopAlternatives(fen, bestMove) {
    // In a real Chess.com implementation, this would use MultiPV
    // For now, we return the best move as alternative
    return [
      { move: bestMove, score: 0 }
    ];
  },
  
  // Analyze position characteristics
  analyzePosition(game) {
    const board = game.board();
    const fen = game.fen();
    
    // Count pieces
    let whitePieces = 0, blackPieces = 0;
    let whiteMaterial = 0, blackMaterial = 0;
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          const value = CONFIG.PIECE_VALUES[piece.type] || 0;
          if (piece.color === 'w') {
            whitePieces++;
            whiteMaterial += value;
          } else {
            blackPieces++;
            blackMaterial += value;
          }
        }
      }
    }
    
    // Determine game phase
    const totalPieces = whitePieces + blackPieces;
    let phase = 'middlegame';
    if (totalPieces <= 10) phase = 'endgame';
    else if (totalPieces >= 28) phase = 'opening';
    
    return {
      phase,
      whitePieces,
      blackPieces,
      whiteMaterial,
      blackMaterial,
      materialBalance: whiteMaterial - blackMaterial,
      isEndgame: phase === 'endgame',
      isTactical: game.in_check() || totalPieces < 20
    };
  },
  
  // Analyze all moves with progress tracking
  async analyzeAllMoves() {
    if (STATE.moveHistory.length === 0) {
      UIManager.showAlert('No moves to analyze!');
      return;
    }
    
    if (!StockfishEngine.ready) {
      UIManager.showAlert('Engine not ready yet. Please wait...');
      return;
    }
    
    STATE.isAnalyzing = true;
    UIManager.disableAnalyzeButton(true);
    UIManager.updateStatus('Starting deep analysis...');
    
    const startTime = Date.now();
    
    try {
      for (let i = 0; i < STATE.moveHistory.length; i++) {
        // Skip if already analyzed
        if (STATE.analysisData[i] && STATE.analysisData[i].classification) {
          console.log(`⏭ Skipping move ${i + 1} (already analyzed)`);
          continue;
        }
        
        // Analyze move with full depth
        await this.analyzeSingleMove(i);
        
        // Update progress
        const progress = ((i + 1) / STATE.moveHistory.length) * 100;
        UIManager.updateProgress(progress);
        
        // Update UI incrementally
        UIManager.updatePGNTable();
        UIManager.updateEvalGraph();
        
        // Delay to prevent engine overload
        await this.delay(200);
      }
      
      // Calculate comprehensive game statistics
      this.calculateAdvancedStatistics();
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      UIManager.updateProgress(0);
      UIManager.updateStatus(`✅ Complete analysis finished in ${elapsed}s`);
      
      console.log(`🎉 Full analysis complete! (${elapsed}s, ${STATE.moveHistory.length} moves)`);
      
    } catch (e) {
      console.error('❌ Analysis failed:', e);
      UIManager.updateStatus('Analysis failed: ' + e.message);
    } finally {
      STATE.isAnalyzing = false;
      UIManager.disableAnalyzeButton(false);
    }
  },
  
  // Calculate advanced game statistics (Chess.com style)
  calculateAdvancedStatistics() {
    const analyzedMoves = Object.values(STATE.analysisData).filter(m => m.classification);
    
    if (analyzedMoves.length === 0) return;
    
    // Calculate ACPL for both players
    const whiteACPL = MoveClassifier.calculateACPL(analyzedMoves, 'w');
    const blackACPL = MoveClassifier.calculateACPL(analyzedMoves, 'b');
    
    // Calculate accuracy using Chess.com formula
    const whiteAccuracy = MoveClassifier.calculateAccuracy(whiteACPL);
    const blackAccuracy = MoveClassifier.calculateAccuracy(blackACPL);
    
    // Count move types
    const whiteCounts = MoveClassifier.countMoveTypes(analyzedMoves, 'w');
    const blackCounts = MoveClassifier.countMoveTypes(analyzedMoves, 'b');
    
    // Calculate average win probability loss
    const whiteWinProbLosses = analyzedMoves
      .filter((m, i) => STATE.moveHistory[i].color === 'w')
      .map(m => m.winProbLoss || 0);
    const blackWinProbLosses = analyzedMoves
      .filter((m, i) => STATE.moveHistory[i].color === 'b')
      .map(m => m.winProbLoss || 0);
    
    const whiteAvgWPL = whiteWinProbLosses.length > 0
      ? whiteWinProbLosses.reduce((a, b) => a + b, 0) / whiteWinProbLosses.length
      : 0;
    const blackAvgWPL = blackWinProbLosses.length > 0
      ? blackWinProbLosses.reduce((a, b) => a + b, 0) / blackWinProbLosses.length
      : 0;
    
    // Store comprehensive statistics
    STATE.gameStats = {
      white: {
        acpl: whiteACPL,
        accuracy: whiteAccuracy,
        counts: whiteCounts,
        avgWinProbLoss: whiteAvgWPL.toFixed(1),
        expectedScore: MoveClassifier.calculateExpectedScore(whiteACPL)
      },
      black: {
        acpl: blackACPL,
        accuracy: blackAccuracy,
        counts: blackCounts,
        avgWinProbLoss: blackAvgWPL.toFixed(1),
        expectedScore: MoveClassifier.calculateExpectedScore(blackACPL)
      },
      totalMoves: STATE.moveHistory.length,
      analyzedMoves: analyzedMoves.length
    };
    
    // Update UI
    UIManager.updatePlayerAccuracy('white', whiteAccuracy);
    UIManager.updatePlayerAccuracy('black', blackAccuracy);
    
    console.log('📊 Advanced Game Statistics:', STATE.gameStats);
  },
  
  // Quick position evaluation (for real-time feedback)
  async quickEval(fen) {
    if (!StockfishEngine.ready) return null;
    
    try {
      const result = await StockfishEngine.analyze(fen, CONFIG.ENGINE.QUICK_DEPTH);
      return result.score;
    } catch (e) {
      console.error('Quick eval failed:', e);
      return null;
    }
  },
  
  // Utility delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Clear analysis cache
  clearCache() {
    this.analysisCache = {};
    console.log('🗑️ Analysis cache cleared');
  }
};
