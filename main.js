// ============================================================================
// MAIN.JS - ĐỘNG CƠ CANVAS 2D, JUICY FX, OBJECT POOLING, COMMANDER TACTICS
// & 4 CHẾ ĐỘ CHƠI MỚI (ENDLESS SIEGE, AUTO-BATTLER, FOG OF WAR, RAID BOSS)
// Đã fix đồng bộ 100% DOM ID, 15 Maps chuẩn ảnh, Meta-Talents, Chip & HUD.
// ============================================================================

import * as DataModule from './data.js';
import {
    metaState,
    saveProgress,
    updateTopBarUI,
    renderStageScreenUI,
    renderArmyTabUI,
    renderArmyShowcaseCanvas,
    getHighestRarityForUnit,
    formatCurrency,
    normalizeMapProgressEntry,
    normalizeUnitId,
    syncLegacyEngineBridges,
    switchLobbyTab,
    initLobby
} from './lobby.js';

// ============================================================================
// 0. HẰNG SỐ VÀ CẦU NỐI TƯƠNG THÍCH DỮ LIỆU (DATA.JS <-> LOBBY.JS <-> MAIN.JS)
// ============================================================================
const LOGICAL_WIDTH = DataModule.LOGICAL_WIDTH || 420;
const LOGICAL_HEIGHT = DataModule.LOGICAL_HEIGHT || 840;
const BOTTOM_UI_HEIGHT = DataModule.BOTTOM_UI_HEIGHT || 126;
const PLAYFIELD_HEIGHT = DataModule.PLAYFIELD_HEIGHT || (LOGICAL_HEIGHT - BOTTOM_UI_HEIGHT);
const MAX_DECK_SLOTS = DataModule.MAX_DECK_SLOTS || 5;
const MAX_WAVES = DataModule.MAX_WAVES || 10;

const NAV_CELL = DataModule.NAV_CELL || 10;
const GRID_W = DataModule.GRID_W || Math.floor(LOGICAL_WIDTH / NAV_CELL);
const GRID_H = DataModule.GRID_H || Math.floor(PLAYFIELD_HEIGHT / NAV_CELL);
const T_OPEN = DataModule.T_OPEN ?? 0;
const T_ROAD = DataModule.T_ROAD ?? 1;
const T_WATER = DataModule.T_WATER ?? 2;
const T_BRIDGE = DataModule.T_BRIDGE ?? 3;
const T_OBSTACLE = DataModule.T_OBSTACLE ?? 4;

const RARITY_CONFIG = DataModule.RARITY_CONFIG || {};
const DIFFICULTY_CONFIG = DataModule.DIFFICULTY_CONFIG || {
    easy: { id: 'easy', name: 'Dễ', shortLabel: 'DỄ', statMult: 1.0, baseHpMult: 1.0 },
    difficult: { id: 'difficult', name: 'Khó', shortLabel: 'KHÓ', statMult: 1.45, baseHpMult: 1.6 }
};

const GAS_UPGRADE_LEVELS = DataModule.GAS_UPGRADE_LEVELS || [
    { interval: 3.0, cost: 4, label: '➔ 2.4s' },
    { interval: 2.4, cost: 6, label: '➔ 1.9s' },
    { interval: 1.9, cost: 8, label: '➔ 1.5s' },
    { interval: 1.5, cost: 11, label: '➔ 1.1s' },
    { interval: 1.1, cost: 0, label: 'MAX' }
];

const ROGUELIKE_MUTATIONS = DataModule.ROGUELIKE_MUTATIONS || [];
const RAID_BOSS_CONFIG = DataModule.RAID_BOSS_CONFIG || {};

const RAW_LEVELS = DataModule.LEVELS || [];
const LEVELS = RAW_LEVELS.map((m, idx) => {
    const lvNum = m.level || m.id || (idx + 1);
    return {
        ...m,
        level: lvNum,
        id: lvNum,
        startingGas: m.startingGas ?? 6,
        playerBaseHp: m.playerBaseHp ?? 250,
        enemyBaseHp: m.enemyBaseHp ?? (220 + lvNum * 35),
        hasCoastFoam: m.hasCoastFoam ?? [10, 13, 25, 28].includes(lvNum)
    };
});

const SPRITE_COL_FALLBACK = {
    infantry: 16, rifleman: 16, bazooka: 17, sniper: 16,
    humvee: 5, apc: 7, tank: 8, heavy_tank: 9,
    heli: 11, patrol_boat: 13, destroyer: 14, battleship: 15, airstrike: 10
};

const RAW_UNITS = DataModule.UNIT_CATALOG || [];
const UNIT_CATALOG = RAW_UNITS.map(u => {
    const isInfantry = u.category === 'infantry' || u.isWalker || ['infantry', 'rifleman', 'bazooka', 'sniper'].includes(u.id);
    const isAir = u.category === 'air' || !!u.isAir || u.id === 'heli';
    const isNaval = u.category === 'naval' || !!u.isNaval || ['patrol_boat', 'destroyer', 'battleship'].includes(u.id);
    return {
        ...u,
        damage: u.damage ?? u.dmg ?? 20,
        dmg: u.dmg ?? u.damage ?? 20,
        fireRate: u.fireRate ?? u.atkSpeed ?? 1.0,
        atkSpeed: u.atkSpeed ?? u.fireRate ?? 1.0,
        cooldown: u.cooldown ?? Math.max(1.2, (u.cost || 2) * 0.65),
        spriteCol: u.spriteCol ?? SPRITE_COL_FALLBACK[u.id] ?? 16,
        radius: u.radius ?? (isInfantry ? 11 : (isAir ? 15 : (u.cost >= 7 ? 17 : 14))),
        isWalker: isInfantry,
        isAir,
        isNaval,
        altitude: isAir ? (u.altitude || 26) : 0,
        visionCone: u.visionCone || (u.range ? u.range + 35 : 150),
        attackType: u.attackType || (u.id === 'rifleman' || u.id === 'infantry' || u.id === 'humvee' || u.id === 'sniper' || u.id === 'patrol_boat' ? 'beam' : 'projectile'),
        projType: u.projType || (u.id === 'bazooka' ? 'rocket_short' : (isAir ? 'air_missile' : (u.splash >= 40 ? 'arc_missile' : 'shell'))),
        arcHeight: u.arcHeight ?? (u.splash >= 32 ? 26 : 0),
        projSpeed: u.projSpeed || 260,
        projRadius: u.projRadius || (u.splash >= 32 ? 6.5 : 4.5)
    };
});

const UNIT_BY_ID = {};
UNIT_CATALOG.forEach(u => {
    UNIT_BY_ID[u.id] = u;
});
if (UNIT_BY_ID['infantry'] && !UNIT_BY_ID['rifleman']) UNIT_BY_ID['rifleman'] = UNIT_BY_ID['infantry'];
if (UNIT_BY_ID['rifleman'] && !UNIT_BY_ID['infantry']) UNIT_BY_ID['infantry'] = UNIT_BY_ID['rifleman'];
UNIT_BY_ID['airstrike'] = DataModule.AIRSTRIKE_SPEC || {
    id: 'airstrike',
    name: 'Không Kích',
    role: 'Oanh Tạc Chiến Thuật',
    category: 'air',
    isAir: true,
    isAirstrike: true,
    cost: 5,
    cooldown: 5.5,
    hp: 100,
    damage: 95,
    dmg: 95,
    baseDamage: 95,
    range: 300,
    speed: 440,
    fireRate: 1.0,
    splash: 52,
    spriteCol: 10
};

function triggerHaptic(ms = 15) {
    try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(ms);
        }
    } catch (e) {}
}

function calcStageRewardCoins(mapLv, diffId, modeId) {
    if (typeof DataModule.calcStageRewardCoins === 'function') {
        return DataModule.calcStageRewardCoins(mapLv, diffId, modeId);
    }
    const base = diffId === 'difficult' ? (500 + mapLv * 120) : (150 + mapLv * 50);
    return modeId === 'survival' ? Math.round(base * 1.35) : base;
}

// ============================================================================
// 1. HỆ THỐNG ÂM THANH WEB AUDIO API (SOUNDFX)
// ============================================================================
class SoundFX {
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
// 2. OFFSCREEN CANVAS CACHING CHO ĐẠN PHÁO & CHỚP LỬA
// ============================================================================
class ProjectileSpriteCache {
    constructor() {
        this.angleSteps = 36;
        this.shellBlue = [];
        this.shellRed = [];
        this.rocketBlue = [];
        this.rocketRed = [];
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

    getProjectileSprite(angle, isBlue, isRocket) {
        let norm = angle % (Math.PI * 2);
        if (norm < 0) norm += Math.PI * 2;
        const idx = Math.floor((norm / (Math.PI * 2)) * this.angleSteps) % this.angleSteps;
        if (isRocket) return isBlue ? this.rocketBlue[idx] : this.rocketRed[idx];
        return isBlue ? this.shellBlue[idx] : this.shellRed[idx];
    }
}

const projCache = new ProjectileSpriteCache();

// ============================================================================
// 3. OBJECT POOLING 200 HẠT CỐ ĐỊNH
// ============================================================================
class ParticlePool {
    constructor(size = 200) {
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

const particlePool = new ParticlePool(200);

// ============================================================================
// 4. ATLAS BÓC TÁCH SPRITE SHEET ("Preview.png")
// ============================================================================
class SpriteAtlas {
    constructor() {
        this.ready = false;
        this.tiles = new Map();
        this.bakedMapCanvas = null;

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
        buildStaticMapCanvas(game.currentLevel);
        renderStageScreenUI();
        renderArmyTabUI();
        renderBattleDeckButtons();
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

// ============================================================================
// 5. HỆ THỐNG LƯỚI ĐỊA HÌNH VÀ TÌM ĐƯỜNG FLOW-FIELD (NAVSYSTEM)
// ============================================================================
class NavSystem {
    constructor() {
        this.grid = new Uint8Array(GRID_W * GRID_H);
        this.obstacles = [];
        this.bridges = [];
        this.waterBoxes = [];
        this.flowBlueLand = new Float32Array(GRID_W * GRID_H);
        this.flowRedLand = new Float32Array(GRID_W * GRID_H);
        this.flowBlueNaval = new Float32Array(GRID_W * GRID_H);
        this.flowRedNaval = new Float32Array(GRID_W * GRID_H);
    }

    reset() {
        this.grid.fill(T_OPEN);
        this.obstacles = [];
        this.bridges = [];
        this.waterBoxes = [];
    }

    idx(gx, gy) {
        return gy * GRID_W + gx;
    }

    inBounds(gx, gy) {
        return gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H;
    }

    getCellAtPixel(x, y) {
        const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(x / NAV_CELL)));
        const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(y / NAV_CELL)));
        return this.grid[this.idx(gx, gy)];
    }

    markRect(x, y, w, h, type, overrideAll = true) {
        const c0 = Math.max(0, Math.floor(x / NAV_CELL));
        const c1 = Math.min(GRID_W - 1, Math.floor((x + w) / NAV_CELL));
        const r0 = Math.max(0, Math.floor(y / NAV_CELL));
        const r1 = Math.min(GRID_H - 1, Math.floor((y + h) / NAV_CELL));

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const i = this.idx(c, r);
                if (overrideAll || this.grid[i] === T_OPEN) {
                    this.grid[i] = type;
                }
            }
        }
    }

