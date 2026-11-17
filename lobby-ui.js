/* ============================================================================
   TINY BATTLE - LOBBY UI & INTERACTION CONTROLLER (js/lobby-ui.js)
   TopBar (4 Currencies + White Pearl), 5 Navigation Tabs (SHOP, ARMY, BATTLE,
   CHALLENGE 20W Zombie TD, SKILL TREE Ancient Tree), INDEX, Sandbox Review & Chip Store
   ============================================================================ */

import {
    ADMIN_PASSWORD,
    RARITY_ORDER,
    RARITY_CONFIG,
    isMasterRarity,
    isDemonRarity,
    DIFFICULTY_ORDER,
    BATTLE_MODE_ORDER,
    DIFFICULTY_CONFIG,
    BATTLE_MODE_CONFIG,
    calcStageRewardCoins,
    calcChallengeEntryCostCoins,
    calcChallengeRewards,
    MAX_CRATE_OPEN_QTY,
    OFFICIAL_GIFTCODES,
    GIFTCODE_REWARD_GEMS,
    GIFTCODE_REWARD_COINS,
    GIFTCODE_REWARD_PEARLS,
    GIFT_CODES,
    MISSIONS_CATALOG,
    LEVELS,
    UNIT_CATALOG,
    UNIT_BY_ID,
    META_TALENTS,
    UNIT_CHIPS,
    CHIP_SOCKET_2_UNLOCK_GEMS,
    CHIP_BUY_COST_COINS,
    CHIP_BUY_COST_GEMS,
    ANCIENT_SKILL_TREE,
    getSkillTreeNodeCost,
    BASE_TURRET_CONFIG,
    getBaseTurretUpgradeCost,
    CODEX_MILESTONES,
    LUCKY_WHEEL_CONFIG,
    MINIGAME_CONFIG
} from './config.js';

import {
    triggerHaptic,
    formatCompactNumber,
    simulateBulkCrateOpeningO1,
    calcBulkUpgradeCost,
    calcMaxAffordableLevels
} from './math.js';

import {
    PRIMARY_INFANTRY_ID,
    normalizeUnitId,
    metaState,
    recordHighestRarityForUnit,
    syncRepresentativeInventoryFromStacks,
    addCardToStacks,
    getTotalCardsInInventory,
    syncLegacyEngineBridges,
    loadProgress,
    saveProgress,
    resetAllAccountData,
    isUnitSocket2Unlocked,
    unlockUnitSocket2,
    getChipOwnedCount,
    buyChipItem,
    equipChipToUnitSlot,
    unequipChipFromUnitSlot,
    isDifficultyCleared,
    isDifficultyModeCleared,
    getMaxUnlockedMapLevel,
    isDifficultyUnlocked,
    getDefaultDifficultyForMap,
    isChallengeMapCleared,
    getMaxUnlockedChallengeMapLevel,
    isChallengeMapUnlocked,
    getSkillTreeNodeLevel,
    isSkillTreeNodeUnlocked,
    canUpgradeSkillTreeNode,
    upgradeSkillTreeNode,
    getHighestRarityForUnit,
    getHighestEverRarityRankForUnit,
    hasClaimableCodexMilestones,
    hasUnitInInventory,
    calcTotalRefundCoins,
    getUpgradeTierBracketText,
    formatCurrency
} from './state.js';

import {
    isCustomArtUnit,
    drawCustomUnitArt,
    drawBaseTurretArt,
    getUnitSpriteDataURL
} from './engine-core.js';

import { getEffectiveUnitStats } from './entities.js';

let sfxRef = null;
let atlasRef = null;
let onStartBattleCallback = null;
let onRenderMapPreviewCallback = null;

const SPECIAL_TO_ENGINE_MODE = {
    endless: 'endless_siege',
    endless_siege: 'endless_siege',
    autobattler: 'auto_battler',
    auto_battler: 'auto_battler',
    night_fog: 'fog_of_war',
    fog_of_war: 'fog_of_war',
    raid_boss: 'raid_boss',
    bossrush: 'raid_boss'
};

export let currentLobbyTab = 'battle';
export let currentStageViewLevel = 1;
export let currentSelectedDifficulty = 'easy';
export let currentSelectedBattleMode = 'destroy';
export let currentSelectedSpecialMode = 'standard';
export let currentArmyMode = 'army'; // 'army' | 'review' | 'merge'
export let showcaseUnitId = PRIMARY_INFANTRY_ID;
export let inspectingUnitId = PRIMARY_INFANTRY_ID;
export let currentBulkAddLevels = 1;
export let mergeSelectedCardUids = [];
export let activeChipSocketIndex = 0;
export let selectedSkillTreeNodeId = 'vital_roots';

// ============================================================================
// 1. GIAO DIỆN SẢNH (TOP BAR 4 TIỀN TỆ & 5 NAVIGATION TABS)
// ============================================================================
export function updateTopBarUI() {
    const nameEl = document.getElementById('player-name-display');
    if (nameEl) nameEl.textContent = metaState.playerName || 'COMMANDER';

    const pearlsEl = document.getElementById('pearls-count-display');
    if (pearlsEl) pearlsEl.textContent = formatCurrency(metaState.pearls || 0);

    const medalsEl1 = document.getElementById('medals-count-display');
    const medalsEl2 = document.getElementById('lobby-medals-val');
    if (medalsEl1) medalsEl1.textContent = formatCurrency(metaState.medals || 0);
    if (medalsEl2) medalsEl2.textContent = formatCurrency(metaState.medals || 0);

    const gemsEl = document.getElementById('gems-count-display');
    if (gemsEl) gemsEl.textContent = formatCurrency(metaState.gems);

    const coinsEl = document.getElementById('coins-count-display');
    if (coinsEl) coinsEl.textContent = formatCurrency(metaState.coins);

    const pearlsPill = document.getElementById('pearls-pill-box');
    const medalsPill = document.getElementById('medals-pill-box');
    const gemsPill = document.getElementById('gems-pill-box');
    const coinsPill = document.getElementById('coins-pill-box');
    const gearBtn = document.getElementById('btn-open-settings');
    const adminTag = document.getElementById('admin-active-tag');

    if (metaState.isAdminMode) {
        if (pearlsPill) pearlsPill.className = 'currency-pill pearl-pill admin-infinite-pill';
        if (medalsPill) medalsPill.className = 'currency-pill medal-pill admin-infinite-pill';
        if (gemsPill) gemsPill.className = 'currency-pill admin-infinite-pill';
        if (coinsPill) coinsPill.className = 'currency-pill admin-infinite-pill';
        if (gearBtn) gearBtn.className = 'btn-settings-gear admin-active-gear';
        if (adminTag) adminTag.classList.remove('hidden');
    } else {
        if (pearlsPill) pearlsPill.className = 'currency-pill pearl-pill';
        if (medalsPill) medalsPill.className = 'currency-pill medal-pill';
        if (gemsPill) gemsPill.className = 'currency-pill';
        if (coinsPill) coinsPill.className = 'currency-pill';
        if (gearBtn) gearBtn.className = 'btn-settings-gear';
        if (adminTag) adminTag.classList.add('hidden');
    }

    updateMissionNotificationDot();
    updateTalentNotificationDot();
    updateCodexNotificationDot();
    updateLobbyTurretShortLabel();
}

