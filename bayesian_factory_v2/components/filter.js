/**
 * Filter Component
 *
 * Routes balls by color to different outputs (pass-through, no buffering)
 * - Matching color → match output
 * - Non-matching color → non-match output
 */

const FilterSpec = {
  type: "filter",
  name: "Filter",
  description: "Routes balls by color to different outputs",

  // Ports (input/output positions)
  ports: {
    inputs: [
      {id: "input", direction: null, offset: {x: 0.5, y: 0}, required: true}
    ],
    outputs: [
      {id: "match", direction: null, offset: {x: 0, y: 0.5}, required: false},
      {id: "nonmatch", direction: null, offset: {x: 1, y: 0.5}, required: false}
    ]
  },

  // Parameters
  defaultParams: {
    targetColor: 'red',  // Color to filter for
    inputSide: 'up',     // Input side
    matchOutputSide: 'left',    // Output side for matching color balls
    nonMatchOutputSide: 'right', // Output side for non-matching color balls
    plex: false,
    speed: 1.0
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
     * Get input and output positions
     */
    getPositions(component) {
      const pos = component.position;
      const inputSide = component.params.inputSide;
      const matchSide = component.params.matchOutputSide;
      const nonMatchSide = component.params.nonMatchOutputSide;

      // Map sides to positions
      const sideToPos = {
        'up': {x: pos.x + 0.5, y: pos.y},
        'down': {x: pos.x + 0.5, y: pos.y + 1},
        'left': {x: pos.x, y: pos.y + 0.5},
        'right': {x: pos.x + 1, y: pos.y + 0.5}
      };

      return {
        entry: sideToPos[inputSide],
        center: {x: pos.x + 0.5, y: pos.y + 0.5},
        matchExit: sideToPos[matchSide],
        nonMatchExit: sideToPos[nonMatchSide]
      };
    }
  },

  // State transitions
  transitions: {
    /**
     * Ball arrives at filter input
     */
    onArrival(ball, component, time, spec) {
      ball.componentId = component.id;
      ball.componentState = "traveling";

      // Validate required parameters
      if (!component.params.inputSide || !component.params.matchOutputSide || !component.params.nonMatchOutputSide) {
        throw new Error(
          `Filter ${component.id} missing required parameters! ` +
          `inputSide=${component.params.inputSide}, ` +
          `matchOutputSide=${component.params.matchOutputSide}, ` +
          `nonMatchOutputSide=${component.params.nonMatchOutputSide}`
        );
      }

      // Observe ball upon entry if no plex glass
      if (!component.params.plex && component.simulation && component.simulation.bayesianTracker) {
        component.simulation.bayesianTracker.onObservation(ball.id, ball.color);
      }

      const positions = spec.behavior.getPositions(component);

      // Determine which output based on ball color
      const matches = ball.color === component.params.targetColor;
      const exitPos = matches ? positions.matchExit : positions.nonMatchExit;
      const exitSide = matches ? component.params.matchOutputSide : component.params.nonMatchOutputSide;

      // Create single trajectory: input → center → exit (like merger/turn does)
      const speed = component.params.speed;
      const waypoints = [positions.entry, positions.center, exitPos];
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

      // Store which output for transfer logic ON THE BALL (not component, to avoid overwrites)
      ball.filterOutputSide = exitSide;

    },

    /**
     * Ball completes trajectory - transfer to next component
     */
    onTrajectoryComplete(ball, component) {
      // Check if already processed (idempotent - handle multiple calls)
      if (!ball.filterOutputSide) {
        return;
      }

      const outputSide = ball.filterOutputSide;

      // Clean up BEFORE transfer to mark as processed
      delete ball.filterOutputSide;
      ball.trajectory = null;  // CRITICAL: Clear trajectory to prevent repeated completion


      // Find connection in the specified absolute direction
      const simulation = component.simulation;
      if (!simulation) {
        console.error(`Filter ${component.id}: no simulation reference`);
        return;
      }

      const allConnections = simulation.level.connections.filter(c => c.from === component.id);

      // Find connection where target is in the specified direction
      const connection = allConnections.find(conn => {
        const target = simulation.componentsById.get(conn.to);
        if (!target) return false;

        // Match based on absolute direction
        switch (outputSide) {
          case 'up':
            return target.position.y < component.position.y;
          case 'down':
            return target.position.y > component.position.y;
          case 'left':
            return target.position.x < component.position.x;
          case 'right':
            return target.position.x > component.position.x;
          default:
            return false;
        }
      });

      if (!connection) {
        console.warn(`Filter ${component.id}: No connection found in direction ${outputSide}`);
        return;
      }

      const nextComponent = simulation.componentsById.get(connection.to);
      if (!nextComponent) {
        console.error(`Filter ${component.id}: Next component ${connection.to} not found`);
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
      const inputSide = component.params.inputSide;
      const matchSide = component.params.matchOutputSide;
      const nonMatchSide = component.params.nonMatchOutputSide;
      const targetColor = component.params.targetColor;

      const beltConfig = [
        {side: inputSide, isInput: true, color: null},
        {side: matchSide, isInput: false, color: targetColor},  // Colored output
        {side: nonMatchSide, isInput: false, color: null}       // Gray output
      ];

      ctx.save();
      ctx.translate(px, py);

      // Draw belt-like filter
      const beltWidth = gridSize * 0.375;
      const beltInset = gridSize * 0.3125;

      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Helper to draw belt segment from edge to center (or center to edge for output)
      const drawBeltSegment = (side, color) => {
        ctx.fillStyle = color ? color : "#707070"; // Use target color or gray
        ctx.strokeStyle = "#000";

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
      beltConfig.forEach(config => drawBeltSegment(config.side, config.color));

      // Draw borders
      ctx.strokeStyle = "#000";
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
    icon: "⊲",
    category: "Processing",
    defaultParams: {
      targetColor: 'red',
      inputSide: 'up',
      matchOutputSide: 'left',
      nonMatchOutputSide: 'right',
      plex: false,
      speed: 1.0
    }
  },

  // Rotation configurations (24 total)
  // Organized by: (1) input side, (2) output pattern, (3) which output gets colored balls
  rotationConfigs: [
    // === INPUT: UP (6 configs) ===
    // Opposite outputs (left+right)
    {inputSide: 'up', matchOutputSide: 'left', nonMatchOutputSide: 'right'},      // 0
    {inputSide: 'up', matchOutputSide: 'right', nonMatchOutputSide: 'left'},      // 1
    // Adjacent outputs (left+down)
    {inputSide: 'up', matchOutputSide: 'left', nonMatchOutputSide: 'down'},       // 2
    {inputSide: 'up', matchOutputSide: 'down', nonMatchOutputSide: 'left'},       // 3
    // Adjacent outputs (right+down)
    {inputSide: 'up', matchOutputSide: 'right', nonMatchOutputSide: 'down'},      // 4
    {inputSide: 'up', matchOutputSide: 'down', nonMatchOutputSide: 'right'},      // 5

    // === INPUT: RIGHT (6 configs) ===
    // Opposite outputs (up+down)
    {inputSide: 'right', matchOutputSide: 'up', nonMatchOutputSide: 'down'},      // 6
    {inputSide: 'right', matchOutputSide: 'down', nonMatchOutputSide: 'up'},      // 7
    // Adjacent outputs (up+left)
    {inputSide: 'right', matchOutputSide: 'up', nonMatchOutputSide: 'left'},      // 8
    {inputSide: 'right', matchOutputSide: 'left', nonMatchOutputSide: 'up'},      // 9
    // Adjacent outputs (down+left)
    {inputSide: 'right', matchOutputSide: 'down', nonMatchOutputSide: 'left'},    // 10
    {inputSide: 'right', matchOutputSide: 'left', nonMatchOutputSide: 'down'},    // 11

    // === INPUT: DOWN (6 configs) ===
    // Opposite outputs (left+right)
    {inputSide: 'down', matchOutputSide: 'left', nonMatchOutputSide: 'right'},    // 12
    {inputSide: 'down', matchOutputSide: 'right', nonMatchOutputSide: 'left'},    // 13
    // Adjacent outputs (left+up)
    {inputSide: 'down', matchOutputSide: 'left', nonMatchOutputSide: 'up'},       // 14
    {inputSide: 'down', matchOutputSide: 'up', nonMatchOutputSide: 'left'},       // 15
    // Adjacent outputs (right+up)
    {inputSide: 'down', matchOutputSide: 'right', nonMatchOutputSide: 'up'},      // 16
    {inputSide: 'down', matchOutputSide: 'up', nonMatchOutputSide: 'right'},      // 17

    // === INPUT: LEFT (6 configs) ===
    // Opposite outputs (up+down)
    {inputSide: 'left', matchOutputSide: 'up', nonMatchOutputSide: 'down'},       // 18
    {inputSide: 'left', matchOutputSide: 'down', nonMatchOutputSide: 'up'},       // 19
    // Adjacent outputs (up+right)
    {inputSide: 'left', matchOutputSide: 'up', nonMatchOutputSide: 'right'},      // 20
    {inputSide: 'left', matchOutputSide: 'right', nonMatchOutputSide: 'up'},      // 21
    // Adjacent outputs (down+right)
    {inputSide: 'left', matchOutputSide: 'down', nonMatchOutputSide: 'right'},    // 22
    {inputSide: 'left', matchOutputSide: 'right', nonMatchOutputSide: 'down'}     // 23
  ],

  // Get next rotation configuration
  getNextRotation(currentParams) {
    // Find current configuration index
    let currentIndex = this.rotationConfigs.findIndex(config =>
      config.inputSide === currentParams.inputSide &&
      config.matchOutputSide === currentParams.matchOutputSide &&
      config.nonMatchOutputSide === currentParams.nonMatchOutputSide
    );

    // If not found, start at 0
    if (currentIndex === -1) currentIndex = 0;

    // Get next configuration (cycle back to 0 after 23)
    const nextIndex = (currentIndex + 1) % this.rotationConfigs.length;
    return this.rotationConfigs[nextIndex];
  }
};

// Register component
if (typeof ComponentRegistry !== 'undefined') {
  ComponentRegistry.register(FilterSpec);
}
