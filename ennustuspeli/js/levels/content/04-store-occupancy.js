/**
 * Narrative 4: Kaupan asiakasmäärä (Store Occupancy)
 *
 * Theme: Poisson process, arrival/departure, threshold exceedance probability
 * All questions: "What's the probability that at some point tomorrow,
 *                more than N people are in the store?"
 *
 * Levels: 8, with increasing DGP sophistication
 */

// Store layout from kartta_v2.json - grid-based layout
const STORE_LAYOUT = {
    gridCols: 20,
    gridRows: 16,
    shelves: [
        {row:0,col:0},{row:0,col:1},{row:0,col:2},{row:0,col:3},{row:0,col:4},{row:0,col:5},{row:0,col:6},{row:0,col:7},{row:0,col:8},{row:0,col:9},{row:0,col:10},{row:0,col:11},{row:0,col:12},{row:0,col:13},{row:0,col:14},{row:0,col:15},{row:0,col:16},{row:0,col:17},{row:0,col:18},{row:0,col:19},
        {row:1,col:0},{row:1,col:19},
        {row:2,col:0},{row:2,col:19},
        {row:3,col:0},{row:3,col:3},{row:3,col:6},{row:3,col:9},{row:3,col:10},{row:3,col:11},{row:3,col:12},{row:3,col:13},{row:3,col:14},{row:3,col:15},{row:3,col:16},{row:3,col:19},
        {row:4,col:0},{row:4,col:3},{row:4,col:6},{row:4,col:19},
        {row:5,col:0},{row:5,col:3},{row:5,col:6},{row:5,col:19},
        {row:6,col:0},{row:6,col:3},{row:6,col:6},{row:6,col:9},{row:6,col:10},{row:6,col:11},{row:6,col:12},{row:6,col:13},{row:6,col:14},{row:6,col:15},{row:6,col:16},{row:6,col:19},
        {row:7,col:0},{row:7,col:3},{row:7,col:6},{row:7,col:19},
        {row:8,col:0},{row:8,col:3},{row:8,col:6},{row:8,col:19},
        {row:9,col:0},{row:9,col:9},{row:9,col:10},{row:9,col:11},{row:9,col:12},{row:9,col:13},{row:9,col:14},{row:9,col:15},{row:9,col:16},{row:9,col:19},
        {row:10,col:0},{row:10,col:19},
        {row:11,col:0},{row:11,col:2},{row:11,col:3},{row:11,col:4},{row:11,col:5},{row:11,col:19},
        {row:12,col:0},{row:12,col:2},{row:12,col:3},{row:12,col:4},{row:12,col:5},{row:12,col:8},{row:12,col:12},{row:12,col:19},
        {row:13,col:0},{row:13,col:2},{row:13,col:3},{row:13,col:4},{row:13,col:5},{row:13,col:8},{row:13,col:12},{row:13,col:19},
        {row:14,col:0},{row:14,col:8},{row:14,col:12},{row:14,col:19},
        {row:15,col:0},{row:15,col:8},{row:15,col:9},{row:15,col:10},{row:15,col:11},{row:15,col:12},{row:15,col:19}
    ],
    browsePositions: [
        {row:1,col:3},{row:1,col:4},{row:1,col:5},{row:1,col:6},{row:1,col:7},{row:1,col:8},{row:1,col:9},{row:1,col:10},{row:1,col:11},{row:1,col:12},{row:1,col:13},{row:1,col:14},{row:1,col:15},{row:1,col:16},{row:1,col:17},
        {row:2,col:1},{row:2,col:9},{row:2,col:10},{row:2,col:11},{row:2,col:12},{row:2,col:13},{row:2,col:14},{row:2,col:15},{row:2,col:16},
        {row:3,col:1},{row:3,col:2},{row:3,col:4},{row:3,col:5},{row:3,col:7},{row:3,col:18},
        {row:4,col:1},{row:4,col:2},{row:4,col:4},{row:4,col:5},{row:4,col:7},{row:4,col:9},{row:4,col:10},{row:4,col:11},{row:4,col:12},{row:4,col:13},{row:4,col:14},{row:4,col:15},{row:4,col:16},{row:4,col:18},
        {row:5,col:1},{row:5,col:2},{row:5,col:4},{row:5,col:5},{row:5,col:7},{row:5,col:9},{row:5,col:10},{row:5,col:11},{row:5,col:12},{row:5,col:13},{row:5,col:14},{row:5,col:15},{row:5,col:16},{row:5,col:18},
        {row:6,col:1},{row:6,col:2},{row:6,col:4},{row:6,col:5},{row:6,col:7},{row:6,col:18},
        {row:7,col:1},{row:7,col:2},{row:7,col:4},{row:7,col:5},{row:7,col:7},{row:7,col:9},{row:7,col:10},{row:7,col:11},{row:7,col:12},{row:7,col:13},{row:7,col:14},{row:7,col:15},{row:7,col:16},{row:7,col:18},
        {row:8,col:1},{row:8,col:2},{row:8,col:4},{row:8,col:5},{row:8,col:7},{row:8,col:9},{row:8,col:10},{row:8,col:11},{row:8,col:12},{row:8,col:13},{row:8,col:14},{row:8,col:15},{row:8,col:16},{row:8,col:18},
        {row:9,col:1},{row:9,col:18},
        {row:10,col:1},{row:10,col:2},{row:10,col:3},{row:10,col:4},{row:10,col:5},{row:10,col:9},{row:10,col:10},{row:10,col:11},{row:10,col:12},{row:10,col:13},{row:10,col:14},{row:10,col:15},{row:10,col:16},{row:10,col:18},
        {row:11,col:1},{row:11,col:6},{row:11,col:18},
        {row:12,col:1},{row:12,col:6},{row:12,col:7},{row:12,col:9},{row:12,col:11},{row:12,col:13},{row:12,col:18},
        {row:13,col:1},{row:13,col:6},{row:13,col:7},{row:13,col:9},{row:13,col:11},{row:13,col:13},{row:13,col:18},
        {row:14,col:1},{row:14,col:2},{row:14,col:3},{row:14,col:4},{row:14,col:5},{row:14,col:7},{row:14,col:9},{row:14,col:10},{row:14,col:11},{row:14,col:13},{row:14,col:18}
    ],
    entrance: { col: 4, width: 2 },
    exit: { col: 15, width: 2 }
};

