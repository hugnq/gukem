/* ============================================================================
   TINY BATTLE - ENGINE CORE (js/engine-core.js)
   Web Audio SoundFX, Offscreen Projectile Cache, ParticlePool, SpriteAtlas,
   Procedural 2D Pixel-Vector Art Renderer cho 6 Binh Chủng Mới, Ụ Pháo
   & 14 Loại Zombie / Boss Góc Nhìn Chính Diện Từ Trên Xuống (Front-Top View)
   ============================================================================ */

// Helper vẽ hình chữ nhật bo góc an toàn trên mọi trình duyệt / WebView
function drawRoundRectPath(ctx, x, y, w, h, r) {
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
            if (nowPerf - last < 42) return; // Chống spam oscillator khi tua x4
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
            }
        } catch (e) {}
    }
}

export const sfx = new SoundFX();

// ============================================================================
// 2. OFFSCREEN CANVAS CACHING CHO ĐẠN PHÁO (KÈM FIREBALL, ICE SHARD, DARK ORB, ACID GLOB)
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
        const size = 22;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const cx = c.getContext('2d');
        cx.translate(size / 2, size / 2);
        cx.rotate(angle);

        if (projType === 'fireball') {
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
            // Cầu axit xanh neon phát sáng (Zombie Phun Axit)
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
            // dark_orb (Necromancer)
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
// 4. BỘ VẼ CANVAS PIXEL-VECTOR ART CHO 6 NHÂN VẬT MỚI + XƯƠNG + Ụ PHÁO
// ============================================================================
export const CUSTOM_ART_UNIT_IDS = new Set([
    'pyromancer',
    'cryomancer',
    'cleric',
    'necromancer',
    'mecha_paladin',
    'railgun_walker',
    'skeleton'
]);

export function isCustomArtUnit(unitId) {
    return CUSTOM_ART_UNIT_IDS.has(unitId);
}

export function drawCustomUnitArt(ctx, unitId, cx = 0, cy = 0, size = 32, team = 'blue', animPhase = 0, rotation = 0) {
    ctx.save();
    ctx.translate(cx, cy);
    if (rotation) {
        ctx.rotate(rotation);
    }
    const scale = size / 32;
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const isBlue = team !== 'red';

    if (unitId === 'pyromancer') {
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

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-5, -8.2);
        ctx.lineTo(5, -8.2);
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
    } else if (unitId === 'cryomancer') {
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
    } else if (unitId === 'cleric') {
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
    } else if (unitId === 'necromancer') {
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

        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-5, -4);
        ctx.lineTo(-7, 10);
        ctx.moveTo(5, -4);
        ctx.lineTo(7, 10);
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
    } else if (unitId === 'mecha_paladin') {
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
    } else if (unitId === 'railgun_walker') {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3.2;
        [
            [-11, -9], [11, -9],
            [-11, 9],  [11, 9]
        ].forEach(([lx, ly]) => {
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
    } else if (unitId === 'skeleton') {
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

/**
 * Vẽ 14 Loại Zombie & Boss theo góc nhìn Front-Top View:
 * Nhân vật hướng mặt xuống dưới (+Y) để người chơi luôn nhìn rõ khuôn mặt, đôi mắt & vũ khí
 */
export function drawZombieArt(ctx, zombieId, cx = 0, cy = 0, size = 34, animPhase = 0) {
    ctx.save();
    ctx.translate(cx, cy);
    const scale = size / 34;
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const sway = Math.sin(animPhase * 6) * 1.2;

    if (zombieId === 'zombie_walker') {
        // 1. Walker Zombie: Da xanh tái, mắt lờ đờ, áo rách, 2 tay đưa ra trước (+Y)
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -8.5, -8, 17, 13, 4);
        ctx.fill();
        ctx.stroke();

        // Vết rách áo & xương sườn
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(-3, -3, 6, 4);

        // Hai cánh tay xanh tái vươn xuống (+Y)
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(-10.5, -2 + sway, 4, 11);
        ctx.strokeRect(-10.5, -2 + sway, 4, 11);
        ctx.fillRect(6.5, -2 - sway, 4, 11);
        ctx.strokeRect(6.5, -2 - sway, 4, 11);

        // Đầu chính diện hướng xuống (+Y)
        ctx.fillStyle = '#a3e635';
        ctx.beginPath();
        ctx.arc(0, 1, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Đôi mắt lờ đờ & miệng há
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
        // 2. Crawler / Runner Zombie: Dáng lao gù sát đất, mắt đỏ rực, vuốt sắc
        const pounce = Math.abs(Math.sin(animPhase * 11)) * 2;
        ctx.fillStyle = '#65a30d';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -9, -9 - pounce, 18, 14, 6);
        ctx.fill();
        ctx.stroke();

        // Vuốt sắc vươn tới trước
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-8, 4);
        ctx.lineTo(-11, 11);
        ctx.moveTo(8, 4);
        ctx.lineTo(11, 11);
        ctx.stroke();

        // Đầu gù cúi thấp hướng thẳng về phía trước
        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.arc(0, 3, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Đôi mắt đỏ rực phát sáng
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-2.8, 4, 2, 0, Math.PI * 2);
        ctx.arc(2.8, 4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3.2, 3.5, 1, 1);
        ctx.fillRect(2.4, 3.5, 1, 1);
    } else if (zombieId === 'zombie_bunny_rider') {
        // 3. Zombie Cưỡi Thỏ Đột Biến: Thỏ khổng lồ tai dài mắt đỏ bên dưới, Zombie ngồi trên lưng
        const hop = Math.abs(Math.sin(animPhase * 9)) * 2.5;
        ctx.translate(0, -hop);

        // Thân Thỏ khổng lồ màu xám trắng đột biến
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 2, 10.5, 12.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Đầu Thỏ phía trước (+Y) với 2 tai dài vểnh lên & mắt đỏ
        ctx.beginPath();
        ctx.arc(0, 8, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Hai tai thỏ dài
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.ellipse(-4.5, 1, 2.3, 7.5, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(4.5, 1, 2.3, 7.5, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Mắt đỏ & răng cửa thỏ
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3.5, 8.5, 2.2, 2.2);
        ctx.fillRect(1.3, 8.5, 2.2, 2.2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1.8, 12, 1.6, 2.5);
        ctx.fillRect(0.2, 12, 1.6, 2.5);

        // Zombie ngồi cưỡi trên lưng thỏ
        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.arc(0, -3.5, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-2.2, -2.5, 1.5, 1.5);
        ctx.fillRect(0.8, -2.5, 1.5, 1.5);
    } else if (zombieId === 'zombie_horse_knight') {
        // 4. Kỵ Sĩ Ngựa Xương: Chiến mã thây ma bên dưới + Kỵ sĩ giáp sắt rỉ sét bên trên
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -9.5, -12, 19, 24, 7);
        ctx.fill();
        ctx.stroke();

        // Đầu ngựa xương vươn về phía trước (+Y)
        ctx.fillStyle = '#cbd5e1';
        drawRoundRectPath(ctx, -5, 6, 10, 10, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-3.2, 10, 2, 2);
        ctx.fillRect(1.2, 10, 2, 2);

        // Kỵ sĩ giáp rỉ sét & Thương sắt bên phải
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(0, -2, 6.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Khe mũ giáp sáng mắt đỏ
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-4.5, -1, 9, 2.5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3, -0.5, 2, 1.5);
        ctx.fillRect(1, -0.5, 2, 1.5);

        // Ngọn thương kỵ sĩ chỉ thẳng xuống (+Y)
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(11, -10);
        ctx.lineTo(11, 15);
        ctx.stroke();
    } else if (zombieId === 'zombie_tiger_lord') {
        // 5. Chúa Tể Cưỡi Hổ Răng Kiếm: Hổ vằn cam đột biến + Thủ lĩnh Zombie
        ctx.fillStyle = '#ea580c';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -11, -12, 22, 24, 8);
        ctx.fill();
        ctx.stroke();

        // Vằn đen trên lưng hổ
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

        // Đầu Hổ răng kiếm phía trước (+Y)
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 9, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cặp răng nanh kiếm trắng dài
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

        // Chúa tể Zombie đội mũ xương trên lưng hổ
        ctx.fillStyle = '#65a30d';
        ctx.beginPath();
        ctx.arc(0, -3, 5.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-2.5, -2, 1.8, 1.8);
        ctx.fillRect(0.8, -2, 1.8, 1.8);
    } else if (zombieId === 'zombie_spitter') {
        // 6. Zombie Phun Axit: Bình hóa chất xanh phát sáng sau lưng, miệng nhỏ axit
        ctx.fillStyle = '#15803d';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -10.5, -11, 21, 13, 5);
        ctx.fill();
        ctx.stroke();

        // 2 ống bình hóa chất neon phát sáng trên vai
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(-6, -7, 3.6, 0, Math.PI * 2);
        ctx.arc(6, -7, 3.6, 0, Math.PI * 2);
        ctx.fill();

        // Đầu chính diện
        ctx.fillStyle = '#86efac';
        ctx.beginPath();
        ctx.arc(0, 2, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Miệng phun axit xanh rực
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 5.5, 3.2 + Math.sin(animPhase * 8) * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-3.2, 1.5, 2, 2);
        ctx.fillRect(1.2, 1.5, 2, 2);
    } else if (zombieId === 'zombie_bomber') {
        // 7. Zombie Cảm Tử Ôm Bom: Ôm thùng thuốc nổ TNT đỏ nhấp nháy trước ngực (+Y)
        ctx.fillStyle = '#65a30d';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -3, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Mắt điên dại
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-2.6, -1.5, 2, 0, Math.PI * 2);
        ctx.arc(2.6, -1.5, 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Thùng TNT đỏ nhấp nháy ôm trước ngực (+Y)
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
        // 8. Pháp Sư Zombie Gọi Hồn: Mũ đầu lâu, áo choàng tím, trượng xương phát sáng
        ctx.fillStyle = '#3b0764';
        ctx.strokeStyle = '#090014';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -10, -9, 20, 17, 6);
        ctx.fill();
        ctx.stroke();

        // Mũ đầu lâu trắng chính diện
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.arc(0, 1, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#a855f7';
        ctx.fillRect(-3.2, 1.5, 2.2, 2.2);
        ctx.fillRect(1, 1.5, 2.2, 2.2);

        // Trượng xương tím bên phải
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
        // 9. Zombie Khiên Chống Bạo Động: Thân sau + Khiên thép chữ nhật lớn che chắn mặt trước (+Y)
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -3, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Khiên thép chữ nhật lớn phía trước (+Y)
        ctx.fillStyle = '#64748b';
        drawRoundRectPath(ctx, -12, 3, 24, 9, 2.5);
        ctx.fill();
        ctx.stroke();

        // Khe kính quan sát trên khiên & chữ RIOT
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-7, 5, 14, 2.4);
    } else if (zombieId === 'zombie_cyborg') {
        // 10. Cyborg Zombie: Nửa mặt bọc thép mắt laser đỏ + Tay phải là lưỡi cưa máy
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        drawRoundRectPath(ctx, -9, -8, 18, 14, 4);
        ctx.fill();
        ctx.stroke();

        // Lưỡi cưa máy quay tít bên tay phải
        const sawJitter = Math.sin(animPhase * 28) * 1.2;
        ctx.fillStyle = '#94a3b8';
        drawRoundRectPath(ctx, 8, -2 + sawJitter, 5, 16, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(9.5, 2 + sawJitter, 2, 10);

        // Đầu nửa thịt zombie (trái) nửa thép robot (phải)
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

        // Mắt laser đỏ rực
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(2.8, 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-3.5, 1.5, 1.8, 1.8);
    } else if (zombieId === 'zombie_mecha') {
        // 11. Mecha-Zombie MK-IV: Cỗ máy chiến đấu bọc thép, lồng kính chứa đầu zombie + 2 bệ tên lửa
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        drawRoundRectPath(ctx, -13, -10, 26, 21, 5);
        ctx.fill();
        ctx.stroke();

        // 2 bệ phóng tên lửa trên vai
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-14.5, -4, 4, 11);
        ctx.strokeRect(-14.5, -4, 4, 11);
        ctx.fillRect(10.5, -4, 4, 11);
        ctx.strokeRect(10.5, -4, 4, 11);

        // Lồng kính bán cầu ở giữa chứa đầu Zombie
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
        // 12. BOSS Wave 7 – Đồ Tể Khổng Lồ: Tạp dề đẫm máu, mặt khâu chằng chịt, dao phay khổng lồ
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.4;
        drawRoundRectPath(ctx, -13, -11, 26, 22, 6);
        ctx.fill();
        ctx.stroke();

        // Tạp dề trắng vấy máu phía trước
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-9, 1, 18, 10);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(-3, 5, 3, 0, Math.PI * 2);
        ctx.arc(4, 7, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Dao phay khổng lồ bên phải
        ctx.fillStyle = '#cbd5e1';
        drawRoundRectPath(ctx, 11, -3, 7, 19, 2);
        ctx.fill();
        ctx.stroke();

        // Đầu đồ tể mặt khâu
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
        // 13. BOSS Wave 14 – Quái Thú Chimera: Quái thú đột biến 2 đầu có sừng, gầm sóng âm
        ctx.fillStyle = '#581c87';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.4;
        drawRoundRectPath(ctx, -14, -10, 28, 20, 8);
        ctx.fill();
        ctx.stroke();

        // Hai đầu quái thú song sinh hướng xuống (+Y)
        [-6.5, 6.5].forEach((hx, idx) => {
            ctx.fillStyle = idx === 0 ? '#7e22ce' : '#991b1b';
            ctx.beginPath();
            ctx.arc(hx, 5, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Sừng cong
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hx - 4, 1);
            ctx.lineTo(hx - 6, -4);
            ctx.moveTo(hx + 4, 1);
            ctx.lineTo(hx + 6, -4);
            ctx.stroke();

            // Mắt rực sáng
            ctx.fillStyle = '#00f2fe';
            ctx.fillRect(hx - 2.8, 5, 2, 2);
            ctx.fillRect(hx + 0.8, 5, 2, 2);
        });
    } else if (zombieId === 'boss_omega_tyrant') {
        // 14. BOSS Wave 20 – Bạo Chúa Omega: Đại boss Zombie-Robot 4 nòng pháo plasma, vương miện sừng
        ctx.fillStyle = '#090014';
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 2.5;
        drawRoundRectPath(ctx, -15, -12, 30, 24, 6);
        ctx.fill();
        ctx.stroke();

        // 4 nòng pháo plasma hướng xuống (+Y)
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        [-13, -8, 5, 10].forEach(bx => {
            ctx.fillRect(bx, 6, 3, 10);
            ctx.strokeRect(bx, 6, 3, 10);
        });

        // Lõi lò phản ứng tím-đỏ trước ngực
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 3, 4.5 + Math.sin(animPhase * 10) * 1, 0, Math.PI * 2);
        ctx.fill();

        // Đầu Bạo Chúa & Vương miện sừng
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

