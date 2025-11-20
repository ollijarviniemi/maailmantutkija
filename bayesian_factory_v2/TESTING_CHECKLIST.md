# Bayesian Factory v2 - Testing Checklist

**Purpose**: Systematic testing of all revised components and features
**Status**: Ready for testing
**Test Levels**:
- `levels/comprehensive-test-level.json` - All components integrated
- `levels/edge-cases-test-level.json` - Edge cases and parameter limits
- `levels/inference-chain-test-level.json` - Complex Bayesian inference chains

---

## Phase 1: Component-Specific Tests

### ✓ Observation Component (5×5 Grid)

**Test Level**: edge-cases-test-level.json (Component ID 5)

- [ ] **Basic Grid Layout**
  - Place 1-25 balls, verify they arrange in 5×5 grid
  - Check spacing is correct (0.16 units between balls)
  - Verify ball scale (0.15) is applied correctly

- [ ] **Overflow Handling (>25 balls)**
  - Test with 30+ balls (edge-cases-test-level spawns 50 balls through duplicator)
  - Verify overflow behavior (stacking behind or warning)
  - Check console for any errors

- [ ] **Visual Rendering**
  - Balls should be small (ballScale=0.15)
  - No overlapping
  - Grid should be centered in component

**Expected Issues**: None
**Actual Issues**: _[Document any issues found]_

---

### ✓ Duplicator Component (Multi-Output)

**Test Levels**:
- comprehensive-test-level.json (ID 3: 3-way split)
- edge-cases-test-level.json (ID 3: max 10 copies, ID 19: 4-way split)

#### Test 1: Multi-Output Distribution
- [ ] **3-Output Pattern** (comprehensive-test, ID 3)
  - Pattern: right:3, down:2, up:1 (6 total)
  - Verify exactly 3 balls go right, 2 down, 1 up
  - Check distribution is deterministic (not random)

- [ ] **4-Output Pattern** (edge-cases-test, ID 19)
  - Pattern: right:2, down:2, left:1, up:1 (6 total)
  - Verify all 4 outputs work simultaneously
  - Check each observation gets correct count

- [ ] **Max Copies** (edge-cases-test, ID 3)
  - 10 copies to single output
  - Verify all 10 copies are created
  - Check performance with many copies

#### Test 2: Visual Rendering
- [ ] Input arrow drawn from correct side (opposite to first output)
- [ ] Gold channels drawn for each unique output side
- [ ] Each output labeled with count (e.g., "3" next to right arrow)
- [ ] Center shows total: "×6" or "×10"
- [ ] Rendering works correctly in all 4 rotations

#### Test 3: Bayesian Tracking
- [ ] **Basic Tracking** (inference-chain-test, ID 3)
  - Duplicator has plex glass
  - Verify ballToSack mapping correct for all copies
  - Check console for any tracking warnings

- [ ] **Multi-Path Tracking**
  - Copies going to different paths
  - Verify dependencies tracked correctly
  - All copies should have same sackId

#### Test 4: Rotation
- [ ] Rotate duplicator with R key
- [ ] Verify all output sides rotate correctly
- [ ] Check connections update automatically
- [ ] Pattern remains deterministic after rotation

**Expected Issues**: None (Task 4 deferred - might see defensive warnings)
**Actual Issues**: _[Document any issues found]_

---

### ✓ Shuffler Component (Multi-Output + Retention)

**Test Levels**:
- comprehensive-test-level.json (ID 7: dual output + retention)
- edge-cases-test-level.json (ID 8: max retention, ID 26: minimal config)
- inference-chain-test-level.json (ID 5: in complex chain)

#### Test 1: Single Output (No Retention)
- [ ] **Minimal Config** (edge-cases-test, ID 26)
  - 1 input, minBufferSize=1, output all to right
  - Verify balls pass through immediately
  - Check single-ball buffering works

#### Test 2: Dual Output (No Retention)
- [ ] Create test with pattern: `[{side: 'right', count: 1}, {side: 'down', count: 1}]`
  - minBufferSize=2
  - Verify deterministic split (not random)
  - First ball after shuffle → right, second → down

#### Test 3: Single Output with Retention
- [ ] **Max Retention** (edge-cases-test, ID 8)
  - minBufferSize=10, pattern: output 5 right, retain 5
  - **Cycle 1**: Wait for 10 balls → shuffle → output 5 → retain 5
  - **Cycle 2**: 5 retained + 5 new = 10 → shuffle → output 5 → retain 5
  - Verify retained balls persist across cycles
  - Check console logs show cycle numbers

