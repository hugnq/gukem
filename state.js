/* ============================================================================
   TINY BATTLE - META-GAME STATE & PERSISTENCE (js/state.js)
   Save Key: tiny_battle_meta_save_v3 (Tương thích ngược 100%)
   Hỗ trợ: 45 Map • 17 Binh Chủng • Ụ Pháo Căn Cứ • Sổ Tay Codex • Lịch Sử Jackpot
   ============================================================================ */

import {
    STORAGE_KEY,
    RARITY_ORDER,
    MAX_RARITY_RANK,
    RARITY_CONFIG,
    LEVELS,
    UNIT_CATALOG,
    UNIT_BY_ID,
    BASE_TURRET_CONFIG,
    CODEX_MILESTONES
} from './config.js';
import { getUnitUpgradeCost, calcTotalRefundCoinsFast } from './math.js';

export const PRIMARY_INFANTRY_ID = UNIT_CATALOG[0]?.id || 'infantry';

export function normalizeUnitId(unitId) {
    if (unitId === 'infantry' || unitId === 'rifleman') {
        return PRIMARY_INFANTRY_ID;
    }
    return unitId;
}

export let metaState = {
    playerName: '',
    coins: 350,
    gems: 400,
    medals: 5,
    isAdminMode: false,
    usedCodes: [],
    mapDifficultyProgress: {},
    inventoryStacks: {},
    inventory: [],
    armyPermanentLevels: {},
    missionsProgress: {
        kills: 0,
        diffWins: 0,
        spawns: 0,
        cratesOpened: 0,
        merges: 0,
        wins: 0,
        upgrades: 0,
        claimed: {}
    },
    metaTalents: {
        oil_refining: 0,
        high_grade_steel: 0,
        optimal_logistics: 0
    },
    unitSockets: {},
    talents: {},
    equippedChips: {},
    selectedDeck: [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'tank', 'airstrike'],
    endlessBestWave: 0,
    autobattlerWins: 0,
    raidBossClears: 0,

    // Vòng quay may mắn & Lịch sử nổ Jackpot
    wheelPity: 0,
    wheelSkipAnim: false,
    wheelJackpotTotal: 0,
    wheelJackpotHistory: [],

    // Ụ pháo phòng thủ Căn Cứ Xanh
    baseTurret: {
        type: 'gatling',
        level: 1
    },

    // Sổ tay Bách khoa (Codex) & Mốc độ hiếm cao nhất từng đạt
    highestRarityEverOwned: {},
    codexClaimed: {}
};

let uidCounter = 1;

export function nextCompactUid(prefix = 'c') {
    uidCounter = (uidCounter + 1) % 1000000000;
    return `${prefix}_${Date.now().toString(36)}_${uidCounter.toString(36)}`;
}

export function createDefaultInventoryStacks() {
    const starterUnits = [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'apc'];
    const stacks = {};
    starterUnits.forEach(uId => {
        const normId = normalizeUnitId(uId);
        stacks[`${normId}__common`] = 1;
    });
    return stacks;
}

export function createDefaultInventory() {
    const starterUnits = [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'apc'];
    return starterUnits.map((unitId, idx) => ({
        uid: 'init_card_' + idx + '_' + Date.now(),
        unitId: normalizeUnitId(unitId),
        rarity: 'common'
    }));
}

export function recordHighestRarityForUnit(rawUnitId, rarityId) {
    const unitId = normalizeUnitId(rawUnitId);
    if (!UNIT_BY_ID[unitId] || !RARITY_CONFIG[rarityId]) return;
    if (!metaState.highestRarityEverOwned || typeof metaState.highestRarityEverOwned !== 'object') {
        metaState.highestRarityEverOwned = {};
    }
    const curBest = metaState.highestRarityEverOwned[unitId];
    const curRank = curBest && RARITY_CONFIG[curBest] ? RARITY_CONFIG[curBest].rank : -1;
    const newRank = RARITY_CONFIG[rarityId].rank ?? 0;
    if (newRank > curRank) {
        metaState.highestRarityEverOwned[unitId] = rarityId;
    }
}

