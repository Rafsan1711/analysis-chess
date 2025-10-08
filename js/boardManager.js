// ============================================
// Board Manager - Chessboard Interactions
// ============================================

const BoardManager = {
  
  async init() {
    console.log('🎮 Initializing Board Manager...');
    
    // Resolve piece images first
    await PieceResolver.resolveAll();
    
    // Create new chess game
    STATE.game = new Chess();
    
    // Board configuration
    const config = {
      draggable: true,
      position: 'start',
      pieceTheme: (piece) => PieceResolver.getPieceTheme(piece),
      onDragStart: this.onDragStart.bind(this),
      onDrop: this.onDrop.bind(this),
      onSnapEnd: this.onSnapEnd.bind(this)
    };
    
    // Initialize board
    STATE.board = Chessboard('myBoard', config);
    
    console.log('✅ Board initialized');
  },
  
  onDragStart(source, piece, position, orientation) {
    // Don't allow moves if game is over
    if (STATE.game.game_over()) return false;
    
    // Only allow player to move their own pieces
    if ((STATE.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (STATE.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false;
    }
    
    return true;
  },
  
  onDrop(source, target) {
    // Try to make the move
    const move = STATE.game.move({
      from: source,
      to: target,
      promotion: 'q' // Always promote to queen for simplicity
    });
    
    // Invalid move
    if (move === null) {
      this.playSound('incorrect');
      return 'snapback';
    }
    
    // Valid move - play appropriate sound
    this.playMoveSound(move);
    
    // Add to move history
    STATE.moveHistory.push(move);
    STATE.currentMoveIndex = STATE.moveHistory.length - 1;
    
    // Update UI
    UIManager.updatePGNTable();
    
    // Auto-analyze the move after a small delay
    setTimeout(() => {
      MoveAnalyzer.analyzeSingleMove(STATE.currentMoveIndex)
        .then(() => {
          UIManager.updatePGNTable();
          UIManager.updateEvalGraph();
        })
        .catch(e => console.error('Auto-analysis failed:', e));
    }, 100);
  },
  
  onSnapEnd() {
    STATE.board.position(STATE.game.fen());
  },
  
  // Play appropriate sound based on move type
  playMoveSound(move) {
    // Priority order: checkmate > check > castling > promotion > capture > move
    
    if (STATE.game.in_checkmate()) {
      this.playSound('checkmate');
    } else if (STATE.game.in_check()) {
      this.playSound('check');
    } else if (move.flags.includes('k') || move.flags.includes('q')) {
      // Castling (k = kingside, q = queenside)
      this.playSound('castling');
    } else if (move.flags.includes('p')) {
      // Promotion
      this.playSound('promote');
    } else if (move.flags.includes('c') || move.flags.includes('e')) {
      // Capture (c = capture, e = en passant)
      this.playSound('capture');
    } else {
      // Normal move
      this.playSound('move');
    }
  },
  
  // Navigation functions
  goToFirstMove() {
    if (STATE.moveHistory.length === 0) return;
    
    STATE.game.reset();
    STATE.board.position('start');
    STATE.currentMoveIndex = -1;
    
    UIManager.updatePGNTable();
    UIManager.updateEvalBar(0);
  },
  
  goToPreviousMove() {
    if (STATE.currentMoveIndex < 0) return;
    
    STATE.currentMoveIndex--;
    
    // Rebuild position
    STATE.game.reset();
    for (let i = 0; i <= STATE.currentMoveIndex; i++) {
      STATE.game.move(STATE.moveHistory[i]);
    }
    
    STATE.board.position(STATE.game.fen());
    UIManager.updatePGNTable();
    
    // Update eval bar
    if (STATE.currentMoveIndex >= 0 && STATE.analysisData[STATE.currentMoveIndex]) {
      UIManager.updateEvalBar(STATE.analysisData[STATE.currentMoveIndex].currEval);
    } else {
      UIManager.updateEvalBar(0);
    }
  },
  
  goToNextMove() {
    if (STATE.currentMoveIndex >= STATE.moveHistory.length - 1) return;
    
    STATE.currentMoveIndex++;
    STATE.game.move(STATE.moveHistory[STATE.currentMoveIndex]);
    STATE.board.position(STATE.game.fen());
    
    UIManager.updatePGNTable();
    
    if (STATE.analysisData[STATE.currentMoveIndex]) {
      UIManager.updateEvalBar(STATE.analysisData[STATE.currentMoveIndex].currEval);
    }
  },
  
  goToLastMove() {
    if (STATE.moveHistory.length === 0) return;
    
    STATE.currentMoveIndex = STATE.moveHistory.length - 1;
    
    STATE.game.reset();
    for (let i = 0; i <= STATE.currentMoveIndex; i++) {
      STATE.game.move(STATE.moveHistory[i]);
    }
    
    STATE.board.position(STATE.game.fen());
    UIManager.updatePGNTable();
    
    if (STATE.analysisData[STATE.currentMoveIndex]) {
      UIManager.updateEvalBar(STATE.analysisData[STATE.currentMoveIndex].currEval);
    }
  },
  
  goToMove(index) {
    STATE.currentMoveIndex = index;
    
    STATE.game.reset();
    for (let i = 0; i <= index; i++) {
      STATE.game.move(STATE.moveHistory[i]);
    }
    
    STATE.board.position(STATE.game.fen());
    UIManager.updatePGNTable();
    
    if (STATE.analysisData[index]) {
      UIManager.updateEvalBar(STATE.analysisData[index].currEval);
    }
  },
  
  flipBoard() {
    STATE.board.flip();
  },
  
  // Play sound by type
  playSound(type) {
    const sounds = {
      move: document.getElementById('moveSound'),
      capture: document.getElementById('captureSound'),
      promote: document.getElementById('promoteSound'),
      castling: document.getElementById('castlingSound'),
      check: document.getElementById('checkSound'),
      checkmate: document.getElementById('checkmateSound'),
      incorrect: document.getElementById('incorrectMoveSound')
    };
    
    const sound = sounds[type];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {
        // Silently fail if audio doesn't play (e.g., autoplay restrictions)
      });
    } else {
      console.warn(`⚠ Sound not found: ${type}`);
    }
  }
};
