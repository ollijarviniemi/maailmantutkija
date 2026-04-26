/**
 * Narrative 9: Psykologiset testit (Psychology)
 *
 * Theme: Regression to mean, selection, measurement noise
 * Levels: 6
 */

LEVEL_CONTENT['psychology'] = [
    // Level 9-1: Testi → suoritus (Test predicts performance)
    {
        id: 'psych-9-1',
        name: 'Testi ennustaa',
        narrative: 'psychology',
        story: 'Pääsykoe ennustaa opintomenestystä, mutta ei täydellisesti. Tutki testin ja opintojen yhteyttä.',
        animation: {
            type: 'scatter',
            config: {
                dgp: {
                    trueAbility: { type: 'normal', mean: 100, std: 15 },
                    testScore: (ability) => ability + Distributions.sampleNormal(0, 10),
                    grades: (ability) => ability + Distributions.sampleNormal(0, 12)
                },
                numPoints: 80,
                xData: 'testScore',
                yData: 'grades',
                showRegressionLine: true,
                showCorrelation: true,
                xLabel: 'Pääsykoepisteet',
                yLabel: 'Opintomenestys'
            }
        },
        question: {
            prompt: 'Mikä on testin ja opintomenestyksen välinen korrelaatio?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [0.15, 0.08, 0.04]
        },
        answerFrom: 'observedCorrelation',
        insight: 'Korrelaatio mittaa lineaarista yhteyttä. Arvot lähellä 1 tarkoittavat vahvaa yhteyttä, lähellä 0 heikkoa. Tässä mittausvirhe laskee korrelaatiota.'
    },

    // Level 9-2: Regressio keskiarvoon (Regression to mean)
    {
        id: 'psych-9-2',
        name: 'Regressio keskiarvoon',
        narrative: 'psychology',
        story: 'Opiskelijat, jotka saivat kokeesta parhaat pisteet, eivät pärjänneet yhtä hyvin toisessa kokeessa. Miksi?',
        animation: {
            type: 'scatter',
            config: {
                dgp: {
                    trueAbility: { type: 'normal', mean: 100, std: 15 },
                    test1: (ability) => ability + Distributions.sampleNormal(0, 10),
                    test2: (ability) => ability + Distributions.sampleNormal(0, 10)
                },
                numPoints: 100,
                xData: 'test1',
                yData: 'test2',
                highlightTopDecile: true,
                showRegressionLine: true,
                xLabel: 'Ensimmäinen koe',
                yLabel: 'Toinen koe'
            }
        },
        question: {
            prompt: 'Jos ensimmäisessä kokeessa parhaan 10% keskiarvo oli 125, mikä on heidän odotettavissa oleva keskiarvo toisessa kokeessa?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [8, 4, 2]
        },
        answerFrom: 'topDecileSecondTestMean',
        insight: 'Regressio keskiarvoon! Äärimmäiset tulokset sisältävät usein onnea. Toisella mittauskerralla onni ei toistu, ja tulokset "regressoivat" kohti keskiarvoa.'
    },

    // Level 9-3: Valinta vääristää (Selection bias)
    {
        id: 'psych-9-3',
        name: 'Valintavääristymä',
        narrative: 'psychology',
        story: 'Vain pääsykokeessa 80+ pistettä saaneet pääsevät opiskelemaan. Miltä testin ja menestyksen yhteys näyttää opiskelijoiden joukossa?',
        animation: {
            type: 'scatter',
            config: {
                dgp: {
                    trueAbility: { type: 'normal', mean: 100, std: 15 },
                    testScore: (ability) => ability + Distributions.sampleNormal(0, 10),
                    grades: (ability) => ability + Distributions.sampleNormal(0, 12)
                },
                numPoints: 200,
                xData: 'testScore',
                yData: 'grades',
                selectionThreshold: 80,
                showFullData: true,
                showSelectedData: true,
                showBothCorrelations: true,
                xLabel: 'Pääsykoepisteet',
                yLabel: 'Opintomenestys'
            }
        },
        question: {
            prompt: 'Mikä on testin ja menestyksen korrelaatio vain VALITTUJEN opiskelijoiden joukossa (testi > 80)?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [0.2, 0.1, 0.05]
        },
        answerFrom: 'selectedCorrelation',
        insight: 'Valintaefekti! Kun kaikki opiskelijat ovat testissä hyviä, vaihtelua jää vain vähän, ja korrelaatio laskee dramaattisesti. Tämä ei tarkoita, ettei testi ennustaisi.'
    },

    // Level 9-4: Kaksi testiä (Multiple predictors)
    {
        id: 'psych-9-4',
        name: 'Kaksi testiä',
        narrative: 'psychology',
        story: 'Pääsykokeessa on kaksi osaa: matematiikka ja äidinkieli. Miten niiden tulokset yhdistetään parhaaksi ennusteeksi?',
        animation: {
            type: 'scatter',
            config: {
                dgp: {
                    trueAbility: { type: 'normal', mean: 100, std: 15 },
                    mathTest: (ability) => ability + Distributions.sampleNormal(0, 12),
                    langTest: (ability) => ability + Distributions.sampleNormal(0, 15),
                    grades: (ability) => ability + Distributions.sampleNormal(0, 10)
                },
                numPoints: 100,
                showWeightedCombination: true,
                showCoefficients: true
            }
        },
        question: {
            prompt: 'Jos matematiikan kerroin on 0.6 ja äidinkielen 0.4, mikä on ennuste opiskelijalle (math=110, lang=105)?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [5, 2.5, 1]
        },
        answer: {
            type: 'computed',
            compute: () => 0.6 * 110 + 0.4 * 105  // 66 + 42 = 108
        },
        insight: 'Painotettu keskiarvo: ennuste = 0.6 × math + 0.4 × lang. Painot valitaan niin, että ennusteen tarkkuus on paras mahdollinen.'
    },

    // Level 9-5: Harjoitusvaikutus (Practice effect)
    {
        id: 'psych-9-5',
        name: 'Harjoitusvaikutus',
        narrative: 'psychology',
        story: 'Testi tehdään kahdesti. Toisella kerralla pisteet ovat paremmat. Onko kyky parantunut vai onko kyse harjoitusvaikutuksesta?',
        animation: {
            type: 'scatter',
            config: {
                dgp: {
                    trueAbility: { type: 'normal', mean: 100, std: 15 },
                    test1: (ability) => ability + Distributions.sampleNormal(0, 10),
                    test2: (ability) => ability + 5 + Distributions.sampleNormal(0, 10)  // Practice effect +5
                },
                numPoints: 60,
                xData: 'test1',
                yData: 'test2',
                showDiagonalLine: true,
                showMeanImprovement: true,
                xLabel: 'Ensimmäinen koe',
                yLabel: 'Toinen koe'
            }
        },
        question: {
            prompt: 'Kuinka paljon pisteet paranevat keskimäärin toisella koekerralla (harjoitusvaikutus)?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [3, 1.5, 0.8]
        },
        answer: { type: 'static', value: 5 },
        insight: 'Harjoitusvaikutus on yleinen standardoiduissa testeissä. Tämä tulee huomioida, kun verrataan eri aikoina tehtyjä testejä!'
    },

    // Level 9-6: Reliabiliteetti (Test-retest reliability)
    {
        id: 'psych-9-6',
        name: 'Reliabiliteetti',
        narrative: 'psychology',
        story: 'Kuinka luotettava testi on? Reliabiliteetti mittaa, antaako testi saman tuloksen toistettaessa.',
        animation: {
            type: 'scatter',
            config: {
                dgp: {
                    trueAbility: { type: 'normal', mean: 100, std: 15 },
                    test1: (ability) => ability + Distributions.sampleNormal(0, 8),
                    test2: (ability) => ability + Distributions.sampleNormal(0, 8)
                },
                numPoints: 80,
                xData: 'test1',
                yData: 'test2',
                showCorrelation: true,
                showReliabilityBand: true,
                xLabel: 'Ensimmäinen koe',
                yLabel: 'Toinen koe (sama testi)'
            }
        },
        question: {
            prompt: 'Mikä on testin reliabiliteetti (test-retest korrelaatio)?',
            type: 'estimate'
        },
        scoring: {
            type: 'absolute',
            thresholds: [0.12, 0.06, 0.03]
        },
        answerFrom: 'testRetestCorrelation',
        insight: 'Reliabiliteetti = r². Jos r = 0.9, reliabiliteetti on 0.81, mikä tarkoittaa, että 81% testin vaihtelusta johtuu todellisista eroista, 19% mittausvirheestä.'
    }
];
