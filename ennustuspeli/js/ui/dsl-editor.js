/**
 * DSL Editor UI Component - Minimalist design
 *
 * Two textareas:
 * - Top: Read-only data (gray background)
 * - Bottom: Editable code
 */

const DSLEditor = {
    /**
     * Create the DSL editor component
     */
    create(container, options = {}) {
        const {
            dataVariables = {},
            starterCode = 'return Normal(mean(data), std(data))',
        } = options;

        // Main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'dsl-editor';
        container.appendChild(wrapper);

        // Data textarea (read-only)
        const dataTextarea = document.createElement('textarea');
        dataTextarea.className = 'dsl-data';
        dataTextarea.readOnly = true;
        dataTextarea.spellcheck = false;
        wrapper.appendChild(dataTextarea);

        // Code textarea (editable)
        const codeTextarea = document.createElement('textarea');
        codeTextarea.className = 'dsl-code';
        codeTextarea.spellcheck = false;
        codeTextarea.value = starterCode;
        wrapper.appendChild(codeTextarea);

        // Error display (hidden by default)
        const errorDiv = document.createElement('div');
        errorDiv.className = 'dsl-error';
        errorDiv.style.display = 'none';
        wrapper.appendChild(errorDiv);

        // PREFERENCE: Show ALL data without truncation, all rows visible without scrolling
        // PREFERENCE: Objects must be properly serialized, never show [object Object]
        const formatValue = (v) => {
            if (v === null || v === undefined) return String(v);
            if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(1);
            if (typeof v === 'string') return v;
            if (typeof v === 'object') {
                // For objects, show key properties or summarize
                if (v.time !== undefined && v.type !== undefined) {
                    // Arrival object: show time and type
                    const h = Math.floor(v.time / 60);
                    const m = Math.floor(v.time % 60);
                    return `${h}:${m.toString().padStart(2,'0')}`;
                }
                if (v.dayOfWeek !== undefined) {
                    return v.dayOfWeek;
                }
                // Generic object: summarize
                const keys = Object.keys(v);
                if (keys.length <= 3) {
                    return `{${keys.map(k => `${k}:${formatValue(v[k])}`).join(', ')}}`;
                }
                return `{${keys.length} props}`;
            }
            return String(v);
        };

        // PREFERENCE: Always single line per array, truncate if too long
        const MAX_DISPLAY_ITEMS = 30;
        const PREVIEW_ITEMS = 6;  // Show first/last N items when truncated

        const formatDataDisplay = (vars) => {
            const lines = [];
            for (const [key, value] of Object.entries(vars)) {
                if (Array.isArray(value)) {
                    const formatted = value.map(formatValue);
                    if (value.length <= MAX_DISPLAY_ITEMS) {
                        // Show all items on single line
                        lines.push(`${key} = [${formatted.join(', ')}]`);
                    } else {
                        // Large array: show first...last on single line
                        const first = formatted.slice(0, PREVIEW_ITEMS);
                        const last = formatted.slice(-PREVIEW_ITEMS);
                        lines.push(`${key} = [${first.join(', ')}, ..., ${last.join(', ')}] (n=${value.length})`);
                    }
                } else if (typeof value === 'number') {
                    lines.push(`${key} = ${Number.isInteger(value) ? value : value.toFixed(2)}`);
                } else if (typeof value === 'object' && value !== null) {
                    lines.push(`${key} = ${formatValue(value)}`);
                } else {
                    lines.push(`${key} = ${value}`);
                }
            }
            return lines.join('\n');
        };

        // Auto-resize textarea to fit content
        const autoResizeTextarea = (textarea) => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };

        dataTextarea.value = formatDataDisplay(dataVariables);
        // Initial auto-resize after a small delay to ensure rendering
        setTimeout(() => autoResizeTextarea(dataTextarea), 10);

        // Tab key inserts spaces
        codeTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = codeTextarea.selectionStart;
                const end = codeTextarea.selectionEnd;
                codeTextarea.value = codeTextarea.value.substring(0, start) + '  ' + codeTextarea.value.substring(end);
                codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 2;
            }
        });

        return {
            element: wrapper,

            getCode() {
                return codeTextarea.value;
            },

            setCode(code) {
                codeTextarea.value = code;
            },

            updateData(variables) {
                dataTextarea.value = formatDataDisplay(variables);
                autoResizeTextarea(dataTextarea);
            },

            showError(message) {
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
                codeTextarea.classList.add('has-error');
            },

            clearError() {
                errorDiv.style.display = 'none';
                codeTextarea.classList.remove('has-error');
            },

            disable() {
                codeTextarea.disabled = true;
            },

            enable() {
                codeTextarea.disabled = false;
            },

            focus() {
                codeTextarea.focus();
            },
        };
    },
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSLEditor;
}
