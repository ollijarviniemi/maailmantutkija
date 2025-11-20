/**
 * Splitter Component - Alternating Output
 *
 * Alternates balls between left and right outputs (relative to flow direction)
 */

const SplitterSpec = {
  type: "splitter",
  displayName: "Belt Splitter",

  isObservable: true,

  ports: {
    inputs: [
      {id: "input", direction: null, offset: {x: 0, y: 0.5}, required: true}
    ],
    outputs: [
      {id: "left", direction: null, offset: {x: 0.5, y: 0}, required: false},
      {id: "right", direction: null, offset: {x: 0.5, y: 1}, required: false}
    ]
  },

  states: {
    traveling: {
      /**
       * Get entry, center, and exit positions based on direction
       */
      getPositions(component) {
        const pos = component.position;
        const direction = component.params.direction || 'right';

        switch (direction) {
          case 'right':
            // Input from left, outputs to top and bottom
            return {
              entry: {x: pos.x, y: pos.y + 0.5},
              center: {x: pos.x + 0.5, y: pos.y + 0.5},
              leftExit: {x: pos.x + 0.5, y: pos.y},      // Top output
              rightExit: {x: pos.x + 0.5, y: pos.y + 1}  // Bottom output
            };
          case 'down':
            // Input from top, outputs to left and right
            return {
              entry: {x: pos.x + 0.5, y: pos.y},
              center: {x: pos.x + 0.5, y: pos.y + 0.5},
              leftExit: {x: pos.x, y: pos.y + 0.5},      // Left output
              rightExit: {x: pos.x + 1, y: pos.y + 0.5}  // Right output
            };
          case 'left':
            // Input from right, outputs to bottom and top
            return {
              entry: {x: pos.x + 1, y: pos.y + 0.5},
              center: {x: pos.x + 0.5, y: pos.y + 0.5},
              leftExit: {x: pos.x + 0.5, y: pos.y + 1},  // Bottom output
              rightExit: {x: pos.x + 0.5, y: pos.y}      // Top output
            };
          case 'up':
            // Input from bottom, outputs to right and left
            return {
              entry: {x: pos.x + 0.5, y: pos.y + 1},
              center: {x: pos.x + 0.5, y: pos.y + 0.5},
              leftExit: {x: pos.x + 1, y: pos.y + 0.5},  // Right output
              rightExit: {x: pos.x, y: pos.y + 0.5}      // Left output
            };
          default:
            return {
              entry: {x: pos.x, y: pos.y + 0.5},
              center: {x: pos.x + 0.5, y: pos.y + 0.5},
              leftExit: {x: pos.x + 0.5, y: pos.y},
              rightExit: {x: pos.x + 0.5, y: pos.y + 1}
            };
        }
      },

      /**
       * Ball traveling through splitter
       */
      getTrajectory(ball, component, startTime) {
        const positions = this.getPositions(component);
        const entry = positions.entry;
        const center = positions.center;

        // Determine exit based on alternating state
        const exitSide = ball.outputSide; // 'left' or 'right', set in onArrival
        const exit = exitSide === 'left' ? positions.leftExit : positions.rightExit;

        const speed = component.params.speed || 1.0;
        const duration = computeTrajectoryDuration([entry, center, exit], speed);

        return {
          path: createPiecewiseLinearTrajectory([entry, center, exit]),
          duration: duration,
          waypoints: [entry, center, exit]
        };
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
     * Ball arrives at splitter
     */
    onArrival(ball, component, time, spec) {
      ball.componentId = component.id;
      ball.componentState = "traveling";

      // Observe ball upon entry if splitter is observable (no plex glass)
      if (!component.params.plex && component.simulation && component.simulation.bayesianTracker) {
        component.simulation.bayesianTracker.onObservation(ball.id, ball.color);
      }

      // Initialize splitter state if needed
      if (!component.splitterState) {
        component.splitterState = {
          nextSide: 'left', // Start with left
          ballCount: 0
        };
      }

      // Assign this ball to current side and alternate for next ball
      ball.outputSide = component.splitterState.nextSide;
      component.splitterState.nextSide = component.splitterState.nextSide === 'left' ? 'right' : 'left';
      component.splitterState.ballCount++;

      const trajectory = spec.states.traveling.getTrajectory(ball, component, time);
      ball.trajectory = trajectory.path;
      ball.trajectoryStartTime = time;
      ball.trajectoryDuration = trajectory.duration;
      ball.trajectoryWaypoints = trajectory.waypoints;
    },

    /**
     * Override trajectory complete to handle dual outputs
     */
    onTrajectoryComplete(ball, component, time, spec) {
      // Mark for transfer with specific output
      ball.trajectory = null;  // CRITICAL: Clear trajectory to prevent repeated completion
      component.needsTransfer = true;
      component.ballToTransfer = ball;
      component.outputSide = ball.outputSide;
    }
  },

  // For Bayesian inference
  inference: {
    /**
     * Splitter is identity function, but tracks which output
     */
    getPossibleInputs(output, params) {
      return [{inputs: output, probability: 1.0}];
    }
  },

  // Visual rendering
  visual: {
    imagePath: "../images/splitter.png",
    size: {width: 64, height: 64},

    render(ctx, component) {
      const pos = component.position;
      const gridSize = ctx.canvas._gridSize;
      if (!gridSize) {
        throw new Error('gridSize not available on canvas context');
      }
      const px = pos.x * gridSize;
      const py = pos.y * gridSize;
      const direction = component.params.direction || 'right';

      ctx.save();
      ctx.translate(px + gridSize * 0.5, py + gridSize * 0.5);

      // Rotate based on direction (base shape points right: input from left, outputs to top/bottom)
      const rotations = {right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2};
      ctx.rotate(rotations[direction] || 0);

      ctx.translate(-(gridSize * 0.5), -(gridSize * 0.5));

      // Fallback rendering
      ctx.fillStyle = "#707070";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw Y-shaped splitter (pointing right in default orientation)
      // Main trunk (left to center)
      ctx.beginPath();
      ctx.moveTo(0, gridSize * 0.5);
      ctx.lineTo(gridSize * 0.5, gridSize * 0.5);
      ctx.stroke();

      // Top branch (center to top-right)
      ctx.beginPath();
      ctx.moveTo(gridSize * 0.5, gridSize * 0.5);
      ctx.lineTo(gridSize, gridSize * 0.25);
      ctx.stroke();

      // Bottom branch (center to bottom-right)
      ctx.beginPath();
      ctx.moveTo(gridSize * 0.5, gridSize * 0.5);
      ctx.lineTo(gridSize, gridSize * 0.75);
      ctx.stroke();

      // Draw belt surface
      ctx.fillRect(0, gridSize * 0.4375, gridSize * 0.53125, gridSize * 0.125);
      ctx.strokeRect(0, gridSize * 0.4375, gridSize * 0.53125, gridSize * 0.125);

      ctx.fillRect(gridSize * 0.46875, gridSize * 0.1875, gridSize * 0.53125, gridSize * 0.125);
      ctx.strokeRect(gridSize * 0.46875, gridSize * 0.1875, gridSize * 0.53125, gridSize * 0.125);

      ctx.fillRect(gridSize * 0.46875, gridSize * 0.6875, gridSize * 0.53125, gridSize * 0.125);
      ctx.strokeRect(gridSize * 0.46875, gridSize * 0.6875, gridSize * 0.53125, gridSize * 0.125);

      // Draw alternation indicator (T/B for top/bottom)
      const nextSide = component.splitterState?.nextSide || 'left';
      ctx.fillStyle = nextSide === 'left' ? '#4CAF50' : '#888';
      ctx.font = `bold ${Math.floor(gridSize * 0.15625)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('T', gridSize * 0.84375, gridSize * 0.25);

      ctx.fillStyle = nextSide === 'right' ? '#4CAF50' : '#888';
      ctx.fillText('B', gridSize * 0.84375, gridSize * 0.75);

      ctx.restore();
    }
  },

  // Level editor metadata
  editor: {
    icon: "⑂",
    category: "Processing",
    defaultParams: {
      direction: 'right',
      speed: 1.0,
      plex: false
    }
  }
};

// Register component
if (typeof ComponentRegistry !== 'undefined') {
  ComponentRegistry.register(SplitterSpec);
}