export function switchLobbyTab(tabName) {
    currentLobbyTab = tabName;
    if (sfxRef) sfxRef.play('gas');
    triggerHaptic(15);

    document.querySelectorAll('.lobby-tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    const targetPane = document.getElementById(`tab-${tabName}`);
    if (targetPane) targetPane.classList.add('active');

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (tabName === 'shop') renderShopChipStoreUI();
    else if (tabName === 'army') renderArmyTabUI();
    else if (tabName === 'battle') renderStageScreenUI();
    else if (tabName === 'challenge') renderChallengeRoadmapUI();
    else if (tabName === 'skilltree') renderSkillTreeTabUI();

    updateTopBarUI();
}

// ============================================================================
// 2. POPUP ĐẶT TÊN & SETTINGS (ADMIN MODE & RESET ACCOUNT)
// ============================================================================
export function checkAndPromptPlayerName(forceOpen = false) {
    const modal = document.getElementById('name-modal');
    const input = document.getElementById('player-name-input');
    const errEl = document.getElementById('name-error-msg');
    if (!modal || !input) return;

    if (forceOpen || !metaState.playerName || metaState.playerName.trim() === '') {
        input.value = metaState.playerName || '';
        if (errEl) errEl.classList.add('hidden');
        modal.classList.add('active');
        setTimeout(() => input.focus(), 80);
    }
}

export function renderSettingsModalUI() {
    const modeBadge = document.getElementById('settings-mode-badge');
    const modeDesc = document.getElementById('settings-mode-desc');
    const loginSection = document.getElementById('admin-login-section');
    const activeSection = document.getElementById('admin-active-section');
    const passInput = document.getElementById('admin-password-input');
    const fb = document.getElementById('admin-auth-feedback');
    const passForm = document.getElementById('admin-password-form');

    if (passInput) passInput.value = '';
    if (fb) fb.classList.add('hidden');
    if (passForm) passForm.classList.add('hidden');

    if (metaState.isAdminMode) {
        if (modeBadge) {
            modeBadge.className = 'mode-pill-admin';
            modeBadge.textContent = '👑 CHẾ ĐỘ ADMIN ĐANG BẬT';
        }
        if (modeDesc) {
            modeDesc.textContent = `Bạn đang bật quyền Admin: Tài nguyên vô hạn, mở 1 Tỷ rương miễn phí, mở khóa toàn bộ ${LEVELS.length} map Battle & Challenge.`;
        }
        if (loginSection) loginSection.classList.add('hidden');
        if (activeSection) activeSection.classList.remove('hidden');
    } else {
        if (modeBadge) {
            modeBadge.className = 'mode-pill-normal';
            modeBadge.textContent = 'NGƯỜI CHƠI THƯỜNG';
        }
        if (modeDesc) {
            modeDesc.textContent = 'Tài nguyên và tiến trình khóa map đang áp dụng theo dữ liệu lưu thực tế.';
        }
        if (loginSection) loginSection.classList.remove('hidden');
        if (activeSection) activeSection.classList.add('hidden');
    }
}

// ============================================================================
// 3. TAB BATTLE: CHỌN MAP (1-45), ĐỘ KHÓ, 2 HÌNH THỨC & 4 CHẾ ĐỘ ĐẶC BIỆT
// ============================================================================
export function drawLobbyMapPreviewCanvas(levelNum) {
    if (typeof onRenderMapPreviewCallback === 'function') {
        onRenderMapPreviewCallback(levelNum);
        return;
    }
    const previewCanvas = document.getElementById('selected-map-preview');
    if (previewCanvas && typeof window !== 'undefined' && typeof window.renderMap === 'function') {
        const pCtx = previewCanvas.getContext('2d');
        pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        window.renderMap(pCtx, previewCanvas.width, previewCanvas.height, levelNum, true);
    }
}

export function renderStageScreenUI() {
    const maxUnlocked = getMaxUnlockedMapLevel();
    currentStageViewLevel = Math.max(1, Math.min(maxUnlocked, currentStageViewLevel));
    const cfg = LEVELS[currentStageViewLevel - 1] || LEVELS[0];

    if (!isDifficultyUnlocked(cfg.level, currentSelectedDifficulty)) {
        currentSelectedDifficulty = getDefaultDifficultyForMap(cfg.level);
    }

    const titleEl = document.getElementById('stage-map-title');
    if (titleEl) titleEl.textContent = `${cfg.level}. ${cfg.name.toUpperCase()}`;

    const progressTextEl = document.getElementById('stage-progress-text');
    if (progressTextEl) {
        progressTextEl.textContent = metaState.isAdminMode
            ? `👑 ADMIN MODE: ĐÃ MỞ KHÓA TOÀN BỘ ${LEVELS.length} MAP`
            : `ĐÃ MỞ KHÓA: MAP ${maxUnlocked} / ${LEVELS.length} | KỶ LỤC VÔ TẬN: WAVE ${metaState.endlessBestWave || 0}`;
    }

    const prevBtn = document.getElementById('btn-prev-stage');
    if (prevBtn) prevBtn.disabled = currentStageViewLevel <= 1;

    const nextBtn = document.getElementById('btn-next-stage');
    if (nextBtn) nextBtn.disabled = currentStageViewLevel >= maxUnlocked;

    DIFFICULTY_ORDER.forEach(diffKey => {
        const btn = document.getElementById(`diff-btn-${diffKey}`);
        const statusEl = document.getElementById(`diff-status-${diffKey}`);
        const unlocked = isDifficultyUnlocked(cfg.level, diffKey);
        const cleared = isDifficultyCleared(cfg.level, diffKey);

        if (btn) {
            btn.classList.toggle('active', currentSelectedDifficulty === diffKey);
            btn.classList.toggle('locked', !unlocked);
        }
        if (statusEl) {
            if (!unlocked) statusEl.textContent = '🔒';
            else if (cleared) statusEl.textContent = '✓';
            else statusEl.textContent = '★';
        }
    });

    BATTLE_MODE_ORDER.forEach(modeKey => {
        const mBtn = document.getElementById(`mode-btn-${modeKey}`);
        const mStatus = document.getElementById(`mode-status-${modeKey}`);
        const modeCleared = isDifficultyModeCleared(cfg.level, currentSelectedDifficulty, modeKey);

        if (mBtn) {
            mBtn.classList.toggle('active', currentSelectedSpecialMode === 'standard' && currentSelectedBattleMode === modeKey);
        }
        if (mStatus) {
            mStatus.textContent = modeCleared ? '✓' : '★';
        }
    });

    document.querySelectorAll('.special-mode-pill').forEach(btn => {
        const sp = btn.getAttribute('data-special') || btn.getAttribute('data-mode');
        btn.classList.toggle('active', currentSelectedSpecialMode === sp);
    });

    const specialBtnMap = {
        'mode-btn-endless': 'endless',
        'mode-btn-autobattler': 'autobattler',
        'btn-toggle-fog-mode': 'night_fog',
        'mode-btn-bossrush': 'raid_boss'
    };
    Object.entries(specialBtnMap).forEach(([btnId, spKey]) => {
        const el = document.getElementById(btnId);
        if (el) el.classList.toggle('active', currentSelectedSpecialMode === spKey);
    });

    const fogStatusEl = document.getElementById('fog-mode-status');
    if (fogStatusEl) {
        fogStatusEl.textContent = currentSelectedSpecialMode === 'night_fog' ? 'BẬT' : 'FOG';
    }

    const endlessBestMini = document.getElementById('endless-best-mini');
    if (endlessBestMini) endlessBestMini.textContent = `W:${metaState.endlessBestWave || 0}`;

    const diffCfg = DIFFICULTY_CONFIG[currentSelectedDifficulty] || DIFFICULTY_CONFIG.easy;
    const rewardCoins = calcStageRewardCoins(cfg.level, currentSelectedDifficulty, currentSelectedBattleMode);
    const scaledEnemyBaseHp = Math.round(cfg.enemyBaseHp * diffCfg.baseHpMult);

    const diffBannerEl = document.getElementById('diff-info-banner');
    if (diffBannerEl) {
        const sp = currentSelectedSpecialMode;
        if (sp === 'endless') {
            diffBannerEl.innerHTML = `Chế độ: <b>Thủ Thành Roguelike Vô Tận</b> • Kỷ lục: <b class="text-purple-300">Wave ${metaState.endlessBestWave || 0}</b> • Qua mỗi Wave chọn Thẻ Đột Biến!`;
        } else if (sp === 'autobattler') {
            diffBannerEl.innerHTML = `Chế độ: <b>Đấu Trường Đặt Trận Tự Động</b> • Đã thắng: <b class="text-emerald-300">${metaState.autobattlerWins || 0} trận</b> • Chọn ô & chạm sân đặt quân!`;
        } else if (sp === 'night_fog') {
            diffBannerEl.innerHTML = `Chế độ: <b>Chiến Dịch Đêm Mù (Fog of War)</b> • Màn đêm bao phủ, đơn vị chiếu đèn mở tầm nhìn!`;
        } else if (sp === 'raid_boss') {
            diffBannerEl.innerHTML = `Chế độ: <b>Đấu Trường Siêu Boss</b> • Hủy diệt Pháo Đài Hạm Leviathan MK-IX qua 3 giai đoạn!`;
        } else if (currentSelectedBattleMode === 'destroy') {
            diffBannerEl.innerHTML = `Mục tiêu: <b>Phá hủy Căn cứ Đỏ (HP: ${scaledEnemyBaseHp})</b> • Thưởng: <b class="text-amber-300">🪙 ${formatCurrency(rewardCoins)} Coins</b>`;
        } else {
            diffBannerEl.innerHTML = `Mục tiêu: <b>Sinh tồn 10 Wave liên tiếp</b> • Thưởng: <b class="text-amber-300">🪙 ${formatCurrency(rewardCoins)} Coins</b>`;
        }
    }

    const mechanicSubEl = document.getElementById('diff-mode-mechanic-badge');
    if (mechanicSubEl) {
        if (cfg.mechanicTag) {
            mechanicSubEl.innerHTML = `<b>${cfg.mechanicTag}</b>`;
        } else {
            mechanicSubEl.innerHTML = `🎲 Trong trận lên cấp sẽ <b>Roll ngẫu nhiên 3 Binh Chủng</b> (kèm 1 lượt <b>Reroll</b>) & kéo thả đặt quanh nhà!`;
        }
    }

    const waterBadge = document.getElementById('select-map-water-badge');
    if (waterBadge) {
        if (cfg.hasWater) {
            waterBadge.className = 'map-water-pill has-water';
            waterBadge.textContent = cfg.hasCoastFoam ? '🌊 BỜ BIỂN SÓNG VỖ: CÓ THỦY QUÂN' : '🌊 CÓ NƯỚC: CÓ THỦY QUÂN';
        } else if (cfg.hasLava) {
            waterBadge.className = 'map-water-pill no-water';
            waterBadge.textContent = cfg.id === 45 ? '😈 HƯ KHÔNG MA GIỚI: CẤM THỦY QUÂN' : '🌋 HỒ DUNG NHAM: CẤM THỦY QUÂN';
        } else if (cfg.hasToxicSwamp) {
            waterBadge.className = 'map-water-pill no-water';
            waterBadge.textContent = '☣️ ĐẦM LẦY ĐỘC TỐ: LỤC & KHÔNG QUÂN';
        } else {
            waterBadge.className = 'map-water-pill no-water';
            waterBadge.textContent = cfg.theme === 'brown_earth' ? '🏜️ ĐẤT NÂU HẺM NÚI: LỤC & KHÔNG QUÂN' : '⛰️ ĐẤT LIỀN: LỤC & KHÔNG QUÂN';
        }
    }

    const clearedStampEl = document.getElementById('stage-cleared-stamp');
    if (clearedStampEl) {
        const curModeCleared = isDifficultyModeCleared(cfg.level, currentSelectedDifficulty, currentSelectedBattleMode);
        const anyDiffCleared = isDifficultyCleared(cfg.level, currentSelectedDifficulty);
        if (curModeCleared || anyDiffCleared) {
            clearedStampEl.classList.remove('hidden');
            const mLabel = BATTLE_MODE_CONFIG[currentSelectedBattleMode]?.shortLabel || 'PHÁ CĂN CỨ';
            clearedStampEl.textContent = curModeCleared
                ? `✓ ĐÃ QUA: ${diffCfg.shortLabel} - ${mLabel}`
                : `✓ ĐÃ MỞ KHÓA (${diffCfg.shortLabel})`;
        } else {
            clearedStampEl.classList.add('hidden');
        }
    }

    const descEl = document.getElementById('select-map-desc');
    if (descEl) descEl.textContent = cfg.desc;

    drawLobbyMapPreviewCanvas(cfg.level);
    updateTopBarUI();
}

// ============================================================================
// 4. CÂY KỸ NĂNG CHỈ HUY BỊ ĐỘNG (6 NHÁNH META-TALENTS - MAX LV.10)
// ============================================================================
export function updateTalentNotificationDot() {
    const canAffordAny = Object.values(META_TALENTS).some(t => {
        const lv = (metaState.metaTalents && metaState.metaTalents[t.id]) || 0;
        const cost = t.baseCost + lv * t.costStep;
        return lv < t.maxLevel && (metaState.isAdminMode || (metaState.medals || 0) >= cost);
    });

    const dot1 = document.getElementById('talents-notif-badge');
    const dot2 = document.getElementById('talent-notif-dot');
    if (dot1) {
        dot1.style.display = canAffordAny ? 'flex' : 'none';
        dot1.classList.toggle('hidden', !canAffordAny);
    }
    if (dot2) {
        dot2.classList.toggle('hidden', !canAffordAny);
    }
}

export function renderMetaTalentsModalUI() {
    const formattedMedals = formatCurrency(metaState.medals || 0);
    const modalMedals1 = document.getElementById('modal-medals-count');
    const modalMedals2 = document.getElementById('talent-medals-count');
    if (modalMedals1) modalMedals1.textContent = formattedMedals;
    if (modalMedals2) modalMedals2.textContent = `${formattedMedals} 🎖️`;

    const container =
        document.getElementById('talents-list-container') ||
        document.getElementById('talent-tree-list');
    if (!container) return;
    container.innerHTML = '';

    Object.values(META_TALENTS).forEach(talent => {
        const curLv = (metaState.metaTalents && metaState.metaTalents[talent.id]) || 0;
        const isMax = curLv >= talent.maxLevel;
        const cost = talent.baseCost + curLv * talent.costStep;
        const canAfford = metaState.isAdminMode || (metaState.medals || 0) >= cost;

        let pipsHtml = '';
        for (let i = 1; i <= talent.maxLevel; i++) {
            pipsHtml += `<span class="talent-pip ${i <= curLv ? 'active' : ''}" style="width:10px;"></span>`;
        }

        const card = document.createElement('div');
        card.className = `talent-node-card ${isMax ? 'talent-maxed' : ''}`;
        card.innerHTML = `
            <div class="talent-node-icon">${talent.icon}</div>
            <div class="talent-node-info">
                <div class="talent-node-title">${talent.name} (Cấp ${curLv}/${talent.maxLevel})</div>
                <div class="talent-node-desc">${talent.desc}</div>
                <div class="talent-node-stat-preview">${talent.getEffectText(curLv)}</div>
                <div class="talent-level-pips">${pipsHtml}</div>
            </div>
            <button type="button" class="btn-3d ${isMax ? 'btn-3d-amber' : 'btn-3d-green'} talent-upgrade-btn" ${(!isMax && !canAfford) ? 'disabled' : ''}>
                ${isMax ? '<span>TỐI ĐA</span>' : `<span>NÂNG CẤP</span><span class="talent-cost-num">🎖️ ${metaState.isAdminMode ? 0 : cost}</span>`}
            </button>
        `;

        const upgBtn = card.querySelector('.talent-upgrade-btn');
        if (upgBtn && !isMax) {
            upgBtn.addEventListener('click', () => {
                if (!metaState.isAdminMode && (metaState.medals || 0) < cost) {
                    if (sfxRef) sfxRef.play('cannon');
                    return;
                }
                if (!metaState.isAdminMode) metaState.medals -= cost;
                metaState.metaTalents[talent.id] = curLv + 1;
                triggerHaptic(25);
                if (sfxRef) sfxRef.play('upgrade');
                saveProgress();
                renderMetaTalentsModalUI();
                updateTopBarUI();
            });
        }
        container.appendChild(card);
    });
}

export function resetAllMetaTalents() {
    if (!metaState.metaTalents) return;
    let refunded = 0;
    Object.values(META_TALENTS).forEach(talent => {
        const curLv = Number(metaState.metaTalents[talent.id]) || 0;
        for (let i = 0; i < curLv; i++) {
            refunded += talent.baseCost + i * talent.costStep;
        }
        metaState.metaTalents[talent.id] = 0;
    });

    if (refunded > 0) {
        if (!metaState.isAdminMode) {
            metaState.medals = (metaState.medals || 0) + refunded;
        }
        triggerHaptic(25);
        if (sfxRef) sfxRef.play('upgrade');
        saveProgress();
        renderMetaTalentsModalUI();
        updateTopBarUI();
    } else if (sfxRef) {
        sfxRef.play('cannon');
    }
}

// ============================================================================
// 4B. Ụ PHÁO PHÒNG THỦ CĂN CỨ XANH (#base-turret-modal)
// ============================================================================
export function updateLobbyTurretShortLabel() {
    const labelEl = document.getElementById('lobby-turret-short-label');
    if (!labelEl) return;
    const tState = metaState.baseTurret || { type: 'gatling', level: 1 };
    const cfg = BASE_TURRET_CONFIG[tState.type] || BASE_TURRET_CONFIG.gatling;
    labelEl.textContent = `${cfg.shortName} LV.${tState.level || 1}`;
}

export function renderBaseTurretModalUI() {
    if (!metaState.baseTurret) {
        metaState.baseTurret = { type: 'gatling', level: 1 };
    }
    const curType = metaState.baseTurret.type || 'gatling';
    const curLv = Math.max(1, Number(metaState.baseTurret.level) || 1);
    const lvMult = 1 + (curLv - 1) * 0.15;
    const bastionLv = Number(metaState.metaTalents?.immortal_bastion) || 0;
    const bastionMult = 1 + bastionLv * 0.08;
    const activeCfg = BASE_TURRET_CONFIG[curType] || BASE_TURRET_CONFIG.gatling;

    const lvValEl = document.getElementById('turret-modal-level-val');
    if (lvValEl) lvValEl.textContent = `LV.${curLv}`;

    const statsBadgeEl = document.getElementById('turret-modal-stats-badge');
    if (statsBadgeEl) {
        const effDmg = Math.round(activeCfg.baseDamage * lvMult * bastionMult);
        statsBadgeEl.textContent = `DMG: ${effDmg} • Tầm: ${activeCfg.range} • Tốc: ${activeCfg.fireRate}/s`;
    }

    const container = document.getElementById('turret-options-container');
    if (container) {
        container.innerHTML = '';
        Object.values(BASE_TURRET_CONFIG).forEach(turret => {
            const isSelected = turret.id === curType;
            const effDmg = Math.round(turret.baseDamage * lvMult * bastionMult);

            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = 44;
            previewCanvas.height = 44;
            const pCtx = previewCanvas.getContext('2d');
            drawBaseTurretArt(pCtx, turret.id, 22, 24, -Math.PI / 2, 0.5);
            const previewUrl = previewCanvas.toDataURL();

            const card = document.createElement('div');
            card.className = `turret-option-card ${isSelected ? 'active-turret' : ''}`;
            card.innerHTML = `
                <img src="${previewUrl}" class="w-11 h-11 pixel-art flex-shrink-0" alt="${turret.name}" />
                <div class="flex-1 text-left">
                    <div class="text-xs font-black text-slate-900">${turret.icon} ${turret.name}</div>
                    <div class="text-[10px] font-bold text-slate-600 leading-snug mt-0.5">${turret.desc}</div>
                    <div class="text-[10px] font-extrabold text-sky-700 mt-1 vt323-num">
                        ⚔️ DMG Cấp ${curLv}: ${effDmg} • 🎯 Tầm bắn: ${turret.range}px
                    </div>
                </div>
                <button type="button" class="btn-3d ${isSelected ? 'btn-3d-amber' : 'btn-3d-cyan'} px-3 py-2 text-[10.5px]">
                    ${isSelected ? '✓ ĐANG LẮP' : 'CHỌN LẮP'}
                </button>
            `;

            card.querySelector('button')?.addEventListener('click', () => {
                metaState.baseTurret.type = turret.id;
                saveProgress();
                triggerHaptic(20);
                if (sfxRef) sfxRef.play('upgrade');
                renderBaseTurretModalUI();
                updateLobbyTurretShortLabel();
            });

            container.appendChild(card);
        });
    }

    const upgCost = getBaseTurretUpgradeCost(curLv);
    const costLabelEl = document.getElementById('turret-upgrade-cost-label');
    if (costLabelEl) {
        costLabelEl.textContent = metaState.isAdminMode ? '🪙 0 (ADMIN ∞)' : `🪙 ${upgCost.toLocaleString('en-US')}`;
    }

    const btnUpg = document.getElementById('btn-upgrade-base-turret');
    if (btnUpg) {
        btnUpg.disabled = !metaState.isAdminMode && metaState.coins < upgCost;
    }
}

// ============================================================================
// 4C. SỔ TAY INDEX 17 BINH CHỦNG & THƯỞNG MỐC SƯU TẦM (#codex-modal)
// ============================================================================
export function updateCodexNotificationDot() {
    const dotEl = document.getElementById('codex-notif-dot');
    if (!dotEl) return;
    dotEl.classList.toggle('hidden', !hasClaimableCodexMilestones());
}

export function renderCodexModalUI() {
    const listEl = document.getElementById('codex-units-list');
    const summaryEl = document.getElementById('codex-claimed-summary');
    const claimAllBtn = document.getElementById('btn-codex-claim-all');
    if (!listEl) return;

    listEl.innerHTML = '';
    const totalMilestones = UNIT_CATALOG.length * CODEX_MILESTONES.length;
    let totalClaimed = 0;
    let anyClaimable = false;

    UNIT_CATALOG.forEach(u => {
        const maxRankEver = getHighestEverRarityRankForUnit(u.id);
        const curRarityId = maxRankEver >= 0 ? (RARITY_ORDER[maxRankEver] || 'common') : 'common';
        const rCfg = RARITY_CONFIG[curRarityId] || RARITY_CONFIG.common;
        const spriteUrl = getUnitSpriteDataURL(u, 7);

        let msButtonsHtml = '';
        CODEX_MILESTONES.forEach(ms => {
            const claimKey = `${u.id}__${ms.id}`;
            const isClaimed = !!metaState.codexClaimed?.[claimKey];
            const isUnlocked = maxRankEver >= ms.minRank;
            if (isClaimed) totalClaimed++;
            if (isUnlocked && !isClaimed) anyClaimable = true;

            const stateClass = isClaimed ? 'ms-claimed' : (isUnlocked ? 'ms-claimable' : 'ms-locked');
            const statusLabel = isClaimed
                ? `✓ ${ms.label}`
                : (isUnlocked ? `🎁 NHẬN +${ms.rewardGems}💎` : `🔒 ${ms.label}`);

            msButtonsHtml += `
                <button type="button" data-unit-id="${u.id}" data-ms-id="${ms.id}" class="codex-ms-btn ${stateClass}" ${(!isUnlocked || isClaimed) ? 'disabled' : ''}>
                    <div>${statusLabel}</div>
                    <div class="text-[7.5px] opacity-90">+${ms.rewardGems}💎 +${ms.rewardMedals}🎖️</div>
                </button>
            `;
        });

        const row = document.createElement('div');
        row.className = 'codex-unit-row';
        row.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <img src="${spriteUrl}" class="w-9 h-9 pixel-art bg-slate-800 rounded-lg p-1 border border-slate-900" alt="${u.name}" />
                    <div class="text-left">
                        <div class="text-xs font-black text-slate-900">${u.name}</div>
                        <div class="text-[9.5px] font-bold text-slate-500">${u.role}</div>
                    </div>
                </div>
                <span class="rarity-badge ${rCfg.cssClass}">
                    ${maxRankEver >= 0 ? `Đạt: ${rCfg.name}` : 'Chưa sở hữu'}
                </span>
            </div>
            <div class="codex-milestones-grid">${msButtonsHtml}</div>
        `;

        row.querySelectorAll('.codex-ms-btn.ms-claimable').forEach(btn => {
            btn.addEventListener('click', () => {
                const uId = btn.getAttribute('data-unit-id');
                const mId = btn.getAttribute('data-ms-id');
                claimSingleCodexMilestone(uId, mId);
            });
        });

        listEl.appendChild(row);
    });

    if (summaryEl) {
        summaryEl.textContent = `${totalClaimed} / ${totalMilestones}`;
    }
    if (claimAllBtn) {
        claimAllBtn.disabled = !anyClaimable;
    }
}

export function claimSingleCodexMilestone(unitId, msId) {
    const ms = CODEX_MILESTONES.find(m => m.id === msId);
    if (!ms) return;
    const maxRank = getHighestEverRarityRankForUnit(unitId);
    const claimKey = `${unitId}__${ms.id}`;
    if (maxRank < ms.minRank || metaState.codexClaimed?.[claimKey]) return;

    if (!metaState.codexClaimed) metaState.codexClaimed = {};
    metaState.codexClaimed[claimKey] = true;
    metaState.gems += ms.rewardGems;
    metaState.medals = (metaState.medals || 0) + ms.rewardMedals;

    saveProgress();
    triggerHaptic(25);
    if (sfxRef) sfxRef.play('upgrade');
    renderCodexModalUI();
    updateTopBarUI();
}

export function claimAllCodexMilestones() {
    let gainedGems = 0;
    let gainedMedals = 0;
    if (!metaState.codexClaimed) metaState.codexClaimed = {};

    UNIT_CATALOG.forEach(u => {
        const maxRank = getHighestEverRarityRankForUnit(u.id);
        CODEX_MILESTONES.forEach(ms => {
            const claimKey = `${u.id}__${ms.id}`;
            if (maxRank >= ms.minRank && !metaState.codexClaimed[claimKey]) {
                metaState.codexClaimed[claimKey] = true;
                gainedGems += ms.rewardGems;
                gainedMedals += ms.rewardMedals;
            }
        });
    });

    if (gainedGems > 0 || gainedMedals > 0) {
        metaState.gems += gainedGems;
        metaState.medals = (metaState.medals || 0) + gainedMedals;
        saveProgress();
        triggerHaptic(35);
        if (sfxRef) sfxRef.play('upgrade');
        renderCodexModalUI();
        updateTopBarUI();
    }
}

// ============================================================================
// 5. NHIỆM VỤ CHIẾN DỊCH & GIFTCODE
// ============================================================================
export function updateMissionNotificationDot() {
    const dotEl = document.getElementById('mission-notif-dot');
    if (!dotEl) return;
    const mp = metaState.missionsProgress;
    const hasClaimable = MISSIONS_CATALOG.some(m => {
        const cur = Number(mp[m.statKey]) || 0;
        return cur >= m.target && !mp.claimed[m.id];
    });
    dotEl.classList.toggle('hidden', !hasClaimable);
}

export function renderMissionsList() {
    const container = document.getElementById('mission-list-container');
    if (!container) return;
    container.innerHTML = '';
    const mp = metaState.missionsProgress;

    MISSIONS_CATALOG.forEach(m => {
        const cur = Math.min(m.target, Number(mp[m.statKey]) || 0);
        const pct = Math.max(0, Math.min(100, Math.round((cur / m.target) * 100)));
        const isClaimed = !!mp.claimed[m.id];
        const canClaim = cur >= m.target && !isClaimed;
        const coinBonusText = m.rewardCoins ? ` • 🪙 +${m.rewardCoins.toLocaleString('en-US')}` : '';

        const item = document.createElement('div');
        item.className = 'mission-item-card';
        item.innerHTML = `
            <div class="flex-1 text-left">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold text-slate-900">${m.title}</span>
                    <span class="text-[10.5px] font-black text-emerald-600">💎 +${m.rewardGems.toLocaleString('en-US')}${coinBonusText}</span>
                </div>
                <div class="mission-progress-track">
                    <div class="mission-progress-fill" style="width: ${pct}%"></div>
                </div>
                <div class="text-[10px] font-bold text-slate-500 mt-0.5">Tiến độ: ${cur.toLocaleString('en-US')} / ${m.target.toLocaleString('en-US')}</div>
            </div>
            <div>
                <button class="btn-3d ${canClaim ? 'btn-3d-green' : 'btn-3d-yellow'} px-3 py-1.5 text-[11px]" ${canClaim ? '' : 'disabled'}>
                    ${isClaimed ? 'ĐÃ NHẬN' : (canClaim ? 'NHẬN' : 'CHƯA ĐẠT')}
                </button>
            </div>
        `;

        const btn = item.querySelector('button');
        if (btn && canClaim) {
            btn.addEventListener('click', () => {
                metaState.missionsProgress.claimed[m.id] = true;
                metaState.gems += m.rewardGems || 0;
                metaState.coins += m.rewardCoins || 0;
                saveProgress();
                triggerHaptic(20);
                if (sfxRef) sfxRef.play('upgrade');
                renderMissionsList();
                updateTopBarUI();
            });
        }
        container.appendChild(item);
    });
}

export function renderGiftcodeModalUI() {
    const input = document.getElementById('giftcode-input');
    const fb = document.getElementById('giftcode-feedback');
    const usedCountEl = document.getElementById('giftcode-used-count');
    const tagsWrap = document.getElementById('giftcode-used-tags');

    if (input) input.value = '';
    if (fb) fb.classList.add('hidden');

    const usedList = Array.isArray(metaState.usedCodes) ? metaState.usedCodes : [];
    if (usedCountEl) usedCountEl.textContent = `${usedList.length} / ${OFFICIAL_GIFTCODES.length} mã`;

    if (tagsWrap) {
        tagsWrap.innerHTML = '';
        if (usedList.length === 0) {
            tagsWrap.innerHTML = `<span class="text-[10px] text-slate-400 italic">Chưa có mã nào được nhập</span>`;
        } else {
            usedList.forEach(code => {
                const pill = document.createElement('span');
                pill.className = 'used-code-pill';
                pill.textContent = `✓ ${code}`;
                tagsWrap.appendChild(pill);
            });
        }
    }
}

// ============================================================================
// 6. TAB SHOP: MỞ RƯƠNG SIÊU TỐC O(1) & CỬA HÀNG CHIP BỔ TRỢ
// ============================================================================
let pendingGachaData = null;

export function renderShopChipStoreUI() {
    const listEl = document.getElementById('shop-chips-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    Object.values(UNIT_CHIPS).forEach(chip => {
        const ownedCount = getChipOwnedCount(chip.id);
        const coinCost = chip.buyCoins || CHIP_BUY_COST_COINS;
        const gemCost = chip.buyGems || CHIP_BUY_COST_GEMS;
        const canBuyCoins = metaState.isAdminMode || metaState.coins >= coinCost;
        const canBuyGems = metaState.isAdminMode || metaState.gems >= gemCost;

        const row = document.createElement('div');
        row.className = 'shop-chip-item-row';
        row.innerHTML = `
            <div class="flex items-center gap-2 flex-1 text-left">
                <div class="w-9 h-9 rounded-lg bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-xl flex-shrink-0">
                    ${chip.icon}
                </div>
                <div>
                    <div class="text-xs font-black text-white">
                        ${chip.name} <span class="text-amber-300 vt323-num text-sm">(Kho: ${ownedCount})</span>
                    </div>
                    <div class="text-[9.5px] font-bold text-slate-300 leading-tight mt-0.5">${chip.desc}</div>
                </div>
            </div>
            <div class="flex flex-col gap-1 flex-shrink-0">
                <button type="button" data-buy-chip="${chip.id}" data-curr="coins" class="btn-3d btn-3d-amber px-2.5 py-1 text-[10px] vt323-num" ${!canBuyCoins ? 'disabled' : ''}>
                    🪙 ${coinCost.toLocaleString('en-US')}
                </button>
                <button type="button" data-buy-chip="${chip.id}" data-curr="gems" class="btn-3d btn-3d-cyan px-2.5 py-1 text-[10px] vt323-num" ${!canBuyGems ? 'disabled' : ''}>
                    💎 ${gemCost.toLocaleString('en-US')}
                </button>
            </div>
        `;

        row.querySelectorAll('button[data-buy-chip]').forEach(btn => {
            btn.addEventListener('click', () => {
                const cId = btn.getAttribute('data-buy-chip');
                const curr = btn.getAttribute('data-curr');
                if (buyChipItem(cId, curr)) {
                    triggerHaptic(20);
                    if (sfxRef) sfxRef.play('upgrade');
                    renderShopChipStoreUI();
                    updateTopBarUI();
                } else if (sfxRef) {
                    sfxRef.play('cannon');
                }
            });
        });

        listEl.appendChild(row);
    });
}

export function requestOpenGachaCrate(crateType, count) {
    const qty = Math.max(1, Math.min(MAX_CRATE_OPEN_QTY, Math.floor(Number(count) || 1)));
    const isLegendary = crateType === 'legendary';
    const unitPrice = isLegendary ? 300 : 150;

    const blocksOf10 = Math.floor(qty / 10);
    const rawCost = qty * unitPrice;
    const discountAmount = Math.round(blocksOf10 * 10 * unitPrice * 0.1);
    const finalCost = metaState.isAdminMode ? 0 : Math.max(0, rawCost - discountAmount);

    pendingGachaData = {
        crateType,
        qty,
        unitPrice,
        rawCost,
        blocksOf10,
        discountAmount,
        finalCost,
        isLegendary
    };

    const modal = document.getElementById('gacha-confirm-modal');
    const titleEl = document.getElementById('gacha-conf-crate-title');
    const qtyEl = document.getElementById('gacha-conf-qty');
    const rawCostEl = document.getElementById('gacha-conf-raw-cost');
    const discEl = document.getElementById('gacha-conf-discount-tag');
    const savedEl = document.getElementById('gacha-conf-saved');
    const finalCostEl = document.getElementById('gacha-conf-final-cost');
    const errEl = document.getElementById('gacha-conf-error');
    const confirmBtn = document.getElementById('btn-confirm-custom-gacha');

    if (titleEl) titleEl.textContent = isLegendary ? '👑 LEGENDARY CRATE' : '🧰 EPIC CRATE';
    if (qtyEl) qtyEl.textContent = `${qty.toLocaleString('en-US')} rương (${formatCompactNumber(qty)})`;
    if (rawCostEl) rawCostEl.textContent = `💎 ${rawCost.toLocaleString('en-US')}`;
    if (discEl) discEl.textContent = blocksOf10 > 0 ? `-10% (${formatCompactNumber(blocksOf10)} cụm 10)` : 'Không đủ 10 rương để giảm giá';
    if (savedEl) savedEl.textContent = `💎 ${discountAmount.toLocaleString('en-US')}`;
    if (finalCostEl) finalCostEl.textContent = metaState.isAdminMode ? '💎 0 (ADMIN ∞)' : `💎 ${finalCost.toLocaleString('en-US')}`;

    const hasEnough = metaState.isAdminMode || metaState.gems >= finalCost;
    if (errEl) errEl.classList.toggle('hidden', hasEnough);
    if (confirmBtn) confirmBtn.disabled = !hasEnough;

    if (modal) modal.classList.add('active');
}

// ============================================================================
// 7. TAB ARMY: SHOWCASE CANVAS, REVIEW SANDBOX, CHIP SOCKETS (KHE 2 = 500 💎) & MERGE
// ============================================================================
export function drawCanvasRarityAura(ctx, cx, cy, baseRadius, rarityId, timeSec) {
    const rCfg = RARITY_CONFIG[rarityId];
    if (!rCfg) return;

    if (isMasterRarity(rarityId)) {
        ctx.save();
        ctx.translate(cx, cy);

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

        const orbCount = 6;
        for (let i = 0; i < orbCount; i++) {
            const a = timeSec * 3.8 + (i * Math.PI * 2) / orbCount;
            const ox = Math.cos(a) * (baseRadius * 1.15);
            const oy = Math.sin(a) * (baseRadius * 0.55) - Math.abs(Math.sin(timeSec * 5 + i)) * 5;
            ctx.fillStyle = i % 2 === 0 ? '#e0f2fe' : '#00f2fe';
            ctx.beginPath();
            ctx.arc(ox, oy, 3.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    } else if (isDemonRarity(rarityId)) {
        ctx.save();
        ctx.translate(cx, cy);

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

        ctx.restore();
    }
}

export function renderArmyShowcaseCanvas() {
    const sCanvas = document.getElementById('army-hero-showcase');
    if (!sCanvas) return;
    const sCtx = sCanvas.getContext('2d');
    sCtx.imageSmoothingEnabled = false;
    sCtx.clearRect(0, 0, sCanvas.width, sCanvas.height);

    const normId = normalizeUnitId(showcaseUnitId);
    const u = UNIT_BY_ID[normId] || UNIT_CATALOG[0];
    const highestRarity = getHighestRarityForUnit(u.id);
    const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;
    const timeSec = performance.now() * 0.001;

    const pedestalEl = document.querySelector('.army-pedestal-circle');
    if (pedestalEl) {
        pedestalEl.classList.toggle('pedestal-master', isMasterRarity(highestRarity));
        pedestalEl.classList.toggle('pedestal-demon', isDemonRarity(highestRarity));
    }

    if (isMasterRarity(highestRarity) || isDemonRarity(highestRarity)) {
        drawCanvasRarityAura(sCtx, 64, 92, 34, highestRarity, timeSec);
    }

    const bob = Math.sin(timeSec * 5) * 3;
    if (isCustomArtUnit(u.id)) {
        drawCustomUnitArt(sCtx, u.id, 64, 62 + bob, 76, 'blue', timeSec, 0);
    } else if (atlasRef && atlasRef.ready) {
        atlasRef.draw(sCtx, u.spriteCol, 7, 64, 62 + bob, 78, 78);
    }

    const nameEl = document.getElementById('army-showcase-name');
    if (nameEl) nameEl.textContent = `${u.name.toUpperCase()} (LV.${metaState.armyPermanentLevels[u.id] || 1})`;

    const rarityEl = document.getElementById('army-showcase-rarity');
    if (rarityEl) {
        rarityEl.className = `rarity-badge ${rCfg.cssClass}`;
        rarityEl.textContent = `${rCfg.name.toUpperCase()} (${rCfg.mult}x)`;
    }
}

export function renderArmyTabUI() {
    renderArmyShowcaseCanvas();

    const btnArmy = document.getElementById('btn-mode-army');
    const btnReview = document.getElementById('btn-mode-review');
    const btnMerge = document.getElementById('btn-mode-merge');

    const listView = document.getElementById('army-list-view');
    const reviewView = document.getElementById('army-review-view');
    const mergeView = document.getElementById('army-merge-view');

    btnArmy?.classList.toggle('active', currentArmyMode === 'army');
    btnReview?.classList.toggle('active', currentArmyMode === 'review');
    btnMerge?.classList.toggle('active', currentArmyMode === 'merge');

    listView?.classList.toggle('active', currentArmyMode === 'army');
    reviewView?.classList.toggle('active', currentArmyMode === 'review');
    mergeView?.classList.toggle('active', currentArmyMode === 'merge');

    if (currentArmyMode === 'army') {
        renderArmyUnitsGrid();
    } else if (currentArmyMode === 'review') {
        renderArmyReviewGrid();
    } else {
        renderMergeWorkbenchAndInventory();
    }
}

export function renderArmyUnitsGrid() {
    const grid = document.getElementById('army-units-grid');
    if (!grid) return;
    grid.innerHTML = '';

    UNIT_CATALOG.forEach(u => {
        const permLv = metaState.armyPermanentLevels[u.id] || 1;
        const highestRarity = getHighestRarityForUnit(u.id);
        const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;
        const owned = hasUnitInInventory(u.id);
        const spriteUrl = getUnitSpriteDataURL(u, 7);

        const sockets = metaState.unitSockets[u.id] || [null, null];
        const slot2Unlocked = isUnitSocket2Unlocked(u.id);
        const chipDotsHtml = [0, 1].map(idx => {
            if (idx === 1 && !slot2Unlocked) {
                return `<span class="socket-dot" style="background:#0f172a;border-color:#fde047;" title="Khe 2 khóa"></span>`;
            }
            const cId = sockets[idx];
            const chip = cId ? UNIT_CHIPS[cId] : null;
            return `<span class="socket-dot ${chip ? chip.dotCss : ''}"></span>`;
        }).join('');

        const card = document.createElement('div');
        card.className = `army-unit-card ${rCfg.cssClass}`;
        card.innerHTML = `
            <div class="card-socket-dots">${chipDotsHtml}</div>
            <div class="card-top-lv">
                <span>LV.${permLv}</span>
                ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : `<span class="text-[8px] opacity-95">${owned ? rCfg.name : 'Cơ bản'}</span>`}
            </div>
            <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u.name}" />
            <div class="card-unit-title">${u.name}</div>
        `;

        card.addEventListener('click', () => {
            showcaseUnitId = u.id;
            renderArmyShowcaseCanvas();
            openUnitUpgradeModal(u.id);
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

    UNIT_CATALOG.forEach(u => {
        const permLv = metaState.armyPermanentLevels[u.id] || 1;
        const owned = hasUnitInInventory(u.id);
        const highestRarity = owned ? getHighestRarityForUnit(u.id) : 'common';
        const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;
        const spriteUrl = getUnitSpriteDataURL(u, 7);

        const card = document.createElement('div');
        card.className = `army-unit-card ${rCfg.cssClass}`;
        card.innerHTML = `
            <div class="card-top-lv">
                <span>${u.cost}⛽</span>
                <span class="card-plus-tag" style="background:#0284c7;color:#fff;">🎯 TEST</span>
            </div>
            <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u.name}" />
            <div class="card-unit-title">${u.name}</div>
        `;

        card.addEventListener('click', () => {
            showcaseUnitId = u.id;
            renderArmyShowcaseCanvas();
            openSandboxReviewModal(u.id);
        });

        grid.appendChild(card);
    });
}

const sandboxState = {
    active: false,
    unitId: PRIMARY_INFANTRY_ID,
    rarityId: 'common',
    totalDamageDealt: 0,
    elapsedSec: 0,
    attackTimer: 0.15,
    dummyHitFlash: 0,
    dummyHpDisplay: 999999,
    projectiles: [],
    beams: [],
    floats: [],
    rafId: null,
    lastTs: 0,
    hudTick: 0
};

const SANDBOX_TEST_RARITIES = [
    'common', 'uncommon', 'rare', 'epic2', 'legendary3', 'mythic4', 'secret5', 'master8', 'demon10'
];

export function stopSandboxReviewLoop() {
    sandboxState.active = false;
    if (sandboxState.rafId) {
        cancelAnimationFrame(sandboxState.rafId);
        sandboxState.rafId = null;
    }
}

function resetSandboxDpsMetrics() {
    sandboxState.totalDamageDealt = 0;
    sandboxState.elapsedSec = 0;
    sandboxState.attackTimer = 0.12;
    sandboxState.projectiles = [];
    sandboxState.beams = [];
    sandboxState.floats = [];
    updateSandboxStatsUI();
}

function updateSandboxStatsUI() {
    const u = UNIT_BY_ID[sandboxState.unitId] || UNIT_CATALOG[0];
    const sp = getEffectiveUnitStats(u.id, 'blue', sandboxState.rarityId);
    const rCfg = RARITY_CONFIG[sandboxState.rarityId] || RARITY_CONFIG.common;

    const titleEl = document.getElementById('sb-modal-title');
    if (titleEl) titleEl.textContent = `👁️ REVIEW: ${u.name.toUpperCase()}`;

    const nameEl = document.getElementById('sb-unit-name');
    if (nameEl) nameEl.textContent = `${u.name.toUpperCase()} (LV.${sp.level || 1}) • ${u.cost} ⛽`;

    const roleEl = document.getElementById('sb-unit-role');
    if (roleEl) roleEl.textContent = `${u.role} • Tốc bắn: ${sp.fireRate}/s`;

    const badgeEl = document.getElementById('sb-unit-rarity-badge');
    if (badgeEl) {
        badgeEl.className = `rarity-badge ${rCfg.cssClass}`;
        badgeEl.textContent = `${rCfg.name.toUpperCase()} (${rCfg.mult}x)`;
    }

    const dmgEl = document.getElementById('sb-stat-dmg');
    if (dmgEl) dmgEl.textContent = formatCompactNumber(sp.damage);

    const dpsEl = document.getElementById('sb-stat-dps');
    if (dpsEl) {
        const avgDps = sandboxState.elapsedSec > 0.25
            ? (sandboxState.totalDamageDealt / sandboxState.elapsedSec)
            : (sp.damage * sp.fireRate);
        dpsEl.textContent = avgDps >= 10000 ? formatCompactNumber(avgDps) : avgDps.toFixed(1);
    }

    const hpRangeEl = document.getElementById('sb-stat-hp-range');
    if (hpRangeEl) hpRangeEl.textContent = `${formatCompactNumber(sp.hp)} / ${sp.range}px`;
}

export function openSandboxReviewModal(rawUnitId) {
    stopSandboxReviewLoop();
    const unitId = normalizeUnitId(rawUnitId);
    const u = UNIT_BY_ID[unitId] || UNIT_CATALOG[0];
    const ownedRarity = getHighestRarityForUnit(u.id);

    sandboxState.unitId = u.id;
    sandboxState.rarityId = ownedRarity;
    resetSandboxDpsMetrics();

    // Render dải nút chọn nhanh Rarity để test bắn thử
    const selectorEl = document.getElementById('sb-rarity-selector');
    if (selectorEl) {
        selectorEl.innerHTML = '';
        const list = [...SANDBOX_TEST_RARITIES];
        if (!list.includes(ownedRarity)) list.unshift(ownedRarity);

        list.forEach(rKey => {
            const rCfg = RARITY_CONFIG[rKey];
            if (!rCfg) return;
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `sb-rarity-pill ${rCfg.cssClass} ${sandboxState.rarityId === rKey ? 'active' : ''}`;
            pill.textContent = `${rCfg.name} (${rCfg.mult}x)`;
            pill.addEventListener('click', () => {
                sandboxState.rarityId = rKey;
                selectorEl.querySelectorAll('.sb-rarity-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                if (sfxRef) sfxRef.play('gas');
                resetSandboxDpsMetrics();
            });
            selectorEl.appendChild(pill);
        });
    }

    updateSandboxStatsUI();
    document.getElementById('sandbox-review-modal')?.classList.add('active');

    sandboxState.active = true;
    sandboxState.lastTs = performance.now();

    function sandboxLoop(now) {
        if (!sandboxState.active) return;
        const dt = Math.min(0.05, Math.max(0.001, (now - sandboxState.lastTs) / 1000));
        sandboxState.lastTs = now;
        sandboxState.elapsedSec += dt;

        const sp = getEffectiveUnitStats(sandboxState.unitId, 'blue', sandboxState.rarityId);
        const unitX = 82;
        const unitY = 108;
        const dummyX = 252;
        const dummyY = 108;

        if (sandboxState.dummyHitFlash > 0) {
            sandboxState.dummyHitFlash = Math.max(0, sandboxState.dummyHitFlash - dt);
        }

        sandboxState.attackTimer -= dt * (sp.fireRate || 1.0);
        if (sandboxState.attackTimer <= 0) {
            sandboxState.attackTimer = 1.0;

            if (sp.isHealer) {
                if (sfxRef) sfxRef.play('heal');
                sandboxState.totalDamageDealt += sp.damage;
                sandboxState.beams.push({ x1: unitX + 12, y1: unitY - 4, x2: dummyX, y2: dummyY, color: '#34d399', width: 3.5, ttl: 0.16 });
                sandboxState.floats.push({ x: dummyX, y: dummyY - 22, text: `+${formatCompactNumber(sp.damage)} HP`, color: '#4ade80', alpha: 1.0 });
            } else if (sp.attackType === 'projectile') {
                if (sfxRef) sfxRef.play('cannon');
                sandboxState.projectiles.push({
                    x: unitX + 14,
                    y: unitY,
                    startX: unitX + 14,
                    startY: unitY,
                    targetX: dummyX,
                    targetY: dummyY,
                    arcHeight: sp.arcHeight || 16,
                    projType: sp.projType || 'shell',
                    damage: sp.damage,
                    burnDps: sp.burnDps || 0,
                    t: 0,
                    duration: 0.42
                });
            } else {
                if (sfxRef) sfxRef.play(sp.attackType === 'railgun_line' ? 'railgun' : 'beam');
                sandboxState.totalDamageDealt += sp.damage;
                sandboxState.dummyHitFlash = 0.12;
                const beamCol = sp.attackType === 'railgun_line' ? '#00f2fe' : '#fde047';
                const endX = sp.attackType === 'railgun_line' ? 330 : dummyX;
                sandboxState.beams.push({ x1: unitX + 14, y1: unitY, x2: endX, y2: dummyY, color: beamCol, width: sp.attackType === 'railgun_line' ? 5 : 2.8, ttl: 0.12 });
                sandboxState.floats.push({ x: dummyX + (Math.random() - 0.5) * 14, y: dummyY - 22, text: `-${formatCompactNumber(sp.damage)}`, color: '#fde047', alpha: 1.0 });
            }
        }

        // Cập nhật đạn bay trong phòng tập
        for (let i = sandboxState.projectiles.length - 1; i >= 0; i--) {
            const p = sandboxState.projectiles[i];
            p.t += dt / p.duration;
            const clamped = Math.min(1, p.t);
            p.x = p.startX + (p.targetX - p.startX) * clamped;
            p.y = p.startY + (p.targetY - p.startY) * clamped - Math.sin(clamped * Math.PI) * p.arcHeight;
            if (p.t >= 1) {
                const totalHit = p.damage + (p.burnDps > 0 ? p.burnDps * 2 : 0);
                sandboxState.totalDamageDealt += totalHit;
                sandboxState.dummyHitFlash = 0.14;
                if (sfxRef) sfxRef.play('boom');
                sandboxState.floats.push({
                    x: dummyX + (Math.random() - 0.5) * 16,
                    y: dummyY - 22,
                    text: `-${formatCompactNumber(totalHit)}`,
                    color: p.projType === 'ice_shard' ? '#38bdf8' : '#fb923c',
                    alpha: 1.0
                });
                sandboxState.projectiles.splice(i, 1);
            }
        }

        for (let i = sandboxState.beams.length - 1; i >= 0; i--) {
            sandboxState.beams[i].ttl -= dt;
            if (sandboxState.beams[i].ttl <= 0) sandboxState.beams.splice(i, 1);
        }

        for (let i = sandboxState.floats.length - 1; i >= 0; i--) {
            const ft = sandboxState.floats[i];
            ft.y -= 28 * dt;
            ft.alpha -= dt * 1.15;
            if (ft.alpha <= 0) sandboxState.floats.splice(i, 1);
        }

        sandboxState.hudTick += dt;
        if (sandboxState.hudTick >= 0.22) {
            sandboxState.hudTick = 0;
            updateSandboxStatsUI();
        }

        // Vẽ Canvas Phòng Tập Sandbox
        const sbCanvas = document.getElementById('sandboxCanvas');
        if (sbCanvas) {
            const sCtx = sbCanvas.getContext('2d');
            const W = sbCanvas.width;
            const H = sbCanvas.height;
            sCtx.clearRect(0, 0, W, H);

            // Sàn lưới công nghệ phòng tập
            sCtx.fillStyle = '#0f172a';
            sCtx.fillRect(0, 0, W, H);
            sCtx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
            sCtx.lineWidth = 1;
            for (let gx = 0; gx < W; gx += 24) {
                sCtx.beginPath();
                sCtx.moveTo(gx, 0);
                sCtx.lineTo(gx, H);
                sCtx.stroke();
            }
            for (let gy = 0; gy < H; gy += 24) {
                sCtx.beginPath();
                sCtx.moveTo(0, gy);
                sCtx.lineTo(W, gy);
                sCtx.stroke();
            }

            // Vòng tầm bắn của nhân vật
            sCtx.save();
            sCtx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            sCtx.lineWidth = 1.5;
            sCtx.setLineDash([5, 5]);
            sCtx.beginPath();
            sCtx.arc(unitX, unitY, Math.min(230, sp.range), 0, Math.PI * 2);
            sCtx.stroke();
            sCtx.restore();

            // Hào quang Master / Demon nếu có
            if (isMasterRarity(sandboxState.rarityId) || isDemonRarity(sandboxState.rarityId)) {
                drawCanvasRarityAura(sCtx, unitX, unitY + 12, 24, sandboxState.rarityId, sandboxState.elapsedSec);
            }

            // Vẽ Nhân vật đang test (hướng mặt sang phải về phía Bia tập bắn)
            const bob = Math.sin(sandboxState.elapsedSec * 6) * 2;
            if (isCustomArtUnit(sp.id)) {
                const rot = sp.id === 'railgun_walker' ? Math.PI / 2 : 0;
                drawCustomUnitArt(sCtx, sp.id, unitX, unitY + bob, 46, 'blue', sandboxState.elapsedSec, rot);
            } else if (atlasRef && atlasRef.ready) {
                atlasRef.draw(sCtx, sp.spriteCol ?? 16, 7, unitX, unitY + bob, 46, 46, { rotation: Math.PI / 2 });
            }

            // Vẽ Bia Tập Bắn HP Vô Hạn (hoặc Đồng minh giả định nếu là Mục sư)
            sCtx.save();
            sCtx.translate(dummyX, dummyY);
            sCtx.fillStyle = 'rgba(0,0,0,0.45)';
            sCtx.beginPath();
            sCtx.ellipse(0, 18, 18, 7, 0, 0, Math.PI * 2);
            sCtx.fill();

            sCtx.fillStyle = sandboxState.dummyHitFlash > 0 ? '#ffffff' : (sp.isHealer ? '#0284c7' : '#dc2626');
            sCtx.strokeStyle = '#fde047';
            sCtx.lineWidth = 2.5;
            sCtx.beginPath();
            sCtx.arc(0, 0, 18, 0, Math.PI * 2);
            sCtx.fill();
            sCtx.stroke();

            sCtx.fillStyle = '#ffffff';
            sCtx.beginPath();
            sCtx.arc(0, 0, 10, 0, Math.PI * 2);
            sCtx.fill();
            sCtx.fillStyle = sp.isHealer ? '#16a34a' : '#ef4444';
            sCtx.beginPath();
            sCtx.arc(0, 0, 4.5, 0, Math.PI * 2);
            sCtx.fill();

            sCtx.font = '900 10px "Chakra Petch", sans-serif';
            sCtx.textAlign = 'center';
            sCtx.fillStyle = '#fde047';
            sCtx.fillText(sp.isHealer ? 'ĐỒNG MINH (HP ∞)' : 'BIA TẬP BẮN (HP ∞)', 0, -25);
            sCtx.restore();

            // Vẽ tia laser & đạn bay
            for (const bm of sandboxState.beams) {
                sCtx.save();
                sCtx.strokeStyle = bm.color;
                sCtx.lineWidth = bm.width;
                sCtx.beginPath();
                sCtx.moveTo(bm.x1, bm.y1);
                sCtx.lineTo(bm.x2, bm.y2);
                sCtx.stroke();
                sCtx.restore();
            }

            for (const p of sandboxState.projectiles) {
                sCtx.save();
                sCtx.fillStyle = p.projType === 'ice_shard' ? '#38bdf8' : (p.projType === 'dark_orb' ? '#c084fc' : '#f97316');
                sCtx.beginPath();
                sCtx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
                sCtx.fill();
                sCtx.restore();
            }

            for (const ft of sandboxState.floats) {
                sCtx.save();
                sCtx.globalAlpha = Math.max(0, ft.alpha);
                sCtx.font = '900 13px "Chakra Petch", sans-serif';
                sCtx.textAlign = 'center';
                sCtx.fillStyle = ft.color;
                sCtx.fillText(ft.text, ft.x, ft.y);
                sCtx.restore();
            }
        }

        sandboxState.rafId = requestAnimationFrame(sandboxLoop);
    }

    sandboxState.rafId = requestAnimationFrame(sandboxLoop);
}

// ============================================================================
// 7C. MODAL NÂNG CẤP TƯỚNG, KHE CHIP (MỞ KHE 2 = 500 💎) & HOÀN CẤP
// ============================================================================
export function calcUnitPermanentStats(spec, rarityId, permLv) {
    const rCfg = RARITY_CONFIG[rarityId] || RARITY_CONFIG.common;
    const lvMult = 1 + (permLv - 1) * 0.12;
    const totalMult = rCfg.mult * lvMult;

    const normId = normalizeUnitId(spec.id);
    const sockets = metaState.unitSockets[normId] || [];
    const steelLv = Number(metaState.metaTalents?.high_grade_steel) || 0;
    const vitalRootsLv = getSkillTreeNodeLevel('vital_roots');
    const ironTrunkLv = getSkillTreeNodeLevel('iron_trunk');
    const arcaneTrunkLv = getSkillTreeNodeLevel('arcane_trunk');

    const elemMult = spec.element === 'elemental'
        ? (1 + arcaneTrunkLv * 0.18)
        : (1 + ironTrunkLv * 0.15);

    const hpBonus = (sockets.includes('reactive_armor') ? 1.18 : 1.0) * (1 + steelLv * 0.03 + vitalRootsLv * 0.12);

    return {
        damage: Math.max(1, Math.round(spec.damage * totalMult * elemMult)),
        hp: Math.max(1, Math.round(spec.hp * totalMult * hpBonus))
    };
}

function ensureUnitSocketContainers() {
    const slotsRow = document.getElementById('unit-sockets-slots-row');
    const pickerDrawer = document.getElementById('chip-picker-drawer');
    return { slotsRow, pickerDrawer };
}

export function renderUnitSocketsInModal(rawUnitId) {
    const unitId = normalizeUnitId(rawUnitId);
    const { slotsRow, pickerDrawer } = ensureUnitSocketContainers();
    if (!slotsRow) return;

    if (!metaState.unitSockets[unitId]) {
        metaState.unitSockets[unitId] = [null, null];
    }
    const equipped = metaState.unitSockets[unitId];
    const slot2Unlocked = isUnitSocket2Unlocked(unitId);
    slotsRow.innerHTML = '';

    [0, 1].forEach(slotIdx => {
        const isLockedSlot2 = slotIdx === 1 && !slot2Unlocked;
        const chipId = equipped[slotIdx];
        const chip = chipId ? UNIT_CHIPS[chipId] : null;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `chip-slot-btn ${chip ? 'equipped' : ''}`;
        if (chip) btn.setAttribute('data-chip', chip.id);

        if (isLockedSlot2) {
            btn.style.borderColor = '#f59e0b';
            btn.style.background = '#fffbeb';
            btn.innerHTML = `
                <div class="chip-slot-icon">🔒</div>
                <div class="chip-slot-text-wrap">
                    <span class="chip-slot-name text-amber-800">Khe #2 (Khóa)</span>
                    <span class="chip-slot-effect text-amber-700 font-black">Mở: 💎 ${CHIP_SOCKET_2_UNLOCK_GEMS}</span>
                </div>
            `;
            btn.addEventListener('click', () => {
                if (unlockUnitSocket2(unitId)) {
                    triggerHaptic(25);
                    if (sfxRef) sfxRef.play('upgrade');
                    updateTopBarUI();
                    renderUnitSocketsInModal(unitId);
                    renderArmyTabUI();
                } else {
                    if (sfxRef) sfxRef.play('cannon');
                    alert(`Bạn cần ${CHIP_SOCKET_2_UNLOCK_GEMS} 💎 Gems để mở khóa Khe Chip thứ 2 cho binh chủng này!`);
                }
            });
        } else {
            btn.innerHTML = `
                <div class="chip-slot-icon">${chip ? chip.icon : '➕'}</div>
                <div class="chip-slot-text-wrap">
                    <span class="chip-slot-name">${chip ? chip.name : `Khe Chip #${slotIdx + 1}`}</span>
                    <span class="chip-slot-effect">${chip ? chip.shortName : 'Chạm chọn từ kho'}</span>
                </div>
            `;
            btn.addEventListener('click', () => {
                activeChipSocketIndex = slotIdx;
                renderChipPickerDrawer(unitId, slotIdx);
            });
        }

        slotsRow.appendChild(btn);
    });

    if (pickerDrawer) {
        pickerDrawer.classList.add('hidden');
        pickerDrawer.style.display = 'none';
    }
}

export function renderChipPickerDrawer(rawUnitId, slotIdx) {
    const unitId = normalizeUnitId(rawUnitId);
    const { pickerDrawer } = ensureUnitSocketContainers();
    if (!pickerDrawer) return;
    pickerDrawer.classList.remove('hidden');
    pickerDrawer.style.display = 'grid';
    pickerDrawer.innerHTML = '';

    const currentEquippedChip = metaState.unitSockets?.[unitId]?.[slotIdx] || null;

    if (currentEquippedChip) {
        const removeCard = document.createElement('div');
        removeCard.className = 'chip-item-card';
        removeCard.innerHTML = `
            <span style="font-size:11px;font-weight:800;color:#dc2626;">❌ Tháo Chip khỏi Khe #${slotIdx + 1} (Hoàn 1 viên về kho)</span>
            <button type="button" class="btn-3d btn-3d-danger" style="padding:4px 8px;font-size:9.5px;">GỠ BỎ</button>
        `;
        removeCard.addEventListener('click', () => {
            if (unequipChipFromUnitSlot(unitId, slotIdx)) {
                if (sfxRef) sfxRef.play('gas');
                openUnitUpgradeModal(unitId);
                renderArmyTabUI();
            }
        });
        pickerDrawer.appendChild(removeCard);
    }

    Object.values(UNIT_CHIPS).forEach(chip => {
        const ownedQty = getChipOwnedCount(chip.id);
        const hasStock = metaState.isAdminMode || ownedQty > 0;
        const isRecommended = chip.recommendedUnits.includes(unitId) ||
            (unitId === PRIMARY_INFANTRY_ID && (chip.recommendedUnits.includes('infantry') || chip.recommendedUnits.includes('rifleman')));

        const item = document.createElement('div');
        item.className = `chip-item-card ${isRecommended ? 'compatible' : ''}`;
        item.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;flex:1;">
                <span style="font-size:20px;">${chip.icon}</span>
                <div style="text-align:left;">
                    <div style="font-size:11px;font-weight:900;color:#0f172a;">
                        ${chip.name} <span style="color:#0284c7;">(Kho: ${metaState.isAdminMode ? '∞' : ownedQty})</span>
                        ${isRecommended ? '<span style="color:#16a34a;font-size:9px;">(Khuyên dùng)</span>' : ''}
                    </div>
                    <div style="font-size:9.5px;color:#475569;">${chip.desc}</div>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;">
                <button type="button" data-action="equip" class="btn-3d btn-3d-green" style="padding:4px 8px;font-size:9.5px;" ${!hasStock ? 'disabled' : ''}>
                    ${hasStock ? 'LẮP' : 'HẾT CHIP'}
                </button>
                ${!hasStock ? `<button type="button" data-action="quickbuy" class="btn-3d btn-3d-amber" style="padding:3px 6px;font-size:8.5px;">MUA 2.5K🪙</button>` : ''}
            </div>
        `;

        item.querySelector('button[data-action="equip"]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const res = equipChipToUnitSlot(unitId, slotIdx, chip.id);
            if (res.ok) {
                triggerHaptic(20);
                if (sfxRef) sfxRef.play('upgrade');
                openUnitUpgradeModal(unitId);
                renderArmyTabUI();
            } else if (sfxRef) {
                sfxRef.play('cannon');
            }
        });

        item.querySelector('button[data-action="quickbuy"]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (buyChipItem(chip.id, 'coins')) {
                triggerHaptic(20);
                if (sfxRef) sfxRef.play('upgrade');
                updateTopBarUI();
                renderChipPickerDrawer(unitId, slotIdx);
            } else if (sfxRef) {
                sfxRef.play('cannon');
            }
        });

        pickerDrawer.appendChild(item);
    });
}

