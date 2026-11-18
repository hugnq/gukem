/**
 * ============================================================================
 * TINY BATTLE - META & BATTLE STATE MANAGEMENT (js/state.js)
 * Quản lý dữ liệu người chơi (localStorage), Cây Kỹ Năng 6 nhánh, Ụ Pháo,
 * Đội hình 5/6 ô, Trạng thái trận đấu & Hitbox hai Mansion
 * ============================================================================
 */

'use strict';

const SAVE_STORAGE_KEY = 'tiny_battle_save_v2_2026';

/* --------------------------------------------------------------------------
 * 1. KHỞI TẠO TRẠNG THÁI META-GAME MẶC ĐỊNH
 * -------------------------------------------------------------------------- */
function createDefaultMetaState() {
  const units = {};
  UNIT_CATALOG.forEach((u, idx) => {
    const unlockedByDefault = idx < 3; // Mở sẵn Infantry, Bazooka, Sniper
    const rarityCounts = {};
    RARITY_TIERS.forEach((r) => {
      rarityCounts[r.id] = 0;
    });
    if (unlockedByDefault) {
      rarityCounts.common = 1;
    }

    units[u.id] = {
      unlocked: unlockedByDefault,
      level: 1,
      shards: 0,
      rarityId: 'common',
      rarityCounts,
      sockets: [null, null, null] // 3 ổ khảm Chip bổ trợ
    };
  });

  const turrets = {};
  TURRET_CATALOG.forEach((t, idx) => {
    turrets[t.id] = {
      unlocked: idx === 0, // Mở sẵn Ụ Pháo Gatling
      level: 1
    };
  });

  const skillTree = {};
  ANCIENT_SKILL_TREE.forEach((node) => {
    skillTree[node.id] = 0;
  });

  const metaTalents = {};
  META_TALENTS.forEach((t) => {
    metaTalents[t.id] = 0;
  });

  const chipInventory = {};
  CHIP_CATALOG.forEach((c) => {
    chipInventory[c.id] = 0;
  });

  return {
    playerName: 'Commander',
    playerLevel: 1,
    playerExp: 0,

    // 4 loại tiền tệ chính
    coins: 600,
    gems: 150,
    medals: 0,
    pearls: 3,

    // Tiến độ 54 màn Campaign & 54 màn Challenge
    selectedStage: 1,
    maxUnlockedStage: 1,
    stageStars: {},          // { [level]: 1..3 }
    challengeCleared: {},    // { [level]: true }
    starChestClaimed: 0,

    // Chế độ chơi đang chọn ở Sảnh
    selectedMode: 'campaign',

    // Dữ liệu Binh Chủng & Đội hình
    units,
    battleDeck: ['infantry', 'bazooka', 'sniper', null, null],
    challengeDeck: ['infantry', 'bazooka', 'sniper', null, null, null],

    // Ụ pháo gắn trên nóc Mansion Xanh
    turrets,
    equippedTurret: 'turret_gatling',

    // Cây Kỹ Năng 6 nhánh (36 nodes) & Thiên Phú
    skillTree,
    metaTalents,

    // Kho Chip & Gacha Pity
    chipInventory,
    gachaPity: 0,

    // Thống kê Nhiệm vụ & Giftcode đã nhập
    stats: {
      totalKills: 0,
      totalWins: 0,
      totalSummons: 0,
      totalCrates: 0
    },
    claimedMissions: {},
    redeemedCodes: {},

    // Cài đặt & Admin
    settings: {
      sfxEnabled: true,
      showDamageNumbers: true
    },
    isAdminMode: false
  };
}

let metaState = createDefaultMetaState();

/* --------------------------------------------------------------------------
 * 2. LƯU & TẢI DỮ LIỆU TIẾN TRÌNH (LOCALSTORAGE + SCHEMA MIGRATION)
 * -------------------------------------------------------------------------- */
