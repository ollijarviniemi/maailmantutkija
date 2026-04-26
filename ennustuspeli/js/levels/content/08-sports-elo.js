/**
 * Narrative 8: Urheiluennustaminen / ELO (Sports/ELO)
 *
 * Theme: Sigmoid/logistic, compound probability, tournaments
 * Levels: 6
 */

LEVEL_CONTENT['sports-elo'] = [
    // Level 8-1: ELO-ero → voitto (ELO difference → win probability)
    {
        id: 'elo-8-1',
        name: 'ELO-ero ja voitto',
        narrative: 'sports-elo',
        story: 'Shakissa pelaajan vahvuus mitataan ELO-luvulla. Tutki, miten ELO-ero vaikuttaa voittotodennäköisyyteen.',
        animation: {
            type: 'matchup',
            config: {
                eloA: 1500,
                eloB: { type: 'uniform', min: 1200, max: 1800 },
                numMatches: 30,
                showSigmoidCurve: true,
                showMatchResults: true
            }
        },
        question: {
            prompt: 'Jos pelaajan A ELO on 1500 ja pelaajan B ELO on 1300, mikä on A:n voittotodennäköisyys?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [8, 4, 2]
        },
        answer: {
            type: 'computed',
            compute: () => Distributions.eloWinProbability(1500, 1300) * 100  // ~76%
        },
        insight: 'ELO-kaava: P(A voittaa) = 1 / (1 + 10^((ELO_B - ELO_A)/400)). 200 pisteen ero = ~76% voittotodennäköisyys.'
    },

    // Level 8-2: Kotietu (Home advantage)
    {
        id: 'elo-8-2',
        name: 'Kotietu',
        narrative: 'sports-elo',
        story: 'Jalkapallossa kotijoukkueella on etu. Tämä vastaa noin +100 ELO-pistettä. Miten tämä muuttaa ennusteita?',
        animation: {
            type: 'matchup',
            config: {
                eloA: 1600,  // Home team
                eloB: 1600,  // Away team
                homeAdvantage: 100,  // ELO-equivalent
                numMatches: 40,
                showHomeAwayStats: true
            }
        },
        question: {
            prompt: 'Jos molemmat joukkueet ovat ELO 1600, mikä on kotijoukkueen voittotodennäköisyys (kotietu = 100 ELO)?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [6, 3, 1.5]
        },
        answer: {
            type: 'computed',
            compute: () => Distributions.eloWinProbability(1600 + 100, 1600) * 100  // ~64%
        },
        insight: 'Kotietu on merkittävä tekijä urheilussa! 100 ELO:n kotietu nostaa tasaväkisen pelin voitto-odotuksen ~50% → ~64%.'
    },

    // Level 8-3: Paras kolmesta (Best of 3)
    {
        id: 'elo-8-3',
        name: 'Paras kolmesta',
        narrative: 'sports-elo',
        story: 'Ottelusarja ratkaistaan "paras kolmesta" -formaatilla. Miten sarjavoittotodennäköisyys eroaa yksittäisen pelin voittotodennäköisyydestä?',
        animation: {
            type: 'matchup',
            config: {
                singleGameProbA: 0.6,
                bestOf: 3,
                numSeries: 50,
                showSeriesResults: true,
                showProbabilityBreakdown: true
            }
        },
        question: {
            prompt: 'Jos A voittaa yksittäisen pelin 60% todennäköisyydellä, mikä on A:n todennäköisyys voittaa "paras 3:sta" -sarja?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [5, 2.5, 1]
        },
        answer: {
            type: 'computed',
            compute: () => {
                const p = 0.6;
                // Win 2-0 OR Win 2-1
                const win20 = p * p;
                const win21 = 2 * p * (1 - p) * p;  // LWW or WLW (but not WW-)
                return (win20 + win21) * 100;  // 0.36 + 0.288 = 64.8%
            }
        },
        insight: 'Sarjaformaatti vahvistaa suosikin etua! P(voitto 2-0) + P(voitto 2-1) = 0.6² + 2×0.6×0.4×0.6 = 64.8% > 60%.'
    },

    // Level 8-4: Turnausvoitto (Tournament win)
    {
        id: 'elo-8-4',
        name: 'Turnausvoitto',
        narrative: 'sports-elo',
        story: '8 joukkuetta pelaa pudotuspeliturnauksen (3 kierrosta). Kuinka todennäköisesti vahvin joukkue voittaa?',
        animation: {
            type: 'bracket',
            config: {
                teams: [
                    { name: 'A', elo: 1700 },
                    { name: 'B', elo: 1600 },
                    { name: 'C', elo: 1550 },
                    { name: 'D', elo: 1500 },
                    { name: 'E', elo: 1450 },
                    { name: 'F', elo: 1400 },
                    { name: 'G', elo: 1350 },
                    { name: 'H', elo: 1300 }
                ],
                numSimulations: 100,
                showBracket: true,
                showWinProbabilities: true
            }
        },
        question: {
            prompt: 'Mikä on joukkueen A (ELO 1700) todennäköisyys voittaa koko turnaus?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [10, 5, 2]
        },
        answerFrom: 'teamAWinProbability',
        insight: 'Vaikka A on selkeästi vahvin, turnausvoitto ei ole varma! Kolmen voiton putki vaatii onnea, ja yksikin tappio pudottaa. Pudotuspelit ovat dramaattisia mutta epävarmoja.'
    },

    // Level 8-5: ELO-päivitys (ELO update)
    {
        id: 'elo-8-5',
        name: 'ELO-päivitys',
        narrative: 'sports-elo',
        story: 'Ottelun jälkeen ELO-luvut päivitetään. Voittaja saa pisteitä, häviäjä menettää. Päivityksen suuruus riippuu tuloksen yllättävyydestä.',
        animation: {
            type: 'static-info',
            config: {
                initialEloA: 1500,
                initialEloB: 1400,
                K: 32,  // K-factor
                showUpdateFormula: true,
                showRatingGraph: true
            }
        },
        question: {
            prompt: 'A (ELO 1500) voittaa B:n (ELO 1400). K=32. Kuinka paljon A:n ELO nousee?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [3, 1.5, 0.8]
        },
        answer: {
            type: 'computed',
            compute: () => {
                const expectedA = Distributions.eloWinProbability(1500, 1400);
                return 32 * (1 - expectedA);  // ~11 points
            }
        },
        insight: 'ELO-päivitys: Δ = K × (tulos - odotus). Jos A:n voitto-odotus oli 64%, hän saa K × (1 - 0.64) = 32 × 0.36 ≈ 11 pistettä.'
    },

    // Level 8-6: Aloittajan etu (First-mover advantage)
    {
        id: 'elo-8-6',
        name: 'Valkean etu shakissa',
        narrative: 'sports-elo',
        story: 'Shakissa valkea (aloittaja) voittaa useammin. Tutki, miten suuri tämä etu on ELO-pisteinä.',
        animation: {
            type: 'static-info',
            config: {
                numGames: 100,
                showWhiteWinRate: true,
                showDrawRate: true,
                showEloEquivalent: true
            }
        },
        question: {
            prompt: 'Shakissa valkea voittaa ~55% ja musta ~45% (tasapeleistä puolet molemmille). Kuinka monta ELO-pistettä valkean etu vastaa?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [20, 10, 5]
        },
        answer: {
            type: 'computed',
            compute: () => {
                // If white wins 55%, solve for ELO diff where win prob = 0.55
                // 0.55 = 1 / (1 + 10^(-diff/400))
                // 10^(-diff/400) = 1/0.55 - 1 = 0.818
                // -diff/400 = log10(0.818) ≈ -0.087
                // diff ≈ 35
                return 35;
            }
        },
        insight: 'Valkean etu vastaa noin 35 ELO-pistettä. Tämä on pienempi kuin jalkapallon kotietu (~100), mutta silti merkittävä ammattilaispelissä!'
    }
];
