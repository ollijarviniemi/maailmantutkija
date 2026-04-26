/**
 * Main Simulation Engine
 *
 * Handles:
 * - Simulation state management
 * - Double-buffered updates
 * - Time-sliced execution (doesn't freeze browser)
 * - Play/pause/step controls
 */

import { Grid } from './grid.js';
import { ParticleType, canMove } from './particles.js';
import { BodyManager } from './body.js';
import { physicsStep, executeMovement } from './physics.js';

export class Simulation {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Current state
        this.grid = new Grid(width, height);
        this.bodyManager = new BodyManager();

        // Double buffer for simultaneous updates
        this.nextGrid = new Grid(width, height);
        this.nextBodyManager = new BodyManager();

        // Time tracking
        this.timestep = 0;

        // Playback state
        this.playing = false;
        this.targetFPS = 60;
        this.stepsPerFrame = 1;
        this.maxMsPerFrame = 12;  // Leave headroom for rendering

        // Callbacks
        this.onStep = null;
        this.onRender = null;

        // Animation frame handle
        this._animationFrame = null;
        this._lastFrameTime = 0;
    }

    /**
     * Load initial configuration
     */
    loadLevel(levelData) {
        this.timestep = 0;

        // Parse grid
        if (levelData.grid) {
            this._parseGridString(levelData.grid);
        }

        // Set up bodies
        if (levelData.bodies) {
            for (const bodyData of levelData.bodies) {
                const body = this.bodyManager.createBody(
                    bodyData.particles,
                    bodyData.vx || 0,
                    bodyData.vy || 0
                );

                // Add bonds between adjacent particles in the body
                for (let i = 0; i < bodyData.particles.length; i++) {
                    for (let j = i + 1; j < bodyData.particles.length; j++) {
                        const p1 = bodyData.particles[i];
                        const p2 = bodyData.particles[j];
                        const dist = Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
                        if (dist === 1) {
                            this.bodyManager.addBond(p1.x, p1.y, p2.x, p2.y);
                        }
                    }
                }

                // Update grid with body particles
                // Don't overwrite types - they're already set correctly from grid string
                // Just set the bodyId to link particles to this body
                for (const p of bodyData.particles) {
                    this.grid.setBodyId(p.x, p.y, body.id);
                }
            }
        }

        // Note: Don't call rebuildBodies here - it would lose the velocities
        // Bodies are already set up correctly from levelData
    }

    /**
     * Parse ASCII grid string
     */
    _parseGridString(gridStr) {
        const lines = gridStr.trim().split('\n');

        for (let y = 0; y < lines.length && y < this.height; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length && x < this.width; x++) {
                const char = line[x];
                let type = ParticleType.VOID;

                switch (char) {
                    case '#': type = ParticleType.WALL; break;
                    case '.': type = ParticleType.VOID; break;
                    case 'M': type = ParticleType.MATTER; break;
                    case 'A': type = ParticleType.ATTRACTOR; break;
                    default: type = ParticleType.VOID;
                }

                this.grid.setType(x, y, type);
            }
        }
    }

    /**
     * Perform one simulation step
     */
    step() {
        // Run physics (forces, drag, movements, wall collisions all handled internally)
        physicsStep(this.grid, this.bodyManager);

        this.timestep++;

        if (this.onStep) {
            this.onStep(this.timestep);
        }
    }

    /**
     * Update bond keys after particles move
     */
    _updateBondPositions() {
        // Bonds are stored by position, so we need to rebuild them
        // after bodies move. The bodyManager tracks which particles
        // are bonded conceptually, but the bond keys are position-based.
        // For now, we rely on rebuildBodies being called when needed.
    }

    /**
     * Start playing simulation
     */
    play() {
        if (this.playing) return;
        this.playing = true;
        this._lastFrameTime = performance.now();
        this._runFrame();
    }

    /**
     * Pause simulation
     */
    pause() {
        this.playing = false;
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }
    }

    /**
     * Toggle play/pause
     */
    toggle() {
        if (this.playing) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Run simulation frame with time-slicing
     */
    _runFrame() {
        if (!this.playing) return;

        const frameStart = performance.now();
        let stepsThisFrame = 0;

        // Run as many steps as we can within time budget
        while (stepsThisFrame < this.stepsPerFrame ||
               (performance.now() - frameStart < this.maxMsPerFrame &&
                stepsThisFrame < 1000)) {
            this.step();
            stepsThisFrame++;

            // Check time budget
            if (performance.now() - frameStart >= this.maxMsPerFrame) {
                break;
            }
        }

        // Render
        if (this.onRender) {
            this.onRender();
        }

        // Schedule next frame
        this._animationFrame = requestAnimationFrame(() => this._runFrame());
    }

    /**
     * Reset to initial state
     */
    reset(levelData) {
        this.pause();
        this.grid = new Grid(this.width, this.height);
        this.bodyManager = new BodyManager();
        this.timestep = 0;

        if (levelData) {
            this.loadLevel(levelData);
        }

        if (this.onRender) {
            this.onRender();
        }
        if (this.onStep) {
            this.onStep(this.timestep);
        }
    }

    /**
     * Get particle at position
     */
    getParticle(x, y) {
        return this.grid.get(x, y);
    }

    /**
     * Get body at position
     */
    getBodyAt(x, y) {
        const cell = this.grid.get(x, y);
        if (!cell || cell.bodyId === -1) return null;
        return this.bodyManager.getBody(cell.bodyId);
    }

    /**
     * Set simulation speed
     */
    setSpeed(stepsPerFrame) {
        this.stepsPerFrame = Math.max(1, stepsPerFrame);
    }

    /**
     * Get all bodies
     */
    getBodies() {
        return Array.from(this.bodyManager.bodies.values());
    }

    /**
     * Get all bonds
     */
    getBonds() {
        return this.bodyManager.getAllBonds();
    }
}