export function updateBulkUpgradePreviewUI(rawAddLevels = null) {
    const u = UNIT_BY_ID[inspectingUnitId];
    if (!u) return;

    const inputEl = document.getElementById('upg-custom-add-lv-input');
    let addLv = rawAddLevels !== null
        ? Math.floor(Number(rawAddLevels) || 1)
        : Math.floor(Number(inputEl?.value) || 1);
    addLv = Math.max(1, Math.min(999999, addLv));
    currentBulkAddLevels = addLv;

    if (inputEl && Number(inputEl.value) !== addLv) {
        inputEl.value = String(addLv);
    }

    const permLv = metaState.armyPermanentLevels[u.id] || 1;
    const targetLv = permLv + addLv;
    const highestRarity = getHighestRarityForUnit(u.id);
    const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;
    const totalCostCoins = calcBulkUpgradeCost(permLv, addLv);

    const curStats = calcUnitPermanentStats(u, highestRarity, permLv);
    const targetStats = calcUnitPermanentStats(u, highestRarity, targetLv);

    const lvBadge = document.getElementById('upg-modal-level-badge');
    if (lvBadge) {
        lvBadge.textContent = `LV.${permLv} ➔ LV.${targetLv} (+${addLv.toLocaleString('en-US')})`;
    }

    const multInfoEl = document.getElementById('upg-modal-mult-info');
    if (multInfoEl) {
        multInfoEl.textContent = `Độ hiếm ${rCfg.name}: ${rCfg.mult}x HP & DMG • Cấp ${permLv} ➔ ${targetLv} (+${addLv * 12}% cơ bản)`;
    }

    const bracketEl = document.getElementById('upg-modal-tier-bracket');
    if (bracketEl) bracketEl.textContent = getUpgradeTierBracketText(permLv);

    const dmgLabelEl = document.getElementById('upg-stat-label-dmg');
    if (dmgLabelEl) {
        dmgLabelEl.textContent = u.isHealer ? '💚 Hồi máu (x2 mục tiêu):' : '⚔️ Sát thương:';
    }

    const curDmgEl = document.getElementById('upg-cur-dmg');
    if (curDmgEl) curDmgEl.textContent = formatCompactNumber(curStats.damage);

    const nextDmgEl = document.getElementById('upg-next-dmg');
    if (nextDmgEl) {
        const diffDmg = Math.max(0, targetStats.damage - curStats.damage);
        nextDmgEl.textContent = `${formatCompactNumber(targetStats.damage)} (+${formatCompactNumber(diffDmg)})`;
    }

    const curHpEl = document.getElementById('upg-cur-hp');
    if (curHpEl) curHpEl.textContent = formatCompactNumber(curStats.hp);

    const nextHpEl = document.getElementById('upg-next-hp');
    if (nextHpEl) {
        const diffHp = Math.max(0, targetStats.hp - curStats.hp);
        nextHpEl.textContent = `${formatCompactNumber(targetStats.hp)} (+${formatCompactNumber(diffHp)})`;
    }

    const actionLabelEl = document.getElementById('upg-btn-action-label');
    if (actionLabelEl) {
        actionLabelEl.textContent = `⬆️ NÂNG +${addLv.toLocaleString('en-US')} CẤP`;
    }

    const costEl = document.getElementById('upg-cost-coins');
    if (costEl) {
        costEl.textContent = metaState.isAdminMode
            ? '🪙 0 (ADMIN ∞)'
            : `🪙 ${formatCurrency(totalCostCoins)}`;
    }

    const btnUpg = document.getElementById('btn-confirm-unit-upgrade');
    if (btnUpg) {
        btnUpg.disabled = !metaState.isAdminMode && metaState.coins < totalCostCoins;
    }

    document.querySelectorAll('.upg-quick-lv-btn').forEach(b => {
        const attr = b.getAttribute('data-add-lv');
        if (attr !== 'max') {
            b.classList.toggle('active', Number(attr) === addLv);
        } else {
            b.classList.remove('active');
        }
    });
}

