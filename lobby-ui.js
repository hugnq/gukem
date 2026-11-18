/* ============================================================================
   TINY BATTLE - LOBBY UI, WORLD CAMPAIGN ROADMAP, SANDBOX & SKILL TREE (js/lobby-ui.js)
   54 Campaign Levels (6 Biomes) • Auto-Zoom Mini World-Map (2.45x) •
   Cloud-Dive Camera Zoom Transition (3 Phases) • Pan & Pinch Zoom •
   Stage Action Popover • Lerp Currency Counters + Delta Toasts •
   Holographic 3D Card Tilt • 18 Units & 41 Rarities
   ============================================================================ */

import {
    ADMIN_PASSWORD,
    WORLD_MAP_WIDTH,
    WORLD_MAP_HEIGHT,
    TOTAL_CAMPAIGN_LEVELS,
    MAX_CAMPAIGN_STARS,
    WORLD_BIOMES,
    WORLD_BIOME_BY_ID,
    RARITY_ORDER,
    MAX_RARITY_RANK,
    RARITY_CONFIG,
    isMasterRarity,
    isDemonRarity,
    LEVELS,
    UNIT_CATALOG,
    UNIT_BY_ID,
    CRATE_CONFIG,
    MAX_CRATE_OPEN_QTY,
    META_TALENTS,
    UNIT_CHIPS,
    CHIP_SOCKET_2_UNLOCK_GEMS,
    CHIP_BUY_COST_COINS,
    CHIP_BUY_COST_GEMS,
    LUCKY_WHEEL_CONFIG,
    MINIGAME_CONFIG,
    BASE_TURRET_CONFIG,
    getBaseTurretUpgradeCost,
    CODEX_MILESTONES,
    SKILL_TREE_BRANCHES,
    ANCIENT_SKILL_TREE,
    ANCIENT_TREE_BRANCH_LINES,
    getSkillTreeNodeCost,
    calcStageRewardCoins,
    calcChallengeEntryCostCoins,
    calcChallengeRewards,
    MISSIONS_CATALOG,
    GIFT_CODES,
    OFFICIAL_GIFTCODES,
    GIFTCODE_REWARD_GEMS,
    GIFTCODE_REWARD_COINS,
    GIFTCODE_REWARD_MEDALS,
    GIFTCODE_REWARD_PEARLS
} from './config.js';

import {
    triggerHaptic,
    formatCompactNumber,
    calcCrateBatchPrice,
    simulateMassiveCrateOpening,
    calcBulkUpgradeTotalCost,
    calcMaxAffordableLevels
} from './math.js';

import {
    metaState,
    PRIMARY_INFANTRY_ID,
    normalizeUnitId,
    addCardToStacks,
    syncRepresentativeInventoryFromStacks,
    getTotalCardsInInventory,
    getMaxUnlockedMapLevel,
    getCurrentCampaignLevel,
    getStageStars,
    getTotalCampaignStars,
    isDifficultyCleared,
    isDifficultyUnlocked,
    getDefaultDifficultyForMap,
    isChallengeMapCleared,
    isChallengeMapUnlocked,
    getSkillTreeNodeLevel,
    isSkillTreeNodeUnlocked,
    canUpgradeSkillTreeNode,
    upgradeSkillTreeNode,
    getAncientSkillTreeBonuses,
    getHighestRarityForUnit,
    getHighestEverRarityRankForUnit,
    hasClaimableCodexMilestones,
    hasUnitInInventory,
    calcTotalRefundCoins,
    getUpgradeTierBracketText,
    formatCurrency,
    saveProgress,
    resetAllAccountData,
    isUnitSocket2Unlocked,
    unlockUnitSocket2,
    getChipOwnedCount,
    buyChipItem,
    equipChipToUnitSlot,
    unequipChipFromUnitSlot
} from './state.js';

import {
    sfx,
    getUnitSpriteDataURL,
    drawUnitArt,
    drawBaseTurretArt,
    populateProceduralUIIcons
} from './engine-core.js';

import {
    renderMap,
    buildWorldCampaignCanvas,
    renderWorldCampaignDynamicOverlay
} from './map-nav.js';

let startBattleHandlerRef = null;

export const lobbyState = {
    activeTab: 'battle',
    armyMode: 'army', // 'army' | 'review' | 'merge'
    selectedMapLevel: 1,
    selectedDifficulty: 'easy',
    selectedMode: 'destroy',
    selectedShowcaseUnitId: PRIMARY_INFANTRY_ID,
    selectedUpgradeUnitId: PRIMARY_INFANTRY_ID,
    pendingUpgradeAddLevels: 1,
    activeChipSocketIdx: null,
    mergeSlot1Uid: null,
    pendingCustomGacha: null,
    activeSkillTreeNodeId: 'fp_1',
    activeSkillTreeBranch: 'firepower',

    // Hiệu ứng số chạy mượt (Lerp Counter) & Toast bay lên cho 4 loại tiền tệ
    currencyAnim: {
        initialized: false,
        pearls: 0,
        medals: 0,
        gems: 0,
        coins: 0,
        lastKnownPearls: 0,
        lastKnownMedals: 0,
        lastKnownGems: 0,
        lastKnownCoins: 0
    },

    // Camera Auto-Zoom Mini World-Map ở sảnh Tab BATTLE (Zoom 2.45x)
    miniWorldCam: {
        x: Math.round(0.125 * WORLD_MAP_WIDTH),
        y: Math.round(0.655 * WORLD_MAP_HEIGHT),
        zoom: 2.45
    },

    // Camera Pan, Pinch Zoom & Cloud-Dive Transition 60-120 FPS (1440x900)
    worldCam: {
        isOpen: false,
        x: 255,
        y: 500,
        targetX: 255,
        targetY: 500,
        zoom: 0.92,
        targetZoom: 0.92,
        vx: 0,
        vy: 0,
        isDragging: false,
        dragMoved: false,
        lastPointerX: 0,
        lastPointerY: 0,
        activePointers: new Map(),
        initialPinchDist: 0,
        initialPinchZoom: 1,
        popoverLevel: null,
        popoverDiff: 'easy',
        popoverMode: 'destroy',

        // Trạng thái Cloud-Dive Camera Zoom Transition (3 pha: 0.0s -> 1.15s)
        cloudDive: {
            active: false,
            elapsed: 0,
            duration: 1.15,
            startX: WORLD_MAP_WIDTH * 0.5,
            startY: WORLD_MAP_HEIGHT * 0.5,
            endX: 255,
            endY: 500,
            startZoom: 0.58,
            endZoom: 2.10,
            targetLevel: 1,
            cloudsSplit: false
        }
    },

    // Phòng tập bắn thử Sandbox (#sandbox-review-modal)
    sandbox: {
        active: false,
        unitId: PRIMARY_INFANTRY_ID,
        rarityId: 'common',
        rafId: null,
        lastTs: 0,
        timeSec: 0,
        fireTimer: 0,
        recoil: 0,
        totalDamageDealt: 0,
        elapsedTestSec: 0,
        projectiles: [],
        beams: [],
        particles: [],
        floatingDmg: [],
        dummyHitFlash: 0
    }
};

// ============================================================================
// 1. HIỆU ỨNG HÀO QUANG MASTER & DEMON (2 VÒNG ELIP + TIA SÉT TÍM HẮC ÁM)
// ============================================================================
export function drawCanvasRarityAura(ctx, cx, cy, baseRadius, rarityId, timeSec = 0) {
    if (!rarityId) return;
    const isMaster = isMasterRarity(rarityId);
    const isDemon = isDemonRarity(rarityId);
    if (!isMaster && !isDemon) return;

    ctx.save();
    ctx.translate(cx, cy);

    if (isMaster) {
        const grad = ctx.createRadialGradient(0, 0, baseRadius * 0.2, 0, 0, baseRadius * 1.45);
        grad.addColorStop(0, 'rgba(0, 242, 254, 0.58)');
        grad.addColorStop(0.55, 'rgba(2, 132, 199, 0.35)');
        grad.addColorStop(1, 'rgba(0, 30, 77, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, baseRadius * 1.45, baseRadius * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();

        for (let ring = 0; ring < 2; ring++) {
            ctx.save();
            ctx.scale(1, 0.52);
            ctx.rotate(timeSec * (ring === 0 ? 3.2 : -2.4));
            ctx.strokeStyle = ring === 0 ? '#00f2fe' : '#38bdf8';
            ctx.lineWidth = ring === 0 ? 2.5 : 1.8;
            ctx.setLineDash([10, 6]);
            ctx.beginPath();
            ctx.arc(0, 0, baseRadius * (1.05 + ring * 0.22), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = 0; i < 6; i++) {
            const a = timeSec * 3.8 + (i * Math.PI * 2) / 6;
            const ox = Math.cos(a) * (baseRadius * 1.15);
            const oy = Math.sin(a) * (baseRadius * 0.55) - Math.abs(Math.sin(timeSec * 5 + i)) * 5;
            ctx.fillStyle = i % 2 === 0 ? '#e0f2fe' : '#00f2fe';
            ctx.beginPath();
            ctx.arc(ox, oy, 3.0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (isDemon) {
        const grad = ctx.createRadialGradient(0, 0, baseRadius * 0.15, 0, 0, baseRadius * 1.6);
        grad.addColorStop(0, 'rgba(240, 171, 252, 0.68)');
        grad.addColorStop(0.5, 'rgba(147, 51, 234, 0.45)');
        grad.addColorStop(1, 'rgba(9, 0, 20, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, baseRadius * 1.6, baseRadius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.scale(1, 0.54);
        ctx.rotate(-timeSec * 2.8);
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        const rOuter = baseRadius * 1.28;
        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            const px = Math.cos(a) * rOuter;
            const py = Math.sin(a) * rOuter;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, rOuter * 0.82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 3 Tia sét tím giật quanh bệ đứng Demon
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 1.6;
        for (let b = 0; b < 3; b++) {
            const seed = Math.floor(timeSec * 14) + b * 17;
            const baseA = ((seed % 12) / 12) * Math.PI * 2;
            const sx = Math.cos(baseA) * (baseRadius * 0.95);
            const sy = Math.sin(baseA) * (baseRadius * 0.45);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + ((seed % 5) - 2) * 4, sy - 12);
            ctx.lineTo(sx + (((seed + 2) % 5) - 2) * 3, sy - 24);
            ctx.stroke();
        }
    }

    ctx.restore();
}

// ============================================================================
// 2. MỞ / ĐÓNG SẢNH, VÒNG LẶP ANIMATION LOBBY 60-120 FPS & LERP CURRENCY COUNTERS
// ============================================================================
let lobbyRafStarted = false;

export function openLobbyScreen(defaultTab = null) {
    const lobby = document.getElementById('lobby-wrapper');
    if (lobby) lobby.classList.add('active');
    document.getElementById('win-panel')?.classList.remove('active');
    document.getElementById('lose-panel')?.classList.remove('active');
    document.getElementById('draft-modal')?.classList.remove('active');

    populateProceduralUIIcons();
    updateLobbyTopBar();
    renderMissionNotifDot();
    renderBattleStageView();
    renderArmyTab();
    renderShopChipsSection();
    renderChallengeRoadmap();
    renderSkillTreeTab();

    if (!lobbyRafStarted) {
        lobbyRafStarted = true;
        let lastLobbyTs = performance.now();

        const lobbyLoop = now => {
            const dt = Math.min(0.05, Math.max(0.001, (now - lastLobbyTs) / 1000));
            lastLobbyTs = now;
            const timeSec = now * 0.001;

            const isLobbyActive = document.getElementById('lobby-wrapper')?.classList.contains('active');
            if (isLobbyActive) {
                stepAnimatedCurrencyCounters(dt);

                if (lobbyState.activeTab === 'army') {
                    renderArmyShowcase();
                } else if (lobbyState.activeTab === 'battle' && !lobbyState.worldCam.isOpen) {
                    updateAndDrawMiniWorldViewport(dt, timeSec);
                }

                if (lobbyState.worldCam.isOpen) {
                    updateAndDrawFullscreenWorldRoadmap(dt, timeSec);
                }
            }

            requestAnimationFrame(lobbyLoop);
        };
        requestAnimationFrame(lobbyLoop);
    }

    if (defaultTab) switchLobbyTab(defaultTab);
}

export function switchLobbyTab(tabName) {
    lobbyState.activeTab = tabName;
    const tabOrder = ['shop', 'army', 'battle', 'challenge', 'skilltree'];
    const idx = Math.max(0, tabOrder.indexOf(tabName));

    const slider = document.getElementById('bottom-nav-slider');
    if (slider) {
        slider.style.transform = `translateX(${idx * 100}%)`;
    }

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.lobby-tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `tab-${tabName}`);
    });

    if (tabName === 'army') renderArmyTab();
    if (tabName === 'shop') renderShopChipsSection();
    if (tabName === 'battle') renderBattleStageView();
    if (tabName === 'challenge') renderChallengeRoadmap();
    if (tabName === 'skilltree') renderSkillTreeTab();
}

function triggerCurrencyBump(pillId) {
    const el = document.getElementById(pillId);
    if (!el) return;
    el.classList.remove('currency-bump');
    void el.offsetWidth;
    el.classList.add('currency-bump');
    setTimeout(() => el.classList.remove('currency-bump'), 260);
}

function spawnCurrencyDeltaToast(icon, delta) {
    if (!delta || Math.abs(delta) < 1) return;
    const layer = document.getElementById('currency-float-layer');
    if (!layer) return;

    const toast = document.createElement('div');
    toast.className = 'currency-delta-toast';
    const isPositive = delta > 0;
    toast.style.color = isPositive ? '#4ade80' : '#fb7185';
    toast.style.borderColor = isPositive ? '#fde047' : '#fb7185';
    toast.textContent = `${isPositive ? '+' : ''}${Math.round(delta).toLocaleString('en-US')} ${icon}`;
    layer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 1060);
}

function stepAnimatedCurrencyCounters(dt) {
    if (metaState.isAdminMode) return;
    const anim = lobbyState.currencyAnim;
    const targets = {
        pearls: Math.max(0, Math.floor(Number(metaState.pearls) || 0)),
        medals: Math.max(0, Math.floor(Number(metaState.medals) || 0)),
        gems: Math.max(0, Math.floor(Number(metaState.gems) || 0)),
        coins: Math.max(0, Math.floor(Number(metaState.coins) || 0))
    };

    if (!anim.initialized) {
        anim.initialized = true;
        anim.pearls = targets.pearls;
        anim.medals = targets.medals;
        anim.gems = targets.gems;
        anim.coins = targets.coins;
        anim.lastKnownPearls = targets.pearls;
        anim.lastKnownMedals = targets.medals;
        anim.lastKnownGems = targets.gems;
        anim.lastKnownCoins = targets.coins;
        return;
    }

    const metaMap = {
        pearls: ['pearls-count-display', 'pearls-pill-box', '⚪', 'lastKnownPearls'],
        medals: ['medals-count-display', 'medals-pill-box', '🎖️', 'lastKnownMedals'],
        gems:   ['gems-count-display',   'gems-pill-box',   '💎', 'lastKnownGems'],
        coins:  ['coins-count-display',  'coins-pill-box',  '🪙', 'lastKnownCoins']
    };

    const lerpFactor = Math.min(1, dt * 14);
    for (const key of ['pearls', 'medals', 'gems', 'coins']) {
        const [dispId, pillId, icon, lastKey] = metaMap[key];
        const actualDelta = targets[key] - anim[lastKey];
        if (actualDelta !== 0) {
            anim[lastKey] = targets[key];
            triggerCurrencyBump(pillId);
            spawnCurrencyDeltaToast(icon, actualDelta);
        }

        const diff = targets[key] - anim[key];
        if (Math.abs(diff) >= 0.5) {
            anim[key] = Math.abs(diff) < 1.5 ? targets[key] : anim[key] + diff * lerpFactor;
            const el = document.getElementById(dispId);
            if (el) el.textContent = Math.round(anim[key]).toLocaleString('en-US');
        }
    }
}

export function updateLobbyTopBar() {
    const nameEl = document.getElementById('player-name-display');
    const coinsEl = document.getElementById('coins-count-display');
    const gemsEl = document.getElementById('gems-count-display');
    const medalsEl = document.getElementById('medals-count-display');
    const pearlsEl = document.getElementById('pearls-count-display');
    const stPearlsEl = document.getElementById('skilltree-pearls-balance');
    const adminTag = document.getElementById('admin-active-tag');
    const gearBtn = document.getElementById('btn-open-settings');
    const coinsPill = document.getElementById('coins-pill-box');
    const gemsPill = document.getElementById('gems-pill-box');
    const medalsPill = document.getElementById('medals-pill-box');
    const pearlsPill = document.getElementById('pearls-pill-box');

    if (nameEl) nameEl.textContent = metaState.playerName || 'COMMANDER';

    if (metaState.isAdminMode) {
        if (coinsEl) coinsEl.textContent = '∞';
        if (gemsEl) gemsEl.textContent = '∞';
        if (medalsEl) medalsEl.textContent = '∞';
        if (pearlsEl) pearlsEl.textContent = '∞';
    } else if (!lobbyState.currencyAnim.initialized) {
        if (coinsEl) coinsEl.textContent = formatCurrency(metaState.coins);
        if (gemsEl) gemsEl.textContent = formatCurrency(metaState.gems);
        if (medalsEl) medalsEl.textContent = formatCurrency(metaState.medals);
        if (pearlsEl) pearlsEl.textContent = formatCurrency(metaState.pearls || 0);
    }

    if (stPearlsEl) stPearlsEl.textContent = `⚪ ${formatCurrency(metaState.pearls || 0)}`;

    const turretShortEl = document.getElementById('lobby-turret-short-label');
    if (turretShortEl) {
        const tType = metaState.baseTurret?.type || 'gatling';
        const tLv = metaState.baseTurret?.level || 1;
        const tCfg = BASE_TURRET_CONFIG[tType] || BASE_TURRET_CONFIG.gatling;
        turretShortEl.textContent = `${tCfg.shortName} LV.${tLv}`;
    }

    if (metaState.isAdminMode) {
        adminTag?.classList.remove('hidden');
        gearBtn?.classList.add('admin-active-gear');
        coinsPill?.classList.add('admin-infinite-pill');
        gemsPill?.classList.add('admin-infinite-pill');
        medalsPill?.classList.add('admin-infinite-pill');
        pearlsPill?.classList.add('admin-infinite-pill');
    } else {
        adminTag?.classList.add('hidden');
        gearBtn?.classList.remove('admin-active-gear');
        coinsPill?.classList.remove('admin-infinite-pill');
        gemsPill?.classList.remove('admin-infinite-pill');
        medalsPill?.classList.remove('admin-infinite-pill');
        pearlsPill?.classList.remove('admin-infinite-pill');
    }

    const codexDot = document.getElementById('codex-notif-dot');
    if (codexDot) {
        codexDot.classList.toggle('hidden', !hasClaimableCodexMilestones());
    }

    const talentDot = document.getElementById('talents-notif-badge');
    if (talentDot) {
        const canUpgTalent = Object.values(META_TALENTS).some(t => {
            const lv = Number(metaState.metaTalents?.[t.id]) || 0;
            const cost = t.baseCost + lv * t.costStep;
            return lv < t.maxLevel && (metaState.isAdminMode || (metaState.medals || 0) >= cost);
        });
        talentDot.classList.toggle('hidden', !canUpgTalent);
    }
}

export function renderMissionNotifDot() {
    const dot = document.getElementById('mission-notif-dot');
    if (!dot) return;
    const hasClaimable = MISSIONS_CATALOG.some(m => {
        const cur = metaState.missionsProgress[m.statKey] || 0;
        const claimed = !!metaState.missionsProgress.claimed[m.id];
        return cur >= m.target && !claimed;
    });
    dot.classList.toggle('hidden', !hasClaimable);
}

// ============================================================================
// 3. TAB BATTLE: AUTO-ZOOM MINI WORLD-MAP (2.45x) & CLOUD-DIVE ROADMAP TOÀN CẢNH
// ============================================================================
export function renderBattleStageView() {
    const curLv = getCurrentCampaignLevel();
    lobbyState.selectedMapLevel = curLv;

    const mapObj = LEVELS[curLv - 1] || LEVELS[0];
    const biomeObj = WORLD_BIOME_BY_ID[mapObj.biomeId] || WORLD_BIOMES[0];
    const totalStars = getTotalCampaignStars();
    const maxUnlocked = getMaxUnlockedMapLevel();

    const biomeTagEl = document.getElementById('lobby-current-biome-tag');
    if (biomeTagEl) {
        biomeTagEl.textContent = biomeObj.shortLabel;
        biomeTagEl.style.borderColor = biomeObj.accentColor;
    }

    const starsEl = document.getElementById('lobby-total-stars-count');
    const unlockedEl = document.getElementById('lobby-unlocked-maps-count');
    if (starsEl) starsEl.textContent = String(totalStars);
    if (unlockedEl) unlockedEl.textContent = String(maxUnlocked);

    const lvTagEl = document.getElementById('lobby-current-lv-tag');
    const mapNameEl = document.getElementById('lobby-current-map-name');
    if (lvTagEl) lvTagEl.textContent = `LEVEL ${String(curLv).padStart(2, '0')}`;
    if (mapNameEl) mapNameEl.textContent = mapObj.name;
}

function updateAndDrawMiniWorldViewport(dt, timeSec) {
    const miniCanvas = document.getElementById('lobbyWorldMiniCanvas');
    if (!miniCanvas) return;
    const ctx = miniCanvas.getContext('2d');
    const W = miniCanvas.width;
    const H = miniCanvas.height;

    const curLv = getCurrentCampaignLevel();
    const mapObj = LEVELS[curLv - 1] || LEVELS[0];
    const targetPos = mapObj.worldPos || { x: 255, y: 500 };

    // Camera tự động Pan mượt (lerp) và Zoom phóng to 2.45x vào đúng tọa độ Level hiện tại
    const cam = lobbyState.miniWorldCam;
    const lerpSpeed = Math.min(1, dt * 6.0);
    cam.x += (targetPos.x - cam.x) * lerpSpeed;
    cam.y += (targetPos.y - cam.y) * lerpSpeed;
    cam.zoom = 2.45;

    const worldBg = buildWorldCampaignCanvas();
    const maxUnlocked = getMaxUnlockedMapLevel();

    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.zoom, cam.zoom);

    const halfViewW = W / (2 * cam.zoom);
    const halfViewH = H / (2 * cam.zoom);
    const clampedX = Math.max(halfViewW, Math.min(WORLD_MAP_WIDTH - halfViewW, cam.x));
    const clampedY = Math.max(halfViewH, Math.min(WORLD_MAP_HEIGHT - halfViewH, cam.y));
    ctx.translate(-clampedX, -clampedY);

    ctx.drawImage(worldBg, 0, 0);
    renderWorldCampaignDynamicOverlay(ctx, timeSec, curLv, maxUnlocked, getStageStars);
    ctx.restore();
}

