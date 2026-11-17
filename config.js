/* ============================================================================
   TINY BATTLE - CORE CONFIGURATION & CATALOGS (js/config.js)
   Save Key: tiny_battle_meta_save_v3 (Tương thích ngược 100%)
   Quy mô: 45 Maps Riêng Biệt • 18 Binh Chủng Tự Vẽ • 14 Zombie & Boss •
           41 Bậc Độ Hiếm • Cây Cổ Thụ 4 Nhánh (40 Kỹ Năng & 4 Kỹ Năng Đặc Biệt)
   ============================================================================ */

export const STORAGE_KEY = 'tiny_battle_meta_save_v3';
export const META_SAVE_KEY = STORAGE_KEY;
export const ADMIN_PASSWORD = 'HUNGADMINDZ';

/* 0. HẰNG SỐ ĐỘNG CƠ CANVAS, LƯỚI ĐỊA HÌNH FLOW-FIELD, LƯỚI TD 7x11 FULL MAP & XĂNG */
export const LOGICAL_WIDTH = 420;
export const LOGICAL_HEIGHT = 840;
export const BOTTOM_UI_HEIGHT = 126;
export const PLAYFIELD_HEIGHT = LOGICAL_HEIGHT - BOTTOM_UI_HEIGHT; // 714px
export const MAX_DECK_SLOTS = 5;
export const MAX_CUSTOM_UNIT_SLOTS = 4;
export const MAX_WAVES = 10;

// Lưới điều hướng Flow-Field 10x10px
export const NAV_CELL = 10;
export const GRID_W = Math.floor(LOGICAL_WIDTH / NAV_CELL);     // 42 cột
export const GRID_H = Math.floor(PLAYFIELD_HEIGHT / NAV_CELL);  // 71 hàng

export const T_OPEN = 0;
export const T_ROAD = 1;
export const T_WATER = 2;
export const T_BRIDGE = 3;
export const T_OBSTACLE = 4;

// Hằng số chế độ CHALLENGE (Tower Defense 20 Wave Zombie - Lưới ô vuông 7x11 Full Toàn Map)
export const CHALLENGE_MAX_WAVES = 20;
export const CHALLENGE_DECK_SLOTS = 6;
export const CHALLENGE_COOLDOWN_MULT = 3.0;     // Tăng hồi chiêu đặt Tower gấp 3.0 lần (Hardcore)
export const CHALLENGE_RELOCATE_HOLD_SEC = 3.0; // Nhấn giữ 3.0 giây lên Tower để nhấc và đổi vị trí
export const TD_GRID_COLS = 7;
export const TD_CELL_SIZE = 60;                 // 420px / 7 cột = 60x60px mỗi ô vuông
export const TD_GRID_TOP_Y = 48;                // Phủ toàn bộ sân từ y = 48px đến y = 708px (11 hàng * 60px = 660px)
export const TD_GRID_ROWS = 11;

export const BATTLE_SPEED_MULTIPLIERS = [1, 2, 4];

export const GAS_UPGRADE_LEVELS = [
    { interval: 3.0, cost: 4,  label: '➔ 2.4s' },
    { interval: 2.4, cost: 6,  label: '➔ 1.9s' },
    { interval: 1.9, cost: 8,  label: '➔ 1.5s' },
    { interval: 1.5, cost: 11, label: '➔ 1.1s' },
    { interval: 1.1, cost: 0,  label: 'MAX' }
];

/* 1. HỆ THỐNG 41 BẬC ĐỘ HIẾM (COMMON 1.0x ➔ MASTER +8 120x ➔ DEMON +10 777x) */
export const RARITY_ORDER = [
    'common', 'uncommon', 'rare',
    'epic', 'epic1', 'epic2',
    'legendary', 'legendary1', 'legendary2', 'legendary3',
    'mythic', 'mythic1', 'mythic2', 'mythic3', 'mythic4',
    'secret', 'secret1', 'secret2', 'secret3', 'secret4', 'secret5',
    'master', 'master1', 'master2', 'master3', 'master4', 'master5', 'master6', 'master7', 'master8',
    'demon', 'demon1', 'demon2', 'demon3', 'demon4', 'demon5', 'demon6', 'demon7', 'demon8', 'demon9', 'demon10'
];

export const MAX_RARITY_RANK = RARITY_ORDER.length - 1; // Rank 40 (demon10)

export const RARITY_CONFIG = {
    // --- BẬC 0 ➔ 20: COMMON ĐẾN SECRET +5 ---
    common:     { id: 'common',     rank: 0,  next: 'uncommon',   plusLabel: '',   name: 'Common',       mult: 1.00,  statMult: 1.00,  color: '#94a3b8', glowColor: '#cbd5e1', auraType: 'none',        css: 'rarity-common',     cssClass: 'rarity-common' },
    uncommon:   { id: 'uncommon',   rank: 1,  next: 'rare',       plusLabel: '',   name: 'Uncommon',     mult: 1.20,  statMult: 1.20,  color: '#4ade80', glowColor: '#86efac', auraType: 'none',        css: 'rarity-uncommon',   cssClass: 'rarity-uncommon' },
    rare:       { id: 'rare',       rank: 2,  next: 'epic',       plusLabel: '',   name: 'Rare',         mult: 1.42,  statMult: 1.42,  color: '#60a5fa', glowColor: '#93c5fd', auraType: 'none',        css: 'rarity-rare',       cssClass: 'rarity-rare' },
    epic:       { id: 'epic',       rank: 3,  next: 'epic1',      plusLabel: '',   name: 'Epic',         mult: 1.65,  statMult: 1.65,  color: '#c084fc', glowColor: '#d8b4fe', auraType: 'none',        css: 'rarity-epic',       cssClass: 'rarity-epic' },
    epic1:      { id: 'epic1',      rank: 4,  next: 'epic2',      plusLabel: '+1', name: 'Epic +1',      mult: 1.88,  statMult: 1.88,  color: '#d8b4fe', glowColor: '#e9d5ff', auraType: 'none',        css: 'rarity-epic1',      cssClass: 'rarity-epic1' },
    epic2:      { id: 'epic2',      rank: 5,  next: 'legendary',  plusLabel: '+2', name: 'Epic +2',      mult: 2.15,  statMult: 2.15,  color: '#e879f9', glowColor: '#f5d0fe', auraType: 'none',        css: 'rarity-epic2',      cssClass: 'rarity-epic2' },
    legendary:  { id: 'legendary',  rank: 6,  next: 'legendary1', plusLabel: '',   name: 'Legendary',    mult: 2.60,  statMult: 2.60,  color: '#f59e0b', glowColor: '#fcd34d', auraType: 'gold',        css: 'rarity-legendary',  cssClass: 'rarity-legendary' },
    legendary1: { id: 'legendary1', rank: 7,  next: 'legendary2', plusLabel: '+1', name: 'Legendary +1', mult: 3.05,  statMult: 3.05,  color: '#fbbf24', glowColor: '#fde047', auraType: 'gold',        css: 'rarity-legendary1', cssClass: 'rarity-legendary1' },
    legendary2: { id: 'legendary2', rank: 8,  next: 'legendary3', plusLabel: '+2', name: 'Legendary +2', mult: 3.55,  statMult: 3.55,  color: '#facc15', glowColor: '#fef08a', auraType: 'gold',        css: 'rarity-legendary2', cssClass: 'rarity-legendary2' },
    legendary3: { id: 'legendary3', rank: 9,  next: 'mythic',     plusLabel: '+3', name: 'Legendary +3', mult: 4.10,  statMult: 4.10,  color: '#fde047', glowColor: '#fef9c3', auraType: 'gold',        css: 'rarity-legendary3', cssClass: 'rarity-legendary3' },
    mythic:     { id: 'mythic',     rank: 10, next: 'mythic1',    plusLabel: '',   name: 'Mythic',       mult: 5.00,  statMult: 5.00,  color: '#fb7185', glowColor: '#fda4af', auraType: 'crimson',     css: 'rarity-mythic',     cssClass: 'rarity-mythic' },
    mythic1:    { id: 'mythic1',    rank: 11, next: 'mythic2',    plusLabel: '+1', name: 'Mythic +1',    mult: 5.90,  statMult: 5.90,  color: '#f43f5e', glowColor: '#fb7185', auraType: 'crimson',     css: 'rarity-mythic1',    cssClass: 'rarity-mythic1' },
    mythic2:    { id: 'mythic2',    rank: 12, next: 'mythic3',    plusLabel: '+2', name: 'Mythic +2',    mult: 6.90,  statMult: 6.90,  color: '#ef4444', glowColor: '#f87171', auraType: 'crimson',     css: 'rarity-mythic2',    cssClass: 'rarity-mythic2' },
    mythic3:    { id: 'mythic3',    rank: 13, next: 'mythic4',    plusLabel: '+3', name: 'Mythic +3',    mult: 8.00,  statMult: 8.00,  color: '#dc2626', glowColor: '#ef4444', auraType: 'crimson',     css: 'rarity-mythic3',    cssClass: 'rarity-mythic3' },
    mythic4:    { id: 'mythic4',    rank: 14, next: 'secret',     plusLabel: '+4', name: 'Mythic +4',    mult: 9.20,  statMult: 9.20,  color: '#b91c1c', glowColor: '#f97316', auraType: 'crimson',     css: 'rarity-mythic4',    cssClass: 'rarity-mythic4' },
    secret:     { id: 'secret',     rank: 15, next: 'secret1',    plusLabel: '',   name: 'Secret',       mult: 11.50, statMult: 11.50, color: '#18181b', glowColor: '#71717a', auraType: 'dark_void',   css: 'rarity-secret',     cssClass: 'rarity-secret' },
    secret1:    { id: 'secret1',    rank: 16, next: 'secret2',    plusLabel: '+1', name: 'Secret +1',    mult: 13.80, statMult: 13.80, color: '#18181b', glowColor: '#a1a1aa', auraType: 'dark_void',   css: 'rarity-secret1',    cssClass: 'rarity-secret1' },
    secret2:    { id: 'secret2',    rank: 17, next: 'secret3',    plusLabel: '+2', name: 'Secret +2',    mult: 16.40, statMult: 16.40, color: '#09090b', glowColor: '#cbd5e1', auraType: 'dark_void',   css: 'rarity-secret2',    cssClass: 'rarity-secret2' },
    secret3:    { id: 'secret3',    rank: 18, next: 'secret4',    plusLabel: '+3', name: 'Secret +3',    mult: 19.30, statMult: 19.30, color: '#09090b', glowColor: '#e2e8f0', auraType: 'dark_void',   css: 'rarity-secret3',    cssClass: 'rarity-secret3' },
    secret4:    { id: 'secret4',    rank: 19, next: 'secret5',    plusLabel: '+4', name: 'Secret +4',    mult: 22.50, statMult: 22.50, color: '#000000', glowColor: '#f1f5f9', auraType: 'dark_void',   css: 'rarity-secret4',    cssClass: 'rarity-secret4' },
    secret5:    { id: 'secret5',    rank: 20, next: 'master',     plusLabel: '+5', name: 'Secret +5',    mult: 26.00, statMult: 26.00, color: '#000000', glowColor: '#ffffff', auraType: 'dark_void',   css: 'rarity-secret5',    cssClass: 'rarity-secret5' },

    // --- CHUỖI 9 BẬC MASTER (RANK 21 ➔ 29 | 33.0x ➔ 120.0x) ---
    master:     { id: 'master',     rank: 21, next: 'master1',    plusLabel: '',   name: 'Master',       mult: 33.00, statMult: 33.00, color: '#00f2fe', glowColor: '#0284c7', auraType: 'master_aqua', css: 'rarity-master',     cssClass: 'rarity-master' },
    master1:    { id: 'master1',    rank: 22, next: 'master2',    plusLabel: '+1', name: 'Master +1',    mult: 40.00, statMult: 40.00, color: '#00f2fe', glowColor: '#0284c7', auraType: 'master_aqua', css: 'rarity-master1',    cssClass: 'rarity-master1' },
    master2:    { id: 'master2',    rank: 23, next: 'master3',    plusLabel: '+2', name: 'Master +2',    mult: 48.00, statMult: 48.00, color: '#00f2fe', glowColor: '#38bdf8', auraType: 'master_aqua', css: 'rarity-master2',    cssClass: 'rarity-master2' },
    master3:    { id: 'master3',    rank: 24, next: 'master4',    plusLabel: '+3', name: 'Master +3',    mult: 57.00, statMult: 57.00, color: '#00f2fe', glowColor: '#38bdf8', auraType: 'master_aqua', css: 'rarity-master3',    cssClass: 'rarity-master3' },
    master4:    { id: 'master4',    rank: 25, next: 'master5',    plusLabel: '+4', name: 'Master +4',    mult: 67.00, statMult: 67.00, color: '#38bdf8', glowColor: '#7dd3fc', auraType: 'master_aqua', css: 'rarity-master4',    cssClass: 'rarity-master4' },
    master5:    { id: 'master5',    rank: 26, next: 'master6',    plusLabel: '+5', name: 'Master +5',    mult: 78.00, statMult: 78.00, color: '#38bdf8', glowColor: '#7dd3fc', auraType: 'master_aqua', css: 'rarity-master5',    cssClass: 'rarity-master5' },
    master6:    { id: 'master6',    rank: 27, next: 'master7',    plusLabel: '+6', name: 'Master +6',    mult: 90.00, statMult: 90.00, color: '#7dd3fc', glowColor: '#bae6fd', auraType: 'master_aqua', css: 'rarity-master6',    cssClass: 'rarity-master6' },
    master7:    { id: 'master7',    rank: 28, next: 'master8',    plusLabel: '+7', name: 'Master +7',    mult: 104.0, statMult: 104.0, color: '#bae6fd', glowColor: '#e0f2fe', auraType: 'master_aqua', css: 'rarity-master7',    cssClass: 'rarity-master7' },
    master8:    { id: 'master8',    rank: 29, next: 'demon',      plusLabel: '+8', name: 'Master +8',    mult: 120.0, statMult: 120.0, color: '#e0f2fe', glowColor: '#ffffff', auraType: 'master_aqua', css: 'rarity-master8',    cssClass: 'rarity-master8' },

    // --- CHUỖI 11 BẬC DEMON (RANK 30 ➔ 40 | 155.0x ➔ 777.0x) ---
    demon:      { id: 'demon',      rank: 30, next: 'demon1',     plusLabel: '',    name: 'Demon',        mult: 155.0, statMult: 155.0, color: '#a855f7', glowColor: '#7e22ce', auraType: 'demon_abyss', css: 'rarity-demon',      cssClass: 'rarity-demon' },
    demon1:     { id: 'demon1',     rank: 31, next: 'demon2',     plusLabel: '+1',  name: 'Demon +1',     mult: 190.0, statMult: 190.0, color: '#a855f7', glowColor: '#9333ea', auraType: 'demon_abyss', css: 'rarity-demon1',     cssClass: 'rarity-demon1' },
    demon2:     { id: 'demon2',     rank: 32, next: 'demon3',     plusLabel: '+2',  name: 'Demon +2',     mult: 230.0, statMult: 230.0, color: '#c084fc', glowColor: '#9333ea', auraType: 'demon_abyss', css: 'rarity-demon2',     cssClass: 'rarity-demon2' },
    demon3:     { id: 'demon3',     rank: 33, next: 'demon4',     plusLabel: '+3',  name: 'Demon +3',     mult: 275.0, statMult: 275.0, color: '#c084fc', glowColor: '#a855f7', auraType: 'demon_abyss', css: 'rarity-demon3',     cssClass: 'rarity-demon3' },
    demon4:     { id: 'demon4',     rank: 34, next: 'demon5',     plusLabel: '+4',  name: 'Demon +4',     mult: 325.0, statMult: 325.0, color: '#d946ef', glowColor: '#a855f7', auraType: 'demon_abyss', css: 'rarity-demon4',     cssClass: 'rarity-demon4' },
    demon5:     { id: 'demon5',     rank: 35, next: 'demon6',     plusLabel: '+5',  name: 'Demon +5',     mult: 385.0, statMult: 385.0, color: '#d946ef', glowColor: '#c084fc', auraType: 'demon_abyss', css: 'rarity-demon5',     cssClass: 'rarity-demon5' },
    demon6:     { id: 'demon6',     rank: 36, next: 'demon7',     plusLabel: '+6',  name: 'Demon +6',     mult: 450.0, statMult: 450.0, color: '#e879f9', glowColor: '#c084fc', auraType: 'demon_abyss', css: 'rarity-demon6',     cssClass: 'rarity-demon6' },
    demon7:     { id: 'demon7',     rank: 37, next: 'demon8',     plusLabel: '+7',  name: 'Demon +7',     mult: 520.0, statMult: 520.0, color: '#e879f9', glowColor: '#d946ef', auraType: 'demon_abyss', css: 'rarity-demon7',     cssClass: 'rarity-demon7' },
    demon8:     { id: 'demon8',     rank: 38, next: 'demon9',     plusLabel: '+8',  name: 'Demon +8',     mult: 600.0, statMult: 600.0, color: '#f0abfc', glowColor: '#d946ef', auraType: 'demon_abyss', css: 'rarity-demon8',     cssClass: 'rarity-demon8' },
    demon9:     { id: 'demon9',     rank: 39, next: 'demon10',    plusLabel: '+9',  name: 'Demon +9',     mult: 685.0, statMult: 685.0, color: '#f5d0fe', glowColor: '#e879f9', auraType: 'demon_abyss', css: 'rarity-demon9',     cssClass: 'rarity-demon9' },
    demon10:    { id: 'demon10',    rank: 40, next: null,         plusLabel: '+10', name: 'Demon +10',    mult: 777.0, statMult: 777.0, color: '#fae8ff', glowColor: '#ffffff', auraType: 'demon_abyss', css: 'rarity-demon10',    cssClass: 'rarity-demon10' }
};
export const RARITY_TIERS = RARITY_CONFIG;