export function syncHighestRarityEverOwnedFromStacks() {
    if (!metaState.highestRarityEverOwned || typeof metaState.highestRarityEverOwned !== 'object') {
        metaState.highestRarityEverOwned = {};
    }
    if (metaState.inventoryStacks && typeof metaState.inventoryStacks === 'object') {
        for (const [key, rawCount] of Object.entries(metaState.inventoryStacks)) {
            const count = Math.floor(Number(rawCount) || 0);
            if (count <= 0) continue;
            const [rawUnitId, rarity] = key.split('__');
            recordHighestRarityForUnit(rawUnitId, rarity);
        }
    }
}

export function syncRepresentativeInventoryFromStacks() {
    if (!metaState.inventoryStacks || typeof metaState.inventoryStacks !== 'object') {
        metaState.inventoryStacks = createDefaultInventoryStacks();
    }

    const existingMap = new Map();
    if (Array.isArray(metaState.inventory)) {
        for (let i = 0; i < metaState.inventory.length; i++) {
            const c = metaState.inventory[i];
            if (!c) continue;
            const normId = normalizeUnitId(c.unitId);
            const key = `${normId}__${c.rarity}`;
            let list = existingMap.get(key);
            if (!list) {
                list = [];
                existingMap.set(key, list);
            }
            if (list.length < 2) {
                c.unitId = normId;
                list.push(c);
            }
        }
    }

    const repInventory = [];
    for (const [key, rawCount] of Object.entries(metaState.inventoryStacks)) {
        const count = Math.floor(Number(rawCount) || 0);
        if (count <= 0) {
            delete metaState.inventoryStacks[key];
            continue;
        }
        const [rawUnitId, rarity] = key.split('__');
        const unitId = normalizeUnitId(rawUnitId);
        if (!UNIT_BY_ID[unitId] || !RARITY_CONFIG[rarity]) {
            delete metaState.inventoryStacks[key];
            continue;
        }

        recordHighestRarityForUnit(unitId, rarity);

        const repCount = Math.min(2, count);
        const existingCards = existingMap.get(`${unitId}__${rarity}`) || [];
        for (let i = 0; i < repCount; i++) {
            if (existingCards[i]) {
                repInventory.push(existingCards[i]);
            } else {
                repInventory.push({
                    uid: nextCompactUid('rep'),
                    unitId,
                    rarity
                });
            }
        }
    }

    metaState.inventory = repInventory;
}

export function addCardToStacks(rawUnitId, rarity, deltaCount = 1) {
    const unitId = normalizeUnitId(rawUnitId);
    if (!UNIT_BY_ID[unitId] || !RARITY_CONFIG[rarity]) return;
    const key = `${unitId}__${rarity}`;
    const cur = Math.floor(Number(metaState.inventoryStacks[key]) || 0);
    const delta = Math.floor(Number(deltaCount) || 0);
    const nextVal = Math.max(0, cur + delta);
    if (nextVal > 0) {
        metaState.inventoryStacks[key] = nextVal;
        if (delta > 0) {
            recordHighestRarityForUnit(unitId, rarity);
        }
    } else {
        delete metaState.inventoryStacks[key];
    }
}

export function getTotalCardsInInventory() {
    if (!metaState.inventoryStacks || typeof metaState.inventoryStacks !== 'object') {
        return metaState.inventory?.length || 0;
    }
    let total = 0;
    for (const qty of Object.values(metaState.inventoryStacks)) {
        const n = Math.floor(Number(qty) || 0);
        if (n > 0) total += n;
    }
    return total;
}

export function createDefaultArmyLevels() {
    const lvMap = {};
    UNIT_CATALOG.forEach(u => {
        lvMap[u.id] = 1;
    });
    lvMap['infantry'] = 1;
    lvMap['rifleman'] = 1;
    lvMap['airstrike'] = 1;
    return lvMap;
}

export function createDefaultUnitSockets() {
    const sockMap = {};
    UNIT_CATALOG.forEach(u => {
        sockMap[u.id] = [u.defaultChips?.[0] || null, u.defaultChips?.[1] || null];
    });
    sockMap['infantry'] = [...(sockMap[PRIMARY_INFANTRY_ID] || ['overclock_core', null])];
    sockMap['rifleman'] = [...(sockMap[PRIMARY_INFANTRY_ID] || ['overclock_core', null])];
    return sockMap;
}

