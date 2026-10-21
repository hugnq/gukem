/**
 * Tiny Battle - Web Canvas Engine
 * Chen nhau đánh trên toàn chiến trường & Nâng cấp tốc độ xăng
 */

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

            if (type === 'beam') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(360, now);
                osc.frequency.exponentialRampToValueAtTime(110, now + 0.07);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.07);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.07);
            } else if (type === 'cannon') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.18);
            } else if (type === 'boom') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(110, now);
                osc.frequency.exponentialRampToValueAtTime(22, now + 0.32);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.32);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.32);
            } else if (type === 'spawn') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(340, now);
                osc.frequency.exponentialRampToValueAtTime(620, now + 0.1);
                gain.gain.setValueAtTime(0.09, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'gas') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'airstrike') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(240, now);
                osc.frequency.linearRampToValueAtTime(120, now + 0.65);
                gain.gain.setValueAtTime(0.11, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.65);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.65);
            } else if (type === 'upgrade') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(900, now + 0.22);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.22);
            }
        } catch (e) {}
    }
}

const sfx = new SoundFX();

const canvas = document.getElementById('battleCanvas');
const ctx = canvas.getContext('2d');

const LOGICAL_WIDTH = 420;
const LOGICAL_HEIGHT = 840;
const BOTTOM_UI_HEIGHT = 126;
const PLAYFIELD_HEIGHT = LOGICAL_HEIGHT - BOTTOM_UI_HEIGHT;

// Bảng nâng cấp tốc độ xăng: Khởi đầu 3s/bình, nâng dần lên 2.0s, 1.5s, 1.1s, 0.8s, 0.55s
const GAS_UPGRADE_LEVELS = [
    { level: 1, interval: 3.0, cost: 4, label: '➔ 2.0s' },
    { level: 2, interval: 2.0, cost: 6, label: '➔ 1.5s' },
    { level: 3, interval: 1.5, cost: 9, label: '➔ 1.1s' },
    { level: 4, interval: 1.1, cost: 13, label: '➔ 0.8s' },
    { level: 5, interval: 0.8, cost: 18, label: '➔ 0.55s' },
    { level: 6, interval: 0.55, cost: 0, label: 'MAX' }
];

const LEVELS = Array.from({ length: 12 }, (_, idx) => {
    const lv = idx + 1;
    return {
        level: lv,
        enemyBaseHp: 90 + lv * 28,
        playerBaseHp: 100,
        aiGasInterval: Math.max(1.0, 2.7 - lv * 0.13),
        aiTankChance: Math.min(0.65, 0.18 + lv * 0.04),
        aiPlaneInterval: Math.max(14, 30 - lv * 1.3),
        initialRedUnits: Math.min(5, Math.floor((lv + 1) / 2)),
        startingGas: lv === 1 ? 4 : 3
    };
});

const UNIT_SPECS = {
    1: {
        name: 'Bộ Binh',
        cost: 3,
        hp: 6,
        speed: 48,
        damage: 1,
        fireRate: 1.0,
        beamDuration: 0.18,
        range: 36,
        radius: 13
    },
    2: {
        name: 'Xe Tăng',
        cost: 5,
        hp: 10,
        speed: 35,
        damage: 2,
        fireRate: 1.25,
        range: 155,
        radius: 19,
        projSpeed: 240,
        projRadius: 5
    },
    3: {
        name: 'Không Kích',
        cost: 8,
        unitDamage: 10,
        baseDamage: 16
    }
};

let completedLevels = new Set();

let game = {
    inMenu: true,
    paused: false,
    gameOver: false,
    currentLevel: 1,
    elapsedTime: 0,

    gasUpgradeIndex: 0,
    gasInterval: 3.0,
    gasTimer: 3.0,
    gasCount: 0,
    maxGas: 99,

    rallyX: null,

    blueBase: {
        team: 'blue',
        x: LOGICAL_WIDTH / 2,
        y: PLAYFIELD_HEIGHT - 56,
        width: 250,
        height: 60,
        hp: 100,
        maxHp: 100
    },
    redBase: {
        team: 'red',
        x: LOGICAL_WIDTH / 2,
        y: 64,
        width: 250,
        height: 60,
        hp: 100,
        maxHp: 100
    },

    aiGas: 2,
    aiGasTimer: 0,
    aiDecisionTimer: 1.5,
    aiPlaneTimer: 0,

    units: [],
    bullets: [],
    planes: [],
    particles: [],
    floatingTexts: [],

    shakeTime: 0,
    shakeIntensity: 0,

    stats: {
        spawned: 0,
        kills: 0
    }
};

const decorativeTrees = [
    { x: 26, y: 175, r: 18, shade: '#2d6a2e' },
    { x: 38, y: 200, r: 14, shade: '#347835' },
    { x: 394, y: 155, r: 19, shade: '#2d6a2e' },
    { x: 396, y: 270, r: 16, shade: '#275c28' },
    { x: 22, y: 310, r: 15, shade: '#347835' },
    { x: 25, y: 445, r: 19, shade: '#2d6a2e' },
    { x: 395, y: 430, r: 17, shade: '#347835' },
    { x: 20, y: 560, r: 16, shade: '#275c28' },
    { x: 392, y: 520, r: 15, shade: '#2d6a2e' }
];

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = LOGICAL_WIDTH * dpr;
    canvas.height = LOGICAL_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const mainMenuEl = document.getElementById('main-menu');
