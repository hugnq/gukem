/* ============================================================================
   TINY BATTLE - ENGINE CORE & MAP ASSET LOADER (js/engine-core.js)
   MapAssetLoader (7 Ảnh Gốc assets/maps/*.png + Cắt Lưới 3x3 + Fallback)
   Procedural Canvas 2D Art • 60-120 FPS Offscreen Cache • Web Audio SoundFX
   Projectile Cache, ParticlePool, 18 Units (360° + Portrait), 14 Zombies & Bosses
   ============================================================================ */

import {
    MAP_IMAGE_ASSETS,
    LOGICAL_WIDTH,
    PLAYFIELD_HEIGHT
} from './config.js';

// Helper vẽ hình chữ nhật bo góc tương thích mọi trình duyệt / WebView
export function drawRoundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, radius);
    } else {
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }
}

// Bộ đệm Offscreen Canvas tĩnh cho bản đồ chiến trường
export const mapBufferCache = {
    canvas: null
};

// ============================================================================
// 0. HỆ THỐNG NẠP 7 ẢNH BẢN ĐỒ GỐC (assets/maps/*.png) & CẮT LƯỚI 3x3 TỰ ĐỘNG
// ============================================================================
export class MapAssetLoader {
    constructor() {
        this.images = {};
        this.loadedCount = 0;
        this.totalCount = Object.keys(MAP_IMAGE_ASSETS).length;
        this.isReady = false;
        this._loadPromise = null;
    }

    loadSingleAsset(key, primaryUrl, onStepDone) {
        return new Promise(resolve => {
            const img = new Image();
            img.decoding = 'async';

            const finish = loadedImg => {
                this.images[key] = loadedImg;
                this.loadedCount++;
                if (typeof onStepDone === 'function') {
                    onStepDone(key, loadedImg);
                }
                resolve(loadedImg);
            };

            img.onload = () => finish(img);

            img.onerror = () => {
                // Fallback tự động sang đuôi .jpg cùng tên nếu file .png chưa tồn tại
                if (/\.png$/i.test(primaryUrl)) {
                    const fallbackUrl = primaryUrl.replace(/\.png$/i, '.jpg');
                    const fbImg = new Image();
                    fbImg.decoding = 'async';
                    fbImg.onload = () => finish(fbImg);
                    fbImg.onerror = () => finish(null);
                    fbImg.src = fallbackUrl;
                } else {
                    finish(null);
                }
            };

            img.src = primaryUrl;
        });
    }

    loadAll(onProgress = null) {
        if (this._loadPromise) return this._loadPromise;

        const entries = Object.entries(MAP_IMAGE_ASSETS);
        this.totalCount = entries.length;
        this.loadedCount = 0;

        this._loadPromise = Promise.all(
            entries.map(([key, url]) =>
                this.loadSingleAsset(key, url, currentKey => {
                    const pct = Math.round((this.loadedCount / Math.max(1, this.totalCount)) * 100);
                    if (typeof onProgress === 'function') {
                        onProgress(this.loadedCount, this.totalCount, pct, currentKey);
                    }
                })
            )
        ).then(() => {
            this.isReady = true;
            return this.images;
        });

        return this._loadPromise;
    }

    getImage(key) {
        const img = this.images[key];
        if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) {
            return null;
        }
        return img;
    }

    /**
     * Cắt ô bản đồ tương ứng (1..54) từ 6 tấm sprite sheet 3x3 (biome_1.png -> biome_6.png)
     * Có hệ số lẹm viền nhẹ (trimX, trimY) để loại bỏ đường kẻ phân cách giữa các ô.
     */
    drawSlicedMapTile(ctx, levelNum, dx = 0, dy = 0, dw = LOGICAL_WIDTH, dh = PLAYFIELD_HEIGHT) {
        const lv = Math.max(1, Math.min(54, Math.floor(Number(levelNum) || 1)));
        const biomeIndex = Math.floor((lv - 1) / 9) + 1;
        const img = this.getImage(`biome_${biomeIndex}`);
        if (!img) return false;

        const localIdx = (lv - 1) % 9;
        const col = localIdx % 3;
        const row = Math.floor(localIdx / 3);

        const cellW = img.naturalWidth / 3;
        const cellH = img.naturalHeight / 3;
        const trimX = cellW * 0.012;
        const trimY = cellH * 0.008;

        ctx.drawImage(
            img,
            col * cellW + trimX,
            row * cellH + trimY,
            cellW - trimX * 2,
            cellH - trimY * 2,
            dx,
            dy,
            dw,
            dh
        );
        return true;
    }
}

export const mapAssets = new MapAssetLoader();

// ============================================================================
// 1. HỆ THỐNG ÂM THANH WEB AUDIO API (SOUNDFX - CHỐNG RÈ KHI TUA X4)
// ============================================================================
export class SoundFX {
    constructor() {
        this.enabled = true;
        this.ctx = null;
        this.lastPlayTimes = {};
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

            const nowPerf = performance.now();
            const last = this.lastPlayTimes[type] || 0;
            if (nowPerf - last < 42) return;
            this.lastPlayTimes[type] = nowPerf;

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
            } else if (type === 'emp' || type === 'tesla') {
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
            } else if (type === 'spawn' || type === 'summon') {
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
            } else if (type === 'heal') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(540, now);
                osc.frequency.exponentialRampToValueAtTime(980, now + 0.16);
                gain.gain.setValueAtTime(0.07, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.16);
                osc.start(now);
                osc.stop(now + 0.16);
            } else if (type === 'freeze') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(760, now);
                osc.frequency.exponentialRampToValueAtTime(320, now + 0.14);
                gain.gain.setValueAtTime(0.07, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.14);
                osc.start(now);
                osc.stop(now + 0.14);
            } else if (type === 'railgun') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(940, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.24);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.24);
                osc.start(now);
                osc.stop(now + 0.24);
            } else if (type === 'roar' || type === 'zombie') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(92, now);
                osc.frequency.exponentialRampToValueAtTime(36, now + 0.36);
                gain.gain.setValueAtTime(0.16, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.36);
                osc.start(now);
                osc.stop(now + 0.36);
            } else if (type === 'levelup') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.setValueAtTime(660, now + 0.08);
                osc.frequency.setValueAtTime(880, now + 0.16);
                gain.gain.setValueAtTime(0.14, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.28);
                osc.start(now);
                osc.stop(now + 0.28);
            }
        } catch (e) {}
    }
}

