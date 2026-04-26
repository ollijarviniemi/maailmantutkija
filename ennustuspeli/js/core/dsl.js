/**
 * DSL Engine for Ennustuspeli
 *
 * A probabilistic DSL where:
 * - Variables can hold numbers, arrays, or distribution objects
 * - P(condition) evaluates probability via Monte Carlo
 * - Native distribution functions: normal(), exponential(), lognormal(), etc.
 */

// ============================================
// TOKEN TYPES
// ============================================

const TokenType = {
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    IDENTIFIER: 'IDENTIFIER',
    OPERATOR: 'OPERATOR',
    COMPARISON: 'COMPARISON',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    LBRACKET: 'LBRACKET',
    RBRACKET: 'RBRACKET',
    COMMA: 'COMMA',
    ASSIGN: 'ASSIGN',
    NEWLINE: 'NEWLINE',
    EOF: 'EOF',
    KEYWORD: 'KEYWORD'
};

const KEYWORDS = ['return', 'if', 'else', 'for', 'in', 'range', 'and', 'or', 'not'];

// ============================================
// LEXER
// ============================================

class Lexer {
    constructor(code) {
        this.code = code;
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
    }

    error(message) {
        throw new DSLError(message, this.line, this.column);
    }

    peek(offset = 0) {
        return this.code[this.pos + offset] || '\0';
    }

    advance() {
        const char = this.code[this.pos++];
        if (char === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        return char;
    }

    skipWhitespace() {
        while (this.pos < this.code.length) {
            const char = this.peek();
            if (char === ' ' || char === '\t' || char === '\r') {
                this.advance();
            } else if (char === '/' && this.peek(1) === '/') {
                // Skip comment until end of line
                while (this.pos < this.code.length && this.peek() !== '\n') {
                    this.advance();
                }
            } else {
                break;
            }
        }
    }

    readNumber() {
        const startLine = this.line;
        const startCol = this.column;
        let value = '';

        while (/[0-9]/.test(this.peek())) {
            value += this.advance();
        }

        if (this.peek() === '.' && /[0-9]/.test(this.peek(1))) {
            value += this.advance(); // the dot
            while (/[0-9]/.test(this.peek())) {
                value += this.advance();
            }
        }

        return {
            type: TokenType.NUMBER,
            value: parseFloat(value),
            line: startLine,
            column: startCol
        };
    }

    readIdentifier() {
        const startLine = this.line;
        const startCol = this.column;
        let value = '';

        // Allow Finnish characters in identifiers
        while (/[a-zA-ZäöåÄÖÅ_0-9]/.test(this.peek())) {
            value += this.advance();
        }

        const type = KEYWORDS.includes(value) ? TokenType.KEYWORD : TokenType.IDENTIFIER;

        return {
            type,
            value,
            line: startLine,
            column: startCol
        };
    }

    readString() {
        const startLine = this.line;
        const startCol = this.column;
        const quote = this.advance(); // opening quote
        let value = '';

        while (this.pos < this.code.length && this.peek() !== quote) {
            if (this.peek() === '\\') {
                this.advance();
                const escaped = this.advance();
                if (escaped === 'n') value += '\n';
                else if (escaped === 't') value += '\t';
                else value += escaped;
            } else {
                value += this.advance();
            }
        }

        if (this.peek() !== quote) {
            this.error('Unterminated string');
        }
        this.advance(); // closing quote

        return {
            type: TokenType.STRING,
            value,
            line: startLine,
            column: startCol
        };
    }

    tokenize() {
        while (this.pos < this.code.length) {
            this.skipWhitespace();

            if (this.pos >= this.code.length) break;

            const char = this.peek();
            const startLine = this.line;
            const startCol = this.column;

            // Newline
            if (char === '\n') {
                this.advance();
                this.tokens.push({ type: TokenType.NEWLINE, value: '\n', line: startLine, column: startCol });
                continue;
            }

            // Number
            if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(this.peek(1)))) {
                this.tokens.push(this.readNumber());
                continue;
            }

            // Identifier or keyword
            if (/[a-zA-ZäöåÄÖÅ_]/.test(char)) {
                this.tokens.push(this.readIdentifier());
                continue;
            }

            // String
            if (char === '"' || char === "'") {
                this.tokens.push(this.readString());
                continue;
            }

            // Two-character operators
            const twoChar = char + this.peek(1);
            if (['==', '!=', '<=', '>=', '**'].includes(twoChar)) {
                this.advance();
                this.advance();
                const type = ['==', '!=', '<=', '>='].includes(twoChar) ? TokenType.COMPARISON : TokenType.OPERATOR;
                this.tokens.push({ type, value: twoChar, line: startLine, column: startCol });
                continue;
            }

            // Single character tokens
            if (char === '(') {
                this.advance();
                this.tokens.push({ type: TokenType.LPAREN, value: '(', line: startLine, column: startCol });
                continue;
            }
            if (char === ')') {
                this.advance();
                this.tokens.push({ type: TokenType.RPAREN, value: ')', line: startLine, column: startCol });
                continue;
            }
            if (char === '[') {
                this.advance();
                this.tokens.push({ type: TokenType.LBRACKET, value: '[', line: startLine, column: startCol });
                continue;
            }
            if (char === ']') {
                this.advance();
                this.tokens.push({ type: TokenType.RBRACKET, value: ']', line: startLine, column: startCol });
                continue;
            }
            if (char === ',') {
                this.advance();
                this.tokens.push({ type: TokenType.COMMA, value: ',', line: startLine, column: startCol });
                continue;
            }
            if (char === '=') {
                this.advance();
                this.tokens.push({ type: TokenType.ASSIGN, value: '=', line: startLine, column: startCol });
                continue;
            }
            if (['+', '-', '*', '/', '%'].includes(char)) {
                this.advance();
                this.tokens.push({ type: TokenType.OPERATOR, value: char, line: startLine, column: startCol });
                continue;
            }
            if (['<', '>'].includes(char)) {
                this.advance();
                this.tokens.push({ type: TokenType.COMPARISON, value: char, line: startLine, column: startCol });
                continue;
            }

            this.error(`Unexpected character: ${char}`);
        }