function setCloudDiveCloudsState(phase) {
    const layer = document.getElementById('cloud-dive-layer');
    if (!layer) return;

    const cloudVectors = [
        { id: 'cloud-dive-c1', sx: 30,  sy: 25,  ex: -260, ey: -180 },
        { id: 'cloud-dive-c2', sx: -30, sy: 25,  ex: 260,  ey: -180 },
        { id: 'cloud-dive-c3', sx: 45,  sy: 0,   ex: -290, ey: -40 },
        { id: 'cloud-dive-c4', sx: -45, sy: 0,   ex: 290,  ey: -40 },
        { id: 'cloud-dive-c5', sx: 35,  sy: -20, ex: -260, ey: 180 },
        { id: 'cloud-dive-c6', sx: -35, sy: -20, ex: 260,  ey: 180 },
        { id: 'cloud-dive-c7', sx: 0,   sy: 15,  ex: -220, ey: -240 },
        { id: 'cloud-dive-c8', sx: 0,   sy: -15, ex: 220,  ey: 240 }
    ];

    if (phase === 'gather') {
        layer.classList.add('active');
        cloudVectors.forEach(cv => {
            const el = document.getElementById(cv.id);
            if (!el) return;
            el.style.transition = 'none';
            el.style.opacity = '0.94';
            el.style.transform = `translate(${cv.sx}px, ${cv.sy}px) scale(1.12)`;
        });
    } else if (phase === 'split') {
        cloudVectors.forEach(cv => {
            const el = document.getElementById(cv.id);
            if (!el) return;
            el.style.transition = 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.85s ease';
            el.style.opacity = '0';
            el.style.transform = `translate(${cv.ex}px, ${cv.ey}px) scale(1.85)`;
        });
    } else {
        layer.classList.remove('active');
    }
}

/**
 * Mở Màn Hình Bản Đồ Tổng Toàn Cảnh (#world-roadmap-modal) kèm chuỗi hoạt ảnh
 * Cloud-Dive Camera Zoom Transition 3 pha (0.0s -> 1.15s)
 */
export function openWorldRoadmapModal(focusLevel = null) {
    const modal = document.getElementById('world-roadmap-modal');
    const viewport = document.getElementById('world-roadmap-viewport');
    const wCanvas = document.getElementById('worldRoadmapCanvas');
    if (!modal || !viewport || !wCanvas) return;

    modal.classList.add('active');
    sfx.play('airstrike');
    triggerHaptic(22);

    const rect = viewport.getBoundingClientRect();
    wCanvas.width = Math.max(360, Math.round(rect.width || 420));
    wCanvas.height = Math.max(520, Math.round(rect.height || 720));

    const targetLv = focusLevel || getCurrentCampaignLevel();
    const mapObj = LEVELS[targetLv - 1] || LEVELS[0];

    // Căn chỉnh điểm đích sao cho nút Level nằm ngay phía trên bảng Popover
    const diveDestX = mapObj.worldPos.x;
    const diveDestY = mapObj.worldPos.y + (wCanvas.height * 0.21) / 2.10;

    const cam = lobbyState.worldCam;
    cam.isOpen = true;
    cam.isDragging = false;
    cam.vx = 0;
    cam.vy = 0;

    // Pha 1: Khởi đầu ở góc nhìn toàn cảnh bầu trời (0.58x) với 8 cụm mây trắng bồng bềnh
    cam.x = WORLD_MAP_WIDTH * 0.5;
    cam.y = WORLD_MAP_HEIGHT * 0.5;
    cam.targetX = cam.x;
    cam.targetY = cam.y;
    cam.zoom = 0.58;
    cam.targetZoom = 0.58;

    cam.cloudDive = {
        active: true,
        elapsed: 0,
        duration: 1.15,
        startX: WORLD_MAP_WIDTH * 0.5,
        startY: WORLD_MAP_HEIGHT * 0.5,
        endX: diveDestX,
        endY: diveDestY,
        startZoom: 0.58,
        endZoom: 2.10,
        targetLevel: targetLv,
        cloudsSplit: false
    };

    setCloudDiveCloudsState('gather');
    closeStageActionPopover();

    document.getElementById('world-total-stars').textContent = `${getTotalCampaignStars()} / ${MAX_CAMPAIGN_STARS}`;
    document.getElementById('world-map-progress').textContent = metaState.isAdminMode
        ? `ADMIN: 54 / ${TOTAL_CAMPAIGN_LEVELS}`
        : `MAP ${getMaxUnlockedMapLevel()} / ${TOTAL_CAMPAIGN_LEVELS}`;

    updateBiomeJumpPillsActive(mapObj.biomeId);
}

export function closeWorldRoadmapModal() {
    lobbyState.worldCam.isOpen = false;
    lobbyState.worldCam.cloudDive.active = false;
    setCloudDiveCloudsState('hide');
    closeStageActionPopover();
    document.getElementById('world-roadmap-modal')?.classList.remove('active');
}

function updateBiomeJumpPillsActive(biomeId) {
    document.querySelectorAll('[data-biome-jump]').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.biomeJump) === Number(biomeId));
    });
}

function clampWorldCameraCoords(x, y, zoom, viewW, viewH) {
    const halfW = viewW / (2 * zoom);
    const halfH = viewH / (2 * zoom);
    const minX = Math.min(WORLD_MAP_WIDTH / 2, halfW);
    const maxX = Math.max(WORLD_MAP_WIDTH / 2, WORLD_MAP_WIDTH - halfW);
    const minY = Math.min(WORLD_MAP_HEIGHT / 2, halfH);
    const maxY = Math.max(WORLD_MAP_HEIGHT / 2, WORLD_MAP_HEIGHT - halfH);
    return {
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y))
    };
}

function updateAndDrawFullscreenWorldRoadmap(dt, timeSec) {
    const wCanvas = document.getElementById('worldRoadmapCanvas');
    if (!wCanvas) return;
    const ctx = wCanvas.getContext('2d');
    const W = wCanvas.width;
    const H = wCanvas.height;
    const cam = lobbyState.worldCam;
    const dive = cam.cloudDive;

    // Xử lý chuỗi hoạt ảnh Cloud-Dive Camera Zoom Transition 3 Pha (0.0s -> 1.15s)
    if (dive && dive.active) {
        dive.elapsed += dt;

        // Pha 1 (0.0s -> 0.30s): Toàn cảnh tầng không trung
        if (dive.elapsed >= 0.30 && !dive.cloudsSplit) {
            dive.cloudsSplit = true;
            setCloudDiveCloudsState('split');
        }

        // Pha 2 (0.30s -> 1.15s): Lao xuyên qua mây xuống Level hiện tại theo hàm easeOutQuart
        if (dive.elapsed > 0.30) {
            const t = Math.min(1, (dive.elapsed - 0.30) / (dive.duration - 0.30));
            const easeOutQuart = 1 - Math.pow(1 - t, 4);

            cam.zoom = dive.startZoom + (dive.endZoom - dive.startZoom) * easeOutQuart;
            cam.targetZoom = cam.zoom;

            const rawX = dive.startX + (dive.endX - dive.startX) * easeOutQuart;
            const rawY = dive.startY + (dive.endY - dive.startY) * easeOutQuart;
            const clamped = clampWorldCameraCoords(rawX, rawY, cam.zoom, W, H);
            cam.x = clamped.x;
            cam.y = clamped.y;
            cam.targetX = cam.x;
            cam.targetY = cam.y;
        }

        // Pha 3 (1.15s): Khóa mục tiêu & tự động mở UI Popover chọn chế độ
        if (dive.elapsed >= dive.duration) {
            dive.active = false;
            setCloudDiveCloudsState('hide');
            openStageActionPopover(dive.targetLevel);
        }
    } else {
        // 1. Quán tính trượt (inertia damping) khi người chơi kéo bản đồ tự do
        if (!cam.isDragging) {
            if (Math.abs(cam.vx) > 0.5 || Math.abs(cam.vy) > 0.5) {
                cam.targetX += cam.vx * dt;
                cam.targetY += cam.vy * dt;
                cam.vx *= Math.pow(0.06, dt);
                cam.vy *= Math.pow(0.06, dt);
            } else {
                cam.vx = 0;
                cam.vy = 0;
            }
        }

        // 2. Nội suy mượt Zoom & Pan (60-120 FPS)
        const smooth = Math.min(1, dt * 11);
        cam.zoom += (cam.targetZoom - cam.zoom) * smooth;

        const clampedTarget = clampWorldCameraCoords(cam.targetX, cam.targetY, cam.zoom, W, H);
        cam.targetX = clampedTarget.x;
        cam.targetY = clampedTarget.y;

        cam.x += (cam.targetX - cam.x) * smooth;
        cam.y += (cam.targetY - cam.y) * smooth;
    }

    const worldBg = buildWorldCampaignCanvas();
    const curLv = cam.popoverLevel || getCurrentCampaignLevel();
    const maxUnlocked = getMaxUnlockedMapLevel();

    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#07131f';
    ctx.fillRect(0, 0, W, H);

    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    ctx.drawImage(worldBg, 0, 0);
    renderWorldCampaignDynamicOverlay(ctx, timeSec, curLv, maxUnlocked, getStageStars);
    ctx.restore();
}

function openStageActionPopover(mapLv) {
    const lv = Math.max(1, Math.min(TOTAL_CAMPAIGN_LEVELS, Number(mapLv) || 1));
    const mapObj = LEVELS[lv - 1] || LEVELS[0];
    const biomeObj = WORLD_BIOME_BY_ID[mapObj.biomeId] || WORLD_BIOMES[0];

    const cam = lobbyState.worldCam;
    cam.popoverLevel = lv;
    cam.popoverDiff = getDefaultDifficultyForMap(lv);
    cam.popoverMode = 'destroy';

    const wCanvas = document.getElementById('worldRoadmapCanvas');
    const viewH = wCanvas ? wCanvas.height : 700;
    if (cam.targetZoom < 1.25) {
        cam.targetZoom = 1.65;
    }
    cam.targetY = mapObj.worldPos.y + (viewH * 0.21) / Math.max(0.8, cam.targetZoom);
    cam.targetX = mapObj.worldPos.x;

    updateBiomeJumpPillsActive(mapObj.biomeId);

    const popover = document.getElementById('stage-action-popover');
    if (!popover) return;

    document.getElementById('popover-stage-biome').textContent = biomeObj.shortLabel;
    document.getElementById('popover-stage-title').textContent = `LEVEL ${String(lv).padStart(2, '0')}: ${mapObj.name}`;

    const stars = getStageStars(lv);
    document.getElementById('popover-stage-stars').textContent =
        '★'.repeat(stars) + '☆'.repeat(3 - stars);
    document.getElementById('popover-stage-desc').textContent = mapObj.mechanicTag
        ? `${mapObj.desc} (${mapObj.mechanicTag})`
        : mapObj.desc;

    // Vẽ thumbnail cắt trực tiếp từ ảnh gốc biome_X.png của chính map đó
    const thumbCanvas = document.getElementById('popover-map-thumb');
    if (thumbCanvas) {
        const tCtx = thumbCanvas.getContext('2d');
        tCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
        renderMap(tCtx, thumbCanvas.width, thumbCanvas.height, lv);
    }

    refreshStageActionPopoverState();
    popover.classList.add('active');
}

function closeStageActionPopover() {
    lobbyState.worldCam.popoverLevel = null;
    document.getElementById('stage-action-popover')?.classList.remove('active');
}

function refreshStageActionPopoverState() {
    const cam = lobbyState.worldCam;
    const lv = cam.popoverLevel;
    if (!lv) return;

    const hardUnlocked = isDifficultyUnlocked(lv, 'difficult');
    if (cam.popoverDiff === 'difficult' && !hardUnlocked) {
        cam.popoverDiff = 'easy';
    }

    const isChallenge = cam.popoverMode === 'challenge';

    document.getElementById('popover-diff-easy')?.classList.toggle('active', !isChallenge && cam.popoverDiff === 'easy');
    const hardBtn = document.getElementById('popover-diff-difficult');
    if (hardBtn) {
        hardBtn.classList.toggle('active', isChallenge || cam.popoverDiff === 'difficult');
        hardBtn.classList.toggle('locked', !hardUnlocked && !isChallenge);
    }

    const easySt = document.getElementById('popover-easy-status');
    const hardSt = document.getElementById('popover-hard-status');
    if (easySt) easySt.textContent = isDifficultyCleared(lv, 'easy') ? '✓' : '★';
    if (hardSt) hardSt.textContent = !hardUnlocked ? '🔒' : (isDifficultyCleared(lv, 'difficult') ? '✓' : '★');

    document.querySelectorAll('[data-pop-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.popMode === cam.popoverMode);
    });

    const rewardPreview = document.getElementById('popover-reward-preview');
    const launchBtn = document.getElementById('btn-popover-launch-stage');

    if (isChallenge) {
        const treeB = getAncientSkillTreeBonuses();
        const rew = calcChallengeRewards(lv, treeB.pearlBonusPct);
        const entryCost = calcChallengeEntryCostCoins(lv);
        if (rewardPreview) {
            rewardPreview.innerHTML = `Thưởng: <b class="text-white">⚪ +${rew.pearls}</b> • 💎 +${rew.gems} • 🪙 +${rew.coins.toLocaleString('en-US')}`;
        }
        if (launchBtn) {
            launchBtn.textContent = metaState.isAdminMode
                ? '☠️ ZOMBIE TD (FREE)'
                : `☠️ VÀO TD (🪙 ${entryCost.toLocaleString('en-US')})`;
        }
    } else {
        const coins = calcStageRewardCoins(lv, cam.popoverDiff, cam.popoverMode);
        const medalStr = cam.popoverDiff === 'difficult' ? ' • 🎖️ +3' : '';
        if (rewardPreview) {
            rewardPreview.innerHTML = `Thưởng: <b class="text-amber-300">🪙 +${coins.toLocaleString('en-US')}</b>${medalStr}`;
        }
        if (launchBtn) {
            launchBtn.textContent = '⚔️ XUẤT KÍCH (START)';
        }
    }
}

