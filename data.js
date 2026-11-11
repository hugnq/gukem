/* ============================================================================
   TINY BATTLE - CORE DATA ENGINE (ES MODULE STANDARD - ĐÃ FIX ĐỒNG BỘ 100%)
   Save Key: tiny_battle_meta_save_v3 (Tương thích ngược 100%)
   Nâng cấp:
   - 41 Bậc Độ Hiếm (Common ➔ Secret +5 ➔ Master +8 ➔ Demon +10 [7777.0x])
   - Thuật toán Mở Rương Siêu Tốc O(1) lên tới 1,000,000,000 (1 Tỷ) rương (< 0.005s)
   - Toán học khối O(1) tính chi phí Nâng cấp vượt cấp (+N Level bất kỳ & MAX)
   - Đồng bộ 100% thông số Kỹ năng Q/W/E/R (16s/18s/22s/24s) & 4 Chip Bổ Trợ
   - Cấu hình Vòng Quay May Mắn 8 Ô (Pity 100) & Trung Tâm 3 Mini-Game Giải Trí
   ============================================================================ */

export const STORAGE_KEY = 'tiny_battle_meta_save_v3';
export const META_SAVE_KEY = STORAGE_KEY;
export const ADMIN_PASSWORD = 'HUNGADMINDZ';

/* 0. HẰNG SỐ ĐỘNG CƠ CANVAS, LƯỚI ĐỊA HÌNH FLOW-FIELD, TỐC ĐỘ TRẬN & NÂNG CẤP XĂNG */
export const LOGICAL_WIDTH = 420;
export const LOGICAL_HEIGHT = 840;
export const BOTTOM_UI_HEIGHT = 126;
export const PLAYFIELD_HEIGHT = LOGICAL_HEIGHT - BOTTOM_UI_HEIGHT; // 714px
export const MAX_DECK_SLOTS = 5;
export const MAX_CUSTOM_UNIT_SLOTS = 4; // 4 Ô quân tự chọn + Ô 5 cố định là Airstrike
export const MAX_WAVES = 10;

export const NAV_CELL = 10;
export const GRID_W = Math.floor(LOGICAL_WIDTH / NAV_CELL);     // 42 cột
export const GRID_H = Math.floor(PLAYFIELD_HEIGHT / NAV_CELL);  // 71 hàng

export const T_OPEN = 0;
export const T_ROAD = 1;
export const T_WATER = 2;
export const T_BRIDGE = 3;
export const T_OBSTACLE = 4;

export const BATTLE_SPEED_MULTIPLIERS = [1, 2, 4];

export const GAS_UPGRADE_LEVELS = [
    { interval: 3.0, cost: 4,  label: '➔ 2.4s' },
    { interval: 2.4, cost: 6,  label: '➔ 1.9s' },
    { interval: 1.9, cost: 8,  label: '➔ 1.5s' },
    { interval: 1.5, cost: 11, label: '➔ 1.1s' },
    { interval: 1.1, cost: 0,  label: 'MAX' }
];

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
    if (n >= 1e12) return `${(n / 1e12).toFixed(2).replace(/\.00$/, '')}T`;
    if (n >= 1e9)  return `${(n / 1e9).toFixed(2).replace(/\.00$/, '')}B`;
    if (n >= 1e6)  return `${(n / 1e6).toFixed(2).replace(/\.00$/, '')}M`;
    if (n >= 1e4)  return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    return n.toLocaleString('en-US');
}

/* 2. HỆ THỐNG 41 BẬC ĐỘ HIẾM (RANK 0 ➔ 40: COMMON ➔ SECRET +5 ➔ MASTER +8 ➔ DEMON +10) */
export const RARITY_ORDER = [
    // Bậc cơ bản ➔ Secret +5 (Rank 0 ➔ 20)
    'common', 'uncommon', 'rare',
    'epic', 'epic1', 'epic2',
    'legendary', 'legendary1', 'legendary2', 'legendary3',
    'mythic', 'mythic1', 'mythic2', 'mythic3', 'mythic4',
    'secret', 'secret1', 'secret2', 'secret3', 'secret4', 'secret5',
    // Chuỗi 9 bậc MASTER (Rank 21 ➔ 29)
    'master', 'master1', 'master2', 'master3', 'master4', 'master5', 'master6', 'master7', 'master8',
    // Chuỗi 11 bậc DEMON (Rank 30 ➔ 40)
    'demon', 'demon1', 'demon2', 'demon3', 'demon4', 'demon5', 'demon6', 'demon7', 'demon8', 'demon9', 'demon10'
];

export const MAX_RARITY_RANK = RARITY_ORDER.length - 1; // Rank 40 (demon10)