export function isMasterRarity(rarityId) {
    const r = RARITY_CONFIG[rarityId];
    return !!(r && r.rank >= 21 && r.rank <= 29);
}

export function isDemonRarity(rarityId) {
    const r = RARITY_CONFIG[rarityId];
    return !!(r && r.rank >= 30 && r.rank <= 40);
}

/* 2. CẤU HÌNH ĐỘ KHÓ (45 MAP) VÀ CHẾ ĐỘ CHIẾN ĐẤU */
export const DIFFICULTY_ORDER = ['easy', 'difficult'];
export const BATTLE_MODE_ORDER = ['destroy', 'survival'];
export const MAP_ENEMY_SCALE_PER_LEVEL = 0.095;

export const DIFFICULTY_CONFIG = {
    easy:      { id: 'easy',      name: 'Dễ',  shortLabel: 'DỄ',  statMult: 1.20, baseHpMult: 1.25, medalReward: 0 },
    difficult: { id: 'difficult', name: 'Khó', shortLabel: 'KHÓ', statMult: 1.85, baseHpMult: 2.10, medalReward: 3 }
};

export const BATTLE_MODE_CONFIG = {
    destroy:       { id: 'destroy',       name: 'Phá Căn Cứ',          shortLabel: 'PHÁ CĂN CỨ' },
    survival:      { id: 'survival',      name: 'Sinh Tồn 10 Wave',    shortLabel: '10 WAVE' },
    endless:       { id: 'endless',       name: 'Thủ Thành Vô Tận',    shortLabel: 'VÔ TẬN' },
    endless_siege: { id: 'endless_siege', name: 'Thủ Thành Vô Tận',    shortLabel: 'VÔ TẬN' },
    autobattler:   { id: 'autobattler',   name: 'Đặt Trận Tự Động',    shortLabel: 'ĐẶT TRẬN' },
    auto_battler:  { id: 'auto_battler',  name: 'Đặt Trận Tự Động',    shortLabel: 'ĐẶT TRẬN' },
    night_fog:     { id: 'night_fog',     name: 'Chiến Dịch Đêm Mù',   shortLabel: 'ĐÊM MÙ' },
    fog_of_war:    { id: 'fog_of_war',    name: 'Chiến Dịch Đêm Mù',   shortLabel: 'ĐÊM MÙ' },
    raid_boss:     { id: 'raid_boss',     name: 'Đấu Trường Siêu Boss', shortLabel: 'SIÊU BOSS' },
    bossrush:      { id: 'bossrush',      name: 'Đấu Trường Siêu Boss', shortLabel: 'SIÊU BOSS' },
    challenge:     { id: 'challenge',     name: 'Thủ Thành Zombie 20W', shortLabel: 'ZOMBIE TD' }
};

export function calcStageRewardCoins(mapLv, diffId, modeId) {
    const m = Math.max(1, Number(mapLv) || 1);
    let coins = diffId === 'difficult' ? (650 + m * 150) : (200 + m * 65);
    if (modeId === 'survival' || modeId === 'endless' || modeId === 'endless_siege') {
        coins = Math.round(coins * 1.35);
    } else if (modeId === 'raid_boss' || modeId === 'bossrush') {
        coins = Math.round(coins * 1.5);
    } else if (modeId === 'challenge') {
        coins = 12000 + m * 3500;
    }
    return coins;
}

export function calcChallengeEntryCostCoins(mapLv) {
    const m = Math.max(1, Number(mapLv) || 1);
    return 5000 + (m - 1) * 1500;
}

export function calcChallengeRewards(mapLv, pearlBonusPct = 0) {
    const m = Math.max(1, Number(mapLv) || 1);
    const pearlMult = 1 + Math.max(0, Number(pearlBonusPct) || 0);
    const pearls = Math.max(10, Math.round((12 + m * 3) * pearlMult));
    const gems = 250 + m * 35;
    const coins = 12000 + m * 3500;
    return { pearls, gems, coins };
}

/* 3. CẤU HÌNH RƯƠNG GACHA SHOP & BẢNG GIÁ NÂNG CẤP */
export const MAX_CRATE_OPEN_QTY = 1000000000;
export const CRATE_PRESET_QUANTITIES = [1000, 1000000, 100000000, 1000000000];

export const CRATE_CONFIG = {
    legendary: {
        id: 'legendary',
        name: 'LEGENDARY CRATE',
        singlePrice: 300,
        tenPrice: 2700,
        maxCustomQty: MAX_CRATE_OPEN_QTY,
        rates: [
            { rarity: 'uncommon',  weight: 50.0 },
            { rarity: 'rare',      weight: 35.0 },
            { rarity: 'epic',      weight: 12.0 },
            { rarity: 'legendary', weight: 3.0 }
        ]
    },
    epic: {
        id: 'epic',
        name: 'EPIC CRATE',
        singlePrice: 150,
        tenPrice: 1350,
        maxCustomQty: MAX_CRATE_OPEN_QTY,
        rates: [
            { rarity: 'common',   weight: 55.0 },
            { rarity: 'uncommon', weight: 30.0 },
            { rarity: 'rare',     weight: 12.0 },
            { rarity: 'epic',     weight: 3.0 }
        ]
    }
};

export const UPGRADE_TIER_BASE_PRICES = [100, 280, 750, 1800, 4200, 9500, 20000];

/* 4. DANH MỤC GIFTCODE (11 MÃ CHÍNH THỨC + GÓI SIÊU CẤP DEV) */
export const OFFICIAL_GIFTCODES = [
    'HUNGDEPTRAI', 'HUNGDZ01', 'HUNGDZ02', 'HUNGDZ03', 'HUNGDZ04',
    'HUNGDZ05', 'HUNGDZ06', 'HUNGDZ07', 'HUNGDZ08', 'HUNGDZ09', 'HUNGDZ10'
];
export const GIFTCODE_REWARD_GEMS = 1500;
export const GIFTCODE_REWARD_COINS = 15000;
export const GIFTCODE_REWARD_MEDALS = 15;
export const GIFTCODE_REWARD_PEARLS = 25;

export const GIFT_CODES = {
    'HUNGDEPTRAI': { gems: 999999, coins: 999999999, medals: 500, pearls: 9999, desc: 'Gói Siêu Cấp Dev' }
};
OFFICIAL_GIFTCODES.forEach(code => {
    if (code !== 'HUNGDEPTRAI') {
        GIFT_CODES[code] = {
            gems: GIFTCODE_REWARD_GEMS,
            coins: GIFTCODE_REWARD_COINS,
            medals: GIFTCODE_REWARD_MEDALS,
            pearls: GIFTCODE_REWARD_PEARLS,
            desc: 'Quà Tặng Chỉ Huy'
        };
    }
});

/* 5. BỘ KỸ NĂNG CHIẾN THUẬT CHỦ ĐỘNG (Q, W, E, R) */
export const COMMANDER_TACTICS = {
    airdrop: {
        id: 'airdrop',
        engineKey: 'airdrop',
        key: 'Q',
        name: 'Chi Viện Dù',
        shortName: 'CHI VIỆN',
        icon: '🪂',
        cooldown: 16.0,
        healRatio: 0.40,
        atkSpeedBuff: 0.30,
        buffDuration: 6.0,
        paratroopUnits: ['infantry', 'bazooka', 'infantry'],
        needsTarget: false,
        desc: 'Thả 3 lính nhảy dù tinh nhuệ xuống giữa chiến trường và hồi 40% HP toàn quân.'
    },
    landmines: {
        id: 'landmines',
        engineKey: 'minefield',
        key: 'W',
        name: 'Mìn Chống Tăng',
        shortName: 'RẢI MÌN',
        icon: '💣',
        cooldown: 18.0,
        mineCount: 5,
        mineDamage: 240,
        mineSplash: 54,
        needsTarget: false,
        desc: 'Đặt 5 quả mìn chống tăng dọc chiến tuyến, nổ lan sát thương lớn (240 DMG).'
    },
    emp: {
        id: 'emp',
        engineKey: 'emp_blast',
        key: 'E',
        name: 'Xung Điện EMP',
        shortName: 'XUNG EMP',
        icon: '⚡',
        cooldown: 22.0,
        stunDuration: 4.0,
        empDamage: 48,
        bossEmpDamage: 180,
        needsTarget: false,
        desc: 'Làm tê liệt toàn bộ quân địch trong 4 giây và gây sát thương điện từ.'
    },
    blitzkrieg: {
        id: 'blitzkrieg',
        engineKey: 'blitzkrieg',
        key: 'R',
        name: 'Tăng Tốc Cơ Động',
        shortName: 'THẦN TỐC',
        icon: '🚀',
        cooldown: 24.0,
        fireRateMult: 1.55,
        speedMult: 1.42,
        duration: 6.0,
        needsTarget: false,
        desc: 'Tăng 55% tốc bắn và 42% tốc độ di chuyển toàn quân trong 6 giây.'
    }
};
Object.defineProperties(COMMANDER_TACTICS, {
    minefield: { value: COMMANDER_TACTICS.landmines, enumerable: false },
    mines:     { value: COMMANDER_TACTICS.landmines, enumerable: false },
    emp_blast: { value: COMMANDER_TACTICS.emp,       enumerable: false },
    blitz:     { value: COMMANDER_TACTICS.blitzkrieg, enumerable: false }
});