export function createDefaultMapDifficultyProgress() {
    const prog = {};
    for (let i = 1; i <= LEVELS.length; i++) {
        prog[i] = {
            easy: false,
            difficult: false,
            easy_destroy: false,
            easy_survival: false,
            difficult_destroy: false,
            difficult_survival: false
        };
    }
    return prog;
}

export function normalizeMapProgressEntry(rawEntry) {
    if (!rawEntry || typeof rawEntry !== 'object') {
        return {
            easy: false,
            difficult: false,
            easy_destroy: false,
            easy_survival: false,
            difficult_destroy: false,
            difficult_survival: false
        };
    }
    const easyDestroy = !!rawEntry.easy_destroy || (!!rawEntry.easy && !rawEntry.easy_survival);
    const easySurvival = !!rawEntry.easy_survival;
    const diffDestroy = !!rawEntry.difficult_destroy;
    const diffSurvival = !!rawEntry.difficult_survival || (!!rawEntry.difficult && !rawEntry.difficult_destroy);

    return {
        easy: !!rawEntry.easy || easyDestroy || easySurvival,
        difficult: !!rawEntry.difficult || diffDestroy || diffSurvival,
        easy_destroy: easyDestroy,
        easy_survival: easySurvival,
        difficult_destroy: diffDestroy,
        difficult_survival: diffSurvival
    };
}

export function normalizeSelectedDeck(rawDeck) {
    const defaultDeck = [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'tank', 'airstrike'];
    if (!Array.isArray(rawDeck) || rawDeck.length < 4) {
        return [...defaultDeck];
    }
    const chosen = [];
    for (let i = 0; i < 4; i++) {
        const uId = normalizeUnitId(rawDeck[i]);
        if (uId && uId !== 'airstrike' && UNIT_BY_ID[uId] && !chosen.includes(uId)) {
            chosen.push(uId);
        }
    }
    const fallbackPool = [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'tank', 'sniper', 'apc'];
    for (const fb of fallbackPool) {
        if (chosen.length >= 4) break;
        if (!chosen.includes(fb)) chosen.push(fb);
    }
    return [chosen[0], chosen[1], chosen[2], chosen[3], 'airstrike'];
}

export function syncLegacyEngineBridges() {
    const infLv = Math.max(
        metaState.armyPermanentLevels?.infantry || 1,
        metaState.armyPermanentLevels?.rifleman || 1
    );
    metaState.armyPermanentLevels.infantry = infLv;
    metaState.armyPermanentLevels.rifleman = infLv;

    UNIT_CATALOG.forEach(u => {
        if (!metaState.armyPermanentLevels[u.id] || metaState.armyPermanentLevels[u.id] < 1) {
            metaState.armyPermanentLevels[u.id] = 1;
        }
        if (!Array.isArray(metaState.unitSockets[u.id])) {
            metaState.unitSockets[u.id] = [u.defaultChips?.[0] || null, u.defaultChips?.[1] || null];
        }
    });

    const infSockets =
        metaState.unitSockets?.[PRIMARY_INFANTRY_ID] ||
        metaState.unitSockets?.infantry ||
        metaState.unitSockets?.rifleman ||
        ['overclock_core', null];
    metaState.unitSockets.infantry = infSockets;
    metaState.unitSockets.rifleman = infSockets;

    const eq = {};
    Object.keys(metaState.unitSockets || {}).forEach(uId => {
        const arr = metaState.unitSockets[uId];
        if (Array.isArray(arr)) {
            eq[uId] = arr[0] || arr[1] || null;
        }
    });
    metaState.equippedChips = eq;

    const oilLv = Number(metaState.metaTalents?.oil_refining) || 0;
    const steelLv = Number(metaState.metaTalents?.high_grade_steel) || 0;
    const logiLv = Number(metaState.metaTalents?.optimal_logistics) || 0;

    metaState.talents = {
        gas_speed: oilLv,
        infantry_hp: steelLv,
        vehicle_dmg: steelLv,
        base_fortify: steelLv,
        starting_gas: logiLv,
        tactic_cd: logiLv,
        air_naval_cd: logiLv,
        gold_rush: logiLv
    };

    if (!metaState.baseTurret || typeof metaState.baseTurret !== 'object') {
        metaState.baseTurret = { type: 'gatling', level: 1 };
    }
    if (!BASE_TURRET_CONFIG[metaState.baseTurret.type]) {
        metaState.baseTurret.type = 'gatling';
    }
    metaState.baseTurret.level = Math.max(1, Math.floor(Number(metaState.baseTurret.level) || 1));

    metaState.selectedDeck = normalizeSelectedDeck(metaState.selectedDeck);
    syncHighestRarityEverOwnedFromStacks();
}