#### Test 4: Dual Output with Retention
- [ ] **Complex Pattern** (comprehensive-test, ID 7)
  - minBufferSize=5, pattern: right:2, down:1, retain:2
  - **Cycle 1**: 5 balls → shuffle → 2 right, 1 down, 2 retained
  - **Cycle 2**: 2 retained + 3 new = 5 → repeat
  - Verify retention + multi-output works together

#### Test 5: Visual Rendering
- [ ] Gold channels for each output side
- [ ] Dashed gray rectangle when retention enabled
- [ ] Buffer count display: "2/5" (current/minBufferSize)
- [ ] Rendering correct in all rotations

#### Test 6: Bayesian Inference with Retention
- [ ] **Cross-Cycle Dependencies** (inference-chain-test, ID 5)
  - Shuffler has retention, receives balls from 2 sacks
  - Balls from different cycles should be grouped together
  - Check inference treats retained + new balls as single group
  - Verify KL-divergence calculated correctly
  - Console: Look for "shuffle" notifications with all balls

#### Test 7: Rotation
- [ ] Rotate shuffler with R key
- [ ] Verify outputPattern sides rotate (retained entries unchanged)
- [ ] Check connections update for all output sides
- [ ] Verify retained entries don't get rotated

**Expected Issues**: Line 293 warning about >3 balls (not a bug, just warning)
**Actual Issues**: _[Document any issues found]_

---

### ✓ Filter Component (Configurable Outputs)

**Test Levels**:
- comprehensive-test-level.json (ID 11)
- edge-cases-test-level.json (ID 14: all match scenario)

#### Test 1: Custom Color Filtering
- [ ] **Red Filter** (comprehensive-test, ID 11)
  - targetColor='red'
  - Verify only red balls go to match output
  - Non-red balls go to non-match output

- [ ] **Green Filter** (edge-cases-test, ID 14)
  - All balls are green, targetColor='green'
  - Verify all balls go to match output (left)
  - Non-match output should be empty

#### Test 2: Output Side Configuration
- [ ] **Standard** (matchOutputSide='left', nonMatchOutputSide='right')
  - Verify match balls go left
  - Non-match balls go right

- [ ] **Swapped** (matchOutputSide='right', nonMatchOutputSide='left')
  - Create test with swapped sides
  - Verify routing reverses correctly

#### Test 3: Capacity and Buffering
- [ ] capacity=3: Wait for 3 balls, then output
- [ ] capacity=10: Test with larger buffer (edge-cases-test, ID 14)
- [ ] Verify balls buffer before outputting

#### Test 4: Visual Rendering
- [ ] Target color indicator (small circle) shows correct color
- [ ] Buffer status: "2/3" display
- [ ] Rendering correct in all 4 directions
- [ ] Plex glass overlay if enabled

#### Test 5: Rotation
- [ ] Rotate filter with R key
- [ ] Verify direction parameter updates
- [ ] Check connections update correctly

**Expected Issues**: None
**Actual Issues**: _[Document any issues found]_

---

### ✓ Merger Component

**Test Levels**:
- comprehensive-test-level.json (ID 14)
- inference-chain-test-level.json (ID 23: merges 2 sources)

#### Test 1: Two-Source Merge
- [ ] **Basic Merge** (comprehensive-test, ID 14)
  - Receives from shuffler (down) and filter (left)
  - Balls from both sources should merge into single stream
  - Verify no balls lost

- [ ] **Four-Source Merge** (inference-chain-test, ID 23)
  - Receives from 2 conveyors (from 2 different sacks)
  - All balls should merge correctly
  - Check ordering is reasonable (FIFO-ish)

#### Test 2: Bayesian Tracking
- [ ] Balls from different sources maintain separate sackIds
- [ ] Verify dependencies don't incorrectly merge
- [ ] Check inference handles mixed-source balls correctly

#### Test 3: Rotation
- [ ] Rotate merger with R key
- [ ] Verify connections update
- [ ] Check all input sides still work

**Expected Issues**: None
**Actual Issues**: _[Document any issues found]_

---

### ✓ Conveyor-Turn Component

**Test Levels**: Both comprehensive-test and edge-cases-test have multiple turns

