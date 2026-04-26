/**
 * Body Management
 *
 * A body is a connected component of bonded Matter/Attractor particles.
 * All particles in a body share the same velocity and move together.
 */

import { ParticleType, canMove } from './particles.js';

// Physics constants (from SPECIFICATION.md Section 4.3)
export const ACCUMULATOR_THRESHOLD = 100;  // T: threshold for movement
export const MAX_VELOCITY = 400;           // Maximum velocity magnitude per axis
export const DRAG_THRESHOLD = 200;         // MAX_VEL / 2: drag kicks in above this

export class Body {
    constructor(id) {
        this.id = id;
        this.particles = [];  // Array of {x, y} positions
        // Velocity (persistent, only changed by forces/drag/collision)
        this.vx = 0;
        this.vy = 0;
        // Position accumulator (fractional cell position)
        this.px = 0;
        this.py = 0;
    }

    addParticle(x, y) {
        this.particles.push({ x, y });
    }

    removeParticle(x, y) {
        const idx = this.particles.findIndex(p => p.x === x && p.y === y);
        if (idx !== -1) {
            this.particles.splice(idx, 1);
        }
    }

    hasParticle(x, y) {
        return this.particles.some(p => p.x === x && p.y === y);
    }

    get mass() {
        return this.particles.length;
    }

    /**
     * Get center of mass (for rendering/debugging)
     */
    getCenter() {
        if (this.particles.length === 0) return { x: 0, y: 0 };
        let sumX = 0, sumY = 0;
        for (const p of this.particles) {
            sumX += p.x;
            sumY += p.y;
        }
        return {
            x: sumX / this.particles.length,
            y: sumY / this.particles.length
        };
    }

    /**
     * Move all particles by (dx, dy)
     */
    translate(dx, dy) {
        for (const p of this.particles) {
            p.x += dx;
            p.y += dy;
        }
    }

    /**
     * Clone body state
     */
    clone() {
        const newBody = new Body(this.id);
        newBody.particles = this.particles.map(p => ({ x: p.x, y: p.y }));
        newBody.vx = this.vx;
        newBody.vy = this.vy;
        newBody.px = this.px;
        newBody.py = this.py;
        return newBody;
    }
}

export class BodyManager {
    constructor() {
        this.bodies = new Map();  // id -> Body
        this.nextId = 0;
        // Bonds: Set of "x1,y1-x2,y2" strings (normalized so smaller coord first)
        this.bonds = new Set();
    }

    /**
     * Create a new body with given particles
     */
    createBody(particles, vx = 0, vy = 0) {
        const body = new Body(this.nextId++);
        body.vx = vx;
        body.vy = vy;
        for (const p of particles) {
            body.addParticle(p.x, p.y);
        }
        this.bodies.set(body.id, body);
        return body;
    }

    getBody(id) {
        return this.bodies.get(id);
    }

    removeBody(id) {
        this.bodies.delete(id);
    }

    /**
     * Add a bond between two adjacent cells
     */
    addBond(x1, y1, x2, y2) {
        this.bonds.add(this._bondKey(x1, y1, x2, y2));
    }

    /**
     * Remove a bond between two cells
     */
    removeBond(x1, y1, x2, y2) {
        this.bonds.delete(this._bondKey(x1, y1, x2, y2));
    }

    /**
     * Check if two cells are bonded
     */
    areBonded(x1, y1, x2, y2) {
        return this.bonds.has(this._bondKey(x1, y1, x2, y2));
    }

    /**
     * Normalize bond key so order doesn't matter
     */
    _bondKey(x1, y1, x2, y2) {
        if (y1 < y2 || (y1 === y2 && x1 < x2)) {
            return `${x1},${y1}-${x2},${y2}`;
        }
        return `${x2},${y2}-${x1},${y1}`;
    }

    /**
     * Get all bonds as array of [[x1,y1], [x2,y2]]
     * Derives bonds from particle adjacency within bodies (always current)
     */
    getAllBonds() {
        const result = [];
        for (const body of this.bodies.values()) {
            // For each pair of particles in the body, check if adjacent
            for (let i = 0; i < body.particles.length; i++) {
                for (let j = i + 1; j < body.particles.length; j++) {
                    const p1 = body.particles[i];
                    const p2 = body.particles[j];
                    const dist = Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
                    if (dist === 1) {
                        result.push([[p1.x, p1.y], [p2.x, p2.y]]);
                    }
                }
            }
        }
        return result;
    }

    /**
     * Rebuild all bodies from current grid state and bonds
     * This is expensive but ensures correctness
     */
    rebuildBodies(grid) {
        // Save velocities from existing bodies
        const savedVelocities = new Map();
        for (const [id, body] of this.bodies) {
            const key = body.particles.map(p => `${p.x},${p.y}`).sort().join('|');
            savedVelocities.set(key, { vx: body.vx, vy: body.vy, px: body.px, py: body.py });
        }

        // Clear existing bodies
        this.bodies.clear();
        this.nextId = 0;

        // Clear bodyId in grid
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                grid.setBodyId(x, y, -1);
            }
        }

        // Find all movable particles
        const movable = [];
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                if (canMove(grid.get(x, y).type)) {
                    movable.push({ x, y });
                }
            }
        }

        // Union-find to group by bonds
        const parent = new Map();
        const rank = new Map();

        const find = (key) => {
            if (!parent.has(key)) {
                parent.set(key, key);
                rank.set(key, 0);
            }
            if (parent.get(key) !== key) {
                parent.set(key, find(parent.get(key)));
            }
            return parent.get(key);
        };

        const union = (a, b) => {
            const rootA = find(a);
            const rootB = find(b);
            if (rootA === rootB) return;
            const rankA = rank.get(rootA);
            const rankB = rank.get(rootB);
            if (rankA < rankB) {
                parent.set(rootA, rootB);
            } else if (rankA > rankB) {
                parent.set(rootB, rootA);
            } else {
                parent.set(rootB, rootA);
                rank.set(rootA, rankA + 1);
            }
        };

        // Initialize each particle as its own set
        for (const p of movable) {
            find(`${p.x},${p.y}`);
        }

        // Union bonded particles
        for (const bond of this.bonds) {
            const [p1, p2] = bond.split('-');
            union(p1, p2);
        }

        // Group particles by their root
        const groups = new Map();
        for (const p of movable) {
            const key = `${p.x},${p.y}`;
            const root = find(key);
            if (!groups.has(root)) {
                groups.set(root, []);
            }
            groups.get(root).push(p);
        }

        // Create bodies from groups
        for (const particles of groups.values()) {
            const body = this.createBody(particles);

            // Restore velocity if we have it saved
            const key = particles.map(p => `${p.x},${p.y}`).sort().join('|');
            if (savedVelocities.has(key)) {
                const saved = savedVelocities.get(key);
                body.vx = saved.vx;
                body.vy = saved.vy;
                body.px = saved.px;
                body.py = saved.py;
            }

            for (const p of particles) {
                grid.setBodyId(p.x, p.y, body.id);
            }
        }
    }

    /**
     * Clone the body manager state
     */
    clone() {
        const newManager = new BodyManager();
        newManager.nextId = this.nextId;
        for (const [id, body] of this.bodies) {
            newManager.bodies.set(id, body.clone());
        }
        newManager.bonds = new Set(this.bonds);
        return newManager;
    }

    /**
     * Copy state from another manager
     */
    copyFrom(other) {
        this.bodies.clear();
        this.nextId = other.nextId;
        for (const [id, body] of other.bodies) {
            this.bodies.set(id, body.clone());
        }
        this.bonds = new Set(other.bonds);
    }
}
