/**
 * Level Schema and Definitions
 *
 * Defines the structure of levels and provides validation.
 */

const LevelSchema = {
    /**
     * Validate a level definition
     */
    validate(level) {
        const errors = [];

        if (!level.id) errors.push('Level must have an id');
        if (!level.name) errors.push('Level must have a name');
        if (!level.question) errors.push('Level must have a question');
        if (!level.animation) errors.push('Level must have an animation');
        if (!level.scoring) errors.push('Level must have scoring');

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Apply defaults to a level definition
     */
    applyDefaults(level) {
        return {
            difficulty: 1,
            requires: [],
            unlocks: [],
            hints: [],
            ...level,
            animation: {
                config: {},
                ...level.animation
            },
            scoring: {
                type: 'absolute',
                thresholds: [10, 5, 2],
                ...level.scoring
            }
        };
    }
};

/**
 * Built-in Level Definitions
 *
 * Design principle: "Show, not tell" - players observe probabilities from data,
 * rather than being told what they are.
 */
const LEVELS = [
    // =========================================
    // Level 1: The Flour Mill
    // =========================================
    {
        id: 'flour-mill',
        name: 'Jauhojen punnitus',
        description: 'Mylly pussittaa jauhoja. Mikä on keskipaino?',
        difficulty: 1,

        // Story context shown to player
        story: 'Mylly pakkaa jauhopusseja. Tavoitepaino on 1000g, mutta luonnollinen vaihtelu aiheuttaa eroja.',

        animation: {
            type: 'scale',
            config: {
                targetWeight: 1000,
                weightStd: 20,
                bagCount: 40,
                bagsPerSecond: 2
            }
        },

        question: {
            type: 'estimate',
            prompt: 'Mikä on pussien keskipaino?',
            unit: 'g',
            inputConfig: {
                type: 'number',
                min: 900,
                max: 1100,
                step: 1,
                placeholder: 'grammaa'
            }
        },

        // True answer calculated from observed data
        answerFrom: 'observedMean',

        scoring: {
            type: 'absolute',
            thresholds: [15, 8, 3]  // Within 15/8/3 grams for 1/2/3 stars
        },

        hints: [
            'Seuraa vaakaa ja yritä hahmottaa, mihin painot keskittyvät',
            'Keskiarvo on lukujen summa jaettuna lukumäärällä'
        ]
    },

    // =========================================
    // Level 2: The Light Bulbs
    // =========================================
    {
        id: 'light-bulbs',
        name: 'Hehkulamput',
        description: 'Hotellin lamput palavat loppuun. Kuinka moni sammuu aikaisin?',
        difficulty: 1,

        story: 'Hotelli vaihtaa kaikki lamput kerralla. Seuraa, kuinka pitkään kukin palaa ennen sammumista.',

        animation: {
            type: 'bulbs',
            config: {
                gridSize: 6,  // 6x6 = 36 bulbs
                meanLifetime: 1000,  // hours
                timeScale: 50,  // 1 second = 50 hours
                threshold: 500  // question threshold
            }
        },

        question: {
            type: 'estimate',
            prompt: 'Kuinka monta lamppua (36:sta) sammui ennen 500 tuntia?',
            unit: 'kpl',
            inputConfig: {
                type: 'number',
                min: 0,
                max: 36,
                step: 1,
                placeholder: 'lamppua'
            }
        },

        answerFrom: 'burnedBeforeThreshold',

        scoring: {
            type: 'absolute',
            thresholds: [5, 3, 1]
        },

        hints: [
            'Eksponenttijakaumassa monet sammuvat aikaisin, mutta jotkut kestävät hyvin pitkään',
            'Keskimääräinen elinikä on 1000h, mutta se ei tarkoita että puolet sammuu ennen sitä'
        ]
    },

    // =========================================
    // Level 3: The Bus Stop (Inspection Paradox)
    // =========================================
    {
        id: 'bus-stop',
        name: 'Bussipysäkki',
        description: 'Bussit tulevat keskimäärin 10 minuutin välein. Kuinka kauan odotat?',
        difficulty: 2,

        story: 'Bussit saapuvat pysäkille keskimäärin 10 minuutin välein, mutta ajat vaihtelevat. Saavut pysäkille satunnaiseen aikaan.',

        animation: {
            type: 'bus-stop',
            config: {
                meanInterval: 10,  // minutes
                simulationLength: 120,  // 2 hours of bus arrivals to show
                numTrials: 20  // how many "you arrive" trials to show
            }
        },

        question: {
            type: 'estimate',
            prompt: 'Keskimäärin kuinka monta minuuttia odotat bussia?',
            unit: 'min',
            inputConfig: {
                type: 'number',
                min: 0,
                max: 30,
                step: 0.5,
                placeholder: 'minuuttia'
            }
        },

        // The counterintuitive answer: it's 10 minutes, not 5!
        answerFrom: 'averageWait',

        scoring: {
            type: 'absolute',
            thresholds: [4, 2, 1]
        },

        hints: [
            'Intuitio sanoo "puolet välistä" eli 5 minuuttia...',
            'Mutta saavut todennäköisemmin pitkän välin keskelle kuin lyhyen!'
        ],

        // This level teaches a counterintuitive result
        insight: 'Tämä on kuuluisa "tarkastusparadoksi": kun saavut satunnaiseen aikaan, osut todennäköisemmin pitkään väliin. Siksi keskimääräinen odotusaika on sama kuin bussien keskimääräinen väli!'
    },

    // =========================================
    // Level 4: The Quality Inspector
    // =========================================
    {
        id: 'quality-inspector',
        name: 'Laaduntarkastaja',
        description: 'Arvioi viallisten määrä havaintojesi perusteella.',
        difficulty: 2,

        story: 'Tehtaan tuotteita tarkastetaan. Seuraa tarkastusta ja arvioi, kuinka monta viallista seuraavasta erästä löytyy.',

        animation: {
            type: 'conveyor',
            config: {
                defectRate: 0.06,  // 6% true defect rate
                observationCount: 50,  // watch 50 products
                predictionCount: 100,  // predict for next 100
                speed: 3  // products per second
            }
        },

        question: {
            type: 'estimate',
            prompt: 'Näit 50 tuotetta. Seuraavasta 100 tuotteesta, kuinka monta on viallisia?',
            unit: 'kpl',
            inputConfig: {
                type: 'number',
                min: 0,
                max: 30,
                step: 1,
                placeholder: 'viallista'
            }
        },

        answerFrom: 'actualDefectsInPrediction',

        scoring: {
            type: 'absolute',
            thresholds: [4, 2, 1]
        },

        hints: [
            'Laske havaittu vikaprosentti ja sovella sitä seuraavaan erään',
            'Muista: todellinen määrä vaihtelee, vaikka prosentti olisi sama'
        ]
    },

    // =========================================
    // Level 5: The Assembly Line
    // =========================================
    {
        id: 'assembly-line',
        name: 'Kokoonpanolinja',
        description: 'Tuote kulkee neljän vaiheen läpi. Kuinka moni selviää?',
        difficulty: 3,

        story: 'Tehtaalla tuote kulkee neljän työvaiheen läpi: Leimaus → Hitsaus → Pinnoitus → Kokoonpano. Jokaisessa vaiheessa osa tuotteista hylätään.',

        animation: {
            type: 'assembly-line',
            config: {
                stations: [
                    { name: 'Leimaus', passRate: 0.94 },
                    { name: 'Hitsaus', passRate: 0.91 },
                    { name: 'Pinnoitus', passRate: 0.96 },
                    { name: 'Kokoonpano', passRate: 0.93 }
                ],
                productCount: 100,
                productsPerSecond: 3
            }
        },

        question: {
            type: 'estimate',
            prompt: 'Seurasit 100 tuotetta. Kuinka moni läpäisi kaikki vaiheet?',
            unit: 'kpl',
            inputConfig: {
                type: 'number',
                min: 0,
                max: 100,
                step: 1,
                placeholder: 'tuotetta'
            }
        },

        answerFrom: 'productsCompleted',

        scoring: {
            type: 'absolute',
            thresholds: [8, 4, 2]
        },

        hints: [
            'Jokainen vaihe näyttää luotettavalta (>90%), mutta...',
            'Jos tuotteen pitää läpäistä KAIKKI vaiheet, todennäköisyydet kerrotaan'
        ],

        insight: 'Vaikka jokainen vaihe toimii >90% ajasta, kokonaisluotettavuus on noin 76%. Tämä on keskeinen insinööriperiaate: sarjassa olevien komponenttien luotettavuudet kertoutuvat.'
    },

    // =========================================
    // Level 6: The Café
    // =========================================
    {
        id: 'cafe-queue',
        name: 'Kahvilajono',
        description: 'Asiakkaat saapuvat, barista palvelee. Kuinka pitkiä jonoja syntyy?',
        difficulty: 3,

        story: 'Kahvila avautuu. Asiakkaat saapuvat satunnaisesti, ja palveluajat vaihtelevat. Ensin tarkkailet saapumisia, sitten palvelua, lopuksi näet kokonaisuuden.',

        // This level has multiple phases
        phases: [
            {
                name: 'Saapumiset',
                description: 'Tarkkaile asiakkaiden saapumista',
                duration: 30  // seconds of observation
            },
            {
                name: 'Palvelu',
                description: 'Tarkkaile palveluaikoja',
                duration: 30
            },
            {
                name: 'Simulaatio',
                description: 'Katso kokonaisuus',
                duration: 60
            }
        ],

        animation: {
            type: 'cafe',
            config: {
                interarrivalMean: 3,   // 3 min between customers on average
                serviceMean: 2.5,      // 2.5 min service on average
                serviceStd: 1,         // some variability
                simulationMinutes: 60, // 1 hour simulation
                waitThreshold: 10      // question about >10 min wait
            }
        },

        question: {
            type: 'probability',
            prompt: 'Joutuuko joku odottamaan yli 10 minuuttia?',
            inputConfig: {
                type: 'slider',
                min: 0,
                max: 100,
                step: 5
            }
        },

        answerFrom: 'probabilityLongWait',

        scoring: {
            type: 'probability',
            thresholds: [20, 10, 5]  // percentage points
        },

        hints: [
            'Vaikka keskimääräinen palveluaika < keskimääräinen saapumisväli, jonoja voi silti syntyä',
            'Vaihtelu on avain: joskus tulee monta asiakasta peräkkäin'
        ],

        insight: 'Jonot syntyvät vaihtelusta, eivät vain kapasiteetin puutteesta. Vaikka barista ehtisi keskimäärin palvella kaikki, satunnaiset ruuhkahetket luovat odotusta.'
    },

    // =========================================
    // Level 7: Distribution Fitting (DSL)
    // =========================================
    {
        id: 'distribution-fitting',
        name: 'Jakauman sovitus',
        description: 'Kirjoita jakauma, joka kuvaa havaintoja.',
        difficulty: 2,

        story: 'Näet histogrammin mittaustuloksista. Kirjoita normaalijakauma, joka sopii havaintoihin.',

        animation: {
            type: 'scale',
            config: {
                targetWeight: 1000,
                weightStd: 25,
                bagCount: 60,
                bagsPerSecond: 4
            }
        },

        question: {
            type: 'code',  // NEW: code-based question
            prompt: 'Kirjoita normaalijakauma, joka kuvaa painoja:',
            template: '// Kirjoita jakauma muodossa normal(keskiarvo, hajonta)\nreturn normal(?, ?)',
            expectedFormat: 'distribution',  // We expect a distribution object
            inputConfig: {
                type: 'code',
                language: 'dsl',
                height: 100
            }
        },

        // Scoring: compare player's distribution to observed data
        answerFrom: 'weights',  // The observed data array

        scoring: {
            type: 'distribution-fit',  // NEW scoring type
            metric: 'ks',  // Kolmogorov-Smirnov statistic
            thresholds: [0.15, 0.10, 0.05]  // KS statistic thresholds
        },

        hints: [
            'Katso histogrammia - missä keskittymä on?',
            'Keskiarvo on keskimmäinen arvo, keskihajonta kuvaa leveyttä'
        ]
    },

    // =========================================
    // Level 8: Compound Probability (DSL)
    // =========================================
    {
        id: 'compound-probability',
        name: 'Yhdistetty todennäköisyys',
        description: 'Laske tuotteen läpäisytodennäköisyys.',
        difficulty: 2,

        story: 'Tehtaassa on neljä vaihetta. Näit jokaisen vaiheen läpäisyprosentin. Laske todennäköisyys, että tuote läpäisee KAIKKI vaiheet.',

        // Static display of observed rates (no animation needed)
        animation: {
            type: 'static-info',
            config: {
                title: 'Havaitut läpäisyprosentit',
                data: [
                    { label: 'Leimaus', value: '94%', rate: 0.94 },
                    { label: 'Hitsaus', value: '91%', rate: 0.91 },
                    { label: 'Pinnoitus', value: '96%', rate: 0.96 },
                    { label: 'Kokoonpano', value: '93%', rate: 0.93 }
                ]
            }
        },

        question: {
            type: 'code',
            prompt: 'Laske todennäköisyys, että tuote läpäisee kaikki vaiheet:',
            template: '// Voit käyttää muuttujia:\n// leimaus = 0.94\n// hitsaus = 0.91\n// pinnoitus = 0.96\n// kokoonpano = 0.93\n\nreturn ?',
            expectedFormat: 'number',  // We expect a number 0-1
            inputConfig: {
                type: 'code',
                language: 'dsl',
                height: 150
            }
        },

        // Provide context variables to DSL
        context: {
            leimaus: 0.94,
            hitsaus: 0.91,
            pinnoitus: 0.96,
            kokoonpano: 0.93
        },

        // True answer
        trueAnswer: 0.94 * 0.91 * 0.96 * 0.93,  // ≈ 0.764

        scoring: {
            type: 'relative',
            thresholds: [0.05, 0.02, 0.01]  // Within 5%, 2%, 1%
        },

        hints: [
            'Kun tapahtumien pitää kaikkien toteutua, todennäköisyydet kerrotaan',
            'P(A ja B ja C ja D) = P(A) × P(B) × P(C) × P(D)'
        ]
    },

    // =========================================
    // Level 9: Bayesian Inference (DSL)
    // =========================================
    {
        id: 'bayesian-inference',
        name: 'Bayesilainen päättely',
        description: 'Päivitä uskomuksesi havaintojen perusteella.',
        difficulty: 3,

        story: 'Tehtaassa on kaksi konetta:\n• Kone A tuottaa 70% tuotteista, 5% viallisia\n• Kone B tuottaa 30% tuotteista, 15% viallisia\n\nSatunnainen tuote todetaan vialliseksi. Mikä on todennäköisyys, että se tuli koneesta A?',

        animation: {
            type: 'static-info',
            config: {
                title: 'Koneiden tiedot',
                data: [
                    { label: 'Kone A osuus', value: '70%', rate: 0.70 },
                    { label: 'Kone A vikaprosentti', value: '5%', rate: 0.05 },
                    { label: 'Kone B osuus', value: '30%', rate: 0.30 },
                    { label: 'Kone B vikaprosentti', value: '15%', rate: 0.15 }
                ],
                question: 'Tuote on viallinen. P(kone A)?'
            }
        },

        question: {
            type: 'code',
            prompt: 'Laske P(kone A | viallinen) Bayesin kaavalla:',
            template: '// Bayesin kaava: P(A|B) = P(B|A) × P(A) / P(B)\n// \n// P(A) = 0.70        (kone A:n osuus)\n// P(B) = 0.30        (kone B:n osuus)\n// P(vika|A) = 0.05   (vikaprosentti koneessa A)\n// P(vika|B) = 0.15   (vikaprosentti koneessa B)\n//\n// P(vika) = P(vika|A)×P(A) + P(vika|B)×P(B)\n\nreturn ?',
            expectedFormat: 'number',
            inputConfig: {
                type: 'code',
                language: 'dsl',
                height: 200
            }
        },

        context: {
            P_A: 0.70,
            P_B: 0.30,
            P_vika_A: 0.05,
            P_vika_B: 0.15
        },

        // True answer: P(A|vika) = P(vika|A) × P(A) / P(vika)
        // P(vika) = 0.05 × 0.70 + 0.15 × 0.30 = 0.035 + 0.045 = 0.08
        // P(A|vika) = 0.035 / 0.08 = 0.4375
        trueAnswer: (0.05 * 0.70) / (0.05 * 0.70 + 0.15 * 0.30),  // = 0.4375

        scoring: {
            type: 'absolute',
            thresholds: [0.05, 0.02, 0.01]  // Within 5, 2, 1 percentage points
        },

        hints: [
            'Käytä Bayesin kaavaa: P(A|B) = P(B|A) × P(A) / P(B)',
            'P(viallinen) = P(viallinen ja A) + P(viallinen ja B)'
        ],

        insight: 'Vaikka kone A tuottaa enemmän (70%), viallinen tuote tulee todennäköisemmin koneesta B! Tämä johtuu siitä, että B:n vikaprosentti on kolminkertainen.'
    }
];

// Apply defaults to all levels
const LEVEL_DEFINITIONS = LEVELS.map(level => LevelSchema.applyDefaults(level));

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LevelSchema, LEVEL_DEFINITIONS };
}
