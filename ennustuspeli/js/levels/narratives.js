/**
 * Narrative Definitions
 *
 * Defines the 11 narrative categories that organize levels.
 * Each narrative has a theme, progression, and list of level IDs.
 */

const NARRATIVES = [
    {
        id: 'flour-mill',
        name: 'Myllyn jauhopussit',
        icon: '🌾',
        theme: 'Normaalijakauma, keskiarvo, varianssi',
        description: 'Tutki jauhojen punnitsemista ja opi jakaumista.',
        concepts: ['normal', 'mean', 'std', 'clt', 'extrapolation'],
        difficulty: 1,
        levels: [
            'flour-1-1', 'flour-1-2', 'flour-1-3',
            'flour-1-4', 'flour-1-5', 'flour-1-6'
        ]
    },
    {
        id: 'lightbulbs',
        name: 'Hehkulamput',
        icon: '💡',
        theme: 'Vikaantumisjakaumat, elinikä',
        description: 'Tutki lamppujen elinikää ja erilaisia vikaantumismalleja.',
        concepts: ['exponential', 'weibull', 'hazard', 'memoryless', 'mixture'],
        difficulty: 2,
        levels: [
            'bulb-2-1', 'bulb-2-2', 'bulb-2-3',
            'bulb-2-4', 'bulb-2-5', 'bulb-2-6'
        ]
    },
    {
        id: 'factory-qc',
        name: 'Tehtaan laadunvalvonta',
        icon: '🏭',
        theme: 'Binomijakauma, yhdistetyt todennäköisyydet',
        description: 'Laadunvalvonnan matematiikkaa: vikatiheydet ja tarkastukset.',
        concepts: ['binomial', 'compound', 'bayes', 'stages'],
        difficulty: 2,
        levels: [
            'factory-3-1', 'factory-3-2', 'factory-3-3',
            'factory-3-4', 'factory-3-5', 'factory-3-6'
        ]
    },
    {
        id: 'store-occupancy',
        name: 'Kaupan asiakasmäärä',
        icon: '🏪',
        theme: 'Poisson-jakauma, kynnysylitystodennäköisyydet',
        description: 'Mallinna kaupan asiakasmääriä ja ennusta ruuhkahuippuja.',
        concepts: ['poisson', 'birth-death', 'threshold', 'seasonality', 'groups', 'crowding'],
        difficulty: 2,
        levels: [
            'store-4-1', 'store-4-2', 'store-4-3', 'store-4-4',
            'store-4-5', 'store-4-6', 'store-4-7', 'store-4-8'
        ]
    },
    {
        id: 'cafe-queue',
        name: 'Kahvilajono',
        icon: '☕',
        theme: 'Jonotusteoria, odotusajat',
        description: 'Tutki jonoja, palveluaikoja ja odottamista.',
        concepts: ['queueing', 'mm1', 'utilization', 'waiting'],
        difficulty: 3,
        levels: [
            'cafe-5-1', 'cafe-5-2', 'cafe-5-3',
            'cafe-5-4', 'cafe-5-5', 'cafe-5-6'
        ]
    },
    {
        id: 'product-sales',
        name: 'Tuotteiden myynti',
        icon: '📊',
        theme: 'Regressio, hintajousto',
        description: 'Mallinna myyntiä ja hinnan vaikutusta kysyntään.',
        concepts: ['regression', 'elasticity', 'threshold', 'multiple'],
        difficulty: 3,
        levels: [
            'sales-6-1', 'sales-6-2', 'sales-6-3',
            'sales-6-4', 'sales-6-5', 'sales-6-6'
        ]
    },
    {
        id: 'auction',
        name: 'Huutokauppa',
        icon: '🔨',
        theme: 'Monimuuttujaregressio, ääriarvot',
        description: 'Ennusta huutokauppahintoja eri tekijöiden perusteella.',
        concepts: ['multiple-regression', 'order-statistics', 'truncation'],
        difficulty: 4,
        levels: [
            'auction-7-1', 'auction-7-2', 'auction-7-3',
            'auction-7-4', 'auction-7-5', 'auction-7-6'
        ]
    },
    {
        id: 'sports-elo',
        name: 'Urheiluennustaminen',
        icon: '⚽',
        theme: 'ELO, sigmoid, turnaukset',
        description: 'Ennusta otteluiden ja turnausten tuloksia.',
        concepts: ['sigmoid', 'elo', 'compound', 'tournament'],
        difficulty: 4,
        levels: [
            'elo-8-1', 'elo-8-2', 'elo-8-3',
            'elo-8-4', 'elo-8-5', 'elo-8-6'
        ]
    },
    {
        id: 'psychology',
        name: 'Psykologiset testit',
        icon: '🧠',
        theme: 'Regressio keskiarvoon, mittausvirhe',
        description: 'Tutki testien ennustekykyä ja valintavääristymiä.',
        concepts: ['regression-to-mean', 'selection', 'reliability', 'noise'],
        difficulty: 4,
        levels: [
            'psych-9-1', 'psych-9-2', 'psych-9-3',
            'psych-9-4', 'psych-9-5', 'psych-9-6'
        ]
    },
    {
        id: 'polls-elections',
        name: 'Mielipidekyselyt ja vaalit',
        icon: '🗳️',
        theme: 'Otanta, Bayes, systemaattinen virhe',
        description: 'Yhdistä gallupeja ja päivitä uskomuksia.',
        concepts: ['sampling', 'bayesian', 'bias', 'aggregation'],
        difficulty: 5,
        levels: [
            'poll-10-1', 'poll-10-2', 'poll-10-3',
            'poll-10-4', 'poll-10-5', 'poll-10-6'
        ]
    },
    {
        id: 'traffic-bonus',
        name: 'BONUS: Liikenne',
        icon: '🚌',
        theme: 'Monimutkaiset systeemit',
        description: 'Avoin ympäristö liikenteen mallintamiseen.',
        concepts: ['complex-systems', 'emergence', 'simulation'],
        difficulty: 5,
        isBonus: true,
        levels: [
            'traffic-11-1', 'traffic-11-2', 'traffic-11-3', 'traffic-11-4'
        ]
    },
    {
        id: 'dsl-practice',
        name: 'DSL: Koodin kirjoitus',
        icon: '💻',
        theme: 'Jakaumien mallintaminen koodilla',
        description: 'Kirjoita koodia, joka palauttaa todennäköisyysjakaumia. Harjoittele eri jakaumatyyppejä.',
        concepts: ['dsl', 'coding', 'distributions', 'bayesian'],
        difficulty: 3,
        isBonus: true,
        levels: [
            'flour-1-1-dsl', 'bulb-2-1-dsl', 'factory-3-1-dsl', 'store-4-1-dsl',
            'cafe-5-1-dsl', 'sales-6-1-dsl', 'auction-7-1-dsl', 'elo-8-1-dsl',
            'psych-9-1-dsl', 'poll-10-1-dsl', 'traffic-11-1-dsl'
        ]
    }
];