function saveProgress() {
  try {
    // Không lưu cờ isAdminMode=true xuống ổ cứng để tránh tự bật lại khi tải trang
    const payload = Object.assign({}, metaState, {
      isAdminMode: false
    });
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[State] Không thể lưu tiến trình vào localStorage:', err);
  }
}

function loadProgress() {
  const base = createDefaultMetaState();
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      metaState = base;
      return;
    }
    const parsed = JSON.parse(raw);

    // Hợp nhất an toàn từng nhánh dữ liệu để tương thích phiên bản mới
    metaState = Object.assign({}, base, parsed);
    metaState.stats = Object.assign({}, base.stats, parsed.stats || {});
    metaState.settings = Object.assign({}, base.settings, parsed.settings || {});
    metaState.stageStars = Object.assign({}, parsed.stageStars || {});
    metaState.challengeCleared = Object.assign({}, parsed.challengeCleared || {});
    metaState.claimedMissions = Object.assign({}, parsed.claimedMissions || {});
    metaState.redeemedCodes = Object.assign({}, parsed.redeemedCodes || {});
    metaState.isAdminMode = false;

    // Đồng bộ danh sách binh chủng
    UNIT_CATALOG.forEach((u) => {
      const savedU = (parsed.units && parsed.units[u.id]) || {};
      const defU = base.units[u.id];
      metaState.units[u.id] = {
        unlocked: Boolean(savedU.unlocked || defU.unlocked),
        level: Math.max(1, Number(savedU.level) || 1),
        shards: Math.max(0, Number(savedU.shards) || 0),
        rarityId: savedU.rarityId || defU.rarityId,
        rarityCounts: Object.assign({}, defU.rarityCounts, savedU.rarityCounts || {}),
        sockets: Array.isArray(savedU.sockets) && savedU.sockets.length === 3
          ? savedU.sockets.slice()
          : [null, null, null]
      };
    });

    // Đồng bộ 4 ụ pháo
    TURRET_CATALOG.forEach((t, idx) => {
      const savedT = (parsed.turrets && parsed.turrets[t.id]) || {};
      metaState.turrets[t.id] = {
        unlocked: Boolean(savedT.unlocked || idx === 0),
        level: Math.max(1, Number(savedT.level) || 1)
      };
    });

    // Đồng bộ toàn bộ 36 node Cây Kỹ Năng 6 nhánh
    const mergedTree = {};
    ANCIENT_SKILL_TREE.forEach((node) => {
      const lv = parsed.skillTree ? Number(parsed.skillTree[node.id]) : 0;
      mergedTree[node.id] = clamp(Number.isFinite(lv) ? lv : 0, 0, node.maxLv);
    });
    metaState.skillTree = mergedTree;

    // Đồng bộ Thiên Phú
    const mergedTalents = {};
    META_TALENTS.forEach((t) => {
      const lv = parsed.metaTalents ? Number(parsed.metaTalents[t.id]) : 0;
      mergedTalents[t.id] = clamp(Number.isFinite(lv) ? lv : 0, 0, t.maxLv);
    });
    metaState.metaTalents = mergedTalents;

    // Đảm bảo độ dài Deck chuẩn (5 ô Battle, 6 ô Challenge)
    if (!Array.isArray(metaState.battleDeck) || metaState.battleDeck.length !== BASE_DECK_SIZE_BATTLE) {
      metaState.battleDeck = base.battleDeck.slice();
    }
    if (!Array.isArray(metaState.challengeDeck) || metaState.challengeDeck.length !== BASE_DECK_SIZE_CHALLENGE) {
      metaState.challengeDeck = base.challengeDeck.slice();
    }
  } catch (err) {
    console.warn('[State] Dữ liệu lưu bị lỗi, khôi phục mặc định:', err);
    metaState = base;
  }
}

function resetAllProgress() {
  localStorage.removeItem(SAVE_STORAGE_KEY);
  metaState = createDefaultMetaState();
  saveProgress();
}

