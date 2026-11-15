/* ============================================================================
   TINY BATTLE - BATTLE STATE, ENTITIES, TACTICS & RAID BOSS (js/entities.js)
   Central Game State, Unit/Projectile Classes, QWER Skills, Raid Boss & Fog
   ============================================================================ */

import {
    LOGICAL_WIDTH,
    PLAYFIELD_HEIGHT,
    MAX_WAVES,
    RARITY_CONFIG,
    isMasterRarity,
    isDemonRarity,
    DIFFICULTY_CONFIG,
    COMMANDER_TACTICS,
    UNIT_CHIPS,
    ROGUELIKE_MUTATIONS,
    RAID_BOSS_CONFIG,
    UNIT_CATALOG,
    UNIT_BY_ID
} from './config.js';

import { triggerHaptic } from './math.js';
import {
    metaState,
    getHighestRarityForUnit,
    normalizeUnitId
} from './state.js';
import { drawCanvasRarityAura } from './lobby-ui.js';
import { sfx, projCache, particlePool, atlas } from './engine-core.js';
import { nav } from './map-nav.js';

// Callback kết thúc trận đấu (được đăng ký từ main.js để tránh phụ thuộc vòng)
let onEndBattleCallback = null;
export function setOnEndBattleHandler(fn) {
    onEndBattleCallback = fn;
}

// ============================================================================
// 1. TRẠNG THÁI TRẬN ĐẤU TRUNG TÂM (GAME STATE)
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

    // Tiện ích Tốc độ trận đấu (x1, x2, x4) & Tự động chiến đấu (Auto-Play)
    speedMult: 1,
    autoPlay: false,
    autoPlayTimer: 0,

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

    // Kỹ năng Chỉ Huy (Đồng bộ 16s / 18s / 22s / 24s)
    tacticCooldowns: { airdrop: 0, minefield: 0, emp_blast: 0, blitzkrieg: 0 },
    tacticMaxCooldowns: {
        airdrop: COMMANDER_TACTICS.airdrop?.cooldown ?? 16.0,
        minefield: COMMANDER_TACTICS.landmines?.cooldown ?? 18.0,
        emp_blast: COMMANDER_TACTICS.emp?.cooldown ?? 22.0,
        blitzkrieg: COMMANDER_TACTICS.blitzkrieg?.cooldown ?? 24.0
    },
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

// ============================================================================
// 2. CÁC HÀM HIỆU ỨNG CHIẾN TRƯỜNG (JUICY FX HELPERS)
// ============================================================================
export function addScreenShake(intensity = 4, duration = 0.18) {
    game.shakeIntensity = Math.max(game.shakeIntensity, intensity);
    game.shakeTimer = Math.max(game.shakeTimer, duration);
}

export function spawnScorchMark(x, y, radius = 16) {
    if (nav.isPointInWaterRaw(x, y)) return;
    game.scorchMarks.push({ x, y, radius, alpha: 0.78 });
    if (game.scorchMarks.length > 30) {
        game.scorchMarks.shift();
    }
}