/**
 * Narrative Registry
 */
const NarrativeRegistry = {
    _narratives: new Map(),
    _narrativeOrder: [],

    init() {
        for (const narrative of NARRATIVES) {
            this._narratives.set(narrative.id, narrative);
            this._narrativeOrder.push(narrative.id);
        }
    },

    get(id) {
        return this._narratives.get(id);
    },

    getAll() {
        return this._narrativeOrder.map(id => this._narratives.get(id));
    },

    getByIndex(index) {
        return this._narratives.get(this._narrativeOrder[index]);
    },

    count() {
        return this._narrativeOrder.length;
    },

    getLevelsForNarrative(narrativeId) {
        const narrative = this._narratives.get(narrativeId);
        return narrative ? narrative.levels : [];
    },

    getNarrativeForLevel(levelId) {
        for (const [id, narrative] of this._narratives) {
            if (narrative.levels.includes(levelId)) {
                return narrative;
            }
        }
        return null;
    },

    /**
     * Check if a narrative is unlocked based on progress
     */
    isUnlocked(narrativeId, progress = {}) {
        // DEBUG: All levels unlocked for testing
        return true;

        /* Original unlock logic:
        const index = this._narrativeOrder.indexOf(narrativeId);
        if (index === 0) return true; // First narrative always unlocked

        // Unlock if previous narrative has at least 3 stars total
        const prevNarrativeId = this._narrativeOrder[index - 1];
        const prevLevels = this.getLevelsForNarrative(prevNarrativeId);
        const starsEarned = prevLevels.reduce((sum, levelId) => {
            return sum + (progress[levelId]?.stars || 0);
        }, 0);

        return starsEarned >= 3;
        */
    },

    /**
     * Get progress stats for a narrative
     */
    getProgress(narrativeId, progress = {}) {
        const levels = this.getLevelsForNarrative(narrativeId);
        let completed = 0;
        let totalStars = 0;
        const maxStars = levels.length * 3;

        for (const levelId of levels) {
            const levelProgress = progress[levelId];
            if (levelProgress?.completed) completed++;
            totalStars += levelProgress?.stars || 0;
        }

        return {
            completed,
            total: levels.length,
            stars: totalStars,
            maxStars,
            percentage: levels.length > 0 ? Math.round(100 * completed / levels.length) : 0
        };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NARRATIVES, NarrativeRegistry };
}