/* 6. CÂY KỸ NĂNG BỊ ĐỘNG LOBBY (6 NHÁNH META-TALENTS - MAX LV.10 | DÙNG 🎖️ HUY CHƯƠNG) */
export const META_TALENTS = {
    oil_refining: {
        id: 'oil_refining',
        name: 'Công Nghệ Lọc Dầu',
        icon: '🛢️',
        maxLevel: 10,
        baseCost: 5,
        costStep: 4,
        desc: 'Giảm chu kỳ hồi Xăng (-0.06s/cấp, tối đa -0.60s ở Lv.10).',
        getEffectText(lv) { return `Chu kỳ xăng: ${(3.0 - lv * 0.06).toFixed(2)}s / điểm (-${(lv * 0.06).toFixed(2)}s)`; }
    },
    high_grade_steel: {
        id: 'high_grade_steel',
        name: 'Thép Tôi Cao Cấp',
        icon: '🛡️',
        maxLevel: 10,
        baseCost: 5,
        costStep: 4,
        desc: 'Tăng HP & Giáp giảm sát thương toàn quân (+3%/cấp, tối đa +30%).',
        getEffectText(lv) { return `HP & Giáp cộng thêm: +${lv * 3}%`; }
    },
    optimal_logistics: {
        id: 'optimal_logistics',
        name: 'Hậu Cần Tối Ưu',
        icon: '📦',
        maxLevel: 10,
        baseCost: 5,
        costStep: 4,
        desc: 'Tăng Xăng đầu trận (+1 mỗi 2 cấp) & giảm hồi chiêu Q/W/E/R (-3%/cấp, tối đa -30%).',
        getEffectText(lv) { return `Xăng đầu trận: +${Math.floor(lv / 2)} | Hồi chiêu QWER: -${lv * 3}%`; }
    },
    critical_firepower: {
        id: 'critical_firepower',
        name: 'Hỏa Lực Chí Mạng',
        icon: '🎯',
        maxLevel: 10,
        baseCost: 5,
        costStep: 4,
        desc: 'Tăng tỷ lệ Bạo kích (+2.5%/cấp, đòn chí mạng gây 1.75x sát thương).',
        getEffectText(lv) { return `Tỷ lệ Bạo kích: +${(lv * 2.5).toFixed(1)}% (1.75x DMG)`; }
    },
    battlefield_harvest: {
        id: 'battlefield_harvest',
        name: 'Thu Hoạch Chiến Trường',
        icon: '💰',
        maxLevel: 10,
        baseCost: 5,
        costStep: 4,
        desc: 'Tăng +8%/cấp Vàng thắng trận và hoàn lại 15% chi phí Xăng khi quân hy sinh.',
        getEffectText(lv) { return `Thưởng Vàng: +${lv * 8}% | Hoàn Xăng hy sinh: ${lv > 0 ? '15%' : '0%'}`; }
    },
    immortal_bastion: {
        id: 'immortal_bastion',
        name: 'Pháo Đài Bất Tử',
        icon: '🗼',
        maxLevel: 10,
        baseCost: 5,
        costStep: 4,
        desc: 'Tăng +10%/cấp HP Căn Cứ Xanh và +8%/cấp sát thương cho Ụ Pháo Căn Cứ.',
        getEffectText(lv) { return `HP Căn Cứ: +${lv * 10}% | DMG Ụ Pháo: +${lv * 8}%`; }
    }
};

/* 7. HỆ THỐNG CHIP / NGỌC BỔ TRỢ (MUA BẰNG 2,500 🪙 HOẶC 150 💎 | MỞ KHE 2 = 500 💎) */
export const CHIP_SOCKET_2_UNLOCK_GEMS = 500;
export const CHIP_BUY_COST_COINS = 2500;
export const CHIP_BUY_COST_GEMS = 150;

export const UNIT_CHIPS = {
    napalm_rocket: {
        id: 'napalm_rocket',
        name: 'Đầu Đạn Napalm',
        shortName: 'Napalm',
        icon: '🔥',
        dotCss: 'chip-napalm',
        buyCoins: CHIP_BUY_COST_COINS,
        buyGems: CHIP_BUY_COST_GEMS,
        burnDps: 18,
        burnDuration: 3.0,
        splashBonus: 14,
        recommendedUnits: ['bazooka', 'tank', 'heavy_tank', 'heli', 'battleship', 'pyromancer'],
        desc: 'Đạn nổ đốt cháy mục tiêu trong 3s (18 DPS) và +14 bán kính nổ.'
    },
    tactical_radar: {
        id: 'tactical_radar',
        name: 'Radar Chiến Thuật',
        shortName: 'Radar +28 & Choáng',
        icon: '📡',
        dotCss: 'chip-radar',
        buyCoins: CHIP_BUY_COST_COINS,
        buyGems: CHIP_BUY_COST_GEMS,
        rangeBonusFlat: 28,
        nightVisionBonus: 65,
        stunChance: 0.14,
        stunDuration: 1.2,
        recommendedUnits: ['humvee', 'apc', 'sniper', 'destroyer', 'patrol_boat', 'cryomancer', 'necromancer', 'railgun_walker'],
        desc: '+28 tầm bắn, +14% tỷ lệ bắn gây choáng điện từ (1.2s) và +65px tầm nhìn đêm.'
    },
    reactive_armor: {
        id: 'reactive_armor',
        name: 'Giáp Phản Ứng Nổ',
        shortName: 'Giáp ERA',
        icon: '🟣',
        dotCss: 'chip-armor',
        buyCoins: CHIP_BUY_COST_COINS,
        buyGems: CHIP_BUY_COST_GEMS,
        hpBonusPct: 0.18,
        damageReductionPct: 0.15,
        recommendedUnits: ['tank', 'heavy_tank', 'apc', 'destroyer', 'battleship', 'mecha_paladin', 'cleric'],
        desc: 'Tăng 18% HP tối đa và giảm 15% sát thương nhận vào.'
    },
    overclock_core: {
        id: 'overclock_core',
        name: 'Lõi Xung Nhịp Cao',
        shortName: 'Ép Xung & Choáng',
        icon: '🔋',
        dotCss: 'chip-overclock',
        buyCoins: CHIP_BUY_COST_COINS,
        buyGems: CHIP_BUY_COST_GEMS,
        speedBonusPct: 0.20,
        cooldownReductionPct: 0.15,
        stunChance: 0.14,
        stunDuration: 1.2,
        recommendedUnits: ['infantry', 'rifleman', 'sniper', 'humvee', 'heli', 'pyromancer', 'cryomancer', 'cleric', 'railgun_walker'],
        desc: '+20% tốc chạy, -15% hồi chiêu gọi quân và 14% tỷ lệ gây choáng điện từ (1.2s).'
    }
};
Object.defineProperties(UNIT_CHIPS, {
    overclock_servo: { value: UNIT_CHIPS.overclock_core, enumerable: false }
});

/* 8. CÂY KỸ NĂNG CỔ THỤ 4 NHÁNH TÁN CÂY (40 KỸ NĂNG & 4 KỸ NĂNG ĐẶC BIỆT MỐC 10 - DÙNG ⚪ NGỌC TRAI TRẮNG) */
export const SKILL_TREE_BRANCHES = [
    { id: 'firepower', name: '🔥 Hỏa Lực & Nguyên Tố', shortName: '🔥 HỎA LỰC', color: '#f97316', rootX: 110 },
    { id: 'fortress',  name: '🛡️ Pháo Đài & Sinh Mệnh', shortName: '🛡️ PHÁO ĐÀI', color: '#38bdf8', rootX: 275 },
    { id: 'summon',    name: '💀 Triệu Hồi & Khống Chế', shortName: '💀 TRIỆU HỒI', color: '#c084fc', rootX: 445 },
    { id: 'economy',   name: '⛽ Kinh Tế & Hậu Cần',    shortName: '⛽ KINH TẾ',  color: '#4ade80', rootX: 610 }
];