#### Test 1: All 8 Turn Types
Test each turn type in isolation:
- [ ] right-to-down
- [ ] right-to-up
- [ ] left-to-down
- [ ] left-to-up
- [ ] down-to-right
- [ ] down-to-left
- [ ] up-to-right
- [ ] up-to-left

#### Test 2: Direction Validation (Task 3)
- [ ] Balls entering from correct side should pass through
- [ ] Check console for warnings if ball enters from wrong side
- [ ] Verify trajectory curves correctly

#### Test 3: Rotation
- [ ] Rotate turn with R key
- [ ] Verify cycles through all 8 types
- [ ] Check connections update

**Expected Issues**: None
**Actual Issues**: _[Document any issues found]_

---

## Phase 2: Integration Tests

### ✓ Complete Chain Test

**Test Level**: comprehensive-test-level.json

#### Full Flow Testing
- [ ] **Path 1**: Sack → Duplicator → Observation (top path, 3 copies)
  - Verify 3 balls reach top observation

- [ ] **Path 2**: Sack → Duplicator → Shuffler → Filter → Observations
  - 2 balls to shuffler from duplicator
  - Shuffler receives from 2 inputs (duplicator + turn)
  - Shuffler outputs 2 right + 1 down, retains 2
  - Filter separates by color
  - Verify ball counts at both filter outputs

- [ ] **Path 3**: Duplicator → Merger ← Blue Sack → Final Observation
  - 1 ball from duplicator's down output
  - Balls from blue sack
  - Merger combines both sources
  - Verify mixed balls at final observation

- [ ] **Path 4**: Duplicator up → Black Pit
  - 1 ball disappears into pit
  - No errors in console

#### Cross-Component Interactions
- [ ] Duplicator feeds multiple paths simultaneously
- [ ] Shuffler receives from multiple sources
- [ ] Filter receives shuffled balls
- [ ] Merger combines balls from different paths
- [ ] No balls stuck or lost
- [ ] No trajectory errors

**Expected Issues**: None
**Actual Issues**: _[Document any issues found]_

---

### ✓ Edge Cases Test

**Test Level**: edge-cases-test-level.json (50 balls spawned)

#### Overflow Scenarios
- [ ] Observation overflow (30+ balls to 25-capacity grid)
  - Verify graceful handling
  - Check for console warnings/errors

- [ ] Duplicator max copies (10 copies)
  - All copies created successfully
  - No performance issues

- [ ] Shuffler max retention (retain 5, output 5)
  - Multiple cycles work correctly
  - Retained balls don't accumulate incorrectly

- [ ] Filter max capacity (capacity=10)
  - Large buffer works correctly
  - Outputs all balls eventually

#### Minimal Configurations
- [ ] Shuffler with 1 input, minBufferSize=1
  - Acts like pass-through when minimal
  - No errors

#### Empty Scenarios
- [ ] Filter where all balls match target color
  - Non-match observation remains empty
  - No errors for empty output

**Expected Issues**: Observation overflow behavior may vary
**Actual Issues**: _[Document any issues found]_

---

### ✓ Bayesian Inference Test

**Test Level**: inference-chain-test-level.json

#### Hypothesis Space
- [ ] 4 sacks with 2 alternatives each = 16 total hypotheses
- [ ] Betting interface shows all 16 hypotheses
- [ ] Initial probabilities: 1/16 each (≈6.25%)

#### Duplication Tracking
- [ ] **Duplicator** (ID 3, has plex glass)
  - No observations inside duplicator
  - Copies maintain sackId association
  - All 4 copies traced to original sack
  - Check console for tracking logs

#### Shuffler Retention Dependencies
- [ ] **Shuffler** (ID 5, retains 2 of 4 balls)
  - Balls shuffled together create dependencies
  - Retained balls shuffle with new arrivals next cycle
  - **Cross-cycle dependencies**: Retained ball from cycle N shuffles with new ball in cycle N+1
  - Verify both balls treated as same group for inference
  - Check console: "shuffle" events show all balls being shuffled

#### Filter Color Routing
- [ ] **Filter** (ID 11, has plex glass, targets red)
  - No observations inside filter
  - Red balls → right observation (ID 12)
  - Non-red balls → left observation (ID 13)
  - Verify dependencies tracked through filtering

#### Multi-Source Merger
- [ ] **Merger** (ID 23, combines 2 sacks)
  - Balls from sacks 26 and 29 merge
  - Both sources maintain separate sack identities
  - No incorrect dependency grouping

