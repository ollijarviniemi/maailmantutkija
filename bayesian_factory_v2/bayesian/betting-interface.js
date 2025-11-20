/**
 * Betting Interface
 *
 * Handles the betting UI for Bayesian inference training.
 * Uses KL-divergence scoring with 10-bucket grid interface.
 */

class BettingInterface {
  /**
   * @param {HTMLElement} container - Container element for the betting interface
   * @param {Object} config - Configuration object
   * @param {string} config.sackId - Component ID of the sack to bet on
   * @param {Array} config.distributions - Array of possible distributions [{dist: {red: 70, blue: 30}, prob: 0.5}, ...]
   * @param {Array} config.starThresholds - KL-divergence thresholds for star ratings [5★, 4★, 3★, 2★] (1★ is anything above)
   */
  constructor(container, config) {
    this.container = container;
    this.sackId = config.sackId;
    this.distributions = config.distributions;
    this.starThresholds = config.starThresholds || [0.01, 0.05, 0.1, 0.2]; // Default thresholds

    // Always use 10 buckets (0-10%, 10-20%, ..., 90-100%)
    this.granularity = 10;

    this.groundTruth = null; // Will be set when showing results
    this.enabled = false;

    // Grid state
    this.gridSelections = new Map(); // columnIndex -> {clickY, probability}
    this.isNormalized = false; // Track if selections have been normalized
    this.gridCanvas = null;
    this.submitButton = null;
    this.normalizeButton = null; // For 3+ hypotheses

    this.render();
  }

  /**
   * Enable betting (after simulation completes)
   */
  enable() {
    this.enabled = true;
    this.render();
  }

  /**
   * Disable betting
   */
  disable() {
    this.enabled = false;
    this.render();
  }

  /**
   * Show ground truth and calculate loss
   * @param {Map} posteriors - Map from distributionKey to true probability
   */
  showResults(posteriors) {
    this.groundTruth = posteriors;
    this.enabled = false;
    this.render();

    // Calculate and return loss (KL-divergence)
    const klDivergence = this.calculateKLDivergence();
    const stars = this.getStarRating(klDivergence);

    return {
      loss: klDivergence,
      stars: stars
    };
  }

  /**
   * Reset the interface
   */
  reset() {
    this.groundTruth = null;
    this.enabled = false;
    this.gridSelections.clear();
    this.isNormalized = false;
    this.gridCanvas = null;
    this.submitButton = null;
    this.normalizeButton = null;
    this.render();
  }

  /**
   * Render the betting interface (always grid)
   */
  render() {
    this.container.innerHTML = '';
    this.renderGrid();
  }