    markCircle(cx, cy, radius, type, overrideAll = true) {
        const c0 = Math.max(0, Math.floor((cx - radius) / NAV_CELL));
        const c1 = Math.min(GRID_W - 1, Math.floor((cx + radius) / NAV_CELL));
        const r0 = Math.max(0, Math.floor((cy - radius) / NAV_CELL));
        const r1 = Math.min(GRID_H - 1, Math.floor((cy + radius) / NAV_CELL));

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const px = (c + 0.5) * NAV_CELL;
                const py = (r + 0.5) * NAV_CELL;
                if (Math.hypot(px - cx, py - cy) <= radius) {
                    const i = this.idx(c, r);
                    if (overrideAll || this.grid[i] === T_OPEN) {
                        this.grid[i] = type;
                    }
                }
            }
        }
    }

    markPolyline(pts, width, type) {
        const halfW = width * 0.5;
        for (let i = 0; i < pts.length - 1; i++) {
            const [x1, y1] = pts[i];
            const [x2, y2] = pts[i + 1];
            const len = Math.hypot(x2 - x1, y2 - y1);
            const steps = Math.max(1, Math.ceil(len / (NAV_CELL * 0.5)));
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const px = x1 + (x2 - x1) * t;
                const py = y1 + (y2 - y1) * t;
                this.markCircle(px, py, halfW, type, false);
            }
        }
    }

    markRing(cx, cy, r, width, type) {
        const halfW = width * 0.5;
        const steps = Math.max(24, Math.ceil((2 * Math.PI * r) / (NAV_CELL * 0.5)));
        for (let s = 0; s < steps; s++) {
            const a = (s / steps) * Math.PI * 2;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            this.markCircle(px, py, halfW, type, false);
        }
    }

    isRoadOrBridgeOrSpawn(cx, cy, pad = 16) {
        if (cy < 115 || cy > PLAYFIELD_HEIGHT - 115) {
            if (cx > 68 && cx < LOGICAL_WIDTH - 68) return true;
        }
        const c0 = Math.max(0, Math.floor((cx - pad) / NAV_CELL));
        const c1 = Math.min(GRID_W - 1, Math.floor((cx + pad) / NAV_CELL));
        const r0 = Math.max(0, Math.floor((cy - pad) / NAV_CELL));
        const r1 = Math.min(GRID_H - 1, Math.floor((cy + pad) / NAV_CELL));

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const cell = this.grid[this.idx(c, r)];
                if (cell === T_ROAD || cell === T_BRIDGE) return true;
            }
        }
        return false;
    }

    addCircleObstacle(x, y, r, kind = 'tree') {
        this.obstacles.push({ type: 'circle', kind, x, y, r });
        this.markCircle(x, y, r + 2, T_OBSTACLE, true);
    }

    addBoxObstacle(x, y, w, h, kind = 'building') {
        this.obstacles.push({ type: 'box', kind, x, y, w, h });
        this.markRect(x - 2, y - 2, w + 4, h + 4, T_OBSTACLE, true);
    }

    addBridge(cx, cy, w, h, isVertical = true) {
        const bw = isVertical ? w : h;
        const bh = isVertical ? h : w;
        const bx = cx - bw / 2;
        const by = cy - bh / 2;
        this.bridges.push({ x: bx, y: by, w: bw, h: bh, isVertical });
        const padX = isVertical ? 2 : 10;
        const padY = isVertical ? 10 : 2;
        this.markRect(bx - padX, by - padY, bw + padX * 2, bh + padY * 2, T_BRIDGE, true);
    }

    isPointOnBridge(x, y, margin = 4) {
        for (const br of this.bridges) {
            if (
                x >= br.x - margin &&
                x <= br.x + br.w + margin &&
                y >= br.y - margin &&
                y <= br.y + br.h + margin
            ) {
                return true;
            }
        }
        return false;
    }

    isPointInWaterRaw(x, y) {
        if (this.isPointOnBridge(x, y, 4)) return false;
        const cell = this.getCellAtPixel(x, y);
        return cell === T_WATER;
    }

    buildFlowFields() {
        this.markRect(75, 92, 270, 26, T_ROAD, false);
        this.markRect(75, PLAYFIELD_HEIGHT - 118, 270, 26, T_ROAD, false);

        const blueLandGoals = [];
        for (let c = 8; c <= GRID_W - 9; c++) {
            blueLandGoals.push([c, 9], [c, 10]);
        }
        this.computeDijkstra(this.flowBlueLand, blueLandGoals, false);

        const redLandGoals = [];
        const by = Math.floor((PLAYFIELD_HEIGHT - 95) / NAV_CELL);
        for (let c = 8; c <= GRID_W - 9; c++) {
            redLandGoals.push([c, by], [c, by - 1]);
        }
        this.computeDijkstra(this.flowRedLand, redLandGoals, false);

        const blueNavalGoals = [];
        const redNavalGoals = [];
        let minWaterRow = GRID_H, maxWaterRow = -1;
        for (let r = 0; r < GRID_H; r++) {
            for (let c = 0; c < GRID_W; c++) {
                const t = this.grid[this.idx(c, r)];
                if (t === T_WATER || t === T_BRIDGE) {
                    if (r < minWaterRow) minWaterRow = r;
                    if (r > maxWaterRow) maxWaterRow = r;
                }
            }
        }
        if (maxWaterRow >= minWaterRow) {
            for (let r = minWaterRow; r <= Math.min(GRID_H - 1, minWaterRow + 3); r++) {
                for (let c = 0; c < GRID_W; c++) {
                    if (this.grid[this.idx(c, r)] === T_WATER) blueNavalGoals.push([c, r]);
                }
            }
            for (let r = Math.max(0, maxWaterRow - 3); r <= maxWaterRow; r++) {
                for (let c = 0; c < GRID_W; c++) {
                    if (this.grid[this.idx(c, r)] === T_WATER) redNavalGoals.push([c, r]);
                }
            }
        }
        this.computeDijkstra(this.flowBlueNaval, blueNavalGoals, true);
        this.computeDijkstra(this.flowRedNaval, redNavalGoals, true);
    }

    computeDijkstra(distArr, goals, isNaval) {
        distArr.fill(1e9);
        const queue = [];

        for (const [gx, gy] of goals) {
            if (!this.inBounds(gx, gy)) continue;
            const i = this.idx(gx, gy);
            distArr[i] = 0;
            queue.push(i);
        }

        const dirs = [
            [-1, 0, 1.0], [1, 0, 1.0], [0, -1, 1.0], [0, 1, 1.0],
            [-1, -1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [1, 1, 1.414]
        ];

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            const cx = curr % GRID_W;
            const cy = (curr / GRID_W) | 0;
            const baseDist = distArr[curr];

            for (const [dx, dy, stepLen] of dirs) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (!this.inBounds(nx, ny)) continue;

                const nIdx = this.idx(nx, ny);
                const cellType = this.grid[nIdx];
                let terrainCost = 1.0;

                if (isNaval) {
                    if (cellType === T_WATER) terrainCost = 1.0;
                    else if (cellType === T_BRIDGE) terrainCost = 1.15;
                    else continue;
                } else {
                    if (cellType === T_OBSTACLE || cellType === T_WATER) continue;
                    if (cellType === T_BRIDGE) terrainCost = 0.72;
                    else if (cellType === T_ROAD) terrainCost = 0.82;
                    else terrainCost = 1.38;
                }

                const newDist = baseDist + stepLen * terrainCost;
                if (newDist < distArr[nIdx]) {
                    distArr[nIdx] = newDist;
                    queue.push(nIdx);
                }
            }
        }
    }

    getFlowDirection(x, y, team, isNaval) {
        const distArr = isNaval
            ? (team === 'blue' ? this.flowBlueNaval : this.flowRedNaval)
            : (team === 'blue' ? this.flowBlueLand : this.flowRedLand);

        const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(x / NAV_CELL)));
        const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(y / NAV_CELL)));

        let bestVal = distArr[this.idx(gx, gy)];
        if (bestVal >= 1e8) {
            return { dirX: 0, dirY: team === 'blue' ? -1 : 1 };
        }

        let gradX = 0;
        let gradY = 0;
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = gx + dx;
                const ny = gy + dy;
                if (!this.inBounds(nx, ny)) continue;
                const nVal = distArr[this.idx(nx, ny)];
                if (nVal >= 1e8) continue;

                const diff = bestVal - nVal;
                if (diff > 0) {
                    const d = Math.hypot(dx, dy);
                    const w = diff / d;
                    gradX += (dx / d) * w;
                    gradY += (dy / d) * w;
                }
            }
        }

        const len = Math.hypot(gradX, gradY);
        if (len > 0.001) {
            return { dirX: gradX / len, dirY: gradY / len };
        }
        return { dirX: 0, dirY: team === 'blue' ? -1 : 1 };
    }

    resolveHardCollisions(u) {
        if (u.isAir) {
            u.x = Math.max(26, Math.min(LOGICAL_WIDTH - 26, u.x));
            u.y = Math.max(30, Math.min(PLAYFIELD_HEIGHT - 24, u.y));
            return;
        }

        const effR = Math.max(8, u.radius * 0.68);

        for (let iter = 0; iter < 2; iter++) {
            for (const obs of this.obstacles) {
                if (obs.type === 'circle') {
                    const dx = u.x - obs.x;
                    const dy = u.y - obs.y;
                    const dist = Math.hypot(dx, dy);
                    const minDist = obs.r + effR;
                    if (dist < minDist) {
                        const nx = dist > 0.001 ? dx / dist : (u.x < LOGICAL_WIDTH / 2 ? 1 : -1);
                        const ny = dist > 0.001 ? dy / dist : (u.team === 'blue' ? 1 : -1);
                        u.x = obs.x + nx * minDist;
                        u.y = obs.y + ny * minDist;
                    }
                } else if (obs.type === 'box') {
                    const closestX = Math.max(obs.x, Math.min(u.x, obs.x + obs.w));
                    const closestY = Math.max(obs.y, Math.min(u.y, obs.y + obs.h));
                    const dx = u.x - closestX;
                    const dy = u.y - closestY;
                    const dist = Math.hypot(dx, dy);

                    if (dist < effR && dist > 0.001) {
                        u.x = closestX + (dx / dist) * effR;
                        u.y = closestY + (dy / dist) * effR;
                    }
                }
            }
        }

        if (!u.isNaval && this.isPointInWaterRaw(u.x, u.y)) {
            const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(u.x / NAV_CELL)));
            const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(u.y / NAV_CELL)));
            let bestX = u.x, bestY = u.y, minD = Infinity;

            for (let r = -5; r <= 5; r++) {
                for (let c = -5; c <= 5; c++) {
                    const nx = gx + c, ny = gy + r;
                    if (!this.inBounds(nx, ny)) continue;
                    const ct = this.grid[this.idx(nx, ny)];
                    if (ct === T_BRIDGE || ct === T_ROAD || ct === T_OPEN) {
                        const px = (nx + 0.5) * NAV_CELL;
                        const py = (ny + 0.5) * NAV_CELL;
                        const d = Math.hypot(px - u.x, py - u.y) - (ct === T_BRIDGE ? 8 : 0);
                        if (d < minD) {
                            minD = d;
                            bestX = px;
                            bestY = py;
                        }
                    }
                }
            }
            u.x = bestX;
            u.y = bestY;
        } else if (u.isNaval) {
            const cell = this.getCellAtPixel(u.x, u.y);
            if (cell !== T_WATER && cell !== T_BRIDGE) {
                const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(u.x / NAV_CELL)));
                const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(u.y / NAV_CELL)));
                let bestX = u.x, bestY = u.y, minD = Infinity;

                for (let r = -6; r <= 6; r++) {
                    for (let c = -6; c <= 6; c++) {
                        const nx = gx + c, ny = gy + r;
                        if (!this.inBounds(nx, ny)) continue;
                        if (this.grid[this.idx(nx, ny)] === T_WATER) {
                            const px = (nx + 0.5) * NAV_CELL;
                            const py = (ny + 0.5) * NAV_CELL;
                            const d = Math.hypot(px - u.x, py - u.y);
                            if (d < minD) {
                                minD = d;
                                bestX = px;
                                bestY = py;
                            }
                        }
                    }
                }
                u.x = bestX;
                u.y = bestY;
            }
        }

        u.x = Math.max(24, Math.min(LOGICAL_WIDTH - 24, u.x));
        u.y = Math.max(30, Math.min(PLAYFIELD_HEIGHT - 24, u.y));
    }

    findValidSpawnPoint(team, spec, prefX, prefY) {
        if (spec.isAir) return { x: prefX, y: prefY };

        if (spec.isNaval) {
            let bestX = prefX, bestY = prefY, bestScore = Infinity;
            const targetY = team === 'blue' ? PLAYFIELD_HEIGHT - 120 : 120;
            for (let r = 4; r < GRID_H - 4; r++) {
                for (let c = 2; c < GRID_W - 2; c++) {
                    if (this.grid[this.idx(c, r)] === T_WATER) {
                        const px = (c + 0.5) * NAV_CELL;
                        const py = (r + 0.5) * NAV_CELL;
                        const score = Math.abs(py - targetY) * 1.5 + Math.abs(px - prefX) * 0.35 + (Math.random() * 14);
                        if (score < bestScore) {
                            bestScore = score;
                            bestX = px;
                            bestY = py;
                        }
                    }
                }
            }
            return { x: bestX, y: bestY };
        }

        const gx = Math.max(2, Math.min(GRID_W - 3, Math.floor(prefX / NAV_CELL)));
        const gy = Math.max(3, Math.min(GRID_H - 4, Math.floor(prefY / NAV_CELL)));
        const distArr = team === 'blue' ? this.flowBlueLand : this.flowRedLand;

        let bestX = prefX, bestY = prefY, minScore = Infinity;
        for (let r = -4; r <= 4; r++) {
            for (let c = -14; c <= 14; c++) {
                const nx = gx + c, ny = gy + r;
                if (!this.inBounds(nx, ny)) continue;
                const i = this.idx(nx, ny);
                const ct = this.grid[i];
                if ((ct === T_ROAD || ct === T_OPEN || ct === T_BRIDGE) && distArr[i] < 1e8) {
                    const px = (nx + 0.5) * NAV_CELL;
                    const py = (ny + 0.5) * NAV_CELL;
                    const roadBonus = ct === T_ROAD ? -12 : 0;
                    const score = Math.hypot(px - prefX, (py - prefY) * 2.0) + roadBonus;
                    if (score < minScore) {
                        minScore = score;
                        bestX = px;
                        bestY = py;
                    }
                }
            }
        }
        return { x: bestX, y: bestY };
    }
}

export const nav = new NavSystem();

// ============================================================================
// 6. HIỆU ỨNG MẶT NƯỚC ĐA LỚP ĐỘNG (PROCEDURAL SINE WATER & FOAM EDGE)
// ============================================================================
function calcProceduralWaveOffset(time, x) {
    return Math.sin(time * 2.5 + x * 0.05) * 3 + Math.sin(-time * 1.8 + x * 0.08) * 1.5;
}

function drawDynamicSineWater(targetCtx, timeSec, levelNum) {
    if (!nav.waterBoxes || nav.waterBoxes.length === 0) return;

    const baseId = ((levelNum - 1) % 15) + 1;
    const isCoastMap = [10, 13].includes(baseId);

    for (const wb of nav.waterBoxes) {
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.roundRect(wb.x, wb.y, wb.w, wb.h, wb.rounded || 0);
        targetCtx.clip();

        targetCtx.fillStyle = 'rgba(2, 132, 199, 0.45)';
        for (let baseRowY = wb.y + 12; baseRowY < wb.y + wb.h - 6; baseRowY += 22) {
            for (let x = wb.x + 4; x < wb.x + wb.w - 8; x += 8) {
                const yOff = calcProceduralWaveOffset(timeSec, x + baseRowY * 0.4);
                targetCtx.fillRect(x, Math.round(baseRowY + yOff), 6, 3);
            }
        }

        targetCtx.fillStyle = 'rgba(224, 242, 254, 0.82)';
        for (let baseRowY = wb.y + 20; baseRowY < wb.y + wb.h - 8; baseRowY += 26) {
            for (let x = wb.x + 10; x < wb.x + wb.w - 12; x += 14) {
                const yOff = calcProceduralWaveOffset(timeSec + 1.1, x - baseRowY * 0.3);
                targetCtx.fillRect(x, Math.round(baseRowY + yOff), 9, 2.5);
            }
        }

        targetCtx.fillStyle = '#e0f2fe';
        const foamAmp = isCoastMap ? 2.2 : 1.4;

        for (let x = wb.x; x < wb.x + wb.w; x += 6) {
            const waveShift = Math.sin(timeSec * 3.2 + x * 0.09) * foamAmp;
            if (wb.y > 5) {
                targetCtx.fillRect(x, wb.y + Math.max(0, waveShift), 5, isCoastMap ? 3.5 : 2.5);
            }
            if (wb.y + wb.h < PLAYFIELD_HEIGHT - 5) {
                targetCtx.fillRect(x, wb.y + wb.h - 3 + Math.min(0, waveShift), 5, isCoastMap ? 3.5 : 2.5);
            }
        }

        for (let y = wb.y; y < wb.y + wb.h; y += 6) {
            const waveShift = Math.cos(timeSec * 3.0 + y * 0.08) * foamAmp;
            if (wb.x > 5) {
                targetCtx.fillRect(wb.x + Math.max(0, waveShift), y, isCoastMap ? 4 : 2.5, 5);
            }
            if (wb.x + wb.w < LOGICAL_WIDTH - 5) {
                targetCtx.fillRect(wb.x + wb.w - 3.5 + Math.min(0, waveShift), y, isCoastMap ? 4 : 2.5, 5);
            }
        }

        targetCtx.restore();
    }

    for (const br of nav.bridges) {
        targetCtx.save();
        targetCtx.fillStyle = '#451a03';
        targetCtx.fillRect(br.x - 3, br.y - 2, br.w + 6, br.h + 4);
        targetCtx.fillStyle = '#b45309';
        targetCtx.fillRect(br.x, br.y, br.w, br.h);
        targetCtx.fillStyle = '#d97706';
        if (br.h >= br.w) {
            for (let py = br.y + 4; py < br.y + br.h - 3; py += 8) {
                targetCtx.fillRect(br.x + 2, py, br.w - 4, 5);
            }
        } else {
            for (let px = br.x + 4; px < br.x + br.w - 3; px += 8) {
                targetCtx.fillRect(px, br.y + 2, 5, br.h - 4);
            }
        }
        targetCtx.restore();
    }
}

