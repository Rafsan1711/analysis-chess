// ============================================
// Stockfish Engine Manager - SIMPLIFIED & WORKING
// ============================================

const StockfishEngine = {
  worker: null,
  ready: false,
  
  init() {
    console.log('🚀 Initializing Stockfish Engine...');
    
    try {
      // Create Web Worker with Blob
      const blobCode = `importScripts('${CONFIG.STOCKFISH_URL}');`;
      const blob = new Blob([blobCode], { type: 'application/javascript' });
      const blobURL = URL.createObjectURL(blob);
      
      this.worker = new Worker(blobURL);
      
      // Cleanup blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobURL), 5000);
      
      // Setup message handler
      this.worker.onmessage = (e) => {
        const line = e.data;
        if (line.indexOf('readyok') !== -1) {
          this.ready = true;
          console.log('✅ Stockfish ready!');
          UIManager.updateStatus('Engine ready - Make moves or import PGN');
        }
      };
      
      // Initialize engine
      this.worker.postMessage('uci');
      this.worker.postMessage(`setoption name Hash value ${CONFIG.ENGINE.HASH_SIZE}`);
      this.worker.postMessage(`setoption name Threads value ${CONFIG.ENGINE.THREADS}`);
      this.worker.postMessage(`setoption name Skill Level value ${CONFIG.ENGINE.SKILL_LEVEL}`);
      this.worker.postMessage('isready');
      
    } catch (e) {
      console.error('❌ Stockfish init failed:', e);
      UIManager.updateStatus('Engine failed to load');
    }
  },
  
  // Simple single evaluation
  analyze(fen, depth = CONFIG.ENGINE.STANDARD_DEPTH) {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.ready) {
        return reject('Engine not ready');
      }
      
      const timeout = setTimeout(() => {
        reject('Analysis timeout');
      }, CONFIG.ENGINE.TIMEOUT_MS);
      
      const result = {
        score: 0,
        bestMove: null,
        depth: 0
      };
      
      let gotBestMove = false;
      
      const handler = (e) => {
        const line = e.data;
        
        // Parse depth
        if (line.indexOf('info depth') !== -1) {
          const depthMatch = line.match(/depth (\d+)/);
          if (depthMatch) {
            result.depth = parseInt(depthMatch[1]);
          }
          
          // Get score
          if (line.indexOf('score cp') !== -1) {
            const cpMatch = line.match(/score cp (-?\d+)/);
            if (cpMatch) {
              result.score = parseInt(cpMatch[1]);
            }
          } else if (line.indexOf('score mate') !== -1) {
            const mateMatch = line.match(/score mate (-?\d+)/);
            if (mateMatch) {
              const mateIn = parseInt(mateMatch[1]);
              result.score = mateIn > 0 ? 10000 : -10000;
            }
          }
          
          // Get best move from PV
          if (line.indexOf(' pv ') !== -1) {
            const pvMatch = line.match(/pv\s+(\S+)/);
            if (pvMatch) {
              result.bestMove = pvMatch[1];
            }
          }
        }
        
        // Final bestmove
        if (line.indexOf('bestmove') === 0) {
          clearTimeout(timeout);
          this.worker.onmessage = null;
          gotBestMove = true;
          
          const parts = line.split(' ');
          if (!result.bestMove && parts[1]) {
            result.bestMove = parts[1];
          }
          
          console.log('✅ Analysis complete:', result);
          resolve(result);
        }
      };
      
      this.worker.onmessage = handler;
      
      // Send commands
      this.worker.postMessage('ucinewgame');
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }
};