export function openUnitUpgradeModal(rawUnitId) {
    const unitId = normalizeUnitId(rawUnitId);
    inspectingUnitId = unitId;
    const u = UNIT_BY_ID[unitId];
    if (!u) return;

    if (sfxRef) sfxRef.play('gas');
    const permLv = metaState.armyPermanentLevels[u.id] || 1;
    const highestRarity = getHighestRarityForUnit(u.id);
    const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;

    const nameEl = document.getElementById('upg-modal-unit-name');
    if (nameEl) nameEl.textContent = u.name.toUpperCase();

    const frameEl = document.getElementById('upg-modal-card-frame');
    if (frameEl) frameEl.className = `upg-unit-avatar-box ${rCfg.cssClass}`;

    const spriteEl = document.getElementById('upg-modal-sprite');
    if (spriteEl) spriteEl.src = getUnitSpriteDataURL(u, 7);

    const rarityBadge = document.getElementById('upg-modal-rarity-badge');
    if (rarityBadge) {
        rarityBadge.className = `rarity-badge ${rCfg.cssClass}`;
        rarityBadge.textContent = `${rCfg.name.toUpperCase()} (${rCfg.mult}x)`;
    }

    const roleEl = document.getElementById('upg-modal-role');
    if (roleEl) roleEl.textContent = u.role;

    const gasEl = document.getElementById('upg-unit-gas');
    if (gasEl) gasEl.textContent = `${u.cost} Xăng`;

    const btnRefund = document.getElementById('btn-open-level-refund');
    if (btnRefund) {
        btnRefund.disabled = permLv <= 1;
    }

    renderUnitSocketsInModal(u.id);
    updateBulkUpgradePreviewUI(currentBulkAddLevels || 1);
    document.getElementById('unit-upgrade-modal')?.classList.add('active');
}

export function updateLevelRefundModalCalculation() {
    const u = UNIT_BY_ID[inspectingUnitId];
    if (!u) return;

    const curLv = metaState.armyPermanentLevels[u.id] || 1;
    const inputEl = document.getElementById('refund-target-level-input');
    const previewEl = document.getElementById('refund-target-lv-preview');
    const coinsValEl = document.getElementById('refund-total-coins-val');
    const errEl = document.getElementById('refund-error-msg');
    const confirmBtn = document.getElementById('btn-confirm-level-refund');

    const rawTarget = Math.floor(Number(inputEl?.value));
    const isValid = Number.isFinite(rawTarget) && rawTarget >= 1 && rawTarget < curLv;

    if (previewEl) {
        previewEl.textContent = isValid ? `LV.${rawTarget}` : '---';
    }

    if (isValid) {
        const refundCoins = calcTotalRefundCoins(rawTarget, curLv);
        if (coinsValEl) coinsValEl.textContent = `+🪙 ${refundCoins.toLocaleString('en-US')}`;
        if (errEl) errEl.classList.add('hidden');
        if (confirmBtn) confirmBtn.disabled = false;
    } else {
        if (coinsValEl) coinsValEl.textContent = '+🪙 0';
        if (errEl) errEl.classList.remove('hidden');
        if (confirmBtn) confirmBtn.disabled = true;
    }
}

export function openLevelRefundModal() {
    const u = UNIT_BY_ID[inspectingUnitId];
    if (!u) return;
    const curLv = metaState.armyPermanentLevels[u.id] || 1;
    if (curLv <= 1) {
        if (sfxRef) sfxRef.play('cannon');
        return;
    }

    if (sfxRef) sfxRef.play('gas');
    const titleEl = document.getElementById('refund-unit-title');
    const curLvEl = document.getElementById('refund-current-lv');
    const inputEl = document.getElementById('refund-target-level-input');

    if (titleEl) titleEl.textContent = `${u.name.toUpperCase()} (HIỆN TẠI LV.${curLv})`;
    if (curLvEl) curLvEl.textContent = `LV.${curLv}`;
    if (inputEl) {
        inputEl.min = '1';
        inputEl.max = String(curLv - 1);
        inputEl.value = '1';
    }

    updateLevelRefundModalCalculation();
    document.getElementById('level-refund-modal')?.classList.add('active');
}

// ============================================================================
// 8. CHẾ ĐỘ MERGE: BÀN GHÉP THỦ CÔNG & CASCADE AUTO-MERGE SIÊU TỐC O(1)
// ============================================================================
export function renderMergeWorkbenchAndInventory() {
    syncRepresentativeInventoryFromStacks();

    const slot1El = document.getElementById('merge-slot-1');
    const slot2El = document.getElementById('merge-slot-2');
    const slotResEl = document.getElementById('merge-slot-result');
    const btnMergeExec = document.getElementById('btn-execute-merge');
    const hintEl = document.getElementById('merge-hint-text');
    const invGrid = document.getElementById('merge-inventory-grid');

    const card1 = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[0]) || null;
    const card2 = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[1]) || null;

    const renderMiniSlotCard = (slotEl, cardObj, placeholderText) => {
        if (!slotEl) return;
        if (!cardObj) {
            slotEl.className = 'merge-slot';
            slotEl.innerHTML = `<span class="merge-slot-placeholder">${placeholderText}</span>`;
            return;
        }
        const u = UNIT_BY_ID[normalizeUnitId(cardObj.unitId)];
        const rCfg = RARITY_CONFIG[cardObj.rarity] || RARITY_CONFIG.common;
        const spriteUrl = u ? getUnitSpriteDataURL(u, 7) : '';
        slotEl.className = `merge-slot ${rCfg.cssClass}`;
        slotEl.innerHTML = `
            <img src="${spriteUrl}" class="w-7 h-7 pixel-art" alt="${u?.name || ''}" />
            <span class="text-[7px] font-black text-white leading-none mt-0.5 text-center">${rCfg.name}</span>
        `;
    };

    renderMiniSlotCard(slot1El, card1, '+ THẺ 1');
    renderMiniSlotCard(slot2El, card2, '+ THẺ 2');

    if (
        card1 &&
        card2 &&
        normalizeUnitId(card1.unitId) === normalizeUnitId(card2.unitId) &&
        card1.rarity === card2.rarity
    ) {
        const nextRarityId = RARITY_CONFIG[card1.rarity]?.next;
        if (nextRarityId && RARITY_CONFIG[nextRarityId]) {
            const u = UNIT_BY_ID[normalizeUnitId(card1.unitId)];
            const nextRCfg = RARITY_CONFIG[nextRarityId];
            const spriteUrl = u ? getUnitSpriteDataURL(u, 7) : '';
            if (slotResEl) {
                slotResEl.className = `merge-slot result-slot ${nextRCfg.cssClass}`;
                slotResEl.innerHTML = `
                    <img src="${spriteUrl}" class="w-8 h-8 pixel-art" alt="${u?.name || ''}" />
                    <span class="text-[7px] font-black text-white leading-none mt-0.5 text-center">${nextRCfg.name}</span>
                `;
            }
            if (btnMergeExec) btnMergeExec.disabled = false;
            if (hintEl && u) {
                hintEl.innerHTML = `Sẵn sàng ghép 2 <b>${u.name} (${RARITY_CONFIG[card1.rarity].name})</b> ➔ <b class="text-amber-300">${nextRCfg.name} (${nextRCfg.mult}x)</b>!`;
            }
        }
    } else {
        if (slotResEl) {
            slotResEl.className = 'merge-slot result-slot';
            slotResEl.innerHTML = `<span class="merge-slot-placeholder">KẾT QUẢ</span>`;
        }
        if (btnMergeExec) btnMergeExec.disabled = true;
        if (card1) {
            const u = UNIT_BY_ID[normalizeUnitId(card1.unitId)];
            const rCfg = RARITY_CONFIG[card1.rarity];
            if (hintEl && u && rCfg) {
                hintEl.innerHTML = `Hãy chọn thêm 1 thẻ <b>${u.name} (${rCfg.name})</b> giống hệt để ghép!`;
            }
        } else if (hintEl) {
            hintEl.innerHTML = `Kho hiện có <b>${formatCompactNumber(getTotalCardsInInventory())} thẻ</b> • Bấm <b>⚡ AUTO MERGE</b> để ghép dây chuyền O(1)!`;
        }
    }

    if (!invGrid) return;
    invGrid.innerHTML = '';

    const repByKey = new Map();
    for (let i = 0; i < metaState.inventory.length; i++) {
        const c = metaState.inventory[i];
        const normId = normalizeUnitId(c.unitId);
        const key = `${normId}__${c.rarity}`;
        let list = repByKey.get(key);
        if (!list) {
            list = [];
            repByKey.set(key, list);
        }
        list.push(c);
    }

    const sortedGroups = [];
    for (const [key, rawCount] of Object.entries(metaState.inventoryStacks || {})) {
        const totalCount = Math.floor(Number(rawCount) || 0);
        if (totalCount <= 0) continue;
        const [rawUnitId, rarity] = key.split('__');
        const unitId = normalizeUnitId(rawUnitId);
        if (!UNIT_BY_ID[unitId] || !RARITY_CONFIG[rarity]) continue;
        sortedGroups.push({
            unitId,
            rarity,
            rank: RARITY_CONFIG[rarity]?.rank ?? 0,
            totalCount,
            sampleCards: repByKey.get(`${unitId}__${rarity}`) || []
        });
    }

    sortedGroups.sort((a, b) => {
        if (b.rank !== a.rank) return b.rank - a.rank;
        return a.unitId.localeCompare(b.unitId);
    });

    const fragment = document.createDocumentFragment();

    sortedGroups.forEach(grp => {
        const u = UNIT_BY_ID[grp.unitId];
        const rCfg = RARITY_CONFIG[grp.rarity] || RARITY_CONFIG.common;
        if (!u) return;

        const isMaxRarity = !rCfg.next;
        const permLv = metaState.armyPermanentLevels[u.id] || 1;
        const spriteUrl = getUnitSpriteDataURL(u, 7);

        grp.sampleCards.forEach((cardObj, idx) => {
            const isSelected = mergeSelectedCardUids.includes(cardObj.uid);
            let isDimmed = false;
            if (isMaxRarity) isDimmed = true;
            else if (card1 && !isSelected) {
                if (
                    normalizeUnitId(cardObj.unitId) !== normalizeUnitId(card1.unitId) ||
                    cardObj.rarity !== card1.rarity
                ) {
                    isDimmed = true;
                }
            }

            const showStackBadge = idx === 0 && grp.totalCount > 2;

            const cardEl = document.createElement('div');
            cardEl.className = `army-unit-card ${rCfg.cssClass}` +
                (isSelected ? ' selected-for-merge' : '') +
                (isDimmed ? ' dimmed-unmatch' : '');

            cardEl.innerHTML = `
                <div class="card-top-lv">
                    <span>LV.${permLv}</span>
                    ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : `<span class="text-[8px]">${rCfg.name}</span>`}
                </div>
                <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u.name}" />
                ${showStackBadge ? `<span class="card-qty-badge" title="Tổng cộng: ${grp.totalCount.toLocaleString('en-US')} thẻ">x${formatCompactNumber(grp.totalCount)}</span>` : ''}
                <div class="card-unit-title">${u.name}</div>
            `;

            cardEl.addEventListener('click', () => {
                showcaseUnitId = u.id;
                renderArmyShowcaseCanvas();

                if (isSelected) {
                    mergeSelectedCardUids = mergeSelectedCardUids.filter(id => id !== cardObj.uid);
                    if (sfxRef) sfxRef.play('gas');
                    renderMergeWorkbenchAndInventory();
                    return;
                }

                if (isMaxRarity) {
                    if (sfxRef) sfxRef.play('cannon');
                    return;
                }

                if (mergeSelectedCardUids.length === 0) {
                    mergeSelectedCardUids.push(cardObj.uid);
                    if (sfxRef) sfxRef.play('gas');
                } else if (mergeSelectedCardUids.length === 1) {
                    const firstCard = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[0]);
                    if (
                        firstCard &&
                        normalizeUnitId(firstCard.unitId) === normalizeUnitId(cardObj.unitId) &&
                        firstCard.rarity === cardObj.rarity
                    ) {
                        mergeSelectedCardUids.push(cardObj.uid);
                        if (sfxRef) sfxRef.play('spawn');
                    } else {
                        mergeSelectedCardUids = [cardObj.uid];
                        if (sfxRef) sfxRef.play('gas');
                    }
                } else {
                    mergeSelectedCardUids = [cardObj.uid];
                    if (sfxRef) sfxRef.play('gas');
                }
                renderMergeWorkbenchAndInventory();
            });

            fragment.appendChild(cardEl);
        });
    });

    invGrid.appendChild(fragment);
}

