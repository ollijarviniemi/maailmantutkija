/**
 * Animation Player
 *
 * Orchestrates the define → permute → select → cleanup animation sequence
 * for hypothesis generation
 */

class AnimationPlayer {
  constructor(canvas, animationInstructions, level, animationAreaHeight, cellSize, boardRenderer, simulation, coordinateSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.instructions = animationInstructions;
    this.level = level;
    this.animationAreaHeight = animationAreaHeight || 200;
    if (!cellSize) {
      throw new Error('cellSize is required for AnimationPlayer');
    }
    this.cellSize = cellSize;
    this.boardRenderer = boardRenderer;
    this.simulation = simulation;
    this.coords = coordinateSystem;

    // Validate coordinate system and canvas dimensions
    if (this.coords) {
      const expectedDims = this.coords.getOverlayDimensions();
      if (canvas.width !== expectedDims.width || canvas.height !== expectedDims.height) {
        console.error(`Overlay canvas size mismatch! Expected ${expectedDims.width}x${expectedDims.height}, got ${canvas.width}x${canvas.height}`);
      }
    } else {
      console.warn('AnimationPlayer: No coordinate system provided');
    }

    // Animation state
    this.currentInstructionIndex = 0;
    this.currentPhase = null; // 'define', 'permute', 'select', 'cleanup'
    this.phaseStartTime = 0;
    this.phaseDuration = 0;
    this.isComplete = false;
    this.totalTime = 0;

    // Sack visual state (scaled to cellSize)
    this.sacks = []; // {listId, index, x, y, distribution, color, selected}
    // Position sacks in top area of overlay (overlaying the board)
    this.rowY = cellSize * 1.5; // Position in top portion, leaving room above
    this.sackWidth = cellSize * 0.75;
    this.sackHeight = cellSize * 0.9; // Match board sack height
    this.sackSpacing = cellSize * 0.2;

    // Track the final permutation after shuffling
    // This maps: array index -> original sack index
    // e.g., [2, 0, 1] means: position 0 has sack 2, position 1 has sack 0, position 2 has sack 1
    this.currentPermutation = null;

    // Build list color map from level components
    // Each sack component has params.listId and params.listColor
    this.listColorMap = new Map();
    if (level.components) {
      level.components.forEach(comp => {
        if (comp.type === 'sack' && comp.params.listId && comp.params.listColor) {
          this.listColorMap.set(comp.params.listId, comp.params.listColor);
        }
      });
    }

    // Permutation animation state
    this.swapAnimations = [];
    this.currentSwapIndex = 0;
    this.swapStartTime = 0;
    this.swapsPerSecond = 2;

    // Callbacks
    this.onComplete = null;

    this.groupInstructionsByList();
  }

  /**
   * Group instructions by list for easier processing
   */
  groupInstructionsByList() {
    this.instructions.forEach((instr, idx) => {
    });

    this.listGroups = [];
    let currentList = null;
    let currentGroup = null;

    this.instructions.forEach(instruction => {
      if (instruction.listId !== currentList) {
        if (currentGroup) {
          this.listGroups.push(currentGroup);
        }
        currentList = instruction.listId;
        currentGroup = {
          listId: currentList,
          instructions: []
        };
      }
      currentGroup.instructions.push(instruction);
    });

    if (currentGroup) {
      this.listGroups.push(currentGroup);
    }

    this.listGroups.forEach((group, idx) => {
    });

    this.currentGroupIndex = 0;
  }

  /**
   * Start animation
   */
  start() {
    if (this.listGroups.length === 0) {
      this.isComplete = true;
      if (this.onComplete) this.onComplete();
      return;
    }

    this.startNextGroup();
  }

  /**
   * Start next list group
   */
  startNextGroup() {

    if (this.currentGroupIndex >= this.listGroups.length) {
      this.isComplete = true;
      // Clear sacks so they don't render during slide-up
      this.sacks = [];
      if (this.onComplete) this.onComplete();
      return;
    }

    const group = this.listGroups[this.currentGroupIndex];
    this.currentInstructionIndex = 0;
    this.startNextInstruction(group);
  }