// ============================================================================
// 7. BỘ VẼ BẢN ĐỒ CHI TIẾT 30 MAP (KHỚP CHÍNH XÁC 15 MAPS.PNG)
// ============================================================================
export function renderMap(targetCtx, targetW, targetH, levelNum, includeMiniBases = false) {
    const W = LOGICAL_WIDTH;
    const H = PLAYFIELD_HEIGHT;
    const registerNav = !includeMiniBases && targetW === LOGICAL_WIDTH && targetH === PLAYFIELD_HEIGHT;

    if (registerNav) {
        nav.reset();
    }

    targetCtx.save();
    targetCtx.scale(targetW / W, targetH / H);
    targetCtx.imageSmoothingEnabled = false;

    const baseTemplateId = ((Math.max(1, Number(levelNum) || 1) - 1) % 15) + 1;
    const isVeteran = levelNum > 15;

    const fillGrassBg = (shade = '#7bc64d') => {
        if (isVeteran && levelNum % 2 === 0) {
            fillBrownEarthBg('#8B5A2B');
            return;
        }
        targetCtx.fillStyle = shade;
        targetCtx.fillRect(0, 0, W, H);
        if (atlas.ready) {
            const TILE = 35;
            for (let r = 0; r < Math.ceil(H / TILE); r++) {
                for (let c = 0; c < Math.ceil(W / TILE); c++) {
                    const hash = (r * 31 + c * 17 + levelNum * 7) % 19;
                    const gCol = hash === 0 ? 1 : (hash === 3 ? 2 : 0);
                    const t = atlas.get(gCol, 0);
                    if (t) targetCtx.drawImage(t, c * TILE, r * TILE, TILE, TILE);
                }
            }
        }
        for (let i = 0; i < 32; i++) {
            const gx = ((i * 73 + levelNum * 29) % (W - 30)) + 15;
            const gy = ((i * 113 + levelNum * 43) % (H - 40)) + 20;
            targetCtx.fillStyle = i % 4 === 0 ? '#fde047' : '#5ea332';
            targetCtx.fillRect(gx, gy, 4, 4);
        }
    };

    const fillBrownEarthBg = (baseTone = '#9c6644') => {
        targetCtx.fillStyle = baseTone;
        targetCtx.fillRect(0, 0, W, H);
        const TILE = 30;
        const shades = ['#8B5A2B', '#9c6644', '#b08968', '#7f4f24'];
        for (let r = 0; r < Math.ceil(H / TILE); r++) {
            for (let c = 0; c < Math.ceil(W / TILE); c++) {
                const h = (r * 23 + c * 37 + levelNum * 13) % 11;
                if (h < 4) {
                    targetCtx.fillStyle = shades[h];
                    targetCtx.fillRect(c * TILE, r * TILE, TILE, TILE);
                }
            }
        }
        for (let i = 0; i < 42; i++) {
            const px = ((i * 67 + levelNum * 31) % (W - 24)) + 12;
            const py = ((i * 109 + levelNum * 47) % (H - 36)) + 18;
            targetCtx.fillStyle = i % 3 === 0 ? '#d4a373' : '#5c3a21';
            targetCtx.fillRect(px, py, 5, 4);
        }
    };

    const drawRoadPath = (pts, width = 36, paved = false) => {
        if (registerNav) nav.markPolyline(pts, width + 8, T_ROAD);
        targetCtx.save();
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';

        targetCtx.strokeStyle = paved ? '#334155' : '#9a6b32';
        targetCtx.lineWidth = width + 8;
        targetCtx.beginPath();
        pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
        targetCtx.stroke();

        targetCtx.strokeStyle = paved ? '#64748b' : '#eab308';
        targetCtx.lineWidth = width;
        targetCtx.beginPath();
        pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
        targetCtx.stroke();

        if (paved) {
            targetCtx.strokeStyle = '#e2e8f0';
            targetCtx.lineWidth = 2.5;
            targetCtx.setLineDash([10, 10]);
            targetCtx.beginPath();
            pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
            targetCtx.stroke();
        } else {
            targetCtx.strokeStyle = '#fde68a';
            targetCtx.lineWidth = Math.max(8, width - 14);
            targetCtx.beginPath();
            pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
            targetCtx.stroke();
        }
        targetCtx.restore();
    };

    const drawRingRoad = (cx, cy, r, width = 34, paved = true) => {
        if (registerNav) nav.markRing(cx, cy, r, width + 8, T_ROAD);
        targetCtx.save();
        targetCtx.strokeStyle = paved ? '#334155' : '#9a6b32';
        targetCtx.lineWidth = width + 8;
        targetCtx.beginPath();
        targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
        targetCtx.stroke();

        targetCtx.strokeStyle = paved ? '#64748b' : '#eab308';
        targetCtx.lineWidth = width;
        targetCtx.beginPath();
        targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
        targetCtx.stroke();

        if (paved) {
            targetCtx.strokeStyle = '#e2e8f0';
            targetCtx.lineWidth = 2.5;
            targetCtx.setLineDash([9, 9]);
            targetCtx.beginPath();
            targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
            targetCtx.stroke();
        }
        targetCtx.restore();
    };

    const drawWaterBox = (x, y, w, h, rounded = 0) => {
        if (registerNav) {
            nav.markRect(x, y, w, h, T_WATER, true);
            nav.waterBoxes.push({ x, y, w, h, rounded });
        }
        targetCtx.save();
        targetCtx.fillStyle = '#0284c7';
        targetCtx.beginPath();
        targetCtx.roundRect(x - 3, y - 3, w + 6, h + 6, rounded);
        targetCtx.fill();

        targetCtx.fillStyle = '#29b6f6';
        targetCtx.beginPath();
        targetCtx.roundRect(x, y, w, h, rounded);
        targetCtx.fill();
        targetCtx.restore();
    };

    const drawBridgeBox = (cx, cy, w = 50, h = 92, isVertical = true) => {
        if (registerNav) nav.addBridge(cx, cy, w, h, isVertical);
        const bw = isVertical ? w : h;
        const bh = isVertical ? h : w;
        const bx = cx - bw / 2;
        const by = cy - bh / 2;

        targetCtx.save();
        targetCtx.fillStyle = '#451a03';
        targetCtx.fillRect(bx - 3, by - 2, bw + 6, bh + 4);
        targetCtx.fillStyle = '#b45309';
        targetCtx.fillRect(bx, by, bw, bh);
        targetCtx.fillStyle = '#d97706';
        if (isVertical) {
            for (let py = by + 4; py < by + bh - 3; py += 8) {
                targetCtx.fillRect(bx + 2, py, bw - 4, 5);
            }
        } else {
            for (let px = bx + 4; px < bx + bw - 3; px += 8) {
                targetCtx.fillRect(px, by + 2, 5, bh - 4);
            }
        }
        targetCtx.restore();
    };

    const drawTree = (x, y, scale = 1, variant = 0) => {
        const rad = 14 * scale;
        if (registerNav && nav.isRoadOrBridgeOrSpawn(x, y, rad + 4)) return;
        if (registerNav) nav.addCircleObstacle(x, y, rad, 'tree');

        const col = variant === 0 ? 15 : 16;
        const row = variant === 2 ? 5 : 4;
        if (atlas.ready && atlas.draw(targetCtx, col, row, x, y, 36 * scale, 36 * scale)) return;

        targetCtx.save();
        targetCtx.fillStyle = '#14532d';
        targetCtx.beginPath();
        targetCtx.arc(x, y + 2, 15 * scale, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillStyle = '#22c55e';
        targetCtx.beginPath();
        targetCtx.arc(x, y - 1, 12 * scale, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
    };

    const drawRockMountain = (cx, cy, r = 24) => {
        if (registerNav && nav.isRoadOrBridgeOrSpawn(cx, cy, r * 0.65)) return;
        if (registerNav) nav.addCircleObstacle(cx, cy, r * 0.68, 'rock');
        targetCtx.save();
        targetCtx.translate(cx, cy);
        targetCtx.fillStyle = '#334155';
        targetCtx.beginPath();
        targetCtx.moveTo(-r, r * 0.7);
        targetCtx.lineTo(-r * 0.65, -r * 0.45);
        targetCtx.lineTo(0, -r * 0.95);
        targetCtx.lineTo(r * 0.7, -r * 0.35);
        targetCtx.lineTo(r, r * 0.7);
        targetCtx.closePath();
        targetCtx.fill();

        targetCtx.fillStyle = '#94a3b8';
        targetCtx.beginPath();
        targetCtx.moveTo(-r * 0.85, r * 0.6);
        targetCtx.lineTo(-r * 0.55, -r * 0.38);
        targetCtx.lineTo(0, -r * 0.85);
        targetCtx.lineTo(0, r * 0.6);
        targetCtx.closePath();
        targetCtx.fill();

        targetCtx.fillStyle = '#64748b';
        targetCtx.beginPath();
        targetCtx.moveTo(0, -r * 0.85);
        targetCtx.lineTo(r * 0.62, -r * 0.32);
        targetCtx.lineTo(r * 0.85, r * 0.6);
        targetCtx.lineTo(0, r * 0.6);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.restore();
    };

    const drawHouse = (x, y, w = 44, h = 44, roofCol = 8, roofRow = 0) => {
        if (registerNav && nav.isRoadOrBridgeOrSpawn(x + w / 2, y + h / 2, Math.max(w, h) * 0.52)) return;
        if (registerNav) nav.addBoxObstacle(x, y, w, h, 'building');

        const cx = x + w / 2;
        const cy = y + h / 2;
        if (atlas.ready && atlas.draw(targetCtx, roofCol, roofRow, cx, cy, w + 6, h + 6)) return;

        targetCtx.save();
        targetCtx.fillStyle = '#1e293b';
        targetCtx.fillRect(x - 2, y - 2, w + 4, h + 4);
        targetCtx.fillStyle = roofRow >= 2 ? '#0284c7' : '#ea580c';
        targetCtx.fillRect(x, y, w, h);
        targetCtx.fillStyle = '#fed7aa';
        targetCtx.fillRect(x + 5, y + 5, w - 10, h - 10);
        targetCtx.restore();
    };

    const drawStoneWallBox = (x, y, w, h) => {
        if (registerNav) nav.addBoxObstacle(x, y, w, h, 'wall');
        targetCtx.save();
        targetCtx.fillStyle = '#1e293b';
        targetCtx.fillRect(x - 2, y - 2, w + 4, h + 4);
        targetCtx.fillStyle = '#64748b';
        targetCtx.fillRect(x, y, w, h);
        targetCtx.fillStyle = '#94a3b8';
        targetCtx.fillRect(x + 3, y + 3, Math.max(4, w - 6), Math.max(4, h * 0.45));
        targetCtx.restore();
    };

    // --- 15 BẢN ĐỒ CHUẨN THEO ẢNH 15 MAPS.PNG ---
    switch (baseTemplateId) {
        case 1: {
            // Map 1: Sông cắt ngang giữa + 1 Cầu đá trung tâm
            fillGrassBg('#7bc64d');
            drawWaterBox(0, H / 2 - 54, W, 108, 0);
            drawRoadPath([[105, 85], [315, 85]], 30, false);
            drawRoadPath([[105, H - 85], [315, H - 85]], 30, false);
            drawRoadPath([[210, 65], [210, H - 65]], 38, false);
            drawBridgeBox(210, H / 2, 56, 118, true);
            [[38, 95], [382, 95], [38, H - 95], [382, H - 95]].forEach(([x, y]) => drawRockMountain(x, y, 26));
            [[75, 225], [345, 225], [75, H - 225], [345, H - 225]].forEach(([x, y]) => drawTree(x, y, 1.05, 0));
            break;
        }
        case 2: {
            // Map 2: Đường nhựa chữ S xuyên rừng và vách núi đá
            fillGrassBg('#6cb83b');
            drawRoadPath([
                [210, 65],
                [210, 145],
                [95, 195],
                [95, 330],
                [325, 390],
                [325, 520],
                [135, 575],
                [210, H - 65]
            ], 36, true);
            [[42, 90], [92, 95], [45, 155], [372, H - 95], [330, H - 85], [375, H - 155]].forEach(([x, y]) =>
                drawRockMountain(x, y, 25)
            );
            [[240, 250], [310, 250], [120, 455], [190, 455], [45, 420], [375, 240]].forEach(([x, y], i) =>
                drawTree(x, y, 1.1, i % 2)
            );
            break;
        }
        case 3: {
            // Map 3: Đô thị bàn cờ (3 đại lộ dọc x 3 đại lộ ngang)
            fillGrassBg('#64748b');
            drawRoadPath([[88, 55], [88, H - 55]], 32, true);
            drawRoadPath([[210, 55], [210, H - 55]], 34, true);
            drawRoadPath([[332, 55], [332, H - 55]], 32, true);
            drawRoadPath([[25, 210], [W - 25, 210]], 30, true);
            drawRoadPath([[25, 360], [W - 25, 360]], 30, true);
            drawRoadPath([[25, 510], [W - 25, 510]], 30, true);
            drawHouse(126, 250, 48, 65, 8, 1);
            drawHouse(246, 250, 48, 65, 9, 1);
            drawHouse(126, 400, 48, 65, 10, 3);
            drawHouse(246, 400, 48, 65, 8, 3);
            break;
        }
        case 4: {
            // Map 4: Pháo đài trên đảo giữa hồ lớn nối bằng 2 cầu Bắc - Nam
            fillGrassBg('#7bc64d');
            drawWaterBox(34, 155, W - 68, H - 310, 28);
            // Đảo trung tâm
            if (registerNav) nav.markRect(142, H / 2 - 58, 136, 116, T_ROAD, true);
            targetCtx.fillStyle = '#7bc64d';
            targetCtx.beginPath();
            targetCtx.roundRect(142, H / 2 - 58, 136, 116, 16);
            targetCtx.fill();

            drawBridgeBox(210, 205, 48, 110, true);
            drawBridgeBox(210, H - 205, 48, 110, true);
            drawRoadPath([[125, H / 2], [295, H / 2]], 30, false);
            drawHouse(184, H / 2 - 26, 52, 52, 7, 0);
            break;
        }
        case 5: {
            // Map 5: Mê cung đường rừng nhiều nhánh rẽ
            fillGrassBg('#5ea332');
            drawRoadPath([[210, 65], [105, 175], [105, 355], [210, 445], [105, 545], [210, H - 65]], 34, true);
            drawRoadPath([[210, 65], [315, 175], [315, 355], [210, 445], [315, 545], [210, H - 65]], 34, true);
            drawRoadPath([[105, 265], [315, 265]], 30, true);
            [[210, 195], [210, 345], [210, 535], [42, 260], [378, 260], [42, 460], [378, 460]].forEach(([x, y], i) =>
                drawTree(x, y, 1.15, i % 2)
            );
            break;
        }
        case 6: {
            // Map 6: Khu công nghiệp nhà máy
            fillBrownEarthBg('#64748b');
            drawRoadPath([[95, 65], [95, H - 65]], 34, true);
            drawRoadPath([[325, 65], [325, H - 65]], 34, true);
            drawRoadPath([[40, 235], [380, 235]], 32, true);
            drawRoadPath([[40, 475], [380, 475]], 32, true);
            drawRoadPath([[210, 235], [210, 475]], 32, true);
            drawHouse(132, 295, 52, 54, 11, 0);
            drawHouse(236, 295, 52, 54, 11, 4);
            drawHouse(132, 375, 52, 54, 10, 4);
            drawHouse(236, 375, 52, 54, 9, 4);
            break;
        }
        case 7: {
            // Map 7: Hẻm núi Song Hồ (2 hồ nước đối xứng + đường đèo uốn giữa)
            fillGrassBg('#74c043');
            drawWaterBox(64, 155, 175, 150, 20);
            drawWaterBox(180, 410, 175, 150, 20);
            drawRoadPath([
                [315, 65],
                [315, 315],
                [105, 395],
                [105, H - 65]
            ], 36, true);
            drawRoadPath([[125, 85], [315, 85]], 30, true);
            drawRoadPath([[105, H - 85], [295, H - 85]], 30, true);
            for (let y = 140; y <= H - 140; y += 58) {
                drawRockMountain(26, y, 22);
                drawRockMountain(W - 26, y, 22);
            }
            break;
        }
        case 8: {
            // Map 8: Đèo Đá Hiểm Trở (Dãy núi chắn ngang giữa bản đồ + khe đèo hẹp)
            fillGrassBg('#6cb83b');
            drawRoadPath([[210, 65], [210, H - 65]], 38, true);
            drawRoadPath([[105, 65], [105, 220], [210, 260]], 30, true);
            drawRoadPath([[315, H - 65], [315, H - 220], [210, H - 260]], 30, true);
            [[42, 320], [95, 340], [142, 355], [278, 355], [325, 340], [378, 320],
             [48, 395], [102, 395], [318, 395], [372, 395]].forEach(([x, y]) =>
                drawRockMountain(x, y, 25)
            );
            break;
        }
        case 9: {
            // Map 9: Vòng Xoay Thị Trấn (2 bùng binh Bắc - Nam + đường vành đai)
            fillGrassBg('#7bc64d');
            drawRingRoad(210, 205, 54, 30, true);
            drawRingRoad(210, H - 205, 54, 30, true);
            drawRoadPath([[95, 205], [95, H - 205]], 32, true);
            drawRoadPath([[325, 205], [325, H - 205]], 32, true);
            drawRoadPath([[210, 65], [210, 150]], 34, true);
            drawRoadPath([[210, H - 150], [210, H - 65]], 34, true);
            drawHouse(142, H / 2 - 48, 40, 40, 8, 2);
            drawHouse(238, H / 2 - 48, 40, 40, 9, 3);
            drawHouse(142, H / 2 + 12, 40, 40, 9, 1);
            drawHouse(238, H / 2 + 12, 40, 40, 8, 3);
            break;
        }
        case 10: {
            // Map 10: Bãi Biển Đổ Bộ (Biển bên trái + Bãi cát vàng giữa + Đường mòn & Núi đá bên phải)
            targetCtx.fillStyle = '#fde68a';
            targetCtx.fillRect(0, 0, W, H);
            targetCtx.fillStyle = '#7bc64d';
            targetCtx.fillRect(215, 0, W - 215, H);
            drawWaterBox(0, 0, 118, H, 0);
            drawRoadPath([[165, 65], [165, H - 65]], 34, false);
            drawRoadPath([[285, 65], [265, 240], [300, 450], [275, H - 65]], 34, false);
            drawRoadPath([[165, H / 2], [285, H / 2]], 30, false);
            for (let y = 120; y <= H - 120; y += 64) {
                drawRockMountain(378, y, 24);
            }
            break;
        }
        case 11: {
            // Map 11: Căn Cứ Tên Lửa (Đại lộ chữ thập + Hầm phóng tên lửa 4 góc)
            fillGrassBg('#65a30d');
            drawRoadPath([[210, 60], [210, H - 60]], 38, true);
            drawRoadPath([[45, 245], [W - 45, 245]], 32, true);
            drawRoadPath([[45, H - 245], [W - 45, H - 245]], 32, true);
            drawRoadPath([[95, 130], [95, H - 130]], 28, true);
            drawRoadPath([[325, 130], [325, H - 130]], 28, true);
            drawHouse(125, 145, 48, 48, 14, 0);
            drawHouse(247, 145, 48, 48, 14, 0);
            drawHouse(125, H - 193, 48, 48, 14, 3);
            drawHouse(247, H - 193, 48, 48, 14, 3);
            break;
        }
        case 12: {
            // Map 12: Thành Cổ Bao Vây (Đường vành đai vuông bao quanh Pháo đài đá trung tâm)
            fillGrassBg('#74c043');
            drawRoadPath([[95, 165], [325, 165], [325, H - 165], [95, H - 165], [95, 165]], 34, true);
            drawRoadPath([[210, 65], [210, 165]], 36, true);
            drawRoadPath([[210, H - 165], [210, H - 65]], 36, true);
            drawStoneWallBox(148, H / 2 - 62, 124, 124);
            drawHouse(184, H / 2 - 26, 52, 52, 7, 0);
            break;
        }
        case 13: {
            // Map 13: Quần Đảo Đa Cầu (Kênh nước chữ thập + 4 đảo nối bằng cầu gỗ)
            fillGrassBg('#7bc64d');
            drawWaterBox(0, 210, W, 62, 0);
            drawWaterBox(0, H - 272, W, 62, 0);
            drawWaterBox(180, 135, 60, H - 270, 0);

            drawRoadPath([[105, 65], [105, H - 65]], 32, true);
            drawRoadPath([[315, 65], [315, H - 65]], 32, true);
            drawRoadPath([[105, H / 2], [315, H / 2]], 32, true);

            drawBridgeBox(105, 241, 46, 72, true);
            drawBridgeBox(315, 241, 46, 72, true);
            drawBridgeBox(105, H - 241, 46, 72, true);
            drawBridgeBox(315, H - 241, 46, 72, true);
            drawBridgeBox(210, H / 2, 46, 74, false);
            break;
        }
        case 14: {
            // Map 14: Bùng Binh Đầm Lầy (Vòng xoay lớn bao quanh hồ nước vuông ở giữa)
            fillGrassBg('#6cb83b');
            drawRingRoad(210, H / 2, 132, 36, true);
            drawRoadPath([[210, 65], [210, H / 2 - 132]], 36, true);
            drawRoadPath([[210, H / 2 + 132], [210, H - 65]], 36, true);
            drawWaterBox(166, H / 2 - 44, 88, 88, 16);
            [[52, 150], [368, 150], [52, H - 150], [368, H - 150], [140, H / 2 - 62], [280, H / 2 + 62]].forEach(
                ([x, y], i) => drawTree(x, y, 1.1, i % 2)
            );
            break;
        }
        case 15:
        default: {
            // Map 15: Phòng Tuyến Trường Thành (2 dải tường thành đá chắn ngang + 3 lộ mở)
            fillGrassBg('#7bc64d');
            drawRoadPath([[95, 65], [95, H - 65]], 34, true);
            drawRoadPath([[210, 65], [210, H - 65]], 36, true);
            drawRoadPath([[325, 65], [325, H - 65]], 34, true);

            // Tường thành Bắc & Nam (Chừa 3 cổng ở x=95, 210, 325)
            drawStoneWallBox(12, 215, 52, 28);
            drawStoneWallBox(126, 215, 52, 28);
            drawStoneWallBox(242, 215, 52, 28);
            drawStoneWallBox(356, 215, 52, 28);

            drawStoneWallBox(12, H - 243, 52, 28);
            drawStoneWallBox(126, H - 243, 52, 28);
            drawStoneWallBox(242, H - 243, 52, 28);
            drawStoneWallBox(356, H - 243, 52, 28);
            break;
        }
    }

    if (includeMiniBases) {
        targetCtx.fillStyle = '#dc2626';
        targetCtx.strokeStyle = '#0f172a';
        targetCtx.lineWidth = 3;
        targetCtx.beginPath();
        targetCtx.roundRect(W / 2 - 42, 34, 84, 42, 8);
        targetCtx.fill();
        targetCtx.stroke();

        targetCtx.fillStyle = '#0284c7';
        targetCtx.beginPath();
        targetCtx.roundRect(W / 2 - 42, H - 76, 84, 42, 8);
        targetCtx.fill();
        targetCtx.stroke();
    }

    targetCtx.restore();

    if (registerNav) {
        nav.buildFlowFields();
    }
}

export function buildStaticMapCanvas(levelNum) {
    if (!atlas.bakedMapCanvas) {
        atlas.bakedMapCanvas = document.createElement('canvas');
        atlas.bakedMapCanvas.width = LOGICAL_WIDTH;
        atlas.bakedMapCanvas.height = PLAYFIELD_HEIGHT;
    }
    const bCtx = atlas.bakedMapCanvas.getContext('2d');
    bCtx.clearRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);
    renderMap(bCtx, LOGICAL_WIDTH, PLAYFIELD_HEIGHT, levelNum, false);
}

// ============================================================================
// 8. TÍNH TOÁN CHỈ SỐ ĐƠN VỊ (RARITY + LEVEL + META-TALENTS + 2 KHE CHIP + ROGUELIKE)
// ============================================================================
export function getEffectiveUnitStats(rawUnitId, team = 'blue', customRarityId = null) {
    const unitId = normalizeUnitId(rawUnitId);
    const base = UNIT_BY_ID[unitId] || UNIT_CATALOG[0];
    if (!base) {
        return {
            id: unitId,
            hp: 100,
            maxHp: 100,
            damage: 20,
            dmg: 20,
            speed: 45,
            range: 100,
            fireRate: 1.0,
            atkSpeed: 1.0,
            splash: 0,
            cooldown: 2.0,
            cost: 2
        };
    }

    if (team === 'red') {
        const diffCfg = DIFFICULTY_CONFIG[game?.difficulty || 'easy'] || DIFFICULTY_CONFIG.easy;
        const lvScale = 1 + Math.max(0, (game?.currentLevel || 1) - 1) * 0.055;
        const waveScale =
            game?.battleMode === 'endless_siege'
                ? Math.pow(1.13, Math.max(0, (game?.wave || 1) - 1))
                : 1 + Math.max(0, (game?.wave || 1) - 1) * 0.04;
        const mult = diffCfg.statMult * lvScale * waveScale;

        return {
            ...base,
            hp: Math.round(base.hp * mult),
            maxHp: Math.round(base.hp * mult),
            damage: Math.round(base.damage * mult),
            dmg: Math.round(base.damage * mult),
            speed: base.speed,
            range: base.range,
            fireRate: base.fireRate,
            atkSpeed: base.fireRate,
            rarityId: 'common',
            rarityColor: '#ef4444',
            equippedSockets: []
        };
    }

    const permLv = metaState?.armyPermanentLevels?.[base.id] || metaState?.armyPermanentLevels?.[rawUnitId] || 1;
    const lvMult = 1 + (permLv - 1) * 0.12;

    const rarityId = customRarityId || getHighestRarityForUnit(base.id) || 'common';
    const rarityObj = RARITY_CONFIG[rarityId] || { mult: 1.0, color: '#94a3b8' };
    const rarityMult = rarityObj.mult ?? 1.0;

    let hpBonusPct = 0;
    let dmgBonusPct = 0;
    let speedBonusPct = 0;
    let fireRateBonusPct = 0;
    let rangeBonusFlat = 0;
    let cdReductionPct = 0;
    let splashBonusFlat = 0;
    let armorReductionPct = 0;
    let lifestealPct = 0;
    let burnDps = 0;
    let stunChance = 0;

    // 1. Cây Bị Động (META_TALENTS: high_grade_steel & optimal_logistics)
    const steelLv = Number(metaState?.metaTalents?.high_grade_steel) || 0;
    const logiLv = Number(metaState?.metaTalents?.optimal_logistics) || 0;

    if (steelLv > 0) {
        hpBonusPct += steelLv * 0.04;
        if (!base.isWalker) {
            armorReductionPct += steelLv * 0.02; // Giảm sát thương nhận vào cho cơ giới (tối đa -10%)
        }
    }
    if (logiLv > 0) {
        cdReductionPct += logiLv * 0.03;
    }

    // 2. Hệ thống 2 Khe Chip Bổ Trợ (metaState.unitSockets[base.id])
    const sockets = Array.isArray(metaState?.unitSockets?.[base.id])
        ? metaState.unitSockets[base.id]
        : (metaState?.equippedChips?.[base.id] ? [metaState.equippedChips[base.id]] : []);

    sockets.forEach(chipId => {
        if (!chipId) return;
        if (chipId === 'napalm_rocket') {
            burnDps += 18;
            splashBonusFlat += 14;
        } else if (chipId === 'tactical_radar') {
            rangeBonusFlat += Math.round(base.range * 0.20);
        } else if (chipId === 'reactive_armor') {
            hpBonusPct += 0.18;
            armorReductionPct += 0.12;
        } else if (chipId === 'overclock_core' || chipId === 'overclock_servo') {
            fireRateBonusPct += 0.22;
            speedBonusPct += 0.15;
            cdReductionPct += 0.12;
        }
    });

    // 3. Đột biến Roguelike trong chế độ Endless Siege
    if (game?.activeMutations?.length) {
        for (const mutId of game.activeMutations) {
            if (mutId === 'titan_armor') hpBonusPct += 0.35;
            if (mutId === 'plasma_rounds') dmgBonusPct += 0.30;
            if (mutId === 'hyper_thrusters') speedBonusPct += 0.28;
            if (mutId === 'sniper_optics') rangeBonusFlat += 35;
            if (mutId === 'napalm_payload') {
                burnDps += 24;
                splashBonusFlat += 18;
            }
            if (mutId === 'nano_leech') lifestealPct += 0.22;
            if (mutId === 'rapid_clone') cdReductionPct += 0.25;
        }
    }

    const finalHp = Math.round(base.hp * lvMult * rarityMult * (1 + hpBonusPct));
    const finalDmg = Math.round(base.damage * lvMult * rarityMult * (1 + dmgBonusPct));
    const finalSpeed = Math.round(base.speed * (1 + speedBonusPct));
    const finalRange = Math.round(base.range + rangeBonusFlat);
    const finalFireRate = +(base.fireRate * (1 + fireRateBonusPct)).toFixed(2);
    const finalCooldown = Math.max(0.45, base.cooldown * (1 - Math.min(0.6, cdReductionPct)));
    const hasRadar = sockets.includes('tactical_radar');

    return {
        ...base,
        level: permLv,
        rarityId,
        rarityColor: rarityObj.color || '#38bdf8',
        hp: finalHp,
        maxHp: finalHp,
        damage: finalDmg,
        dmg: finalDmg,
        speed: finalSpeed,
        range: finalRange,
        fireRate: finalFireRate,
        atkSpeed: finalFireRate,
        visionCone: (base.visionCone || base.range + 35) + (hasRadar ? 65 : 0),
        splash: (base.splash || 0) + splashBonusFlat,
        cooldown: finalCooldown,
        equippedSockets: sockets,
        hasRadarAura: hasRadar,
        armorReductionPct: Math.min(0.55, armorReductionPct),
        lifestealPct,
        burnDps,
        stunChance
    };
}

// ============================================================================
// 9. TRẠNG THÁI TRẬN ĐẤU TRUNG TÂM & CÁC HỆ THỐNG HIỆU ỨNG CHIẾN TRƯỜNG
// ============================================================================
export const game = {
    running: false,
    paused: false,
    gameOver: false,
    showRanges: false,
    currentLevel: 1,
    difficulty: 'easy',
    battleMode: 'destroy', // 'destroy' | 'survival' | 'endless_siege' | 'auto_battler' | 'fog_of_war' | 'raid_boss'
    timeSec: 0,

    // Thống kê trong trận
    matchKills: 0,
    matchSpawns: 0,

    // Kinh tế Xăng (Gas)
    gas: 6,
    maxGas: 20,
    gasGenLevel: 0,
    gasTimer: 0,

    // Sóng địch (Wave)
    wave: 1,
    maxWaves: MAX_WAVES,
    waveTimer: 0,
    waveDuration: 20,
    enemySpawnTimer: 0,

    // Máu Căn Cứ
    playerBase: { x: LOGICAL_WIDTH / 2, y: PLAYFIELD_HEIGHT - 55, hp: 250, maxHp: 250, hitFlash: 0 },
    enemyBase: { x: LOGICAL_WIDTH / 2, y: 55, hp: 255, maxHp: 255, hitFlash: 0 },

    // Danh sách thực thể trong trận
    units: [],
    projectiles: [],
    airstrikes: [],
    landmines: [],
    paratroops: [],

    // Lớp hiệu ứng Juicy FX
    tireTracks: [],
    scorchMarks: [],
    shockwaves: [],
    muzzleFlashes: [],
    beamEffects: [],
    floatingTexts: [],

    // Bộ bài chiến đấu 5 ô & Cooldown
    deckIds: ['infantry', 'bazooka', 'humvee', 'tank', 'airstrike'],
    deckCooldowns: [0, 0, 0, 0, 0],
    deckMaxCooldowns: [1.5, 2.2, 3.0, 4.5, 5.5],

    // Kỹ năng Chỉ Huy (Commander Active Skills Q/W/E/R)
    tacticCooldowns: { airdrop: 0, minefield: 0, emp_blast: 0, blitzkrieg: 0 },
    tacticMaxCooldowns: { airdrop: 18, minefield: 22, emp_blast: 24, blitzkrieg: 26 },
    blitzkriegTimer: 0,

    // Chế độ 1: Endless Siege Roguelike
    activeMutations: [],
    awaitingMutationChoice: false,

    // Chế độ 2: Auto-Battler Formation
    autoBattlerPhase: 'prep', // 'prep' | 'combat'
    autoSelectedUnitId: 'infantry',

    // Chế độ 4: Raid Boss Rush
    raidBoss: null,

    // Rung chấn màn hình
    shakeTimer: 0,
    shakeIntensity: 0
};

function addScreenShake(intensity = 4, duration = 0.18) {
    game.shakeIntensity = Math.max(game.shakeIntensity, intensity);
    game.shakeTimer = Math.max(game.shakeTimer, duration);
}

function spawnScorchMark(x, y, radius = 16) {
    if (nav.isPointInWaterRaw(x, y)) return;
    game.scorchMarks.push({ x, y, radius, alpha: 0.78 });
    if (game.scorchMarks.length > 30) {
        game.scorchMarks.shift();
    }
}

function spawnShockwave(x, y, maxRadius = 42, color = '#fde047', lineWidth = 3.5) {
    game.shockwaves.push({
        x,
        y,
        radius: 4,
        maxRadius,
        alpha: 1.0,
        color,
        lineWidth
    });
}

function spawnMuzzleFlash(x, y, angle = 0, scale = 1.0) {
    game.muzzleFlashes.push({
        x,
        y,
        angle,
        scale,
        ttl: 0.065
    });
}

function spawnFloatingText(x, y, text, color = '#fde047', size = 13) {
    game.floatingTexts.push({
        x,
        y,
        text,
        color,
        size,
        vy: -28,
        alpha: 1.0
    });
}

function spawnExplosionFX(x, y, radius = 28, isNapalm = false, isEmp = false) {
    spawnScorchMark(x, y, Math.max(12, radius * 0.55));
    spawnShockwave(
        x,
        y,
        radius * 1.25,
        isEmp ? '#38bdf8' : (isNapalm ? '#f97316' : '#fde047'),
        isEmp ? 4 : 3
    );

    const count = Math.min(18, Math.max(8, Math.floor(radius * 0.45)));
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.35;
        const spd = 25 + Math.random() * (radius * 2.2);
        const col = isEmp
            ? (i % 2 === 0 ? '#38bdf8' : '#e0f2fe')
            : (i % 3 === 0 ? '#fde047' : (i % 2 === 0 ? '#f97316' : '#ef4444'));
        particlePool.spawn(
            x,
            y,
            Math.cos(a) * spd,
            Math.sin(a) * spd,
            2.5 + Math.random() * 3.5,
            col,
            1.9,
            'circle'
        );
    }
}

