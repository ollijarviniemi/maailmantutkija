# Three Numbers Game - Distribution System

## Overview

Distribution generators for creating triples of positive integers (≥1) with various mathematical properties. All generators ensure only positive integers are produced.

## Available Generators

### 1. `uniformRandom(maxElement = 20)`
Generates three completely random positive integers.

```javascript
uniformRandom(20)  // e.g., [7, 14, 3]
```

### 2. `uniformRandomSum(maxSum = 30)`
Generates three random positive integers where their sum ≤ maxSum.

```javascript
uniformRandomSum(30)  // e.g., [5, 8, 12] (sum = 25)
```

### 3. `randomSequence(options)`
Generates sequences with configurable properties.

**Options:**
- `strictly` (boolean): Use strict inequality (default: false)
- `direction` (string): 'increasing' or 'decreasing' (default: 'increasing')
- `arithmetic` (number|null): If number, arithmetic sequence with this difference; if null, random differences
- `maxElement` (number): Maximum element value (default: 20)

**Examples:**
```javascript
// Strictly increasing with random differences
randomSequence({ strictly: true, direction: 'increasing' })
// → [3, 7, 15]

// Non-strict increasing arithmetic sequence with difference 3
randomSequence({ strictly: false, arithmetic: 3 })
// → [4, 7, 10]

// Strictly decreasing
randomSequence({ strictly: true, direction: 'decreasing' })
// → [18, 12, 5]

// Non-strict increasing arithmetic (allows equal consecutive elements)
randomSequence({ strictly: false, arithmetic: 0 })
// → [7, 7, 7]
```

### 4. `constantSequence(maxElement = 20)`
Generates three equal values.

```javascript
constantSequence(20)  // e.g., [8, 8, 8]
```

### 5. `linearMultiples(maxElement = 30)`
Generates sequence of form (a, 2a, 3a) in random order.

```javascript
linearMultiples(30)  // e.g., [4, 8, 12] or [12, 4, 8] (shuffled)
```

### 6. `exponentialMultiples(maxElement = 40)`
Generates sequence of form (a, 2a, 4a) in random order.

```javascript
exponentialMultiples(40)  // e.g., [3, 6, 12] or [12, 3, 6] (shuffled)
```

### 7. `extremumAtPosition(options)`
Places smallest or largest value at specific position.

**Options:**
- `extremum` (string): 'smallest' or 'largest'
- `position` (number): 0, 1, or 2
- `maxElement` (number): Maximum element value (default: 20)

**Examples:**
```javascript
// Largest at position 0 (first)
extremumAtPosition({ extremum: 'largest', position: 0 })
// → [18, 7, 3]

// Smallest at position 2 (last)
extremumAtPosition({ extremum: 'smallest', position: 2 })
// → [15, 9, 2]
```

### 8. `equalAtPositions(options)`
Makes two specific positions equal.

**Options:**
- `position1` (number): First position (0, 1, or 2)
- `position2` (number): Second position (0, 1, or 2)
- `maxElement` (number): Maximum element value (default: 20)

**Examples:**
```javascript
// First and last equal
equalAtPositions({ position1: 0, position2: 2 })
// → [7, 14, 7]

// First and middle equal
equalAtPositions({ position1: 0, position2: 1 })
// → [11, 11, 5]
```

### 9. `largestIsSum(options)`
Creates triple where largest = smallest + middle.

**Options:**
- `position` (number): Position of largest element (0, 1, or 2)
- `maxElement` (number): Maximum value for largest (default: 30)

**Examples:**
```javascript
// Largest at end: [3, 5, 8] where 8 = 3 + 5
largestIsSum({ position: 2 })
// → [3, 5, 8]

// Largest at beginning: [10, 3, 7] where 10 = 3 + 7
largestIsSum({ position: 0 })
// → [10, 3, 7]
```

### 10. `withEvenCount(options)`
Generates triple with specified number of even integers.

**Options:**
- `numEven` (number): Number of even integers (0, 1, 2, or 3)
- `maxElement` (number): Maximum element value (default: 20)