export const sfx = new SoundFX();

// ============================================================================
// 2. OFFSCREEN CANVAS CACHING CHO ĐẠN PHÁO & PHÉP THUẬT
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
        this.fireballCache = [];
        this.iceShardCache = [];
        this.darkOrbCache = [];
        this.acidGlobCache = [];
        this.meteorCache = [];
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
            this.fireballCache.push(this.createMagicProjectile(angle, 'fireball'));
            this.iceShardCache.push(this.createMagicProjectile(angle, 'ice_shard'));
            this.darkOrbCache.push(this.createMagicProjectile(angle, 'dark_orb'));
            this.acidGlobCache.push(this.createMagicProjectile(angle, 'acid_glob'));
            this.meteorCache.push(this.createMagicProjectile(angle, 'meteor'));
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

    createMagicProjectile(angle, projType) {
        const size = 26;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const cx = c.getContext('2d');
        cx.translate(size / 2, size / 2);
        cx.rotate(angle);

        if (projType === 'fireball' || projType === 'meteor') {
            const scale = projType === 'meteor' ? 1.3 : 1.0;
            cx.scale(scale, scale);
            cx.fillStyle = '#ea580c';
            cx.beginPath();
            cx.moveTo(-9, 0);
            cx.lineTo(-2, -5.5);
            cx.lineTo(6, 0);
            cx.lineTo(-2, 5.5);
            cx.closePath();
            cx.fill();

            cx.fillStyle = '#fde047';
            cx.beginPath();
            cx.arc(2, 0, 4.8, 0, Math.PI * 2);
            cx.fill();
            cx.strokeStyle = '#7c2d12';
            cx.lineWidth = 1.2;
            cx.stroke();
        } else if (projType === 'ice_shard') {
            cx.fillStyle = '#38bdf8';
            cx.beginPath();
            cx.moveTo(8, 0);
            cx.lineTo(-2, -4.5);
            cx.lineTo(-8, 0);
            cx.lineTo(-2, 4.5);
            cx.closePath();
            cx.fill();
            cx.strokeStyle = '#0284c7';
            cx.lineWidth = 1.3;
            cx.stroke();

            cx.fillStyle = '#e0f2fe';
            cx.beginPath();
            cx.moveTo(5, 0);
            cx.lineTo(-1, -2);
            cx.lineTo(-4, 0);
            cx.lineTo(-1, 2);
            cx.closePath();
            cx.fill();
        } else if (projType === 'acid_glob') {
            cx.fillStyle = '#16a34a';
            cx.beginPath();
            cx.ellipse(0, 0, 6.8, 4.6, 0, 0, Math.PI * 2);
            cx.fill();
            cx.strokeStyle = '#052e16';
            cx.lineWidth = 1.4;
            cx.stroke();

            cx.fillStyle = '#86efac';
            cx.beginPath();
            cx.arc(2, -1, 2.6, 0, Math.PI * 2);
            cx.fill();
        } else {
            cx.fillStyle = '#7e22ce';
            cx.beginPath();
            cx.arc(0, 0, 6, 0, Math.PI * 2);
            cx.fill();
            cx.strokeStyle = '#090014';
            cx.lineWidth = 1.5;
            cx.stroke();

            cx.fillStyle = '#f0abfc';
            cx.beginPath();
            cx.arc(1.5, -1, 2.5, 0, Math.PI * 2);
            cx.fill();
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

    getProjectileSprite(angle, isBlue, isRocket, auraType = 'none', projType = 'shell') {
        let norm = angle % (Math.PI * 2);
        if (norm < 0) norm += Math.PI * 2;
        const idx = Math.floor((norm / (Math.PI * 2)) * this.angleSteps) % this.angleSteps;
        if (projType === 'meteor') return this.meteorCache[idx];
        if (projType === 'fireball') return this.fireballCache[idx];
        if (projType === 'ice_shard') return this.iceShardCache[idx];
        if (projType === 'dark_orb') return this.darkOrbCache[idx];
        if (projType === 'acid_glob') return this.acidGlobCache[idx];
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
// 4. BỘ VẼ PROCEDURAL CANVAS 2D CHO TOÀN BỘ 18 BINH CHỦNG + XƯƠNG (360° + PORTRAIT)
// ============================================================================
export function drawUnitArt(ctx, rawUnitId, cx = 0, cy = 0, size = 32, team = 'blue', animPhase = 0, rotation = null, opts = {}) {
    const unitId = rawUnitId === 'rifleman' ? 'infantry' : (rawUnitId || 'infantry');
    const isBlue = team !== 'red';
    const isPortrait = rotation === null || rotation === undefined;
    const walkCycle = opts.walkCycle ?? animPhase * 6;
    const recoil = opts.recoilOffset ?? 0;

    const primaryCol   = isBlue ? '#0284c7' : '#dc2626';
    const secondaryCol = isBlue ? '#1e3a8a' : '#7f1d1d';
    const highlightCol = isBlue ? '#38bdf8' : '#fb7185';
    const hullMetalCol = isBlue ? '#1d4ed8' : '#b91c1c';
    const navalHullCol = isBlue ? '#334155' : '#450a0a';

    ctx.save();
    ctx.translate(cx, cy);
    const scale = size / 32;
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (!isPortrait) {
        ctx.rotate(rotation);
    }

    // 1. BỘ BINH (infantry)
    if (unitId === 'infantry') {
        if (isPortrait) {
            const footShift = Math.sin(walkCycle) * 1.5;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-5.5, 8 + footShift, 4, 4);
            ctx.fillRect(1.5, 8 - footShift, 4, 4);

            ctx.fillStyle = primaryCol;
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            drawRoundRectPath(ctx, -8, -3, 16, 12, 4);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(-6, -2);
            ctx.lineTo(6, 7);
            ctx.stroke();

            ctx.fillStyle = '#fde68a';
            ctx.beginPath();
            ctx.arc(0, -6.5, 4.8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = secondaryCol;
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, -7.5, 6.2, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = highlightCol;
            ctx.fillRect(-4, -7.2, 8, 2.2);

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-7, 1, 18, 3.2);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(7, 1.5, 6, 2);
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(14, 2.5, 2.2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const legSwing = Math.sin(walkCycle) * 2.5;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-4 + legSwing, -6.5, 5, 3);
            ctx.fillRect(-4 - legSwing, 3.5, 5, 3);

            ctx.fillStyle = secondaryCol;
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.6;
            drawRoundRectPath(ctx, -8.5, -5.5, 5, 11, 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = primaryCol;
            drawRoundRectPath(ctx, -5, -7.5, 10, 15, 4);
            ctx.fill();
            ctx.stroke();

            const gunX = 2 - recoil * 0.4;
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(gunX, 1.5, 13, 3);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(gunX + 9, 2, 5, 2);

            ctx.fillStyle = secondaryCol;
            ctx.beginPath();
            ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = highlightCol;
            ctx.fillRect(2.5, -3, 2.2, 6);
        }
    }

    // 2. LÍNH TÊN LỬA (bazooka)
    else if (unitId === 'bazooka') {
        if (isPortrait) {
            ctx.fillStyle = primaryCol;
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            drawRoundRectPath(ctx, -8.5, -2, 17, 12, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fde68a';
            ctx.beginPath();
            ctx.arc(-1, -6.5, 4.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-5.8, -8.5, 9.6, 2.4);
            ctx.fillStyle = secondaryCol;
            ctx.beginPath();
            ctx.ellipse(0, -10.2, 6.2, 2.8, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.save();
            ctx.rotate(-0.28);
            ctx.fillStyle = '#365314';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.8;
            ctx.fillRect(-11, -2.5, 21, 5);
            ctx.strokeRect(-11, -2.5, 21, 5);

            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(10, -4);
            ctx.lineTo(16, 0);
            ctx.lineTo(10, 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        } else {
            const legSwing = Math.sin(walkCycle) * 2.2;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-4 + legSwing, -6.5, 5, 3);
            ctx.fillRect(-4 - legSwing, 3.5, 5, 3);

            ctx.fillStyle = '#78350f';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.6;
            drawRoundRectPath(ctx, -9.5, -6, 6, 12, 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = primaryCol;
            drawRoundRectPath(ctx, -5, -7.5, 10, 15, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = secondaryCol;
            ctx.beginPath();
            ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            const rpgX = -7 - recoil * 0.5;
            ctx.fillStyle = '#3f6212';
            ctx.fillRect(rpgX, 3.2, 18, 4.4);
            ctx.strokeRect(rpgX, 3.2, 18, 4.4);

            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(rpgX + 18, 2);
            ctx.lineTo(rpgX + 23.5, 5.4);
            ctx.lineTo(rpgX + 18, 8.8);
            ctx.closePath();
            ctx.fill();
        }
    }

    // 3. LÍNH BẮN TỈA (sniper)
    else if (unitId === 'sniper') {
        if (isPortrait) {
            ctx.fillStyle = '#15803d';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-10, 11);
            ctx.lineTo(-6, -9);
            ctx.lineTo(6, -9);
            ctx.lineTo(10, 11);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#4ade80';
            ctx.fillRect(-7, -4, 4, 3);
            ctx.fillRect(3, -2, 4, 3);

            ctx.fillStyle = '#166534';
            ctx.beginPath();
            ctx.arc(0, -6.5, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(2, -6.5, 2.1, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-9, 2, 23, 2.8);
            ctx.fillStyle = '#475569';
            ctx.fillRect(-3, -0.5, 7, 2.2);

            ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(14, 3.4);
            ctx.lineTo(18, 3.4);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#15803d';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(-1, 0, 8.5, 7.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#4ade80';
            ctx.fillRect(-6, -4, 4, 2.5);
            ctx.fillRect(-5, 2, 4, 2.5);

            const gunX = 0 - recoil * 0.4;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(gunX, 1.2, 17, 2.6);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(gunX + 3, 0.5, 6, 4);

            ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(gunX + 17, 2.5);
            ctx.lineTo(gunX + 26, 2.5);
            ctx.stroke();

            ctx.fillStyle = primaryCol;
            ctx.beginPath();
            ctx.arc(1, 0, 4.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    // 4. XE HUMVEE (humvee)
    else if (unitId === 'humvee') {
        if (isPortrait) ctx.rotate(-Math.PI / 5);

        ctx.fillStyle = '#0f172a';
        [[-8, -9.5], [5, -9.5], [-8, 6.5], [5, 6.5]].forEach(([wx, wy]) => {
            drawRoundRectPath(ctx, wx, wy, 5.5, 3, 1);
            ctx.fill();
        });

        ctx.fillStyle = primaryCol;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -11, -7.5, 22, 15, 3.5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(4, -5.5, 3.5, 11);
        ctx.strokeRect(4, -5.5, 3.5, 11);

        ctx.fillStyle = secondaryCol;
        ctx.beginPath();
        ctx.arc(-2, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-1 - recoil * 0.3, -1.4, 13, 2.8);
    }

    // 5. XE THIẾT GIÁP APC (apc)
    else if (unitId === 'apc') {
        if (isPortrait) ctx.rotate(-Math.PI / 5);

        ctx.fillStyle = '#0f172a';
        [[-10, -10.5], [-2, -10.5], [6, -10.5], [-10, 7.5], [-2, 7.5], [6, 7.5]].forEach(([wx, wy]) => {
            ctx.fillRect(wx, wy, 5, 3);
        });

        ctx.fillStyle = hullMetalCol;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        drawRoundRectPath(ctx, -13, -8.5, 26, 17, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.fillRect(9, -5, 2.2, 4);
        ctx.fillRect(9, 1, 2.2, 4);

        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(-1, 0, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#334155';
        ctx.fillRect(2 - recoil * 0.35, -1.8, 12, 3.6);
        ctx.strokeRect(2 - recoil * 0.35, -1.8, 12, 3.6);
    }

    // 6. XE TĂNG CHIẾN ĐẤU (tank)
    else if (unitId === 'tank') {
        if (isPortrait) ctx.rotate(-Math.PI / 5);

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        drawRoundRectPath(ctx, -13, -11.5, 26, 4.5, 1.5);
        ctx.fill();
        ctx.stroke();
        drawRoundRectPath(ctx, -13, 7, 26, 4.5, 1.5);
        ctx.fill();
        ctx.stroke();

        const treadShift = ((walkCycle * 2) % 4 + 4) % 4;
        ctx.fillStyle = '#64748b';
        for (let tx = -11 + treadShift; tx < 11; tx += 4) {
            ctx.fillRect(tx, -10.8, 1.8, 3);
            ctx.fillRect(tx, 7.8, 1.8, 3);
        }

        ctx.fillStyle = primaryCol;
        drawRoundRectPath(ctx, -11.5, -8, 23, 16, 3);
        ctx.fill();
        ctx.stroke();

        const barrelX = 2 - recoil * 0.55;
        ctx.fillStyle = '#475569';
        ctx.fillRect(barrelX, -2.2, 16, 4.4);
        ctx.strokeRect(barrelX, -2.2, 16, 4.4);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(barrelX + 14, -3, 3, 6);

        ctx.fillStyle = secondaryCol;
        drawRoundRectPath(ctx, -6.5, -5.8, 12, 11.6, 3.5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = highlightCol;
        ctx.beginPath();
        ctx.arc(-1, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // 7. SIÊU TĂNG HẠNG NẶNG (heavy_tank)
    else if (unitId === 'heavy_tank') {
        if (isPortrait) ctx.rotate(-Math.PI / 5);

        ctx.fillStyle = '#0f172a';
        drawRoundRectPath(ctx, -15, -13, 30, 5, 2);
        ctx.fill();
        drawRoundRectPath(ctx, -15, 8, 30, 5, 2);
        ctx.fill();

        const treadShift = ((walkCycle * 1.8) % 4 + 4) % 4;
        ctx.fillStyle = '#94a3b8';
        for (let tx = -13 + treadShift; tx < 13; tx += 4) {
            ctx.fillRect(tx, -12, 2, 3);
            ctx.fillRect(tx, 9, 2, 3);
        }

        ctx.fillStyle = secondaryCol;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        drawRoundRectPath(ctx, -13.5, -9.5, 27, 19, 3.5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = highlightCol;
        [-8, -2, 4].forEach(bx => {
            ctx.fillRect(bx, -9, 4.5, 2.2);
            ctx.fillRect(bx, 6.8, 4.5, 2.2);
        });

        const barrelX = 2 - recoil * 0.55;
        ctx.fillStyle = '#334155';
        ctx.fillRect(barrelX, -4.5, 16, 3.2);
        ctx.strokeRect(barrelX, -4.5, 16, 3.2);
        ctx.fillRect(barrelX, 1.3, 16, 3.2);
        ctx.strokeRect(barrelX, 1.3, 16, 3.2);

        ctx.fillStyle = primaryCol;
        drawRoundRectPath(ctx, -8, -7, 14, 14, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(-1, 0, 2.8, 0, Math.PI * 2);
        ctx.fill();
    }

    // 8. TRỰC THĂNG VŨ TRANG (heli)
    else if (unitId === 'heli') {
        if (isPortrait) ctx.rotate(-Math.PI / 6);

        ctx.fillStyle = secondaryCol;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-4, -2.5);
        ctx.lineTo(-15, -1.5);
        ctx.lineTo(-15, 1.5);
        ctx.lineTo(-4, 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-15.5, -5, 2, 10);

        ctx.fillStyle = '#334155';
        ctx.fillRect(-3, -11, 5, 22);
        ctx.strokeRect(-3, -11, 5, 22);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(2, -10.5, 3, 2.5);
        ctx.fillRect(2, 8, 3, 2.5);

        ctx.fillStyle = primaryCol;
        ctx.beginPath();
        ctx.ellipse(2, 0, 10.5, 5.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.ellipse(6.5, 0, 4.8, 3.6, 0, -Math.PI / 2, Math.PI / 2);
        ctx.fill();

        const rotorSpin = opts.rotorAngle ?? animPhase * 22;
        ctx.save();
        ctx.translate(1, 0);
        ctx.fillStyle = 'rgba(248, 250, 252, 0.16)';
        ctx.beginPath();
        ctx.arc(0, 0, 14.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(rotorSpin);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-14.5, 0);
        ctx.lineTo(14.5, 0);
        ctx.moveTo(0, -14.5);
        ctx.lineTo(0, 14.5);
        ctx.stroke();
        ctx.restore();
    }

    // 9. THUYỀN TUẦN TRA (patrol_boat)
    else if (unitId === 'patrol_boat') {
        if (isPortrait) ctx.rotate(-Math.PI / 5);

        ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-16, -7);
        ctx.moveTo(-10, 0);
        ctx.lineTo(-16, 7);
        ctx.stroke();

        ctx.fillStyle = navalHullCol;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(4, -7);
        ctx.lineTo(-12, -6.5);
        ctx.lineTo(-12, 6.5);
        ctx.lineTo(4, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = primaryCol;
        drawRoundRectPath(ctx, -7, -4.2, 9, 8.4, 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(7, 0, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(7, -1, 7, 2);
    }

    // 10. TÀU KHU TRỤC (destroyer)
    else if (unitId === 'destroyer') {
        if (isPortrait) ctx.rotate(-Math.PI / 5);

        ctx.fillStyle = navalHullCol;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(16.5, 0);
        ctx.lineTo(6, -7.5);
        ctx.lineTo(-14, -7);
        ctx.lineTo(-15.5, 0);
        ctx.lineTo(-14, 7);
        ctx.lineTo(6, 7.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = primaryCol;
        drawRoundRectPath(ctx, -4, -4.8, 8, 9.6, 2);
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.rotate(animPhase * 4);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, -4.5);
        ctx.lineTo(0, 4.5);
        ctx.stroke();
        ctx.restore();

        [8.5, -9.5].forEach((tx, idx) => {
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(tx, 0, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(idx === 0 ? tx : tx - 6, -1, 6, 2);
        });
    }

    // 11. THIẾT GIÁP HẠM (battleship)
    else if (unitId === 'battleship') {
        if (isPortrait) ctx.rotate(-Math.PI / 5);

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(17.5, 0);
        ctx.lineTo(7, -9.5);
        ctx.lineTo(-15, -9);
        ctx.lineTo(-17, 0);
        ctx.lineTo(-15, 9);
        ctx.lineTo(7, 9.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = primaryCol;
        drawRoundRectPath(ctx, -12, -6.5, 22, 13, 3);
        ctx.fill();

        ctx.fillStyle = '#475569';
        drawRoundRectPath(ctx, -4, -4.5, 7, 9, 2);
        ctx.fill();
        ctx.stroke();

        [[9.5, 1], [4.5, 1], [-10, -1]].forEach(([tx, dir]) => {
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(tx, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#0f172a';
            const bx = dir > 0 ? tx : tx - 6.5;
            ctx.fillRect(bx, -2.2, 6.5, 1.5);
            ctx.fillRect(bx, 0.7, 6.5, 1.5);
        });
    }

    // 12. KHÔNG KÍCH (airstrike)
    else if (unitId === 'airstrike') {
        if (isPortrait) ctx.rotate(-Math.PI / 5);

        const flameLen = 7 + Math.sin(animPhase * 28) * 2.5;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-11, -3);
        ctx.lineTo(-11 - flameLen, 0);
        ctx.lineTo(-11, 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(-11, -1.6);
        ctx.lineTo(-11 - flameLen * 0.6, 0);
        ctx.lineTo(-11, 1.6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = secondaryCol;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(-8, -14.5);
        ctx.lineTo(-12, -13);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, 13);
        ctx.lineTo(-8, 14.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = primaryCol;
        ctx.beginPath();
        ctx.moveTo(16.5, 0);
        ctx.lineTo(4, -4.2);
        ctx.lineTo(-12, -3.5);
        ctx.lineTo(-12, 3.5);
        ctx.lineTo(4, 4.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.ellipse(5, 0, 4.5, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // 13. PHÙ THỦY LỬA (pyromancer)
    else if (unitId === 'pyromancer') {
        if (!isPortrait) ctx.rotate(Math.PI / 2);
        ctx.fillStyle = isBlue ? '#b91c1c' : '#7f1d1d';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 11);
        ctx.lineTo(-7, -4);
        ctx.lineTo(7, -4);
        ctx.lineTo(10, 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-8, 9);
        ctx.lineTo(8, 9);
        ctx.moveTo(0, -3);
        ctx.lineTo(0, 10);
        ctx.stroke();

        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(0, -5, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isBlue ? '#dc2626' : '#991b1b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, -7.5, 9.5, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(1, -15.5);
        ctx.lineTo(6, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(9, 10);
        ctx.lineTo(11, -9);
        ctx.stroke();

        const orbPulse = 3.8 + Math.sin(animPhase * 6) * 0.9;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(11, -11, orbPulse + 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(11, -11, orbPulse * 0.65, 0, Math.PI * 2);
        ctx.fill();
    }

    // 14. PHÁP SƯ BĂNG GIÁ (cryomancer)
    else if (unitId === 'cryomancer') {
        if (!isPortrait) ctx.rotate(Math.PI / 2);
        ctx.fillStyle = isBlue ? '#0284c7' : '#be123c';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 11);
        ctx.lineTo(-6.5, -4);
        ctx.lineTo(6.5, -4);
        ctx.lineTo(10, 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-5, 10);
        ctx.lineTo(-3, -3);
        ctx.lineTo(3, -3);
        ctx.lineTo(5, 10);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, -6, 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.moveTo(-5.5, -9);
        ctx.lineTo(-4, -14);
        ctx.lineTo(-1.5, -10.5);
        ctx.lineTo(0, -15.5);
        ctx.lineTo(1.5, -10.5);
        ctx.lineTo(4, -14);
        ctx.lineTo(5.5, -9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        for (let i = 0; i < 3; i++) {
            const a = animPhase * 3.5 + (i * Math.PI * 2) / 3;
            const sx = Math.cos(a) * 12;
            const sy = Math.sin(a) * 7;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(a);
            ctx.fillStyle = '#bae6fd';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, -3.8);
            ctx.lineTo(2.4, 0);
            ctx.lineTo(0, 3.8);
            ctx.lineTo(-2.4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    // 15. MỤC SƯ THÁNH QUANG (cleric)
    else if (unitId === 'cleric') {
        if (!isPortrait) ctx.rotate(Math.PI / 2);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12.5 + Math.sin(animPhase * 4) * 1.2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -8.5, -3, 17, 13, 4);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, -1);
        ctx.lineTo(0, 8);
        ctx.moveTo(-4, 3);
        ctx.lineTo(4, 3);
        ctx.stroke();

        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, -6.5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(9.5, 10);
        ctx.lineTo(9.5, -11);
        ctx.moveTo(6, -8);
        ctx.lineTo(13, -8);
        ctx.stroke();

        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(9.5, -8, 2.6, 0, Math.PI * 2);
        ctx.fill();
    }

    // 16. PHÁP SƯ CHIÊU HỒN (necromancer)
    else if (unitId === 'necromancer') {
        if (!isPortrait) ctx.rotate(Math.PI / 2);
        ctx.fillStyle = 'rgba(147, 51, 234, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 10, 11 + Math.sin(animPhase * 5) * 1.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#090014';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10.5, 11);
        ctx.lineTo(-7, -5);
        ctx.lineTo(7, -5);
        ctx.lineTo(10.5, 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#3b0764';
        ctx.beginPath();
        ctx.arc(0, -7, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f0abfc';
        ctx.fillRect(-2.8, -8, 2, 2);
        ctx.fillRect(0.8, -8, 2, 2);

        ctx.strokeStyle = '#4c1d95';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(10, 10);
        ctx.lineTo(10, -9);
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(10, -10.5, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#d946ef';
        ctx.beginPath();
        ctx.arc(10, -10.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }

    // 17. ROBOT HỘ VỆ TITAN (mecha_paladin)
    else if (unitId === 'mecha_paladin') {
        if (!isPortrait) ctx.rotate(Math.PI / 2);
        ctx.fillStyle = isBlue ? '#1e3a8a' : '#7f1d1d';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        drawRoundRectPath(ctx, -11, -8, 22, 18, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-8, -5, 16, 11);
        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        drawRoundRectPath(ctx, -5.5, -12.5, 11, 6.5, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-4, -10.5, 8, 2.2);

        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(11, 2);
        ctx.lineTo(13, -13);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(11, 2);
        ctx.lineTo(13, -13);
        ctx.stroke();

        ctx.save();
        ctx.translate(-10.5, -1);
        ctx.fillStyle = 'rgba(0, 242, 254, 0.42)';
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const hexR = 7.5;
        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            const hx = Math.cos(a) * hexR;
            const hy = Math.sin(a) * hexR;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // 18. PHÁO ĐIỆN TỪ RAILGUN (railgun_walker)
    else if (unitId === 'railgun_walker') {
        if (!isPortrait) ctx.rotate(Math.PI / 2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3.2;
        [[-11, -9], [11, -9], [-11, 9], [11, 9]].forEach(([lx, ly]) => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(lx, ly);
            ctx.stroke();
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(lx, ly, 2.8, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.fillStyle = isBlue ? '#0f172a' : '#450a0a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -8.5, -6.5, 17, 14, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        ctx.fillRect(-5, -15.5, 3.5, 11);
        ctx.strokeRect(-5, -15.5, 3.5, 11);
        ctx.fillRect(1.5, -15.5, 3.5, 11);
        ctx.strokeRect(1.5, -15.5, 3.5, 11);

        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-1.5, -14);
        ctx.lineTo(1.5, -11 + Math.sin(animPhase * 12) * 1.5);
        ctx.lineTo(-1.5, -8);
        ctx.stroke();
    }

    // 19. CHIẾN BINH XƯƠNG TRIỆU HỒI (skeleton)
    else if (unitId === 'skeleton') {
        if (!isPortrait) ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;

        drawRoundRectPath(ctx, -5.5, -2, 11, 9, 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -6.5, 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#a855f7';
        ctx.fillRect(-2.5, -7.5, 1.8, 1.8);
        ctx.fillRect(0.8, -7.5, 1.8, 1.8);

        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(7, 4);
        ctx.lineTo(10, -10);
        ctx.stroke();

        ctx.fillStyle = '#6b21a8';
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(-7.5, 1, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

export const drawCustomUnitArt = drawUnitArt;
export function isCustomArtUnit() {
    return true;
}

// ============================================================================
// 4B. BỘ VẼ CANVAS 2D CHO 14 LOẠI ZOMBIE & BOSS (FRONT-TOP VIEW - THẤY RÕ MẶT)
// ============================================================================
export const ZOMBIE_ART_IDS = new Set([
    'zombie_walker',
    'zombie_runner',
    'zombie_bunny_rider',
    'zombie_horse_knight',
    'zombie_tiger_lord',
    'zombie_spitter',
    'zombie_bomber',
    'zombie_necromancer',
    'zombie_riot',
    'zombie_cyborg',
    'zombie_mecha',
    'boss_butcher',
    'boss_chimera',
    'boss_omega_tyrant'
]);

export function isZombieUnit(unitId) {
    return ZOMBIE_ART_IDS.has(unitId);
}

export function drawZombieArt(ctx, zombieId, cx = 0, cy = 0, size = 34, animPhase = 0) {
    ctx.save();
    ctx.translate(cx, cy);
    const scale = size / 34;
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const sway = Math.sin(animPhase * 6) * 1.2;

    if (zombieId === 'zombie_walker') {
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -8.5, -8, 17, 13, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#84cc16';
        ctx.fillRect(-3, -3, 6, 4);

        ctx.fillStyle = '#84cc16';
        ctx.fillRect(-10.5, -2 + sway, 4, 11);
        ctx.strokeRect(-10.5, -2 + sway, 4, 11);
        ctx.fillRect(6.5, -2 - sway, 4, 11);
        ctx.strokeRect(6.5, -2 - sway, 4, 11);

        ctx.fillStyle = '#a3e635';
        ctx.beginPath();
        ctx.arc(0, 1, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-2.6, 2.5, 1.8, 0, Math.PI * 2);
        ctx.arc(2.6, 2.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-3, 2, 1, 1);
        ctx.fillRect(2.2, 2.2, 1, 1);
        ctx.fillStyle = '#365314';
        ctx.fillRect(-2.5, 5.2, 5, 2);
    } else if (zombieId === 'zombie_runner') {
        const pounce = Math.abs(Math.sin(animPhase * 11)) * 2;
        ctx.fillStyle = '#65a30d';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -9, -9 - pounce, 18, 14, 6);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-8, 4);
        ctx.lineTo(-11, 11);
        ctx.moveTo(8, 4);
        ctx.lineTo(11, 11);
        ctx.stroke();

        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.arc(0, 3, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-2.8, 4, 2, 0, Math.PI * 2);
        ctx.arc(2.8, 4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3.2, 3.5, 1, 1);
        ctx.fillRect(2.4, 3.5, 1, 1);
    } else if (zombieId === 'zombie_bunny_rider') {
        const hop = Math.abs(Math.sin(animPhase * 9)) * 2.5;
        ctx.translate(0, -hop);

        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 2, 10.5, 12.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 8, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.ellipse(-4.5, 1, 2.3, 7.5, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(4.5, 1, 2.3, 7.5, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3.5, 8.5, 2.2, 2.2);
        ctx.fillRect(1.3, 8.5, 2.2, 2.2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1.8, 12, 1.6, 2.5);
        ctx.fillRect(0.2, 12, 1.6, 2.5);

        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.arc(0, -3.5, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-2.2, -2.5, 1.5, 1.5);
        ctx.fillRect(0.8, -2.5, 1.5, 1.5);
    } else if (zombieId === 'zombie_horse_knight') {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -9.5, -12, 19, 24, 7);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        drawRoundRectPath(ctx, -5, 6, 10, 10, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-3.2, 10, 2, 2);
        ctx.fillRect(1.2, 10, 2, 2);

        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(0, -2, 6.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-4.5, -1, 9, 2.5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3, -0.5, 2, 1.5);
        ctx.fillRect(1, -0.5, 2, 1.5);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(11, -10);
        ctx.lineTo(11, 15);
        ctx.stroke();
    } else if (zombieId === 'zombie_tiger_lord') {
        ctx.fillStyle = '#ea580c';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -11, -12, 22, 24, 8);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-9, -6);
        ctx.lineTo(-4, -6);
        ctx.moveTo(4, -6);
        ctx.lineTo(9, -6);
        ctx.moveTo(-9, 1);
        ctx.lineTo(-4, 1);
        ctx.moveTo(4, 1);
        ctx.lineTo(9, 1);
        ctx.stroke();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 9, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-4, 13);
        ctx.lineTo(-2.5, 18);
        ctx.lineTo(-1.2, 13);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, 13);
        ctx.lineTo(2.5, 18);
        ctx.lineTo(1.2, 13);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#65a30d';
        ctx.beginPath();
        ctx.arc(0, -3, 5.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-2.5, -2, 1.8, 1.8);
        ctx.fillRect(0.8, -2, 1.8, 1.8);
    } else if (zombieId === 'zombie_spitter') {
        ctx.fillStyle = '#15803d';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -10.5, -11, 21, 13, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(-6, -7, 3.6, 0, Math.PI * 2);
        ctx.arc(6, -7, 3.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#86efac';
        ctx.beginPath();
        ctx.arc(0, 2, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 5.5, 3.2 + Math.sin(animPhase * 8) * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-3.2, 1.5, 2, 2);
        ctx.fillRect(1.2, 1.5, 2, 2);
    } else if (zombieId === 'zombie_bomber') {
        ctx.fillStyle = '#65a30d';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -3, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-2.6, -1.5, 2, 0, Math.PI * 2);
        ctx.arc(2.6, -1.5, 1.6, 0, Math.PI * 2);
        ctx.fill();

        const blink = Math.sin(animPhase * 16) > 0;
        ctx.fillStyle = blink ? '#ef4444' : '#b91c1c';
        drawRoundRectPath(ctx, -8.5, 2, 17, 11, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.font = '900 6.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TNT', 0, 9.8);
    } else if (zombieId === 'zombie_necromancer') {
        ctx.fillStyle = '#3b0764';
        ctx.strokeStyle = '#090014';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -10, -9, 20, 17, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.arc(0, 1, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#a855f7';
        ctx.fillRect(-3.2, 1.5, 2.2, 2.2);
        ctx.fillRect(1, 1.5, 2.2, 2.2);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(11, -8);
        ctx.lineTo(11, 11);
        ctx.stroke();

        ctx.fillStyle = '#d946ef';
        ctx.beginPath();
        ctx.arc(11, 12, 3.6 + Math.sin(animPhase * 7) * 0.8, 0, Math.PI * 2);
        ctx.fill();
    } else if (zombieId === 'zombie_riot') {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -3, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        drawRoundRectPath(ctx, -12, 3, 24, 9, 2.5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-7, 5, 14, 2.4);
    } else if (zombieId === 'zombie_cyborg') {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -9, -8, 18, 14, 4);
        ctx.fill();
        ctx.stroke();

        const sawJitter = Math.sin(animPhase * 28) * 1.2;
        ctx.fillStyle = '#94a3b8';
        drawRoundRectPath(ctx, 8, -2 + sawJitter, 5, 16, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(9.5, 2 + sawJitter, 2, 10);

        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.arc(0, 1, 7.2, Math.PI / 2, Math.PI * 1.5);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(0, 1, 7.2, -Math.PI / 2, Math.PI / 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 1, 7.2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(2.8, 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-3.5, 1.5, 1.8, 1.8);
    } else if (zombieId === 'zombie_mecha') {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        drawRoundRectPath(ctx, -13, -10, 26, 21, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-14.5, -4, 4, 11);
        ctx.strokeRect(-14.5, -4, 4, 11);
        ctx.fillRect(10.5, -4, 4, 11);
        ctx.strokeRect(10.5, -4, 4, 11);

        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.arc(0, 2, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-2.5, 2.5, 1.8, 1.8);
        ctx.fillRect(0.8, 2.5, 1.8, 1.8);

        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 2, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else if (zombieId === 'boss_butcher') {
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.4;
        drawRoundRectPath(ctx, -13, -11, 26, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-9, 1, 18, 10);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(-3, 5, 3, 0, Math.PI * 2);
        ctx.arc(4, 7, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        drawRoundRectPath(ctx, 11, -3, 7, 19, 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-4, -5);
        ctx.lineTo(4, -2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3.8, 1, 2.4, 2.4);
        ctx.fillRect(1.4, 1, 2.4, 2.4);
    } else if (zombieId === 'boss_chimera') {
        ctx.fillStyle = '#581c87';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.4;
        drawRoundRectPath(ctx, -14, -10, 28, 20, 8);
        ctx.fill();
        ctx.stroke();

        [-6.5, 6.5].forEach((hx, idx) => {
            ctx.fillStyle = idx === 0 ? '#7e22ce' : '#991b1b';
            ctx.beginPath();
            ctx.arc(hx, 5, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hx - 4, 1);
            ctx.lineTo(hx - 6, -4);
            ctx.moveTo(hx + 4, 1);
            ctx.lineTo(hx + 6, -4);
            ctx.stroke();

            ctx.fillStyle = '#00f2fe';
            ctx.fillRect(hx - 2.8, 5, 2, 2);
            ctx.fillRect(hx + 0.8, 5, 2, 2);
        });
    } else if (zombieId === 'boss_omega_tyrant') {
        ctx.fillStyle = '#090014';
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 2.5;
        drawRoundRectPath(ctx, -15, -12, 30, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        [-13, -8, 5, 10].forEach(bx => {
            ctx.fillRect(bx, 6, 3, 10);
            ctx.strokeRect(bx, 6, 3, 10);
        });

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 3, 4.5 + Math.sin(animPhase * 10) * 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4c1d95';
        ctx.beginPath();
        ctx.arc(0, -3, 7.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(-7, -7);
        ctx.lineTo(-9, -14);
        ctx.lineTo(-3, -9);
        ctx.lineTo(0, -15);
        ctx.lineTo(3, -9);
        ctx.lineTo(9, -14);
        ctx.lineTo(7, -7);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f0abfc';
        ctx.fillRect(-3.5, -2.5, 2.5, 2.2);
        ctx.fillRect(1, -2.5, 2.5, 2.2);
    }

    ctx.restore();
}

const zombieIconCache = new Map();

export function getZombieSpriteDataURL(zombieId) {
    if (zombieIconCache.has(zombieId)) {
        return zombieIconCache.get(zombieId);
    }
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 48;
    const cCtx = c.getContext('2d');
    drawZombieArt(cCtx, zombieId, 24, 24, 36, 0.4);
    const url = c.toDataURL();
    zombieIconCache.set(zombieId, url);
    return url;
}

// ============================================================================
// 4C. BỘ VẼ Ụ PHÁO CĂN CỨ XANH & CÁC BIỂU TƯỢNG GIAO DIỆN 100% CANVAS 2D
// ============================================================================
export function drawBaseTurretArt(ctx, turretType, cx, cy, angleRad = -Math.PI / 2, timeSec = 0) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(angleRad + Math.PI / 2);

    if (turretType === 'sam_missile') {
        ctx.fillStyle = '#ea580c';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.6;
        drawRoundRectPath(ctx, -8, -9, 16, 15, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        [-4.5, 1.5].forEach(ox => {
            ctx.fillRect(ox, -12, 3, 4);
        });
    } else if (turretType === 'tesla_coil') {
        ctx.fillStyle = '#6b21a8';
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const pulseR = 4.2 + Math.sin(timeSec * 10) * 1.2;
        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.arc(0, -4, pulseR, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.6;
        drawRoundRectPath(ctx, -6.5, -6, 13, 12, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-4, -15, 2.4, 10);
        ctx.fillRect(-0.8, -16, 2.4, 11);
        ctx.fillRect(2.2, -15, 2.4, 10);
    }

    ctx.restore();
}

const unitIconCache = new Map();

export function getUnitSpriteDataURL(unitOrId, teamOrRow = 'blue') {
    const unitId = typeof unitOrId === 'string' ? unitOrId : (unitOrId?.id || 'infantry');
    if (isZombieUnit(unitId)) {
        return getZombieSpriteDataURL(unitId);
    }

    const team = (teamOrRow === 'red' || teamOrRow === 8) ? 'red' : 'blue';
    const cacheKey = `${unitId}__${team}`;
    if (unitIconCache.has(cacheKey)) {
        return unitIconCache.get(cacheKey);
    }

    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 48;
    const cCtx = c.getContext('2d');
    drawUnitArt(cCtx, unitId, 24, 24, 38, team, 0.5, null);
    const url = c.toDataURL();
    unitIconCache.set(cacheKey, url);
    return url;
}

function createGasCanDataURL() {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const cx = c.getContext('2d');
    cx.lineJoin = 'round';

    cx.fillStyle = '#ef4444';
    cx.strokeStyle = '#0f172a';
    cx.lineWidth = 2.2;
    drawRoundRectPath(cx, 6, 7, 20, 21, 4);
    cx.fill();
    cx.stroke();

    cx.fillStyle = '#0f172a';
    cx.fillRect(10, 10, 9, 3);
    cx.fillStyle = '#facc15';
    cx.fillRect(20, 3, 5, 5);
    cx.strokeRect(20, 3, 5, 5);

    cx.strokeStyle = '#fca5a5';
    cx.lineWidth = 2;
    cx.beginPath();
    cx.moveTo(11, 16);
    cx.lineTo(21, 24);
    cx.moveTo(21, 16);
    cx.lineTo(11, 24);
    cx.stroke();

    return c.toDataURL();
}

function createLockDataURL() {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const cx = c.getContext('2d');
    cx.lineJoin = 'round';

    cx.strokeStyle = '#cbd5e1';
    cx.lineWidth = 3.5;
    cx.beginPath();
    cx.arc(16, 13, 6.5, Math.PI, 0);
    cx.stroke();

    cx.fillStyle = '#f59e0b';
    ctx_stroke_style: {
        cx.strokeStyle = '#0f172a';
    }
    cx.lineWidth = 2.2;
    drawRoundRectPath(cx, 7, 13, 18, 15, 3);
    cx.fill();
    cx.stroke();

    cx.fillStyle = '#0f172a';
    cx.beginPath();
    cx.arc(16, 19, 2.2, 0, Math.PI * 2);
    cx.fill();
    cx.fillRect(15, 20, 2, 4);

    return c.toDataURL();
}

function createUpgradeBuildingDataURL() {
    const c = document.createElement('canvas');
    c.width = 36;
    c.height = 36;
    const cx = c.getContext('2d');
    cx.lineJoin = 'round';

    cx.fillStyle = '#0284c7';
    cx.strokeStyle = '#0f172a';
    cx.lineWidth = 2;
    drawRoundRectPath(cx, 4, 6, 28, 7, 2);
    cx.fill();
    cx.stroke();

    cx.fillStyle = '#10b981';
    drawRoundRectPath(cx, 8, 13, 20, 18, 2);
    cx.fill();
    cx.stroke();

    cx.fillStyle = '#fde047';
    cx.beginPath();
    cx.moveTo(18, 15);
    cx.lineTo(24, 21);
    cx.lineTo(20.5, 21);
    cx.lineTo(20.5, 28);
    cx.lineTo(15.5, 28);
    cx.lineTo(15.5, 21);
    cx.lineTo(12, 21);
    cx.closePath();
    cx.fill();

    return c.toDataURL();
}

export function renderTopAvatarArt() {
    const avatarCanvas = document.getElementById('topAvatarCanvas');
    if (!avatarCanvas) return;
    const aCtx = avatarCanvas.getContext('2d');
    aCtx.clearRect(0, 0, 32, 32);

    aCtx.fillStyle = '#0284c7';
    aCtx.fillRect(0, 0, 32, 32);

    drawUnitArt(aCtx, 'infantry', 16, 17, 26, 'blue', 0.4, null);
}

export function populateProceduralUIIcons() {
    const gasUrl = createGasCanDataURL();
    const lockUrl = createLockDataURL();
    const upgBuildingUrl = createUpgradeBuildingDataURL();

    const gasCanEl = document.getElementById('icon-gas-can');
    if (gasCanEl) gasCanEl.src = gasUrl;

    const upgBuildEl = document.getElementById('icon-upgrade-building');
    if (upgBuildEl) upgBuildEl.src = upgBuildingUrl;

    document.querySelectorAll('.gas-inline-sprite').forEach(img => {
        img.src = gasUrl;
    });

    document.querySelectorAll('.lock-sprite').forEach(img => {
        img.src = lockUrl;
    });

    renderTopAvatarArt();
}