const levelSelectEl = document.getElementById('level-select-screen');
const levelGridEl = document.getElementById('level-grid');
const gasCountTextEl = document.getElementById('gas-count-text');
const speedIndicatorEl = document.getElementById('speed-indicator');
const currentLevelLabelEl = document.getElementById('current-level-label');
const gasRateLabelEl = document.getElementById('gas-rate-label');

const btnUpgradeGasEl = document.getElementById('btnUpgradeGas');
const upgradeCostTextEl = document.getElementById('upgrade-cost-text');
const upgradeNextSpeedEl = document.getElementById('upgrade-next-speed');
const blockUpgradeEl = document.getElementById('blockUpgrade');
const upgradeLockCostEl = document.getElementById('upgrade-lock-cost');

const gasLoadEls = [
    document.getElementById('L1'),
    document.getElementById('L2'),
    document.getElementById('L3'),
    document.getElementById('L4'),
    document.getElementById('L5')
];

const unitLockEls = {
    1: document.getElementById('blockU1'),
    2: document.getElementById('blockU2'),
    3: document.getElementById('blockU3')
};

const unitBtnEls = {
    1: document.getElementById('btnU1'),
    2: document.getElementById('btnU2'),
    3: document.getElementById('btnU3')
};

function renderLevelGrid() {
    levelGridEl.innerHTML = '';
    LEVELS.forEach(cfg => {
        const cell = document.createElement('button');
        cell.className = 'level-cell' + (completedLevels.has(cfg.level) ? ' completed' : '');
        cell.innerHTML = `
            <span>${cfg.level}</span>
            <span class="level-stars">${completedLevels.has(cfg.level) ? '★★★' : '☆☆☆'}</span>
        `;
        cell.addEventListener('click', () => {
            startLevel(cfg.level);
        });
        levelGridEl.appendChild(cell);
    });
}

window.openLevelSelect = function() {
    game.inMenu = true;
    document.getElementById('win-panel').classList.remove('active');
    document.getElementById('lose-panel').classList.remove('active');
    mainMenuEl.classList.remove('active');
    renderLevelGrid();
    levelSelectEl.classList.add('active');
};

document.getElementById('btn-open-levels').addEventListener('click', () => {
    sfx.play('spawn');
    openLevelSelect();
});

document.getElementById('btn-back-menu').addEventListener('click', () => {
    levelSelectEl.classList.remove('active');
    mainMenuEl.classList.add('active');
});

document.getElementById('menu-return-btn').addEventListener('click', () => {
    openLevelSelect();
});

function startLevel(levelNum) {
    const cfg = LEVELS[levelNum - 1] || LEVELS[0];
    game.currentLevel = cfg.level;
    game.inMenu = false;
    game.paused = false;
    game.gameOver = false;
    game.elapsedTime = 0;

    // Reset cấp độ xăng về 3.0s/bình
    game.gasUpgradeIndex = 0;
    game.gasInterval = GAS_UPGRADE_LEVELS[0].interval;
    game.gasTimer = game.gasInterval;
    game.gasCount = cfg.startingGas;
    game.rallyX = null;

    game.blueBase.maxHp = cfg.playerBaseHp;
    game.blueBase.hp = cfg.playerBaseHp;
    game.redBase.maxHp = cfg.enemyBaseHp;
    game.redBase.hp = cfg.enemyBaseHp;

    game.aiGas = 2;
    game.aiGasTimer = 0;
    game.aiDecisionTimer = 1.2;
    game.aiPlaneTimer = cfg.aiPlaneInterval;

    game.units = [];
    game.bullets = [];
    game.planes = [];
    game.particles = [];
    game.floatingTexts = [];
    game.stats.spawned = 0;
    game.stats.kills = 0;

    mainMenuEl.classList.remove('active');
    levelSelectEl.classList.remove('active');
    document.getElementById('win-panel').classList.remove('active');
    document.getElementById('lose-panel').classList.remove('active');
    document.getElementById('pause-btn').textContent = '⏸';

    currentLevelLabelEl.textContent = `LV.${cfg.level}`;

    // Xuất quân đội phòng thủ ban đầu của Đỏ (tràn từ nhà ra)
    for (let i = 0; i < cfg.initialRedUnits; i++) {
        const unitType = (i === cfg.initialRedUnits - 1 && cfg.level >= 3) ? 2 : 1;
        const gateSpread = 180;
        const rx = (LOGICAL_WIDTH / 2 - gateSpread / 2) + Math.random() * gateSpread;
        const offsetY = 120 + i * 36;
        spawnFreeUnit('red', unitType, rx, offsetY);
    }

    sfx.play('spawn');
    updateControllerUI();
}

function timerEnded() {
    if (game.gasCount < game.maxGas) {
        game.gasCount++;
        sfx.play('gas');
    }
    gasCountTextEl.textContent = game.gasCount.toString();
    game.gasTimer = game.gasInterval;
}