/**
 * Vẽ Ụ Pháo Phòng Thủ gắn trên Căn Cứ Xanh (`gatling` | `sam_missile` | `tesla_coil`)
 */
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

const customUnitIconCache = new Map();

export function getUnitSpriteDataURL(unitOrId, fallbackRow = 7) {
    const unitId = typeof unitOrId === 'string' ? unitOrId : (unitOrId?.id || 'infantry');
    const spriteCol = typeof unitOrId === 'object' && unitOrId !== null ? (unitOrId.spriteCol ?? 16) : 16;

    if (isZombieUnit(unitId)) {
        return getZombieSpriteDataURL(unitId);
    }

    if (isCustomArtUnit(unitId)) {
        const team = fallbackRow === 8 ? 'red' : 'blue';
        const cacheKey = `${unitId}__${team}`;
        if (customUnitIconCache.has(cacheKey)) {
            return customUnitIconCache.get(cacheKey);
        }
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const cCtx = c.getContext('2d');
        drawCustomUnitArt(cCtx, unitId, 24, 25, 38, team, 0.5, 0);
        const url = c.toDataURL();
        customUnitIconCache.set(cacheKey, url);
        return url;
    }

    if (atlas && atlas.ready) {
        return atlas.toDataURL(spriteCol, fallbackRow);
    }
    return '';
}

// ============================================================================
// 5. ATLAS BÓC TÁCH SPRITE SHEET ("Preview.png")
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