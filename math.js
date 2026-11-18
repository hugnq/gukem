/* ============================================================================
   TINY BATTLE - HIGH-PERFORMANCE MATH & PROBABILITY UTILITIES (js/math.js)
   O(1) Bulk Upgrade & Refund Math • Multinomial Crate Simulation (Up to 1B Crates)
   ============================================================================ */

import {
    CRATE_CONFIG,
    MAX_CRATE_OPEN_QTY,
    UPGRADE_TIER_BASE_PRICES,
    UNIT_CATALOG
} from './config.js';
import { PRIMARY_INFANTRY_ID, normalizeUnitId } from './state.js';

/**
 * Rung phản hồi xúc giác (Haptic Feedback) cho thiết bị di động
 */
export function triggerHaptic(durationMs = 15) {
    try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(durationMs);
        }
    } catch (e) {}
}

/**
 * Định dạng số lớn gọn gàng (1.25K, 4.50M, 1.00B)
 */
export function formatCompactNumber(num) {
    const n = Math.floor(Number(num) || 0);
    if (n < 10000) return n.toLocaleString('en-US');
    if (n < 1000000) return (n / 1000).toFixed(2).replace(/\.00$/, '') + 'K';
    if (n < 1000000000) return (n / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
    return (n / 1000000000).toFixed(2).replace(/\.00$/, '') + 'B';
}

/**
 * Tính giá mở rương theo cụm 10 (Giảm 10% cho mỗi cụm 10 rương)
 */
export function calcCrateBatchPrice(crateType, rawQty) {
    const cfg = CRATE_CONFIG[crateType] || CRATE_CONFIG.legendary;
    const qty = Math.max(1, Math.min(MAX_CRATE_OPEN_QTY, Math.floor(Number(rawQty) || 1)));
    const singlePrice = cfg.singlePrice || (crateType === 'legendary' ? 300 : 150);

    const bundlesOfTen = Math.floor(qty / 10);
    const rawCost = qty * singlePrice;
    const savedGems = Math.round(bundlesOfTen * 10 * singlePrice * 0.1);
    const finalCost = Math.max(0, rawCost - savedGems);

    return {
        qty,
        singlePrice,
        bundlesOfTen,
        rawCost,
        savedGems,
        finalCost
    };
}

/**
 * Lấy giá nâng cấp 1 cấp độ tại mức currentLevel (khung giá cố định mỗi 5 cấp)
 */
export function getUnitUpgradeCost(currentLevel) {
    const lv = Math.max(1, Math.floor(Number(currentLevel) || 1));
    const bracketIndex = Math.floor((lv - 1) / 5);
    if (bracketIndex < UPGRADE_TIER_BASE_PRICES.length) {
        return UPGRADE_TIER_BASE_PRICES[bracketIndex];
    }
    const extraBrackets = bracketIndex - (UPGRADE_TIER_BASE_PRICES.length - 1);
    const lastBase = UPGRADE_TIER_BASE_PRICES[UPGRADE_TIER_BASE_PRICES.length - 1];
    return Math.round(lastBase * Math.pow(1.45, Math.min(extraBrackets, 40)));
}

/**
 * Tính tổng chi phí Vàng để nâng thêm addLevels cấp trong O(1)
 */
export function calcBulkUpgradeTotalCost(currentLevel, addLevels) {
    const startLv = Math.max(1, Math.floor(Number(currentLevel) || 1));
    const count = Math.max(0, Math.floor(Number(addLevels) || 0));
    if (count <= 0) return 0;

    const endLv = startLv + count - 1;
    const startBracket = Math.floor((startLv - 1) / 5);
    const endBracket = Math.floor((endLv - 1) / 5);

    if (startBracket === endBracket) {
        return count * getUnitUpgradeCost(startLv);
    }

    let totalCoins = 0;
    const firstBracketEnd = (startBracket + 1) * 5;
    totalCoins += (firstBracketEnd - startLv + 1) * getUnitUpgradeCost(startLv);

    if (endBracket - startBracket - 1 > 500) {
        totalCoins += (endBracket - startBracket - 1) * 5 * getUnitUpgradeCost(endLv);
    } else {
        for (let b = startBracket + 1; b < endBracket; b++) {
            totalCoins += 5 * getUnitUpgradeCost(b * 5 + 1);
        }
    }

    const lastBracketStart = endBracket * 5 + 1;
    totalCoins += (endLv - lastBracketStart + 1) * getUnitUpgradeCost(endLv);

    return totalCoins;
}

export const calcBulkUpgradeCost = calcBulkUpgradeTotalCost;

/**
 * Tính số cấp tối đa có thể nâng với lượng Vàng hiện có (Binary Search O(log N))
 */
export function calcMaxAffordableLevels(currentLevel, availableCoins, isAdmin = false) {
    if (isAdmin) return 100;
    const coins = Math.max(0, Math.floor(Number(availableCoins) || 0));
    const startLv = Math.max(1, Math.floor(Number(currentLevel) || 1));
    if (coins < getUnitUpgradeCost(startLv)) return 1;

    let low = 1;
    let high = 10000;
    let best = 1;

    while (low <= high) {
        const mid = (low + high) >>> 1;
        const cost = calcBulkUpgradeTotalCost(startLv, mid);
        if (cost <= coins) {
            best = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return best;
}

/**
 * Hoàn trả 100% Vàng khi hạ từ currentLv về targetLv trong O(1)
 */
export function calcTotalRefundCoinsFast(targetLv, currentLv) {
    const t = Math.max(1, Math.floor(Number(targetLv) || 1));
    const c = Math.max(1, Math.floor(Number(currentLv) || 1));
    if (t >= c) return 0;
    return calcBulkUpgradeTotalCost(t, c - t);
}

/**
 * Mô phỏng mở rương số lượng lớn (từ 1 đến 1 Tỷ rương) trong < 0.05s (O(1))
 */
export function simulateMassiveCrateOpening(crateType, rawCount, customUnitIds = null) {
    const count = Math.max(1, Math.min(MAX_CRATE_OPEN_QTY, Math.floor(Number(rawCount) || 1)));
    const cfg = CRATE_CONFIG[crateType] || CRATE_CONFIG.epic;
    const rateList = cfg.rates || [];

    const unitIds = Array.isArray(customUnitIds) && customUnitIds.length > 0
        ? customUnitIds
        : UNIT_CATALOG.map(u => normalizeUnitId(u.id || PRIMARY_INFANTRY_ID));
    const numUnits = unitIds.length;

    const rarityTotals = {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 0
    };
    const countsByKey = {};
    const sampleCards = [];

    if (count <= 2000) {
        for (let i = 0; i < count; i++) {
            const r = Math.random() * 100;
            let acc = 0;
            let pickedRarity = rateList[0]?.rarity || 'common';
            for (let j = 0; j < rateList.length; j++) {
                acc += rateList[j].weight;
                if (r <= acc) {
                    pickedRarity = rateList[j].rarity;
                    break;
                }
            }
            const pickedUnitId = unitIds[(Math.random() * numUnits) | 0];
            rarityTotals[pickedRarity] = (rarityTotals[pickedRarity] || 0) + 1;
            const key = `${pickedUnitId}__${pickedRarity}`;
            countsByKey[key] = (countsByKey[key] || 0) + 1;
            if (sampleCards.length < 15) {
                sampleCards.push({ unitId: pickedUnitId, rarity: pickedRarity });
            }
        }
        return {
            rarityTotals,
            countsByKey,
            unitRarityStacks: countsByKey,
            sampleCards
        };
    }

    let remainingCrates = count;
    for (let i = 0; i < rateList.length; i++) {
        const entry = rateList[i];
        if (i === rateList.length - 1) {
            rarityTotals[entry.rarity] = Math.max(0, remainingCrates);
        } else {
            const p = entry.weight / 100;
            const mean = count * p;
            const stdDev = Math.sqrt(count * p * (1 - p));
            const u1 = Math.max(1e-7, Math.random());
            const u2 = Math.random();
            const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const sampled = Math.max(0, Math.min(remainingCrates, Math.round(mean + z0 * stdDev)));
            rarityTotals[entry.rarity] = sampled;
            remainingCrates -= sampled;
        }
    }

    for (const [rKey, rTotal] of Object.entries(rarityTotals)) {
        if (rTotal <= 0) continue;
        const basePerUnit = Math.floor(rTotal / numUnits);
        let remainder = rTotal % numUnits;

        const randOffset = (Math.random() * numUnits) | 0;
        for (let uIdx = 0; uIdx < numUnits; uIdx++) {
            const actualIdx = (uIdx + randOffset) % numUnits;
            const uId = unitIds[actualIdx];
            const bonus = remainder > 0 ? 1 : 0;
            if (remainder > 0) remainder--;
            const finalUnitCount = basePerUnit + bonus;
            if (finalUnitCount > 0) {
                countsByKey[`${uId}__${rKey}`] = finalUnitCount;
            }
        }
    }

    return {
        rarityTotals,
        countsByKey,
        unitRarityStacks: countsByKey,
        sampleCards
    };
}

export const simulateBulkCrateOpeningO1 = simulateMassiveCrateOpening;