function bindWorldRoadmapInteractions() {
    const viewport = document.getElementById('world-roadmap-viewport');
    const wCanvas = document.getElementById('worldRoadmapCanvas');
    if (!viewport || !wCanvas) return;

    const cam = lobbyState.worldCam;

    const cancelActiveCloudDive = () => {
        if (cam.cloudDive.active) {
            cam.cloudDive.active = false;
            setCloudDiveCloudsState('hide');
        }
    };

    const getPinchDistance = () => {
        const pts = Array.from(cam.activePointers.values());
        if (pts.length < 2) return 0;
        return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };

    viewport.addEventListener('pointerdown', e => {
        if (e.target.closest('#stage-action-popover') || e.target.closest('.world-zoom-controls')) return;
        cancelActiveCloudDive();
        viewport.setPointerCapture?.(e.pointerId);
        cam.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (cam.activePointers.size === 1) {
            cam.isDragging = true;
            cam.dragMoved = false;
            cam.lastPointerX = e.clientX;
            cam.lastPointerY = e.clientY;
            cam.vx = 0;
            cam.vy = 0;
        } else if (cam.activePointers.size === 2) {
            cam.isDragging = false;
            cam.initialPinchDist = getPinchDistance();
            cam.initialPinchZoom = cam.targetZoom;
        }
    });

    viewport.addEventListener('pointermove', e => {
        if (!cam.activePointers.has(e.pointerId)) return;
        cam.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (cam.activePointers.size === 2) {
            const dist = getPinchDistance();
            if (cam.initialPinchDist > 10 && dist > 10) {
                const ratio = dist / cam.initialPinchDist;
                cam.targetZoom = Math.max(0.45, Math.min(2.8, cam.initialPinchZoom * ratio));
            }
            return;
        }

        if (cam.isDragging && cam.activePointers.size === 1) {
            const dx = e.clientX - cam.lastPointerX;
            const dy = e.clientY - cam.lastPointerY;
            if (Math.hypot(dx, dy) > 4) {
                cam.dragMoved = true;
            }
            cam.lastPointerX = e.clientX;
            cam.lastPointerY = e.clientY;

            const worldDx = dx / cam.zoom;
            const worldDy = dy / cam.zoom;
            cam.targetX -= worldDx;
            cam.targetY -= worldDy;
            cam.vx = -worldDx * 14;
            cam.vy = -worldDy * 14;
        }
    });

    const onPointerEnd = e => {
        const wasSingleTap = cam.activePointers.size === 1 && !cam.dragMoved;
        cam.activePointers.delete(e.pointerId);

        if (cam.activePointers.size === 0) {
            cam.isDragging = false;
        }

        if (wasSingleTap) {
            const rect = wCanvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const worldX = cam.x + (sx - wCanvas.width / 2) / cam.zoom;
            const worldY = cam.y + (sy - wCanvas.height / 2) / cam.zoom;

            let hitMap = null;
            let bestDist = 30;
            for (const m of LEVELS) {
                const d = Math.hypot(worldX - m.worldPos.x, worldY - m.worldPos.y);
                if (d <= bestDist) {
                    bestDist = d;
                    hitMap = m;
                }
            }

            if (hitMap) {
                const maxUnlocked = getMaxUnlockedMapLevel();
                if (hitMap.id > maxUnlocked) {
                    sfx.play('cannon');
                    triggerHaptic(30);
                } else {
                    sfx.play('gas');
                    triggerHaptic(18);
                    openStageActionPopover(hitMap.id);
                }
            } else {
                closeStageActionPopover();
            }
        }
    };

    viewport.addEventListener('pointerup', onPointerEnd);
    viewport.addEventListener('pointercancel', onPointerEnd);

    viewport.addEventListener(
        'wheel',
        e => {
            e.preventDefault();
            cancelActiveCloudDive();
            const factor = e.deltaY < 0 ? 1.15 : 0.87;
            cam.targetZoom = Math.max(0.45, Math.min(2.8, cam.targetZoom * factor));
        },
        { passive: false }
    );

    // 6 Nút chọn nhanh Vùng Đất
    document.querySelectorAll('[data-biome-jump]').forEach(btn => {
        btn.addEventListener('click', () => {
            cancelActiveCloudDive();
            closeStageActionPopover();
            const bId = Number(btn.dataset.biomeJump) || 1;
            const bObj = WORLD_BIOME_BY_ID[bId] || WORLD_BIOMES[0];
            cam.targetX = bObj.focusPos.x;
            cam.targetY = bObj.focusPos.y;
            cam.targetZoom = 1.05;
            cam.vx = 0;
            cam.vy = 0;
            updateBiomeJumpPillsActive(bId);
            sfx.play('gas');
        });
    });

    // Nút 🌐 TOÀN CẢNH thu nhỏ ngắm toàn bộ 6 quần xã
    document.getElementById('btn-world-overview')?.addEventListener('click', () => {
        cancelActiveCloudDive();
        closeStageActionPopover();
        cam.targetX = WORLD_MAP_WIDTH * 0.5;
        cam.targetY = WORLD_MAP_HEIGHT * 0.5;
        cam.targetZoom = 0.55;
        cam.vx = 0;
        cam.vy = 0;
        sfx.play('gas');
    });

    // Cụm nút Zoom & Căn giữa Level hiện tại
    document.getElementById('btn-world-zoom-in')?.addEventListener('click', () => {
        cancelActiveCloudDive();
        cam.targetZoom = Math.min(2.8, cam.targetZoom * 1.25);
        sfx.play('gas');
    });
    document.getElementById('btn-world-zoom-out')?.addEventListener('click', () => {
        cancelActiveCloudDive();
        cam.targetZoom = Math.max(0.45, cam.targetZoom * 0.8);
        sfx.play('gas');
    });
    document.getElementById('btn-world-recenter')?.addEventListener('click', () => {
        cancelActiveCloudDive();
        const curLv = getCurrentCampaignLevel();
        const mObj = LEVELS[curLv - 1] || LEVELS[0];
        cam.targetX = mObj.worldPos.x;
        cam.targetY = mObj.worldPos.y;
        cam.targetZoom = 1.65;
        cam.vx = 0;
        cam.vy = 0;
        updateBiomeJumpPillsActive(mObj.biomeId);
        openStageActionPopover(curLv);
        sfx.play('gas');
    });

    // Popover controls
    document.getElementById('btn-close-stage-popover')?.addEventListener('click', () => {
        closeStageActionPopover();
    });
    document.getElementById('popover-diff-easy')?.addEventListener('click', () => {
        if (cam.popoverMode === 'challenge') cam.popoverMode = 'destroy';
        cam.popoverDiff = 'easy';
        refreshStageActionPopoverState();
        sfx.play('gas');
    });
    document.getElementById('popover-diff-difficult')?.addEventListener('click', () => {
        if (!cam.popoverLevel || !isDifficultyUnlocked(cam.popoverLevel, 'difficult')) {
            sfx.play('cannon');
            return;
        }
        if (cam.popoverMode === 'challenge') cam.popoverMode = 'destroy';
        cam.popoverDiff = 'difficult';
        refreshStageActionPopoverState();
        sfx.play('gas');
    });
    document.querySelectorAll('[data-pop-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            cam.popoverMode = btn.dataset.popMode;
            refreshStageActionPopoverState();
            sfx.play('gas');
        });
    });

    document.getElementById('btn-popover-launch-stage')?.addEventListener('click', () => {
        const lv = cam.popoverLevel;
        if (!lv) return;

        if (cam.popoverMode === 'challenge') {
            const entryCost = calcChallengeEntryCostCoins(lv);
            if (!metaState.isAdminMode && metaState.coins < entryCost) {
                sfx.play('cannon');
                alert(`Không đủ Vàng! Cần 🪙 ${entryCost.toLocaleString('en-US')} để vào Zombie TD Ải ${lv}.`);
                return;
            }
            if (!metaState.isAdminMode) {
                metaState.coins -= entryCost;
                saveProgress();
                updateLobbyTopBar();
            }
            closeWorldRoadmapModal();
            if (typeof window.startChallengeLevel === 'function') {
                window.startChallengeLevel(lv);
            }
            return;
        }

        const diff = cam.popoverDiff;
        const mode = cam.popoverMode;
        closeWorldRoadmapModal();
        if (typeof startBattleHandlerRef === 'function') {
            startBattleHandlerRef(lv, diff, mode);
        }
    });
}

// ============================================================================
// 4. TAB 4: CHALLENGE (LỘ TRÌNH DỌC 54 MAP THỦ THÀNH ZOMBIE 20 WAVE)
// ============================================================================
export function renderChallengeRoadmap() {
    const listEl = document.getElementById('challenge-roadmap-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const treeB = getAncientSkillTreeBonuses();

    LEVELS.forEach(mapObj => {
        const lv = mapObj.id;
        const unlocked = isChallengeMapUnlocked(lv);
        const cleared = isChallengeMapCleared(lv);
        const bestWave = metaState.challengeBestWave?.[lv] || 0;
        const entryCost = calcChallengeEntryCostCoins(lv);
        const rewards = calcChallengeRewards(lv, treeB.pearlBonusPct);
        const biomeObj = WORLD_BIOME_BY_ID[mapObj.biomeId] || WORLD_BIOMES[0];

        const node = document.createElement('div');
        node.className = `challenge-stage-node ${cleared ? 'cleared' : (unlocked ? 'unlocked' : 'locked')}`;

        const costLabel = metaState.isAdminMode ? 'MIỄN PHÍ' : `🪙 ${entryCost.toLocaleString('en-US')}`;
        const btnHtml = !unlocked
            ? `<button type="button" class="btn-3d btn-3d-slate px-2.5 py-2 text-[10px]" disabled>🔒 KHÓA</button>`
            : `<button type="button" data-ch-map="${lv}" class="btn-3d ${cleared ? 'btn-3d-cyan' : 'btn-3d-rose'} px-2.5 py-2 text-[10px] flex flex-col items-center">
                    <span>${cleared ? '⚔️ ĐÁNH LẠI' : '☠️ KHIÊU CHIẾN'}</span>
                    <span class="vt323-num text-xs text-amber-200">${costLabel}</span>
               </button>`;

        node.innerHTML = `
            <div class="flex-1 text-left">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-black text-white">Ải ${String(lv).padStart(2, '0')}: ${mapObj.name}</span>
                    ${cleared ? '<span class="text-[9px] font-black bg-emerald-500 text-slate-950 px-1.5 rounded-full">✓ ĐÃ VƯỢT</span>' : ''}
                    ${!cleared && bestWave > 0 ? `<span class="text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-400 px-1.5 rounded-full vt323-num">Best: W.${bestWave}/20</span>` : ''}
                </div>
                <div class="text-[9.5px] font-bold text-slate-300 mt-0.5 leading-tight">
                    ${biomeObj.pillLabel} • 20 Wave Zombie • Boss W.7, 14, 20
                </div>
                <div class="text-[10px] font-black text-sky-300 mt-1 vt323-num">
                    Thưởng: <b class="text-white">⚪ +${rewards.pearls} Ngọc Trai</b> • 💎 +${rewards.gems} • 🪙 +${rewards.coins.toLocaleString('en-US')}
                </div>
            </div>
            <div>${btnHtml}</div>
        `;

        const startBtn = node.querySelector('[data-ch-map]');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (!metaState.isAdminMode && metaState.coins < entryCost) {
                    sfx.play('cannon');
                    alert(`Không đủ Vàng! Cần 🪙 ${entryCost.toLocaleString('en-US')} để vào Ải Challenge ${lv}.`);
                    return;
                }
                if (!metaState.isAdminMode) {
                    metaState.coins -= entryCost;
                    saveProgress();
                    updateLobbyTopBar();
                }
                sfx.play('upgrade');
                triggerHaptic(25);
                if (typeof window.startChallengeLevel === 'function') {
                    window.startChallengeLevel(lv);
                }
            });
        }

        listEl.appendChild(node);
    });
}

// ============================================================================
// 5. TAB 5: CÂY KỸ NĂNG CỔ THỤ 4 NHÁNH TÁN CÂY (40 KỸ NĂNG & 4 KỸ NĂNG ĐẶC BIỆT)
// ============================================================================
export function renderSkillTreeTab() {
    const svgEl = document.getElementById('skilltree-branches-svg');
    const nodesLayer = document.getElementById('skilltree-nodes-layer');
    const viewport = document.getElementById('skilltree-scroll-viewport');
    if (!svgEl || !nodesLayer) return;

    updateLobbyTopBar();

    let svgHtml = `
        <ellipse cx="110" cy="395" rx="82" ry="215" fill="rgba(249, 115, 22, 0.08)" />
        <ellipse cx="275" cy="395" rx="82" ry="215" fill="rgba(56, 189, 248, 0.08)" />
        <ellipse cx="445" cy="395" rx="82" ry="215" fill="rgba(192, 132, 252, 0.08)" />
        <ellipse cx="610" cy="395" rx="82" ry="215" fill="rgba(74, 222, 128, 0.08)" />

        <path d="M 360 715 Q 290 735 235 750" stroke="#451a03" stroke-width="14" fill="none" stroke-linecap="round"/>
        <path d="M 360 715 Q 430 735 485 750" stroke="#451a03" stroke-width="14" fill="none" stroke-linecap="round"/>
        <path d="M 360 710 L 360 752" stroke="#451a03" stroke-width="18" fill="none" stroke-linecap="round"/>
    `;

    ANCIENT_TREE_BRANCH_LINES.forEach(line => {
        const p1 = typeof line.from === 'string' ? ANCIENT_SKILL_TREE[line.from] : line.from;
        const p2 = typeof line.to === 'string' ? ANCIENT_SKILL_TREE[line.to] : line.to;
        if (!p1 || !p2) return;

        const targetNodeId = typeof line.to === 'string' ? line.to : line.reqNode;
        const targetLv = targetNodeId ? getSkillTreeNodeLevel(targetNodeId) : 1;
        const isActiveBranch = !targetNodeId || targetLv > 0 || isSkillTreeNodeUnlocked(targetNodeId);
        const branchInfo = targetNodeId && ANCIENT_SKILL_TREE[targetNodeId]
            ? SKILL_TREE_BRANCHES.find(b => b.id === ANCIENT_SKILL_TREE[targetNodeId].branch)
            : null;

        const strokeCol = isActiveBranch ? (branchInfo ? branchInfo.color : '#22c55e') : '#334155';
        const strokeW = typeof line.from !== 'string' ? 9 : (isActiveBranch ? 5 : 3.5);
        const midY = (p1.y + p2.y) / 2;
        const energyClass = targetLv > 0 ? 'st-branch-energy-active' : '';

        svgHtml += `
            <path d="M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}"
                  class="${energyClass}"
                  stroke="${strokeCol}"
                  stroke-width="${strokeW}"
                  stroke-opacity="${isActiveBranch ? '0.92' : '0.45'}"
                  fill="none"
                  stroke-linecap="round" />
        `;
    });

    SKILL_TREE_BRANCHES.forEach(b => {
        svgHtml += `
            <rect x="${b.rootX - 66}" y="138" width="132" height="24" rx="12" fill="#0f172a" stroke="${b.color}" stroke-width="2"/>
            <text x="${b.rootX}" y="154" fill="${b.color}" font-size="11" font-weight="900" text-anchor="middle">${b.shortName}</text>
        `;
    });

    svgEl.innerHTML = svgHtml;

    nodesLayer.innerHTML = '';
    Object.values(ANCIENT_SKILL_TREE).forEach(node => {
        const curLv = getSkillTreeNodeLevel(node.id);
        const unlocked = isSkillTreeNodeUnlocked(node.id);
        const isSelected = lobbyState.activeSkillTreeNodeId === node.id;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `st-tree-node ${node.isKeystone ? 'special-keystone' : ''} ${curLv > 0 ? 'leveled' : (unlocked ? 'unlocked' : 'locked')} ${isSelected ? 'selected-node' : ''}`;
        btn.style.left = `${node.x}px`;
        btn.style.top = `${node.y}px`;
        btn.title = node.name;
        btn.innerHTML = `
            <span style="font-size:${node.isKeystone ? '24px' : '18px'}; line-height:1;">${node.icon}</span>
            <span class="st-node-lv-tag">${node.isKeystone ? (curLv > 0 ? 'MAX' : '★10') : `${curLv}/${node.maxLevel}`}</span>
        `;

        btn.addEventListener('click', () => {
            lobbyState.activeSkillTreeNodeId = node.id;
            lobbyState.activeSkillTreeBranch = node.branch;
            sfx.play('gas');
            renderSkillTreeTab();
        });

        nodesLayer.appendChild(btn);
    });

    document.querySelectorAll('[data-st-branch]').forEach(bBtn => {
        bBtn.classList.toggle('active', bBtn.dataset.stBranch === lobbyState.activeSkillTreeBranch);
        bBtn.onclick = () => {
            const bId = bBtn.dataset.stBranch;
            lobbyState.activeSkillTreeBranch = bId;
            const branchMeta = SKILL_TREE_BRANCHES.find(b => b.id === bId);
            const firstNode = Object.values(ANCIENT_SKILL_TREE).find(n => n.branch === bId && n.order === 1);
            if (firstNode) lobbyState.activeSkillTreeNodeId = firstNode.id;
            if (viewport && branchMeta) {
                const targetScrollX = Math.max(0, branchMeta.rootX - viewport.clientWidth / 2);
                viewport.scrollTo({ left: targetScrollX, behavior: 'smooth' });
            }
            renderSkillTreeTab();
        };
    });

    const activeNode = ANCIENT_SKILL_TREE[lobbyState.activeSkillTreeNodeId] || ANCIENT_SKILL_TREE.fp_1;
    const curLv = getSkillTreeNodeLevel(activeNode.id);
    const unlocked = isSkillTreeNodeUnlocked(activeNode.id);
    const canUpg = canUpgradeSkillTreeNode(activeNode.id);
    const cost = getSkillTreeNodeCost(activeNode.id, curLv);

    const titleEl = document.getElementById('st-inspector-title');
    const descEl = document.getElementById('st-inspector-desc');
    const reqEl = document.getElementById('st-inspector-req');
    const upgBtn = document.getElementById('btn-upgrade-skilltree-node');
    const costEl = document.getElementById('st-upgrade-cost-val');

    if (titleEl) titleEl.textContent = `${activeNode.icon} ${activeNode.name} (LV.${curLv}/${activeNode.maxLevel})`;
    if (descEl) descEl.textContent = `${activeNode.desc} (${activeNode.getEffectText(curLv)})`;
    if (reqEl) {
        if (curLv >= activeNode.maxLevel) {
            reqEl.textContent = 'Trạng thái: ĐÃ ĐẠT CẤP TỐI ĐA (MAX)';
            reqEl.style.color = '#4ade80';
        } else if (!unlocked) {
            const reqNames = activeNode.requires.map(rId => ANCIENT_SKILL_TREE[rId]?.name || rId).join(' + ');
            reqEl.textContent = `🔒 Cần mở khóa trước: ${reqNames}`;
            reqEl.style.color = '#fb7185';
        } else {
            reqEl.textContent = '✨ Sẵn sàng nâng cấp bằng Ngọc Trai Trắng';
            reqEl.style.color = '#fde047';
        }
    }

    if (costEl) {
        costEl.textContent = curLv >= activeNode.maxLevel ? 'MAX' : (metaState.isAdminMode ? 'MIỄN PHÍ' : `⚪ ${cost}`);
    }

    if (upgBtn) {
        upgBtn.disabled = !canUpg;
        upgBtn.onclick = () => {
            if (!upgradeSkillTreeNode(activeNode.id)) {
                sfx.play('cannon');
                return;
            }
            sfx.play('upgrade');
            triggerHaptic(25);
            renderSkillTreeTab();
        };
    }
}

