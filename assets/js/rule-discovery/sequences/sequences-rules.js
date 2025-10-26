/**
 * Sequences Game Rules
 * 10 number sequence patterns
 */

export const SEQUENCES_RULES = [
        { id: 'seq1', name: 'Lisää edelliseen lukuun kolme', generate: (n) => Array.from({length: n}, (_, i) => 3 * (i + 1) + 2), required: 2 },
        { id: 'seq12', name: 'Vuorottele: lisää 4, lisää 7, lisää 4, lisää 7, ...', generate: (n) => {
            const seq = [1];
            for (let i = 1; i < n; i++) seq.push(seq[i-1] + (i % 2 === 1 ? 4 : 7));
            return seq;
        }, required: 2 },
        { id: 'seq6', name: 'Kerro luku itsellään (1×1, 2×2, 3×3, 4×4...)', generate: (n) => Array.from({length: n}, (_, i) => Math.pow(i + 1, 2)), required: 2 },
        { id: 'seq7', name: 'Lisää 1, sitten 2, sitten 3, sitten 4...', generate: (n) => Array.from({length: n}, (_, i) => (i + 1) * (i + 2) / 2), required: 2 },
        { id: 'seq10', name: 'Seuraava luku on kahden edellisen summa', generate: (n) => {
            const fib = [1, 1];
            for (let i = 2; i < n; i++) fib.push(fib[i-1] + fib[i-2]);
            return fib.slice(0, n);
        }, required: 2 },
        { id: 'seq5', name: 'Seuraava luku on kaksi kertaa edellinen', generate: (n) => Array.from({length: n}, (_, i) => Math.pow(2, i)), required: 2 },
        { id: 'seq2', name: 'Luvut, jotka ovat jaollisia kolmella tai viidellä (tai molemmilla)', generate: (n) => {
            const seq = [];
            let candidate = 1;
            while (seq.length < n) {
                if (candidate % 3 === 0 || candidate % 5 === 0) {
                    seq.push(candidate);
                }
                candidate++;
            }
            return seq;
        }, required: 6 },
        { id: 'seq14', name: 'Alkuluvut: luvut, joita ei voi jakaa pienempien lukujen kertolaskuksi', generate: (n) => {
            const primes = [];
            let candidate = 2;
            while (primes.length < n) {
                let isPrime = true;
                for (let i = 0; i < primes.length && primes[i] * primes[i] <= candidate; i++) {
                    if (candidate % primes[i] === 0) {
                        isPrime = false;
                        break;
                    }
                }
                if (isPrime) primes.push(candidate);
                candidate++;
            }
            return primes;
        }, required: 6 },
];