  /**
   * Render grid interface
   */
  renderGrid() {
    const numHypotheses = this.distributions.length;
    const numBuckets = this.granularity; // Always 10

    // Calculate dimensions
    const cellHeight = 40; // Height per bucket
    const cellWidth = 80;
    const labelWidth = 50; // Space for percentage labels on left
    const topMargin = 15; // Space for top label (100%)
    const bottomMargin = 10; // Space below grid
    const gridWidth = numHypotheses * cellWidth;
    const gridHeight = numBuckets * cellHeight;
    const sackVisualizationHeight = 100;
    const canvasWidth = labelWidth + gridWidth;
    const canvasHeight = topMargin + gridHeight + bottomMargin + sackVisualizationHeight;

    // Set container to vertical flex layout
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'center';
    this.container.style.gap = '10px';
    this.container.style.minHeight = 'auto';
    this.container.style.maxHeight = 'none';
    this.container.style.overflow = 'visible';

    // Create button container (holds both buttons side-by-side)
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'row';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.width = '100%';
    buttonContainer.style.justifyContent = 'center';

    // Create normalize button (for 3+ hypotheses)
    if (numHypotheses >= 3) {
      const normalizeBtn = document.createElement('button');
      normalizeBtn.textContent = 'Tasaa 100 prosenttiin';
      normalizeBtn.style.padding = '10px 20px';
      normalizeBtn.style.fontSize = '14px';
      normalizeBtn.style.cursor = 'pointer';
      normalizeBtn.style.border = '2px solid #000';
      normalizeBtn.style.background = '#fff';
      normalizeBtn.style.fontFamily = 'inherit';
      normalizeBtn.style.flex = '1';
      normalizeBtn.style.minWidth = '0';

      // Enable if all columns selected and not yet normalized
      const allSelected = this.gridSelections.size === numHypotheses;
      if (allSelected && !this.isNormalized) {
        normalizeBtn.disabled = false;
        normalizeBtn.style.opacity = '1';
      } else {
        normalizeBtn.disabled = true;
        normalizeBtn.style.opacity = '0.5';
      }

      normalizeBtn.addEventListener('click', () => {
        if (!normalizeBtn.disabled) {
          this.normalizeSelections();
        }
      });

      this.normalizeButton = normalizeBtn;
      buttonContainer.appendChild(normalizeBtn);
    }

    // Create submit button
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Näytä oikeat vastaukset';
    submitBtn.style.padding = '10px 20px';
    submitBtn.style.fontSize = '14px';
    submitBtn.style.cursor = 'pointer';
    submitBtn.style.border = '2px solid #000';
    submitBtn.style.background = '#fff';
    submitBtn.style.fontFamily = 'inherit';
    submitBtn.style.flex = '1';
    submitBtn.style.minWidth = '0';

    // Enable button only if normalized (for 3+) or both selected (for 2)
    let canSubmit = false;
    if (this.groundTruth) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
    } else if (numHypotheses === 2) {
      // For 2 hypotheses, can submit if both selected (auto-normalized)
      canSubmit = this.gridSelections.size === 2;
      submitBtn.disabled = !canSubmit;
      submitBtn.style.opacity = canSubmit ? '1' : '0.5';
    } else {
      // For 3+ hypotheses, must be normalized
      canSubmit = this.isNormalized && this.gridSelections.size === numHypotheses;
      submitBtn.disabled = !canSubmit;
      submitBtn.style.opacity = canSubmit ? '1' : '0.5';
    }

    submitBtn.addEventListener('click', () => {
      if (!submitBtn.disabled && this.onComplete) {
        this.onComplete();
      }
    });

    this.submitButton = submitBtn;
    buttonContainer.appendChild(submitBtn);

    // Add button container to main container
    this.container.appendChild(buttonContainer);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    this.gridCanvas = canvas;

    // Draw initial grid
    this.drawGrid();

    // Handle clicks
    if (this.enabled) {
      canvas.style.cursor = 'pointer';
      canvas.addEventListener('click', (e) => {
        this.handleGridClick(e);
      });
    }