// ============================================================================
// 10. LỚP ĐƠN VỊ CHIẾN ĐẤU (UNIT) & ĐẠN PHÁO (PROJECTILE)
// ============================================================================
let NEXT_UNIT_UID = 1;

class Unit {
    constructor(team, unitId, x, y, customRarityId = null) {
        this.uid = NEXT_UNIT_UID++;
        this.team = team;
        this.spec = getEffectiveUnitStats(unitId, team, customRarityId);
        this.id = this.spec.id;
        this.x = x;
        this.y = y;
        this.hp = this.spec.hp;
        this.maxHp = this.spec.maxHp;
        this.radius = this.spec.radius || 12;
        this.isWalker = !!this.spec.isWalker;
        this.isAir = !!this.spec.isAir;
        this.isNaval = !!this.spec.isNaval;
        this.altitude = this.isAir ? (this.spec.altitude || 26) : 0;

        this.angle = team === 'blue' ? -Math.PI / 2 : Math.PI / 2;
        this.turretAngle = this.angle;
        this.walkCycle = Math.random() * Math.PI * 2;
        this.rotorAngle = 0;
        this.recoilOffset = 0;
        this.hitFlash = 0;
        this.attackTimer = Math.random() * 0.35;
        this.trailTimer = 0;

        this.stunTimer = 0;
        this.burnTimer = 0;
        this.burnDps = 0;
        this.airdropBuffTimer = 0;
        this.dead = false;
    }

    takeDamage(rawAmount, attacker = null) {
        if (this.dead) return;
        let finalDmg = rawAmount;
        if (this.spec.armorReductionPct > 0) {
            finalDmg *= 1 - this.spec.armorReductionPct;
        }
        finalDmg = Math.max(1, Math.round(finalDmg));
        this.hp -= finalDmg;
        this.hitFlash = 0.12;

        if (attacker && !attacker.dead && attacker.spec?.lifestealPct > 0) {
            const heal = Math.max(1, Math.round(finalDmg * attacker.spec.lifestealPct));
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            sfx.play('boom');
            spawnExplosionFX(this.x, this.y, this.radius * 1.8);

            if (this.team === 'red') {
                game.matchKills++;
                if (metaState?.missionsProgress) {
                    metaState.missionsProgress.kills = (metaState.missionsProgress.kills || 0) + 1;
                }
                if (game.battleMode === 'endless_siege' && Math.random() < 0.25) {
                    game.gas = Math.min(game.maxGas, game.gas + 0.5);
                }
            }
        }
    }

    update(dt) {
        if (this.dead) return;

        // Trong pha xếp đội hình Auto-Battler, các đơn vị đứng yên chờ lệnh xuất kích
        if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') {
            if (this.isAir) this.rotorAngle += dt * 18;
            return;
        }