/* --------------------------------------------------------------------------
 * 3. TỔNG HỢP CHỈ SỐ TỪ CÂY KỸ NĂNG 6 NHÁNH (36 NODES) & THIÊN PHÚ
 * -------------------------------------------------------------------------- */
function getSkillTreeBonuses() {
  const bonuses = {
    // Nhánh 1: Công sự & Pháo đài
    baseHpPct: 0,
    baseArmorPct: 0,
    turretAtkPct: 0,
    turretSpdPct: 0,
    fortressShieldPct: 0,

    // Nhánh 2: Hỏa lực & Tinh nhuệ
    unitAtkPct: 0,
    unitAtkSpdPct: 0,
    unitHpPct: 0,
    armorPierceBonus: 0,
    lowHpFrenzyPct: 0,

    // Nhánh 3: Chiêu hồn & Quân đoàn
    skeletonStatPct: 0,
    summonCdRedPct: 0,
    healPowerPct: 0,
    maxSkeletonBonus: 0,
    deathGasRefundPct: 0,
    bloodSiphonPct: 0,

    // Nhánh 4: Hậu cần & Kinh tế
    gasRegenPct: 0,
    coinRewardPct: 0,
    deployCostRedPct: 0,
    maxGasBonus: 0,
    gemRewardPct: 0,
    startGasBonus: 0,

    // Nhánh 5: Nghệ thuật Chỉ huy Q-W-E-R
    skillCdRedPct: 0,
    extraMinesCount: 0,
    empStunBonus: 0,
    airdropGasBonus: 0,
    blitzDurationBonus: 0,
    airstrikeProcChance: 0,

    // Nhánh 6: Nguyên tố & Chí mạng
    critRateBonus: 0,
    critDmgBonus: 0,
    burnDmgPct: 0,
    slowEffectBonus: 0,
    aoeRadiusPct: 0,
    thermalShockPct: 0
  };

  for (let i = 0; i < ANCIENT_SKILL_TREE.length; i++) {
    const node = ANCIENT_SKILL_TREE[i];
    const lv = Number(metaState.skillTree[node.id]) || 0;
    if (lv > 0 && Object.prototype.hasOwnProperty.call(bonuses, node.statKey)) {
      bonuses[node.statKey] += lv * node.valPerLv;
    }
  }

  // Cộng thêm từ Thiên Phú Chỉ Huy (META_TALENTS)
  const masonryLv = Number(metaState.metaTalents.fortress_masonry) || 0;
  const logisticsLv = Number(metaState.metaTalents.command_logistics) || 0;
  const warfareLv = Number(metaState.metaTalents.tactical_warfare) || 0;

  bonuses.baseHpPct += masonryLv * 0.12;
  bonuses.gasRegenPct += logisticsLv * 0.06;
  bonuses.unitAtkPct += warfareLv * 0.08;

  return bonuses;
}

/* --------------------------------------------------------------------------
 * 4. HÀM THAO TÁC TÀI NGUYÊN, NÂNG CẤP SKILL TREE, Ụ PHÁO & ĐỘI HÌNH
 * -------------------------------------------------------------------------- */
function canAfford(currencyType, amount) {
  if (metaState.isAdminMode) return true;
  return (Number(metaState[currencyType]) || 0) >= amount;
}

function spendCurrency(currencyType, amount) {
  if (metaState.isAdminMode) return true;
  const cur = Number(metaState[currencyType]) || 0;
  if (cur < amount) return false;
  metaState[currencyType] = cur - amount;
  return true;
}

function addCurrency(currencyType, amount) {
  const val = Math.floor(Number(amount) || 0);
  if (val <= 0) return;
  metaState[currencyType] = (Number(metaState[currencyType]) || 0) + val;
}

function getSkillUpgradeCost(node) {
  const curLv = Number(metaState.skillTree[node.id]) || 0;
  return node.baseCost + curLv * (node.costStep || 1);
}