export const ANCIENT_SKILL_TREE = {
    // ==================== NHÁNH 1: HỎA LỰC & NGUYÊN TỐ (10 KỸ NĂNG) ====================
    fp_1: {
        id: 'fp_1', branch: 'firepower', order: 1, x: 110, y: 610,
        name: 'Cường Hóa Đạn Đạo', icon: '🔫', maxLevel: 5, baseCost: 5, costStep: 2, requires: [],
        statType: 'physDmgPct', perLevel: 0.08,
        desc: '+8%/cấp Sát thương vật lý cho toàn bộ đơn vị và Tower.',
        getEffectText(lv) { return `DMG Vật Lý: +${lv * 8}%`; }
    },
    fp_2: {
        id: 'fp_2', branch: 'firepower', order: 2, x: 75, y: 540,
        name: 'Tâm Nhãn Xạ Thủ', icon: '🎯', maxLevel: 5, baseCost: 8, costStep: 3, requires: ['fp_1'],
        statType: 'critChance', perLevel: 0.025,
        desc: '+2.5%/cấp Tỷ lệ Bạo kích (gây 1.75x sát thương).',
        getEffectText(lv) { return `Tỷ lệ Bạo kích: +${(lv * 2.5).toFixed(1)}%`; }
    },
    fp_3: {
        id: 'fp_3', branch: 'firepower', order: 3, x: 145, y: 540,
        name: 'Nguyên Tố Bùng Nổ', icon: '🔥', maxLevel: 5, baseCost: 10, costStep: 3, requires: ['fp_1'],
        statType: 'elemDmgPct', perLevel: 0.10,
        desc: '+10%/cấp Sát thương nguyên tố (Lửa, Băng, Ám, Railgun).',
        getEffectText(lv) { return `DMG Nguyên Tố: +${lv * 10}%`; }
    },
    fp_4: {
        id: 'fp_4', branch: 'firepower', order: 4, x: 75, y: 465,
        name: 'Cò Súng Tự Động', icon: '⚡', maxLevel: 5, baseCost: 14, costStep: 4, requires: ['fp_2'],
        statType: 'fireRatePct', perLevel: 0.07,
        desc: '+7%/cấp Tốc độ bắn cho toàn bộ đơn vị và Tower.',
        getEffectText(lv) { return `Tốc độ bắn: +${lv * 7}%`; }
    },
    fp_5: {
        id: 'fp_5', branch: 'firepower', order: 5, x: 145, y: 465,
        name: 'Đầu Đạn Xuyên Giáp', icon: '💥', maxLevel: 5, baseCost: 18, costStep: 4, requires: ['fp_3'],
        statType: 'allDmgPct', perLevel: 0.07,
        desc: '+7%/cấp Tổng sát thương đầu ra cho mọi binh chủng.',
        getEffectText(lv) { return `Tổng Sát Thương: +${lv * 7}%`; }
    },
    fp_6: {
        id: 'fp_6', branch: 'firepower', order: 6, x: 75, y: 390,
        name: 'Thuốc Nổ Cấp Cao', icon: '💣', maxLevel: 4, baseCost: 22, costStep: 5, requires: ['fp_4'],
        statType: 'splashBonus', perLevel: 6,
        desc: '+6px/cấp Bán kính nổ lan cho đạn pháo, tên lửa & phép thuật.',
        getEffectText(lv) { return `Bán kính nổ lan: +${lv * 6}px`; }
    },
    fp_7: {
        id: 'fp_7', branch: 'firepower', order: 7, x: 145, y: 390,
        name: 'Ngọn Lửa Vĩnh Cửu', icon: '🌋', maxLevel: 4, baseCost: 26, costStep: 5, requires: ['fp_5'],
        statType: 'burnBonusPct', perLevel: 0.25,
        desc: '+25%/cấp Sát thương thiêu đốt theo thời gian (Burn DPS).',
        getEffectText(lv) { return `Hiệu quả Thiêu Đốt: +${lv * 25}%`; }
    },
    fp_8: {
        id: 'fp_8', branch: 'firepower', order: 8, x: 75, y: 315,
        name: 'Nòng Pháo Viễn Trinh', icon: '🔭', maxLevel: 4, baseCost: 30, costStep: 5, requires: ['fp_6'],
        statType: 'rangeBonus', perLevel: 8,
        desc: '+8px/cấp Tầm bắn xa cho toàn bộ đơn vị và Tower.',
        getEffectText(lv) { return `Tầm bắn cộng thêm: +${lv * 8}px`; }
    },
    fp_9: {
        id: 'fp_9', branch: 'firepower', order: 9, x: 145, y: 315,
        name: 'Cuồng Nộ Chiến Trường', icon: '💢', maxLevel: 3, baseCost: 35, costStep: 5, requires: ['fp_7'],
        statType: 'allDmgPct', perLevel: 0.12,
        desc: '+12%/cấp Sát thương toàn diện trước thềm sức mạnh tối thượng.',
        getEffectText(lv) { return `Sát Thương Tinh Anh: +${lv * 12}%`; }
    },
    fp_10: {
        id: 'fp_10', branch: 'firepower', order: 10, x: 110, y: 215, isKeystone: true,
        name: '🌪️ BÃO THIÊN THẠCH (ĐẶC BIỆT)', icon: '☄️', maxLevel: 1, baseCost: 180, costStep: 0, requires: ['fp_8', 'fp_9'],
        specialKey: 'meteor_storm',
        desc: '[KỸ NĂNG ĐẶC BIỆT] Cứ mỗi 14 giây trong trận, tự động gọi 3 thiên thạch giáng xuống cụm địch đông nhất gây nổ lan 320 DMG & thiêu đốt!',
        getEffectText(lv) { return lv > 0 ? 'ĐÃ KÍCH HOẠT: Gọi 3 Thiên Thạch mỗi 14s!' : 'Chưa mở khóa (Cần 180 ⚪)'; }
    },

    // ==================== NHÁNH 2: PHÁO ĐÀI & SINH MỆNH (10 KỸ NĂNG) ====================
    ft_1: {
        id: 'ft_1', branch: 'fortress', order: 1, x: 275, y: 610,
        name: 'Rễ Sinh Mệnh', icon: '💚', maxLevel: 5, baseCost: 5, costStep: 2, requires: [],
        statType: 'hpPct', perLevel: 0.10,
        desc: '+10%/cấp Máu (HP) tối đa cho toàn bộ đơn vị và Tower.',
        getEffectText(lv) { return `HP Toàn Quân & Tower: +${lv * 10}%`; }
    },
    ft_2: {
        id: 'ft_2', branch: 'fortress', order: 2, x: 240, y: 540,
        name: 'Giáp Composite', icon: '🛡️', maxLevel: 5, baseCost: 8, costStep: 3, requires: ['ft_1'],
        statType: 'armorPct', perLevel: 0.03,
        desc: '+3%/cấp Giảm sát thương nhận vào cho toàn quân Xanh.',
        getEffectText(lv) { return `Giảm Sát Thương: +${lv * 3}%`; }
    },
    ft_3: {
        id: 'ft_3', branch: 'fortress', order: 3, x: 310, y: 540,
        name: 'Tường Thành Kiên Cố', icon: '🏰', maxLevel: 5, baseCost: 10, costStep: 3, requires: ['ft_1'],
        statType: 'baseHpPct', perLevel: 0.15,
        desc: '+15%/cấp Máu tối đa cho Căn Cứ Xanh.',
        getEffectText(lv) { return `HP Căn Cứ Xanh: +${lv * 15}%`; }
    },
    ft_4: {
        id: 'ft_4', branch: 'fortress', order: 4, x: 240, y: 465,
        name: 'Huyết Thanh Tái Tạo', icon: '💉', maxLevel: 5, baseCost: 14, costStep: 4, requires: ['ft_2'],
        statType: 'hpRegenPct', perLevel: 0.006,
        desc: 'Toàn bộ đơn vị và Tower tự hồi +0.6%/cấp HP mỗi giây.',
        getEffectText(lv) { return `Hồi phục tự động: +${(lv * 0.6).toFixed(1)}% HP/s`; }
    },
    ft_5: {
        id: 'ft_5', branch: 'fortress', order: 5, x: 310, y: 465,
        name: 'Tháp Phòng Thủ Tự Động', icon: '🗼', maxLevel: 5, baseCost: 18, costStep: 4, requires: ['ft_3'],
        statType: 'turretDmgPct', perLevel: 0.14,
        desc: '+14%/cấp Sát thương cho Ụ Pháo gắn trên Căn Cứ Xanh.',
        getEffectText(lv) { return `DMG Ụ Pháo Căn Cứ: +${lv * 14}%`; }
    },
    ft_6: {
        id: 'ft_6', branch: 'fortress', order: 6, x: 240, y: 390,
        name: 'Linh Hồn Hấp Huyết', icon: '🩸', maxLevel: 4, baseCost: 22, costStep: 5, requires: ['ft_4'],
        statType: 'lifestealPct', perLevel: 0.04,
        desc: 'Đơn vị phe Xanh hồi máu bằng +4%/cấp sát thương gây ra.',
        getEffectText(lv) { return `Hút máu đòn đánh: +${lv * 4}%`; }
    },
    ft_7: {
        id: 'ft_7', branch: 'fortress', order: 7, x: 310, y: 390,
        name: 'Phúc Lành Thánh Quang', icon: '✨', maxLevel: 4, baseCost: 26, costStep: 5, requires: ['ft_5'],
        statType: 'healBonusPct', perLevel: 0.18,
        desc: '+18%/cấp Hiệu quả hồi máu của Mục Sư & Chi Viện Dù.',
        getEffectText(lv) { return `Hiệu quả Hồi Máu: +${lv * 18}%`; }
    },
    ft_8: {
        id: 'ft_8', branch: 'fortress', order: 8, x: 240, y: 315,
        name: 'Kháng Hiệu Ứng Bất Lợi', icon: '💠', maxLevel: 4, baseCost: 30, costStep: 5, requires: ['ft_6'],
        statType: 'ccResistPct', perLevel: 0.15,
        desc: 'Giảm -15%/cấp thời gian bị Choáng, Đóng Băng & Axit làm chậm.',
        getEffectText(lv) { return `Kháng Khống Chế: -${lv * 15}% thời gian`; }
    },
    ft_9: {
        id: 'ft_9', branch: 'fortress', order: 9, x: 310, y: 315,
        name: 'Thân Thể Bất Hoại', icon: '🦾', maxLevel: 3, baseCost: 35, costStep: 5, requires: ['ft_7'],
        statType: 'hpPct', perLevel: 0.15,
        desc: '+15%/cấp HP tối đa toàn diện bảo vệ tiền tuyến.',
        getEffectText(lv) { return `HP Bất Hoại: +${lv * 15}%`; }
    },
    ft_10: {
        id: 'ft_10', branch: 'fortress', order: 10, x: 275, y: 215, isKeystone: true,
        name: '🛡️ KHIÊN PHẢN CHẤN VĨNH CỬU (ĐẶC BIỆT)', icon: '🔰', maxLevel: 1, baseCost: 180, costStep: 0, requires: ['ft_8', 'ft_9'],
        specialKey: 'eternal_shield',
        desc: '[KỸ NĂNG ĐẶC BIỆT] Căn Cứ Xanh và toàn bộ Tower nhận lớp Khiên Năng Lượng bằng 25% HP tối đa, tự động hồi đầy sau mỗi Wave!',
        getEffectText(lv) { return lv > 0 ? 'ĐÃ KÍCH HOẠT: Khiên 25% HP hồi đầy mỗi Wave!' : 'Chưa mở khóa (Cần 180 ⚪)'; }
    },

    // ==================== NHÁNH 3: TRIỆU HỒI & KHỐNG CHẾ (10 KỸ NĂNG) ====================
    sm_1: {
        id: 'sm_1', branch: 'summon', order: 1, x: 445, y: 610,
        name: 'Cành Săn Xác Sống', icon: '🗡️', maxLevel: 5, baseCost: 5, costStep: 2, requires: [],
        statType: 'zombieDmgPct', perLevel: 0.18,
        desc: '+18%/cấp Sát thương gây lên toàn bộ Zombie & Boss trong CHALLENGE.',
        getEffectText(lv) { return `DMG Diệt Zombie & Boss: +${lv * 18}%`; }
    },
    sm_2: {
        id: 'sm_2', branch: 'summon', order: 2, x: 410, y: 540,
        name: 'Hàn Băng Vĩnh Cửu', icon: '❄️', maxLevel: 5, baseCost: 8, costStep: 3, requires: ['sm_1'],
        statType: 'ccDurationPct', perLevel: 0.12,
        desc: '+12%/cấp Thời gian Đóng Băng & Làm Choáng kẻ địch.',
        getEffectText(lv) { return `Thời gian Khống Chế: +${lv * 12}%`; }
    },
    sm_3: {
        id: 'sm_3', branch: 'summon', order: 3, x: 480, y: 540,
        name: 'Cành Tinh Anh', icon: '⏱️', maxLevel: 5, baseCost: 10, costStep: 3, requires: ['sm_1'],
        statType: 'cdReductionPct', perLevel: 0.03,
        desc: 'Giảm -3%/cấp thời gian hồi chiêu đặt Tower & gọi quân.',
        getEffectText(lv) { return `Giảm Hồi Chiêu Quân: -${lv * 3}%`; }
    },
    sm_4: {
        id: 'sm_4', branch: 'summon', order: 4, x: 410, y: 465,
        name: 'Tụ Điện Cao Áp', icon: '⚡', maxLevel: 5, baseCost: 14, costStep: 4, requires: ['sm_2'],
        statType: 'stunChanceBonus', perLevel: 0.03,
        desc: '+3%/cấp Tỷ lệ đòn đánh thường gây Choáng điện từ (1.0s).',
        getEffectText(lv) { return `Tỷ lệ Choáng Thêm: +${lv * 3}%`; }
    },
    sm_5: {
        id: 'sm_5', branch: 'summon', order: 5, x: 480, y: 465,
        name: 'Xương Cốt Cương Thiết', icon: '💀', maxLevel: 5, baseCost: 18, costStep: 4, requires: ['sm_3'],
        statType: 'skeletonStatPct', perLevel: 0.25,
        desc: '+25%/cấp HP & Sát thương cho Chiến Binh Xương triệu hồi.',
        getEffectText(lv) { return `Sức mạnh Chiến Binh Xương: +${lv * 25}%`; }
    },
    sm_6: {
        id: 'sm_6', branch: 'summon', order: 6, x: 410, y: 390,
        name: 'Chiến Thuật Chỉ Huy', icon: '🎖️', maxLevel: 4, baseCost: 22, costStep: 5, requires: ['sm_4'],
        statType: 'tacticCdPct', perLevel: 0.05,
        desc: 'Giảm -5%/cấp thời gian hồi 4 kỹ năng Chỉ huy [Q/W/E/R].',
        getEffectText(lv) { return `Hồi chiêu Q/W/E/R: -${lv * 5}%`; }
    },
    sm_7: {
        id: 'sm_7', branch: 'summon', order: 7, x: 480, y: 390,
        name: 'Binh Đoàn Vong Linh', icon: '👻', maxLevel: 4, baseCost: 26, costStep: 5, requires: ['sm_5'],
        statType: 'extraSkeletonCap', perLevel: 1,
        desc: '+1/cấp Giới hạn Chiến Binh Xương tối đa của mỗi Pháp Sư Chiêu Hồn.',
        getEffectText(lv) { return `Giới hạn Xương: +${lv} con`; }
    },
    sm_8: {
        id: 'sm_8', branch: 'summon', order: 8, x: 410, y: 315,
        name: 'Bước Chân Thần Tốc', icon: '👟', maxLevel: 4, baseCost: 30, costStep: 5, requires: ['sm_6'],
        statType: 'moveSpeedPct', perLevel: 0.06,
        desc: '+6%/cấp Tốc độ di chuyển cho toàn bộ đơn vị trên chiến trường.',
        getEffectText(lv) { return `Tốc độ di chuyển: +${lv * 6}%`; }
    },
    sm_9: {
        id: 'sm_9', branch: 'summon', order: 9, x: 480, y: 315,
        name: 'Áp Đảo Bóng Tối', icon: '🌑', maxLevel: 3, baseCost: 35, costStep: 5, requires: ['sm_7'],
        statType: 'zombieDmgPct', perLevel: 0.25,
        desc: '+25%/cấp Sát thương kết liễu Zombie & Boss.',
        getEffectText(lv) { return `Sát Thương Hư Không: +${lv * 25}%`; }
    },
    sm_10: {
        id: 'sm_10', branch: 'summon', order: 10, x: 445, y: 215, isKeystone: true,
        name: '💀 LÃNH CHÚA HƯ KHÔNG (ĐẶC BIỆT)', icon: '👑', maxLevel: 1, baseCost: 200, costStep: 0, requires: ['sm_8', 'sm_9'],
        specialKey: 'void_lord',
        desc: '[KỸ NĂNG ĐẶC BIỆT] Nhân đôi giới hạn Chiến Binh Xương, đồng thời mỗi khi lính Xanh hy sinh có 25% tỷ lệ hồi sinh ngay thành Chiến Binh Xương!',
        getEffectText(lv) { return lv > 0 ? 'ĐÃ KÍCH HOẠT: Xương x2 & 25% Hồi sinh Xương!' : 'Chưa mở khóa (Cần 200 ⚪)'; }
    },

    // ==================== NHÁNH 4: KINH TẾ & HẬU CẦN (10 KỸ NĂNG) ====================
    ec_1: {
        id: 'ec_1', branch: 'economy', order: 1, x: 610, y: 610,
        name: 'Rễ Tiếp Tế', icon: '⛽', maxLevel: 5, baseCost: 5, costStep: 2, requires: [],
        statType: 'startGasFlat', perLevel: 1,
        desc: '+1 Xăng khởi đầu ngay khi vừa bước vào mọi trận đấu.',
        getEffectText(lv) { return `Xăng khởi đầu trận: +${lv}`; }
    },
    ec_2: {
        id: 'ec_2', branch: 'economy', order: 2, x: 575, y: 540,
        name: 'Bơm Áp Suất Cao', icon: '⚡', maxLevel: 5, baseCost: 8, costStep: 3, requires: ['ec_1'],
        statType: 'gasRegenPct', perLevel: 0.05,
        desc: '+5%/cấp Tốc độ hồi phục Xăng tự động trong trận.',
        getEffectText(lv) { return `Tốc độ hồi Xăng: +${lv * 5}%`; }
    },
    ec_3: {
        id: 'ec_3', branch: 'economy', order: 3, x: 645, y: 540,
        name: 'Khai Thác Vàng Ròng', icon: '🪙', maxLevel: 5, baseCost: 10, costStep: 3, requires: ['ec_1'],
        statType: 'goldBonusPct', perLevel: 0.10,
        desc: '+10%/cấp Lượng Vàng nhận được sau mỗi trận chiến.',
        getEffectText(lv) { return `Thưởng Vàng Chiến Dịch: +${lv * 10}%`; }
    },
    ec_4: {
        id: 'ec_4', branch: 'economy', order: 4, x: 575, y: 465,
        name: 'Sổ Tay Kinh Nghiệm', icon: '📘', maxLevel: 5, baseCost: 14, costStep: 4, requires: ['ec_2'],
        statType: 'expGainPct', perLevel: 0.12,
        desc: '+12%/cấp EXP nhận được khi hạ địch để tích lũy LEVEL UP nhanh hơn.',
        getEffectText(lv) { return `Tốc độ nhận EXP trận: +${lv * 12}%`; }
    },
    ec_5: {
        id: 'ec_5', branch: 'economy', order: 5, x: 645, y: 465,
        name: 'Kho Báu Ngọc Trai', icon: '⚪', maxLevel: 5, baseCost: 18, costStep: 4, requires: ['ec_3'],
        statType: 'pearlBonusPct', perLevel: 0.15,
        desc: '+15%/cấp Lượng Ngọc Trai Trắng nhận được khi vượt ải CHALLENGE.',
        getEffectText(lv) { return `Thưởng Ngọc Trai Trắng: +${lv * 15}%`; }
    },
    ec_6: {
        id: 'ec_6', branch: 'economy', order: 6, x: 575, y: 390,
        name: 'Tái Chế Khí Tài', icon: '♻️', maxLevel: 4, baseCost: 22, costStep: 5, requires: ['ec_4'],
        statType: 'deathGasRefundPct', perLevel: 0.04,
        desc: 'Hoàn lại thêm +4%/cấp chi phí Xăng khi đơn vị phe Xanh hy sinh.',
        getEffectText(lv) { return `Hoàn Xăng hy sinh: +${lv * 4}%`; }
    },
    ec_7: {
        id: 'ec_7', branch: 'economy', order: 7, x: 645, y: 390,
        name: 'Bình Chứa Mở Rộng', icon: '🛢️', maxLevel: 4, baseCost: 26, costStep: 5, requires: ['ec_5'],
        statType: 'maxGasFlat', perLevel: 2,
        desc: '+2/cấp Giới hạn dự trữ Xăng tối đa trong trận.',
        getEffectText(lv) { return `Trần Xăng tối đa: +${lv * 2}`; }
    },
    ec_8: {
        id: 'ec_8', branch: 'economy', order: 8, x: 575, y: 315,
        name: 'Chiến Lợi Phẩm Nóng', icon: '💰', maxLevel: 4, baseCost: 30, costStep: 5, requires: ['ec_6'],
        statType: 'killGasChance', perLevel: 0.04,
        desc: '+4%/cấp Tỷ lệ nhận ngay +0.5 Xăng mỗi khi tiêu diệt 1 kẻ địch.',
        getEffectText(lv) { return `Tỷ lệ rơi Xăng khi diệt địch: +${lv * 4}%`; }
    },
    ec_9: {
        id: 'ec_9', branch: 'economy', order: 9, x: 645, y: 315,
        name: 'Tiếp Vận Siêu Tốc', icon: '🚀', maxLevel: 3, baseCost: 35, costStep: 5, requires: ['ec_7'],
        statType: 'gasRegenPct', perLevel: 0.10,
        desc: '+10%/cấp Tốc độ hồi phục Xăng cực đại.',
        getEffectText(lv) { return `Tốc hồi Xăng Tinh Anh: +${lv * 10}%`; }
    },
    ec_10: {
        id: 'ec_10', branch: 'economy', order: 10, x: 610, y: 215, isKeystone: true,
        name: '⚛️ LÒ PHẢN ỨNG VÔ CỰC (ĐẶC BIỆT)', icon: '🔋', maxLevel: 1, baseCost: 220, costStep: 0, requires: ['ec_8', 'ec_9'],
        specialKey: 'infinite_reactor',
        desc: '[KỸ NĂNG ĐẶC BIỆT] Tăng giới hạn Xăng tối đa lên 30 và cứ mỗi khi tiêu tốn đủ 5 Xăng sẽ hoàn lại ngay 1 Xăng tức thì!',
        getEffectText(lv) { return lv > 0 ? 'ĐÃ KÍCH HOẠT: Trần 30 Xăng & Hoàn 1⛽ mỗi 5⛽ tiêu!' : 'Chưa mở khóa (Cần 220 ⚪)'; }
    }
};