        if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
        if (this.recoilOffset > 0) this.recoilOffset = Math.max(0, this.recoilOffset - dt * 22);
        if (this.airdropBuffTimer > 0) this.airdropBuffTimer = Math.max(0, this.airdropBuffTimer - dt);
        if (this.isAir) this.rotorAngle += dt * 24;

        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.hp -= this.burnDps * dt;
            if (Math.random() < 0.3) {
                particlePool.spawn(
                    this.x + (Math.random() - 0.5) * 10,
                    this.y + (Math.random() - 0.5) * 10,
                    0,
                    -18,
                    2.5,
                    '#f97316',
                    2.4,
                    'circle'
                );
            }
            if (this.hp <= 0) {
                this.takeDamage(1);
                return;
            }
        }

        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            return;
        }

        const isBlitz = this.team === 'blue' && game.blitzkriegTimer > 0;
        const speedMult = isBlitz ? 1.80 : 1.0; // Khớp +80% tốc chạy của Blitzkrieg trong data.js
        const fireRateMult = (isBlitz ? 1.35 : 1.0) * (this.airdropBuffTimer > 0 ? 1.30 : 1.0);

        const target = this.findBestTarget();
        this.attackTimer -= dt * fireRateMult;

        if (target) {
            const tx = target.x;
            const ty = target.y;
            const dist = Math.hypot(tx - this.x, ty - this.y);
            this.turretAngle = Math.atan2(ty - this.y, tx - this.x);

            if (dist <= this.spec.range) {
                this.angle = this.turretAngle;
                if (this.attackTimer <= 0) {
                    this.fireAt(target);
                    this.attackTimer = 1 / Math.max(0.25, this.spec.fireRate);
                }
                return;
            }
        }

        let dirX = 0;
        let dirY = this.team === 'blue' ? -1 : 1;

        if (target && Math.hypot(target.x - this.x, target.y - this.y) < this.spec.range * 1.45) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const l = Math.hypot(dx, dy) || 1;
            dirX = dx / l;
            dirY = dy / l;
        } else if (!this.isAir) {
            const flow = nav.getFlowDirection(this.x, this.y, this.team, this.isNaval);
            dirX = flow.dirX;
            dirY = flow.dirY;
        } else {
            const goalX = this.team === 'blue' ? game.enemyBase.x : game.playerBase.x;
            const goalY = this.team === 'blue' ? game.enemyBase.y : game.playerBase.y;
            const dx = goalX - this.x;
            const dy = goalY - this.y;
            const l = Math.hypot(dx, dy) || 1;
            dirX = dx / l;
            dirY = dy / l;
        }

        for (const other of game.units) {
            if (other === this || other.dead || other.isAir !== this.isAir) continue;
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const d = Math.hypot(dx, dy);
            const minSep = this.radius + other.radius + 2;
            if (d > 0.001 && d < minSep) {
                const push = ((minSep - d) / minSep) * 0.85;
                dirX += (dx / d) * push;
                dirY += (dy / d) * push;
            }
        }

        const norm = Math.hypot(dirX, dirY) || 1;
        dirX /= norm;
        dirY /= norm;

        const moveStep = this.spec.speed * speedMult * dt;
        this.x += dirX * moveStep;
        this.y += dirY * moveStep;
        this.angle = Math.atan2(dirY, dirX);
        this.turretAngle = this.angle;
        this.walkCycle += dt * (this.isWalker ? 11 : 7);

        nav.resolveHardCollisions(this);

        this.trailTimer -= dt;
        if (this.trailTimer <= 0) {
            this.spawnMovementTrail();
            this.trailTimer = this.isNaval ? 0.11 : (this.isWalker ? 0.18 : 0.09);
        }
    }

    spawnMovementTrail() {
        if (this.isAir) return;

        if (this.isNaval) {
            const bx = this.x - Math.cos(this.angle) * (this.radius * 0.85);
            const by = this.y - Math.sin(this.angle) * (this.radius * 0.85);
            particlePool.spawn(bx, by, 0, 0, 5, 'rgba(224, 242, 254, 0.85)', 1.4, 'wake', this.angle);
        } else if (this.isWalker) {
            const fx = this.x - Math.cos(this.angle) * 6;
            const fy = this.y - Math.sin(this.angle) * 6 + 4;
            particlePool.spawn(fx, fy, (Math.random() - 0.5) * 8, -4, 3.2, '#d4a373', 2.2, 'dust', 0);
        } else {
            const perpX = -Math.sin(this.angle) * 6.5;
            const perpY = Math.cos(this.angle) * 6.5;
            const backX = this.x - Math.cos(this.angle) * 8;
            const backY = this.y - Math.sin(this.angle) * 8;
            game.tireTracks.push({
                x1: backX - perpX,
                y1: backY - perpY,
                x2: backX + perpX,
                y2: backY + perpY,
                angle: this.angle,
                alpha: 0.42
            });
            if (game.tireTracks.length > 120) {
                game.tireTracks.shift();
            }
        }
    }

    findBestTarget() {
        let best = null;
        let bestDist = Infinity;

        for (const u of game.units) {
            if (u.dead || u.team === this.team) continue;
            const d = Math.hypot(u.x - this.x, u.y - this.y);
            if (d < bestDist) {
                bestDist = d;
                best = u;
            }
        }

        if (this.team === 'blue' && game.battleMode === 'raid_boss' && game.raidBoss && game.raidBoss.hp > 0) {
            const dBoss = Math.hypot(game.raidBoss.x - this.x, game.raidBoss.y - this.y) - 28;
            if (dBoss <= this.spec.range || dBoss < bestDist) {
                return {
                    isBoss: true,
                    x: game.raidBoss.x,
                    y: game.raidBoss.y + 18,
                    ref: game.raidBoss
                };
            }
        }

        const enemyBaseObj = this.team === 'blue' ? game.enemyBase : game.playerBase;
        if (enemyBaseObj && enemyBaseObj.hp > 0) {
            const dBase = Math.hypot(enemyBaseObj.x - this.x, enemyBaseObj.y - this.y) - 24;
            if (dBase <= this.spec.range || !best) {
                if (!best || dBase < bestDist) {
                    return {
                        isBase: true,
                        x: enemyBaseObj.x,
                        y: enemyBaseObj.y,
                        ref: enemyBaseObj
                    };
                }
            }
        }

        return best;
    }

    fireAt(target) {
        const muzzleDist = this.radius + 5;
        const mx = this.x + Math.cos(this.turretAngle) * muzzleDist;
        const my = this.y - this.altitude + Math.sin(this.turretAngle) * muzzleDist;

        this.recoilOffset = 4.2;
        spawnMuzzleFlash(mx, my, this.turretAngle, this.spec.splash >= 30 ? 1.25 : 0.9);

        if (this.spec.attackType === 'beam') {
            sfx.play('beam');
            game.beamEffects.push({
                x1: mx,
                y1: my,
                x2: target.x,
                y2: target.y - (target.altitude || 0),
                color: this.team === 'blue' ? '#fde047' : '#fb7185',
                ttl: 0.075
            });
            applyDamageToTargetObject(target, this.spec.damage, this);
        } else {
            sfx.play('cannon');
            game.projectiles.push(
                new Projectile({
                    team: this.team,
                    x: mx,
                    y: my,
                    targetX: target.x,
                    targetY: target.y,
                    targetRef: target,
                    speed: this.spec.projSpeed || 250,
                    damage: this.spec.damage,
                    splash: this.spec.splash || 0,
                    arcHeight: this.spec.arcHeight || 0,
                    isRocket:
                        this.spec.projType === 'rocket_short' ||
                        this.spec.projType === 'air_missile' ||
                        this.spec.projType === 'arc_missile',
                    owner: this
                })
            );
        }
    }

    drawShadow(ctx) {
        ctx.save();
        if (this.isAir) {
            const sx = this.x + 18;
            const sy = this.y + 22;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
            ctx.beginPath();
            ctx.ellipse(sx, sy, this.radius * 0.85, this.radius * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.isWalker) {
            const pulse = 1 + Math.sin(this.walkCycle) * 0.14;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
            ctx.beginPath();
            ctx.ellipse(
                this.x + 4,
                this.y + 4,
                this.radius * 0.82 * pulse,
                this.radius * 0.52 * (2 - pulse),
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.36)';
            ctx.beginPath();
            ctx.ellipse(this.x + 4, this.y + 4, this.radius * 1.02, this.radius * 0.68, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawBody(ctx) {
        const drawX = this.x - Math.cos(this.turretAngle) * this.recoilOffset;
        const drawY =
            this.y -
            this.altitude -
            Math.sin(this.turretAngle) * this.recoilOffset +
            (this.isWalker ? Math.abs(Math.sin(this.walkCycle)) * -2.2 : 0);

        // Vẽ vòng tầm bắn nếu bật nút 🎯 TẦM trên HUD
        if (game.showRanges) {
            ctx.save();
            ctx.strokeStyle = this.team === 'blue' ? 'rgba(56, 189, 248, 0.28)' : 'rgba(244, 63, 94, 0.24)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.spec.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();

        if (this.team === 'blue' && (game.blitzkriegTimer > 0 || this.airdropBuffTimer > 0)) {
            ctx.strokeStyle = game.blitzkriegTimer > 0 ? '#fde047' : '#4ade80';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        const row = this.team === 'blue' ? 7 : 8;
        const col = this.spec.spriteCol ?? 16;
        const size = this.radius * 2.35;
        const rot = this.angle + Math.PI / 2;

        const drewSprite =
            atlas.ready &&
            atlas.draw(ctx, col, row, drawX, drawY, size, size, {
                rotation: rot
            });

        if (!drewSprite) {
            ctx.translate(drawX, drawY);
            ctx.rotate(this.angle);
            ctx.fillStyle = this.team === 'blue' ? '#0284c7' : '#dc2626';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-this.radius, -this.radius * 0.75, this.radius * 2, this.radius * 1.5, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fde047';
            ctx.fillRect(2, -2.5, this.radius, 5);
        }

        ctx.restore();

        if (this.isAir) {
            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.rotate(this.rotorAngle);
            ctx.strokeStyle = 'rgba(248, 250, 252, 0.75)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(-16, 0);
            ctx.lineTo(16, 0);
            ctx.moveTo(0, -16);
            ctx.lineTo(0, 16);
            ctx.stroke();
            ctx.restore();
        }

        if (this.hitFlash > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.radius * 0.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (this.stunTimer > 0) {
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(drawX, drawY - this.radius - 8, 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.hp < this.maxHp) {
            const bw = Math.max(20, this.radius * 1.7);
            const bh = 4;
            const bx = drawX - bw / 2;
            const by = drawY - this.radius - 10;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
            ctx.fillStyle = this.team === 'blue' ? '#22c55e' : '#ef4444';
            ctx.fillRect(bx, by, bw * Math.max(0, this.hp / this.maxHp), bh);
        }
    }
}

class Projectile {
    constructor(opts) {
        this.team = opts.team;
        this.startX = opts.x;
        this.startY = opts.y;
        this.x = opts.x;
        this.y = opts.y;
        this.targetX = opts.targetX;
        this.targetY = opts.targetY;
        this.targetRef = opts.targetRef || null;
        this.speed = opts.speed || 250;
        this.damage = opts.damage || 25;
        this.splash = opts.splash || 0;
        this.arcHeight = opts.arcHeight || 0;
        this.isRocket = !!opts.isRocket;
        this.owner = opts.owner || null;

        const totalDist = Math.max(10, Math.hypot(this.targetX - this.startX, this.targetY - this.startY));
        this.totalTime = totalDist / this.speed;
        this.elapsed = 0;
        this.angle = Math.atan2(this.targetY - this.startY, this.targetX - this.startX);
        this.smokeTimer = 0;
        this.done = false;
    }

    update(dt) {
        if (this.done) return;

        if (this.targetRef && !this.targetRef.dead && !this.targetRef.isBase && !this.targetRef.isBoss) {
            this.targetX = this.targetRef.x;
            this.targetY = this.targetRef.y;
        }

        this.elapsed += dt;
        const t = Math.min(1, this.elapsed / this.totalTime);

        const prevX = this.x;
        const prevY = this.y;

        const baseX = this.startX + (this.targetX - this.startX) * t;
        const baseY = this.startY + (this.targetY - this.startY) * t;
        const parabola = this.arcHeight > 0 ? Math.sin(t * Math.PI) * this.arcHeight : 0;

        this.x = baseX;
        this.y = baseY - parabola;
        this.angle = Math.atan2(this.y - prevY, this.x - prevX);

        if (this.isRocket) {
            this.smokeTimer -= dt;
            if (this.smokeTimer <= 0) {
                particlePool.spawn(
                    this.x - Math.cos(this.angle) * 6,
                    this.y - Math.sin(this.angle) * 6,
                    (Math.random() - 0.5) * 12,
                    (Math.random() - 0.5) * 12,
                    3.2,
                    'rgba(226, 232, 240, 0.75)',
                    2.6,
                    'circle'
                );
                this.smokeTimer = 0.028;
            }
        }

        if (t >= 1) {
            this.detonate();
        }
    }

    detonate() {
        this.done = true;
        const ownerSpec = this.owner?.spec || {};
        const hasNapalm = (ownerSpec.burnDps || 0) > 0;
        const hasEmp = (ownerSpec.stunChance || 0) > 0 && Math.random() < ownerSpec.stunChance;

        if (this.splash > 0) {
            sfx.play('boom');
            spawnExplosionFX(this.targetX, this.targetY, this.splash, hasNapalm, hasEmp);
            if (this.splash >= 38) addScreenShake(3.5, 0.14);

            for (const u of game.units) {
                if (u.dead || u.team === this.team) continue;
                const d = Math.hypot(u.x - this.targetX, u.y - this.targetY);
                if (d <= this.splash) {
                    const falloff = 1 - (d / this.splash) * 0.35;
                    u.takeDamage(this.damage * falloff, this.owner);
                    if (hasNapalm) {
                        u.burnTimer = 3.0;
                        u.burnDps = ownerSpec.burnDps;
                    }
                    if (hasEmp) {
                        u.stunTimer = Math.max(u.stunTimer, 1.4);
                    }
                }
            }

            const enemyBaseObj = this.team === 'blue' ? game.enemyBase : game.playerBase;
            if (Math.hypot(enemyBaseObj.x - this.targetX, enemyBaseObj.y - this.targetY) <= this.splash + 26) {
                damageBase(enemyBaseObj, this.damage * 0.85);
            }
            if (
                this.team === 'blue' &&
                game.battleMode === 'raid_boss' &&
                game.raidBoss &&
                Math.hypot(game.raidBoss.x - this.targetX, game.raidBoss.y - this.targetY) <= this.splash + 34
            ) {
                damageRaidBoss(this.damage, this.targetX);
            }
        } else {
            particlePool.spawn(this.targetX, this.targetY, 0, 0, 5, '#fde047', 3.5, 'circle');
            if (this.targetRef) {
                applyDamageToTargetObject(this.targetRef, this.damage, this.owner);
            }
        }
    }

    draw(ctx) {
        if (this.done) return;
        const sprite = projCache.getProjectileSprite(this.angle, this.team === 'blue', this.isRocket);
        if (sprite) {
            ctx.drawImage(sprite, this.x - 10, this.y - 10);
        }
    }
}

function applyDamageToTargetObject(target, dmg, attacker = null) {
    if (!target) return;
    const ownerSpec = attacker?.spec || {};
    if (target.isBase && target.ref) {
        damageBase(target.ref, dmg);
    } else if (target.isBoss && target.ref) {
        damageRaidBoss(dmg, attacker?.x);
    } else if (typeof target.takeDamage === 'function') {
        target.takeDamage(dmg, attacker);
        if (ownerSpec.burnDps > 0) {
            target.burnTimer = 3.0;
            target.burnDps = ownerSpec.burnDps;
        }
        if (ownerSpec.stunChance > 0 && Math.random() < ownerSpec.stunChance) {
            target.stunTimer = Math.max(target.stunTimer, 1.25);
        }
    }
}

function damageBase(baseObj, rawDmg) {
    if (!baseObj || baseObj.hp <= 0 || game.gameOver) return;
    const dmg = Math.max(1, Math.round(rawDmg));
    baseObj.hp = Math.max(0, baseObj.hp - dmg);
    baseObj.hitFlash = 0.15;

    if (baseObj === game.playerBase && baseObj.hp <= 0) {
        endBattle(false);
    } else if (baseObj === game.enemyBase && baseObj.hp <= 0) {
        if (game.battleMode === 'destroy' || game.battleMode === 'fog_of_war' || game.battleMode === 'auto_battler') {
            endBattle(true);
        }
    }
}

// ============================================================================
// 11. HỆ THỐNG KỸ NĂNG CHỈ HUY (COMMANDER ACTIVE SKILLS Q / W / E / R)
// ============================================================================
const SKILL_ALIAS_MAP = {
    airdrop: 'airdrop',
    mines: 'minefield',
    landmines: 'minefield',
    minefield: 'minefield',
    emp: 'emp_blast',
    emp_blast: 'emp_blast',
    blitz: 'blitzkrieg',
    blitzkrieg: 'blitzkrieg'
};

export function triggerCommanderSkill(rawSkillKey, targetX = null, targetY = null) {
    if (!game.running || game.paused || game.gameOver) return;
    const skillKey = SKILL_ALIAS_MAP[rawSkillKey] || rawSkillKey;
    if (!skillKey || game.tacticCooldowns[skillKey] > 0) return;

    const logiLv = Number(metaState?.metaTalents?.optimal_logistics) || 0;
    const cdReduction = logiLv * 0.04;
    const baseCd = game.tacticMaxCooldowns[skillKey] || 18;
    game.tacticCooldowns[skillKey] = Math.max(6, baseCd * (1 - cdReduction));

    triggerHaptic(25);

    if (skillKey === 'airdrop') {
        // [Q] Chi Viện Dù: Hồi 40% HP & +30% tốc đánh cho đồng minh + Thả 3 lính nhảy dù
        sfx.play('spawn');
        const dropX = targetX ?? LOGICAL_WIDTH / 2;
        const dropY = targetY ?? Math.max(190, PLAYFIELD_HEIGHT * 0.52);

        for (const u of game.units) {
            if (u.team === 'blue' && !u.dead) {
                u.hp = Math.min(u.maxHp, Math.round(u.hp + u.maxHp * 0.40));
                u.airdropBuffTimer = 6.0;
            }
        }

        const specs = ['infantry', 'bazooka', 'infantry'];
        specs.forEach((uId, idx) => {
            const dx = Math.max(48, Math.min(LOGICAL_WIDTH - 48, dropX + (idx - 1) * 42));
            game.paratroops.push({
                unitId: uId,
                x: dx,
                targetY: dropY + (idx % 2 === 0 ? 10 : -10),
                y: Math.max(40, dropY - 110),
                done: false
            });
        });
        spawnFloatingText(dropX, dropY - 28, '🪂 CHI VIỆN DÙ & HỒI 40% HP!', '#4ade80', 14);
    } else if (skillKey === 'minefield') {
        // [W] Rải Mìn Chống Tăng
        sfx.play('upgrade');
        const rowY = targetY ?? PLAYFIELD_HEIGHT * 0.62;
        for (let i = 0; i < 5; i++) {
            const mx = 70 + i * 70;
            const validPt = nav.findValidSpawnPoint('blue', UNIT_BY_ID.infantry, mx, rowY);
            game.landmines.push({
                x: validPt.x,
                y: validPt.y,
                radius: 11,
                splash: 54,
                damage: 240,
                blinkTimer: Math.random(),
                exploded: false
            });
        }
        spawnFloatingText(LOGICAL_WIDTH / 2, rowY - 20, '💣 BÃI MÌN CHỐNG TĂNG [W]!', '#f97316', 14);
    } else if (skillKey === 'emp_blast') {
        // [E] Xung Điện EMP: Tê liệt cơ giới & tàu chiến địch 3.5s - 4.0s
        sfx.play('emp');
        addScreenShake(6, 0.28);
        const empX = targetX ?? LOGICAL_WIDTH / 2;
        const empY = targetY ?? PLAYFIELD_HEIGHT * 0.42;
        spawnShockwave(empX, empY, 240, '#38bdf8', 5);

        for (const u of game.units) {
            if (u.team === 'red' && !u.dead) {
                u.stunTimer = Math.max(u.stunTimer, 3.8);
                u.takeDamage(48);
            }
        }
        if (game.raidBoss && game.raidBoss.hp > 0) {
            game.raidBoss.stunTimer = 3.0;
            damageRaidBoss(180, empX);
        }
        spawnFloatingText(empX, empY, '⚡ XUNG ĐIỆN EMP [E]!', '#38bdf8', 15);
    } else if (skillKey === 'blitzkrieg') {
        // [R] Tăng Tốc Cơ Động Blitzkrieg (+80% tốc chạy trong 5s)
        sfx.play('blitz');
        game.blitzkriegTimer = 5.0;
        spawnShockwave(game.playerBase.x, game.playerBase.y, 180, '#fde047', 4.5);
        spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT * 0.68, '🚀 BLITZKRIEG THẦN TỐC [R]!', '#fde047', 15);
    }

    updateCommanderSkillsUI();
}

// ============================================================================
// 12. 4 CHẾ ĐỘ CHƠI MỚI (RAID BOSS, FOG OF WAR, ENDLESS SIEGE, AUTO-BATTLER)
// ============================================================================
function initRaidBoss() {
    const diffMult = DIFFICULTY_CONFIG[game.difficulty]?.statMult || 1.0;
    const maxHp = Math.round((5400 + game.currentLevel * 380) * diffMult);
    const partMax = Math.round(maxHp * 0.35);

    game.raidBoss = {
        name: RAID_BOSS_CONFIG.name || 'PHÁO ĐÀI HẠM LEVIATHAN MK-IX',
        x: LOGICAL_WIDTH / 2,
        y: 82,
        vx: 36,
        hp: maxHp,
        maxHp,
        parts: {
            cannon: { hp: partMax, maxHp: partMax, destroyed: false },
            sam: { hp: partMax, maxHp: partMax, destroyed: false },
            engine: { hp: partMax, maxHp: partMax, destroyed: false }
        },
        phase: 1,
        skillTimer: 4.5,
        turretTimer: 1.1,
        stunTimer: 0,
        hitFlash: 0,
        laserSweepAngle: 0,
        laserSweepTimer: 0
    };
    game.enemyBase.hp = maxHp;
    game.enemyBase.maxHp = maxHp;
    updateRaidBossHUD();
}

function updateRaidBossHUD() {
    const hud = document.getElementById('raid-boss-hud');
    const boss = game.raidBoss;
    if (!hud) return;

    if (game.battleMode !== 'raid_boss' || !boss) {
        hud.classList.add('hidden');
        hud.classList.remove('active');
        return;
    }

    hud.classList.remove('hidden');
    hud.classList.add('active');

    const totalHpEl = document.getElementById('raid-boss-total-hp');
    if (totalHpEl) totalHpEl.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;

    const mainFillEl = document.getElementById('raid-boss-main-bar-fill');
    if (mainFillEl) {
        mainFillEl.style.width = `${Math.max(0, Math.round((boss.hp / boss.maxHp) * 100))}%`;
    }

    ['cannon', 'sam', 'engine'].forEach(key => {
        const part = boss.parts[key];
        const cardEl = document.getElementById(`boss-part-${key}`);
        const hpTextEl = document.getElementById(`boss-part-${key}-hp`);
        const barEl = document.getElementById(`boss-part-${key}-bar`);
        const pct = Math.max(0, Math.round((part.hp / part.maxHp) * 100));

        if (cardEl) cardEl.classList.toggle('part-destroyed', part.destroyed);
        if (hpTextEl) hpTextEl.textContent = part.destroyed ? 'HỎNG' : `${pct}%`;
        if (barEl) barEl.style.width = `${pct}%`;
    });
}

function damageRaidBoss(rawDmg, hitX = null) {
    const boss = game.raidBoss;
    if (!boss || boss.hp <= 0 || game.gameOver) return;
    const dmg = Math.max(1, Math.round(rawDmg));
    boss.hp = Math.max(0, boss.hp - dmg);
    boss.hitFlash = 0.12;
    game.enemyBase.hp = boss.hp;

    // Phân bổ sát thương vào 3 bộ phận (Pháo Chính, Phòng Không, Động Cơ)
    let partKey = 'engine';
    if (hitX !== null) {
        if (hitX < boss.x - 15) partKey = 'cannon';
        else if (hitX > boss.x + 15) partKey = 'sam';
    }
    const targetPart = boss.parts[partKey] && !boss.parts[partKey].destroyed
        ? boss.parts[partKey]
        : Object.values(boss.parts).find(p => !p.destroyed);

    if (targetPart) {
        targetPart.hp = Math.max(0, targetPart.hp - dmg * 0.85);
        if (targetPart.hp <= 0 && !targetPart.destroyed) {
            targetPart.destroyed = true;
            sfx.play('boom');
            addScreenShake(6, 0.3);
            spawnExplosionFX(boss.x, boss.y, 65, true, false);
            spawnFloatingText(boss.x, boss.y + 36, '💥 ĐÃ PHÁ HỦY BỘ PHẬN BOSS!', '#fde047', 14);
        }
    }

    const hpRatio = boss.hp / boss.maxHp;
    if (hpRatio <= 0.65 && boss.phase === 1) {
        boss.phase = 2;
        sfx.play('boom');
        addScreenShake(7, 0.35);
        spawnShockwave(boss.x, boss.y, 180, '#f97316', 5);
        spawnFloatingText(boss.x, boss.y + 45, 'GIAI ĐOẠN 2: MƯA TÊN LỬA!', '#f97316', 16);
    } else if (hpRatio <= 0.30 && boss.phase === 2) {
        boss.phase = 3;
        sfx.play('emp');
        addScreenShake(9, 0.45);
        spawnShockwave(boss.x, boss.y, 240, '#ef4444', 6);
        spawnFloatingText(boss.x, boss.y + 45, 'GIAI ĐOẠN CUỐI: TIA HỦY DIỆT!', '#ef4444', 17);
    }

    updateRaidBossHUD();

    if (boss.hp <= 0) {
        spawnExplosionFX(boss.x, boss.y, 95, true, false);
        addScreenShake(12, 0.6);
        endBattle(true);
    }
}

function updateRaidBoss(dt) {
    const boss = game.raidBoss;
    if (!boss || boss.hp <= 0) return;

    if (boss.hitFlash > 0) boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    if (boss.stunTimer > 0) {
        boss.stunTimer -= dt;
        return;
    }

    // Nếu Động Cơ bị phá hủy, tốc độ di chuyển của Boss giảm 65%
    const engineMult = boss.parts.engine.destroyed ? 0.35 : 1.0;
    boss.x += boss.vx * (boss.phase === 3 ? 1.45 : 1.0) * engineMult * dt;
    if (boss.x > LOGICAL_WIDTH - 85) {
        boss.x = LOGICAL_WIDTH - 85;
        boss.vx = -Math.abs(boss.vx);
    } else if (boss.x < 85) {
        boss.x = 85;
        boss.vx = Math.abs(boss.vx);
    }

    // Nếu Pháo Chính chưa hỏng, bắn pháo kép liên tục
    const cannonMult = boss.parts.cannon.destroyed ? 0.45 : 1.0;
    boss.turretTimer -= dt * (boss.phase >= 2 ? 1.35 : 1.0) * cannonMult;
    if (boss.turretTimer <= 0) {
        boss.turretTimer = 1.25;
        const targets = game.units.filter(u => u.team === 'blue' && !u.dead);
        if (targets.length > 0) {
            const t = targets[Math.floor(Math.random() * targets.length)];
            [-26, 26].forEach(offsetX => {
                game.projectiles.push(
                    new Projectile({
                        team: 'red',
                        x: boss.x + offsetX,
                        y: boss.y + 24,
                        targetX: t.x,
                        targetY: t.y,
                        targetRef: t,
                        speed: 240,
                        damage: 30 * boss.phase,
                        splash: 28,
                        arcHeight: 16,
                        isRocket: true
                    })
                );
            });
            sfx.play('cannon');
        }
    }

    boss.skillTimer -= dt;
    if (boss.skillTimer <= 0) {
        boss.skillTimer = boss.phase === 3 ? 5.5 : 7.5;
        if (boss.phase === 1) {
            spawnUnit('red', 'tank', boss.x - 45, boss.y + 48);
            spawnUnit('red', 'tank', boss.x + 45, boss.y + 48);
            spawnFloatingText(boss.x, boss.y + 52, 'TRIỆU HỒI THIẾT GIÁP!', '#fb7185', 13);
        } else if (boss.phase === 2 && !boss.parts.sam.destroyed) {
            sfx.play('airstrike');
            for (let i = 0; i < 4; i++) {
                const tx = 65 + Math.random() * (LOGICAL_WIDTH - 130);
                const ty = 240 + Math.random() * (PLAYFIELD_HEIGHT - 340);
                game.projectiles.push(
                    new Projectile({
                        team: 'red',
                        x: boss.x,
                        y: boss.y,
                        targetX: tx,
                        targetY: ty,
                        speed: 195,
                        damage: 65,
                        splash: 48,
                        arcHeight: 55,
                        isRocket: true
                    })
                );
            }
            spawnFloatingText(boss.x, boss.y + 52, 'MƯA TÊN LỬA PHÒNG KHÔNG!', '#f97316', 14);
        } else {
            boss.laserSweepTimer = 1.6;
            spawnUnit('red', 'heavy_tank', boss.x, boss.y + 52);
            sfx.play('emp');
            spawnFloatingText(boss.x, boss.y + 52, 'TIA LASER HỦY DIỆT!', '#ef4444', 15);
        }
    }

    if (boss.laserSweepTimer > 0) {
        boss.laserSweepTimer -= dt;
        boss.laserSweepAngle = Math.sin(game.timeSec * 5) * 0.65 + Math.PI / 2;
        const lx = boss.x + Math.cos(boss.laserSweepAngle) * 360;
        const ly = boss.y + Math.sin(boss.laserSweepAngle) * 360;
        for (const u of game.units) {
            if (u.team === 'blue' && !u.dead) {
                const distToLaser = Math.hypot(u.x - lx * 0.5 - boss.x * 0.5, u.y - ly * 0.5 - boss.y * 0.5);
                if (distToLaser < 38) {
                    u.takeDamage(60 * dt);
                }
            }
        }
    }
}

function drawRaidBoss(ctx) {
    const boss = game.raidBoss;
    if (!boss || boss.hp <= 0) return;

    ctx.save();
    ctx.translate(boss.x, boss.y);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.roundRect(-52 + 6, -30 + 6, 104, 64, 14);
    ctx.fill();

    ctx.fillStyle = boss.hitFlash > 0 ? '#ffffff' : (boss.phase === 3 ? '#7f1d1d' : '#1e293b');
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-52, -30, 104, 64, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = boss.phase === 3 ? '#ef4444' : '#dc2626';
    ctx.fillRect(-44, -22, 88, 46);

    ctx.fillStyle = boss.phase === 3 ? '#fde047' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, 0, 14 + Math.sin(game.timeSec * 8) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = boss.parts.cannon.destroyed ? '#1e293b' : '#475569';
    ctx.fillRect(-34, 18, 12, 22);
    ctx.fillStyle = boss.parts.sam.destroyed ? '#1e293b' : '#475569';
    ctx.fillRect(22, 18, 12, 22);

    if (boss.laserSweepTimer > 0) {
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(boss.x, boss.y);
        ctx.lineTo(
            boss.x + Math.cos(boss.laserSweepAngle) * 420,
            boss.y + Math.sin(boss.laserSweepAngle) * 420
        );
        ctx.stroke();

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.restore();
}

let fogOffscreenCanvas = null;

function renderFogOfWarOverlay(ctx) {
    if (game.battleMode !== 'fog_of_war') return;

    if (!fogOffscreenCanvas) {
        fogOffscreenCanvas = document.createElement('canvas');
        fogOffscreenCanvas.width = LOGICAL_WIDTH;
        fogOffscreenCanvas.height = PLAYFIELD_HEIGHT;
    }
    const fCtx = fogOffscreenCanvas.getContext('2d');
    fCtx.clearRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);

    fCtx.fillStyle = 'rgba(6, 11, 25, 0.88)';
    fCtx.fillRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);

    fCtx.globalCompositeOperation = 'destination-out';

    const punchVisionHole = (x, y, radius) => {
        const grad = fCtx.createRadialGradient(x, y, radius * 0.25, x, y, radius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.85)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        fCtx.fillStyle = grad;
        fCtx.beginPath();
        fCtx.arc(x, y, radius, 0, Math.PI * 2);
        fCtx.fill();
    };

    punchVisionHole(game.playerBase.x, game.playerBase.y, 155);

    for (const u of game.units) {
        if (u.team === 'blue' && !u.dead) {
            punchVisionHole(u.x, u.y, u.spec.visionCone || 145);
        }
    }

    for (const m of game.landmines) {
        if (!m.exploded) punchVisionHole(m.x, m.y, 65);
    }
    for (const sw of game.shockwaves) {
        punchVisionHole(sw.x, sw.y, sw.maxRadius * 1.4);
    }

    fCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(fogOffscreenCanvas, 0, 0);
}

function triggerRoguelikeMutationDraft() {
    const shuffled = [...ROGUELIKE_MUTATIONS].sort(() => Math.random() - 0.5).slice(0, 3);
    if (shuffled.length === 0) return;

    game.paused = true;
    game.awaitingMutationChoice = true;

    const draftModal = document.getElementById('draft-modal');
    const badgeEl = document.getElementById('draft-badge-text');
    const titleEl = document.getElementById('draft-title');
    const subEl = document.getElementById('draft-subtitle');
    const container = document.getElementById('draft-cards-container');

    if (draftModal && container) {
        if (badgeEl) badgeEl.textContent = `ĐỘT BIẾN WAVE ${game.wave}`;
        if (titleEl) titleEl.textContent = 'CHỌN NÂNG CẤP ROGUELIKE';
        if (subEl) subEl.textContent = 'Chọn 1 trong 3 công nghệ đột biến cộng dồn vĩnh viễn trong trận này';
        container.innerHTML = '';

        shuffled.forEach(item => {
            const card = document.createElement('div');
            card.className = 'draft-card mutation-roguelike-card';
            card.innerHTML = `
                <span class="draft-card-tag">MUTATION</span>
                <div style="font-size:32px; margin:8px 0;">${item.icon || '⚡'}</div>
                <div style="font-size:12px; font-weight:900; color:#fde047;">${item.name}</div>
                <div class="mutation-buff-line">${item.desc}</div>
            `;
            card.addEventListener('click', () => {
                triggerHaptic(20);
                sfx.play('upgrade');
                game.activeMutations.push(item.id);
                game.awaitingMutationChoice = false;
                game.paused = false;
                draftModal.classList.remove('active');
                spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2, `ĐÃ NHẬN: ${item.name}!`, '#fde047', 15);
            });
            container.appendChild(card);
        });

        draftModal.classList.add('active');
    } else {
        game.activeMutations.push(shuffled[0].id);
        game.awaitingMutationChoice = false;
        game.paused = false;
    }
}

// ============================================================================
// 13. TRIỂN KHAI QUÂN ĐỘI, KHÔNG KÍCH & AI ĐỐI PHƯƠNG
// ============================================================================
export function spawnUnit(team, unitId, prefX, prefY, customRarityId = null) {
    const spec = getEffectiveUnitStats(unitId, team, customRarityId);
    const validPt = nav.findValidSpawnPoint(team, spec, prefX, prefY);
    const u = new Unit(team, unitId, validPt.x, validPt.y, customRarityId);
    game.units.push(u);

    if (team === 'blue') {
        game.matchSpawns++;
        if (metaState?.missionsProgress) {
            metaState.missionsProgress.spawns = (metaState.missionsProgress.spawns || 0) + 1;
        }
    }
    return u;
}

function launchAirstrike(team, targetY) {
    sfx.play('airstrike');
    const rarityId = team === 'blue' ? getHighestRarityForUnit('airstrike') : 'common';
    const rMult = RARITY_CONFIG[rarityId]?.mult || 1.0;
    const permLv = metaState?.armyPermanentLevels?.airstrike || 1;
    const dmg = Math.round(95 * (1 + (permLv - 1) * 0.12) * rMult);

    game.airstrikes.push({
        team,
        x: -60,
        y: targetY,
        speed: 440,
        damage: dmg,
        droppedBombs: [false, false, false, false],
        done: false
    });
}

export function deployDeckSlot(slotIdx) {
    if (!game.running || game.paused || game.gameOver) return;

    const unitId = game.deckIds[slotIdx];
    if (!unitId) return;

    // Nếu đang ở pha dàn trận Auto-Battler: Chọn binh chủng để chấm lên sân
    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') {
        game.autoSelectedUnitId = unitId;
        sfx.play('gas');
        renderBattleDeckButtons();
        return;
    }

    const spec = getEffectiveUnitStats(unitId, 'blue');
    const cost = spec.cost || 2;

    if (game.gas < cost || game.deckCooldowns[slotIdx] > 0) return;

    game.gas -= cost;
    game.deckCooldowns[slotIdx] = spec.cooldown || 2.0;
    game.deckMaxCooldowns[slotIdx] = spec.cooldown || 2.0;
    triggerHaptic(15);

    // Kiểm tra Cây Bị Động Hậu Cần Tối Ưu (optimal_logistics): Xác suất hoàn lại +1 Xăng ngay lập tức
    const logiLv = Number(metaState?.metaTalents?.optimal_logistics) || 0;
    if (logiLv > 0 && Math.random() < logiLv * 0.03) {
        game.gas = Math.min(game.maxGas, game.gas + 1);
        spawnFloatingText(80, PLAYFIELD_HEIGHT - 95, '📦 HẬU CẦN +1 XĂNG!', '#4ade80', 14);
    }

    if (unitId === 'airstrike') {
        let bestY = PLAYFIELD_HEIGHT * 0.36;
        const enemies = game.units.filter(u => u.team === 'red' && !u.dead);
        if (enemies.length > 0) {
            bestY = enemies.reduce((acc, e) => acc + e.y, 0) / enemies.length;
        }
        launchAirstrike('blue', bestY);
    } else {
        sfx.play('spawn');
        const spreadX = (Math.random() - 0.5) * 140;
        const spawnX = Math.max(60, Math.min(LOGICAL_WIDTH - 60, LOGICAL_WIDTH / 2 + spreadX));
        const spawnY = PLAYFIELD_HEIGHT - 102;
        spawnUnit('blue', unitId, spawnX, spawnY);
    }

    updateGasUI();
    renderBattleDeckButtons();
}

export function upgradeGasGenerator() {
    if (!game.running || game.paused || game.gameOver) return;
    const nextLv = GAS_UPGRADE_LEVELS[game.gasGenLevel];
    if (!nextLv || nextLv.cost <= 0 || game.gas < nextLv.cost) return;

    game.gas -= nextLv.cost;
    game.gasGenLevel = Math.min(GAS_UPGRADE_LEVELS.length - 1, game.gasGenLevel + 1);
    triggerHaptic(20);
    sfx.play('upgrade');
    spawnFloatingText(game.playerBase.x, game.playerBase.y - 30, '⛽ NÂNG CẤP MÁY PHÁT XĂNG!', '#fde047', 14);
    updateGasUI();
    renderBattleDeckButtons();
}

function spawnEnemyWaveUnit() {
    const lv = game.currentLevel;
    const w = game.wave;
    const hasWater = nav.waterBoxes.length > 0;

    const pool = ['infantry', 'bazooka'];
    if (lv >= 2 || w >= 2) pool.push('humvee', 'sniper');
    if (lv >= 4 || w >= 3) pool.push('apc', 'tank');
    if (lv >= 7 || w >= 5) pool.push('heli', 'heavy_tank');
    if (hasWater && (lv >= 4 || w >= 2)) {
        pool.push('patrol_boat', 'destroyer');
        if (lv >= 10 || w >= 5) pool.push('battleship');
    }

    const pickId = pool[Math.floor(Math.random() * pool.length)];
    const sx = Math.max(65, Math.min(LOGICAL_WIDTH - 65, LOGICAL_WIDTH / 2 + (Math.random() - 0.5) * 160));
    const sy = 102;
    spawnUnit('red', pickId, sx, sy);
}

// ============================================================================
// 14. GIAO DIỆN CHIẾN ĐẤU: DECK SLOTS, GAS, HUD & COMMANDER BAR
// ============================================================================
export function renderBattleDeckButtons() {
    const container =
        document.getElementById('unitDeckContainer') ||
        document.getElementById('battle-deck-slots') ||
        document.getElementById('deckSlotsContainer');
    if (!container) return;

    if (container.children.length !== game.deckIds.length) {
        container.innerHTML = '';
        game.deckIds.forEach((uId, idx) => {
            const btn = document.createElement('button');
            btn.className = 'unit-card-btn';
            btn.dataset.slot = idx;
            btn.innerHTML = `
                <span class="hotkey-badge">${idx + 1}</span>
                <div class="unit-card-art"><canvas width="42" height="42"></canvas></div>
                <div class="unit-card-name"></div>
                <div class="unit-card-cost">⛽<span class="cost-val"></span></div>
                <div class="cooldown-radial-overlay"></div>
            `;
            btn.addEventListener('click', () => deployDeckSlot(idx));
            container.appendChild(btn);
        });
    }

    const isAutoPrep = game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep';

    Array.from(container.children).forEach((btn, idx) => {
        const uId = game.deckIds[idx];
        const spec = getEffectiveUnitStats(uId, 'blue');
        const cd = game.deckCooldowns[idx] || 0;
        const maxCd = game.deckMaxCooldowns[idx] || 1;
        const canAfford = game.gas >= (spec.cost || 2);
        const isReady = isAutoPrep ? (game.autoSelectedUnitId === uId) : (canAfford && cd <= 0);

        btn.classList.toggle('card-ready-gold', isReady);
        btn.classList.toggle('disabled', !canAfford && !isAutoPrep);
        btn.style.borderColor = isReady ? '#fde047' : (spec.rarityColor || '#60a5fa');

        const nameEl = btn.querySelector('.unit-card-name');
        if (nameEl) nameEl.textContent = spec.name || uId.toUpperCase();

        const costEl = btn.querySelector('.cost-val');
        if (costEl) costEl.textContent = `${spec.cost || 2}`;

        const c = btn.querySelector('canvas');
        if (c && atlas.ready && c.dataset.drawnId !== uId) {
            const cCtx = c.getContext('2d');
            cCtx.clearRect(0, 0, c.width, c.height);
            atlas.draw(cCtx, spec.spriteCol ?? 16, 7, 21, 21, 34, 34);
            c.dataset.drawnId = uId;
        }

        const overlay = btn.querySelector('.cooldown-radial-overlay');
        if (overlay) {
            if (!isAutoPrep && cd > 0.02) {
                const deg = Math.round((cd / maxCd) * 360);
                overlay.style.display = 'flex';
                overlay.style.opacity = '1';
                overlay.style.setProperty('--cd-deg', `${deg}deg`);
                overlay.textContent = `${cd.toFixed(1)}s`;
            } else {
                overlay.style.display = 'none';
                overlay.style.opacity = '0';
                overlay.textContent = '';
            }
        }
    });
}

function getEffectiveGasInterval() {
    const gasCfg = GAS_UPGRADE_LEVELS[game.gasGenLevel] || GAS_UPGRADE_LEVELS[0];
    const oilLv = Number(metaState?.metaTalents?.oil_refining) || 0;
    // Mỗi cấp Công Nghệ Lọc Dầu giảm 0.08s chu kỳ nạp xăng
    return Math.max(0.55, gasCfg.interval - oilLv * 0.08);
}

function updateCommanderSkillsUI() {
    const pairs = [
        { btnId: 'tactic-btn-airdrop', cdId: 'tactic-cd-airdrop', key: 'airdrop' },
        { btnId: 'tactic-btn-mines',   cdId: 'tactic-cd-mines',   key: 'minefield' },
        { btnId: 'tactic-btn-emp',     cdId: 'tactic-cd-emp',     key: 'emp_blast' },
        { btnId: 'tactic-btn-blitz',   cdId: 'tactic-cd-blitz',   key: 'blitzkrieg' }
    ];

    pairs.forEach(({ btnId, cdId, key }) => {
        const btn = document.getElementById(btnId);
        const cdOverlay = document.getElementById(cdId);
        const cd = game.tacticCooldowns[key] || 0;
        const maxCd = game.tacticMaxCooldowns[key] || 20;

        if (!btn || !cdOverlay) return;
        if (cd > 0.05) {
            btn.classList.add('on-cooldown');
            cdOverlay.classList.remove('hidden');
            const deg = Math.round((cd / maxCd) * 360);
            cdOverlay.style.setProperty('--cd-deg', `${deg}deg`);
            const txt = cdOverlay.querySelector('.tactic-cd-timer, .tactic-cd-text') || cdOverlay;
            txt.textContent = `${Math.ceil(cd)}s`;
        } else {
            btn.classList.remove('on-cooldown');
            cdOverlay.classList.add('hidden');
        }
    });
}

function updateGasUI() {
    const gasVal = Math.floor(game.gas);
    const gasEl1 = document.getElementById('gasCountText');
    const gasEl2 = document.getElementById('gas-count-text');
    if (gasEl1) gasEl1.textContent = String(gasVal);
    if (gasEl2) gasEl2.textContent = String(gasVal);

    const abFuelEl = document.getElementById('autobattler-fuel-display');
    if (abFuelEl) abFuelEl.textContent = String(gasVal);

    const effInterval = getEffectiveGasInterval();
    const rateLabel = document.getElementById('gas-rate-label');
    if (rateLabel) rateLabel.textContent = `+1/${effInterval.toFixed(1)}s`;
    const speedInd = document.getElementById('speed-indicator');
    if (speedInd) speedInd.textContent = `${effInterval.toFixed(1)}s`;

    // Cập nhật 5 vạch tiến trình nạp xăng (#L1..#L5)
    const filledSegs = Math.min(5, Math.floor(((game.gasTimer || 0) / effInterval) * 5));
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`L${i}`)?.classList.toggle('active', i <= filledSegs);
    }

    // Cập nhật nút Nâng Xăng & lớp khóa #blockUpgrade
    const cfg = GAS_UPGRADE_LEVELS[game.gasGenLevel] || GAS_UPGRADE_LEVELS[GAS_UPGRADE_LEVELS.length - 1];
    const nextSpeedEl = document.getElementById('upgrade-next-speed');
    if (nextSpeedEl) nextSpeedEl.textContent = cfg.label || 'MAX';

    const costTextEl = document.getElementById('upgrade-cost-text');
    if (costTextEl) costTextEl.textContent = cfg.cost > 0 ? String(cfg.cost) : 'MAX';

    const lockCostEl = document.getElementById('upgrade-lock-cost');
    if (lockCostEl && cfg.cost > 0) lockCostEl.textContent = String(cfg.cost);

    const blockOverlay = document.getElementById('blockUpgrade');
    if (blockOverlay) {
        const isUnlocked = cfg.cost <= 0 || game.gas >= cfg.cost;
        blockOverlay.classList.toggle('unlocked', isUnlocked);
    }
}

function updateTopBattleHUD() {
    const lvLabel = document.getElementById('current-level-label');
    if (lvLabel) lvLabel.textContent = `MAP ${game.currentLevel}`;

    const timerEl = document.getElementById('hud-match-timer');
    if (timerEl) {
        const totalSec = Math.floor(game.timeSec || 0);
        const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const ss = String(totalSec % 60).padStart(2, '0');
        timerEl.textContent = `${mm}:${ss}`;
    }

    const wavePill = document.getElementById('hud-wave-pill');
    if (wavePill) wavePill.classList.remove('hidden');

    const waveCounter = document.getElementById('hud-wave-counter');
    if (waveCounter) {
        waveCounter.textContent =
            game.battleMode === 'endless_siege' ? `${game.wave}/∞` : `${game.wave}/${game.maxWaves}`;
    }

    const battleLvLbl = document.getElementById('battle-lv-label');
    if (battleLvLbl) battleLvLbl.textContent = `WAVE ${game.wave}`;

    const battleExpLbl = document.getElementById('battle-exp-label');
    if (battleExpLbl) battleExpLbl.textContent = `DIỆT ${game.matchKills}`;

    const expFill = document.getElementById('battle-exp-fill');
    if (expFill && game.waveDuration > 0) {
        const pct = Math.min(100, Math.round((game.waveTimer / game.waveDuration) * 100));
        expFill.style.width = `${pct}%`;
    }
}

// ============================================================================
// 15. VÒNG LẶP CẬP NHẬT & VẼ ĐỒ HỌA CHÍNH (60-120 FPS)
// ============================================================================
function updateBattle(dt) {
    if (!game.running || game.paused || game.gameOver) return;

    // Nếu đang ở pha xếp đội hình Auto-Battler, chỉ cập nhật hạt hiệu ứng và chờ bấm "BẮT ĐẦU GIAO CHIẾN"
    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') {
        for (const u of game.units) u.update(dt);
        particlePool.update(dt);
        return;
    }

    game.timeSec += dt;

    if (game.shakeTimer > 0) {
        game.shakeTimer = Math.max(0, game.shakeTimer - dt);
    }
    if (game.blitzkriegTimer > 0) {
        game.blitzkriegTimer = Math.max(0, game.blitzkriegTimer - dt);
    }

    let deckChanged = false;
    for (let i = 0; i < game.deckCooldowns.length; i++) {
        if (game.deckCooldowns[i] > 0) {
            game.deckCooldowns[i] = Math.max(0, game.deckCooldowns[i] - dt);
            deckChanged = true;
        }
    }
    for (const k of Object.keys(game.tacticCooldowns)) {
        if (game.tacticCooldowns[k] > 0) {
            game.tacticCooldowns[k] = Math.max(0, game.tacticCooldowns[k] - dt);
        }
    }
    updateCommanderSkillsUI();

    const effInterval = getEffectiveGasInterval();
    game.gasTimer += dt;
    if (game.gasTimer >= effInterval) {
        game.gasTimer -= effInterval;
        if (game.gas < game.maxGas) {
            game.gas = Math.min(game.maxGas, game.gas + 1);
            sfx.play('gas');
            deckChanged = true;
        }
    }
    updateGasUI();
    updateTopBattleHUD();

    if (deckChanged) {
        renderBattleDeckButtons();
    }

    // Lính nhảy dù (Kỹ năng Q)
    for (let i = game.paratroops.length - 1; i >= 0; i--) {
        const p = game.paratroops[i];
        p.y += 130 * dt;
        if (p.y >= p.targetY) {
            spawnUnit('blue', p.unitId, p.x, p.targetY);
            particlePool.spawn(p.x, p.targetY, 0, 0, 10, '#e0f2fe', 2.2, 'circle');
            game.paratroops.splice(i, 1);
        }
    }

    // Mìn chống tăng (Kỹ năng W)
    for (let i = game.landmines.length - 1; i >= 0; i--) {
        const m = game.landmines[i];
        m.blinkTimer += dt * 5;
        for (const u of game.units) {
            if (u.team === 'red' && !u.dead && !u.isAir) {
                if (Math.hypot(u.x - m.x, u.y - m.y) <= m.radius + u.radius) {
                    m.exploded = true;
                    sfx.play('boom');
                    spawnExplosionFX(m.x, m.y, m.splash, true, false);
                    for (const e of game.units) {
                        if (e.team === 'red' && !e.dead && Math.hypot(e.x - m.x, e.y - m.y) <= m.splash) {
                            e.takeDamage(m.damage);
                        }
                    }
                    break;
                }
            }
        }
        if (m.exploded) game.landmines.splice(i, 1);
    }

    // Không kích
    for (let i = game.airstrikes.length - 1; i >= 0; i--) {
        const a = game.airstrikes[i];
        a.x += a.speed * dt;
        const dropXs = [90, 170, 250, 330];
        dropXs.forEach((dx, bIdx) => {
            if (!a.droppedBombs[bIdx] && a.x >= dx) {
                a.droppedBombs[bIdx] = true;
                sfx.play('boom');
                spawnExplosionFX(dx, a.y + (Math.random() - 0.5) * 24, 52, true, false);
                addScreenShake(4.5, 0.16);
                for (const u of game.units) {
                    if (u.team !== a.team && !u.dead && Math.hypot(u.x - dx, u.y - a.y) <= 58) {
                        u.takeDamage(a.damage);
                    }
                }
                if (a.team === 'blue' && game.battleMode === 'raid_boss' && game.raidBoss) {
                    if (Math.hypot(game.raidBoss.x - dx, game.raidBoss.y - a.y) <= 68) {
                        damageRaidBoss(a.damage, dx);
                    }
                }
            }
        });
        if (a.x > LOGICAL_WIDTH + 80) {
            game.airstrikes.splice(i, 1);
        }
    }

    // Quản lý nhịp sinh quân AI & Wave
    if (game.battleMode === 'raid_boss') {
        updateRaidBoss(dt);
    } else {
        const spawnInterval = Math.max(1.25, 3.6 - game.currentLevel * 0.05 - game.wave * 0.12);
        game.enemySpawnTimer += dt;
        if (game.enemySpawnTimer >= spawnInterval) {
            game.enemySpawnTimer = 0;
            spawnEnemyWaveUnit();
        }

        game.waveTimer += dt;
        if (game.waveTimer >= game.waveDuration) {
            game.waveTimer = 0;
            if (game.battleMode === 'survival' && game.wave >= game.maxWaves) {
                endBattle(true);
                return;
            }
            game.wave++;
            spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT * 0.35, `WAVE ${game.wave}!`, '#fde047', 18);

            if (game.battleMode === 'endless_siege') {
                metaState.endlessBestWave = Math.max(metaState.endlessBestWave || 0, game.wave);
                if (game.wave % 2 === 1) {
                    triggerRoguelikeMutationDraft();
                }
            }
        }
    }

    for (const u of game.units) u.update(dt);
    game.units = game.units.filter(u => !u.dead);

    for (const p of game.projectiles) p.update(dt);
    game.projectiles = game.projectiles.filter(p => !p.done);

    particlePool.update(dt);

    for (let i = game.tireTracks.length - 1; i >= 0; i--) {
        game.tireTracks[i].alpha -= dt * 0.06;
        if (game.tireTracks[i].alpha <= 0) game.tireTracks.splice(i, 1);
    }
    for (let i = game.scorchMarks.length - 1; i >= 0; i--) {
        game.scorchMarks[i].alpha -= dt * 0.025;
        if (game.scorchMarks[i].alpha <= 0) game.scorchMarks.splice(i, 1);
    }
    for (let i = game.shockwaves.length - 1; i >= 0; i--) {
        const sw = game.shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 11);
        sw.alpha -= dt * 3.2;
        if (sw.alpha <= 0) game.shockwaves.splice(i, 1);
    }
    for (let i = game.muzzleFlashes.length - 1; i >= 0; i--) {
        game.muzzleFlashes[i].ttl -= dt;
        if (game.muzzleFlashes[i].ttl <= 0) game.muzzleFlashes.splice(i, 1);
    }
    for (let i = game.beamEffects.length - 1; i >= 0; i--) {
        game.beamEffects[i].ttl -= dt;
        if (game.beamEffects[i].ttl <= 0) game.beamEffects.splice(i, 1);
    }
    for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
        const ft = game.floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.alpha -= dt * 0.95;
        if (ft.alpha <= 0) game.floatingTexts.splice(i, 1);
    }

    if (game.playerBase.hitFlash > 0) game.playerBase.hitFlash = Math.max(0, game.playerBase.hitFlash - dt);
    if (game.enemyBase.hitFlash > 0) game.enemyBase.hitFlash = Math.max(0, game.enemyBase.hitFlash - dt);
}