function isSkillNodeUnlocked(node) {
  if (!node.requires) return true;
  return (Number(metaState.skillTree[node.requires]) || 0) >= 1;
}

function upgradeSkillTreeNode(nodeId) {
  const node = ANCIENT_SKILL_TREE.find((n) => n.id === nodeId);
  if (!node) return { ok: false, reason: 'Không tìm thấy kỹ năng.' };

  const curLv = Number(metaState.skillTree[node.id]) || 0;
  if (curLv >= node.maxLv) return { ok: false, reason: 'Kỹ năng đã đạt cấp tối đa.' };
  if (!isSkillNodeUnlocked(node)) return { ok: false, reason: 'Cần mở khóa nút kỹ năng phía trước.' };

  const cost = getSkillUpgradeCost(node);
  if (!spendCurrency('pearls', cost)) {
    return { ok: false, reason: 'Không đủ Ngọc Trai Cổ Đại!' };
  }

  metaState.skillTree[node.id] = curLv + 1;
  saveProgress();
  return { ok: true, newLevel: curLv + 1 };
}

function upgradeOrUnlockTurret(turretId) {
  const spec = TURRET_CATALOG.find((t) => t.id === turretId);
  if (!spec) return { ok: false, reason: 'Ụ pháo không tồn tại.' };

  const state = metaState.turrets[turretId];
  if (!state.unlocked) {
    if (!spendCurrency('coins', spec.unlockCost)) {
      return { ok: false, reason: 'Không đủ Vàng để mở khóa ụ pháo!' };
    }
    state.unlocked = true;
    state.level = 1;
    metaState.equippedTurret = turretId;
    saveProgress();
    return { ok: true, action: 'unlocked' };
  }

  const upgCost = Math.round(spec.upgBaseCost * Math.pow(1.35, state.level - 1));
  if (!spendCurrency('coins', upgCost)) {
    return { ok: false, reason: 'Không đủ Vàng để nâng cấp ụ pháo!' };
  }
  state.level += 1;
  saveProgress();
  return { ok: true, action: 'upgraded', level: state.level };
}

function equipTurret(turretId) {
  const state = metaState.turrets[turretId];
  if (!state || !state.unlocked) return false;
  metaState.equippedTurret = turretId;
  saveProgress();
  return true;
}

function toggleUnitInDeck(unitId, isChallenge = false) {
  const uState = metaState.units[unitId];
  if (!uState || !uState.unlocked) return false;

  const deck = isChallenge ? metaState.challengeDeck : metaState.battleDeck;
  const existingIdx = deck.indexOf(unitId);

  if (existingIdx !== -1) {
    // Không cho tháo nếu chỉ còn 1 đơn vị duy nhất trong đội hình
    const filledCount = deck.filter(Boolean).length;
    if (filledCount <= 1) return false;
    deck[existingIdx] = null;
    saveProgress();
    return true;
  }

  const emptyIdx = deck.indexOf(null);
  if (emptyIdx !== -1) {
    deck[emptyIdx] = unitId;
  } else {
    deck[deck.length - 1] = unitId;
  }
  saveProgress();
  return true;
}

function upgradeUnitLevel(unitId) {
  const uState = metaState.units[unitId];
  if (!uState || !uState.unlocked) return { ok: false, reason: 'Chưa mở khóa binh chủng.' };

  const reqShards = computeShardRequirement(uState.level);
  const coinCost = 80 + uState.level * 45;

  if (!metaState.isAdminMode && uState.shards < reqShards) {
    return { ok: false, reason: `Cần ${reqShards} mảnh ghép!` };
  }
  if (!spendCurrency('coins', coinCost)) {
    return { ok: false, reason: `Cần ${coinCost} Vàng!` };
  }

  if (!metaState.isAdminMode) {
    uState.shards -= reqShards;
  }
  uState.level += 1;
  saveProgress();
  return { ok: true, newLevel: uState.level };
}