export function spawnShockwave(x, y, maxRadius = 42, color = '#fde047', lineWidth = 3.5) {
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

export function spawnMuzzleFlash(x, y, angle = 0, scale = 1.0) {
    game.muzzleFlashes.push({
        x,
        y,
        angle,
        scale,
        ttl: 0.065
    });
}

export function spawnFloatingText(x, y, text, color = '#fde047', size = 13) {
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

export function spawnExplosionFX(x, y, radius = 28, isNapalm = false, isEmp = false) {
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
// 3. TÍNH TOÁN CHỈ SỐ ĐƠN VỊ (41 RARITY TIERS + LEVEL + META-TALENTS + 4 CHIPS)
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
            auraType: 'none',
            equippedSockets: []
        };
    }

    const permLv = metaState?.armyPermanentLevels?.[base.id] || metaState?.armyPermanentLevels?.[rawUnitId] || 1;
    const lvMult = 1 + (permLv - 1) * 0.12;

    const rarityId = customRarityId || getHighestRarityForUnit(base.id) || 'common';
    const rarityObj = RARITY_CONFIG[rarityId] || { mult: 1.0, color: '#94a3b8', auraType: 'none' };
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
    let burnDuration = 3.0;
    let stunChance = 0;

    const steelLv = Number(metaState?.metaTalents?.high_grade_steel) || 0;
    const logiLv = Number(metaState?.metaTalents?.optimal_logistics) || 0;

    if (steelLv > 0) {
        hpBonusPct += steelLv * 0.04;
        armorReductionPct += steelLv * 0.04;
    }
    if (logiLv > 0) {
        cdReductionPct += logiLv * 0.03;
    }

    const sockets = Array.isArray(metaState?.unitSockets?.[base.id])
        ? metaState.unitSockets[base.id]
        : (metaState?.equippedChips?.[base.id] ? [metaState.equippedChips[base.id]] : []);

    sockets.forEach(chipId => {
        if (!chipId) return;
        if (chipId === 'napalm_rocket') {
            burnDps += UNIT_CHIPS.napalm_rocket?.burnDps ?? 18;
            burnDuration = UNIT_CHIPS.napalm_rocket?.burnDuration ?? 3.0;
            splashBonusFlat += UNIT_CHIPS.napalm_rocket?.splashBonus ?? 14;
        } else if (chipId === 'tactical_radar') {
            rangeBonusFlat += UNIT_CHIPS.tactical_radar?.rangeBonusFlat ?? 28;
        } else if (chipId === 'reactive_armor') {
            hpBonusPct += UNIT_CHIPS.reactive_armor?.hpBonusPct ?? 0.18;
            armorReductionPct += UNIT_CHIPS.reactive_armor?.damageReductionPct ?? 0.15;
        } else if (chipId === 'overclock_core' || chipId === 'overclock_servo') {
            speedBonusPct += UNIT_CHIPS.overclock_core?.speedBonusPct ?? 0.20;
            cdReductionPct += UNIT_CHIPS.overclock_core?.cooldownReductionPct ?? 0.15;
        }
    });

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

    const finalHp = Math.max(1, Math.round(base.hp * lvMult * rarityMult * (1 + hpBonusPct)));
    const finalDmg = Math.max(1, Math.round(base.damage * lvMult * rarityMult * (1 + dmgBonusPct)));
    const finalSpeed = Math.round(base.speed * (1 + speedBonusPct));
    const finalRange = Math.round(base.range + rangeBonusFlat);
    const finalFireRate = +(base.fireRate * (1 + fireRateBonusPct)).toFixed(2);
    const finalCooldown = Math.max(0.4, base.cooldown * (1 - Math.min(0.65, cdReductionPct)));
    const radarCount = sockets.filter(id => id === 'tactical_radar').length;

    return {
        ...base,
        level: permLv,
        rarityId,
        rarityRank: rarityObj.rank ?? 0,
        rarityColor: rarityObj.color || '#38bdf8',
        auraType: rarityObj.auraType || 'none',
        hp: finalHp,
        maxHp: finalHp,
        damage: finalDmg,
        dmg: finalDmg,
        speed: finalSpeed,
        range: finalRange,
        fireRate: finalFireRate,
        atkSpeed: finalFireRate,
        visionCone: (base.visionCone || base.range + 35) + radarCount * (UNIT_CHIPS.tactical_radar?.nightVisionBonus ?? 65),
        splash: (base.splash || 0) + splashBonusFlat,
        cooldown: finalCooldown,
        equippedSockets: sockets,
        hasRadarAura: radarCount > 0,
        armorReductionPct: Math.min(0.65, armorReductionPct),
        lifestealPct,
        burnDps,
        burnDuration,
        stunChance
    };
}