LEVEL_CONTENT['store-occupancy'] = [
    // =========================================================================
    // Level 4-1: Constant flow
    // Simple Poisson arrivals, exponential stay times
    // =========================================================================
    {
        id: 'store-4-1',
        name: 'Tasainen virta',
        narrative: 'store-occupancy',
        story: 'Olet ruokakaupan johtaja. Asiakkaat saapuvat tasaisena virtana koko päivän ajan, viettävät jonkin aikaa kaupassa ja lähtevät. Tutki yhden päivän dataa ja ennusta huomisen ruuhkaisuus.',

        animation: {
            type: 'store-occupancy',
            config: {
                numDays: 1,
                customLayout: STORE_LAYOUT,
                dgp: {
                    type: 'constant',
                    baseArrivalRate: 0.5,  // customers per minute (~30/hour)
                    meanStayTime: 12       // minutes
                }
            }
        },

        question: {
            type: 'dsl',
            prompt: 'Millä todennäköisyydellä kaupassa on huomenna jossain vaiheessa yli 15 asiakasta yhtä aikaa?',
            threshold: 15,
            starterCode: `# Käytettävissä oleva data:
# days[0].arrivals - lista saapumisista (time, hour, minute)
# days[0].stayDurations - lista käyntiajoista (minuutteina)
# days[0].occupancy - lista {time, count} -pareista
# days[0].maxOccupancy - päivän suurin asiakasmäärä

# Palauta todennäköisyys väliltä 0-1
return 0.5`
        },

        scoring: {
            type: 'probability-mc',
            thresholds: [0.15, 0.08, 0.04]  // percentage point error
        },

        // True answer computed via Monte Carlo in the game
        trueDGP: {
            type: 'store-occupancy-mc',
            config: {
                baseArrivalRate: 0.5,
                meanStayTime: 12
            },
            threshold: 15,
            metric: 'exceedance-probability'
        },

        insight: 'M/M/∞-jonossa asiakkaiden tasapainomäärä noudattaa Poisson-jakaumaa parametrilla λ·μ, missä λ on saapumisnopeus ja μ keskimääräinen viipymä.'
    },

    // =========================================================================
    // Level 4-2: Peak hours
    // Time-varying arrival rate with afternoon peak
    // =========================================================================
    {
        id: 'store-4-2',
        name: 'Ruuhka-aika',
        narrative: 'store-occupancy',
        story: 'Kaupassa on selkeä ruuhkahuippu iltapäivällä, kun ihmiset tulevat töistä. Aamulla ja illalla on hiljaisempaa. Mallinna tämä vaihtelu.',

        animation: {
            type: 'store-occupancy',
            config: {
                numDays: 1,
                customLayout: STORE_LAYOUT,
                dgp: {
                    type: 'peak-hours',
                    baseArrivalRate: 0.3,   // base rate
                    peakTime: 17 * 60,      // 17:00 peak
                    peakWidth: 90,          // 1.5 hour width
                    peakMultiplier: 3.5,    // 3.5x at peak
                    meanStayTime: 10
                }
            }
        },

        question: {
            type: 'dsl',
            prompt: 'Millä todennäköisyydellä kaupassa on huomenna jossain vaiheessa yli 15 asiakasta yhtä aikaa?',
            threshold: 15,
            starterCode: `# Tutki, miten saapumiset jakautuvat päivän aikana
# days[0].arrivals sisältää jokaisen saapumisen kellonajan

# Vinkki: laske saapumiset tunneittain
# hours = {}
# for a in days[0].arrivals:
#     h = a['hour']
#     hours[h] = hours.get(h, 0) + 1

return 0.5`
        },

        scoring: {
            type: 'probability-mc',
            thresholds: [0.15, 0.08, 0.04]
        },

        trueDGP: {
            type: 'store-occupancy-mc',
            config: {
                type: 'peak-hours',
                baseArrivalRate: 0.3,
                peakTime: 17 * 60,
                peakWidth: 90,
                peakMultiplier: 3.5,
                meanStayTime: 10
            },
            threshold: 15,
            metric: 'exceedance-probability'
        },

        insight: 'Ruuhka-aikoina paitsi saapuu enemmän ihmisiä, myös kasautuminen lisääntyy. Huippuasiakasmäärä voi olla moninkertainen keskiarvoon verrattuna.'
    },

    // =========================================================================
    // Level 4-3: Two customer types (discrete)
    // Fast shoppers (blue) vs slow browsers (red)
    // =========================================================================
    {
        id: 'store-4-3',
        name: 'Pikavieraat ja selailijat',
        narrative: 'store-occupancy',
        story: 'Kaupassa käy kahdenlaisia asiakkaita: pikaostajat (siniset) tulevat hakemaan tietyn tuotteen nopeasti, kun taas selailijat (punaiset) kiertelevät rauhassa koko kaupan.',

        animation: {
            type: 'store-occupancy',
            config: {
                numDays: 1,
                customLayout: STORE_LAYOUT,
                dgp: {
                    type: 'constant',
                    baseArrivalRate: 0.6,
                    customerTypes: 'discrete',
                    fastProbability: 0.6,    // 60% are fast shoppers
                    fastMeanStay: 6,         // 6 min average
                    slowMeanStay: 22         // 22 min average
                }
            }
        },

        question: {
            type: 'dsl',
            prompt: 'Millä todennäköisyydellä kaupassa on huomenna jossain vaiheessa yli 18 asiakasta yhtä aikaa?',
            threshold: 18,
            starterCode: `# Asiakastyypit näkyvät datassa:
# days[0].arrivals[i]['type'] on joko 'fast' tai 'slow'
# days[0].stayDurations sisältää kaikkien käyntiajat

# Voit laskea erikseen nopeiden ja hitaiden käyntiajat:
# fast_durations = [d for i, d in enumerate(days[0].stayDurations)
#                   if days[0].arrivals[i]['type'] == 'fast']

return 0.5`
        },

        scoring: {
            type: 'probability-mc',
            thresholds: [0.15, 0.08, 0.04]
        },

        trueDGP: {
            type: 'store-occupancy-mc',
            config: {
                baseArrivalRate: 0.6,
                customerTypes: 'discrete',
                fastProbability: 0.6,
                fastMeanStay: 6,
                slowMeanStay: 22
            },
            threshold: 18,
            metric: 'exceedance-probability'
        },

        insight: 'Sekoitejakauma: kokonaiskäyntiaika on sekoitus kahdesta eksponenttijakaumasta. Keskimääräinen viipymä on painotettu keskiarvo, mutta varianssi on suurempi kuin yhden tyypin tapauksessa.'
    },

    // =========================================================================
    // Level 4-4: Continuous customer types
    // Stay time varies continuously (color gradient blue-red)
    // =========================================================================
    {
        id: 'store-4-4',
        name: 'Jatkuva vaihtelu',
        narrative: 'store-occupancy',
        story: 'Asiakkaiden käyntiajat vaihtelevat jatkuvasti - jotkut ovat hyvin nopeita, toiset hyvin hitaita, ja kaikki siltä väliltä. Väri kertoo asiakkaan "nopeuden".',

        animation: {
            type: 'store-occupancy',
            config: {
                numDays: 1,
                customLayout: STORE_LAYOUT,
                dgp: {
                    type: 'constant',
                    baseArrivalRate: 0.5,
                    customerTypes: 'continuous',
                    minMeanStay: 4,
                    maxMeanStay: 30
                }
            }
        },

        question: {
            type: 'dsl',
            prompt: 'Millä todennäköisyydellä kaupassa on huomenna jossain vaiheessa yli 14 asiakasta yhtä aikaa?',
            threshold: 14,
            starterCode: `# Jatkuvassa tapauksessa käyntiaikojen jakauma on monimutkaisempi
# Tutki days[0].stayDurations -jakaumaa

# Hyödyllisiä funktioita:
# mean(arr) - keskiarvo
# std(arr) - keskihajonta
# median(arr) - mediaani
# quantile(arr, 0.9) - 90% kvantiili

return 0.5`
        },

        scoring: {
            type: 'probability-mc',
            thresholds: [0.15, 0.08, 0.04]
        },

        trueDGP: {
            type: 'store-occupancy-mc',
            config: {
                baseArrivalRate: 0.5,
                customerTypes: 'continuous',
                minMeanStay: 4,
                maxMeanStay: 30
            },
            threshold: 14,
            metric: 'exceedance-probability'
        },

        insight: 'Kun käyntiaika on itsessään satunnaismuuttuja (satunnainen keskiarvo eksponenttijakaumalle), kokonaisjakauma on vaikeampi analysoida mutta simulaatio toimii edelleen.'
    },

    // =========================================================================
    // Level 4-5: Groups
    // Families/friends arrive together, walk together
    // =========================================================================
    {
        id: 'store-4-5',
        name: 'Ryhmät',
        narrative: 'store-occupancy',
        story: 'Monet asiakkaat tulevat ryhmissä: perheet, ystäväporukat, pariskunnat. Ryhmä saapuu yhdessä, kiertelee yhdessä ja lähtee yhdessä.',

        animation: {
            type: 'store-occupancy',
            config: {
                numDays: 1,
                customLayout: STORE_LAYOUT,
                dgp: {
                    type: 'constant',
                    baseArrivalRate: 0.4,  // fewer "arrivals" but groups
                    meanStayTime: 15,
                    groups: true,
                    groupProbability: 0.4,  // 40% of arrivals are groups
                    meanGroupSize: 2.5      // average group size when it's a group
                }
            }
        },

        question: {
            type: 'dsl',
            prompt: 'Millä todennäköisyydellä kaupassa on huomenna jossain vaiheessa yli 25 asiakasta yhtä aikaa?',
            threshold: 25,
            starterCode: `# Ryhmät näkyvät datassa:
# days[0].arrivals[i]['groupId'] - sama ryhmä-ID jos kuuluvat samaan ryhmään
#                                  (None jos yksin)

# Laske ryhmien koot:
# groups = {}
# for a in days[0].arrivals:
#     if a['groupId'] is not None:
#         groups[a['groupId']] = groups.get(a['groupId'], 0) + 1

return 0.5`
        },

        scoring: {
            type: 'probability-mc',
            thresholds: [0.15, 0.08, 0.04]
        },

        trueDGP: {
            type: 'store-occupancy-mc',
            config: {
                baseArrivalRate: 0.4,
                meanStayTime: 15,
                groups: true,
                groupProbability: 0.4,
                meanGroupSize: 2.5
            },
            threshold: 25,
            metric: 'exceedance-probability'
        },

        insight: 'Ryhmäsaapumiset lisäävät "purskeita" (bursts) asiakasmäärään. Vaikka saapumistapahtumia on vähemmän, ryhmät nostavat huippuja korkeammalle.'
    },

    // =========================================================================
    // Level 4-6: Different group size distributions
    // Groups have different size distribution than individuals
    // =========================================================================
    {
        id: 'store-4-6',
        name: 'Ryhmäkoot',
        narrative: 'store-occupancy',
        story: 'Viikonloppuisin kaupassa käy isompia ryhmiä (perheet lapsineen) kuin arkisin (pariskunnat). Tutki ryhmäkokojen jakaumaa.',

        animation: {
            type: 'store-occupancy',
            config: {
                numDays: 1,
                customLayout: STORE_LAYOUT,
                dgp: {
                    type: 'constant',
                    baseArrivalRate: 0.35,
                    meanStayTime: 18,
                    groups: true,
                    groupProbability: 0.5,
                    groupSizeDistribution: 'poisson',  // Poisson-distributed group sizes
                    meanGroupSize: 3.2                 // larger groups
                }
            }
        },

        question: {
            type: 'dsl',
            prompt: 'Millä todennäköisyydellä kaupassa on huomenna jossain vaiheessa yli 30 asiakasta yhtä aikaa?',
            threshold: 30,
            starterCode: `# Analysoi ryhmäkokoja:
# groups = {}
# for a in days[0].arrivals:
#     gid = a['groupId']
#     if gid is not None:
#         groups[gid] = groups.get(gid, 0) + 1
# group_sizes = list(groups.values())

# Poisson-jakaumalle: varianssi ≈ keskiarvo

return 0.5`
        },

        scoring: {
            type: 'probability-mc',
            thresholds: [0.15, 0.08, 0.04]
        },

        trueDGP: {
            type: 'store-occupancy-mc',
            config: {
                baseArrivalRate: 0.35,
                meanStayTime: 18,
                groups: true,
                groupProbability: 0.5,
                groupSizeDistribution: 'poisson',
                meanGroupSize: 3.2
            },
            threshold: 30,
            metric: 'exceedance-probability'
        },

        insight: 'Kun ryhmäkoko on satunnaismuuttuja (Poisson), kokonaisasiakasmäärän varianssi kasvaa. Tämä johtaa suurempiin huippuihin.'
    },

    // =========================================================================
    // Level 4-7: Weekday patterns
    // 7-day observation, predict next 7 days
    // =========================================================================
    {
        id: 'store-4-7',
        name: 'Viikonpäivät',
        narrative: 'store-occupancy',
        story: 'Kaupan asiakasmäärä vaihtelee viikonpäivän mukaan. Lauantai on vilkkain, maanantai hiljaisin. Tutki viikon dataa ja ennusta seuraava viikko.',

        animation: {
            type: 'store-occupancy',
            config: {
                numDays: 7,  // Full week observation
                customLayout: STORE_LAYOUT,
                dgp: {
                    type: 'weekday',
                    baseArrivalRate: 0.4,
                    meanStayTime: 12,
                    weekdayEffects: true,
                    weekdayMultipliers: {
                        'Monday': 0.7,
                        'Tuesday': 0.8,
                        'Wednesday': 0.9,
                        'Thursday': 1.0,
                        'Friday': 1.3,
                        'Saturday': 1.8,
                        'Sunday': 1.4
                    }
                }
            }
        },

        question: {
            type: 'dsl',
            prompt: 'Anna todennäköisyys jokaiselle viikonpäivälle: millä todennäköisyydellä kaupassa on yli 15 asiakasta yhtä aikaa?',
            threshold: 15,
            starterCode: `# Data sisältää 7 päivää:
# days[0] = Maanantai, days[1] = Tiistai, ..., days[6] = Sunnuntai

# Jokaisella päivällä on:
# days[i].dayOfWeek - päivän nimi
# days[i].maxOccupancy - päivän suurin asiakasmäärä
# days[i].totalCustomers - päivän kokonaisasiakasmäärä

# Palauta lista 7 todennäköisyydestä (ma, ti, ke, to, pe, la, su)
return [0.3, 0.4, 0.5, 0.5, 0.6, 0.8, 0.7]`
        },

        scoring: {
            type: 'probability-mc-multiday',
            thresholds: [0.12, 0.07, 0.04]  // average error across 7 days
        },

        trueDGP: {
            type: 'store-occupancy-mc-multiday',
            config: {
                baseArrivalRate: 0.4,
                meanStayTime: 12,
                weekdayEffects: true,
                weekdayMultipliers: {
                    'Monday': 0.7,
                    'Tuesday': 0.8,
                    'Wednesday': 0.9,
                    'Thursday': 1.0,
                    'Friday': 1.3,
                    'Saturday': 1.8,
                    'Sunday': 1.4
                }
            },
            threshold: 15,
            metric: 'exceedance-probability-by-day'
        },

        insight: 'Viikonpäivämallit ovat yleisiä kaupassa. Lauantain vilkkaus voi olla yli 2x maanantain - tämä näkyy sekä asiakasmäärässä että huippujen todennäköisyydessä.'
    },

    // =========================================================================
    // Level 4-8: Crowding effects
    // People leave faster or don't enter when crowded
    // =========================================================================
    {
        id: 'store-4-8',
        name: 'Ruuhkan vaikutus',
        narrative: 'store-occupancy',
        story: 'Kun kauppa on ruuhkainen, osa asiakkaista päättää tulla myöhemmin, ja sisällä olevat lähtevät nopeammin. Tämä "itsesäätelevä" mekanismi pitää ruuhkat kurissa.',

        animation: {
            type: 'store-occupancy',
            config: {
                numDays: 1,
                customLayout: STORE_LAYOUT,
                dgp: {
                    type: 'peak-hours',
                    baseArrivalRate: 0.6,
                    peakTime: 17 * 60,
                    peakWidth: 120,
                    peakMultiplier: 2.5,
                    meanStayTime: 14,
                    crowdingEffect: true,
                    crowdThreshold: 15,     // effects start at 15 customers
                    crowdReduction: 0.4,    // 40% reduction in arrivals when very crowded
                    stayTimeReduction: 0.25 // 25% shorter stays when crowded
                }
            }
        },

        question: {
            type: 'dsl',
            prompt: 'Millä todennäköisyydellä kaupassa on huomenna jossain vaiheessa yli 20 asiakasta yhtä aikaa?',
            threshold: 20,
            starterCode: `# Ruuhkavaikutus näkyy datassa epäsuorasti:
# - Kun asiakkaita on paljon, uusia saapumisia tulee vähemmän
# - Käyntiajat ovat lyhyempiä ruuhka-aikaan

# Tutki occupancy-dataa ja etsi "tasanteita" jotka
# viittaavat ruuhkan rajoittavaan vaikutukseen

# Hyödyllinen: days[0].occupancy antaa {time, count} -parit

return 0.5`
        },

        scoring: {
            type: 'probability-mc',
            thresholds: [0.15, 0.08, 0.04]
        },

        trueDGP: {
            type: 'store-occupancy-mc',
            config: {
                type: 'peak-hours',
                baseArrivalRate: 0.6,
                peakTime: 17 * 60,
                peakWidth: 120,
                peakMultiplier: 2.5,
                meanStayTime: 14,
                crowdingEffect: true,
                crowdThreshold: 15,
                crowdReduction: 0.4,
                stayTimeReduction: 0.25
            },
            threshold: 20,
            metric: 'exceedance-probability'
        },

        insight: 'Ruuhkavaikutukset luovat "negatiivisen takaisinkytkennän": ruuhka hillitsee itseään. Ilman tätä vaikutusta huiput olisivat korkeampia. Tämä tekee mallintamisesta mielenkiintoisempaa!'
    }
];
