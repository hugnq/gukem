/* ============================================================================
   TINY BATTLE - ENGINE CORE (js/engine-core.js)
   Web Audio SoundFX, Offscreen Projectile Cache, ParticlePool & SpriteAtlas
   ============================================================================ */

// ============================================================================
// 1. HỆ THỐNG ÂM THANH WEB AUDIO API (SOUNDFX)
// ============================================================================
export class SoundFX {
    constructor() {
        this.enabled = true;
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    play(type) {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            if (type === 'beam') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(360, now);
                osc.frequency.exponentialRampToValueAtTime(110, now + 0.07);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.07);
                osc.start(now);
                osc.stop(now + 0.07);
            } else if (type === 'cannon') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(155, now);
                osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
                gain.gain.setValueAtTime(0.11, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
                osc.start(now);
                osc.stop(now + 0.18);
            } else if (type === 'boom') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(115, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
                gain.gain.setValueAtTime(0.22, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'emp') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(95, now + 0.42);
                gain.gain.setValueAtTime(0.16, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.42);
                osc.start(now);
                osc.stop(now + 0.42);
            } else if (type === 'blitz') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(280, now);
                osc.frequency.exponentialRampToValueAtTime(820, now + 0.28);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.28);
                osc.start(now);
                osc.stop(now + 0.28);
            } else if (type === 'spawn') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(340, now);
                osc.frequency.exponentialRampToValueAtTime(620, now + 0.1);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'gas') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'airstrike') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(240, now);
                osc.frequency.linearRampToValueAtTime(110, now + 0.65);
                gain.gain.setValueAtTime(0.11, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.65);
                osc.start(now);
                osc.stop(now + 0.65);
            } else if (type === 'upgrade') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(420, now);
                osc.frequency.exponentialRampToValueAtTime(920, now + 0.22);
                gain.gain.setValueAtTime(0.14, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
                osc.start(now);
                osc.stop(now + 0.22);
            }
        } catch (e) {}
    }
}

export const sfx = new SoundFX();

// ============================================================================
// 2. OFFSCREEN CANVAS CACHING CHO ĐẠN PHÁO (CÓ CẢ ĐẠN MASTER AQUA & DEMON PURPLE)
// ============================================================================
export class ProjectileSpriteCache {
    constructor() {
        this.angleSteps = 36;
        this.shellBlue = [];
        this.shellRed = [];
        this.rocketBlue = [];
        this.rocketRed = [];
        this.rocketMaster = [];
        this.rocketDemon = [];
        this.muzzleStarCanvas = null;
        this.buildCache();
    }

    buildCache() {
        for (let i = 0; i < this.angleSteps; i++) {
            const angle = (i / this.angleSteps) * Math.PI * 2;
            this.shellBlue.push(this.createRotatedProjectile(angle, '#fde047', '#0284c7', false));
            this.shellRed.push(this.createRotatedProjectile(angle, '#fb7185', '#991b1b', false));
            this.rocketBlue.push(this.createRotatedProjectile(angle, '#38bdf8', '#fde047', true));
            this.rocketRed.push(this.createRotatedProjectile(angle, '#f97316', '#dc2626', true));
            this.rocketMaster.push(this.createRotatedProjectile(angle, '#00f2fe', '#0284c7', true));
            this.rocketDemon.push(this.createRotatedProjectile(angle, '#f0abfc', '#7e22ce', true));
        }
        this.muzzleStarCanvas = this.createMuzzleStarSprite();
    }

