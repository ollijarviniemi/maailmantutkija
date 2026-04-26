/**
 * Narrative 1: Myllyn jauhopussit (Flour Mill)
 *
 * Theme: Normal distribution, mean, variance, CLT
 * Levels: 6
 */

LEVEL_CONTENT['flour-mill'] = [
    // Level 1-1: Keskipaino (Average weight)
    {
        id: 'flour-1-1',
        name: 'Keskipaino',
        narrative: 'flour-mill',
        story: 'Myllyn jauhopussien pitäisi painaa 1000 grammaa, mutta painossa on hieman vaihtelua. Tutki punnitsemalla pusseja ja arvioi niiden keskipaino.',
        animation: {
            type: 'scale',
            config: {
                dgp: { type: 'normal', mean: 1000, std: 15 },
                numSamples: 10,
                unit: 'g',
                showHistogram: true
            }
        },
        question: {
            prompt: 'Mikä on jauhopussien keskipaino?',
            type: 'estimate',
            unit: 'g'
        },
        scoring: {
            type: 'absolute',
            thresholds: [20, 10, 5]  // 3 stars: within 5g
        },
        answerFrom: 'observedMean',
        insight: 'Pussien painot ovat jakautuneet normaalisti keskiarvon ympärille. Mitä enemmän punnitsemme, sitä tarkemmin tiedämme keskiarvon.'
    },

    // Level 1-2: Epävarmuus (Uncertainty)
    {
        id: 'flour-1-2',
        name: 'Epävarmuus',
        narrative: 'flour-mill',
        story: 'Nyt kun tiedät pussien keskipainon, arvioi myös kuinka paljon painot vaihtelevat. Keskihajonta kertoo tyypillisen poikkeaman keskiarvosta.',
        animation: {
            type: 'scale',
            config: {
                dgp: { type: 'normal', mean: 1000, std: 15 },
                numSamples: 15,
                unit: 'g',
                showHistogram: true,
                showStdGuide: true
            }
        },
        question: {
            prompt: 'Mikä on painojen keskihajonta (tyypillinen poikkeama keskiarvosta)?',
            type: 'estimate',
            unit: 'g'
        },
        scoring: {
            type: 'absolute',
            thresholds: [8, 4, 2]
        },
        answerFrom: 'observedStd',
        insight: 'Keskihajonta kertoo, kuinka kaukana tyypillinen havainto on keskiarvosta. Noin 68% havainnoista on yhden keskihajonnan päässä keskiarvosta.'
    },

    // Level 1-3: Eri pussikoko (Different bag size - extrapolation)
    {
        id: 'flour-1-3',
        name: 'Eri pussikoko',
        narrative: 'flour-mill',
        story: 'Mylly tekee myös 2 kg jauhopusseja samasta jauhosta. Jos 1 kg pussien keskipaino on 1000 g ja keskihajonta 15 g, mitä voit sanoa 2 kg pusseista?',
        animation: {
            type: 'static-info',
            config: {
                title: 'Tiedot',
                facts: [
                    { label: '1 kg pussien keskipaino', value: '1000 g' },
                    { label: '1 kg pussien keskihajonta', value: '15 g' },
                    { label: '2 kg pussi', value: '= 2 × (1 kg pussi)' }
                ]
            }
        },
        question: {
            prompt: 'Mikä on 2 kg pussien keskihajonta?',
            type: 'code',
            expectedFormat: 'number',
            hint: 'Mieti: jos yhdistät kaksi satunnaismuuttujaa, miten hajonta käyttäytyy?',
            starterCode: '// 2 kg pussi = 1 kg pussi + 1 kg pussi\n// Keskiarvo: 1000 + 1000 = 2000\n// Hajonta: ???\nreturn ???'
        },
        scoring: {
            type: 'absolute',
            thresholds: [5, 2, 0.5]
        },
        answer: { type: 'static', value: 15 * Math.sqrt(2) },  // ~21.2
        insight: 'Kun yhdistät riippumattomia satunnaismuuttujia, varianssit lasketaan yhteen. Koska varianssi = keskihajonta², saat: √(15² + 15²) = 15√2 ≈ 21.2 g'
    },

    // Level 1-4: Montako yli 1020g? (Exceedance count)
    {
        id: 'flour-1-4',
        name: 'Montako yli 1020g?',
        narrative: 'flour-mill',
        story: 'Asiakas haluaa tietää, kuinka suuri osuus pusseista painaa yli 1020 grammaa. Käytä havaintoja arvioimiseen.',
        animation: {
            type: 'scale',
            config: {
                dgp: { type: 'normal', mean: 1000, std: 15 },
                numSamples: 20,
                unit: 'g',
                showHistogram: true,
                highlightThreshold: 1020
            }
        },
        question: {
            prompt: 'Kuinka monta prosenttia pusseista painaa yli 1020 g?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [15, 8, 4]
        },
        answer: {
            type: 'computed',
            compute: () => (1 - Distributions.normalCDF(1020, 1000, 15)) * 100
        },
        insight: '1020 g on noin 1.33 keskihajontaa keskiarvon yläpuolella. Normaalijakaumassa noin 9% arvoista ylittää tämän rajan.'
    },

    // Level 1-5: Eri mylly (Different mill - Student's t vs Normal)
    {
        id: 'flour-1-5',
        name: 'Eri mylly',
        narrative: 'flour-mill',
        story: 'Toinen mylly tuottaa pusseja, joiden painoissa on enemmän ääriarvoja kuin normaalijakaumassa. Arvioi silti keskipaino!',
        animation: {
            type: 'scale',
            config: {
                dgp: { type: 'studentT', df: 3, loc: 1000, scale: 15 },
                numSamples: 12,
                unit: 'g',
                showHistogram: true,
                showDualComparison: true
            }
        },
        question: {
            prompt: 'Mikä on tämän myllyn pussien keskipaino?',
            type: 'estimate',
            unit: 'g'
        },
        scoring: {
            type: 'absolute',
            thresholds: [25, 15, 8]
        },
        answerFrom: 'observedMean',
        insight: 'Kun jakaumassa on "paksut hännät" (enemmän ääriarvoja), mediaani voi olla parempi keskimääräisyyden mitta kuin keskiarvo, koska ääriarvot vaikuttavat keskiarvoon voimakkaasti.'
    },

    // Level 1-6: Mustikkapussi (Blueberry bag - CLT)
    {
        id: 'flour-1-6',
        name: 'Mustikkapussi',
        narrative: 'flour-mill',
        story: 'Mustikkapusseissa on 100 mustikkaa. Yksittäisen mustikan paino vaihtelee (ei normaalijakautunut!), mutta mitä voit sanoa koko pussin painosta?',
        animation: {
            type: 'scale',
            config: {
                dgp: {
                    type: 'sum',
                    count: 100,
                    component: { type: 'lognormal', mean: 2, std: 0.8 }
                },
                numSamples: 15,
                unit: 'g',
                showHistogram: true,
                showComponentDist: true
            }
        },
        question: {
            prompt: 'Mikä on mustikkapussien kokonaispainon keskihajonta?',
            type: 'estimate',
            unit: 'g'
        },
        scoring: {
            type: 'relative',
            thresholds: [0.3, 0.15, 0.08]
        },
        answerFrom: 'observedStd',
        insight: 'Keskeinen raja-arvolause: Riippumatta yksittäisten mustikoiden jakauman muodosta, 100 mustikan summa noudattaa likimain normaalijakaumaa! Keskihajonta on √100 × yksittäisen mustikan keskihajonta.'
    }
];