export const RARITY_CONFIG = {
    // --- BẬC 0 ➔ 20: COMMON ĐẾN SECRET +5 (secret5 có next: 'master') ---
    common:     { id: 'common',     rank: 0,  next: 'uncommon',   plusLabel: '',   name: 'Common',       mult: 1.00,   statMult: 1.00,   color: '#94a3b8', glowColor: '#cbd5e1', auraType: 'none',        css: 'rarity-common',     cssClass: 'rarity-common' },
    uncommon:   { id: 'uncommon',   rank: 1,  next: 'rare',       plusLabel: '',   name: 'Uncommon',     mult: 1.25,   statMult: 1.25,   color: '#4ade80', glowColor: '#86efac', auraType: 'none',        css: 'rarity-uncommon',   cssClass: 'rarity-uncommon' },
    rare:       { id: 'rare',       rank: 2,  next: 'epic',       plusLabel: '',   name: 'Rare',         mult: 1.55,   statMult: 1.55,   color: '#60a5fa', glowColor: '#93c5fd', auraType: 'none',        css: 'rarity-rare',       cssClass: 'rarity-rare' },
    epic:       { id: 'epic',       rank: 3,  next: 'epic1',      plusLabel: '',   name: 'Epic',         mult: 1.90,   statMult: 1.90,   color: '#c084fc', glowColor: '#d8b4fe', auraType: 'none',        css: 'rarity-epic',       cssClass: 'rarity-epic' },
    epic1:      { id: 'epic1',      rank: 4,  next: 'epic2',      plusLabel: '+1', name: 'Epic +1',      mult: 2.30,   statMult: 2.30,   color: '#d8b4fe', glowColor: '#e9d5ff', auraType: 'none',        css: 'rarity-epic1',      cssClass: 'rarity-epic1' },
    epic2:      { id: 'epic2',      rank: 5,  next: 'legendary',  plusLabel: '+2', name: 'Epic +2',      mult: 2.75,   statMult: 2.75,   color: '#e879f9', glowColor: '#f5d0fe', auraType: 'none',        css: 'rarity-epic2',      cssClass: 'rarity-epic2' },
    legendary:  { id: 'legendary',  rank: 6,  next: 'legendary1', plusLabel: '',   name: 'Legendary',    mult: 3.40,   statMult: 3.40,   color: '#f59e0b', glowColor: '#fcd34d', auraType: 'gold',        css: 'rarity-legendary',  cssClass: 'rarity-legendary' },
    legendary1: { id: 'legendary1', rank: 7,  next: 'legendary2', plusLabel: '+1', name: 'Legendary +1', mult: 4.20,   statMult: 4.20,   color: '#fbbf24', glowColor: '#fde047', auraType: 'gold',        css: 'rarity-legendary1', cssClass: 'rarity-legendary1' },
    legendary2: { id: 'legendary2', rank: 8,  next: 'legendary3', plusLabel: '+2', name: 'Legendary +2', mult: 5.20,   statMult: 5.20,   color: '#facc15', glowColor: '#fef08a', auraType: 'gold',        css: 'rarity-legendary2', cssClass: 'rarity-legendary2' },
    legendary3: { id: 'legendary3', rank: 9,  next: 'mythic',     plusLabel: '+3', name: 'Legendary +3', mult: 6.40,   statMult: 6.40,   color: '#fde047', glowColor: '#fef9c3', auraType: 'gold',        css: 'rarity-legendary3', cssClass: 'rarity-legendary3' },
    mythic:     { id: 'mythic',     rank: 10, next: 'mythic1',    plusLabel: '',   name: 'Mythic',       mult: 8.00,   statMult: 8.00,   color: '#fb7185', glowColor: '#fda4af', auraType: 'crimson',     css: 'rarity-mythic',     cssClass: 'rarity-mythic' },
    mythic1:    { id: 'mythic1',    rank: 11, next: 'mythic2',    plusLabel: '+1', name: 'Mythic +1',    mult: 10.0,   statMult: 10.0,   color: '#f43f5e', glowColor: '#fb7185', auraType: 'crimson',     css: 'rarity-mythic1',    cssClass: 'rarity-mythic1' },
    mythic2:    { id: 'mythic2',    rank: 12, next: 'mythic3',    plusLabel: '+2', name: 'Mythic +2',    mult: 12.5,   statMult: 12.5,   color: '#ef4444', glowColor: '#f87171', auraType: 'crimson',     css: 'rarity-mythic2',    cssClass: 'rarity-mythic2' },
    mythic3:    { id: 'mythic3',    rank: 13, next: 'mythic4',    plusLabel: '+3', name: 'Mythic +3',    mult: 15.5,   statMult: 15.5,   color: '#dc2626', glowColor: '#ef4444', auraType: 'crimson',     css: 'rarity-mythic3',    cssClass: 'rarity-mythic3' },
    mythic4:    { id: 'mythic4',    rank: 14, next: 'secret',     plusLabel: '+4', name: 'Mythic +4',    mult: 19.0,   statMult: 19.0,   color: '#b91c1c', glowColor: '#f97316', auraType: 'crimson',     css: 'rarity-mythic4',    cssClass: 'rarity-mythic4' },
    secret:     { id: 'secret',     rank: 15, next: 'secret1',    plusLabel: '',   name: 'Secret',       mult: 24.0,   statMult: 24.0,   color: '#18181b', glowColor: '#71717a', auraType: 'dark_void',   css: 'rarity-secret',     cssClass: 'rarity-secret' },
    secret1:    { id: 'secret1',    rank: 16, next: 'secret2',    plusLabel: '+1', name: 'Secret +1',    mult: 30.0,   statMult: 30.0,   color: '#18181b', glowColor: '#a1a1aa', auraType: 'dark_void',   css: 'rarity-secret1',    cssClass: 'rarity-secret1' },
    secret2:    { id: 'secret2',    rank: 17, next: 'secret3',    plusLabel: '+2', name: 'Secret +2',    mult: 38.0,   statMult: 38.0,   color: '#09090b', glowColor: '#cbd5e1', auraType: 'dark_void',   css: 'rarity-secret2',    cssClass: 'rarity-secret2' },
    secret3:    { id: 'secret3',    rank: 18, next: 'secret4',    plusLabel: '+3', name: 'Secret +3',    mult: 48.0,   statMult: 48.0,   color: '#09090b', glowColor: '#e2e8f0', auraType: 'dark_void',   css: 'rarity-secret3',    cssClass: 'rarity-secret3' },
    secret4:    { id: 'secret4',    rank: 19, next: 'secret5',    plusLabel: '+4', name: 'Secret +4',    mult: 60.0,   statMult: 60.0,   color: '#000000', glowColor: '#f1f5f9', auraType: 'dark_void',   css: 'rarity-secret4',    cssClass: 'rarity-secret4' },
    secret5:    { id: 'secret5',    rank: 20, next: 'master',     plusLabel: '+5', name: 'Secret +5',    mult: 75.0,   statMult: 75.0,   color: '#000000', glowColor: '#ffffff', auraType: 'dark_void',   css: 'rarity-secret5',    cssClass: 'rarity-secret5' },

    // --- 2.1. CHUỖI 9 BẬC MASTER (RANK 21 ➔ 29 | master ➔ master8) ---
    // Màu chủ đạo: Xanh nước biển đại dương rực lửa (Aqua Ocean Flame #00f2fe & #0284c7)
    master:     { id: 'master',     rank: 21, next: 'master1',    plusLabel: '',   name: 'Master',       mult: 95.0,   statMult: 95.0,   color: '#00f2fe', glowColor: '#0284c7', auraType: 'master_aqua', css: 'rarity-master',     cssClass: 'rarity-master' },
    master1:    { id: 'master1',    rank: 22, next: 'master2',    plusLabel: '+1', name: 'Master +1',    mult: 120.0,  statMult: 120.0,  color: '#00f2fe', glowColor: '#0284c7', auraType: 'master_aqua', css: 'rarity-master1',    cssClass: 'rarity-master1' },
    master2:    { id: 'master2',    rank: 23, next: 'master3',    plusLabel: '+2', name: 'Master +2',    mult: 150.0,  statMult: 150.0,  color: '#00f2fe', glowColor: '#38bdf8', auraType: 'master_aqua', css: 'rarity-master2',    cssClass: 'rarity-master2' },
    master3:    { id: 'master3',    rank: 24, next: 'master4',    plusLabel: '+3', name: 'Master +3',    mult: 190.0,  statMult: 190.0,  color: '#00f2fe', glowColor: '#38bdf8', auraType: 'master_aqua', css: 'rarity-master3',    cssClass: 'rarity-master3' },
    master4:    { id: 'master4',    rank: 25, next: 'master5',    plusLabel: '+4', name: 'Master +4',    mult: 240.0,  statMult: 240.0,  color: '#38bdf8', glowColor: '#7dd3fc', auraType: 'master_aqua', css: 'rarity-master4',    cssClass: 'rarity-master4' },
    master5:    { id: 'master5',    rank: 26, next: 'master6',    plusLabel: '+5', name: 'Master +5',    mult: 300.0,  statMult: 300.0,  color: '#38bdf8', glowColor: '#7dd3fc', auraType: 'master_aqua', css: 'rarity-master5',    cssClass: 'rarity-master5' },
    master6:    { id: 'master6',    rank: 27, next: 'master7',    plusLabel: '+6', name: 'Master +6',    mult: 380.0,  statMult: 380.0,  color: '#7dd3fc', glowColor: '#bae6fd', auraType: 'master_aqua', css: 'rarity-master6',    cssClass: 'rarity-master6' },
    master7:    { id: 'master7',    rank: 28, next: 'master8',    plusLabel: '+7', name: 'Master +7',    mult: 480.0,  statMult: 480.0,  color: '#bae6fd', glowColor: '#e0f2fe', auraType: 'master_aqua', css: 'rarity-master7',    cssClass: 'rarity-master7' },
    master8:    { id: 'master8',    rank: 29, next: 'demon',      plusLabel: '+8', name: 'Master +8',    mult: 600.0,  statMult: 600.0,  color: '#e0f2fe', glowColor: '#ffffff', auraType: 'master_aqua', css: 'rarity-master8',    cssClass: 'rarity-master8' },

    // --- 2.2. CHUỖI 11 BẬC DEMON (RANK 30 ➔ 40 | demon ➔ demon10) ---
    // Màu chủ đạo: Tím Hắc Ám Ma Giới (Abyssal Demon Purple Aura #c084fc, #a855f7, #7e22ce)
    demon:      { id: 'demon',      rank: 30, next: 'demon1',     plusLabel: '',    name: 'Demon',        mult: 750.0,  statMult: 750.0,  color: '#a855f7', glowColor: '#7e22ce', auraType: 'demon_abyss', css: 'rarity-demon',      cssClass: 'rarity-demon' },
    demon1:     { id: 'demon1',     rank: 31, next: 'demon2',     plusLabel: '+1',  name: 'Demon +1',     mult: 950.0,  statMult: 950.0,  color: '#a855f7', glowColor: '#9333ea', auraType: 'demon_abyss', css: 'rarity-demon1',     cssClass: 'rarity-demon1' },
    demon2:     { id: 'demon2',     rank: 32, next: 'demon3',     plusLabel: '+2',  name: 'Demon +2',     mult: 1200.0, statMult: 1200.0, color: '#c084fc', glowColor: '#9333ea', auraType: 'demon_abyss', css: 'rarity-demon2',     cssClass: 'rarity-demon2' },
    demon3:     { id: 'demon3',     rank: 33, next: 'demon4',     plusLabel: '+3',  name: 'Demon +3',     mult: 1500.0, statMult: 1500.0, color: '#c084fc', glowColor: '#a855f7', auraType: 'demon_abyss', css: 'rarity-demon3',     cssClass: 'rarity-demon3' },
    demon4:     { id: 'demon4',     rank: 34, next: 'demon5',     plusLabel: '+4',  name: 'Demon +4',     mult: 1900.0, statMult: 1900.0, color: '#d946ef', glowColor: '#a855f7', auraType: 'demon_abyss', css: 'rarity-demon4',     cssClass: 'rarity-demon4' },
    demon5:     { id: 'demon5',     rank: 35, next: 'demon6',     plusLabel: '+5',  name: 'Demon +5',     mult: 2400.0, statMult: 2400.0, color: '#d946ef', glowColor: '#c084fc', auraType: 'demon_abyss', css: 'rarity-demon5',     cssClass: 'rarity-demon5' },
    demon6:     { id: 'demon6',     rank: 36, next: 'demon7',     plusLabel: '+6',  name: 'Demon +6',     mult: 3000.0, statMult: 3000.0, color: '#e879f9', glowColor: '#c084fc', auraType: 'demon_abyss', css: 'rarity-demon6',     cssClass: 'rarity-demon6' },
    demon7:     { id: 'demon7',     rank: 37, next: 'demon8',     plusLabel: '+7',  name: 'Demon +7',     mult: 3800.0, statMult: 3800.0, color: '#e879f9', glowColor: '#d946ef', auraType: 'demon_abyss', css: 'rarity-demon7',     cssClass: 'rarity-demon7' },
    demon8:     { id: 'demon8',     rank: 38, next: 'demon9',     plusLabel: '+8',  name: 'Demon +8',     mult: 4800.0, statMult: 4800.0, color: '#f0abfc', glowColor: '#d946ef', auraType: 'demon_abyss', css: 'rarity-demon8',     cssClass: 'rarity-demon8' },
    demon9:     { id: 'demon9',     rank: 39, next: 'demon10',    plusLabel: '+9',  name: 'Demon +9',     mult: 6000.0, statMult: 6000.0, color: '#f5d0fe', glowColor: '#e879f9', auraType: 'demon_abyss', css: 'rarity-demon9',     cssClass: 'rarity-demon9' },
    demon10:    { id: 'demon10',    rank: 40, next: null,         plusLabel: '+10', name: 'Demon +10',    mult: 7777.0, statMult: 7777.0, color: '#fae8ff', glowColor: '#ffffff', auraType: 'demon_abyss', css: 'rarity-demon10',    cssClass: 'rarity-demon10' }
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

/* 3. CẤU HÌNH ĐỘ KHÓ VÀ CHẾ ĐỘ CHIẾN ĐẤU */
export const DIFFICULTY_ORDER = ['easy', 'difficult'];
export const BATTLE_MODE_ORDER = ['destroy', 'survival'];

export const DIFFICULTY_CONFIG = {
    easy:      { id: 'easy',      name: 'Dễ',  shortLabel: 'DỄ',  statMult: 1.00, baseHpMult: 1.00, medalReward: 0 },
    difficult: { id: 'difficult', name: 'Khó', shortLabel: 'KHÓ', statMult: 1.45, baseHpMult: 1.60, medalReward: 2 }
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
    bossrush:      { id: 'bossrush',      name: 'Đấu Trường Siêu Boss', shortLabel: 'SIÊU BOSS' }
};

export function calcStageRewardCoins(mapLv, diffId, modeId) {
    const m = Math.max(1, Number(mapLv) || 1);
    let coins = diffId === 'difficult' ? (500 + m * 120) : (150 + m * 50);
    if (modeId === 'survival' || modeId === 'endless' || modeId === 'endless_siege') {
        coins = Math.round(coins * 1.35);
    } else if (modeId === 'raid_boss' || modeId === 'bossrush') {
        coins = Math.round(coins * 1.5);
    }
    return coins;
}

/* 4. CẤU HÌNH RƯƠNG GACHA SHOP & THUẬT TOÁN MỞ 1 TỶ RƯƠNG SIÊU TỐC O(1) (< 0.005 GIÂY) */
export const MAX_CRATE_OPEN_QTY = 1000000000; // 1 Tỷ rương / lần
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
 * - Khi qty <= 1000: Quay ngẫu nhiên từng rương chính xác.
 * - Khi qty > 1000: Dùng Xấp xỉ Phân phối Chuẩn Đa thức (Box-Muller Gaussian Multinomial Approximation),
 *   chỉ thực hiện ~44 phép tính số học, hoàn thành trong < 0.005 giây và không tốn thêm RAM!
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
                // Chia rCount vào 11 binh chủng theo phân phối đều có nhiễu chuẩn xác suất 1 / numUnits
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

/* 5. TOÁN HỌC KHỐI O(1) CHO NÂNG CẤP NHÂN VẬT VƯỢT CẤP (+N CẤP TÙY Ý & MAX) */
export const UPGRADE_TIER_BASE_PRICES = [100, 280, 750, 1800, 4200, 9500, 20000];

export function getUnitUpgradeCost(currentLv) {
    const lv = Math.max(1, Math.floor(Number(currentLv) || 1));
    const tierBlock = Math.floor((lv - 1) / 5);
    return UPGRADE_TIER_BASE_PRICES[Math.min(tierBlock, UPGRADE_TIER_BASE_PRICES.length - 1)];
}

/**
 * Tính tổng Vàng để nâng từ `currentLv` thêm `addLevels` cấp bằng toán học khối O(1)
 * (Nhân nhanh theo từng khung 5 cấp, không dùng vòng lặp từng cấp nên gõ +999,999 cấp vẫn tính xong tức thì)
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
            // Từ khung giá cuối (20,000 Vàng/cấp) trở đi, nhân thẳng số cấp còn lại O(1)
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
 * - Nếu ở chế độ Admin ∞: mặc định trả về +100 cấp mỗi lần bấm MAX.
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

/* 6. DANH MỤC GIFTCODE (11 MÃ CHÍNH THỨC + GÓI SIÊU CẤP DEV) */
export const OFFICIAL_GIFTCODES = [
    'HUNGDEPTRAI', 'HUNGDZ01', 'HUNGDZ02', 'HUNGDZ03', 'HUNGDZ04',
    'HUNGDZ05', 'HUNGDZ06', 'HUNGDZ07', 'HUNGDZ08', 'HUNGDZ09', 'HUNGDZ10'
];
export const GIFTCODE_REWARD_GEMS = 1500;
export const GIFTCODE_REWARD_COINS = 15000;
export const GIFTCODE_REWARD_MEDALS = 15;

export const GIFT_CODES = {
    'HUNGDEPTRAI': { gems: 999999, coins: 999999999, medals: 500, desc: 'Gói Siêu Cấp Dev' }
};
OFFICIAL_GIFTCODES.forEach(code => {
    if (code !== 'HUNGDEPTRAI') {
        GIFT_CODES[code] = {
            gems: GIFTCODE_REWARD_GEMS,
            coins: GIFTCODE_REWARD_COINS,
            medals: GIFTCODE_REWARD_MEDALS,
            desc: 'Quà Tặng Chỉ Huy'
        };
    }
});

/* 7. BỘ KỸ NĂNG CHIẾN THUẬT CHỦ ĐỘNG (Q, W, E, R - ĐỒNG BỘ TUYỆT ĐỐI 16s / 18s / 22s / 24s) */
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
        fireRateMult: 1.55, // +55% tốc bắn
        speedMult: 1.42,    // +42% tốc độ di chuyển
        duration: 6.0,      // trong 6 giây
        needsTarget: false,
        desc: 'Tăng 55% tốc bắn và 42% tốc độ di chuyển toàn quân trong 6 giây.'
    }
};
// Ánh xạ alias không liệt kê (non-enumerable) để tương thích mọi tên gọi giữa lobby.js và main.js
Object.defineProperties(COMMANDER_TACTICS, {
    minefield: { value: COMMANDER_TACTICS.landmines, enumerable: false },
    mines:     { value: COMMANDER_TACTICS.landmines, enumerable: false },
    emp_blast: { value: COMMANDER_TACTICS.emp,       enumerable: false },
    blitz:     { value: COMMANDER_TACTICS.blitzkrieg, enumerable: false }
});

