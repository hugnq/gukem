/* ============================================================================
   TINY BATTLE - CORE DATA ENGINE (ES MODULE STANDARD - ĐÃ FIX ĐỒNG BỘ 100%)
   Save Key: tiny_battle_meta_save_v3 (Tương thích ngược 100%)
   ============================================================================ */

export const STORAGE_KEY = 'tiny_battle_meta_save_v3';
export const META_SAVE_KEY = STORAGE_KEY;
export const ADMIN_PASSWORD = 'HUNGADMINDZ';

/* 0. HẰNG SỐ ĐỘNG CƠ CANVAS, LƯỚI ĐỊA HÌNH FLOW-FIELD & NÂNG CẤP XĂNG */
export const LOGICAL_WIDTH = 420;
export const LOGICAL_HEIGHT = 840;
export const BOTTOM_UI_HEIGHT = 126;
export const PLAYFIELD_HEIGHT = LOGICAL_HEIGHT - BOTTOM_UI_HEIGHT; // 714px
export const MAX_DECK_SLOTS = 5;
export const MAX_WAVES = 10;

export const NAV_CELL = 10;
export const GRID_W = Math.floor(LOGICAL_WIDTH / NAV_CELL);     // 42 cột
export const GRID_H = Math.floor(PLAYFIELD_HEIGHT / NAV_CELL);  // 71 hàng

export const T_OPEN = 0;
export const T_ROAD = 1;
export const T_WATER = 2;
export const T_BRIDGE = 3;
export const T_OBSTACLE = 4;

export const GAS_UPGRADE_LEVELS = [
    { interval: 3.0, cost: 4,  label: '➔ 2.4s' },
    { interval: 2.4, cost: 6,  label: '➔ 1.9s' },
    { interval: 1.9, cost: 8,  label: '➔ 1.5s' },
    { interval: 1.5, cost: 11, label: '➔ 1.1s' },
    { interval: 1.1, cost: 0,  label: 'MAX' }
];

/* 1. HỆ THỐNG PHẢN HỒI XÚC GIÁC (HAPTIC FEEDBACK) */
export function triggerHaptic(duration = 15) {
    try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(duration);
        }
    } catch (e) {
        // Bỏ qua nếu thiết bị không hỗ trợ rung
    }
}

/* 2. HỆ THỐNG 21 BẬC ĐỘ HIẾM (COMMON ➔ MYTHIC ➔ SECRET +5) */
export const RARITY_ORDER = [
    'common', 'uncommon', 'rare', 'epic', 'epic1', 'epic2',
    'legendary', 'legendary1', 'legendary2', 'legendary3',
    'mythic', 'mythic1', 'mythic2', 'mythic3', 'mythic4',
    'secret', 'secret1', 'secret2', 'secret3', 'secret4', 'secret5'
];

