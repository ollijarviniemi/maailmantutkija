/**
 * Component Registry
 *
 * Central registry for all component specifications
 */

class ComponentRegistry {
  static specs = new Map();

  /**
   * Register a component specification
   */
  static register(spec) {
    // Validate spec
    if (!spec.type) {
      throw new Error("Component spec must have 'type' field");
    }
    if (!spec.states) {
      throw new Error(`Component ${spec.type} must have 'states' field`);
    }
    if (!spec.transitions) {
      throw new Error(`Component ${spec.type} must have 'transitions' field`);
    }
    if (!spec.ports) {
      throw new Error(`Component ${spec.type} must have 'ports' field`);
    }

    this.specs.set(spec.type, spec);
  }

  /**
   * Get component specification
   */
  static get(type) {
    const spec = this.specs.get(type);
    if (!spec) {
      throw new Error(`Unknown component type: ${type}`);
    }
    return spec;
  }

  /**
   * Check if component type exists
   */
  static has(type) {
    return this.specs.has(type);
  }

  /**
   * Get all registered component types
   */
  static getAllTypes() {
    return Array.from(this.specs.keys());
  }

  /**
   * Clear all registrations (for testing)
   */
  static clear() {
    this.specs.clear();
  }
}

/**
 * Helper to get port position relative to component
 */
function getPortPosition(component, portId) {
  const spec = ComponentRegistry.get(component.type);

  // Find port in inputs or outputs
  const allPorts = [...spec.ports.inputs, ...spec.ports.outputs];
  const port = allPorts.find(p => p.id === portId);

  if (!port) {
    throw new Error(`Port ${portId} not found in component ${component.type}`);
  }

  return {
    x: component.position.x + port.offset.x,
    y: component.position.y + port.offset.y
  };
}

/**
 * Helper to compute input direction based on component positions
 */
function computeInputDirection(fromComponent, toComponent) {
  const dx = toComponent.position.x - fromComponent.position.x;
  const dy = toComponent.position.y - fromComponent.position.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "left" : "right";
  } else {
    return dy > 0 ? "up" : "down";
  }
}
