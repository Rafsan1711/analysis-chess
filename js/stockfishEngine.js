// ============================================
// Stockfish Engine Manager - ULTIMATE with Multi-PV
// ============================================

const StockfishEngine = {
  worker: null,
  ready: false,
  busy: false,
  currentHandler: null,
  
  init() {
    console.log('🚀 Initializing Ultimate Stockfish Engine...');
    
    try {
      const blobCode = `importScripts('${CONFIG.STOCKFISH_URL}');`;
      const blob = new Blob([blobCode], { type: 'application/javascript' });
      const blobURL = URL.createObjectURL(blob);
      
      this.worker = new Worker(blobURL);
      setTimeout(() => URL.revokeObjectURL(blobURL), 5000);
      
      this.worker.onmessage = (e) => {
        const line = e.data;
        if (line.indexOf('readyok') !== -1) {
          this.ready = true;
          console.log('✅ Stockfish Ultimate ready!');
          console.log(`   Threads: ${CONFIG.ENGINE.THREADS}, Hash: ${CONFIG.ENGINE.HASH_SIZE}MB, MultiPV: ${CONFIG.ENGINE.MULTI_PV}`);
          UIManager.updateStatus('Engine ready - Ultra-accurate analysis enabled');
        }
      };
      
      // Initialize with maximum settings
      this.worker.postMessage('uci');
      this.worker.postMessage(`setoption name Hash value ${CONFIG.ENGINE.HASH_SIZE}`);
      this.worker.postMessage(`setoption name Threads value ${CONFIG.ENGINE.THREADS}`);
      this.worker.postMessage(`setoption name Skill Level value ${CONFIG.ENGINE.SKILL_LEVEL}`);
      this.worker.postMessage(`setoption name MultiPV value ${CONFIG.ENGINE.MULTI_PV}`);
      this.worker.postMessage('setoption name UCI_LimitStrength value false');
      this.worker.postMessage('isready');
      
    } catch (e) {
      console.error('❌ Engine init failed:', e);
      UIManager.updateStatus('Engine failed - Please refresh');
    }
  },
  
  // Advanced Multi-PV analysis
  analyzeMultiPV(fen, depth = CONFIG.ENGINE.DEEP_DEPTH) {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.ready) {
        return reject('Engine not ready');
      }
      
      if (this.busy) {
        return reject('Engine busy');
      }
      
      this.busy = true;
      
      const timeout = setTimeout(() => {
        this.busy = false;
        this.worker.onmessage = null;
        reject('Analysis timeout');
      }, CONFIG.ENGINE.TIMEOUT_MS);
      
      const results = {
        mainLine: { score: 0, move: null, depth: 0, pv: [] },
        alternatives: [],
        finalDepth: 0
      };
      
      const pvData = {}; // Store data for each PV line
      
      const handler = (e) => {
        const line = e.data;
        
        // Parse info lines
        if (line.indexOf('info') !== -1 && line.indexOf('depth') !== -1) {
          // Extract depth
          const depthMatch = line.match(/depth (\d+)/);
          if (depthMatch) {
            results.finalDepth = Math.max(results.finalDepth, parseInt(depthMatch[1]));
          }
          
          // Extract MultiPV number
          let pvNum = 1;
          const pvMatch = line.match(/multipv (\d+)/);
          if (pvMatch) {
            pvNum = parseInt(pvMatch[1]);
          }
          
          if (!pvData[pvNum]) {
            pvData[pvNum] = { score: 0, move: null, pv: [], depth: 0 };
          }
          
          // Update depth
          if (depthMatch) {
            pvData[pvNum].depth = parseInt(depthMatch[1]);
          }
          
          // Extract score
          if (line.indexOf('score cp') !== -1) {
            const cpMatch = line.match(/score cp (-?\d+)/);
            if (cpMatch) {
              pvData[pvNum].score = parseInt(cpMatch[1]);
            }
          } else if (line.indexOf('score mate') !== -1) {
            const mateMatch = line.match(/score mate (-?\d+)/);
            if (mateMatch) {
              const mateIn = parseInt(mateMatch[1]);
              pvData[pvNum].score = mateIn > 0 ? 10000 + Math.abs(mateIn) : -10000 - Math.abs(mateIn);
              pvData[pvNum].mate = mateIn;
            }
          }
          
          // Extract PV line
          if (line.indexOf(' pv ') !== -1) {
            const pvLineMatch = line.match(/pv (.+)$/);
            if (pvLineMatch) {
              pvData[pvNum].pv = pvLineMatch[1].trim().split(' ').slice(0, 5);
              pvData[pvNum].move = pvData[pvNum].pv[0];
            }
          }
        }
        
        // Bestmove received - analysis complete
        if (line.indexOf('bestmove') === 0) {
          clearTimeout(timeout);
          this.busy = false;
          this.worker.onmessage = null;
          
          // Parse bestmove
          const parts = line.split(' ');
          const bestMove = parts[1];
          
          // Sort PV lines by score (descending)
          const sortedPVs = Object.keys(pvData)
            .map(k => pvData[k])
            .filter(pv => pv.move && pv.score !== undefined)
            .sort((a, b) => b.score - a.score);
          
          // Main line is PV 1 or best scored
          if (sortedPVs.length > 0) {
            results.mainLine = {
              score: sortedPVs[0].score,
              move: sortedPVs[0].move || bestMove,
              depth: results.finalDepth,
              pv: sortedPVs[0].pv,
              mate: sortedPVs[0].mate
            };
            
            // Alternatives are PV 2-5
            results.alternatives = sortedPVs.slice(1).map(pv => ({
              score: pv.score,
              move: pv.move,
              depth: pv.depth,
              mate: pv.mate
            }));
          } else {
            // Fallback if MultiPV parsing failed
            results.mainLine.move = bestMove;
          }
          
          if (CONFIG.DEBUG) {
            console.log('🔍 MultiPV Analysis:', results);
          }
          
          resolve(results);
        }
      };
      
      this.worker.onmessage = handler;
      
      // Send analysis commands
      this.worker.postMessage('ucinewgame');
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  },
  
  // Simple analysis (backward compatibility)
  analyze(fen, depth = CONFIG.ENGINE.STANDARD_DEPTH) {
    return this.analyzeMultiPV(fen, depth).then(result => ({
      score: result.mainLine.score,
      bestMove: result.mainLine.move,
      depth: result.finalDepth,
      alternatives: result.alternatives,
      pv: result.mainLine.pv,
      mate: result.mainLine.mate
    }));
  },
  
  // Stop current analysis
  stop() {
    if (this.worker && this.busy) {
      this.worker.postMessage('stop');
      this.busy = false;
    }
  },
  
  // Check if engine is available
  isAvailable() {
    return this.worker && this.ready && !this.busy;
  }
};
