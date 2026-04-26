/**
 * Narrative 11: BONUS - Liikennesimulaatio (Traffic)
 *
 * Theme: Complex systems, emergence, open-ended simulation
 * Levels: 4
 */

LEVEL_CONTENT['traffic-bonus'] = [
    // Level 11-1: Yksinkertainen malli (Basic flow)
    {
        id: 'traffic-11-1',
        name: 'Liikenteen virtaus',
        narrative: 'traffic-bonus',
        story: 'Yksikaistaisella tiellä autoja saapuu Poisson-prosessina. Tutki liikenteen virtausta ja arvioi keskimääräinen nopeus.',
        animation: {
            type: 'traffic',
            config: {
                roadLength: 500,  // meters
                arrivalRate: 20,  // cars per minute
                maxSpeed: 50,  // km/h
                minGap: 10,  // meters
                simulationDuration: 120,  // seconds
                showSpeedGraph: true,
                showDensityGraph: true
            }
        },
        question: {
            prompt: 'Mikä on autojen keskimääräinen nopeus (km/h)?',
            type: 'estimate',
            unit: 'km/h'
        },
        scoring: {
            type: 'absolute',
            thresholds: [8, 4, 2]
        },
        answerFrom: 'observedMeanSpeed',
        insight: 'Liikennevirran perusyhtälö: Virta = Tiheys × Nopeus. Kun autoja on vähän, ne ajavat maksiminopeudella. Kun tiheys kasvaa, nopeus laskee.'
    },

    // Level 11-2: Ruuhkan ennustaminen (Congestion prediction)
    {
        id: 'traffic-11-2',
        name: 'Ruuhkan ennustaminen',
        narrative: 'traffic-bonus',
        story: 'Ruuhka syntyy, kun liikennemäärä ylittää tien kapasiteetin. Milloin tie ruuhkautuu?',
        animation: {
            type: 'traffic',
            config: {
                roadLength: 500,
                arrivalRateFunction: (t) => 15 + 0.5 * t,  // Increasing arrival rate
                maxSpeed: 50,
                capacity: 30,  // cars per minute max throughput
                showCapacityLine: true,
                showQueueFormation: true
            }
        },
        question: {
            prompt: 'Kuinka monen minuutin kuluttua jono alkaa muodostua (saapumisnopeus > kapasiteetti)?',
            type: 'estimate',
            unit: 'min'
        },
        scoring: {
            type: 'absolute',
            thresholds: [5, 2.5, 1]
        },
        answer: {
            type: 'computed',
            compute: () => (30 - 15) / 0.5  // 30 minutes
        },
        insight: 'Kun saapumisnopeus ylittää kapasiteetin, jono kasvaa rajatta! Pieni ylitys tuottaa silti pitkän jonon ajan myötä.'
    },

    // Level 11-3: Reittioptimointi (Route choice)
    {
        id: 'traffic-11-3',
        name: 'Reittivalinta',
        narrative: 'traffic-bonus',
        story: 'Kaksi reittiä A:sta B:hen: lyhyt mutta ruuhkainen, pitkä mutta vapaa. Kuinka autoilijat jakautuvat?',
        animation: {
            type: 'traffic',
            config: {
                routes: [
                    { name: 'Lyhyt', freeFlowTime: 10, capacity: 20 },
                    { name: 'Pitkä', freeFlowTime: 20, capacity: 50 }
                ],
                totalDemand: 40,
                showEquilibriumCalculation: true,
                showUserOptimum: true
            }
        },
        question: {
            prompt: 'Tasapainossa (Wardrop) molempien reittien matka-aika on sama. Mikä on matka-aika (minuuttia)?',
            type: 'estimate',
            unit: 'min'
        },
        scoring: {
            type: 'absolute',
            thresholds: [3, 1.5, 0.8]
        },
        answerFrom: 'equilibriumTravelTime',
        insight: 'Wardropin tasapaino: Käytössä olevilla reiteillä matka-aika on sama. Braessin paradoksi: Uusi tie voi joskus pidentää kaikkien matkaa!'
    },

    // Level 11-4: Häiriön vaikutus (Cascade effect)
    {
        id: 'traffic-11-4',
        name: 'Häiriön vaikutus',
        narrative: 'traffic-bonus',
        story: 'Onnettomuus sulkee yhden kaistan 10 minuutiksi. Kuinka kauan kestää, ennen kuin liikenne normalisoituu?',
        animation: {
            type: 'traffic',
            config: {
                roadLength: 1000,
                normalCapacity: 40,
                arrivalRate: 35,
                disruption: {
                    startTime: 60,
                    duration: 600,  // 10 minutes
                    reducedCapacity: 20
                },
                showQueueLength: true,
                showRecoveryTime: true
            }
        },
        question: {
            prompt: 'Häiriö kestää 10 min. Kuinka kauan kestää jonon purkautuminen häiriön päättymisen jälkeen (minuuttia)?',
            type: 'estimate',
            unit: 'min'
        },
        scoring: {
            type: 'absolute',
            thresholds: [10, 5, 2]
        },
        answerFrom: 'recoveryTime',
        insight: 'Kaskadivaikutus! Jono kasautuu nopeasti mutta purkautuu hitaasti. Häiriön kesto × (saapumisnopeus - kapasiteetti) = kertynyt jono, ja purkautuminen vie vielä kauemmin.'
    }
];