// ============================================================================
// 9. TAB 4: CHALLENGE (LỘ TRÌNH DỌC 45 MAP - ZOMBIE TOWER DEFENSE 20 WAVE)
// ============================================================================
export function renderChallengeRoadmapUI() {
    const listEl = document.getElementById('challenge-roadmap-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const ancientHeartLv = getSkillTreeNodeLevel('ancient_heart');
    const fragment = document.createDocumentFragment();

    LEVELS.forEach(cfg => {
        const lv = cfg.level;
        const unlocked = isChallengeMapUnlocked(lv);
        const cleared = isChallengeMapCleared(lv);
        const entryCost = calcChallengeEntryCostCoins(lv);
        const rewards = calcChallengeRewards(lv, ancientHeartLv);
        const bestW = Number(metaState.challengeBestWave?.[lv]) || 0;
        const canAfford = metaState.isAdminMode || metaState.coins >= entryCost;

        const node = document.createElement('div');
        node.className = `challenge-stage-node ${cleared ? 'cleared' : (unlocked ? 'unlocked' : 'locked')}`;
        node.innerHTML = `
            <div class="flex-1 text-left">
                <div class="flex items-center gap-1.5">
                    <span class="text-xs font-black text-white">${lv}. ${cfg.name}</span>
                    ${cleared ? '<span class="bg-emerald-500 text-slate-950 text-[8.5px] font-black px-1.5 py-0.5 rounded-full">✓ ĐÃ QUA</span>' : ''}
                    ${!unlocked ? '<span class="text-xs">🔒</span>' : ''}
                </div>
                <div class="text-[9.5px] font-bold text-slate-300 mt-0.5">
                    Kỷ lục: <b class="text-rose-300">Wave ${cleared ? 20 : bestW} / 20</b> • 3 Boss (W.7, W.14, W.20)
                </div>
                <div class="text-[9.5px] font-extrabold text-amber-300 mt-0.5 vt323-num">
                    Thưởng 20W: ⚪ +${rewards.pearls} Ngọc Trai • 💎 +${rewards.gems} • 🪙 +${rewards.coins.toLocaleString('en-US')}
                </div>
            </div>
            <button type="button" class="btn-3d ${cleared ? 'btn-3d-green' : (unlocked ? 'btn-3d-rose' : 'btn-3d-slate')} px-2.5 py-2 text-[10px] flex flex-col items-center flex-shrink-0" ${!unlocked ? 'disabled' : ''}>
                <span>${unlocked ? '☠️ CHIẾN' : '🔒 KHÓA'}</span>
                <span class="vt323-num text-xs text-amber-200">${metaState.isAdminMode ? '🪙 0' : `🪙 ${entryCost.toLocaleString('en-US')}`}</span>
            </button>
        `;

        const playBtn = node.querySelector('button');
        if (playBtn && unlocked) {
            playBtn.addEventListener('click', () => {
                if (!canAfford) {
                    if (sfxRef) sfxRef.play('cannon');
                    alert(`Bạn cần ${entryCost.toLocaleString('en-US')} 🪙 Vàng để vào ải Challenge Map ${lv}!`);
                    return;
                }
                if (!metaState.isAdminMode) {
                    metaState.coins -= entryCost;
                    saveProgress();
                    updateTopBarUI();
                }
                if (sfxRef) sfxRef.play('spawn');
                syncLegacyEngineBridges();
                document.getElementById('lobby-wrapper')?.classList.remove('active');
                if (onStartBattleCallback) {
                    onStartBattleCallback(lv, 'difficult', 'challenge', 'challenge');
                }
            });
        }

        fragment.appendChild(node);
    });

    listEl.appendChild(fragment);
}

// ============================================================================
// 10. TAB 5: SKILL TREE (CÂY KỸ NĂNG CỔ THỤ - DÙNG ⚪ NGỌC TRAI TRẮNG)
// ============================================================================
export function renderSkillTreeTabUI() {
    const balanceEl = document.getElementById('skilltree-pearls-balance');
    if (balanceEl) {
        balanceEl.textContent = `⚪ ${formatCurrency(metaState.pearls || 0)}`;
    }

    // Vẽ các nhánh nối SVG phát sáng từ Rễ -> Thân -> Cành -> Ngọn
    const svgEl = document.getElementById('skilltree-branches-svg');
    if (svgEl) {
        const connections = [
            // Rễ gốc dưới đáy
            { x1: 190, y1: 425, x2: 100, y2: 380, active: true },
            { x1: 190, y1: 425, x2: 280, y2: 380, active: true },
            // Rễ -> Thân
            { x1: 100, y1: 380, x2: 100, y2: 275, active: getSkillTreeNodeLevel('vital_roots') > 0 },
            { x1: 280, y1: 380, x2: 280, y2: 275, active: getSkillTreeNodeLevel('supply_roots') > 0 },
            // Thân -> Cành
            { x1: 100, y1: 275, x2: 100, y2: 165, active: getSkillTreeNodeLevel('iron_trunk') > 0 },
            { x1: 280, y1: 275, x2: 280, y2: 165, active: getSkillTreeNodeLevel('arcane_trunk') > 0 },
            // Cành -> Ngọn Cây Tối Thượng
            { x1: 100, y1: 165, x2: 190, y2: 58, active: getSkillTreeNodeLevel('undead_slayer') > 0 },
            { x1: 280, y1: 165, x2: 190, y2: 58, active: getSkillTreeNodeLevel('elite_lineage') > 0 }
        ];

        svgEl.innerHTML = connections.map(c => {
            const stroke = c.active ? '#4ade80' : '#334155';
            const width = c.active ? '5' : '3.5';
            const dash = c.active ? '' : 'stroke-dasharray="6,6"';
            return `<line x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" ${dash} />`;
        }).join('');
    }

    // Cập nhật trạng thái 7 nút trên cây
    Object.values(ANCIENT_SKILL_TREE).forEach(node => {
        const curLv = getSkillTreeNodeLevel(node.id);
        const unlocked = isSkillTreeNodeUnlocked(node.id);
        const btnEl = document.getElementById(`st-node-${node.id}`);
        const lvEl = document.getElementById(`st-lv-${node.id}`);

        if (btnEl) {
            btnEl.classList.toggle('unlocked', unlocked);
            btnEl.classList.toggle('leveled', curLv > 0);
            btnEl.classList.toggle('locked', !unlocked);
            btnEl.classList.toggle('selected-node', selectedSkillTreeNodeId === node.id);
        }
        if (lvEl) {
            lvEl.textContent = `LV.${curLv}/${node.maxLevel}`;
        }
    });

    // Cập nhật khung Inspector bên dưới
    const selNode = ANCIENT_SKILL_TREE[selectedSkillTreeNodeId] || ANCIENT_SKILL_TREE.vital_roots;
    const curLv = getSkillTreeNodeLevel(selNode.id);
    const isMax = curLv >= selNode.maxLevel;
    const unlocked = isSkillTreeNodeUnlocked(selNode.id);
    const cost = getSkillTreeNodeCost(selNode.id, curLv);
    const canUpg = canUpgradeSkillTreeNode(selNode.id);

    const titleEl = document.getElementById('st-inspector-title');
    if (titleEl) {
        titleEl.textContent = `${selNode.icon} ${selNode.name} (LV.${curLv}/${selNode.maxLevel})`;
    }

    const descEl = document.getElementById('st-inspector-desc');
    if (descEl) {
        descEl.textContent = `${selNode.desc} (${selNode.getEffectText(curLv)})`;
    }

    const reqEl = document.getElementById('st-inspector-req');
    if (reqEl) {
        if (isMax) {
            reqEl.textContent = '✨ Đã đạt cấp độ tối đa của nhánh này!';
        } else if (!unlocked) {
            const reqNames = selNode.requires.map(rId => ANCIENT_SKILL_TREE[rId]?.name || rId).join(' & ');
            reqEl.textContent = `🔒 Yêu cầu nâng tối thiểu Lv.1: ${reqNames}`;
        } else {
            reqEl.textContent = `✅ Đủ điều kiện nâng cấp (Tầng ${selNode.tier}: ${selNode.tierName})`;
        }
    }

    const costEl = document.getElementById('st-upgrade-cost-val');
    if (costEl) {
        costEl.textContent = isMax ? 'MAX' : (metaState.isAdminMode ? '⚪ 0' : `⚪ ${cost}`);
    }

    const upgBtn = document.getElementById('btn-upgrade-skilltree-node');
    if (upgBtn) {
        upgBtn.disabled = !canUpg;
    }
}

// ============================================================================
// 11. VÒNG QUAY MAY MẮN 8 Ô (#lucky-wheel-modal), SKIP SPIN & LỊCH SỬ JACKPOT
// ============================================================================
let wheelCurrentRotationRad = 0;
let wheelIsSpinning = false;

export function drawLuckyWheelCanvas(rotationRad = wheelCurrentRotationRad) {
    const canvas = document.getElementById('luckyWheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(cx, cy) - 8;

    ctx.clearRect(0, 0, W, H);
    const slices = LUCKY_WHEEL_CONFIG.slices;
    const numSlices = slices.length;
    const arcStep = (Math.PI * 2) / numSlices;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRad);

    slices.forEach((slice, idx) => {
        const startA = idx * arcStep;
        const endA = startA + arcStep;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startA, endA);
        ctx.closePath();
        ctx.fillStyle = slice.bgColor;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        ctx.save();
        ctx.rotate(startA + arcStep / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = slice.textColor || '#ffffff';
        ctx.font = '900 11px "Chakra Petch", sans-serif';
        ctx.fillText(slice.label, radius - 14, 4);
        ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    for (let i = 0; i < numSlices * 2; i++) {
        const a = (i * Math.PI) / numSlices;
        const px = Math.cos(a) * (radius - 2);
        const py = Math.sin(a) * (radius - 2);
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#ef4444';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

export function updateLuckyWheelPityUI() {
    const pity = Math.max(0, Math.min(100, Number(metaState.wheelPity) || 0));
    const countEl = document.getElementById('lucky-pity-count');
    const fillEl = document.getElementById('lucky-pity-bar-fill');
    if (countEl) countEl.textContent = `${pity} / ${LUCKY_WHEEL_CONFIG.pityMax}`;
    if (fillEl) fillEl.style.width = `${Math.min(100, Math.round((pity / LUCKY_WHEEL_CONFIG.pityMax) * 100))}%`;

    const skipChk = document.getElementById('chk-skip-wheel-anim');
    if (skipChk) skipChk.checked = !!metaState.wheelSkipAnim;

    renderLuckyWheelJackpotHistoryUI();
}

export function renderLuckyWheelJackpotHistoryUI() {
    const totalEl = document.getElementById('wheel-jackpot-total-count');
    const histEl = document.getElementById('lucky-wheel-jackpot-history');
    if (totalEl) {
        totalEl.textContent = `${(metaState.wheelJackpotTotal || 0).toLocaleString('en-US')} lần`;
    }
    if (!histEl) return;

    const list = Array.isArray(metaState.wheelJackpotHistory) ? metaState.wheelJackpotHistory : [];
    if (list.length === 0) {
        histEl.innerHTML = `<div class="italic text-slate-400">Chưa có lịch sử nổ Jackpot. Hãy thử vận may ngay!</div>`;
        return;
    }

    histEl.innerHTML = list
        .slice(0, 8)
        .map(item => `<div>💠 <b>${item.unitName}</b> — <span class="text-fuchsia-300 font-black">${item.rarityName}</span> <span class="text-slate-400">(${item.timeStr})</span></div>`)
        .join('');
}

function rollSingleWheelSlice(forceJackpot = false) {
    const slices = LUCKY_WHEEL_CONFIG.slices;
    if (forceJackpot) {
        return slices[slices.length - 1];
    }
    const rand = Math.random() * 100;
    let acc = 0;
    for (let i = 0; i < slices.length; i++) {
        acc += slices[i].weight;
        if (rand <= acc) return slices[i];
    }
    return slices[0];
}

export function executeLuckyWheelSpins(rawSpinCount = 1) {
    if (wheelIsSpinning) return;
    const spins = Math.max(1, Math.min(100000, Math.floor(Number(rawSpinCount) || 1)));
    const blocksOf10 = Math.floor(spins / 10);
    const remSpins = spins % 10;
    const totalGemCost = metaState.isAdminMode
        ? 0
        : (blocksOf10 * LUCKY_WHEEL_CONFIG.tenPrice + remSpins * LUCKY_WHEEL_CONFIG.singlePrice);

    const bannerEl = document.getElementById('lucky-wheel-result-banner');
    if (!metaState.isAdminMode && metaState.gems < totalGemCost) {
        if (sfxRef) sfxRef.play('cannon');
        if (bannerEl) {
            bannerEl.classList.remove('jackpot-hit');
            bannerEl.innerHTML = `⚠️ Không đủ Gems! Cần <b>💎 ${totalGemCost.toLocaleString('en-US')}</b> để quay ${spins.toLocaleString('en-US')} lượt.`;
        }
        return;
    }

    if (!metaState.isAdminMode) {
        metaState.gems -= totalGemCost;
    }

    const t0 = performance.now();
    let gainedCoins = 0;
    let gainedGems = 0;
    let gainedMedals = 0;
    const gainedCardsSummary = {};
    let lastSlice = LUCKY_WHEEL_CONFIG.slices[0];
    let hitJackpotCount = 0;
    const nowTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    for (let i = 0; i < spins; i++) {
        metaState.wheelPity = (Number(metaState.wheelPity) || 0) + 1;
        const isGuaranteedPity = metaState.wheelPity >= LUCKY_WHEEL_CONFIG.pityMax;
        const slice = rollSingleWheelSlice(isGuaranteedPity);
        lastSlice = slice;

        if (slice.type === 'coins') {
            gainedCoins += slice.amount;
        } else if (slice.type === 'gems') {
            gainedGems += slice.amount;
        } else if (slice.type === 'medals') {
            gainedMedals += slice.amount;
        } else if (slice.type === 'card') {
            const randUnit = UNIT_CATALOG[(Math.random() * UNIT_CATALOG.length) | 0];
            addCardToStacks(randUnit.id, slice.rarity, 1);
            const rName = RARITY_CONFIG[slice.rarity]?.name || slice.rarity;
            const k = `${randUnit.name} (${rName})`;
            gainedCardsSummary[k] = (gainedCardsSummary[k] || 0) + 1;
        } else if (slice.type === 'jackpot_card') {
            metaState.wheelPity = 0;
            hitJackpotCount++;
            metaState.wheelJackpotTotal = (Number(metaState.wheelJackpotTotal) || 0) + 1;

            const jackpotRarities = slice.rarities || ['master', 'demon'];
            const pickedRarity = jackpotRarities[(Math.random() * jackpotRarities.length) | 0];
            const randUnit = UNIT_CATALOG[(Math.random() * UNIT_CATALOG.length) | 0];
            addCardToStacks(randUnit.id, pickedRarity, 1);

            const rName = RARITY_CONFIG[pickedRarity]?.name || pickedRarity;
            const k = `💠 ${randUnit.name} [${rName}]`;
            gainedCardsSummary[k] = (gainedCardsSummary[k] || 0) + 1;

            if (!Array.isArray(metaState.wheelJackpotHistory)) {
                metaState.wheelJackpotHistory = [];
            }
            metaState.wheelJackpotHistory.unshift({
                unitName: randUnit.name,
                rarityName: rName,
                timeStr: nowTimeStr
            });
            if (metaState.wheelJackpotHistory.length > 15) {
                metaState.wheelJackpotHistory.length = 15;
            }
        }
    }

    metaState.coins += gainedCoins;
    metaState.gems += gainedGems;
    metaState.medals = (metaState.medals || 0) + gainedMedals;
    saveProgress();
    updateTopBarUI();
    updateLuckyWheelPityUI();

    const numSlices = LUCKY_WHEEL_CONFIG.slices.length;
    const arcStep = (Math.PI * 2) / numSlices;
    const sliceCenterAngle = lastSlice.index * arcStep + arcStep / 2;
    const targetPointerAngle = -Math.PI / 2;
    const extraSpinsRad = (spins === 1 ? 6 : 8) * Math.PI * 2;
    const startRot = wheelCurrentRotationRad % (Math.PI * 2);
    let targetRot = startRot + extraSpinsRad + (targetPointerAngle - sliceCenterAngle - startRot);
    while (targetRot <= startRot + Math.PI * 6) {
        targetRot += Math.PI * 2;
    }

    const showResultBannerText = (elapsedMs = null) => {
        if (!bannerEl) return;
        bannerEl.classList.toggle('jackpot-hit', hitJackpotCount > 0);
        const speedTag = elapsedMs !== null ? ` <span class="text-sky-300">(${elapsedMs}ms)</span>` : '';
        if (spins === 1) {
            const cardKeys = Object.keys(gainedCardsSummary);
            const extraCardTxt = cardKeys.length > 0 ? ` ➔ <b>${cardKeys[0]}</b>` : '';
            bannerEl.innerHTML = `🎉 Trúng: <b>${lastSlice.fullName}</b>${extraCardTxt}!${speedTag}`;
        } else {
            const parts = [];
            if (gainedCoins > 0) parts.push(`+🪙 ${gainedCoins.toLocaleString('en-US')}`);
            if (gainedGems > 0) parts.push(`+💎 ${gainedGems.toLocaleString('en-US')}`);
            if (gainedMedals > 0) parts.push(`+🎖️ ${gainedMedals.toLocaleString('en-US')}`);
            const cardList = Object.entries(gainedCardsSummary).map(([k, v]) => `${k} x${v}`);
            if (cardList.length > 0) parts.push(`🃏 ${cardList.slice(0, 4).join(', ')}${cardList.length > 4 ? '...' : ''}`);
            bannerEl.innerHTML = `🎉 Kết quả ${spins.toLocaleString('en-US')} lượt${speedTag}: ${parts.join(' • ')}`;
        }
    };

    const skipChk = document.getElementById('chk-skip-wheel-anim');
    const shouldSkipAnim = !!(skipChk?.checked || metaState.wheelSkipAnim);

    if (shouldSkipAnim) {
        wheelCurrentRotationRad = targetRot % (Math.PI * 2);
        drawLuckyWheelCanvas(wheelCurrentRotationRad);
        if (sfxRef) sfxRef.play('upgrade');
        triggerHaptic(25);
        const elapsedMs = Math.max(0.01, +(performance.now() - t0).toFixed(2));
        showResultBannerText(elapsedMs);
        if (currentLobbyTab === 'army') renderArmyTabUI();
        return;
    }

    const canvasEl = document.getElementById('luckyWheelCanvas');
    canvasEl?.classList.add('spinning');
    wheelIsSpinning = true;
    if (sfxRef) sfxRef.play('blitz');

    const animDurationMs = spins > 25 ? 1100 : 2100;
    const animStartTs = performance.now();

    function animateWheel(now) {
        const elapsed = now - animStartTs;
        const t = Math.min(1, elapsed / animDurationMs);
        const easeOut = 1 - Math.pow(1 - t, 3);
        wheelCurrentRotationRad = startRot + (targetRot - startRot) * easeOut;
        drawLuckyWheelCanvas(wheelCurrentRotationRad);

        if (t < 1) {
            requestAnimationFrame(animateWheel);
        } else {
            wheelIsSpinning = false;
            canvasEl?.classList.remove('spinning');
            if (sfxRef) sfxRef.play('upgrade');
            triggerHaptic(35);
            showResultBannerText(null);
            if (currentLobbyTab === 'army') renderArmyTabUI();
        }
    }

    requestAnimationFrame(animateWheel);
}

// ============================================================================
// 12. TRUNG TÂM 3 MINI-GAME GIẢI TRÍ (#minigame-arcade-modal)
// ============================================================================
let currentMinigameTab = 'mines';

const minesGameState = {
    active: false,
    board: [],
    safeOpened: 0,
    potCoins: 0,
    potGems: 0,
    potMedals: 0
};

const catcherGameState = {
    running: false,
    timeLeft: 30.0,
    playerX: 160,
    moveLeft: false,
    moveRight: false,
    spawnTimer: 0,
    items: [],
    floatingTexts: [],
    scoreCoins: 0,
    scoreGems: 0,
    scoreMedals: 0,
    rafId: null,
    lastFrameTs: 0
};

const highLowGameState = {
    active: false,
    streak: 0,
    potCoins: 0,
    potGems: 0,
    curRarityId: 'common',
    curUnitId: PRIMARY_INFANTRY_ID
};

export function switchMinigameTab(tabId) {
    currentMinigameTab = tabId;
    if (sfxRef) sfxRef.play('gas');

    document.querySelectorAll('.arcade-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mg-tab') === tabId);
    });
    ['mines', 'catcher', 'highlow'].forEach(key => {
        document.getElementById(`mg-pane-${key}`)?.classList.toggle('active', key === tabId);
    });

    if (tabId === 'mines') renderMinesMinigameBoard();
    else if (tabId === 'catcher') drawCatcherIdleCanvas();
    else if (tabId === 'highlow') renderHighLowMinigameUI();
}

export function startMinesMinigame() {
    const cfg = MINIGAME_CONFIG.mines;
    if (!metaState.isAdminMode && metaState.coins < cfg.entryCostCoins) {
        if (sfxRef) sfxRef.play('cannon');
        const stEl = document.getElementById('mg-mines-status-text');
        if (stEl) stEl.innerHTML = `<span class="text-rose-600">⚠️ Bạn cần 🪙 ${cfg.entryCostCoins.toLocaleString('en-US')} Vàng để bắt đầu dò mìn!</span>`;
        return;
    }

    if (!metaState.isAdminMode) {
        metaState.coins -= cfg.entryCostCoins;
        saveProgress();
        updateTopBarUI();
    }

    const cells = Array.from({ length: cfg.gridSize }, (_, idx) => ({
        isMine: idx < cfg.mineCells,
        revealed: false,
        icon: '❓'
    }));
    for (let i = cells.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = cells[i];
        cells[i] = cells[j];
        cells[j] = tmp;
    }

    minesGameState.active = true;
    minesGameState.board = cells;
    minesGameState.safeOpened = 0;
    minesGameState.potCoins = cfg.entryCostCoins;
    minesGameState.potGems = 15;
    minesGameState.potMedals = 0;

    if (sfxRef) sfxRef.play('spawn');
    const stEl = document.getElementById('mg-mines-status-text');
    if (stEl) stEl.innerHTML = `🎯 Hãy chạm vào các ô trên lưới 5x5 để tìm Kho báu! Tránh <b>5 quả Mìn</b>!`;
    renderMinesMinigameBoard();
}

export function renderMinesMinigameBoard() {
    const gridEl = document.getElementById('mg-mines-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const cfg = MINIGAME_CONFIG.mines;
    const curMult = minesGameState.safeOpened > 0
        ? (cfg.multipliers[Math.min(minesGameState.safeOpened - 1, cfg.multipliers.length - 1)] || 1.0)
        : 1.0;

    const multBadge = document.getElementById('mg-mines-mult-badge');
    if (multBadge) multBadge.textContent = `x${curMult.toFixed(2)}`;

    const safeCountEl = document.getElementById('mg-mines-safe-count');
    if (safeCountEl) safeCountEl.textContent = `${minesGameState.safeOpened}/${cfg.safeCells}`;

    const potEl = document.getElementById('mg-mines-current-pot');
    if (potEl) {
        const medalStr = minesGameState.potMedals > 0 ? ` | 🎖️ ${minesGameState.potMedals}` : '';
        potEl.textContent = `🪙 ${minesGameState.potCoins.toLocaleString('en-US')} | 💎 ${minesGameState.potGems}${medalStr}`;
    }

    const cashoutBtn = document.getElementById('btn-mg-mines-cashout');
    if (cashoutBtn) {
        cashoutBtn.disabled = !minesGameState.active || minesGameState.safeOpened <= 0;
    }

    if (minesGameState.board.length === 0) {
        for (let i = 0; i < cfg.gridSize; i++) {
            minesGameState.board.push({ isMine: false, revealed: false, icon: 'radar' });
        }
    }

    minesGameState.board.forEach(cell => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mg-mine-cell' +
            (cell.revealed ? (cell.isMine ? ' revealed mine' : ' revealed safe') : '');
        btn.textContent = cell.revealed ? (cell.isMine ? '💣' : cell.icon) : '📡';

        btn.addEventListener('click', () => {
            if (!minesGameState.active || cell.revealed) return;
            cell.revealed = true;

            if (cell.isMine) {
                minesGameState.active = false;
                minesGameState.potCoins = 0;
                minesGameState.potGems = 0;
                minesGameState.potMedals = 0;
                minesGameState.board.forEach(c => {
                    if (c.isMine) c.revealed = true;
                });
                triggerHaptic(50);
                if (sfxRef) sfxRef.play('boom');
                const stEl = document.getElementById('mg-mines-status-text');
                if (stEl) stEl.innerHTML = `<span class="text-rose-600 font-black">💥 BÙM! Bạn đã đạp trúng Mìn Chống Tăng và mất quỹ thưởng ván này!</span>`;
                renderMinesMinigameBoard();
            } else {
                minesGameState.safeOpened++;
                const m = cfg.multipliers[Math.min(minesGameState.safeOpened - 1, cfg.multipliers.length - 1)] || 1.2;
                const addCoins = Math.round(cfg.baseCoinsPerSafe * m);
                const addGems = Math.round(cfg.baseGemsPerSafe * m);
                minesGameState.potCoins += addCoins;
                minesGameState.potGems += addGems;

                if (Math.random() < cfg.medalChancePerSafe) {
                    minesGameState.potMedals += 2;
                    cell.icon = '🎖️';
                } else {
                    cell.icon = minesGameState.safeOpened % 2 === 0 ? '💎' : '🪙';
                }

                triggerHaptic(15);
                if (sfxRef) sfxRef.play('upgrade');
                const stEl = document.getElementById('mg-mines-status-text');
                if (stEl) {
                    stEl.innerHTML = `✨ An toàn! Hệ số tăng lên <b class="text-emerald-600">x${m.toFixed(2)}</b>! Có thể bấm <b>RÚT THƯỞNG NGAY</b>!`;
                }

                if (minesGameState.safeOpened >= cfg.safeCells) {
                    cashoutMinesMinigame();
                    return;
                }
                renderMinesMinigameBoard();
            }
        });

        gridEl.appendChild(btn);
    });
}

export function cashoutMinesMinigame() {
    if (!minesGameState.active || minesGameState.safeOpened <= 0) return;
    minesGameState.active = false;

    const c = minesGameState.potCoins;
    const g = minesGameState.potGems;
    const m = minesGameState.potMedals;

    metaState.coins += c;
    metaState.gems += g;
    metaState.medals = (metaState.medals || 0) + m;

    let bonusCardMsg = '';
    if (minesGameState.safeOpened >= 8) {
        const bonusRarity = minesGameState.safeOpened >= 14 ? 'mythic' : 'legendary';
        const randUnit = UNIT_CATALOG[(Math.random() * UNIT_CATALOG.length) | 0];
        addCardToStacks(randUnit.id, bonusRarity, 1);
        bonusCardMsg = ` + 1 Thẻ <b>${randUnit.name} (${RARITY_CONFIG[bonusRarity].name})</b>`;
    }

    minesGameState.board.forEach(cell => {
        if (cell.isMine) cell.revealed = true;
    });

    saveProgress();
    updateTopBarUI();
    if (sfxRef) sfxRef.play('upgrade');

    const stEl = document.getElementById('mg-mines-status-text');
    if (stEl) {
        const mTxt = m > 0 ? `, +🎖️ ${m}` : '';
        stEl.innerHTML = `<span class="text-emerald-600 font-black">🎉 RÚT THƯỞNG THÀNH CÔNG: +🪙 ${c.toLocaleString('en-US')}, +💎 ${g.toLocaleString('en-US')}${mTxt}${bonusCardMsg}!</span>`;
    }
    renderMinesMinigameBoard();
}

export function drawCatcherIdleCanvas() {
    const canvas = document.getElementById('mgCatcherCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, W, H * 0.72);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, H * 0.72, W, H * 0.28);

    ctx.fillStyle = '#1e3a8a';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(catcherGameState.playerX - 24, H - 38, 48, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = '900 12px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BẤM "BẮT ĐẦU HỨNG TIẾP TẾ" ĐỂ CHƠI!', W / 2, H / 2 - 10);
}

export function stopCatcherMinigame(awardLoot = true) {
    if (catcherGameState.rafId) {
        cancelAnimationFrame(catcherGameState.rafId);
        catcherGameState.rafId = null;
    }
    if (!catcherGameState.running) return;
    catcherGameState.running = false;

    if (awardLoot) {
        const c = Math.max(0, catcherGameState.scoreCoins);
        const g = Math.max(0, catcherGameState.scoreGems);
        const m = Math.max(0, catcherGameState.scoreMedals);
        metaState.coins += c;
        metaState.gems += g;
        metaState.medals = (metaState.medals || 0) + m;
        saveProgress();
        updateTopBarUI();
        if (sfxRef) sfxRef.play('upgrade');
    }
}

export function startCatcherMinigame() {
    stopCatcherMinigame(false);
    const cfg = MINIGAME_CONFIG.catcher;

    catcherGameState.running = true;
    catcherGameState.timeLeft = cfg.durationSec;
    catcherGameState.playerX = cfg.canvasWidth / 2;
    catcherGameState.items = [];
    catcherGameState.floatingTexts = [];
    catcherGameState.scoreCoins = 0;
    catcherGameState.scoreGems = 0;
    catcherGameState.scoreMedals = 0;
    catcherGameState.spawnTimer = 0.1;
    catcherGameState.lastFrameTs = performance.now();

    if (sfxRef) sfxRef.play('spawn');

    function catcherLoop(now) {
        if (!catcherGameState.running) return;
        const dt = Math.min(0.05, Math.max(0.001, (now - catcherGameState.lastFrameTs) / 1000));
        catcherGameState.lastFrameTs = now;

        catcherGameState.timeLeft = Math.max(0, catcherGameState.timeLeft - dt);

        if (catcherGameState.moveLeft) {
            catcherGameState.playerX -= cfg.playerSpeed * dt;
        }
        if (catcherGameState.moveRight) {
            catcherGameState.playerX += cfg.playerSpeed * dt;
        }
        catcherGameState.playerX = Math.max(28, Math.min(cfg.canvasWidth - 28, catcherGameState.playerX));

        catcherGameState.spawnTimer -= dt;
        if (catcherGameState.spawnTimer <= 0) {
            catcherGameState.spawnTimer = cfg.spawnIntervalSec;
            const rand = Math.random() * 100;
            let acc = 0;
            let spec = cfg.items[0];
            for (const it of cfg.items) {
                acc += it.weight;
                if (rand <= acc) {
                    spec = it;
                    break;
                }
            }
            catcherGameState.items.push({
                ...spec,
                x: 24 + Math.random() * (cfg.canvasWidth - 48),
                y: -16
            });
        }

        const playerY = cfg.canvasHeight - 28;
        for (let i = catcherGameState.items.length - 1; i >= 0; i--) {
            const it = catcherGameState.items[i];
            it.y += it.speed * dt;

            if (Math.abs(it.x - catcherGameState.playerX) <= 28 && Math.abs(it.y - playerY) <= 20) {
                catcherGameState.scoreCoins = Math.max(0, catcherGameState.scoreCoins + it.coins);
                catcherGameState.scoreGems = Math.max(0, catcherGameState.scoreGems + it.gems);
                catcherGameState.scoreMedals = Math.max(0, catcherGameState.scoreMedals + it.medals);

                if (it.type === 'bomb') {
                    if (sfxRef) sfxRef.play('boom');
                    triggerHaptic(35);
                    catcherGameState.floatingTexts.push({ x: it.x, y: it.y, text: '💥 TRÚNG BOM!', color: '#ef4444', alpha: 1.0 });
                } else {
                    if (sfxRef) sfxRef.play('gas');
                    const txt = it.coins > 0 ? `+${it.coins}🪙` : (it.gems > 0 ? `+${it.gems}💎` : `+${it.medals}🎖️`);
                    catcherGameState.floatingTexts.push({ x: it.x, y: it.y, text: txt, color: it.color, alpha: 1.0 });
                }
                catcherGameState.items.splice(i, 1);
                continue;
            }

            if (it.y > cfg.canvasHeight + 20) {
                catcherGameState.items.splice(i, 1);
            }
        }

        for (let i = catcherGameState.floatingTexts.length - 1; i >= 0; i--) {
            const ft = catcherGameState.floatingTexts[i];
            ft.y -= 32 * dt;
            ft.alpha -= dt * 1.4;
            if (ft.alpha <= 0) catcherGameState.floatingTexts.splice(i, 1);
        }

        const timeEl = document.getElementById('mg-catcher-time');
        if (timeEl) timeEl.textContent = `${catcherGameState.timeLeft.toFixed(1)}s`;
        const scoreEl = document.getElementById('mg-catcher-score');
        if (scoreEl) {
            scoreEl.textContent = `🪙 ${catcherGameState.scoreCoins.toLocaleString('en-US')} | 💎 ${catcherGameState.scoreGems} | 🎖️ ${catcherGameState.scoreMedals}`;
        }

        const canvas = document.getElementById('mgCatcherCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const W = canvas.width;
            const H = canvas.height;
            ctx.clearRect(0, 0, W, H);

            for (const it of catcherGameState.items) {
                ctx.save();
                if (it.type !== 'bomb') {
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(it.x - 9, it.y - 12);
                    ctx.lineTo(it.x, it.y);
                    ctx.moveTo(it.x + 9, it.y - 12);
                    ctx.lineTo(it.x, it.y);
                    ctx.stroke();

                    ctx.fillStyle = '#f8fafc';
                    ctx.beginPath();
                    ctx.arc(it.x, it.y - 12, 10, Math.PI, 0);
                    ctx.fill();
                }
                ctx.font = '18px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(it.icon, it.x, it.y);
                ctx.restore();
            }

            if (atlasRef && atlasRef.ready) {
                atlasRef.draw(ctx, 5, 7, catcherGameState.playerX, playerY, 44, 44);
            } else {
                ctx.fillStyle = '#0284c7';
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2;
                ctx.fillRect(catcherGameState.playerX - 22, playerY - 12, 44, 22);
            }

            for (const ft of catcherGameState.floatingTexts) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, ft.alpha);
                ctx.font = '900 12px "Chakra Petch", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = ft.color;
                ctx.fillText(ft.text, ft.x, ft.y);
                ctx.restore();
            }
        }

        if (catcherGameState.timeLeft <= 0) {
            stopCatcherMinigame(true);
            const canvas = document.getElementById('mgCatcherCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#4ade80';
                ctx.font = '900 13px "Chakra Petch", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(
                    `HOÀN THÀNH! +🪙${catcherGameState.scoreCoins} +💎${catcherGameState.scoreGems} +🎖️${catcherGameState.scoreMedals}`,
                    canvas.width / 2,
                    canvas.height / 2
                );
            }
            return;
        }

        catcherGameState.rafId = requestAnimationFrame(catcherLoop);
    }

    catcherGameState.rafId = requestAnimationFrame(catcherLoop);
}

