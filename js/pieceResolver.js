// ============================================
// Piece Image Resolver
// ============================================

const PieceResolver = {
  candidates: {
    'wK': ['pieces/wK.svg', 'pieces/wKing.svg', 'pieces/WK.svg'],
    'wQ': ['pieces/wQ.svg', 'pieces/wQueen.svg', 'pieces/WQ.svg'],
    'wR': ['pieces/wR.svg', 'pieces/wRook.svg', 'pieces/WR.svg'],
    'wB': ['pieces/wB.svg', 'pieces/wBishop.svg', 'pieces/WB.svg'],
    'wN': ['pieces/wN.svg', 'pieces/wKnight.svg', 'pieces/WN.svg'],
    'wP': ['pieces/wP.svg', 'pieces/wPawn.svg', 'pieces/WP.svg'],
    'bK': ['pieces/bK.svg', 'pieces/bKing.svg', 'pieces/BK.svg'],
    'bQ': ['pieces/bQ.svg', 'pieces/bQueen.svg', 'pieces/BQ.svg'],
    'bR': ['pieces/bR.svg', 'pieces/bRook.svg', 'pieces/BR.svg'],
    'bB': ['pieces/bB.svg', 'pieces/bBishop.svg', 'pieces/BB.svg'],
    'bN': ['pieces/bN.svg', 'pieces/bKnight.svg', 'pieces/BN.svg'],
    'bP': ['pieces/bP.svg', 'pieces/bPawn.svg', 'pieces/BP.svg']
  },
  
  resolved: {},
  
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject(url);
      img.src = url;
    });
  },
  
  async resolvePiece(key, candidates) {
    for (let i = 0; i < candidates.length; i++) {
      try {
        const url = await this.loadImage(candidates[i]);
        console.log(`✓ Loaded piece: ${key} -> ${url}`);
        return url;
      } catch (e) {
        // Continue to next candidate
      }
    }
    console.warn(`⚠ No image found for ${key}`);
    return null;
  },
  
  async resolveAll() {
    console.log('🔍 Resolving piece images...');
    
    // Resolve all pieces
    for (const key in this.candidates) {
      this.resolved[key] = await this.resolvePiece(key, this.candidates[key]);
    }
    
    // Fallback: use any available piece as default
    let defaultPiece = null;
    for (const key in this.resolved) {
      if (this.resolved[key]) {
        defaultPiece = this.resolved[key];
        break;
      }
    }
    
    // Fill missing pieces with default
    for (const key in this.resolved) {
      if (!this.resolved[key]) {
        this.resolved[key] = defaultPiece;
      }
    }
    
    console.log('✅ All pieces resolved:', this.resolved);
    return this.resolved;
  },
  
  getPieceTheme(piece) {
    return this.resolved[piece] || this.resolved['wK'];
  }
};