  /**
   * Start next instruction in current group
   */
  startNextInstruction(group) {

    if (this.currentInstructionIndex >= group.instructions.length) {
      // Cleanup phase: move unused sacks off-screen
      this.startCleanupPhase(group);
      return;
    }

    const instruction = group.instructions[this.currentInstructionIndex];
    this.phaseStartTime = this.totalTime;

    switch (instruction.phase) {
      case 'define':
        this.startDefinePhase(instruction);
        break;
      case 'permute':
        this.startPermutePhase(instruction);
        break;
      case 'select':
        this.startSelectPhase(instruction);
        break;
    }
  }

  /**
   * Define phase: Show sacks in row, display distributions
   */
  startDefinePhase(instruction) {
    this.currentPhase = 'define';
    this.phaseDuration = 2000; // 2 seconds

    const distributions = instruction.distributions;
    const startX = (this.canvas.width - (distributions.length * (this.sackWidth + this.sackSpacing) - this.sackSpacing)) / 2;

    // Create new sacks for this list
    const listColor = this.listColorMap.get(instruction.listId) || '#D4A574'; // Default to brown
    const newSacks = distributions.map((dist, i) => ({
      listId: instruction.listId,
      originalIndex: i,
      currentIndex: i,
      x: startX + i * (this.sackWidth + this.sackSpacing),
      y: this.rowY,
      distribution: dist,
      color: listColor,
      selected: false,
      showLabel: true,
      labelAlpha: 1.0
    }));

    // Keep previously selected sacks that are already on the board, add new sacks
    const selectedSacks = this.sacks.filter(s => s.selected);
    this.sacks = [...selectedSacks, ...newSacks];
  }

  /**
   * Permute phase: Shuffle sacks with swap animations
   */
  startPermutePhase(instruction) {
    this.currentPhase = 'permute';

    // Find indices of sacks from this list (not previously selected ones)
    const currentListSackIndices = [];
    this.sacks.forEach((sack, idx) => {
      if (sack.listId === instruction.listId && !sack.selected) {
        currentListSackIndices.push(idx);
      }
    });

    // Store for use in generateSwapSequence
    this.currentListSackIndices = currentListSackIndices;

    // Initialize permutation to identity [0, 1, 2, ...]
    this.currentPermutation = this.sacks.map((s, i) => i);

    // Generate uniform random shuffle sequence
    this.generateSwapSequence();

    // Set phase duration based on actual swap timings to ensure all swaps complete
    if (this.swapAnimations.length > 0) {
      const lastSwap = this.swapAnimations[this.swapAnimations.length - 1];
      this.phaseDuration = lastSwap.startTime + lastSwap.duration + 100; // +100ms buffer
    } else {
      this.phaseDuration = 1000; // Default if no swaps
    }

    this.currentSwapIndex = 0;
    this.swapStartTime = this.totalTime;

    // Fade out labels only for current list sacks
    this.sacks.forEach((sack, idx) => {
      if (currentListSackIndices.includes(idx)) {
        sack.showLabel = false;
      }
    });
  }

  /**
   * Generate swap sequence using Fisher-Yates shuffle followed by random swaps
   * Only swaps within currentListSackIndices (the sacks from the current list being shuffled)
   */
  generateSwapSequence() {
    const swaps = [];
    const indices = this.currentListSackIndices || [];
    const n = indices.length;

    if (n <= 1) {
      // No swaps needed for 0 or 1 sack
      this.swapAnimations = [];
      return;
    }

    // Phase 1: One full round of Fisher-Yates shuffle (n-1 swaps)
    // Using actual array indices, not logical positions
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      swaps.push({from: indices[i], to: indices[j]});
    }

    // Phase 2: Additional random swaps for visual effect (preserves max entropy)
    const numRandomSwaps = Math.max(10, n * 2);
    for (let k = 0; k < numRandomSwaps; k++) {
      const i = indices[Math.floor(Math.random() * n)];
      const j = indices[Math.floor(Math.random() * n)];
      if (i !== j) {
        swaps.push({from: i, to: j});
      }
    }

    this.swapAnimations = swaps;

    const speeds = [0.5, 1, 1.5, 2, 1.5, 1]; // swaps per half-second
    const durations = speeds.map(s => 500 / s); // [333ms, 125ms, 333ms]
    const totalSwaps = swaps.length;
    const totalSpeedWeight = speeds.reduce((a, b) => a + b);

