/**
 * Duplicator Component
 *
 * Takes 1 ball input, creates N-1 duplicates (N=2-5 configurable)
 * Outputs all N balls sequentially with brief delay between outputs
 */

const DuplicatorSpec = {
  type: "duplicator",
  name: "Duplicator",
  description: "Duplicates balls: outputs N copies of each input ball",

  // Ports (input/output positions)
  ports: {
    inputs: [
      {id: "input", direction: null, offset: {x: 0, y: 0.5}, required: true}
    ],
    outputs: [
      {id: "output", direction: null, offset: {x: 1, y: 0.5}, required: false}
    ]
  },

  // Parameters
  defaultParams: {
    sides: {
      up: {type: 'none', count: 0},
      right: {type: 'output', count: 2},
      down: {type: 'none', count: 0},
      left: {type: 'input', count: 0}
    },
    plex: false,
    outputDelay: 1000  // ms between ball outputs from same channel
  },

  // Component states
  states: {
    IDLE: 'idle',
    DUPLICATING: 'duplicating'
  },

  // Behavior methods
  behavior: {
    /**
     * Get total number of copies from sides configuration
     */
    getTotalCopies(component) {
      if (!component.params.sides) {
        throw new Error(`Duplicator ${component.id} missing sides configuration`);
      }
      const sides = component.params.sides;
      let total = 0;
      for (const side in sides) {
        if (sides[side].type === 'output') {
          total += sides[side].count;
        }
      }
      if (total === 0) {
        throw new Error(`Duplicator ${component.id} has no output sides configured`);
      }
      return total;
    },

    /**
     * Build output pattern from sides configuration
     */
    getOutputPattern(component) {
      if (!component.params.sides) {
        throw new Error(`Duplicator ${component.id} missing sides configuration`);
      }
      const sides = component.params.sides;
      const pattern = [];

      for (const side in sides) {
        if (sides[side].type === 'output' && sides[side].count > 0) {
          pattern.push({side: side, count: sides[side].count});
        }
      }

      if (pattern.length === 0) {
        throw new Error(`Duplicator ${component.id} has no output channels configured`);
      }
      return pattern;
    },

    /**
     * Determine which output side a copy should go to based on sides configuration
     */
    getOutputSideForCopy(component, copyIndex) {
      const pattern = this.getOutputPattern(component);

      // Find which pattern entry this copy belongs to
      let cumulativeCount = 0;
      for (const entry of pattern) {
        cumulativeCount += entry.count;
        if (copyIndex < cumulativeCount) {
          return entry.side;
        }
      }

      throw new Error(`Duplicator ${component.id}: copyIndex ${copyIndex} exceeds total output count ${cumulativeCount}`);
    },

    /**
     * Get default sides configuration
     */
    getDefaultSides() {
      return {
        up: {type: 'none', count: 0},
        right: {type: 'output', count: 2},
        down: {type: 'none', count: 0},
        left: {type: 'input', count: 0}
      };
    },

    /**
     * Get input side from configuration
     */
    getInputSide(component) {
      if (!component.params.sides) {
        throw new Error(`Duplicator ${component.id} missing sides configuration`);
      }
      const sides = component.params.sides;
      for (const side in sides) {
        if (sides[side].type === 'input') {
          return side;
        }
      }
      throw new Error(`Duplicator ${component.id} has no input side configured`);
    },

    /**
     * Validate duplicator configuration
     */
    isValid(component) {
      if (!component.params.sides) {
        return false; // Invalid if no configuration
      }
      const sides = component.params.sides;
      let inputCount = 0;
      let outputCount = 0;

      for (const side in sides) {
        if (sides[side].type === 'input') inputCount++;
        if (sides[side].type === 'output') outputCount++;
      }

      return inputCount === 1 && outputCount >= 1 && outputCount <= 3;
    },

    /**
     * Get entry and exit positions based on sides
     * inputSide: which side the entry is on (if specified)
     * outputSide: which side the exit is on (if specified)
     */
    getPositions(component, inputSide = null, outputSide = null) {
      const pos = component.position;
      const actualInputSide = inputSide || this.getInputSide(component);
      const actualOutputSide = outputSide || 'right';

      // Map sides to positions
      const sideToPos = {
        'up': {x: pos.x + 0.5, y: pos.y},
        'down': {x: pos.x + 0.5, y: pos.y + 1},
        'left': {x: pos.x, y: pos.y + 0.5},
        'right': {x: pos.x + 1, y: pos.y + 0.5}
      };

      return {
        entry: sideToPos[actualInputSide],
        center: {x: pos.x + 0.5, y: pos.y + 0.5},
        exit: sideToPos[actualOutputSide]
      };
    },

    /**
     * Create N-1 duplicates of the original ball
     * Notify Bayesian tracker for each duplicate
     */
    duplicate(originalBall, component) {
      const N = this.getTotalCopies(component);
      const duplicates = [];

      // Create N-1 duplicates
      for (let i = 1; i < N; i++) {
        const duplicateBall = component.simulation.createBall(
          originalBall.color,
          originalBall.sourceId
        );

        // Position duplicated ball at duplicator center (prevents rendering at 0,0)
        duplicateBall.position = {
          x: component.position.x + 0.5,
          y: component.position.y + 0.5
        };

        duplicates.push(duplicateBall);

        // Notify Bayesian tracker
        if (component.simulation.bayesianTracker) {
          component.simulation.bayesianTracker.onBallDuplicated(
            originalBall.id,
            duplicateBall.id
          );
          console.log(`Bayesian tracker notified: duplicated ${originalBall.id} → ${duplicateBall.id}`);
        }
      }

      // Return all balls (original + duplicates)
      return [originalBall, ...duplicates];
    },

    /**
     * Organize balls by output side and prepare for simultaneous multi-channel output
     */
    outputBalls(balls, component, time, spec) {
      // Group balls by their output side
      const ballsByOutput = {};
      const nextOutputTimeBySide = {};
      const outputIndexBySide = {};

      balls.forEach((ball, index) => {
        const outputSide = spec.behavior.getOutputSideForCopy(component, index);
        if (!ballsByOutput[outputSide]) {
          ballsByOutput[outputSide] = [];
          nextOutputTimeBySide[outputSide] = time; // First ball from each side outputs immediately
          outputIndexBySide[outputSide] = 0;
        }
        ballsByOutput[outputSide].push(ball);
      });

      component.bufferState = {
        state: spec.states.DUPLICATING,
        ballsByOutput,
        outputIndexBySide,
        nextOutputTimeBySide
      };

    }
  },

  // State transitions
  transitions: {
    /**
     * Ball arrives at duplicator input
     */
    onArrival(ball, component, time, spec) {
      ball.componentId = component.id;
      ball.componentState = 'moving_to_center'; // Mark state for trajectory completion handling

      // Observe ball upon entry if no plex glass
      if (!component.params.plex && component.simulation && component.simulation.bayesianTracker) {
        component.simulation.bayesianTracker.onObservation(ball.id, ball.color);
        console.log(`Observed ball ${ball.id} (${ball.color}) entering duplicator (no plex)`);
      }

      // Get positions (use input side for entry position)
      const inputSide = spec.behavior.getInputSide(component);
      const positions = spec.behavior.getPositions(component, inputSide, 'right'); // dummy outputSide for now

      // Move ball to center (duplication happens when it reaches center)
      const trajectoryData = {
        path: createPiecewiseLinearTrajectory([positions.entry, positions.center]),
        duration: 500, // Fixed duration for entry movement
        waypoints: [positions.entry, positions.center]
      };

      ball.trajectory = trajectoryData.path;
      ball.trajectoryStartTime = time;
      ball.trajectoryDuration = trajectoryData.duration;
      ball.trajectoryWaypoints = trajectoryData.waypoints;

      console.log(`Ball ${ball.id} entering duplicator ${component.id}, moving to center`);
    },

    /**
     * Check if it's time to output next ball from each channel independently
     */
    checkAndOutput(component, time, spec) {
      if (!component.bufferState || component.bufferState.state !== spec.states.DUPLICATING) {
        return;
      }

      const state = component.bufferState;
      const inputSide = spec.behavior.getInputSide(component);
      let allChannelsComplete = true;

      // Check each output side independently
      for (const outputSide in state.ballsByOutput) {
        const balls = state.ballsByOutput[outputSide];
        const outputIndex = state.outputIndexBySide[outputSide];
        const nextOutputTime = state.nextOutputTimeBySide[outputSide];

        // Check if this channel has more balls to output and is ready
        if (outputIndex < balls.length) {
          allChannelsComplete = false;

          if (time >= nextOutputTime) {
            const ballToOutput = balls[outputIndex];

            // Ensure ball has component ID (critical for trajectory completion)
            ballToOutput.componentId = component.id;
            ballToOutput.outputSide = outputSide;

            const positions = spec.behavior.getPositions(component, inputSide, outputSide);

            // Set trajectory to output (proper format)
            const trajectoryData = {
              path: createPiecewiseLinearTrajectory([positions.center, positions.exit]),
              duration: 500,
              waypoints: [positions.center, positions.exit]
            };

            ballToOutput.trajectory = trajectoryData.path;
            ballToOutput.trajectoryStartTime = time;
            ballToOutput.trajectoryDuration = trajectoryData.duration;
            ballToOutput.trajectoryWaypoints = trajectoryData.waypoints;

            // Update this channel's state
            state.outputIndexBySide[outputSide]++;
            if (!component.params.outputDelay) {
              throw new Error(`Duplicator ${component.id} missing outputDelay parameter`);
            }
            state.nextOutputTimeBySide[outputSide] = time + component.params.outputDelay;

            console.log(`Duplicator ${component.id} outputting ball ${ballToOutput.id} to ${outputSide} (${state.outputIndexBySide[outputSide]}/${balls.length})`);
          }
        }
      }

      // If all channels are complete, return to idle
      if (allChannelsComplete) {
        component.bufferState = { state: spec.states.IDLE };
        console.log(`Duplicator ${component.id} finished outputting all balls from all channels`);
      }
    },

    /**
     * Ball completes trajectory - either reached center (start duplication) or exiting (transfer)
     */
    onTrajectoryComplete(ball, component, time, spec) {
      // Case 1: Ball just reached center - perform duplication and start output
      if (ball.componentState === 'moving_to_center') {
        console.log(`Ball ${ball.id} reached duplicator center, starting duplication`);

        delete ball.componentState;
        ball.trajectory = null;

        // NOW perform duplication
        const allBalls = spec.behavior.duplicate(ball, component);

        // Start output process (balls will leave center after delay)
        spec.behavior.outputBalls(allBalls, component, time, spec);
        return;
      }

      // Case 2: Ball exiting duplicator - transfer to next component
      if (!ball.outputSide) {
        console.log(`Duplicator ${component.id}: ball ${ball.id} has no outputSide, skipping`);
        return;
      }

      const outputSide = ball.outputSide;

      // Clean up BEFORE transfer to mark as processed
      delete ball.outputSide;
      ball.trajectory = null;  // CRITICAL: Clear trajectory to prevent repeated completion

      console.log(`Duplicator ${component.id} ball ${ball.id} completed trajectory to ${outputSide}`);

      // Find connection in the specified absolute direction
      const simulation = component.simulation;
      if (!simulation) {
        console.error(`Duplicator ${component.id}: no simulation reference`);
        return;
      }

      const allConnections = simulation.level.connections.filter(c => c.from === component.id);
      console.log(`Duplicator ${component.id}: Looking for connection in direction ${outputSide}`);
      console.log(`  All connections from duplicator:`, allConnections);
      console.log(`  Duplicator position:`, component.position);

      // Find connection where target is in the specified direction
      const connection = allConnections.find(conn => {
        const target = simulation.componentsById.get(conn.to);
        if (!target) {
          console.log(`    Connection to ${conn.to}: target not found`);
          return false;
        }

        console.log(`    Checking connection to ${target.type} at ${target.position.x},${target.position.y}`);

        // Match based on absolute direction
        let matches = false;
        switch (outputSide) {
          case 'up':
            matches = target.position.y < component.position.y;
            break;
          case 'down':
            matches = target.position.y > component.position.y;
            break;
          case 'left':
            matches = target.position.x < component.position.x;
            break;
          case 'right':
            matches = target.position.x > component.position.x;
            break;
        }
        console.log(`      Direction ${outputSide}: ${matches ? 'MATCH' : 'no match'}`);
        return matches;
      });

      if (!connection) {
        console.warn(`Duplicator ${component.id}: No connection found in direction ${outputSide}`);
        return;
      }

      const nextComponent = simulation.componentsById.get(connection.to);
      if (!nextComponent) {
        console.error(`Duplicator ${component.id}: Next component ${connection.to} not found`);
        return;
      }

      // Compute input direction
      const dx = nextComponent.position.x - component.position.x;
      const dy = nextComponent.position.y - component.position.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        ball.inputDirection = dx > 0 ? 'left' : 'right';
      } else {
        ball.inputDirection = dy > 0 ? 'up' : 'down';
      }

      // Transfer to next component
      const nextSpec = ComponentRegistry.get(nextComponent.type);
      if (nextSpec.transitions.onArrival) {
        nextSpec.transitions.onArrival(ball, nextComponent, simulation.time, nextSpec);
      }

      console.log(`Ball ${ball.id} transferred from duplicator ${component.id} to ${nextComponent.id}`);
    }
  },

  // Visual rendering
  visual: {
    render(ctx, component) {
      const pos = component.position;
      const gridSize = ctx.canvas._gridSize;
      if (!gridSize) {
        throw new Error('gridSize not available on canvas context');
      }
      const px = pos.x * gridSize;
      const py = pos.y * gridSize;

      // Get spec for validation
      const spec = ComponentRegistry.get(component.type);
      const isValid = spec.behavior.isValid(component);

      ctx.save();

      // Draw component box
      ctx.fillStyle = isValid ? '#b8b8b8' : '#d8a8a8'; // Red tint if invalid
      ctx.fillRect(px, py, gridSize, gridSize);

      // Draw border (red if invalid)
      ctx.strokeStyle = isValid ? '#666' : '#cc0000';
      ctx.lineWidth = isValid ? 2 : 3;
      ctx.strokeRect(px, py, gridSize, gridSize);

      // Get sides configuration (use default for rendering if missing - validation handled elsewhere)
      const sides = component.params.sides || spec.behavior.getDefaultSides();

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      // Helper function to draw arrow for a side
      const drawArrow = (side, type, count) => {
        const inward = (type === 'input');
        const positions = {
          left: {
            start: {x: px + gridSize * (inward ? 0.05 : 0.25), y: py + gridSize * 0.5},
            end: {x: px + gridSize * (inward ? 0.25 : 0.05), y: py + gridSize * 0.5},
            countPos: {x: px + gridSize * 0.15, y: py + gridSize * 0.35}
          },
          right: {
            start: {x: px + gridSize * (inward ? 0.95 : 0.75), y: py + gridSize * 0.5},
            end: {x: px + gridSize * (inward ? 0.75 : 0.95), y: py + gridSize * 0.5},
            countPos: {x: px + gridSize * 0.85, y: py + gridSize * 0.35}
          },
          up: {
            start: {x: px + gridSize * 0.5, y: py + gridSize * (inward ? 0.05 : 0.25)},
            end: {x: px + gridSize * 0.5, y: py + gridSize * (inward ? 0.25 : 0.05)},
            countPos: {x: px + gridSize * 0.65, y: py + gridSize * 0.15}
          },
          down: {
            start: {x: px + gridSize * 0.5, y: py + gridSize * (inward ? 0.95 : 0.75)},
            end: {x: px + gridSize * 0.5, y: py + gridSize * (inward ? 0.75 : 0.95)},
            countPos: {x: px + gridSize * 0.65, y: py + gridSize * 0.85}
          }
        };

        const pos = positions[side];

        // Draw arrow line
        ctx.beginPath();
        ctx.moveTo(pos.start.x, pos.start.y);
        ctx.lineTo(pos.end.x, pos.end.y);
        ctx.stroke();

        // Draw arrow head
        const angle = Math.atan2(pos.end.y - pos.start.y, pos.end.x - pos.start.x);
        const headSize = gridSize * 0.1;
        ctx.beginPath();
        ctx.moveTo(pos.end.x, pos.end.y);
        ctx.lineTo(
          pos.end.x - headSize * Math.cos(angle - Math.PI / 6),
          pos.end.y - headSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(pos.end.x, pos.end.y);
        ctx.lineTo(
          pos.end.x - headSize * Math.cos(angle + Math.PI / 6),
          pos.end.y - headSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();

        // Draw count for outputs
        if (type === 'output' && count > 0) {
          ctx.fillStyle = '#000';
          ctx.font = `bold ${Math.floor(gridSize * 0.2)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(count.toString(), pos.countPos.x, pos.countPos.y);
        }
      };

      // Draw all configured sides
      for (const side in sides) {
        if (sides[side].type !== 'none') {
          drawArrow(side, sides[side].type, sides[side].count);
        }
      }

      // Draw multiplication symbol in center (if valid)
      if (isValid) {
        // Calculate total inline to avoid throwing during render
        let totalCopies = 0;
        for (const side in sides) {
          if (sides[side].type === 'output') {
            totalCopies += sides[side].count;
          }
        }
        if (totalCopies > 0) {
          const label = `×${totalCopies}`;
          ctx.fillStyle = '#000';
          ctx.font = `bold ${Math.floor(gridSize * 0.25)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, px + gridSize * 0.5, py + gridSize * 0.5);
        }
      }

      // Draw plex glass overlay if enabled
      if (component.params.plex) {
        ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
        ctx.fillRect(px, py, gridSize, gridSize);
      }

      ctx.restore();
    }
  },

  // Level editor metadata
  editor: {
    icon: "×",
    category: "Processing"
    // defaultParams inherited from component spec (single source of truth)
  }
};

// Register component
if (typeof ComponentRegistry !== 'undefined') {
  ComponentRegistry.register(DuplicatorSpec);
  console.log('Duplicator component registered');
}
