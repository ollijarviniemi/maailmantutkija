/**
 * Functions Game Rules - Univariate Functions
 * 12 mathematical function rules for single variable
 */

export const FUNCTIONS_RULES = [
    {
        id: 'f1',
        name: 'x ➝ x + 3',
        arity: 1,
        check: (x) => x + 3,
        testInputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 25, 28, 30, 35, 40, 50, 100]
    },
    {
        id: 'f2',
        name: 'x ➝ x/2 pyöristettynä alaspäin',
        arity: 1,
        check: (x) => Math.floor(x / 2),
        testInputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 30, 33, 40, 48, 50, 51, 100]
    },
    {
        id: 'f3',
        name: 'x➝ 3*x + 5',
        arity: 1,
        check: (x) => 3 * x + 5,
        testInputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 50, 100]
    },
    {
        id: 'f4',
        name: 'x ➝ x*x',
        arity: 1,
        check: (x) => x * x,
        testInputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 20, 30, 40, 50]
    },
    {
        id: 'f5',
        name: 'x ➝ x:n jakojäännös kolmella jaettaessa',
        arity: 1,
        check: (x) => ((x % 3) + 3) % 3,
        testInputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 25, 30, 33, 35, 60]
    },
    {
        id: 'f6',
        name: 'x ➝ 3*x+1 jos x pariton, x/2 jos x parillinen',
        arity: 1,
        check: (x) => Math.abs(x) % 2 === 1 ? 3 * x + 1 : x / 2,
        testInputs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 21, 22, 24, 25, 30]
    },
    {
        id: 'f7',
        name: 'x ➝ min(max(x, 10), 30) — jos x on yli 30, palauta 30; jos x on alle 10, palauta 10; muuten palauta x',
        arity: 1,
        check: (x) => Math.min(Math.max(x, 10), 30),
        testInputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 31, 32, 33, 34, 35, 40, 43, 47, 50, 53, 60, 100]
    },
    {
        id: 'f8',
        name: 'x ➝ etäisyys x:stä lähimpään neliölukuun',
        arity: 1,
        check: (x) => {
            const n = Math.abs(x);
            const lower = Math.floor(Math.sqrt(n));
            const upper = lower + 1;
            return Math.min(n - lower * lower, upper * upper - n);
        },
        testInputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 24, 25, 26, 35, 36, 37, 38, 48, 49, 50, 51, 60, 80, 100]
    },
    {
        id: 'f9',
        name: 'x ➝ pienin luku, joka jakaa x:n (ykköstä ei lasketa)',
        arity: 1,
        check: (x) => {
            const n = Math.abs(Math.floor(x));
            if (n <= 1) return n;
            for (let i = 2; i * i <= n; i++) {
                if (n % i === 0) return i;
            }
            return n;
        },
        testInputs: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 20, 21, 25, 30, 35, 45, 49, 60]
    },
    {
        id: 'f10',
        name: 'x ➝ montako kertaa x:n voi jakaa tasan kahdella',
        arity: 1,
        check: (x) => {
            let n = Math.abs(Math.floor(x));
            if (n === 0) return 0;
            let count = 0;
            while (n % 2 === 0) {
                count++;
                n = n / 2;
            }
            return count;
        },
        testInputs: [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80, 100]
    },
    {
        id: 'f11',
        name: 'x ➝ monenko luvun kertolaskuksi x:n voi jakaa',
        arity: 1,
        check: (x) => {
            let n = Math.abs(Math.floor(x));
            if (n <= 1) return 0;
            let count = 0;
            for (let i = 2; i * i <= n; i++) {
                while (n % i === 0) {
                    count++;
                    n = n / i;
                }
            }
            if (n > 1) count++;
            return count;
        },
        testInputs: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 25, 30, 32, 36, 48, 50, 60]
    },
    {
        id: 'f12',
        name: 'x ➝ montako eri lukua jakaa x:n',
        arity: 1,
        check: (x) => {
            const n = Math.abs(Math.floor(x));
            if (n === 0) return 0;
            let count = 0;
            for (let i = 1; i * i <= n; i++) {
                if (n % i === 0) {
                    count += (i * i === n) ? 1 : 2;
                }
            }
            return count;
        },
        testInputs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 18, 20, 22, 24, 25, 27, 28, 30, 32, 36]
    },
];