// ============================================================================
// 4. LỚP ĐƠN VỊ CHIẾN ĐẤU (UNIT) & ĐẠN PHÁO (PROJECTILE)
// ============================================================================
let NEXT_UNIT_UID = 1;

export class Unit {
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
        this.auraPhase = Math.random() * Math.PI * 2;

        this.stunTimer = 0;
        this.burnTimer = 0;
        this.burnDps = 0;
        this.airdropBuffTimer = 0;
        this.isBossUnit = false;
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
            const isMaster = isMasterRarity(this.spec.rarityId);
            const isDemon = isDemonRarity(this.spec.rarityId);
            spawnExplosionFX(
                this.x,
                this.y,
                this.radius * (this.isBossUnit ? 2.6 : 1.8),
                isDemon,
                isMaster
            );

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
        this.auraPhase += dt;

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
            if (Math.random() < 0.35) {
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
        const blitzSpeedMult = COMMANDER_TACTICS.blitzkrieg?.speedMult ?? 1.42;
        const blitzFireMult = COMMANDER_TACTICS.blitzkrieg?.fireRateMult ?? 1.55;
        const airdropFireMult = 1 + (COMMANDER_TACTICS.airdrop?.atkSpeedBuff ?? 0.30);

        const speedMult = isBlitz ? blitzSpeedMult : 1.0;
        const fireRateMult = (isBlitz ? blitzFireMult : 1.0) * (this.airdropBuffTimer > 0 ? airdropFireMult : 1.0);

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
        const auraType = this.spec.auraType || 'none';

        if (this.team === 'blue' && (auraType === 'master_aqua' || auraType === 'demon_abyss')) {
            const col = auraType === 'demon_abyss'
                ? (Math.random() < 0.5 ? '#d946ef' : '#a855f7')
                : (Math.random() < 0.5 ? '#00f2fe' : '#38bdf8');
            particlePool.spawn(
                this.x + (Math.random() - 0.5) * 12,
                this.y + (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 14,
                -12 - Math.random() * 14,
                2.6,
                col,
                2.3,
                'circle'
            );
        }

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

        const auraType = this.spec.auraType || 'none';

        if (this.spec.attackType === 'beam') {
            sfx.play('beam');
            let beamColor = this.team === 'blue' ? '#fde047' : '#fb7185';
            if (this.team === 'blue') {
                if (auraType === 'demon_abyss') beamColor = '#f0abfc';
                else if (auraType === 'master_aqua') beamColor = '#00f2fe';
            }
            game.beamEffects.push({
                x1: mx,
                y1: my,
                x2: target.x,
                y2: target.y - (target.altitude || 0),
                color: beamColor,
                width: auraType === 'demon_abyss' ? 3.8 : (auraType === 'master_aqua' ? 3.2 : 2.5),
                ttl: 0.08
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
                    auraType,
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
        if (this.team === 'blue' && (isMasterRarity(this.spec.rarityId) || isDemonRarity(this.spec.rarityId))) {
            drawCanvasRarityAura(
                ctx,
                this.x,
                this.y + 3,
                this.radius * 1.18,
                this.spec.rarityId,
                game.timeSec + this.auraPhase
            );
        }

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

        if (this.isAir && this.team === 'blue' && (isMasterRarity(this.spec.rarityId) || isDemonRarity(this.spec.rarityId))) {
            drawCanvasRarityAura(
                ctx,
                drawX,
                drawY + 4,
                this.radius * 1.1,
                this.spec.rarityId,
                game.timeSec + this.auraPhase
            );
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

        if (this.hp < this.maxHp || this.isBossUnit) {
            const bw = Math.max(20, this.radius * 1.7);
            const bh = this.isBossUnit ? 5.5 : 4;
            const bx = drawX - bw / 2;
            const by = drawY - this.radius - 10;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
            ctx.fillStyle = this.team === 'blue'
                ? (isDemonRarity(this.spec.rarityId) ? '#d946ef' : (isMasterRarity(this.spec.rarityId) ? '#00f2fe' : '#22c55e'))
                : '#ef4444';
            ctx.fillRect(bx, by, bw * Math.max(0, this.hp / this.maxHp), bh);
        }
    }
}

export class Projectile {
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
        this.auraType = opts.auraType || 'none';
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

        if (this.isRocket || this.auraType === 'master_aqua' || this.auraType === 'demon_abyss') {
            this.smokeTimer -= dt;
            if (this.smokeTimer <= 0) {
                const trailCol = this.auraType === 'demon_abyss'
                    ? '#d946ef'
                    : (this.auraType === 'master_aqua' ? '#00f2fe' : 'rgba(226, 232, 240, 0.75)');
                particlePool.spawn(
                    this.x - Math.cos(this.angle) * 6,
                    this.y - Math.sin(this.angle) * 6,
                    (Math.random() - 0.5) * 12,
                    (Math.random() - 0.5) * 12,
                    3.2,
                    trailCol,
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
        const burnDuration = ownerSpec.burnDuration || 3.0;
        const hasEmp = (ownerSpec.stunChance || 0) > 0 && Math.random() < ownerSpec.stunChance;

        if (this.splash > 0) {
            sfx.play('boom');
            spawnExplosionFX(
                this.targetX,
                this.targetY,
                this.splash,
                hasNapalm || this.auraType === 'demon_abyss',
                hasEmp || this.auraType === 'master_aqua'
            );
            if (this.splash >= 38) addScreenShake(3.5, 0.14);

            for (const u of game.units) {
                if (u.dead || u.team === this.team) continue;
                const d = Math.hypot(u.x - this.targetX, u.y - this.targetY);
                if (d <= this.splash) {
                    const falloff = 1 - (d / this.splash) * 0.35;
                    u.takeDamage(this.damage * falloff, this.owner);
                    if (hasNapalm) {
                        u.burnTimer = burnDuration;
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
            const hitCol = this.auraType === 'demon_abyss' ? '#f0abfc' : (this.auraType === 'master_aqua' ? '#00f2fe' : '#fde047');
            particlePool.spawn(this.targetX, this.targetY, 0, 0, 5, hitCol, 3.5, 'circle');
            if (this.targetRef) {
                applyDamageToTargetObject(this.targetRef, this.damage, this.owner);
            }
        }
    }

    draw(ctx) {
        if (this.done) return;
        const sprite = projCache.getProjectileSprite(
            this.angle,
            this.team === 'blue',
            this.isRocket,
            this.auraType
        );
        if (sprite) {
            ctx.drawImage(sprite, this.x - 10, this.y - 10);
        }
    }
}

export function applyDamageToTargetObject(target, dmg, attacker = null) {
    if (!target) return;
    const ownerSpec = attacker?.spec || {};
    if (target.isBase && target.ref) {
        damageBase(target.ref, dmg);
    } else if (target.isBoss && target.ref) {
        damageRaidBoss(dmg, attacker?.x);
    } else if (typeof target.takeDamage === 'function') {
        target.takeDamage(dmg, attacker);
        if (ownerSpec.burnDps > 0) {
            target.burnTimer = ownerSpec.burnDuration || 3.0;
            target.burnDps = ownerSpec.burnDps;
        }
        if (ownerSpec.stunChance > 0 && Math.random() < ownerSpec.stunChance) {
            target.stunTimer = Math.max(target.stunTimer, 1.25);
        }
    }
}

export function damageBase(baseObj, rawDmg) {
    if (!baseObj || baseObj.hp <= 0 || game.gameOver) return;
    const dmg = Math.max(1, Math.round(rawDmg));
    baseObj.hp = Math.max(0, baseObj.hp - dmg);
    baseObj.hitFlash = 0.15;

    if (baseObj === game.playerBase && baseObj.hp <= 0) {
        if (onEndBattleCallback) onEndBattleCallback(false);
    } else if (baseObj === game.enemyBase && baseObj.hp <= 0) {
        if (game.battleMode === 'destroy' || game.battleMode === 'fog_of_war' || game.battleMode === 'auto_battler') {
            if (onEndBattleCallback) onEndBattleCallback(true);
        }
    }
}

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

export function launchAirstrike(team, targetY) {
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

// ============================================================================
// 5. HỆ THỐNG KỸ NĂNG CHỈ HUY (Q/W/E/R: 16s / 18s / 22s / 24s)
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

export function updateCommanderSkillsUI() {
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
        const maxCd = game.tacticMaxCooldowns[key] || 16;

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

export function triggerCommanderSkill(rawSkillKey, targetX = null, targetY = null) {
    if (!game.running || game.paused || game.gameOver) return;
    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') return;

    const skillKey = SKILL_ALIAS_MAP[rawSkillKey] || rawSkillKey;
    if (!skillKey || game.tacticCooldowns[skillKey] > 0) return;

    const logiLv = Number(metaState?.metaTalents?.optimal_logistics) || 0;
    const cdReduction = logiLv * 0.04;
    const baseCd = game.tacticMaxCooldowns[skillKey] || 16;
    game.tacticCooldowns[skillKey] = Math.max(5, baseCd * (1 - cdReduction));

    triggerHaptic(25);

    if (skillKey === 'airdrop') {
        sfx.play('spawn');
        const dropX = targetX ?? LOGICAL_WIDTH / 2;
        const dropY = targetY ?? Math.max(190, PLAYFIELD_HEIGHT * 0.52);
        const healRatio = COMMANDER_TACTICS.airdrop?.healRatio ?? 0.40;
        const buffDur = COMMANDER_TACTICS.airdrop?.buffDuration ?? 6.0;

        for (const u of game.units) {
            if (u.team === 'blue' && !u.dead) {
                u.hp = Math.min(u.maxHp, Math.round(u.hp + u.maxHp * healRatio));
                u.airdropBuffTimer = buffDur;
            }
        }

        const specs = COMMANDER_TACTICS.airdrop?.paratroopUnits || ['infantry', 'bazooka', 'infantry'];
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
        spawnFloatingText(dropX, dropY - 28, '🪂 CHI VIỆN DÙ [Q] & HỒI 40% HP!', '#4ade80', 14);
    } else if (skillKey === 'minefield') {
        sfx.play('upgrade');
        const rowY = targetY ?? PLAYFIELD_HEIGHT * 0.62;
        const mineCount = COMMANDER_TACTICS.landmines?.mineCount ?? 5;
        const mineDmg = COMMANDER_TACTICS.landmines?.mineDamage ?? 240;
        const mineSplash = COMMANDER_TACTICS.landmines?.mineSplash ?? 54;

        for (let i = 0; i < mineCount; i++) {
            const mx = 70 + i * 70;
            const validPt = nav.findValidSpawnPoint('blue', UNIT_BY_ID.infantry, mx, rowY);
            game.landmines.push({
                x: validPt.x,
                y: validPt.y,
                radius: 11,
                splash: mineSplash,
                damage: mineDmg,
                blinkTimer: Math.random(),
                exploded: false
            });
        }
        spawnFloatingText(LOGICAL_WIDTH / 2, rowY - 20, '💣 BÃI MÌN CHỐNG TĂNG [W]!', '#f97316', 14);
    } else if (skillKey === 'emp_blast') {
        sfx.play('emp');
        addScreenShake(6, 0.28);
        const empX = targetX ?? LOGICAL_WIDTH / 2;
        const empY = targetY ?? PLAYFIELD_HEIGHT * 0.42;
        const stunDur = COMMANDER_TACTICS.emp?.stunDuration ?? 4.0;
        const empDmg = COMMANDER_TACTICS.emp?.empDamage ?? 48;
        const bossEmpDmg = COMMANDER_TACTICS.emp?.bossEmpDamage ?? 180;

        spawnShockwave(empX, empY, 240, '#38bdf8', 5);

        for (const u of game.units) {
            if (u.team === 'red' && !u.dead) {
                u.stunTimer = Math.max(u.stunTimer, stunDur);
                u.takeDamage(empDmg);
            }
        }
        if (game.raidBoss && game.raidBoss.hp > 0) {
            game.raidBoss.stunTimer = 3.0;
            damageRaidBoss(bossEmpDmg, empX);
        }
        spawnFloatingText(empX, empY, '⚡ XUNG ĐIỆN EMP [E] (TÊ LIỆT 4S)!', '#38bdf8', 15);
    } else if (skillKey === 'blitzkrieg') {
        sfx.play('blitz');
        game.blitzkriegTimer = COMMANDER_TACTICS.blitzkrieg?.duration ?? 6.0;
        spawnShockwave(game.playerBase.x, game.playerBase.y, 180, '#fde047', 4.5);
        spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT * 0.68, '🚀 BLITZKRIEG THẦN TỐC [R] (6S)!', '#fde047', 15);
    }

    updateCommanderSkillsUI();
}

// ============================================================================
// 6. CÁC CHẾ ĐỘ ĐẶC BIỆT: RAID BOSS, FOG OF WAR & ENDLESS MUTATIONS
// ============================================================================
export function showBossWarningBanner(titleText, subText) {
    const banner = document.getElementById('boss-warning-banner');
    if (!banner) return;
    const tEl = document.getElementById('boss-alert-title');
    const sEl = document.getElementById('boss-alert-sub');
    if (tEl && titleText) tEl.textContent = titleText;
    if (sEl && subText) sEl.textContent = subText;
    banner.classList.remove('hidden');
    setTimeout(() => {
        banner.classList.add('hidden');
    }, 3200);
}

export function initRaidBoss() {
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
    showBossWarningBanner('PHÁO ĐÀI LEVIATHAN MK-IX!', 'Hủy diệt 3 bộ phận Pháo Chính, Phòng Không & Động Cơ!');
}

export function updateRaidBossHUD() {
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

export function damageRaidBoss(rawDmg, hitX = null) {
    const boss = game.raidBoss;
    if (!boss || boss.hp <= 0 || game.gameOver) return;
    const dmg = Math.max(1, Math.round(rawDmg));
    boss.hp = Math.max(0, boss.hp - dmg);
    boss.hitFlash = 0.12;
    game.enemyBase.hp = boss.hp;

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
        if (onEndBattleCallback) onEndBattleCallback(true);
    }
}

export function updateRaidBoss(dt) {
    const boss = game.raidBoss;
    if (!boss || boss.hp <= 0) return;

    if (boss.hitFlash > 0) boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    if (boss.stunTimer > 0) {
        boss.stunTimer -= dt;
        return;
    }

    const engineMult = boss.parts.engine.destroyed ? 0.35 : 1.0;
    boss.x += boss.vx * (boss.phase === 3 ? 1.45 : 1.0) * engineMult * dt;
    if (boss.x > LOGICAL_WIDTH - 85) {
        boss.x = LOGICAL_WIDTH - 85;
        boss.vx = -Math.abs(boss.vx);
    } else if (boss.x < 85) {
        boss.x = 85;
        boss.vx = Math.abs(boss.vx);
    }

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

export function drawRaidBoss(ctx) {
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

export function renderFogOfWarOverlay(ctx) {
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

export function triggerRoguelikeMutationDraft() {
    const shuffled = [...ROGUELIKE_MUTATIONS].sort(() => Math.random() - 0.5).slice(0, 3);
    if (shuffled.length === 0) return;

    if (game.autoPlay) {
        const picked = shuffled[0];
        game.activeMutations.push(picked.id);
        sfx.play('upgrade');
        spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2, `🤖 AUTO ĐỘT BIẾN: ${picked.name}!`, '#fde047', 15);
        return;
    }

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