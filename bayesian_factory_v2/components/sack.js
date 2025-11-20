/**
 * Sack Component - Ball Source
 *
 * Produces colored balls according to distribution
 */

const SackSpec = {
  type: "sack",
  displayName: "Sack (Ball Container)",

  // NOT observable - sacks are the source of uncertainty!
  isObservable: false,

  ports: {
    inputs: [],
    outputs: [
      {id: "output", direction: null, offset: {x: 0.5, y: 0.7}, required: false}
    ]
  },

  // Sack doesn't have ball states (balls spawn outside)
  states: {},
  transitions: {},

  // Ball production logic
  behavior: {
    /**
     * Draw one ball from sack
     */
    draw(rng, params) {
      const contents = params.contents;  // {red: 7, blue: 3}
      const colors = Object.keys(contents);
      const weights = colors.map(c => contents[c]);

      if (weights.length === 0) {
        throw new Error("Sack has no contents");
      }

      return rng.weightedChoice(colors, weights);
    }
  },

  // For Bayesian inference
  inference: {
    /**
     * Given observed color, what's probability under this distribution?
     */
    getProbability(color, params) {
      const contents = params.contents;
      const total = Object.values(contents).reduce((a, b) => a + b, 0);
      return (contents[color] || 0) / total;
    }
  },

  // Visual rendering
  visual: {
    imagePath: "images/sack_{label}.png",
    size: {width: 32, height: 40},

    render(ctx, component) {
      // Check if sack should be hidden (during animation)
      if (component.params.hidden) {
        return;
      }

      const pos = component.position;
      // Use gridSize from renderer context
      const gridSize = ctx.canvas._gridSize;
      if (!gridSize) {
        throw new Error('gridSize not available on canvas context');
      }
      const px = pos.x * gridSize;
      const py = pos.y * gridSize;

      // Try to load and render image if available
      const imagePath = this.imagePath.replace('{label}', component.params.label || 'default');
      const img = ctx.canvas._loadedImages && ctx.canvas._loadedImages[imagePath];

      if (img && img.complete) {
        // Render image
        const imgWidth = gridSize * 0.75;
        const imgHeight = gridSize * 0.9;
        const imgX = px + (gridSize - imgWidth) / 2;
        const imgY = py + (gridSize - imgHeight) / 2;
        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);

        // Still draw contents and label over the image
        this.renderContents(ctx, component, gridSize, px, py);
        return;
      }

      // Sack dimensions (U-shaped, open at top)
      const sackWidth = gridSize * 0.75;
      const sackHeight = gridSize * 0.9;
      const sackX = px + (gridSize - sackWidth) / 2;
      const sackY = py + (gridSize - sackHeight) / 2;

      // Draw U-shaped sack body (simple rectangle)
      // Use list color if available, otherwise default brown
      const fillColor = component.params.listColor || "#D4A574";
      ctx.fillStyle = fillColor;
      // Darken the stroke color (multiply RGB by 0.7)
      const strokeColor = this.darkenColor(fillColor);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(sackX, sackY);
      ctx.lineTo(sackX, sackY + sackHeight);
      ctx.lineTo(sackX + sackWidth, sackY + sackHeight);
      ctx.lineTo(sackX + sackWidth, sackY);
      ctx.stroke();
      ctx.fill();

      // Draw golden star if this is the betting sack (in center of sack)
      if (component.params.isBettingSack) {
        const centerX = px + gridSize / 2;
        const centerY = sackY + sackHeight / 2;
        this.drawStar(ctx, centerX, centerY, gridSize * 0.3);
      }

      // Draw label at bottom
      /*
      if (component.params.label) {
        ctx.fillStyle = "#000";
        ctx.font = `bold ${Math.floor(gridSize * 0.15)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(component.params.label, px + gridSize / 2, py + gridSize * 0.85);
      }
      */
    },

    /**
     * Draw a golden star
     */
    drawStar(ctx, cx, cy, radius) {
      ctx.save();
      ctx.fillStyle = "#FFD700"; // Golden
      ctx.strokeStyle = "#DAA520"; // Darker gold for outline
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },

    /**
     * Darken a hex color by multiplying RGB values by 0.7
     */
    darkenColor(hex) {
      // Parse hex color
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      // Multiply by 0.7 and round
      const newR = Math.round(r * 0.7);
      const newG = Math.round(g * 0.7);
      const newB = Math.round(b * 0.7);

      // Convert back to hex
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
  },

  // Level editor metadata
  editor: {
    icon: "🎒",
    category: "Source",
    defaultParams: {
      contents: {red: 5, blue: 5},
      label: "A"
    }
  }
};

// Register component
if (typeof ComponentRegistry !== 'undefined') {
  ComponentRegistry.register(SackSpec);
}
