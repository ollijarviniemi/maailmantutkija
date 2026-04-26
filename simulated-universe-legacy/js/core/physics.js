/**
 * Physics Engine
 *
 * Implements "Dissipative Spiral Mechanics" from SPECIFICATION.md Section 4.6
 *
 * Key differences from Newton:
 * - Manhattan metric (not Euclidean)
 * - Conditional drag (above threshold)
 * - Mass-independent force response
 * - 90° rotation on collision (not reflection)
 * - Velocity capped at MAX_VEL
 */

import { ParticleType, canMove, emitsForce, respondsToForce } from './particles.js';
import { ACCUMULATOR_THRESHOLD, MAX_VELOCITY, DRAG_THRESHOLD } from './body.js';

// Force law constants
export const ATTRACTOR_RADIUS = 20;  // Manhattan distance for force range

/**
 * Apply one physics timestep to all bodies
 * Handles forces, drag, and movement with proper collision handling
 */
export function physicsStep(grid, bodyManager) {
    const T = ACCUMULATOR_THRESHOLD;

    // Phase 1: Apply forces, drag, clip velocity for all bodies
    for (const [id, body] of bodyManager.bodies) {
        applyForces(grid, body, bodyManager);
        applyDrag(body);
        clipVelocity(body);
    }

    // Phase 2: Add velocity to position accumulator and process movements
    for (const [id, body] of bodyManager.bodies) {
        // Add velocity to position accumulator
        body.px += body.vx;
        body.py += body.vy;

        // Process movements with collision detection
        // Handle X and Y movements separately to avoid position desync
        const maxIterations = 20;  // Safety limit
        let iterations = 0;

        while (iterations < maxIterations) {
            iterations++;

            // Check if any movement is pending
            const needMoveX = (body.px >= T || body.px <= -T);
            const needMoveY = (body.py >= T || body.py <= -T);

            if (!needMoveX && !needMoveY) {
                break;  // No movement needed
            }

            // Try X movement first (if pending)
            if (needMoveX) {
                const dx = body.px >= T ? 1 : -1;
                const xBlocked = !tryMove(grid, body, dx, 0, bodyManager).moved;

                if (xBlocked) {
                    // Check if Y is also blocked (corner case)
                    if (needMoveY) {
                        const dy = body.py >= T ? 1 : -1;
                        const yBlocked = !tryMove(grid, body, 0, dy, bodyManager).moved;
                        if (yBlocked) {
                            // Corner: 180° rotation
                            rotate180(body);
                            body.px = 0;
                            body.py = 0;
                            break;
                        }
                    }
                    // Single wall in X: 90° rotation
                    rotate90(body, 'x', dx);
                    body.px = 0;
                    continue;
                } else {
                    // Execute X movement
                    executeMovement(grid, body, dx, 0);
                    body.px -= dx * T;
                    continue;  // Re-check from new position
                }
            }

            // Try Y movement (if pending and X wasn't pending)
            if (needMoveY) {
                const dy = body.py >= T ? 1 : -1;
                const yBlocked = !tryMove(grid, body, 0, dy, bodyManager).moved;

                if (yBlocked) {
                    // Single wall in Y: 90° rotation
                    rotate90(body, 'y', dy);
                    body.py = 0;
                    continue;
                } else {
                    // Execute Y movement
                    executeMovement(grid, body, 0, dy);
                    body.py -= dy * T;
                    continue;  // Re-check from new position
                }
            }
        }
    }
}

/**
 * Apply attractive forces to a body
 */
function applyForces(grid, body, bodyManager) {
    // Find all attractors in this body that respond to force
    const myAttractors = [];
    for (const p of body.particles) {
        const cell = grid.get(p.x, p.y);
        if (cell && respondsToForce(cell.type)) {
            myAttractors.push(p);
        }
    }

    if (myAttractors.length === 0) return;

    // Find all other attractors that emit force
    let fx = 0, fy = 0;

    for (const [otherId, otherBody] of bodyManager.bodies) {
        if (otherId === body.id) continue;

        for (const otherP of otherBody.particles) {
            const otherCell = grid.get(otherP.x, otherP.y);
            if (!otherCell || !emitsForce(otherCell.type)) continue;

            // Compute force from each of my attractors to this attractor
            for (const myP of myAttractors) {
                const force = computeForce(grid, myP.x, myP.y, otherP.x, otherP.y);
                fx += force.fx;
                fy += force.fy;
            }
        }
    }

    body.vx += fx;
    body.vy += fy;
}

/**
 * Compute force between two attractors
 * Returns {fx, fy} - force on particle at (x1, y1) due to particle at (x2, y2)
 */
function computeForce(grid, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const manhattanDist = Math.abs(dx) + Math.abs(dy);

    // Out of range
    if (manhattanDist > ATTRACTOR_RADIUS || manhattanDist === 0) {
        return { fx: 0, fy: 0 };
    }

    // Check wall blocking (is there a clear Manhattan path?)
    if (isWallBlocked(grid, x1, y1, x2, y2)) {
        return { fx: 0, fy: 0 };
    }

    // Component-wise Manhattan attraction
    // Force decreases with distance (stronger when closer)
    const fx = Math.sign(dx) * (ATTRACTOR_RADIUS - Math.abs(dx));
    const fy = Math.sign(dy) * (ATTRACTOR_RADIUS - Math.abs(dy));

    return { fx, fy };
}

