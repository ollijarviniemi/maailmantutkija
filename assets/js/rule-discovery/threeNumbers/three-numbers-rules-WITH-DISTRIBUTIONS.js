/**
 * Three Numbers Game Rules - WITH DISTRIBUTIONS
 * 25 rules for triples of numbers (2-4-6 game style)
 * Each rule includes distribution specifications for positive/negative examples
 *
 * Near-miss philosophy: 20% random, 80% conceptual near-misses
 */

export const THREE_NUMBERS_RULES = [
    // Rule 1: Strictly increasing
    {
        id: 't1',
        name: 'Aidosti kasvava (a < b < c)',
        check: (a, b, c) => a < b && b < c,
        positiveExample: [2, 4, 6],
        distribution: {
            positive: [
                { type: 'randomSequence', weight: 1.0, options: { strictly: true, direction: 'increasing', maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'randomSequence', weight: 0.40, options: { strictly: false, direction: 'increasing', maxElement: 20 } }, // Non-strict (allows equal)
                { type: 'randomSequence', weight: 0.20, options: { strictly: true, direction: 'decreasing', maxElement: 20 } },
                { type: 'constantSequence', weight: 0.20, options: { maxElement: 20 } }
            ]
        }
    },

    // Rule 2: All equal
    {
        id: 't2',
        name: 'Kaikki samaa kokoa',
        check: (a, b, c) => a === b && b === c,
        positiveExample: [3, 3, 3],
        distribution: {
            positive: [
                { type: 'constantSequence', weight: 1.0, options: { maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'equalAtPositions', weight: 0.40, options: { position1: 0, position2: 1, maxElement: 20 } }, // Two equal, one different
                { type: 'equalAtPositions', weight: 0.40, options: { position1: 1, position2: 2, maxElement: 20 } }
            ]
        }
    },

    // Rule 3: Strictly decreasing
    {
        id: 't3',
        name: 'Aidosti vähenevä (a > b > c)',
        check: (a, b, c) => a > b && b > c,
        positiveExample: [6, 4, 2],
        distribution: {
            positive: [
                { type: 'randomSequence', weight: 1.0, options: { strictly: true, direction: 'decreasing', maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'randomSequence', weight: 0.40, options: { strictly: false, direction: 'decreasing', maxElement: 20 } }, // Non-strict
                { type: 'randomSequence', weight: 0.20, options: { strictly: true, direction: 'increasing', maxElement: 20 } },
                { type: 'constantSequence', weight: 0.20, options: { maxElement: 20 } }
            ]
        }
    },

    // Rule 4: Arithmetic and increasing
    {
        id: 't4',
        name: 'Aritmeettinen ja kasvava (erotukset yhtäsuuret)',
        check: (a, b, c) => a < b && b < c && (b - a) === (c - b),
        positiveExample: [2, 5, 8],
        distribution: {
            positive: [
                { type: 'randomSequence', weight: 1.0, options: { strictly: true, direction: 'increasing', arithmetic: null, maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'randomSequence', weight: 0.30, options: { strictly: true, direction: 'increasing', arithmetic: null, maxElement: 20 } }, // Increasing but not arithmetic
                { type: 'randomSequence', weight: 0.30, options: { strictly: false, direction: 'increasing', arithmetic: 2, maxElement: 20 } }, // Arithmetic but not strictly increasing
                { type: 'linearMultiples', weight: 0.20, options: { maxElement: 30 } } // [a, 2a, 3a] - not equal differences
            ]
        }
    },

    // Rule 5: Doubling (b=2a, c=4a)
    {
        id: 't5',
        name: 'Tuplaantuu aina kahdella (b = 2a, c = 4a)',
        check: (a, b, c) => b === 2 * a && c === 4 * a,
        positiveExample: [1, 2, 4],
        distribution: {
            positive: [
                { type: 'exponentialMultiples', weight: 1.0, options: { maxElement: 40 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'linearMultiples', weight: 0.40, options: { maxElement: 30 } }, // [a, 2a, 3a] instead
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', arithmetic: null, maxElement: 20 } }
            ]
        }
    },

    // Rule 6: Largest at end
    {
        id: 't6',
        name: 'Suurin kasa on lopussa',
        check: (a, b, c) => c >= a && c >= b,
        positiveExample: [2, 3, 5],
        distribution: {
            positive: [
                { type: 'extremumAtPosition', weight: 1.0, options: { extremum: 'largest', position: 2, maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'extremumAtPosition', weight: 0.40, options: { extremum: 'largest', position: 0, maxElement: 20 } }, // Largest at beginning
                { type: 'extremumAtPosition', weight: 0.40, options: { extremum: 'largest', position: 1, maxElement: 20 } } // Largest in middle
            ]
        }
    },

    // Rule 7: Largest in middle
    {
        id: 't7',
        name: 'Suurin kasa on keskellä',
        check: (a, b, c) => b >= a && b >= c,
        positiveExample: [2, 5, 3],
        distribution: {
            positive: [
                { type: 'extremumAtPosition', weight: 1.0, options: { extremum: 'largest', position: 1, maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'extremumAtPosition', weight: 0.40, options: { extremum: 'largest', position: 0, maxElement: 20 } },
                { type: 'extremumAtPosition', weight: 0.40, options: { extremum: 'largest', position: 2, maxElement: 20 } }
            ]
        }
    },

    // Rule 8: Exactly two equal
    {
        id: 't8',
        name: 'Tarkalleen kaksi on samaa kokoa',
        check: (a, b, c) => (a === b && b !== c) || (b === c && a !== b) || (a === c && a !== b),
        positiveExample: [3, 3, 5],
        distribution: {
            positive: [
                { type: 'equalAtPositions', weight: 0.33, options: { position1: 0, position2: 1, maxElement: 20 } },
                { type: 'equalAtPositions', weight: 0.33, options: { position1: 1, position2: 2, maxElement: 20 } },
                { type: 'equalAtPositions', weight: 0.34, options: { position1: 0, position2: 2, maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'constantSequence', weight: 0.40, options: { maxElement: 20 } }, // All three equal
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', maxElement: 20 } } // All different
            ]
        }
    },

    // Rule 9: First and last equal
    {
        id: 't9',
        name: 'Ensimmäinen ja viimeinen samaa kokoa',
        check: (a, b, c) => a === c,
        positiveExample: [4, 2, 4],
        distribution: {
            positive: [
                { type: 'equalAtPositions', weight: 1.0, options: { position1: 0, position2: 2, maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'equalAtPositions', weight: 0.40, options: { position1: 0, position2: 1, maxElement: 20 } }, // First and middle equal
                { type: 'equalAtPositions', weight: 0.40, options: { position1: 1, position2: 2, maxElement: 20 } } // Middle and last equal
            ]
        }
    },

    // Rule 10: All different
    {
        id: 't10',
        name: 'Kaikki eri suuret',
        check: (a, b, c) => a !== b && b !== c && a !== c,
        positiveExample: [2, 5, 7],
        distribution: {
            positive: [
                { type: 'randomSequence', weight: 0.50, options: { strictly: true, direction: 'increasing', maxElement: 20 } },
                { type: 'uniformRandom', weight: 0.50, options: { maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'constantSequence', weight: 0.30, options: { maxElement: 20 } },
                { type: 'equalAtPositions', weight: 0.50, options: { position1: 0, position2: 1, maxElement: 20 } } // Any two equal
            ]
        }
    },

    // Rule 11: Sum < 15
    {
        id: 't11',
        name: 'Summa on alle 15',
        check: (a, b, c) => a + b + c < 15,
        positiveExample: [2, 3, 4],
        distribution: {
            positive: [
                { type: 'uniformRandomSum', weight: 1.0, options: { maxSum: 14 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'uniformRandomSum', weight: 0.40, options: { maxSum: 18 } }, // Sum 15-18 (near boundary)
                { type: 'uniformRandomSum', weight: 0.40, options: { maxSum: 30 } } // Sum clearly over 15
            ]
        }
    },

    // Rule 12: Sum > 20
    {
        id: 't12',
        name: 'Summa on yli 20',
        check: (a, b, c) => a + b + c > 20,
        positiveExample: [7, 8, 9],
        distribution: {
            positive: [
                { type: 'uniformRandom', weight: 1.0, options: { maxElement: 20 } } // Will often exceed 20
            ],
            negative: [
                { type: 'uniformRandomSum', weight: 0.20, options: { maxSum: 10 } }, // Clearly under
                { type: 'uniformRandomSum', weight: 0.40, options: { maxSum: 20 } }, // Sum ≤ 20
                { type: 'uniformRandomSum', weight: 0.40, options: { maxSum: 18 } } // Sum 15-18 (near boundary)
            ]
        }
    },

    // Rule 13: Consecutive (+1 each time)
    {
        id: 't13',
        name: 'Aina +1 (esim. 3, 4, 5)',
        check: (a, b, c) => b === a + 1 && c === b + 1,
        positiveExample: [3, 4, 5],
        distribution: {
            positive: [
                { type: 'randomSequence', weight: 1.0, options: { strictly: true, direction: 'increasing', arithmetic: 1, maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', arithmetic: 2, maxElement: 20 } }, // +2 instead
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', arithmetic: 3, maxElement: 20 } } // +3 instead
            ]
        }
    },

    // Rule 14: Range ≤ 5
    {
        id: 't14',
        name: 'Erotus suurimman ja pienimmän välillä on enintään 5',
        check: (a, b, c) => Math.max(a, b, c) - Math.min(a, b, c) <= 5,
        positiveExample: [3, 5, 7],
        distribution: {
            positive: [
                { type: 'uniformRandomSum', weight: 1.0, options: { maxSum: 20 } } // Typically gives small ranges
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', maxElement: 20 } }, // Often larger range
                { type: 'linearMultiples', weight: 0.40, options: { maxElement: 30 } } // [a, 2a, 3a] - range = 2a ≥ 6
            ]
        }
    },

    // Rule 15: All even
    {
        id: 't15',
        name: 'Kaikki ovat parillisia',
        check: (a, b, c) => a % 2 === 0 && b % 2 === 0 && c % 2 === 0,
        positiveExample: [2, 4, 6],
        distribution: {
            positive: [
                { type: 'withEvenCount', weight: 1.0, options: { numEven: 3, maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'withEvenCount', weight: 0.40, options: { numEven: 2, maxElement: 20 } }, // Two even, one odd
                { type: 'withEvenCount', weight: 0.40, options: { numEven: 0, maxElement: 20 } } // All odd
            ]
        }
    },

    // Rule 16: At least one even
    {
        id: 't16',
        name: 'Löytyy parillinen luku',
        check: (a, b, c) => a % 2 === 0 || b % 2 === 0 || c % 2 === 0,
        positiveExample: [2, 3, 5],
        distribution: {
            positive: [
                { type: 'withEvenCount', weight: 0.33, options: { numEven: 1, maxElement: 20 } },
                { type: 'withEvenCount', weight: 0.33, options: { numEven: 2, maxElement: 20 } },
                { type: 'withEvenCount', weight: 0.34, options: { numEven: 3, maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'withEvenCount', weight: 0.80, options: { numEven: 0, maxElement: 20 } } // All odd
            ]
        }
    },

    // Rule 17: All < 10
    {
        id: 't17',
        name: 'Kaikki ovat alle 10',
        check: (a, b, c) => a < 10 && b < 10 && c < 10,
        positiveExample: [3, 5, 7],
        distribution: {
            positive: [
                { type: 'uniformRandom', weight: 1.0, options: { maxElement: 9 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'uniformRandom', weight: 0.40, options: { maxElement: 12 } }, // Mix of <10 and ≥10
                { type: 'uniformRandom', weight: 0.40, options: { maxElement: 15 } }
            ]
        }
    },

    // Rule 18: a + b = c
    {
        id: 't18',
        name: 'Ensimmäinen + toinen = kolmas',
        check: (a, b, c) => a + b === c,
        positiveExample: [2, 3, 5],
        distribution: {
            positive: [
                { type: 'largestIsSum', weight: 1.0, options: { position: 2, maxElement: 30 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', arithmetic: 1, maxElement: 20 } }, // Consecutive, close but not sum
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', arithmetic: null, maxElement: 20 } }
            ]
        }
    },

    // Rule 19: Three consecutive (any order)
    {
        id: 't19',
        name: 'Kolme peräkkäistä kokonaislukua jossakin järjestyksessä',
        check: (a, b, c) => {
            const sorted = [a, b, c].sort((x, y) => x - y);
            return sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1;
        },
        positiveExample: [3, 5, 4],
        distribution: {
            positive: [
                { type: 'randomSequence', weight: 1.0, options: { strictly: true, direction: 'increasing', arithmetic: 1, maxElement: 20 } }
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', arithmetic: 2, maxElement: 20 } }, // Gap of 1 between
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', arithmetic: null, maxElement: 20 } }
            ]
        }
    },

    // Rule 20: Median = 5
    {
        id: 't20',
        name: 'Mediaani on 5',
        check: (a, b, c) => {
            const sorted = [a, b, c].sort((x, y) => x - y);
            return sorted[1] === 5;
        },
        positiveExample: [3, 5, 7],
        distribution: {
            positive: [
                { type: 'uniformRandom', weight: 1.0, options: { maxElement: 10 } } // Generate and filter for median=5
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'uniformRandom', weight: 0.40, options: { maxElement: 8 } }, // Median will be 1-4
                { type: 'uniformRandom', weight: 0.40, options: { maxElement: 15 } } // Median likely 6-10
            ]
        }
    },

    // Rule 21: Triangle inequality
    {
        id: 't21',
        name: 'Muodostavat kolmion (kolmioepäyhtälö)',
        check: (a, b, c) => {
            return a > 0 && b > 0 && c > 0 && a + b > c && b + c > a && a + c > b;
        },
        positiveExample: [3, 4, 5],
        distribution: {
            positive: [
                { type: 'uniformRandomSum', weight: 1.0, options: { maxSum: 25 } } // Close values often satisfy triangle inequality
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'linearMultiples', weight: 0.40, options: { maxElement: 30 } }, // [a, 2a, 3a] fails: a + 2a = 3a
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', maxElement: 20 } }
            ]
        }
    },

    // Rule 22: Each is multiple of previous
    {
        id: 't22',
        name: 'Jokainen luku on edellisen monikerta',
        check: (a, b, c) => {
            return a > 0 && b > 0 && c > 0 && b % a === 0 && c % b === 0;
        },
        positiveExample: [2, 4, 8],
        distribution: {
            positive: [
                { type: 'exponentialMultiples', weight: 0.50, options: { maxElement: 40 } }, // [a, 2a, 4a]
                { type: 'linearMultiples', weight: 0.50, options: { maxElement: 30 } } // [a, 2a, 3a] - 3a is multiple of 2a? No, but randomized
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', arithmetic: 1, maxElement: 20 } }, // Consecutive
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', arithmetic: null, maxElement: 20 } }
            ]
        }
    },

    // Rule 23: Largest > 2 * second-largest
    {
        id: 't23',
        name: 'Suurin luku on yli kaksinkertainen toiseksi suurimpaan',
        check: (a, b, c) => {
            const sorted = [a, b, c].sort((x, y) => x - y);
            return sorted[2] > 2 * sorted[1];
        },
        positiveExample: [2, 3, 7],
        distribution: {
            positive: [
                { type: 'uniformRandom', weight: 1.0, options: { maxElement: 20 } } // Generate and ensure property
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'linearMultiples', weight: 0.40, options: { maxElement: 30 } }, // [a, 2a, 3a]: 3a is only 1.5 * 2a
                { type: 'exponentialMultiples', weight: 0.40, options: { maxElement: 40 } } // [a, 2a, 4a]: 4a = 2 * 2a (boundary)
            ]
        }
    },

    // Rule 24: All in range [5, 15]
    {
        id: 't24',
        name: 'Kaikki ovat väliltä 5 ja 15',
        check: (a, b, c) => {
            return a >= 5 && a <= 15 && b >= 5 && b <= 15 && c >= 5 && c <= 15;
        },
        positiveExample: [7, 10, 12],
        distribution: {
            positive: [
                { type: 'uniformRandom', weight: 1.0, options: { maxElement: 15 } } // Generate in [1,15] and filter
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'uniformRandom', weight: 0.40, options: { maxElement: 8 } }, // Mix of <5 and 5-15
                { type: 'uniformRandom', weight: 0.40, options: { maxElement: 25 } } // Mix of 5-15 and >15
            ]
        }
    },

    // Rule 25: GCD > 1
    {
        id: 't25',
        name: 'Lukujen suurin yhteinen tekijä on suurempi kuin 1',
        check: (a, b, c) => {
            const gcd = (x, y) => y === 0 ? x : gcd(y, x % y);
            const gcd3 = gcd(gcd(Math.abs(a), Math.abs(b)), Math.abs(c));
            return gcd3 > 1;
        },
        positiveExample: [6, 9, 12],
        distribution: {
            positive: [
                { type: 'uniformRandom', weight: 1.0, options: { maxElement: 10 } } // Multiply by 2 or 3 to ensure GCD
            ],
            negative: [
                { type: 'uniformRandom', weight: 0.20, options: { maxElement: 20 } },
                { type: 'withEvenCount', weight: 0.40, options: { numEven: 0, maxElement: 20 } }, // All odd - often coprime
                { type: 'randomSequence', weight: 0.40, options: { strictly: true, direction: 'increasing', arithmetic: 1, maxElement: 20 } } // Consecutive - GCD=1
            ]
        }
    }
];
