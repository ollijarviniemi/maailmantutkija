/**
 * Answer Resolver
 *
 * Resolves the "true answer" for a level from various sources:
 * - fromAnimation: reads a field from collected animation data
 * - static: uses a fixed value from level definition
 * - computed: calculates from data using a function
 *
 * This replaces the fragile answerFrom string lookup with explicit, typed config.
 */

const AnswerResolver = {
    /**
     * Resolve the true answer for a level
     *
     * @param {object} answerConfig - Answer configuration from level
     * @param {object} collectedData - Data collected from animation
     * @param {object} context - Level context (for computed answers)
     * @returns {*} The resolved answer value
     */
    resolve(answerConfig, collectedData = {}, context = {}) {
        // Support legacy answerFrom string format
        if (typeof answerConfig === 'string') {
            return this._resolveLegacy(answerConfig, collectedData);
        }

        // Support direct value (e.g., trueAnswer: 0.4375)
        if (typeof answerConfig === 'number') {
            return answerConfig;
        }

        if (!answerConfig || typeof answerConfig !== 'object') {
            throw new Error('Invalid answer configuration');
        }

        switch (answerConfig.type) {
            case 'fromAnimation':
                return this._resolveFromAnimation(answerConfig, collectedData);

            case 'static':
                return this._resolveStatic(answerConfig);

            case 'computed':
                return this._resolveComputed(answerConfig, collectedData, context);

            default:
                throw new Error(`Unknown answer type: ${answerConfig.type}`);
        }
    },

    /**
     * Resolve from animation data field
     */
    _resolveFromAnimation(config, collectedData) {
        const { field } = config;

        if (!field) {
            throw new Error('fromAnimation answer type requires "field" property');
        }

        const value = collectedData[field];

        if (value === undefined) {
            throw new Error(
                `Animation did not produce field '${field}'. ` +
                `Available: ${Object.keys(collectedData).join(', ') || 'none'}`
            );
        }

        return value;
    },

    /**
     * Resolve static value
     */
    _resolveStatic(config) {
        if (config.value === undefined) {
            throw new Error('static answer type requires "value" property');
        }
        return config.value;
    },

    /**
     * Resolve computed value
     */
    _resolveComputed(config, collectedData, context) {
        const { compute } = config;

        if (typeof compute !== 'function') {
            throw new Error('computed answer type requires "compute" function');
        }

        try {
            return compute(collectedData, context);
        } catch (e) {
            throw new Error(`Error computing answer: ${e.message}`);
        }
    },

    /**
     * Legacy support for answerFrom string
     * Maps old string values to data fields
     */
    _resolveLegacy(answerFrom, collectedData) {
        // Direct field access
        if (collectedData[answerFrom] !== undefined) {
            return collectedData[answerFrom];
        }

        // Common aliases
        const aliases = {
            'observedMean': ['mean', 'observedMean'],
            'burnedBeforeThreshold': ['burnedBeforeThreshold'],
            'averageWait': ['averageWait'],
            'actualDefectsInPrediction': ['actualDefectsInPrediction'],
            'productsCompleted': ['productsCompleted'],
            'probabilityLongWait': ['probabilityLongWait']
        };

        const candidates = aliases[answerFrom] || [answerFrom];
        for (const field of candidates) {
            if (collectedData[field] !== undefined) {
                return collectedData[field];
            }
        }

        console.warn(`Could not resolve answerFrom '${answerFrom}'. Available data:`, collectedData);
        return 0;
    },

    /**
     * Validate an answer configuration at load time
     *
     * @param {object} answerConfig - Answer configuration to validate
     * @param {string[]} availableOutputs - Outputs declared by the animation
     * @returns {object} { valid: boolean, errors: string[] }
     */
    validate(answerConfig, availableOutputs = []) {
        const errors = [];

        // Legacy string format - can't fully validate without knowing animation
        if (typeof answerConfig === 'string') {
            // Just a warning, not an error
            console.warn(`Level uses legacy answerFrom string: '${answerConfig}'`);
            return { valid: true, errors };
        }

        // Direct number value is always valid
        if (typeof answerConfig === 'number') {
            return { valid: true, errors };
        }

        if (!answerConfig || typeof answerConfig !== 'object') {
            errors.push('Answer config must be an object, string, or number');
            return { valid: false, errors };
        }

        switch (answerConfig.type) {
            case 'fromAnimation':
                if (!answerConfig.field) {
                    errors.push('fromAnimation answer type requires "field" property');
                } else if (availableOutputs.length > 0 && !availableOutputs.includes(answerConfig.field)) {
                    errors.push(
                        `Animation does not output '${answerConfig.field}'. ` +
                        `Available: ${availableOutputs.join(', ')}`
                    );
                }
                break;

            case 'static':
                if (answerConfig.value === undefined) {
                    errors.push('static answer type requires "value" property');
                }
                break;

            case 'computed':
                if (typeof answerConfig.compute !== 'function') {
                    errors.push('computed answer type requires "compute" function');
                }
                break;

            default:
                errors.push(`Unknown answer type: ${answerConfig.type}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnswerResolver;
}