function applyGachaDropsToMeta(drops, newPity) {
  metaState.gachaPity = newPity;
  for (let i = 0; i < drops.length; i++) {
    const d = drops[i];
    const uState = metaState.units[d.unitId];
    if (!uState) continue;

    uState.unlocked = true;
    uState.shards += d.count;
    uState.rarityCounts[d.rarityId] = (uState.rarityCounts[d.rarityId] || 0) + d.count;

    // Tự động cập nhật độ hiếm hiển thị cao nhất của đơn vị
    if (getRarityIndex(d.rarityId) > getRarityIndex(uState.rarityId)) {
      uState.rarityId = d.rarityId;
    }
  }
  saveProgress();
}

function redeemGiftcode(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { ok: false, msg: 'Vui lòng nhập mã quà tặng.' };

  const entry = GIFTCODES[code];
  if (!entry) return { ok: false, msg: 'Mã không hợp lệ hoặc đã hết hạn.' };

  if (entry.admin) {
    metaState.isAdminMode = true;
    return { ok: true, msg: entry.label, isAdmin: true };
  }

  if (metaState.redeemedCodes[code]) {
    return { ok: false, msg: 'Bạn đã sử dụng mã này rồi!' };
  }

  metaState.redeemedCodes[code] = true;
  if (entry.coins) addCurrency('coins', entry.coins);
  if (entry.gems) addCurrency('gems', entry.gems);
  if (entry.pearls) addCurrency('pearls', entry.pearls);
  saveProgress();

  return { ok: true, msg: entry.label };
}

/* --------------------------------------------------------------------------
 * 5. TRẠNG THÁI TRẬN ĐẤU HIỆN TẠI (IN-BATTLE STATE)
 * -------------------------------------------------------------------------- */
const game = {
  active: false,
  paused: false,
  mode: 'campaign',
  stageLevel: 1,
  speedMult: 1,
  autoDeploy: false,

  // Kích thước logic chiến trường & Hitbox hai Mansion
  mapWidth: 420,
  mapHeight: 760,
  blueMansion: null,
  redMansion: null,

  // HP & Lá chắn Pháo đài Mansion Xanh
  playerHp: 1000,
  playerMaxHp: 1000,
  playerShield: 0,
  playerMaxShield: 0,
  shieldRegenTimer: 0,

  // HP Mansion Đỏ
  enemyHp: 1000,
  enemyMaxHp: 1000,

  // Hệ thống Xăng / Năng lượng triển khai
  gas: 50,
  maxGas: 100,
  gasTimer: 0,
  gasUpgLevel: 1,
  gasIncomePerSec: 12,
  gasUpgCost: 45,

  // Tiến trình Wave & Đợt sinh quái
  wave: 1,
  maxWaves: 3,
  waveTimer: 0,
  spawnQueue: [],
  elapsedTime: 0,
  timeLimit: 0,

  // Hệ thống EXP & Roguelike Draft trong trận
  battleLv: 1,
  battleExp: 0,
  nextLvExp: 100,
  pendingLevelUps: 0,
  roguelikeBuffs: {
    atkPct: 0,
    hpPct: 0,
    atkSpdPct: 0,
    gasRegenPct: 0,
    critRate: 0
  },

  // Kỹ năng Chỉ huy Q-W-E-R & Điểm tập kết Rally Flag
  skillCooldowns: { Q: 0, W: 0, E: 0, R: 0 },
  blitzTimer: 0,
  aimingSkill: null,
  rallyPoint: null, // { x, y, ttl }

  // Ụ pháo gắn trên nóc Mansion Xanh
  turret: {
    id: 'turret_gatling',
    angle: -Math.PI / 2,
    cooldown: 0,
    recoil: 0
  },

  // Danh sách thực thể trên sân
  units: [],
  enemies: [],
  projectiles: [],
  props: [],
  particles: [],
  floatingTexts: [],
  deckCooldowns: []
};