// Sơ đồ các đoạn nối hình Cây Cổ Thụ Tự Nhiên (Gốc -> Thân -> Tỏa 4 Nhánh Độc Lập, không giao chéo)
export const ANCIENT_TREE_BRANCH_LINES = [
    // Gốc & Thân cây trung tâm (y: 745 -> 665)
    { from: { x: 360, y: 745 }, to: { x: 360, y: 675 }, reqNode: null },
    // 4 Cành chính tỏa ngang từ thân cây ra 4 nhánh độc lập
    { from: { x: 360, y: 675 }, to: { x: 110, y: 610 }, reqNode: 'fp_1' },
    { from: { x: 360, y: 675 }, to: { x: 275, y: 610 }, reqNode: 'ft_1' },
    { from: { x: 360, y: 675 }, to: { x: 445, y: 610 }, reqNode: 'sm_1' },
    { from: { x: 360, y: 675 }, to: { x: 610, y: 610 }, reqNode: 'ec_1' },

    // Nhánh 1: Hỏa Lực
    { from: 'fp_1', to: 'fp_2' }, { from: 'fp_1', to: 'fp_3' },
    { from: 'fp_2', to: 'fp_4' }, { from: 'fp_3', to: 'fp_5' },
    { from: 'fp_4', to: 'fp_6' }, { from: 'fp_5', to: 'fp_7' },
    { from: 'fp_6', to: 'fp_8' }, { from: 'fp_7', to: 'fp_9' },
    { from: 'fp_8', to: 'fp_10' }, { from: 'fp_9', to: 'fp_10' },

    // Nhánh 2: Pháo Đài
    { from: 'ft_1', to: 'ft_2' }, { from: 'ft_1', to: 'ft_3' },
    { from: 'ft_2', to: 'ft_4' }, { from: 'ft_3', to: 'ft_5' },
    { from: 'ft_4', to: 'ft_6' }, { from: 'ft_5', to: 'ft_7' },
    { from: 'ft_6', to: 'ft_8' }, { from: 'ft_7', to: 'ft_9' },
    { from: 'ft_8', to: 'ft_10' }, { from: 'ft_9', to: 'ft_10' },

    // Nhánh 3: Triệu Hồi
    { from: 'sm_1', to: 'sm_2' }, { from: 'sm_1', to: 'sm_3' },
    { from: 'sm_2', to: 'sm_4' }, { from: 'sm_3', to: 'sm_5' },
    { from: 'sm_4', to: 'sm_6' }, { from: 'sm_5', to: 'sm_7' },
    { from: 'sm_6', to: 'sm_8' }, { from: 'sm_7', to: 'sm_9' },
    { from: 'sm_8', to: 'sm_10' }, { from: 'sm_9', to: 'sm_10' },

    // Nhánh 4: Kinh Tế
    { from: 'ec_1', to: 'ec_2' }, { from: 'ec_1', to: 'ec_3' },
    { from: 'ec_2', to: 'ec_4' }, { from: 'ec_3', to: 'ec_5' },
    { from: 'ec_4', to: 'ec_6' }, { from: 'ec_5', to: 'ec_7' },
    { from: 'ec_6', to: 'ec_8' }, { from: 'ec_7', to: 'ec_9' },
    { from: 'ec_8', to: 'ec_10' }, { from: 'ec_9', to: 'ec_10' }
];

export function getSkillTreeNodeCost(nodeId, currentLv) {
    const node = ANCIENT_SKILL_TREE[nodeId];
    if (!node) return 999;
    const lv = Math.max(0, Math.floor(Number(currentLv) || 0));
    return node.baseCost + lv * node.costStep;
}

/* 9. DANH MỤC 17 BINH CHỦNG + KHÔNG KÍCH + CHIẾN BINH XƯƠNG (100% TỰ VẼ CANVAS 2D) */
export const UNIT_CATALOG = [
    {
        id: 'infantry',
        aliasId: 'rifleman',
        name: 'Bộ Binh',
        role: 'Lính Xung Kích',
        category: 'infantry',
        element: 'physical',
        isWalker: true,
        cost: 2,
        cooldown: 1.5,
        hp: 150,
        damage: 22,
        dmg: 22,
        range: 95,
        speed: 45,
        fireRate: 0.85,
        atkSpeed: 0.85,
        radius: 11,
        attackType: 'beam',
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'bazooka',
        name: 'Lính Tên Lửa',
        role: 'Khắc Tinh Cơ Giới',
        category: 'infantry',
        element: 'physical',
        isWalker: true,
        cost: 3,
        cooldown: 2.2,
        hp: 135,
        damage: 58,
        dmg: 58,
        range: 125,
        speed: 37,
        fireRate: 0.65,
        atkSpeed: 0.65,
        splash: 28,
        radius: 11,
        attackType: 'projectile',
        projType: 'rocket_short',
        projSpeed: 250,
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'sniper',
        name: 'Lính Bắn Tỉa',
        role: 'Xạ Thủ Tầm Xa',
        category: 'infantry',
        element: 'physical',
        isWalker: true,
        cost: 3,
        cooldown: 2.8,
        hp: 110,
        damage: 95,
        dmg: 95,
        range: 195,
        speed: 35,
        fireRate: 0.50,
        atkSpeed: 0.50,
        radius: 11,
        attackType: 'beam',
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'humvee',
        name: 'Xe Humvee',
        role: 'Trinh Sát Cơ Động',
        category: 'vehicle',
        element: 'physical',
        cost: 4,
        cooldown: 3.0,
        hp: 340,
        damage: 32,
        dmg: 32,
        range: 115,
        speed: 62,
        fireRate: 1.65,
        atkSpeed: 1.65,
        radius: 14,
        attackType: 'beam',
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'apc',
        name: 'Xe Thiết Giáp APC',
        role: 'Đỡ Đạn Tuyến Đầu',
        category: 'vehicle',
        element: 'physical',
        cost: 5,
        cooldown: 3.8,
        hp: 620,
        damage: 40,
        dmg: 40,
        range: 108,
        speed: 46,
        fireRate: 1.15,
        atkSpeed: 1.15,
        radius: 15,
        attackType: 'projectile',
        projType: 'shell',
        projSpeed: 270,
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'tank',
        name: 'Xe Tăng Chiến Đấu',
        role: 'Chủ Lực Mặt Đất',
        category: 'vehicle',
        element: 'physical',
        cost: 6,
        cooldown: 4.5,
        hp: 840,
        damage: 118,
        dmg: 118,
        range: 142,
        speed: 36,
        fireRate: 0.60,
        atkSpeed: 0.60,
        splash: 34,
        arcHeight: 24,
        radius: 15,
        attackType: 'projectile',
        projType: 'shell',
        projSpeed: 250,
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'heavy_tank',
        name: 'Siêu Tăng Hạng Nặng',
        role: 'Pháo Đài Di Động',
        category: 'vehicle',
        element: 'physical',
        cost: 8,
        cooldown: 6.2,
        hp: 1480,
        damage: 198,
        dmg: 198,
        range: 158,
        speed: 27,
        fireRate: 0.48,
        atkSpeed: 0.48,
        splash: 44,
        arcHeight: 30,
        radius: 17,
        attackType: 'projectile',
        projType: 'arc_missile',
        projSpeed: 235,
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'heli',
        name: 'Trực Thăng Vũ Trang',
        role: 'Không Quân Yểm Trợ',
        category: 'air',
        element: 'physical',
        isAir: true,
        cost: 6,
        cooldown: 5.0,
        hp: 520,
        damage: 86,
        dmg: 86,
        range: 148,
        speed: 58,
        fireRate: 0.90,
        atkSpeed: 0.90,
        splash: 28,
        altitude: 26,
        radius: 15,
        attackType: 'projectile',
        projType: 'air_missile',
        projSpeed: 280,
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'patrol_boat',
        name: 'Thuyền Tuần Tra',
        role: 'Thủy Quân Cơ Động',
        category: 'naval',
        element: 'physical',
        isNaval: true,
        cost: 3,
        cooldown: 2.5,
        hp: 360,
        damage: 38,
        dmg: 38,
        range: 122,
        speed: 56,
        fireRate: 1.45,
        atkSpeed: 1.45,
        radius: 14,
        attackType: 'beam',
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'destroyer',
        name: 'Tàu Khu Trục',
        role: 'Pháo Hạm Đa Năng',
        category: 'naval',
        element: 'physical',
        isNaval: true,
        cost: 5,
        cooldown: 4.2,
        hp: 780,
        damage: 98,
        dmg: 98,
        range: 162,
        speed: 40,
        fireRate: 0.72,
        atkSpeed: 0.72,
        splash: 32,
        arcHeight: 22,
        radius: 15,
        attackType: 'projectile',
        projType: 'shell',
        projSpeed: 255,
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'battleship',
        name: 'Thiết Giáp Hạm',
        role: 'Bá Chủ Đại Dương',
        category: 'naval',
        element: 'physical',
        isNaval: true,
        cost: 8,
        cooldown: 6.5,
        hp: 1580,
        damage: 218,
        dmg: 218,
        range: 195,
        speed: 28,
        fireRate: 0.45,
        atkSpeed: 0.45,
        splash: 48,
        arcHeight: 34,
        radius: 17,
        attackType: 'projectile',
        projType: 'arc_missile',
        projSpeed: 230,
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'pyromancer',
        name: 'Phù Thủy Lửa',
        role: 'Pháp Sư Hỏa Cầu (Thiêu Đốt)',
        category: 'infantry',
        element: 'elemental',
        isWalker: true,
        cost: 4,
        cooldown: 3.5,
        hp: 190,
        damage: 64,
        dmg: 64,
        range: 138,
        speed: 38,
        fireRate: 0.70,
        atkSpeed: 0.70,
        splash: 38,
        arcHeight: 28,
        radius: 12,
        innateBurnDps: 22,
        innateBurnDuration: 3.0,
        attackType: 'projectile',
        projType: 'fireball',
        projSpeed: 245,
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'cryomancer',
        name: 'Pháp Sư Băng Giá',
        role: 'Khống Chế Đóng Băng (-55% Tốc)',
        category: 'infantry',
        element: 'elemental',
        isWalker: true,
        cost: 4,
        cooldown: 3.8,
        hp: 205,
        damage: 45,
        dmg: 45,
        range: 145,
        speed: 38,
        fireRate: 0.75,
        atkSpeed: 0.75,
        splash: 42,
        arcHeight: 18,
        radius: 12,
        chillSlowPct: 0.55,
        chillDuration: 2.5,
        attackType: 'projectile',
        projType: 'ice_shard',
        projSpeed: 255,
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'cleric',
        name: 'Mục Sư Thánh Quang',
        role: 'Hồi Máu 2 Đồng Minh Thấp HP',
        category: 'infantry',
        element: 'elemental',
        isWalker: true,
        isHealer: true,
        healTargetsCount: 2,
        cost: 3,
        cooldown: 3.2,
        hp: 220,
        damage: 35,
        dmg: 35,
        range: 120,
        speed: 42,
        fireRate: 1.00,
        atkSpeed: 1.00,
        radius: 11,
        attackType: 'heal_beam',
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'necromancer',
        name: 'Pháp Sư Chiêu Hồn',
        role: 'Triệu Hồi Chiến Binh Xương',
        category: 'infantry',
        element: 'elemental',
        isWalker: true,
        isNecromancer: true,
        soulHarvestRadius: 135,
        maxSkeletons: 4,
        cost: 6,
        cooldown: 5.5,
        hp: 280,
        damage: 55,
        dmg: 55,
        range: 150,
        speed: 34,
        fireRate: 0.65,
        atkSpeed: 0.65,
        splash: 26,
        arcHeight: 16,
        radius: 12,
        attackType: 'projectile',
        projType: 'dark_orb',
        projSpeed: 245,
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'mecha_paladin',
        name: 'Robot Hộ Vệ Titan',
        role: 'Khiên Lục Giác (-35% Đạn Xa)',
        category: 'vehicle',
        element: 'elemental',
        rangedShieldReductionPct: 0.35,
        cost: 7,
        cooldown: 5.8,
        hp: 1350,
        damage: 110,
        dmg: 110,
        range: 92,
        speed: 33,
        fireRate: 0.85,
        atkSpeed: 0.85,
        radius: 17,
        attackType: 'beam',
        sockets: [null, null],
        defaultChips: [null, null]
    },
    {
        id: 'railgun_walker',
        name: 'Pháo Điện Từ Railgun',
        role: 'Bắn Xuyên Tuyến & Làm Choáng',
        category: 'vehicle',
        element: 'elemental',
        isRailgunLine: true,
        lineStunDuration: 0.8,
        cost: 8,
        cooldown: 6.5,
        hp: 760,
        damage: 215,
        dmg: 215,
        range: 210,
        speed: 28,
        fireRate: 0.42,
        atkSpeed: 0.42,
        radius: 16,
        attackType: 'railgun_line',
        sockets: [null, null],
        defaultChips: [null, null]
    }
];

