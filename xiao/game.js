class Gem {
    constructor(type, special = null) {
        this.type = type; // 0-5 for colors
        this.special = special; // null, 'stripedH', 'stripedV', 'bomb', 'rainbow'
    }
}

class Board {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.grid = [];
        this.types = 6;
        this.init();
    }

    // Initialize board with random gems ensuring no initial matches
    init() {
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                let gem;
                do {
                    gem = new Gem(Math.floor(Math.random() * this.types));
                    this.grid[r][c] = gem;
                } while (this.isPartOfMatch(r, c));
            }
        }
    }

    // Check if gem at (r,c) is part of a horizontal or vertical match
    isPartOfMatch(r, c) {
        const type = this.grid[r][c].type;
        // check horizontal
        let count = 1;
        for (let i = c - 1; i >= 0 && this.grid[r][i].type === type; i--) count++;
        for (let i = c + 1; i < this.cols && this.grid[r][i].type === type; i++) count++;
        if (count >= 3) return true;
        // check vertical
        count = 1;
        for (let i = r - 1; i >= 0 && this.grid[i][c].type === type; i--) count++;
        for (let i = r + 1; i < this.rows && this.grid[i][c].type === type; i++) count++;
        return count >= 3;
    }

    // Swap two gems and check for matches or rainbow activation
    swap(r1, c1, r2, c2) {
        const gem1 = this.grid[r1][c1];
        const gem2 = this.grid[r2][c2];
        this.grid[r1][c1] = gem2;
        this.grid[r2][c2] = gem1;

        // rainbow activation
        if (gem1.special === 'rainbow' || gem2.special === 'rainbow') {
            const targetType = gem1.special === 'rainbow' ? gem2.type : gem1.type;
            this.activateRainbow(targetType);
            this.grid[r1][c1] = null;
            this.grid[r2][c2] = null;
            return true;
        }

        const match = this.findAllMatches();
        if (match.length === 0) {
            // swap back if no match
            this.grid[r1][c1] = gem1;
            this.grid[r2][c2] = gem2;
            return false;
        }
        return true;
    }

    // Activate rainbow: remove all gems of targetType
    activateRainbow(targetType) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] && this.grid[r][c].type === targetType) {
                    this.grid[r][c] = null;
                }
            }
        }
    }

    // Find all matched positions (arrays of {r,c})
    findAllMatches() {
        const matches = [];
        const checkLine = (cells) => {
            let run = [];
            for (let i = 0; i < cells.length; i++) {
                const { r, c } = cells[i];
                const type = this.grid[r][c]?.type;
                if (run.length === 0 || (this.grid[run[0].r][run[0].c]?.type === type && type !== undefined)) {
                    run.push({ r, c });
                } else {
                    if (run.length >= 3) matches.push([...run]);
                    run = [{ r, c }];
                }
            }
            if (run.length >= 3) matches.push([...run]);
        };

        // check rows
        for (let r = 0; r < this.rows; r++) {
            const cells = [];
            for (let c = 0; c < this.cols; c++) cells.push({ r, c });
            checkLine(cells);
        }
        // check cols
        for (let c = 0; c < this.cols; c++) {
            const cells = [];
            for (let r = 0; r < this.rows; r++) cells.push({ r, c });
            checkLine(cells);
        }

        return matches;
    }

    // Remove matched gems and create special gems
    removeMatches(matches) {
        const toRemove = new Set();
        matches.forEach(run => {
            run.forEach(p => toRemove.add(`${p.r},${p.c}`));
            if (run.length === 4) {
                const cell = run[0];
                const orientation = run.every(p => p.r === cell.r) ? 'stripedV' : 'stripedH';
                this.grid[cell.r][cell.c] = new Gem(this.grid[cell.r][cell.c].type, orientation);
                toRemove.delete(`${cell.r},${cell.c}`);
            } else if (run.length >= 5) {
                const cell = run[0];
                this.grid[cell.r][cell.c] = new Gem(0, 'rainbow');
                toRemove.delete(`${cell.r},${cell.c}`);
            }
        });
        // activate special gems
        for (let key of Array.from(toRemove)) {
            const [r, c] = key.split(',').map(Number);
            const gem = this.grid[r][c];
            if (gem && gem.special) {
                this.activateSpecial(gem, r, c, toRemove);
            }
        }
        // remove gems
        for (let key of toRemove) {
            const [r, c] = key.split(',').map(Number);
            this.grid[r][c] = null;
        }
        return toRemove.size;
    }

    // Apply special gem effects
    activateSpecial(gem, r, c, set) {
        if (gem.special === 'stripedH') {
            for (let i = 0; i < this.cols; i++) set.add(`${r},${i}`);
        } else if (gem.special === 'stripedV') {
            for (let i = 0; i < this.rows; i++) set.add(`${i},${c}`);
        } else if (gem.special === 'bomb') {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) set.add(`${nr},${nc}`);
                }
            }
        }
    }

    // Collapse and fill new gems
    collapse() {
        for (let c = 0; c < this.cols; c++) {
            let pointer = this.rows - 1;
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c]) {
                    this.grid[pointer][c] = this.grid[r][c];
                    pointer--;
                }
            }
            for (let r = pointer; r >= 0; r--) {
                this.grid[r][c] = new Gem(Math.floor(Math.random() * this.types));
            }
        }
    }
}

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.board = new Board(8, 8);
        this.gemSize = canvas.width / 8;
        this.selected = null;
        this.score = 0;
        this.moves = 30;
        this.bindEvents();
        this.updateUI();
        requestAnimationFrame(() => this.loop());
    }

    bindEvents() {
        this.canvas.addEventListener('mousedown', e => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const r = Math.floor(y / this.gemSize);
            const c = Math.floor(x / this.gemSize);
            if (!this.selected) {
                this.selected = { r, c };
            } else {
                const { r: r1, c: c1 } = this.selected;
                if (Math.abs(r1 - r) + Math.abs(c1 - c) === 1) {
                    if (this.moves > 0) {
                        const moved = this.board.swap(r1, c1, r, c);
                        if (moved) {
                            this.moves--;
                            this.processMatches();
                        }
                    }
                }
                this.selected = null;
            }
        });
    }

    processMatches() {
        let chain = 0;
        while (true) {
            const matches = this.board.findAllMatches();
            if (matches.length === 0) break;
            const removed = this.board.removeMatches(matches);
            this.score += removed * 10 * (chain + 1);
            this.board.collapse();
            chain++;
        }
        this.updateUI();
    }

    updateUI() {
        document.getElementById('score-value').textContent = this.score;
        document.getElementById('moves-value').textContent = this.moves;
    }

    drawGem(gem, r, c) {
        const size = this.gemSize;
        const x = c * size;
        const y = r * size;
        const colors = ['#e57373', '#ba68c8', '#64b5f6', '#4db6ac', '#ffd54f', '#ff8a65'];
        this.ctx.fillStyle = colors[gem.type];
        this.ctx.beginPath();
        this.ctx.arc(x + size / 2, y + size / 2, size * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        if (gem.special) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeText(gem.special[0].toUpperCase(), x + size / 2 - 4, y + size / 2 + 4);
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) {
                const gem = this.board.grid[r][c];
                if (gem) this.drawGem(gem, r, c);
            }
        }
        if (this.selected) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                this.selected.c * this.gemSize,
                this.selected.r * this.gemSize,
                this.gemSize,
                this.gemSize
            );
        }
    }

    loop() {
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

window.addEventListener('load', () => {
    const canvas = document.getElementById('game-canvas');
    new Game(canvas);
});
