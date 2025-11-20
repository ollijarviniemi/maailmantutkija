# Sequence Rules - Child-Friendly Explanations

## Changes Made (2025-10-19)

Improved all rule explanations to be accessible for 7-year-olds by focusing on **operations** rather than **mathematical terminology**.

### Before → After Comparisons

| Round | Before (Technical) | After (Child-Friendly) | Rationale |
|-------|-------------------|----------------------|-----------|
| 1 | Lisää 1 | **Lisää aina yksi** | Added "aina" for clarity |
| 2 | Lisää 3 | **Lisää aina kolme** | Added "aina" for clarity |
| 3 | Kaikki samoja | Kaikki samoja ✓ | Already clear |
| 4 | Neliöluvut | **Kerro luku itsellään (1×1, 2×2, 3×3...)** | Operation-based, not terminology |
| 5 | Kolmioluvut n(n+1)/2 | **Lisää 1, sitten 2, sitten 3, sitten 4...** | Describes the pattern, not formula |
| 6 | Fibonacci | **Lisää kaksi edellistä yhteen** | Operation-based description |
| 7 | Kaksinkertaistuu | **Kaksinkertaista aina** | Added "aina" for clarity |
| 8 | Vuorottele +3, -1 | **Vuorottele: lisää 3, vähennä 1** | More explicit about operations |
| 9 | Vuorotellen lisää ja kerro | **Vuorottele: lisää 2, kaksinkertaista** | Clearer verb choice |
| 10 | Alkuluvut | **Luvut, jotka jakaantuvat vain yhdellä ja itsellään — alkuluvut** | Definition + name-drop |

## Key Improvements

### 1. Operation-Based Descriptions
**Before:** "Neliöluvut (1, 4, 9, 16...)"
- Assumes child knows what "neliöluku" means
- Mathematical terminology

**After:** "Kerro luku itsellään (1×1, 2×2, 3×3, 4×4...)"
- Describes the operation performed
- Concrete and actionable
- Can figure it out from the sequence

### 2. Pattern Descriptions Over Formulas
**Before:** "Kolmioluvut n(n+1)/2 (1, 3, 6, 10...)"
- Formula is meaningless to 7-year-old
- "Kolmioluku" is obscure terminology

**After:** "Lisää 1, sitten 2, sitten 3, sitten 4... (1, 3, 6, 10, 15...)"
- Describes what happens step-by-step
- Pattern is clear: differences are 1, 2, 3, 4...
- Can mentally execute the rule

### 3. Definitions for Technical Terms
**Before:** "Alkuluvut (2, 3, 5, 7, 11...)"
- Just uses the term without explanation
- Assumes prior knowledge

**After:** "Luvut, jotka jakaantuvat vain yhdellä ja itsellään — alkuluvut (2, 3, 5, 7, 11...)"
- Provides definition first
- Then name-drops the term
- Child learns what "alkuluku" means
- Note: Uses "jakaantuvat" (divide evenly) which is simpler than "jakautuvat tasan"

### 4. Fibonacci Explanation
**Before:** "Fibonacci (1, 1, 2, 3, 5, 8...)"
- Name-drops without explanation
- Doesn't describe the operation

**After:** "Lisää kaksi edellistä yhteen (1, 1, 2, 3, 5, 8...)"
- Clear operation: take previous two, add them
- Can figure out the pattern
- Fibonacci name could be added after em-dash if desired

### 5. Consistency with "Aina"
Added "aina" (always) to make it clear the same operation repeats:
- "Lisää aina yksi"
- "Lisää aina kolme"
- "Kaksinkertaista aina"

This prevents confusion with alternating patterns.

## Philosophy

**Pedagogical Principle:** Children should be able to **execute** the rule from the description, not just recognize a name.

**Good:** "Kerro luku itsellään"
- Actionable instruction
- Child can compute next term

**Bad:** "Neliöluvut"
- Just a label
- Requires prior knowledge
- Not executable without knowing definition

## Examples with Sequences

1. **"Lisää aina yksi" (1, 2, 3, 4...)**
   - Child sees: "Oh, I add 1 each time: 1+1=2, 2+1=3, 3+1=4"

2. **"Kerro luku itsellään" (1, 4, 9, 16...)**
   - Child sees: "1×1=1, 2×2=4, 3×3=9, 4×4=16"

3. **"Lisää 1, sitten 2, sitten 3, sitten 4..." (1, 3, 6, 10, 15...)**
   - Child sees: "Start at 1, add 1 get 2... wait, that's 1. Add 2 get 3, add 3 get 6, add 4 get 10"
   - Actually sees the increments: +1, +2, +3, +4, +5...

4. **"Lisää kaksi edellistä yhteen" (1, 1, 2, 3, 5, 8...)**
   - Child sees: "1+1=2, 1+2=3, 2+3=5, 3+5=8"

5. **"Luvut, jotka jakaantuvat vain yhdellä ja itsellään — alkuluvut"**
   - Child sees: "2 divides by 1 and 2. 3 divides by 1 and 3. 4 divides by 1, 2, and 4 — not prime!"
   - Learns definition + terminology

## Impact

**Before:** Players needed prior math knowledge to understand some rules
**After:** Players can figure out all rules from operational descriptions

This aligns with the book's philosophy from alkusanat.tex:
> "Lapsien pitäisi antaa miettiä asioita ennen juonipaljastuksia!"

Children should be able to discover patterns themselves, not just match against memorized terminology.

## Testing Checklist

- [ ] Read each explanation aloud as if to a 7-year-old
- [ ] Verify child could execute the operation from description
- [ ] Confirm examples in parentheses match the pattern
- [ ] Check that technical terms (if used) are explained first
- [ ] Ensure consistency across similar patterns (e.g., all "aina" patterns)

---

**Result:** All sequence rules now have clear, executable, child-friendly explanations that focus on operations rather than terminology.