        this.tokens.push({ type: TokenType.EOF, value: null, line: this.line, column: this.column });
        return this.tokens;
    }
}

// ============================================
// AST NODE TYPES
// ============================================

class ASTNode {
    constructor(type, props = {}) {
        this.type = type;
        Object.assign(this, props);
    }
}

// ============================================
// PARSER
// ============================================

class Parser {
    constructor(tokens) {
        this.tokens = tokens.filter(t => t.type !== TokenType.NEWLINE || t.value === '\n');
        this.pos = 0;
    }

    error(message, token = null) {
        const t = token || this.peek();
        throw new DSLError(message, t.line, t.column);
    }

    peek(offset = 0) {
        return this.tokens[this.pos + offset] || { type: TokenType.EOF };
    }

    advance() {
        return this.tokens[this.pos++];
    }

    expect(type, value = null) {
        const token = this.peek();
        if (token.type !== type || (value !== null && token.value !== value)) {
            this.error(`Expected ${value || type}, got ${token.value || token.type}`);
        }
        return this.advance();
    }

    match(type, value = null) {
        const token = this.peek();
        if (token.type === type && (value === null || token.value === value)) {
            return this.advance();
        }
        return null;
    }

    skipNewlines() {
        while (this.peek().type === TokenType.NEWLINE) {
            this.advance();
        }
    }

    parse() {
        const statements = [];

        this.skipNewlines();

        while (this.peek().type !== TokenType.EOF) {
            statements.push(this.parseStatement());
            this.skipNewlines();
        }

        return new ASTNode('Program', { statements });
    }

