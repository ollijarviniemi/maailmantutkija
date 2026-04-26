/**
 * Store Occupancy Animation
 *
 * DESIGN PREFERENCES (documented from user feedback):
 * - Store should look like an actual store: rectangle with walls, entrance/exit as gaps
 * - Customers must walk to the exit before disappearing (no teleporting)
 * - Customers must not walk through shelves (proper grid-based pathfinding required)
 * - Minimize wasted space - use full canvas area efficiently
 * - Data panels should be readable with adequate text size
 * - Graph axes must have clear labels and FIXED scales (not constantly changing)
 * - Simulation should pause when window loses focus
 * - Data text fields should show all content without scrolling
 */

class StoreOccupancyAnimation {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.config = {
            openTime: 9 * 60,
            closeTime: 21 * 60,
            minutesPerSecond: 2,
            speedMultiplier: 1,
            numDays: 1,
            dgp: {
                type: 'constant',
                baseArrivalRate: 0.5,
                meanStayTime: 15,
                ...config.dgp
            },
            ...config
        };

        // State
        this.currentTime = this.config.openTime;
        this.currentDay = 0;
        this.customers = [];
        this.nextCustomerId = 0;
        this.nextGroupId = 1;

        // Data collection
        this.data = {
            days: [],
            currentDay: { arrivals: [], departures: [], stayDurations: [], occupancySnapshots: [] }
        };

        // Animation state
        this.running = false;
        this.finished = false;
        this.animationFrame = null;
        this.lastFrameTime = null;

        // PREFERENCE: Pause when window loses focus
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Layout and pathfinding grid
        this.layout = null;
        this.grid = null;  // Walkability grid for pathfinding

        // Callbacks
        this.onStatsUpdate = null;
        this.onDataUpdate = null;
        this.onFinish = null;

        // Fixed scale for graphs - computed by pre-running simulation
        this.graphScales = {
            maxArrivalsPerHour: 50,
            maxOccupancy: 30,
            maxStayDuration: 60
        };

        // PREFERENCE: Progressive data updates during animation
        this.lastDataUpdateTime = 0;
        this.dataUpdateInterval = 500;  // Update data display every 0.5 seconds for responsiveness

        this.setupCanvas();
        this.computeLayout();
        this.buildPathfindingGrid();

        // PREFERENCE: Pre-run simulation to determine y-axis limits before starting
        this.prerunForScales();

