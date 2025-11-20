/**
 * Trajectory System
 *
 * All ball paths are piecewise linear (composed of straight line segments)
 */

/**
 * Create piecewise linear trajectory from waypoints
 */
function createPiecewiseLinearTrajectory(waypoints) {
  if (waypoints.length < 2) {
    throw new Error("Need at least 2 waypoints for trajectory");
  }

  // Compute segment lengths
  const segments = [];
  let totalLength = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const length = Math.sqrt(
      Math.pow(end.x - start.x, 2) +
      Math.pow(end.y - start.y, 2)
    );
    segments.push({start, end, length});
    totalLength += length;
  }

  // Normalize segment progress ranges
  let accum = 0;
  segments.forEach(seg => {
    seg.startProgress = accum / totalLength;
    seg.endProgress = (accum + seg.length) / totalLength;
    accum += seg.length;
  });

  // Return trajectory function
  return (progress) => {
    // Clamp progress
    progress = Math.max(0, Math.min(1, progress));

    // Find which segment we're in
    for (const seg of segments) {
      if (progress >= seg.startProgress && progress <= seg.endProgress) {
        // Interpolate within segment
        const segLength = seg.endProgress - seg.startProgress;
        const segProgress = segLength > 0
          ? (progress - seg.startProgress) / segLength
          : 0;

        return {
          x: lerp(seg.start.x, seg.end.x, segProgress),
          y: lerp(seg.start.y, seg.end.y, segProgress)
        };
      }
    }

    // Fallback: last waypoint
    return {...waypoints[waypoints.length - 1]};
  };
}

/**
 * Compute trajectory duration based on distance and speed
 */
function computeTrajectoryDuration(waypoints, speed) {
  if (waypoints.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1].x - waypoints[i].x;
    const dy = waypoints[i + 1].y - waypoints[i].y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }

  return (totalDistance / speed) * 1000;  // Convert to milliseconds
}

/**
 * Linear interpolation
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Easing functions
 */
function linear(t) {
  return t;
}

function easeInCubic(t) {
  return t * t * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Apply easing to trajectory
 */
function applyEasing(trajectory, easingFunc) {
  return (progress) => trajectory(easingFunc(progress));
}