/**
 * Check if force is blocked by walls
 * Returns true if NO Manhattan-shortest path exists from (x1,y1) to (x2,y2)
 */
function isWallBlocked(grid, x1, y1, x2, y2) {
    // BFS to find if any Manhattan-shortest path exists
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Directions that move toward target
    const validDirs = [];
    if (dx > 0) validDirs.push([1, 0]);
    if (dx < 0) validDirs.push([-1, 0]);
    if (dy > 0) validDirs.push([0, 1]);
    if (dy < 0) validDirs.push([0, -1]);

    if (validDirs.length === 0) return false;  // Same cell

    // BFS only using moves that decrease distance
    const visited = new Set();
    const queue = [[x1, y1]];
    visited.add(`${x1},${y1}`);

    while (queue.length > 0) {
        const [cx, cy] = queue.shift();

        for (const [ddx, ddy] of validDirs) {
            const nx = cx + ddx;
            const ny = cy + ddy;

            // Check if this move is valid (decreases minimum distance)
            const newDx = x2 - nx;
            const newDy = y2 - ny;
            const newDist = Math.abs(newDx) + Math.abs(newDy);

            // Only follow Manhattan-shortest paths
            if (newDist >= Math.abs(x2 - cx) + Math.abs(y2 - cy)) continue;

            if (nx === x2 && ny === y2) {
                return false;  // Found a clear path
            }

            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;

            if (!grid.inBounds(nx, ny)) continue;
            if (grid.get(nx, ny).type === ParticleType.WALL) continue;

            visited.add(key);
            queue.push([nx, ny]);
        }
    }

    return true;  // No clear path found
}

/**
 * Apply conditional drag to body
 */
function applyDrag(body) {
    // Drag on X axis
    if (Math.abs(body.vx) > DRAG_THRESHOLD) {
        body.vx -= Math.sign(body.vx);
    }

    // Drag on Y axis
    if (Math.abs(body.vy) > DRAG_THRESHOLD) {
        body.vy -= Math.sign(body.vy);
    }
}

/**
 * Clip velocity to MAX_VELOCITY
 */
function clipVelocity(body) {
    body.vx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, body.vx));
    body.vy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, body.vy));
}

/**
 * Try to move body by (dx, dy)
 * Returns {moved: boolean, blockedDir: 'x'|'y'}
 */
function tryMove(grid, body, dx, dy, bodyManager) {
    // Check if all particles can move to new positions
    for (const p of body.particles) {
        const nx = p.x + dx;
        const ny = p.y + dy;

        // Out of bounds
        if (!grid.inBounds(nx, ny)) {
            return { moved: false, blockedDir: dx !== 0 ? 'x' : 'y' };
        }

        const targetCell = grid.get(nx, ny);

        // Wall collision
        if (targetCell.type === ParticleType.WALL) {
            return { moved: false, blockedDir: dx !== 0 ? 'x' : 'y' };
        }

        // Collision with another body's particle
        if (canMove(targetCell.type) && targetCell.bodyId !== body.id) {
            if (!body.hasParticle(nx, ny)) {
                return { moved: false, blockedDir: dx !== 0 ? 'x' : 'y' };
            }
        }
    }

    return { moved: true, blockedDir: null };
}

/**
 * COLLISION RESPONSE - The Core Principle
 *
 * When blocked, rotate velocity 90° in the direction that points AWAY from the obstacle.
 *
 * Two possible 90° rotations:
 *   CW:  (vx, vy) → (vy, -vx)
 *   CCW: (vx, vy) → (-vy, vx)
 *
 * Choice rule: Pick the rotation where the new velocity component on the blocked
 * axis has opposite sign to the blocked direction. This ensures we move away.
 *
 * For X-blocked (wall at ±X): CW gives new_vx = vy, CCW gives new_vx = -vy
 *   → Use CW if vy * blockedDir ≤ 0, else CCW
 *
 * For Y-blocked (wall at ±Y): CW gives new_vy = -vx, CCW gives new_vy = vx
 *   → Use CW if vx * blockedDir ≥ 0, else CCW
 *
 * Corner (both blocked): Two 90° rotations = 180° = velocity reversal
 */

function rotate90(body, blockedAxis, blockedDir) {
    const { vx, vy } = body;

    // Determine rotation direction based on which clears the blockage
    const useCW = blockedAxis === 'x'
        ? (vy * blockedDir <= 0)   // X wall: CW if vy opposes blockedDir
        : (vx * blockedDir >= 0);  // Y wall: CW if vx aligns with blockedDir

    if (useCW) {
        body.vx = vy;
        body.vy = -vx;
    } else {
        body.vx = -vy;
        body.vy = vx;
    }
}

function rotate180(body) {
    body.vx = -body.vx;
    body.vy = -body.vy;
}

/**
 * Execute a movement: update grid and body particle positions
 */
export function executeMovement(grid, body, dx, dy) {
    // First, save particle types and clear old positions
    const particleTypes = [];
    for (const p of body.particles) {
        const cell = grid.get(p.x, p.y);
        particleTypes.push(cell ? cell.type : ParticleType.MATTER);
        grid.set(p.x, p.y, ParticleType.VOID, 0, -1);
    }

    // Update particle positions
    body.translate(dx, dy);

    // Set new positions with preserved types
    for (let i = 0; i < body.particles.length; i++) {
        const p = body.particles[i];
        grid.set(p.x, p.y, particleTypes[i], 0, body.id);
    }
}