    parseStatement() {
        const token = this.peek();

        // Return statement
        if (token.type === TokenType.KEYWORD && token.value === 'return') {
            this.advance();
            const value = this.parseExpression();
            return new ASTNode('Return', { value });
        }

        // For loop
        if (token.type === TokenType.KEYWORD && token.value === 'for') {
            return this.parseForLoop();
        }

        // If statement
        if (token.type === TokenType.KEYWORD && token.value === 'if') {
            return this.parseIfStatement();
        }

        // Assignment or expression
        if (token.type === TokenType.IDENTIFIER) {
            const next = this.peek(1);
            if (next.type === TokenType.ASSIGN) {
                const name = this.advance().value;
                this.advance(); // =
                const value = this.parseExpression();
                return new ASTNode('Assignment', { name, value });
            }
        }

        // Expression statement
        return new ASTNode('Expression', { value: this.parseExpression() });
    }

    parseForLoop() {
        this.expect(TokenType.KEYWORD, 'for');
        const variable = this.expect(TokenType.IDENTIFIER).value;
        this.expect(TokenType.KEYWORD, 'in');

        // range(n) or iterable
        const iterable = this.parseExpression();

        this.expect(TokenType.OPERATOR, ':');
        this.skipNewlines();

        // Parse indented body (simplified: just read until dedent)
        const body = [];
        while (this.peek().type !== TokenType.EOF &&
               this.peek().type !== TokenType.KEYWORD) {
            body.push(this.parseStatement());
            this.skipNewlines();
        }

        return new ASTNode('ForLoop', { variable, iterable, body });
    }

    parseIfStatement() {
        this.expect(TokenType.KEYWORD, 'if');
        const condition = this.parseExpression();
        this.expect(TokenType.OPERATOR, ':');
        this.skipNewlines();

        const thenBody = [this.parseStatement()];
        this.skipNewlines();

        let elseBody = null;
        if (this.match(TokenType.KEYWORD, 'else')) {
            this.expect(TokenType.OPERATOR, ':');
            this.skipNewlines();
            elseBody = [this.parseStatement()];
        }

        return new ASTNode('IfStatement', { condition, thenBody, elseBody });
    }

    parseExpression() {
        return this.parseOr();
    }

    parseOr() {
        let left = this.parseAnd();

        while (this.match(TokenType.KEYWORD, 'or')) {
            const right = this.parseAnd();
            left = new ASTNode('BinaryOp', { op: 'or', left, right });
        }

        return left;
    }

    parseAnd() {
        let left = this.parseNot();

        while (this.match(TokenType.KEYWORD, 'and')) {
            const right = this.parseNot();
            left = new ASTNode('BinaryOp', { op: 'and', left, right });
        }

        return left;
    }

    parseNot() {
        if (this.match(TokenType.KEYWORD, 'not')) {
            const operand = this.parseNot();
            return new ASTNode('UnaryOp', { op: 'not', operand });
        }
        return this.parseComparison();
    }

    parseComparison() {
        let left = this.parseAddSub();

        while (this.peek().type === TokenType.COMPARISON) {
            const op = this.advance().value;
            const right = this.parseAddSub();
            left = new ASTNode('BinaryOp', { op, left, right });
        }

        return left;
    }

    parseAddSub() {
        let left = this.parseMulDiv();

        while (this.peek().type === TokenType.OPERATOR &&
               ['+', '-'].includes(this.peek().value)) {
            const op = this.advance().value;
            const right = this.parseMulDiv();
            left = new ASTNode('BinaryOp', { op, left, right });
        }

        return left;
    }

    parseMulDiv() {
        let left = this.parsePower();

        while (this.peek().type === TokenType.OPERATOR &&
               ['*', '/', '%'].includes(this.peek().value)) {
            const op = this.advance().value;
            const right = this.parsePower();
            left = new ASTNode('BinaryOp', { op, left, right });
        }

        return left;
    }

    parsePower() {
        let left = this.parseUnary();

        if (this.peek().type === TokenType.OPERATOR && this.peek().value === '**') {
            this.advance();
            const right = this.parsePower(); // Right associative
            left = new ASTNode('BinaryOp', { op: '**', left, right });
        }

        return left;
    }

    parseUnary() {
        if (this.peek().type === TokenType.OPERATOR && this.peek().value === '-') {
            this.advance();
            const operand = this.parseUnary();
            return new ASTNode('UnaryOp', { op: '-', operand });
        }
        return this.parseCall();
    }