/* 8. CÂY KỸ NĂNG BỊ ĐỘNG LOBBY (META-TALENTS) */
export const META_TALENTS = {
    oil_refining: {
        id: 'oil_refining',
        name: 'Công Nghệ Lọc Dầu',
        icon: '🛢️',
        maxLevel: 5,
        baseCost: 2,
        costStep: 2,
        desc: 'Giảm chu kỳ nạp xăng khởi đầu (3.0s ➔ 2.6s ở cấp tối đa).',
        getEffectText(lv) { return `Chu kỳ xăng: ${(3.0 - lv * 0.08).toFixed(2)}s / điểm`; }
    },
    high_grade_steel: {
        id: 'high_grade_steel',
        name: 'Thép Tôi Cao Cấp',
        icon: '🛡️',
        maxLevel: 5,
        baseCost: 2,
        costStep: 2,
        desc: 'Tăng máu và giảm sát thương nhận vào cho quân đội (tối đa +20%).',
        getEffectText(lv) { return `Giáp & Máu cộng thêm: +${lv * 4}%`; }
    },
    optimal_logistics: {
        id: 'optimal_logistics',
        name: 'Hậu Cần Tối Ưu',
        icon: '📦',
        maxLevel: 5,
        baseCost: 3,
        costStep: 2,
        desc: 'Tăng Xăng khởi đầu trận và giảm hồi chiêu Kỹ năng Chỉ huy.',
        getEffectText(lv) { return `Xăng đầu trận: +${lv} | Hồi chiêu QWER: -${lv * 4}%`; }
    }
};