export function startHighLowMinigame() {
    const cfg = MINIGAME_CONFIG.highlow;
    if (!metaState.isAdminMode && metaState.coins < cfg.entryCostCoins) {
        if (sfxRef) sfxRef.play('cannon');
        const stEl = document.getElementById('mg-hl-status-text');
        if (stEl) stEl.innerHTML = `<span class="text-rose-600">⚠️ Bạn cần 🪙 ${cfg.entryCostCoins.toLocaleString('en-US')} Vàng để mở ván bài!</span>`;
        return;
    }

    if (!metaState.isAdminMode) {
        metaState.coins -= cfg.entryCostCoins;
        saveProgress();
        updateTopBarUI();
    }

    const startRank = 8 + ((Math.random() * 25) | 0);
    highLowGameState.active = true;
    highLowGameState.streak = 0;
    highLowGameState.potCoins = cfg.initialPotCoins;
    highLowGameState.potGems = cfg.initialPotGems;
    highLowGameState.curRarityId = RARITY_ORDER[startRank] || 'legendary2';
    highLowGameState.curUnitId = UNIT_CATALOG[(Math.random() * UNIT_CATALOG.length) | 0].id;

    if (sfxRef) sfxRef.play('spawn');
    const stEl = document.getElementById('mg-hl-status-text');
    if (stEl) stEl.innerHTML = `🃏 Hãy dự đoán thẻ tiếp theo có <b>Rank Cao hơn (HIGHER)</b> hay <b>Thấp hơn (LOWER)</b>!`;

    const nextBox = document.getElementById('mg-hl-next-card');
    if (nextBox) {
        nextBox.className = 'mg-hl-card-box mystery-card';
        document.getElementById('mg-hl-next-rarity').textContent = '???';
        document.getElementById('mg-hl-next-rank').textContent = 'RANK ?';
        document.getElementById('mg-hl-next-unit').textContent = 'ĐANG ÚP';
    }

    renderHighLowMinigameUI();
}

export function renderHighLowMinigameUI() {
    const rCfg = RARITY_CONFIG[highLowGameState.curRarityId] || RARITY_CONFIG.common;
    const u = UNIT_BY_ID[highLowGameState.curUnitId] || UNIT_CATALOG[0];

    const curBox = document.getElementById('mg-hl-current-card');
    if (curBox) curBox.className = `mg-hl-card-box ${rCfg.cssClass}`;

    const curRarityEl = document.getElementById('mg-hl-cur-rarity');
    if (curRarityEl) {
        curRarityEl.className = `rarity-badge ${rCfg.cssClass} mt-1`;
        curRarityEl.textContent = rCfg.name.toUpperCase();
    }

    const curRankEl = document.getElementById('mg-hl-cur-rank');
    if (curRankEl) curRankEl.textContent = `RANK ${rCfg.rank} (${rCfg.mult}x)`;

    const curUnitEl = document.getElementById('mg-hl-cur-unit');
    if (curUnitEl) curUnitEl.textContent = u.name.toUpperCase();

    const streakEl = document.getElementById('mg-hl-streak');
    if (streakEl) streakEl.textContent = String(highLowGameState.streak);

    const potEl = document.getElementById('mg-hl-pot');
    if (potEl) {
        potEl.textContent = `🪙 ${highLowGameState.potCoins.toLocaleString('en-US')} | 💎 ${highLowGameState.potGems.toLocaleString('en-US')}`;
    }

    const btnHigher = document.getElementById('btn-mg-hl-higher');
    const btnLower = document.getElementById('btn-mg-hl-lower');
    const btnCashout = document.getElementById('btn-mg-hl-cashout');

    if (btnHigher) btnHigher.disabled = !highLowGameState.active;
    if (btnLower) btnLower.disabled = !highLowGameState.active;
    if (btnCashout) btnCashout.disabled = !highLowGameState.active || highLowGameState.streak <= 0;
}

