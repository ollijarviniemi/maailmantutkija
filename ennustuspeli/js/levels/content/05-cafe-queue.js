/**
 * Narrative 5: Kahvilajono (Cafe Queue)
 *
 * Theme: Queueing theory, M/M/1, waiting times
 * Levels: 6
 */

LEVEL_CONTENT['cafe-queue'] = [
    // Level 5-1: Asiakkaita tunnissa (Arrivals per hour)
    {
        id: 'cafe-5-1',
        name: 'Asiakkaita tunnissa',
        narrative: 'cafe-queue',
        story: 'Kahvilaan saapuu asiakkaita satunnaisin väliajoin. Tutki saapumisten määrää ja arvioi keskimääräinen saapumisnopeus.',
        animation: {
            type: 'cafe',
            config: {
                arrivalRate: 20,  // per hour
                serviceRate: 25,  // per hour
                simulationDuration: 60,
                showArrivalCounter: true,
                showInterarrivalHistogram: true
            }
        },
        question: {
            prompt: 'Kuinka monta asiakasta saapuu tunnissa keskimäärin?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [5, 3, 1.5]
        },
        answerFrom: 'observedArrivalRate',
        insight: 'Poisson-prosessissa saapumisten väliajat ovat eksponenttijakautuneita. Keskimääräinen saapumisnopeus λ = saapumiset / aika.'
    },

    // Level 5-2: Vakiopalvelu (Constant service - M/D/1)
    {
        id: 'cafe-5-2',
        name: 'Vakiopalveluaika',
        narrative: 'cafe-queue',
        story: 'Kahvilassa on automaatti, joka palvelee jokaisen asiakkaan täsmälleen 2 minuutissa. Mikä on keskimääräinen jonotusaika?',
        animation: {
            type: 'cafe',
            config: {
                arrivalRate: 20,
                serviceTime: { type: 'constant', value: 2 },  // 2 min = 30/hour capacity
                simulationDuration: 90,
                showQueueLength: true,
                showWaitingTimeHistogram: true
            }
        },
        question: {
            prompt: 'Mikä on keskimääräinen jonotusaika (minuutteina)?',
            type: 'estimate',
            unit: 'min'
        },
        scoring: {
            type: 'absolute',
            thresholds: [1.5, 0.8, 0.4]
        },
        answerFrom: 'observedMeanWaitingTime',
        insight: 'M/D/1-jono (vakiopalveluaika) on tehokkaampi kuin M/M/1. Vakiopalvelu vähentää odotusaikaa, koska palveluajoissa ei ole vaihtelua.'
    },

    // Level 5-3: Satunnainen palvelu (M/M/1)
    {
        id: 'cafe-5-3',
        name: 'Satunnainen palveluaika',
        narrative: 'cafe-queue',
        story: 'Nyt barista tekee käsin erikoiskahveja. Palveluaika vaihtelee (keskimäärin 2.5 min). Miten tämä vaikuttaa jonotusaikaan?',
        animation: {
            type: 'cafe',
            config: {
                arrivalRate: 20,  // λ = 20/h
                serviceRate: 24,  // μ = 24/h (2.5 min avg)
                simulationDuration: 90,
                showQueueLength: true,
                showWaitingTimeHistogram: true,
                showUtilization: true
            }
        },
        question: {
            prompt: 'Mikä on keskimääräinen jonotusaika (minuutteina)?',
            type: 'estimate',
            unit: 'min'
        },
        scoring: {
            type: 'absolute',
            thresholds: [2, 1, 0.5]
        },
        answerFrom: 'observedMeanWaitingTime',
        insight: 'M/M/1-jonon odotusaika: W = ρ/(μ(1-ρ)), missä ρ = λ/μ on käyttöaste. Satunnainen palveluaika lisää jonoa vakioaikaan verrattuna.'
    },

    // Level 5-4: Ruuhka-aika (Non-homogeneous arrivals)
    {
        id: 'cafe-5-4',
        name: 'Ruuhka-aika',
        narrative: 'cafe-queue',
        story: 'Aamulla klo 8-9 kahvilaan tulee 40 asiakasta tunnissa. Muuten 15 asiakasta tunnissa. Mikä on pisin odotusaika ruuhkassa?',
        animation: {
            type: 'cafe',
            config: {
                arrivalRateFunction: (t) => (t >= 0 && t < 60) ? 40 : 15,
                serviceRate: 30,
                simulationDuration: 150,
                showQueueLength: true,
                showTimeAxis: true,
                highlightRushHour: [0, 60]
            }
        },
        question: {
            prompt: 'Mikä on pisin jonotusaika ruuhka-aikana (minuutteina)?',
            type: 'estimate',
            unit: 'min'
        },
        scoring: {
            type: 'absolute',
            thresholds: [5, 2.5, 1]
        },
        answerFrom: 'maxWaitingTime',
        insight: 'Kun λ > μ (saapumisnopeus > palvelunopeus), jono kasvaa rajatta! Ruuhka-aikoina tilapäinen ylikuorma aiheuttaa pitkiä jonoja.'
    },

    // Level 5-5: Kaksi kassaa (M/M/2)
    {
        id: 'cafe-5-5',
        name: 'Kaksi kassaa',
        narrative: 'cafe-queue',
        story: 'Kahvilaan avataan toinen kassa ruuhka-aikana. Molemmat baristak palvelevat samalla nopeudella. Miten jonot muuttuvat?',
        animation: {
            type: 'cafe',
            config: {
                arrivalRate: 35,
                serviceRate: 20,  // per server
                numServers: 2,
                simulationDuration: 90,
                showQueueLength: true,
                showServerUtilization: true
            }
        },
        question: {
            prompt: 'Mikä on keskimääräinen jonotusaika kahdella kassalla (minuutteina)?',
            type: 'estimate',
            unit: 'min'
        },
        scoring: {
            type: 'absolute',
            thresholds: [1.5, 0.8, 0.4]
        },
        answerFrom: 'observedMeanWaitingTime',
        insight: 'M/M/c-jono: Useampi palvelija vähentää odotusaikaa dramaattisesti. Käyttöaste per palvelija ρ = λ/(c×μ) pitää olla < 1.'
    },

    // Level 5-6: Kärsimättömät asiakkaat (Balking)
    {
        id: 'cafe-5-6',
        name: 'Kärsimättömät',
        narrative: 'cafe-queue',
        story: 'Jos jonossa on yli 5 asiakasta, uudet asiakkaat lähtevät pois. Miten tämä vaikuttaa palveltujen asiakkaiden määrään?',
        animation: {
            type: 'cafe',
            config: {
                arrivalRate: 30,
                serviceRate: 20,
                balkingThreshold: 5,
                simulationDuration: 120,
                showQueueLength: true,
                showBalkingCounter: true,
                showServedCounter: true
            }
        },
        question: {
            prompt: 'Kuinka monta prosenttia asiakkaista lähtee pois (balks)?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [8, 4, 2]
        },
        answerFrom: 'balkingRate',
        insight: 'Balking (poislähtö) vähentää tehollista kuormaa, mutta menetetyt asiakkaat ovat kustannus. Kapasiteetin lisääminen voi olla kannattavaa.'
    }
];
