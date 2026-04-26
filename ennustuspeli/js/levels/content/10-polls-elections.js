/**
 * Narrative 10: Mielipidekyselyt ja vaalit (Polls & Elections)
 *
 * Theme: Sampling, Bayesian updating, systematic bias
 * Levels: 6
 */

LEVEL_CONTENT['polls-elections'] = [
    // Level 10-1: Gallup (Single poll)
    {
        id: 'poll-10-1',
        name: 'Gallup',
        narrative: 'polls-elections',
        story: 'Gallupin mukaan 52% kannattaa ehdokasta A. Otoskoko on 1000. Kuinka tarkka tämä arvio on?',
        animation: {
            type: 'poll',
            config: {
                trueSupport: 0.50,  // Unknown to player
                sampleSize: 1000,
                showSampleDistribution: true,
                showConfidenceInterval: true
            }
        },
        question: {
            prompt: 'Mikä on gallup-arvion keskivirhe (standard error) prosenttiyksiköissä?',
            type: 'estimate',
            unit: '%-yks.'
        },
        scoring: {
            type: 'absolute',
            thresholds: [0.8, 0.4, 0.2]
        },
        answer: {
            type: 'computed',
            compute: () => Math.sqrt(0.5 * 0.5 / 1000) * 100  // ~1.58%
        },
        insight: 'Otantavirhe: SE = √(p(1-p)/n). 1000 henkilön otoksella virhemarginaali on noin ±3 prosenttiyksikköä (95% luottamusväli).'
    },

    // Level 10-2: Usean gallupin yhdistäminen (Aggregation)
    {
        id: 'poll-10-2',
        name: 'Gallupien yhdistäminen',
        narrative: 'polls-elections',
        story: 'Kolme gallup-laitosta julkaisee tuloksia: 48%, 52%, 51%. Miten yhdistät nämä parhaaksi arvioksi?',
        animation: {
            type: 'poll',
            config: {
                polls: [
                    { name: 'Laitos A', result: 0.48, sampleSize: 800 },
                    { name: 'Laitos B', result: 0.52, sampleSize: 1200 },
                    { name: 'Laitos C', result: 0.51, sampleSize: 1000 }
                ],
                showWeightedAverage: true,
                showIndividualCIs: true
            }
        },
        question: {
            prompt: 'Mikä on painotettu keskiarvo (painot otoskokojen mukaan)?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [2, 1, 0.5]
        },
        answer: {
            type: 'computed',
            compute: () => {
                const total = 800 + 1200 + 1000;
                return (0.48 * 800 + 0.52 * 1200 + 0.51 * 1000) / total * 100;
            }
        },
        insight: 'Painotettu keskiarvo: suuremmat otokset saavat enemmän painoa. Meta-analyysi yhdistää monta tutkimusta tarkemmaksi arvioksi.'
    },

    // Level 10-3: Talon efekti (House effect)
    {
        id: 'poll-10-3',
        name: 'Talon efekti',
        narrative: 'polls-elections',
        story: 'Eri gallup-laitokset antavat systemaattisesti erilaisia tuloksia. Laitos X suosii aina oikeistoa +2%.',
        animation: {
            type: 'poll',
            config: {
                trueSupport: 0.50,
                pollsters: [
                    { name: 'Laitos X', bias: +0.02, sampleSize: 1000 },
                    { name: 'Laitos Y', bias: -0.01, sampleSize: 1000 },
                    { name: 'Laitos Z', bias: 0, sampleSize: 1000 }
                ],
                numPolls: 5,
                showHouseEffects: true
            }
        },
        question: {
            prompt: 'Jos poistat talon efektin laitoksen X tuloksesta (52%), mikä on korjattu arvio?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [1.5, 0.8, 0.4]
        },
        answer: { type: 'static', value: 50 },
        insight: 'Talon efekti on systemaattinen, ei satunnainen virhe. Se johtuu erilaisista menetelmistä. Korjaamalla talon efektit saat tarkemman kuvan.'
    },

    // Level 10-4: Ujo kannattaja (Shy voter)
    {
        id: 'poll-10-4',
        name: 'Ujo kannattaja',
        narrative: 'polls-elections',
        story: 'Jotkut eivät kerro todellista kantaansa gallupissa. Tämä "ujo kannattaja" -efekti voi vääristää tuloksia.',
        animation: {
            type: 'poll',
            config: {
                trueSupport: 0.48,
                reportedSupport: 0.45,  // Shy voter effect
                sampleSize: 2000,
                showGapVisualization: true,
                showHistoricalComparison: true
            }
        },
        question: {
            prompt: 'Gallup näyttää 45%, mutta historiallisesti tulos on ollut +3 prosenttiyksikköä korkeampi. Mikä on korjattu ennuste?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [2, 1, 0.5]
        },
        answer: { type: 'static', value: 48 },
        insight: 'Systemaattinen virhe on vakavampi kuin satunnaisvirhe, koska sitä ei voi pienentää otoskokoa kasvattamalla. Korjaukset perustuvat historialliseen dataan.'
    },

    // Level 10-5: Bayesilainen päivitys (Bayesian updating)
    {
        id: 'poll-10-5',
        name: 'Bayesilainen päivitys',
        narrative: 'polls-elections',
        story: 'Ennen galluppia uskoit kannatuksen olevan 50%. Uusi gallup näyttää 55% (n=500). Mikä on päivitetty uskomuksesi?',
        animation: {
            type: 'static-info',
            config: {
                priorMean: 0.50,
                priorStrength: 200,  // Equivalent sample size
                newData: { support: 0.55, sampleSize: 500 },
                showPriorPosterior: true,
                showUpdateAnimation: true
            }
        },
        question: {
            prompt: 'Mikä on posteriorin keskiarvo (päivitetty arvio)?',
            type: 'probability'
        },
        scoring: {
            type: 'probability',
            thresholds: [2, 1, 0.5]
        },
        answer: {
            type: 'computed',
            compute: () => {
                // Bayesian update: posterior mean = weighted average
                const priorWeight = 200;
                const dataWeight = 500;
                return (0.50 * priorWeight + 0.55 * dataWeight) / (priorWeight + dataWeight) * 100;
            }
        },
        insight: 'Bayesilainen päättely yhdistää aiemman tiedon (priori) ja uuden datan. Mitä enemmän dataa, sitä enemmän painoa se saa.'
    },

    // Level 10-6: Alueelliset korrelaatiot (Correlated errors)
    {
        id: 'poll-10-6',
        name: 'Alueelliset korrelaatiot',
        narrative: 'polls-elections',
        story: 'Vaalipiireissä virheet ovat korreloituneita. Jos gallup on väärässä yhdessä paikassa, se on todennäköisesti väärässä muuallakin.',
        animation: {
            type: 'poll',
            config: {
                regions: [
                    { name: 'Alue 1', poll: 0.52, weight: 0.3 },
                    { name: 'Alue 2', poll: 0.48, weight: 0.25 },
                    { name: 'Alue 3', poll: 0.51, weight: 0.25 },
                    { name: 'Alue 4', poll: 0.49, weight: 0.2 }
                ],
                correlationCoeff: 0.5,
                showCorrelatedErrors: true,
                showNationalEstimate: true
            }
        },
        question: {
            prompt: 'Jos gallup-virhe yhdessä alueessa on +3%, mikä on odotettu virhe toisessa alueessa (korrelaatio 0.5)?',
            type: 'estimate',
            unit: '%-yks.'
        },
        scoring: {
            type: 'absolute',
            thresholds: [1, 0.5, 0.25]
        },
        answer: { type: 'static', value: 1.5 },
        insight: 'Korreloituneet virheet: E[virhe₂ | virhe₁ = x] = ρ × x. Tämä tarkoittaa, että kansallinen virhe voi olla yllättävän suuri, vaikka jokaisen alueen gallup olisi "tarkka".'
    }
];