/**
 * Khởi tạo lại toàn bộ trạng thái trận đấu trước khi vào ải
 */
function resetBattleState(mode = 'campaign', stageLevel = 1, canvasW = 420, canvasH = 760) {
  const stage = STAGE_CATALOG[clamp(stageLevel - 1, 0, STAGE_CATALOG.length - 1)];
  const tree = getSkillTreeBonuses();

  game.active = true;
  game.paused = false;
  game.mode = mode;
  game.stageLevel = stage.level;
  game.mapWidth = canvasW;
  game.mapHeight = canvasH;

  // Khởi tạo Hitbox & Tâm ngắm chuẩn xác cho 2 Mansion (Phần 2)
  game.blueMansion = getMansionHitbox('blue', canvasW, canvasH);
  game.redMansion = getMansionHitbox('red', canvasW, canvasH);

  // Tính HP Mansion Xanh (kèm bonus Nhánh 1 Công Sự & Thiên Phú)
  const basePlayerHp = 1200 + metaState.playerLevel * 120;
  game.playerMaxHp = Math.round(basePlayerHp * (1 + tree.baseHpPct));
  game.playerHp = game.playerMaxHp;

  // Giáp ảo Lá Chắn Pháo Đài (Tối thượng Nhánh 1)
  game.playerMaxShield = Math.round(game.playerMaxHp * tree.fortressShieldPct);
  game.playerShield = game.playerMaxShield;
  game.shieldRegenTimer = 20;

  // Tính HP Mansion Đỏ theo ải & chế độ chơi
  let enemyHpMult = 1.0;
  if (mode === 'challenge') enemyHpMult = 1.35;
  if (mode === 'raid') enemyHpMult = 2.2;
  if (mode === 'bossrush') enemyHpMult = 1.8;
  game.enemyMaxHp = Math.round(stage.enemyBaseHp * enemyHpMult);
  game.enemyHp = game.enemyMaxHp;

  // Năng lượng Xăng ban đầu (kèm Tiếp Viện Tức Thì Nhánh 4)
  game.maxGas = 100 + Math.round(tree.maxGasBonus);
  game.gas = Math.min(game.maxGas, 50 + Math.round(tree.startGasBonus));
  game.gasTimer = 0;
  game.gasUpgLevel = 1;
  game.gasIncomePerSec = 12 * (1 + tree.gasRegenPct);
  game.gasUpgCost = 45;

  // Cấu hình Wave & Thời gian
  game.wave = 1;
  game.maxWaves = mode === 'challenge' ? 20 : (mode === 'endless' ? 999 : 3);
  game.waveTimer = 1.2;
  game.spawnQueue = [];
  game.elapsedTime = 0;
  game.timeLimit = mode === 'timeattack' ? 90 : 0;

  // Roguelike trong trận
  game.battleLv = 1;
  game.battleExp = 0;
  game.nextLvExp = 90;
  game.pendingLevelUps = 0;
  game.roguelikeBuffs = {
    atkPct: 0,
    hpPct: 0,
    atkSpdPct: 0,
    gasRegenPct: 0,
    critRate: 0
  };

  // Kỹ năng Q-W-E-R & Ụ pháo Mansion
  game.skillCooldowns = { Q: 0, W: 0, E: 0, R: 0 };
  game.blitzTimer = 0;
  game.aimingSkill = null;
  game.rallyPoint = null;

  game.turret = {
    id: metaState.equippedTurret || 'turret_gatling',
    angle: -Math.PI / 2,
    cooldown: 0,
    recoil: 0
  };

  game.units = [];
  game.enemies = [];
  game.projectiles = [];
  game.props = [];
  game.particles = [];
  game.floatingTexts = [];

  const deckLen = mode === 'challenge' ? BASE_DECK_SIZE_CHALLENGE : BASE_DECK_SIZE_BATTLE;
  game.deckCooldowns = new Array(deckLen).fill(0);
}