export function guessHighLowCard(guessDirection = 'higher') {
    if (!highLowGameState.active) return;

    const curRank = RARITY_CONFIG[highLowGameState.curRarityId]?.rank ?? 0;
    let nextRank = (Math.random() * RARITY_ORDER.length) | 0;
    if (nextRank === curRank) {
        nextRank = (nextRank + 1) % RARITY_ORDER.length;
    }

    const nextRarityId = RARITY_ORDER[nextRank];
    const nextRCfg = RARITY_CONFIG[nextRarityId];
    const nextUnit = UNIT_CATALOG[(Math.random() * UNIT_CATALOG.length) | 0];

    const nextBox = document.getElementById('mg-hl-next-card');
    if (nextBox) {
        nextBox.className = `mg-hl-card-box ${nextRCfg.cssClass} card-revealed`;
        const nr = document.getElementById('mg-hl-next-rarity');
        if (nr) {
            nr.className = `rarity-badge ${nextRCfg.cssClass} mt-1`;
            nr.textContent = nextRCfg.name.toUpperCase();
        }
        const nRankEl = document.getElementById('mg-hl-next-rank');
        if (nRankEl) nRankEl.textContent = `RANK ${nextRCfg.rank} (${nextRCfg.mult}x)`;
        const nUnitEl = document.getElementById('mg-hl-next-unit');
        if (nUnitEl) nUnitEl.textContent = nextUnit.name.toUpperCase();
    }

    const isWin =
        (guessDirection === 'higher' && nextRank >= curRank) ||
        (guessDirection === 'lower' && nextRank <= curRank);

    const stEl = document.getElementById('mg-hl-status-text');

    if (isWin) {
        highLowGameState.streak++;
        const mult = MINIGAME_CONFIG.highlow.winMultiplier;
        highLowGameState.potCoins = Math.round(highLowGameState.potCoins * mult);
        highLowGameState.potGems = Math.round(highLowGameState.potGems * mult);
        highLowGameState.curRarityId = nextRarityId;
        highLowGameState.curUnitId = nextUnit.id;

        triggerHaptic(20);
        if (sfxRef) sfxRef.play('upgrade');
        if (stEl) {
            stEl.innerHTML = `<span class="text-emerald-600 font-black">✅ CHÍNH XÁC! Thẻ mới là ${nextRCfg.name} (Rank ${nextRank})! Quỹ thưởng nhân x${mult}!</span>`;
        }
        renderHighLowMinigameUI();
    } else {
        highLowGameState.active = false;
        highLowGameState.potCoins = 0;
        highLowGameState.potGems = 0;
        triggerHaptic(45);
        if (sfxRef) sfxRef.play('boom');
        if (stEl) {
            stEl.innerHTML = `<span class="text-rose-600 font-black">❌ ĐOÁN SAI! Thẻ lật ra là ${nextRCfg.name} (Rank ${nextRank}). Hãy bắt đầu ván mới!</span>`;
        }
        renderHighLowMinigameUI();
    }
}

export function cashoutHighLowMinigame() {
    if (!highLowGameState.active || highLowGameState.streak <= 0) return;
    highLowGameState.active = false;

    const c = highLowGameState.potCoins;
    const g = highLowGameState.potGems;
    metaState.coins += c;
    metaState.gems += g;

    let bonusTxt = '';
    if (highLowGameState.streak >= MINIGAME_CONFIG.highlow.bonusCardStreakThreshold) {
        const bonusRarity = highLowGameState.streak >= 8 ? 'master' : 'secret';
        addCardToStacks(highLowGameState.curUnitId, bonusRarity, 1);
        const u = UNIT_BY_ID[highLowGameState.curUnitId];
        bonusTxt = ` + 1 Thẻ <b>${u?.name || 'Tướng'} (${RARITY_CONFIG[bonusRarity].name})</b>`;
    }

    saveProgress();
    updateTopBarUI();
    if (sfxRef) sfxRef.play('upgrade');

    const stEl = document.getElementById('mg-hl-status-text');
    if (stEl) {
        stEl.innerHTML = `<span class="text-emerald-600 font-black">💰 ĐÃ THU NHẬN: +🪙 ${c.toLocaleString('en-US')}, +💎 ${g.toLocaleString('en-US')}${bonusTxt}!</span>`;
    }
    renderHighLowMinigameUI();
}

