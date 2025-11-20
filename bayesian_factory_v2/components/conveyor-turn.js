/**
 * Conveyor Turn Component - 90-degree turn
 *
 * Rotates ball path by 90 degrees
 */

const ConveyorTurnSpec = {
  type: "conveyor-turn",
  displayName: "Conveyor Turn",

  isObservable: true,

  ports: {
    inputs: [
      {id: "input", direction: null, offset: {x: 0, y: 0.5}, required: false}
    ],
    outputs: [
      {id: "output", direction: null, offset: {x: 1, y: 0.5}, required: false}
    ]
  },

  states: {
    traveling: {
      /**
       * Get trajectory for ball traveling through turn
       */
      getTrajectory(ball, component, startTime) {
        // Entry and exit based on turn type
        const entry = this.getEntryPosition(component);
        const exit = this.getExitPosition(component);
        const corner = this.getCornerPosition(component);

        // Duration based on arc length and speed
        const speed = component.params.speed || 1.0;
        const duration = computeTrajectoryDuration([entry, corner, exit], speed);

        return {
          path: createPiecewiseLinearTrajectory([entry, corner, exit]),
          duration: duration,
          waypoints: [entry, corner, exit]
        };
      },

      getEntryPosition(component) {
        const pos = component.position;
        const turn = component.params.turn; // "right-to-down", "right-to-up", etc.

        switch (turn) {
          case "right-to-down": return {x: pos.x, y: pos.y + 0.5};
          case "right-to-up": return {x: pos.x, y: pos.y + 0.5};
          case "left-to-down": return {x: pos.x + 1, y: pos.y + 0.5};
          case "left-to-up": return {x: pos.x + 1, y: pos.y + 0.5};
          case "down-to-right": return {x: pos.x + 0.5, y: pos.y};
          case "down-to-left": return {x: pos.x + 0.5, y: pos.y};
          case "up-to-right": return {x: pos.x + 0.5, y: pos.y + 1};
          case "up-to-left": return {x: pos.x + 0.5, y: pos.y + 1};
          default: return {x: pos.x, y: pos.y + 0.5};
        }
      },

      getExitPosition(component) {
        const pos = component.position;
        const turn = component.params.turn;

        switch (turn) {
          case "right-to-down": return {x: pos.x + 0.5, y: pos.y + 1};
          case "right-to-up": return {x: pos.x + 0.5, y: pos.y};
          case "left-to-down": return {x: pos.x + 0.5, y: pos.y + 1};
          case "left-to-up": return {x: pos.x + 0.5, y: pos.y};
          case "down-to-right": return {x: pos.x + 1, y: pos.y + 0.5};
          case "down-to-left": return {x: pos.x, y: pos.y + 0.5};
          case "up-to-right": return {x: pos.x + 1, y: pos.y + 0.5};
          case "up-to-left": return {x: pos.x, y: pos.y + 0.5};
          default: return {x: pos.x + 1, y: pos.y + 0.5};
        }
      },

      getCornerPosition(component) {
        const pos = component.position;
        const turn = component.params.turn;

        // Corner is where the turn happens
        switch (turn) {
          case "right-to-down": return {x: pos.x + 0.5, y: pos.y + 0.5};
          case "right-to-up": return {x: pos.x + 0.5, y: pos.y + 0.5};
          case "left-to-down": return {x: pos.x + 0.5, y: pos.y + 0.5};
          case "left-to-up": return {x: pos.x + 0.5, y: pos.y + 0.5};
          case "down-to-right": return {x: pos.x + 0.5, y: pos.y + 0.5};
          case "down-to-left": return {x: pos.x + 0.5, y: pos.y + 0.5};
          case "up-to-right": return {x: pos.x + 0.5, y: pos.y + 0.5};
          case "up-to-left": return {x: pos.x + 0.5, y: pos.y + 0.5};
          default: return {x: pos.x + 0.5, y: pos.y + 0.5};
        }
      },

      visual: {
        opacity: 1.0,
        scale: 1.0,
        rotation: 0
      }
    }
  },

  transitions: {
    /**
     * Ball arrives at turn - start traveling
     */
    onArrival(ball, component, time, spec) {
      ball.componentId = component.id;
      ball.componentState = "traveling";

      // Validate ball entry direction matches turn's expected entry side
      const turn = component.params.turn;
      const expectedEntry = this.getExpectedEntryDirection(turn);

      if (ball.inputDirection && ball.inputDirection !== expectedEntry) {
        console.warn(
          `Warning: Ball ${ball.id} entering turn ${component.id} (${turn}) from ${ball.inputDirection}, ` +
          `but turn expects entry from ${expectedEntry}. This may cause visual issues.`
        );
      }

      const trajectory = spec.states.traveling.getTrajectory(ball, component, time);
      ball.trajectory = trajectory.path;
      ball.trajectoryStartTime = time;
      ball.trajectoryDuration = trajectory.duration;
      ball.trajectoryWaypoints = trajectory.waypoints;
    },

    /**
     * Helper: Get expected entry direction for a turn type
     */
    getExpectedEntryDirection(turn) {
      // Turn naming: "X-to-Y" means ball is traveling in X direction, turns to go in Y direction
      // So "right-to-down" = traveling right (enters from left), turns to go down
      const entryMap = {
        'right-to-down': 'left',   // Ball traveling right (from left), turns down
        'right-to-up': 'left',     // Ball traveling right (from left), turns up
        'left-to-down': 'right',   // Ball traveling left (from right), turns down
        'left-to-up': 'right',     // Ball traveling left (from right), turns up
        'down-to-right': 'up',     // Ball traveling down (from up), turns right
        'down-to-left': 'up',      // Ball traveling down (from up), turns left
        'up-to-right': 'down',     // Ball traveling up (from down), turns right
        'up-to-left': 'down'       // Ball traveling up (from down), turns left
      };
      return entryMap[turn] || 'unknown';
    }
  },

  // For Bayesian inference
  inference: {
    /**
     * Turn is identity function
     */
    getPossibleInputs(output) {
      return [{inputs: output, probability: 1.0}];
    }
  },

  // Visual rendering
  visual: {
    imagePath: "../images/turn_{turn}.png",
    size: {width: 64, height: 64},

    render(ctx, component) {
      const pos = component.position;
      const gridSize = ctx.canvas._gridSize;
      if (!gridSize) {
        throw new Error('gridSize not available on canvas context');
      }
      const px = pos.x * gridSize;
      const py = pos.y * gridSize;
      const turn = component.params.turn || "right-to-down";

      // Fallback rendering
      ctx.fillStyle = "#707070";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw L-shaped belt based on turn type
      ctx.beginPath();

      switch (turn) {
        case "right-to-down":
          // Horizontal from left to center, vertical from center to bottom
          ctx.rect(px, py + gridSize * 0.3125, gridSize * 0.5, gridSize * 0.375);
          ctx.rect(px + gridSize * 0.3125, py + gridSize * 0.5, gridSize * 0.375, gridSize * 0.5);
          break;
        case "right-to-up":
          ctx.rect(px, py + gridSize * 0.3125, gridSize * 0.5, gridSize * 0.375);
          ctx.rect(px + gridSize * 0.3125, py, gridSize * 0.375, gridSize * 0.5);
          break;
        case "left-to-down":
          ctx.rect(px + gridSize * 0.5, py + gridSize * 0.3125, gridSize * 0.5, gridSize * 0.375);
          ctx.rect(px + gridSize * 0.3125, py + gridSize * 0.5, gridSize * 0.375, gridSize * 0.5);
          break;
        case "left-to-up":
          ctx.rect(px + gridSize * 0.5, py + gridSize * 0.3125, gridSize * 0.5, gridSize * 0.375);
          ctx.rect(px + gridSize * 0.3125, py, gridSize * 0.375, gridSize * 0.5);
          break;
        case "down-to-right":
          ctx.rect(px + gridSize * 0.3125, py, gridSize * 0.375, gridSize * 0.5);
          ctx.rect(px + gridSize * 0.5, py + gridSize * 0.3125, gridSize * 0.5, gridSize * 0.375);
          break;
        case "down-to-left":
          ctx.rect(px + gridSize * 0.3125, py, gridSize * 0.375, gridSize * 0.5);
          ctx.rect(px, py + gridSize * 0.3125, gridSize * 0.5, gridSize * 0.375);
          break;
        case "up-to-right":
          ctx.rect(px + gridSize * 0.3125, py + gridSize * 0.5, gridSize * 0.375, gridSize * 0.5);
          ctx.rect(px + gridSize * 0.5, py + gridSize * 0.3125, gridSize * 0.5, gridSize * 0.375);
          break;
        case "up-to-left":
          ctx.rect(px + gridSize * 0.3125, py + gridSize * 0.5, gridSize * 0.375, gridSize * 0.5);
          ctx.rect(px, py + gridSize * 0.3125, gridSize * 0.5, gridSize * 0.375);
          break;
      }

      ctx.fill();
      ctx.stroke();

      // Draw directional arrows to indicate flow direction
      ctx.fillStyle = "#FFD700"; // Gold for visibility
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;

      const arrowHeadSize = gridSize * 0.08;

      // Helper function to draw an arrow
      const drawArrow = (startX, startY, endX, endY) => {
        // Arrow line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(endY - startY, endX - startX);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowHeadSize * Math.cos(angle - Math.PI / 6),
          endY - arrowHeadSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          endX - arrowHeadSize * Math.cos(angle + Math.PI / 6),
          endY - arrowHeadSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = "#FFD700";
        ctx.fill();
        ctx.stroke();
      };

      // Draw arrows based on turn type (entry and exit arrows)
      switch (turn) {
        case "right-to-down":
          // Entry from left
          drawArrow(px + gridSize * 0.15, py + gridSize * 0.5, px + gridSize * 0.35, py + gridSize * 0.5);
          // Exit to bottom
          drawArrow(px + gridSize * 0.5, py + gridSize * 0.65, px + gridSize * 0.5, py + gridSize * 0.85);
          break;
        case "right-to-up":
          // Entry from left
          drawArrow(px + gridSize * 0.15, py + gridSize * 0.5, px + gridSize * 0.35, py + gridSize * 0.5);
          // Exit to top
          drawArrow(px + gridSize * 0.5, py + gridSize * 0.35, px + gridSize * 0.5, py + gridSize * 0.15);
          break;
        case "left-to-down":
          // Entry from right
          drawArrow(px + gridSize * 0.85, py + gridSize * 0.5, px + gridSize * 0.65, py + gridSize * 0.5);
          // Exit to bottom
          drawArrow(px + gridSize * 0.5, py + gridSize * 0.65, px + gridSize * 0.5, py + gridSize * 0.85);
          break;
        case "left-to-up":
          // Entry from right
          drawArrow(px + gridSize * 0.85, py + gridSize * 0.5, px + gridSize * 0.65, py + gridSize * 0.5);
          // Exit to top
          drawArrow(px + gridSize * 0.5, py + gridSize * 0.35, px + gridSize * 0.5, py + gridSize * 0.15);
          break;
        case "down-to-right":
          // Entry from top
          drawArrow(px + gridSize * 0.5, py + gridSize * 0.15, px + gridSize * 0.5, py + gridSize * 0.35);
          // Exit to right
          drawArrow(px + gridSize * 0.65, py + gridSize * 0.5, px + gridSize * 0.85, py + gridSize * 0.5);
          break;
        case "down-to-left":
          // Entry from top
          drawArrow(px + gridSize * 0.5, py + gridSize * 0.15, px + gridSize * 0.5, py + gridSize * 0.35);
          // Exit to left
          drawArrow(px + gridSize * 0.35, py + gridSize * 0.5, px + gridSize * 0.15, py + gridSize * 0.5);
          break;
        case "up-to-right":
          // Entry from bottom
          drawArrow(px + gridSize * 0.5, py + gridSize * 0.85, px + gridSize * 0.5, py + gridSize * 0.65);
          // Exit to right
          drawArrow(px + gridSize * 0.65, py + gridSize * 0.5, px + gridSize * 0.85, py + gridSize * 0.5);
          break;
        case "up-to-left":
          // Entry from bottom
          drawArrow(px + gridSize * 0.5, py + gridSize * 0.85, px + gridSize * 0.5, py + gridSize * 0.65);
          // Exit to left
          drawArrow(px + gridSize * 0.35, py + gridSize * 0.5, px + gridSize * 0.15, py + gridSize * 0.5);
          break;
      }
    }
  },

  // Level editor metadata
  editor: {
    icon: "↪",
    category: "Transport",
    defaultParams: {
      turn: "right-to-down",
      speed: 1.0,
      plex: false
    }
  }
};

// Register component
if (typeof ComponentRegistry !== 'undefined') {
  ComponentRegistry.register(ConveyorTurnSpec);
}