/* 9. HỆ THỐNG CHIP / NGỌC BỔ TRỢ (UNIT SOCKETS - KHỚP 100% MÔ TẢ & CÔNG THỨC MAIN.JS) */
export const UNIT_CHIPS = {
    napalm_rocket: {
        id: 'napalm_rocket',
        name: 'Đầu Đạn Napalm',
        shortName: 'Napalm',
        icon: '🔥',
        dotCss: 'chip-napalm',
        burnDps: 18,
        burnDuration: 3.0,
        splashBonus: 14,
        recommendedUnits: ['bazooka', 'tank', 'heavy_tank', 'heli', 'battleship'],
        desc: 'Đạn nổ đốt cháy mục tiêu trong 3s (18 DPS) và +14 bán kính nổ.'
    },
    tactical_radar: {
        id: 'tactical_radar',
        name: 'Radar Chiến Thuật',
        shortName: 'Radar +28',
        icon: '📡',
        dotCss: 'chip-radar',
        rangeBonusFlat: 28,
        nightVisionBonus: 65,
        recommendedUnits: ['humvee', 'apc', 'sniper', 'destroyer', 'patrol_boat'],
        desc: '+28 tầm bắn xa và mở rộng tầm nhìn ban đêm (+65px).'
    },
    reactive_armor: {
        id: 'reactive_armor',
        name: 'Giáp Phản Ứng Nổ',
        shortName: 'Giáp ERA',
        icon: '🟣',
        dotCss: 'chip-armor',
        hpBonusPct: 0.18,
        damageReductionPct: 0.15,
        recommendedUnits: ['tank', 'heavy_tank', 'apc', 'destroyer', 'battleship'],
        desc: 'Tăng 18% HP tối đa và giảm 15% sát thương nhận vào.'
    },
    overclock_core: {
        id: 'overclock_core',
        name: 'Lõi Xung Nhịp Cao',
        shortName: 'Ép Xung',
        icon: '🔋',
        dotCss: 'chip-overclock',
        speedBonusPct: 0.20,
        cooldownReductionPct: 0.15,
        recommendedUnits: ['infantry', 'rifleman', 'sniper', 'humvee', 'heli'],
        desc: 'Tăng 20% tốc độ hành quân và giảm 15% thời gian hồi gọi quân.'
    }
};
Object.defineProperties(UNIT_CHIPS, {
    overclock_servo: { value: UNIT_CHIPS.overclock_core, enumerable: false }
});