export const RARITY_CONFIG = {
    common:     { id: 'common',     rank: 0,  next: 'uncommon',   plusLabel: '',   name: 'Common',       mult: 1.00, statMult: 1.00, color: '#94a3b8', css: 'rarity-common',     cssClass: 'rarity-common' },
    uncommon:   { id: 'uncommon',   rank: 1,  next: 'rare',       plusLabel: '',   name: 'Uncommon',     mult: 1.25, statMult: 1.25, color: '#4ade80', css: 'rarity-uncommon',   cssClass: 'rarity-uncommon' },
    rare:       { id: 'rare',       rank: 2,  next: 'epic',       plusLabel: '',   name: 'Rare',         mult: 1.55, statMult: 1.55, color: '#60a5fa', css: 'rarity-rare',       cssClass: 'rarity-rare' },
    epic:       { id: 'epic',       rank: 3,  next: 'epic1',      plusLabel: '',   name: 'Epic',         mult: 1.90, statMult: 1.90, color: '#c084fc', css: 'rarity-epic',       cssClass: 'rarity-epic' },
    epic1:      { id: 'epic1',      rank: 4,  next: 'epic2',      plusLabel: '+1', name: 'Epic +1',      mult: 2.30, statMult: 2.30, color: '#d8b4fe', css: 'rarity-epic1',      cssClass: 'rarity-epic1' },
    epic2:      { id: 'epic2',      rank: 5,  next: 'legendary',  plusLabel: '+2', name: 'Epic +2',      mult: 2.75, statMult: 2.75, color: '#e879f9', css: 'rarity-epic2',      cssClass: 'rarity-epic2' },
    legendary:  { id: 'legendary',  rank: 6,  next: 'legendary1', plusLabel: '',   name: 'Legendary',    mult: 3.40, statMult: 3.40, color: '#f59e0b', css: 'rarity-legendary',  cssClass: 'rarity-legendary' },
    legendary1: { id: 'legendary1', rank: 7,  next: 'legendary2', plusLabel: '+1', name: 'Legendary +1', mult: 4.20, statMult: 4.20, color: '#fbbf24', css: 'rarity-legendary1', cssClass: 'rarity-legendary1' },
    legendary2: { id: 'legendary2', rank: 8,  next: 'legendary3', plusLabel: '+2', name: 'Legendary +2', mult: 5.20, statMult: 5.20, color: '#facc15', css: 'rarity-legendary2', cssClass: 'rarity-legendary2' },
    legendary3: { id: 'legendary3', rank: 9,  next: 'mythic',     plusLabel: '+3', name: 'Legendary +3', mult: 6.40, statMult: 6.40, color: '#fde047', css: 'rarity-legendary3', cssClass: 'rarity-legendary3' },
    mythic:     { id: 'mythic',     rank: 10, next: 'mythic1',    plusLabel: '',   name: 'Mythic',       mult: 8.00, statMult: 8.00, color: '#fb7185', css: 'rarity-mythic',     cssClass: 'rarity-mythic' },
    mythic1:    { id: 'mythic1',    rank: 11, next: 'mythic2',    plusLabel: '+1', name: 'Mythic +1',    mult: 10.0, statMult: 10.0, color: '#f43f5e', css: 'rarity-mythic1',    cssClass: 'rarity-mythic1' },
    mythic2:    { id: 'mythic2',    rank: 12, next: 'mythic3',    plusLabel: '+2', name: 'Mythic +2',    mult: 12.5, statMult: 12.5, color: '#ef4444', css: 'rarity-mythic2',    cssClass: 'rarity-mythic2' },
    mythic3:    { id: 'mythic3',    rank: 13, next: 'mythic4',    plusLabel: '+3', name: 'Mythic +3',    mult: 15.5, statMult: 15.5, color: '#dc2626', css: 'rarity-mythic3',    cssClass: 'rarity-mythic3' },
    mythic4:    { id: 'mythic4',    rank: 14, next: 'secret',     plusLabel: '+4', name: 'Mythic +4',    mult: 19.0, statMult: 19.0, color: '#b91c1c', css: 'rarity-mythic4',    cssClass: 'rarity-mythic4' },
    secret:     { id: 'secret',     rank: 15, next: 'secret1',    plusLabel: '',   name: 'Secret',       mult: 24.0, statMult: 24.0, color: '#18181b', css: 'rarity-secret',     cssClass: 'rarity-secret' },
    secret1:    { id: 'secret1',    rank: 16, next: 'secret2',    plusLabel: '+1', name: 'Secret +1',    mult: 30.0, statMult: 30.0, color: '#18181b', css: 'rarity-secret1',    cssClass: 'rarity-secret1' },
    secret2:    { id: 'secret2',    rank: 17, next: 'secret3',    plusLabel: '+2', name: 'Secret +2',    mult: 38.0, statMult: 38.0, color: '#09090b', css: 'rarity-secret2',    cssClass: 'rarity-secret2' },
    secret3:    { id: 'secret3',    rank: 18, next: 'secret4',    plusLabel: '+3', name: 'Secret +3',    mult: 48.0, statMult: 48.0, color: '#09090b', css: 'rarity-secret3',    cssClass: 'rarity-secret3' },
    secret4:    { id: 'secret4',    rank: 19, next: 'secret5',    plusLabel: '+4', name: 'Secret +4',    mult: 60.0, statMult: 60.0, color: '#000000', css: 'rarity-secret4',    cssClass: 'rarity-secret4' },
    secret5:    { id: 'secret5',    rank: 20, next: null,         plusLabel: '+5', name: 'Secret +5',    mult: 75.0, statMult: 75.0, color: '#000000', css: 'rarity-secret5',    cssClass: 'rarity-secret5' }
};
export const RARITY_TIERS = RARITY_CONFIG;

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

/* 4. CẤU HÌNH RƯƠNG GACHA SHOP */
export const CRATE_CONFIG = {
    legendary: {
        id: 'legendary',
        name: 'LEGENDARY CRATE',
        singlePrice: 300,
        tenPrice: 2700,
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
        rates: [
            { rarity: 'common',   weight: 55.0 },
            { rarity: 'uncommon', weight: 30.0 },
            { rarity: 'rare',     weight: 12.0 },
            { rarity: 'epic',     weight: 3.0 }
        ]
    }
};

/* 5. DANH MỤC GIFTCODE (11 MÃ CHÍNH THỨC + GÓI SIÊU CẤP DEV) */
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

