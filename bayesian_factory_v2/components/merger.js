/**
 * Merger Component
 *
 * Merges two input conveyors into one output
 * Works like a Y-junction belt - balls pass through smoothly
 */

const MergerSpec = {
  type: "merger",
  name: "Merger",
  description: "Merges two input conveyors into one output",

  // Ports (input/output positions)
  ports: {
    inputs: [
      {id: "input1", direction: null, offset: {x: 0.5, y: 0}, required: true},
      {id: "input2", direction: null, offset: {x: 0.5, y: 1}, required: true}
    ],
    outputs: [
      {id: "output", direction: null, offset: {x: 1, y: 0.5}, required: false}
    ]
  },

  // Parameters
  defaultParams: {
    direction: 'right',  // Output direction
    input1Side: 'up',    // First input side
    input2Side: 'down',  // Second input side (supports adjacent or opposite)
    plex: false,
    speed: 1.0           // Speed multiplier for ball traversal
  },

  // Component states
  states: {
    traveling: {
      visual: {
        opacity: 1.0,
        scale: 1.0,
        rotation: 0
      }
    }
  },

  // Behavior methods
  behavior: {
    /**
     * Get input and output positions based on configurable input sides
     */
    getPositions(component) {
      const pos = component.position;
      const direction = component.params.direction;
      const input1Side = component.params.input1Side;
      const input2Side = component.params.input2Side;

      // Map sides to positions
      const sideToPos = {
        'up': {x: pos.x + 0.5, y: pos.y},
        'down': {x: pos.x + 0.5, y: pos.y + 1},
        'left': {x: pos.x, y: pos.y + 0.5},
        'right': {x: pos.x + 1, y: pos.y + 0.5}
      };

      // Map direction to output position
      const dirToOutput = {
        'right': {x: pos.x + 1, y: pos.y + 0.5},
        'down': {x: pos.x + 0.5, y: pos.y + 1},
        'left': {x: pos.x, y: pos.y + 0.5},
        'up': {x: pos.x + 0.5, y: pos.y}
      };

      return {
        input1: sideToPos[input1Side],
        input2: sideToPos[input2Side],
        center: {x: pos.x + 0.5, y: pos.y + 0.5},
        exit: dirToOutput[direction]
      };
    }
  },

  // State transitions
  transitions: {
    /**
     * Ball arrives at merger input
     */
    onArrival(ball, component, time, spec) {
      ball.componentId = component.id;
      ball.componentState = "traveling";

      // Observe ball upon entry if no plex glass
      if (!component.params.plex && component.simulation && component.simulation.bayesianTracker) {
        component.simulation.bayesianTracker.onObservation(ball.id, ball.color);
      }

      const positions = spec.behavior.getPositions(component);

      // Determine which input the ball came from based on ball.inputDirection
      const input1Side = component.params.input1Side;
      const input2Side = component.params.input2Side;

      let startPos;
      if (ball.inputDirection === input1Side) {
        startPos = positions.input1;
      } else if (ball.inputDirection === input2Side) {
        startPos = positions.input2;
      } else {
        throw new Error(
          `Ball ${ball.id} entering merger ${component.id} from ${ball.inputDirection}, ` +
          `but merger inputs are ${input1Side} and ${input2Side}`
        );
      }

      // Create single trajectory: input → center → exit (like turn belt does)
      const speed = component.params.speed;
      const waypoints = [startPos, positions.center, positions.exit];
      const duration = computeTrajectoryDuration(waypoints, speed);

      const trajectoryData = {
        path: createPiecewiseLinearTrajectory(waypoints),
        duration: duration,
        waypoints: waypoints
      };

      ball.trajectory = trajectoryData.path;
      ball.trajectoryStartTime = time;
      ball.trajectoryDuration = trajectoryData.duration;
      ball.trajectoryWaypoints = trajectoryData.waypoints;

    },

    /**
     * Ball completes trajectory - transfer to next component
     */
    onTrajectoryComplete(ball, component) {

      // Clear trajectory before transfer to prevent repeated completion if transfer fails
      ball.trajectory = null;

      // Transfer to next component
      if (typeof window !== 'undefined' && window.transferBallHelper) {
        window.transferBallHelper(component, ball, component.simulation);
      }
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

      // Get belt configuration: which sides have belts and whether they're inputs/outputs
      const beltConfig = [
        {side: component.params.input1Side, isInput: true},
        {side: component.params.input2Side, isInput: true},
        {side: component.params.direction, isInput: false}
      ];

      ctx.save();
      ctx.translate(px, py);

      // Draw belt-like merger
      ctx.fillStyle = "#707070"; // Belt gray
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const beltWidth = gridSize * 0.375;
      const beltInset = gridSize * 0.3125;

      // Helper to draw belt segment from edge to center (or center to edge for output)
      const drawBeltSegment = (side) => {
        switch (side) {
          case 'up':
            ctx.fillRect(beltInset, 0, beltWidth, gridSize * 0.5);
            break;
          case 'down':
            ctx.fillRect(beltInset, gridSize * 0.5, beltWidth, gridSize * 0.5);
            break;
          case 'left':
            ctx.fillRect(0, beltInset, gridSize * 0.5, beltWidth);
            break;
          case 'right':
            ctx.fillRect(gridSize * 0.5, beltInset, gridSize * 0.5, beltWidth);
            break;
        }
      };

      const drawBeltBorder = (side) => {
        switch (side) {
          case 'up':
            ctx.rect(beltInset, 0, beltWidth, gridSize * 0.5);
            break;
          case 'down':
            ctx.rect(beltInset, gridSize * 0.5, beltWidth, gridSize * 0.5);
            break;
          case 'left':
            ctx.rect(0, beltInset, gridSize * 0.5, beltWidth);
            break;
          case 'right':
            ctx.rect(gridSize * 0.5, beltInset, gridSize * 0.5, beltWidth);
            break;
        }
      };

      // Draw all belt segments
      beltConfig.forEach(config => drawBeltSegment(config.side));

      // Draw borders
      ctx.beginPath();
      beltConfig.forEach(config => drawBeltBorder(config.side));
      ctx.stroke();

      // Draw directional arrows on belts (gold like turn belts)
      ctx.fillStyle = "#FFD700";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;

      const arrowHeadSize = gridSize * 0.08;

      const drawArrow = (startX, startY, endX, endY) => {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

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

      // Draw arrows based on side and direction
      const drawSideArrow = (side, isInput) => {
        switch (side) {
          case 'up':
            if (isInput) {
              drawArrow(gridSize * 0.5, gridSize * 0.15, gridSize * 0.5, gridSize * 0.35);
            } else {
              drawArrow(gridSize * 0.5, gridSize * 0.35, gridSize * 0.5, gridSize * 0.15);
            }
            break;
          case 'down':
            if (isInput) {
              drawArrow(gridSize * 0.5, gridSize * 0.85, gridSize * 0.5, gridSize * 0.65);
            } else {
              drawArrow(gridSize * 0.5, gridSize * 0.65, gridSize * 0.5, gridSize * 0.85);
            }
            break;
          case 'left':
            if (isInput) {
              drawArrow(gridSize * 0.15, gridSize * 0.5, gridSize * 0.35, gridSize * 0.5);
            } else {
              drawArrow(gridSize * 0.35, gridSize * 0.5, gridSize * 0.15, gridSize * 0.5);
            }
            break;
          case 'right':
            if (isInput) {
              drawArrow(gridSize * 0.85, gridSize * 0.5, gridSize * 0.65, gridSize * 0.5);
            } else {
              drawArrow(gridSize * 0.65, gridSize * 0.5, gridSize * 0.85, gridSize * 0.5);
            }
            break;
        }
      };

      // Draw arrows for all belts
      beltConfig.forEach(config => drawSideArrow(config.side, config.isInput));

      // Draw plex glass overlay if enabled
      if (component.params.plex) {
        ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
        ctx.fillRect(0, 0, gridSize, gridSize);
      }

      ctx.restore();
    }
  },

  // Level editor metadata
  editor: {
    icon: "⊳",
    category: "Processing",
    defaultParams: {
      direction: 'right',
      input1Side: 'up',
      input2Side: 'down',
      plex: false,
      speed: 1.0
    }
  },

  // Rotation configurations (12 total: 4 opposite + 8 adjacent)
  rotationConfigs: [
    // Opposite inputs (4 rotations of up+down->right)
    {input1Side: 'up', input2Side: 'down', direction: 'right'},      // 0
    {input1Side: 'right', input2Side: 'left', direction: 'down'},    // 1
    {input1Side: 'down', input2Side: 'up', direction: 'left'},       // 2
    {input1Side: 'left', input2Side: 'right', direction: 'up'},      // 3

    // Adjacent inputs
    {input1Side: 'up', input2Side: 'left', direction: 'right'},      // 4
    {input1Side: 'up', input2Side: 'left', direction: 'down'},       // 5
    {input1Side: 'right', input2Side: 'up', direction: 'down'},      // 6
    {input1Side: 'right', input2Side: 'up', direction: 'left'},      // 7
    {input1Side: 'down', input2Side: 'right', direction: 'left'},    // 8
    {input1Side: 'down', input2Side: 'right', direction: 'up'},      // 9
    {input1Side: 'left', input2Side: 'down', direction: 'up'},       // 10
    {input1Side: 'left', input2Side: 'down', direction: 'right'}     // 11
  ],

  // Get next rotation configuration
  getNextRotation(currentParams) {
    // Find current configuration index
    let currentIndex = this.rotationConfigs.findIndex(config =>
      config.input1Side === currentParams.input1Side &&
      config.input2Side === currentParams.input2Side &&
      config.direction === currentParams.direction
    );

    // If not found, start at 0
    if (currentIndex === -1) currentIndex = 0;

    // Get next configuration (cycle back to 0 after 11)
    const nextIndex = (currentIndex + 1) % this.rotationConfigs.length;
    return this.rotationConfigs[nextIndex];
  }
};

// Register component
if (typeof ComponentRegistry !== 'undefined') {
  ComponentRegistry.register(MergerSpec);
}