        this.initializeDay();
    }

    /**
     * PREFERENCE: Run simulation without rendering to determine graph scale limits
     * This prevents bars from going off-charts
     * Uses 10 runs per day type for reliable estimation
     */
    prerunForScales() {
        const numPrerunDays = Math.max(1, this.config.numDays || 1);
        let maxArrivalsPerHour = 0;
        let maxOccupancy = 0;
        let maxStayDuration = 0;

        // Run 10 simulations per day type for reliable max estimation
        for (let run = 0; run < 10; run++) {
            for (let day = 0; day < numPrerunDays; day++) {
                const dayOfWeek = this.getDayOfWeek(day);
                const result = this.simulateDayFast(dayOfWeek);

                maxArrivalsPerHour = Math.max(maxArrivalsPerHour, result.maxArrivalsPerHour);
                maxOccupancy = Math.max(maxOccupancy, result.maxOccupancy);
                maxStayDuration = Math.max(maxStayDuration, result.maxStayDuration);
            }
        }

        // Add 30% buffer (increased from 20%) and round up to nice numbers
        this.graphScales = {
            maxArrivalsPerHour: Math.ceil(maxArrivalsPerHour * 1.3 / 5) * 5,
            maxOccupancy: Math.ceil(maxOccupancy * 1.3 / 5) * 5,
            maxStayDuration: Math.ceil(maxStayDuration * 1.3 / 10) * 10
        };

        // Minimum values
        this.graphScales.maxArrivalsPerHour = Math.max(10, this.graphScales.maxArrivalsPerHour);
        this.graphScales.maxOccupancy = Math.max(10, this.graphScales.maxOccupancy);
        this.graphScales.maxStayDuration = Math.max(30, this.graphScales.maxStayDuration);
    }

    /**
     * Fast simulation without animation - just calculates statistics
     */
    simulateDayFast(dayOfWeek) {
        const { dgp, openTime, closeTime } = this.config;
        const arrivals = [];
        const occupancy = [];
        const stayDurations = [];

        // Generate arrivals
        let time = openTime;
        while (time < closeTime) {
            let rate = dgp.baseArrivalRate || 0.5;

            if (dgp.type === 'peak-hours' || dgp.peakHours) {
                const peakTime = dgp.peakTime || (17 * 60);
                const peakWidth = dgp.peakWidth || 120;
                const peakMultiplier = dgp.peakMultiplier || 3;
                const dist = Math.abs(time - peakTime);
                rate *= (1 + (peakMultiplier - 1) * Math.exp(-0.5 * (dist / (peakWidth / 2)) ** 2));
            }

            if (dgp.type === 'weekday' || dgp.weekdayEffects) {
                const mult = dgp.weekdayMultipliers || {
                    'Monday': 0.8, 'Tuesday': 0.9, 'Wednesday': 1.0,
                    'Thursday': 1.0, 'Friday': 1.3, 'Saturday': 1.8, 'Sunday': 1.5
                };
                rate *= mult[dayOfWeek] || 1.0;
            }

            if (rate <= 0) { time += 1; continue; }
            time += -Math.log(Math.random()) / rate;
            if (time >= closeTime) break;

            // Generate customer(s)
            let groupSize = 1;
            if (dgp.groups && Math.random() < (dgp.groupProbability || 0.3)) {
                groupSize = dgp.groupSizeDistribution === 'poisson'
                    ? 1 + this.samplePoisson((dgp.meanGroupSize || 2.5) - 1)
                    : 2 + Math.floor(Math.random() * 3);
            }

            for (let i = 0; i < groupSize; i++) {
                let stayTime;
                if (dgp.customerTypes === 'discrete') {
                    stayTime = Math.random() < (dgp.fastProbability || 0.5)
                        ? this.sampleExponential(dgp.fastMeanStay || 8)
                        : this.sampleExponential(dgp.slowMeanStay || 25);
                } else if (dgp.customerTypes === 'continuous') {
                    const mean = (dgp.minMeanStay || 5) + Math.random() * ((dgp.maxMeanStay || 30) - (dgp.minMeanStay || 5));
                    stayTime = this.sampleExponential(mean);
                } else {
                    stayTime = this.sampleExponential(dgp.meanStayTime || 15);
                }
                stayTime = Math.max(3, stayTime);
                arrivals.push({ time, departureTime: time + stayTime });
                stayDurations.push(stayTime);
            }
        }

        // Calculate hourly arrivals
        const hourlyArrivals = {};
        for (const a of arrivals) {
            const hour = Math.floor(a.time / 60);
            hourlyArrivals[hour] = (hourlyArrivals[hour] || 0) + 1;
        }
        const maxArrivalsPerHour = Math.max(...Object.values(hourlyArrivals), 0);

        // Calculate max occupancy
        const events = [];
        for (const a of arrivals) {
            events.push({ time: a.time, delta: 1 });
            events.push({ time: a.departureTime, delta: -1 });
        }
        events.sort((a, b) => a.time - b.time);
        let currentOcc = 0, maxOcc = 0;
        for (const e of events) {
            currentOcc += e.delta;
            maxOcc = Math.max(maxOcc, currentOcc);
        }

        return {
            maxArrivalsPerHour,
            maxOccupancy: maxOcc,
            maxStayDuration: Math.max(...stayDurations, 0)
        };
    }

    handleVisibilityChange() {
        // PREFERENCE: Pause simulation when window loses focus
        if (document.hidden && this.running) {
            this.pause();
            this._wasPausedByVisibility = true;
        } else if (!document.hidden && this._wasPausedByVisibility) {
            this._wasPausedByVisibility = false;
            this.start();
        }
    }

    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * PREFERENCE: Merge adjacent shelf cells into solid rectangles for cleaner drawing
     * Uses row-by-row scanning to create horizontal runs, then merges vertically adjacent runs
     */
    mergeShelfCells(shelfCells, gridRows, gridCols, cellW, cellH, offsetX, offsetY) {
        if (!shelfCells || shelfCells.length === 0) return [];

        // Create a grid marking shelf cells
        const grid = Array(gridRows).fill(null).map(() => Array(gridCols).fill(false));
        for (const cell of shelfCells) {
            if (cell.row >= 0 && cell.row < gridRows && cell.col >= 0 && cell.col < gridCols) {
                grid[cell.row][cell.col] = true;
            }
        }

        // Find horizontal runs in each row
        const runs = [];
        for (let row = 0; row < gridRows; row++) {
            let col = 0;
            while (col < gridCols) {
                if (grid[row][col]) {
                    const startCol = col;
                    while (col < gridCols && grid[row][col]) col++;
                    runs.push({ row, startCol, endCol: col - 1 });
                } else {
                    col++;
                }
            }
        }

        // Merge vertically adjacent runs with same column span
        const merged = [];
        const used = new Set();

        for (let i = 0; i < runs.length; i++) {
            if (used.has(i)) continue;

            const run = runs[i];
            let endRow = run.row;

            // Try to extend downward
            for (let j = i + 1; j < runs.length; j++) {
                if (used.has(j)) continue;
                const nextRun = runs[j];
                if (nextRun.row === endRow + 1 &&
                    nextRun.startCol === run.startCol &&
                    nextRun.endCol === run.endCol) {
                    endRow = nextRun.row;
                    used.add(j);
                }
            }
            used.add(i);

            merged.push({
                x: offsetX + run.startCol * cellW,
                y: offsetY + run.row * cellH,
                width: (run.endCol - run.startCol + 1) * cellW,
                height: (endRow - run.row + 1) * cellH
            });
        }

        return merged;
    }

    computeLayout() {
        const storeWidth = Math.floor(this.width * 0.6);
        const panelWidth = this.width - storeWidth - 10;

        const margin = 6;
        const wallThickness = 3;

        const storeOuterX = margin;
        const storeOuterY = margin;
        const storeOuterW = storeWidth - 2 * margin;
        const storeOuterH = this.height - 2 * margin - 18; // Space for labels below

        const storeInnerX = storeOuterX + wallThickness;
        const storeInnerY = storeOuterY + wallThickness;
        const storeInnerW = storeOuterW - 2 * wallThickness;
        const storeInnerH = storeOuterH - 2 * wallThickness;

        // Entrance and exit gaps in bottom wall
        const gapWidth = 30;
        const entranceX = storeOuterX + storeOuterW * 0.3 - gapWidth / 2;
        const exitX = storeOuterX + storeOuterW * 0.7 - gapWidth / 2;
        const bottomY = storeOuterY + storeOuterH;

        // Shelf layout - define as rectangles
        const shelfMarginTop = 35;  // Space for clock
        const shelfMarginBottom = 40;  // Space for movement near exit
        const shelfMarginSide = 20;

        const shelfAreaX = storeInnerX + shelfMarginSide;
        const shelfAreaY = storeInnerY + shelfMarginTop;
        const shelfAreaW = storeInnerW - 2 * shelfMarginSide;
        const shelfAreaH = storeInnerH - shelfMarginTop - shelfMarginBottom;

        // PREFERENCE: Support grid-based layouts from shelf_layout_editor.py
        // Grid layout format:
        // - gridCols, gridRows: grid dimensions
        // - shelves: [{row, col}] - obstacle cells
        // - browsePositions: [{row, col}] - where customers go to look at items
        // - entrance/exit: {col, width} in cell units

        let shelves = [];
        let browsePositions = [];
        let finalEntranceX = entranceX;
        let finalEntranceW = gapWidth;
        let finalExitX = exitX;
        let finalExitW = gapWidth;

        // Store grid info for pathfinding
        this.layoutGrid = null;

        if (this.config.customLayout) {
            const layout = this.config.customLayout;
            const gridCols = layout.gridCols || 20;
            const gridRows = layout.gridRows || 16;
            const cellW = storeInnerW / gridCols;
            const cellH = storeInnerH / gridRows;

            // Store grid info
            this.layoutGrid = {
                cols: gridCols,
                rows: gridRows,
                cellW,
                cellH,
                offsetX: storeInnerX,
                offsetY: storeInnerY
            };

            // Convert shelf cells to merged rectangles for drawing
            // PREFERENCE: No grid appearance - merge adjacent cells into solid blocks
            shelves = this.mergeShelfCells(layout.shelves || [], gridRows, gridCols, cellW, cellH, storeInnerX, storeInnerY);

            // Browse positions - where customers go to look at items
            browsePositions = (layout.browsePositions || []).map(p => ({
                x: storeInnerX + (p.col + 0.5) * cellW,
                y: storeInnerY + (p.row + 0.5) * cellH,
                row: p.row,
                col: p.col
            }));

            // Entrance/exit from grid columns
            if (layout.entrance) {
                const doorWidth = (layout.entrance.width || 2) * cellW;
                finalEntranceX = storeInnerX + layout.entrance.col * cellW;
                finalEntranceW = doorWidth;
            }
            if (layout.exit) {
                const doorWidth = (layout.exit.width || 2) * cellW;
                finalExitX = storeInnerX + layout.exit.col * cellW;
                finalExitW = doorWidth;
            }
        } else {
            // Default grid layout (3 rows, 4 cols of shelf blocks)
            const shelfRows = 3;
            const shelfCols = 4;
            const aisleWidth = 22;
            const shelfW = (shelfAreaW - (shelfCols + 1) * aisleWidth) / shelfCols;
            const shelfH = (shelfAreaH - (shelfRows + 1) * aisleWidth) / shelfRows;

            for (let row = 0; row < shelfRows; row++) {
                for (let col = 0; col < shelfCols; col++) {
                    const x = shelfAreaX + aisleWidth + col * (shelfW + aisleWidth);
                    const y = shelfAreaY + aisleWidth + row * (shelfH + aisleWidth);
                    shelves.push({ x, y, width: shelfW, height: shelfH, row, col });

                    // Default browse position in front of each shelf
                    browsePositions.push({
                        x: x + shelfW / 2,
                        y: y + shelfH + aisleWidth / 2,
                        row, col
                    });
                }
            }
        }

        this.layout = {
            store: {
                outerX: storeOuterX, outerY: storeOuterY,
                outerW: storeOuterW, outerH: storeOuterH,
                innerX: storeInnerX, innerY: storeInnerY,
                innerW: storeInnerW, innerH: storeInnerH,
                wallThickness
            },
            entrance: { x: finalEntranceX, y: bottomY, width: finalEntranceW, centerX: finalEntranceX + finalEntranceW / 2 },
            exit: { x: finalExitX, y: bottomY, width: finalExitW, centerX: finalExitX + finalExitW / 2 },
            shelves,
            browsePositions,  // Where customers go to look at items
            shelfArea: { x: shelfAreaX, y: shelfAreaY, w: shelfAreaW, h: shelfAreaH },
            aisleWidth: 22,  // Default aisle width for pathfinding
            panels: { x: storeWidth + 5, y: 4, width: panelWidth - 5, height: this.height - 8 }
        };
    }

    /**
     * Build a grid for pathfinding
     * PREFERENCE: Customers must not walk through shelves
     */
    buildPathfindingGrid() {
        const { store, shelves } = this.layout;
        const cellSize = 8;  // Grid cell size in pixels

        const gridW = Math.ceil(store.innerW / cellSize);
        const gridH = Math.ceil(store.innerH / cellSize);

        // Initialize all cells as walkable
        this.grid = [];
        for (let y = 0; y < gridH; y++) {
            this.grid[y] = [];
            for (let x = 0; x < gridW; x++) {
                this.grid[y][x] = 1;  // 1 = walkable
            }
        }

        // Mark shelf cells as blocked
        for (const shelf of shelves) {
            const x1 = Math.floor((shelf.x - store.innerX) / cellSize);
            const y1 = Math.floor((shelf.y - store.innerY) / cellSize);
            const x2 = Math.ceil((shelf.x + shelf.width - store.innerX) / cellSize);
            const y2 = Math.ceil((shelf.y + shelf.height - store.innerY) / cellSize);

            for (let y = y1; y <= y2; y++) {
                for (let x = x1; x <= x2; x++) {
                    if (y >= 0 && y < gridH && x >= 0 && x < gridW) {
                        this.grid[y][x] = 0;  // 0 = blocked
                    }
                }
            }
        }

        this.gridCellSize = cellSize;
        this.gridW = gridW;
        this.gridH = gridH;
    }

    /**
     * Convert pixel coords to grid coords
     */
    pixelToGrid(px, py) {
        const { store } = this.layout;
        return {
            x: Math.floor((px - store.innerX) / this.gridCellSize),
            y: Math.floor((py - store.innerY) / this.gridCellSize)
        };
    }

    /**
     * Convert grid coords to pixel coords (center of cell)
     */
    gridToPixel(gx, gy) {
        const { store } = this.layout;
        return {
            x: store.innerX + (gx + 0.5) * this.gridCellSize,
            y: store.innerY + (gy + 0.5) * this.gridCellSize
        };
    }

    /**
     * A* pathfinding on the grid
     * PREFERENCE: Proper pathfinding so customers don't walk through shelves
     */
    findPath(startX, startY, endX, endY) {
        // Guard against NaN/undefined coordinates (can happen when window loses focus)
        if (!isFinite(startX) || !isFinite(startY) || !isFinite(endX) || !isFinite(endY)) {
            console.warn('findPath called with invalid coordinates:', { startX, startY, endX, endY });
            return [{ x: endX || 0, y: endY || 0 }];
        }

        const start = this.pixelToGrid(startX, startY);
        const end = this.pixelToGrid(endX, endY);

        // Guard against NaN after conversion
        if (!isFinite(start.x) || !isFinite(start.y) || !isFinite(end.x) || !isFinite(end.y)) {
            console.warn('pixelToGrid returned invalid coordinates');
            return [{ x: endX, y: endY }];
        }

        // Clamp to grid bounds
        start.x = Math.max(0, Math.min(this.gridW - 1, start.x));
        start.y = Math.max(0, Math.min(this.gridH - 1, start.y));
        end.x = Math.max(0, Math.min(this.gridW - 1, end.x));
        end.y = Math.max(0, Math.min(this.gridH - 1, end.y));

        // If start or end is blocked, find nearest walkable cell
        if (this.grid[start.y]?.[start.x] === 0) {
            const nearest = this.findNearestWalkable(start.x, start.y);
            if (nearest) { start.x = nearest.x; start.y = nearest.y; }
        }
        if (this.grid[end.y]?.[end.x] === 0) {
            const nearest = this.findNearestWalkable(end.x, end.y);
            if (nearest) { end.x = nearest.x; end.y = nearest.y; }
        }

        // A* algorithm
        const openSet = [{ x: start.x, y: start.y, g: 0, h: 0, f: 0, parent: null }];
        const closedSet = new Set();
        const key = (x, y) => `${x},${y}`;

        while (openSet.length > 0) {
            // Get node with lowest f
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();

            if (current.x === end.x && current.y === end.y) {
                // Reconstruct path
                const gridPath = [];
                let node = current;
                while (node) {
                    gridPath.unshift({ x: node.x, y: node.y });
                    node = node.parent;
                }
                // Simplify path (remove intermediate points on straight lines)
                const simplified = this.simplifyPath(gridPath);
                // Convert to pixel coordinates
                return simplified.map(p => this.gridToPixel(p.x, p.y));
            }

            closedSet.add(key(current.x, current.y));

            // Check neighbors (4-directional)
            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];

            for (const n of neighbors) {
                if (n.x < 0 || n.x >= this.gridW || n.y < 0 || n.y >= this.gridH) continue;
                if (this.grid[n.y][n.x] === 0) continue;  // Blocked
                if (closedSet.has(key(n.x, n.y))) continue;

                const g = current.g + 1;
                const h = Math.abs(n.x - end.x) + Math.abs(n.y - end.y);
                const f = g + h;

                const existing = openSet.find(o => o.x === n.x && o.y === n.y);
                if (existing) {
                    if (g < existing.g) {
                        existing.g = g;
                        existing.f = f;
                        existing.parent = current;
                    }
                } else {
                    openSet.push({ x: n.x, y: n.y, g, h, f, parent: current });
                }
            }
        }

        // No path found - return direct path (fallback)
        return [{ x: endX, y: endY }];
    }

    findNearestWalkable(gx, gy) {
        for (let r = 1; r < 20; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const nx = gx + dx, ny = gy + dy;
                    if (nx >= 0 && nx < this.gridW && ny >= 0 && ny < this.gridH) {
                        if (this.grid[ny][nx] === 1) {
                            return { x: nx, y: ny };
                        }
                    }
                }
            }
        }
        return null;
    }

    simplifyPath(path) {
        if (path.length <= 2) return path;
        const result = [path[0]];
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1], curr = path[i], next = path[i + 1];
            // Keep point if direction changes
            const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
            const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
            if (dx1 !== dx2 || dy1 !== dy2) {
                result.push(curr);
            }
        }
        result.push(path[path.length - 1]);
        return result;
    }

    initializeDay() {
        this.currentTime = this.config.openTime;
        this.customers = [];
        this.data.currentDay = { arrivals: [], departures: [], stayDurations: [], occupancySnapshots: [] };
        this.lastOccupancySnapshot = -1;
        this.scheduledArrivals = this.generateArrivals();
        this.nextArrivalIndex = 0;
    }

    generateArrivals() {
        const arrivals = [];
        const { dgp, openTime, closeTime } = this.config;
        const dayOfWeek = this.getDayOfWeek(this.currentDay);

        let time = openTime;
        while (time < closeTime) {
            const rate = this.getArrivalRate(time, dayOfWeek);
            if (rate <= 0) { time += 1; continue; }
            time += -Math.log(Math.random()) / rate;
            if (time >= closeTime) break;
            arrivals.push({ time, customers: this.generateCustomerGroup(time, dayOfWeek) });
        }
        return arrivals;
    }

    getArrivalRate(time, dayOfWeek) {
        const { dgp } = this.config;
        let rate = dgp.baseArrivalRate || 0.5;

        if (dgp.type === 'peak-hours' || dgp.peakHours) {
            const peakTime = dgp.peakTime || (17 * 60);
            const peakWidth = dgp.peakWidth || 120;
            const peakMultiplier = dgp.peakMultiplier || 3;
            const dist = Math.abs(time - peakTime);
            rate *= (1 + (peakMultiplier - 1) * Math.exp(-0.5 * (dist / (peakWidth / 2)) ** 2));
        }

        if (dgp.type === 'weekday' || dgp.weekdayEffects) {
            const mult = dgp.weekdayMultipliers || {
                'Monday': 0.8, 'Tuesday': 0.9, 'Wednesday': 1.0,
                'Thursday': 1.0, 'Friday': 1.3, 'Saturday': 1.8, 'Sunday': 1.5
            };
            rate *= mult[dayOfWeek] || 1.0;
        }

        if (dgp.crowdingEffect && this.customers.length > (dgp.crowdThreshold || 20)) {
            const excess = this.customers.length - (dgp.crowdThreshold || 20);
            rate *= Math.max(0.1, 1 - (dgp.crowdReduction || 0.5) * excess / (dgp.crowdThreshold || 20));
        }

        return rate;
    }

    generateCustomerGroup(time, dayOfWeek) {
        const { dgp } = this.config;
        let groupSize = 1, groupId = null;

        if (dgp.groups && Math.random() < (dgp.groupProbability || 0.3)) {
            groupSize = dgp.groupSizeDistribution === 'poisson'
                ? 1 + this.samplePoisson((dgp.meanGroupSize || 2.5) - 1)
                : 2 + Math.floor(Math.random() * 3);
            groupId = this.nextGroupId++;
        }

        const customers = Array.from({ length: groupSize }, (_, i) =>
            this.generateCustomer(time, dayOfWeek, groupId, i, groupSize));

        // PREFERENCE: Set leaderId for followers so they can follow the leader
        if (groupSize > 1) {
            const leaderId = customers[0].id;
            for (let i = 1; i < customers.length; i++) {
                customers[i].leaderId = leaderId;
            }
        }

        return customers;
    }

    generateCustomer(time, dayOfWeek, groupId, indexInGroup, groupSize) {
        const { dgp } = this.config;
        const { entrance } = this.layout;

        let stayTime, type, color;

        if (dgp.customerTypes === 'discrete') {
            if (Math.random() < (dgp.fastProbability || 0.5)) {
                type = 'fast'; stayTime = this.sampleExponential(dgp.fastMeanStay || 8); color = '#4A90D9';
            } else {
                type = 'slow'; stayTime = this.sampleExponential(dgp.slowMeanStay || 25); color = '#D94A4A';
            }
        } else if (dgp.customerTypes === 'continuous') {
            const minStay = dgp.minMeanStay || 5, maxStay = dgp.maxMeanStay || 30;
            const meanStay = minStay + Math.random() * (maxStay - minStay);
            stayTime = this.sampleExponential(meanStay);
            type = 'continuous';
            color = this.interpolateColor('#4A90D9', '#D94A4A', (meanStay - minStay) / (maxStay - minStay));
        } else {
            type = 'normal'; stayTime = this.sampleExponential(dgp.meanStayTime || 15); color = '#5B8C5A';
        }

        if (dgp.crowdingEffect && this.customers.length > (dgp.crowdThreshold || 20)) {
            stayTime *= (1 - (dgp.stayTimeReduction || 0.3));
        }
        stayTime = Math.max(3, stayTime);

        // PREFERENCE: Groups should move together, not separately
        // First member (indexInGroup === 0) is the leader
        const isLeader = indexInGroup === 0;
        const followOffset = groupId && !isLeader ? {
            x: (indexInGroup % 2 === 0 ? 1 : -1) * Math.ceil(indexInGroup / 2) * 8,
            y: Math.ceil(indexInGroup / 2) * 6
        } : null;

        const customer = {
            id: this.nextCustomerId++,
            groupId, type, color,
            arrivalTime: time,
            stayTime,
            departureTime: time + stayTime,
            x: entrance.centerX,
            y: entrance.y - 5,
            path: [],
            pathIndex: 0,
            state: 'entering',  // entering -> shopping -> exiting -> exited
            shelvesVisited: 0,
            maxShelves: 1 + Math.floor(Math.random() * 3),
            speed: 35 + Math.random() * 15,
            waitUntil: 0,
            // Group movement
            isLeader,
            followOffset,
            leaderId: null  // Set after group is created
        };

        this.assignNextDestination(customer);
        return customer;
    }

    /**
     * Assign next destination to customer
     * PREFERENCE: Customer must always have valid path to destination
     * PREFERENCE: Followers don't need their own paths - they follow the leader
     * PREFERENCE: Use browsePositions as destinations (where customers look at items)
     */
    assignNextDestination(customer) {
        // Skip followers - they follow their leader
        if (customer.leaderId !== null && customer.followOffset) {
            return;
        }

        const { browsePositions, exit, store, shelves, aisleWidth } = this.layout;

        if (customer.state === 'exiting') {
            // Path to exit
            customer.path = this.findPath(customer.x, customer.y, exit.centerX, exit.y - 5);
            customer.pathIndex = 0;
            return;
        }

        if (customer.shelvesVisited >= customer.maxShelves ||
            this.currentTime >= customer.departureTime - 2) {
            // Time to leave
            customer.state = 'exiting';
            customer.path = this.findPath(customer.x, customer.y, exit.centerX, exit.y - 5);
            customer.pathIndex = 0;
            return;
        }

        let targetX, targetY;

        // PREFERENCE: Use browse positions if available (explicit shopping spots)
        if (browsePositions && browsePositions.length > 0) {
            const pos = browsePositions[Math.floor(Math.random() * browsePositions.length)];
            targetX = pos.x;
            targetY = pos.y;
        } else if (shelves && shelves.length > 0) {
            // Fallback: Go to a point near a shelf
            const shelf = shelves[Math.floor(Math.random() * shelves.length)];
            const side = Math.floor(Math.random() * 4);
            switch (side) {
                case 0: targetX = shelf.x - aisleWidth / 2; targetY = shelf.y + shelf.height / 2; break;
                case 1: targetX = shelf.x + shelf.width + aisleWidth / 2; targetY = shelf.y + shelf.height / 2; break;
                case 2: targetX = shelf.x + shelf.width / 2; targetY = shelf.y - aisleWidth / 2; break;
                default: targetX = shelf.x + shelf.width / 2; targetY = shelf.y + shelf.height + aisleWidth / 2;
            }
        } else {
            // No destinations - wander randomly in store
            targetX = store.innerX + 20 + Math.random() * (store.innerW - 40);
            targetY = store.innerY + 20 + Math.random() * (store.innerH - 40);
        }

        // Clamp to store bounds
        targetX = Math.max(store.innerX + 5, Math.min(store.innerX + store.innerW - 5, targetX));
        targetY = Math.max(store.innerY + 5, Math.min(store.innerY + store.innerH - 5, targetY));

        customer.path = this.findPath(customer.x, customer.y, targetX, targetY);
        customer.pathIndex = 0;
        customer.state = 'shopping';
    }

    updateCustomer(customer, deltaMinutes) {
        // PREFERENCE: Followers move with their leader, not independently
        if (customer.leaderId !== null && customer.followOffset) {
            const leader = this.customers.find(c => c.id === customer.leaderId);
            if (leader) {
                // Follow leader with offset, smoothly interpolate
                const targetX = leader.x + customer.followOffset.x;
                const targetY = leader.y + customer.followOffset.y;
                const followSpeed = 0.15;  // Smooth following
                customer.x += (targetX - customer.x) * followSpeed;
                customer.y += (targetY - customer.y) * followSpeed;
                customer.state = leader.state;  // Sync state
                if (leader.state === 'exited') {
                    customer.state = 'exited';
                }
                return;
            }
        }

        // Waiting at a shelf
        if (customer.waitUntil > 0) {
            if (this.currentTime >= customer.waitUntil) {
                customer.waitUntil = 0;
                customer.shelvesVisited++;
                this.assignNextDestination(customer);
            }
            return;
        }

        // Already exited - don't update
        if (customer.state === 'exited') return;

        // No path or finished path
        if (!customer.path || customer.path.length === 0 || customer.pathIndex >= customer.path.length) {
            if (customer.state === 'exiting') {
                // PREFERENCE: Mark as exited when close enough to exit
                const { exit } = this.layout;
                const distToExit = Math.hypot(customer.x - exit.centerX, customer.y - exit.y);
                if (distToExit < 25) {  // Increased from 15 for more reliable exit detection
                    customer.state = 'exited';
                } else if (this.currentTime >= this.config.closeTime + 10) {
                    // Force exit if stuck after closing time
                    customer.state = 'exited';
                } else {
                    // Recalculate path to exit
                    customer.path = this.findPath(customer.x, customer.y, exit.centerX, exit.y - 5);
                    customer.pathIndex = 0;
                }
            } else if (customer.state === 'shopping') {
                // Arrived at shelf, browse
                customer.waitUntil = this.currentTime + customer.stayTime / (customer.maxShelves + 1);
            } else {
                this.assignNextDestination(customer);
            }
            return;
        }

        // Move along path
        const target = customer.path[customer.pathIndex];
        const moveSpeed = customer.speed * deltaMinutes * this.config.speedMultiplier;

        const dx = target.x - customer.x;
        const dy = target.y - customer.y;
        const dist = Math.hypot(dx, dy);

        if (dist < moveSpeed) {
            customer.x = target.x;
            customer.y = target.y;
            customer.pathIndex++;
        } else {
            customer.x += (dx / dist) * moveSpeed;
            customer.y += (dy / dist) * moveSpeed;
        }
    }

    update(deltaMs) {
        if (this.finished) return;

        const deltaMinutes = (deltaMs / 1000) * this.config.minutesPerSecond * this.config.speedMultiplier;
        this.currentTime += deltaMinutes;

        // Process arrivals
        while (this.nextArrivalIndex < this.scheduledArrivals.length &&
               this.scheduledArrivals[this.nextArrivalIndex].time <= this.currentTime) {
            const arrival = this.scheduledArrivals[this.nextArrivalIndex];
            for (const customer of arrival.customers) {
                this.customers.push(customer);
                this.data.currentDay.arrivals.push({
                    time: arrival.time, hour: Math.floor(arrival.time / 60),
                    customerId: customer.id, groupId: customer.groupId, type: customer.type
                });
            }
            this.nextArrivalIndex++;
        }

        // Update customers
        for (const customer of this.customers) {
            this.updateCustomer(customer, deltaMinutes);
            // Force exit if way past departure time
            if (customer.state !== 'exiting' && customer.state !== 'exited' &&
                this.currentTime >= customer.departureTime + 5) {
                customer.state = 'exiting';
                this.assignNextDestination(customer);
            }
        }

        // PREFERENCE: Only remove customers who have actually reached exit and are marked 'exited'
        const remaining = [];
        for (const customer of this.customers) {
            if (customer.state === 'exited') {
                this.data.currentDay.departures.push({ time: this.currentTime, customerId: customer.id });
                this.data.currentDay.stayDurations.push(this.currentTime - customer.arrivalTime);
            } else {
                remaining.push(customer);
            }
        }
        this.customers = remaining;

        // Occupancy snapshot
        const currentMinute = Math.floor(this.currentTime);
        if (currentMinute > this.lastOccupancySnapshot) {
            this.data.currentDay.occupancySnapshots.push({ time: currentMinute, count: this.customers.length });
            this.lastOccupancySnapshot = currentMinute;
            // PREFERENCE: Graph scales are pre-computed, not updated dynamically
        }

        // Day end - PREFERENCE: Add failsafe for stuck customers
        const maxOvertime = 30;  // Max minutes past closing before forcing day end
        if (this.currentTime >= this.config.closeTime) {
            if (this.customers.length === 0) {
                this.endDay();
            } else if (this.currentTime >= this.config.closeTime + maxOvertime) {
                // Force remove all stuck customers
                console.warn(`Forcing day end: ${this.customers.length} customers stuck after ${maxOvertime}min overtime`);
                for (const customer of this.customers) {
                    this.data.currentDay.departures.push({ time: this.currentTime, customerId: customer.id });
                    this.data.currentDay.stayDurations.push(this.currentTime - customer.arrivalTime);
                }
                this.customers = [];
                this.endDay();
            }
        }

        if (this.onStatsUpdate) this.onStatsUpdate(this.getStats());

        // PREFERENCE: Progressive data updates - update periodically during animation
        const now = performance.now();
        if (this.onDataUpdate && now - this.lastDataUpdateTime > this.dataUpdateInterval) {
            this.lastDataUpdateTime = now;
            this.onDataUpdate(this.buildProgressiveData());
        }
    }

    /**
     * PREFERENCE: Build partial data during animation (before all days complete)
     * Shows data collected so far, including current day in progress
     * Returns format compatible with buildDataVariables() in game.js
     */
    buildProgressiveData() {
        const { days } = this.data;
        const current = this.data.currentDay;

        // Build current day as a partial day object
        const currentDayData = {
            dayIndex: this.currentDay,
            dayOfWeek: this.getDayOfWeek(this.currentDay),
            arrivals: current.arrivals,
            stayDurations: current.stayDurations,
            totalCustomers: current.arrivals.length,
            maxOccupancy: current.occupancySnapshots.length > 0
                ? Math.max(...current.occupancySnapshots.map(s => s.count))
                : 0,
            occupancy: current.occupancySnapshots
        };

        // Combine completed days + current day for flat arrays
        const allDays = [...days, currentDayData];

        const allArrivalTimes = allDays.flatMap(d => d.arrivals.map(a => a.time));
        const allArrivalHours = allDays.flatMap(d => d.arrivals.map(a => Math.floor(a.time / 60)));
        const allStayDurations = allDays.flatMap(d => d.stayDurations);
        const allMaxOccupancies = allDays.map(d => d.maxOccupancy).filter(x => x > 0);

        return {
            // Flat numerical arrays for DSL
            arrivalTimes: allArrivalTimes,
            arrivalHours: allArrivalHours,
            stayDurations: allStayDurations,
            maxOccupancies: allMaxOccupancies,
            n: allArrivalTimes.length,

            // Days structure for game.js compatibility
            days: allDays,
            numDays: allDays.length,
            dayNames: allDays.map(d => d.dayOfWeek),
            allArrivals: allDays.flatMap(d => d.arrivals),
            allStayDurations: allStayDurations,

            // Progress indicator
            currentDay: this.currentDay + 1,
            inProgress: true
        };
    }

    endDay() {
        const dayData = {
            dayIndex: this.currentDay,
            dayOfWeek: this.getDayOfWeek(this.currentDay),
            arrivals: [...this.data.currentDay.arrivals],
            departures: [...this.data.currentDay.departures],
            stayDurations: [...this.data.currentDay.stayDurations],
            occupancySnapshots: [...this.data.currentDay.occupancySnapshots],
            maxOccupancy: Math.max(...this.data.currentDay.occupancySnapshots.map(s => s.count), 0),
            totalCustomers: this.data.currentDay.arrivals.length
        };
        this.data.days.push(dayData);

        // PREFERENCE: Graph scales are pre-computed at initialization, not updated here

        this.currentDay++;
        if (this.currentDay >= this.config.numDays) {
            this.finish();
        } else {
            this.initializeDay();
        }
    }

    finish() {
        this.finished = true;
        this.running = false;
        if (this.onDataUpdate) this.onDataUpdate(this.buildPlayerData());
        if (this.onFinish) this.onFinish();
    }

    /**
     * PREFERENCE: Return useful numerical data for DSL calculations
     * - arrivalTimes: array of times in minutes (numbers, not objects)
     * - stayDurations: array of durations in minutes (numbers)
     * - arrivalHours: array of hour numbers for binning
     */
    buildPlayerData() {
        const { days } = this.data;

        // Extract numerical arrays that are useful for calculations
        const allArrivalTimes = days.flatMap(d => d.arrivals.map(a => a.time));
        const allArrivalHours = days.flatMap(d => d.arrivals.map(a => Math.floor(a.time / 60)));
        const allStayDurations = days.flatMap(d => d.stayDurations);
        const allMaxOccupancies = days.map(d => d.maxOccupancy);

        return {
            // Numerical arrays for DSL calculations
            arrivalTimes: allArrivalTimes,
            arrivalHours: allArrivalHours,
            stayDurations: allStayDurations,
            maxOccupancies: allMaxOccupancies,

            // Summary statistics
            n: allArrivalTimes.length,
            numDays: days.length,
            dayNames: days.map(d => d.dayOfWeek),

            // Per-day data (for advanced use)
            days: days.map(d => ({
                dayOfWeek: d.dayOfWeek,
                dayIndex: d.dayIndex,
                arrivalTimes: d.arrivals.map(a => a.time),
                arrivalHours: d.arrivals.map(a => Math.floor(a.time / 60)),
                stayDurations: d.stayDurations,
                maxOccupancy: d.maxOccupancy,
                totalCustomers: d.totalCustomers
            }))
        };
    }

    getStats() {
        return {
            time: this.formatTime(this.currentTime),
            day: this.currentDay + 1,
            dayOfWeek: this.getDayOfWeek(this.currentDay),
            occupancy: this.customers.length,
            totalArrivals: this.data.currentDay.arrivals.length
        };
    }

    // === Drawing ===

    draw() {
        const { ctx, width, height } = this;
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(0, 0, width, height);
        this.drawStore();
        this.drawCustomers();
        this.drawClock();
        this.drawPanels();
    }

    drawStore() {
        const { ctx } = this;
        const { store, entrance, exit, shelves } = this.layout;

        // Floor
        ctx.fillStyle = '#FAFAFA';
        ctx.fillRect(store.innerX, store.innerY, store.innerW, store.innerH);

        // Walls
        ctx.strokeStyle = '#333';
        ctx.lineWidth = store.wallThickness;
        ctx.lineCap = 'square';

        // Top, left, right walls
        ctx.beginPath();
        ctx.moveTo(store.outerX, store.outerY);
        ctx.lineTo(store.outerX + store.outerW, store.outerY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(store.outerX, store.outerY);
        ctx.lineTo(store.outerX, store.outerY + store.outerH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(store.outerX + store.outerW, store.outerY);
        ctx.lineTo(store.outerX + store.outerW, store.outerY + store.outerH);
        ctx.stroke();

        // Bottom wall with gaps
        const bottomY = store.outerY + store.outerH;
        ctx.beginPath();
        ctx.moveTo(store.outerX, bottomY);
        ctx.lineTo(entrance.x, bottomY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(entrance.x + entrance.width, bottomY);
        ctx.lineTo(exit.x, bottomY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(exit.x + exit.width, bottomY);
        ctx.lineTo(store.outerX + store.outerW, bottomY);
        ctx.stroke();

        // Entrance/exit labels - PREFERENCE: Finnish
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('SISÄÄN', entrance.centerX, bottomY + 11);
        ctx.fillStyle = '#E53935';
        ctx.fillText('ULOS', exit.centerX, bottomY + 11);

        // Shelves
        for (const shelf of shelves) {
            ctx.fillStyle = '#8D6E63';
            ctx.fillRect(shelf.x, shelf.y, shelf.width, shelf.height);
            ctx.fillStyle = '#6D4C41';
            ctx.fillRect(shelf.x, shelf.y + shelf.height - 2, shelf.width, 2);
        }

        // PREFERENCE: Browse positions are backend-only (customer destinations)
        // Not drawn visually - they're just for pathfinding/customer behavior
    }

    drawCustomers() {
        const { ctx } = this;

        // Group lines
        const groups = new Map();
        for (const c of this.customers) {
            if (c.groupId) {
                if (!groups.has(c.groupId)) groups.set(c.groupId, []);
                groups.get(c.groupId).push(c);
            }
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        for (const [, members] of groups) {
            if (members.length > 1) {
                ctx.beginPath();
                ctx.moveTo(members[0].x, members[0].y);
                for (let i = 1; i < members.length; i++) ctx.lineTo(members[i].x, members[i].y);
                ctx.stroke();
            }
        }

        // Customers
        for (const c of this.customers) {
            ctx.fillStyle = c.color;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }

    drawClock() {
        const { ctx } = this;
        const { store } = this.layout;

        ctx.fillStyle = '#222';
        ctx.fillRect(store.innerX + 4, store.innerY + 4, 58, 20);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this.formatTime(this.currentTime), store.innerX + 10, store.innerY + 18);

        if (this.config.numDays > 1) {
            ctx.fillStyle = '#222';
            ctx.fillRect(store.innerX + 66, store.innerY + 4, 75, 20);
            ctx.fillStyle = '#FFF';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${this.getDayOfWeek(this.currentDay).slice(0, 3)} ${this.currentDay + 1}/${this.config.numDays}`,
                store.innerX + 70, store.innerY + 17);
        }

        const occX = store.innerX + store.innerW - 50;
        ctx.fillStyle = '#222';
        ctx.fillRect(occX, store.innerY + 4, 45, 20);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`👥${this.customers.length}`, occX + 23, store.innerY + 18);
    }

    /**
     * PREFERENCE: Graphs need clear axis labels and FIXED scales
     */
    drawPanels() {
        const { ctx } = this;
        const { panels } = this.layout;

        ctx.fillStyle = '#FFF';
        ctx.fillRect(panels.x, panels.y, panels.width, panels.height);
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.strokeRect(panels.x, panels.y, panels.width, panels.height);

        const pad = 6;
        const innerW = panels.width - 2 * pad;
        const panelH = (panels.height - 4 * pad) / 3;

        this.drawArrivalsPanel(panels.x + pad, panels.y + pad, innerW, panelH - 4);
        this.drawOccupancyPanel(panels.x + pad, panels.y + pad + panelH, innerW, panelH - 4);
        this.drawStayDurationPanel(panels.x + pad, panels.y + pad + 2 * panelH, innerW, panelH - 4);
    }

    drawArrivalsPanel(x, y, w, h) {
        const { ctx } = this;
        const { arrivals } = this.data.currentDay;
        const { openTime, closeTime } = this.config;

        // Title - PREFERENCE: Finnish, visible labels
        ctx.fillStyle = '#222';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Saapumiset / tunti', x, y + 10);

        const chartX = x + 25;
        const chartY = y + 16;
        const chartW = w - 30;
        const chartH = h - 28;

        // Count by hour
        const hours = [];
        for (let h = Math.floor(openTime / 60); h < Math.ceil(closeTime / 60); h++) hours.push(h);
        const counts = hours.map(h => arrivals.filter(a => Math.floor(a.time / 60) === h).length);

        // PREFERENCE: Fixed scale for y-axis
        const maxY = this.graphScales.maxArrivalsPerHour;
        const barW = Math.max(2, chartW / hours.length - 2);

        // Y-axis
        ctx.strokeStyle = '#CCC';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartX, chartY);
        ctx.lineTo(chartX, chartY + chartH);
        ctx.lineTo(chartX + chartW, chartY + chartH);
        ctx.stroke();

        // Y-axis labels - PREFERENCE: More visible (#555 not #888)
        ctx.fillStyle = '#555';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(maxY.toString(), chartX - 3, chartY + 4);
        ctx.fillText('0', chartX - 3, chartY + chartH + 3);

        // Bars
        hours.forEach((h, i) => {
            const barH = (counts[i] / maxY) * chartH;
            const bx = chartX + i * (barW + 2) + 2;
            ctx.fillStyle = '#5C9BD1';
            ctx.fillRect(bx, chartY + chartH - barH, barW, barH);

            // X-axis label every 2 hours
            if (i % 2 === 0) {
                ctx.fillStyle = '#555';
                ctx.font = '8px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(h.toString(), bx + barW / 2, chartY + chartH + 9);
            }
        });

        // X-axis label - PREFERENCE: Finnish
        ctx.fillStyle = '#555';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('klo', chartX + chartW / 2, chartY + chartH + 18);
    }

    drawOccupancyPanel(x, y, w, h) {
        const { ctx } = this;
        const { occupancySnapshots } = this.data.currentDay;
        const { openTime, closeTime } = this.config;

        // Title - PREFERENCE: Finnish, visible labels
        ctx.fillStyle = '#222';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Asiakkaita kaupassa', x, y + 10);

        if (occupancySnapshots.length < 2) return;

        const chartX = x + 25;
        const chartY = y + 16;
        const chartW = w - 30;
        const chartH = h - 28;

        // PREFERENCE: Fixed scale
        const maxY = this.graphScales.maxOccupancy;
        const timeRange = closeTime - openTime;

        // Axes
        ctx.strokeStyle = '#CCC';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartX, chartY);
        ctx.lineTo(chartX, chartY + chartH);
        ctx.lineTo(chartX + chartW, chartY + chartH);
        ctx.stroke();

        // Y-axis labels - PREFERENCE: More visible
        ctx.fillStyle = '#555';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(maxY.toString(), chartX - 3, chartY + 4);
        ctx.fillText('0', chartX - 3, chartY + chartH + 3);

        // Line
        ctx.strokeStyle = '#66BB6A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        occupancySnapshots.forEach((s, i) => {
            const px = chartX + ((s.time - openTime) / timeRange) * chartW;
            const py = chartY + chartH - (s.count / maxY) * chartH;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // X-axis labels - PREFERENCE: Finnish, more visible
        ctx.fillStyle = '#555';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('9', chartX, chartY + chartH + 9);
        ctx.fillText('15', chartX + chartW / 2, chartY + chartH + 9);
        ctx.fillText('21', chartX + chartW, chartY + chartH + 9);
        ctx.fillText('klo', chartX + chartW / 2, chartY + chartH + 18);
    }

    drawStayDurationPanel(x, y, w, h) {
        const { ctx } = this;
        const { stayDurations } = this.data.currentDay;

        // Title - PREFERENCE: Finnish, visible labels
        ctx.fillStyle = '#222';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Käyntiaika (min)', x, y + 10);

        if (stayDurations.length === 0) return;

        const chartX = x + 25;
        const chartY = y + 16;
        const chartW = w - 30;
        const chartH = h - 28;

        // PREFERENCE: Fixed scale
        const maxDuration = this.graphScales.maxStayDuration;
        const numBins = 8;
        const binWidth = maxDuration / numBins;
        const bins = new Array(numBins).fill(0);
        for (const d of stayDurations) {
            const idx = Math.min(Math.floor(d / binWidth), numBins - 1);
            bins[idx]++;
        }
        const maxCount = Math.max(...bins, 1);

        // Axes
        ctx.strokeStyle = '#CCC';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartX, chartY);
        ctx.lineTo(chartX, chartY + chartH);
        ctx.lineTo(chartX + chartW, chartY + chartH);
        ctx.stroke();

        // Y-axis labels - PREFERENCE: More visible
        ctx.fillStyle = '#555';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(maxCount.toString(), chartX - 3, chartY + 4);
        ctx.fillText('0', chartX - 3, chartY + chartH + 3);

        // Bars
        const barW = Math.max(2, chartW / numBins - 2);
        bins.forEach((count, i) => {
            const barH = (count / maxCount) * chartH;
            const bx = chartX + i * (barW + 2) + 2;
            ctx.fillStyle = '#AB47BC';
            ctx.fillRect(bx, chartY + chartH - barH, barW, barH);
        });

        // X-axis labels - PREFERENCE: Finnish, more visible
        ctx.fillStyle = '#555';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('0', chartX, chartY + chartH + 9);
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxDuration).toString(), chartX + chartW, chartY + chartH + 9);
        ctx.textAlign = 'center';
        ctx.fillText('min', chartX + chartW / 2, chartY + chartH + 18);
    }

    // === Utilities ===

    formatTime(m) {
        return `${Math.floor(m / 60).toString().padStart(2, '0')}:${Math.floor(m % 60).toString().padStart(2, '0')}`;
    }

    getDayOfWeek(i) {
        return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i % 7];
    }

    sampleExponential(mean) { return -mean * Math.log(Math.random()); }

    samplePoisson(lambda) {
        let L = Math.exp(-lambda), k = 0, p = 1;
        do { k++; p *= Math.random(); } while (p > L);
        return k - 1;
    }

    interpolateColor(c1, c2, t) {
        const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
        const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
        return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
    }

    // === Animation Control ===

    start() {
        if (this.finished) return;
        this.running = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }

    pause() {
        this.running = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    reset() {
        this.pause();
        this.currentDay = 0;
        this.finished = false;
        this.data.days = [];
        this.nextGroupId = 1;
        this.lastDataUpdateTime = 0;  // Reset progressive update timer
        this.initializeDay();
        this.draw();
        // Send initial empty data
        if (this.onDataUpdate) {
            this.onDataUpdate(this.buildProgressiveData());
        }
    }

    animate() {
        if (!this.running) return;
        const now = performance.now();
        const deltaMs = Math.min(now - this.lastFrameTime, 100);  // Cap delta to avoid jumps
        this.lastFrameTime = now;
        this.update(deltaMs);
        this.draw();
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    setSpeed(multiplier) { this.config.speedMultiplier = multiplier; }

    destroy() {
        this.pause();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}

// Register
if (typeof AnimationRegistry !== 'undefined') {
    AnimationRegistry.register('store-occupancy', {
        class: StoreOccupancyAnimation,
        statsConfig: {
            time: { label: 'Aika', initial: '09:00' },
            dayOfWeek: { label: 'Päivä', initial: 'Monday' },
            occupancy: { label: 'Asiakkaita', initial: '0' },
            totalArrivals: { label: 'Saapuneita', initial: '0' }
        },
        statsMapper: (stats) => ({
            'Aika': stats.time, 'Päivä': stats.dayOfWeek,
            'Asiakkaita': stats.occupancy, 'Saapuneita': stats.totalArrivals
        })
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StoreOccupancyAnimation;
}
