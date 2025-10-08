// ============================================
// Move Analyzer - Core Analysis Logic
// ============================================

const MoveAnalyzer = {
  
  // Analyze a single move
  async analyzeSingleMove(moveIndex) {
    if (!StockfishEngine.ready) {
      console.warn('⚠ Engine not ready');
      return null;
    }
    
    console.log(`🔍 Analyzing move ${moveIndex + 1}...`);
    UIManager.updateStatus(`Analyzing move ${moveIndex + 1}...`);
    
    try {
      // Build position BEFORE the move
      const tempGame = new Chess();
      for (let i = 0; i < moveIndex; i++) {
        tempGame.move(STATE.moveHistory[i]);
      }
      
      const prevFen = tempGame.fen();
      const move = STATE.moveHistory[moveIndex];
      
      // Small delay to prevent overwhelming engine
      await new Promise(r => setTimeout(r, 100));
      
      // Analyze position BEFORE move
      const prevAnalysis = await StockfishEngine.analyze(prevFen, 14);
      
      console.log(`📊 Before move ${moveIndex + 1}:`, prevAnalysis);
      
      // Apply the move
      tempGame.move(move);
      const currFen = tempGame.fen();
      
      // Small delay
      await new Promise(r => setTimeout(r, 100));
      
      // Analyze position AFTER move
      const currAnalysis = await StockfishEngine.analyze(currFen, 14);
      
      console.log(`📊 After move ${moveIndex + 1}:`, currAnalysis);
      
      // Calculate evaluation from moving player's perspective
      let evalBefore = prevAnalysis.score;
      let evalAfter = -currAnalysis.score; // Flip because turn changed
      
      // If black moved, flip both
      if (move.color === 'b') {
        evalBefore = -evalBefore;
        evalAfter = -evalAfter;
      }
      
      // Calculate centipawn loss
      const cpLoss = Math.max(0, evalBefore - evalAfter);
      
      // Get material loss
      const materialLoss = MoveClassifier.getMaterialLoss(move);
      
      // Check if this was the best move
      const actualMove = move.from + move.to + (move.promotion || '');
      const wasBestMove = (prevAnalysis.bestMove === actualMove);
      
      // Prepare classification data
      const classificationData = {
        moveIndex,
        move,
        cpLoss,
        evalBefore,
        evalAfter,
        materialLoss,
        alternatives: [],
        wasBestMove
      };
      
      // Classify the move
      const classification = MoveClassifier.classify(classificationData);
      
      console.log(`✅ Move ${moveIndex + 1}: ${classification} (cpLoss: ${cpLoss})`);
      
      // Store analysis data
      const analysisResult = {
        prevEval: prevAnalysis.score,
        currEval: currAnalysis.score,
        cpLoss,
        evalBefore,
        evalAfter,
        bestMove: prevAnalysis.bestMove,
        wasBestMove,
        materialLoss,
        classification,
        depth: prevAnalysis.depth
      };
      
      STATE.analysisData[moveIndex] = analysisResult;
      
      return analysisResult;
      
    } catch (e) {
      console.error(`❌ Analysis error for move ${moveIndex + 1}:`, e);
      UIManager.updateStatus(`Analysis error: ${e}`);
      throw e;
    }
  },
  
  // Analyze all moves in the game
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
    UIManager.updateStatus('Analyzing all moves...');
    
    try {
      for (let i = 0; i < STATE.moveHistory.length; i++) {
        // Skip if already analyzed
        if (STATE.analysisData[i]) {
          continue;
        }
        
        // Analyze move
        await this.analyzeSingleMove(i);
        
        // Update progress
        const progress = ((i + 1) / STATE.moveHistory.length) * 100;
        UIManager.updateProgress(progress);
        
        // Update UI
        UIManager.updatePGNTable();
        UIManager.updateEvalGraph();
        
        // Small delay between moves
        await new Promise(r => setTimeout(r, CONFIG.ENGINE.MOVE_DELAY_MS));
      }
      
      // Calculate statistics
      this.calculateGameStatistics();
      
      UIManager.updateProgress(0);
      UIManager.updateStatus('✅ Full analysis complete!');
      
      console.log('🎉 Analysis complete!');
      
    } catch (e) {
      console.error('❌ Analysis failed:', e);
      UIManager.updateStatus('Analysis failed: ' + e.message);
    } finally {
      STATE.isAnalyzing = false;
      UIManager.disableAnalyzeButton(false);
    }
  },
  
  // Calculate game-wide statistics
  calculateGameStatistics() {
    const analyzedMoves = Object.values(STATE.analysisData);
    
    if (analyzedMoves.length === 0) return;
    
    // Calculate ACPL for both players
    const whiteACPL = MoveClassifier.calculateACPL(analyzedMoves, 'w');
    const blackACPL = MoveClassifier.calculateACPL(analyzedMoves, 'b');
    
    // Calculate accuracy
    const whiteAccuracy = MoveClassifier.calculateAccuracy(whiteACPL);
    const blackAccuracy = MoveClassifier.calculateAccuracy(blackACPL);
    
    // Count move types
    const whiteCounts = MoveClassifier.countMoveTypes(analyzedMoves, 'w');
    const blackCounts = MoveClassifier.countMoveTypes(analyzedMoves, 'b');
    
    // Store in STATE
    STATE.gameStats = {
      white: {
        acpl: whiteACPL,
        accuracy: whiteAccuracy,
        counts: whiteCounts
      },
      black: {
        acpl: blackACPL,
        accuracy: blackACPL,
        counts: blackCounts
      }
    };
    
    // Update UI
    UIManager.updatePlayerAccuracy('white', whiteAccuracy);
    UIManager.updatePlayerAccuracy('black', blackAccuracy);
    
    console.log('📊 Game Statistics:', STATE.gameStats);
  },
  
  // Quick position evaluation (for real-time feedback)
  async quickEval(fen) {
    if (!StockfishEngine.ready) return null;
    
    try {
      const result = await StockfishEngine.analyze(
        fen,
        CONFIG.ENGINE.QUICK_DEPTH
      );
      return result.score;
    } catch (e) {
      console.error('Quick eval failed:', e);
      return null;
    }
  }
};