export function loadProgress() {
    const defaultLevels = createDefaultArmyLevels();
    const defaultMapProg = createDefaultMapDifficultyProgress();
    const defaultSockets = createDefaultUnitSockets();

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            metaState.playerName = typeof parsed.playerName === 'string' ? parsed.playerName : '';
            metaState.coins = typeof parsed.coins === 'number' ? parsed.coins : 350;
            metaState.gems = typeof parsed.gems === 'number' ? parsed.gems : 400;
            metaState.medals = typeof parsed.medals === 'number' ? parsed.medals : 5;
            metaState.isAdminMode = !!parsed.isAdminMode;
            metaState.usedCodes = Array.isArray(parsed.usedCodes) ? parsed.usedCodes : [];
            metaState.endlessBestWave = Number(parsed.endlessBestWave) || 0;
            metaState.autobattlerWins = Number(parsed.autobattlerWins) || 0;
            metaState.raidBossClears = Number(parsed.raidBossClears) || 0;

            metaState.wheelPity = Math.max(0, Math.min(100, Number(parsed.wheelPity) || 0));
            metaState.wheelSkipAnim = !!parsed.wheelSkipAnim;
            metaState.wheelJackpotTotal = Math.max(0, Math.floor(Number(parsed.wheelJackpotTotal) || 0));
            metaState.wheelJackpotHistory = Array.isArray(parsed.wheelJackpotHistory)
                ? parsed.wheelJackpotHistory.slice(0, 15)
                : [];

            metaState.baseTurret = {
                type: BASE_TURRET_CONFIG[parsed.baseTurret?.type] ? parsed.baseTurret.type : 'gatling',
                level: Math.max(1, Math.floor(Number(parsed.baseTurret?.level) || 1))
            };

            metaState.highestRarityEverOwned =
                parsed.highestRarityEverOwned && typeof parsed.highestRarityEverOwned === 'object'
                    ? { ...parsed.highestRarityEverOwned }
                    : {};

            metaState.codexClaimed =
                parsed.codexClaimed && typeof parsed.codexClaimed === 'object'
                    ? { ...parsed.codexClaimed }
                    : {};

            metaState.mapDifficultyProgress = defaultMapProg;
            if (parsed.mapDifficultyProgress && typeof parsed.mapDifficultyProgress === 'object') {
                for (let i = 1; i <= LEVELS.length; i++) {
                    if (parsed.mapDifficultyProgress[i]) {
                        metaState.mapDifficultyProgress[i] = normalizeMapProgressEntry(parsed.mapDifficultyProgress[i]);
                    }
                }
            }

            const loadedStacks = {};
            if (parsed.inventoryStacks && typeof parsed.inventoryStacks === 'object') {
                for (const [key, count] of Object.entries(parsed.inventoryStacks)) {
                    const [rawUnitId, rarity] = key.split('__');
                    const unitId = normalizeUnitId(rawUnitId);
                    const qty = Math.max(0, Math.floor(Number(count) || 0));
                    if (UNIT_BY_ID[unitId] && RARITY_CONFIG[rarity] && qty > 0) {
                        const normKey = `${unitId}__${rarity}`;
                        loadedStacks[normKey] = (loadedStacks[normKey] || 0) + qty;
                    }
                }
            }
            if (Object.keys(loadedStacks).length === 0 && Array.isArray(parsed.inventory) && parsed.inventory.length > 0) {
                parsed.inventory.forEach(item => {
                    if (!item) return;
                    const normId = normalizeUnitId(item.unitId);
                    if (UNIT_BY_ID[normId] && RARITY_CONFIG[item.rarity]) {
                        const key = `${normId}__${item.rarity}`;
                        loadedStacks[key] = (loadedStacks[key] || 0) + 1;
                    }
                });
            }

            metaState.inventoryStacks = Object.keys(loadedStacks).length > 0
                ? loadedStacks
                : createDefaultInventoryStacks();
            syncRepresentativeInventoryFromStacks();

            metaState.armyPermanentLevels = { ...defaultLevels, ...(parsed.armyPermanentLevels || {}) };

            const mp = parsed.missionsProgress || {};
            metaState.missionsProgress = {
                kills: Number(mp.kills) || 0,
                diffWins: Number(mp.diffWins) || 0,
                spawns: Number(mp.spawns) || 0,
                cratesOpened: Number(mp.cratesOpened) || 0,
                merges: Number(mp.merges) || 0,
                wins: Number(mp.wins) || 0,
                upgrades: Number(mp.upgrades) || 0,
                claimed: mp.claimed && typeof mp.claimed === 'object' ? mp.claimed : {}
            };

            metaState.metaTalents = {
                oil_refining: 0,
                high_grade_steel: 0,
                optimal_logistics: 0,
                ...(parsed.metaTalents || {})
            };

            metaState.unitSockets = {
                ...defaultSockets,
                ...(parsed.unitSockets || {})
            };

            metaState.selectedDeck = normalizeSelectedDeck(parsed.selectedDeck);
        } else {
            metaState.playerName = '';
            metaState.coins = 350;
            metaState.gems = 400;
            metaState.medals = 5;
            metaState.isAdminMode = false;
            metaState.usedCodes = [];
            metaState.mapDifficultyProgress = defaultMapProg;
            metaState.inventoryStacks = createDefaultInventoryStacks();
            syncRepresentativeInventoryFromStacks();
            metaState.armyPermanentLevels = defaultLevels;
            metaState.unitSockets = defaultSockets;
            metaState.selectedDeck = normalizeSelectedDeck(null);
            metaState.wheelPity = 0;
            metaState.wheelSkipAnim = false;
            metaState.wheelJackpotTotal = 0;
            metaState.wheelJackpotHistory = [];
            metaState.baseTurret = { type: 'gatling', level: 1 };
            metaState.highestRarityEverOwned = {};
            metaState.codexClaimed = {};
        }
    } catch (e) {
        metaState.mapDifficultyProgress = defaultMapProg;
        metaState.inventoryStacks = createDefaultInventoryStacks();
        syncRepresentativeInventoryFromStacks();
        metaState.armyPermanentLevels = defaultLevels;
        metaState.unitSockets = defaultSockets;
        metaState.selectedDeck = normalizeSelectedDeck(null);
        metaState.baseTurret = { type: 'gatling', level: 1 };
        metaState.highestRarityEverOwned = {};
        metaState.codexClaimed = {};
    }

    syncLegacyEngineBridges();
}