window.upgradeGasRate = function() {
    if (game.inMenu || game.gameOver || game.paused) return;
    const currentTier = GAS_UPGRADE_LEVELS[game.gasUpgradeIndex];
    if (!currentTier || currentTier.cost === 0) return;

    if (game.gasCount < currentTier.cost) {
        addFloatingText(120, PLAYFIELD_HEIGHT - 20, 'THIẾU XĂNG!', '#f87171', 12);
        return;
    }

    game.gasCount -= currentTier.cost;
    game.gasUpgradeIndex++;
    const newTier = GAS_UPGRADE_LEVELS[game.gasUpgradeIndex];
    game.gasInterval = newTier.interval;
    game.gasTimer = Math.min(game.gasTimer, game.gasInterval);

    sfx.play('upgrade');
    addFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT - 60, `⚡ TỐC ĐỘ: ${game.gasInterval}s/bình!`, '#34d399', 15);
    triggerShake(0.15, 3.5);
    updateControllerUI();
};

function updateControllerUI() {
    gasCountTextEl.textContent = game.gasCount.toString();
    speedIndicatorEl.textContent = `⛽ ${game.gasInterval}s/bình`;
    gasRateLabelEl.textContent = `+1/${game.gasInterval}s`;

    // Cập nhật thanh 5 vạch nạp xăng
    const progress = Math.max(0, Math.min(1, 1 - (game.gasTimer / game.gasInterval)));
    gasLoadEls.forEach((el, index) => {
        if (progress >= (index + 1) * 0.2) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    // Cập nhật nút nâng xăng
    const currentTier = GAS_UPGRADE_LEVELS[game.gasUpgradeIndex];
    if (currentTier.cost === 0) {
        upgradeNextSpeedEl.textContent = 'MAX';
        upgradeCostTextEl.textContent = '-';
        blockUpgradeEl.classList.remove('unlocked');
        upgradeLockCostEl.textContent = 'MAX';
        btnUpgradeGasEl.classList.remove('ready');
    } else {
        upgradeNextSpeedEl.textContent = currentTier.label;
        upgradeCostTextEl.textContent = currentTier.cost.toString();
        upgradeLockCostEl.textContent = `${currentTier.cost} ⛽`;

        if (game.gasCount >= currentTier.cost && !game.gameOver) {
            blockUpgradeEl.classList.add('unlocked');
            btnUpgradeGasEl.classList.add('ready');
        } else {
            blockUpgradeEl.classList.remove('unlocked');
            btnUpgradeGasEl.classList.remove('ready');
        }
    }

    // Nút lính
    [1, 2, 3].forEach(type => {
        const cost = UNIT_SPECS[type].cost;
        if (game.gasCount >= cost && !game.gameOver) {
            unitLockEls[type].classList.add('unlocked');
            unitBtnEls[type].classList.add('ready');
        } else {
            unitLockEls[type].classList.remove('unlocked');
            unitBtnEls[type].classList.remove('ready');
        }
    });
}

document.getElementById('gas-generator-btn').addEventListener('click', () => {
    if (game.inMenu || game.gameOver || game.paused) return;
    game.gasTimer -= 0.35;
    sfx.play('gas');
    addFloatingText(80, PLAYFIELD_HEIGHT - 18, '+NẠP ⚡', '#4ade80', 12);
    if (game.gasTimer <= 0.0) {
        timerEnded();
    }
    updateControllerUI();
});

window.buyUnit1 = function() {
    if (game.inMenu || game.gameOver || game.paused || game.gasCount < 3) return;
    game.gasCount -= 3;
    game.stats.spawned++;

    spawnFreeUnit('blue', 1);
    sfx.play('spawn');
    updateControllerUI();
};

window.buyUnit2 = function() {
    if (game.inMenu || game.gameOver || game.paused || game.gasCount < 5) return;
    game.gasCount -= 5;
    game.stats.spawned++;

    spawnFreeUnit('blue', 2);
    sfx.play('spawn');
    updateControllerUI();
};

window.buyUnit3 = function() {
    if (game.inMenu || game.gameOver || game.paused || game.gasCount < 8) return;
    game.gasCount -= 8;
    game.stats.spawned++;
    attackPlane('blue');
    updateControllerUI();
};

/**
 * Xuất quân trực tiếp từ căn cứ với độ xòe tự nhiên (không ràng buộc 3 làn)
 */
function spawnFreeUnit(team, unitType, customX = null, customY = null) {
    const spec = UNIT_SPECS[unitType];
    const isBlue = team === 'blue';
    const base = isBlue ? game.blueBase : game.redBase;

    let spawnX = customX;
    if (spawnX === null) {
        if (isBlue && game.rallyX !== null) {
            spawnX = game.rallyX + (Math.random() * 32 - 16);
        } else {
            const gateWidth = base.width - 50;
            spawnX = (base.x - gateWidth / 2) + Math.random() * gateWidth;
        }
    }
    spawnX = Math.max(38, Math.min(LOGICAL_WIDTH - 38, spawnX));

    const spawnY = customY !== null ? customY : (isBlue ? base.y - 36 : base.y + 36);

    game.units.push({
        id: Math.random().toString(36).slice(2),
        team: team,
        tag: isBlue ? 'BlueUnit' : 'RedUnit',
        type: unitType,
        x: spawnX,
        y: spawnY,
        vx: 0,
        hp: spec.hp,
        maxHp: spec.hp,
        moveSpeed: spec.speed + (Math.random() * 6 - 3),
        damage: spec.damage,
        targetTime: unitType === 2 ? 1.1 : 0.8,
        fireRate: spec.fireRate,
        beamActiveTimer: 0,
        shoot: false,
        range: spec.range,
        radius: spec.radius,
        walkCycle: Math.random() * Math.PI * 2,
        recoil: 0
    });

    spawnExplosion(spawnX, spawnY, isBlue ? '#60a5fa' : '#f87171', 7, 16);
}

function attackPlane(team) {
    const isBlue = team === 'blue';
    sfx.play('airstrike');

    game.planes.push({
        team: team,
        tag: isBlue ? 'goodU3Weapon' : 'enemyU3Weapon',
        x: LOGICAL_WIDTH / 2,
        y: isBlue ? PLAYFIELD_HEIGHT + 55 : -55,
        vy: isBlue ? -350 : 350,
        hitEntities: new Set()
    });

    addFloatingText(
        LOGICAL_WIDTH / 2,
        isBlue ? PLAYFIELD_HEIGHT - 120 : 120,
        isBlue ? '✈️ BLUE OANH TẠC!' : '⚠️ RED OANH TẠC!',
        isBlue ? '#38bdf8' : '#f87171',
        15
    );
}

function updateEnemyAI(dt) {
    const cfg = LEVELS[game.currentLevel - 1] || LEVELS[0];

    game.aiGasTimer += dt;
    if (game.aiGasTimer >= cfg.aiGasInterval) {
        game.aiGasTimer -= cfg.aiGasInterval;
        game.aiGas = Math.min(25, game.aiGas + 1);
    }

    game.aiPlaneTimer -= dt;
    if (game.aiPlaneTimer <= 0) {
        game.aiPlaneTimer = cfg.aiPlaneInterval;
        if (game.currentLevel >= 2) {
            attackPlane('red');
        }
    }

    game.aiDecisionTimer -= dt;
    if (game.aiDecisionTimer <= 0) {
        game.aiDecisionTimer = 0.85 + Math.random() * 0.7;

        if (Math.random() < cfg.aiTankChance && game.aiGas >= 5) {
            game.aiGas -= 5;
            spawnFreeUnit('red', 2);
        } else if (game.aiGas >= 3) {
            game.aiGas -= 3;
            spawnFreeUnit('red', 1);
        }
    }
}

/**
 * Tìm mục tiêu đối địch trong tầm bắn
 */
function findTargetForUnit(unit) {
    const enemyTeam = unit.team === 'blue' ? 'red' : 'blue';
    const enemyBase = unit.team === 'blue' ? game.redBase : game.blueBase;
    const dir = unit.team === 'blue' ? -1 : 1;

    let nearestTarget = null;
    let minDistance = Infinity;

    for (const other of game.units) {
        if (other.team !== enemyTeam || other.hp <= 0) continue;
        const dy = (other.y - unit.y) * dir;
        const dx = Math.abs(other.x - unit.x);

        if (dy >= -10 && dy <= unit.range + other.radius && dx <= 38) {
            const dist = Math.hypot(dx, dy);
            if (dist < minDistance) {
                minDistance = dist;
                nearestTarget = { isBase: false, entity: other };
            }
        }
    }

    if (nearestTarget) return nearestTarget;

    const baseEdgeY = enemyTeam === 'red'
        ? enemyBase.y + enemyBase.height / 2
        : enemyBase.y - enemyBase.height / 2;
    const distToBase = (baseEdgeY - unit.y) * dir;
    const dxBase = Math.abs(unit.x - enemyBase.x);

    if (distToBase >= -10 && distToBase <= unit.range && dxBase <= enemyBase.width / 2 + 10) {
        return { isBase: true, entity: enemyBase, hitY: baseEdgeY };
    }

    return null;
}

function applyDamageToTarget(targetObj, damage, weaponTag) {
    if (!targetObj || !targetObj.entity) return;
    targetObj.entity.hp = Math.max(0, targetObj.entity.hp - damage);

    const tx = targetObj.isBase ? targetObj.entity.x + (Math.random() * 60 - 30) : targetObj.entity.x;
    const ty = targetObj.isBase ? targetObj.entity.y : targetObj.entity.y - 12;

    addFloatingText(tx, ty, `-${damage}`, weaponTag.startsWith('good') ? '#38bdf8' : '#fb7185', 13);
    spawnExplosion(tx, ty, '#fde047', 5, 12);

    if (targetObj.isBase) {
        checkGameOver();
    }
}

/**
 * Cơ chế đi thẳng và Chen nhau đánh (Crowd Jostling & Separation Physics)
 */
function updateUnits(dt) {
    // 1. Phản lực đàn hồi giữa các đơn vị lính khi chạm nhau (Chen lấn 2D)
    for (let i = 0; i < game.units.length; i++) {
        const u1 = game.units[i];
        for (let j = i + 1; j < game.units.length; j++) {
            const u2 = game.units[j];
            const dx = u2.x - u1.x;
            const dy = u2.y - u1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = u1.radius + u2.radius + 3;

            if (dist < minDist && dist > 0.001) {
                const overlap = (minDist - dist) * 0.5;
                const nx = dx / dist;
                const ny = dy / dist;

                // Đồng đội chen nhau: ưu tiên đẩy dạt mạnh sang ngang (trục X) để hàng quân tràn rộng
                const xPushMultiplier = (u1.team === u2.team) ? 1.8 : 1.0;

                u1.x -= nx * overlap * xPushMultiplier;
                u2.x += nx * overlap * xPushMultiplier;

                u1.y -= ny * overlap * 0.4;
                u2.y += ny * overlap * 0.4;
            }
        }
    }

    // 2. Di chuyển tiến thẳng, né đồng đội và tấn công
    for (let i = game.units.length - 1; i >= 0; i--) {
        const u = game.units[i];
        if (u.hp <= 0) {
            const color = u.team === 'blue' ? '#3b82f6' : '#ef4444';
            spawnExplosion(u.x, u.y, color, u.type === 2 ? 20 : 12, u.type === 2 ? 30 : 18);
            sfx.play(u.type === 2 ? 'boom' : 'cannon');
            if (u.team === 'red') game.stats.kills++;
            game.units.splice(i, 1);
            continue;
        }

        // Giữ lính trong ranh giới sân chơi
        u.x = Math.max(34, Math.min(LOGICAL_WIDTH - 34, u.x));

        if (u.recoil > 0) u.recoil = Math.max(0, u.recoil - dt * 15);
        if (u.beamActiveTimer > 0) u.beamActiveTimer = Math.max(0, u.beamActiveTimer - dt);
        u.targetTime -= dt;

        const target = findTargetForUnit(u);

        if (target) {
            u.shoot = true;
            if (u.type === 1) {
                if (u.targetTime <= 0) {
                    u.targetTime = u.fireRate;
                    u.beamActiveTimer = UNIT_SPECS[1].beamDuration;
                    u.recoil = 3;
                    sfx.play('beam');
                    const weaponTag = u.team === 'blue' ? 'goodU1Weapon' : 'enemyU1Weapon';
                    applyDamageToTarget(target, u.damage, weaponTag);
                }
            } else if (u.type === 2) {
                if (u.targetTime <= 0) {
                    u.targetTime = 1.25;
                    u.recoil = 4.5;
                    spawnTankBullet(u);
                }
            }
        } else {
            u.shoot = false;
            const dir = u.team === 'blue' ? -1 : 1;

            // Kiểm tra đồng minh ở ngay phía trước để lách sang hai bên (chen nhau lên đánh)
            let avoidForceX = 0;
            let forwardBlocked = false;

            for (const ally of game.units) {
                if (ally === u || ally.team !== u.team) continue;
                const dy = (ally.y - u.y) * dir;
                const dx = ally.x - u.x;

                // Đồng đội ở ngay trước mặt trong cự ly ngắn
                if (dy > 0 && dy < u.radius + ally.radius + 14 && Math.abs(dx) < u.radius + ally.radius + 6) {
                    if (ally.shoot || dy < u.radius + ally.radius + 4) {
                        forwardBlocked = true;
                        // Quyết định lách trái hay lách phải
                        avoidForceX += (dx >= 0 ? -1 : 1) * 36;
                    }
                }
            }

            u.x += avoidForceX * dt;

            // Nếu không bị kẹt cứng hoàn toàn, lính tiếp tục tiến thẳng lên phía trước
            if (!forwardBlocked) {
                u.y += dir * u.moveSpeed * dt;
            } else {
                u.y += dir * (u.moveSpeed * 0.25) * dt;
            }

            u.walkCycle += dt * 9;
        }
    }
}

function spawnTankBullet(tank) {
    const isBlue = tank.team === 'blue';
    const dir = isBlue ? -1 : 1;
    const bx = tank.x;
    const by = tank.y + dir * (tank.radius + 8);

    sfx.play('cannon');
    spawnExplosion(bx, by, '#fde047', 5, 10);

    game.bullets.push({
        team: tank.team,
        tag: isBlue ? 'goodU2Weapon' : 'enemyU2Weapon',
        x: bx,
        y: by,
        vy: dir * UNIT_SPECS[2].projSpeed,
        damage: tank.damage,
        radius: UNIT_SPECS[2].projRadius
    });
}

function updateBullets(dt) {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const b = game.bullets[i];
        b.y += b.vy * dt;

        const enemyTeam = b.team === 'blue' ? 'red' : 'blue';
        const enemyBase = b.team === 'blue' ? game.redBase : game.blueBase;
        let hitSomething = false;

        for (const u of game.units) {
            if (u.team !== enemyTeam || u.hp <= 0) continue;
            if (Math.hypot(u.x - b.x, u.y - b.y) <= u.radius + b.radius + 4) {
                u.hp -= b.damage;
                spawnExplosion(b.x, b.y, '#fb923c', 10, 20);
                addFloatingText(u.x, u.y - 14, `-${b.damage}`, '#fde047', 13);
                hitSomething = true;
                break;
            }
        }

        if (!hitSomething) {
            const inBaseX = Math.abs(b.x - enemyBase.x) <= enemyBase.width / 2;
            const inBaseY = Math.abs(b.y - enemyBase.y) <= enemyBase.height / 2;
            if (inBaseX && inBaseY) {
                enemyBase.hp = Math.max(0, enemyBase.hp - b.damage);
                spawnExplosion(b.x, b.y, '#f97316', 12, 24);
                addFloatingText(b.x, enemyBase.y, `-${b.damage}`, '#f87171', 14);
                checkGameOver();
                hitSomething = true;
            }
        }

        if (hitSomething || b.y < -20 || b.y > PLAYFIELD_HEIGHT + 20) {
            game.bullets.splice(i, 1);
        }
    }
}

function updatePlanes(dt) {
    for (let i = game.planes.length - 1; i >= 0; i--) {
        const plane = game.planes[i];
        plane.y += plane.vy * dt;

        const enemyTeam = plane.team === 'blue' ? 'red' : 'blue';
        const enemyBase = plane.team === 'blue' ? game.redBase : game.blueBase;

        for (const u of game.units) {
            if (u.team !== enemyTeam || u.hp <= 0) continue;
            if (!plane.hitEntities.has(u.id) && Math.abs(u.y - plane.y) <= 30) {
                plane.hitEntities.add(u.id);
                u.hp -= UNIT_SPECS[3].unitDamage;
                spawnExplosion(u.x, u.y, '#f97316', 18, 36);
                addFloatingText(u.x, u.y - 14, `-${UNIT_SPECS[3].unitDamage} ✈️`, '#fb923c', 15);
                sfx.play('boom');
                triggerShake(0.18, 5);
            }
        }

        if (!plane.hitEntities.has('base') && Math.abs(enemyBase.y - plane.y) <= 34) {
            plane.hitEntities.add('base');
            enemyBase.hp = Math.max(0, enemyBase.hp - UNIT_SPECS[3].baseDamage);
            spawnExplosion(enemyBase.x, enemyBase.y, '#ef4444', 28, 52);
            addFloatingText(enemyBase.x, enemyBase.y, `-${UNIT_SPECS[3].baseDamage} 💥`, '#ef4444', 17);
            sfx.play('boom');
            triggerShake(0.25, 7);
            checkGameOver();
        }

        if ((plane.team === 'blue' && plane.y < -90) || (plane.team === 'red' && plane.y > PLAYFIELD_HEIGHT + 90)) {
            game.planes.splice(i, 1);
        }
    }
}

function spawnExplosion(x, y, color, count = 12, maxRadius = 24) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 20 + Math.random() * (maxRadius * 3);
        game.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2.5 + Math.random() * 4,
            color: i % 3 === 0 ? '#fde047' : color,
            alpha: 1,
            life: 0.25 + Math.random() * 0.22
        });
    }
}