/* 6. BỘ KỸ NĂNG CHIẾN THUẬT CHỦ ĐỘNG (Q, W, E, R) */
export const COMMANDER_TACTICS = {
    airdrop: {
        id: 'airdrop',
        engineKey: 'airdrop',
        key: 'Q',
        name: 'Chi Viện Dù',
        shortName: 'CHI VIỆN',
        icon: '🪂',
        cooldown: 16.0,
        needsTarget: false,
        desc: 'Thả 3 lính nhảy dù tinh nhuệ xuống thẳng giữa chiến trường.'
    },
    landmines: {
        id: 'landmines',
        engineKey: 'minefield',
        key: 'W',
        name: 'Mìn Chống Tăng',
        shortName: 'RẢI MÌN',
        icon: '💣',
        cooldown: 18.0,
        needsTarget: false,
        desc: 'Đặt 5 quả mìn chống tăng dọc chiến tuyến, nổ lan sát thương lớn.'
    },
    emp: {
        id: 'emp',
        engineKey: 'emp_blast',
        key: 'E',
        name: 'Xung Điện EMP',
        shortName: 'XUNG EMP',
        icon: '⚡',
        cooldown: 22.0,
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

/* 7. CÂY KỸ NĂNG BỊ ĐỘNG LOBBY (META-TALENTS) */
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

/* 8. HỆ THỐNG CHIP / NGỌC BỔ TRỢ (UNIT SOCKETS) */
export const UNIT_CHIPS = {
    napalm_rocket: {
        id: 'napalm_rocket',
        name: 'Đầu Đạn Napalm',
        shortName: 'Napalm',
        icon: '🔥',
        dotCss: 'chip-napalm',
        recommendedUnits: ['bazooka', 'tank', 'heavy_tank', 'heli', 'battleship'],
        desc: 'Đạn nổ đốt cháy mục tiêu trong 3s (18 DPS) và +14 bán kính nổ.'
    },
    tactical_radar: {
        id: 'tactical_radar',
        name: 'Radar Chiến Thuật',
        shortName: 'Radar +28',
        icon: '📡',
        dotCss: 'chip-radar',
        recommendedUnits: ['humvee', 'apc', 'sniper', 'destroyer', 'patrol_boat'],
        desc: '+28 tầm bắn xa và mở rộng tầm nhìn ban đêm (+65px).'
    },
    reactive_armor: {
        id: 'reactive_armor',
        name: 'Giáp Phản Ứng Nổ',
        shortName: 'Giáp ERA',
        icon: '🟣',
        dotCss: 'chip-armor',
        recommendedUnits: ['tank', 'heavy_tank', 'apc', 'destroyer', 'battleship'],
        desc: 'Tăng 18% HP tối đa và giảm 15% sát thương nhận vào.'
    },
    overclock_core: {
        id: 'overclock_core',
        name: 'Lõi Xung Nhịp Cao',
        shortName: 'Ép Xung',
        icon: '🔋',
        dotCss: 'chip-overclock',
        recommendedUnits: ['infantry', 'rifleman', 'sniper', 'humvee', 'heli'],
        desc: 'Tăng 20% tốc độ hành quân và giảm 15% thời gian hồi gọi quân.'
    }
};
Object.defineProperties(UNIT_CHIPS, {
    overclock_servo: { value: UNIT_CHIPS.overclock_core, enumerable: false }
});

/* 9. DANH MỤC 11 BINH CHỦNG CHUẨN (ĐỒNG BỘ ID 'infantry' & 'rifleman') */
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

// Cấu hình đặc biệt cho thẻ Không Kích (Slot 5 trong Deck chiến đấu của main.js)
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

/* 10. DỮ LIỆU ĐỘT BIẾN ROGUELIKE & RAID BOSS */
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

/* 11. KHỞI TẠO 30 BẢN ĐỒ CHIẾN THUẬT (15 MAP CHUẨN THEO ẢNH 15 MAPS.PNG + 15 MAP CHIẾN DỊCH MỞ RỘNG) */
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

/* 12. DANH MỤC NHIỆM VỤ (MISSIONS) */
export const MISSIONS_CATALOG = [
    { id: 'kill_50',   title: 'Tiêu diệt 50 quân địch',    target: 50,  rewardGems: 150, rewardCoins: 2000,  statKey: 'kills' },
    { id: 'kill_250',  title: 'Tiêu diệt 250 quân địch',   target: 250, rewardGems: 400, rewardCoins: 6000,  statKey: 'kills' },
    { id: 'win_3',     title: 'Chiến thắng 3 trận bất kỳ', target: 3,   rewardGems: 200, rewardCoins: 3000,  statKey: 'wins' },
    { id: 'win_10',    title: 'Chiến thắng 10 trận',       target: 10,  rewardGems: 600, rewardCoins: 10000, statKey: 'wins' },
    { id: 'pull_10',   title: 'Mở 10 Rương Quân Nhu',      target: 10,  rewardGems: 300, rewardCoins: 4500,  statKey: 'cratesOpened' },
    { id: 'merge_5',   title: 'Ghép tiến hóa tướng 5 lần', target: 5,   rewardGems: 250, rewardCoins: 5000,  statKey: 'merges' }
];

/* 13. TƯƠNG THÍCH TOÀN CỤC (WINDOW BINDING) */
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
        MAX_WAVES,
        NAV_CELL,
        GRID_W,
        GRID_H,
        T_OPEN,
        T_ROAD,
        T_WATER,
        T_BRIDGE,
        T_OBSTACLE,
        GAS_UPGRADE_LEVELS,
        triggerHaptic,
        RARITY_ORDER,
        RARITY_CONFIG,
        RARITY_TIERS,
        DIFFICULTY_ORDER,
        BATTLE_MODE_ORDER,
        DIFFICULTY_CONFIG,
        BATTLE_MODE_CONFIG,
        calcStageRewardCoins,
        CRATE_CONFIG,
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
        ROGUELIKE_MUTATIONS,
        RAID_BOSS_CONFIG,
        LEVELS,
        MAPS_DATA,
        MISSIONS_CATALOG
    });
}