    parseCall() {
        let expr = this.parsePrimary();

        while (true) {
            if (this.match(TokenType.LPAREN)) {
                const args = [];
                if (this.peek().type !== TokenType.RPAREN) {
                    args.push(this.parseExpression());
                    while (this.match(TokenType.COMMA)) {
                        args.push(this.parseExpression());
                    }
                }
                this.expect(TokenType.RPAREN);
                expr = new ASTNode('Call', { callee: expr, args });
            } else if (this.match(TokenType.LBRACKET)) {
                const index = this.parseExpression();
                this.expect(TokenType.RBRACKET);
                expr = new ASTNode('Index', { object: expr, index });
            } else {
                break;
            }
        }

        return expr;
    }

    parsePrimary() {
        const token = this.peek();

        // Number
        if (token.type === TokenType.NUMBER) {
            this.advance();
            return new ASTNode('Number', { value: token.value });
        }

        // String
        if (token.type === TokenType.STRING) {
            this.advance();
            return new ASTNode('String', { value: token.value });
        }

        // Identifier
        if (token.type === TokenType.IDENTIFIER) {
            this.advance();
            return new ASTNode('Identifier', { name: token.value });
        }

        // Parenthesized expression
        if (token.type === TokenType.LPAREN) {
            this.advance();
            const expr = this.parseExpression();
            this.expect(TokenType.RPAREN);
            return expr;
        }

        // Array literal
        if (token.type === TokenType.LBRACKET) {
            this.advance();
            const elements = [];
            if (this.peek().type !== TokenType.RBRACKET) {
                elements.push(this.parseExpression());
                while (this.match(TokenType.COMMA)) {
                    elements.push(this.parseExpression());
                }
            }
            this.expect(TokenType.RBRACKET);
            return new ASTNode('Array', { elements });
        }

        this.error(`Unexpected token: ${token.value || token.type}`);
    }
}

// ============================================
// INTERPRETER
// ============================================

class Interpreter {
    constructor(context = {}) {
        this.globals = { ...context };
        this.scopes = [this.globals];
        this.functions = {};
        this.distributions = {};
        this.lastSimulation = null;

        this.setupBuiltins();
    }

    get scope() {
        return this.scopes[this.scopes.length - 1];
    }

    pushScope() {
        this.scopes.push(Object.create(this.scope));
    }

    popScope() {
        this.scopes.pop();
    }

    error(message) {
        throw new DSLError(message);
    }

