/**
 * Physics Simulation for Galton Board
 *
 * Uses Matter.js for realistic 2D physics with elastic bounces.
 * Balls drop from the top and bounce through walls to reach bins at the bottom.
 */

class GaltonPhysics {
    constructor(lattice, options = {}) {
        this.lattice = lattice;

        // Physics options
        this.options = {
            ballRadius: options.ballRadius || 8,
            wallThickness: options.wallThickness || 4,
            pegRadius: options.pegRadius || 6,
            restitution: options.restitution || 0.7,  // Bounciness (0-1)
            friction: options.friction || 0.1,
            gravity: options.gravity || 1,
            ...options
        };

        // Matter.js engine and world
        this.engine = null;
        this.world = null;
        this.render = null;

        // Track balls and their final positions
        this.balls = [];
        this.completedBalls = [];  // Balls that have reached the bottom
        this.binCounts = new Array(lattice.getNumBins()).fill(0);

        // Callbacks
        this.onBallComplete = null;  // Called when a ball reaches a bin
        this.onSimulationComplete = null;  // Called when all balls are done

        this.initialized = false;
    }

    /**
     * Initialize the physics engine
     */
    init() {
        if (this.initialized) return;

        // Create engine
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        // Set gravity
        this.engine.world.gravity.y = this.options.gravity;

        // Create static bodies for walls and pegs
        this.createWalls();
        this.createPegs();
        this.createBoundaries();
        this.createBinSensors();

        // Set up collision detection for bins
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            this.handleCollisions(event);
        });

        this.initialized = true;
    }

    /**
     * Create wall bodies from lattice
     */
    createWalls() {
        const { wallThickness } = this.options;

        for (const wallKey of this.lattice.walls) {
            const [row, col, direction] = wallKey.split(',');
            const r = parseInt(row);
            const c = parseInt(col);

            const { start, end } = this.lattice.getWallEndpoints(r, c, direction);

            // Calculate wall center and angle
            const centerX = (start.x + end.x) / 2;
            const centerY = (start.y + end.y) / 2;
            const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
            const angle = Math.atan2(end.y - start.y, end.x - start.x);

            const wall = Matter.Bodies.rectangle(centerX, centerY, length, wallThickness, {
                isStatic: true,
                angle: angle,
                restitution: this.options.restitution,
                friction: this.options.friction,
                render: {
                    fillStyle: '#333'
                },
                label: 'wall'
            });

            Matter.World.add(this.world, wall);
        }
    }

    /**
     * Create peg bodies at lattice points
     */
    createPegs() {
        const { pegRadius } = this.options;

        for (let row = 0; row < this.lattice.numRows; row++) {
            for (let col = 0; col <= row; col++) {
                const pos = this.lattice.getPegPosition(row, col);

                const peg = Matter.Bodies.circle(pos.x, pos.y, pegRadius, {
                    isStatic: true,
                    restitution: this.options.restitution,
                    friction: this.options.friction,
                    render: {
                        fillStyle: '#666'
                    },
                    label: 'peg'
                });

                Matter.World.add(this.world, peg);
            }
        }
    }

    /**
     * Create boundary walls (left, right, bottom)
     */
    createBoundaries() {
        const width = this.lattice.width + 100;  // Extra margin
        const height = this.lattice.height + 100;
        const thickness = 50;

        // Left boundary
        const leftWall = Matter.Bodies.rectangle(
            -thickness / 2, height / 2,
            thickness, height * 2,
            { isStatic: true, label: 'boundary' }
        );

        // Right boundary
        const rightWall = Matter.Bodies.rectangle(
            width + thickness / 2, height / 2,
            thickness, height * 2,
            { isStatic: true, label: 'boundary' }
        );

        // Bottom boundary (to catch balls)
        const bottomWall = Matter.Bodies.rectangle(
            width / 2, height + thickness / 2 + 50,
            width * 2, thickness,
            { isStatic: true, label: 'floor' }
        );

        Matter.World.add(this.world, [leftWall, rightWall, bottomWall]);
    }

    /**
     * Create sensor bodies for bins to detect when balls arrive
     */
    createBinSensors() {
        const binHeight = 30;
        const binWidth = this.lattice.cellSize * 0.8;

        for (let i = 0; i < this.lattice.getNumBins(); i++) {
            const pos = this.lattice.getBinPosition(i);

            const sensor = Matter.Bodies.rectangle(
                pos.x, pos.y + this.lattice.cellSize / 2,
                binWidth, binHeight,
                {
                    isStatic: true,
                    isSensor: true,  // Doesn't cause physical collisions
                    label: `bin_${i}`,
                    render: {
                        fillStyle: 'rgba(0, 255, 0, 0.1)'
                    }
                }
            );

            Matter.World.add(this.world, sensor);
        }
    }

    /**
     * Handle collision events (for bin detection)
     */
    handleCollisions(event) {
        for (const pair of event.pairs) {
            const { bodyA, bodyB } = pair;

            // Check if one is a ball and one is a bin sensor
            let ball = null;
            let binLabel = null;

            if (bodyA.label === 'ball' && bodyB.label.startsWith('bin_')) {
                ball = bodyA;
                binLabel = bodyB.label;
            } else if (bodyB.label === 'ball' && bodyA.label.startsWith('bin_')) {
                ball = bodyB;
                binLabel = bodyA.label;
            }

            if (ball && binLabel && !ball.completed) {
                const binIndex = parseInt(binLabel.split('_')[1]);
                this.ballReachedBin(ball, binIndex);
            }
        }
    }

    /**
     * Called when a ball reaches a bin
     */
    ballReachedBin(ball, binIndex) {
        ball.completed = true;
        this.binCounts[binIndex]++;
        this.completedBalls.push({ ball, binIndex });

        if (this.onBallComplete) {
            this.onBallComplete(binIndex, this.binCounts);
        }

        // Check if all balls are done
        if (this.completedBalls.length === this.balls.length && this.balls.length > 0) {
            if (this.onSimulationComplete) {
                this.onSimulationComplete(this.binCounts);
            }
        }
    }

    /**
     * Drop a new ball from the top
     * @param {number} xOffset - Optional horizontal offset from center (-1 to 1)
     */
    dropBall(xOffset = 0) {
        if (!this.initialized) this.init();

        const { ballRadius } = this.options;

        // Start position: just above the top peg
        const topPeg = this.lattice.getPegPosition(0, 0);
        const startX = topPeg.x + xOffset * ballRadius * 0.5;  // Tiny random offset
        const startY = topPeg.y - this.lattice.cellSize / 2;

        const ball = Matter.Bodies.circle(startX, startY, ballRadius, {
            restitution: this.options.restitution,
            friction: this.options.friction,
            frictionAir: 0.001,
            render: {
                fillStyle: '#e74c3c'
            },
            label: 'ball'
        });

        ball.completed = false;
        this.balls.push(ball);
        Matter.World.add(this.world, ball);

        return ball;
    }

    /**
     * Drop multiple balls with delay between each
     * @param {number} count - Number of balls to drop
     * @param {number} interval - Milliseconds between drops
     */
    dropBalls(count, interval = 500) {
        let dropped = 0;

        const dropNext = () => {
            if (dropped < count) {
                // Small random horizontal offset for variety
                const offset = (Math.random() - 0.5) * 0.5;
                this.dropBall(offset);
                dropped++;
                setTimeout(dropNext, interval);
            }
        };

        dropNext();
    }

    /**
     * Update physics simulation
     * @param {number} deltaTime - Time step in milliseconds
     */
    update(deltaTime = 16.67) {
        if (!this.initialized) return;
        Matter.Engine.update(this.engine, deltaTime);
    }

    /**
     * Get current ball positions for rendering
     */
    getBallPositions() {
        return this.balls.map(ball => ({
            x: ball.position.x,
            y: ball.position.y,
            radius: this.options.ballRadius,
            completed: ball.completed
        }));
    }

    /**
     * Get bin histogram data
     */
    getHistogram() {
        return [...this.binCounts];
    }

    /**
     * Get normalized histogram (probabilities)
     */
    getNormalizedHistogram() {
        const total = this.binCounts.reduce((a, b) => a + b, 0);
        if (total === 0) return this.binCounts.map(() => 0);
        return this.binCounts.map(c => c / total);
    }

    /**
     * Reset the simulation
     */
    reset() {
        // Remove all balls
        for (const ball of this.balls) {
            Matter.World.remove(this.world, ball);
        }

        this.balls = [];
        this.completedBalls = [];
        this.binCounts = new Array(this.lattice.getNumBins()).fill(0);
    }

    /**
     * Rebuild physics bodies (call after lattice changes)
     */
    rebuild() {
        if (this.initialized) {
            // Clear everything
            Matter.World.clear(this.world);
            Matter.Engine.clear(this.engine);
        }

        this.initialized = false;
        this.balls = [];
        this.completedBalls = [];
        this.binCounts = new Array(this.lattice.getNumBins()).fill(0);

        this.init();
    }

    /**
     * Run simulation to completion (for testing/scoring)
     * @param {number} numBalls - Number of balls to simulate
     * @returns {Promise<number[]>} Final bin counts
     */
    async runToCompletion(numBalls, dropInterval = 200) {
        return new Promise((resolve) => {
            this.reset();

            this.onSimulationComplete = (counts) => {
                resolve(counts);
            };

            // Drop balls
            this.dropBalls(numBalls, dropInterval);

            // Run physics loop
            const step = () => {
                this.update(16.67);

                if (this.completedBalls.length < numBalls) {
                    setTimeout(step, 16);
                }
            };
            step();
        });
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.GaltonPhysics = GaltonPhysics;
}