function addFloatingText(x, y, text, color = '#fff', size = 12) {
    game.floatingTexts.push({
        x,
        y,
        text,
        color,
        size,
        alpha: 1,
        life: 0.75
    });
}

function triggerShake(duration, intensity) {
    game.shakeTime = Math.max(game.shakeTime, duration);
    game.shakeIntensity = Math.max(game.shakeIntensity, intensity);
}

function updateEffects(dt) {
    if (game.shakeTime > 0) {
        game.shakeTime = Math.max(0, game.shakeTime - dt);
    }

    for (let i = game.particles.length - 1; i >= 0; i--) {
        const pt = game.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        pt.alpha = Math.max(0, pt.life * 2.5);
        if (pt.life <= 0) game.particles.splice(i, 1);
    }

    for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
        const ft = game.floatingTexts[i];
        ft.y -= 28 * dt;
        ft.life -= dt;
        ft.alpha = Math.max(0, ft.life / 0.75);
        if (ft.life <= 0) game.floatingTexts.splice(i, 1);
    }
}

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function checkGameOver() {
    if (game.gameOver) return;

    if (game.redBase.hp <= 0) {
        game.redBase.hp = 0;
        game.gameOver = true;
        completedLevels.add(game.currentLevel);
        spawnExplosion(game.redBase.x, game.redBase.y, '#ef4444', 45, 70);
        sfx.play('boom');

        document.getElementById('win-subtitle').textContent = `Hoàn thành Cấp độ ${game.currentLevel}! Căn cứ Đỏ đã bị phá hủy!`;
        document.getElementById('win-time').textContent = formatTime(game.elapsedTime);
        document.getElementById('win-hp').textContent = `${Math.ceil(game.blueBase.hp)} / ${game.blueBase.maxHp}`;
        document.getElementById('win-spawned').textContent = game.stats.spawned;
        document.getElementById('win-kills').textContent = game.stats.kills;
        document.getElementById('win-panel').classList.add('active');
        updateControllerUI();
    } else if (game.blueBase.hp <= 0) {
        game.blueBase.hp = 0;
        game.gameOver = true;
        spawnExplosion(game.blueBase.x, game.blueBase.y, '#3b82f6', 45, 70);
        sfx.play('boom');

        document.getElementById('lose-time').textContent = formatTime(game.elapsedTime);
        document.getElementById('lose-hp').textContent = `${Math.ceil(game.redBase.hp)} / ${game.redBase.maxHp}`;
        document.getElementById('lose-spawned').textContent = game.stats.spawned;
        document.getElementById('lose-kills').textContent = game.stats.kills;
        document.getElementById('lose-panel').classList.add('active');
        updateControllerUI();
    }
}