// ============================================================================
// 6. TAB 1: SHOP (MỞ RƯƠNG SIÊU TỐC O(1) & CỬA HÀNG CHIP BỔ TRỢ)
// ============================================================================
export function renderShopChipsSection() {
    const listEl = document.getElementById('shop-chips-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    Object.values(UNIT_CHIPS).forEach(chip => {
        const owned = getChipOwnedCount(chip.id);
        const coinCost = chip.buyCoins || CHIP_BUY_COST_COINS;
        const gemCost = chip.buyGems || CHIP_BUY_COST_GEMS;
        const canBuyCoins = metaState.isAdminMode || metaState.coins >= coinCost;
        const canBuyGems = metaState.isAdminMode || metaState.gems >= gemCost;

        const row = document.createElement('div');
        row.className = 'shop-chip-item-row';
        row.innerHTML = `
            <div class="flex items-center gap-2 flex-1 text-left">
                <div class="w-9 h-9 rounded-lg bg-slate-800 border-2 border-slate-500 flex items-center justify-center text-lg flex-shrink-0">
                    ${chip.icon}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[11px] font-black text-white truncate">${chip.name}</span>
                        <span class="text-[9.5px] font-black bg-sky-500/20 text-sky-300 border border-sky-400 px-1.5 rounded-full vt323-num">Kho: ${metaState.isAdminMode ? '∞' : owned}</span>
                    </div>
                    <div class="text-[9px] font-bold text-slate-300 leading-tight mt-0.5">${chip.desc}</div>
                </div>
            </div>
            <div class="flex flex-col gap-1 flex-shrink-0">
                <button type="button" data-buy-chip="${chip.id}" data-cur="coins" class="btn-3d btn-3d-amber px-2 py-1 text-[9.5px]" ${canBuyCoins ? '' : 'disabled'}>
                    🪙 ${coinCost.toLocaleString('en-US')}
                </button>
                <button type="button" data-buy-chip="${chip.id}" data-cur="gems" class="btn-3d btn-3d-cyan px-2 py-1 text-[9.5px]" ${canBuyGems ? '' : 'disabled'}>
                    💎 ${gemCost}
                </button>
            </div>
        `;

        row.querySelectorAll('[data-buy-chip]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!buyChipItem(btn.dataset.buyChip, btn.dataset.cur)) {
                    sfx.play('cannon');
                    return;
                }
                sfx.play('upgrade');
                triggerHaptic(20);
                updateLobbyTopBar();
                renderShopChipsSection();
            });
        });

        listEl.appendChild(row);
    });
}

export function triggerSingleOrTenGacha(crateType, count) {
    const cfg = CRATE_CONFIG[crateType];
    if (!cfg) return;
    const calc = calcCrateBatchPrice(crateType, count);
    if (!metaState.isAdminMode && metaState.gems < calc.finalCost) {
        sfx.play('cannon');
        alert(`Không đủ Gems! Cần 💎 ${calc.finalCost.toLocaleString('en-US')} Gems.`);
        return;
    }
    executeGachaOpening(crateType, count, calc.finalCost);
}

export function openCustomGachaConfirmModal(crateType) {
    const cfg = CRATE_CONFIG[crateType];
    const inputEl = document.getElementById(
        crateType === 'legendary' ? 'input-custom-leg-count' : 'input-custom-epic-count'
    );
    const rawVal = parseInt(inputEl?.value || '1', 10);
    const qty = Math.max(1, Math.min(MAX_CRATE_OPEN_QTY, isNaN(rawVal) ? 1 : rawVal));
    if (inputEl) inputEl.value = qty;

    const calc = calcCrateBatchPrice(crateType, qty);
    lobbyState.pendingCustomGacha = { crateType, qty, finalCost: calc.finalCost };

    const modal = document.getElementById('gacha-confirm-modal');
    if (!modal) return;

    document.getElementById('gacha-conf-crate-title').textContent = cfg.name;
    document.getElementById('gacha-conf-qty').textContent = `${qty.toLocaleString('en-US')} rương (${formatCompactNumber(qty)})`;
    document.getElementById('gacha-conf-raw-cost').textContent = `💎 ${calc.rawCost.toLocaleString('en-US')}`;
    document.getElementById('gacha-conf-discount-tag').textContent =
        calc.bundlesOfTen > 0
            ? `-10% (${formatCompactNumber(calc.bundlesOfTen)} cụm 10)`
            : '0% (Dưới 10 rương)';
    document.getElementById('gacha-conf-saved').textContent = `💎 ${calc.savedGems.toLocaleString('en-US')}`;
    document.getElementById('gacha-conf-final-cost').textContent = metaState.isAdminMode
        ? 'MIỄN PHÍ (ADMIN ∞)'
        : `💎 ${calc.finalCost.toLocaleString('en-US')}`;

    const canAfford = metaState.isAdminMode || metaState.gems >= calc.finalCost;
    document.getElementById('gacha-conf-error')?.classList.toggle('hidden', canAfford);
    const confBtn = document.getElementById('btn-confirm-custom-gacha');
    if (confBtn) confBtn.disabled = !canAfford;

    modal.classList.add('active');
}

export function executeGachaOpening(crateType, qty, finalCost) {
    if (!metaState.isAdminMode) {
        if (metaState.gems < finalCost) {
            sfx.play('cannon');
            return;
        }
        metaState.gems -= finalCost;
    }

    const t0 = performance.now();
    sfx.play('upgrade');
    triggerHaptic(30);

    const { countsByKey, rarityTotals } = simulateMassiveCrateOpening(crateType, qty);
    const pulledCards = [];

    for (const [key, count] of Object.entries(countsByKey)) {
        const [unitId, rarity] = key.split('__');
        addCardToStacks(unitId, rarity, count);
        pulledCards.push({ unitId, rarity, count });
    }

    syncRepresentativeInventoryFromStacks();
    const elapsedMs = Math.max(0.05, +(performance.now() - t0).toFixed(2));

    metaState.missionsProgress.cratesOpened = (metaState.missionsProgress.cratesOpened || 0) + qty;
    saveProgress();
    updateLobbyTopBar();
    renderMissionNotifDot();

    pulledCards.sort((a, b) => (RARITY_CONFIG[b.rarity]?.rank || 0) - (RARITY_CONFIG[a.rarity]?.rank || 0));

    const modal = document.getElementById('gacha-result-modal');
    const grid = document.getElementById('gacha-cards-grid');
    const breakdownEl = document.getElementById('gacha-rarity-breakdown');
    const totalEl = document.getElementById('gacha-total-pulled');

    if (totalEl) totalEl.textContent = `${qty.toLocaleString('en-US')} (${elapsedMs}ms)`;

    if (breakdownEl) {
        breakdownEl.innerHTML = '';
        breakdownEl.classList.remove('hidden');
        RARITY_ORDER.forEach(rKey => {
            const cnt = rarityTotals[rKey] || 0;
            if (cnt > 0) {
                const rCfg = RARITY_CONFIG[rKey];
                const pill = document.createElement('span');
                pill.className = `gacha-rarity-stat-pill ${rCfg.cssClass}`;
                pill.textContent = `${rCfg.name}: ${cnt.toLocaleString('en-US')}`;
                breakdownEl.appendChild(pill);
            }
        });
    }

    if (grid) {
        grid.innerHTML = '';
        pulledCards.slice(0, 60).forEach((item, idx) => {
            const uSpec = UNIT_BY_ID[item.unitId] || UNIT_CATALOG[0];
            const rCfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
            const spriteUrl = getUnitSpriteDataURL(uSpec, 'blue');

            const cardDiv = document.createElement('div');
            cardDiv.className = `army-unit-card ${rCfg.cssClass}`;
            cardDiv.style.animation = `cardFlipReveal 0.32s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(0.55, idx * 0.025)}s both`;
            cardDiv.innerHTML = `
                <div class="card-top-lv">
                    <span>${rCfg.name}</span>
                    <span class="card-plus-tag">x${formatCompactNumber(item.count)}</span>
                </div>
                <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-0.5" alt="${uSpec.name}" />
                <div class="card-unit-title">${uSpec.name}</div>
            `;
            attachHolographicCardTilt(cardDiv);
            grid.appendChild(cardDiv);
        });
    }

    modal?.classList.add('active');
}