export const SKELETON_SUMMON_SPEC = {
    id: 'skeleton',
    name: 'Chiến Binh Xương',
    role: 'Vong Linh Triệu Hồi',
    category: 'infantry',
    element: 'elemental',
    isWalker: true,
    isSummonedSkeleton: true,
    cost: 0,
    cooldown: 1.0,
    hp: 165,
    damage: 32,
    dmg: 32,
    range: 42,
    speed: 54,
    fireRate: 1.25,
    atkSpeed: 1.25,
    radius: 10,
    attackType: 'beam',
    sockets: [null, null],
    defaultChips: [null, null]
};

export const AIRSTRIKE_SPEC = {
    id: 'airstrike',
    name: 'Không Kích',
    role: 'Oanh Tạc Chiến Thuật',
    category: 'air',
    element: 'physical',
    isAir: true,
    isAirstrike: true,
    cost: 5,
    cooldown: 5.5,
    hp: 100,
    damage: 95,
    dmg: 95,
    baseDamage: 95,
    range: 300,
    speed: 440,
    fireRate: 1.0,
    atkSpeed: 1.0,
    splash: 52,
    sockets: [null, null],
    defaultChips: [null, null]
};

export const UNIT_BY_ID = {};
UNIT_CATALOG.forEach(u => {
    UNIT_BY_ID[u.id] = u;
});
UNIT_BY_ID['rifleman'] = UNIT_BY_ID['infantry'];
UNIT_BY_ID['airstrike'] = AIRSTRIKE_SPEC;
UNIT_BY_ID['skeleton'] = SKELETON_SUMMON_SPEC;
export const UNIT_MAP = UNIT_BY_ID;

/* 10. DANH MỤC 14 LOẠI ZOMBIE & BOSS (GÓC NHÌN FRONT-TOP VIEW CHO CHẾ ĐỘ CHALLENGE) */
export const ZOMBIE_CATALOG = [
    {
        id: 'zombie_walker',
        name: 'Walker Zombie',
        role: 'Xác Sống Bầy Đàn',
        hp: 210,
        damage: 24,
        speed: 32,
        range: 28,
        fireRate: 0.90,
        radius: 12,
        scale: 1.0,
        expReward: 8,
        desc: 'Da xanh tái, mắt lờ đờ, áo rách, tiến chậm theo bầy đông.'
    },
    {
        id: 'zombie_runner',
        name: 'Crawler Runner Zombie',
        role: 'Tốc Độ Cực Nhanh',
        hp: 155,
        damage: 28,
        speed: 68,
        range: 26,
        fireRate: 1.25,
        radius: 11,
        scale: 1.0,
        expReward: 10,
        desc: 'Dáng lao gù sát đất, mắt đỏ rực, lao cực nhanh áp sát Tower.'
    },
    {
        id: 'zombie_bunny_rider',
        name: 'Zombie Cưỡi Thỏ Đột Biến',
        role: 'Nhảy Lắt Léo Cơ Động',
        hp: 280,
        damage: 34,
        speed: 62,
        range: 30,
        fireRate: 1.15,
        radius: 14,
        scale: 1.08,
        zigzagAmp: 22,
        expReward: 14,
        desc: 'Zombie cưỡi trên lưng thỏ khổng lồ tai dài mắt đỏ, nhảy lắt léo tốc độ cao.'
    },
    {
        id: 'zombie_horse_knight',
        name: 'Kỵ Sĩ Ngựa Xương',
        role: 'Xung Kích Phá Tháp',
        hp: 640,
        damage: 58,
        speed: 48,
        range: 32,
        fireRate: 0.85,
        radius: 16,
        scale: 1.15,
        towerBonusMult: 1.35,
        expReward: 22,
        desc: 'Zombie mặc giáp sắt rỉ sét cưỡi chiến mã thây ma, HP cao, húc phá Tower.'
    },
    {
        id: 'zombie_tiger_lord',
        name: 'Chúa Tể Cưỡi Hổ Răng Kiếm',
        role: 'Sát Thủ Cận Chiến Mạnh',
        hp: 760,
        damage: 86,
        speed: 56,
        range: 34,
        fireRate: 1.10,
        radius: 17,
        scale: 1.20,
        expReward: 28,
        desc: 'Thủ lĩnh zombie cưỡi hổ vằn đột biến hung dữ, tốc độ nhanh và sát thương cận chiến rất mạnh.'
    },
    {
        id: 'zombie_spitter',
        name: 'Zombie Phun Axit',
        role: 'Xạ Thủ Độc Tố (-40% Tốc Bắn)',
        hp: 260,
        damage: 32,
        speed: 34,
        range: 148,
        fireRate: 0.70,
        radius: 12,
        scale: 1.0,
        attackType: 'projectile',
        projType: 'acid_glob',
        projSpeed: 235,
        acidSlowFireRatePct: 0.40,
        acidDuration: 3.0,
        expReward: 15,
        desc: 'Đeo bình hóa chất xanh phát sáng sau lưng, phun đạn axit làm giảm 40% tốc độ bắn của Tower.'
    },
    {
        id: 'zombie_bomber',
        name: 'Zombie Cảm Tử Ôm Bom',
        role: 'Nổ Cảm Tử Diện Rộng',
        hp: 240,
        damage: 210,
        speed: 52,
        range: 28,
        fireRate: 1.0,
        radius: 13,
        scale: 1.05,
        isBomber: true,
        splash: 75,
        expReward: 16,
        desc: 'Ôm thùng thuốc nổ TNT đỏ nhấp nháy trước ngực, phát nổ diện rộng khi chạm vào Tower.'
    },
    {
        id: 'zombie_necromancer',
        name: 'Pháp Sư Zombie Gọi Hồn',
        role: 'Triệu Hồi Walker Zombie',
        hp: 420,
        damage: 40,
        speed: 30,
        range: 145,
        fireRate: 0.65,
        radius: 13,
        scale: 1.08,
        attackType: 'projectile',
        projType: 'dark_orb',
        projSpeed: 230,
        summonCooldown: 5.5,
        expReward: 24,
        desc: 'Đội mũ đầu lâu, cầm trượng xương tím, định kỳ triệu hồi thêm Walker Zombie xung quanh.'
    },
    {
        id: 'zombie_riot',
        name: 'Zombie Khiên Chống Bạo Động',
        role: 'Khiên Thép (-50% DMG Trước)',
        hp: 720,
        damage: 36,
        speed: 28,
        range: 28,
        fireRate: 0.80,
        radius: 14,
        scale: 1.08,
        frontalShieldReductionPct: 0.50,
        expReward: 20,
        desc: 'Cầm khiên thép chữ nhật lớn che trước mặt, giảm 50% sát thương từ các đòn bắn phía trước.'
    },
    {
        id: 'zombie_cyborg',
        name: 'Cyborg Zombie',
        role: 'Lưỡi Cưa & Kháng Khống Chế',
        hp: 680,
        damage: 74,
        speed: 44,
        range: 30,
        fireRate: 1.20,
        radius: 14,
        scale: 1.10,
        ccImmune: true,
        expReward: 25,
        desc: 'Nửa khuôn mặt bọc thép với mắt laser đỏ, tay phải là lưỡi cưa máy, miễn nhiễm làm chậm/đóng băng.'
    },
    {
        id: 'zombie_mecha',
        name: 'Mecha-Zombie MK-IV',
        role: 'Cỗ Máy Bắn Tên Lửa',
        hp: 1150,
        damage: 68,
        speed: 26,
        range: 165,
        fireRate: 0.60,
        radius: 17,
        scale: 1.22,
        attackType: 'projectile',
        projType: 'arc_missile',
        projSpeed: 230,
        splash: 38,
        expReward: 34,
        desc: 'Cỗ máy chiến đấu bọc thép có lồng kính chứa đầu zombie bên trong, vừa tiến vừa bắn tên lửa vào Tower.'
    },
    {
        id: 'boss_butcher',
        name: 'BOSS: Đồ Tể Khổng Lồ',
        role: 'BOSS Wave 7 • Chém Lan',
        hp: 4600,
        damage: 145,
        speed: 24,
        range: 42,
        fireRate: 0.75,
        radius: 24,
        scale: 2.0,
        isBoss: true,
        bossWave: 7,
        cleaveRadius: 68,
        expReward: 120,
        desc: 'Kích thước gấp 2.0 lần, mặt khâu chằng chịt, cầm dao phay khổng lồ chém lan nhiều Tower cùng lúc.'
    },
    {
        id: 'boss_chimera',
        name: 'BOSS: Quái Thú Chimera',
        role: 'BOSS Wave 14 • Gầm Choáng',
        hp: 8200,
        damage: 185,
        speed: 28,
        range: 46,
        fireRate: 0.85,
        radius: 25,
        scale: 2.0,
        isBoss: true,
        bossWave: 14,
        roarCooldown: 6.5,
        roarRadius: 135,
        roarStunDuration: 2.2,
        expReward: 200,
        desc: 'Kích thước gấp 2.0 lần, quái thú đột biến 2 đầu có sừng, gầm rú sóng âm làm choáng các Tower diện rộng.'
    },
    {
        id: 'boss_omega_tyrant',
        name: 'BOSS: Bạo Chúa Omega',
        role: 'BOSS Wave 20 • 4 Nòng Plasma',
        hp: 15500,
        damage: 240,
        speed: 20,
        range: 185,
        fireRate: 0.75,
        radius: 28,
        scale: 2.2,
        isBoss: true,
        bossWave: 20,
        attackType: 'projectile',
        projType: 'arc_missile',
        projSpeed: 245,
        splash: 46,
        summonCooldown: 7.0,
        expReward: 400,
        desc: 'Kích thước gấp 2.2 lần, đại boss Zombie-Robot trang bị 4 nòng pháo plasma, giáp dày và liên tục gọi viện binh.'
    }
];

export const ZOMBIE_BY_ID = {};
ZOMBIE_CATALOG.forEach(z => {
    ZOMBIE_BY_ID[z.id] = z;
});

/* 11. HỆ THỐNG CỘNG HƯỞNG ĐỘI HÌNH TRONG TRẬN (IN-BATTLE SYNERGIES) */
export const BATTLE_SYNERGIES = {
    thermal_shock: {
        id: 'thermal_shock',
        name: 'Sốc Nhiệt',
        shortBadge: '🔥❄️ Sốc Nhiệt (+25% DMG)',
        cssClass: 'synergy-thermal',
        requiredUnits: ['pyromancer', 'cryomancer'],
        trueDmgBonusPct: 0.25,
        desc: 'Khi có mặt cả Phù Thủy Lửa & Pháp Sư Băng: Đòn đánh của cả hai gây thêm +25% sát thương chuẩn.'
    },
    immortal_fortress: {
        id: 'immortal_fortress',
        name: 'Pháo Đài Bất Tử',
        shortBadge: '✨🛡️ Pháo Đài (+20% Hồi & +15% Giáp)',
        cssClass: 'synergy-fortress',
        requiredUnits: ['cleric', 'mecha_paladin'],
        healBonusPct: 0.20,
        globalArmorBonusPct: 0.15,
        desc: 'Khi có mặt cả Mục Sư & Robot Hộ Vệ Titan: Tăng +20% hiệu quả hồi máu và +15% giáp toàn quân Xanh.'
    },
    dark_legion: {
        id: 'dark_legion',
        name: 'Quân Đoàn Bóng Đêm',
        shortBadge: '💀😈 Quân Đoàn Ám (Xương x2)',
        cssClass: 'synergy-darklegion',
        requiredUnits: ['necromancer'],
        requiresDemonUnit: true,
        skeletonStatMult: 2.0,
        desc: 'Khi có mặt Pháp Sư Chiêu Hồn cùng ít nhất 1 đơn vị bậc Demon trên sân: Chiến Binh Xương có HP & DMG gấp đôi.'
    }
};

/* 12. HỆ THỐNG Ụ PHÁO PHÒNG THỦ CĂN CỨ XANH (BASE TURRET) */
export const BASE_TURRET_CONFIG = {
    gatling: {
        id: 'gatling',
        name: 'Pháo Gatling Phòng Thủ',
        shortName: 'GATLING',
        icon: '🔫',
        baseDamage: 28,
        fireRate: 2.2,
        range: 185,
        splash: 0,
        color: '#38bdf8',
        desc: 'Bắn liên thanh tốc độ cao (2.2 phát/s) tiêu diệt nhanh bộ binh và cơ giới nhẹ áp sát căn cứ.'
    },
    sam_missile: {
        id: 'sam_missile',
        name: 'Tên Lửa Phòng Thủ SAM',
        shortName: 'SAM MISSILE',
        icon: '🚀',
        baseDamage: 72,
        fireRate: 0.75,
        range: 215,
        splash: 44,
        color: '#f97316',
        desc: 'Phóng tên lửa tầm xa (215px) phát nổ diện rộng (bán kính 44px), khắc chế đội hình địch đông đúc.'
    },
    tesla_coil: {
        id: 'tesla_coil',
        name: 'Tháp Sét Từ Trường Tesla',
        shortName: 'TESLA COIL',
        icon: '⚡',
        baseDamage: 46,
        fireRate: 1.15,
        range: 175,
        chainTargets: 2,
        stunDuration: 0.65,
        chillDuration: 1.8,
        color: '#c084fc',
        desc: 'Phóng hồ quang điện giật 2 mục tiêu cùng lúc, làm choáng 0.65s và làm chậm 55% trong 1.8s.'
    }
};