window.restartGame = function() {
    startLevel(game.currentLevel);
};

window.nextOrRestartLevel = function() {
    const nextLv = game.currentLevel < LEVELS.length ? game.currentLevel + 1 : 1;
    startLevel(nextLv);
};

/**
 * Bản đồ mở (Không còn chia 3 làn cố định)
 */
function drawMapBackground() {
    const grassGrad = ctx.createLinearGradient(0, 0, 0, PLAYFIELD_HEIGHT);
    grassGrad.addColorStop(0, '#438b3a');
    grassGrad.addColorStop(0.5, '#4c9941');
    grassGrad.addColorStop(1, '#3d8134');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);

    // Bãi đất trung tâm rộng lớn cho quân tràn lên
    ctx.fillStyle = 'rgba(180, 145, 90, 0.22)';
    ctx.fillRect(40, 80, LOGICAL_WIDTH - 80, PLAYFIELD_HEIGHT - 160);

    // Vạch biên chiến trường mềm mại
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 10]);
    ctx.strokeRect(42, 82, LOGICAL_WIDTH - 84, PLAYFIELD_HEIGHT - 164);
    ctx.setLineDash([]);

    // Con đường cắt ngang chiến tuyến
    const roadY = PLAYFIELD_HEIGHT / 2 - 24;
    const roadH = 48;

    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, roadY - 3, LOGICAL_WIDTH, roadH + 6);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, roadY, LOGICAL_WIDTH, roadH);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 14]);
    ctx.beginPath();
    ctx.moveTo(0, roadY + roadH / 2);
    ctx.lineTo(LOGICAL_WIDTH, roadY + roadH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Nếu người chơi đặt tiêu điểm xuất quân
    if (game.rallyX !== null) {
        ctx.beginPath();
        ctx.arc(game.rallyX, game.blueBase.y - 42, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px Chakra Petch';
        ctx.textAlign = 'center';
        ctx.fillText('MŨI XUẤT', game.rallyX, game.blueBase.y - 42);
    }

    // Cây cối hai bên rìa
    decorativeTrees.forEach(t => {
        ctx.beginPath();
        ctx.arc(t.x + 3, t.y + 4, t.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = t.shade;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e4620';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(t.x - 3, t.y - 3, t.r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = '#4ade80';
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

function drawBase(base) {
    const isBlue = base.team === 'blue';
    const x = base.x - base.width / 2;
    const y = base.y - base.height / 2;

    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 5, base.width, base.height, 14);
    ctx.fill();

    const grad = ctx.createLinearGradient(x, y, x, y + base.height);
    if (isBlue) {
        grad.addColorStop(0, '#2563eb');
        grad.addColorStop(1, '#1d4ed8');
    } else {
        grad.addColorStop(0, '#dc2626');
        grad.addColorStop(1, '#991b1b');
    }

    ctx.fillStyle = grad;
    ctx.strokeStyle = isBlue ? '#93c5fd' : '#fca5a5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, base.width, base.height, 14);
    ctx.fill();
    ctx.stroke();

    // Cửa xuất quân lớn ở giữa căn cứ
    const gateW = base.width - 44;
    const gateH = 10;
    const gateY = isBlue ? y - 2 : y + base.height - 8;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(base.x - gateW / 2, gateY, gateW, gateH, 4);
    ctx.fill();

    // Thanh máu căn cứ
    const barW = 204;
    const barH = 18;
    const barX = base.x - barW / 2;
    const barY = base.y - barH / 2;
    const hpRatio = Math.max(0, base.hp / base.maxHp);

    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();

    ctx.fillStyle = isBlue ? '#38bdf8' : '#f43f5e';
    if (hpRatio > 0) {
        ctx.beginPath();
        ctx.roundRect(barX + 2, barY + 2, (barW - 4) * hpRatio, barH - 4, 4);
        ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Chakra Petch';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        `${isBlue ? 'CĂN CỨ XANH' : 'PHÁO ĐÀI ĐỎ'}: ${Math.ceil(base.hp)} / ${base.maxHp}`,
        base.x,
        barY + barH / 2 + 0.5
    );

    ctx.restore();
}

function drawUnits() {
    for (const u of game.units) {
        const isBlue = u.team === 'blue';
        const dir = isBlue ? -1 : 1;
        const recoilOffset = -dir * u.recoil;

        ctx.save();
        ctx.translate(u.x, u.y + recoilOffset);

        if (u.type === 1) {
            const bob = Math.sin(u.walkCycle) * 2;

            if (u.beamActiveTimer > 0) {
                ctx.fillStyle = isBlue ? 'rgba(56, 189, 248, 0.85)' : 'rgba(248, 113, 113, 0.85)';
                const beamH = 26;
                const beamY = isBlue ? -u.radius - beamH : u.radius;
                ctx.beginPath();
                ctx.roundRect(-5, beamY, 10, beamH, 3);
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(2, 4, u.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fill();

            ctx.fillStyle = isBlue ? '#1d4ed8' : '#b91c1c';
            ctx.strokeStyle = isBlue ? '#93c5fd' : '#fca5a5';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.roundRect(-11, -6 + bob * 0.5, 22, 12, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(5, dir * 4 - 4, 3.5, dir * 13);

            ctx.beginPath();
            ctx.arc(0, bob, 8.5, 0, Math.PI * 2);
            ctx.fillStyle = isBlue ? '#3b82f6' : '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else if (u.type === 2) {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.roundRect(-18, -18, 38, 40, 6);
            ctx.fill();

            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.fillRect(-19, -19, 7, 38);
            ctx.strokeRect(-19, -19, 7, 38);
            ctx.fillRect(12, -19, 7, 38);
            ctx.strokeRect(12, -19, 7, 38);

            ctx.fillStyle = isBlue ? '#2563eb' : '#dc2626';
            ctx.strokeStyle = isBlue ? '#93c5fd' : '#fca5a5';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-13, -15, 26, 30, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#e2e8f0';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.5;
            const barrelY = isBlue ? -27 : 8;
            ctx.fillRect(-3, barrelY, 6, 19);
            ctx.strokeRect(-3, barrelY, 6, 19);

            ctx.beginPath();
            ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
            ctx.fillStyle = isBlue ? '#1e40af' : '#991b1b';
            ctx.fill();
            ctx.strokeStyle = '#f8fafc';
            ctx.stroke();
        }

        if (u.hp < u.maxHp) {
            const bw = u.type === 2 ? 34 : 24;
            const bh = 4.5;
            const by = -u.radius - 10;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(-bw / 2, by, bw, bh);
            ctx.fillStyle = isBlue ? '#38bdf8' : '#f87171';
            ctx.fillRect(-bw / 2 + 1, by + 1, (bw - 2) * Math.max(0, u.hp / u.maxHp), bh - 2);
        }

        ctx.restore();
    }
}

function drawBullets() {
    for (const b of game.bullets) {
        const isBlue = b.team === 'blue';
        ctx.save();
        ctx.fillStyle = isBlue ? '#38bdf8' : '#f87171';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2, 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

function drawPlanes() {
    for (const plane of game.planes) {
        const isBlue = plane.team === 'blue';
        ctx.save();
        ctx.translate(plane.x, plane.y);
        if (!isBlue) ctx.rotate(Math.PI);

        ctx.save();
        ctx.translate(26, 32);
        ctx.scale(0.85, 0.85);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        drawBomberShape();
        ctx.restore();

        ctx.fillStyle = isBlue ? '#0284c7' : '#b91c1c';
        ctx.strokeStyle = isBlue ? '#bae6fd' : '#fecaca';
        ctx.lineWidth = 2.5;
        drawBomberShape();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.ellipse(0, -18, 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

function drawBomberShape() {
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(10, -18);
    ctx.lineTo(145, 6);
    ctx.lineTo(145, 18);
    ctx.lineTo(10, 10);
    ctx.lineTo(7, 34);
    ctx.lineTo(24, 44);
    ctx.lineTo(24, 50);
    ctx.lineTo(0, 44);
    ctx.lineTo(-24, 50);
    ctx.lineTo(-24, 44);
    ctx.lineTo(-7, 34);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-145, 18);
    ctx.lineTo(-145, 6);
    ctx.lineTo(-10, -18);
    ctx.closePath();
}

function drawEffects() {
    for (const pt of game.particles) {
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    for (const ft of game.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = `800 ${ft.size}px Chakra Petch`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }
}

let lastFrameTime = performance.now();

function gameLoop(now) {
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (!game.inMenu && !game.paused && !game.gameOver) {
        game.elapsedTime += dt;

        game.gasTimer -= dt;
        if (game.gasTimer <= 0.0) {
            timerEnded();
        }
        updateControllerUI();

        updateEnemyAI(dt);
        updateUnits(dt);
        updateBullets(dt);
        updatePlanes(dt);
    }

    updateEffects(dt);

    ctx.save();
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    if (game.shakeTime > 0) {
        const dx = (Math.random() - 0.5) * game.shakeIntensity * 2;
        const dy = (Math.random() - 0.5) * game.shakeIntensity * 2;
        ctx.translate(dx, dy);
    }

    drawMapBackground();
    drawBase(game.redBase);
    drawBase(game.blueBase);
    drawUnits();
    drawBullets();
    drawPlanes();
    drawEffects();

    if (game.paused && !game.gameOver && !game.inMenu) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.fillRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px Chakra Petch';
        ctx.textAlign = 'center';
        ctx.fillText('TẠM DỪNG (PAUSED)', LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2);
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// Chạm trên sân để điều hướng mũi xuất quân hoặc bấm vào căn cứ để trở về xuất toàn cổng
canvas.addEventListener('pointerdown', (e) => {
    if (game.inMenu || game.gameOver || game.paused) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;

    if (clickY < PLAYFIELD_HEIGHT) {
        if (clickY > game.blueBase.y - 20) {
            game.rallyX = null;
            addFloatingText(LOGICAL_WIDTH / 2, game.blueBase.y - 45, 'XUẤT TOÀN CỔNG', '#38bdf8', 13);
        } else {
            game.rallyX = Math.max(50, Math.min(LOGICAL_WIDTH - 50, clickX));
            addFloatingText(game.rallyX, game.blueBase.y - 50, 'ĐÃ ĐẶT MŨI TIẾN CÔNG', '#4ade80', 12);
        }
    }
});

window.addEventListener('keydown', (e) => {
    if (game.inMenu) return;
    if (e.key === '1') buyUnit1();
    if (e.key === '2') buyUnit2();
    if (e.key === '3') buyUnit3();
    if (e.key.toLowerCase() === 'u' || e.key === '4') upgradeGasRate();
    if (e.code === 'Space') {
        e.preventDefault();
        document.getElementById('gas-generator-btn').click();
    }
});

document.getElementById('sound-btn').addEventListener('click', (e) => {
    sfx.enabled = !sfx.enabled;
    e.currentTarget.textContent = sfx.enabled ? '🔊' : '🔇';
});

document.getElementById('pause-btn').addEventListener('click', (e) => {
    if (game.inMenu || game.gameOver) return;
    game.paused = !game.paused;
    e.currentTarget.textContent = game.paused ? '▶' : '⏸';
});

window.onload = function() {
    renderLevelGrid();
    updateControllerUI();
    requestAnimationFrame(gameLoop);
};