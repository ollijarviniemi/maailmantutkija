/**
 * Shuffler Component - Ball Shuffler
 *
 * Takes 2-3 balls as input from different sides, shuffles them, outputs with delay
 */

const ShufflerSpec = {
  type: "shuffler",
  displayName: "Shuffler",

  isObservable: true,

  // Default parameters
  defaultParams: {
    sides: {
      up: {type: 'input', count: 0},
      right: {type: 'none', count: 0},
      down: {type: 'output', count: 2},
      left: {type: 'input', count: 0}
    },
    retainCount: 0,           // Balls kept inside after each cycle
    minBufferSize: 2,         // Threshold to trigger shuffle
    outputDelay: 800,         // ms between ball outputs
    idleTimeout: 10000,       // ms before inactive shuffler freezes balls
    plex: false
  },

  ports: {
    // Inputs are dynamic based on sides configuration
    inputs: [],
    outputs: [
      {id: "output", direction: null, offset: {x: 0.5, y: 0.5}, required: true}
    ]
  },

  states: {
    entering: {
      /**
       * Ball entering shuffler
       */
      getTrajectory(ball, component, startTime) {
        // Entry position based on which input this ball came from
        const entry = this.getEntryPosition(component, ball);
        const center = {x: component.position.x + 0.5, y: component.position.y + 0.5};

        return {
          path: applyEasing(
            createPiecewiseLinearTrajectory([entry, center]),
            easeInCubic
          ),
          duration: 500,
          waypoints: [entry, center]
        };
      },

      getEntryPosition(component, ball) {
        const pos = component.position;
        // Determine entry based on which side this input came from
        switch (ball.inputDirection) {
          case 'up':
            return {x: pos.x + 0.5, y: pos.y};
          case 'down':
            return {x: pos.x + 0.5, y: pos.y + 1};
          case 'left':
            return {x: pos.x, y: pos.y + 0.5};
          case 'right':
            return {x: pos.x + 1, y: pos.y + 0.5};
          default:
            return {x: pos.x + 0.5, y: pos.y + 0.5};
        }
      },

      visual: {
        opacity: 1.0,
        scale: 1.0,
        rotation: 0
      }
    },

    fading: {
      /**
       * Ball fading away due to idle timeout - continues physics with decaying velocity
       */
      getPosition(ball, component, currentTime) {
        const center = {x: component.position.x + 0.5, y: component.position.y + 0.5};

        // Initialize ball physics if not already done
        if (!ball.bounceState) {
          ball.bounceState = {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            lastUpdateTime: currentTime
          };
        }

        // Calculate fade progress for velocity decay
        const fadeProgress = ball.fadeStartTime && ball.fadeDuration
          ? Math.min(1, (currentTime - ball.fadeStartTime) / ball.fadeDuration)
          : 0;

        // Physics simulation with velocity decay
        const state = ball.bounceState;
        const deltaTime = currentTime - state.lastUpdateTime;
        state.lastUpdateTime = currentTime;

        // Decay velocity based on fade progress (exponential decay)
        const velocityMultiplier = Math.pow(1 - fadeProgress, 2); // Quadratic decay

        // Update position
        state.x += state.vx * deltaTime * velocityMultiplier;
        state.y += state.vy * deltaTime * velocityMultiplier;

        // Bounding box: -0.35 to +0.35 in both directions
        const boxSize = 0.35;

        // Bounce off walls with reduced energy
        if (state.x < -boxSize) {
          state.x = -boxSize;
          state.vx = Math.abs(state.vx) * 0.5; // Lose energy on bounce
        } else if (state.x > boxSize) {
          state.x = boxSize;
          state.vx = -Math.abs(state.vx) * 0.5;
        }

        if (state.y < -boxSize) {
          state.y = -boxSize;
          state.vy = Math.abs(state.vy) * 0.5;
        } else if (state.y > boxSize) {
          state.y = boxSize;
          state.vy = -Math.abs(state.vy) * 0.5;
        }

        return {
          x: center.x + state.x,
          y: center.y + state.y
        };
      },

      visual: {
        opacity: (progress, ball, currentTime) => {
          // Fade out over fadeDuration
          if (!ball || !ball.fadeStartTime || !ball.fadeDuration) return 1.0;
          const elapsed = currentTime - ball.fadeStartTime;
          return Math.max(0, 1.0 - (elapsed / ball.fadeDuration));
        },
        scale: 0.8, // Keep constant size (same as buffered state)
        rotation: (progress, ball, currentTime) => {
          if (!ball || !ball.bounceState) return 0;
          const speed = Math.sqrt(ball.bounceState.vx ** 2 + ball.bounceState.vy ** 2);
          const elapsed = currentTime - (ball.fadeStartTime || 0);
          return (elapsed * speed * 50) % 360; // Slower rotation
        }
      }
    },

    buffered: {
      /**
       * Ball waiting in buffer, bouncing around
       */
      getPosition(ball, component, currentTime) {
        const center = {x: component.position.x + 0.5, y: component.position.y + 0.5};

        // Initialize ball physics if not already done
        if (!ball.bounceState) {
          // Start with random angle
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.005 + Math.random() * 0.005; // Random speed between 0.005 and 0.01
          ball.bounceState = {
            x: (Math.random() - 0.5) * 0.4,
            y: (Math.random() - 0.5) * 0.4,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lastUpdateTime: currentTime
          };
        }

        // Physics simulation - update position based on velocity
        const state = ball.bounceState;
        const deltaTime = currentTime - state.lastUpdateTime;
        state.lastUpdateTime = currentTime;

        // Update position
        state.x += state.vx * deltaTime;
        state.y += state.vy * deltaTime;

        // Bounding box: -0.35 to +0.35 in both directions
        const boxSize = 0.35;

        // Bounce off walls with random angle perturbation
        if (state.x < -boxSize) {
          state.x = -boxSize;
          state.vx = Math.abs(state.vx);
          // Add random perturbation to angle
          const angleNoise = (Math.random() - 0.5) * 0.4;
          const speed = Math.sqrt(state.vx ** 2 + state.vy ** 2);
          const angle = Math.atan2(state.vy, state.vx) + angleNoise;
          state.vx = Math.cos(angle) * speed;
          state.vy = Math.sin(angle) * speed;
        } else if (state.x > boxSize) {
          state.x = boxSize;
          state.vx = -Math.abs(state.vx);
          // Add random perturbation to angle
          const angleNoise = (Math.random() - 0.5) * 0.4;
          const speed = Math.sqrt(state.vx ** 2 + state.vy ** 2);
          const angle = Math.atan2(state.vy, state.vx) + angleNoise;
          state.vx = Math.cos(angle) * speed;
          state.vy = Math.sin(angle) * speed;
        }

        if (state.y < -boxSize) {
          state.y = -boxSize;
          state.vy = Math.abs(state.vy);
          // Add random perturbation to angle
          const angleNoise = (Math.random() - 0.5) * 0.4;
          const speed = Math.sqrt(state.vx ** 2 + state.vy ** 2);
          const angle = Math.atan2(state.vy, state.vx) + angleNoise;
          state.vx = Math.cos(angle) * speed;
          state.vy = Math.sin(angle) * speed;
        } else if (state.y > boxSize) {
          state.y = boxSize;
          state.vy = -Math.abs(state.vy);
          // Add random perturbation to angle
          const angleNoise = (Math.random() - 0.5) * 0.4;
          const speed = Math.sqrt(state.vx ** 2 + state.vy ** 2);
          const angle = Math.atan2(state.vy, state.vx) + angleNoise;
          state.vx = Math.cos(angle) * speed;
          state.vy = Math.sin(angle) * speed;
        }

        return {
          x: center.x + state.x,
          y: center.y + state.y
        };
      },

      visual: {
        opacity: 1.0,
        scale: 0.8,
        rotation: (progress, ball, currentTime) => {
          // Rotation based on velocity (faster balls spin faster)
          if (!ball || !ball.bounceState) return 0;
          const speed = Math.sqrt(ball.bounceState.vx ** 2 + ball.bounceState.vy ** 2);
          const elapsed = currentTime - (ball.bufferEnterTime || 0);
          return (elapsed * speed * 100) % 360;
        }
      }
    },

    exiting: {
      /**
       * Ball exiting shuffler
       */
      getTrajectory(ball, component, startTime) {
        const center = {x: component.position.x + 0.5, y: component.position.y + 0.5};
        const pos = component.position;

        // Determine exit based on ball's assigned output side (from pattern)
        // Falls back to component's outputSide param for backward compatibility
        const outputSide = ball.outputSide || component.params.outputSide || 'down';
        let exit;
        switch (outputSide) {
          case 'up':
            exit = {x: pos.x + 0.5, y: pos.y};
            break;
          case 'down':
            exit = {x: pos.x + 0.5, y: pos.y + 1};
            break;
          case 'left':
            exit = {x: pos.x, y: pos.y + 0.5};
            break;
          case 'right':
            exit = {x: pos.x + 1, y: pos.y + 0.5};
            break;
          default:
            exit = {x: pos.x + 0.5, y: pos.y + 1};
        }

        return {
          path: applyEasing(
            createPiecewiseLinearTrajectory([center, exit]),
            easeOutCubic
          ),
          duration: 500,
          waypoints: [center, exit]
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
     * Ball arrives at shuffler
     */
    onArrival(ball, component, time, spec) {
      ball.componentId = component.id;
      ball.componentState = "entering";

      // Observe ball upon entry if shuffler is observable (no plex glass)
      if (!component.params.plex && component.simulation && component.simulation.bayesianTracker) {
        component.simulation.bayesianTracker.onObservation(ball.id, ball.color);
      }

      // Track which input this came from
      ball.inputIndex = component.bufferState?.ballsReceived || 0;

      const trajectory = spec.states.entering.getTrajectory(ball, component, time);
      ball.trajectory = trajectory.path;
      ball.trajectoryStartTime = time;
      ball.trajectoryDuration = trajectory.duration;
      ball.trajectoryWaypoints = trajectory.waypoints;
    },

    /**
     * Trajectory complete
     */
    onTrajectoryComplete(ball, component, time, spec) {
      if (ball.componentState === "entering") {
        // Ball entered, add to buffer
        if (!component.bufferState) {
          component.bufferState = {
            balls: [],              // All balls currently in buffer (includes retained)
            ballsReceived: 0,       // Total balls received (across all cycles)
            nextOutputTime: null,
            outputQueue: [],        // Balls queued for output (after shuffle)
            cycleNumber: 0,         // Which shuffle cycle we're on
            lastActivityTime: time, // Last time a ball arrived or was output
            frozen: false           // Whether balls are frozen due to timeout
          };
        }

        ball.componentState = "buffered";
        ball.bufferEnterTime = time;
        ball.bufferIndex = component.bufferState.balls.length;
        ball.trajectory = null;

        component.bufferState.balls.push(ball);
        component.bufferState.ballsReceived++;
        component.bufferState.lastActivityTime = time; // Update activity time

        // Check if we have reached minimum buffer size
        if (!component.params.minBufferSize) {
          throw new Error(`Shuffler ${component.id} missing minBufferSize parameter`);
        }
        const minBufferSize = component.params.minBufferSize;
        const isOutputting = component.bufferState.outputQueue && component.bufferState.outputQueue.length > 0;
        if (component.bufferState.balls.length >= minBufferSize && !isOutputting) {
          // Only trigger shuffle if we're not already outputting
          // Shuffle all balls in buffer (including any retained from previous cycle)
          spec.behavior.shuffleAndPrepareOutput(component.bufferState.balls, time, component, spec);

          // Initialize per-side timing (all sides start immediately)
          component.bufferState.nextOutputTimes = {};
          component.bufferState.cycleNumber++;
        }
      } else if (ball.componentState === "exiting") {
        // Ball exited, transfer to next component
        ball.trajectory = null;  // Clear trajectory to prevent repeated completion
        component.needsTransfer = true;
        component.ballToTransfer = ball;
      }
    }
  },

  // Shuffler behavior
  behavior: {
    /**
     * Get array of input side names
     */
    getInputSides(component) {
      if (!component.params.sides) {
        throw new Error(`Shuffler ${component.id} missing sides configuration`);
      }

      const inputs = [];
      for (const side in component.params.sides) {
        if (component.params.sides[side].type === 'input') {
          inputs.push(side);
        }
      }
      return inputs;
    },

    /**
     * Get array of output sides with their counts: [{side: 'down', count: 2}, ...]
     */
    getOutputSides(component) {
      if (!component.params.sides) {
        throw new Error(`Shuffler ${component.id} missing sides configuration`);
      }

      const outputs = [];
      for (const side in component.params.sides) {
        if (component.params.sides[side].type === 'output' && component.params.sides[side].count > 0) {
          outputs.push({
            side: side,
            count: component.params.sides[side].count
          });
        }
      }
      return outputs;
    },

    /**
     * Build output pattern from sides configuration and retainCount
     * Returns array: [{side: 'down', count: 2}, {retain: true, count: 1}, ...]
     */
    getOutputPattern(component) {
      if (!component.params.sides) {
        throw new Error(`Shuffler ${component.id} missing sides configuration`);
      }

      const pattern = [];

      // Add output sides
      const outputSides = this.getOutputSides(component);
      for (const output of outputSides) {
        pattern.push({
          side: output.side,
          count: output.count,
          retain: false
        });
      }

      // Add retention entry if retainCount > 0
      const retainCount = component.params.retainCount || 0;
      if (retainCount > 0) {
        pattern.push({
          retain: true,
          count: retainCount
        });
      }

      return pattern;
    },

    /**
     * Get total output count (excluding retained balls)
     */
    getTotalOutputCount(component) {
      const outputSides = this.getOutputSides(component);
      return outputSides.reduce((sum, output) => sum + output.count, 0);
    },

    /**
     * Validate shuffler configuration
     */
    isValid(component) {
      if (!component.params.sides) {
        return false;
      }

      const inputSides = this.getInputSides(component);
      const outputSides = this.getOutputSides(component);
      const retainCount = component.params.retainCount || 0;

      // Must have at least 1 input OR 1 output
      if (inputSides.length === 0 && outputSides.length === 0) {
        return false;
      }

      // Total output count (output + retain) should match minBufferSize for proper cycling
      const totalOutputCount = this.getTotalOutputCount(component);
      const minBufferSize = component.params.minBufferSize || 2;

      // Warning check (not invalid, but potentially problematic):
      // If totalOutputCount + retainCount < minBufferSize, balls will accumulate
      // This is allowed (for termination scenarios) but may indicate config error

      return true;
    },

    /**
     * Get default sides configuration (for rendering fallback)
     */
    getDefaultSides() {
      return {
        up: {type: 'input', count: 0},
        right: {type: 'none', count: 0},
        down: {type: 'output', count: 2},
        left: {type: 'input', count: 0}
      };
    },

    /**
     * Migrate old parameter format to new format
     * Old format: numInputs, input1Side, input2Side, input3Side, outputPattern, outputSide
     * New format: sides, retainCount, minBufferSize, outputDelay, idleTimeout, plex
     */
    migrateParams(params) {
      // If already in new format (has sides), return as-is
      if (params.sides) {
        return params;
      }


      // Initialize new sides structure
      const sides = {
        up: {type: 'none', count: 0},
        right: {type: 'none', count: 0},
        down: {type: 'none', count: 0},
        left: {type: 'none', count: 0}
      };

      // Migrate input sides
      if (params.input1Side) {
        sides[params.input1Side] = {type: 'input', count: 0};
      }
      if (params.input2Side) {
        sides[params.input2Side] = {type: 'input', count: 0};
      }
      if (params.input3Side && params.numInputs === 3) {
        sides[params.input3Side] = {type: 'input', count: 0};
      }

      // Migrate output sides and retainCount from outputPattern
      let retainCount = 0;
      if (params.outputPattern) {
        for (const entry of params.outputPattern) {
          if (entry.retain) {
            retainCount = entry.count;
          } else if (entry.side) {
            sides[entry.side] = {type: 'output', count: entry.count};
          }
        }
      } else if (params.outputSide) {
        // Fallback: use outputSide with default count
        sides[params.outputSide] = {type: 'output', count: 2};
      }

      // Build new params
      const newParams = {
        sides: sides,
        retainCount: retainCount,
        minBufferSize: params.minBufferSize || params.numInputs || 2,
        outputDelay: params.outputDelay || 800,
        idleTimeout: params.idleTimeout || 10000,
        plex: params.plex || false
      };

      return newParams;
    },

    /**
     * Shuffle balls in buffer
     */
    shuffle(balls, time, component) {
      // Notify Bayesian tracker BEFORE shuffling
      // For 2 balls: call onShuffle for the pair
      // For 3+ balls: call onShuffle for each pair (this creates dependencies)
      if (component.simulation && component.simulation.bayesianTracker) {
        const tracker = component.simulation.bayesianTracker;

        if (balls.length === 2) {
          // Simple 2-ball shuffle
          tracker.onShuffle(balls[0].id, balls[1].id);
        } else if (balls.length === 3) {
          // 3-ball shuffle: merge all into one group by calling onShuffle for each pair
          // This creates a 3-way dependency
          tracker.onShuffle(balls[0].id, balls[1].id);
          tracker.onShuffle(balls[0].id, balls[2].id); // Now all 3 are in same group
        } else if (balls.length > 3) {
          console.warn(`Shuffler with ${balls.length} balls not fully supported in Bayesian tracker`);
          // Merge all by calling onShuffle in sequence
          for (let i = 1; i < balls.length; i++) {
            tracker.onShuffle(balls[0].id, balls[i].id);
          }
        }
      }

      // Fisher-Yates shuffle (physical shuffling)
      for (let i = balls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [balls[i], balls[j]] = [balls[j], balls[i]];
      }
    },

    /**
     * Shuffle balls and prepare output queue based on pattern
     */
    shuffleAndPrepareOutput(balls, time, component, spec) {
      // First, shuffle all balls (includes Bayesian tracker notification)
      spec.behavior.shuffle(balls, time, component);

      // Get output pattern from sides configuration
      const outputPattern = spec.behavior.getOutputPattern(component);

      // Prepare output queue based on pattern
      const outputQueue = [];
      let ballIndex = 0;

      for (const entry of outputPattern) {
        const count = Math.min(entry.count, balls.length - ballIndex);

        if (entry.retain) {
          // These balls stay in buffer - skip them in output queue
          // Mark them as retained for next cycle
          for (let i = 0; i < count; i++) {
            if (ballIndex < balls.length) {
              balls[ballIndex].retained = true;
              ballIndex++;
            }
          }
        } else {
          // These balls go to output queue
          for (let i = 0; i < count; i++) {
            if (ballIndex < balls.length) {
              const ball = balls[ballIndex];
              ball.retained = false;
              ball.outputSide = entry.side;
              outputQueue.push(ball);
              ballIndex++;
            }
          }
        }
      }

      component.bufferState.outputQueue = outputQueue;

    }
  },

  // Check for ball output (called by simulation)
  checkAndOutput(component, time, spec) {
    if (!component.bufferState) {
      return;
    }

    // Check for idle timeout
    if (!component.params.idleTimeout) {
      throw new Error(`Shuffler ${component.id} missing idleTimeout parameter`);
    }
    const idleTimeout = component.params.idleTimeout;
    const timeSinceActivity = time - component.bufferState.lastActivityTime;

    // If idle timeout exceeded and not already frozen, start fading all balls
    if (timeSinceActivity >= idleTimeout && !component.bufferState.frozen && component.bufferState.balls.length > 0) {
      component.bufferState.frozen = true;

      // Start fading all balls (keep them in balls array for rendering)
      for (const ball of component.bufferState.balls) {
        // Stop ball movement and set to fading state
        ball.trajectory = null;
        ball.componentState = "fading";
        ball.position = spec.states.buffered.getPosition(ball, component, time);
        // Keep bounceState for decaying physics (don't delete it!)

        // Start fade out
        ball.fadeStartTime = time;
        ball.fadeDuration = 2000; // 2 second fade

      }

      // Clear output state but keep balls for fading
      component.bufferState.outputQueue = [];
      component.bufferState.nextOutputTimes = {};

      return;
    }

    // Check for completely faded balls and mark as consumed
    if (component.bufferState.frozen && component.bufferState.balls.length > 0) {
      for (const ball of component.bufferState.balls) {
        if (ball.componentState === "fading") {
          const fadeComplete = (time - ball.fadeStartTime) >= ball.fadeDuration;
          if (fadeComplete) {
            // Mark as consumed so renderer skips it
            ball.componentState = "consumed";
            ball.componentId = null; // Detach from component

            // Notify Bayesian tracker (ball is being removed from tracking)
            if (component.simulation && component.simulation.bayesianTracker) {
              component.simulation.bayesianTracker.onBallCollected(ball.id);
            }
          }
        }
      }

      // Clean up consumed balls from buffer
      component.bufferState.balls = component.bufferState.balls.filter(ball =>
        ball.componentState !== "consumed"
      );
    }

    // Normal output processing with per-channel timing
    if (!component.bufferState.outputQueue || component.bufferState.outputQueue.length === 0) {
      return;
    }

    // Initialize per-side output timing if needed
    if (!component.bufferState.nextOutputTimes) {
      component.bufferState.nextOutputTimes = {};
    }

    if (!component.params.outputDelay) {
      throw new Error(`Shuffler ${component.id} missing outputDelay parameter`);
    }
    const outputDelay = component.params.outputDelay;

    // Try to output balls from each side independently
    const outputQueue = component.bufferState.outputQueue;
    const ballsToOutput = [];

    // Group remaining balls by output side
    const ballsBySide = {};
    for (const ball of outputQueue) {
      if (!ballsBySide[ball.outputSide]) {
        ballsBySide[ball.outputSide] = [];
      }
      ballsBySide[ball.outputSide].push(ball);
    }

    // For each side, check if we can output a ball
    for (const side in ballsBySide) {
      const nextTime = component.bufferState.nextOutputTimes[side] || 0;
      if (time >= nextTime && ballsBySide[side].length > 0) {
        const ball = ballsBySide[side][0]; // Take first ball for this side
        ballsToOutput.push(ball);
        // Schedule next output for this side
        component.bufferState.nextOutputTimes[side] = time + outputDelay;
      }
    }

    // Output all ready balls
    for (const ball of ballsToOutput) {
      // Remove from queue
      const queueIndex = outputQueue.indexOf(ball);
      if (queueIndex !== -1) {
        outputQueue.splice(queueIndex, 1);
      }

      ball.componentState = "exiting";

      // Clean up bounce physics state
      delete ball.bounceState;

      // Remove ball from main buffer
      const ballIndex = component.bufferState.balls.indexOf(ball);
      if (ballIndex !== -1) {
        component.bufferState.balls.splice(ballIndex, 1);
      }

      const trajectory = spec.states.exiting.getTrajectory(ball, component, time);
      ball.trajectory = trajectory.path;
      ball.trajectoryStartTime = time;
      ball.trajectoryDuration = trajectory.duration;
      ball.trajectoryWaypoints = trajectory.waypoints;

      // Update activity time
      component.bufferState.lastActivityTime = time;

    }

    // If output queue is empty, log completion
    if (outputQueue.length === 0) {
    }
  },

  // For Bayesian inference
  inference: {
    /**
     * Shuffler shuffles, so all permutations are possible
     */
    getPossibleInputs(outputs, params) {
      const numInputs = params.numInputs || 2;

      if (outputs.length !== numInputs) {
        return [{inputs: outputs, probability: 1.0}];
      }

      // Generate all permutations
      const permutations = [];
      const permute = (arr, m = []) => {
        if (arr.length === 0) {
          permutations.push(m);
        } else {
          for (let i = 0; i < arr.length; i++) {
            const curr = arr.slice();
            const next = curr.splice(i, 1);
            permute(curr.slice(), m.concat(next));
          }
        }
      };
      permute(outputs);

      // Each permutation is equally likely
      const probability = 1.0 / permutations.length;
      return permutations.map(perm => ({inputs: perm, probability}));
    }
  },

  // Visual rendering
  visual: {
    imagePath: "../images/shuffler.png",
    size: {width: 64, height: 64},

    render(ctx, component) {
      const pos = component.position;

      // Get gridSize from canvas (throw error if not available)
      const gridSize = ctx.canvas._gridSize;
      if (!gridSize) {
        throw new Error('gridSize not available on canvas context');
      }

      const px = pos.x * gridSize;
      const py = pos.y * gridSize;

      // Get sides configuration (use default for rendering if missing - validation handled elsewhere)
      const sides = component.params.sides || ShufflerSpec.behavior.getDefaultSides();
      const retainCount = component.params.retainCount || 0;

      // Check if configuration is valid (for coloring)
      const isValid = component.params.sides ? ShufflerSpec.behavior.isValid(component) : false;

      // Draw shuffler box
      ctx.fillStyle = isValid ? "#555" : "#8B4545"; // Red tint if invalid
      ctx.strokeStyle = "#000";
      ctx.lineWidth = gridSize * 0.0625; // 4/64
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const boxInset = gridSize * 0.125; // 8/64
      const boxSize = gridSize * 0.75; // 48/64
      ctx.fillRect(px + boxInset, py + boxInset, boxSize, boxSize);
      ctx.strokeRect(px + boxInset, py + boxInset, boxSize, boxSize);

      // Draw channels and arrows for each side
      const channelWidth = gridSize * 0.125; // 8/64
      const channelLength = gridSize * 0.1875; // 12/64
      const channelOffset = gridSize * 0.4375; // 28/64
      const channelFarOffset = gridSize * 0.8125; // 52/64
      const arrowSize = gridSize * 0.09375; // 6/64

      const drawChannel = (side, type) => {
        // Set color based on type
        if (type === 'input') {
          ctx.fillStyle = "#333";
        } else if (type === 'output') {
          ctx.fillStyle = "#FFD700";
        } else {
          return; // Don't draw 'none' type
        }

        switch (side) {
          case 'up':
            ctx.fillRect(px + channelOffset, py, channelWidth, channelLength);
            break;
          case 'down':
            ctx.fillRect(px + channelOffset, py + channelFarOffset, channelWidth, channelLength);
            break;
          case 'left':
            ctx.fillRect(px, py + channelOffset, channelLength, channelWidth);
            break;
          case 'right':
            ctx.fillRect(px + channelFarOffset, py + channelOffset, channelLength, channelWidth);
            break;
        }
      };

      const drawArrow = (side, type) => {
        if (type === 'none') return;

        // Set color and direction
        ctx.fillStyle = type === 'input' ? "#666" : "#FFD700";
        ctx.strokeStyle = type === 'input' ? "#666" : "#FFD700";
        ctx.lineWidth = 2;

        const centerX = px + gridSize * 0.5;
        const centerY = py + gridSize * 0.5;

        ctx.beginPath();
        switch (side) {
          case 'up':
            if (type === 'input') {
              // Arrow pointing down (into shuffler)
              ctx.moveTo(centerX, py + gridSize * 0.21875);
              ctx.lineTo(centerX - arrowSize / 2, py + gridSize * 0.15625);
              ctx.lineTo(centerX + arrowSize / 2, py + gridSize * 0.15625);
            } else {
              // Arrow pointing up (out of shuffler)
              ctx.moveTo(centerX, py + gridSize * 0.09375);
              ctx.lineTo(centerX - arrowSize / 2, py + gridSize * 0.15625);
              ctx.lineTo(centerX + arrowSize / 2, py + gridSize * 0.15625);
            }
            break;
          case 'down':
            if (type === 'input') {
              // Arrow pointing up (into shuffler)
              ctx.moveTo(centerX, py + gridSize * 0.78125);
              ctx.lineTo(centerX - arrowSize / 2, py + gridSize * 0.84375);
              ctx.lineTo(centerX + arrowSize / 2, py + gridSize * 0.84375);
            } else {
              // Arrow pointing down (out of shuffler)
              ctx.moveTo(centerX, py + gridSize * 0.90625);
              ctx.lineTo(centerX - arrowSize / 2, py + gridSize * 0.84375);
              ctx.lineTo(centerX + arrowSize / 2, py + gridSize * 0.84375);
            }
            break;
          case 'left':
            if (type === 'input') {
              // Arrow pointing right (into shuffler)
              ctx.moveTo(px + gridSize * 0.21875, centerY);
              ctx.lineTo(px + gridSize * 0.15625, centerY - arrowSize / 2);
              ctx.lineTo(px + gridSize * 0.15625, centerY + arrowSize / 2);
            } else {
              // Arrow pointing left (out of shuffler)
              ctx.moveTo(px + gridSize * 0.09375, centerY);
              ctx.lineTo(px + gridSize * 0.15625, centerY - arrowSize / 2);
              ctx.lineTo(px + gridSize * 0.15625, centerY + arrowSize / 2);
            }
            break;
          case 'right':
            if (type === 'input') {
              // Arrow pointing left (into shuffler)
              ctx.moveTo(px + gridSize * 0.78125, centerY);
              ctx.lineTo(px + gridSize * 0.84375, centerY - arrowSize / 2);
              ctx.lineTo(px + gridSize * 0.84375, centerY + arrowSize / 2);
            } else {
              // Arrow pointing right (out of shuffler)
              ctx.moveTo(px + gridSize * 0.90625, centerY);
              ctx.lineTo(px + gridSize * 0.84375, centerY - arrowSize / 2);
              ctx.lineTo(px + gridSize * 0.84375, centerY + arrowSize / 2);
            }
            break;
        }
        ctx.closePath();
        ctx.fill();
      };

      // Draw channels and arrows for each side
      for (const side in sides) {
        drawChannel(side, sides[side].type);
        drawArrow(side, sides[side].type);
      }

      // Draw shuffle icon in center (if valid)
      if (isValid) {
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = gridSize * 0.03125; // 2/64
        ctx.beginPath();
        // Shuffle icon coordinates (scaled from hardcoded values)
        ctx.moveTo(px + gridSize * 0.3125, py + gridSize * 0.390625);
        ctx.lineTo(px + gridSize * 0.4375, py + gridSize * 0.3125);
        ctx.lineTo(px + gridSize * 0.5625, py + gridSize * 0.390625);
        ctx.moveTo(px + gridSize * 0.5625, py + gridSize * 0.546875);
        ctx.lineTo(px + gridSize * 0.4375, py + gridSize * 0.625);
        ctx.lineTo(px + gridSize * 0.3125, py + gridSize * 0.546875);
        ctx.stroke();
      }

      // Draw output counts on each output side
      if (isValid) {
        ctx.fillStyle = "#FFD700";
        ctx.font = `bold ${gridSize * 0.25}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (const side in sides) {
          if (sides[side].type === 'output' && sides[side].count > 0) {
            let textX, textY;
            switch (side) {
              case 'up':
                textX = px + gridSize * 0.5;
                textY = py + gridSize * 0.18;
                break;
              case 'down':
                textX = px + gridSize * 0.5;
                textY = py + gridSize * 0.82;
                break;
              case 'left':
                textX = px + gridSize * 0.18;
                textY = py + gridSize * 0.5;
                break;
              case 'right':
                textX = px + gridSize * 0.82;
                textY = py + gridSize * 0.5;
                break;
            }
            if (textX !== undefined) {
              ctx.fillText(`${sides[side].count}`, textX, textY);
            }
          }
        }
      }

      // Draw capacity (minBufferSize) in center
      const minBufferSize = component.params.minBufferSize;
      if (minBufferSize !== undefined && isValid) {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${gridSize * 0.3}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${minBufferSize}`, px + gridSize * 0.5, py + gridSize * 0.5);
      }

      // Draw retain count in bottom-right corner if > 0
      if (retainCount > 0 && isValid) {
        ctx.fillStyle = "#888";
        ctx.font = `${gridSize * 0.18}px Arial`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(`R:${retainCount}`, px + gridSize * 0.95, py + gridSize * 0.95);
      }
    }
  },

  // Level editor metadata
  editor: {
    icon: "🔀",
    category: "Processing"
    // defaultParams inherited from component spec (single source of truth)
  }
};

// Register component
if (typeof ComponentRegistry !== 'undefined') {
  ComponentRegistry.register(ShufflerSpec);
}