export function saveProgress() {
    syncLegacyEngineBridges();
    syncRepresentativeInventoryFromStacks();
    try {
        const compactPayload = {
            ...metaState,
            inventory: metaState.inventory,
            inventoryStacks: metaState.inventoryStacks
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compactPayload));
    } catch (e) {}
}

export function resetAllAccountData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    window.location.reload();
}

export function isDifficultyCleared(mapLv, diffId) {
    const prog = metaState.mapDifficultyProgress[mapLv];
    if (!prog) return false;
    if (diffId === 'easy') {
        return !!(prog.easy || prog.easy_destroy || prog.easy_survival);
    }
    if (diffId === 'difficult') {
        return !!(prog.difficult || prog.difficult_destroy || prog.difficult_survival);
    }
    return false;
}

export function isDifficultyModeCleared(mapLv, diffId, modeId) {
    const prog = metaState.mapDifficultyProgress[mapLv];
    if (!prog) return false;
    const key = `${diffId}_${modeId}`;
    return !!prog[key];
}

export function getMaxUnlockedMapLevel() {
    if (metaState.isAdminMode) return LEVELS.length;
    let maxLv = 1;
    for (let i = 1; i < LEVELS.length; i++) {
        if (isDifficultyCleared(i, 'easy')) {
            maxLv = i + 1;
        } else {
            break;
        }
    }
    return maxLv;
}

