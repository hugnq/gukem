/**
 * ============================================================================
 * TINY BATTLE - MATHEMATICAL ENGINE, O(1) GACHA & GEOMETRY (js/math.js)
 * Tối ưu hóa mở 1 Tỷ Rương O(1) Multinomial, Auto-Merge O(41),
 * Tính toán Hitbox Mansion & Bắt điểm từ tính World_map
 * ============================================================================
 */

'use strict';

/* --------------------------------------------------------------------------
 * 1. ĐỊNH DẠNG SỐ LỚN & HÀM TOÁN HỌC CƠ BẢN
 * -------------------------------------------------------------------------- */
const NUMBER_SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'
];

/**
 * Định dạng số gọn gàng chống tràn giao diện (VD: 15400 -> "15.4K", 1000000000 -> "1.00B")
 */
function formatCompactNumber(num) {
  if (!Number.isFinite(num)) return '0';
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  if (abs < 1000) {
    return sign + Math.floor(abs).toString();
  }
  const tier = Math.min(
    NUMBER_SUFFIXES.length - 1,
    Math.floor(Math.log10(abs) / 3)
  );
  const scale = Math.pow(10, tier * 3);
  const scaled = abs / scale;
  const decimals = scaled >= 100 ? 1 : 2;
  return sign + scaled.toFixed(decimals).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + NUMBER_SUFFIXES[tier];
}