// ============================================================================
// 13. KHỞI TẠO BỘ LẮNG NGHE SỰ KIỆN SẢNH (INIT LOBBY LISTENERS)
// ============================================================================
export function initLobby({ sfx, atlas, renderMap, onStartBattle, onRenderMapPreview }) {
    sfxRef = sfx;
    atlasRef = atlas;
    onStartBattleCallback = onStartBattle;

    if (typeof onRenderMapPreview === 'function') {
        onRenderMapPreviewCallback = onRenderMapPreview;
    } else if (typeof renderMap === 'function') {
        onRenderMapPreviewCallback = (lv) => {
            const previewCanvas = document.getElementById('selected-map-preview');
            if (!previewCanvas) return;
            const pCtx = previewCanvas.getContext('2d');
            pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            renderMap(pCtx, previewCanvas.width, previewCanvas.height, lv, true);
        };
    }

    loadProgress();
    currentStageViewLevel = getMaxUnlockedMapLevel();
    currentSelectedDifficulty = getDefaultDifficultyForMap(currentStageViewLevel);

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, .btn-3d, .army-unit-card, .diff-pill-btn, .mode-pill-btn, .special-mode-pill, .nav-tab-btn, .side-feature-btn, .quick-utility-pill, .st-node-btn');
        if (btn && !btn.disabled) {
            triggerHaptic(15);
        }
    });

    // Thanh điều hướng 5 Tab
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            if (tab) switchLobbyTab(tab);
        });
    });

    // Hồ sơ & Đặt tên
    document.getElementById('btn-edit-name')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        checkAndPromptPlayerName(true);
    });

    document.getElementById('btn-confirm-name')?.addEventListener('click', () => {
        const input = document.getElementById('player-name-input');
        const errEl = document.getElementById('name-error-msg');
        if (!input) return;

        const val = input.value.trim();
        if (val.length < 1 || val.length > 14) {
            if (errEl) errEl.classList.remove('hidden');
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        metaState.playerName = val;
        saveProgress();
        updateTopBarUI();
        if (sfxRef) sfxRef.play('upgrade');
        document.getElementById('name-modal')?.classList.remove('active');
    });

    // Cài đặt & Admin Mode
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        renderSettingsModalUI();
        document.getElementById('settings-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
        document.getElementById('settings-modal')?.classList.remove('active');
    });

    document.getElementById('btn-toggle-admin-form')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        document.getElementById('admin-password-form')?.classList.toggle('hidden');
    });

    document.getElementById('btn-submit-admin-pass')?.addEventListener('click', () => {
        const passInput = document.getElementById('admin-password-input');
        const fb = document.getElementById('admin-auth-feedback');
        if (!passInput || !fb) return;

        const enteredPass = passInput.value.trim();
        fb.classList.remove('hidden');

        if (enteredPass === (ADMIN_PASSWORD || 'HUNGADMINDZ')) {
            metaState.isAdminMode = true;
            saveProgress();
            updateTopBarUI();
            if (sfxRef) sfxRef.play('upgrade');
            renderSettingsModalUI();
            if (currentLobbyTab === 'battle') renderStageScreenUI();
            else if (currentLobbyTab === 'challenge') renderChallengeRoadmapUI();
            else if (currentLobbyTab === 'skilltree') renderSkillTreeTabUI();
        } else {
            fb.className = 'text-[11px] font-extrabold mt-1.5 text-center text-rose-600';
            fb.textContent = '❌ Mật khẩu Admin không chính xác!';
            if (sfxRef) sfxRef.play('cannon');
        }
    });

    document.getElementById('btn-Return-normal-mode')?.addEventListener('click', () => {
        metaState.isAdminMode = false;
        saveProgress();
        updateTopBarUI();
        if (sfxRef) sfxRef.play('gas');
        renderSettingsModalUI();
        if (currentLobbyTab === 'battle') renderStageScreenUI();
        else if (currentLobbyTab === 'challenge') renderChallengeRoadmapUI();
        else if (currentLobbyTab === 'skilltree') renderSkillTreeTabUI();
    });

    document.getElementById('btn-settings-rename')?.addEventListener('click', () => {
        document.getElementById('settings-modal')?.classList.remove('active');
        checkAndPromptPlayerName(true);
    });

    document.getElementById('btn-settings-sound')?.addEventListener('click', (e) => {
        if (!sfxRef) return;
        sfxRef.enabled = !sfxRef.enabled;
        e.currentTarget.textContent = sfxRef.enabled ? '🔊 ÂM THANH: BẬT' : '🔇 ÂM THANH: TẮT';
        sfxRef.play('gas');
    });

    document.getElementById('btn-reset-account-data')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('cannon');
        document.getElementById('reset-confirm-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-reset-confirm')?.addEventListener('click', () => {
        document.getElementById('reset-confirm-modal')?.classList.remove('active');
    });

    document.getElementById('btn-cancel-reset-data')?.addEventListener('click', () => {
        document.getElementById('reset-confirm-modal')?.classList.remove('active');
    });

    document.getElementById('btn-confirm-reset-data')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('boom');
        resetAllAccountData();
    });

    // Điều hướng Map trong Tab Battle
    document.getElementById('btn-prev-stage')?.addEventListener('click', () => {
        if (currentStageViewLevel > 1) {
            currentStageViewLevel--;
            currentSelectedDifficulty = getDefaultDifficultyForMap(currentStageViewLevel);
            if (sfxRef) sfxRef.play('gas');
            renderStageScreenUI();
        }
    });

    document.getElementById('btn-next-stage')?.addEventListener('click', () => {
        if (currentStageViewLevel < getMaxUnlockedMapLevel()) {
            currentStageViewLevel++;
            currentSelectedDifficulty = getDefaultDifficultyForMap(currentStageViewLevel);
            if (sfxRef) sfxRef.play('gas');
            renderStageScreenUI();
        }
    });

    DIFFICULTY_ORDER.forEach(diffKey => {
        const btn = document.getElementById(`diff-btn-${diffKey}`);
        if (btn) {
            btn.addEventListener('click', () => {
                if (!isDifficultyUnlocked(currentStageViewLevel, diffKey)) {
                    if (sfxRef) sfxRef.play('cannon');
                    return;
                }
                currentSelectedDifficulty = diffKey;
                if (sfxRef) sfxRef.play('gas');
                renderStageScreenUI();
            });
        }
    });

    BATTLE_MODE_ORDER.forEach(modeKey => {
        const btn = document.getElementById(`mode-btn-${modeKey}`);
        if (btn) {
            btn.addEventListener('click', () => {
                currentSelectedBattleMode = modeKey;
                currentSelectedSpecialMode = 'standard';
                if (sfxRef) sfxRef.play('gas');
                renderStageScreenUI();
            });
        }
    });

    document.querySelectorAll('.special-mode-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const spMode = btn.getAttribute('data-special') || btn.getAttribute('data-mode');
            if (!spMode) return;
            currentSelectedSpecialMode = currentSelectedSpecialMode === spMode ? 'standard' : spMode;
            if (sfxRef) sfxRef.play('gas');
            renderStageScreenUI();
        });
    });

    // Ụ Pháo Căn Cứ Xanh
    document.getElementById('btn-open-turret-modal')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        renderBaseTurretModalUI();
        document.getElementById('base-turret-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-turret-modal')?.addEventListener('click', () => {
        document.getElementById('base-turret-modal')?.classList.remove('active');
    });

    document.getElementById('btn-upgrade-base-turret')?.addEventListener('click', () => {
        if (!metaState.baseTurret) metaState.baseTurret = { type: 'gatling', level: 1 };
        const curLv = Math.max(1, Number(metaState.baseTurret.level) || 1);
        const cost = getBaseTurretUpgradeCost(curLv);
        if (!metaState.isAdminMode && metaState.coins < cost) {
            if (sfxRef) sfxRef.play('cannon');
            return;
        }
        if (!metaState.isAdminMode) metaState.coins -= cost;
        metaState.baseTurret.level = curLv + 1;
        saveProgress();
        triggerHaptic(25);
        if (sfxRef) sfxRef.play('upgrade');
        renderBaseTurretModalUI();
        updateTopBarUI();
    });

    // Nút mở Sổ Tay INDEX (đặt ở cột phải phía trên nút CODE)
    document.getElementById('btn-open-index')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        renderCodexModalUI();
        document.getElementById('codex-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-codex')?.addEventListener('click', () => {
        document.getElementById('codex-modal')?.classList.remove('active');
    });

    document.getElementById('btn-codex-claim-all')?.addEventListener('click', claimAllCodexMilestones);

    // Talents 6 Nhánh
    document.getElementById('btn-open-talents')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        renderMetaTalentsModalUI();
        document.getElementById('talents-modal')?.classList.add('active');
    });

    const closeTalentsModal = () => {
        document.getElementById('talents-modal')?.classList.remove('active');
    };
    document.getElementById('btn-close-talents')?.addEventListener('click', closeTalentsModal);
    document.getElementById('btn-close-talents-bottom')?.addEventListener('click', closeTalentsModal);
    document.querySelector('[data-close="talents-modal"]')?.addEventListener('click', closeTalentsModal);

    document.getElementById('btn-reset-talents')?.addEventListener('click', resetAllMetaTalents);

    document.getElementById('btn-quick-army-chips')?.addEventListener('click', () => {
        switchLobbyTab('army');
        openUnitUpgradeModal(showcaseUnitId || PRIMARY_INFANTRY_ID);
    });

    // Nút START vào trận Battle
    document.getElementById('btn-start-battle')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('spawn');
        syncLegacyEngineBridges();

        const effectiveMode =
            currentSelectedSpecialMode !== 'standard' && SPECIAL_TO_ENGINE_MODE[currentSelectedSpecialMode]
                ? SPECIAL_TO_ENGINE_MODE[currentSelectedSpecialMode]
                : currentSelectedBattleMode;

        document.getElementById('lobby-wrapper')?.classList.remove('active');

        if (onStartBattleCallback) {
            onStartBattleCallback(
                currentStageViewLevel,
                currentSelectedDifficulty,
                effectiveMode,
                currentSelectedSpecialMode
            );
        }
    });

    // Nhiệm vụ & Giftcode
    document.getElementById('btn-open-missions')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        renderMissionsList();
        document.getElementById('mission-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-missions')?.addEventListener('click', () => {
        document.getElementById('mission-modal')?.classList.remove('active');
    });

    document.getElementById('btn-open-code')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        renderGiftcodeModalUI();
        document.getElementById('code-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-code')?.addEventListener('click', () => {
        document.getElementById('code-modal')?.classList.remove('active');
    });

    document.getElementById('btn-submit-code')?.addEventListener('click', () => {
        const input = document.getElementById('giftcode-input');
        const fb = document.getElementById('giftcode-feedback');
        if (!input || !fb) return;

        const rawCode = input.value.trim().toUpperCase();
        fb.classList.remove('hidden');

        if (!rawCode) {
            fb.className = 'text-xs font-extrabold mt-2 text-rose-600';
            fb.textContent = '⚠️ Vui lòng nhập mã Giftcode!';
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        if (!OFFICIAL_GIFTCODES.includes(rawCode)) {
            fb.className = 'text-xs font-extrabold mt-2 text-rose-600';
            fb.textContent = '❌ Mã Giftcode không hợp lệ hoặc không tồn tại!';
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        if (!Array.isArray(metaState.usedCodes)) metaState.usedCodes = [];

        if (metaState.usedCodes.includes(rawCode)) {
            fb.className = 'text-xs font-extrabold mt-2 text-amber-600';
            fb.textContent = '⚠️ Mã Giftcode này đã được sử dụng trên tài khoản này rồi!';
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        const rewardPack = (GIFT_CODES && GIFT_CODES[rawCode]) || {
            gems: GIFTCODE_REWARD_GEMS,
            coins: GIFTCODE_REWARD_COINS,
            medals: 15,
            pearls: GIFTCODE_REWARD_PEARLS
        };

        metaState.usedCodes.push(rawCode);
        metaState.gems += Number(rewardPack.gems) || GIFTCODE_REWARD_GEMS;
        metaState.coins += Number(rewardPack.coins) || GIFTCODE_REWARD_COINS;
        metaState.medals = (metaState.medals || 0) + (Number(rewardPack.medals) || 0);
        metaState.pearls = (metaState.pearls || 0) + (Number(rewardPack.pearls) || 0);

        saveProgress();
        updateTopBarUI();
        if (sfxRef) sfxRef.play('upgrade');

        const extraMsg = ` & +${rewardPack.medals || 0} 🎖️, +${rewardPack.pearls || 0} ⚪`;
        fb.className = 'text-xs font-extrabold mt-2 text-emerald-600';
        fb.innerHTML = `🎉 NHẬP QUÀ THÀNH CÔNG! (+${(Number(rewardPack.gems) || 0).toLocaleString('en-US')} 💎, +${(Number(rewardPack.coins) || 0).toLocaleString('en-US')} 🪙${extraMsg})`;
        input.value = '';
        renderGiftcodeModalUI();
    });

    // Shop Gacha Rương Siêu Tốc O(1)
    document.getElementById('btn-open-leg-1')?.addEventListener('click', () => requestOpenGachaCrate('legendary', 1));
    document.getElementById('btn-open-leg-10')?.addEventListener('click', () => requestOpenGachaCrate('legendary', 10));
    document.getElementById('btn-open-leg-custom')?.addEventListener('click', () => {
        const val = document.getElementById('input-custom-leg-count')?.value || 20;
        requestOpenGachaCrate('legendary', val);
    });

    document.getElementById('btn-open-epic-1')?.addEventListener('click', () => requestOpenGachaCrate('epic', 1));
    document.getElementById('btn-open-epic-10')?.addEventListener('click', () => requestOpenGachaCrate('epic', 10));
    document.getElementById('btn-open-epic-custom')?.addEventListener('click', () => {
        const val = document.getElementById('input-custom-epic-count')?.value || 20;
        requestOpenGachaCrate('epic', val);
    });

    document.querySelectorAll('.crate-preset-qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetInputId = btn.getAttribute('data-target-input');
            const crateType = btn.getAttribute('data-crate') || 'legendary';
            const qty = Number(btn.getAttribute('data-qty')) || 1000;
            const inputEl = document.getElementById(targetInputId);
            if (inputEl) inputEl.value = String(qty);
            if (sfxRef) sfxRef.play('gas');
            requestOpenGachaCrate(crateType, qty);
        });
    });

    document.getElementById('btn-close-gacha-confirm')?.addEventListener('click', () => {
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');
    });

    document.getElementById('btn-cancel-custom-gacha')?.addEventListener('click', () => {
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');
    });

    document.getElementById('btn-confirm-custom-gacha')?.addEventListener('click', () => {
        if (!pendingGachaData) return;
        const { crateType, qty, finalCost, isLegendary } = pendingGachaData;

        if (!metaState.isAdminMode && metaState.gems < finalCost) {
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        const tStart = performance.now();
        if (!metaState.isAdminMode) {
            metaState.gems -= finalCost;
        }
        metaState.missionsProgress.cratesOpened = (metaState.missionsProgress.cratesOpened || 0) + qty;

        const unitIds = UNIT_CATALOG.map(u => normalizeUnitId(u.id));
        const pullResult = simulateBulkCrateOpeningO1(crateType, qty, unitIds);

        for (const [stackKey, count] of Object.entries(pullResult.unitRarityStacks)) {
            if (count > 0) {
                metaState.inventoryStacks[stackKey] = (metaState.inventoryStacks[stackKey] || 0) + count;
                const [uId, rKey] = stackKey.split('__');
                recordHighestRarityForUnit(uId, rKey);
            }
        }

        saveProgress();
        updateTopBarUI();
        if (sfxRef) sfxRef.play('upgrade');
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');

        const elapsedMs = Math.max(0.1, +(performance.now() - tStart).toFixed(2));
        const resModal = document.getElementById('gacha-result-modal');
        const titleEl = document.getElementById('gacha-modal-title');
        const sumBanner = document.getElementById('gacha-total-pulled');
        const breakdownEl = document.getElementById('gacha-rarity-breakdown');
        const gridEl = document.getElementById('gacha-cards-grid');

        if (titleEl) {
            titleEl.textContent = isLegendary
                ? `👑 LEGENDARY CRATE X${formatCompactNumber(qty)}`
                : `🧰 EPIC CRATE X${formatCompactNumber(qty)}`;
        }
        if (sumBanner) {
            sumBanner.textContent = `${qty.toLocaleString('en-US')} thẻ tướng (trong ${elapsedMs}ms)`;
        }

        if (breakdownEl) {
            breakdownEl.innerHTML = '';
            const orderedRarities = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
            let hasAny = false;
            orderedRarities.forEach(rKey => {
                const count = pullResult.rarityTotals[rKey] || 0;
                if (count > 0) {
                    hasAny = true;
                    const rCfg = RARITY_CONFIG[rKey];
                    const pill = document.createElement('span');
                    pill.className = `gacha-rarity-stat-pill ${rCfg.cssClass}`;
                    pill.textContent = `${rCfg.name}: ${count.toLocaleString('en-US')}`;
                    breakdownEl.appendChild(pill);
                }
            });
            breakdownEl.classList.toggle('hidden', !hasAny);
        }

        if (gridEl) {
            gridEl.innerHTML = '';
            const fragment = document.createDocumentFragment();

            if (qty <= 10 && pullResult.sampleCards.length > 0) {
                pullResult.sampleCards.forEach(c => {
                    const u = UNIT_BY_ID[normalizeUnitId(c.unitId)];
                    const rCfg = RARITY_CONFIG[c.rarity] || RARITY_CONFIG.common;
                    if (!u) return;
                    const spriteUrl = getUnitSpriteDataURL(u, 7);

                    const cardEl = document.createElement('div');
                    cardEl.className = `army-unit-card ${rCfg.cssClass}`;
                    cardEl.innerHTML = `
                        <div class="card-top-lv">
                            <span>${rCfg.name.toUpperCase()}</span>
                            ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : ''}
                        </div>
                        <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u.name}" />
                        <div class="card-unit-title">${u.name}</div>
                    `;
                    fragment.appendChild(cardEl);
                });
            } else {
                const aggregatedEntries = Object.entries(pullResult.unitRarityStacks).map(([key, count]) => {
                    const [unitId, rarity] = key.split('__');
                    return {
                        unitId,
                        rarity,
                        count,
                        rank: RARITY_CONFIG[rarity]?.rank ?? 0
                    };
                }).sort((a, b) => {
                    if (b.rank !== a.rank) return b.rank - a.rank;
                    return b.count - a.count;
                });

                aggregatedEntries.forEach(item => {
                    const u = UNIT_BY_ID[normalizeUnitId(item.unitId)];
                    const rCfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
                    if (!u) return;
                    const spriteUrl = getUnitSpriteDataURL(u, 7);

                    const cardEl = document.createElement('div');
                    cardEl.className = `army-unit-card ${rCfg.cssClass}`;
                    cardEl.innerHTML = `
                        <div class="card-top-lv">
                            <span>${rCfg.name.toUpperCase()}</span>
                            ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : ''}
                        </div>
                        <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u.name}" />
                        <span class="card-qty-badge" title="${item.count.toLocaleString('en-US')} thẻ">x${formatCompactNumber(item.count)}</span>
                        <div class="card-unit-title">${u.name}</div>
                    `;
                    fragment.appendChild(cardEl);
                });
            }

            gridEl.appendChild(fragment);
        }

        if (resModal) resModal.classList.add('active');
    });

    document.getElementById('btn-close-gacha')?.addEventListener('click', () => {
        document.getElementById('gacha-result-modal')?.classList.remove('active');
        if (currentLobbyTab === 'army') renderArmyTabUI();
    });

    // Tab ARMY: chuyển 3 chế độ ARMY / REVIEW / MERGE
    document.getElementById('btn-mode-army')?.addEventListener('click', () => {
        currentArmyMode = 'army';
        if (sfxRef) sfxRef.play('gas');
        renderArmyTabUI();
    });

    document.getElementById('btn-mode-review')?.addEventListener('click', () => {
        currentArmyMode = 'review';
        if (sfxRef) sfxRef.play('gas');
        renderArmyTabUI();
    });

    document.getElementById('btn-mode-merge')?.addEventListener('click', () => {
        currentArmyMode = 'merge';
        mergeSelectedCardUids = [];
        if (sfxRef) sfxRef.play('gas');
        renderArmyTabUI();
    });

    // Đóng & Reset Sandbox Review Modal
    document.getElementById('btn-close-sandbox-modal')?.addEventListener('click', () => {
        stopSandboxReviewLoop();
        document.getElementById('sandbox-review-modal')?.classList.remove('active');
    });

    document.getElementById('btn-reset-sandbox-dps')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        resetSandboxDpsMetrics();
    });

    // Nâng cấp tướng & Hoàn cấp
    document.querySelectorAll('.upg-quick-lv-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const u = UNIT_BY_ID[inspectingUnitId];
            if (!u) return;
            const permLv = metaState.armyPermanentLevels[u.id] || 1;
            const attr = btn.getAttribute('data-add-lv');
            if (sfxRef) sfxRef.play('gas');

            if (attr === 'max') {
                const maxAdd = calcMaxAffordableLevels(permLv, metaState.coins, metaState.isAdminMode);
                updateBulkUpgradePreviewUI(maxAdd);
                btn.classList.add('active');
            } else {
                updateBulkUpgradePreviewUI(Number(attr) || 1);
            }
        });
    });

    document.getElementById('upg-custom-add-lv-input')?.addEventListener('input', (e) => {
        const val = Math.max(1, Math.min(999999, Math.floor(Number(e.target.value) || 1)));
        updateBulkUpgradePreviewUI(val);
    });

    document.getElementById('btn-close-upg-modal')?.addEventListener('click', () => {
        document.getElementById('unit-upgrade-modal')?.classList.remove('active');
    });

    document.getElementById('btn-confirm-unit-upgrade')?.addEventListener('click', () => {
        const u = UNIT_BY_ID[inspectingUnitId];
        if (!u) return;

        const permLv = metaState.armyPermanentLevels[u.id] || 1;
        const addLv = Math.max(1, Math.min(999999, Math.floor(Number(currentBulkAddLevels) || 1)));
        const totalCostCoins = calcBulkUpgradeCost(permLv, addLv);

        if (!metaState.isAdminMode && metaState.coins < totalCostCoins) {
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        if (!metaState.isAdminMode) {
            metaState.coins -= totalCostCoins;
        }
        metaState.armyPermanentLevels[u.id] = permLv + addLv;
        metaState.missionsProgress.upgrades = (metaState.missionsProgress.upgrades || 0) + addLv;

        saveProgress();
        if (sfxRef) sfxRef.play('upgrade');
        updateTopBarUI();
        renderArmyTabUI();
        openUnitUpgradeModal(u.id);
    });

    document.getElementById('btn-open-level-refund')?.addEventListener('click', openLevelRefundModal);

    document.getElementById('btn-close-refund-modal')?.addEventListener('click', () => {
        document.getElementById('level-refund-modal')?.classList.remove('active');
    });

    document.getElementById('btn-cancel-level-refund')?.addEventListener('click', () => {
        document.getElementById('level-refund-modal')?.classList.remove('active');
    });

    document.getElementById('refund-target-level-input')?.addEventListener('input', updateLevelRefundModalCalculation);

    document.getElementById('btn-refund-lv-min')?.addEventListener('click', () => {
        const inputEl = document.getElementById('refund-target-level-input');
        if (inputEl) {
            inputEl.value = '1';
            if (sfxRef) sfxRef.play('gas');
            updateLevelRefundModalCalculation();
        }
    });

    document.getElementById('btn-refund-lv-max')?.addEventListener('click', () => {
        const u = UNIT_BY_ID[inspectingUnitId];
        const curLv = u ? (metaState.armyPermanentLevels[u.id] || 1) : 1;
        const inputEl = document.getElementById('refund-target-level-input');
        if (inputEl && curLv > 1) {
            inputEl.value = String(curLv - 1);
            if (sfxRef) sfxRef.play('gas');
            updateLevelRefundModalCalculation();
        }
    });

    document.getElementById('btn-refund-lv-minus')?.addEventListener('click', () => {
        const u = UNIT_BY_ID[inspectingUnitId];
        const curLv = u ? (metaState.armyPermanentLevels[u.id] || 1) : 1;
        const inputEl = document.getElementById('refund-target-level-input');
        if (!inputEl) return;
        const curVal = Math.floor(Number(inputEl.value) || 1);
        inputEl.value = String(Math.max(1, Math.min(curLv - 1, curVal - 1)));
        if (sfxRef) sfxRef.play('gas');
        updateLevelRefundModalCalculation();
    });

    document.getElementById('btn-refund-lv-plus')?.addEventListener('click', () => {
        const u = UNIT_BY_ID[inspectingUnitId];
        const curLv = u ? (metaState.armyPermanentLevels[u.id] || 1) : 1;
        const inputEl = document.getElementById('refund-target-level-input');
        if (!inputEl) return;
        const curVal = Math.floor(Number(inputEl.value) || 1);
        inputEl.value = String(Math.max(1, Math.min(curLv - 1, curVal + 1)));
        if (sfxRef) sfxRef.play('gas');
        updateLevelRefundModalCalculation();
    });

    document.getElementById('btn-confirm-level-refund')?.addEventListener('click', () => {
        const u = UNIT_BY_ID[inspectingUnitId];
        if (!u) return;

        const curLv = metaState.armyPermanentLevels[u.id] || 1;
        const inputEl = document.getElementById('refund-target-level-input');
        const targetLv = Math.floor(Number(inputEl?.value));

        if (!Number.isFinite(targetLv) || targetLv < 1 || targetLv >= curLv) {
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        const refundCoins = calcTotalRefundCoins(targetLv, curLv);
        metaState.coins += refundCoins;
        metaState.armyPermanentLevels[u.id] = targetLv;

        saveProgress();
        if (sfxRef) sfxRef.play('upgrade');
        document.getElementById('level-refund-modal')?.classList.remove('active');
        updateTopBarUI();
        renderArmyTabUI();
        openUnitUpgradeModal(u.id);
    });

    // Merge thủ công & Auto-Merge O(1)
    document.getElementById('merge-slot-1')?.addEventListener('click', () => {
        if (mergeSelectedCardUids.length > 0) {
            mergeSelectedCardUids.shift();
            if (sfxRef) sfxRef.play('gas');
            renderMergeWorkbenchAndInventory();
        }
    });

    document.getElementById('merge-slot-2')?.addEventListener('click', () => {
        if (mergeSelectedCardUids.length > 1) {
            mergeSelectedCardUids.pop();
            if (sfxRef) sfxRef.play('gas');
            renderMergeWorkbenchAndInventory();
        }
    });

    document.getElementById('btn-execute-merge')?.addEventListener('click', () => {
        if (mergeSelectedCardUids.length < 2) return;
        const card1 = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[0]);
        const card2 = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[1]);

        if (!card1 || !card2) return;
        const normId1 = normalizeUnitId(card1.unitId);
        const normId2 = normalizeUnitId(card2.unitId);
        if (normId1 !== normId2 || card1.rarity !== card2.rarity) return;

        const nextRarity = RARITY_CONFIG[card1.rarity]?.next;
        if (!nextRarity) return;

        addCardToStacks(normId1, card1.rarity, -2);
        addCardToStacks(normId1, nextRarity, 1);

        metaState.missionsProgress.merges = (metaState.missionsProgress.merges || 0) + 1;
        mergeSelectedCardUids = [];
        showcaseUnitId = normId1;

        saveProgress();
        if (sfxRef) sfxRef.play('upgrade');
        updateTopBarUI();
        renderArmyTabUI();

        const u = UNIT_BY_ID[normId1];
        const nextRCfg = RARITY_CONFIG[nextRarity];
        const hintEl = document.getElementById('merge-hint-text');
        if (hintEl && u && nextRCfg) {
            hintEl.innerHTML = `🎉 GHÉP THÀNH CÔNG: <b>${u.name}</b> tiến hóa lên bậc <b class="text-amber-300">${nextRCfg.name} (${nextRCfg.mult}x)</b>!`;
        }
    });

    document.getElementById('btn-auto-merge')?.addEventListener('click', () => {
        const t0 = performance.now();
        let totalMergeOperations = 0;
        const touchedUnits = new Set();
        const highestReachedRarityByUnit = {};

        UNIT_CATALOG.forEach(u => {
            const normId = normalizeUnitId(u.id);
            for (let rIdx = 0; rIdx < RARITY_ORDER.length - 1; rIdx++) {
                const curR = RARITY_ORDER[rIdx];
                const nextR = RARITY_CONFIG[curR]?.next;
                if (!nextR) continue;

                const curKey = `${normId}__${curR}`;
                const nextKey = `${normId}__${nextR}`;
                const stackCount = Math.floor(Number(metaState.inventoryStacks[curKey]) || 0);

                if (stackCount >= 2) {
                    const pairs = Math.floor(stackCount / 2);
                    const remainder = stackCount % 2;

                    if (remainder > 0) {
                        metaState.inventoryStacks[curKey] = remainder;
                    } else {
                        delete metaState.inventoryStacks[curKey];
                    }
                    metaState.inventoryStacks[nextKey] = (Math.floor(Number(metaState.inventoryStacks[nextKey]) || 0)) + pairs;

                    recordHighestRarityForUnit(normId, nextR);
                    touchedUnits.add(normId);
                    highestReachedRarityByUnit[normId] = nextR;
                    totalMergeOperations += pairs;
                }
            }
        });

        if (totalMergeOperations === 0) {
            if (sfxRef) sfxRef.play('cannon');
            const hintEl = document.getElementById('merge-hint-text');
            if (hintEl) {
                hintEl.innerHTML = `<span class="text-rose-300 font-bold">⚠️ Không có cặp thẻ nào cùng tên & cùng độ hiếm để ghép!</span>`;
            }
            return;
        }

        const summaryItems = [];
        touchedUnits.forEach(normId => {
            let bestR = highestReachedRarityByUnit[normId] || getHighestRarityForUnit(normId);
            for (let rIdx = RARITY_ORDER.length - 1; rIdx >= 0; rIdx--) {
                const rKey = RARITY_ORDER[rIdx];
                const count = Math.floor(Number(metaState.inventoryStacks[`${normId}__${rKey}`]) || 0);
                if (count > 0) {
                    bestR = rKey;
                    break;
                }
            }
            const totalAtBest = Math.max(1, Math.floor(Number(metaState.inventoryStacks[`${normId}__${bestR}`]) || 1));
            summaryItems.push({
                unitId: normId,
                rarity: bestR,
                count: totalAtBest,
                rank: RARITY_CONFIG[bestR]?.rank ?? 0
            });
        });

        metaState.missionsProgress.merges = (metaState.missionsProgress.merges || 0) + totalMergeOperations;

        summaryItems.sort((a, b) => {
            if (b.rank !== a.rank) return b.rank - a.rank;
            return b.count - a.count;
        });

        saveProgress();
        if (sfxRef) sfxRef.play('upgrade');
        updateTopBarUI();
        mergeSelectedCardUids = [];
        renderArmyTabUI();

        const elapsedMs = Math.max(0.1, +(performance.now() - t0).toFixed(2));
        const amModal = document.getElementById('auto-merge-modal');
        const textEl = document.getElementById('auto-merge-summary-text');
        const gridEl = document.getElementById('auto-merge-results-grid');

        const totalHighCards = summaryItems.reduce((acc, it) => acc + it.count, 0);
        if (textEl) {
            textEl.innerHTML = `⚡ Đã tự động ghép dây chuyền <b>${totalMergeOperations.toLocaleString('en-US')} lần</b> trong <b>${elapsedMs}ms</b>! Sở hữu <b>${totalHighCards.toLocaleString('en-US')} thẻ</b> ở bậc cao nhất:`;
        }

        if (gridEl) {
            gridEl.innerHTML = '';
            const fragment = document.createDocumentFragment();
            summaryItems.forEach(item => {
                const u = UNIT_BY_ID[item.unitId];
                const rCfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
                const spriteUrl = u ? getUnitSpriteDataURL(u, 7) : '';

                const cardEl = document.createElement('div');
                cardEl.className = `army-unit-card ${rCfg.cssClass}`;
                cardEl.innerHTML = `
                    <div class="card-top-lv">
                        <span>${rCfg.name.toUpperCase()}</span>
                        ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : ''}
                    </div>
                    <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u?.name || ''}" />
                    <span class="card-qty-badge">x${formatCompactNumber(item.count)}</span>
                    <div class="card-unit-title">${u?.name || ''}</div>
                `;
                fragment.appendChild(cardEl);
            });
            gridEl.appendChild(fragment);
        }

        if (amModal) amModal.classList.add('active');
    });

    document.getElementById('btn-close-auto-merge')?.addEventListener('click', () => {
        document.getElementById('auto-merge-modal')?.classList.remove('active');
    });

    document.getElementById('btn-close-auto-merge-x')?.addEventListener('click', () => {
        document.getElementById('auto-merge-modal')?.classList.remove('active');
    });

    // Cây Kỹ Năng Cổ Thụ (Skill Tree - Ngọc Trai Trắng)
    document.querySelectorAll('.st-node-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const nodeId = btn.getAttribute('data-st-id');
            if (nodeId && ANCIENT_SKILL_TREE[nodeId]) {
                selectedSkillTreeNodeId = nodeId;
                if (sfxRef) sfxRef.play('gas');
                renderSkillTreeTabUI();
            }
        });
    });

    document.getElementById('btn-upgrade-skilltree-node')?.addEventListener('click', () => {
        if (upgradeSkillTreeNode(selectedSkillTreeNodeId)) {
            triggerHaptic(30);
            if (sfxRef) sfxRef.play('upgrade');
            updateTopBarUI();
            renderSkillTreeTabUI();
        } else if (sfxRef) {
            sfxRef.play('cannon');
        }
    });

    // Vòng Quay May Mắn
    document.getElementById('btn-open-lucky-wheel')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        updateLuckyWheelPityUI();
        drawLuckyWheelCanvas();
        document.getElementById('lucky-wheel-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-lucky-wheel')?.addEventListener('click', () => {
        document.getElementById('lucky-wheel-modal')?.classList.remove('active');
    });

    document.getElementById('chk-skip-wheel-anim')?.addEventListener('change', (e) => {
        metaState.wheelSkipAnim = !!e.target.checked;
        saveProgress();
    });

    document.getElementById('btn-wheel-center-spin')?.addEventListener('click', () => executeLuckyWheelSpins(1));
    document.getElementById('btn-spin-wheel-1')?.addEventListener('click', () => executeLuckyWheelSpins(1));
    document.getElementById('btn-spin-wheel-10')?.addEventListener('click', () => executeLuckyWheelSpins(10));
    document.getElementById('btn-spin-wheel-custom')?.addEventListener('click', () => {
        const count = Number(document.getElementById('input-custom-wheel-spins')?.value) || 50;
        executeLuckyWheelSpins(count);
    });

    // 3 Mini-Game Giải Trí
    document.getElementById('btn-open-minigames')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        switchMinigameTab(currentMinigameTab || 'mines');
        document.getElementById('minigame-arcade-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-minigames')?.addEventListener('click', () => {
        stopCatcherMinigame(true);
        document.getElementById('minigame-arcade-modal')?.classList.remove('active');
    });

    document.querySelectorAll('.arcade-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-mg-tab');
            if (tab !== 'catcher') stopCatcherMinigame(true);
            if (tab) switchMinigameTab(tab);
        });
    });

    document.getElementById('btn-mg-mines-start')?.addEventListener('click', startMinesMinigame);
    document.getElementById('btn-mg-mines-cashout')?.addEventListener('click', cashoutMinesMinigame);

    document.getElementById('btn-mg-catcher-start')?.addEventListener('click', startCatcherMinigame);

    const bindHoldBtn = (btnId, dirKey) => {
        const el = document.getElementById(btnId);
        if (!el) return;
        const setMove = (val) => { catcherGameState[dirKey] = val; };
        el.addEventListener('pointerdown', () => setMove(true));
        el.addEventListener('pointerup', () => setMove(false));
        el.addEventListener('pointerleave', () => setMove(false));
        el.addEventListener('pointercancel', () => setMove(false));
    };
    bindHoldBtn('btn-mg-catcher-left', 'moveLeft');
    bindHoldBtn('btn-mg-catcher-right', 'moveRight');

    const catcherCanvas = document.getElementById('mgCatcherCanvas');
    if (catcherCanvas) {
        catcherCanvas.addEventListener('pointermove', (e) => {
            if (!catcherGameState.running) return;
            const rect = catcherCanvas.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * catcherCanvas.width;
            catcherGameState.playerX = Math.max(28, Math.min(catcherCanvas.width - 28, relX));
        });
    }

    document.getElementById('btn-mg-hl-start')?.addEventListener('click', startHighLowMinigame);
    document.getElementById('btn-mg-hl-higher')?.addEventListener('click', () => guessHighLowCard('higher'));
    document.getElementById('btn-mg-hl-lower')?.addEventListener('click', () => guessHighLowCard('lower'));
    document.getElementById('btn-mg-hl-cashout')?.addEventListener('click', cashoutHighLowMinigame);

    function lobbyShowcaseAnimationLoop() {
        const lobbyActive = document.getElementById('lobby-wrapper')?.classList.contains('active');
        if (lobbyActive && currentLobbyTab === 'army') {
            renderArmyShowcaseCanvas();
        }
        requestAnimationFrame(lobbyShowcaseAnimationLoop);
    }
    requestAnimationFrame(lobbyShowcaseAnimationLoop);

    updateTopBarUI();
    renderStageScreenUI();
    renderShopChipStoreUI();
    renderChallengeRoadmapUI();
    renderSkillTreeTabUI();
    drawLuckyWheelCanvas();
    checkAndPromptPlayerName(false);
}