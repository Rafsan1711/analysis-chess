// ============================================
// PGN Manager - Import/Export PGN Games
// ============================================

const PGNManager = {
  
  // Parse PGN text
  parsePGN(pgnText) {
    const lines = pgnText.split('\n');
    const metadata = {};
    let moveText = '';
    
    // Parse headers [Key "Value"]
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('[')) {
        const match = line.match(/\[(\w+)\s+"(.+?)"\]/);
        if (match) {
          metadata[match[1].toLowerCase()] = match[2];
        }
      } else if (line.length > 0 && !line.startsWith('[')) {
        moveText += line + ' ';
      }
    }
    
    // Clean move text
    moveText = moveText
      .replace(/\{[^}]*\}/g, '')      // Remove comments {}
      .replace(/\([^)]*\)/g, '')      // Remove variations ()
      .replace(/[!?]+/g, '')          // Remove annotations
      .replace(/\d+-\d+/g, '')        // Remove result
      .replace(/\d+\.\.\./g, '')      // Remove ...
      .replace(/\d+\./g, '')          // Remove move numbers
      .trim();
    
    // Split into moves
    const moves = moveText.split(/\s+/).filter(m => m.length > 0);
    
    return { metadata, moves };
  },
  
  // Load PGN into the board
  loadPGN(pgnText) {
    try {
      console.log('📥 Loading PGN...');
      
      const parsed = this.parsePGN(pgnText);
      
      // Reset game state
      STATE.game.reset();
      STATE.moveHistory = [];
      STATE.currentMoveIndex = -1;
      STATE.analysisData = {};
      
      // Load metadata
      STATE.gameMetadata = {
        white: parsed.metadata.white || 'White',
        black: parsed.metadata.black || 'Black',
        whiteElo: parsed.metadata.whiteelo || '',
        blackElo: parsed.metadata.blackelo || '',
        event: parsed.metadata.event || '',
        date: parsed.metadata.date || '',
        result: parsed.metadata.result || '*'
      };
      
      // Update player info
      UIManager.updatePlayerInfo();
      
      // Load moves
      for (let i = 0; i < parsed.moves.length; i++) {
        const move = STATE.game.move(parsed.moves[i]);
        if (move) {
          STATE.moveHistory.push(move);
        } else {
          console.warn('⚠ Invalid move:', parsed.moves[i]);
          break;
        }
      }
      
      STATE.currentMoveIndex = STATE.moveHistory.length - 1;
      STATE.board.position(STATE.game.fen());
      
      UIManager.updatePGNTable();
      UIManager.updateEvalBar(0);
      UIManager.updateStatus(`PGN loaded: ${STATE.moveHistory.length} moves. Click Analyze!`);
      
      console.log('✅ PGN loaded successfully');
      
      // Close modal
      document.getElementById('pgnModal').style.display = 'none';
      
    } catch (e) {
      console.error('❌ PGN load error:', e);
      UIManager.showAlert('Error parsing PGN: ' + e.message);
    }
  },
  
  // Export current game as PGN
  exportPGN() {
    let pgn = '';
    
    // Headers
    pgn += `[Event "${STATE.gameMetadata.event || 'Casual Game'}"]\n`;
    pgn += `[Site "Chess Analysis Board"]\n`;
    pgn += `[Date "${STATE.gameMetadata.date || new Date().toISOString().split('T')[0]}"]\n`;
    pgn += `[White "${STATE.gameMetadata.white}"]\n`;
    pgn += `[Black "${STATE.gameMetadata.black}"]\n`;
    
    if (STATE.gameMetadata.whiteElo) {
      pgn += `[WhiteElo "${STATE.gameMetadata.whiteElo}"]\n`;
    }
    if (STATE.gameMetadata.blackElo) {
      pgn += `[BlackElo "${STATE.gameMetadata.blackElo}"]\n`;
    }
    
    pgn += `[Result "${STATE.gameMetadata.result || '*'}"]\n\n`;
    
    // Moves
    for (let i = 0; i < STATE.moveHistory.length; i++) {
      if (i % 2 === 0) {
        pgn += `${Math.floor(i / 2) + 1}. `;
      }
      pgn += STATE.moveHistory[i].san + ' ';
      
      // Add analysis annotation
      if (STATE.analysisData[i]) {
        const classification = STATE.analysisData[i].classification;
        const annotations = {
          brilliant: '!!',
          great: '!',
          inaccuracy: '?!',
          mistake: '?',
          blunder: '??'
        };
        if (annotations[classification]) {
          pgn += annotations[classification] + ' ';
        }
      }
    }
    
    pgn += STATE.gameMetadata.result || '*';
    
    return pgn;
  },
  
  // Download PGN file
  downloadPGN() {
    const pgn = this.exportPGN();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-game-${Date.now()}.pgn`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
};