export function getBaseTurretUpgradeCost(currentLv) {
    const lv = Math.max(1, Math.floor(Number(currentLv) || 1));
    return Math.round(1500 * Math.pow(1.45, Math.min(25, lv - 1)));
}

/* 13. HỆ THỐNG SỔ TAY INDEX (CODEX MILESTONES) */
export const CODEX_MILESTONES = [
    { id: 'mythic', label: 'MYTHIC 🔴', minRank: 10, rewardGems: 250,  rewardMedals: 2 },
    { id: 'secret', label: 'SECRET ⚫', minRank: 15, rewardGems: 600,  rewardMedals: 5 },
    { id: 'master', label: 'MASTER 🌊', minRank: 21, rewardGems: 1500, rewardMedals: 12 },
    { id: 'demon',  label: 'DEMON 😈',  minRank: 30, rewardGems: 4000, rewardMedals: 30 }
];

/* 14. CẤU HÌNH VÒNG QUAY MAY MẮN 8 Ô & PITY 100 */
export const LUCKY_WHEEL_CONFIG = {
    singlePrice: 200,
    tenPrice: 1800,
    pityMax: 100,
    slices: [
        { index: 0, id: 'coins_25k',      label: '+25K 🪙',    fullName: '+25,000 Vàng 🪙',                   icon: '🪙', type: 'coins',        amount: 25000, weight: 30.0, bgColor: '#eab308', textColor: '#0f172a' },
        { index: 1, id: 'gems_500',       label: '+500 💎',    fullName: '+500 Gems 💎',                      icon: '💎', type: 'gems',         amount: 500,   weight: 25.0, bgColor: '#0284c7', textColor: '#ffffff' },
        { index: 2, id: 'medals_15',      label: '+15 🎖️',     fullName: '+15 Huy Chương 🎖️',                 icon: '🎖️', type: 'medals',       amount: 15,    weight: 18.0, bgColor: '#16a34a', textColor: '#ffffff' },
        { index: 3, id: 'card_epic',      label: 'EPIC 🟣',    fullName: '1 Thẻ Tướng Bậc EPIC 🟣',           icon: '🟣', type: 'card',         rarity: 'epic',      weight: 12.0, bgColor: '#7e22ce', textColor: '#ffffff' },
        { index: 4, id: 'card_legendary', label: 'LEG 🟠',     fullName: '1 Thẻ Tướng Bậc LEGENDARY 🟠',      icon: '🟠', type: 'card',         rarity: 'legendary', weight: 8.0,  bgColor: '#ea580c', textColor: '#ffffff' },
        { index: 5, id: 'card_mythic',    label: 'MYTHIC 🔴',  fullName: '1 Thẻ Tướng Bậc MYTHIC 🔴',         icon: '🔴', type: 'card',         rarity: 'mythic',    weight: 4.5,  bgColor: '#dc2626', textColor: '#ffffff' },
        { index: 6, id: 'card_secret',    label: 'SECRET ⚫',  fullName: '1 Thẻ Tướng Bậc SECRET ⚫',         icon: '⚫', type: 'card',         rarity: 'secret',    weight: 2.0,  bgColor: '#18181b', textColor: '#fde047' },
        { index: 7, id: 'card_jackpot',   label: 'JACKPOT 💠', fullName: 'JACKPOT: 1 Tướng MASTER / DEMON 💠', icon: '💠', type: 'jackpot_card', rarities: ['master', 'master1', 'master2', 'demon', 'demon1'], weight: 0.5, bgColor: '#a21caf', textColor: '#00f2fe' }
    ]
};

/* 15. CẤU HÌNH TRUNG TÂM 3 MINI-GAME GIẢI TRÍ */
export const MINIGAME_CONFIG = {
    mines: {
        id: 'mines',
        name: 'Đập Mìn Công Binh 5x5',
        entryCostCoins: 1000,
        gridSize: 25,
        safeCells: 20,
        mineCells: 5,
        baseCoinsPerSafe: 380,
        baseGemsPerSafe: 18,
        medalChancePerSafe: 0.22,
        multipliers: [
            1.20, 1.50, 1.85, 2.25, 2.75,
            3.35, 4.10, 5.00, 6.20, 7.60,
            9.50, 12.0, 15.0, 19.0, 24.0,
            31.0, 40.0, 52.0, 70.0, 100.0
        ]
    },
    catcher: {
        id: 'catcher',
        name: 'Hứng Tiếp Tế Dù 30s',
        durationSec: 30.0,
        canvasWidth: 320,
        canvasHeight: 210,
        playerSpeed: 230,
        spawnIntervalSec: 0.42,
        items: [
            { type: 'coins',  icon: '🪙', weight: 42, coins: 650,  gems: 0,  medals: 0, speed: 105, radius: 13, color: '#facc15' },
            { type: 'gems',   icon: '💎', weight: 28, coins: 0,    gems: 35, medals: 0, speed: 120, radius: 13, color: '#38bdf8' },
            { type: 'medals', icon: '🎖️', weight: 10, coins: 0,    gems: 0,  medals: 2, speed: 135, radius: 13, color: '#4ade80' },
            { type: 'bomb',   icon: '💣', weight: 20, coins: -800, gems: -20, medals: 0, speed: 145, radius: 14, color: '#ef4444' }
        ]
    },
    highlow: {
        id: 'highlow',
        name: 'Đoán Bài Chiến Thuật (Rank 0 ➔ 40)',
        entryCostCoins: 1500,
        initialPotCoins: 2000,
        initialPotGems: 25,
        winMultiplier: 1.85,
        bonusCardStreakThreshold: 5
    }
};

/* 16. DỮ LIỆU ĐỘT BIẾN ROGUELIKE & RAID BOSS */
export const ROGUELIKE_MUTATIONS = [
    { id: 'titan_armor',     name: 'Giáp Titan Hợp Kim',   desc: '+35% Máu tối đa toàn quân',                icon: '🛡️' },
    { id: 'plasma_rounds',   name: 'Đầu Đạn Plasma',       desc: '+30% Sát thương cho mọi đơn vị',           icon: '🔥' },
    { id: 'hyper_thrusters', name: 'Động Cơ Phản Lực',     desc: '+28% Tốc độ di chuyển toàn quân',          icon: '⚡' },
    { id: 'sniper_optics',   name: 'Ống Ngắm Quang Học',   desc: '+35 Tầm bắn xa cho toàn bộ đơn vị',        icon: '🎯' },
    { id: 'napalm_payload',  name: 'Đầu Đạn Napalm',       desc: 'Đạn để lại lửa cháy 3s & +18 Nổ lan',      icon: '💥' },
    { id: 'nano_leech',      name: 'Nano Hút Máu',         desc: 'Hồi máu bằng 22% sát thương gây ra',       icon: '💉' },
    { id: 'rapid_clone',     name: 'Dây Chuyền Nhân Bản',  desc: 'Giảm 25% thời gian hồi chiêu gọi quân',    icon: '⚙️' }
];

export const RAID_BOSS_CONFIG = {
    id: 'iron_leviathan',
    name: 'PHÁO ĐÀI HẠM LEVIATHAN MK-IX',
    x: 210,
    y: 82,
    hullHp: 12000
};

