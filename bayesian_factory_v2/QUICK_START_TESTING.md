# Quick Start Testing Guide

**Ready to test?** Here's how to get started immediately.

---

## 1. Load a Test Level (30 seconds!)

### Option A: Use the Test Level Loader (EASIEST! ⭐)
**This is the fastest and easiest way:**

1. Open `load-test-levels.html` in your browser
2. Click "Load & Open Editor" button for the test you want
3. Done! The editor will open with the level loaded

**Alternative:** Click individual "Load" buttons, then open `editor.html` and use "Load Level" button.

### Option B: Manual Import via Console
1. Open `editor.html`
2. Open browser DevTools (F12)
3. Copy contents of `levels/comprehensive-test-level.json`
4. In console, paste:
```javascript
const level = [PASTE JSON HERE];
localStorage.setItem('bayesianFactoryLevels', JSON.stringify([level]));
location.reload();
```
5. Level should appear in level list

### Option C: Recreate in Editor (Educational but slow)
Follow the layout described in IMPLEMENTATION_SUMMARY.md and place components manually.

---

## 2. Run the Test (1 minute)

1. Click "Test Level" or "Play" button in editor
2. Watch balls spawn and move through components
3. Observe the behavior

**What to watch for:**
- Do balls split correctly at Duplicator? (Should see 3 paths)
- Does Shuffler output to multiple sides? (2 right, 1 down)
- Does Filter separate red from non-red balls?
- Do Observations fill up in 5×5 grid pattern?
- Are there any stuck balls or trajectory errors?

---

## 3. Check Console (1 minute)

Open browser DevTools (F12) → Console tab

**Look for:**
- ❌ Red errors (critical issues)
- ⚠️ Yellow warnings (may be expected, check against known issues)
- 📝 Logs about shuffling, buffering, outputting (informational)

**Expected logs:**
```
Duplicator 3 outputting ball ... to right
Shuffler 7 buffered ball ... (3/5)
Shuffler 7 buffer full, starting output
Filter 11 outputting ball ... to left
```

**Unexpected (bad):**
```
Uncaught TypeError: ...
Missing sackId for ball ...
Ball stuck at component ...
```

---

## 4. Quick Visual Checks (2 minutes)

### Duplicator (Component ID 3)
- ✓ Input arrow from top
- ✓ Gold arrows on 3 sides (right, down, up)
- ✓ Numbers "3", "2", "1" labeling each output
- ✓ Center shows "×6"
- ✓ Balls actually split 3:2:1 to those sides

### Shuffler (Component ID 7)
- ✓ Gold arrows on 2 sides (right, down)
- ✓ Dashed gray rectangle (indicates retention)
- ✓ Buffer count "3/5" updates as balls arrive
- ✓ Balls output after 5th ball arrives
- ✓ After first cycle, retains 2 balls for next cycle

### Filter (Component ID 11)
- ✓ Small red circle (target color indicator)
- ✓ Buffer count "2/3" updates
- ✓ Red balls go to one observation
- ✓ Non-red balls go to other observation

### Observations (IDs 5, 12, 19)
- ✓ Balls arrange in 5×5 grid (5 across, 5 down)
- ✓ Small balls (ballScale=0.15)
- ✓ Grid looks organized, not overlapping
- ✓ Can handle 25+ balls gracefully

---

## 5. Test Rotation (2 minutes)

1. In editor, select a component
2. Press `R` key
3. Component should rotate 90° clockwise
4. Check that connections update automatically

**Components to test:**
- Duplicator: All 3 outputs should rotate
- Shuffler: Output sides rotate, retention unchanged
- Filter: Direction rotates
- Conveyor-turn: Cycles through 8 types

**What to verify:**
- Visual rendering rotates correctly
- Connections to/from component update
- No orphaned connections left behind
- Rotated component still functions when played

---

## 6. Test Editor UI (3 minutes)

### Duplicator Properties
1. Select duplicator component
2. Look for properties panel (usually on right side)
3. Should see:
   - "Number of Copies" input
   - "Edit Output Pattern" button
   - Pattern display showing "3 copies → right", etc.
4. Click "Edit Output Pattern"
5. Try changing pattern JSON
6. Verify validation catches bad input

