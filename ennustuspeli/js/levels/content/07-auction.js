/**
 * Narrative 7: Huutokauppa (Auction)
 *
 * Theme: Multiple regression, order statistics, extreme values
 * Levels: 6
 */

LEVEL_CONTENT['auction'] = [
    // Level 7-1: Perushinta (Base price)
    {
        id: 'auction-7-1',
        name: 'Perushinta',
        narrative: 'auction',
        story: 'Huutokaupassa myydään vanhoja kelloja. Tutki myyntihintoja ja arvioi tyypillinen hinta.',
        animation: {
            type: 'auction',
            config: {
                dgp: { type: 'lognormal', mean: 200, std: 80 },
                numItems: 25,
                showPriceHistogram: true,
                showBidding: true
            }
        },
        question: {
            prompt: 'Mikä on kellojen mediaanihinta?',
            type: 'estimate',
            unit: '€'
        },
        scoring: {
            type: 'relative',
            thresholds: [0.3, 0.15, 0.08]
        },
        answerFrom: 'observedMedianPrice',
        insight: 'Hinnat ovat usein lognormaalijakautuneita: vähän kalliita ääriarvoja, mutta enemmistö on lähellä mediaania. Mediaani on parempi "tyypillisen" mitta kuin keskiarvo.'
    },

    // Level 7-2: Ikä vaikuttaa (Age affects price)
    {
        id: 'auction-7-2',
        name: 'Ikä vaikuttaa',
        narrative: 'auction',
        story: 'Vanhemmat kellot ovat yleensä arvokkaampia. Tutki iän ja hinnan suhdetta.',
        animation: {
            type: 'scatter',
            config: {
                xData: 'age',
                yData: 'price',
                dgp: {
                    age: { type: 'uniform', min: 20, max: 150 },
                    price: (age) => ({
                        type: 'lognormal',
                        mean: 50 + 2 * age,
                        std: 30 + 0.3 * age
                    })
                },
                numPoints: 40,
                showRegressionLine: true,
                xLabel: 'Ikä (vuotta)',
                yLabel: 'Hinta (€)'
            }
        },
        question: {
            prompt: 'Kuinka paljon hinta nousee keskimäärin jokaista 10 vuotta kohden?',
            type: 'estimate',
            unit: '€'
        },
        scoring: {
            type: 'absolute',
            thresholds: [10, 5, 2]
        },
        answer: { type: 'static', value: 20 },  // 2 * 10
        insight: 'Lineaarinen regressio: Hinta = a + b × Ikä. Kulmakerroin b kertoo, kuinka paljon hinta nousee ikäyksikköä kohden.'
    },

    // Level 7-3: Useampi ominaisuus (Multiple regression)
    {
        id: 'auction-7-3',
        name: 'Monta tekijää',
        narrative: 'auction',
        story: 'Hintaan vaikuttavat ikä, merkki (luxury vs tavallinen) ja kunto (1-5). Rakenna malli, joka huomioi kaikki.',
        animation: {
            type: 'scatter',
            config: {
                variables: ['age', 'isLuxury', 'condition'],
                dgp: {
                    age: { type: 'uniform', min: 20, max: 100 },
                    isLuxury: { type: 'bernoulli', p: 0.3 },
                    condition: { type: 'discrete', values: [1, 2, 3, 4, 5], probs: [0.1, 0.2, 0.3, 0.25, 0.15] },
                    price: (age, luxury, cond) => ({
                        type: 'lognormal',
                        mean: 50 + 1.5 * age + 200 * luxury + 30 * cond,
                        std: 40
                    })
                },
                numPoints: 50,
                showCoefficients: true
            }
        },
        question: {
            prompt: 'Kuinka paljon luxus-merkki nostaa hintaa verrattuna tavalliseen?',
            type: 'estimate',
            unit: '€'
        },
        scoring: {
            type: 'absolute',
            thresholds: [50, 25, 12]
        },
        answer: { type: 'static', value: 200 },
        insight: 'Monimuuttujaregressio eristää kunkin tekijän itsenäisen vaikutuksen. Luxury-kerroin = 200€ tarkoittaa, että sama ikäinen ja kuntoinen luksuskello on 200€ kalliimpi.'
    },

    // Level 7-4: Tarjoajien määrä (Order statistics)
    {
        id: 'auction-7-4',
        name: 'Tarjoajien määrä',
        narrative: 'auction',
        story: 'Mitä enemmän tarjoajia, sitä korkeampi hinta! Voittava tarjous on korkein n:stä arvostuksesta.',
        animation: {
            type: 'auction',
            config: {
                valueDist: { type: 'uniform', min: 100, max: 300 },
                bidderCounts: [2, 3, 5, 8, 12],
                numAuctions: 10,
                showMaxBidHistogram: true,
                showBidderCountEffect: true
            }
        },
        question: {
            prompt: 'Jos tarjoajia on 8 ja arvostukset ovat tasajakautuneet välillä 100-300€, mikä on odotettu korkein tarjous?',
            type: 'estimate',
            unit: '€'
        },
        scoring: {
            type: 'absolute',
            thresholds: [15, 8, 4]
        },
        answer: {
            type: 'computed',
            compute: () => 100 + (300 - 100) * 8 / 9  // E[max of n Uniform] = a + (b-a) * n/(n+1)
        },
        insight: 'Järjestystunnusluvut: n:stä riippumattomasta tasajakautuneesta muuttujasta maksimi on keskimäärin a + (b-a) × n/(n+1). Enemmän tarjoajia = korkeampi hinta.'
    },

    // Level 7-5: Pohjahinta (Reserve price)
    {
        id: 'auction-7-5',
        name: 'Pohjahinta',
        narrative: 'auction',
        story: 'Myyjä asettaa pohjahinnan: alle 150€ tarjouksia ei hyväksytä. Miten tämä vaikuttaa myytyjen kohteiden hintoihin?',
        animation: {
            type: 'auction',
            config: {
                dgp: { type: 'lognormal', mean: 180, std: 60 },
                reservePrice: 150,
                numItems: 40,
                showTruncatedHistogram: true,
                showUnsoldCount: true
            }
        },
        question: {
            prompt: 'Kuinka monta prosenttia kohteista jää myymättä (tarjous alle 150€)?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [10, 5, 2]
        },
        answerFrom: 'unsoldPercentage',
        insight: 'Katkaistut jakaumat: kun havaitsemme vain pohjahinnan ylittävät myynnit, näemme vain osan jakaumasta. Keskiarvo vaikuttaa korkeammalta!'
    },

    // Level 7-6: Kilpailevat huutokaupat (Split bidders)
    {
        id: 'auction-7-6',
        name: 'Kilpailevat kaupat',
        narrative: 'auction',
        story: 'Kaksi huutokauppaa myy samankaltaisia kelloja samaan aikaan. Tarjoajat jakautuvat. Miten hinnat muuttuvat?',
        animation: {
            type: 'auction',
            config: {
                totalBidders: 12,
                splitRatio: 0.5,  // Evenly split
                valueDist: { type: 'uniform', min: 100, max: 300 },
                numRounds: 15,
                showPriceComparison: true
            }
        },
        question: {
            prompt: 'Kuinka monta prosenttia alempi on keskihinta kahdessa pienessä huutokaupassa verrattuna yhteen suureen?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [10, 5, 2]
        },
        answer: {
            type: 'computed',
            compute: () => {
                // E[max of 12] ≈ 100 + 200 * 12/13 ≈ 284.6
                // E[max of 6] ≈ 100 + 200 * 6/7 ≈ 271.4
                const big = 100 + 200 * 12 / 13;
                const small = 100 + 200 * 6 / 7;
                return ((big - small) / big) * 100;
            }
        },
        insight: 'Markkinoiden fragmentoituminen laskee hintoja! Kaksi 6 hengen huutokauppaa tuottaa alemman hinnan kuin yksi 12 hengen. Myyjien kannattaa yhdistää voimat.'
    }
];