    createRotatedProjectile(angle, fillCol, finCol, isRocket) {
        const size = 20;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const cx = c.getContext('2d');
        cx.translate(size / 2, size / 2);
        cx.rotate(angle);

        if (isRocket) {
            cx.fillStyle = finCol;
            cx.fillRect(-7, -4, 4, 8);
            cx.fillStyle = '#f8fafc';
            cx.fillRect(-5, -2.5, 9, 5);
            cx.fillStyle = fillCol;
            cx.beginPath();
            cx.moveTo(4, -3);
            cx.lineTo(8, 0);
            cx.lineTo(4, 3);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = '#0f172a';
            cx.lineWidth = 1;
            cx.strokeRect(-5, -2.5, 9, 5);
        } else {
            cx.fillStyle = fillCol;
            cx.beginPath();
            cx.ellipse(0, 0, 5.5, 3.5, 0, 0, Math.PI * 2);
            cx.fill();
            cx.lineWidth = 1.4;
            cx.strokeStyle = '#0f172a';
            cx.stroke();
            cx.fillStyle = '#ffffff';
            cx.fillRect(1, -1.2, 2.5, 1.5);
        }
        return c;
    }

    createMuzzleStarSprite() {
        const size = 28;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const cx = c.getContext('2d');
        cx.translate(size / 2, size / 2);

        cx.fillStyle = '#f97316';
        cx.beginPath();
        const outer = 13;
        const inner = 3.5;
        for (let i = 0; i < 8; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const a = (i * Math.PI) / 4;
            if (i === 0) cx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else cx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        cx.closePath();
        cx.fill();

        cx.fillStyle = '#fde047';
        cx.beginPath();
        for (let i = 0; i < 8; i++) {
            const r = i % 2 === 0 ? outer * 0.72 : inner * 0.65;
            const a = (i * Math.PI) / 4;
            if (i === 0) cx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else cx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        cx.closePath();
        cx.fill();
        return c;
    }

    getProjectileSprite(angle, isBlue, isRocket, auraType = 'none') {
        let norm = angle % (Math.PI * 2);
        if (norm < 0) norm += Math.PI * 2;
        const idx = Math.floor((norm / (Math.PI * 2)) * this.angleSteps) % this.angleSteps;
        if (isBlue && auraType === 'demon_abyss') return this.rocketDemon[idx];
        if (isBlue && auraType === 'master_aqua') return this.rocketMaster[idx];
        if (isRocket) return isBlue ? this.rocketBlue[idx] : this.rocketRed[idx];
        return isBlue ? this.shellBlue[idx] : this.shellRed[idx];
    }
}

export const projCache = new ProjectileSpriteCache();

// ============================================================================
// 3. OBJECT POOLING 240 HẠT CỐ ĐỊNH
// ============================================================================
export class ParticlePool {
    constructor(size = 240) {
        this.size = size;
        this.pool = Array.from({ length: size }, () => ({
            active: false,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            radius: 3,
            alpha: 1,
            color: '#fde047',
            decay: 1.5,
            shape: 'circle',
            angle: 0
        }));
        this.cursor = 0;
    }

    spawn(x, y, vx, vy, radius, color, decay = 1.8, shape = 'circle', angle = 0) {
        for (let i = 0; i < this.size; i++) {
            const idx = (this.cursor + i) % this.size;
            const p = this.pool[idx];
            if (!p.active) {
                this.cursor = (idx + 1) % this.size;
                p.active = true;
                p.x = x;
                p.y = y;
                p.vx = vx;
                p.vy = vy;
                p.radius = radius;
                p.alpha = 1.0;
                p.color = color;
                p.decay = decay;
                p.shape = shape;
                p.angle = angle;
                return p;
            }
        }
        const p = this.pool[this.cursor];
        this.cursor = (this.cursor + 1) % this.size;
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.radius = radius;
        p.alpha = 1.0;
        p.color = color;
        p.decay = decay;
        p.shape = shape;
        p.angle = angle;
        return p;
    }

    update(dt) {
        for (let i = 0; i < this.size; i++) {
            const p = this.pool[i];
            if (!p.active) continue;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.shape === 'wake') {
                p.radius += dt * 5.5;
            }
            p.alpha -= p.decay * dt;
            if (p.alpha <= 0) {
                p.active = false;
            }
        }
    }

    draw(ctx) {
        for (let i = 0; i < this.size; i++) {
            const p = this.pool[i];
            if (!p.active || p.alpha <= 0) continue;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            if (p.shape === 'wake') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(4, 0);
                ctx.lineTo(-p.radius, -p.radius * 0.65);
                ctx.moveTo(4, 0);
                ctx.lineTo(-p.radius, p.radius * 0.65);
                ctx.stroke();
            } else if (p.shape === 'dust') {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x - p.radius * 0.5, p.y - p.radius * 0.5, p.radius, p.radius);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    clear() {
        for (let i = 0; i < this.size; i++) {
            this.pool[i].active = false;
        }
    }
}

export const particlePool = new ParticlePool(240);

// ============================================================================
// 4. ATLAS BÓC TÁCH SPRITE SHEET ("Preview.png")
// ============================================================================
export class SpriteAtlas {
    constructor() {
        this.ready = false;
        this.tiles = new Map();
        this.bakedMapCanvas = null;
        this.onReadyCallback = null;

        this.image = new Image();
        this.image.src = 'Preview.png';
        this.image.onload = () => this.processAtlas();
        this.image.onerror = () => {
            if (!this.image.src.endsWith('preview.png')) {
                this.image.src = 'preview.png';
            }
        };
    }

    isSolidTerrainTile(col, row) {
        if (col <= 3 && row <= 5) return true;
        if (col === 4 && (row === 0 || row === 1 || row === 8)) return true;
        return false;
    }

    extractUnitOrBuilding(sx, sy, tileW, bgR, bgG, bgB, hasFullData, filterDisconnected = true) {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = tileW;
        tileCanvas.height = tileW;
        const tCtx = tileCanvas.getContext('2d');
        tCtx.imageSmoothingEnabled = false;
        tCtx.drawImage(this.image, sx, sy, tileW, tileW, 0, 0, tileW, tileW);

        if (!hasFullData) return tileCanvas;

        try {
            const subData = tCtx.getImageData(0, 0, tileW, tileW);
            const d = subData.data;
            const total = tileW * tileW;
            const visitedBg = new Uint8Array(total);
            const queue = [];

            const matchBg = (idx, tol = 24) =>
                Math.abs(d[idx] - bgR) <= tol &&
                Math.abs(d[idx + 1] - bgG) <= tol &&
                Math.abs(d[idx + 2] - bgB) <= tol;

            for (let x = 0; x < tileW; x++) {
                queue.push(x, (tileW - 1) * tileW + x);
            }
            for (let y = 0; y < tileW; y++) {
                queue.push(y * tileW, y * tileW + (tileW - 1));
            }

            while (queue.length > 0) {
                const pos = queue.pop();
                if (pos < 0 || pos >= total || visitedBg[pos]) continue;
                visitedBg[pos] = 1;

                const pIdx = pos * 4;
                if (matchBg(pIdx, 24)) {
                    d[pIdx + 3] = 0;
                    const px = pos % tileW;
                    const py = (pos / tileW) | 0;
                    if (px > 0) queue.push(pos - 1);
                    if (px < tileW - 1) queue.push(pos + 1);
                    if (py > 0) queue.push(pos - tileW);
                    if (py < tileW - 1) queue.push(pos + tileW);
                }
            }

            if (filterDisconnected) {
                const keep = new Uint8Array(total);
                const fgQueue = [];
                const c0 = Math.max(2, Math.floor(tileW * 0.2));
                const c1 = Math.min(tileW - 3, Math.ceil(tileW * 0.8));

                for (let y = c0; y <= c1; y++) {
                    for (let x = c0; x <= c1; x++) {
                        const pos = y * tileW + x;
                        if (d[pos * 4 + 3] > 0) {
                            keep[pos] = 1;
                            fgQueue.push(pos);
                        }
                    }
                }

                while (fgQueue.length > 0) {
                    const pos = fgQueue.pop();
                    const px = pos % tileW;
                    const py = (pos / tileW) | 0;

                    for (let ny = Math.max(0, py - 1); ny <= Math.min(tileW - 1, py + 1); ny++) {
                        for (let nx = Math.max(0, px - 1); nx <= Math.min(tileW - 1, px + 1); nx++) {
                            const nPos = ny * tileW + nx;
                            if (!keep[nPos] && d[nPos * 4 + 3] > 0) {
                                keep[nPos] = 1;
                                fgQueue.push(nPos);
                            }
                        }
                    }
                }

                for (let i = 0; i < total; i++) {
                    if (!keep[i]) d[i * 4 + 3] = 0;
                }
            }

            tCtx.putImageData(subData, 0, 0);
        } catch (e) {}

        return tileCanvas;
    }

    extractRow10Icon(sx, sy, sw, sh, outSize, bgR, bgG, bgB, hasFullData) {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = outSize;
        tileCanvas.height = outSize;
        const tCtx = tileCanvas.getContext('2d');
        tCtx.imageSmoothingEnabled = false;

        const w = Math.max(1, Math.round(sw));
        const h = Math.max(1, Math.round(sh));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.drawImage(this.image, Math.round(sx), Math.round(sy), w, h, 0, 0, w, h);

        if (!hasFullData) {
            tCtx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, outSize, outSize);
            return tileCanvas;
        }

        try {
            const subData = tempCtx.getImageData(0, 0, w, h);
            const d = subData.data;

            const matchBg = (idx, tol = 24) =>
                Math.abs(d[idx] - bgR) <= tol &&
                Math.abs(d[idx + 1] - bgG) <= tol &&
                Math.abs(d[idx + 2] - bgB) <= tol;

            let bMinX = w, bMaxX = -1, bMinY = h, bMaxY = -1;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const pIdx = (y * w + x) * 4;
                    if (matchBg(pIdx, 24)) {
                        d[pIdx + 3] = 0;
                    } else if (d[pIdx + 3] > 0) {
                        if (x < bMinX) bMinX = x;
                        if (x > bMaxX) bMaxX = x;
                        if (y < bMinY) bMinY = y;
                        if (y > bMaxY) bMaxY = y;
                    }
                }
            }

            tempCtx.putImageData(subData, 0, 0);

            if (bMaxX >= bMinX && bMaxY >= bMinY) {
                const cw = bMaxX - bMinX + 1;
                const ch = bMaxY - bMinY + 1;
                const pad = 2;
                const targetMax = outSize - pad * 2;
                const scale = Math.min(targetMax / Math.max(cw, ch, 1), 1.2);
                const dw = Math.max(1, Math.round(cw * scale));
                const dh = Math.max(1, Math.round(ch * scale));
                const dx = Math.floor((outSize - dw) / 2);
                const dy = Math.floor((outSize - dh) / 2);
                tCtx.drawImage(tempCanvas, bMinX, bMinY, cw, ch, dx, dy, dw, dh);
            } else {
                tCtx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, outSize, outSize);
            }
        } catch (e) {
            tCtx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, outSize, outSize);
        }

        return tileCanvas;
    }

    processAtlas() {
        const W = this.image.naturalWidth;
        const H = this.image.naturalHeight;
        const rawCanvas = document.createElement('canvas');
        rawCanvas.width = W;
        rawCanvas.height = H;
        const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
        rawCtx.imageSmoothingEnabled = false;
        rawCtx.drawImage(this.image, 0, 0);

        let minX = Math.round(W * 0.16875);
        let maxX = Math.round(W * 0.83125);
        let minY = Math.round(H * 0.0963);
        let tileW = Math.round(((maxX - minX + 1) * 16) / 305);
        let stepX = (maxX - minX + 1 - tileW) / 17;
        let rowStarts = Array.from({ length: 10 }, (_, r) => Math.round(minY + r * stepX));
        let row10Y0 = Math.round(minY + 10 * stepX + tileW * 0.25);
        let row10Y1 = row10Y0 + tileW + 4;

        let fullData = null;
        let bgR = 59, bgG = 136, bgB = 214;

        try {
            const imgData = rawCtx.getImageData(0, 0, W, H);
            fullData = imgData.data;
            bgR = fullData[0];
            bgG = fullData[1];
            bgB = fullData[2];
        } catch (err) {}

        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 18; col++) {
                const sx = Math.round(minX + col * stepX);
                const sy = rowStarts[row];
                const isTerrain = this.isSolidTerrainTile(col, row);

                if (isTerrain) {
                    const tileCanvas = document.createElement('canvas');
                    tileCanvas.width = tileW;
                    tileCanvas.height = tileW;
                    const tCtx = tileCanvas.getContext('2d');
                    tCtx.imageSmoothingEnabled = false;
                    const inset = Math.max(1, Math.floor(tileW * 0.04));
                    tCtx.drawImage(
                        this.image,
                        sx + inset,
                        sy + inset,
                        tileW - inset * 2,
                        tileW - inset * 2,
                        0,
                        0,
                        tileW,
                        tileW
                    );
                    this.tiles.set(`${col},${row}`, tileCanvas);
                } else {
                    const isRoadOrMulti = (row >= 6 && col <= 4) || (col === 7 && row === 3);
                    const tileCanvas = this.extractUnitOrBuilding(
                        sx,
                        sy,
                        tileW,
                        bgR,
                        bgG,
                        bgB,
                        !!fullData,
                        !isRoadOrMulti
                    );
                    this.tiles.set(`${col},${row}`, tileCanvas);
                }
            }
        }

        for (let col = 0; col < 18; col++) {
            const sx = Math.round(minX + col * stepX);
            const sw = tileW;
            const sy = row10Y0;
            const sh = row10Y1 - row10Y0 + 1;
            const iconCanvas = this.extractRow10Icon(sx, sy, sw, sh, tileW, bgR, bgG, bgB, !!fullData);
            this.tiles.set(`${col},10`, iconCanvas);
        }

        this.ready = true;
        this.populateUIDeckIcons();
        this.renderTopAvatarArt();
        if (typeof this.onReadyCallback === 'function') {
            this.onReadyCallback();
        }
    }

    get(col, row) {
        return this.tiles.get(`${col},${row}`) || null;
    }

    draw(ctx, col, row, cx, cy, w, h, opts = {}) {
        const sprite = this.get(col, row);
        if (!sprite) return false;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(cx, cy);
        if (opts.rotation) ctx.rotate(opts.rotation);
        if (opts.flipX || opts.flipY) {
            ctx.scale(opts.flipX ? -1 : 1, opts.flipY ? -1 : 1);
        }
        if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
        ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
        ctx.restore();
        return true;
    }

    toDataURL(col, row) {
        const sprite = this.get(col, row);
        return sprite ? sprite.toDataURL() : '';
    }

    populateUIDeckIcons() {
        const setImg = (id, col, row) => {
            const el = document.getElementById(id);
            if (el) el.src = this.toDataURL(col, row);
        };

        const gasUrl = this.toDataURL(12, 10);
        setImg('icon-gas-can', 12, 10);
        setImg('icon-upgrade-building', 11, 2);

        document.querySelectorAll('.gas-inline-sprite').forEach(img => {
            img.src = gasUrl;
        });

        const lockUrl = this.toDataURL(13, 10);
        document.querySelectorAll('.lock-sprite').forEach(img => {
            img.src = lockUrl;
        });
    }

    renderTopAvatarArt() {
        const avatarCanvas = document.getElementById('topAvatarCanvas');
        if (!avatarCanvas) return;
        const aCtx = avatarCanvas.getContext('2d');
        aCtx.imageSmoothingEnabled = false;
        aCtx.clearRect(0, 0, 32, 32);
        this.draw(aCtx, 16, 7, 16, 17, 26, 26);
    }
}

export const atlas = new SpriteAtlas();