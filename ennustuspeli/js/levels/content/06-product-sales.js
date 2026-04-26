/**
 * Narrative 6: Tuotteiden myynti (Product Sales)
 *
 * Theme: Regression, price elasticity, demand modeling
 * Levels: 6
 */

LEVEL_CONTENT['product-sales'] = [
    // Level 6-1: Vakiokysyntä (Constant demand)
    {
        id: 'sales-6-1',
        name: 'Vakiokysyntä',
        narrative: 'product-sales',
        story: 'Kauppa myy tuotetta vakiohintaan. Päivittäinen myynti vaihtelee satunnaisesti. Arvioi keskimääräinen kysyntä.',
        animation: {
            type: 'sales-chart',
            config: {
                dgp: { type: 'poisson', lambda: 50 },
                numDays: 30,
                price: 10,
                showDailySales: true,
                showMeanLine: true
            }
        },
        question: {
            prompt: 'Mikä on keskimääräinen päivittäinen myynti?',
            type: 'estimate',
            unit: 'kpl'
        },
        scoring: {
            type: 'absolute',
            thresholds: [8, 4, 2]
        },
        answerFrom: 'observedMeanSales',
        insight: 'Myynti satunnaisvaihtelee, vaikka kysyntä olisi vakio. Poisson-jakauma on hyvä malli lukumäärälle, kun tapahtumat ovat itsenäisiä.'
    },

    // Level 6-2: Hinnan vaikutus (Price elasticity)
    {
        id: 'sales-6-2',
        name: 'Hinnan vaikutus',
        narrative: 'product-sales',
        story: 'Hintaa on muutettu eri päivinä. Tutki hinnan ja myynnin suhdetta. Kuinka paljon myynti laskee, kun hinta nousee 10%?',
        animation: {
            type: 'scatter',
            config: {
                xData: 'prices',
                yData: 'sales',
                dgp: {
                    prices: { type: 'uniform', min: 8, max: 15 },
                    sales: (price) => ({
                        type: 'poisson',
                        lambda: 100 * Math.pow(price / 10, -1.5)  // Elasticity -1.5
                    })
                },
                numPoints: 40,
                showRegressionLine: true,
                xLabel: 'Hinta (€)',
                yLabel: 'Myynti (kpl)'
            }
        },
        question: {
            prompt: 'Mikä on hintajousto (kuinka monta % myynti laskee kun hinta nousee 1%)?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [0.5, 0.25, 0.1]
        },
        answer: { type: 'static', value: 1.5 },
        insight: 'Hintajousto e = (ΔQ/Q) / (ΔP/P). Jos e > 1, kysyntä on joustavaa: hinnan nosto vähentää tuloja. Jos e < 1, kysyntä on joustamatonta.'
    },

    // Level 6-3: Kynnysefekti (Threshold effect)
    {
        id: 'sales-6-3',
        name: 'Psykologinen hintaraja',
        narrative: 'product-sales',
        story: 'Myynti putoaa jyrkästi kun hinta ylittää 10€. Tämä on "psykologinen hintaraja".',
        animation: {
            type: 'scatter',
            config: {
                xData: 'prices',
                yData: 'sales',
                dgp: {
                    prices: { type: 'uniform', min: 7, max: 14 },
                    sales: (price) => ({
                        type: 'poisson',
                        lambda: price <= 10 ? 60 : 30
                    })
                },
                numPoints: 50,
                showStepFunction: true,
                xLabel: 'Hinta (€)',
                yLabel: 'Myynti (kpl)'
            }
        },
        question: {
            prompt: 'Kuinka paljon myynti putoaa (%) kun hinta ylittää 10€?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [15, 8, 4]
        },
        answer: { type: 'static', value: 50 },
        insight: 'Kynnysefektit ovat yleisiä markkinoilla. "9.99€" toimii, koska aivomme käsittelevät ensimmäistä numeroa eniten.'
    },

    // Level 6-4: Useampi tuote (Cross-elasticity)
    {
        id: 'sales-6-4',
        name: 'Korvaavat tuotteet',
        narrative: 'product-sales',
        story: 'Kaupassa myydään kahta samanlaista tuotetta. Kun tuotteen A hinta nousee, tuotteen B myynti kasvaa.',
        animation: {
            type: 'scatter',
            config: {
                priceA: { type: 'uniform', min: 8, max: 14 },
                salesA: (pA, pB) => 50 * (pB / pA),
                salesB: (pA, pB) => 50 * (pA / pB),
                priceB: 10,  // Fixed
                numPoints: 30,
                showCrossElasticity: true
            }
        },
        question: {
            prompt: 'Jos tuotteen A hinta nousee 20%, kuinka monta % tuotteen B myynti kasvaa?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [10, 5, 2]
        },
        answer: { type: 'static', value: 20 },
        insight: 'Ristijousto mittaa, miten yhden tuotteen hinta vaikuttaa toisen kysyntään. Korvaavilla tuotteilla ristijousto on positiivinen.'
    },

    // Level 6-5: Sesonki (Seasonality)
    {
        id: 'sales-6-5',
        name: 'Kausivaihtelu',
        narrative: 'product-sales',
        story: 'Jäätelön myynti riippuu sekä hinnasta että lämpötilasta. Rakenna malli, joka huomioi molemmat.',
        animation: {
            type: 'scatter',
            config: {
                variables: ['price', 'temperature'],
                dgp: {
                    price: { type: 'uniform', min: 2, max: 5 },
                    temperature: { type: 'uniform', min: 10, max: 30 },
                    sales: (price, temp) => ({
                        type: 'poisson',
                        lambda: Math.max(0, 50 - 10 * price + 2 * temp)
                    })
                },
                numPoints: 60,
                showMultipleRegression: true
            }
        },
        question: {
            prompt: 'Kuinka paljon myynti kasvaa (kpl), kun lämpötila nousee 5 astetta?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [5, 2.5, 1]
        },
        answer: { type: 'static', value: 10 },  // 2 * 5 = 10
        insight: 'Monimuuttujaregressio: Sales = β₀ + β₁×Price + β₂×Temp. Kertoimet kertovat kunkin muuttujan itsenäisen vaikutuksen.'
    },

    // Level 6-6: Varastonhallinta (Newsvendor)
    {
        id: 'sales-6-6',
        name: 'Varastonhallinta',
        narrative: 'product-sales',
        story: 'Leipomo tilaa tuoreita leipiä joka aamu. Myymättä jääneet heitetään pois. Kuinka paljon kannattaa tilata?',
        animation: {
            type: 'static-info',
            config: {
                demandDist: { type: 'normal', mean: 100, std: 20 },
                unitCost: 2,
                unitPrice: 5,
                salvageValue: 0,
                numDays: 30,
                showProfitCurve: true,
                showOptimalOrder: true
            }
        },
        question: {
            prompt: 'Mikä on optimaalinen tilausmäärä päivittäin?',
            type: 'estimate',
            unit: 'kpl'
        },
        scoring: {
            type: 'absolute',
            thresholds: [15, 8, 4]
        },
        answer: {
            type: 'computed',
            compute: () => {
                // Newsvendor: Order at critical ratio quantile
                const cu = 5 - 2;  // Underage cost (lost profit)
                const co = 2;  // Overage cost (wasted cost)
                const cr = cu / (cu + co);  // 3/5 = 0.6
                // Q* such that P(D <= Q*) = 0.6
                // For Normal(100, 20), this is about 105
                return 100 + 20 * 0.253;  // ~105
            }
        },
        insight: 'Newsvendor-malli: Optimaalinen tilaus on kvanttiilissa P(D ≤ Q*) = (hinta-kustannus)/(hinta). Liian vähän = menetettyä myyntiä, liian paljon = hävikkiä.'
    }
];