    this.container.appendChild(canvas);
  }

  /**
   * Draw the grid on canvas
   */
  drawGrid() {
    if (!this.gridCanvas) return;

    const canvas = this.gridCanvas;
    const ctx = canvas.getContext('2d');
    const numHypotheses = this.distributions.length;
    const numBuckets = this.granularity; // 10

    const cellHeight = 40;
    const cellWidth = 80;
    const labelWidth = 50;
    const topMargin = 15;
    const bottomMargin = 10;
    const gridWidth = numHypotheses * cellWidth;
    const gridHeight = numBuckets * cellHeight;
    const gridX = labelWidth;
    const gridY = topMargin;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw vertical dividers (solid black, between columns)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    for (let col = 0; col <= numHypotheses; col++) {
      const x = gridX + col * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, gridY);
      ctx.lineTo(x, gridY + gridHeight);
      ctx.stroke();
    }

    // Draw horizontal dividers (dashed gray, at 10% intervals)
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    for (let row = 1; row < numBuckets; row++) {
      const y = gridY + row * cellHeight;
      ctx.beginPath();
      ctx.moveTo(gridX, y);
      ctx.lineTo(gridX + gridWidth, y);
      ctx.stroke();
    }

    // Draw top and bottom boundaries (solid black)
    ctx.strokeStyle = '#000';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(gridX, gridY);
    ctx.lineTo(gridX + gridWidth, gridY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(gridX, gridY + gridHeight);
    ctx.lineTo(gridX + gridWidth, gridY + gridHeight);
    ctx.stroke();

    // Draw percentage labels on left (flipped: 100% at top, 0% at bottom)
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= numBuckets; i++) {
      const percent = ((numBuckets - i) / numBuckets) * 100;
      const y = gridY + i * cellHeight;
      ctx.fillText(`${percent}%`, labelWidth - 5, y);
    }

    // Draw user selections (horizontal lines at exact click positions)
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    this.gridSelections.forEach((selection, colIndex) => {
      const x1 = gridX + colIndex * cellWidth;
      const x2 = gridX + (colIndex + 1) * cellWidth;
      const y = selection.clickY;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    });

    // Draw ground truth lines (if available, at exact probability positions)
    if (this.groundTruth) {
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 3;
      this.distributions.forEach((distObj, colIndex) => {
        const distKey = JSON.stringify(distObj.dist);
        const trueProbability = this.groundTruth.get(distKey) || 0;
        const truthPercent = trueProbability * 100;

        // Calculate exact Y position (flipped: 100% at top, 0% at bottom)
        const y = gridY + ((100 - truthPercent) / 100) * gridHeight;

        const x1 = gridX + colIndex * cellWidth;
        const x2 = gridX + (colIndex + 1) * cellWidth;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      });
    }

    // Draw sack visualizations below grid
    const sackY = gridY + gridHeight + bottomMargin;
    const sackWidth = 55;
    const sackHeight = 70;

    this.distributions.forEach((distObj, colIndex) => {
      const sackX = gridX + colIndex * cellWidth + (cellWidth - sackWidth) / 2;
      this.renderSackVisualization(ctx, sackX, sackY, sackWidth, sackHeight, distObj.dist);
    });
  }

  /**
   * Handle click on grid
   */
  handleGridClick(e) {
    if (!this.enabled) return;

    const canvas = this.gridCanvas;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const numHypotheses = this.distributions.length;
    const numBuckets = this.granularity;
    const cellHeight = 40;
    const cellWidth = 80;
    const labelWidth = 50;
    const topMargin = 15;
    const gridX = labelWidth;
    const gridY = topMargin;
    const gridHeight = numBuckets * cellHeight;

    // Check if click is within grid
    if (x < gridX || x > gridX + numHypotheses * cellWidth || y < gridY || y > gridY + gridHeight) {
      return;
    }

    // Calculate column
    const colIndex = Math.floor((x - gridX) / cellWidth);

    // Calculate probability from Y position (flipped: top = 100%, bottom = 0%)
    const relativeY = y - gridY;
    const probability = 1.0 - (relativeY / gridHeight);
    const clampedProb = Math.max(0, Math.min(1, probability));

    // For 2 hypotheses: auto-fill complementary column
    if (numHypotheses === 2) {
      const otherColIndex = 1 - colIndex;

      // Store both selections
      this.gridSelections.set(colIndex, {
        clickY: y,
        probability: clampedProb
      });

      // Calculate complementary Y position
      const complementaryProb = 1.0 - clampedProb;
      const complementaryY = gridY + (1.0 - complementaryProb) * gridHeight;

      this.gridSelections.set(otherColIndex, {
        clickY: complementaryY,
        probability: complementaryProb
      });

      // Auto-normalized for 2 hypotheses
      this.isNormalized = true;
    } else {
      // For 3+ hypotheses: just store this selection
      this.gridSelections.set(colIndex, {
        clickY: y,
        probability: clampedProb
      });

      // Mark as not normalized (user made changes)
      this.isNormalized = false;
    }

    // Redraw
    this.drawGrid();

    // Update button states
    this.updateButtonStates();
  }

  /**
   * Normalize selections to sum to 100%
   */
  normalizeSelections() {
    const numHypotheses = this.distributions.length;

    if (this.gridSelections.size !== numHypotheses) {
      console.warn('Cannot normalize: not all columns selected');
      return;
    }

    // Sum current probabilities
    let sum = 0;
    this.gridSelections.forEach((selection) => {
      sum += selection.probability;
    });

    if (sum === 0) {
      console.warn('Cannot normalize: sum is zero');
      return;
    }

    // Normalize each selection
    const cellHeight = 40;
    const gridY = 15; // topMargin
    const gridHeight = this.granularity * cellHeight;

    this.gridSelections.forEach((selection, colIndex) => {
      const normalizedProb = selection.probability / sum;

      // Recalculate Y position for normalized probability
      const newY = gridY + (1.0 - normalizedProb) * gridHeight;

      this.gridSelections.set(colIndex, {
        clickY: newY,
        probability: normalizedProb
      });
    });

    this.isNormalized = true;

    // Redraw and update buttons
    this.drawGrid();
    this.updateButtonStates();
  }

  /**
   * Update button enable/disable states
   */
  updateButtonStates() {
    const numHypotheses = this.distributions.length;
    const allSelected = this.gridSelections.size === numHypotheses;

    // Update normalize button (3+ hypotheses only)
    if (this.normalizeButton) {
      if (allSelected && !this.isNormalized) {
        this.normalizeButton.disabled = false;
        this.normalizeButton.style.opacity = '1';
      } else {
        this.normalizeButton.disabled = true;
        this.normalizeButton.style.opacity = '0.5';
      }
    }

    // Update submit button
    if (this.submitButton && !this.groundTruth) {
      let canSubmit = false;

      if (numHypotheses === 2) {
        // For 2 hypotheses, can submit if both selected
        canSubmit = allSelected;
      } else {
        // For 3+ hypotheses, must be normalized
        canSubmit = allSelected && this.isNormalized;
      }

      this.submitButton.disabled = !canSubmit;
      this.submitButton.style.opacity = canSubmit ? '1' : '0.5';
    }
  }

  /**
   * Render sack visualization
   */
  renderSackVisualization(ctx, x, y, width, height, distribution) {
    // Draw sack outline
    ctx.fillStyle = '#D4A574';
    ctx.strokeStyle = '#8B6F47';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y);
    ctx.stroke();
    ctx.fill();

    // Draw distribution contents inside
    const colors = Object.keys(distribution);
    const contentY = y + height * 0.3;
    const lineHeight = 15;
    const ballRadius = 6;
    const circleX = x + width * 0.2;

    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    colors.forEach((color, idx) => {
      const count = distribution[color];
      const labelY = contentY + idx * lineHeight;

      // Draw colored ball
      ctx.fillStyle = color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(circleX, labelY, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw count text
      ctx.fillStyle = '#000';
      ctx.fillText(`×${count}`, circleX + ballRadius * 2, labelY);
    });
  }

  /**
   * Calculate KL divergence: KL(truth || user)
   *
   * Clips user probabilities to [0.1%, 99.9%] to avoid infinities
   *
   * @returns {number} KL divergence
   */
  calculateKLDivergence() {
    if (!this.groundTruth || this.gridSelections.size === 0) {
      return Infinity;
    }

    const MIN_PROB = 0.001; // 0.1%
    const MAX_PROB = 0.999; // 99.9%

    let klDivergence = 0;

    this.distributions.forEach((distObj, colIndex) => {
      const distKey = JSON.stringify(distObj.dist);
      const trueProbability = this.groundTruth.get(distKey) || 0;
      const selection = this.gridSelections.get(colIndex);

      if (!selection) {
        // Missing selection: assign maximum penalty
        klDivergence = Infinity;
        return;
      }

      // Get user probability and clip to valid range
      const userProb = Math.max(MIN_PROB, Math.min(MAX_PROB, selection.probability));

      // Handle edge case: if truth is 0, this term contributes 0 to KL
      if (trueProbability > 0) {
        klDivergence += trueProbability * Math.log(trueProbability / userProb);
      }
    });

    return klDivergence;
  }

  /**
   * Get star rating (1-5) based on KL divergence
   *
   * @param {number} kl - KL divergence value
   * @returns {number} Star rating (1-5)
   */
  getStarRating(kl) {
    if (kl === Infinity || isNaN(kl)) return 1;

    // thresholds = [5★, 4★, 3★, 2★]
    // Example: [0.01, 0.05, 0.1, 0.2]
    if (kl <= this.starThresholds[0]) return 5;
    if (kl <= this.starThresholds[1]) return 4;
    if (kl <= this.starThresholds[2]) return 3;
    if (kl <= this.starThresholds[3]) return 2;
    return 1;
  }

  /**
   * Get star display string
   *
   * @param {number} stars - Number of stars (1-5)
   * @returns {string} Star string (e.g., "★★★★★")
   */
  getStarDisplay(stars) {
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }
}

// Export for use in play.html
if (typeof window !== 'undefined') {
  window.BettingInterface = BettingInterface;
}
