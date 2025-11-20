/**
 * Mechanical Arm Component
 *
 * Picks balls from sacks and places them on conveyors
 * Uses frame-based animation from existing images
 */

const ArmSpec = {
  type: "arm",
  displayName: "Mechanical Arm",

  isObservable: true,

  ports: {
    inputs: [
      {id: "sack", direction: null, offset: {x: 0, y: 0}, required: true}
    ],
    outputs: [
      {id: "conveyor", direction: null, offset: {x: 1, y: 0.5}, required: true}
    ]
  },

  states: {
    idle: {
      visual: {
        opacity: 1.0,
        scale: 1.0,
        rotation: 0
      }
    },

    picking: {
      /**
       * Ball being picked up from sack
       */
      getTrajectory(ball, component, startTime) {
        const sackId = component.params.assignedSackId;
        if (!sackId) {
          throw new Error(`Arm ${component.id} has no assigned sack`);
        }

        // For now, simple trajectory from sack to arm center
        // In full implementation, would follow gripper keyframes
        const sackPos = component.assignedSack.position;
        const sackCenter = {x: sackPos.x + 0.5, y: sackPos.y + 0.5};
        const armCenter = {x: component.position.x + 0.5, y: component.position.y + 0.5};

        return {
          path: applyEasing(
            createPiecewiseLinearTrajectory([sackCenter, armCenter]),
            easeInOutCubic
          ),
          duration: 1000,
          waypoints: [sackCenter, armCenter]
        };
      },

      visual: {
        opacity: (progress) => progress,  // Fade in
        scale: 0.6,
        rotation: 0
      }
    },

    holding: {
      /**
       * Ball held at arm center
       */
      getPosition(ball, component) {
        return {
          x: component.position.x + 0.5,
          y: component.position.y + 0.5
        };
      },

      visual: {
        opacity: 1.0,
        scale: 0.6,
        rotation: 0
      }
    },

    placing: {
      /**
       * Ball being placed on conveyor
       */
      getTrajectory(ball, component, startTime) {
        const armCenter = {x: component.position.x + 0.5, y: component.position.y + 0.5};
        const conveyorId = component.params.outputConveyorId;

        if (!conveyorId) {
          throw new Error(`Arm ${component.id} has no output conveyor`);
        }

        const conveyorPos = component.outputConveyor.position;

        // Calculate entry point based on conveyor position relative to arm
        const dx = conveyorPos.x - component.position.x;
        const dy = conveyorPos.y - component.position.y;

        let conveyorEntry;
        if (Math.abs(dx) > Math.abs(dy)) {
          // Conveyor is primarily horizontal relative to arm
          if (dx > 0) {
            // Conveyor is to the right - enter from left edge
            conveyorEntry = {x: conveyorPos.x, y: conveyorPos.y + 0.5};
          } else {
            // Conveyor is to the left - enter from right edge
            conveyorEntry = {x: conveyorPos.x + 1, y: conveyorPos.y + 0.5};
          }
        } else {
          // Conveyor is primarily vertical relative to arm
          if (dy > 0) {
            // Conveyor is below - enter from top edge
            conveyorEntry = {x: conveyorPos.x + 0.5, y: conveyorPos.y};
          } else {
            // Conveyor is above - enter from bottom edge
            conveyorEntry = {x: conveyorPos.x + 0.5, y: conveyorPos.y + 1};
          }
        }

        return {
          path: applyEasing(
            createPiecewiseLinearTrajectory([armCenter, conveyorEntry]),
            easeInOutCubic
          ),
          duration: 1000,
          waypoints: [armCenter, conveyorEntry]
        };
      },

      getPosition(ball, component) {
        // Final position at conveyor entry - calculate same way as in getTrajectory
        const conveyorPos = component.outputConveyor.position;
        const dx = conveyorPos.x - component.position.x;
        const dy = conveyorPos.y - component.position.y;

        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            return {x: conveyorPos.x, y: conveyorPos.y + 0.5};
          } else {
            return {x: conveyorPos.x + 1, y: conveyorPos.y + 0.5};
          }
        } else {
          if (dy > 0) {
            return {x: conveyorPos.x + 0.5, y: conveyorPos.y};
          } else {
            return {x: conveyorPos.x + 0.5, y: conveyorPos.y + 1};
          }
        }
      },

      visual: {
        opacity: 1.0,
        scale: (progress) => 0.6 + 0.4 * progress,  // Grow back to normal size
        rotation: 0
      }
    }
  },

  transitions: {
    /**
     * Arm picks up ball from sack
     */
    onPickup(ball, component, time, spec) {
      ball.componentId = component.id;
      ball.componentState = "picking";

      const trajectory = spec.states.picking.getTrajectory(ball, component, time);
      ball.trajectory = trajectory.path;
      ball.trajectoryStartTime = time;
      ball.trajectoryDuration = trajectory.duration;
      ball.trajectoryWaypoints = trajectory.waypoints;

      // If arm doesn't have plex glass, observe the ball immediately upon pickup
      if (!component.params.plex && component.simulation && component.simulation.bayesianTracker) {
        component.simulation.bayesianTracker.onObservation(ball.id, ball.color);
      }
    },

    /**
     * Trajectory complete - transition to next state
     */
    onTrajectoryComplete(ball, component, time, spec) {
      switch (ball.componentState) {
        case "picking":
          // Picking complete → holding
          ball.componentState = "holding";
          ball.position = spec.states.holding.getPosition(ball, component);
          ball.trajectory = null;

          // Mark component as ready to place after brief hold
          component.readyToPlaceAt = time + 500;
          component.ballToPlace = ball;
          break;

        case "placing":
          // Placing complete → transfer to conveyor
          ball.position = spec.states.placing.getPosition(ball, component);
          ball.trajectory = null;  // CRITICAL: Clear trajectory to prevent repeated completion
          component.needsTransfer = true;
          component.ballToTransfer = ball;
          break;

        default:
          console.warn(`Arm ${component.id}: Unexpected ball state ${ball.componentState} in onTrajectoryComplete`);
          ball.trajectory = null;  // Clear trajectory to prevent infinite loop
          break;
      }
    }
  },

  // Helper method called by simulation
  checkAndPlace(component, time, spec) {
    if (component.readyToPlaceAt && time >= component.readyToPlaceAt && component.ballToPlace) {
      const ball = component.ballToPlace;
      ball.componentState = "placing";

      const trajectory = spec.states.placing.getTrajectory(ball, component, time);
      ball.trajectory = trajectory.path;
      ball.trajectoryStartTime = time;
      ball.trajectoryDuration = trajectory.duration;
      ball.trajectoryWaypoints = trajectory.waypoints;

      component.readyToPlaceAt = null;
      component.ballToPlace = null;
    }
  },

  // Visual rendering
  visual: {
    frames: [
      "../images/arm_rest_neutral.png",
      "../images/arm_reaching_left_opening.png",
      "../images/arm_extended_left_open.png",
      "../images/arm_at_sack_picking.png",
      "../images/arm_picked_closing.png",
      "../images/arm_returning_center_with_ball.png",
      "../images/arm_center_with_ball.png",
      "../images/arm_reaching_right_with_ball.png",
      "../images/arm_extended_right_with_ball.png",
      "../images/arm_at_belt_releasing.png",
      "../images/arm_returning_right.png",
      "../images/arm_returning_center.png"
    ],

    frameMapping(state, progress) {
      // Map state to frame indices
      const stateFrames = {
        idle: [0],
        picking: [1, 2, 3, 4],
        holding: [5, 6],
        placing: [7, 8, 9],
        returning: [10, 11, 0]
      };

      const frames = stateFrames[state] || [0];
      const index = Math.floor(progress * frames.length);
      return frames[Math.min(index, frames.length - 1)];
    },

    size: {width: 64, height: 64},

    render(ctx, component) {
      const pos = component.position;
      const gridSize = ctx.canvas._gridSize;
      if (!gridSize) {
        throw new Error('gridSize not available on canvas context');
      }
      const px = pos.x * gridSize;
      const py = pos.y * gridSize;

      // Fallback: simple arm rendering
      ctx.strokeStyle = "#000";
      ctx.fillStyle = "#888";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";

      // Upper arm
      ctx.beginPath();
      ctx.moveTo(px + gridSize * 0.5, py + gridSize * 0.25);
      ctx.lineTo(px + gridSize * 0.5, py + gridSize * 0.625);
      ctx.stroke();

      // Lower arm
      ctx.beginPath();
      ctx.moveTo(px + gridSize * 0.5, py + gridSize * 0.625);
      ctx.lineTo(px + gridSize * 0.75, py + gridSize * 0.8125);
      ctx.stroke();

      // Joints
      ctx.fillStyle = "#666";
      ctx.beginPath();
      ctx.arc(px + gridSize * 0.5, py + gridSize * 0.25, gridSize * 0.0625, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px + gridSize * 0.5, py + gridSize * 0.625, gridSize * 0.0625, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Gripper
      ctx.beginPath();
      ctx.arc(px + gridSize * 0.75, py + gridSize * 0.8125, gridSize * 0.046875, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  },

  // Level editor metadata
  editor: {
    icon: "🦾",
    category: "Transport",
    defaultParams: {
      assignedSackId: null,
      outputConveyorId: null
    }
  }
};

// Register component
if (typeof ComponentRegistry !== 'undefined') {
  ComponentRegistry.register(ArmSpec);
}