    setupBuiltins() {
        // Statistical functions
        this.functions['mean'] = this.functions['keskiarvo'] = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) {
                this.error('mean() vaatii ei-tyhjän listan');
            }
            return arr.reduce((a, b) => a + b, 0) / arr.length;
        };

        this.functions['std'] = this.functions['keskihajonta'] = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) {
                this.error('std() vaatii ei-tyhjän listan');
            }
            const m = this.functions.mean(arr);
            const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length;
            return Math.sqrt(variance);
        };

        this.functions['var'] = this.functions['varianssi'] = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) {
                this.error('var() vaatii ei-tyhjän listan');
            }
            const m = this.functions.mean(arr);
            return arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length;
        };

        this.functions['sum'] = this.functions['summa'] = (arr) => {
            if (!Array.isArray(arr)) this.error('sum() vaatii listan');
            return arr.reduce((a, b) => a + b, 0);
        };

        this.functions['count'] = this.functions['lukumäärä'] = (arr) => {
            if (!Array.isArray(arr)) this.error('count() vaatii listan');
            return arr.length;
        };

        this.functions['min'] = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) {
                this.error('min() vaatii ei-tyhjän listan');
            }
            return Math.min(...arr);
        };

        this.functions['max'] = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) {
                this.error('max() vaatii ei-tyhjän listan');
            }
            return Math.max(...arr);
        };

        this.functions['median'] = this.functions['mediaani'] = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) {
                this.error('median() vaatii ei-tyhjän listan');
            }
            const sorted = [...arr].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        };

        // Math functions
        this.functions['sqrt'] = Math.sqrt;
        this.functions['abs'] = Math.abs;
        this.functions['log'] = Math.log;
        this.functions['exp'] = Math.exp;
        this.functions['floor'] = Math.floor;
        this.functions['ceil'] = Math.ceil;
        this.functions['round'] = Math.round;

        // Range function
        this.functions['range'] = (n) => {
            if (typeof n !== 'number' || n < 0) {
                this.error('range() vaatii positiivisen luvun');
            }
            return Array.from({ length: Math.floor(n) }, (_, i) => i);
        };

        // Distribution constructors (return distribution objects)
        this.functions['normal'] = this.functions['normaali'] = (mean, std) => {
            if (typeof mean !== 'number') this.error('normal() vaatii numeerisen keskiarvon');
            if (typeof std !== 'number' || std <= 0) this.error('normal() vaatii positiivisen keskihajonnan');
            return { __dist__: true, type: 'normal', mean, std };
        };

        this.functions['exponential'] = this.functions['eksponentti'] = (mean) => {
            if (typeof mean !== 'number' || mean <= 0) this.error('exponential() vaatii positiivisen keskiarvon');
            return { __dist__: true, type: 'exponential', mean };
        };

        this.functions['lognormal'] = this.functions['lognormaali'] = (mean, std) => {
            if (typeof mean !== 'number' || mean <= 0) this.error('lognormal() vaatii positiivisen keskiarvon');
            if (typeof std !== 'number' || std <= 0) this.error('lognormal() vaatii positiivisen keskihajonnan');
            return { __dist__: true, type: 'lognormal', mean, std };
        };

        this.functions['uniform'] = this.functions['tasajakauma'] = (a, b) => {
            if (typeof a !== 'number' || typeof b !== 'number') {
                this.error('uniform() vaatii kaksi lukua');
            }
            if (a >= b) this.error('uniform() vaatii a < b');
            return { __dist__: true, type: 'uniform', min: a, max: b };
        };

        this.functions['binomial'] = this.functions['binomi'] = (n, p) => {
            if (typeof n !== 'number' || n < 0) this.error('binomial() vaatii positiivisen n');
            if (typeof p !== 'number' || p < 0 || p > 1) this.error('binomial() vaatii p välillä 0-1');
            return { __dist__: true, type: 'binomial', n: Math.floor(n), p };
        };

        this.functions['poisson'] = (lambda) => {
            if (typeof lambda !== 'number' || lambda <= 0) {
                this.error('poisson() vaatii positiivisen lambdan');
            }
            return { __dist__: true, type: 'poisson', lambda };
        };

        // Weibull distribution (for failure modeling)
        this.functions['weibull'] = (shape, scale) => {
            if (typeof shape !== 'number' || shape <= 0) {
                this.error('weibull() vaatii positiivisen muotoparametrin');
            }
            if (typeof scale !== 'number' || scale <= 0) {
                this.error('weibull() vaatii positiivisen skaalaparametrin');
            }
            return { __dist__: true, type: 'weibull', shape, scale };
        };

        // Student's t distribution (heavy tails)
        this.functions['studentT'] = this.functions['t'] = (df, loc = 0, scale = 1) => {
            if (typeof df !== 'number' || df <= 0) {
                this.error('studentT() vaatii positiivisen vapausasteen');
            }
            return { __dist__: true, type: 'studentT', df, loc, scale };
        };

        // Beta distribution (for probabilities and proportions)
        this.functions['beta'] = (alpha, beta) => {
            if (typeof alpha !== 'number' || alpha <= 0) {
                this.error('beta() vaatii positiivisen alpha:n');
            }
            if (typeof beta !== 'number' || beta <= 0) {
                this.error('beta() vaatii positiivisen beta:n');
            }
            return { __dist__: true, type: 'beta', alpha, beta };
        };

        // Gamma distribution
        this.functions['gamma'] = (shape, scale = 1) => {
            if (typeof shape !== 'number' || shape <= 0) {
                this.error('gamma() vaatii positiivisen muotoparametrin');
            }
            if (typeof scale !== 'number' || scale <= 0) {
                this.error('gamma() vaatii positiivisen skaalaparametrin');
            }
            return { __dist__: true, type: 'gamma', shape, scale };
        };

        // Mixture distribution
        this.functions['mixture'] = this.functions['sekoitus'] = (weights, distributions) => {
            if (!Array.isArray(weights) || !Array.isArray(distributions)) {
                this.error('mixture() vaatii listat painoista ja jakaumista');
            }
            if (weights.length !== distributions.length) {
                this.error('mixture() vaatii yhtä monta painoa ja jakaumaa');
            }
            for (const d of distributions) {
                if (!d || !d.__dist__) {
                    this.error('mixture() vaatii jakaumia');
                }
            }
            return { __dist__: true, type: 'mixture', weights, distributions };
        };

        // Sample from distribution
        this.functions['sample'] = this.functions['otos'] = (dist, n = 1) => {
            if (!dist || !dist.__dist__) {
                this.error('sample() vaatii jakauman');
            }
            if (n === 1) {
                return this.sampleOnce(dist);
            }
            return Array.from({ length: n }, () => this.sampleOnce(dist));
        };

        // P() function - evaluates probability
        this.functions['P'] = (condition) => {
            return this.evaluateProbability(condition);
        };

        // ============================================
        // CDF FUNCTIONS (cumulative distribution functions)
        // ============================================

        this.functions['normalCDF'] = (x, mean = 0, std = 1) => {
            return Distributions.normalCDF(x, mean, std);
        };

        this.functions['exponentialCDF'] = (x, mean) => {
            return Distributions.exponentialCDF(x, mean);
        };

        this.functions['weibullCDF'] = (x, shape, scale) => {
            return Distributions.weibullCDF(x, shape, scale);
        };

        this.functions['binomialCDF'] = (k, n, p) => {
            return Distributions.binomialCDF(k, n, p);
        };

        this.functions['poissonCDF'] = (k, lambda) => {
            return Distributions.poissonCDF(k, lambda);
        };

        // ============================================
        // UTILITY FUNCTIONS
        // ============================================

        // Sigmoid function (for ELO, logistic regression)
        this.functions['sigmoid'] = this.functions['logistic'] = (x) => {
            return Distributions.sigmoid(x);
        };

        // ELO win probability
        this.functions['eloP'] = this.functions['eloWinP'] = (ratingA, ratingB, k = 400) => {
            return Distributions.eloWinProbability(ratingA, ratingB, k);
        };

        // Power function (explicit, in addition to **)
        this.functions['pow'] = Math.pow;

        // Additional array functions
        this.functions['filter'] = (arr, fn) => {
            if (!Array.isArray(arr)) this.error('filter() vaatii listan');
            // fn is a threshold or condition - simplified version
            return arr.filter(x => fn(x));
        };

        this.functions['length'] = this.functions['len'] = (arr) => {
            if (!Array.isArray(arr)) this.error('len() vaatii listan');
            return arr.length;
        };

        // Quantile function
        this.functions['quantile'] = this.functions['kvantiili'] = (arr, p) => {
            if (!Array.isArray(arr) || arr.length === 0) {
                this.error('quantile() vaatii ei-tyhjän listan');
            }
            if (typeof p !== 'number' || p < 0 || p > 1) {
                this.error('quantile() vaatii p välillä 0-1');
            }
            const sorted = [...arr].sort((a, b) => a - b);
            const idx = (sorted.length - 1) * p;
            const lower = Math.floor(idx);
            const upper = Math.ceil(idx);
            if (lower === upper) return sorted[lower];
            return sorted[lower] * (upper - idx) + sorted[upper] * (idx - lower);
        };

        // Spread/range of data (max - min)
        this.functions['spread'] = this.functions['vaihteluväli'] = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) {
                this.error('spread() vaatii ei-tyhjän listan');
            }
            return Math.max(...arr) - Math.min(...arr);
        };

        // Covariance
        this.functions['cov'] = this.functions['kovarianssi'] = (arr1, arr2) => {
            if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
                this.error('cov() vaatii kaksi listaa');
            }
            if (arr1.length !== arr2.length || arr1.length === 0) {
                this.error('cov() vaatii samanpituiset ei-tyhjät listat');
            }
            const mean1 = arr1.reduce((a, b) => a + b, 0) / arr1.length;
            const mean2 = arr2.reduce((a, b) => a + b, 0) / arr2.length;
            let sum = 0;
            for (let i = 0; i < arr1.length; i++) {
                sum += (arr1[i] - mean1) * (arr2[i] - mean2);
            }
            return sum / arr1.length;
        };

        // Correlation coefficient
        this.functions['cor'] = this.functions['korrelaatio'] = (arr1, arr2) => {
            const cov = this.functions.cov(arr1, arr2);
            const std1 = this.functions.std(arr1);
            const std2 = this.functions.std(arr2);
            if (std1 === 0 || std2 === 0) return 0;
            return cov / (std1 * std2);
        };
    }

    // Register a custom simulation function
    registerSimulation(name, fn) {
        this.functions[name] = (...args) => {
            return { __dist__: true, type: 'simulation', name, args, fn };
        };
    }

    sampleOnce(dist) {
        switch (dist.type) {
            case 'normal':
                return Distributions.sampleNormal(dist.mean, dist.std);
            case 'exponential':
                return Distributions.sampleExponential(dist.mean);
            case 'lognormal':
                return Distributions.sampleLognormal(dist.mean, dist.std);
            case 'uniform':
                return Distributions.sampleUniform(dist.min, dist.max);
            case 'binomial':
                return Distributions.sampleBinomial(dist.n, dist.p);
            case 'poisson':
                return Distributions.samplePoisson(dist.lambda);
            case 'weibull':
                return Distributions.sampleWeibull(dist.shape, dist.scale);
            case 'studentT':
                return Distributions.sampleStudentT(dist.df, dist.loc, dist.scale);
            case 'beta':
                return Distributions.sampleBeta(dist.alpha, dist.beta);
            case 'gamma':
                return Distributions.sampleGamma(dist.shape, dist.scale);
            case 'mixture':
                return Distributions.sampleMixture(dist.weights, dist.distributions);
            case 'simulation':
                return dist.fn(...dist.args);
            default:
                this.error(`Tuntematon jakauma: ${dist.type}`);
        }
    }

    evaluateProbability(condition) {
        if (!condition || !condition.__condition__) {
            this.error('P() vaatii ehdon (esim. x > 10)');
        }

        const { dist, op, threshold } = condition;
        const n = 10000;
        let count = 0;

        for (let i = 0; i < n; i++) {
            const sample = this.sampleOnce(dist);
            if (this.checkCondition(sample, op, threshold)) {
                count++;
            }
        }

        this.lastSimulation = { numSimulations: n, countPassing: count };
        return count / n;
    }

    checkCondition(value, op, threshold) {
        switch (op) {
            case '>': return value > threshold;
            case '<': return value < threshold;
            case '>=': return value >= threshold;
            case '<=': return value <= threshold;
            case '==': return Math.abs(value - threshold) < 1e-9;
            case '!=': return Math.abs(value - threshold) >= 1e-9;
            default: return false;
        }
    }

    execute(ast) {
        if (ast.type !== 'Program') {
            this.error('Invalid program');
        }

        let result = null;
        for (const stmt of ast.statements) {
            result = this.executeStatement(stmt);
            if (result !== null && result.__return__) {
                return result.value;
            }
        }
        return result;
    }

    executeStatement(node) {
        switch (node.type) {
            case 'Assignment':
                this.scope[node.name] = this.evaluate(node.value);
                return null;

            case 'Return':
                return { __return__: true, value: this.evaluate(node.value) };

            case 'Expression':
                return this.evaluate(node.value);

            case 'ForLoop':
                return this.executeForLoop(node);

            case 'IfStatement':
                return this.executeIfStatement(node);

            default:
                this.error(`Unknown statement type: ${node.type}`);
        }
    }

    executeForLoop(node) {
        const iterable = this.evaluate(node.iterable);
        if (!Array.isArray(iterable)) {
            this.error('for-silmukan kohteen tulee olla lista');
        }

        this.pushScope();
        let result = null;

        for (const item of iterable) {
            this.scope[node.variable] = item;
            for (const stmt of node.body) {
                result = this.executeStatement(stmt);
                if (result && result.__return__) {
                    this.popScope();
                    return result;
                }
            }
        }

        this.popScope();
        return result;
    }

    executeIfStatement(node) {
        const condition = this.evaluate(node.condition);

        if (condition) {
            for (const stmt of node.thenBody) {
                const result = this.executeStatement(stmt);
                if (result && result.__return__) return result;
            }
        } else if (node.elseBody) {
            for (const stmt of node.elseBody) {
                const result = this.executeStatement(stmt);
                if (result && result.__return__) return result;
            }
        }

        return null;
    }

    evaluate(node) {
        switch (node.type) {
            case 'Number':
                return node.value;

            case 'String':
                return node.value;

            case 'Identifier':
                if (node.name in this.scope) {
                    return this.scope[node.name];
                }
                if (node.name in this.functions) {
                    return { __func__: true, name: node.name };
                }
                this.error(`Tuntematon muuttuja: ${node.name}`);
                break;

            case 'Array':
                return node.elements.map(e => this.evaluate(e));

            case 'BinaryOp':
                return this.evaluateBinaryOp(node);

            case 'UnaryOp':
                return this.evaluateUnaryOp(node);

            case 'Call':
                return this.evaluateCall(node);

            case 'Index':
                const obj = this.evaluate(node.object);
                const idx = this.evaluate(node.index);
                if (!Array.isArray(obj)) {
                    this.error('Indeksointi vaatii listan');
                }
                return obj[idx];

            default:
                this.error(`Unknown node type: ${node.type}`);
        }
    }

    evaluateBinaryOp(node) {
        const left = this.evaluate(node.left);
        const right = this.evaluate(node.right);

        // Check if this is a condition for P()
        if (left && left.__dist__ && ['>', '<', '>=', '<=', '==', '!='].includes(node.op)) {
            return { __condition__: true, dist: left, op: node.op, threshold: right };
        }

        switch (node.op) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/':
                if (right === 0) this.error('Jako nollalla');
                return left / right;
            case '%': return left % right;
            case '**': return Math.pow(left, right);
            case '>': return left > right;
            case '<': return left < right;
            case '>=': return left >= right;
            case '<=': return left <= right;
            case '==': return left === right;
            case '!=': return left !== right;
            case 'and': return left && right;
            case 'or': return left || right;
            default:
                this.error(`Unknown operator: ${node.op}`);
        }
    }

    evaluateUnaryOp(node) {
        const operand = this.evaluate(node.operand);
        switch (node.op) {
            case '-': return -operand;
            case 'not': return !operand;
            default:
                this.error(`Unknown unary operator: ${node.op}`);
        }
    }

    evaluateCall(node) {
        const callee = this.evaluate(node.callee);

        if (callee && callee.__func__) {
            const fn = this.functions[callee.name];
            if (!fn) {
                this.error(`Tuntematon funktio: ${callee.name}`);
            }
            const args = node.args.map(a => this.evaluate(a));
            return fn.apply(this, args);
        }

        this.error('Kutsu vaatii funktion');
    }
}

// ============================================
// ERROR CLASS
// ============================================

class DSLError extends Error {
    constructor(message, line = null, column = null) {
        const locationInfo = line ? ` (rivi ${line}, sarake ${column})` : '';
        super(message + locationInfo);
        this.name = 'DSLError';
        this.line = line;
        this.column = column;
    }
}

// ============================================
// MAIN API
// ============================================

class DSL {
    constructor() {
        this.interpreter = null;
    }

    compile(code) {
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        return parser.parse();
    }

    execute(code, context = {}) {
        const ast = this.compile(code);
        this.interpreter = new Interpreter(context);
        return this.interpreter.execute(ast);
    }

    // Register a custom simulation function
    registerSimulation(name, fn) {
        if (!this.interpreter) {
            this.interpreter = new Interpreter();
        }
        this.interpreter.registerSimulation(name, fn);
    }

    get lastSimulation() {
        return this.interpreter?.lastSimulation;
    }
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DSL, DSLError, Lexer, Parser, Interpreter };
}