#### Arm Sampling
- [ ] **Arm** (ID 19, sampleRate=0.5)
  - Approximately 50% of balls sampled
  - Observations in ID 30 trigger inference updates
  - Check betting interface updates

#### Inference Accuracy
- [ ] Make bet on hypothesis space
- [ ] Run simulation completely
- [ ] Observe balls entering observation points
- [ ] Verify posterior probabilities update correctly
- [ ] Colors observed should eliminate incompatible hypotheses
- [ ] Final KL-divergence score calculated
- [ ] Check score reflects bet accuracy

#### Console Verification
- [ ] No "Missing sackId" warnings (Task 4 might show some)
- [ ] Shuffle events logged with ball counts
- [ ] Inference updates logged when balls observed
- [ ] Dependency groups shown in console

**Expected Issues**:
- Line 293 warning about >3 balls in shuffler (not a bug)
- Task 4: Possible defensive warnings about missing sackId (investigation needed)

**Actual Issues**: _[Document any issues found]_

---

## Phase 3: Editor Tests

### ✓ Parameter Configuration UI

#### Duplicator Properties Panel
- [ ] Number of copies input (2-10 range)
- [ ] Output pattern editor button opens JSON prompt
- [ ] Pattern display shows formatted distribution
- [ ] Validation catches invalid patterns:
  - [ ] Invalid sides (not right/down/left/up)
  - [ ] Negative counts
  - [ ] Non-integer counts
- [ ] Auto-update connections after pattern change
- [ ] Changes saved correctly

#### Shuffler Properties Panel
- [ ] minBufferSize input (1-10 range)
- [ ] outputSide dropdown (backward compatibility)
- [ ] Output pattern editor button opens JSON prompt
- [ ] Pattern display shows output + retention
- [ ] Validation catches invalid patterns:
  - [ ] Invalid sides
  - [ ] Invalid retain entries
  - [ ] Total count mismatch with minBufferSize (offers to update)
- [ ] Auto-update connections after pattern change
- [ ] Changes saved correctly

#### Filter Properties Panel
- [ ] targetColor selector/input
- [ ] matchOutputSide dropdown (left/right)
- [ ] nonMatchOutputSide dropdown (left/right)
- [ ] capacity input
- [ ] outputDelay input
- [ ] Plex glass checkbox
- [ ] Changes applied immediately

#### General UI
- [ ] All property panels update when selecting components
- [ ] Changes render immediately on canvas
- [ ] Properties persist after save/load
- [ ] Undo/redo works with parameter changes

**Expected Issues**: None
**Actual Issues**: _[Document any issues found]_

---

### ✓ Rotation System

#### Component Rotation (R Key)
- [ ] **Duplicator**: All sides in outputPattern rotate
- [ ] **Shuffler**: Output sides rotate, retained entries unchanged
- [ ] **Filter**: Direction rotates correctly
- [ ] **Merger**: Direction rotates correctly
- [ ] **Conveyor**: Direction rotates correctly
- [ ] **Conveyor-turn**: Cycles through all 8 types correctly
- [ ] **Splitter**: Direction rotates correctly

#### Pending Component Rotation (R Key Before Placement)
- [ ] Preview shows rotated orientation
- [ ] All components rotate in preview mode
- [ ] Placement uses rotated orientation
- [ ] Auto-connections created correctly for rotated component

#### Auto-Connection Updates
- [ ] Connections update immediately after rotation
- [ ] Multi-output components (duplicator, shuffler) create all connections
- [ ] Old connections removed correctly
- [ ] New connections added correctly
- [ ] No orphaned connections
- [ ] No duplicate connections

#### Complex Rotation Tests
- [ ] Rotate component in middle of long chain
  - Connections before and after update correctly
- [ ] Rotate multi-output component with 3+ connections
  - All connections remap correctly
- [ ] Rotate shuffler with retention
  - Output connections update, retention unaffected
- [ ] Performance with 20+ components
  - No lag when rotating
  - All connections update correctly

**Expected Issues**: None
**Actual Issues**: _[Document any issues found]_

---

### ✓ Save/Load System

#### Level Saving
- [ ] Create level with all new parameters:
  - Duplicator with multi-output pattern
  - Shuffler with retention pattern
  - Filter with custom colors and sides
  - Observation with custom ballScale
- [ ] Save level to localStorage
- [ ] Verify success message

