/**
 * Particle Types and Definitions
 *
 * Based on SPECIFICATION.md Section 3: Particle Ontology
 */

// Particle type constants
export const ParticleType = {
    VOID: 0,
    WALL: 1,
    MATTER: 2,
    ATTRACTOR: 3,
    // Chemistry types (4-9 reserved)
    THRUST: 10,  // Ephemeral - applies force then becomes Void
};

// Human-readable names
export const ParticleNames = {
    [ParticleType.VOID]: 'Void',
    [ParticleType.WALL]: 'Wall',
    [ParticleType.MATTER]: 'Matter',
    [ParticleType.ATTRACTOR]: 'Attractor',
    [ParticleType.THRUST]: 'Thrust',
};

// Colors for rendering
export const ParticleColors = {
    [ParticleType.VOID]: '#0a0a14',
    [ParticleType.WALL]: '#4a4a5a',
    [ParticleType.MATTER]: '#3498db',
    [ParticleType.ATTRACTOR]: '#e74c3c',
    [ParticleType.THRUST]: '#f1c40f',
};

/**
 * Check if particle type can move (is part of a body with accumulator)
 */
export function canMove(type) {
    return type === ParticleType.MATTER || type === ParticleType.ATTRACTOR;
}

/**
 * Check if particle type can be part of a bonded body
 */
export function canBond(type) {
    return type === ParticleType.MATTER || type === ParticleType.ATTRACTOR;
}

/**
 * Check if particle type emits attractive force
 */
export function emitsForce(type) {
    return type === ParticleType.ATTRACTOR;
}

/**
 * Check if particle type responds to attractive force
 */
export function respondsToForce(type) {
    return type === ParticleType.ATTRACTOR;
}

/**
 * Check if particle type blocks movement
 */
export function blocksMovement(type) {
    return type === ParticleType.WALL;
}