/* 10. DANH MỤC 11 BINH CHỦNG CHUẨN (ĐỒNG BỘ ID 'infantry' & 'rifleman') */
export const UNIT_CATALOG = [
    {
        id: 'infantry',
        aliasId: 'rifleman',
        name: 'Bộ Binh',
        role: 'Lính Xung Kích',
        category: 'infantry',
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
        spriteCol: 16,
        sockets: [null, null],
        defaultChips: ['overclock_core', null]
    },
    {
        id: 'bazooka',
        name: 'Lính Tên Lửa',
        role: 'Khắc Tinh Cơ Giới',
        category: 'infantry',
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
        spriteCol: 17,
        sockets: ['napalm_rocket', null],
        defaultChips: ['napalm_rocket', null]
    },
    {
        id: 'sniper',
        name: 'Lính Bắn Tỉa',
        role: 'Xạ Thủ Tầm Xa',
        category: 'infantry',
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
        spriteCol: 16,
        sockets: [null, null],
        defaultChips: ['tactical_radar', null]
    },
    {
        id: 'humvee',
        name: 'Xe Humvee',
        role: 'Trinh Sát Cơ Động',
        category: 'vehicle',
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
        spriteCol: 5,
        sockets: ['tactical_radar', null],
        defaultChips: ['tactical_radar', null]
    },
    {
        id: 'apc',
        name: 'Xe Thiết Giáp APC',
        role: 'Đỡ Đạn Tuyến Đầu',
        category: 'vehicle',
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
        spriteCol: 7,
        sockets: ['reactive_armor', null],
        defaultChips: ['reactive_armor', 'tactical_radar']
    },
    {
        id: 'tank',
        name: 'Xe Tăng Chiến Đấu',
        role: 'Chủ Lực Mặt Đất',
        category: 'vehicle',
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
        spriteCol: 8,
        sockets: [null, null],
        defaultChips: ['reactive_armor', 'napalm_rocket']
    },
    {
        id: 'heavy_tank',
        name: 'Siêu Tăng Hạng Nặng',
        role: 'Pháo Đài Di Động',
        category: 'vehicle',
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
        spriteCol: 9,
        sockets: [null, null],
        defaultChips: ['napalm_rocket', 'reactive_armor']
    },
    {
        id: 'heli',
        name: 'Trực Thăng Vũ Trang',
        role: 'Không Quân Yểm Trợ',
        category: 'air',
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
        spriteCol: 11,
        sockets: [null, null],
        defaultChips: ['napalm_rocket', 'overclock_core']
    },
    {
        id: 'patrol_boat',
        name: 'Thuyền Tuần Tra',
        role: 'Thủy Quân Cơ Động',
        category: 'naval',
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
        spriteCol: 13,
        sockets: [null, null],
        defaultChips: ['tactical_radar', null]
    },
    {
        id: 'destroyer',
        name: 'Tàu Khu Trục',
        role: 'Pháo Hạm Đa Năng',
        category: 'naval',
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
        spriteCol: 14,
        sockets: [null, null],
        defaultChips: ['tactical_radar', 'reactive_armor']
    },
    {
        id: 'battleship',
        name: 'Thiết Giáp Hạm',
        role: 'Bá Chủ Đại Dương',
        category: 'naval',
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
        spriteCol: 15,
        sockets: [null, null],
        defaultChips: ['napalm_rocket', 'reactive_armor']
    }
];