/* 17. DANH MỤC 45 BẢN ĐỒ RIÊNG BIỆT (1–15 CỔ ĐIỂN, 16–30 BIẾN THỂ CHIẾN THUẬT, 31–45 QUẦN XÃ ĐỘC BẢN) */
const ALL_45_MAPS_SPEC = [
    // --- MAPS 1 - 15 ---
    { id: 1,  name: 'CẦU QUA SÔNG',              theme: 'grass',       hasWater: true,  hasCoastFoam: false, desc: 'Sông lớn cắt ngang chiến trường. Quân bộ phải qua cầu đá chiến lược ở chính giữa.' },
    { id: 2,  name: 'ĐƯỜNG ĐÈO CHỮ S',           theme: 'grass',       hasWater: false, hasCoastFoam: false, desc: 'Đường nhựa chữ S uốn lượn xuyên rừng thông và vách núi đá hiểm trở.' },
    { id: 3,  name: 'ĐÔ THỊ PHỐ THỊ',            theme: 'grass',       hasWater: false, hasCoastFoam: false, desc: 'Khu đô thị bàn cờ với nhiều tòa nhà cao tầng chắn tầm nhìn pháo binh.' },
    { id: 4,  name: 'PHÁO ĐÀI GIỮA HỒ',          theme: 'grass',       hasWater: true,  hasCoastFoam: false, desc: 'Hồ nước rộng bao quanh pháo đài cổ giữa đảo, nối liền bằng 2 cầu Bắc - Nam.' },
    { id: 5,  name: 'MÊ CUNG RỪNG GIÀ',          theme: 'grass',       hasWater: false, hasCoastFoam: false, desc: 'Nhiều nhánh đường mòn đan xen giữa rừng rậm, thích hợp đánh bọc sườn.' },
    { id: 6,  name: 'KHU CÔNG NGHIỆP',           theme: 'brown_earth', hasWater: false, hasCoastFoam: false, desc: 'Tổ hợp nhà máy công nghiệp nặng với các tuyến đường vận tải bọc thép.' },
    { id: 7,  name: 'HẺM NÚI SONG HỒ',           theme: 'grass',       hasWater: true,  hasCoastFoam: false, desc: 'Đường đèo uốn lượn kẹp giữa 2 hồ nước sâu và dãy núi đá sát hai bên sườn.' },
    { id: 8,  name: 'ĐÈO ĐÁ HIỂM TRỞ',           theme: 'grass',       hasWater: false, hasCoastFoam: false, desc: 'Dãy núi đá khổng lồ chắn ngang, ép hai phe giao tranh tại khe đèo hẹp.' },
    { id: 9,  name: 'VÒNG XOAY THỊ TRẤN',        theme: 'grass',       hasWater: false, hasCoastFoam: false, desc: 'Hai bùng binh giao thông lớn chia nhánh bao quanh cụm dân cư trung tâm.' },
    { id: 10, name: 'BÃI BIỂN ĐỔ BỘ',            theme: 'grass',       hasWater: true,  hasCoastFoam: true,  desc: 'Bờ biển sóng vỗ bên trái cho phép Hải quân pháo kích yểm trợ Lục quân trên cát.' },
    { id: 11, name: 'CĂN CỨ TÊN LỬA',            theme: 'grass',       hasWater: false, hasCoastFoam: false, desc: 'Khu phức hợp quân sự đối xứng với đại lộ lớn, trạm radar và hầm phóng tên lửa.' },
    { id: 12, name: 'THÀNH CỔ BAO VÂY',          theme: 'grass',       hasWater: false, hasCoastFoam: false, desc: 'Tường thành đá kiên cố bao bọc pháo đài trung tâm cùng vành đai đường nhựa.' },
    { id: 13, name: 'QUẦN ĐẢO ĐA CẦU',           theme: 'grass',       hasWater: true,  hasCoastFoam: true,  desc: 'Hệ thống kênh rạch chia cắt chiến trường thành nhiều đảo nhỏ nối bằng 5 cây cầu.' },
    { id: 14, name: 'BÙNG BINH ĐẦM LẦY',         theme: 'grass',       hasWater: true,  hasCoastFoam: false, desc: 'Đường nhựa vòng tròn lớn bao quanh hồ nước trung tâm và rừng cây rậm rạp.' },
    { id: 15, name: 'PHÒNG TUYẾN TRƯỜNG THÀNH',   theme: 'grass',       hasWater: false, hasCoastFoam: false, desc: 'Hai dải tường thành đá cổ chắn ngang tiền tuyến với 3 cổng vòm chiến lược.' },

    // --- MAPS 16 - 30 (BIẾN THỂ ĐỊA HÌNH CHIẾN THUẬT RIÊNG BIỆT) ---
    { id: 16, name: 'CẦU ĐÔI HẺM NÚI',           theme: 'brown_earth', hasWater: true,  hasCoastFoam: false, desc: 'Hẻm núi đất nâu bị chia cắt bởi sông sâu với 2 cây cầu sắt ở hai cánh trái - phải.' },
    { id: 17, name: 'ĐÈO ZIGZAG CAO NGUYÊN',     theme: 'brown_earth', hasWater: false, hasCoastFoam: false, desc: 'Con đường đất đỏ gấp khúc 4 tầng len lỏi qua các mỏm đá cao nguyên dựng đứng.' },
    { id: 18, name: 'PHẾ TÍCH THỦ ĐÔ',           theme: 'brown_earth', hasWater: false, hasCoastFoam: false, desc: 'Đại lộ chính bị sụp đổ buộc quân đội chia làm hai cánh vòng qua các khối nhà đổ nát.' },
    { id: 19, name: 'PHÁO ĐÀI SONG ĐẢO',         theme: 'grass',       hasWater: true,  hasCoastFoam: false, desc: 'Hai hòn đảo pháo đài nằm song song giữa hồ lớn nối với đất liền qua 4 cầu gỗ.' },
    { id: 20, name: 'RỪNG THÔNG SƯƠNG MÙ',       theme: 'grass',       hasWater: false, hasCoastFoam: false, desc: 'Ba lối mòn độc đạo xuyên rừng thông cổ thụ tạo điểm phục kích lý tưởng cho pháo binh.' },
    { id: 21, name: 'NHÀ MÁY LỌC DẦU',           theme: 'brown_earth', hasWater: false, hasCoastFoam: false, desc: 'Các bồn chứa nhiên liệu khổng lồ xếp so le tạo mê cung giao tranh tầm gần.' },
    { id: 22, name: 'THUNG LŨNG TAM HỒ',         theme: 'grass',       hasWater: true,  hasCoastFoam: false, desc: 'Ba hồ nước xếp hình tam giác ép đường hành quân uốn lượn theo hình chữ W.' },
    { id: 23, name: 'CỬA ẢI THIẾT MÔN',          theme: 'brown_earth', hasWater: false, hasCoastFoam: false, desc: 'Vách núi đá đỏ khép chặt tạo thành 2 cửa ải hẹp ở tiền tuyến.' },
    { id: 24, name: 'GIAO LỘ BỐN HƯỚNG',         theme: 'grass',       hasWater: false, hasCoastFoam: false, desc: 'Bùng binh trung tâm khổng lồ tỏa ra 4 tuyến cao tốc hướng thẳng tới hai căn cứ.' },
    { id: 25, name: 'BÁN ĐẢO HẢI CẢNG',          theme: 'grass',       hasWater: true,  hasCoastFoam: true,  desc: 'Biển lớn bao bọc cả hai sườn trái - phải, chừa lại dải đất liền hẹp ở chính giữa.' },
    { id: 26, name: 'KHO VŨ KHÍ NGẦM',           theme: 'brown_earth', hasWater: false, hasCoastFoam: false, desc: 'Hệ thống boong-ke bê tông kiên cố chia chiến trường thành 3 hành lang tác chiến.' },
    { id: 27, name: 'THÀNH TRÌ BA LỚP',          theme: 'brown_earth', hasWater: false, hasCoastFoam: false, desc: 'Ba lớp tường thành đồng tâm bảo vệ trung tâm chỉ huy với các lối mở so le.' },
    { id: 28, name: 'ĐỒNG BẰNG CHÂU THỔ',       theme: 'grass',       hasWater: true,  hasCoastFoam: true,  desc: 'Dòng sông chẻ làm ba nhánh đổ ra biển cùng 6 cây cầu gỗ bắc ngang.' },
    { id: 29, name: 'HỒ NƯỚC THIÊNG',            theme: 'grass',       hasWater: true,  hasCoastFoam: false, desc: 'Hồ nước tròn lớn ở trung tâm với 2 cầu vượt chéo nối hai bờ Đông - Tây.' },
    { id: 30, name: 'CHIẾN HÀO BIÊN GIỚI',       theme: 'brown_earth', hasWater: false, hasCoastFoam: false, desc: 'Hệ thống chiến hào và ụ bê tông dày đặc trải dài khắp vùng đất biên giới.' },

    // --- MAPS 31 - 45 (15 QUẦN XÃ ĐỘC BẢN VỚI CƠ CHẾ MÔI TRƯỜNG RIÊNG) ---
    {
        id: 31, name: 'MIỆNG NÚI LỬA OBSIDIAN', theme: 'obsidian_volcano', biome: 'obsidian_volcano',
        hasWater: false, hasLava: true, hasCoastFoam: false,
        mechanicTag: '🌋 Dung nham chặn Thủy & Lục quân (Chỉ qua cầu thép hoặc Không quân)',
        desc: 'Đá bazan đen rực lửa với 2 hồ dung nham sôi sục hai cánh; Lục quân phải tiến qua cầu thép trung tâm.'
    },
    {
        id: 32, name: 'CHẢO LỬA DUNG NHAM KÉP', theme: 'twin_lava_crater', biome: 'twin_lava_crater',
        hasWater: false, hasLava: true, hasCoastFoam: false, scorchDurationMult: 2.0,
        mechanicTag: '🔥 Vệt cháy nổ trên cầu sắt tồn tại lâu gấp đôi',
        desc: 'Sông dung nham chữ X chia cắt chiến trường với 2 cầu sắt hai bên sườn; vệt cháy nổ tồn tại lâu gấp 2 lần.'
    },
    {
        id: 33, name: 'LÃNH NGUYÊN BĂNG GIÁ', theme: 'frozen_tundra', biome: 'frozen_tundra',
        hasWater: false, hasCoastFoam: false, vehicleIceSpeedBonus: 0.35,
        mechanicTag: '❄️ Vùng băng trung tâm tăng +35% tốc chạy cho Xe cơ giới',
        desc: 'Mặt tuyết trắng xanh và hồ băng đóng cứng ở trung tâm giúp Xe cơ giới trượt nhanh hơn +35% tốc độ.'
    },
    {
        id: 34, name: 'VỊNH BĂNG TAN BẮC CỰC', theme: 'arctic_iceberg_bay', biome: 'arctic_iceberg_bay',
        hasWater: true, hasCoastFoam: true,
        mechanicTag: '🧊 Tảng băng trôi trên biển buộc Thủy quân lạng lách',
        desc: 'Mặt biển Bắc Cực với nhiều tảng băng trôi nổi rải rác, tạo địa hình luồn lách chiến thuật cho Thủy quân.'
    },
    {
        id: 35, name: 'SA MẠC BÃO CÁT SAHARA', theme: 'sahara_sandstorm', biome: 'sahara_sandstorm',
        hasWater: false, hasCoastFoam: false, rangeMult: 0.80,
        mechanicTag: '🌪️ Bão cát sa mạc làm giảm -20% tầm bắn toàn bộ đơn vị',
        desc: 'Cồn cát vàng uốn lượn quanh ốc đảo nhỏ góc phải; bão cát mù mịt làm giảm 20% tầm bắn của mọi đơn vị.'
    },
    {
        id: 36, name: 'HẺM NÚI KIM TỰ THÁP', theme: 'pyramid_canyon', biome: 'pyramid_canyon',
        hasWater: false, hasCoastFoam: false,
        mechanicTag: '🔺 3 Kim Tự Tháp chia chiến trường thành 4 hành lang hẹp',
        desc: 'Địa hình đá đỏ cổ đại với 3 khối Kim Tự Tháp bậc thang sừng sững chia cắt tiền tuyến thành 4 lối đi hẹp.'
    },
    {
        id: 37, name: 'ĐẦM LẦY ĐỘC TỐ NEON', theme: 'neon_toxic_swamp', biome: 'neon_toxic_swamp',
        hasWater: false, hasToxicSwamp: true, hasCoastFoam: false, swampInfantryDotPct: 0.015,
        mechanicTag: '☣️ Bộ binh đi ngoài cầu gỗ bị rút 1.5% HP/giây bởi độc tố',
        desc: 'Đầm lầy tím thẫm chứa hồ axit xanh lục phát sáng; bộ binh đi ngoài đường cầu gỗ bị mất 1.5% HP mỗi giây.'
    },
    {
        id: 38, name: 'TRẠM KHÔNG GIAN QUỸ ĐẠO', theme: 'orbital_station', biome: 'orbital_station',
        hasWater: false, hasCoastFoam: false, moveSpeedMult: 1.20, projSpeedMult: 1.20,
        mechanicTag: '🛰️ Trọng lực thấp: +20% tốc độ di chuyển & +20% tốc độ đạn',
        desc: 'Sàn kim loại công nghệ cao lơ lửng ngoài vũ trụ; môi trường trọng lực thấp tăng 20% tốc chạy và tốc độ đạn.'
    },
    {
        id: 39, name: 'LÒ PHẢN ỨNG HẠT NHÂN', theme: 'nuclear_reactor', biome: 'nuclear_reactor',
        hasWater: false, hasCoastFoam: false, empExtraStunSec: 1.5,
        mechanicTag: '⚛️ Cộng hưởng từ trường: Kỹ năng [E] Xung EMP +1.5s làm choáng',
        desc: 'Tổ hợp nhà máy hạt nhân với lõi năng lượng Cyan trung tâm giúp kỹ năng [E] Xung EMP tăng thêm 1.5 giây tê liệt.'
    },
    {
        id: 40, name: 'CẢNG TÀU NGẦM BÍ MẬT', theme: 'submarine_harbor', biome: 'submarine_harbor',
        hasWater: true, hasCoastFoam: true,
        mechanicTag: '⚓ Vịnh nước chữ U 70% diện tích tối ưu đại chiến Hải quân',
        desc: '70% diện tích là vịnh biển sâu hình chữ U bao bọc cầu cảng chữ T ở giữa, lý tưởng cho hạm đội Hải quân.'
    },
    {
        id: 41, name: 'THUNG LŨNG HOA ANH ĐÀO', theme: 'sakura_valley', biome: 'sakura_valley',
        hasWater: true, hasCoastFoam: false,
        mechanicTag: '🌸 Suối ngọc bích uốn lượn với 3 cầu gỗ cổ truyền',
        desc: 'Thung lũng cỏ xanh ngọc điểm xuyết rừng hoa anh đào hồng phấn và dòng suối trong vắt bắc ngang 3 cây cầu gỗ.'
    },
    {
        id: 42, name: 'PHÁO ĐÀI BÁT QUÁI CỔ ĐẠI', theme: 'bagua_fortress', biome: 'bagua_fortress',
        hasWater: true, hasCoastFoam: false,
        mechanicTag: '☯️ Thành đá bát giác 4 cổng bao quanh bởi hào nước',
        desc: 'Trận đồ tường đá bát giác cổ đại mở 4 cổng Tứ Tượng, bao bọc bởi hào nước sâu và các cây cầu treo.'
    },
    {
        id: 43, name: 'SÂN BAY QUÂN SỰ DÃ CHIẾN', theme: 'military_airfield', biome: 'military_airfield',
        hasWater: false, hasCoastFoam: false, airCooldownMult: 0.75,
        mechanicTag: '✈️ Đường băng dã chiến: Giảm -25% hồi chiêu Trực thăng & Không kích',
        desc: 'Đường băng bê tông kẻ sọc vàng đen xuyên tâm giúp giảm 25% thời gian hồi chiêu cho Trực thăng và Không kích.'
    },
    {
        id: 44, name: 'RUỘNG BẬC THANG VÙNG CAO', theme: 'highland_terraces', biome: 'highland_terraces',
        hasWater: false, hasCoastFoam: false,
        mechanicTag: '🌾 Các tầng bậc thang xanh-vàng nối bằng dốc đá hẹp',
        desc: 'Những thửa ruộng bậc thang xanh - vàng óng ả xếp tầng ngang bản đồ, nối với nhau qua các con dốc đá chiến lược.'
    },
    {
        id: 45, name: 'ĐẤU TRƯỜNG TẬN THẾ (ABYSS GATE)', theme: 'abyss_gate', biome: 'abyss_gate',
        hasWater: false, hasLava: true, hasCoastFoam: false, gasRateMult: 1.30,
        mechanicTag: '😈 Cổng Ma Giới: Tốc độ hồi Xăng của cả 2 phe tăng +30%',
        desc: 'Mặt đất nứt nẻ ánh tím hắc ám với 2 cổng Ma Giới và cầu pha lê; năng lượng Hư Không tăng 30% tốc nạp Xăng.'
    }
];

export function buildAllMapsData() {
    return ALL_45_MAPS_SPEC.map(spec => {
        const i = spec.id;
        return {
            id: i,
            level: i,
            name: spec.name,
            theme: spec.theme,
            biome: spec.biome || spec.theme,
            hasWater: !!spec.hasWater,
            hasLava: !!spec.hasLava,
            hasToxicSwamp: !!spec.hasToxicSwamp,
            hasCoastFoam: !!spec.hasCoastFoam,
            scorchDurationMult: spec.scorchDurationMult || 1.0,
            vehicleIceSpeedBonus: spec.vehicleIceSpeedBonus || 0,
            rangeMult: spec.rangeMult || 1.0,
            swampInfantryDotPct: spec.swampInfantryDotPct || 0,
            moveSpeedMult: spec.moveSpeedMult || 1.0,
            projSpeedMult: spec.projSpeedMult || 1.0,
            empExtraStunSec: spec.empExtraStunSec || 0,
            airCooldownMult: spec.airCooldownMult || 1.0,
            gasRateMult: spec.gasRateMult || 1.0,
            mechanicTag: spec.mechanicTag || null,
            desc: spec.desc,
            enemyBaseHp: 260 + i * 50,
            playerBaseHp: 250 + Math.floor(i / 5) * 10,
            startingGas: 6
        };
    });
}

export const LEVELS = buildAllMapsData();
export const MAPS_DATA = LEVELS;

/* 18. DANH MỤC NHIỆM VỤ CHIẾN DỊCH */
export const MISSIONS_CATALOG = [
    { id: 'kill_50',     title: 'Tiêu diệt 50 quân địch',           target: 50,      rewardGems: 150,  rewardCoins: 2000,   statKey: 'kills' },
    { id: 'kill_250',    title: 'Tiêu diệt 250 quân địch',          target: 250,     rewardGems: 400,  rewardCoins: 6000,   statKey: 'kills' },
    { id: 'kill_1000',   title: 'Tiêu diệt 1,000 quân địch',        target: 1000,    rewardGems: 1200, rewardCoins: 25000,  statKey: 'kills' },
    { id: 'win_3',       title: 'Chiến thắng 3 trận bất kỳ',        target: 3,       rewardGems: 200,  rewardCoins: 3000,   statKey: 'wins' },
    { id: 'win_10',      title: 'Chiến thắng 10 trận',              target: 10,      rewardGems: 600,  rewardCoins: 10000,  statKey: 'wins' },
    { id: 'pull_10',     title: 'Mở 10 Rương Quân Nhu',             target: 10,      rewardGems: 300,  rewardCoins: 4500,   statKey: 'cratesOpened' },
    { id: 'pull_1000',   title: 'Mở 1,000 Rương Quân Nhu',          target: 1000,    rewardGems: 1500, rewardCoins: 35000,  statKey: 'cratesOpened' },
    { id: 'pull_1m',     title: 'Mở 1,000,000 Rương Quân Nhu',      target: 1000000, rewardGems: 5000, rewardCoins: 150000, statKey: 'cratesOpened' },
    { id: 'merge_5',     title: 'Ghép tiến hóa tướng 5 lần',        target: 5,       rewardGems: 250,  rewardCoins: 5000,   statKey: 'merges' },
    { id: 'merge_500',   title: 'Ghép tiến hóa tướng 500 lần',      target: 500,     rewardGems: 1800, rewardCoins: 45000,  statKey: 'merges' },
    { id: 'upgrade_20',  title: 'Nâng cấp Level Tướng 20 lần',      target: 20,      rewardGems: 500,  rewardCoins: 12000,  statKey: 'upgrades' }
];