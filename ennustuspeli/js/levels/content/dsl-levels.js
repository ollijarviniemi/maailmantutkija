/**
 * DSL-Based Level Definitions
 */

LEVEL_CONTENT['dsl-practice'] = [
    // Level 1: Flour Mill - Normal Distribution
    {
        id: 'flour-1-1-dsl',
        name: 'Jauhopussien painojakauma',
        narrative: 'dsl-practice',
        story: 'Myllyn jauhopussien pitäisi painaa 1000 grammaa, mutta painossa on vaihtelua.',
        trueDGP: { type: 'normal', mean: 1000, std: 15 },
        animation: {
            type: 'scale',
            config: {
                dgp: { type: 'normal', mean: 1000, std: 15 },
                numSamples: 12,
                unit: 'g',
                showHistogram: true
            }
        },
        question: {
            type: 'dsl',
            prompt: '',
            expectedOutput: 'distribution',
            starterCode: `return Normal(mean(data), std(data))`,
        },
        scoring: {
            type: 'distribution',
            thresholds: [0.3, 0.15, 0.08]
        },
        insight: 'Normaalijakauma N(μ, σ) on hyvä malli, kun arvot keskittyvät keskiarvon ympärille symmetrisesti.'
    },

    // Level 2: Lightbulbs - Exponential Distribution
    {
        id: 'bulb-2-1-dsl',
        name: 'Lamppujen elinikäjakauma',
        narrative: 'dsl-practice',
        story: 'Hehkulamppujen elinikä noudattaa eksponenttijakaumaa.',
        trueDGP: { type: 'exponential', mean: 1000 },
        animation: {
            type: 'bulbs',
            config: {
                dgp: { type: 'exponential', mean: 1000 },
                gridSize: [4, 3],
                timeScale: 100,
                showLifetimeHistogram: true
            }
        },
        question: {
            type: 'dsl',
            prompt: '',
            expectedOutput: 'distribution',
            starterCode: `return Exponential(mean(data))`,
        },
        scoring: {
            type: 'distribution',
            thresholds: [0.35, 0.18, 0.10]
        },
        insight: 'Eksponenttijakauma mallintaa aikaa seuraavaan tapahtumaan. "Muistittomuus": vanha lamppu ei ole lähempänä hajoamista kuin uusi.'
    },

    // Level 3: Factory QC - Binomial/Bernoulli
    {
        id: 'factory-3-1-dsl',
        name: 'Vikatodennäköisyys',
        narrative: 'dsl-practice',
        story: 'Tehtaan linjalla syntyy satunnaisesti viallisia tuotteita.',
        trueDGP: { type: 'bernoulli', p: 0.06 },
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
            type: 'dsl',
            prompt: '',
            expectedOutput: 'distribution',
            starterCode: `defects = sum(data)
total = len(data)
return Beta(defects + 1, total - defects + 1)`,
        },
        scoring: {
            type: 'distribution',
            thresholds: [0.25, 0.12, 0.06]
        },
        insight: 'Beta-jakauma ilmaisee epävarmuutta osuudesta. Lisää dataa → kapeampi jakauma.'
    },

    // Level 4: Store Occupancy - Poisson
    {
        id: 'store-4-1-dsl',
        name: 'Asiakkaiden lukumäärä',
        narrative: 'dsl-practice',
        story: 'Kaupassa käy asiakkaita satunnaisin väliajoin.',
        trueDGP: { type: 'poisson', lambda: 30 },
        animation: {
            type: 'store',
            config: {
                arrivalRate: 30,
                serviceTimeMean: 10,
                simulationDuration: 60,
                showArrivalCounter: true,
                showOccupancyGraph: true
            }
        },
        question: {
            type: 'dsl',
            prompt: '',
            expectedOutput: 'distribution',
            starterCode: `return Poisson(arrivals)`,
        },
        scoring: {
            type: 'distribution',
            thresholds: [0.30, 0.15, 0.08]
        },
        insight: 'Poisson-jakauma mallintaa lukumäärää, kun tapahtumat sattuvat itsenäisesti vakiotahdilla.'
    },

    // Level 5: Cafe Queue - Service Time
    {
        id: 'cafe-5-1-dsl',
        name: 'Palveluajan jakauma',
        narrative: 'dsl-practice',
        story: 'Kahvilassa barista valmistaa juomia. Palveluaika vaihtelee.',
        trueDGP: { type: 'exponential', mean: 3 },
        animation: {
            type: 'cafe',
            config: {
                arrivalRate: 15,
                serviceRate: 20,
                simulationDuration: 60,
                showServiceTimeHistogram: true
            }
        },
        question: {
            type: 'dsl',
            prompt: '',
            expectedOutput: 'distribution',
            starterCode: `return Exponential(mean(serviceTimes))`,
        },
        scoring: {
            type: 'distribution',
            thresholds: [0.35, 0.18, 0.10]
        },
        insight: 'Palveluajat ovat usein eksponenttijakautuneita (M/M/1-jono).'
    },

    // Level 6: Product Sales - Demand
    {
        id: 'sales-6-1-dsl',
        name: 'Päivittäinen kysyntä',
        narrative: 'dsl-practice',
        story: 'Kauppa myy tuotetta vakiohintaan. Päivittäinen myynti vaihtelee.',
        trueDGP: { type: 'poisson', lambda: 50 },
        animation: {
            type: 'sales-chart',
            config: {
                dgp: { type: 'poisson', lambda: 50 },
                numDays: 20,
                price: 10,
                showDailySales: true,
                showMeanLine: true
            }
        },
        question: {
            type: 'dsl',
            prompt: '',
            expectedOutput: 'distribution',
            starterCode: `return Poisson(mean(dailySales))`,
        },
        scoring: {
            type: 'distribution',
            thresholds: [0.28, 0.14, 0.07]
        },
        insight: 'Päivittäinen myynti noudattaa usein Poisson-jakaumaa, kun ostopäätökset ovat itsenäisiä.'
    },

    // Level 7: Auction - Lognormal Prices
    {
        id: 'auction-7-1-dsl',
        name: 'Huutokauppahinnat',
        narrative: 'dsl-practice',
        story: 'Huutokaupassa myydään antiikkikelloja. Hinnat vaihtelevat paljon.',
        trueDGP: { type: 'lognormal', mu: 5.3, sigma: 0.4 },
        animation: {
            type: 'auction',
            config: {
                dgp: { type: 'lognormal', mean: 200, std: 80 },
                numItems: 20,
                showPriceHistogram: true,
                showBidding: true
            }
        },
        question: {
            type: 'dsl',
            prompt: '',
            expectedOutput: 'distribution',
            starterCode: `logPrices = map(prices, log)
return LogNormal(mean(logPrices), std(logPrices))`,
        },
        scoring: {
            type: 'distribution',
            thresholds: [0.35, 0.20, 0.12]
        },
        insight: 'Lognormaalijakauma syntyy, kun arvo on monen tekijän tulo. Oikealle vino: mediaani < keskiarvo.'
    },

    // Level 8: Sports ELO - Win Probability
    {
        id: 'elo-8-1-dsl',
        name: 'Voittotodennäköisyys',
        narrative: 'dsl-practice',
        story: 'Shakissa pelaajien vahvuus mitataan ELO-luvuilla.',
        trueDGP: { type: 'bernoulli', p: 0.76 },
        animation: {
            type: 'matchup',
            config: {
                eloA: 1500,
                eloB: 1300,
                numMatches: 25,
                showMatchResults: true,
                showWinRate: true
            }
        },
        question: {
            type: 'dsl',
            prompt: '',
            expectedOutput: 'distribution',
            starterCode: `diff = eloA - eloB
p_win = 1 / (1 + pow(10, -diff / 400))
return Bernoulli(p_win)`,
        },
        scoring: {
            type: 'distribution',
            thresholds: [0.20, 0.10, 0.05]
        },
        insight: 'ELO-kaava: P(A voittaa) = 1 / (1 + 10^((ELO_B - ELO_A)/400)).'
    },

    // Level 9: Psychology - Test Scores
    {
        id: 'psych-9-1-dsl',
        name: 'Testipisteiden jakauma',
        narrative: 'dsl-practice',
        story: 'Psykologisessa testissä pisteet jakautuvat normaalisti.',
        trueDGP: { type: 'normal', mean: 100, std: 15 },
        animation: {
            type: 'scatter',
            config: {
                dgp: {
                    scores: { type: 'normal', mean: 100, std: 15 }
                },
                numPoints: 50,
                showHistogram: true,
                xLabel: 'Testipisteet',
                yLabel: 'Frekvenssi'
            }
        },
        question: {
            type: 'dsl',
            prompt: '',
            expectedOutput: 'distribution',
            starterCode: `return Normal(mean(scores), std(scores))`,
        },
        scoring: {
            type: 'distribution',
            thresholds: [0.25, 0.12, 0.06]
        },
        insight: 'Älykkyystestit on kalibroitu niin, että pisteet ~ N(100, 15).'
    },

    // Level 10: Polls - Support Estimate
    {
        id: 'poll-10-1-dsl',
        name: 'Kannatusarvio',
        narrative: 'dsl-practice',
        story: 'Gallupissa kysytään 1000 ihmiseltä, ketä he äänestävät.',
        trueDGP: { type: 'beta', alpha: 501, beta: 501 },
        animation: {
            type: 'poll',
            config: {
                trueSupport: 0.50,
                sampleSize: 1000,
                showSampleDistribution: true,
                showConfidenceInterval: true
            }
        },
        question: {
            type: 'dsl',
            prompt: '',
            expectedOutput: 'distribution',
            starterCode: `supporters = pollResult * sampleSize
return Beta(supporters + 1, sampleSize - supporters + 1)`,
        },
        scoring: {
            type: 'distribution',
            thresholds: [0.20, 0.10, 0.05]
        },
        insight: 'Beta-jakauma ilmaisee epävarmuuden todellisesta osuudesta.'
    },

    // Level 11: Traffic - Flow Distribution
    {
        id: 'traffic-11-1-dsl',
        name: 'Liikennevirta',
        narrative: 'dsl-practice',
        story: 'Tiellä kulkee autoja. Laske, montako autoa ohittaa mittauspisteen minuutissa.',
        trueDGP: { type: 'poisson', lambda: 20 },
        animation: {
            type: 'traffic',
            config: {
                roadLength: 500,
                arrivalRate: 20,
                maxSpeed: 50,
                minGap: 10,
                simulationDuration: 60,
                showFlowCounter: true
            }
        },
        question: {
            type: 'dsl',
            prompt: '',
            expectedOutput: 'distribution',
            starterCode: `return Poisson(mean(carsPerMinute))`,
        },
        scoring: {
            type: 'distribution',
            thresholds: [0.30, 0.15, 0.08]
        },
        insight: 'Liikennevirta noudattaa usein Poisson-jakaumaa, kun autot saapuvat itsenäisesti.'
    }
];

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LEVEL_CONTENT['dsl-practice'];
}