// Cấu hình đặc biệt cho thẻ Không Kích (Slot 5 cố định trong Deck chiến đấu của main.js)
export const AIRSTRIKE_SPEC = {
    id: 'airstrike',
    name: 'Không Kích',
    role: 'Oanh Tạc Chiến Thuật',
    category: 'air',
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
    spriteCol: 10,
    sockets: [null, null],
    defaultChips: ['napalm_rocket', null]
};

export const UNIT_BY_ID = {};
UNIT_CATALOG.forEach(u => {
    UNIT_BY_ID[u.id] = u;
});
// Đồng bộ tuyệt đối 'infantry' <-> 'rifleman' và 'airstrike' để không bao giờ lỗi undefined hoặc mất thẻ khi Auto-Merge
UNIT_BY_ID['rifleman'] = UNIT_BY_ID['infantry'];
UNIT_BY_ID['airstrike'] = AIRSTRIKE_SPEC;
export const UNIT_MAP = UNIT_BY_ID;

// Tự động chuẩn hóa dữ liệu save cũ nếu có thẻ mang unitId 'rifleman' sang 'infantry'
(function normalizeSavedUnitIds() {
    try {
        if (typeof localStorage === 'undefined') return;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        let modified = false;

        if (Array.isArray(parsed.inventory)) {
            parsed.inventory.forEach(card => {
                if (card && card.unitId === 'rifleman') {
                    card.unitId = 'infantry';
                    modified = true;
                }
            });
        }
        if (parsed.inventoryStacks && typeof parsed.inventoryStacks === 'object') {
            for (const key of Object.keys(parsed.inventoryStacks)) {
                if (key.startsWith('rifleman__')) {
                    const rarity = key.split('__')[1];
                    const newKey = `infantry__${rarity}`;
                    parsed.inventoryStacks[newKey] = (parsed.inventoryStacks[newKey] || 0) + parsed.inventoryStacks[key];
                    delete parsed.inventoryStacks[key];
                    modified = true;
                }
            }
        }
        if (parsed.armyPermanentLevels && parsed.armyPermanentLevels.rifleman) {
            parsed.armyPermanentLevels.infantry = Math.max(
                parsed.armyPermanentLevels.infantry || 1,
                parsed.armyPermanentLevels.rifleman
            );
            modified = true;
        }
        if (modified) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
    } catch (e) {}
})();

/* 11. CẤU HÌNH VÒNG QUAY MAY MẮN 8 Ô (#lucky-wheel-modal) & PITY 100 NỔ JACKPOT MASTER/DEMON */
export const LUCKY_WHEEL_CONFIG = {
    singlePrice: 200,
    tenPrice: 1800,
    pityMax: 100,
    slices: [
        {
            index: 0,
            id: 'coins_25k',
            label: '+25K 🪙',
            fullName: '+25,000 Vàng 🪙',
            icon: '🪙',
            type: 'coins',
            amount: 25000,
            weight: 30.0,
            bgColor: '#eab308',
            textColor: '#0f172a'
        },
        {
            index: 1,
            id: 'gems_500',
            label: '+500 💎',
            fullName: '+500 Gems 💎',
            icon: '💎',
            type: 'gems',
            amount: 500,
            weight: 25.0,
            bgColor: '#0284c7',
            textColor: '#ffffff'
        },
        {
            index: 2,
            id: 'medals_15',
            label: '+15 🎖️',
            fullName: '+15 Huy Chương 🎖️',
            icon: '🎖️',
            type: 'medals',
            amount: 15,
            weight: 18.0,
            bgColor: '#16a34a',
            textColor: '#ffffff'
        },
        {
            index: 3,
            id: 'card_epic',
            label: 'EPIC 🟣',
            fullName: '1 Thẻ Tướng Bậc EPIC 🟣',
            icon: '🟣',
            type: 'card',
            rarity: 'epic',
            weight: 12.0,
            bgColor: '#7e22ce',
            textColor: '#ffffff'
        },
        {
            index: 4,
            id: 'card_legendary',
            label: 'LEG 🟠',
            fullName: '1 Thẻ Tướng Bậc LEGENDARY 🟠',
            icon: '🟠',
            type: 'card',
            rarity: 'legendary',
            weight: 8.0,
            bgColor: '#ea580c',
            textColor: '#ffffff'
        },
        {
            index: 5,
            id: 'card_mythic',
            label: 'MYTHIC 🔴',
            fullName: '1 Thẻ Tướng Bậc MYTHIC 🔴',
            icon: '🔴',
            type: 'card',
            rarity: 'mythic',
            weight: 4.5,
            bgColor: '#dc2626',
            textColor: '#ffffff'
        },
        {
            index: 6,
            id: 'card_secret',
            label: 'SECRET ⚫',
            fullName: '1 Thẻ Tướng Bậc SECRET ⚫',
            icon: '⚫',
            type: 'card',
            rarity: 'secret',
            weight: 2.0,
            bgColor: '#18181b',
            textColor: '#fde047'
        },
        {
            index: 7,
            id: 'card_jackpot',
            label: 'JACKPOT 💠',
            fullName: 'JACKPOT: 1 Tướng MASTER / DEMON 💠',
            icon: '💠',
            type: 'jackpot_card',
            rarities: ['master', 'master1', 'master2', 'demon', 'demon1'],
            weight: 0.5,
            bgColor: '#a21caf',
            textColor: '#00f2fe'
        }
    ]
};

