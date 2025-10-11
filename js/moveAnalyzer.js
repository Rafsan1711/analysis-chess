// ============================================
// Move Analyzer - FIXED Sequential Analysis
// ============================================

const MoveAnalyzer = {
  
  analysisCache: new Map(),
  isAnalyzing: false,
  
  // Single move analysis - SEQUENTIAL (no parallel)
  async analyzeSingleMove(moveIndex) {
    if (!StockfishEngine.ready) {
      console.warn('⚠ Engine not ready');
      return null;
    }
    
    // Wait if engine is busy
    let attempts = 0;
    while (StockfishEngine.busy && attempts < 10) {
      console.log('⏳ Waiting for engine...');
      await this.delay(500);
      attempts++;
    }
    
    if (StockfishEngine.busy) {
      console.error('❌ Engine still busy after waiting');
      return null;
    }
    
    console.log(`🔍 Analyzing move ${moveIndex + 1}...`);
    UIManager.updateStatus(`Analyzing move ${moveIndex + 1}...`);
    
    try {
      // Build position BEFORE move
      const tempGame = new Chess();
      for (let i = 0; i < moveIndex; i++) {
        tempGame.move(STATE.moveHistory[i]);
      }
      
      const prevFen = tempGame.fen();
      const move = STATE.moveHistory[moveIndex];
      
      // Cache check
      const cacheKey = `${prevFen}_${move.from}${move.to}`;
      if (this.analysisCache.has(cacheKey)) {
        console.log(`✅ Cache hit for move ${moveIndex + 1}`);
        return this.analysisCache.get(cacheKey);
      }
      
      // Analyze position BEFORE move
      await this.delay(100);
      const prevAnalysis = await StockfishEngine.analyze(prevFen, 16);
      
      if (!prevAnalysis) {
        throw new Error('Failed to analyze position before move');
      }
      
      console.log(`📊 Before: ${prevAnalysis.score}`);
      
      // Apply move
      tempGame.move(move);
      const currFen = tempGame.fen();
      
      // Analyze position AFTER move
      await this.delay(100);
      const currAnalysis = await StockfishEngine.analyze(currFen, 16);
      
      if (!currAnalysis) {
        throw new Error('Failed to analyze position after move');
      }
      
      console.log(`📊 After: ${currAnalysis.score}`);
      
      // Calculate from moving player's perspective
      let evalBefore = prevAnalysis.score;
      let evalAfter = -currAnalysis.score;
      
      if (move.color === 'b') {
        evalBefore = -evalBefore;
        evalAfter = -evalAfter;
      }
      
      // Calculate CP loss
      const cpLoss = Math.max(0, evalBefore - evalAfter);
      
      // Material loss
      const materialLoss = move.captured ? (CONFIG.PIECE_VALUES[move.captured] || 0) : 0;
      
      // Check if best move
      const actualMove = move.from + move.to + (move.promotion || '');
      const wasBestMove = (prevAnalysis.bestMove === actualMove);
      
      // Position analysis
      const position = this.analyzePosition(tempGame, moveIndex);
      
      // Tactical patterns
      const tactical = MoveClassifier.detectTacticalPatterns(move, tempGame, position);
      
      // Classification
      const classificationData = {
        moveIndex,
        move,
        cpLoss,
        evalBefore,
        evalAfter,
        materialLoss,
        alternatives: prevAnalysis.alternatives || [],
        wasBestMove,
        totalMoves: STATE.moveHistory.length,
        position,
        tactical
      };
      
      const classification = MoveClassifier.classify(classificationData);
      
      console.log(`✅ Move ${moveIndex + 1}: ${classification.toUpperCase()} (cpLoss: ${cpLoss}cp)`);
      
      // Store result
      const result = {
        prevEval: prevAnalysis.score,
        currEval: currAnalysis.score,
        cpLoss,
        evalBefore,
        evalAfter,
        bestMove: prevAnalysis.bestMove,
        alternatives: prevAnalysis.alternatives || [],
        wasBestMove,
        materialLoss,
        classification,
        depth: prevAnalysis.depth,
        position,
        tactical
      };
      
      STATE.analysisData[moveIndex] = result;
      this.analysisCache.set(cacheKey, result);
      
      return result;
      
    } catch (e) {
      console.error(`❌ Error analyzing move ${moveIndex + 1}:`, e);
      return {
        classification: 'good',
        cpLoss: 0,
        error: e.message
      };
    }
  },
  
  // Analyze position
  analyzePosition(game, moveIndex) {
    const board = game.board();
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
    
    const totalPieces = whitePieces + blackPieces;
    let phase = 'middlegame';
    if (totalPieces <= 10) phase = 'endgame';
    else if (moveIndex < 12) phase = 'opening';
    
    return {
      phase,
      whitePieces,
      blackPieces,
      whiteMaterial,
      blackMaterial,
      materialBalance: whiteMaterial - blackMaterial,
      totalPieces,
      isEndgame: phase === 'endgame',
      isTactical: game.in_check() || totalPieces < 20
    };
  },
  
  // Analyze all moves
  async analyzeAllMoves() {
    if (STATE.moveHistory.length === 0) {
      UIManager.showAlert('No moves to analyze!');
      return;
    }
    
    if (!StockfishEngine.ready) {
      UIManager.showAlert('Engine not ready!');
      return;
    }
    
    if (this.isAnalyzing) {
      console.warn('⚠ Already analyzing');
      return;
    }
    
    this.isAnalyzing = true;
    STATE.isAnalyzing = true;
    UIManager.disableAnalyzeButton(true);
    
    const startTime = Date.now();
    
    console.log('🚀 Starting analysis...');
    console.log(`   Total moves: ${STATE.moveHistory.length}`);
    
    try {
      for (let i = 0; i < STATE.moveHistory.length; i++) {
        // Skip if already analyzed
        if (STATE.analysisData[i] && STATE.analysisData[i].classification) {
          console.log(`⏭ Move ${i + 1} already analyzed`);
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
        
        // Delay between moves
        await this.delay(300);
      }
      
      // Calculate statistics
      this.calculateStatistics();
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      UIManager.updateProgress(0);
      UIManager.updateStatus(`✅ Analysis complete! (${elapsed}s)`);
      
      console.log(`🎉 Analysis complete! (${elapsed}s)`);
      
    } catch (e) {
      console.error('❌ Analysis failed:', e);
      UIManager.updateStatus('Analysis failed: ' + e.message);
    } finally {
      this.isAnalyzing = false;
      STATE.isAnalyzing = false;
      UIManager.disableAnalyzeButton(false);
    }
  },
  
  // Calculate statistics
  calculateStatistics() {
    const analyzedMoves = Object.values(STATE.analysisData)
      .filter(m => m && m.classification);
    
    if (analyzedMoves.length === 0) return;
    
    const whiteACPL = MoveClassifier.calculateACPL(analyzedMoves, 'w');
    const blackACPL = MoveClassifier.calculateACPL(analyzedMoves, 'b');
    
    const whiteAccuracy = MoveClassifier.calculateAccuracy(whiteACPL);
    const blackAccuracy = MoveClassifier.calculateAccuracy(blackACPL);
    
    const whiteCounts = MoveClassifier.countMoveTypes(analyzedMoves, 'w');
    const blackCounts = MoveClassifier.countMoveTypes(analyzedMoves, 'b');
    
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
      analyzedMoves: analyzedMoves.length
    };
    
    UIManager.updatePlayerAccuracy('white', whiteAccuracy);
    UIManager.updatePlayerAccuracy('black', blackAccuracy);
    
    console.log('📊 Statistics:', STATE.gameStats);
  },
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  clearCache() {
    this.analysisCache.clear();
    console.log('🗑️ Cache cleared');
  }
};