    // Assign each swap a start time and duration
    let timeAccum = 0;
    let swapsAssigned = 0;

    speeds.forEach((speed, segmentIdx) => {
      const swapsInSegment = segmentIdx === speeds.length - 1
        ? totalSwaps - swapsAssigned  // Last segment gets remaining swaps
        : Math.floor((totalSwaps / totalSpeedWeight) * speed);

      const swapDuration = durations[segmentIdx];

      for (let i = 0; i < swapsInSegment && swapsAssigned < totalSwaps; i++) {
        swaps[swapsAssigned].startTime = timeAccum;
        swaps[swapsAssigned].duration = swapDuration;
        timeAccum += swapDuration;
        swapsAssigned++;
      }
    });

    this.currentSwapIndex = 0;
    this.currentSwap = null; // Currently animating swap
  }

  /**
   * Select phase: Move selected sack to board
   */
  startSelectPhase(instruction) {
    this.currentPhase = 'select';
    this.phaseDuration = 1000; // 1 second per selection


    // Find sack at this index within the current list
    // instruction.index is relative to the current list (after permutation)
    // We need to find the sack with matching listId and currentIndex (position after shuffle)
    // NOT by filtering unselected and indexing, because that changes array indices!
    const sack = this.sacks.find(s =>
      s.listId === instruction.listId &&
      s.currentIndex === instruction.index &&
      !s.selected
    );

    if (!sack) {
      console.error(`[Animation] ERROR: Could not find sack at index ${instruction.index} in list ${instruction.listId}`);
      return;
    }


    if (sack) {
      sack.selected = true;
      sack.currentlySelecting = true; // Mark as the sack being moved RIGHT NOW
      sack.targetComponentId = instruction.templateId;
      // Use actual visual position after permutation, not logical position
      sack.selectStartX = sack.renderX !== undefined ? sack.renderX : sack.x;
      sack.selectStartY = sack.renderY !== undefined ? sack.renderY : this.rowY;


      // Find target position on board
      const component = this.level.components.find(c => c.params.linkedTemplate === instruction.templateId);
      if (component) {
        // Convert grid coordinates to overlay pixel coordinates using coordinate system
        const overlayPos = this.coords.gridToOverlayPixel(
          component.position.x,
          component.position.y
        );

        // Center sack in cell
        sack.targetX = overlayPos.x + (this.cellSize - this.sackWidth) / 2;
        sack.targetY = overlayPos.y + (this.cellSize - this.sackHeight) / 2;
      }
    }
  }

  /**
   * Cleanup phase: Move unused sacks off-screen
   */
  startCleanupPhase(group) {
    this.currentPhase = 'cleanup';
    this.phaseDuration = 1000; // 1 second

    // Mark unused sacks for cleanup
    this.sacks.forEach((sack, i) => {
      if (!sack.selected) {
        sack.cleaningUp = true;
        sack.targetX = this.canvas.width + 100; // Off-screen right
        sack.targetY = this.rowY;
      }
    });
  }

  /**
   * Update animation state
   */
  update(deltaTime) {
    if (this.isComplete) return;

    this.totalTime += deltaTime;
    const phaseTime = this.totalTime - this.phaseStartTime;

    if (this.currentPhase === 'define') {
      this.updateDefinePhase(phaseTime);
    } else if (this.currentPhase === 'permute') {
      this.updatePermutePhase(phaseTime);
    } else if (this.currentPhase === 'select') {
      this.updateSelectPhase(phaseTime);
    } else if (this.currentPhase === 'cleanup') {
      this.updateCleanupPhase(phaseTime);
    }

    // Check if phase is complete
    const phaseComplete = this.isPhaseComplete(phaseTime);
    if (phaseComplete) {
      this.advanceToNextPhase();
    }
  }

  /**
   * Check if current phase is complete
   */
  isPhaseComplete(phaseTime) {
    if (this.currentPhase === 'permute') {
      // For permute phase, check if all swaps are done, not just time
      const allSwapsProcessed = this.currentSwapIndex >= this.swapAnimations.length;
      const noActiveSwap = this.currentSwap === null;
      return allSwapsProcessed && noActiveSwap;
    } else {
      // For other phases, use time-based completion
      return phaseTime >= this.phaseDuration;
    }
  }

  /**
   * Update define phase (fade in/out labels)
   */
  updateDefinePhase(phaseTime) {
    const progress = phaseTime / this.phaseDuration;

    // Fade out labels after 1.5 seconds
    if (phaseTime > 1500) {
      const fadeProgress = (phaseTime - 1500) / 500;
      this.sacks.forEach(sack => {
        sack.labelAlpha = Math.max(0, 1 - fadeProgress);
      });
    }
  }

  /**
   * Update permute phase (one swap at a time with variable duration)
   */
  updatePermutePhase(phaseTime) {
    // Check if we need to start a new swap
    if (!this.currentSwap && this.currentSwapIndex < this.swapAnimations.length) {
      const swapDef = this.swapAnimations[this.currentSwapIndex];

      // Check if it's time to start this swap
      if (phaseTime >= swapDef.startTime) {
        this.startSwap(swapDef, phaseTime);
      }
    }

    // Update current swap if active
    if (this.currentSwap) {
      const elapsed = phaseTime - this.currentSwap.actualStartTime;
      const progress = Math.min(1, elapsed / this.currentSwap.duration);

      if (progress >= 1) {
        // Swap complete
        this.finalizeSwap();
        this.currentSwapIndex++;
        this.currentSwap = null;
      } else {
        // Update animated positions
        const eased = this.easeInOutCubic(progress);

        // Arc motion: one goes up, one goes down
        const arcHeight = this.sackHeight * 1.5;
        const sackA = this.sacks[this.currentSwap.indexA];
        const sackB = this.sacks[this.currentSwap.indexB];

        sackA.renderX = this.currentSwap.startXA + (this.currentSwap.endXA - this.currentSwap.startXA) * eased;
        sackA.renderY = this.rowY - arcHeight * Math.sin(progress * Math.PI);

        sackB.renderX = this.currentSwap.startXB + (this.currentSwap.endXB - this.currentSwap.startXB) * eased;
        sackB.renderY = this.rowY + arcHeight * Math.sin(progress * Math.PI);
      }
    }
  }

  /**
   * Start animated swap of two sacks
   */
  startSwap(swapDef, currentTime) {
    const sackA = this.sacks[swapDef.from];
    const sackB = this.sacks[swapDef.to];

    this.currentSwap = {
      indexA: swapDef.from,
      indexB: swapDef.to,
      actualStartTime: currentTime,
      duration: swapDef.duration,
      startXA: sackA.x,
      startXB: sackB.x,
      endXA: sackB.x,
      endXB: sackA.x
    };
  }

  /**
   * Finalize swap - actually swap array positions and recalculate base positions
   */
  finalizeSwap() {
    const swap = this.currentSwap;

    // Swap in array FIRST
    [this.sacks[swap.indexA], this.sacks[swap.indexB]] = [this.sacks[swap.indexB], this.sacks[swap.indexA]];

    // Update permutation tracking to reflect the swap
    if (this.currentPermutation) {
      [this.currentPermutation[swap.indexA], this.currentPermutation[swap.indexB]] =
        [this.currentPermutation[swap.indexB], this.currentPermutation[swap.indexA]];
    }

    // Recalculate positions ONLY for current list's sacks (not previously selected ones)
    const indices = this.currentListSackIndices || [];
    const n = indices.length;
    const startX = (this.canvas.width - (n * (this.sackWidth + this.sackSpacing) - this.sackSpacing)) / 2;

    indices.forEach((idx, slotIdx) => {
      this.sacks[idx].x = startX + slotIdx * (this.sackWidth + this.sackSpacing);
    });

    // Lock render positions at final visual position (don't clear them!)
    // This prevents teleportation when SELECT phase starts
    this.sacks[swap.indexA].renderX = this.sacks[swap.indexA].x;
    this.sacks[swap.indexA].renderY = this.rowY;
    this.sacks[swap.indexB].renderX = this.sacks[swap.indexB].x;
    this.sacks[swap.indexB].renderY = this.rowY;
  }

  /**
   * Update select phase (move to board)
   * Simplified for large overlay: just interpolate within single coordinate space
   */
  updateSelectPhase(phaseTime) {
    const progress = Math.min(1, phaseTime / this.phaseDuration);
    const eased = this.easeInOutCubic(progress);

    // Simple interpolation in overlay coordinates
    this.sacks.forEach(sack => {
      if (sack.currentlySelecting && sack.targetX !== undefined) {
        sack.renderX = sack.selectStartX + (sack.targetX - sack.selectStartX) * eased;
        sack.renderY = sack.selectStartY + (sack.targetY - sack.selectStartY) * eased;
      }
    });

    // When complete, mark as done
    if (progress >= 1) {
      this.sacks.forEach(sack => {
        if (sack.currentlySelecting) {
          sack.currentlySelecting = false;
        }
      });
    }
  }

  /**
   * Update cleanup phase (move off-screen)
   */
  updateCleanupPhase(phaseTime) {
    const progress = Math.min(1, phaseTime / this.phaseDuration);
    const eased = this.easeInOutCubic(progress);

    this.sacks.forEach(sack => {
      if (sack.cleaningUp) {
        const startX = sack.x;
        sack.renderX = startX + (sack.targetX - startX) * eased;
        sack.renderY = this.rowY;
      }
    });
  }

  /**
   * Advance to next phase or instruction
   */
  advanceToNextPhase() {
    const group = this.listGroups[this.currentGroupIndex];

    if (this.currentPhase === 'cleanup') {
      // Remove cleaned up sacks
      const beforeCount = this.sacks.length;
      this.sacks = this.sacks.filter(s => !s.cleaningUp);

      // Move to next group
      this.currentGroupIndex++;
      this.startNextGroup();
    } else {
      // Move to next instruction in current group
      this.currentInstructionIndex++;
      this.startNextInstruction(group);
    }
  }

  /**
   * Render animation frame
   */
  render() {
    // Clear entire overlay canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Don't render board components - they stay on the background board canvas
    // Only render sacks on the overlay

    // Render all sacks (in animation area or board area)
    this.sacks.forEach(sack => {
      this.renderSack(sack);
    });
  }

  /**
   * Render sack to a specific canvas context at given position
   */
  renderSackToCanvas(ctx, x, y, sack) {
    // Draw U-shaped sack with list color
    const fillColor = sack.color || "#D4A574";
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = this.darkenColor(fillColor);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + this.sackHeight);
    ctx.lineTo(x + this.sackWidth, y + this.sackHeight);
    ctx.lineTo(x + this.sackWidth, y);
    ctx.stroke();
    ctx.fill();

    // Draw distribution label if visible
    if (sack.showLabel && sack.labelAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = sack.labelAlpha;

      const colors = Object.keys(sack.distribution);
      const contentY = y + this.sackHeight * 0.3;
      const lineHeight = this.cellSize * 0.2;

      ctx.font = `${Math.floor(this.cellSize * 0.12)}px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      colors.forEach((color, idx) => {
        const count = sack.distribution[color];
        const labelY = contentY + idx * lineHeight;

        // Draw color circle
        const circleRadius = this.cellSize * 0.08;
        const circleX = x + this.sackWidth * 0.2;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(circleX, labelY, circleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw count
        ctx.fillStyle = "#000";
        ctx.fillText(`×${count}`, circleX + circleRadius * 2, labelY);
      });

      ctx.restore();
    }
  }

  /**
   * Render single sack
   */
  renderSack(sack) {
    const x = sack.renderX !== undefined ? sack.renderX : sack.x;
    const y = sack.renderY !== undefined ? sack.renderY : sack.y;

    // Use the shared rendering method
    this.renderSackToCanvas(this.ctx, x, y, sack);
  }

  /**
   * Easing function
   */
  easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Darken a hex color by multiplying RGB values by 0.7
   */
  darkenColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const newR = Math.round(r * 0.7);
    const newG = Math.round(g * 0.7);
    const newB = Math.round(b * 0.7);

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  /**
   * Check if animation is complete
   */
  isDone() {
    return this.isComplete;
  }
}

// Export for use in game
if (typeof window !== 'undefined') {
  window.AnimationPlayer = AnimationPlayer;
}