/* 12. CẤU HÌNH TRUNG TÂM 3 MINI-GAME GIẢI TRÍ (#minigame-arcade-modal) */
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
        // Hệ số nhân thưởng tăng dần mỗi lần mở trúng ô kho báu
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

/* 13. DỮ LIỆU ĐỘT BIẾN ROGUELIKE & RAID BOSS */
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

/* 14. KHỞI TẠO 30 BẢN ĐỒ CHIẾN THUẬT (15 MAP CHUẨN THEO ẢNH 15 MAPS.PNG + 15 MAP CHIẾN DỊCH MỞ RỘNG) */
const BASE_15_MAPS_SPEC = [
    {
        id: 1,
        name: 'CẦU QUA SÔNG',
        theme: 'grass',
        hasWater: true,
        hasCoastFoam: false,
        desc: 'Sông lớn cắt ngang chiến trường. Quân bộ phải qua cầu đá chiến lược ở chính giữa.'
    },
    {
        id: 2,
        name: 'ĐƯỜNG ĐÈO CHỮ S',
        theme: 'grass',
        hasWater: false,
        hasCoastFoam: false,
        desc: 'Đường nhựa chữ S uốn lượn xuyên rừng thông và vách núi đá hiểm trở.'
    },
    {
        id: 3,
        name: 'ĐÔ THỊ PHỐ THỊ',
        theme: 'grass',
        hasWater: false,
        hasCoastFoam: false,
        desc: 'Khu đô thị bàn cờ với nhiều tòa nhà cao tầng chắn tầm nhìn pháo binh.'
    },
    {
        id: 4,
        name: 'PHÁO ĐÀI GIỮA HỒ',
        theme: 'grass',
        hasWater: true,
        hasCoastFoam: false,
        desc: 'Hồ nước rộng bao quanh pháo đài cổ giữa đảo, nối liền bằng 2 cầu Bắc - Nam.'
    },
    {
        id: 5,
        name: 'MÊ CUNG RỪNG GIÀ',
        theme: 'grass',
        hasWater: false,
        hasCoastFoam: false,
        desc: 'Nhiều nhánh đường mòn đan xen giữa rừng rậm, thích hợp đánh bọc sườn.'
    },
    {
        id: 6,
        name: 'KHU CÔNG NGHIỆP',
        theme: 'brown_earth',
        hasWater: false,
        hasCoastFoam: false,
        desc: 'Tổ hợp nhà máy công nghiệp nặng với các tuyến đường vận tải bọc thép.'
    },
    {
        id: 7,
        name: 'HẺM NÚI SONG HỒ',
        theme: 'grass',
        hasWater: true,
        hasCoastFoam: false,
        desc: 'Đường đèo uốn lượn kẹp giữa 2 hồ nước sâu và dãy núi đá sát hai bên sườn.'
    },
    {
        id: 8,
        name: 'ĐÈO ĐÁ HIỂM TRỞ',
        theme: 'grass',
        hasWater: false,
        hasCoastFoam: false,
        desc: 'Dãy núi đá khổng lồ chắn ngang, ép hai phe giao tranh tại khe đèo hẹp.'
    },
    {
        id: 9,
        name: 'VÒNG XOAY THỊ TRẤN',
        theme: 'grass',
        hasWater: false,
        hasCoastFoam: false,
        desc: 'Hai bùng binh giao thông lớn chia nhánh bao quanh cụm dân cư trung tâm.'
    },
    {
        id: 10,
        name: 'BÃI BIỂN ĐỔ BỘ',
        theme: 'grass',
        hasWater: true,
        hasCoastFoam: true,
        desc: 'Bờ biển sóng vỗ bên trái cho phép Hải quân pháo kích yểm trợ Lục quân trên cát.'
    },
    {
        id: 11,
        name: 'CĂN CỨ TÊN LỬA',
        theme: 'grass',
        hasWater: false,
        hasCoastFoam: false,
        desc: 'Khu phức hợp quân sự đối xứng với đại lộ lớn, trạm radar và hầm phóng tên lửa.'
    },
    {
        id: 12,
        name: 'THÀNH CỔ BAO VÂY',
        theme: 'grass',
        hasWater: false,
        hasCoastFoam: false,
        desc: 'Tường thành đá kiên cố bao bọc pháo đài trung tâm cùng vành đai đường nhựa.'
    },
    {
        id: 13,
        name: 'QUẦN ĐẢO ĐA CẦU',
        theme: 'grass',
        hasWater: true,
        hasCoastFoam: true,
        desc: 'Hệ thống kênh rạch chia cắt chiến trường thành nhiều đảo nhỏ nối bằng 10 cây cầu.'
    },
    {
        id: 14,
        name: 'BÙNG BINH ĐẦM LẦY',
        theme: 'grass',
        hasWater: true,
        hasCoastFoam: false,
        desc: 'Đường nhựa vòng tròn lớn bao quanh hồ nước trung tâm và rừng cây rậm rạp.'
    },
    {
        id: 15,
        name: 'PHÒNG TUYẾN TRƯỜNG THÀNH',
        theme: 'grass',
        hasWater: false,
        hasCoastFoam: false,
        desc: 'Hai dải tường thành đá cổ chắn ngang tiền tuyến với 3 cổng vòm chiến lược.'
    }
];

