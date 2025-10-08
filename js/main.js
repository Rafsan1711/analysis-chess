// ============================================
// Main Application Entry Point
// ============================================

(async function initApp() {
  console.log('🚀 Starting Chess Analysis Board...');
  console.log('📋 Configuration:', CONFIG);
  
  try {
    // Step 1: Initialize Stockfish Engine
    StockfishEngine.init();
    
    // Step 2: Initialize Board Manager
    await BoardManager.init();
    
    // Step 3: Setup UI Controls
    UIManager.setupControls();
    UIManager.setupModals();
    
    // Step 4: Initialize empty PGN table
    UIManager.updatePGNTable();
    UIManager.updateEvalBar(0);
    
    console.log('✅ Application initialized successfully!');
    console.log('');
    console.log('📖 How to use:');
    console.log('1. Make moves on the board (drag & drop)');
    console.log('2. OR import a PGN game (click download icon)');
    console.log('3. Click "Analyze" button to analyze all moves');
    console.log('4. Click on moves to navigate through the game');
    console.log('5. View statistics by clicking stats icon');
    console.log('');
    console.log('🎯 Features:');
    console.log('- Multi-depth Stockfish analysis');
    console.log('- Chess.com level move classification');
    console.log('- Accuracy calculation (ACPL based)');
    console.log('- Brilliant move detection');
    console.log('- Real-time evaluation graph');
    console.log('- Complete game statistics');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    UIManager.updateStatus('Failed to initialize: ' + error.message);
  }
})();

// ============================================
// Global Error Handler
// ============================================

window.onerror = function(message, source, lineno, colno, error) {
  console.error('💥 Global Error:', {
    message,
    source,
    lineno,
    colno,
    error
  });
  return false;
};

// ============================================
// Keyboard Shortcuts
// ============================================

document.addEventListener('keydown', function(e) {
  // Arrow keys for navigation
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    BoardManager.goToPreviousMove();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    BoardManager.goToNextMove();
  } else if (e.key === 'Home') {
    e.preventDefault();
    BoardManager.goToFirstMove();
  } else if (e.key === 'End') {
    e.preventDefault();
    BoardManager.goToLastMove();
  } else if (e.key === 'f' || e.key === 'F') {
    // Flip board
    BoardManager.flipBoard();
  } else if (e.key === 'a' || e.key === 'A') {
    // Analyze
    if (!STATE.isAnalyzing) {
      MoveAnalyzer.analyzeAllMoves();
    }
  }
});

// ============================================
// Utility Functions
// ============================================

// Debug helper
window.debugState = function() {
  console.log('📊 Current State:');
  console.log('Move History:', STATE.moveHistory.length, 'moves');
  console.log('Current Move Index:', STATE.currentMoveIndex);
  console.log('Analysis Data:', Object.keys(STATE.analysisData).length, 'moves analyzed');
  console.log('Game Metadata:', STATE.gameMetadata);
  console.log('Game Stats:', STATE.gameStats);
  console.log('Engine Ready:', StockfishEngine.ready);
  console.log('Engine Queue:', StockfishEngine.queue.length);
};

// Export game as PGN
window.exportGame = function() {
  PGNManager.downloadPGN();
  console.log('✅ Game exported!');
};

// Clear analysis
window.clearAnalysis = function() {
  if (confirm('Clear all analysis data?')) {
    STATE.analysisData = {};
    STATE.gameStats = null;
    UIManager.updatePGNTable();
    UIManager.updateEvalGraph();
    UIManager.updatePlayerAccuracy('white', 0);
    UIManager.updatePlayerAccuracy('black', 0);
    console.log('🗑️ Analysis cleared');
  }
};

// Reset board
window.resetBoard = function() {
  if (confirm('Reset board and clear game?')) {
    STATE.game.reset();
    STATE.board.position('start');
    STATE.moveHistory = [];
    STATE.currentMoveIndex = -1;
    STATE.analysisData = {};
    STATE.gameStats = null;
    
    UIManager.updatePGNTable();
    UIManager.updateEvalBar(0);
    UIManager.updateEvalGraph();
    UIManager.updateStatus('Board reset');
    
    console.log('🔄 Board reset');
  }
};

// Performance monitor
window.getPerformanceStats = function() {
  const stats = {
    totalMoves: STATE.moveHistory.length,
    analyzedMoves: Object.keys(STATE.analysisData).length,
    queueLength: StockfishEngine.queue.length,
    engineReady: StockfishEngine.ready,
    engineBusy: StockfishEngine.busy,
    memoryUsage: performance.memory ? {
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
    } : 'Not available'
  };
  
  console.table(stats);
  return stats;
};

// Test analysis accuracy
window.testAnalysis = async function() {
  console.log('🧪 Running analysis accuracy test...');
  
  // Test position: Scholar's Mate
  const testPGN = `
[Event "Test Game"]
[White "Test"]
[Black "Test"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
  `;
  
  PGNManager.loadPGN(testPGN);
  
  await new Promise(r => setTimeout(r, 1000));
  
  await MoveAnalyzer.analyzeAllMoves();
  
  console.log('✅ Test complete! Check analysis results.');
  console.log('Expected: Move 4 (Qxf7#) should be BEST or GREAT');
  console.log('Expected: Black moves should show mistakes/blunders');
};

// Console welcome message
console.log('%c♟️ Chess Analysis Board', 'font-size: 20px; font-weight: bold; color: #667eea;');
console.log('%cProfessional Chess.com Level Analysis', 'font-size: 14px; color: #888;');
console.log('');
console.log('%c🔧 Available Commands:', 'font-weight: bold; color: #22c55e;');
console.log('  debugState()       - View current state');
console.log('  exportGame()       - Download PGN');
console.log('  clearAnalysis()    - Clear analysis data');
console.log('  resetBoard()       - Reset everything');
console.log('  getPerformanceStats() - Performance info');
console.log('  testAnalysis()     - Run accuracy test');
console.log('');
console.log('%c⌨️ Keyboard Shortcuts:', 'font-weight: bold; color: #3b82f6;');
console.log('  ← →  Navigate moves');
console.log('  Home/End  First/Last move');
console.log('  F  Flip board');
console.log('  A  Analyze game');
console.log('');

// ============================================
// Service Worker Registration (Optional)
// ============================================

if ('serviceWorker' in navigator) {
  // Uncomment to enable offline support
  // navigator.serviceWorker.register('/sw.js')
  //   .then(() => console.log('✅ Service Worker registered'))
  //   .catch(e => console.log('⚠ Service Worker registration failed:', e));
}