#### Level Loading
- [ ] Close editor (or refresh page)
- [ ] Open level from localStorage
- [ ] Verify all components loaded correctly:
  - [ ] Duplicator outputPattern preserved
  - [ ] Shuffler outputPattern and minBufferSize preserved
  - [ ] Filter custom parameters preserved
  - [ ] Observation ballScale preserved
- [ ] Verify connections preserved correctly
- [ ] Test simulation works with loaded level

#### Backward Compatibility
- [ ] Load old levels (if any exist)
- [ ] Components with old parameter format should still work
- [ ] Shuffler: outputSide converts to outputPattern
- [ ] Duplicator: direction converts to outputPattern
- [ ] No errors in console

#### JSON Export/Import
- [ ] Export level to JSON
- [ ] Verify JSON structure matches expected format
- [ ] Import JSON level
- [ ] Verify level works correctly after import

**Expected Issues**: None (backward compatibility built in)
**Actual Issues**: _[Document any issues found]_

---

## Phase 4: Performance & Polish

### Performance Tests
- [ ] **Large Level** (20+ components)
  - Create complex level with many components
  - No lag during simulation
  - Canvas rendering smooth (60fps)
  - Auto-connection updates fast (<100ms)

- [ ] **Many Balls** (50+ balls)
  - Spawn 50+ balls
  - Simulation runs smoothly
  - No memory leaks
  - Trajectory calculations performant

- [ ] **Long Chains** (10+ component chain)
  - Ball passes through 10+ components
  - Trajectories smooth
  - Bayesian tracking works correctly
  - No accumulated errors

### Console Cleanliness
- [ ] Run each test level completely
- [ ] Check browser console for:
  - [ ] Red errors (none expected except Task 4 investigation)
  - [ ] Yellow warnings (document any unexpected ones)
  - [ ] Excessive logging (reduce if too verbose)

### Visual Polish
- [ ] All components render correctly
- [ ] Multi-output indicators clear and readable
- [ ] Retention indicators visible but not distracting
- [ ] Ball colors distinct
- [ ] Canvas grid lines clear
- [ ] Component icons recognizable
- [ ] Observation grids neat and organized

### User Experience
- [ ] Component placement feels responsive
- [ ] Selection feedback clear
- [ ] Properties panel easy to use
- [ ] Pattern editors provide good feedback
- [ ] Error messages helpful
- [ ] Rotation feels intuitive
- [ ] Connections visually clear

**Expected Issues**: None
**Actual Issues**: _[Document any issues found]_

---

## Summary Checklist

### Critical Tests (Must Pass)
- [ ] Duplicator multi-output distribution deterministic
- [ ] Shuffler retention works across cycles
- [ ] Filter routes by color correctly
- [ ] Observation handles 25+ balls
- [ ] Rotation updates all parameters correctly
- [ ] Auto-connections work for multi-output components
- [ ] Bayesian inference tracks through complex chains
- [ ] Save/load preserves all new parameters

### Important Tests (Should Pass)
- [ ] All edge cases handle gracefully
- [ ] No console errors during normal operation
- [ ] Performance acceptable with large levels
- [ ] UI provides good feedback
- [ ] All property panels functional

### Nice-to-Have Tests (Optional)
- [ ] Extreme edge cases (100+ balls, 50+ components)
- [ ] Backward compatibility with old levels
- [ ] Visual polish and aesthetics
- [ ] Advanced Bayesian inference scenarios

---

## Issues Log

### Known Issues (from TODO)
1. **Task 4**: Duplicator ballToSack tracking may have defensive warnings (needs proper fix)
2. **Line 293 Warning**: Shuffler warns about >3 balls (not a bug, just informational)

### New Issues Found
_[Document any new issues discovered during testing]_

**Format**:
```
Issue #: [Brief title]
Severity: [Critical/High/Medium/Low]
Component: [Which component(s)]
Reproduction: [Steps to reproduce]
Expected: [What should happen]
Actual: [What actually happens]
Console Output: [Any error messages]
```

---

## Testing Notes

- Test on multiple browsers (Chrome, Firefox, Safari)
- Clear localStorage before testing backward compatibility
- Use browser DevTools for performance profiling
- Take screenshots of visual bugs
- Record console logs for errors
- Note any unexpected behavior even if "working"

---

**Last Updated**: 2025-11-16
**Status**: Ready for comprehensive testing
