/**
 * Ball Colors Configuration
 *
 * Central definition of all available ball colors in the system.
 * Used by renderer, components, and editor.
 */

const BALL_COLORS = {
  red: '#E53935',
  blue: '#1E88E5',
  green: '#43A047',
  yellow: '#FDD835',
  purple: '#8E24AA',
  black: '#212121'
};

// Ordered list for cycling through colors
const COLOR_CYCLE = ['red', 'blue', 'green', 'yellow', 'purple', 'black'];

// Get hex color value
function getColorHex(colorName) {
  return BALL_COLORS[colorName] || '#888888';
}

// Get next color in cycle
function getNextColor(currentColor) {
  const currentIndex = COLOR_CYCLE.indexOf(currentColor);
  if (currentIndex === -1) return COLOR_CYCLE[0];
  return COLOR_CYCLE[(currentIndex + 1) % COLOR_CYCLE.length];
}

// Export for browser
if (typeof window !== 'undefined') {
  window.BallColors = {
    COLORS: BALL_COLORS,
    CYCLE: COLOR_CYCLE,
    getHex: getColorHex,
    getNext: getNextColor
  };
}
