/**
 * Question Handler Registry
 *
 * Handles different question types (estimate, probability, code).
 * Each handler knows how to create its input UI, get/validate values,
 * and format answers for display.
 */

/**
 * Base class for question handlers
 */
class QuestionHandler {
    createInput(container, level) {
        throw new Error('QuestionHandler.createInput not implemented');
    }

    getValue(input) {
        throw new Error('QuestionHandler.getValue not implemented');
    }

    validate(value) {
        return { valid: true };
    }

    formatAnswer(value, level) {
        return String(value);
    }
}

/**
 * Handler for numeric estimate questions
 */
class EstimateHandler extends QuestionHandler {
    createInput(container, level) {
        return UI.createAnswerInput(container, {
            label: `Arviosi${level.question.unit ? ` (${level.question.unit})` : ''}:`,
            ...level.question.inputConfig
        });
    }

    getValue(input) {
        return input.getValue();
    }

    validate(value) {
        if (isNaN(value)) {
            return { valid: false, error: 'Anna kelvollinen luku!' };
        }
        return { valid: true };
    }

    formatAnswer(value, level) {
        const unit = level.question.unit || '';
        if (Number.isInteger(value)) {
            return `${value}${unit ? ' ' + unit : ''}`;
        }
        return `${value.toFixed(1)}${unit ? ' ' + unit : ''}`;
    }
}

/**
 * Handler for probability slider questions
 */
class ProbabilityHandler extends QuestionHandler {
    createInput(container, level) {
        return UI.createProbabilitySlider(container, {
            label: 'Arviosi (%):'
        });
    }

    getValue(input) {
        return input.getValue();
    }

    validate(value) {
        if (isNaN(value) || value < 0 || value > 100) {
            return { valid: false, error: 'Anna prosenttiarvo väliltä 0-100!' };
        }
        return { valid: true };
    }

    formatAnswer(value, level) {
        return `${value.toFixed(0)}%`;
    }
}

/**
 * Handler for DSL code questions (existing, uses DSL class)
 */
class CodeHandler extends QuestionHandler {
    createInput(container, level) {
        return UI.createCodeEditor(container, {
            title: level.question.prompt,
            initialCode: level.question.template || '',
            placeholder: '// Kirjoita koodisi tähän...'
        });
    }

    getValue(input) {
        return input.getValue(); // Returns code string
    }

    validate(value) {
        if (!value || !value.trim()) {
            return { valid: false, error: 'Kirjoita koodi!' };
        }
        return { valid: true };
    }

    formatAnswer(value, level) {
        // For code, just return a summary
        return '(koodi)';
    }

    /**
     * Execute the DSL code
     * @returns {object} { success: boolean, result: any, error?: string }
     */
    execute(code, context = {}) {
        try {
            const dsl = new DSL();
            const result = dsl.execute(code, context);

            if (result === null || result === undefined) {
                return {
                    success: false,
                    error: 'Koodi ei palauttanut arvoa. Käytä "return" lausetta.'
                };
            }

            return { success: true, result };
        } catch (e) {
            return { success: false, error: `Virhe: ${e.message}` };
        }
    }

    /**
     * Validate the result format
     */
    validateResult(result, expectedFormat) {
        switch (expectedFormat) {
            case 'distribution':
                if (!result || !result.__dist__) {
                    return {
                        valid: false,
                        error: 'Palauta jakauma, esim. return normal(1000, 25)'
                    };
                }
                return { valid: true };

            case 'number':
            default:
                if (typeof result !== 'number' || isNaN(result)) {
                    return {
                        valid: false,
                        error: 'Palauta luku, esim. return 0.76'
                    };
                }
                return { valid: true };
        }
    }
}

/**
 * Handler for DSL code questions (new probabilistic DSL with DSLEvaluator)
 * Uses the DSLEditor component and DSLEvaluator for execution.
 */
class DSLHandler extends QuestionHandler {
    createInput(container, level) {
        // DSL questions use DSLEditor component, created by Game.buildDSLUI
        // This method is called but the actual UI is built separately
        return {
            getValue: () => null,  // Placeholder - actual value retrieved from DSLEditor
            element: container
        };
    }

    getValue(input) {
        // DSL questions get their value differently - from the DSLEditor
        return null;
    }

    validate(value) {
        if (!value || !value.trim()) {
            return { valid: false, error: 'Kirjoita koodi!' };
        }
        return { valid: true };
    }

    formatAnswer(value, level) {
        return '(jakauma)';
    }

    /**
     * Execute the DSL code using DSLEvaluator
     * @returns {object} { success: boolean, result: any, error?: string }
     */
    execute(code, context = {}) {
        try {
            if (typeof DSLEvaluator === 'undefined') {
                throw new Error('DSLEvaluator not loaded');
            }

            const result = DSLEvaluator.evaluate(code, context);

            if (result === null || result === undefined) {
                return {
                    success: false,
                    error: 'Koodi ei palauttanut arvoa. Käytä "return" lausetta.'
                };
            }

            return { success: true, result };
        } catch (e) {
            return { success: false, error: `Virhe: ${e.message}` };
        }
    }

    /**
     * Validate the result is a distribution object
     */
    validateResult(result) {
        if (!result || typeof result !== 'object' || !result.type) {
            return {
                valid: false,
                error: 'Palauta jakauma, esim. return Normal(100, 15)'
            };
        }
        return { valid: true };
    }
}

/**
 * Question Handler Registry
 */
const QuestionHandlers = {
    _handlers: new Map(),

    /**
     * Register a question handler
     */
    register(type, handler) {
        if (!(handler instanceof QuestionHandler)) {
            throw new Error('Handler must extend QuestionHandler');
        }
        this._handlers.set(type, handler);
    },

    /**
     * Check if a handler type exists
     */
    has(type) {
        return this._handlers.has(type);
    },

    /**
     * Get a handler by type, falls back to 'estimate'
     */
    get(type) {
        return this._handlers.get(type) || this._handlers.get('estimate');
    },

    /**
     * Get all registered types
     */
    getTypes() {
        return Array.from(this._handlers.keys());
    }
};

// Register built-in handlers
QuestionHandlers.register('estimate', new EstimateHandler());
QuestionHandlers.register('probability', new ProbabilityHandler());
QuestionHandlers.register('code', new CodeHandler());
QuestionHandlers.register('dsl', new DSLHandler());

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QuestionHandler, QuestionHandlers };
}
