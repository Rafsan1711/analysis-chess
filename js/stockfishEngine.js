// ============================================
// Stockfish Engine Manager with Queue System
// ============================================

const StockfishEngine = {
  worker: null,
  ready: false,
  busy: false,
  queue: [],
  
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
      this.worker.postMessage(`setoption name MultiPV value ${CONFIG.ENGINE.MULTI_PV}`);
      this.worker.postMessage('isready');
      
    } catch (e) {
      console.error('❌ Stockfish init failed:', e);
      UIManager.updateStatus('Engine failed to load');
    }
  },
  
  // Evaluate position with MultiPV support
  analyze(fen, depth = CONFIG.ENGINE.STANDARD_DEPTH) {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.ready) {
        return reject('Engine not ready');
      }
      
      // Add to queue
      this.queue.push({ fen, depth, resolve, reject });
      this.processQueue();
    });
  },
  
  async processQueue() {
    if (this.busy || this.queue.length === 0) return;
    
    this.busy = true;
    const task = this.queue.shift();
    
    try {
      const result = await this.runAnalysis(task.fen, task.depth);
      task.resolve(result);
    } catch (e) {
      task.reject(e);
    }
    
    this.busy = false;
    
    // Process next in queue
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 50);
    }
  },
  
  runAnalysis(fen, depth) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject('Analysis timeout');
      }, CONFIG.ENGINE.TIMEOUT_MS);
      
      const result = {
        score: 0,
        mate: null,
        bestMove: null,
        alternatives: [],
        depth: 0
      };
      
      let currentPV = 1;
      const pvResults = {};
      
      const handler = (e) => {
        const line = e.data;
        
        // Parse info lines
        if (line.indexOf('info depth') !== -1) {
          const depthMatch = line.match(/depth (\d+)/);
          if (depthMatch) {
            result.depth = parseInt(depthMatch[1]);
          }
          
          // Get MultiPV number
          const pvMatch = line.match(/multipv (\d+)/);
          if (pvMatch) {
            currentPV = parseInt(pvMatch[1]);
          }
          
          // Get score
          if (line.indexOf('score cp') !== -1) {
            const cpMatch = line.match(/score cp (-?\d+)/);
            if (cpMatch) {
              const score = parseInt(cpMatch[1]);
              if (currentPV === 1) {
                result.score = score;
              }
              if (!pvResults[currentPV]) pvResults[currentPV] = {};
              pvResults[currentPV].score = score;
            }
          } else if (line.indexOf('score mate') !== -1) {
            const mateMatch = line.match(/score mate (-?\d+)/);
            if (mateMatch) {
              const mateIn = parseInt(mateMatch[1]);
              result.mate = mateIn;
              result.score = mateIn > 0 ? 10000 : -10000;
            }
          }
          
          // Get PV (principal variation)
          if (line.indexOf(' pv ') !== -1) {
            const pvLineMatch = line.match(/pv\s+(\S+)/);
            if (pvLineMatch) {
              const move = pvLineMatch[1];
              if (currentPV === 1) {
                result.bestMove = move;
              }
              if (!pvResults[currentPV]) pvResults[currentPV] = {};
              pvResults[currentPV].move = move;
            }
          }
        }
        
        // Done analyzing
        if (line.indexOf('bestmove') === 0) {
          clearTimeout(timeout);
          this.worker.onmessage = null;
          
          // Parse bestmove if not already set
          if (!result.bestMove) {
            const parts = line.split(' ');
            result.bestMove = parts[1];
          }
          
          // Store alternatives
          result.alternatives = Object.keys(pvResults)
            .map(pv => pvResults[pv])
            .filter(alt => alt.move && alt.score !== undefined);
          
          resolve(result);
        }
      };
      
      this.worker.onmessage = handler;
      
      // Send commands
      this.worker.postMessage('ucinewgame');
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  },
  
  // Stop current analysis
  stop() {
    if (this.worker) {
      this.worker.postMessage('stop');
    }
  },
  
  // Clear queue
  clearQueue() {
    this.queue = [];
  }
};