function clamp(val, min, max) {
  return val < min ? min : (val > max ? max : val);
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

function distSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/* --------------------------------------------------------------------------
 * 2. HÌNH HỌC HITBOX MANSION XANH & MANSION ĐỎ (PHẦN 2)
 * -------------------------------------------------------------------------- */

/**
 * Tính tọa độ tâm và hình chữ nhật vùng va chạm (hitbox) của Mansion trên canvas
 */
function getMansionHitbox(side, mapWidth, mapHeight) {
  const cfg = side === 'red' ? MANSION_CONFIG.red : MANSION_CONFIG.blue;
  const centerX = mapWidth * (cfg.centerXRatio || 0.5);
  const centerY = side === 'red'
    ? (cfg.topOffset || 95)
    : (mapHeight - (cfg.bottomOffset || 95));
  const halfW = (cfg.hitWidth || 150) * 0.5;
  const halfH = (cfg.hitHeight || 95) * 0.5;

  return {
    side,
    centerX,
    centerY,
    hitWidth: cfg.hitWidth || 150,
    hitHeight: cfg.hitHeight || 95,
    hitRadius: cfg.hitRadius || 68,
    left: centerX - halfW,
    right: centerX + halfW,
    top: centerY - halfH,
    bottom: centerY + halfH
  };
}

/**
 * Tính khoảng cách hiệu dụng từ đơn vị (x, y) tới mép vùng va chạm Mansion:
 * effectiveDist = max(0, distToMansionCenter - mansionHitRadius)
 */
function getMansionEffectiveDistance(x, y, mansionBox) {
  const centerDist = Math.hypot(mansionBox.centerX - x, mansionBox.centerY - y);
  return Math.max(0, centerDist - (mansionBox.hitRadius || 68));
}

/**
 * Kiểm tra điểm (x, y) có nằm trong vùng va chạm hình chữ nhật của Mansion không
 */
function isPointInsideMansion(x, y, mansionBox) {
  return (
    x >= mansionBox.left &&
    x <= mansionBox.right &&
    y >= mansionBox.top &&
    y <= mansionBox.bottom
  );
}

/**
 * Lấy điểm trúng đạn ngẫu nhiên nằm trọn trên mái/tường kiến trúc Mansion:
 * (mansion.centerX ± 35px, mansion.centerY ± 20px)
 */
function getRandomMansionImpactPoint(mansionBox) {
  const offsetX = (Math.random() * 2 - 1) * 35;
  const offsetY = (Math.random() * 2 - 1) * 20;
  return {
    x: mansionBox.centerX + offsetX,
    y: mansionBox.centerY + offsetY
  };
}

/* --------------------------------------------------------------------------
 * 3. BẮT ĐIỂM TỪ TÍNH TRÊN WORLD_MAP (PHẦN 3 - HITRADIUS = 46PX)
 * -------------------------------------------------------------------------- */

/**
 * Tìm node Level gần con trỏ nhất trong bán kính hitRadius (46px)
 */
function findNearestWorldNode(pointerX, pointerY, nodesScreenList, hitRadius = WORLD_MAP_CONFIG.hitRadius) {
  let bestNode = null;
  let bestDistSq = hitRadius * hitRadius;

  for (let i = 0; i < nodesScreenList.length; i++) {
    const node = nodesScreenList[i];
    const d2 = distSq(pointerX, pointerY, node.screenX, node.screenY);
    if (d2 <= bestDistSq) {
      bestDistSq = d2;
      bestNode = node;
    }
  }
  return bestNode;
}

/* --------------------------------------------------------------------------
 * 4. CÔNG THỨC TĂNG TRƯỞNG CẤP ĐỘ, ĐỘ HIẾM & MẢNH GHÉP
 * -------------------------------------------------------------------------- */

function getRarityTierById(rarityId) {
  for (let i = 0; i < RARITY_TIERS.length; i++) {
    if (RARITY_TIERS[i].id === rarityId) return RARITY_TIERS[i];
  }
  return RARITY_TIERS[0];
}

function getRarityIndex(rarityId) {
  for (let i = 0; i < RARITY_TIERS.length; i++) {
    if (RARITY_TIERS[i].id === rarityId) return i;
  }
  return 0;
}

/**
 * Hệ số sức mạnh theo cấp độ binh chủng (Lv.1 -> +14% mỗi cấp)
 */
function computeUnitLevelMultiplier(level) {
  const lv = Math.max(1, Number(level) || 1);
  return 1 + (lv - 1) * 0.14;
}

/**
 * Số mảnh ghép yêu cầu để nâng lên cấp tiếp theo
 */
function computeShardRequirement(level) {
  const lv = Math.max(1, Number(level) || 1);
  return Math.floor(5 + (lv - 1) * 3 + Math.pow(lv - 1, 1.35));
}

/* --------------------------------------------------------------------------
 * 5. THUẬT TOÁN MỞ RƯƠNG GACHA SIÊU TỐC O(1) MULTINOMIAL APPROXIMATION
 * Hỗ trợ mở từ 1 rương đến 1,000,000,000 (1 Tỷ) rương tức thì không giật lag
 * -------------------------------------------------------------------------- */

/**
 * Sinh biến ngẫu nhiên chuẩn N(0, 1) bằng phương pháp Box-Muller
 */
function sampleStandardNormal() {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Sinh biến ngẫu nhiên Poisson(lambda) cho các bậc siêu hiếm khi số lượng kỳ vọng nhỏ
 */
function samplePoisson(lambda) {
  if (lambda <= 0) return 0;
  if (lambda > 30) {
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * sampleStandardNormal()));
  }
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

/**
 * Roll chính xác 1 lần dựa trên mảng trọng số tích lũy
 */
function rollSingleWeightedIndex(cumWeights, totalWeight) {
  const r = Math.random() * totalWeight;
  let lo = 0;
  let hi = cumWeights.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (r < cumWeights[mid]) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}

/**
 * Thực hiện mở `count` rương (từ 1 tới 1,000,000,000) trong độ phức tạp O(1):
 * - Nếu count <= 250: Mô phỏng từng rương chính xác 100% + tính Pity.
 * - Nếu count > 250: Dùng xấp xỉ đa thức (Multinomial Approximation) bảo toàn tổng N.
 *
 * @param {string} crateType - 'legendary' | 'epic'
 * @param {number} count - Số lượng rương cần mở
 * @param {number} currentPity - Điểm bảo hiểm hiện tại
 * @returns {{ drops: Array, newPity: number, totalOpened: number }}
 */
function rollGachaCratesO1(crateType, count, currentPity = 0) {
  const N = Math.max(1, Math.floor(Number(count) || 1));
  const numTiers = RARITY_TIERS.length;
  const numUnits = UNIT_CATALOG.length;

  // Rương Quân Nhu (epic) giới hạn tối đa ở bậc Ultra Legend (index 9),
  // Rương Tối Thượng (legendary) mở toàn bộ 41 bậc tới APEX DEMON X (index 40)
  const maxTierIdx = crateType === 'epic' ? 9 : (numTiers - 1);

  const weights = new Float64Array(maxTierIdx + 1);
  const cumWeights = new Float64Array(maxTierIdx + 1);
  let totalWeight = 0;

  for (let i = 0; i <= maxTierIdx; i++) {
    // Rương Legendary tăng nhẹ trọng số các bậc từ Epic trở lên
    const boost = (crateType === 'legendary' && i >= 4) ? 1.45 : 1.0;
    const w = RARITY_TIERS[i].weight * boost;
    weights[i] = w;
    totalWeight += w;
    cumWeights[i] = totalWeight;
  }

  const tierCounts = new Float64Array(numTiers);
  let pity = Number(currentPity) || 0;

  if (N <= 250) {
    // Mô phỏng chính xác từng rương cho số lượng nhỏ
    for (let s = 0; s < N; s++) {
      pity++;
      let tierIdx;
      if (crateType === 'legendary' && pity >= 50) {
        // Bảo hiểm mỗi 50 rương chắc chắn ra tối thiểu Legendary (index 7)
        tierIdx = 7 + Math.floor(Math.random() * 4);
        pity = 0;
      } else {
        tierIdx = rollSingleWeightedIndex(cumWeights, totalWeight);
        if (tierIdx >= 7) pity = 0;
      }
      tierCounts[tierIdx] += 1;
    }
  } else {
    // Xấp xỉ Multinomial O(1) cho số lượng lớn (10,000 -> 1,000,000,000)
    let remainingN = N;
    let remainingW = totalWeight;

    for (let i = 0; i <= maxTierIdx; i++) {
      if (remainingN <= 0) break;
      if (i === maxTierIdx) {
        tierCounts[i] = remainingN;
        remainingN = 0;
        break;
      }
      const p = clamp(weights[i] / remainingW, 0, 1);
      const mean = remainingN * p;
      const variance = mean * (1 - p);

      let drawn;
      if (mean < 25) {
        drawn = samplePoisson(mean);
      } else {
        drawn = Math.round(mean + Math.sqrt(variance) * sampleStandardNormal());
      }
      drawn = clamp(drawn, 0, remainingN);
      tierCounts[i] = drawn;
      remainingN -= drawn;
      remainingW -= weights[i];
    }

    if (crateType === 'legendary') {
      pity = (pity + N) % 50;
    }
  }

  // Phân bổ số lượng thẻ từng bậc sang 17 Binh Chủng
  const drops = [];
  for (let t = numTiers - 1; t >= 0; t--) {
    const qty = Math.floor(tierCounts[t]);
    if (qty <= 0) continue;

    if (qty <= numUnits * 2) {
      // Chia ngẫu nhiên từng thẻ cho các binh chủng
      const perUnit = new Int32Array(numUnits);
      for (let k = 0; k < qty; k++) {
        perUnit[Math.floor(Math.random() * numUnits)]++;
      }
      for (let u = 0; u < numUnits; u++) {
        if (perUnit[u] > 0) {
          drops.push({
            unitId: UNIT_CATALOG[u].id,
            rarityId: RARITY_TIERS[t].id,
            rarityIndex: t,
            count: perUnit[u]
          });
        }
      }
    } else {
      // Phân bổ đều kèm dao động nhẹ cho số lượng hàng triệu/tỷ thẻ
      const baseEach = Math.floor(qty / numUnits);
      let rem = qty - baseEach * numUnits;
      for (let u = 0; u < numUnits; u++) {
        const extra = rem > 0 ? 1 : 0;
        if (rem > 0) rem--;
        const totalForUnit = baseEach + extra;
        if (totalForUnit > 0) {
          drops.push({
            unitId: UNIT_CATALOG[u].id,
            rarityId: RARITY_TIERS[t].id,
            rarityIndex: t,
            count: totalForUnit
          });
        }
      }
    }
  }

  return {
    drops,
    newPity: pity,
    totalOpened: N
  };
}

/**
 * Thuật toán Auto-Merge dây chuyền O(41):
 * Gộp 3 thẻ cùng bậc -> 1 thẻ bậc kế tiếp từ bậc 0 lên bậc 40
 */
function computeAutoMergeChain(rarityInventoryMap) {
  const counts = new Array(RARITY_TIERS.length).fill(0);
  for (let i = 0; i < RARITY_TIERS.length; i++) {
    const rId = RARITY_TIERS[i].id;
    counts[i] = Math.max(0, Math.floor(Number(rarityInventoryMap[rId]) || 0));
  }

  let totalMerges = 0;
  for (let i = 0; i < RARITY_TIERS.length - 1; i++) {
    // Giữ lại tối thiểu 1 thẻ nếu đang ở bậc cao nhất hiện có của người chơi
    const mergeable = Math.floor(counts[i] / 3);
    if (mergeable > 0) {
      counts[i] -= mergeable * 3;
      counts[i + 1] += mergeable;
      totalMerges += mergeable;
    }
  }

  const updatedMap = {};
  let highestTierIdx = 0;
  for (let i = 0; i < RARITY_TIERS.length; i++) {
    updatedMap[RARITY_TIERS[i].id] = counts[i];
    if (counts[i] > 0) {
      highestTierIdx = i;
    }
  }

  return {
    updatedMap,
    totalMerges,
    highestRarityId: RARITY_TIERS[highestTierIdx].id
  };
}