/**
 * Level Validator
 *
 * Validates level configurations at load time to catch errors early.
 * Checks that animation types, question types, scoring types, and
 * answer configurations are valid and consistent.
 */

const LevelValidator = {
    /**
     * Validate a single level
     *
     * @param {object} level - Level configuration
     * @returns {object} { valid: boolean, errors: string[], warnings: string[] }
     */
    validate(level) {
        const errors = [];
        const warnings = [];

        // Required fields
        if (!level.id) {
            errors.push('Level missing required field: id');
        }
        if (!level.name) {
            errors.push('Level missing required field: name');
        }

        // Animation validation
        if (!level.animation) {
            errors.push('Level missing required field: animation');
        } else {
            this._validateAnimation(level, errors, warnings);
        }

        // Question validation
        if (!level.question) {
            errors.push('Level missing required field: question');
        } else {
            this._validateQuestion(level, errors, warnings);
        }

        // Scoring validation
        if (!level.scoring) {
            errors.push('Level missing required field: scoring');
        } else {
            this._validateScoring(level, errors, warnings);
        }

        // Answer source validation
        this._validateAnswer(level, errors, warnings);

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    },

    /**
     * Validate animation configuration
     */
    _validateAnimation(level, errors, warnings) {
        const { animation } = level;

        if (!animation.type) {
            errors.push('Animation missing required field: type');
            return;
        }

        // Check if animation type is registered
        if (typeof AnimationRegistry !== 'undefined' && AnimationRegistry.has) {
            if (!AnimationRegistry.has(animation.type)) {
                errors.push(
                    `Unknown animation type: '${animation.type}'. ` +
                    `Available: ${AnimationRegistry.getTypes().join(', ')}`
                );
            }
        }
    },

    /**
     * Validate question configuration
     */
    _validateQuestion(level, errors, warnings) {
        const { question } = level;

        // Question type defaults to 'estimate'
        const qType = question.type || 'estimate';

        // DSL questions don't require a prompt
        if (!question.prompt && qType !== 'dsl') {
            errors.push('Question missing required field: prompt');
        }

        // Check if question handler exists
        if (typeof QuestionHandlers !== 'undefined' && QuestionHandlers.has) {
            if (!QuestionHandlers.has(qType)) {
                errors.push(
                    `Unknown question type: '${qType}'. ` +
                    `Available: ${QuestionHandlers.getTypes().join(', ')}`
                );
            }
        }

        // Code questions need template
        if (qType === 'code') {
            if (!question.template) {
                warnings.push('Code question missing template - will use empty editor');
            }
            if (!question.expectedFormat) {
                warnings.push('Code question missing expectedFormat - defaults to "number"');
            }
        }
    },

    /**
     * Validate scoring configuration
     */
    _validateScoring(level, errors, warnings) {
        const { scoring } = level;

        if (!scoring.type) {
            errors.push('Scoring missing required field: type');
            return;
        }

        // Check if scoring type is registered
        if (typeof Scoring !== 'undefined' && Scoring.has) {
            if (!Scoring.has(scoring.type)) {
                errors.push(
                    `Unknown scoring type: '${scoring.type}'. ` +
                    `Available: ${Scoring.getTypes().join(', ')}`
                );
            }
        }

        // Validate thresholds
        if (!scoring.thresholds || !Array.isArray(scoring.thresholds)) {
            errors.push('Scoring missing required field: thresholds (array)');
        } else if (scoring.thresholds.length !== 3) {
            errors.push('Scoring thresholds must be array of 3 values [1-star, 2-star, 3-star]');
        } else {
            // Thresholds should be in descending order (larger error = fewer stars)
            const [t1, t2, t3] = scoring.thresholds;
            if (!(t1 >= t2 && t2 >= t3)) {
                warnings.push('Scoring thresholds should be in descending order [1-star >= 2-star >= 3-star]');
            }
        }
    },

    /**
     * Validate answer source configuration
     */
    _validateAnswer(level, errors, warnings) {
        // Get answer config - can be from multiple sources
        // DSL levels use trueDGP as the answer source
        const answerConfig = level.answer || level.answerFrom || level.trueAnswer || level.trueDGP;

        if (answerConfig === undefined) {
            errors.push('Level must specify answer source: "answer", "answerFrom", "trueAnswer", or "trueDGP"');
            return;
        }

        // trueDGP is valid for DSL question types
        if (level.trueDGP && level.question?.type === 'dsl') {
            return; // Valid
        }

        // Legacy string format
        if (typeof answerConfig === 'string') {
            warnings.push(`Level '${level.id}' uses legacy answerFrom string. Consider migrating to answer: { type, field }`);
            return;
        }

        // Direct value (trueAnswer: 0.5)
        if (typeof answerConfig === 'number') {
            return; // Valid
        }

        // New answer object format
        if (typeof AnswerResolver !== 'undefined' && AnswerResolver.validate) {
            // Get outputs from animation if available
            let outputs = [];
            if (typeof AnimationRegistry !== 'undefined' && AnimationRegistry.getOutputs) {
                outputs = AnimationRegistry.getOutputs(level.animation?.type) || [];
            }

            const validation = AnswerResolver.validate(answerConfig, outputs);
            errors.push(...validation.errors);
        }
    },

    /**
     * Validate all levels in an array
     *
     * @param {object[]} levels - Array of level configurations
     * @returns {object} { valid: boolean, results: array, summary: object }
     */
    validateAll(levels) {
        const results = levels.map(level => ({
            id: level.id || '(no id)',
            ...this.validate(level)
        }));

        const invalid = results.filter(r => !r.valid);
        const withWarnings = results.filter(r => r.warnings.length > 0);

        const summary = {
            total: levels.length,
            valid: levels.length - invalid.length,
            invalid: invalid.length,
            withWarnings: withWarnings.length
        };

        // Log errors and warnings
        if (invalid.length > 0) {
            console.error(`Level validation failed for ${invalid.length} levels:`);
            invalid.forEach(r => {
                console.error(`  ${r.id}:`, r.errors);
            });
        }

        if (withWarnings.length > 0) {
            console.warn(`Level validation warnings for ${withWarnings.length} levels:`);
            withWarnings.forEach(r => {
                if (r.warnings.length > 0) {
                    console.warn(`  ${r.id}:`, r.warnings);
                }
            });
        }

        return {
            valid: invalid.length === 0,
            results,
            summary
        };
    },

    /**
     * Validate and throw if any levels are invalid
     */
    validateOrThrow(levels) {
        const { valid, summary } = this.validateAll(levels);

        if (!valid) {
            throw new Error(
                `${summary.invalid} of ${summary.total} levels failed validation. ` +
                `Check console for details.`
            );
        }

        return true;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelValidator;
}
