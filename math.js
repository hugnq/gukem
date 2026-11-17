/* ============================================================================
   TINY BATTLE - O(1) ALGORITHMS & MATH UTILITIES (js/math.js)
   - Định dạng số lớn (K, M, B, T, Qa) & Haptic Feedback
   - Thuật toán Mở Rương Siêu Tốc O(1) lên tới 1,000,000,000 rương (< 0.005s)
   - Toán học khối O(1) tính chi phí Nâng cấp vượt cấp (+N Level & MAX) & Hoàn Vàng
   ============================================================================ */

import {
    MAX_CRATE_OPEN_QTY,
    CRATE_CONFIG,
    UPGRADE_TIER_BASE_PRICES,
    UNIT_CATALOG
} from './config.js';

/* 1. HỆ THỐNG PHẢN HỒI XÚC GIÁC (HAPTIC FEEDBACK) & ĐỊNH DẠNG SỐ LỚN */
export function triggerHaptic(duration = 15) {
    try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(duration);
        }
    } catch (e) {
        // Bỏ qua nếu thiết bị không hỗ trợ rung
    }
}

export function formatCompactNumber(val) {
    const n = Math.floor(Number(val) || 0);
    if (n >= 1e15) return `${(n / 1e15).toFixed(2).replace(/\.00$/, '')}Qa`;
    if (n >= 1e12) return `${(n / 1e12).toFixed(2).replace(/\.00$/, '')}T`;
    if (n >= 1e9)  return `${(n / 1e9).toFixed(2).replace(/\.00$/, '')}B`;
    if (n >= 1e6)  return `${(n / 1e6).toFixed(2).replace(/\.00$/, '')}M`;
    if (n >= 1e4)  return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    return n.toLocaleString('en-US');
}

/* 2. THUẬT TOÁN MỞ 1 TỶ RƯƠNG SIÊU TỐC O(1) (< 0.005 GIÂY) */

/**
 * Sinh biến ngẫu nhiên chuẩn tắc Z ~ N(0, 1) bằng phép biến đổi Box-Muller O(1)
 */
