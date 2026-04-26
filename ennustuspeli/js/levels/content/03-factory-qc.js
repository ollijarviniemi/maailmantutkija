/**
 * Narrative 3: Tehtaan laadunvalvonta (Factory QC)
 *
 * Theme: Binomial, compound probability, Bayes, multi-stage
 * Levels: 6
 */

LEVEL_CONTENT['factory-qc'] = [
    // Level 3-1: Vikataajuus (Defect rate)
    {
        id: 'factory-3-1',
        name: 'Vikataajuus',
        narrative: 'factory-qc',
        story: 'Tehtaan tuotantolinjalla syntyy viallisia tuotteita. Tarkkaile hihnaa ja arvioi vikatiheys.',
        animation: {
            type: 'conveyor',
            config: {
                dgp: { type: 'bernoulli', p: 0.06 },
                numItems: 50,
                speed: 1,
                showDefectCounter: true
            }
        },
        question: {
            prompt: 'Kuinka monta prosenttia tuotteista on viallisia?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [4, 2, 1]
        },
        answerFrom: 'observedDefectRate',
        insight: 'Binomijakauma kuvaa, montako "onnistumista" (tai vikaa) saadaan n yrityksestä, kun jokaisen todennäköisyys on p.'
    },

    // Level 3-2: Kaksi tarkastajaa (Two inspectors)
    {
        id: 'factory-3-2',
        name: 'Kaksi tarkastajaa',
        narrative: 'factory-qc',
        story: 'Kaksi tarkastajaa tutkii jokaisen tuotteen. Tarkastaja A huomaa 90% vioista, tarkastaja B huomaa 85% vioista. He toimivat itsenäisesti.',
        animation: {
            type: 'conveyor',
            config: {
                dgp: { type: 'bernoulli', p: 0.06 },
                numItems: 50,
                speed: 1,
                inspectors: [
                    { name: 'A', detectRate: 0.90 },
                    { name: 'B', detectRate: 0.85 }
                ],
                showInspectorStats: true
            }
        },
        question: {
            prompt: 'Kuinka monta prosenttia vioista jää MOLEMMILTA huomaamatta?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [3, 1.5, 0.8]
        },
        answer: {
            type: 'computed',
            compute: () => (1 - 0.90) * (1 - 0.85) * 100  // 1.5%
        },
        insight: 'Riippumattomat tarkastajat: P(molemmat ohittavat) = P(A ohittaa) × P(B ohittaa) = 0.10 × 0.15 = 1.5%'
    },

    // Level 3-3: Väärät hälytykset (False alarms - Bayes)
    {
        id: 'factory-3-3',
        name: 'Väärät hälytykset',
        narrative: 'factory-qc',
        story: 'Automaattinen tarkastus hälyttää 95% vioista (herkkyys), mutta myös 3% hyvistä tuotteista (vääriä hälytyksiä). Jos laite hälyttää, kuinka todennäköisesti tuote on oikeasti viallinen?',
        animation: {
            type: 'conveyor',
            config: {
                dgp: { type: 'bernoulli', p: 0.06 },
                numItems: 100,
                speed: 0.8,
                autoInspector: {
                    sensitivity: 0.95,
                    falsePositiveRate: 0.03
                },
                showBayesBreakdown: true
            }
        },
        question: {
            prompt: 'Jos laite hälyttää, mikä on todennäköisyys, että tuote ON viallinen? (Positiivinen ennustearvo)',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [10, 5, 2]
        },
        answer: {
            type: 'computed',
            compute: () => {
                const p = 0.06;  // Vikatiheys
                const sens = 0.95;  // Herkkyys
                const fpr = 0.03;  // Väärät hälytykset
                // Bayes: P(viallinen | hälytys) = P(hälytys | viallinen) * P(viallinen) / P(hälytys)
                const pAlarm = sens * p + fpr * (1 - p);
                return (sens * p / pAlarm) * 100;
            }
        },
        insight: 'Bayesin kaava! Vaikka testi on hyvä (95% herkkyys), matala vikatiheys (6%) tarkoittaa, että suuri osa hälytyksistä on vääriä. PPV ≈ 67%.'
    },

    // Level 3-4: Kolme vaihetta (Three stages)
    {
        id: 'factory-3-4',
        name: 'Kolme vaihetta',
        narrative: 'factory-qc',
        story: 'Tuote kulkee kolmen valmistusvaiheen läpi. Kussakin vaiheessa voi syntyä vika. Mikä on lopullisen tuotteen vikatodennäköisyys?',
        animation: {
            type: 'assembly-line',
            config: {
                stages: [
                    { name: 'Vaihe 1', defectRate: 0.02 },
                    { name: 'Vaihe 2', defectRate: 0.03 },
                    { name: 'Vaihe 3', defectRate: 0.01 }
                ],
                numItems: 60,
                speed: 0.7,
                showStageStats: true
            }
        },
        question: {
            prompt: 'Mikä on todennäköisyys, että lopputuote on virheetön?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [5, 2.5, 1]
        },
        answer: {
            type: 'computed',
            compute: () => (1 - 0.02) * (1 - 0.03) * (1 - 0.01) * 100  // ~94.1%
        },
        insight: 'Sarjassa olevat riippumattomat vaiheet: P(virheetön) = (1-p₁) × (1-p₂) × (1-p₃). Pienetkin vikatiheydet kertautuvat!'
    },

    // Level 3-5: Vaihtoehtoiset reitit (Alternative paths)
    {
        id: 'factory-3-5',
        name: 'Vaihtoehtoiset reitit',
        narrative: 'factory-qc',
        story: 'Järjestelmässä on kaksi rinnakkaista komponenttia. Järjestelmä toimii, jos VÄHINTÄÄN YKSI komponentti toimii.',
        animation: {
            type: 'assembly-line',
            config: {
                parallel: true,
                branches: [
                    { name: 'Reitti A', failRate: 0.15 },
                    { name: 'Reitti B', failRate: 0.20 }
                ],
                numTrials: 50,
                showParallelStats: true
            }
        },
        question: {
            prompt: 'Mikä on todennäköisyys, että järjestelmä TOIMII?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [5, 2.5, 1]
        },
        answer: {
            type: 'computed',
            compute: () => (1 - 0.15 * 0.20) * 100  // 97%
        },
        insight: 'Rinnakkaiset komponentit (OR-logiikka): P(toimii) = 1 - P(molemmat epäonnistuvat) = 1 - (0.15 × 0.20) = 97%'
    },

    // Level 3-6: Prosessin ajautuminen (Process drift)
    {
        id: 'factory-3-6',
        name: 'Prosessin ajautuminen',
        narrative: 'factory-qc',
        story: 'Koneen kunto heikkenee ajan myötä ja vikatiheys nousee. Milloin kone pitää huoltaa?',
        animation: {
            type: 'conveyor',
            config: {
                dgp: {
                    type: 'time-varying',
                    baseRate: 0.02,
                    driftRate: 0.001  // Per item increase
                },
                numItems: 100,
                speed: 1,
                showDriftGraph: true,
                showRunningDefectRate: true
            }
        },
        question: {
            prompt: 'Kuinka monta tuotetta voidaan valmistaa ennen kuin vikatiheys ylittää 5%?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [15, 8, 4]
        },
        answer: {
            type: 'computed',
            compute: () => (0.05 - 0.02) / 0.001  // 30 items
        },
        insight: 'Prosessin valvonta (SPC) on tärkeää! Kun vikatiheys = alkutaso + ajautuminen × n, ratkaistaan n: (5% - 2%) / 0.1% = 30 tuotetta.'
    }
];