export function isDifficultyUnlocked(mapLv, diffId) {
    if (metaState.isAdminMode) return true;
    if (mapLv > getMaxUnlockedMapLevel()) return false;
    if (diffId === 'easy') return true;
    if (diffId === 'difficult') return isDifficultyCleared(mapLv, 'easy');
    return false;
}

export function getDefaultDifficultyForMap(mapLv) {
    if (!isDifficultyCleared(mapLv, 'easy')) return 'easy';
    return 'difficult';
}

export function getHighestRarityForUnit(unitId) {
    const targetId = normalizeUnitId(unitId);
    let bestRarity = 'common';
    let bestRank = -1;

    if (metaState.inventoryStacks && typeof metaState.inventoryStacks === 'object') {
        for (let rIdx = RARITY_ORDER.length - 1; rIdx >= 0; rIdx--) {
            const rKey = RARITY_ORDER[rIdx];
            const stackCount = metaState.inventoryStacks[`${targetId}__${rKey}`] || 0;
            if (stackCount > 0) {
                return rKey;
            }
        }
    }

    for (let i = 0; i < metaState.inventory.length; i++) {
        const card = metaState.inventory[i];
        if (normalizeUnitId(card.unitId) === targetId) {
            const cfg = RARITY_CONFIG[card.rarity];
            if (cfg && cfg.rank > bestRank) {
                bestRank = cfg.rank;
                bestRarity = card.rarity;
                if (bestRank >= MAX_RARITY_RANK) break;
            }
        }
    }
    return bestRarity;
}

export function getHighestEverRarityRankForUnit(unitId) {
    const targetId = normalizeUnitId(unitId);
    const currentBest = getHighestRarityForUnit(targetId);
    const curRank = hasUnitInInventory(targetId)
        ? (RARITY_CONFIG[currentBest]?.rank ?? 0)
        : -1;
    const histRarity = metaState.highestRarityEverOwned?.[targetId];
    const histRank = histRarity && RARITY_CONFIG[histRarity] ? RARITY_CONFIG[histRarity].rank : -1;
    return Math.max(curRank, histRank);
}

export function hasClaimableCodexMilestones() {
    for (const u of UNIT_CATALOG) {
        const maxRank = getHighestEverRarityRankForUnit(u.id);
        for (const ms of CODEX_MILESTONES) {
            const claimKey = `${u.id}__${ms.id}`;
            if (maxRank >= ms.minRank && !metaState.codexClaimed?.[claimKey]) {
                return true;
            }
        }
    }
    return false;
}

export function hasUnitInInventory(unitId) {
    const targetId = normalizeUnitId(unitId);
    if (metaState.inventoryStacks && typeof metaState.inventoryStacks === 'object') {
        for (let rIdx = 0; rIdx < RARITY_ORDER.length; rIdx++) {
            if ((metaState.inventoryStacks[`${targetId}__${RARITY_ORDER[rIdx]}`] || 0) > 0) {
                return true;
            }
        }
    }
    return metaState.inventory.some(c => normalizeUnitId(c.unitId) === targetId);
}

export function calcTotalRefundCoins(targetLv, currentLv) {
    return calcTotalRefundCoinsFast(targetLv, curLvOrNumber(currentLv));
}

function curLvOrNumber(val) {
    return Math.max(1, Math.floor(Number(val) || 1));
}

export function getUpgradeTierBracketText(currentLv) {
    const block = Math.floor((currentLv - 1) / 5);
    const startLv = block * 5 + 1;
    const endLv = startLv + 4;
    const stepPrice = getUnitUpgradeCost(currentLv);
    return `Khung giá Cấp ${startLv}-${endLv}: 🪙 ${stepPrice.toLocaleString('en-US')} / cấp`;
}

export function formatCurrency(val) {
    if (metaState.isAdminMode) return '∞';
    const n = Math.floor(Number(val) || 0);
    return n.toLocaleString('en-US');
}