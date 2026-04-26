/**
 * UI Components
 *
 * Reusable UI components for the prediction game.
 */

const UI = {
    /**
     * Create a code editor component
     */
    createCodeEditor(container, options = {}) {
        const wrapper = document.createElement('div');
        wrapper.className = 'panel';

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.textContent = options.title || 'Koodi';

        const textarea = document.createElement('textarea');
        textarea.className = 'code-editor';
        textarea.placeholder = options.placeholder || '// Kirjoita koodisi tähän...';
        textarea.value = options.initialCode || '';
        textarea.spellcheck = false;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'code-error';
        errorDiv.style.display = 'none';

        wrapper.appendChild(header);
        wrapper.appendChild(textarea);
        wrapper.appendChild(errorDiv);
        container.appendChild(wrapper);

        return {
            element: wrapper,
            textarea,
            errorDiv,
            getValue: () => textarea.value,
            setValue: (code) => { textarea.value = code; },
            showError: (msg) => {
                errorDiv.textContent = msg;
                errorDiv.style.display = 'block';
            },
            clearError: () => {
                errorDiv.style.display = 'none';
            },
            onChange: (callback) => {
                textarea.addEventListener('input', () => callback(textarea.value));
            }
        };
    },

    /**
     * Create an answer input component (number or slider)
     */
    createAnswerInput(container, options = {}) {
        const wrapper = document.createElement('div');
        wrapper.className = 'answer-section';

        const label = document.createElement('label');
        label.className = 'answer-label';
        label.textContent = options.label || 'Vastauksesi:';

        wrapper.appendChild(label);

        let input;
        let getValue;
        let setValue;

        if (options.type === 'slider') {
            // Slider with labels
            const sliderContainer = document.createElement('div');
            sliderContainer.className = 'slider-container';

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'slider';
            slider.min = options.min || 0;
            slider.max = options.max || 100;
            slider.step = options.step || 1;
            slider.value = options.initial || (options.min + options.max) / 2;

            const valueDisplay = document.createElement('div');
            valueDisplay.className = 'answer-input';
            valueDisplay.style.marginTop = '8px';
            valueDisplay.textContent = slider.value;

            slider.addEventListener('input', () => {
                valueDisplay.textContent = options.format
                    ? options.format(parseFloat(slider.value))
                    : slider.value;
            });

            const labels = document.createElement('div');
            labels.className = 'slider-labels';
            labels.innerHTML = `<span>${options.minLabel || options.min}</span><span>${options.maxLabel || options.max}</span>`;

            sliderContainer.appendChild(slider);
            sliderContainer.appendChild(valueDisplay);
            sliderContainer.appendChild(labels);
            wrapper.appendChild(sliderContainer);

            input = slider;
            getValue = () => parseFloat(slider.value);
            setValue = (v) => {
                slider.value = v;
                valueDisplay.textContent = options.format ? options.format(v) : v;
            };
        } else {
            // Number input
            input = document.createElement('input');
            input.type = 'number';
            input.className = 'answer-input';
            input.min = options.min;
            input.max = options.max;
            input.step = options.step || 'any';
            input.value = options.initial || '';
            input.placeholder = options.placeholder || '';
            wrapper.appendChild(input);

            getValue = () => parseFloat(input.value);
            setValue = (v) => { input.value = v; };
        }

        container.appendChild(wrapper);

        return {
            element: wrapper,
            input,
            getValue,
            setValue,
            onChange: (callback) => {
                input.addEventListener('input', () => callback(getValue()));
            },
            setDisabled: (disabled) => {
                input.disabled = disabled;
            }
        };
    },

    /**
     * Create probability slider (0-100%)
     */
    createProbabilitySlider(container, options = {}) {
        return this.createAnswerInput(container, {
            type: 'slider',
            label: options.label || 'Todennäköisyys:',
            min: 0,
            max: 100,
            step: 1,
            initial: 50,
            minLabel: '0%',
            maxLabel: '100%',
            format: (v) => `${v}%`,
            ...options
        });
    },

    /**
     * Create results display
     */
    createResultsPanel(container, options = {}) {
        const wrapper = document.createElement('div');
        wrapper.className = 'panel results-panel';
        wrapper.style.display = 'none';

        const valueDiv = document.createElement('div');
        valueDiv.className = 'result-value';

        const labelDiv = document.createElement('div');
        labelDiv.className = 'result-label';
        labelDiv.textContent = options.label || 'Tulos';

        const starsDiv = document.createElement('div');
        starsDiv.className = 'stars';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.textContent = '★';
            starsDiv.appendChild(star);
        }

        const comparisonDiv = document.createElement('div');
        comparisonDiv.className = 'result-comparison';

        wrapper.appendChild(valueDiv);
        wrapper.appendChild(labelDiv);
        wrapper.appendChild(starsDiv);
        wrapper.appendChild(comparisonDiv);
        container.appendChild(wrapper);

        return {
            element: wrapper,
            show: () => { wrapper.style.display = 'block'; },
            hide: () => { wrapper.style.display = 'none'; },
            setValue: (value, label) => {
                valueDiv.textContent = value;
                if (label) labelDiv.textContent = label;
            },
            setStars: (count) => {
                const stars = starsDiv.querySelectorAll('.star');
                stars.forEach((star, i) => {
                    star.classList.toggle('earned', i < count);
                });
            },
            setComparison: (rows) => {
                comparisonDiv.innerHTML = rows.map(([label, value]) =>
                    `<div class="result-row"><span>${label}</span><span>${value}</span></div>`
                ).join('');
            }
        };
    },

    /**
     * Create animation controls
     */
    createControls(container, options = {}) {
        const wrapper = document.createElement('div');
        wrapper.className = 'controls';

        // Play/Pause button
        const playBtn = document.createElement('button');
        playBtn.className = 'btn btn-primary';
        playBtn.textContent = '▶ Käynnistä';

        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn btn-secondary';
        resetBtn.textContent = '↺ Alusta';

        // Speed controls
        const speedDiv = document.createElement('div');
        speedDiv.className = 'speed-control';
        speedDiv.innerHTML = '<span>Nopeus:</span>';

        const speeds = options.speeds || [1, 3, 10];
        const speedBtns = speeds.map(speed => {
            const btn = document.createElement('button');
            btn.className = 'speed-btn' + (speed === 1 ? ' active' : '');
            btn.textContent = `${speed}x`;
            btn.dataset.speed = speed;
            speedDiv.appendChild(btn);
            return btn;
        });

        wrapper.appendChild(playBtn);
        wrapper.appendChild(resetBtn);
        wrapper.appendChild(speedDiv);
        container.appendChild(wrapper);

        let currentSpeed = 1;
        let isPlaying = false;

        return {
            element: wrapper,
            playBtn,
            resetBtn,
            setPlaying: (playing) => {
                isPlaying = playing;
                playBtn.textContent = playing ? '⏸ Tauko' : '▶ Käynnistä';
            },
            setSpeed: (speed) => {
                currentSpeed = speed;
                speedBtns.forEach(btn => {
                    btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed);
                });
            },
            getSpeed: () => currentSpeed,
            onPlay: (callback) => {
                playBtn.addEventListener('click', () => callback(!isPlaying));
            },
            onReset: (callback) => {
                resetBtn.addEventListener('click', callback);
            },
            onSpeedChange: (callback) => {
                speedBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const speed = parseInt(btn.dataset.speed);
                        currentSpeed = speed;
                        speedBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        callback(speed);
                    });
                });
            },
            setDisabled: (disabled) => {
                playBtn.disabled = disabled;
                resetBtn.disabled = disabled;
                speedBtns.forEach(btn => btn.disabled = disabled);
            }
        };
    },

    /**
     * Create submit button
     */
    createSubmitButton(container, options = {}) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-success';
        btn.textContent = options.text || 'Lähetä vastaus';
        btn.style.width = '100%';
        btn.style.marginTop = '16px';
        btn.style.padding = '16px';
        btn.style.fontSize = '1.1rem';
        container.appendChild(btn);

        return {
            element: btn,
            onClick: (callback) => {
                btn.addEventListener('click', callback);
            },
            setDisabled: (disabled) => {
                btn.disabled = disabled;
            },
            setText: (text) => {
                btn.textContent = text;
            }
        };
    },

    /**
     * Create question display
     */
    createQuestionBox(container, question) {
        const box = document.createElement('div');
        box.className = 'question-box';
        box.textContent = question;
        container.appendChild(box);

        return {
            element: box,
            setQuestion: (q) => { box.textContent = q; }
        };
    },

    /**
     * Create stats display panel
     */
    createStatsPanel(container, stats) {
        const wrapper = document.createElement('div');
        wrapper.className = 'stats-panel';

        const items = {};
        for (const [key, config] of Object.entries(stats)) {
            const item = document.createElement('div');
            item.className = 'stat-item';

            const value = document.createElement('div');
            value.className = 'stat-value';
            value.textContent = config.initial || '0';

            const label = document.createElement('div');
            label.className = 'stat-label';
            label.textContent = config.label;

            item.appendChild(value);
            item.appendChild(label);
            wrapper.appendChild(item);

            items[key] = { element: item, valueEl: value };
        }

        container.appendChild(wrapper);

        return {
            element: wrapper,
            update: (key, value) => {
                if (items[key]) {
                    items[key].valueEl.textContent = value;
                }
            },
            updateAll: (values) => {
                for (const [key, value] of Object.entries(values)) {
                    if (items[key]) {
                        items[key].valueEl.textContent = value;
                    }
                }
            }
        };
    },

    /**
     * Create modal dialog
     */
    createModal(options = {}) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'none';

        const modal = document.createElement('div');
        modal.className = 'modal';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.textContent = options.title || '';

        const body = document.createElement('div');
        body.className = 'modal-body';

        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });

        return {
            element: overlay,
            body,
            footer,
            show: () => { overlay.style.display = 'flex'; },
            hide: () => { overlay.style.display = 'none'; },
            setTitle: (title) => { header.textContent = title; },
            setContent: (html) => { body.innerHTML = html; },
            addButton: (text, className, callback) => {
                const btn = document.createElement('button');
                btn.className = `btn ${className}`;
                btn.textContent = text;
                btn.addEventListener('click', callback);
                footer.appendChild(btn);
                return btn;
            },
            clearButtons: () => { footer.innerHTML = ''; }
        };
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 2000;
            animation: slideUp 0.3s ease;
        `;

        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        toast.style.background = colors[type] || colors.info;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}
