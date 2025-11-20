# Rule Discovery Games - Implementation Status

## Overview

The Rule Discovery application implements the "Säännön keksiminen" (Rule Discovery) section from the planned Chapter 15: Tieteen työkaluja (Science Tools).

## Active Games (4)

### 1. ✅ Värikkäät muodot (Colored Shapes)
**Status:** Fully functional

Sequences of 4 colored shapes with various rules:
- All same color, all different shapes, contains specific color/shape
- At least 2 same, exactly 2 same, etc.
- 16 rounds implemented

**Location:** `/shapes/`

### 2. ✅ Lukujonot (Number Sequences)
**Status:** Functional

Number sequence pattern discovery:
- Arithmetic progressions
- Geometric progressions
- Fibonacci-like sequences
- Prime numbers
- Polynomial patterns

**Location:** `/sequences/`

### 3. ✅ Funktiokoneet (Function Machines)
**Status:** Functional

Function discovery with input/output pairs:
- Linear functions (f(x) = x + k, f(x) = kx)
- Parity checks (even/odd)
- Modulo operations
- Floor division
- Combinations

**Location:** `/functions/`

### 4. ✅ Kolmen luvun peli (Three Numbers Game)
**Status:** Functional

Classic 2-4-6 game variants with 3 numbers:
- Arithmetic sequence
- Geometric sequence
- All even/odd
- Increasing/decreasing
- Sum constraints
- Product constraints

**Location:** `/threeNumbers/`

## Deprecated Games

### ❌ Pisteet tasossa (Points in Plane)
**Status:** Deprecated 2025-10-19 - Dysfunctional

**Reason:** Over-engineered system with 65 generators, 27+ files, complex architecture that ultimately didn't work correctly.

**Location:** `/_deprecated/points_BROKEN_20251019/`

See `/_deprecated/README_DEPRECATED.md` for details.

## Application Architecture

```
rule-discovery/
├── core/
│   ├── app-manager.js          # Main orchestration
│   └── game-rules-database.js  # (legacy, may need cleanup)
│
├── shapes/                     # Game 1
│   ├── shapes-rules.js
│   ├── shapes-game.js
│   └── shapes-distributions.js
│
├── sequences/                  # Game 2
│   ├── sequences-rules.js
│   └── sequences-game.js
│
├── functions/                  # Game 3
│   ├── functions-rules.js
│   └── functions-game.js
│
├── threeNumbers/               # Game 4
│   ├── three-numbers-rules.js
│   └── three-numbers-game.js
│
└── _deprecated/                # Broken/old code
    └── points_BROKEN_20251019/
```

## Features

### Progress Tracking
- LocalStorage persistence
- Per-round completion status
- Attempt counting (for shapes game)
- "First success after N trials" tracking

### UI/UX
- Minimalist design (user preference)
- Help tooltips (? icon)
- Success screens with rule revelation
- History panels showing previous attempts
- Responsive layout

### Technical
- Pure client-side (no backend)
- ES6 modules
- Canvas rendering for shapes
- Auto-validation of examples
- Cache-busting with version parameters

## Integration with Book

**Planned:** Chapter 15: Tieteen työkaluja

**LaTeX integration:**
```latex
\begin{netti}
    \saannonkeksimislinkki
\end{netti}

\begin{kirja}
    Sovellus löytyy osoitteesta maailmantutkija.fi
\end{kirja}
```

**Status:** Chapter 15 not yet written. Application is ready and waiting.

## Testing Status

- ✅ Shapes: Tested and working
- ⚠️ Sequences: Needs comprehensive testing
- ⚠️ Functions: Needs comprehensive testing
- ⚠️ Three Numbers: Needs comprehensive testing

## Known Issues

None currently blocking. All active games are functional.

## Future Work

1. **Write Chapter 15** - Integrate application into book
2. **Comprehensive playtesting** - All games need thorough testing
3. **Additional rule variants** - Expand each game with more interesting rules
4. **Better hints system** - Help users when stuck
5. **Consider simpler Points game** - If geometric patterns are needed, start from scratch with simpler approach

## Maintenance Notes

**Adding a new game:**
1. Create new folder under `rule-discovery/`
2. Create `[game]-rules.js` with rule definitions
3. Create `[game]-game.js` with game logic
4. Import in `app-manager.js`
5. Add menu item in `saannon-keksiminen.html`

**Modifying existing game:**
1. Find game folder
2. Edit rules or game logic
3. Test in browser
4. Update version parameter if caching issues occur

**Performance:**
- Initialization: <50ms
- Round generation: <10ms
- No backend calls (all client-side)

## Version History

- **v2 (2025-10-19):** Removed dysfunctional Points game, cleaned up architecture
- **v1 (2025-10-18):** Initial modular implementation with 5 games

Last updated: 2025-10-19