export function sampleStandardNormalBoxMuller() {
    let u1 = 0;
    let u2 = 0;
    while (u1 <= 1e-12) u1 = Math.random();
    u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Lấy mẫu phân phối Nhị thức B(n, p) bằng Xấp xỉ Chuẩn Box-Muller độ phức tạp O(1)
 */
export function sampleBinomialGaussianO1(n, p) {
    if (n <= 0 || p <= 0) return 0;
    if (p >= 1) return n;
    const mean = n * p;
    const variance = n * p * (1 - p);
    if (variance < 1e-9) return Math.round(mean);
    const std = Math.sqrt(variance);
    const z = sampleStandardNormalBoxMuller();
    const val = Math.round(mean + z * std);
    return Math.max(0, Math.min(n, val));
}

/**
 * Thuật toán Mở Rương Siêu Tốc O(1) từ 1 đến 1,000,000,000 (1 Tỷ) rương:
 * - Khi qty <= 1000: Quay ngẫu nhiên từng rương chính xác trên toàn bộ 17 binh chủng.
 * - Khi qty > 1000: Dùng Xấp xỉ Phân phối Chuẩn Đa thức (Box-Muller Gaussian Multinomial Approximation),
 *   chỉ thực hiện vài chục phép tính số học, hoàn thành trong < 0.005 giây và không tốn RAM.
 */
export function simulateBulkCrateOpeningO1(crateType, rawQty, unitIdsList = null) {
    const qty = Math.max(1, Math.min(MAX_CRATE_OPEN_QTY, Math.floor(Number(rawQty) || 1)));
    const cfg = CRATE_CONFIG[crateType] || CRATE_CONFIG.epic;
    const oddsTable = cfg.rates;
    const units = Array.isArray(unitIdsList) && unitIdsList.length > 0
        ? unitIdsList
        : UNIT_CATALOG.map(u => u.id);
    const numUnits = units.length;

    const rarityTotals = {};
    const unitRarityStacks = {}; // key: `${unitId}__${rarity}` -> count
    const sampleCards = [];      // Chỉ lưu tối đa 10 thẻ mẫu khi mở ít (qty <= 10)

    if (qty <= 1000) {
        for (let i = 0; i < qty; i++) {
            const rand = Math.random() * 100;
            let acc = 0;
            let pickedRarity = oddsTable[0].rarity;
            for (let k = 0; k < oddsTable.length; k++) {
                acc += oddsTable[k].weight;
                if (rand <= acc) {
                    pickedRarity = oddsTable[k].rarity;
                    break;
                }
            }
            const pickedUnitId = units[(Math.random() * numUnits) | 0];
            rarityTotals[pickedRarity] = (rarityTotals[pickedRarity] || 0) + 1;
            const key = `${pickedUnitId}__${pickedRarity}`;
            unitRarityStacks[key] = (unitRarityStacks[key] || 0) + 1;

            if (qty <= 10) {
                sampleCards.push({ unitId: pickedUnitId, rarity: pickedRarity });
            }
        }
    } else {
        // Thuật toán O(1) Box-Muller Gaussian Multinomial cho số lượng lớn lên tới 1 Tỷ rương
        let remainingQty = qty;
        let remainingWeight = 100.0;

        for (let i = 0; i < oddsTable.length; i++) {
            const entry = oddsTable[i];
            const rKey = entry.rarity;
            let rCount = 0;

            if (i === oddsTable.length - 1 || remainingWeight <= 0) {
                rCount = remainingQty;
            } else {
                const conditionalP = Math.max(0, Math.min(1, entry.weight / remainingWeight));
                rCount = sampleBinomialGaussianO1(remainingQty, conditionalP);
            }

            remainingQty -= rCount;
            remainingWeight -= entry.weight;

            if (rCount > 0) {
                rarityTotals[rKey] = rCount;
                let remUnitCount = rCount;
                for (let uIdx = 0; uIdx < numUnits; uIdx++) {
                    const uId = units[uIdx];
                    let uCount = 0;
                    if (uIdx === numUnits - 1 || remUnitCount <= 0) {
                        uCount = remUnitCount;
                    } else {
                        const condUnitP = 1 / (numUnits - uIdx);
                        uCount = sampleBinomialGaussianO1(remUnitCount, condUnitP);
                    }
                    remUnitCount -= uCount;
                    if (uCount > 0) {
                        const stackKey = `${uId}__${rKey}`;
                        unitRarityStacks[stackKey] = (unitRarityStacks[stackKey] || 0) + uCount;
                    }
                }
            }
        }
    }

    return {
        qty,
        rarityTotals,
        unitRarityStacks,
        sampleCards
    };
}

/* 3. TOÁN HỌC KHỐI O(1) CHO NÂNG CẤP NHÂN VẬT VƯỢT CẤP (+N CẤP TÙY Ý & MAX) */
export function getUnitUpgradeCost(currentLv) {
    const lv = Math.max(1, Math.floor(Number(currentLv) || 1));
    const tierBlock = Math.floor((lv - 1) / 5);
    return UPGRADE_TIER_BASE_PRICES[Math.min(tierBlock, UPGRADE_TIER_BASE_PRICES.length - 1)];
}

/**
 * Tính tổng Vàng để nâng từ `currentLv` thêm `addLevels` cấp bằng toán học khối O(1)
 */
export function calcBulkUpgradeCost(currentLv, addLevels) {
    const startLv = Math.max(1, Math.floor(Number(currentLv) || 1));
    const count = Math.max(0, Math.floor(Number(addLevels) || 0));
    if (count === 0) return 0;

    let totalCost = 0;
    let cur = startLv;
    let rem = count;
    const maxBracketIdx = UPGRADE_TIER_BASE_PRICES.length - 1;

    while (rem > 0) {
        const bracketIdx = Math.floor((cur - 1) / 5);
        if (bracketIdx >= maxBracketIdx) {
            totalCost += rem * UPGRADE_TIER_BASE_PRICES[maxBracketIdx];
            break;
        }
        const bracketEndLv = (bracketIdx + 1) * 5;
        const stepsInBracket = Math.min(rem, bracketEndLv - cur + 1);
        totalCost += stepsInBracket * UPGRADE_TIER_BASE_PRICES[bracketIdx];
        cur += stepsInBracket;
        rem -= stepsInBracket;
    }

    return totalCost;
}

/**
 * Tính số cấp tối đa (MAX) có thể nâng với lượng Vàng hiện có bằng toán học khối O(1)
 */
export function calcMaxAffordableLevels(currentLv, availableCoins, isAdminMode = false) {
    if (isAdminMode) return 100;
    const startLv = Math.max(1, Math.floor(Number(currentLv) || 1));
    let coins = Math.max(0, Math.floor(Number(availableCoins) || 0));
    const firstStepCost = getUnitUpgradeCost(startLv);
    if (coins < firstStepCost) return 1;

    let totalLevels = 0;
    let cur = startLv;
    const maxBracketIdx = UPGRADE_TIER_BASE_PRICES.length - 1;

    while (coins > 0) {
        const bracketIdx = Math.floor((cur - 1) / 5);
        const pricePerLv = UPGRADE_TIER_BASE_PRICES[Math.min(bracketIdx, maxBracketIdx)];

        if (bracketIdx >= maxBracketIdx) {
            const canBuy = Math.floor(coins / pricePerLv);
            totalLevels += canBuy;
            break;
        }

        const bracketEndLv = (bracketIdx + 1) * 5;
        const levelsLeftInBracket = bracketEndLv - cur + 1;
        const costForWholeBracket = levelsLeftInBracket * pricePerLv;

        if (coins >= costForWholeBracket) {
            coins -= costForWholeBracket;
            totalLevels += levelsLeftInBracket;
            cur += levelsLeftInBracket;
        } else {
            const canBuy = Math.floor(coins / pricePerLv);
            totalLevels += canBuy;
            break;
        }
    }

    return Math.max(1, Math.min(999999, totalLevels));
}

/**
 * Tính tổng Vàng hoàn lại 100% khi hạ từ `currentLv` về `targetLv` bằng toán học khối O(1)
 */
export function calcTotalRefundCoinsFast(targetLv, currentLv) {
    const start = Math.max(1, Math.floor(Number(targetLv) || 1));
    const end = Math.max(1, Math.floor(Number(currentLv) || 1));
    if (start >= end) return 0;
    return calcBulkUpgradeCost(start, end - start);
}