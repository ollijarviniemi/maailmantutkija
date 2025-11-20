# Test Levels

This directory contains 3 comprehensive test levels for testing the revised components.

## Quick Loading

**Easiest way:** Open `../load-test-levels.html` in your browser and click the buttons!

The loader page provides:
- One-click loading into localStorage
- "Load & Open Editor" buttons for instant testing
- View/manage existing levels
- Clear description of each test level

## Test Levels

### 1. comprehensive-test-level.json
**Best to start with this one!**
- Tests all revised components in integration
- 23 components, 30 balls, 4 hypotheses
- Moderate complexity, good for initial validation

### 2. edge-cases-test-level.json
- Tests parameter limits and edge cases
- 27 components, 50 balls
- Max/min configurations, overflow scenarios

### 3. inference-chain-test-level.json
- Tests complex Bayesian inference
- 30 components, 20 balls, 16 hypotheses
- Cross-cycle retention dependencies, multi-source tracking

## Manual Loading

If you prefer to load manually:

1. Open `editor.html`
2. Open browser DevTools (F12) → Console
3. Paste and execute:

```javascript
// Fetch and load a test level
fetch('levels/comprehensive-test-level.json')
  .then(r => r.json())
  .then(level => {
    const levels = JSON.parse(localStorage.getItem('bayesianFactoryLevels') || '[]');
    levels.push(level);
    localStorage.setItem('bayesianFactoryLevels', JSON.stringify(levels));
    alert('Level loaded! Reload the page.');
  });
```

4. Reload page
5. Click "Load Level" button in editor
6. Select test level from list

## Testing

See `../TESTING_CHECKLIST.md` for systematic testing procedures.

See `../QUICK_START_TESTING.md` for 15-minute quick test guide.