export function buildAllMapsData() {
    const maps = [];
    for (let i = 1; i <= 30; i++) {
        const baseSpec = BASE_15_MAPS_SPEC[(i - 1) % 15];
        const isVeteran = i > 15;
        const useBrownTheme = isVeteran
            ? (i % 2 === 0 || baseSpec.theme === 'brown_earth')
            : (baseSpec.theme === 'brown_earth');

        maps.push({
            id: i,
            level: i,
            baseTemplateId: baseSpec.id,
            name: isVeteran ? `${baseSpec.name} II` : baseSpec.name,
            theme: useBrownTheme ? 'brown_earth' : 'grass',
            hasWater: baseSpec.hasWater,
            hasCoastFoam: baseSpec.hasCoastFoam,
            desc: baseSpec.desc,
            enemyBaseHp: 220 + i * 35,
            playerBaseHp: 250,
            startingGas: 6
        });
    }
    return maps;
}

export const LEVELS = buildAllMapsData();
export const MAPS_DATA = LEVELS;

/* 15. DANH MỤC NHIỆM VỤ CHIẾN DỊCH MỞ RỘNG (MISSIONS CATALOG) */
export const MISSIONS_CATALOG = [
    { id: 'kill_50',     title: 'Tiêu diệt 50 quân địch',           target: 50,     rewardGems: 150,  rewardCoins: 2000,   statKey: 'kills' },
    { id: 'kill_250',    title: 'Tiêu diệt 250 quân địch',          target: 250,    rewardGems: 400,  rewardCoins: 6000,   statKey: 'kills' },
    { id: 'kill_1000',   title: 'Tiêu diệt 1,000 quân địch',        target: 1000,   rewardGems: 1200, rewardCoins: 25000,  statKey: 'kills' },
    { id: 'win_3',       title: 'Chiến thắng 3 trận bất kỳ',        target: 3,      rewardGems: 200,  rewardCoins: 3000,   statKey: 'wins' },
    { id: 'win_10',      title: 'Chiến thắng 10 trận',              target: 10,     rewardGems: 600,  rewardCoins: 10000,  statKey: 'wins' },
    { id: 'pull_10',     title: 'Mở 10 Rương Quân Nhu',             target: 10,     rewardGems: 300,  rewardCoins: 4500,   statKey: 'cratesOpened' },
    { id: 'pull_1000',   title: 'Mở 1,000 Rương Quân Nhu',          target: 1000,   rewardGems: 1500, rewardCoins: 35000,  statKey: 'cratesOpened' },
    { id: 'pull_1m',     title: 'Mở 1,000,000 Rương Quân Nhu',      target: 1000000,rewardGems: 5000, rewardCoins: 150000, statKey: 'cratesOpened' },
    { id: 'merge_5',     title: 'Ghép tiến hóa tướng 5 lần',        target: 5,      rewardGems: 250,  rewardCoins: 5000,   statKey: 'merges' },
    { id: 'merge_500',   title: 'Ghép tiến hóa tướng 500 lần',      target: 500,    rewardGems: 1800, rewardCoins: 45000,  statKey: 'merges' },
    { id: 'upgrade_20',  title: 'Nâng cấp Level Tướng 20 lần',      target: 20,     rewardGems: 500,  rewardCoins: 12000,  statKey: 'upgrades' }
];

/* 16. TƯƠNG THÍCH TOÀN CỤC (WINDOW BINDING) */
if (typeof window !== 'undefined') {
    Object.assign(window, {
        STORAGE_KEY,
        META_SAVE_KEY,
        ADMIN_PASSWORD,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        BOTTOM_UI_HEIGHT,
        PLAYFIELD_HEIGHT,
        MAX_DECK_SLOTS,
        MAX_CUSTOM_UNIT_SLOTS,
        MAX_WAVES,
        NAV_CELL,
        GRID_W,
        GRID_H,
        T_OPEN,
        T_ROAD,
        T_WATER,
        T_BRIDGE,
        T_OBSTACLE,
        BATTLE_SPEED_MULTIPLIERS,
        GAS_UPGRADE_LEVELS,
        triggerHaptic,
        formatCompactNumber,
        RARITY_ORDER,
        MAX_RARITY_RANK,
        RARITY_CONFIG,
        RARITY_TIERS,
        isMasterRarity,
        isDemonRarity,
        DIFFICULTY_ORDER,
        BATTLE_MODE_ORDER,
        DIFFICULTY_CONFIG,
        BATTLE_MODE_CONFIG,
        calcStageRewardCoins,
        MAX_CRATE_OPEN_QTY,
        CRATE_PRESET_QUANTITIES,
        CRATE_CONFIG,
        sampleStandardNormalBoxMuller,
        sampleBinomialGaussianO1,
        simulateBulkCrateOpeningO1,
        UPGRADE_TIER_BASE_PRICES,
        getUnitUpgradeCost,
        calcBulkUpgradeCost,
        calcMaxAffordableLevels,
        calcTotalRefundCoinsFast,
        OFFICIAL_GIFTCODES,
        GIFTCODE_REWARD_GEMS,
        GIFTCODE_REWARD_COINS,
        GIFTCODE_REWARD_MEDALS,
        GIFT_CODES,
        COMMANDER_TACTICS,
        META_TALENTS,
        UNIT_CHIPS,
        UNIT_CATALOG,
        AIRSTRIKE_SPEC,
        UNIT_BY_ID,
        UNIT_MAP,
        LUCKY_WHEEL_CONFIG,
        MINIGAME_CONFIG,
        ROGUELIKE_MUTATIONS,
        RAID_BOSS_CONFIG,
        LEVELS,
        MAPS_DATA,
        MISSIONS_CATALOG
    });
}