/**
 * Renderer
 *
 * Renders simulation state to canvas
 */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridSize = 64;  // pixels per grid cell
    this.images = {};    // Loaded images
    this.imagesLoaded = false;
  }

  /**
   * Load all images
   */
  async loadImages(imagePaths) {
    const promises = imagePaths.map(path => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.images[path] = img;
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load image: ${path}`);
          resolve();  // Continue even if image fails
        };
        img.src = path;
      });
    });

    await Promise.all(promises);
    this.imagesLoaded = true;
  }

  /**
   * Main render function
   */
  render(simulation, currentTime) {
    // Store gridSize on canvas for components to access
    this.canvas._gridSize = this.gridSize;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid (optional)
    if (this.showGrid) {
      this.drawGrid();
    }

    // Draw components
    simulation.components.forEach(comp => {
      this.drawComponent(comp);
    });

    // Draw balls
    simulation.balls.forEach(ball => {
      this.drawBall(ball, currentTime, simulation);
    });
  }

  /**
   * Draw grid lines
   */
  drawGrid() {
    this.ctx.strokeStyle = "#ddd";
    this.ctx.lineWidth = 1;

    for (let x = 0; x < this.canvas.width; x += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.canvas.height; y += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw component
   */
  drawComponent(component) {
    const spec = ComponentRegistry.get(component.type);
    const pos = this.gridToPixel(component.position);

    // Try to use component's render method
    if (spec.visual.render) {
      this.ctx.save();
      spec.visual.render(this.ctx, component);
      this.ctx.restore();
    }

    // If image available, draw over it
    const imagePath = this.resolveImagePath(spec.visual.imagePath, component);
    if (imagePath && this.images[imagePath]) {
      const img = this.images[imagePath];
      this.ctx.drawImage(img, pos.x, pos.y);
    }

    // Draw plex glass overlay
    if (component.params && component.params.plex) {
      this.ctx.fillStyle = 'rgba(100, 150, 255, 0.3)'; // Semi-transparent blue
      this.ctx.fillRect(pos.x, pos.y, this.gridSize, this.gridSize);

      // Draw border
      this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(pos.x, pos.y, this.gridSize, this.gridSize);

      // Question mark
      this.ctx.fillStyle = 'rgba(100, 150, 255, 0.9)';
      this.ctx.font = `bold ${Math.floor(this.gridSize * 0.375)}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('?', pos.x + this.gridSize / 2, pos.y + this.gridSize / 2);
    }
  }

  /**
   * Draw ball
   */
  drawBall(ball, currentTime, simulation) {
    // Get visual position - may be from trajectory or component state
    let visualPos;
    const component = simulation.getComponent(ball.componentId);

    if (component && (ball.componentState === 'buffered' || ball.componentState === 'fading')) {
      // For buffered/fading state, use getPosition which includes animation
      const spec = ComponentRegistry.get(component.type);
      const stateSpec = spec.states[ball.componentState];
      if (stateSpec && stateSpec.getPosition) {
        visualPos = stateSpec.getPosition(ball, component, currentTime);
      } else {
        visualPos = ball.getVisualPosition(currentTime);
      }
    } else {
      visualPos = ball.getVisualPosition(currentTime);
    }

    const px = this.gridToPixel(visualPos);

    // Get visual properties
    let visualProps = ball.visualProperties;

    if (component) {
      const spec = ComponentRegistry.get(component.type);
      const stateSpec = spec.states[ball.componentState];

      if (stateSpec && stateSpec.visual) {
        visualProps = this.evaluateVisualProps(stateSpec.visual, ball, currentTime);
      }
    }

    // Skip rendering if ball is consumed or invisible
    if (ball.componentState === 'consumed' || visualProps.opacity <= 0.01 || visualProps.scale <= 0.01) {
      return;
    }

    // Apply transformations
    this.ctx.save();
    this.ctx.globalAlpha = visualProps.opacity;

    if (visualProps.rotation) {
      this.ctx.translate(px.x, px.y);
      this.ctx.rotate(visualProps.rotation * Math.PI / 180);
      this.ctx.translate(-px.x, -px.y);
    }

    // Draw ball
    const radius = (this.gridSize * 0.2) * visualProps.scale;  // 40% of grid cell size (diameter), so radius = 20%

    // Check if current component has plex glass
    const isPlexed = component && component.params && component.params.plex;
    const colorVisible = ball.colorVisible && !isPlexed;

    const color = colorVisible ? this.getBallColor(ball.color) : '#888888';

    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.arc(px.x, px.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Draw "?" if color hidden
    if (!colorVisible) {
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('?', px.x, px.y);
    }

    this.ctx.restore();
  }

  /**
   * Get ball color hex code
   */
  getBallColor(colorName) {
    if (!window.BallColors) {
      throw new Error('BallColors not loaded! Make sure config/colors.js is included.');
    }
    return window.BallColors.getHex(colorName);
  }

  /**
   * Evaluate visual properties (handle functions)
   */
  evaluateVisualProps(visual, ball, currentTime) {
    const progress = ball.trajectoryDuration > 0
      ? Math.min(1, (currentTime - ball.trajectoryStartTime) / ball.trajectoryDuration)
      : 0;

    return {
      opacity: typeof visual.opacity === 'function' ? visual.opacity(progress, ball, currentTime) : (visual.opacity || 1.0),
      scale: typeof visual.scale === 'function' ? visual.scale(progress, ball, currentTime) : (visual.scale || 1.0),
      rotation: typeof visual.rotation === 'function' ? visual.rotation(progress, ball, currentTime) : (visual.rotation || 0)
    };
  }

  /**
   * Grid to pixel conversion
   */
  gridToPixel(gridPos) {
    return {
      x: gridPos.x * this.gridSize,
      y: gridPos.y * this.gridSize
    };
  }

  /**
   * Resolve image path with parameters
   */
  resolveImagePath(template, component) {
    if (!template) return null;

    return template
      .replace('{direction}', component.params.direction || '')
      .replace('{label}', component.params.label || '');
  }

  /**
   * Toggle grid visibility
   */
  setShowGrid(show) {
    this.showGrid = show;
  }
}
