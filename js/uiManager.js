// ============================================
// UI Manager - All UI Updates & Controls
// ============================================

const UIManager = {
  
  // Update status bar
  updateStatus(message) {
    const statusBar = document.getElementById('statusBar');
    statusBar.innerHTML = message;
  },
  
  // Update progress bar
  updateProgress(percent) {
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = percent + '%';
  },
  
  // Update evaluation bar
  updateEvalBar(evaluation) {
    const evalBarWhite = document.getElementById('evalBarWhite');
    const evalBarBlack = document.getElementById('evalBarBlack');
    const evalNumber = document.getElementById('evalNumber');
    
    // Clamp evaluation
    const clampedEval = Math.max(
      CONFIG.UI.EVAL_CLAMP_MIN,
      Math.min(CONFIG.UI.EVAL_CLAMP_MAX, evaluation)
    );
    
    // Convert to percentage (50% = equal)
    const percentage = 50 + (clampedEval / 30);
    const finalPercent = Math.max(0, Math.min(100, percentage));
    
    evalBarWhite.style.height = finalPercent + '%';
    evalBarBlack.style.height = (100 - finalPercent) + '%';
    
    // Update number display
    const displayEval = (evaluation / 100).toFixed(1);
    
    if (evaluation > 0) {
      evalNumber.textContent = '+' + displayEval;
      evalNumber.style.color = '#fff';
    } else if (evaluation < 0) {
      evalNumber.textContent = displayEval;
      evalNumber.style.color = '#fff';
    } else {
      evalNumber.textContent = '0.0';
      evalNumber.style.color = '#fff';
    }
    
    // Handle mate scores
    if (Math.abs(evaluation) >= 10000) {
      const mateIn = Math.abs(evaluation) - 10000;
      evalNumber.textContent = (evaluation > 0 ? '+M' : '-M') + mateIn;
      evalBarWhite.style.height = evaluation > 0 ? '100%' : '0%';
      evalBarBlack.style.height = evaluation > 0 ? '0%' : '100%';
    }
  },
  
  // Update PGN table
  updatePGNTable() {
    const tbody = document.getElementById('pgnTableBody');
    tbody.innerHTML = '';
    
    if (STATE.moveHistory.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888;">No moves yet</td></tr>';
      return;
    }
    
    for (let i = 0; i < STATE.moveHistory.length; i += 2) {
      const row = document.createElement('tr');
      const moveNum = Math.floor(i / 2) + 1;
      
      // Move number
      const numCell = document.createElement('td');
      numCell.className = 'move-number';
      numCell.textContent = moveNum + '.';
      row.appendChild(numCell);
      
      // White move
      const whiteCell = this.createMoveCell(i);
      row.appendChild(whiteCell);
      
      // Black move
      const blackCell = this.createMoveCell(i + 1);
      row.appendChild(blackCell);
      
      tbody.appendChild(row);
    }
  },
  
  createMoveCell(index) {
    const cell = document.createElement('td');
    
    if (index >= STATE.moveHistory.length) {
      return cell;
    }
    
    cell.className = 'move-cell';
    cell.dataset.index = index;
    
    // Move text
    const moveText = document.createElement('span');
    moveText.className = 'move-text';
    moveText.textContent = STATE.moveHistory[index].san;
    cell.appendChild(moveText);
    
    // Analysis icon
    if (STATE.analysisData[index]) {
      const analysis = STATE.analysisData[index];
      const icon = document.createElement('span');
      icon.className = 'move-icon';
      icon.innerHTML = MoveClassifier.getIcon(analysis.classification);
      cell.appendChild(icon);
      
      // Add background color class
      cell.classList.add(MoveClassifier.getMoveClass(analysis.classification));
    }
    
    // Highlight current move
    if (index === STATE.currentMoveIndex) {
      cell.classList.add('current');
    }
    
    // Click handler
    cell.onclick = () => BoardManager.goToMove(index);
    
    return cell;
  },
  
  // Update evaluation graph
  updateEvalGraph() {
    const canvas = document.getElementById('evalGraph');
    const ctx = canvas.getContext('2d');
    
    // Collect evaluation data
    const labels = [];
    const data = [];
    
    for (let i = 0; i < STATE.moveHistory.length; i++) {
      if (STATE.analysisData[i]) {
        labels.push(Math.floor(i / 2) + 1 + (i % 2 === 0 ? '.' : '...'));
        data.push(STATE.analysisData[i].currEval / 100); // Convert to pawns
      }
    }
    
    // Destroy previous chart
    if (STATE.evalChart) {
      STATE.evalChart.destroy();
    }
    
    // Create new chart
    STATE.evalChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Evaluation',
          data: data,
          borderColor: '#667eea',
          backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return null;
            
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(102, 126, 234, 0.1)');
            gradient.addColorStop(0.5, 'rgba(102, 126, 234, 0.05)');
            gradient.addColorStop(1, 'rgba(102, 126, 234, 0.1)');
            return gradient;
          },
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#667eea',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#888' }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#888' },
            title: {
              display: true,
              text: 'Evaluation (pawns)',
              color: '#888'
            }
          }
        }
      }
    });
  },
  
  // Update player info
  updatePlayerInfo() {
    const whiteText = STATE.gameMetadata.white +
      (STATE.gameMetadata.whiteElo ? ` <span class="player-elo">(${STATE.gameMetadata.whiteElo})</span>` : '');
    
    const blackText = STATE.gameMetadata.black +
      (STATE.gameMetadata.blackElo ? ` <span class="player-elo">(${STATE.gameMetadata.blackElo})</span>` : '');
    
    document.getElementById('whitePlayer').innerHTML = `<span class="player-name">${whiteText}</span><span class="player-accuracy" id="whiteAccuracy"></span>`;
    document.getElementById('blackPlayer').innerHTML = `<span class="player-name">${blackText}</span><span class="player-accuracy" id="blackAccuracy"></span>`;
  },
  
  // Update player accuracy display
  updatePlayerAccuracy(color, accuracy) {
    const elementId = color === 'white' ? 'whiteAccuracy' : 'blackAccuracy';
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = accuracy.toFixed(1) + '%';
    }
  },
  
  // Update statistics modal
  updateStatistics() {
    if (!STATE.gameStats) return;
    
    const { white, black } = STATE.gameStats;
    
    // White stats
    document.getElementById('whiteAccuracyStat').textContent = white.accuracy.toFixed(1) + '%';
    document.getElementById('whiteACPL').textContent = white.acpl;
    document.getElementById('whiteBestMoves').textContent = white.counts.best + white.counts.great;
    document.getElementById('whiteInaccuracies').textContent = white.counts.inaccuracy;
    document.getElementById('whiteMistakes').textContent = white.counts.mistake;
    document.getElementById('whiteBlunders').textContent = white.counts.blunder;
    
    // Black stats
    document.getElementById('blackAccuracyStat').textContent = black.accuracy.toFixed(1) + '%';
    document.getElementById('blackACPL').textContent = black.acpl;
    document.getElementById('blackBestMoves').textContent = black.counts.best + black.counts.great;
    document.getElementById('blackInaccuracies').textContent = black.counts.inaccuracy;
    document.getElementById('blackMistakes').textContent = black.counts.mistake;
    document.getElementById('blackBlunders').textContent = black.counts.blunder;
  },
  
  // Disable/enable analyze button
  disableAnalyzeButton(disabled) {
    document.getElementById('analyzeBtn').disabled = disabled;
  },
  
  // Show alert
  showAlert(message) {
    alert(message);
  },
  
  // Setup modal handlers
  setupModals() {
    // Info modal
    document.getElementById('infoBtn').onclick = () => {
      document.getElementById('infoModal').style.display = 'block';
    };
    document.getElementById('closeInfoModal').onclick = () => {
      document.getElementById('infoModal').style.display = 'none';
    };
    
    // PGN modal
    document.getElementById('pgnInputBtn').onclick = () => {
      document.getElementById('pgnModal').style.display = 'block';
    };
    document.getElementById('closePgnModal').onclick = () => {
      document.getElementById('pgnModal').style.display = 'none';
    };
    document.getElementById('submitPgn').onclick = () => {
      const pgnText = document.getElementById('pgnInput').value;
      if (pgnText.trim()) {
        PGNManager.loadPGN(pgnText);
      }
    };
    
    // Stats modal
    document.getElementById('statsBtn').onclick = () => {
      this.updateStatistics();
      document.getElementById('statsModal').style.display = 'block';
    };
    document.getElementById('closeStatsModal').onclick = () => {
      document.getElementById('statsModal').style.display = 'none';
    };
    
    // Close modals on outside click
    window.onclick = (event) => {
      if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
      }
    };
  },
  
  // Setup control buttons
  setupControls() {
    document.getElementById('firstBtn').onclick = () => BoardManager.goToFirstMove();
    document.getElementById('prevBtn').onclick = () => BoardManager.goToPreviousMove();
    document.getElementById('nextBtn').onclick = () => BoardManager.goToNextMove();
    document.getElementById('lastBtn').onclick = () => BoardManager.goToLastMove();
    document.getElementById('flipBtn').onclick = () => BoardManager.flipBoard();
    
    // Scroll lock toggle
    document.getElementById('lockScrollBtn').onclick = function() {
      STATE.scrollLocked = !STATE.scrollLocked;
      if (STATE.scrollLocked) {
        document.body.classList.add('scroll-locked');
        this.classList.add('toggle-active');
        UIManager.updateStatus('Scroll locked - easier mobile dragging');
      } else {
        document.body.classList.remove('scroll-locked');
        this.classList.remove('toggle-active');
        UIManager.updateStatus('Scroll unlocked');
      }
    };
    
    // Analyze button
    document.getElementById('analyzeBtn').onclick = () => {
      MoveAnalyzer.analyzeAllMoves();
    };
  }
};