function drawBaseFortress(ctx, baseObj, isBlue) {
    if (!isBlue && game.battleMode === 'raid_boss') return;

    ctx.save();
    ctx.translate(baseObj.x, baseObj.y);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
    ctx.beginPath();
    ctx.roundRect(-42 + 4, -22 + 4, 84, 44, 9);
    ctx.fill();

    ctx.fillStyle = baseObj.hitFlash > 0 ? '#ffffff' : (isBlue ? '#0284c7' : '#dc2626');
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-42, -22, 84, 44, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isBlue ? '#38bdf8' : '#f87171';
    ctx.fillRect(-30, -14, 60, 28);

    const bw = 88;
    const bh = 8;
    const by = isBlue ? 26 : -34;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-bw / 2 - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = isBlue ? '#22c55e' : '#ef4444';
    ctx.fillRect(-bw / 2, by, bw * Math.max(0, baseObj.hp / baseObj.maxHp), bh);

    ctx.font = '900 10px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(baseObj.hp)}/${baseObj.maxHp}`, 0, by + 7);
    ctx.restore();
}

function drawBattleScene(ctx) {
    ctx.save();
    ctx.clearRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);

    if (game.shakeTimer > 0) {
        const sx = (Math.random() - 0.5) * game.shakeIntensity * 2;
        const sy = (Math.random() - 0.5) * game.shakeIntensity * 2;
        ctx.translate(sx, sy);
    }

    if (atlas.bakedMapCanvas) {
        ctx.drawImage(atlas.bakedMapCanvas, 0, 0);
    }

    drawDynamicSineWater(ctx, game.timeSec, game.currentLevel);

    for (const sm of game.scorchMarks) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sm.alpha);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, sm.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    for (const tr of game.tireTracks) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, tr.alpha);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(tr.x1 - 2, tr.y1 - 2, 4, 4);
        ctx.fillRect(tr.x2 - 2, tr.y2 - 2, 4, 4);
        ctx.restore();
    }

    for (const m of game.landmines) {
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = Math.sin(m.blinkTimer * Math.PI) > 0 ? '#ef4444' : '#fde047';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawBaseFortress(ctx, game.enemyBase, false);
    drawBaseFortress(ctx, game.playerBase, true);
    if (game.battleMode === 'raid_boss') {
        drawRaidBoss(ctx);
    }

    const groundUnits = game.units.filter(u => !u.isAir);
    const airUnits = game.units.filter(u => u.isAir);

    for (const u of groundUnits) u.drawShadow(ctx);
    for (const u of groundUnits) u.drawBody(ctx);

    for (const u of airUnits) u.drawShadow(ctx);
    for (const u of airUnits) u.drawBody(ctx);

    for (const p of game.paratroops) {
        ctx.save();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x - 10, p.y - 16);
        ctx.lineTo(p.x, p.y);
        ctx.moveTo(p.x + 10, p.y - 16);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 16, 12, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    for (const b of game.beamEffects) {
        ctx.save();
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
        ctx.restore();
    }

    for (const pr of game.projectiles) pr.draw(ctx);

    for (const mf of game.muzzleFlashes) {
        if (!projCache.muzzleStarCanvas) continue;
        ctx.save();
        ctx.translate(mf.x, mf.y);
        ctx.rotate(mf.angle);
        ctx.scale(mf.scale, mf.scale);
        ctx.drawImage(projCache.muzzleStarCanvas, -14, -14);
        ctx.restore();
    }

    particlePool.draw(ctx);

    for (const sw of game.shockwaves) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = sw.lineWidth;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    for (const a of game.airstrikes) {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
        ctx.beginPath();
        ctx.ellipse(18, 26, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(24, 0);
        ctx.lineTo(-18, -22);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-18, 22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    renderFogOfWarOverlay(ctx);

    for (const ft of game.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = `900 ${ft.size}px "Chakra Petch", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#0f172a';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }

    ctx.restore();
}

// ============================================================================
// 16. KHỞI ĐỘNG & KẾT THÚC TRẬN ĐẤU (ĐỒNG BỘ #lobby-wrapper, #win-panel, #lose-panel)
// ============================================================================
const ENGINE_MODE_NORMALIZE = {
    destroy: 'destroy',
    survival: 'survival',
    endless: 'endless_siege',
    endless_siege: 'endless_siege',
    autobattler: 'auto_battler',
    auto_battler: 'auto_battler',
    night_fog: 'fog_of_war',
    fog_of_war: 'fog_of_war',
    raid_boss: 'raid_boss',
    bossrush: 'raid_boss'
};

export function startBattleFromLobby(levelNum, difficultyId = 'easy', modeId = 'destroy', specialMode = 'standard') {
    syncLegacyEngineBridges();

    const lvCfg = LEVELS.find(l => l.level === Number(levelNum)) || LEVELS[0] || {
        level: Number(levelNum) || 1,
        startingGas: 6,
        playerBaseHp: 250,
        enemyBaseHp: 260
    };
    const diffCfg = DIFFICULTY_CONFIG[difficultyId] || DIFFICULTY_CONFIG.easy;

    const rawMode = (specialMode && specialMode !== 'standard') ? specialMode : modeId;
    const resolvedMode = ENGINE_MODE_NORMALIZE[rawMode] || 'destroy';

    game.currentLevel = lvCfg.level;
    game.difficulty = difficultyId;
    game.battleMode = resolvedMode;
    game.running = true;
    game.paused = false;
    game.gameOver = false;
    game.timeSec = 0;
    game.matchKills = 0;
    game.matchSpawns = 0;

    // Ẩn mọi panel kết quả cũ & ẩn Sảnh #lobby-wrapper
    document.getElementById('lobby-wrapper')?.classList.remove('active');
    document.getElementById('win-panel')?.classList.remove('active');
    document.getElementById('lose-panel')?.classList.remove('active');
    document.getElementById('draft-modal')?.classList.remove('active');
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.textContent = '⏸';

    // Tính Xăng khởi điểm (28 Xăng nếu ở chế độ Đặt Trận Auto-Battler)
    const logiLv = Number(metaState?.metaTalents?.optimal_logistics) || 0;
    if (resolvedMode === 'auto_battler') {
        game.gas = 28;
        game.maxGas = 28;
        game.autoBattlerPhase = 'prep';
        game.autoSelectedUnitId = 'infantry';
    } else {
        game.maxGas = 20;
        game.gas = Math.min(game.maxGas, (lvCfg.startingGas ?? 6) + logiLv);
        game.autoBattlerPhase = 'combat';
    }
    game.gasGenLevel = 0;
    game.gasTimer = 0;

    game.wave = 1;
    game.waveTimer = 0;
    game.enemySpawnTimer = 0.8;
    game.activeMutations = [];
    game.awaitingMutationChoice = false;

    const steelLv = Number(metaState?.metaTalents?.high_grade_steel) || 0;
    const baseFortifyMult = 1 + steelLv * 0.06;
    const pHp = Math.round((lvCfg.playerBaseHp || 250) * baseFortifyMult);
    const eHp = Math.round((lvCfg.enemyBaseHp || 260) * diffCfg.baseHpMult);

    game.playerBase = { x: LOGICAL_WIDTH / 2, y: PLAYFIELD_HEIGHT - 55, hp: pHp, maxHp: pHp, hitFlash: 0 };
    game.enemyBase = { x: LOGICAL_WIDTH / 2, y: 55, hp: eHp, maxHp: eHp, hitFlash: 0 };

    game.units = [];
    game.projectiles = [];
    game.airstrikes = [];
    game.landmines = [];
    game.paratroops = [];
    game.tireTracks = [];
    game.scorchMarks = [];
    game.shockwaves = [];
    game.muzzleFlashes = [];
    game.beamEffects = [];
    game.floatingTexts = [];
    particlePool.clear();

    // Tự động đưa đơn vị Thủy quân vào bộ bài nếu bản đồ có sông/biển và người chơi đã sở hữu
    const baseDeck = ['infantry', 'bazooka', 'humvee', 'tank', 'airstrike'];
    if (lvCfg.hasWater) {
        const navalOwned = ['battleship', 'destroyer', 'patrol_boat'].find(id =>
            metaState.inventory?.some(c => c.unitId === id)
        );
        if (navalOwned) baseDeck[2] = navalOwned;
    }
    game.deckIds = baseDeck;
    game.deckCooldowns = game.deckIds.map(() => 0);
    game.tacticCooldowns = { airdrop: 0, minefield: 0, emp_blast: 0, blitzkrieg: 0 };
    game.blitzkriegTimer = 0;

    // Bật/tắt thanh Auto-Battler & Raid Boss HUD
    const abBar = document.getElementById('autobattler-setup-bar');
    if (abBar) {
        abBar.classList.toggle('hidden', resolvedMode !== 'auto_battler');
        abBar.classList.toggle('active', resolvedMode === 'auto_battler');
    }

    if (resolvedMode === 'raid_boss') {
        initRaidBoss();
    } else {
        game.raidBoss = null;
        updateRaidBossHUD();
    }

    buildStaticMapCanvas(game.currentLevel);
    updateGasUI();
    updateTopBattleHUD();
    renderBattleDeckButtons();
    updateCommanderSkillsUI();
}

function endBattle(victory) {
    if (game.gameOver) return;
    game.gameOver = true;
    game.running = false;
    triggerHaptic(victory ? 40 : 60);

    document.getElementById('autobattler-setup-bar')?.classList.add('hidden');
    document.getElementById('autobattler-setup-bar')?.classList.remove('active');

    let rewardCoins = 0;
    let rewardGems = 0;
    let rewardMedals = 0;

    if (victory) {
        rewardCoins = calcStageRewardCoins(game.currentLevel, game.difficulty, game.battleMode);
        rewardGems = game.difficulty === 'difficult' ? 25 : 10;
        if (game.difficulty === 'difficult' || game.battleMode === 'raid_boss') {
            rewardMedals = game.battleMode === 'raid_boss' ? 3 : 2;
        }

        metaState.coins = (metaState.coins || 0) + rewardCoins;
        metaState.gems = (metaState.gems || 0) + rewardGems;
        metaState.medals = (metaState.medals || 0) + rewardMedals;

        if (metaState.missionsProgress) {
            metaState.missionsProgress.wins = (metaState.missionsProgress.wins || 0) + 1;
            if (game.difficulty === 'difficult') {
                metaState.missionsProgress.diffWins = (metaState.missionsProgress.diffWins || 0) + 1;
            }
        }

        if (game.battleMode === 'auto_battler') {
            metaState.autobattlerWins = (metaState.autobattlerWins || 0) + 1;
        } else if (game.battleMode === 'raid_boss') {
            metaState.raidBossClears = (metaState.raidBossClears || 0) + 1;
        }

        if (!metaState.mapDifficultyProgress) metaState.mapDifficultyProgress = {};
        const entry = normalizeMapProgressEntry(metaState.mapDifficultyProgress[game.currentLevel]);
        entry[game.difficulty] = true;
        const modeSuffix = game.battleMode === 'survival' ? 'survival' : 'destroy';
        entry[`${game.difficulty}_${modeSuffix}`] = true;
        metaState.mapDifficultyProgress[game.currentLevel] = entry;

        saveProgress();
        updateTopBarUI();
    } else if (game.battleMode === 'endless_siege' && game.wave > 1) {
        metaState.endlessBestWave = Math.max(metaState.endlessBestWave || 0, game.wave);
        rewardCoins = (game.wave - 1) * 140;
        metaState.coins = (metaState.coins || 0) + rewardCoins;
        saveProgress();
        updateTopBarUI();
    } else {
        saveProgress();
    }

    showBattleResultOverlay(victory, rewardCoins, rewardGems, rewardMedals);
}

function showBattleResultOverlay(victory, coins, gems, medals) {
    const totalSec = Math.floor(game.timeSec || 0);
    const timeStr = `${String(Math.floor(totalSec / 60)).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}`;

    const winPanel = document.getElementById('win-panel');
    const losePanel = document.getElementById('lose-panel');

    if (victory && winPanel) {
        const rewardEl = document.getElementById('win-coins-reward');
        if (rewardEl) {
            const medalStr = medals > 0 ? ` • +${medals} 🎖️` : '';
            rewardEl.textContent = `+${formatCurrency(coins)} 🪙 • +${gems} 💎${medalStr}`;
        }
        const timeEl = document.getElementById('win-time');
        if (timeEl) timeEl.textContent = timeStr;
        const hpEl = document.getElementById('win-hp');
        if (hpEl) hpEl.textContent = `${Math.ceil(game.playerBase.hp)} / ${game.playerBase.maxHp}`;
        const spawnedEl = document.getElementById('win-spawned');
        if (spawnedEl) spawnedEl.textContent = `${game.matchSpawns}`;
        const killsEl = document.getElementById('win-kills');
        if (killsEl) killsEl.textContent = `${game.matchKills}`;

        winPanel.classList.add('active');
        return;
    }

    if (!victory && losePanel) {
        const timeEl = document.getElementById('lose-time');
        if (timeEl) timeEl.textContent = timeStr;
        const waveEl = document.getElementById('lose-wave');
        if (waveEl) {
            waveEl.textContent =
                game.battleMode === 'endless_siege' ? `Wave ${game.wave}` : `Wave ${game.wave} / ${game.maxWaves}`;
        }
        const spawnedEl = document.getElementById('lose-spawned');
        if (spawnedEl) spawnedEl.textContent = `${game.matchSpawns}`;
        const killsEl = document.getElementById('lose-kills');
        if (killsEl) killsEl.textContent = `${game.matchKills}`;

        losePanel.classList.add('active');
    }
}

// ============================================================================
// 17. CÁC HÀM TOÀN CỤC CHO INDEX.HTML & KHỞI TẠO HỆ THỐNG
// ============================================================================
export function openLobbyScreen(tab = 'battle') {
    game.running = false;
    game.paused = false;
    document.getElementById('win-panel')?.classList.remove('active');
    document.getElementById('lose-panel')?.classList.remove('active');
    document.getElementById('draft-modal')?.classList.remove('active');
    document.getElementById('autobattler-setup-bar')?.classList.add('hidden');
    document.getElementById('autobattler-setup-bar')?.classList.remove('active');
    document.getElementById('raid-boss-hud')?.classList.add('hidden');
    document.getElementById('raid-boss-hud')?.classList.remove('active');

    document.getElementById('lobby-wrapper')?.classList.add('active');
    switchLobbyTab(tab);
}

export function restartGame() {
    document.getElementById('win-panel')?.classList.remove('active');
    document.getElementById('lose-panel')?.classList.remove('active');
    startBattleFromLobby(game.currentLevel, game.difficulty, game.battleMode);
}

export function nextOrRestartLevel() {
    document.getElementById('win-panel')?.classList.remove('active');
    const nextLv = Math.min(LEVELS.length, (game.currentLevel || 1) + 1);
    startBattleFromLobby(nextLv, game.difficulty, game.battleMode);
}

function initMainEngine() {
    const canvas = document.getElementById('battleCanvas') || document.getElementById('gameCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (canvas) {
        canvas.width = LOGICAL_WIDTH;
        canvas.height = PLAYFIELD_HEIGHT;

        // Tương tác trên chiến trường cho chế độ Đặt Trận Tự Động (Auto-Battler)
        canvas.addEventListener('pointerdown', e => {
            if (!game.running || game.battleMode !== 'auto_battler' || game.autoBattlerPhase !== 'prep') return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = LOGICAL_WIDTH / rect.width;
            const scaleY = PLAYFIELD_HEIGHT / rect.height;
            const px = (e.clientX - rect.left) * scaleX;
            const py = (e.clientY - rect.top) * scaleY;

            // Nếu chạm vào quân Xanh đã đặt -> Thu hồi và hoàn lại 100% Xăng
            const clickedIdx = game.units.findIndex(
                u => u.team === 'blue' && Math.hypot(u.x - px, u.y - py) <= u.radius + 10
            );
            if (clickedIdx !== -1) {
                const removed = game.units.splice(clickedIdx, 1)[0];
                game.gas = Math.min(game.maxGas, game.gas + (removed.spec.cost || 2));
                sfx.play('gas');
                updateGasUI();
                renderBattleDeckButtons();
                return;
            }

            // Đặt quân mới ở nửa sân dưới
            const deployY = Math.max(PLAYFIELD_HEIGHT * 0.52, Math.min(PLAYFIELD_HEIGHT - 85, py));
            const spec = getEffectiveUnitStats(game.autoSelectedUnitId, 'blue');
            if (game.autoSelectedUnitId !== 'airstrike' && game.gas >= (spec.cost || 2)) {
                game.gas -= spec.cost || 2;
                sfx.play('spawn');
                spawnUnit('blue', game.autoSelectedUnitId, px, deployY);
                updateGasUI();
                renderBattleDeckButtons();
            } else {
                sfx.play('cannon');
            }
        });
    }

    // Nút Nâng Xăng & Chạm bình Xăng nạp nhanh
    document.getElementById('btnUpgradeGas')?.addEventListener('click', upgradeGasGenerator);
    document.getElementById('gas-generator-btn')?.addEventListener('click', () => {
        if (!game.running || game.paused || game.gameOver) return;
        game.gasTimer += 0.35;
        sfx.play('gas');
        updateGasUI();
    });

    // 4 Nút Kỹ Năng Chỉ Huy (#commander-tactics-bar)
    const tacticButtons = [
        { id: 'tactic-btn-airdrop', skill: 'airdrop' },
        { id: 'tactic-btn-mines',   skill: 'minefield' },
        { id: 'tactic-btn-emp',     skill: 'emp_blast' },
        { id: 'tactic-btn-blitz',   skill: 'blitzkrieg' }
    ];
    tacticButtons.forEach(({ id, skill }) => {
        document.getElementById(id)?.addEventListener('click', () => triggerCommanderSkill(skill));
    });

    // Các nút trên thanh HUD trận đấu
    document.getElementById('range-toggle-btn')?.addEventListener('click', () => {
        game.showRanges = !game.showRanges;
        sfx.play('gas');
    });

    document.getElementById('menu-return-btn')?.addEventListener('click', () => {
        openLobbyScreen('battle');
    });

    document.getElementById('sound-btn')?.addEventListener('click', e => {
        sfx.enabled = !sfx.enabled;
        e.currentTarget.textContent = sfx.enabled ? '🔊' : '🔇';
        sfx.play('gas');
    });

    document.getElementById('pause-btn')?.addEventListener('click', e => {
        if (!game.running || game.gameOver) return;
        game.paused = !game.paused;
        e.currentTarget.textContent = game.paused ? '▶' : '⏸';
    });

    // Nút điều khiển chế độ Đặt Trận Tự Động (Auto-Battler)
    document.getElementById('btn-ab-clear')?.addEventListener('click', () => {
        if (!game.running || game.battleMode !== 'auto_battler' || game.autoBattlerPhase !== 'prep') return;
        game.units = game.units.filter(u => u.team !== 'blue');
        game.gas = 28;
        sfx.play('gas');
        updateGasUI();
        renderBattleDeckButtons();
    });

    document.getElementById('btn-ab-fight')?.addEventListener('click', () => {
        if (!game.running || game.battleMode !== 'auto_battler') return;
        game.autoBattlerPhase = 'combat';
        game.maxGas = 20;
        document.getElementById('autobattler-setup-bar')?.classList.add('hidden');
        document.getElementById('autobattler-setup-bar')?.classList.remove('active');
        sfx.play('blitz');
        spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2, '⚔️ ĐỘI HÌNH XUẤT KÍCH!', '#fde047', 16);
        renderBattleDeckButtons();
    });

    // Phím tắt Bàn phím (1-5, Space, Q/W/E/R)
    window.addEventListener('keydown', e => {
        if (!game.running || game.paused || game.gameOver) return;
        if (e.code === 'Digit1') deployDeckSlot(0);
        else if (e.code === 'Digit2') deployDeckSlot(1);
        else if (e.code === 'Digit3') deployDeckSlot(2);
        else if (e.code === 'Digit4') deployDeckSlot(3);
        else if (e.code === 'Digit5') deployDeckSlot(4);
        else if (e.code === 'Space') {
            e.preventDefault();
            upgradeGasGenerator();
        } else if (e.code === 'KeyQ') triggerCommanderSkill('airdrop');
        else if (e.code === 'KeyW') triggerCommanderSkill('minefield');
        else if (e.code === 'KeyE') triggerCommanderSkill('emp_blast');
        else if (e.code === 'KeyR') triggerCommanderSkill('blitzkrieg');
    });

    // Khởi chạy Sảnh Lobby với đầy đủ callback
    if (typeof initLobby === 'function') {
        initLobby({
            atlas,
            sfx,
            renderMap,
            getEffectiveUnitStats,
            onStartBattle: startBattleFromLobby,
            onRenderMapPreview: (lv) => {
                const previewCanvas = document.getElementById('selected-map-preview');
                if (!previewCanvas) return;
                const pCtx = previewCanvas.getContext('2d');
                pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                renderMap(pCtx, previewCanvas.width, previewCanvas.height, lv, true);
            }
        });
    }

    // Vòng lặp requestAnimationFrame 60-120 FPS
    let lastTime = performance.now();
    function frame(now) {
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        if (game.running && !game.paused && !game.gameOver) {
            updateBattle(dt);
        }
        if (ctx && game.running) {
            drawBattleScene(ctx);
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

// Đồng bộ đầy đủ lên window để index.html & lobby.js gọi trực tiếp không lỗi
Object.assign(window, {
    atlas,
    sfx,
    nav,
    game,
    renderMap,
    getEffectiveUnitStats,
    startBattleFromLobby,
    triggerCommanderSkill,
    upgradeGasRate: upgradeGasGenerator,
    openLobbyScreen,
    restartGame,
    nextOrRestartLevel
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMainEngine);
} else {
    initMainEngine();
}