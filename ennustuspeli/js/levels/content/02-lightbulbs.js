/**
 * Narrative 2: Hehkulamput (Light Bulbs)
 *
 * Theme: Failure distributions, hazard rates, memoryless property
 * Levels: 6
 */

LEVEL_CONTENT['lightbulbs'] = [
    // Level 2-1: Eksponentiaalinen (Exponential lifetime)
    {
        id: 'bulb-2-1',
        name: 'Eksponentiaalinen elinikä',
        narrative: 'lightbulbs',
        story: 'Hehkulamppujen elinikä noudattaa eksponenttijakaumaa. Tutki, kuinka kauan lamput palavat keskimäärin.',
        animation: {
            type: 'bulbs',
            config: {
                dgp: { type: 'exponential', mean: 1000 },
                gridSize: [5, 4],
                timeScale: 100,
                showLifetimeHistogram: true
            }
        },
        question: {
            prompt: 'Mikä on lamppujen keskimääräinen elinikä (tunteina)?',
            type: 'estimate',
            unit: 'h'
        },
        scoring: {
            type: 'relative',
            thresholds: [0.3, 0.15, 0.08]
        },
        answerFrom: 'observedMeanLifetime',
        insight: 'Eksponenttijakauma on yleisin malli tasaiselle vikaantumistasolle - lamppu voi hajota milloin tahansa samalla todennäköisyydellä.'
    },

    // Level 2-2: Muistittomuus (Memoryless property)
    {
        id: 'bulb-2-2',
        name: 'Muistittomuus',
        narrative: 'lightbulbs',
        story: 'Lamppu on palanut jo 500 tuntia. Kuinka kauan se vielä kestää keskimäärin? Eksponenttijakaumalla on erikoinen "muistittomuus"-ominaisuus.',
        animation: {
            type: 'bulbs',
            config: {
                dgp: { type: 'exponential', mean: 1000 },
                gridSize: [4, 3],
                timeScale: 100,
                filterSurvivors: 500,
                showConditionalHistogram: true
            }
        },
        question: {
            prompt: 'Kuinka kauan 500h palaneet lamput kestävät VIELÄ keskimäärin?',
            type: 'estimate',
            unit: 'h'
        },
        scoring: {
            type: 'relative',
            thresholds: [0.3, 0.15, 0.08]
        },
        answer: { type: 'static', value: 1000 },
        insight: 'Muistittomuus: Eksponenttijakaumassa "käytetyn" lampun jäljellä oleva elinikä on sama kuin uuden lampun! Lamppu ei "kulu" - se vain joko toimii tai hajoaa.'
    },

    // Level 2-3: Ikääntyvät lamput (Weibull with aging)
    {
        id: 'bulb-2-3',
        name: 'Ikääntyvät lamput',
        narrative: 'lightbulbs',
        story: 'LED-lamput kuluvat ajan myötä - mitä vanhempi lamppu, sitä todennäköisemmin se hajoaa. Tätä mallintaa Weibull-jakauma.',
        animation: {
            type: 'bulbs',
            config: {
                dgp: { type: 'weibull', shape: 2, scale: 1000 },
                gridSize: [5, 4],
                timeScale: 100,
                showLifetimeHistogram: true,
                showHazardCurve: true
            }
        },
        question: {
            prompt: 'Mikä on LED-lamppujen keskimääräinen elinikä?',
            type: 'estimate',
            unit: 'h'
        },
        scoring: {
            type: 'relative',
            thresholds: [0.25, 0.12, 0.06]
        },
        answerFrom: 'observedMeanLifetime',
        insight: 'Weibull-jakauman muotoparametri > 1 tarkoittaa, että vikaantumisriski kasvaa iän myötä. Tämä on realistisempi malli useimmille tuotteille.'
    },

    // Level 2-4: Varhaiset viat (Early failures - mixture)
    {
        id: 'bulb-2-4',
        name: 'Varhaiset viat',
        narrative: 'lightbulbs',
        story: 'Jotkut lamput ovat viallisia ja hajoavat nopeasti, mutta suurin osa kestää pitkään. Tämä luo kaksihuippuisen jakauman.',
        animation: {
            type: 'bulbs',
            config: {
                dgp: {
                    type: 'mixture',
                    weights: [0.1, 0.9],
                    distributions: [
                        { type: 'exponential', mean: 50 },
                        { type: 'weibull', shape: 3, scale: 1200 }
                    ]
                },
                gridSize: [5, 5],
                timeScale: 50,
                showLifetimeHistogram: true,
                showBimodal: true
            }
        },
        question: {
            prompt: 'Kuinka monta prosenttia lampuista hajoaa ensimmäisen 100 tunnin aikana?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [12, 6, 3]
        },
        answerFrom: 'observedEarlyFailureRate',
        insight: 'Sekoitusjakauma syntyy, kun tuotteessa on kahdenlaisia yksilöitä: viallisia ja normaaleja. "Burn-in"-testaus poistaa vialliset ennen myyntiä.'
    },

    // Level 2-5: Burn-in (Conditional after early period)
    {
        id: 'bulb-2-5',
        name: 'Burn-in-testaus',
        narrative: 'lightbulbs',
        story: 'Tehdas testaa lamput 100 tuntia ennen myyntiä. Vain selviytyneet myydään. Mikä on näiden lamppujen odotettu elinikä?',
        animation: {
            type: 'bulbs',
            config: {
                dgp: {
                    type: 'mixture',
                    weights: [0.1, 0.9],
                    distributions: [
                        { type: 'exponential', mean: 50 },
                        { type: 'weibull', shape: 3, scale: 1200 }
                    ]
                },
                gridSize: [5, 4],
                timeScale: 50,
                burnInPeriod: 100,
                showSurvivorsOnly: true,
                showLifetimeHistogram: true
            }
        },
        question: {
            prompt: 'Mikä on burn-in-testattujen lamppujen keskimääräinen elinikä (100h jälkeen)?',
            type: 'estimate',
            unit: 'h'
        },
        scoring: {
            type: 'relative',
            thresholds: [0.2, 0.1, 0.05]
        },
        answerFrom: 'observedMeanRemainingLifetime',
        insight: 'Burn-in poistaa vialliset yksilöt. Jäljelle jääneet lamput ovat lähes kaikki "hyviä" yksilöitä, joten niiden odotettu elinikä on paljon pidempi.'
    },

    // Level 2-6: Lampputyypin valinta (Comparing two types)
    {
        id: 'bulb-2-6',
        name: 'Lampputyypin valinta',
        narrative: 'lightbulbs',
        story: 'Valitse kahden lampputyypin välillä: A on halvempi mutta epävarmempi, B on kalliimpi mutta luotettavampi. Kumpi kannattaa 2000 tunnin käyttöön?',
        animation: {
            type: 'bulbs',
            config: {
                dgpA: { type: 'exponential', mean: 800 },
                dgpB: { type: 'weibull', shape: 4, scale: 1500 },
                gridSize: [3, 3],
                timeScale: 100,
                targetDuration: 2000,
                priceA: 5,
                priceB: 12,
                showComparisonHistogram: true
            }
        },
        question: {
            prompt: 'Kuinka monta prosenttia tyyppi B lampuista selviytyy 2000 tunnin käytöstä?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [15, 8, 4]
        },
        answer: {
            type: 'computed',
            compute: () => (1 - Distributions.weibullCDF(2000, 4, 1500)) * 100
        },
        insight: 'Vaikka B maksaa enemmän, sen luotettavuus voi tehdä siitä paremman valinnan. Kokonaiskustannus riippuu vaihtojen määrästä ja hajoamisen aiheuttamista haitoista.'
    }
];