// ============================================================================
// 7. TAB 2: ARMY (QUẢN LÝ, BẮN THỬ SANDBOX REVIEW, HOLOGRAPHIC 3D TILT & MERGE)
// ============================================================================
function attachHolographicCardTilt(cardEl) {
    if (!cardEl) return;
    cardEl.addEventListener('pointermove', e => {
        const rect = cardEl.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const normX = (e.clientX - rect.left) / rect.width - 0.5;
        const normY = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateY = Math.round(normX * 22);
        const rotateX = Math.round(-normY * 22);
        cardEl.classList.add('tilting');
        cardEl.style.transform = `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
    });
    const resetTilt = () => {
        cardEl.classList.remove('tilting');
        cardEl.style.transform = '';
    };
    cardEl.addEventListener('pointerleave', resetTilt);
    cardEl.addEventListener('pointerup', resetTilt);
    cardEl.addEventListener('pointercancel', resetTilt);
}

export function renderArmyTab() {
    renderArmyShowcase();

    document.getElementById('btn-mode-army')?.classList.toggle('active', lobbyState.armyMode === 'army');
    document.getElementById('btn-mode-review')?.classList.toggle('active', lobbyState.armyMode === 'review');
    document.getElementById('btn-mode-merge')?.classList.toggle('active', lobbyState.armyMode === 'merge');

    document.getElementById('army-list-view')?.classList.toggle('active', lobbyState.armyMode === 'army');
    document.getElementById('army-review-view')?.classList.toggle('active', lobbyState.armyMode === 'review');
    document.getElementById('army-merge-view')?.classList.toggle('active', lobbyState.armyMode === 'merge');

    if (lobbyState.armyMode === 'army') renderArmyUnitsGrid();
    else if (lobbyState.armyMode === 'review') renderArmyReviewGrid();
    else renderMergeInventoryGrid();
}

export function renderArmyShowcase() {
    const unitId = normalizeUnitId(lobbyState.selectedShowcaseUnitId || PRIMARY_INFANTRY_ID);
    const uSpec = UNIT_BY_ID[unitId] || UNIT_CATALOG[0];
    const bestRarity = getHighestRarityForUnit(unitId);
    const rCfg = RARITY_CONFIG[bestRarity] || RARITY_CONFIG.common;
    const permLv = metaState.armyPermanentLevels[unitId] || 1;

    const canvas = document.getElementById('army-hero-showcase');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const timeSec = performance.now() * 0.001;
        const bob = Math.sin(timeSec * 5) * 2.5;
        drawCanvasRarityAura(ctx, 64, 86, 36, bestRarity, timeSec);
        drawUnitArt(ctx, unitId, 64, 60 + bob, 82, 'blue', timeSec, null);
    }

    const pedestal = document.querySelector('.army-pedestal-circle');
    if (pedestal) {
        pedestal.classList.toggle('pedestal-master', isMasterRarity(bestRarity));
        pedestal.classList.toggle('pedestal-demon', isDemonRarity(bestRarity));
    }

    const nameEl = document.getElementById('army-showcase-name');
    const rarEl = document.getElementById('army-showcase-rarity');
    if (nameEl) nameEl.textContent = `${uSpec.name.toUpperCase()} (LV.${permLv})`;
    if (rarEl) {
        rarEl.textContent = `${rCfg.name.toUpperCase()} (${rCfg.mult}x)`;
        rarEl.className = `rarity-badge ${rCfg.cssClass}`;
    }
}

export function renderArmyUnitsGrid() {
    const grid = document.getElementById('army-units-grid');
    if (!grid) return;
    grid.innerHTML = '';

    UNIT_CATALOG.forEach(uSpec => {
        const owned = hasUnitInInventory(uSpec.id);
        const bestRarity = owned ? getHighestRarityForUnit(uSpec.id) : 'common';
        const rCfg = RARITY_CONFIG[bestRarity] || RARITY_CONFIG.common;
        const lv = metaState.armyPermanentLevels[uSpec.id] || 1;
        const spriteUrl = getUnitSpriteDataURL(uSpec, 'blue');
        const sockets = metaState.unitSockets?.[uSpec.id] || [null, null];
        const slot2Unlocked = isUnitSocket2Unlocked(uSpec.id);

        const dot0Class = sockets[0] ? (UNIT_CHIPS[sockets[0]]?.dotCss || '') : '';
        const dot1Style = !slot2Unlocked ? 'style="background:#0f172a;border-color:#fde047;"' : '';
        const dot1Class = slot2Unlocked && sockets[1] ? (UNIT_CHIPS[sockets[1]]?.dotCss || '') : '';

        const card = document.createElement('div');
        card.className = `army-unit-card ${rCfg.cssClass} ${owned ? '' : 'dimmed-unmatch'}`;
        card.innerHTML = `
            <div class="card-top-lv">
                <span>LV.${lv}</span>
                ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : `<span class="text-[8px] opacity-95">${owned ? rCfg.name : 'Cơ bản'}</span>`}
            </div>
            <div class="card-socket-dots">
                <span class="socket-dot ${dot0Class}"></span>
                <span class="socket-dot ${dot1Class}" ${dot1Style}></span>
            </div>
            <img src="${spriteUrl}" class="w-11 h-11 pixel-art my-0.5" alt="${uSpec.name}" />
            <div class="card-unit-title">${uSpec.name}</div>
        `;

        attachHolographicCardTilt(card);

        card.addEventListener('click', () => {
            lobbyState.selectedShowcaseUnitId = uSpec.id;
            renderArmyShowcase();
            openUnitUpgradeModal(uSpec.id);
        });

        grid.appendChild(card);
    });
}

// ============================================================================
// 7B. CHẾ ĐỘ REVIEW & PHÒNG TẬP BẮN THỬ SANDBOX (#sandbox-review-modal)
// ============================================================================
export function renderArmyReviewGrid() {
    const grid = document.getElementById('army-review-grid');
    if (!grid) return;
    grid.innerHTML = '';

    UNIT_CATALOG.forEach(uSpec => {
        const owned = hasUnitInInventory(uSpec.id);
        const bestRarity = owned ? getHighestRarityForUnit(uSpec.id) : 'common';
        const rCfg = RARITY_CONFIG[bestRarity] || RARITY_CONFIG.common;
        const spriteUrl = getUnitSpriteDataURL(uSpec, 'blue');

        const card = document.createElement('div');
        card.className = `army-unit-card ${rCfg.cssClass}`;
        card.innerHTML = `
            <div class="card-top-lv">
                <span>${uSpec.cost}⛽</span>
                <span class="card-plus-tag" style="background:#0284c7;color:#fff;">🎯 TEST</span>
            </div>
            <img src="${spriteUrl}" class="w-11 h-11 pixel-art my-0.5" alt="${uSpec.name}" />
            <div class="card-unit-title">${uSpec.name}</div>
        `;

        attachHolographicCardTilt(card);

        card.addEventListener('click', () => {
            lobbyState.selectedShowcaseUnitId = uSpec.id;
            renderArmyShowcase();
            openSandboxReviewModal(uSpec.id, bestRarity);
        });

        grid.appendChild(card);
    });
}

export function openSandboxReviewModal(unitId, initialRarityId = null) {
    const normId = normalizeUnitId(unitId);
    const bestRar = initialRarityId || getHighestRarityForUnit(normId) || 'common';

    const sb = lobbyState.sandbox;
    sb.active = true;
    sb.unitId = normId;
    sb.rarityId = bestRar;
    sb.timeSec = 0;
    sb.fireTimer = 0.2;
    sb.recoil = 0;
    sb.totalDamageDealt = 0;
    sb.elapsedTestSec = 0;
    sb.projectiles = [];
    sb.beams = [];
    sb.particles = [];
    sb.floatingDmg = [];
    sb.dummyHitFlash = 0;

    document.getElementById('sandbox-review-modal')?.classList.add('active');
    renderSandboxModalHeaderAndPills();
    startSandboxLoop();
}

export function closeSandboxReviewModal() {
    lobbyState.sandbox.active = false;
    if (lobbyState.sandbox.rafId) {
        cancelAnimationFrame(lobbyState.sandbox.rafId);
        lobbyState.sandbox.rafId = null;
    }
    document.getElementById('sandbox-review-modal')?.classList.remove('active');
}

function renderSandboxModalHeaderAndPills() {
    const sb = lobbyState.sandbox;
    const uSpec = UNIT_BY_ID[sb.unitId] || UNIT_CATALOG[0];
    const rCfg = RARITY_CONFIG[sb.rarityId] || RARITY_CONFIG.common;
    const permLv = metaState.armyPermanentLevels[uSpec.id] || 1;
    const lvMult = 1 + (permLv - 1) * 0.12;
    const effDmg = Math.max(1, Math.round(uSpec.damage * lvMult * rCfg.mult));
    const effHp = Math.max(1, Math.round(uSpec.hp * lvMult * rCfg.mult));

    document.getElementById('sb-modal-title').textContent = `👁️ REVIEW: ${uSpec.name.toUpperCase()}`;
    document.getElementById('sb-unit-name').textContent = `${uSpec.name.toUpperCase()} (LV.${permLv}) • ${uSpec.cost} ⛽`;
    document.getElementById('sb-unit-role').textContent = `${uSpec.role} • Tốc bắn ${uSpec.fireRate}/s`;

    const rarBadge = document.getElementById('sb-unit-rarity-badge');
    if (rarBadge) {
        rarBadge.textContent = `${rCfg.name.toUpperCase()} (${rCfg.mult}x)`;
        rarBadge.className = `rarity-badge ${rCfg.cssClass}`;
    }
    document.getElementById('sb-stat-dmg').textContent = formatCompactNumber(effDmg);
    document.getElementById('sb-stat-hp-range').textContent = `${formatCompactNumber(effHp)} / ${uSpec.range}px`;

    const strip = document.getElementById('sb-rarity-selector');
    if (strip) {
        const testTiers = ['common', 'uncommon', 'rare', 'epic2', 'legendary3', 'mythic4', 'secret5', 'master8', 'demon10'];
        strip.innerHTML = '';
        testTiers.forEach(rKey => {
            const cfg = RARITY_CONFIG[rKey];
            if (!cfg) return;
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `sb-rarity-pill ${cfg.cssClass} ${sb.rarityId === rKey ? 'active' : ''}`;
            pill.textContent = `${cfg.name} (${cfg.mult}x)`;
            pill.addEventListener('click', () => {
                sb.rarityId = rKey;
                sb.totalDamageDealt = 0;
                sb.elapsedTestSec = 0;
                sfx.play('gas');
                renderSandboxModalHeaderAndPills();
            });
            strip.appendChild(pill);
        });
    }
}

function startSandboxLoop() {
    const sb = lobbyState.sandbox;
    if (sb.rafId) cancelAnimationFrame(sb.rafId);
    sb.lastTs = performance.now();

    const step = now => {
        if (!sb.active) return;
        const dt = Math.min(0.05, Math.max(0.001, (now - sb.lastTs) / 1000));
        sb.lastTs = now;
        updateAndDrawSandbox(dt);
        sb.rafId = requestAnimationFrame(step);
    };
    sb.rafId = requestAnimationFrame(step);
}

function updateAndDrawSandbox(dt) {
    const sb = lobbyState.sandbox;
    const canvas = document.getElementById('sandboxCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    sb.timeSec += dt;
    sb.elapsedTestSec += dt;
    if (sb.recoil > 0) sb.recoil = Math.max(0, sb.recoil - dt * 24);
    if (sb.dummyHitFlash > 0) sb.dummyHitFlash = Math.max(0, sb.dummyHitFlash - dt);

    const uSpec = UNIT_BY_ID[sb.unitId] || UNIT_CATALOG[0];
    const rCfg = RARITY_CONFIG[sb.rarityId] || RARITY_CONFIG.common;
    const permLv = metaState.armyPermanentLevels[uSpec.id] || 1;
    const lvMult = 1 + (permLv - 1) * 0.12;
    const effDmg = Math.max(1, Math.round(uSpec.damage * lvMult * rCfg.mult));

    const unitX = 76;
    const unitY = H / 2 + 10;
    const dummyX = W - 76;
    const dummyY = H / 2 + 10;

    sb.fireTimer -= dt * (uSpec.fireRate || 1.0);
    if (sb.fireTimer <= 0) {
        sb.fireTimer = 1.0;
        sb.recoil = 5.5;
        if (uSpec.attackType === 'beam' || uSpec.attackType === 'railgun_line' || uSpec.attackType === 'heal_beam') {
            sb.beams.push({
                x1: unitX + 18,
                y1: unitY - 4,
                x2: uSpec.attackType === 'railgun_line' ? W - 12 : dummyX,
                y2: dummyY - 4,
                color: uSpec.attackType === 'heal_beam' ? '#4ade80' : (uSpec.attackType === 'railgun_line' ? '#00f2fe' : '#fde047'),
                width: uSpec.attackType === 'railgun_line' ? 5 : 3,
                ttl: 0.14
            });
            sb.totalDamageDealt += effDmg;
            sb.dummyHitFlash = 0.14;
            const prefix = uSpec.isHealer ? '+' : '-';
            const col = uSpec.isHealer ? '#4ade80' : '#fde047';
            sb.floatingDmg.push({ x: dummyX, y: dummyY - 26, text: `${prefix}${formatCompactNumber(effDmg)}`, color: col, alpha: 1.0 });
            for (let i = 0; i < 6; i++) {
                const a = Math.random() * Math.PI * 2;
                const spd = 25 + Math.random() * 55;
                sb.particles.push({ x: dummyX, y: dummyY, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 3, color: col, alpha: 1 });
            }
        } else {
            sb.projectiles.push({
                x: unitX + 18,
                y: unitY - 4,
                vx: 290,
                vy: -25,
                damage: effDmg,
                projType: uSpec.projType || 'shell'
            });
        }
    }

    sb.projectiles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 65 * dt;
        if (p.x >= dummyX - 10) {
            p.done = true;
            sb.totalDamageDealt += p.damage;
            sb.dummyHitFlash = 0.15;
            sb.floatingDmg.push({ x: dummyX, y: dummyY - 26, text: `-${formatCompactNumber(p.damage)}`, color: '#fb923c', alpha: 1.0 });
            for (let i = 0; i < 9; i++) {
                const a = Math.random() * Math.PI * 2;
                const spd = 30 + Math.random() * 70;
                const col = p.projType === 'ice_shard' ? '#38bdf8' : (p.projType === 'dark_orb' ? '#d946ef' : '#f97316');
                sb.particles.push({ x: dummyX, y: dummyY, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 3.5, color: col, alpha: 1 });
            }
        }
    });
    sb.projectiles = sb.projectiles.filter(p => !p.done);
    sb.beams.forEach(b => (b.ttl -= dt));
    sb.beams = sb.beams.filter(b => b.ttl > 0);
    sb.particles.forEach(pt => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha -= dt * 2.4;
    });
    sb.particles = sb.particles.filter(pt => pt.alpha > 0);
    sb.floatingDmg.forEach(ft => {
        ft.y -= 28 * dt;
        ft.alpha -= dt * 1.1;
    });
    sb.floatingDmg = sb.floatingDmg.filter(ft => ft.alpha > 0);

    const dpsEl = document.getElementById('sb-stat-dps');
    if (dpsEl && sb.elapsedTestSec > 0.2) {
        const dps = sb.totalDamageDealt / sb.elapsedTestSec;
        dpsEl.textContent = dps >= 10000 ? formatCompactNumber(dps) : dps.toFixed(1);
    }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 24) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 24) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(unitX, unitY, Math.min(225, uSpec.range), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    drawCanvasRarityAura(ctx, unitX, unitY + 14, 30, sb.rarityId, sb.timeSec);

    drawUnitArt(ctx, sb.unitId, unitX - sb.recoil, unitY, 54, 'blue', sb.timeSec, 0, {
        walkCycle: sb.timeSec * 8,
        rotorAngle: sb.timeSec * 24,
        recoilOffset: sb.recoil
    });

    ctx.save();
    ctx.translate(dummyX, dummyY);
    if (sb.dummyHitFlash > 0) ctx.translate((Math.random() - 0.5) * 4, 0);
    ctx.fillStyle = sb.dummyHitFlash > 0 ? '#ffffff' : (uSpec.isHealer ? '#0284c7' : '#dc2626');
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = uSpec.isHealer ? '#16a34a' : '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.font = '900 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(uSpec.isHealer ? 'ĐỒNG MINH (HP ∞)' : 'BIA TẬP BẮN (HP ∞)', 0, -27);
    ctx.restore();

    sb.beams.forEach(b => {
        ctx.save();
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.width;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
        ctx.restore();
    });
    sb.projectiles.forEach(p => {
        ctx.save();
        ctx.fillStyle = p.projType === 'ice_shard' ? '#38bdf8' : (p.projType === 'dark_orb' ? '#d946ef' : '#fde047');
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
    sb.particles.forEach(pt => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
    sb.floatingDmg.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = '900 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    });
}

// ============================================================================
// 7C. BÀN GHÉP TIẾN HÓA TƯỚNG 41 BẬC (MERGE & AUTO-MERGE O(1))
// ============================================================================
export function renderMergeInventoryGrid() {
    const grid = document.getElementById('merge-inventory-grid');
    const hintEl = document.getElementById('merge-hint-text');
    if (!grid) return;
    grid.innerHTML = '';

    if (hintEl && !lobbyState.mergeSlot1Uid) {
        hintEl.innerHTML = `Kho hiện có <b>${formatCompactNumber(getTotalCardsInInventory())} thẻ</b> • Chọn 2 thẻ giống nhau hoặc bấm <b>⚡ AUTO MERGE</b> để ghép dây chuyền O(1)!`;
    }

    const entries = Object.entries(metaState.inventoryStacks || {})
        .filter(([, qty]) => qty > 0)
        .map(([key, qty]) => {
            const [unitId, rarity] = key.split('__');
            return { key, unitId, rarity, qty, rank: RARITY_CONFIG[rarity]?.rank ?? 0 };
        })
        .sort((a, b) => b.rank - a.rank || a.unitId.localeCompare(b.unitId));

    entries.forEach(item => {
        const uSpec = UNIT_BY_ID[item.unitId] || UNIT_CATALOG[0];
        const rCfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
        const spriteUrl = getUnitSpriteDataURL(uSpec, 'blue');
        const isSelected = lobbyState.mergeSlot1Uid === item.key;

        const card = document.createElement('div');
        card.className = `army-unit-card ${rCfg.cssClass} ${isSelected ? 'selected-for-merge' : ''}`;
        card.innerHTML = `
            <div class="card-top-lv">
                <span>${rCfg.name}</span>
                ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : ''}
            </div>
            <span class="card-qty-badge" title="${item.qty.toLocaleString('en-US')} thẻ">x${formatCompactNumber(item.qty)}</span>
            <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-0.5" alt="${uSpec.name}" />
            <div class="card-unit-title">${uSpec.name}</div>
        `;

        attachHolographicCardTilt(card);

        card.addEventListener('click', () => {
            if (!rCfg.next || item.qty < 2) {
                sfx.play('cannon');
                if (hintEl) {
                    hintEl.innerHTML = `<span class="text-rose-300 font-bold">⚠️ Cần ít nhất 2 thẻ ${uSpec.name} (${rCfg.name}) để ghép tiến hóa!</span>`;
                }
                return;
            }
            lobbyState.mergeSlot1Uid = item.key;
            updateMergeWorkbenchUI();
            renderMergeInventoryGrid();
        });

        grid.appendChild(card);
    });

    updateMergeWorkbenchUI();
}

export function updateMergeWorkbenchUI() {
    const s1 = document.getElementById('merge-slot-1');
    const s2 = document.getElementById('merge-slot-2');
    const sRes = document.getElementById('merge-slot-result');
    const execBtn = document.getElementById('btn-execute-merge');

    const key = lobbyState.mergeSlot1Uid;
    const qty = key ? (metaState.inventoryStacks[key] || 0) : 0;

    if (!key || qty < 2) {
        lobbyState.mergeSlot1Uid = null;
        if (s1) s1.innerHTML = '<span class="merge-slot-placeholder">+ THẺ 1</span>';
        if (s2) s2.innerHTML = '<span class="merge-slot-placeholder">+ THẺ 2</span>';
        if (sRes) sRes.innerHTML = '<span class="merge-slot-placeholder">KẾT QUẢ</span>';
        if (execBtn) execBtn.disabled = true;
        return;
    }

    const [unitId, rarity] = key.split('__');
    const uSpec = UNIT_BY_ID[unitId] || UNIT_CATALOG[0];
    const rCfg = RARITY_CONFIG[rarity];
    const nextCfg = rCfg?.next ? RARITY_CONFIG[rCfg.next] : null;
    const spriteUrl = getUnitSpriteDataURL(uSpec, 'blue');

    const miniHtml = `<img src="${spriteUrl}" class="w-8 h-8 pixel-art" alt="${uSpec.name}" /><span style="font-size:7.5px;font-weight:900;color:#fde047;">${rCfg.name}</span>`;
    if (s1) s1.innerHTML = miniHtml;
    if (s2) s2.innerHTML = miniHtml;

    if (nextCfg && sRes) {
        sRes.innerHTML = `<img src="${spriteUrl}" class="w-8 h-8 pixel-art" alt="${uSpec.name}" /><span style="font-size:7.5px;font-weight:900;color:#4ade80;">${nextCfg.name}</span>`;
        if (execBtn) execBtn.disabled = false;
    } else if (execBtn) {
        execBtn.disabled = true;
    }
}

export function executeSingleMerge() {
    const key = lobbyState.mergeSlot1Uid;
    if (!key || (metaState.inventoryStacks[key] || 0) < 2) return;
    const [unitId, rarity] = key.split('__');
    const rCfg = RARITY_CONFIG[rarity];
    if (!rCfg || !rCfg.next) return;

    addCardToStacks(unitId, rarity, -2);
    addCardToStacks(unitId, rCfg.next, 1);
    syncRepresentativeInventoryFromStacks();

    metaState.missionsProgress.merges = (metaState.missionsProgress.merges || 0) + 1;
    saveProgress();
    sfx.play('upgrade');
    triggerHaptic(25);
    renderMergeInventoryGrid();
    renderMissionNotifDot();
}

export function executeAutoMergeAllO1() {
    const t0 = performance.now();
    let totalMerges = 0;
    const highestByUnit = {};

    UNIT_CATALOG.forEach(uSpec => {
        for (let rIdx = 0; rIdx < MAX_RARITY_RANK; rIdx++) {
            const curRar = RARITY_ORDER[rIdx];
            const nextRar = RARITY_ORDER[rIdx + 1];
            const curKey = `${uSpec.id}__${curRar}`;
            const qty = Math.floor(Number(metaState.inventoryStacks[curKey]) || 0);
            if (qty >= 2) {
                const pairs = Math.floor(qty / 2);
                addCardToStacks(uSpec.id, curRar, -(pairs * 2));
                addCardToStacks(uSpec.id, nextRar, pairs);
                highestByUnit[uSpec.id] = nextRar;
                totalMerges += pairs;
            }
        }
    });

    if (totalMerges <= 0) {
        sfx.play('cannon');
        const hintEl = document.getElementById('merge-hint-text');
        if (hintEl) hintEl.innerHTML = `<span class="text-rose-300 font-bold">⚠️ Không có cặp thẻ nào đủ điều kiện ghép tự động!</span>`;
        return;
    }

    syncRepresentativeInventoryFromStacks();
    const elapsedMs = Math.max(0.05, +(performance.now() - t0).toFixed(2));
    metaState.missionsProgress.merges = (metaState.missionsProgress.merges || 0) + totalMerges;
    saveProgress();
    sfx.play('upgrade');
    triggerHaptic(35);
    renderMergeInventoryGrid();
    renderMissionNotifDot();

    const modal = document.getElementById('auto-merge-modal');
    const grid = document.getElementById('auto-merge-results-grid');
    const sumEl = document.getElementById('auto-merge-summary-text');

    if (sumEl) {
        sumEl.innerHTML = `⚡ Đã hợp nhất dây chuyền <b>${totalMerges.toLocaleString('en-US')} lượt</b> trong <b>${elapsedMs}ms</b>!`;
    }
    if (grid) {
        grid.innerHTML = '';
        Object.entries(highestByUnit)
            .map(([uId, rar]) => ({
                uId,
                rar,
                rank: RARITY_CONFIG[rar]?.rank || 0,
                count: metaState.inventoryStacks[`${uId}__${rar}`] || 1
            }))
            .sort((a, b) => b.rank - a.rank)
            .forEach((item, idx) => {
                const uSpec = UNIT_BY_ID[item.uId] || UNIT_CATALOG[0];
                const rCfg = RARITY_CONFIG[item.rar] || RARITY_CONFIG.common;
                const spriteUrl = getUnitSpriteDataURL(uSpec, 'blue');

                const card = document.createElement('div');
                card.className = `army-unit-card ${rCfg.cssClass}`;
                card.style.animation = `cardFlipReveal 0.32s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(0.55, idx * 0.035)}s both`;
                card.innerHTML = `
                    <div class="card-top-lv">
                        <span>${rCfg.name}</span>
                        ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : ''}
                    </div>
                    <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-0.5" alt="${uSpec.name}" />
                    <span class="card-qty-badge">x${formatCompactNumber(item.count)}</span>
                    <div class="card-unit-title">${uSpec.name}</div>
                `;
                attachHolographicCardTilt(card);
                grid.appendChild(card);
            });
    }

    modal?.classList.add('active');
}

// ============================================================================
// 8. MODAL CHI TIẾT NÂNG CẤP TƯỚNG, HOÀN CẤP (-1/+1) & KHE CHIP (MỞ KHE 2 = 500 💎)
// ============================================================================
export function openUnitUpgradeModal(rawUnitId) {
    const unitId = normalizeUnitId(rawUnitId);
    lobbyState.selectedUpgradeUnitId = unitId;
    lobbyState.pendingUpgradeAddLevels = 1;
    lobbyState.activeChipSocketIdx = null;

    document.getElementById('unit-upgrade-modal')?.classList.add('active');
    document.getElementById('chip-picker-drawer')?.classList.add('hidden');
    refreshUnitUpgradeModalUI();
}

export function refreshUnitUpgradeModalUI() {
    const unitId = lobbyState.selectedUpgradeUnitId;
    const uSpec = UNIT_BY_ID[unitId] || UNIT_CATALOG[0];
    const curLv = metaState.armyPermanentLevels[unitId] || 1;
    const bestRarity = getHighestRarityForUnit(unitId);
    const rCfg = RARITY_CONFIG[bestRarity] || RARITY_CONFIG.common;

    let addLv = lobbyState.pendingUpgradeAddLevels;
    if (addLv === 'max') {
        addLv = metaState.isAdminMode ? 100 : Math.max(1, calcMaxAffordableLevels(curLv, metaState.coins));
    } else {
        addLv = Math.max(1, Math.floor(Number(addLv) || 1));
    }

    const nextLv = curLv + addLv;
    const totalCost = metaState.isAdminMode ? 0 : calcBulkUpgradeTotalCost(curLv, addLv);

    const curMult = (1 + (curLv - 1) * 0.12) * rCfg.mult;
    const nextMult = (1 + (nextLv - 1) * 0.12) * rCfg.mult;

    document.getElementById('upg-modal-unit-name').textContent = uSpec.name.toUpperCase();
    document.getElementById('upg-modal-card-frame').className = `upg-unit-avatar-box ${rCfg.cssClass}`;
    document.getElementById('upg-modal-sprite').src = getUnitSpriteDataURL(uSpec, 'blue');
    document.getElementById('upg-modal-rarity-badge').textContent = `${rCfg.name.toUpperCase()} (${rCfg.mult}x)`;
    document.getElementById('upg-modal-rarity-badge').className = `rarity-badge ${rCfg.cssClass}`;
    document.getElementById('upg-modal-level-badge').textContent = `LV.${curLv} ➔ LV.${nextLv} (+${addLv.toLocaleString('en-US')})`;
    document.getElementById('upg-modal-role').textContent = uSpec.role;
    document.getElementById('upg-modal-mult-info').textContent = `Hệ số Độ hiếm: ${rCfg.mult}x HP & DMG`;
    document.getElementById('upg-modal-tier-bracket').textContent = getUpgradeTierBracketText(curLv);

    document.getElementById('upg-cur-dmg').textContent = formatCompactNumber(Math.round(uSpec.damage * curMult));
    document.getElementById('upg-next-dmg').textContent = formatCompactNumber(Math.round(uSpec.damage * nextMult));
    document.getElementById('upg-cur-hp').textContent = formatCompactNumber(Math.round(uSpec.hp * curMult));
    document.getElementById('upg-next-hp').textContent = formatCompactNumber(Math.round(uSpec.hp * nextMult));
    document.getElementById('upg-unit-gas').textContent = `${uSpec.cost} Xăng`;

    const customInput = document.getElementById('upg-custom-add-lv-input');
    if (customInput && document.activeElement !== customInput) {
        customInput.value = addLv;
    }

    document.getElementById('upg-btn-action-label').textContent = `⬆️ NÂNG +${addLv.toLocaleString('en-US')} CẤP`;
    document.getElementById('upg-cost-coins').textContent = metaState.isAdminMode
        ? 'MIỄN PHÍ'
        : `🪙 ${formatCurrency(totalCost)}`;

    const confirmBtn = document.getElementById('btn-confirm-unit-upgrade');
    if (confirmBtn) confirmBtn.disabled = !metaState.isAdminMode && metaState.coins < totalCost;

    const refundBtn = document.getElementById('btn-open-level-refund');
    if (refundBtn) refundBtn.disabled = curLv <= 1;

    renderUnitChipSocketsRow(unitId);
}

export function renderUnitChipSocketsRow(unitId) {
    const row = document.getElementById('unit-sockets-slots-row');
    if (!row) return;
    row.innerHTML = '';

    const sockets = metaState.unitSockets?.[unitId] || [null, null];
    const slot2Unlocked = isUnitSocket2Unlocked(unitId);

    [0, 1].forEach(slotIdx => {
        const equippedChipId = sockets[slotIdx];
        const chipObj = equippedChipId ? UNIT_CHIPS[equippedChipId] : null;
        const btn = document.createElement('button');
        btn.type = 'button';

        if (slotIdx === 1 && !slot2Unlocked) {
            btn.className = 'chip-slot-btn locked-slot2';
            btn.innerHTML = `
                <div class="chip-slot-icon">🔒</div>
                <div class="chip-slot-text-wrap">
                    <span class="chip-slot-name text-amber-800">KHE CHIP 2 (KHÓA)</span>
                    <span class="chip-slot-effect text-amber-700">Chạm mở: 💎 ${CHIP_SOCKET_2_UNLOCK_GEMS}</span>
                </div>
            `;
            btn.addEventListener('click', () => {
                if (!metaState.isAdminMode && metaState.gems < CHIP_SOCKET_2_UNLOCK_GEMS) {
                    sfx.play('cannon');
                    alert(`Cần 💎 ${CHIP_SOCKET_2_UNLOCK_GEMS} Gems để mở khóa Khe Chip 2 cho binh chủng này!`);
                    return;
                }
                if (unlockUnitSocket2(unitId)) {
                    sfx.play('upgrade');
                    triggerHaptic(25);
                    updateLobbyTopBar();
                    renderUnitChipSocketsRow(unitId);
                    renderArmyUnitsGrid();
                }
            });
        } else if (chipObj) {
            btn.className = 'chip-slot-btn equipped';
            btn.dataset.chip = chipObj.id;
            btn.innerHTML = `
                <div class="chip-slot-icon">${chipObj.icon}</div>
                <div class="chip-slot-text-wrap">
                    <span class="chip-slot-name">${chipObj.name}</span>
                    <span class="chip-slot-effect">Chạm để đổi / tháo</span>
                </div>
            `;
            btn.addEventListener('click', () => {
                lobbyState.activeChipSocketIdx = slotIdx;
                openChipPickerDrawer(unitId, slotIdx);
            });
        } else {
            btn.className = 'chip-slot-btn';
            btn.innerHTML = `
                <div class="chip-slot-icon">➕</div>
                <div class="chip-slot-text-wrap">
                    <span class="chip-slot-name text-slate-700">KHE CHIP ${slotIdx + 1} (TRỐNG)</span>
                    <span class="chip-slot-effect">Chạm để gắn Chip từ Kho</span>
                </div>
            `;
            btn.addEventListener('click', () => {
                lobbyState.activeChipSocketIdx = slotIdx;
                openChipPickerDrawer(unitId, slotIdx);
            });
        }

        row.appendChild(btn);
    });
}

function openChipPickerDrawer(unitId, slotIdx) {
    const drawer = document.getElementById('chip-picker-drawer');
    if (!drawer) return;
    drawer.classList.remove('hidden');
    drawer.innerHTML = '';

    const sockets = metaState.unitSockets?.[unitId] || [null, null];
    if (sockets[slotIdx]) {
        const unequipRow = document.createElement('div');
        unequipRow.className = 'chip-item-card';
        unequipRow.innerHTML = `
            <span class="text-xs font-black text-rose-700">🔓 Tháo Chip đang gắn ở Khe ${slotIdx + 1}</span>
            <button type="button" class="btn-3d btn-3d-rose px-2.5 py-1 text-[10px]">THÁO CHIP</button>
        `;
        unequipRow.querySelector('button').addEventListener('click', () => {
            unequipChipFromUnitSlot(unitId, slotIdx);
            sfx.play('gas');
            drawer.classList.add('hidden');
            refreshUnitUpgradeModalUI();
            renderArmyUnitsGrid();
        });
        drawer.appendChild(unequipRow);
    }

    Object.values(UNIT_CHIPS).forEach(chip => {
        const owned = getChipOwnedCount(chip.id);
        const hasStock = metaState.isAdminMode || owned > 0;
        const isRec = Array.isArray(chip.recommendedUnits) && chip.recommendedUnits.includes(unitId);

        const card = document.createElement('div');
        card.className = `chip-item-card ${isRec ? 'compatible' : ''}`;
        card.innerHTML = `
            <div class="flex items-center gap-2 flex-1 text-left">
                <span class="text-lg">${chip.icon}</span>
                <div>
                    <div class="text-[10.5px] font-black text-slate-900">
                        ${chip.name} <span class="text-sky-700 vt323-num">(Kho: ${metaState.isAdminMode ? '∞' : owned})</span>
                        ${isRec ? '<span class="text-emerald-600 text-[9px]">(Khuyên dùng)</span>' : ''}
                    </div>
                    <div class="text-[8.5px] font-bold text-slate-600">${chip.desc}</div>
                </div>
            </div>
            <div class="flex flex-col gap-1">
                <button type="button" data-act="equip" class="btn-3d btn-3d-green px-2.5 py-1 text-[9.5px]" ${hasStock ? '' : 'disabled'}>
                    ${hasStock ? 'GẮN' : 'HẾT CHIP'}
                </button>
                ${!hasStock ? `<button type="button" data-act="quickbuy" class="btn-3d btn-3d-amber px-2 py-0.5 text-[8.5px]">MUA 2.5K🪙</button>` : ''}
            </div>
        `;
        card.querySelector('[data-act="equip"]')?.addEventListener('click', () => {
            if (!equipChipToUnitSlot(unitId, slotIdx, chip.id).ok) {
                sfx.play('cannon');
                return;
            }
            sfx.play('upgrade');
            triggerHaptic(20);
            drawer.classList.add('hidden');
            refreshUnitUpgradeModalUI();
            renderArmyUnitsGrid();
        });
        card.querySelector('[data-act="quickbuy"]')?.addEventListener('click', () => {
            if (buyChipItem(chip.id, 'coins')) {
                sfx.play('upgrade');
                updateLobbyTopBar();
                openChipPickerDrawer(unitId, slotIdx);
            } else {
                sfx.play('cannon');
            }
        });
        drawer.appendChild(card);
    });
}

// ============================================================================
// 9. CÁC POPUP: TALENTS 6 NHÁNH, VÒNG QUAY (SKIP SPIN + LỊCH SỬ), Ụ PHÁO, INDEX, ARCADE
// ============================================================================
export function openTalentsModal() {
    document.getElementById('talents-modal')?.classList.add('active');
    renderTalentsModal();
}

export function renderTalentsModal() {
    const container = document.getElementById('talents-list-container');
    const medCountEl = document.getElementById('modal-medals-count');
    if (medCountEl) medCountEl.textContent = formatCurrency(metaState.medals);
    if (!container) return;

    container.innerHTML = '';
    Object.values(META_TALENTS).forEach(t => {
        const curLv = Number(metaState.metaTalents?.[t.id]) || 0;
        const isMax = curLv >= t.maxLevel;
        const cost = t.baseCost + curLv * t.costStep;
        const canUpg = !isMax && (metaState.isAdminMode || metaState.medals >= cost);

        let pipsHtml = '<div class="talent-level-pips">';
        for (let i = 1; i <= t.maxLevel; i++) {
            pipsHtml += `<span class="talent-pip ${i <= curLv ? 'active' : ''}"></span>`;
        }
        pipsHtml += '</div>';

        const card = document.createElement('div');
        card.className = `talent-node-card ${isMax ? 'talent-maxed' : ''}`;
        card.innerHTML = `
            <div class="talent-node-icon">${t.icon}</div>
            <div class="talent-node-info">
                <div class="talent-node-title">${t.name} <span class="text-sky-700 vt323-num">(LV.${curLv}/${t.maxLevel})</span></div>
                <div class="talent-node-desc">${t.desc}</div>
                <div class="talent-node-stat-preview">${t.getEffectText(curLv)}</div>
                ${pipsHtml}
            </div>
            <button type="button" class="btn-3d btn-3d-green talent-upgrade-btn" ${canUpg ? '' : 'disabled'}>
                <span>${isMax ? 'MAX' : 'NÂNG'}</span>
                <span class="talent-cost-num">${isMax ? '★' : `🎖️ ${metaState.isAdminMode ? '0' : cost}`}</span>
            </button>
        `;

        card.querySelector('button').addEventListener('click', () => {
            if (isMax) return;
            if (!metaState.isAdminMode && metaState.medals < cost) {
                sfx.play('cannon');
                return;
            }
            if (!metaState.isAdminMode) metaState.medals -= cost;
            metaState.metaTalents[t.id] = curLv + 1;
            saveProgress();
            sfx.play('upgrade');
            triggerHaptic(20);
            updateLobbyTopBar();
            renderTalentsModal();
        });

        container.appendChild(card);
    });
}

let wheelCurrentRotation = 0;
let isWheelSpinning = false;

export function openLuckyWheelModal() {
    document.getElementById('lucky-wheel-modal')?.classList.add('active');

    const skipChk = document.getElementById('chk-skip-wheel-anim');
    if (skipChk) {
        skipChk.checked = !!metaState.wheelSkipAnim;
        skipChk.onchange = () => {
            metaState.wheelSkipAnim = skipChk.checked;
            saveProgress();
        };
    }

    drawLuckyWheelCanvas(wheelCurrentRotation);
    updateLuckyWheelUI();
}

function drawLuckyWheelCanvas(rotRad) {
    const canvas = document.getElementById('luckyWheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const r = cx - 6;

    ctx.clearRect(0, 0, W, H);
    const slices = LUCKY_WHEEL_CONFIG.slices;
    const arc = (Math.PI * 2) / slices.length;

    slices.forEach((sl, i) => {
        const startA = rotRad + i * arc - Math.PI / 2 - arc / 2;
        const endA = startA + arc;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startA, endA);
        ctx.closePath();
        ctx.fillStyle = sl.bgColor;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startA + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = sl.textColor;
        ctx.font = '900 11px sans-serif';
        ctx.fillText(sl.label, r - 12, 4);
        ctx.restore();
    });
}

function updateLuckyWheelUI() {
    const pity = metaState.wheelPity || 0;
    const pityEl = document.getElementById('lucky-pity-count');
    const barEl = document.getElementById('lucky-pity-bar-fill');
    const totalJpEl = document.getElementById('wheel-jackpot-total-count');
    const histEl = document.getElementById('lucky-wheel-jackpot-history');

    if (pityEl) pityEl.textContent = `${pity} / 100`;
    if (barEl) barEl.style.width = `${Math.min(100, pity)}%`;
    if (totalJpEl) totalJpEl.textContent = `${metaState.wheelJackpotTotal || 0} lần`;

    if (histEl) {
        const list = metaState.wheelJackpotHistory || [];
        histEl.innerHTML = list.length === 0
            ? '<div class="italic text-slate-400">Chưa có lịch sử nổ Jackpot. Hãy thử vận may ngay!</div>'
            : list.map(entry => {
                if (typeof entry === 'string') return `<div>💠 <b>${entry}</b></div>`;
                return `<div>💠 <b>${entry.unitName}</b> — <span class="text-fuchsia-300 font-black">${entry.rarityName}</span> <span class="text-slate-400">(${entry.timeStr || ''})</span></div>`;
            }).join('');
    }
}

export function spinLuckyWheelBatch(spinCount) {
    if (isWheelSpinning) return;
    const count = Math.max(1, Math.min(100000, Math.floor(Number(spinCount) || 1)));
    const bundles = Math.floor(count / 10);
    const rem = count % 10;
    const totalCost = metaState.isAdminMode ? 0 : bundles * LUCKY_WHEEL_CONFIG.tenPrice + rem * LUCKY_WHEEL_CONFIG.singlePrice;

    if (!metaState.isAdminMode && metaState.gems < totalCost) {
        sfx.play('cannon');
        alert(`Không đủ Gems! Cần 💎 ${totalCost.toLocaleString('en-US')} Gems.`);
        return;
    }

    if (!metaState.isAdminMode) metaState.gems -= totalCost;

    const slices = LUCKY_WHEEL_CONFIG.slices;
    const totalW = slices.reduce((s, x) => s + x.weight, 0);
    let lastSliceIdx = 0;
    let jackpotHitText = null;
    const rewardSummary = [];
    const nowTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    for (let s = 0; s < count; s++) {
        metaState.wheelPity = (metaState.wheelPity || 0) + 1;
        let pickedSlice = slices[0];

        if (metaState.wheelPity >= LUCKY_WHEEL_CONFIG.pityMax) {
            metaState.wheelPity = 0;
            pickedSlice = slices[7];
        } else {
            let roll = Math.random() * totalW;
            for (const sl of slices) {
                roll -= sl.weight;
                if (roll <= 0) {
                    pickedSlice = sl;
                    break;
                }
            }
            if (pickedSlice.index === 7) metaState.wheelPity = 0;
        }

        lastSliceIdx = pickedSlice.index;

        if (pickedSlice.type === 'coins') {
            metaState.coins += pickedSlice.amount;
            if (count === 1) rewardSummary.push(pickedSlice.fullName);
        } else if (pickedSlice.type === 'gems') {
            metaState.gems += pickedSlice.amount;
            if (count === 1) rewardSummary.push(pickedSlice.fullName);
        } else if (pickedSlice.type === 'medals') {
            metaState.medals += pickedSlice.amount;
            if (count === 1) rewardSummary.push(pickedSlice.fullName);
        } else if (pickedSlice.type === 'card') {
            const u = UNIT_CATALOG[Math.floor(Math.random() * UNIT_CATALOG.length)];
            addCardToStacks(u.id, pickedSlice.rarity, 1);
            if (count === 1) rewardSummary.push(`${u.name} (${RARITY_CONFIG[pickedSlice.rarity].name})`);
        } else if (pickedSlice.type === 'jackpot_card') {
            const u = UNIT_CATALOG[Math.floor(Math.random() * UNIT_CATALOG.length)];
            const jpRar = pickedSlice.rarities[Math.floor(Math.random() * pickedSlice.rarities.length)];
            addCardToStacks(u.id, jpRar, 1);
            const rName = RARITY_CONFIG[jpRar]?.name || jpRar;
            jackpotHitText = `${u.name} [${rName}]`;
            metaState.wheelJackpotTotal = (metaState.wheelJackpotTotal || 0) + 1;
            metaState.wheelJackpotHistory = [
                { unitName: u.name, rarityName: rName, timeStr: nowTimeStr },
                ...(metaState.wheelJackpotHistory || [])
            ].slice(0, 15);
            rewardSummary.push(`💠 JACKPOT: ${jackpotHitText}`);
        }
    }

    syncRepresentativeInventoryFromStacks();
    saveProgress();
    updateLobbyTopBar();
    updateLuckyWheelUI();

    const bannerEl = document.getElementById('lucky-wheel-result-banner');
    const finalMsg = count === 1
        ? `🎉 Nhận được: <b>${rewardSummary[0]}</b>!`
        : `🎉 Hoàn tất <b>${count.toLocaleString('en-US')} lượt quay</b>! ${jackpotHitText ? `Nổ hũ: <b>${jackpotHitText}</b>` : 'Phần thưởng đã cộng thẳng vào tài khoản!'}`;

    if (metaState.wheelSkipAnim || count > 1) {
        const arc = (Math.PI * 2) / slices.length;
        wheelCurrentRotation = -(lastSliceIdx * arc);
        drawLuckyWheelCanvas(wheelCurrentRotation);
        sfx.play('upgrade');
        if (bannerEl) {
            bannerEl.innerHTML = finalMsg;
            bannerEl.classList.toggle('jackpot-hit', !!jackpotHitText);
        }
        return;
    }

    isWheelSpinning = true;
    const arc = (Math.PI * 2) / slices.length;
    const startRot = wheelCurrentRotation;
    const targetRot = startRot + Math.PI * 8 - ((startRot + lastSliceIdx * arc) % (Math.PI * 2));
    const startTs = performance.now();
    const durMs = 1500;

    const animStep = now => {
        const t = Math.min(1, (now - startTs) / durMs);
        const ease = 1 - Math.pow(1 - t, 3);
        wheelCurrentRotation = startRot + (targetRot - startRot) * ease;
        drawLuckyWheelCanvas(wheelCurrentRotation);

        if (t < 1) {
            requestAnimationFrame(animStep);
        } else {
            isWheelSpinning = false;
            sfx.play('upgrade');
            if (bannerEl) {
                bannerEl.innerHTML = finalMsg;
                bannerEl.classList.toggle('jackpot-hit', !!jackpotHitText);
            }
        }
    };
    requestAnimationFrame(animStep);
}

// ============================================================================
// 10. Ụ PHÁO CĂN CỨ XANH & SỔ TAY INDEX (CODEX)
// ============================================================================
export function openBaseTurretModal() {
    document.getElementById('base-turret-modal')?.classList.add('active');
    renderBaseTurretModal();
}

export function renderBaseTurretModal() {
    const container = document.getElementById('turret-options-container');
    if (!container) return;

    const curType = metaState.baseTurret?.type || 'gatling';
    const curLv = metaState.baseTurret?.level || 1;
    const curCfg = BASE_TURRET_CONFIG[curType] || BASE_TURRET_CONFIG.gatling;
    const lvMult = 1 + (curLv - 1) * 0.15;
    const upgCost = metaState.isAdminMode ? 0 : getBaseTurretUpgradeCost(curLv);

    document.getElementById('turret-modal-level-val').textContent = `LV.${curLv}`;
    document.getElementById('turret-modal-stats-badge').textContent =
        `DMG: ${Math.round(curCfg.baseDamage * lvMult)} • Tầm: ${curCfg.range}`;
    document.getElementById('turret-upgrade-cost-label').textContent = metaState.isAdminMode
        ? 'MIỄN PHÍ'
        : `🪙 ${upgCost.toLocaleString('en-US')}`;

    const upgBtn = document.getElementById('btn-upgrade-base-turret');
    if (upgBtn) {
        upgBtn.disabled = !metaState.isAdminMode && metaState.coins < upgCost;
        upgBtn.onclick = () => {
            if (!metaState.isAdminMode && metaState.coins < upgCost) {
                sfx.play('cannon');
                return;
            }
            if (!metaState.isAdminMode) metaState.coins -= upgCost;
            metaState.baseTurret.level = curLv + 1;
            saveProgress();
            sfx.play('upgrade');
            triggerHaptic(20);
            updateLobbyTopBar();
            renderBaseTurretModal();
        };
    }

    container.innerHTML = '';
    Object.values(BASE_TURRET_CONFIG).forEach(t => {
        const isActive = t.id === curType;
        const card = document.createElement('div');
        card.className = `turret-option-card ${isActive ? 'active-turret' : ''}`;
        card.innerHTML = `
            <canvas width="40" height="40" class="pixel-art flex-shrink-0"></canvas>
            <div class="flex-1 text-left">
                <div class="text-xs font-black text-slate-900">${t.icon} ${t.name}</div>
                <div class="text-[9.5px] font-bold text-slate-600 leading-tight mt-0.5">${t.desc}</div>
            </div>
            <button type="button" class="btn-3d ${isActive ? 'btn-3d-green' : 'btn-3d-slate'} px-2.5 py-1.5 text-[10px]">
                ${isActive ? '✓ ĐANG DÙNG' : 'CHỌN'}
            </button>
        `;

        const c = card.querySelector('canvas');
        if (c) drawBaseTurretArt(c.getContext('2d'), t.id, 20, 20, -Math.PI / 2, 0.5);

        card.querySelector('button').addEventListener('click', () => {
            metaState.baseTurret.type = t.id;
            saveProgress();
            sfx.play('gas');
            updateLobbyTopBar();
            renderBaseTurretModal();
        });

        container.appendChild(card);
    });
}

export function openCodexModal() {
    document.getElementById('codex-modal')?.classList.add('active');
    renderCodexModal();
}

export function renderCodexModal() {
    const listEl = document.getElementById('codex-units-list');
    const sumEl = document.getElementById('codex-claimed-summary');
    if (!listEl) return;

    let claimedCount = 0;
    const totalMilestones = UNIT_CATALOG.length * CODEX_MILESTONES.length;

    listEl.innerHTML = '';
    UNIT_CATALOG.forEach(uSpec => {
        const maxRank = getHighestEverRarityRankForUnit(uSpec.id);
        const spriteUrl = getUnitSpriteDataURL(uSpec, 'blue');

        const row = document.createElement('div');
        row.className = 'codex-unit-row';

        let msHtml = '<div class="codex-milestones-grid">';
        CODEX_MILESTONES.forEach(ms => {
            const key = `${uSpec.id}__${ms.id}`;
            const isClaimed = !!metaState.codexClaimed?.[key];
            if (isClaimed) claimedCount++;
            const canClaim = !isClaimed && maxRank >= ms.minRank;

            const cls = isClaimed ? 'ms-claimed' : (canClaim ? 'ms-claimable' : 'ms-locked');
            const label = isClaimed ? '✓ ĐÃ NHẬN' : `${ms.label} (+${ms.rewardGems}💎)`;
            msHtml += `<button type="button" data-codex-key="${key}" data-ms-id="${ms.id}" class="codex-ms-btn ${cls}" ${canClaim ? '' : 'disabled'}>${label}</button>`;
        });
        msHtml += '</div>';

        row.innerHTML = `
            <div class="flex items-center gap-2 text-left">
                <img src="${spriteUrl}" class="w-8 h-8 pixel-art" alt="${uSpec.name}" />
                <div class="flex-1">
                    <div class="text-xs font-black text-slate-900">${uSpec.name}</div>
                    <div class="text-[9px] font-bold text-slate-500">${uSpec.role}</div>
                </div>
            </div>
            ${msHtml}
        `;

        row.querySelectorAll('[data-codex-key]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.codexKey;
                const ms = CODEX_MILESTONES.find(x => x.id === btn.dataset.msId);
                if (!ms || metaState.codexClaimed?.[key]) return;
                if (!metaState.codexClaimed) metaState.codexClaimed = {};
                metaState.codexClaimed[key] = true;
                metaState.gems += ms.rewardGems;
                metaState.medals += ms.rewardMedals;
                saveProgress();
                sfx.play('upgrade');
                updateLobbyTopBar();
                renderCodexModal();
            });
        });

        listEl.appendChild(row);
    });

    if (sumEl) sumEl.textContent = `${claimedCount} / ${totalMilestones}`;
}

export function claimAllCodexMilestones() {
    let anyClaimed = false;
    if (!metaState.codexClaimed) metaState.codexClaimed = {};

    UNIT_CATALOG.forEach(uSpec => {
        const maxRank = getHighestEverRarityRankForUnit(uSpec.id);
        CODEX_MILESTONES.forEach(ms => {
            const key = `${uSpec.id}__${ms.id}`;
            if (!metaState.codexClaimed[key] && maxRank >= ms.minRank) {
                metaState.codexClaimed[key] = true;
                metaState.gems += ms.rewardGems;
                metaState.medals += ms.rewardMedals;
                anyClaimed = true;
            }
        });
    });

    if (anyClaimed) {
        saveProgress();
        sfx.play('upgrade');
        triggerHaptic(30);
        updateLobbyTopBar();
        renderCodexModal();
    } else {
        sfx.play('cannon');
    }
}

// ============================================================================
// 11. GẮN TOÀN BỘ SỰ KIỆN GIAO DIỆN LOBBY & HIỆU ỨNG RIPPLE (BIND LOBBY EVENTS)
// ============================================================================
function bindGlobalButtonRipples() {
    document.addEventListener('pointerdown', e => {
        const btn = e.target.closest('.btn-3d');
        if (!btn || btn.disabled) return;
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('span');
        ripple.className = 'ui-ripple-circle';
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    });
}

export function bindLobbyEvents(onStartBattleCallback) {
    startBattleHandlerRef = onStartBattleCallback;
    bindGlobalButtonRipples();

    // 1. Chuyển 5 Tab dưới đáy
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sfx.play('gas');
            switchLobbyTab(btn.dataset.tab);
        });
    });

    // 2. Mở World Campaign Roadmap Toàn Cảnh 54 Level với hiệu ứng Cloud-Dive
    document.getElementById('lobby-world-viewport-card')?.addEventListener('click', () => {
        openWorldRoadmapModal(getCurrentCampaignLevel());
    });
    document.getElementById('btn-open-world-roadmap')?.addEventListener('click', () => {
        openWorldRoadmapModal(getCurrentCampaignLevel());
    });
    document.getElementById('btn-close-world-roadmap')?.addEventListener('click', () => {
        closeWorldRoadmapModal();
    });

    // Nút START khổng lồ ở sảnh chính: Vào thẳng Level hiện tại
    document.getElementById('btn-start-battle')?.addEventListener('click', () => {
        const curLv = getCurrentCampaignLevel();
        const defDiff = getDefaultDifficultyForMap(curLv);
        if (typeof onStartBattleCallback === 'function') {
            onStartBattleCallback(curLv, defDiff, 'destroy');
        }
    });

    bindWorldRoadmapInteractions();

    // 3. Hồ sơ Chỉ huy & Đổi tên
    document.getElementById('btn-edit-name')?.addEventListener('click', () => {
        const inp = document.getElementById('player-name-input');
        if (inp) inp.value = metaState.playerName || '';
        document.getElementById('name-modal')?.classList.add('active');
    });

    document.getElementById('btn-confirm-name')?.addEventListener('click', () => {
        const inp = document.getElementById('player-name-input');
        const err = document.getElementById('name-error-msg');
        const val = (inp?.value || '').trim();
        if (!val || val.length > 14) {
            err?.classList.remove('hidden');
            return;
        }
        err?.classList.add('hidden');
        metaState.playerName = val.toUpperCase();
        saveProgress();
        updateLobbyTopBar();
        document.getElementById('name-modal')?.classList.remove('active');
        sfx.play('upgrade');
    });

    // 4. Cài đặt & Admin Mode
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
        const badge = document.getElementById('settings-mode-badge');
        if (badge) {
            badge.textContent = metaState.isAdminMode ? 'QUYỀN ADMIN ∞' : 'NGƯỜI CHƠI THƯỜNG';
            badge.className = metaState.isAdminMode ? 'mode-pill-admin' : 'mode-pill-normal';
        }
        document.getElementById('admin-login-section')?.classList.toggle('hidden', metaState.isAdminMode);
        document.getElementById('admin-active-section')?.classList.toggle('hidden', !metaState.isAdminMode);
        document.getElementById('settings-modal')?.classList.add('active');
    });
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
        document.getElementById('settings-modal')?.classList.remove('active');
    });
    document.getElementById('btn-toggle-admin-form')?.addEventListener('click', () => {
        document.getElementById('admin-password-form')?.classList.toggle('hidden');
    });
    document.getElementById('btn-submit-admin-pass')?.addEventListener('click', () => {
        const pass = (document.getElementById('admin-password-input')?.value || '').trim();
        const fb = document.getElementById('admin-auth-feedback');
        if (pass === ADMIN_PASSWORD) {
            metaState.isAdminMode = true;
            saveProgress();
            updateLobbyTopBar();
            renderBattleStageView();
            renderChallengeRoadmap();
            renderSkillTreeTab();
            sfx.play('upgrade');
            document.getElementById('settings-modal')?.classList.remove('active');
        } else if (fb) {
            fb.textContent = '❌ Sai mật khẩu Admin!';
            fb.className = 'text-[11px] font-extrabold mt-1.5 text-center text-rose-600';
            fb.classList.remove('hidden');
            sfx.play('cannon');
        }
    });
    document.getElementById('btn-Return-normal-mode')?.addEventListener('click', () => {
        metaState.isAdminMode = false;
        saveProgress();
        updateLobbyTopBar();
        renderBattleStageView();
        renderChallengeRoadmap();
        renderSkillTreeTab();
        document.getElementById('settings-modal')?.classList.remove('active');
    });
    document.getElementById('btn-settings-rename')?.addEventListener('click', () => {
        document.getElementById('settings-modal')?.classList.remove('active');
        document.getElementById('name-modal')?.classList.add('active');
    });
    document.getElementById('btn-settings-sound')?.addEventListener('click', e => {
        sfx.enabled = !sfx.enabled;
        e.currentTarget.textContent = sfx.enabled ? '🔊 ÂM THANH: BẬT' : '🔇 ÂM THANH: TẮT';
    });
    document.getElementById('btn-reset-account-data')?.addEventListener('click', () => {
        document.getElementById('reset-confirm-modal')?.classList.add('active');
    });
    document.getElementById('btn-close-reset-confirm')?.addEventListener('click', () => {
        document.getElementById('reset-confirm-modal')?.classList.remove('active');
    });
    document.getElementById('btn-cancel-reset-data')?.addEventListener('click', () => {
        document.getElementById('reset-confirm-modal')?.classList.remove('active');
    });
    document.getElementById('btn-confirm-reset-data')?.addEventListener('click', () => {
        resetAllAccountData();
    });

    // 5. Tab SHOP: Gacha Rương
    document.getElementById('btn-open-leg-1')?.addEventListener('click', () => triggerSingleOrTenGacha('legendary', 1));
    document.getElementById('btn-open-leg-10')?.addEventListener('click', () => triggerSingleOrTenGacha('legendary', 10));
    document.getElementById('btn-open-leg-custom')?.addEventListener('click', () => openCustomGachaConfirmModal('legendary'));

    document.getElementById('btn-open-epic-1')?.addEventListener('click', () => triggerSingleOrTenGacha('epic', 1));
    document.getElementById('btn-open-epic-10')?.addEventListener('click', () => triggerSingleOrTenGacha('epic', 10));
    document.getElementById('btn-open-epic-custom')?.addEventListener('click', () => openCustomGachaConfirmModal('epic'));

    document.querySelectorAll('.crate-preset-qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetInp = document.getElementById(btn.dataset.targetInput);
            if (targetInp) targetInp.value = btn.dataset.qty;
            openCustomGachaConfirmModal(btn.dataset.crate);
        });
    });

    document.getElementById('btn-close-gacha-confirm')?.addEventListener('click', () => {
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');
    });
    document.getElementById('btn-cancel-custom-gacha')?.addEventListener('click', () => {
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');
    });
    document.getElementById('btn-confirm-custom-gacha')?.addEventListener('click', () => {
        const p = lobbyState.pendingCustomGacha;
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');
        if (p) executeGachaOpening(p.crateType, p.qty, p.finalCost);
    });
    document.getElementById('btn-close-gacha')?.addEventListener('click', () => {
        document.getElementById('gacha-result-modal')?.classList.remove('active');
    });

    // 6. Tab ARMY: ARMY / REVIEW / MERGE & Modal Nâng cấp / Hoàn cấp / Sandbox
    document.getElementById('btn-mode-army')?.addEventListener('click', () => {
        lobbyState.armyMode = 'army';
        renderArmyTab();
    });
    document.getElementById('btn-mode-review')?.addEventListener('click', () => {
        lobbyState.armyMode = 'review';
        renderArmyTab();
    });
    document.getElementById('btn-mode-merge')?.addEventListener('click', () => {
        lobbyState.armyMode = 'merge';
        renderArmyTab();
    });

    document.getElementById('btn-close-sandbox-modal')?.addEventListener('click', () => closeSandboxReviewModal());
    document.getElementById('btn-reset-sandbox-dps')?.addEventListener('click', () => {
        lobbyState.sandbox.totalDamageDealt = 0;
        lobbyState.sandbox.elapsedTestSec = 0;
        sfx.play('gas');
    });

    document.getElementById('merge-slot-1')?.addEventListener('click', () => {
        lobbyState.mergeSlot1Uid = null;
        renderMergeInventoryGrid();
    });
    document.getElementById('merge-slot-2')?.addEventListener('click', () => {
        lobbyState.mergeSlot1Uid = null;
        renderMergeInventoryGrid();
    });
    document.getElementById('btn-execute-merge')?.addEventListener('click', () => executeSingleMerge());
    document.getElementById('btn-auto-merge')?.addEventListener('click', () => executeAutoMergeAllO1());
    document.getElementById('btn-close-auto-merge')?.addEventListener('click', () => {
        document.getElementById('auto-merge-modal')?.classList.remove('active');
    });
    document.getElementById('btn-close-auto-merge-x')?.addEventListener('click', () => {
        document.getElementById('auto-merge-modal')?.classList.remove('active');
    });

    document.getElementById('btn-close-upg-modal')?.addEventListener('click', () => {
        document.getElementById('unit-upgrade-modal')?.classList.remove('active');
    });

    document.querySelectorAll('.upg-quick-lv-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.upg-quick-lv-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            lobbyState.pendingUpgradeAddLevels = btn.dataset.addLv === 'max' ? 'max' : parseInt(btn.dataset.addLv, 10);
            refreshUnitUpgradeModalUI();
        });
    });

    document.getElementById('upg-custom-add-lv-input')?.addEventListener('input', e => {
        lobbyState.pendingUpgradeAddLevels = Math.max(1, Math.min(999999, parseInt(e.target.value || '1', 10) || 1));
        refreshUnitUpgradeModalUI();
    });

    document.getElementById('btn-confirm-unit-upgrade')?.addEventListener('click', () => {
        const unitId = lobbyState.selectedUpgradeUnitId;
        const curLv = metaState.armyPermanentLevels[unitId] || 1;
        const addLv = lobbyState.pendingUpgradeAddLevels === 'max'
            ? (metaState.isAdminMode ? 100 : Math.max(1, calcMaxAffordableLevels(curLv, metaState.coins)))
            : Math.max(1, Number(lobbyState.pendingUpgradeAddLevels) || 1);

        const cost = metaState.isAdminMode ? 0 : calcBulkUpgradeTotalCost(curLv, addLv);
        if (!metaState.isAdminMode && metaState.coins < cost) {
            sfx.play('cannon');
            return;
        }
        if (!metaState.isAdminMode) metaState.coins -= cost;
        metaState.armyPermanentLevels[unitId] = curLv + addLv;
        metaState.missionsProgress.upgrades = (metaState.missionsProgress.upgrades || 0) + addLv;
        saveProgress();
        sfx.play('upgrade');
        triggerHaptic(25);
        updateLobbyTopBar();
        refreshUnitUpgradeModalUI();
        renderArmyUnitsGrid();
        renderMissionNotifDot();
    });

    // Hoàn cấp O(1)
    document.getElementById('btn-open-level-refund')?.addEventListener('click', () => {
        const unitId = lobbyState.selectedUpgradeUnitId;
        const uSpec = UNIT_BY_ID[unitId] || UNIT_CATALOG[0];
        const curLv = metaState.armyPermanentLevels[unitId] || 1;
        if (curLv <= 1) return;

        document.getElementById('refund-unit-title').textContent = uSpec.name.toUpperCase();
        document.getElementById('refund-current-lv').textContent = `LV.${curLv}`;
        const inp = document.getElementById('refund-target-level-input');
        if (inp) inp.value = 1;
        updateRefundPreview(1, curLv);
        document.getElementById('level-refund-modal')?.classList.add('active');
    });

    const updateRefundPreview = (targetLv, curLv) => {
        const t = Math.max(1, Math.min(curLv - 1, Math.floor(Number(targetLv) || 1)));
        document.getElementById('refund-target-lv-preview').textContent = `LV.${t}`;
        const coinsBack = calcTotalRefundCoins(t, curLv);
        document.getElementById('refund-total-coins-val').textContent = `+🪙 ${coinsBack.toLocaleString('en-US')}`;
    };

    document.getElementById('refund-target-level-input')?.addEventListener('input', e => {
        const curLv = metaState.armyPermanentLevels[lobbyState.selectedUpgradeUnitId] || 1;
        updateRefundPreview(e.target.value, curLv);
    });
    document.getElementById('btn-refund-lv-min')?.addEventListener('click', () => {
        const curLv = metaState.armyPermanentLevels[lobbyState.selectedUpgradeUnitId] || 1;
        document.getElementById('refund-target-level-input').value = 1;
        updateRefundPreview(1, curLv);
    });
    document.getElementById('btn-refund-lv-minus')?.addEventListener('click', () => {
        const curLv = metaState.armyPermanentLevels[lobbyState.selectedUpgradeUnitId] || 1;
        const inp = document.getElementById('refund-target-level-input');
        const nextVal = Math.max(1, (parseInt(inp.value || '1', 10) || 1) - 1);
        inp.value = nextVal;
        updateRefundPreview(nextVal, curLv);
    });
    document.getElementById('btn-refund-lv-plus')?.addEventListener('click', () => {
        const curLv = metaState.armyPermanentLevels[lobbyState.selectedUpgradeUnitId] || 1;
        const inp = document.getElementById('refund-target-level-input');
        const nextVal = Math.min(curLv - 1, (parseInt(inp.value || '1', 10) || 1) + 1);
        inp.value = nextVal;
        updateRefundPreview(nextVal, curLv);
    });
    document.getElementById('btn-refund-lv-max')?.addEventListener('click', () => {
        const curLv = metaState.armyPermanentLevels[lobbyState.selectedUpgradeUnitId] || 1;
        const t = Math.max(1, curLv - 1);
        document.getElementById('refund-target-level-input').value = t;
        updateRefundPreview(t, curLv);
    });
    document.getElementById('btn-close-refund-modal')?.addEventListener('click', () => {
        document.getElementById('level-refund-modal')?.classList.remove('active');
    });
    document.getElementById('btn-cancel-level-refund')?.addEventListener('click', () => {
        document.getElementById('level-refund-modal')?.classList.remove('active');
    });
    document.getElementById('btn-confirm-level-refund')?.addEventListener('click', () => {
        const unitId = lobbyState.selectedUpgradeUnitId;
        const curLv = metaState.armyPermanentLevels[unitId] || 1;
        const inpVal = parseInt(document.getElementById('refund-target-level-input')?.value || '1', 10);
        const targetLv = Math.max(1, Math.min(curLv - 1, isNaN(inpVal) ? 1 : inpVal));
        if (curLv <= 1 || targetLv >= curLv) return;

        const coinsBack = calcTotalRefundCoins(targetLv, curLv);
        metaState.armyPermanentLevels[unitId] = targetLv;
        if (!metaState.isAdminMode) metaState.coins += coinsBack;
        saveProgress();
        sfx.play('upgrade');
        updateLobbyTopBar();
        document.getElementById('level-refund-modal')?.classList.remove('active');
        refreshUnitUpgradeModalUI();
        renderArmyUnitsGrid();
    });

    // 7. Các nút Sidebar: MISSION, TALENTS, VÒNG QUAY, INDEX, CODE, CHIP MOD, MINI-GAME, Ụ PHÁO
    document.getElementById('btn-open-missions')?.addEventListener('click', () => {
        const list = document.getElementById('mission-list-container');
        if (list) {
            list.innerHTML = '';
            MISSIONS_CATALOG.forEach(m => {
                const cur = metaState.missionsProgress[m.statKey] || 0;
                const claimed = !!metaState.missionsProgress.claimed[m.id];
                const canClaim = !claimed && cur >= m.target;
                const pct = Math.min(100, Math.round((cur / m.target) * 100));

                const card = document.createElement('div');
                card.className = 'mission-item-card';
                card.innerHTML = `
                    <div class="flex-1 text-left">
                        <div class="text-xs font-black text-slate-900">${m.title}</div>
                        <div class="text-[10px] font-bold text-slate-600 vt323-num">${Math.min(cur, m.target).toLocaleString('en-US')} / ${m.target.toLocaleString('en-US')} • +${m.rewardGems}💎 +${m.rewardCoins.toLocaleString('en-US')}🪙</div>
                        <div class="mission-progress-track"><div class="mission-progress-fill" style="width:${pct}%"></div></div>
                    </div>
                    <button type="button" class="btn-3d ${claimed ? 'btn-3d-slate' : (canClaim ? 'btn-3d-green' : 'btn-3d-amber')} px-2.5 py-1.5 text-[10px]" ${canClaim ? '' : 'disabled'}>
                        ${claimed ? '✓ XONG' : (canClaim ? 'NHẬN' : `${pct}%`)}
                    </button>
                `;
                card.querySelector('button').addEventListener('click', () => {
                    if (!canClaim) return;
                    metaState.missionsProgress.claimed[m.id] = true;
                    metaState.gems += m.rewardGems;
                    metaState.coins += m.rewardCoins;
                    saveProgress();
                    sfx.play('upgrade');
                    updateLobbyTopBar();
                    renderMissionNotifDot();
                    document.getElementById('btn-open-missions').click();
                });
                list.appendChild(card);
            });
        }
        document.getElementById('mission-modal')?.classList.add('active');
    });
    document.getElementById('btn-close-missions')?.addEventListener('click', () => {
        document.getElementById('mission-modal')?.classList.remove('active');
    });

    document.getElementById('btn-open-talents')?.addEventListener('click', () => openTalentsModal());
    document.getElementById('btn-close-talents')?.addEventListener('click', () => {
        document.getElementById('talents-modal')?.classList.remove('active');
    });
    document.getElementById('btn-close-talents-bottom')?.addEventListener('click', () => {
        document.getElementById('talents-modal')?.classList.remove('active');
    });
    document.getElementById('btn-reset-talents')?.addEventListener('click', () => {
        let refundMedals = 0;
        Object.values(META_TALENTS).forEach(t => {
            const lv = Number(metaState.metaTalents?.[t.id]) || 0;
            for (let i = 0; i < lv; i++) refundMedals += t.baseCost + i * t.costStep;
            metaState.metaTalents[t.id] = 0;
        });
        if (!metaState.isAdminMode) metaState.medals += refundMedals;
        saveProgress();
        sfx.play('upgrade');
        updateLobbyTopBar();
        renderTalentsModal();
    });

    document.getElementById('btn-open-lucky-wheel')?.addEventListener('click', () => openLuckyWheelModal());
    document.getElementById('btn-close-lucky-wheel')?.addEventListener('click', () => {
        document.getElementById('lucky-wheel-modal')?.classList.remove('active');
    });
    document.getElementById('btn-wheel-center-spin')?.addEventListener('click', () => spinLuckyWheelBatch(1));
    document.getElementById('btn-spin-wheel-1')?.addEventListener('click', () => spinLuckyWheelBatch(1));
    document.getElementById('btn-spin-wheel-10')?.addEventListener('click', () => spinLuckyWheelBatch(10));
    document.getElementById('btn-spin-wheel-custom')?.addEventListener('click', () => {
        const val = parseInt(document.getElementById('input-custom-wheel-spins')?.value || '10', 10);
        spinLuckyWheelBatch(val);
    });

    document.getElementById('btn-open-index')?.addEventListener('click', () => openCodexModal());
    document.getElementById('btn-close-codex')?.addEventListener('click', () => {
        document.getElementById('codex-modal')?.classList.remove('active');
    });
    document.getElementById('btn-codex-claim-all')?.addEventListener('click', () => claimAllCodexMilestones());

    document.getElementById('btn-open-turret-modal')?.addEventListener('click', () => openBaseTurretModal());
    document.getElementById('btn-close-turret-modal')?.addEventListener('click', () => {
        document.getElementById('base-turret-modal')?.classList.remove('active');
    });

    document.getElementById('btn-quick-army-chips')?.addEventListener('click', () => {
        openUnitUpgradeModal(lobbyState.selectedShowcaseUnitId || PRIMARY_INFANTRY_ID);
    });

    document.getElementById('btn-open-code')?.addEventListener('click', () => {
        document.getElementById('giftcode-used-count').textContent = `${metaState.usedCodes.length} / ${OFFICIAL_GIFTCODES.length} mã`;
        const tagsWrap = document.getElementById('giftcode-used-tags');
        if (tagsWrap) {
            tagsWrap.innerHTML = metaState.usedCodes.length > 0
                ? metaState.usedCodes.map(c => `<span class="used-code-pill">✓ ${c}</span>`).join('')
                : '<span class="text-[10px] text-slate-400 italic">Chưa có mã nào được nhập</span>';
        }
        document.getElementById('code-modal')?.classList.add('active');
    });
    document.getElementById('btn-close-code')?.addEventListener('click', () => {
        document.getElementById('code-modal')?.classList.remove('active');
    });
    document.getElementById('btn-submit-code')?.addEventListener('click', () => {
        const code = (document.getElementById('giftcode-input')?.value || '').trim().toUpperCase();
        const fb = document.getElementById('giftcode-feedback');
        const gift = GIFT_CODES[code];
        if (!gift) {
            if (fb) {
                fb.textContent = '❌ Mã Giftcode không tồn tại!';
                fb.className = 'text-xs font-extrabold mt-2 text-rose-600';
                fb.classList.remove('hidden');
            }
            sfx.play('cannon');
            return;
        }
        if (metaState.usedCodes.includes(code)) {
            if (fb) {
                fb.textContent = '⚠️ Bạn đã nhận quà từ mã này rồi!';
                fb.className = 'text-xs font-extrabold mt-2 text-amber-600';
                fb.classList.remove('hidden');
            }
            sfx.play('cannon');
            return;
        }

        metaState.usedCodes.push(code);
        metaState.gems += gift.gems || GIFTCODE_REWARD_GEMS;
        metaState.coins += gift.coins || GIFTCODE_REWARD_COINS;
        metaState.medals += gift.medals || GIFTCODE_REWARD_MEDALS;
        metaState.pearls = (metaState.pearls || 0) + (gift.pearls || GIFTCODE_REWARD_PEARLS);
        saveProgress();
        updateLobbyTopBar();
        renderSkillTreeTab();
        sfx.play('upgrade');

        if (fb) {
            fb.textContent = `🎉 Nhận thành công: +${(gift.gems || 0).toLocaleString()}💎, +${(gift.coins || 0).toLocaleString()}🪙, +${gift.medals || 0}🎖️, +${gift.pearls || 0}⚪!`;
            fb.className = 'text-xs font-extrabold mt-2 text-emerald-600';
            fb.classList.remove('hidden');
        }
    });

    bindArcadeMiniGames();
}

function bindArcadeMiniGames() {
    document.getElementById('btn-open-minigames')?.addEventListener('click', () => {
        document.getElementById('minigame-arcade-modal')?.classList.add('active');
    });
    document.getElementById('btn-close-minigames')?.addEventListener('click', () => {
        document.getElementById('minigame-arcade-modal')?.classList.remove('active');
    });

    document.querySelectorAll('.arcade-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.mgTab;
            document.querySelectorAll('.arcade-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.mgTab === tab));
            document.querySelectorAll('.arcade-game-pane').forEach(p => p.classList.toggle('active', p.id === `mg-pane-${tab}`));
        });
    });

    // Mini-Game 1: Đập mìn 5x5
    let minesState = null;
    const renderMinesBoard = () => {
        const board = document.getElementById('mg-mines-grid');
        if (!board || !minesState) return;
        board.innerHTML = '';
        for (let i = 0; i < 25; i++) {
            const cell = document.createElement('button');
            cell.type = 'button';
            const rev = minesState.revealed[i];
            const isMine = minesState.mines.has(i);
            cell.className = `mg-mine-cell ${rev ? (isMine ? 'revealed mine' : 'revealed safe') : ''}`;
            cell.textContent = rev ? (isMine ? '💣' : '💎') : '📡';
            cell.addEventListener('click', () => {
                if (!minesState || minesState.over || minesState.revealed[i]) return;
                minesState.revealed[i] = true;
                if (isMine) {
                    minesState.over = true;
                    for (let m = 0; m < 25; m++) minesState.revealed[m] = true;
                    sfx.play('boom');
                    document.getElementById('mg-mines-status-text').textContent = '💥 Trúng mìn chống tăng! Mất quỹ thưởng lượt này.';
                    document.getElementById('btn-mg-mines-cashout').disabled = true;
                } else {
                    minesState.safeOpened++;
                    const mult = MINIGAME_CONFIG.mines.multipliers[Math.min(19, minesState.safeOpened - 1)] || 1.2;
                    minesState.potCoins = Math.round(MINIGAME_CONFIG.mines.baseCoinsPerSafe * minesState.safeOpened * mult * 0.45);
                    minesState.potGems = Math.round(MINIGAME_CONFIG.mines.baseGemsPerSafe * minesState.safeOpened * mult * 0.45);
                    sfx.play('gas');
                    document.getElementById('mg-mines-mult-badge').textContent = `x${mult.toFixed(2)}`;
                    document.getElementById('mg-mines-safe-count').textContent = `${minesState.safeOpened}/20`;
                    document.getElementById('mg-mines-current-pot').textContent = `🪙 ${minesState.potCoins.toLocaleString()} | 💎 ${minesState.potGems}`;
                    document.getElementById('btn-mg-mines-cashout').disabled = false;
                }
                renderMinesBoard();
            });
            board.appendChild(cell);
        }
    };

    document.getElementById('btn-mg-mines-start')?.addEventListener('click', () => {
        const cost = MINIGAME_CONFIG.mines.entryCostCoins;
        if (!metaState.isAdminMode && metaState.coins < cost) {
            sfx.play('cannon');
            return;
        }
        if (!metaState.isAdminMode) metaState.coins -= cost;
        saveProgress();
        updateLobbyTopBar();

        const mines = new Set();
        while (mines.size < 5) mines.add(Math.floor(Math.random() * 25));
        minesState = {
            mines,
            revealed: new Array(25).fill(false),
            safeOpened: 0,
            potCoins: 0,
            potGems: 0,
            over: false
        };
        document.getElementById('mg-mines-mult-badge').textContent = 'x1.00';
        document.getElementById('mg-mines-safe-count').textContent = '0/20';
        document.getElementById('mg-mines-current-pot').textContent = '🪙 0 | 💎 0';
        document.getElementById('btn-mg-mines-cashout').disabled = true;
        renderMinesBoard();
    });

    document.getElementById('btn-mg-mines-cashout')?.addEventListener('click', () => {
        if (!minesState || minesState.over || minesState.safeOpened <= 0) return;
        minesState.over = true;
        metaState.coins += minesState.potCoins;
        metaState.gems += minesState.potGems;
        saveProgress();
        updateLobbyTopBar();
        sfx.play('upgrade');
        document.getElementById('mg-mines-status-text').textContent =
            `💰 Rút thưởng thành công: +🪙 ${minesState.potCoins.toLocaleString()} & +💎 ${minesState.potGems}!`;
        document.getElementById('btn-mg-mines-cashout').disabled = true;
    });

    // Mini-Game 2: Hứng Tiếp Tế Dù 30s
    let catcherActive = false;
    let catcherX = 160;
    let catcherDir = 0;
    document.getElementById('btn-mg-catcher-left')?.addEventListener('pointerdown', () => (catcherDir = -1));
    document.getElementById('btn-mg-catcher-left')?.addEventListener('pointerup', () => (catcherDir = 0));
    document.getElementById('btn-mg-catcher-right')?.addEventListener('pointerdown', () => (catcherDir = 1));
    document.getElementById('btn-mg-catcher-right')?.addEventListener('pointerup', () => (catcherDir = 0));

    const catcherCanvas = document.getElementById('mgCatcherCanvas');
    catcherCanvas?.addEventListener('pointermove', e => {
        if (!catcherActive) return;
        const rect = catcherCanvas.getBoundingClientRect();
        const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * catcherCanvas.width;
        catcherX = Math.max(24, Math.min(catcherCanvas.width - 24, relX));
    });

    document.getElementById('btn-mg-catcher-start')?.addEventListener('click', () => {
        if (catcherActive || !catcherCanvas) return;
        const ctx = catcherCanvas.getContext('2d');
        catcherActive = true;
        catcherX = catcherCanvas.width / 2;
        let timeLeft = 30.0;
        let spawnTimer = 0.2;
        let drops = [];
        let gotCoins = 0;
        let gotGems = 0;
        let gotMedals = 0;
        let lastT = performance.now();

        const loop = now => {
            if (!catcherActive) return;
            const dt = Math.min(0.05, (now - lastT) / 1000);
            lastT = now;
            timeLeft -= dt;

            catcherX = Math.max(24, Math.min(catcherCanvas.width - 24, catcherX + catcherDir * 230 * dt));
            spawnTimer -= dt;
            if (spawnTimer <= 0) {
                spawnTimer = 0.42;
                const pool = MINIGAME_CONFIG.catcher.items;
                const pick = pool[Math.floor(Math.random() * pool.length)];
                drops.push({ ...pick, x: 20 + Math.random() * (catcherCanvas.width - 40), y: 10 });
            }

            ctx.clearRect(0, 0, catcherCanvas.width, catcherCanvas.height);
            drops.forEach(d => {
                d.y += d.speed * dt;
                if (Math.hypot(d.x - catcherX, d.y - (catcherCanvas.height - 26)) < 24) {
                    d.done = true;
                    if (d.type === 'bomb') {
                        sfx.play('boom');
                        gotCoins = Math.max(0, gotCoins - 800);
                    } else {
                        sfx.play('gas');
                        gotCoins += d.coins;
                        gotGems += d.gems;
                        gotMedals += d.medals;
                    }
                } else if (d.y > catcherCanvas.height + 15) {
                    d.done = true;
                }
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(d.icon, d.x, d.y);
            });
            drops = drops.filter(d => !d.done);

            drawUnitArt(ctx, 'humvee', catcherX, catcherCanvas.height - 24, 34, 'blue', now * 0.002, 0);

            document.getElementById('mg-catcher-time').textContent = `${Math.max(0, timeLeft).toFixed(1)}s`;
            document.getElementById('mg-catcher-score').textContent = `🪙 ${gotCoins} | 💎 ${gotGems} | 🎖️ ${gotMedals}`;

            if (timeLeft > 0) {
                requestAnimationFrame(loop);
            } else {
                catcherActive = false;
                metaState.coins += gotCoins;
                metaState.gems += gotGems;
                metaState.medals += gotMedals;
                saveProgress();
                updateLobbyTopBar();
                sfx.play('upgrade');
            }
        };
        requestAnimationFrame(loop);
    });

    // Mini-Game 3: Đoán Bài Rarity (Rank 0 -> 40)
    let hlState = null;
    const renderHlCards = () => {
        if (!hlState) return;
        const curCfg = RARITY_CONFIG[RARITY_ORDER[hlState.curRank]] || RARITY_CONFIG.common;
        const curUnit = UNIT_BY_ID[hlState.curUnitId] || UNIT_CATALOG[0];
        document.getElementById('mg-hl-current-card').className = `mg-hl-card-box ${curCfg.cssClass}`;
        document.getElementById('mg-hl-cur-rarity').textContent = curCfg.name.toUpperCase();
        document.getElementById('mg-hl-cur-rank').textContent = `RANK ${hlState.curRank} (${curCfg.mult}x)`;
        document.getElementById('mg-hl-cur-unit').textContent = curUnit.name.toUpperCase();
        document.getElementById('mg-hl-streak').textContent = hlState.streak;
        document.getElementById('mg-hl-pot').textContent = `🪙 ${hlState.potCoins.toLocaleString()} | 💎 ${hlState.potGems}`;
    };

    const guessHighLow = dir => {
        if (!hlState || hlState.over) return;
        const nextRank = Math.floor(Math.random() * RARITY_ORDER.length);
        const nextUnit = UNIT_CATALOG[Math.floor(Math.random() * UNIT_CATALOG.length)];
        const win = dir === 'higher' ? nextRank >= hlState.curRank : nextRank <= hlState.curRank;
        if (win) {
            hlState.streak++;
            hlState.curRank = nextRank;
            hlState.curUnitId = nextUnit.id;
            hlState.potCoins = Math.round(hlState.potCoins * MINIGAME_CONFIG.highlow.winMultiplier);
            hlState.potGems = Math.round(hlState.potGems * MINIGAME_CONFIG.highlow.winMultiplier);
            sfx.play('upgrade');
            document.getElementById('mg-hl-status-text').textContent = `🎉 Chính xác! Chuỗi thắng ${hlState.streak} lượt!`;
            document.getElementById('btn-mg-hl-cashout').disabled = false;
            renderHlCards();
        } else {
            hlState.over = true;
            sfx.play('boom');
            const missCfg = RARITY_CONFIG[RARITY_ORDER[nextRank]];
            document.getElementById('mg-hl-status-text').textContent = `💥 Sai rồi! Lá tiếp theo là ${missCfg.name} (Rank ${nextRank}).`;
            document.getElementById('btn-mg-hl-higher').disabled = true;
            document.getElementById('btn-mg-hl-lower').disabled = true;
            document.getElementById('btn-mg-hl-cashout').disabled = true;
        }
    };

    document.getElementById('btn-mg-hl-higher')?.addEventListener('click', () => guessHighLow('higher'));
    document.getElementById('btn-mg-hl-lower')?.addEventListener('click', () => guessHighLow('lower'));

    document.getElementById('btn-mg-hl-start')?.addEventListener('click', () => {
        const cost = MINIGAME_CONFIG.highlow.entryCostCoins;
        if (!metaState.isAdminMode && metaState.coins < cost) {
            sfx.play('cannon');
            return;
        }
        if (!metaState.isAdminMode) metaState.coins -= cost;
        saveProgress();
        updateLobbyTopBar();

        hlState = {
            curRank: Math.floor(Math.random() * RARITY_ORDER.length),
            curUnitId: UNIT_CATALOG[Math.floor(Math.random() * UNIT_CATALOG.length)].id,
            streak: 0,
            potCoins: MINIGAME_CONFIG.highlow.initialPotCoins,
            potGems: MINIGAME_CONFIG.highlow.initialPotGems,
            over: false
        };
        document.getElementById('btn-mg-hl-higher').disabled = false;
        document.getElementById('btn-mg-hl-lower').disabled = false;
        document.getElementById('btn-mg-hl-cashout').disabled = true;
        renderHlCards();
    });

    document.getElementById('btn-mg-hl-cashout')?.addEventListener('click', () => {
        if (!hlState || hlState.over || hlState.streak <= 0) return;
        hlState.over = true;
        metaState.coins += hlState.potCoins;
        metaState.gems += hlState.potGems;
        saveProgress();
        updateLobbyTopBar();
        sfx.play('upgrade');
        document.getElementById('btn-mg-hl-higher').disabled = true;
        document.getElementById('btn-mg-hl-lower').disabled = true;
        document.getElementById('btn-mg-hl-cashout').disabled = true;
        document.getElementById('mg-hl-status-text').textContent =
            `💰 Đã thu nhận +🪙 ${hlState.potCoins.toLocaleString()} & +💎 ${hlState.potGems}!`;
    });
}