**Examples:**
```javascript
// Exactly 2 even numbers
withEvenCount({ numEven: 2 })
// → [8, 14, 7] or [3, 12, 18]

// All even
withEvenCount({ numEven: 3 })
// → [6, 10, 14]

// All odd
withEvenCount({ numEven: 0 })
// → [3, 7, 11]
```

## Helper: `sampleFromDistribution(distributions)`

Samples from weighted distribution of generators.

**Example:**
```javascript
const distributions = [
    { weight: 0.5, generator: () => uniformRandom(20) },
    { weight: 0.3, generator: () => constantSequence(15) },
    { weight: 0.2, generator: () => linearMultiples(30) }
];

sampleFromDistribution(distributions);
// Returns result from one generator based on weights
```

## Current Rules (25 total)

### Rules 1-22 (Existing)
1. Aidosti kasvava (a < b < c)
2. Kaikki samaa kokoa
3. Aidosti vähenevä (a > b > c)
4. Aritmeettinen ja kasvava
5. Tuplaantuu aina kahdella (b = 2a, c = 4a)
6. Suurin kasa on lopussa
7. Suurin kasa on keskellä
8. Tarkalleen kaksi on samaa kokoa
9. Ensimmäinen ja viimeinen samaa kokoa
10. Kaikki eri suuret
11. Summa on alle 15
12. Summa on yli 20
13. Aina +1 (esim. 3, 4, 5)
14. Erotus suurimman ja pienimmän välillä on enintään 5
15. Kaikki ovat parillisia
16. Löytyy parillinen luku
17. Kaikki ovat alle 10
18. Ensimmäinen + toinen = kolmas
19. Kolme peräkkäistä kokonaislukua jossakin järjestyksessä
20. Mediaani on 5
21. Muodostavat kolmion (kolmioepäyhtälö)
22. Jokainen luku on edellisen monikerta

### Rules 23-25 (New)
23. **Suurin luku on yli kaksinkertainen toiseksi suurimpaan**
    - Check: sorted[2] > 2 * sorted[1]
    - Example: [2, 3, 7] where 7 > 2*3

24. **Kaikki ovat väliltä 5 ja 15**
    - Check: 5 ≤ a,b,c ≤ 15
    - Example: [7, 10, 12]

25. **Lukujen suurin yhteinen tekijä on suurempi kuin 1**
    - Check: gcd(a,b,c) > 1
    - Example: [6, 9, 12] where gcd = 3

## Design Principles

1. **All positive integers**: Every generated number is ≥ 1
2. **Configurable ranges**: Most generators accept `maxElement` parameter
3. **Clear semantics**: Generator names describe what they produce
4. **Composable**: Can combine generators in weighted distributions
5. **Educational**: Generators map to mathematical concepts (arithmetic sequences, multiples, GCD, etc.)

## Usage in Game

```javascript
import { ThreeNumberDistributions } from './three-numbers-distributions.js';

// For a rule "strictly increasing"
const positive = ThreeNumberDistributions.randomSequence({
    strictly: true,
    direction: 'increasing'
});

// For negative examples, mix different types
const distributions = [
    { weight: 0.3, generator: () => ThreeNumberDistributions.uniformRandom(20) },
    { weight: 0.3, generator: () => ThreeNumberDistributions.constantSequence(15) },
    { weight: 0.2, generator: () => ThreeNumberDistributions.randomSequence({
        strictly: true,
        direction: 'decreasing'
    })},
    { weight: 0.2, generator: () => ThreeNumberDistributions.randomSequence({
        strictly: false,
        direction: 'increasing'
    })}
];

const negative = ThreeNumberDistributions.sampleFromDistribution(distributions);
```

## Future Extensions

Possible additional generators:
- Powers of 2 or 3
- Fibonacci-like sequences
- Prime number triples
- Triples with specific remainders (mod n)
- Geometric progressions (beyond just doubling)
- Triples forming Pythagorean theorem relationships

## Testing Checklist

When adding distributions to rules:
- [ ] Verify all generated numbers are ≥ 1
- [ ] Check maxElement parameter is respected
- [ ] Test edge cases (maxElement = 3, very large values)
- [ ] Ensure positive examples satisfy rule
- [ ] Ensure negative examples don't satisfy rule
- [ ] Verify distribution weights sum reasonably
- [ ] Test pedagogical value (are near-misses useful?)