### Shuffler Properties
1. Select shuffler component
2. Should see:
   - "Min Buffer Size" input
   - "Edit Output Pattern" button
   - Pattern display showing outputs and retention
3. Click "Edit Output Pattern"
4. Try adding retention: `[{side: 'right', count: 2}, {retain: true, count: 3}]`
5. Should offer to update minBufferSize to 5

---

## 7. Report Issues (As you find them)

Open `TESTING_CHECKLIST.md` and document issues in the Issues Log section at the bottom:

```
Issue #1: Duplicator renders incorrectly after rotation
Severity: Medium
Component: Duplicator
Reproduction:
1. Place duplicator
2. Rotate with R key
3. Visual rendering shows arrows in wrong positions
Expected: Arrows should rotate with component
Actual: Arrows stay in original positions
Console Output: None
```

---

## Common Issues & Solutions

### "Can't see test level in level list"
- **Solution**: Use `load-test-levels.html` (easiest way!)
- Or check localStorage in DevTools → Application → Local Storage → look for 'bayesianFactoryLevels'
- Verify JSON was saved correctly
- Try the loader page buttons

### "Balls aren't spawning"
- **Solution**: Check simulation config in level JSON:
  - `ballsToSpawn: 30` (should be >0)
  - `ballProductionInterval: 2000` (milliseconds between spawns)
- Verify sack components exist in level

### "Components look weird/overlapping"
- **Solution**: Check grid positions in level JSON
- Each component should have unique `{x, y}` position
- No two components should occupy same grid cell

### "Nothing happens when I click Test Level"
- **Solution**: Check browser console for errors
- Verify level structure is valid JSON
- Try simpler test level first

### "Inference/Betting interface not showing"
- **Solution**: Verify level has `hypothesisSpace` with `components` defined
- Check that sacks have alternatives in hypothesis space
- Arm component should have sampling configured

---

## Quick Test Checklist (15 minutes total)

Use this for rapid initial validation:

- [ ] **Load**: comprehensive-test-level.json loads successfully (2 min)
- [ ] **Run**: Simulation runs without crashes (2 min)
- [ ] **Console**: No red errors, warnings are expected (1 min)
- [ ] **Duplicator**: Splits balls 3:2:1 to right:down:up (2 min)
- [ ] **Shuffler**: Outputs 2 right + 1 down, retains 2 balls (2 min)
- [ ] **Filter**: Separates red from non-red correctly (2 min)
- [ ] **Observation**: Displays balls in 5×5 grid (1 min)
- [ ] **Rotation**: R key rotates components, connections update (2 min)
- [ ] **Editor UI**: Pattern editors open and validate input (1 min)

**If all 9 checks pass:** ✅ Basic functionality working, proceed to full testing

**If any checks fail:** 🔴 Document issue and investigate before full testing

---

## Next Steps After Quick Test

### If Everything Works:
1. Proceed to full testing with TESTING_CHECKLIST.md
2. Test all 3 test levels systematically
3. Test edge cases and complex scenarios
4. Provide comprehensive feedback

### If Issues Found:
1. Document issues in TESTING_CHECKLIST.md Issues Log
2. Note severity (Critical/High/Medium/Low)
3. Continue testing other features if possible
4. Report blockers immediately

### When Testing Complete:
1. Review all checkboxes in TESTING_CHECKLIST.md
2. Compile list of issues found
3. Provide feedback on:
   - Performance (smooth? laggy?)
   - Visual polish (clear? confusing?)
   - UX (intuitive? frustrating?)
   - Missing features or bugs
4. Developer will address issues and iterate

---

## Contact / Feedback

- Document issues in: `TESTING_CHECKLIST.md` (Issues Log section)
- Review implementation: `IMPLEMENTATION_SUMMARY.md`
- Track progress: `COMPONENT_REVISIONS_TODO.md`

**Ready?** Load `comprehensive-test-level.json` and start testing! 🚀

---

**Estimated Time**:
- Quick test: 15 minutes
- Full systematic test: 2-3 hours
- Comprehensive test (all scenarios): 4-6 hours

**Priority**: Start with quick test to validate basic functionality, then proceed to full testing if no blockers found.
