class SoundFX {
    constructor() {
        this.enabled = true;
        this.ctx = null;
    }
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    play(type) {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            if (type === 'beam') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(360, now);
                osc.frequency.exponentialRampToValueAtTime(110, now + 0.07);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.07);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.07);
            } else if (type === 'cannon') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.18);
            } else if (type === 'boom') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(110, now);
                osc.frequency.exponentialRampToValueAtTime(22, now + 0.32);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.32);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.32);
            } else if (type === 'spawn') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(340, now);
                osc.frequency.exponentialRampToValueAtTime(620, now + 0.1);
                gain.gain.setValueAtTime(0.09, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'gas') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'airstrike') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(240, now);
                osc.frequency.linearRampToValueAtTime(120, now + 0.65);
                gain.gain.setValueAtTime(0.11, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.65);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.65);
            } else if (type === 'upgrade') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(900, now + 0.22);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.22);
            }
        } catch (e) {}
    }
}

const sfx = new SoundFX();

const LOGICAL_WIDTH = 420;
const LOGICAL_HEIGHT = 840;
const BOTTOM_UI_HEIGHT = 126;
const PLAYFIELD_HEIGHT = LOGICAL_HEIGHT - BOTTOM_UI_HEIGHT;
const MAX_DECK_SLOTS = 5;
const MAX_WAVES = 10;
const STORAGE_KEY = 'tiny_battle_meta_save_v2';

// ============================================================================
// HỆ THỐNG ĐỘ HIẾM (RARITY SYSTEM) & HỆ SỐ SỨC MẠNH
// ============================================================================
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'epic1', 'epic2', 'legendary'];

const RARITY_CONFIG = {
    common: {
        id: 'common',
        rank: 0,
        name: 'Common',
        plusLabel: '',
        color: '#94a3b8',
        cssClass: 'rarity-common',
        mult: 1.0,
        next: 'uncommon'
    },
    uncommon: {
        id: 'uncommon',
        rank: 1,
        name: 'Uncommon',
        plusLabel: '',
        color: '#22c55e',
        cssClass: 'rarity-uncommon',
        mult: 1.25,
        next: 'rare'
    },
    rare: {
        id: 'rare',
        rank: 2,
        name: 'Rare',
        plusLabel: '',
        color: '#3b82f6',
        cssClass: 'rarity-rare',
        mult: 1.55,
        next: 'epic'
    },
    epic: {
        id: 'epic',
        rank: 3,
        name: 'Epic',
        plusLabel: '',
        color: '#a855f7',
        cssClass: 'rarity-epic',
        mult: 1.9,
        next: 'epic1'
    },
    epic1: {
        id: 'epic1',
        rank: 4,
        name: 'Epic +1',
        plusLabel: '+1',
        color: '#c084fc',
        cssClass: 'rarity-epic1',
        mult: 2.3,
        next: 'epic2'
    },
    epic2: {
        id: 'epic2',
        rank: 5,
        name: 'Epic +2',
        plusLabel: '+2',
        color: '#e879f9',
        cssClass: 'rarity-epic2',
        mult: 2.75,
        next: 'legendary'
    },
    legendary: {
        id: 'legendary',
        rank: 6,
        name: 'Legendary',
        plusLabel: '★',
        color: '#f59e0b',
        cssClass: 'rarity-legendary',
        mult: 3.4,
        next: null
    }
};

// ============================================================================
// HỆ THỐNG ĐỘ KHÓ MÀN CHƠI (DIFFICULTY CONFIG)
// ============================================================================
const DIFFICULTY_ORDER = ['easy', 'normal', 'difficult'];

const DIFFICULTY_CONFIG = {
    easy: {
        id: 'easy',
        label: 'EASY',
        statMult: 1.0,
        calcReward: (mapLv) => 150 + mapLv * 50
    },
    normal: {
        id: 'normal',
        label: 'NORMAL',
        statMult: 1.35,
        calcReward: (mapLv) => 300 + mapLv * 80
    },
    difficult: {
        id: 'difficult',
        label: 'DIFFICULT',
        statMult: 1.75,
        calcReward: (mapLv) => 500 + mapLv * 120
    }
};

// ============================================================================
// DANH SÁCH NHIỆM VỤ KIẾM GEMS (MISSIONS CATALOG)
// ============================================================================
const MISSIONS_CATALOG = [
    {
        id: 'm_kills_500',
        title: 'Tiêu diệt 500 quân địch',
        statKey: 'kills',
        target: 500,
        rewardGems: 20
    },
    {
        id: 'm_diff_3',
        title: 'Hoàn thành 3 màn cấp Difficult',
        statKey: 'diffWins',
        target: 3,
        rewardGems: 40
    },
    {
        id: 'm_spawn_200',
        title: 'Gọi 200 đơn vị quân trong trận',
        statKey: 'spawns',
        target: 200,
        rewardGems: 15
    },
    {
        id: 'm_crates_10',
        title: 'Mở 10 rương Gacha bất kỳ',
        statKey: 'cratesOpened',
        target: 10,
        rewardGems: 25
    },
    {
        id: 'm_merge_5',
        title: 'Ghép (Merge) tướng thành công 5 lần',
        statKey: 'merges',
        target: 5,
        rewardGems: 30
    },
    {
        id: 'm_wins_10',
        title: 'Chiến thắng 10 trận đấu bất kỳ',
        statKey: 'wins',
        target: 10,
        rewardGems: 30
    },
    {
        id: 'm_upg_15',
        title: 'Nâng cấp Level quân đội 15 lần',
        statKey: 'upgrades',
        target: 15,
        rewardGems: 25
    },
    {
        id: 'm_kills_2000',
        title: 'Tiêu diệt 2000 quân địch',
        statKey: 'kills',
        target: 2000,
        rewardGems: 60
    }
];

// ============================================================================
// HỆ THỐNG LƯỚI ĐỊA HÌNH & TÌM ĐƯỜNG VƯỢT VẬT CẢN / QUA CẦU
// ============================================================================
const NAV_CELL = 10;
const GRID_W = Math.ceil(LOGICAL_WIDTH / NAV_CELL);
const GRID_H = Math.ceil(PLAYFIELD_HEIGHT / NAV_CELL);

const T_OPEN = 0;      // Đất trống / Cỏ / Cát (Quân bộ đi được)
const T_ROAD = 1;      // Đường nhựa / Đường đất (Ưu tiên đi nhanh, thông thoáng)
const T_WATER = 2;     // Vùng nước (Chỉ Thuyền đi được, Quân bộ CẤM bước xuống)
const T_BRIDGE = 3;    // Cầu bắc qua nước (Quân bộ đi lên trên cầu để qua nước)
const T_OBSTACLE = 4;  // Cây cối, núi đá, cột trụ, tường thành, nhà cửa (CẤM đi xuyên qua)

// ============================================================================
// DỮ LIỆU 15 MAP CHIẾN THUẬT
// ============================================================================
const MAPS_DATA = [
    {
        level: 1,
        name: 'Cầu Qua Sông',
        hasWater: true,
        waterZones: [{ x: 0, y: 290, w: 420, h: 130 }],
        bridgeLanes: [210],
        desc: 'Sông lớn cắt ngang chiến trường. Quân bộ phải lên cầu đá ở giữa để qua sông.'
    },
    {
        level: 2,
        name: 'Đường Đèo Chữ S',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [210],
        desc: 'Đường nhựa uốn lượn chữ S xuyên qua rừng thông và núi đá chắn hai bên.'
    },
    {
        level: 3,
        name: 'Đại Lộ Đô Thị',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [95, 210, 325],
        desc: 'Đường phố đô thị chia ô vuông. Các đơn vị phải đi theo đại lộ vòng qua tòa nhà.'
    },
    {
        level: 4,
        name: 'Pháo Đài Hồ Nước',
        hasWater: true,
        waterZones: [
            { x: 25, y: 145, w: 120, h: 420 },
            { x: 275, y: 145, w: 120, h: 420 },
            { x: 25, y: 155, w: 370, h: 120 },
            { x: 25, y: 435, w: 370, h: 120 }
        ],
        bridgeLanes: [210],
        desc: 'Hồ nước bao quanh đảo pháo đài giữa. Quân bộ qua 2 cầu gỗ và vòng quanh pháo đài.'
    },
    {
        level: 5,
        name: 'Mê Cung Rừng Rậm',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [120, 210, 300],
        desc: 'Mạng lưới đường xám nhiều ngã rẽ chằng chịt xuyên rừng thông dày đặc.'
    },
    {
        level: 6,
        name: 'Khu Công Nghiệp',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [100, 210, 320],
        desc: 'Khu nhà máy công nghiệp nặng. Các đơn vị phải vòng qua các xưởng máy.'
    },
    {
        level: 7,
        name: 'Hồ Đôi Vách Đá',
        hasWater: true,
        waterZones: [
            { x: 72, y: 165, w: 210, h: 145 },
            { x: 130, y: 415, w: 210, h: 145 }
        ],
        bridgeLanes: [210],
        desc: 'Đường đèo uốn chéo lách qua khe đất giữa 2 hồ nước sâu và vách núi đá.'
    },
    {
        level: 8,
        name: 'Hẻm Núi Đá Hiểm Trở',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [210],
        desc: 'Hai dãy núi đá khổng lồ ép lại thành khe độc đạo có trụ chắn ở giữa.'
    },
    {
        level: 9,
        name: 'Vòng Xoay Thị Trấn',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [95, 210, 325],
        desc: 'Hai vòng xoay nối liền khung đường bao quanh khu nhà thị trấn và rừng cây.'
    },
    {
        level: 10,
        name: 'Bờ Biển Cát Vàng',
        hasWater: true,
        waterZones: [{ x: 0, y: 105, w: 118, h: 505 }],
        bridgeLanes: [220, 295],
        desc: 'Biển xanh bên trái cho tàu chiến, bãi cát vàng và đường mòn bên phải cho bộ binh.'
    },
    {
        level: 11,
        name: 'Căn Cứ Tên Lửa',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [100, 210, 320],
        desc: 'Đường chữ thập trung tâm bao quanh bởi 4 tổ hợp phóng tên lửa và doanh trại.'
    },
    {
        level: 12,
        name: 'Thành Cổ Kiên Cố',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [105, 210, 315],
        desc: 'Tường thành đá kiên cố vòng ngoài, đường nhựa vuông vòng quanh pháo đài tâm.'
    },
    {
        level: 13,
        name: 'Quần Đảo Cầu Gỗ',
        hasWater: true,
        waterZones: [{ x: 0, y: 135, w: 420, h: 445 }],
        bridgeLanes: [88, 210, 332],
        desc: 'Quần đảo giữa sông nước nối liền bằng mạng lưới cầu gỗ bắc qua từng đảo.'
    },
    {
        level: 14,
        name: 'Vòng Xoay Hồ Trung Tâm',
        hasWater: true,
        waterZones: [{ x: 158, y: 310, w: 104, h: 96 }],
        bridgeLanes: [90, 210, 330],
        desc: 'Đại lộ hình tròn lớn ôm trọn vành đai rừng thông và hồ nước giữa tâm.'
    },
    {
        level: 15,
        name: 'Chiến Tuyến Phòng Thủ',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [100, 320],
        desc: 'Hai bức tường thành đá chắn ngang chiến trường, buộc quân đi qua 2 cổng biên.'
    }
];

const LEVELS = MAPS_DATA.map((m, idx) => {
    const lv = idx + 1;
    return {
        ...m,
        playerBaseHp: 100 + Math.floor((lv - 1) / 2) * 15,
        startingGas: lv <= 3 ? 5 : 4
    };
});

// ============================================================================
// DANH SÁCH 11 BINH CHỦNG (UNIT_CATALOG)
// ============================================================================
const UNIT_CATALOG = [
    {
        id: 'infantry',
        name: 'Bộ Binh',
        role: 'Đi bộ • Tầm gần',
        spriteCol: 16,
        damage: 2,
        cost: 2,
        hp: 9,
        speed: 54,
        fireRate: 0.85,
        range: 48,
        radius: 12,
        attackType: 'beam',
        animStyle: 'walker_rifle',
        isWalker: true,
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'bazooka',
        name: 'Lính Tên Lửa',
        role: 'Đi bộ • Tầm ngắn',
        spriteCol: 17,
        damage: 3,
        cost: 3,
        hp: 11,
        speed: 46,
        fireRate: 1.15,
        range: 84,
        radius: 13,
        attackType: 'bullet',
        projType: 'rocket_short',
        projSpeed: 235,
        projRadius: 5,
        animStyle: 'walker_bazooka',
        isWalker: true,
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'humvee',
        name: 'Xe Thiết Giáp',
        role: 'Cơ giới • Tầm trung',
        spriteCol: 5,
        damage: 4,
        cost: 4,
        hp: 16,
        speed: 62,
        fireRate: 0.92,
        range: 115,
        radius: 15,
        attackType: 'bullet',
        projType: 'tracer',
        projSpeed: 290,
        projRadius: 4.5,
        animStyle: 'vehicle_mg',
        isWalker: false,
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'apc',
        name: 'Pháo Tự Hành',
        role: 'Thiết giáp • Tầm khá',
        spriteCol: 7,
        damage: 5,
        cost: 5,
        hp: 20,
        speed: 40,
        fireRate: 1.2,
        range: 148,
        radius: 16,
        attackType: 'bullet',
        projType: 'shell',
        projSpeed: 255,
        projRadius: 6,
        animStyle: 'vehicle_cannon',
        isWalker: false,
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'gunboat',
        name: 'Thuyền Tuần Tra',
        role: 'Thủy quân 🌊 • Tầm xa',
        spriteCol: 15,
        damage: 5,
        cost: 5,
        hp: 21,
        speed: 50,
        fireRate: 1.0,
        range: 162,
        radius: 16,
        attackType: 'bullet',
        projType: 'shell',
        projSpeed: 275,
        projRadius: 5.5,
        animStyle: 'naval_light',
        isWalker: false,
        isNaval: true,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'tank',
        name: 'Xe Tăng Nặng',
        role: 'Chủ lực • Tầm xa',
        spriteCol: 8,
        damage: 6,
        cost: 6,
        hp: 28,
        speed: 35,
        fireRate: 1.25,
        range: 168,
        radius: 18,
        attackType: 'bullet',
        projType: 'heavy_shell',
        projSpeed: 265,
        projRadius: 6.5,
        animStyle: 'vehicle_heavy',
        isWalker: false,
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'heli',
        name: 'Trực Thăng',
        role: 'Không quân • Cơ động',
        spriteCol: 11,
        damage: 7,
        cost: 7,
        hp: 20,
        speed: 58,
        fireRate: 1.08,
        range: 138,
        radius: 16,
        attackType: 'bullet',
        projType: 'air_missile',
        projSpeed: 285,
        projRadius: 6,
        animStyle: 'heli_rotor',
        isWalker: false,
        isNaval: false,
        isAir: true,
        isAirstrike: false
    },
    {
        id: 'destroyer',
        name: 'Tàu Khu Trục',
        role: 'Thủy quân 🌊 • Rất xa',
        spriteCol: 13,
        damage: 8,
        cost: 8,
        hp: 32,
        speed: 38,
        fireRate: 1.22,
        range: 195,
        radius: 18,
        attackType: 'bullet',
        projType: 'arc_shell',
        arcHeight: 28,
        projSpeed: 260,
        projRadius: 7,
        animStyle: 'naval_heavy',
        isWalker: false,
        isNaval: true,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'rocket',
        name: 'Pháo Phản Lực',
        role: 'Pháo binh • Siêu xa',
        spriteCol: 9,
        damage: 9,
        cost: 9,
        hp: 22,
        speed: 32,
        fireRate: 1.5,
        range: 215,
        radius: 17,
        attackType: 'bullet',
        projType: 'arc_missile',
        arcHeight: 46,
        projSpeed: 240,
        projRadius: 7.5,
        animStyle: 'artillery_salvo',
        isWalker: false,
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'battleship',
        name: 'Chiến Hạm Lớn',
        role: 'Thủy quân 🌊 • Siêu xa',
        spriteCol: 14,
        damage: 11,
        cost: 11,
        hp: 42,
        speed: 30,
        fireRate: 1.38,
        range: 230,
        radius: 20,
        attackType: 'bullet',
        projType: 'arc_shell',
        arcHeight: 40,
        projSpeed: 255,
        projRadius: 8,
        animStyle: 'naval_battleship',
        isWalker: false,
        isNaval: true,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'airstrike',
        name: 'Không Kích',
        role: 'Oanh tạc ✈️ • Toàn bản đồ',
        spriteCol: 10,
        damage: 15,
        baseDamage: 20,
        cost: 10,
        hp: 1,
        speed: 350,
        fireRate: 1,
        range: 999,
        radius: 20,
        attackType: 'airstrike',
        animStyle: 'airstrike',
        isWalker: false,
        isNaval: false,
        isAir: true,
        isAirstrike: true
    }
];

const UNIT_BY_ID = {};
UNIT_CATALOG.forEach(u => {
    UNIT_BY_ID[u.id] = u;
});

// ============================================================================
// DANH SÁCH THẺ BUFF KHI LÊN CẤP TRONG TRẬN
// ============================================================================
const BUFF_CATALOG = [
    {
        id: 'buff_dmg',
        name: 'Đạn Xuyên Giáp',
        tag: 'NÂNG CẤP HỎA LỰC',
        desc: '+25% Sát thương cho toàn bộ quân đội Xanh',
        iconCol: 11,
        iconRow: 10,
        apply: () => {
            game.buffs.dmgMult += 0.25;
            game.units.forEach(u => {
                if (u.team === 'blue') {
                    const spec = UNIT_BY_ID[u.unitId];
                    if (spec) {
                        u.damage = getEffectiveUnitStats(spec, true).damage;
                    }
                }
            });
            addFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2, '⚔️ +25% SÁT THƯƠNG TOÀN QUÂN!', '#fde047', 15);
        }
    },
    {
        id: 'buff_hp',
        name: 'Giáp Hợp Kim',
        tag: 'NÂNG CẤP PHÒNG THỦ',
        desc: '+25% Máu tối đa cho quân Xanh & Hồi 100% máu quân trên sân',
        iconCol: 15,
        iconRow: 10,
        apply: () => {
            game.buffs.hpMult += 0.25;
            game.units.forEach(u => {
                if (u.team === 'blue') {
                    const spec = UNIT_BY_ID[u.unitId];
                    if (spec) {
                        u.maxHp = getEffectiveUnitStats(spec, true).hp;
                        u.hp = u.maxHp;
                    }
                }
            });
            addFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2, '🛡️ +25% MÁU & HỒI PHỤC TOÀN QUÂN!', '#34d399', 15);
        }
    },
    {
        id: 'buff_haste',
        name: 'Nòng Pháo Siêu Tốc',
        tag: 'NÂNG CẤP TỐC BẮN',
        desc: '+20% Tốc độ bắn & +12% Tầm bắn cho toàn bộ quân Xanh',
        iconCol: 7,
        iconRow: 3,
        apply: () => {
            game.buffs.fireRateMult *= 0.82;
            game.buffs.rangeMult += 0.12;
            game.units.forEach(u => {
                if (u.team === 'blue') {
                    u.fireRate = Math.max(0.25, +(u.baseFireRate * game.buffs.fireRateMult).toFixed(2));
                    u.range = Math.round(u.baseRange * game.buffs.rangeMult);
                }
            });
            addFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2, '🎯 +20% TỐC BẮN & +12% TẦM BẮN!', '#38bdf8', 15);
        }
    },
    {
        id: 'buff_supply',
        name: 'Tiếp Viện Khẩn Cấp',
        tag: 'HẬU CẦN CHIẾN TRƯỜNG',
        desc: 'Nhận ngay +7 Bình Xăng & Sửa chữa +35 HP Căn cứ Xanh',
        iconCol: 12,
        iconRow: 10,
        apply: () => {
            game.gasCount = Math.min(game.maxGas, game.gasCount + 7);
            game.blueBase.hp = Math.min(game.blueBase.maxHp, game.blueBase.hp + 35);
            addFloatingText(LOGICAL_WIDTH / 2, game.blueBase.y - 40, '⛽ +7 XĂNG & +35 HP CĂN CỨ!', '#4ade80', 15);
        }
    }
];

// ============================================================================
// TRẠNG THÁI META-GAME & LƯU TRỮ LOCALSTORAGE
// ============================================================================
let metaState = {
    playerName: '',
    coins: 250,
    gems: 300,
    usedCodes: [],
    mapDifficultyProgress: {
        1: { easy: false, normal: false, difficult: false }
    },
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
    }
};

let currentLobbyTab = 'battle';
let currentStageViewLevel = 1;
let currentSelectedDifficulty = 'easy';
let currentArmyMode = 'army'; // 'army' | 'merge'
let showcaseUnitId = 'infantry';
let inspectingUnitId = 'infantry';
let mergeSelectedCardUids = [];

function createDefaultInventory() {
    const starterUnits = ['infantry', 'bazooka', 'humvee', 'apc'];
    return starterUnits.map((unitId, idx) => ({
        uid: 'init_card_' + idx + '_' + Date.now(),
        unitId,
        rarity: 'common'
    }));
}

function createDefaultArmyLevels() {
    const lvMap = {};
    UNIT_CATALOG.forEach(u => {
        lvMap[u.id] = 1;
    });
    return lvMap;
}

function createDefaultMapDifficultyProgress() {
    const prog = {};
    for (let i = 1; i <= LEVELS.length; i++) {
        prog[i] = { easy: false, normal: false, difficult: false };
    }
    return prog;
}

function loadProgress() {
    const defaultLevels = createDefaultArmyLevels();
    const defaultMapProg = createDefaultMapDifficultyProgress();

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            metaState.playerName = typeof parsed.playerName === 'string' ? parsed.playerName : '';
            metaState.coins = typeof parsed.coins === 'number' ? parsed.coins : 250;
            metaState.gems = typeof parsed.gems === 'number' ? parsed.gems : 300;
            metaState.usedCodes = Array.isArray(parsed.usedCodes) ? parsed.usedCodes : [];

            metaState.mapDifficultyProgress = defaultMapProg;
            if (parsed.mapDifficultyProgress && typeof parsed.mapDifficultyProgress === 'object') {
                for (let i = 1; i <= LEVELS.length; i++) {
                    if (parsed.mapDifficultyProgress[i]) {
                        metaState.mapDifficultyProgress[i] = {
                            easy: !!parsed.mapDifficultyProgress[i].easy,
                            normal: !!parsed.mapDifficultyProgress[i].normal,
                            difficult: !!parsed.mapDifficultyProgress[i].difficult
                        };
                    }
                }
            }

            if (Array.isArray(parsed.inventory) && parsed.inventory.length > 0) {
                metaState.inventory = parsed.inventory.filter(
                    item => item && UNIT_BY_ID[item.unitId] && RARITY_CONFIG[item.rarity]
                );
            } else {
                metaState.inventory = createDefaultInventory();
            }

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
        } else {
            metaState.playerName = '';
            metaState.coins = 250;
            metaState.gems = 300;
            metaState.usedCodes = [];
            metaState.mapDifficultyProgress = defaultMapProg;
            metaState.inventory = createDefaultInventory();
            metaState.armyPermanentLevels = defaultLevels;
        }
    } catch (e) {
        metaState.mapDifficultyProgress = defaultMapProg;
        metaState.inventory = createDefaultInventory();
        metaState.armyPermanentLevels = defaultLevels;
    }

    currentStageViewLevel = getMaxUnlockedMapLevel();
    currentSelectedDifficulty = getDefaultDifficultyForMap(currentStageViewLevel);
}

function saveProgress() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(metaState));
    } catch (e) {}
}

function getMaxUnlockedMapLevel() {
    let maxLv = 1;
    for (let i = 1; i < LEVELS.length; i++) {
        const prog = metaState.mapDifficultyProgress[i];
        if (prog && prog.difficult) {
            maxLv = i + 1;
        } else {
            break;
        }
    }
    return maxLv;
}

function isDifficultyUnlocked(mapLv, diffId) {
    if (mapLv > getMaxUnlockedMapLevel()) return false;
    const prog = metaState.mapDifficultyProgress[mapLv] || { easy: false, normal: false, difficult: false };
    if (diffId === 'easy') return true;
    if (diffId === 'normal') return !!prog.easy;
    if (diffId === 'difficult') return !!prog.normal;
    return false;
}

function getDefaultDifficultyForMap(mapLv) {
    const prog = metaState.mapDifficultyProgress[mapLv] || { easy: false, normal: false, difficult: false };
    if (!prog.easy) return 'easy';
    if (!prog.normal) return 'normal';
    return 'difficult';
}

function getHighestRarityForUnit(unitId) {
    let bestRarity = 'common';
    let bestRank = -1;

    for (const card of metaState.inventory) {
        if (card.unitId === unitId && RARITY_CONFIG[card.rarity]) {
            const rRank = RARITY_CONFIG[card.rarity].rank;
            if (rRank > bestRank) {
                bestRank = rRank;
                bestRarity = card.rarity;
            }
        }
    }
    return bestRarity;
}

function hasUnitInInventory(unitId) {
    return metaState.inventory.some(c => c.unitId === unitId);
}

function getUnitUpgradeCost(currentLv) {
    return Math.round(100 * Math.pow(1.35, currentLv - 1));
}

function formatCurrency(val) {
    const n = Math.floor(Number(val) || 0);
    return n.toLocaleString('en-US');
}

loadProgress();

// ============================================================================
// QUẢN LÝ SPRITE ATLAS ("Preview.png")
// ============================================================================
class SpriteAtlas {
    constructor() {
        this.ready = false;
        this.tiles = new Map();
        this.bakedMapCanvas = null;

        this.image = new Image();
        this.image.src = 'Preview.png';
        this.image.onload = () => this.processAtlas();
        this.image.onerror = () => {
            if (!this.image.src.endsWith('preview.png')) {
                this.image.src = 'preview.png';
            }
        };
    }

    isSolidTerrainTile(col, row) {
        if (col <= 3 && row <= 5) return true;
        if (col === 4 && (row === 0 || row === 1 || row === 8)) return true;
        return false;
    }

    extractUnitOrBuilding(sx, sy, tileW, bgR, bgG, bgB, hasFullData, filterDisconnected = true) {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = tileW;
        tileCanvas.height = tileW;
        const tCtx = tileCanvas.getContext('2d');
        tCtx.imageSmoothingEnabled = false;
        tCtx.drawImage(this.image, sx, sy, tileW, tileW, 0, 0, tileW, tileW);

        if (!hasFullData) return tileCanvas;

        try {
            const subData = tCtx.getImageData(0, 0, tileW, tileW);
            const d = subData.data;
            const total = tileW * tileW;
            const visitedBg = new Uint8Array(total);
            const queue = [];

            const matchBg = (idx, tol = 24) =>
                Math.abs(d[idx] - bgR) <= tol &&
                Math.abs(d[idx + 1] - bgG) <= tol &&
                Math.abs(d[idx + 2] - bgB) <= tol;

            for (let x = 0; x < tileW; x++) {
                queue.push(x, (tileW - 1) * tileW + x);
            }
            for (let y = 0; y < tileW; y++) {
                queue.push(y * tileW, y * tileW + (tileW - 1));
            }

            while (queue.length > 0) {
                const pos = queue.pop();
                if (pos < 0 || pos >= total || visitedBg[pos]) continue;
                visitedBg[pos] = 1;

                const pIdx = pos * 4;
                if (matchBg(pIdx, 24)) {
                    d[pIdx + 3] = 0;
                    const px = pos % tileW;
                    const py = (pos / tileW) | 0;
                    if (px > 0) queue.push(pos - 1);
                    if (px < tileW - 1) queue.push(pos + 1);
                    if (py > 0) queue.push(pos - tileW);
                    if (py < tileW - 1) queue.push(pos + tileW);
                }
            }

            if (filterDisconnected) {
                const keep = new Uint8Array(total);
                const fgQueue = [];
                const c0 = Math.max(2, Math.floor(tileW * 0.2));
                const c1 = Math.min(tileW - 3, Math.ceil(tileW * 0.8));

                for (let y = c0; y <= c1; y++) {
                    for (let x = c0; x <= c1; x++) {
                        const pos = y * tileW + x;
                        if (d[pos * 4 + 3] > 0) {
                            keep[pos] = 1;
                            fgQueue.push(pos);
                        }
                    }
                }

                while (fgQueue.length > 0) {
                    const pos = fgQueue.pop();
                    const px = pos % tileW;
                    const py = (pos / tileW) | 0;

                    for (let ny = Math.max(0, py - 1); ny <= Math.min(tileW - 1, py + 1); ny++) {
                        for (let nx = Math.max(0, px - 1); nx <= Math.min(tileW - 1, px + 1); nx++) {
                            const nPos = ny * tileW + nx;
                            if (!keep[nPos] && d[nPos * 4 + 3] > 0) {
                                keep[nPos] = 1;
                                fgQueue.push(nPos);
                            }
                        }
                    }
                }

                for (let i = 0; i < total; i++) {
                    if (!keep[i]) d[i * 4 + 3] = 0;
                }
            }

            tCtx.putImageData(subData, 0, 0);
        } catch (e) {}

        return tileCanvas;
    }

    extractRow10Icon(sx, sy, sw, sh, outSize, bgR, bgG, bgB, hasFullData) {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = outSize;
        tileCanvas.height = outSize;
        const tCtx = tileCanvas.getContext('2d');
        tCtx.imageSmoothingEnabled = false;

        const w = Math.max(1, Math.round(sw));
        const h = Math.max(1, Math.round(sh));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.drawImage(this.image, Math.round(sx), Math.round(sy), w, h, 0, 0, w, h);

        if (!hasFullData) {
            tCtx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, outSize, outSize);
            return tileCanvas;
        }

        try {
            const subData = tempCtx.getImageData(0, 0, w, h);
            const d = subData.data;

            const matchBg = (idx, tol = 24) =>
                Math.abs(d[idx] - bgR) <= tol &&
                Math.abs(d[idx + 1] - bgG) <= tol &&
                Math.abs(d[idx + 2] - bgB) <= tol;

            let bMinX = w, bMaxX = -1, bMinY = h, bMaxY = -1;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const pIdx = (y * w + x) * 4;
                    if (matchBg(pIdx, 24)) {
                        d[pIdx + 3] = 0;
                    } else if (d[pIdx + 3] > 0) {
                        if (x < bMinX) bMinX = x;
                        if (x > bMaxX) bMaxX = x;
                        if (y < bMinY) bMinY = y;
                        if (y > bMaxY) bMaxY = y;
                    }
                }
            }

            tempCtx.putImageData(subData, 0, 0);

            if (bMaxX >= bMinX && bMaxY >= bMinY) {
                const cw = bMaxX - bMinX + 1;
                const ch = bMaxY - bMinY + 1;
                const pad = 2;
                const targetMax = outSize - pad * 2;
                const scale = Math.min(targetMax / Math.max(cw, ch, 1), 1.2);
                const dw = Math.max(1, Math.round(cw * scale));
                const dh = Math.max(1, Math.round(ch * scale));
                const dx = Math.floor((outSize - dw) / 2);
                const dy = Math.floor((outSize - dh) / 2);
                tCtx.drawImage(tempCanvas, bMinX, bMinY, cw, ch, dx, dy, dw, dh);
            } else {
                tCtx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, outSize, outSize);
            }
        } catch (e) {
            tCtx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, outSize, outSize);
        }

        return tileCanvas;
    }

    processAtlas() {
        const W = this.image.naturalWidth;
        const H = this.image.naturalHeight;
        const rawCanvas = document.createElement('canvas');
        rawCanvas.width = W;
        rawCanvas.height = H;
        const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
        rawCtx.imageSmoothingEnabled = false;
        rawCtx.drawImage(this.image, 0, 0);

        let minX = Math.round(W * 0.16875);
        let maxX = Math.round(W * 0.83125);
        let minY = Math.round(H * 0.0963);
        let tileW = Math.round(((maxX - minX + 1) * 16) / 305);
        let stepX = (maxX - minX + 1 - tileW) / 17;
        let rowStarts = Array.from({ length: 10 }, (_, r) => Math.round(minY + r * stepX));
        let row10Y0 = Math.round(minY + 10 * stepX + tileW * 0.25);
        let row10Y1 = row10Y0 + tileW + 4;

        let fullData = null;
        let bgR = 59, bgG = 136, bgB = 214;

        try {
            const imgData = rawCtx.getImageData(0, 0, W, H);
            fullData = imgData.data;
            bgR = fullData[0];
            bgG = fullData[1];
            bgB = fullData[2];

            const isBg = (x, y, tol = 20) => {
                const idx = (y * W + x) * 4;
                return (
                    Math.abs(fullData[idx] - bgR) <= tol &&
                    Math.abs(fullData[idx + 1] - bgG) <= tol &&
                    Math.abs(fullData[idx + 2] - bgB) <= tol
                );
            };

            let detMinX = W, detMaxX = 0, detMinY = H, detMaxY = 0;
            const scanMaxY = Math.floor(H * 0.84);
            for (let y = Math.floor(H * 0.04); y < scanMaxY; y++) {
                for (let x = Math.floor(W * 0.08); x < Math.floor(W * 0.92); x++) {
                    if (!isBg(x, y, 22)) {
                        if (x < detMinX) detMinX = x;
                        if (x > detMaxX) detMaxX = x;
                        if (y < detMinY) detMinY = y;
                        if (y > detMaxY) detMaxY = y;
                    }
                }
            }

            if (detMaxX > detMinX && detMaxY > detMinY) {
                minX = detMinX;
                maxX = detMaxX;
                minY = detMinY;

                const rightStartX = Math.floor(minX + (maxX - minX) * 0.46);
                const segments = [];
                let inRow = false;
                let rStart = 0;

                for (let y = detMinY; y <= detMaxY + 1; y++) {
                    let nonBgCount = 0;
                    if (y <= detMaxY) {
                        for (let x = rightStartX; x <= maxX; x++) {
                            if (!isBg(x, y, 22)) nonBgCount++;
                        }
                    }
                    if (nonBgCount > 2 && !inRow) {
                        inRow = true;
                        rStart = y;
                    } else if (nonBgCount <= 2 && inRow) {
                        inRow = false;
                        if (y - rStart >= 6) {
                            segments.push({ y0: rStart, y1: y - 1 });
                        }
                    }
                }

                if (segments.length >= 10) {
                    const heights = segments.slice(0, 10).map(s => s.y1 - s.y0 + 1).sort((a, b) => a - b);
                    tileW = heights[Math.floor(heights.length / 2)];
                    stepX = (maxX - minX + 1 - tileW) / 17;
                    rowStarts = [];
                    for (let r = 0; r < 10; r++) {
                        rowStarts.push(Math.round(minY + r * stepX));
                    }
                    if (segments[10]) {
                        row10Y0 = segments[10].y0 - 2;
                        row10Y1 = segments[10].y1 + 2;
                    } else {
                        row10Y0 = segments[9].y1 + 4;
                        row10Y1 = detMaxY + 2;
                    }
                }
            }
        } catch (err) {}

        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 18; col++) {
                const sx = Math.round(minX + col * stepX);
                const sy = rowStarts[row];
                const isTerrain = this.isSolidTerrainTile(col, row);

                if (isTerrain) {
                    const tileCanvas = document.createElement('canvas');
                    tileCanvas.width = tileW;
                    tileCanvas.height = tileW;
                    const tCtx = tileCanvas.getContext('2d');
                    tCtx.imageSmoothingEnabled = false;
                    const inset = Math.max(1, Math.floor(tileW * 0.04));
                    tCtx.drawImage(
                        this.image,
                        sx + inset,
                        sy + inset,
                        tileW - inset * 2,
                        tileW - inset * 2,
                        0,
                        0,
                        tileW,
                        tileW
                    );
                    this.tiles.set(`${col},${row}`, tileCanvas);
                } else {
                    const isRoadOrMulti = (row >= 6 && col <= 4) || (col === 7 && row === 3);
                    const tileCanvas = this.extractUnitOrBuilding(
                        sx,
                        sy,
                        tileW,
                        bgR,
                        bgG,
                        bgB,
                        !!fullData,
                        !isRoadOrMulti
                    );
                    this.tiles.set(`${col},${row}`, tileCanvas);
                }
            }
        }

        const row10Islands = [];
        if (fullData) {
            let inIsland = false;
            let iStart = 0;
            for (let x = minX; x <= maxX + 1; x++) {
                let colHasFg = false;
                if (x <= maxX) {
                    for (let y = row10Y0; y <= row10Y1; y++) {
                        const idx = (y * W + x) * 4;
                        if (
                            Math.abs(fullData[idx] - bgR) > 20 ||
                            Math.abs(fullData[idx + 1] - bgG) > 20 ||
                            Math.abs(fullData[idx + 2] - bgB) > 20
                        ) {
                            colHasFg = true;
                            break;
                        }
                    }
                }
                if (colHasFg && !inIsland) {
                    inIsland = true;
                    iStart = x;
                } else if (!colHasFg && inIsland) {
                    inIsland = false;
                    if (x - iStart >= 4) {
                        row10Islands.push({ x0: iStart, x1: x - 1 });
                    }
                }
            }
        }

        for (let col = 0; col < 18; col++) {
            let sx, sw;
            if (row10Islands.length === 18) {
                sx = row10Islands[col].x0 - 2;
                sw = row10Islands[col].x1 - row10Islands[col].x0 + 5;
            } else {
                sx = Math.round(minX + col * stepX);
                sw = tileW;
            }
            const sy = row10Y0;
            const sh = row10Y1 - row10Y0 + 1;

            const iconCanvas = this.extractRow10Icon(
                sx,
                sy,
                sw,
                sh,
                tileW,
                bgR,
                bgG,
                bgB,
                !!fullData
            );
            this.tiles.set(`${col},10`, iconCanvas);
        }

        this.ready = true;
        this.populateUIDeckIcons();
        this.renderTopAvatarArt();
        buildStaticMapCanvas(game.currentLevel);
        renderStageScreenUI();
        renderArmyTabUI();
        renderBattleDeckButtons();
    }

    get(col, row) {
        return this.tiles.get(`${col},${row}`) || null;
    }

    draw(ctx, col, row, cx, cy, w, h, opts = {}) {
        const sprite = this.get(col, row);
        if (!sprite) return false;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(cx, cy);
        if (opts.rotation) ctx.rotate(opts.rotation);
        if (opts.flipX || opts.flipY) {
            ctx.scale(opts.flipX ? -1 : 1, opts.flipY ? -1 : 1);
        }
        if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
        ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
        ctx.restore();
        return true;
    }

    toDataURL(col, row) {
        const sprite = this.get(col, row);
        return sprite ? sprite.toDataURL() : '';
    }

    populateUIDeckIcons() {
        const setImg = (id, col, row) => {
            const el = document.getElementById(id);
            if (el) el.src = this.toDataURL(col, row);
        };

        const gasUrl = this.toDataURL(12, 10);
        setImg('icon-gas-can', 12, 10);
        setImg('icon-upgrade-building', 11, 2);

        document.querySelectorAll('.gas-inline-sprite').forEach(img => {
            img.src = gasUrl;
        });

        const lockUrl = this.toDataURL(13, 10);
        document.querySelectorAll('.lock-sprite').forEach(img => {
            img.src = lockUrl;
        });
    }

    renderTopAvatarArt() {
        const avatarCanvas = document.getElementById('topAvatarCanvas');
        if (!avatarCanvas) return;
        const aCtx = avatarCanvas.getContext('2d');
        aCtx.imageSmoothingEnabled = false;
        aCtx.clearRect(0, 0, 32, 32);
        this.draw(aCtx, 16, 7, 16, 17, 26, 26);
    }
}

const atlas = new SpriteAtlas();

// ============================================================================
// HỆ THỐNG LƯỚI ĐỊA HÌNH, VẬT CẢN VÀ TÌM ĐƯỜNG FLOW-FIELD
// ============================================================================
class NavSystem {
    constructor() {
        this.grid = new Uint8Array(GRID_W * GRID_H);
        this.obstacles = [];
        this.bridges = [];
        this.waterBoxes = [];
        this.flowBlueLand = new Float32Array(GRID_W * GRID_H);
        this.flowRedLand = new Float32Array(GRID_W * GRID_H);
        this.flowBlueNaval = new Float32Array(GRID_W * GRID_H);
        this.flowRedNaval = new Float32Array(GRID_W * GRID_H);
    }

    reset() {
        this.grid.fill(T_OPEN);
        this.obstacles = [];
        this.bridges = [];
        this.waterBoxes = [];
    }

    idx(gx, gy) {
        return gy * GRID_W + gx;
    }

    inBounds(gx, gy) {
        return gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H;
    }

    getCellAtPixel(x, y) {
        const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(x / NAV_CELL)));
        const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(y / NAV_CELL)));
        return this.grid[this.idx(gx, gy)];
    }

    markRect(x, y, w, h, type, overrideAll = true) {
        const c0 = Math.max(0, Math.floor(x / NAV_CELL));
        const c1 = Math.min(GRID_W - 1, Math.floor((x + w) / NAV_CELL));
        const r0 = Math.max(0, Math.floor(y / NAV_CELL));
        const r1 = Math.min(GRID_H - 1, Math.floor((y + h) / NAV_CELL));

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const i = this.idx(c, r);
                if (overrideAll || this.grid[i] === T_OPEN) {
                    this.grid[i] = type;
                }
            }
        }
    }

    markCircle(cx, cy, radius, type, overrideAll = true) {
        const c0 = Math.max(0, Math.floor((cx - radius) / NAV_CELL));
        const c1 = Math.min(GRID_W - 1, Math.floor((cx + radius) / NAV_CELL));
        const r0 = Math.max(0, Math.floor((cy - radius) / NAV_CELL));
        const r1 = Math.min(GRID_H - 1, Math.floor((cy + radius) / NAV_CELL));

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const px = (c + 0.5) * NAV_CELL;
                const py = (r + 0.5) * NAV_CELL;
                if (Math.hypot(px - cx, py - cy) <= radius) {
                    const i = this.idx(c, r);
                    if (overrideAll || this.grid[i] === T_OPEN) {
                        this.grid[i] = type;
                    }
                }
            }
        }
    }

    markPolyline(pts, width, type) {
        const halfW = width * 0.5;
        for (let i = 0; i < pts.length - 1; i++) {
            const [x1, y1] = pts[i];
            const [x2, y2] = pts[i + 1];
            const len = Math.hypot(x2 - x1, y2 - y1);
            const steps = Math.max(1, Math.ceil(len / (NAV_CELL * 0.5)));
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const px = x1 + (x2 - x1) * t;
                const py = y1 + (y2 - y1) * t;
                this.markCircle(px, py, halfW, type, false);
            }
        }
    }

    markRing(cx, cy, r, width, type) {
        const halfW = width * 0.5;
        const steps = Math.max(24, Math.ceil((2 * Math.PI * r) / (NAV_CELL * 0.5)));
        for (let s = 0; s < steps; s++) {
            const a = (s / steps) * Math.PI * 2;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            this.markCircle(px, py, halfW, type, false);
        }
    }

    isRoadOrBridgeOrSpawn(cx, cy, pad = 16) {
        if (cy < 108 || cy > PLAYFIELD_HEIGHT - 108) {
            if (cx > 68 && cx < LOGICAL_WIDTH - 68) return true;
        }
        const c0 = Math.max(0, Math.floor((cx - pad) / NAV_CELL));
        const c1 = Math.min(GRID_W - 1, Math.floor((cx + pad) / NAV_CELL));
        const r0 = Math.max(0, Math.floor((cy - pad) / NAV_CELL));
        const r1 = Math.min(GRID_H - 1, Math.floor((cy + pad) / NAV_CELL));

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const cell = this.grid[this.idx(c, r)];
                if (cell === T_ROAD || cell === T_BRIDGE) return true;
            }
        }
        return false;
    }

    addCircleObstacle(x, y, r, kind = 'tree') {
        this.obstacles.push({ type: 'circle', kind, x, y, r });
        this.markCircle(x, y, r + 2, T_OBSTACLE, true);
    }

    addBoxObstacle(x, y, w, h, kind = 'building') {
        this.obstacles.push({ type: 'box', kind, x, y, w, h });
        this.markRect(x - 2, y - 2, w + 4, h + 4, T_OBSTACLE, true);
    }

    addBridge(cx, cy, w, h, isVertical = true) {
        const bw = isVertical ? w : h;
        const bh = isVertical ? h : w;
        const bx = cx - bw / 2;
        const by = cy - bh / 2;
        this.bridges.push({ x: bx, y: by, w: bw, h: bh });
        const padX = isVertical ? 2 : 10;
        const padY = isVertical ? 10 : 2;
        this.markRect(bx - padX, by - padY, bw + padX * 2, bh + padY * 2, T_BRIDGE, true);
    }

    isPointOnBridge(x, y, margin = 4) {
        for (const br of this.bridges) {
            if (
                x >= br.x - margin &&
                x <= br.x + br.w + margin &&
                y >= br.y - margin &&
                y <= br.y + br.h + margin
            ) {
                return true;
            }
        }
        return false;
    }

    isPointInWaterRaw(x, y) {
        if (this.isPointOnBridge(x, y, 4)) return false;
        const cell = this.getCellAtPixel(x, y);
        return cell === T_WATER;
    }

    buildFlowFields() {
        this.markRect(80, 94, 260, 22, T_ROAD, false);
        this.markRect(80, PLAYFIELD_HEIGHT - 116, 260, 22, T_ROAD, false);

        const blueLandGoals = [];
        for (let c = 8; c <= GRID_W - 9; c++) {
            blueLandGoals.push([c, 9], [c, 10]);
        }
        this.computeDijkstra(this.flowBlueLand, blueLandGoals, false);

        const redLandGoals = [];
        const by = Math.floor((PLAYFIELD_HEIGHT - 95) / NAV_CELL);
        for (let c = 8; c <= GRID_W - 9; c++) {
            redLandGoals.push([c, by], [c, by - 1]);
        }
        this.computeDijkstra(this.flowRedLand, redLandGoals, false);

        const blueNavalGoals = [];
        const redNavalGoals = [];
        let minWaterRow = GRID_H, maxWaterRow = -1;
        for (let r = 0; r < GRID_H; r++) {
            for (let c = 0; c < GRID_W; c++) {
                const t = this.grid[this.idx(c, r)];
                if (t === T_WATER || t === T_BRIDGE) {
                    if (r < minWaterRow) minWaterRow = r;
                    if (r > maxWaterRow) maxWaterRow = r;
                }
            }
        }
        if (maxWaterRow >= minWaterRow) {
            for (let r = minWaterRow; r <= Math.min(GRID_H - 1, minWaterRow + 3); r++) {
                for (let c = 0; c < GRID_W; c++) {
                    if (this.grid[this.idx(c, r)] === T_WATER) blueNavalGoals.push([c, r]);
                }
            }
            for (let r = Math.max(0, maxWaterRow - 3); r <= maxWaterRow; r++) {
                for (let c = 0; c < GRID_W; c++) {
                    if (this.grid[this.idx(c, r)] === T_WATER) redNavalGoals.push([c, r]);
                }
            }
        }
        this.computeDijkstra(this.flowBlueNaval, blueNavalGoals, true);
        this.computeDijkstra(this.flowRedNaval, redNavalGoals, true);
    }

    computeDijkstra(distArr, goals, isNaval) {
        distArr.fill(1e9);
        const queue = [];

        for (const [gx, gy] of goals) {
            if (!this.inBounds(gx, gy)) continue;
            const i = this.idx(gx, gy);
            distArr[i] = 0;
            queue.push(i);
        }

        const dirs = [
            [-1, 0, 1.0], [1, 0, 1.0], [0, -1, 1.0], [0, 1, 1.0],
            [-1, -1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [1, 1, 1.414]
        ];

        const isNearBlocked = (cx, cy) => {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = cx + dx, ny = cy + dy;
                    if (!this.inBounds(nx, ny)) continue;
                    const nt = this.grid[this.idx(nx, ny)];
                    if (isNaval) {
                        if (nt !== T_WATER && nt !== T_BRIDGE) return true;
                    } else {
                        if (nt === T_OBSTACLE || nt === T_WATER) return true;
                    }
                }
            }
            return false;
        };

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            const cx = curr % GRID_W;
            const cy = (curr / GRID_W) | 0;
            const baseDist = distArr[curr];

            for (const [dx, dy, stepLen] of dirs) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (!this.inBounds(nx, ny)) continue;

                if (dx !== 0 && dy !== 0) {
                    const t1 = this.grid[this.idx(cx + dx, cy)];
                    const t2 = this.grid[this.idx(cx, cy + dy)];
                    if (isNaval) {
                        if ((t1 !== T_WATER && t1 !== T_BRIDGE) || (t2 !== T_WATER && t2 !== T_BRIDGE)) continue;
                    } else {
                        if (t1 === T_OBSTACLE || t1 === T_WATER || t2 === T_OBSTACLE || t2 === T_WATER) continue;
                    }
                }

                const nIdx = this.idx(nx, ny);
                const cellType = this.grid[nIdx];
                let terrainCost = 1.0;

                if (isNaval) {
                    if (cellType === T_WATER) terrainCost = 1.0;
                    else if (cellType === T_BRIDGE) terrainCost = 1.15;
                    else continue;
                } else {
                    if (cellType === T_OBSTACLE || cellType === T_WATER) continue;
                    if (cellType === T_BRIDGE) terrainCost = 0.72;
                    else if (cellType === T_ROAD) terrainCost = 0.82;
                    else terrainCost = 1.38;
                }

                if (cellType !== T_BRIDGE && isNearBlocked(nx, ny)) {
                    terrainCost += 0.42;
                }

                const newDist = baseDist + stepLen * terrainCost;
                if (newDist < distArr[nIdx]) {
                    distArr[nIdx] = newDist;
                    queue.push(nIdx);
                }
            }
        }
    }

    getFlowDirection(x, y, team, isNaval) {
        const distArr = isNaval
            ? (team === 'blue' ? this.flowBlueNaval : this.flowRedNaval)
            : (team === 'blue' ? this.flowBlueLand : this.flowRedLand);

        const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(x / NAV_CELL)));
        const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(y / NAV_CELL)));

        let bestDx = 0;
        let bestDy = team === 'blue' ? -1 : 1;
        let bestVal = distArr[this.idx(gx, gy)];

        if (bestVal >= 1e8) {
            let minD = Infinity;
            for (let r = -4; r <= 4; r++) {
                for (let c = -4; c <= 4; c++) {
                    const nx = gx + c, ny = gy + r;
                    if (!this.inBounds(nx, ny)) continue;
                    const v = distArr[this.idx(nx, ny)];
                    if (v < 1e8) {
                        const d = Math.hypot(c, r) + v * 0.05;
                        if (d < minD) {
                            minD = d;
                            bestDx = c;
                            bestDy = r;
                        }
                    }
                }
            }
            const l = Math.hypot(bestDx, bestDy) || 1;
            return { dirX: bestDx / l, dirY: bestDy / l };
        }

        let gradX = 0;
        let gradY = 0;
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = gx + dx;
                const ny = gy + dy;
                if (!this.inBounds(nx, ny)) continue;
                const nVal = distArr[this.idx(nx, ny)];
                if (nVal >= 1e8) continue;

                const diff = bestVal - nVal;
                if (diff > 0) {
                    const w = diff / Math.hypot(dx, dy);
                    gradX += (dx / Math.hypot(dx, dy)) * w;
                    gradY += (dy / Math.hypot(dx, dy)) * w;
                }
            }
        }

        const len = Math.hypot(gradX, gradY);
        if (len > 0.001) {
            return { dirX: gradX / len, dirY: gradY / len };
        }
        return { dirX: 0, dirY: team === 'blue' ? -1 : 1 };
    }

    resolveHardCollisions(u) {
        if (u.isAir) {
            u.x = Math.max(26, Math.min(LOGICAL_WIDTH - 26, u.x));
            return;
        }

        const effR = Math.max(8, u.radius * 0.68);

        for (let iter = 0; iter < 2; iter++) {
            for (const obs of this.obstacles) {
                if (obs.type === 'circle') {
                    const dx = u.x - obs.x;
                    const dy = u.y - obs.y;
                    const dist = Math.hypot(dx, dy);
                    const minDist = obs.r + effR;
                    if (dist < minDist) {
                        const nx = dist > 0.001 ? dx / dist : (u.x < LOGICAL_WIDTH / 2 ? 1 : -1);
                        const ny = dist > 0.001 ? dy / dist : (u.team === 'blue' ? 1 : -1);
                        u.x = obs.x + nx * minDist;
                        u.y = obs.y + ny * minDist;
                    }
                } else if (obs.type === 'box') {
                    const closestX = Math.max(obs.x, Math.min(u.x, obs.x + obs.w));
                    const closestY = Math.max(obs.y, Math.min(u.y, obs.y + obs.h));
                    const dx = u.x - closestX;
                    const dy = u.y - closestY;
                    const dist = Math.hypot(dx, dy);

                    if (dist < effR) {
                        if (dist > 0.001) {
                            u.x = closestX + (dx / dist) * effR;
                            u.y = closestY + (dy / dist) * effR;
                        } else {
                            const dLeft = Math.abs(u.x - obs.x);
                            const dRight = Math.abs(obs.x + obs.w - u.x);
                            const dTop = Math.abs(u.y - obs.y);
                            const dBottom = Math.abs(obs.y + obs.h - u.y);
                            const minSide = Math.min(dLeft, dRight, dTop, dBottom);
                            if (minSide === dLeft) u.x = obs.x - effR;
                            else if (minSide === dRight) u.x = obs.x + obs.w + effR;
                            else if (minSide === dTop) u.y = obs.y - effR;
                            else u.y = obs.y + obs.h + effR;
                        }
                    }
                }
            }
        }

        if (!u.isNaval) {
            if (this.isPointInWaterRaw(u.x, u.y)) {
                const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(u.x / NAV_CELL)));
                const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(u.y / NAV_CELL)));
                let bestX = u.x, bestY = u.y, minD = Infinity;

                for (let r = -5; r <= 5; r++) {
                    for (let c = -5; c <= 5; c++) {
                        const nx = gx + c, ny = gy + r;
                        if (!this.inBounds(nx, ny)) continue;
                        const ct = this.grid[this.idx(nx, ny)];
                        if (ct === T_BRIDGE || ct === T_ROAD || ct === T_OPEN) {
                            const px = (nx + 0.5) * NAV_CELL;
                            const py = (ny + 0.5) * NAV_CELL;
                            const d = Math.hypot(px - u.x, py - u.y) - (ct === T_BRIDGE ? 8 : 0);
                            if (d < minD) {
                                minD = d;
                                bestX = px;
                                bestY = py;
                            }
                        }
                    }
                }
                u.x = bestX;
                u.y = bestY;
            }
        } else {
            const cell = this.getCellAtPixel(u.x, u.y);
            if (cell !== T_WATER && cell !== T_BRIDGE) {
                const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(u.x / NAV_CELL)));
                const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(u.y / NAV_CELL)));
                let bestX = u.x, bestY = u.y, minD = Infinity;

                for (let r = -6; r <= 6; r++) {
                    for (let c = -6; c <= 6; c++) {
                        const nx = gx + c, ny = gy + r;
                        if (!this.inBounds(nx, ny)) continue;
                        const ct = this.grid[this.idx(nx, ny)];
                        if (ct === T_WATER) {
                            const px = (nx + 0.5) * NAV_CELL;
                            const py = (ny + 0.5) * NAV_CELL;
                            const d = Math.hypot(px - u.x, py - u.y);
                            if (d < minD) {
                                minD = d;
                                bestX = px;
                                bestY = py;
                            }
                        }
                    }
                }
                u.x = bestX;
                u.y = bestY;
            }
        }

        u.x = Math.max(24, Math.min(LOGICAL_WIDTH - 24, u.x));
        u.y = Math.max(30, Math.min(PLAYFIELD_HEIGHT - 24, u.y));
    }

    findValidSpawnPoint(team, spec, prefX, prefY) {
        if (spec.isAir) return { x: prefX, y: prefY };

        if (spec.isNaval) {
            let bestX = prefX, bestY = prefY, bestScore = Infinity;
            const targetY = team === 'blue' ? PLAYFIELD_HEIGHT - 120 : 120;
            for (let r = 4; r < GRID_H - 4; r++) {
                for (let c = 2; c < GRID_W - 2; c++) {
                    if (this.grid[this.idx(c, r)] === T_WATER) {
                        const px = (c + 0.5) * NAV_CELL;
                        const py = (r + 0.5) * NAV_CELL;
                        const score = Math.abs(py - targetY) * 1.5 + Math.abs(px - prefX) * 0.35 + (Math.random() * 14);
                        if (score < bestScore) {
                            bestScore = score;
                            bestX = px;
                            bestY = py;
                        }
                    }
                }
            }
            return { x: bestX, y: bestY };
        }

        const gx = Math.max(2, Math.min(GRID_W - 3, Math.floor(prefX / NAV_CELL)));
        const gy = Math.max(3, Math.min(GRID_H - 4, Math.floor(prefY / NAV_CELL)));
        const distArr = team === 'blue' ? this.flowBlueLand : this.flowRedLand;

        let bestX = prefX, bestY = prefY, minScore = Infinity;
        for (let r = -4; r <= 4; r++) {
            for (let c = -14; c <= 14; c++) {
                const nx = gx + c, ny = gy + r;
                if (!this.inBounds(nx, ny)) continue;
                const i = this.idx(nx, ny);
                const ct = this.grid[i];
                if ((ct === T_ROAD || ct === T_OPEN || ct === T_BRIDGE) && distArr[i] < 1e8) {
                    const px = (nx + 0.5) * NAV_CELL;
                    const py = (ny + 0.5) * NAV_CELL;
                    const roadBonus = ct === T_ROAD ? -12 : 0;
                    const score = Math.hypot(px - prefX, (py - prefY) * 2.0) + roadBonus;
                    if (score < minScore) {
                        minScore = score;
                        bestX = px;
                        bestY = py;
                    }
                }
            }
        }
        return { x: bestX, y: bestY };
    }
}

const nav = new NavSystem();

// ============================================================================
// BỘ VẼ CHI TIẾT TỪNG BẢN ĐỒ (MAP 1 -> MAP 15) KÈM ĐĂNG KÝ VẬT CẢN & CẦU ĐƯỜNG
// ============================================================================
function renderMap1To15(targetCtx, targetW, targetH, levelNum, includeMiniBases = false) {
    const W = LOGICAL_WIDTH;
    const H = PLAYFIELD_HEIGHT;
    const registerNav = !includeMiniBases && targetW === LOGICAL_WIDTH && targetH === PLAYFIELD_HEIGHT;

    if (registerNav) {
        nav.reset();
    }

    targetCtx.save();
    targetCtx.scale(targetW / W, targetH / H);
    targetCtx.imageSmoothingEnabled = false;

    const fillGrassBg = (shade = '#7bc64d') => {
        targetCtx.fillStyle = shade;
        targetCtx.fillRect(0, 0, W, H);
        if (atlas.ready) {
            const TILE = 35;
            for (let r = 0; r < Math.ceil(H / TILE); r++) {
                for (let c = 0; c < Math.ceil(W / TILE); c++) {
                    const hash = (r * 31 + c * 17 + levelNum * 7) % 19;
                    const gCol = hash === 0 ? 1 : (hash === 3 ? 2 : 0);
                    const t = atlas.get(gCol, 0);
                    if (t) targetCtx.drawImage(t, c * TILE, r * TILE, TILE, TILE);
                }
            }
        }
        for (let i = 0; i < 28; i++) {
            const gx = ((i * 73 + levelNum * 29) % (W - 30)) + 15;
            const gy = ((i * 113 + levelNum * 43) % (H - 40)) + 20;
            targetCtx.fillStyle = i % 4 === 0 ? '#fde047' : '#5ea332';
            targetCtx.fillRect(gx, gy, 4, 4);
        }
    };

    const drawWaterBox = (x, y, w, h, rounded = 0) => {
        if (registerNav) {
            nav.waterBoxes.push({ x, y, w, h });
            nav.markRect(x, y, w, h, T_WATER, true);
        }
        targetCtx.save();
        targetCtx.fillStyle = '#d9e37c';
        targetCtx.beginPath();
        targetCtx.roundRect(x - 5, y - 5, w + 10, h + 10, rounded + 4);
        targetCtx.fill();

        targetCtx.fillStyle = '#47a8f5';
        targetCtx.beginPath();
        targetCtx.roundRect(x, y, w, h, rounded);
        targetCtx.fill();

        targetCtx.fillStyle = 'rgba(224, 242, 254, 0.75)';
        for (let wy = y + 14; wy < y + h - 10; wy += 24) {
            for (let wx = x + 16; wx < x + w - 22; wx += 42) {
                const offset = ((wy / 24) | 0) % 2 === 0 ? 0 : 18;
                if (wx + offset < x + w - 16) {
                    targetCtx.fillRect(wx + offset, wy, 14, 3);
                }
            }
        }
        targetCtx.restore();
    };

    const drawDirtPolyline = (pts, width = 34) => {
        if (registerNav) {
            nav.markPolyline(pts, width + 4, T_ROAD);
        }
        targetCtx.save();
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';

        targetCtx.strokeStyle = '#c29b53';
        targetCtx.lineWidth = width + 6;
        targetCtx.beginPath();
        pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
        targetCtx.stroke();

        targetCtx.strokeStyle = '#ebd086';
        targetCtx.lineWidth = width;
        targetCtx.beginPath();
        pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
        targetCtx.stroke();
        targetCtx.restore();
    };

    const drawAsphaltPolyline = (pts, width = 44, dashed = true) => {
        if (registerNav) {
            nav.markPolyline(pts, width + 4, T_ROAD);
        }
        targetCtx.save();
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';

        targetCtx.strokeStyle = '#1e293b';
        targetCtx.lineWidth = width + 8;
        targetCtx.beginPath();
        pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
        targetCtx.stroke();

        targetCtx.strokeStyle = '#cbd5e1';
        targetCtx.lineWidth = width + 4;
        targetCtx.beginPath();
        pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
        targetCtx.stroke();

        targetCtx.strokeStyle = '#475569';
        targetCtx.lineWidth = width - 4;
        targetCtx.beginPath();
        pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
        targetCtx.stroke();

        if (dashed) {
            targetCtx.strokeStyle = '#f1f5f9';
            targetCtx.lineWidth = 2.5;
            targetCtx.setLineDash([10, 10]);
            targetCtx.beginPath();
            pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
            targetCtx.stroke();
            targetCtx.setLineDash([]);
        }
        targetCtx.restore();
    };

    const drawAsphaltCircle = (cx, cy, r, width = 44) => {
        if (registerNav) {
            nav.markRing(cx, cy, r, width + 4, T_ROAD);
        }
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
        targetCtx.strokeStyle = '#1e293b';
        targetCtx.lineWidth = width + 8;
        targetCtx.stroke();

        targetCtx.strokeStyle = '#cbd5e1';
        targetCtx.lineWidth = width + 4;
        targetCtx.stroke();

        targetCtx.strokeStyle = '#475569';
        targetCtx.lineWidth = width - 4;
        targetCtx.stroke();

        targetCtx.strokeStyle = '#f1f5f9';
        targetCtx.lineWidth = 2.5;
        targetCtx.setLineDash([10, 10]);
        targetCtx.stroke();
        targetCtx.setLineDash([]);
        targetCtx.restore();
    };

    const drawPine = (cx, cy, scale = 1) => {
        if (registerNav && nav.isRoadOrBridgeOrSpawn(cx, cy, 18)) {
            return;
        }
        if (registerNav) {
            nav.addCircleObstacle(cx, cy, 9.5 * scale, 'tree');
        }
        const s = 30 * scale;
        if (atlas.ready && atlas.draw(targetCtx, 4, 6, cx, cy, s, s)) return;
        targetCtx.save();
        targetCtx.fillStyle = 'rgba(0,0,0,0.22)';
        targetCtx.beginPath();
        targetCtx.ellipse(cx, cy + 10 * scale, 11 * scale, 5 * scale, 0, 0, Math.PI * 2);
        targetCtx.fill();

        targetCtx.fillStyle = '#166534';
        targetCtx.beginPath();
        targetCtx.arc(cx, cy + 2 * scale, 12 * scale, 0, Math.PI * 2);
        targetCtx.fill();

        targetCtx.fillStyle = '#22c55e';
        targetCtx.beginPath();
        targetCtx.arc(cx, cy - 4 * scale, 9 * scale, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
    };

    const drawTreeCluster = (x0, y0, x1, y1, step = 28) => {
        for (let y = y0; y <= y1; y += step) {
            for (let x = x0; x <= x1; x += step) {
                const jx = ((x * 13 + y * 7) % 10) - 5;
                const jy = ((x * 5 + y * 19) % 10) - 5;
                drawPine(x + jx, y + jy, 1.05);
            }
        }
    };

    const drawRockMountain = (cx, cy, r = 28) => {
        if (registerNav && nav.isRoadOrBridgeOrSpawn(cx, cy, r * 0.65)) {
            return;
        }
        if (registerNav) {
            nav.addCircleObstacle(cx, cy, r * 0.68, 'rock');
        }
        targetCtx.save();
        targetCtx.translate(cx, cy);
        targetCtx.fillStyle = '#334155';
        targetCtx.beginPath();
        targetCtx.moveTo(-r, r * 0.65);
        targetCtx.lineTo(-r * 0.65, -r * 0.45);
        targetCtx.lineTo(0, -r * 0.95);
        targetCtx.lineTo(r * 0.7, -r * 0.35);
        targetCtx.lineTo(r, r * 0.65);
        targetCtx.closePath();
        targetCtx.fill();

        targetCtx.fillStyle = '#94a3b8';
        targetCtx.beginPath();
        targetCtx.moveTo(-r * 0.85, r * 0.55);
        targetCtx.lineTo(-r * 0.55, -r * 0.4);
        targetCtx.lineTo(0, -r * 0.9);
        targetCtx.lineTo(0, r * 0.55);
        targetCtx.closePath();
        targetCtx.fill();

        targetCtx.fillStyle = '#64748b';
        targetCtx.beginPath();
        targetCtx.moveTo(0, -r * 0.9);
        targetCtx.lineTo(r * 0.65, -r * 0.35);
        targetCtx.lineTo(r * 0.85, r * 0.55);
        targetCtx.lineTo(0, r * 0.55);
        targetCtx.closePath();
        targetCtx.fill();

        targetCtx.strokeStyle = '#1e293b';
        targetCtx.lineWidth = 2;
        targetCtx.strokeRect(-r * 0.1, -r * 0.1, 1, 1);
        targetCtx.restore();
    };

    const drawWoodBridge = (cx, cy, w, h, isVertical = true) => {
        if (registerNav) {
            nav.addBridge(cx, cy, w, h, isVertical);
        }
        targetCtx.save();
        targetCtx.translate(cx, cy);
        if (!isVertical) targetCtx.rotate(Math.PI / 2);

        targetCtx.fillStyle = '#78350f';
        targetCtx.fillRect(-w / 2 - 4, -h / 2, w + 8, h);

        targetCtx.fillStyle = '#b45309';
        targetCtx.fillRect(-w / 2, -h / 2, w, h);

        targetCtx.fillStyle = '#d97706';
        for (let py = -h / 2 + 4; py < h / 2 - 2; py += 8) {
            targetCtx.fillRect(-w / 2 + 2, py, w - 4, 5);
        }

        targetCtx.fillStyle = '#92400e';
        targetCtx.fillRect(-w / 2 - 4, -h / 2, 5, h);
        targetCtx.fillRect(w / 2 - 1, -h / 2, 5, h);
        targetCtx.restore();
    };

    const drawStoneBridge = (cx, cy, w, h) => {
        if (registerNav) {
            nav.addBridge(cx, cy, w, h, true);
        }
        targetCtx.save();
        targetCtx.fillStyle = '#334155';
        targetCtx.fillRect(cx - w / 2 - 6, cy - h / 2, w + 12, h);
        targetCtx.fillStyle = '#94a3b8';
        targetCtx.fillRect(cx - w / 2, cy - h / 2, w, h);
        for (let y = cy - h / 2; y < cy + h / 2; y += 18) {
            targetCtx.fillStyle = '#cbd5e1';
            targetCtx.fillRect(cx - w / 2 - 5, y + 2, 6, 12);
            targetCtx.fillRect(cx + w / 2 - 1, y + 2, 6, 12);
        }
        targetCtx.restore();
    };

    const drawStoneWallSegment = (x, y, w, h) => {
        if (registerNav) {
            nav.addBoxObstacle(x, y, w, h, 'wall');
        }
        targetCtx.save();
        targetCtx.fillStyle = '#1e293b';
        targetCtx.fillRect(x - 2, y - 2, w + 4, h + 4);
        targetCtx.fillStyle = '#64748b';
        targetCtx.fillRect(x, y, w, h);
        targetCtx.fillStyle = '#94a3b8';
        for (let bx = x + 4; bx < x + w - 6; bx += 14) {
            targetCtx.fillRect(bx, y + 2, 10, Math.min(8, h - 4));
        }
        targetCtx.restore();
    };

    const drawStoneTower = (cx, cy, size = 28) => {
        if (registerNav) {
            nav.addBoxObstacle(cx - size / 2, cy - size / 2, size, size, 'pillar');
        }
        targetCtx.save();
        targetCtx.fillStyle = '#1e293b';
        targetCtx.fillRect(cx - size / 2 - 2, cy - size / 2 - 2, size + 4, size + 4);
        targetCtx.fillStyle = '#94a3b8';
        targetCtx.fillRect(cx - size / 2, cy - size / 2, size, size);
        targetCtx.fillStyle = '#475569';
        targetCtx.fillRect(cx - size / 4, cy - size / 4, size / 2, size / 2);
        targetCtx.restore();
    };

    const drawBuildingBlock = (x, y, w, h, mainColor, roofColor) => {
        if (registerNav) {
            nav.addBoxObstacle(x, y, w, h, 'building');
        }
        targetCtx.save();
        targetCtx.fillStyle = '#0f172a';
        targetCtx.fillRect(x - 2, y - 2, w + 4, h + 4);
        targetCtx.fillStyle = mainColor;
        targetCtx.fillRect(x, y, w, h);
        targetCtx.fillStyle = roofColor;
        targetCtx.fillRect(x + 3, y + 3, w - 6, h * 0.42);
        targetCtx.fillStyle = '#fef08a';
        for (let wy = y + Math.floor(h * 0.52); wy < y + h - 6; wy += 9) {
            for (let wx = x + 5; wx < x + w - 6; wx += 9) {
                targetCtx.fillRect(wx, wy, 5, 5);
            }
        }
        targetCtx.restore();
    };

    const drawHazardStripes = (x, y, w, h, isPillar = false) => {
        if (registerNav && isPillar) {
            nav.addBoxObstacle(x, y, w, h, 'pillar');
        }
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.rect(x, y, w, h);
        targetCtx.clip();
        targetCtx.fillStyle = '#eab308';
        targetCtx.fillRect(x, y, w, h);
        targetCtx.strokeStyle = '#1e293b';
        targetCtx.lineWidth = 6;
        for (let i = -h; i < w + h; i += 14) {
            targetCtx.beginPath();
            targetCtx.moveTo(x + i, y);
            targetCtx.lineTo(x + i - h, y + h);
            targetCtx.stroke();
        }
        targetCtx.restore();
    };

    switch (levelNum) {
        case 1: {
            fillGrassBg();
            drawDirtPolyline([[115, 70], [115, 165], [305, 165], [305, 70]], 26);
            drawDirtPolyline([[115, 645], [115, 550], [305, 550], [305, 645]], 26);
            drawDirtPolyline([[210, 165], [210, 550]], 30);

            drawWaterBox(-10, 290, W + 20, 130, 0);
            drawStoneBridge(210, 355, 54, 146);

            [45, 95, 145, 275, 325, 375].forEach(tx => {
                drawPine(tx, 250, 1.0);
                drawPine(tx, 460, 1.0);
            });
            drawRockMountain(35, 55, 28);
            drawRockMountain(65, 115, 24);
            drawRockMountain(385, 55, 28);
            drawRockMountain(365, 130, 30);
            drawRockMountain(35, 640, 28);
            drawRockMountain(385, 630, 30);
            drawRockMountain(365, 560, 25);
            break;
        }

        case 2: {
            fillGrassBg();
            drawAsphaltPolyline([
                [265, 60],
                [265, 165],
                [125, 165],
                [125, 350],
                [295, 350],
                [295, 535],
                [135, 535],
                [135, 655]
            ], 44, true);

            drawTreeCluster(15, 120, 82, 620, 30);
            drawTreeCluster(340, 90, 405, 610, 30);
            drawTreeCluster(175, 225, 330, 292, 28);
            drawTreeCluster(95, 412, 240, 478, 28);

            drawRockMountain(35, 45, 28);
            drawRockMountain(80, 65, 26);
            drawRockMountain(45, 110, 26);
            drawRockMountain(380, 380, 28);
            drawRockMountain(385, 560, 28);
            drawRockMountain(345, 625, 28);
            drawRockMountain(385, 650, 28);
            break;
        }

        case 3: {
            targetCtx.fillStyle = '#64748b';
            targetCtx.fillRect(0, 0, W, H);

            [95, 210, 325].forEach(lx => drawAsphaltPolyline([[lx, 0], [lx, H]], 36, true));
            [155, 355, 555].forEach(ly => drawAsphaltPolyline([[0, ly], [W, ly]], 36, true));

            drawBuildingBlock(12, 20, 56, 105, '#64748b', '#94a3b8');
            drawBuildingBlock(352, 20, 56, 105, '#64748b', '#94a3b8');
            drawBuildingBlock(124, 185, 58, 65, '#22c55e', '#86efac');
            drawBuildingBlock(124, 260, 58, 65, '#ef4444', '#fca5a5');
            drawBuildingBlock(238, 185, 58, 140, '#3b82f6', '#93c5fd');
            drawBuildingBlock(12, 195, 56, 120, '#475569', '#94a3b8');
            drawBuildingBlock(352, 195, 56, 120, '#3b82f6', '#93c5fd');
            drawBuildingBlock(124, 385, 58, 135, '#0ea5e9', '#7dd3fc');
            drawBuildingBlock(238, 385, 58, 135, '#f97316', '#fdba74');
            drawBuildingBlock(12, 400, 56, 115, '#ef4444', '#fca5a5');
            drawBuildingBlock(352, 400, 56, 115, '#eab308', '#fde047');
            drawBuildingBlock(12, 585, 56, 105, '#0284c7', '#7dd3fc');
            drawBuildingBlock(124, 585, 58, 42, '#64748b', '#cbd5e1');
            drawBuildingBlock(238, 585, 58, 42, '#ef4444', '#fca5a5');
            drawBuildingBlock(352, 585, 56, 105, '#475569', '#94a3b8');
            break;
        }

        case 4: {
            fillGrassBg();

            drawWaterBox(28, 140, 125, 435, 22);
            drawWaterBox(267, 140, 125, 435, 22);
            drawWaterBox(28, 160, 364, 115, 18);
            drawWaterBox(28, 438, 364, 115, 18);

            if (registerNav) {
                nav.markRect(126, 272, 168, 170, T_OPEN, true);
            }
            targetCtx.fillStyle = '#d9e37c';
            targetCtx.beginPath();
            targetCtx.roundRect(124, 270, 172, 174, 20);
            targetCtx.fill();
            targetCtx.fillStyle = '#7bc64d';
            targetCtx.beginPath();
            targetCtx.roundRect(130, 276, 160, 162, 16);
            targetCtx.fill();

            drawDirtPolyline([[210, 278], [152, 305], [152, 410], [210, 436]], 20);
            drawDirtPolyline([[210, 278], [268, 305], [268, 410], [210, 436]], 20);

            drawWoodBridge(210, 206, 44, 148, true);
            drawWoodBridge(210, 506, 44, 148, true);

            drawStoneWallSegment(180, 326, 60, 62);
            drawStoneTower(180, 326, 18);
            drawStoneTower(240, 326, 18);
            drawStoneTower(180, 388, 18);
            drawStoneTower(240, 388, 18);
            if (atlas.ready) {
                atlas.draw(targetCtx, 9, 3, 210, 357, 38, 38);
            }

            [210, 340, 460].forEach(ty => {
                drawPine(14, ty, 0.95);
                drawPine(406, ty, 0.95);
            });
            break;
        }

        case 5: {
            fillGrassBg();

            const drawMazeRoad = (pts) => {
                if (registerNav) {
                    nav.markPolyline(pts, 34, T_ROAD);
                }
                targetCtx.save();
                targetCtx.lineCap = 'round';
                targetCtx.lineJoin = 'round';
                targetCtx.strokeStyle = '#334155';
                targetCtx.lineWidth = 34;
                targetCtx.beginPath();
                pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
                targetCtx.stroke();

                targetCtx.strokeStyle = '#64748b';
                targetCtx.lineWidth = 28;
                targetCtx.beginPath();
                pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
                targetCtx.stroke();
                targetCtx.restore();
            };

            drawMazeRoad([[295, 80], [295, 165], [205, 165], [205, 280], [105, 280], [105, 155], [150, 155], [150, 220]]);
            drawMazeRoad([[295, 165], [330, 165], [330, 275], [250, 275], [250, 370], [330, 370], [330, 465]]);
            drawMazeRoad([[205, 280], [205, 385], [105, 385], [105, 520], [225, 520], [225, 625]]);
            drawMazeRoad([[250, 370], [185, 445], [295, 445], [295, 585], [335, 585], [335, 510]]);

            drawTreeCluster(12, 20, 72, 680, 28);
            drawTreeCluster(355, 20, 408, 680, 28);
            drawTreeCluster(85, 130, 345, 595, 28);
            break;
        }

        case 6: {
            targetCtx.fillStyle = '#94a3b8';
            targetCtx.fillRect(0, 0, W, H);

            drawAsphaltPolyline([[0, 195], [320, 195], [320, 0]], 40, true);
            drawAsphaltPolyline([[320, 195], [320, 525]], 40, true);
            drawAsphaltPolyline([[0, 395], [W, 395]], 40, true);
            drawAsphaltPolyline([[200, 195], [200, 525]], 36, true);
            drawAsphaltPolyline([[95, 395], [95, H]], 40, true);
            drawAsphaltPolyline([[95, 525], [W, 525]], 38, true);

            drawHazardStripes(18, 230, 75, 125);
            drawHazardStripes(120, 115, 55, 32);
            drawHazardStripes(235, 115, 55, 32);
            drawHazardStripes(352, 235, 55, 45);
            drawHazardStripes(235, 330, 55, 35);
            drawHazardStripes(130, 560, 55, 32);
            drawHazardStripes(245, 560, 55, 32);

            const drawFactory = (fx, fy) => {
                drawBuildingBlock(fx - 26, fy - 20, 52, 42, '#475569', '#cbd5e1');
                targetCtx.fillStyle = '#334155';
                targetCtx.fillRect(fx + 10, fy - 38, 12, 22);
                targetCtx.fillStyle = '#e2e8f0';
                targetCtx.beginPath();
                targetCtx.arc(fx + 18, fy - 44, 7, 0, Math.PI * 2);
                targetCtx.fill();
            };
            drawFactory(145, 140);
            drawFactory(260, 140);
            drawFactory(145, 290);
            drawFactory(375, 200);
            drawFactory(50, 455);
            drawFactory(150, 455);
            drawFactory(265, 455);
            drawFactory(155, 575);
            drawFactory(270, 575);
            break;
        }

        case 7: {
            fillGrassBg();

            drawWaterBox(72, 165, 210, 145, 18);
            drawWaterBox(130, 415, 210, 145, 18);

            drawAsphaltPolyline([
                [325, 65],
                [325, 285],
                [285, 350],
                [125, 375],
                [72, 435],
                [72, 650]
            ], 42, true);

            for (let y = 35; y <= 665; y += 46) {
                if (y < 410) drawRockMountain(25, y, 28);
                if (y > 260) drawRockMountain(392, y, 28);
            }
            drawRockMountain(375, 190, 26);
            drawRockMountain(365, 240, 26);
            break;
        }

        case 8: {
            fillGrassBg();

            drawAsphaltPolyline([
                [295, 65],
                [295, 135],
                [210, 155],
                [210, 560],
                [145, 580],
                [145, 655]
            ], 40, true);

            for (let y = 35; y <= 675; y += 48) {
                for (let x = 25; x <= 145; x += 46) {
                    if (y > 520 && x > 90) continue;
                    drawRockMountain(x, y, 28);
                }
                for (let x = 275; x <= 395; x += 46) {
                    if (y < 180 && x < 335) continue;
                    drawRockMountain(x, y, 28);
                }
            }

            drawHazardStripes(166, 335, 20, 12, true);
            drawHazardStripes(234, 335, 20, 12, true);
            drawHazardStripes(166, 375, 20, 12, true);
            drawHazardStripes(234, 375, 20, 12, true);
            break;
        }

        case 9: {
            fillGrassBg();

            drawAsphaltPolyline([[95, 210], [95, 505], [155, 505]], 38, true);
            drawAsphaltPolyline([[325, 210], [325, 505], [265, 505]], 38, true);
            drawAsphaltPolyline([[0, 155], [95, 155], [95, 210], [155, 210]], 38, true);
            drawAsphaltPolyline([[W, 155], [325, 155], [325, 210], [265, 210]], 38, true);

            drawAsphaltCircle(210, 210, 52, 36);
            drawAsphaltCircle(210, 505, 52, 36);

            drawBuildingBlock(130, 290, 32, 32, '#ef4444', '#fca5a5');
            drawBuildingBlock(130, 340, 32, 32, '#3b82f6', '#93c5fd');
            drawBuildingBlock(130, 390, 32, 32, '#eab308', '#fde047');
            drawBuildingBlock(258, 290, 32, 32, '#22c55e', '#86efac');
            drawBuildingBlock(258, 340, 32, 32, '#ef4444', '#fca5a5');
            drawBuildingBlock(258, 390, 32, 32, '#3b82f6', '#93c5fd');

            drawBuildingBlock(12, 260, 34, 38, '#eab308', '#fde047');
            drawBuildingBlock(12, 320, 34, 38, '#22c55e', '#86efac');
            drawBuildingBlock(12, 380, 34, 38, '#ef4444', '#fca5a5');
            drawBuildingBlock(374, 260, 34, 38, '#22c55e', '#86efac');
            drawBuildingBlock(374, 320, 34, 38, '#eab308', '#fde047');
            drawBuildingBlock(374, 380, 34, 38, '#22c55e', '#86efac');

            drawPine(195, 355, 1.0);
            drawPine(228, 368, 1.0);
            drawPine(55, 580, 1.05);
            drawPine(355, 595, 1.05);
            break;
        }

        case 10: {
            fillGrassBg();

            targetCtx.fillStyle = '#fde68a';
            targetCtx.beginPath();
            targetCtx.moveTo(0, 0);
            targetCtx.lineTo(195, 0);
            targetCtx.bezierCurveTo(175, 180, 265, 350, 215, 530);
            targetCtx.lineTo(155, H);
            targetCtx.lineTo(0, H);
            targetCtx.closePath();
            targetCtx.fill();

            if (registerNav) {
                nav.waterBoxes.push({ x: 0, y: 105, w: 115, h: 505 });
                nav.markRect(0, 105, 115, 505, T_WATER, true);
            }

            targetCtx.fillStyle = '#38bdf8';
            targetCtx.beginPath();
            targetCtx.moveTo(0, 0);
            targetCtx.lineTo(115, 0);
            targetCtx.bezierCurveTo(95, 180, 145, 350, 118, 530);
            targetCtx.lineTo(65, H);
            targetCtx.lineTo(0, H);
            targetCtx.closePath();
            targetCtx.fill();

            targetCtx.strokeStyle = '#e0f2fe';
            targetCtx.lineWidth = 6;
            targetCtx.beginPath();
            targetCtx.moveTo(115, 0);
            targetCtx.bezierCurveTo(95, 180, 145, 350, 118, 530);
            targetCtx.lineTo(65, H);
            targetCtx.stroke();

            drawDirtPolyline([
                [305, 55],
                [325, 150],
                [275, 250],
                [315, 360],
                [275, 480],
                [305, 590],
                [295, 665]
            ], 26);

            for (let y = 45; y <= 650; y += 52) {
                drawRockMountain(388, y, 26);
                if (y % 104 === 45) drawRockMountain(356, y + 20, 22);
            }
            break;
        }

        case 11: {
            fillGrassBg();

            drawAsphaltPolyline([[210, 65], [210, 650]], 40, true);
            drawAsphaltPolyline([[25, 235], [395, 235]], 36, true);
            drawAsphaltPolyline([[25, 485], [395, 485]], 36, true);

            const drawMissilePad = (px, py, isRed) => {
                drawStoneWallSegment(px - 38, py - 38, 76, 76);
                drawBuildingBlock(px - 28, py - 24, 56, 48, '#64748b', '#cbd5e1');
                if (atlas.ready) {
                    atlas.draw(targetCtx, 14, isRed ? 3 : 2, px, py - 6, 40, 40);
                }
            };
            drawMissilePad(52, 150, false);
            drawMissilePad(368, 150, false);
            drawMissilePad(52, 565, true);
            drawMissilePad(368, 565, true);

            drawBuildingBlock(65, 285, 34, 34, '#f97316', '#fdba74');
            drawBuildingBlock(120, 285, 34, 34, '#eab308', '#fde047');
            drawBuildingBlock(120, 405, 34, 34, '#f97316', '#fdba74');
            drawBuildingBlock(266, 285, 34, 34, '#3b82f6', '#93c5fd');
            drawBuildingBlock(320, 285, 34, 34, '#22c55e', '#86efac');
            drawBuildingBlock(266, 405, 34, 34, '#3b82f6', '#93c5fd');
            break;
        }

        case 12: {
            fillGrassBg();

            drawAsphaltPolyline([
                [105, 195],
                [315, 195],
                [315, 520],
                [105, 520],
                [105, 195]
            ], 38, true);
            drawAsphaltPolyline([[210, 95], [210, 195]], 38, true);
            drawAsphaltPolyline([[210, 520], [210, 620]], 38, true);
            drawAsphaltPolyline([[0, 355], [105, 355]], 38, true);
            drawAsphaltPolyline([[315, 355], [W, 355]], 38, true);

            drawStoneWallSegment(42, 125, 85, 16);
            drawStoneWallSegment(293, 125, 85, 16);
            drawStoneWallSegment(42, 125, 16, 165);
            drawStoneWallSegment(362, 125, 16, 165);

            drawStoneWallSegment(42, 575, 85, 16);
            drawStoneWallSegment(293, 575, 85, 16);
            drawStoneWallSegment(42, 425, 16, 165);
            drawStoneWallSegment(362, 425, 16, 165);

            drawStoneWallSegment(154, 298, 112, 116);
            targetCtx.fillStyle = '#94a3b8';
            targetCtx.fillRect(166, 310, 88, 92);
            drawStoneTower(154, 298, 22);
            drawStoneTower(266, 298, 22);
            drawStoneTower(154, 414, 22);
            drawStoneTower(266, 414, 22);
            drawStoneTower(210, 356, 32);
            break;
        }

        case 13: {
            fillGrassBg();

            drawWaterBox(0, 135, W, 445, 0);

            const islands = [
                [40, 165, 95, 85], [162, 165, 96, 85], [285, 165, 95, 85],
                [40, 295, 95, 115], [162, 295, 96, 115], [285, 295, 95, 115],
                [40, 455, 95, 90], [162, 455, 96, 90], [285, 455, 95, 90]
            ];
            islands.forEach(([ix, iy, iw, ih]) => {
                if (registerNav) {
                    nav.markRect(ix, iy, iw, ih, T_OPEN, true);
                }
                targetCtx.fillStyle = '#d9e37c';
                targetCtx.beginPath();
                targetCtx.roundRect(ix - 4, iy - 4, iw + 8, ih + 8, 14);
                targetCtx.fill();
                targetCtx.fillStyle = '#7bc64d';
                targetCtx.beginPath();
                targetCtx.roundRect(ix, iy, iw, ih, 10);
                targetCtx.fill();
            });

            drawAsphaltPolyline([[88, 120], [332, 120]], 24, false);
            drawAsphaltPolyline([[88, 595], [332, 595]], 24, false);
            drawAsphaltPolyline([[88, 165], [88, 545]], 24, false);
            drawAsphaltPolyline([[210, 165], [210, 545]], 24, false);
            drawAsphaltPolyline([[332, 165], [332, 545]], 24, false);
            drawAsphaltPolyline([[88, 208], [332, 208]], 22, false);
            drawAsphaltPolyline([[88, 352], [332, 352]], 24, false);
            drawAsphaltPolyline([[88, 500], [332, 500]], 22, false);

            drawWoodBridge(88, 148, 30, 42, true);
            drawWoodBridge(210, 148, 30, 42, true);
            drawWoodBridge(332, 148, 30, 42, true);

            drawWoodBridge(88, 272, 30, 52, true);
            drawWoodBridge(210, 272, 30, 52, true);
            drawWoodBridge(332, 272, 30, 52, true);

            drawWoodBridge(148, 352, 30, 42, false);
            drawWoodBridge(272, 352, 30, 42, false);

            drawWoodBridge(88, 432, 30, 52, true);
            drawWoodBridge(210, 432, 30, 52, true);
            drawWoodBridge(332, 432, 30, 52, true);

            drawWoodBridge(88, 564, 30, 44, true);
            drawWoodBridge(210, 564, 30, 44, true);
            drawWoodBridge(332, 564, 30, 44, true);
            break;
        }

        case 14: {
            fillGrassBg();

            drawAsphaltPolyline([[210, 105], [210, 215]], 40, true);
            drawAsphaltPolyline([[210, 500], [210, 610]], 40, true);
            drawAsphaltCircle(210, 358, 142, 42);

            drawWaterBox(158, 310, 104, 96, 16);

            drawTreeCluster(12, 25, 95, 210, 28);
            drawTreeCluster(325, 25, 408, 210, 28);
            drawTreeCluster(12, 500, 95, 680, 28);
            drawTreeCluster(325, 500, 408, 680, 28);

            for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) {
                const tx = 210 + Math.cos(a) * 84;
                const ty = 358 + Math.sin(a) * 78;
                drawPine(tx, ty, 0.95);
            }
            break;
        }

        case 15: {
            fillGrassBg();

            drawAsphaltPolyline([[102, 0], [102, 215]], 38, true);
            drawAsphaltPolyline([[318, 0], [318, 215]], 38, true);
            drawAsphaltPolyline([[102, 500], [102, H]], 38, true);
            drawAsphaltPolyline([[318, 500], [318, H]], 38, true);

            drawDirtPolyline([[102, 215], [102, 500]], 26);
            drawDirtPolyline([[318, 215], [318, 500]], 26);

            drawStoneWallSegment(0, 205, 68, 26);
            drawStoneWallSegment(136, 205, 148, 26);
            drawStoneWallSegment(352, 205, 68, 26);
            drawStoneTower(64, 218, 22);
            drawStoneTower(140, 218, 22);
            drawStoneTower(280, 218, 22);
            drawStoneTower(356, 218, 22);

            drawStoneWallSegment(0, 485, 68, 26);
            drawStoneWallSegment(136, 485, 148, 26);
            drawStoneWallSegment(352, 485, 68, 26);
            drawStoneTower(64, 498, 22);
            drawStoneTower(140, 498, 22);
            drawStoneTower(280, 498, 22);
            drawStoneTower(356, 498, 22);
            break;
        }
    }

    if (registerNav) {
        nav.buildFlowFields();
    }

    if (includeMiniBases) {
        const drawThreeMiniBases = (cy, isBlue) => {
            const cols = [-58, 0, 58];
            cols.forEach((dx) => {
                const bx = W / 2 + dx;
                targetCtx.fillStyle = '#0f172a';
                targetCtx.fillRect(bx - 22, cy - 22, 44, 44);
                targetCtx.fillStyle = isBlue ? '#0284c7' : (levelNum === 10 ? '#d97706' : '#dc2626');
                targetCtx.fillRect(bx - 19, cy - 19, 38, 38);
                targetCtx.fillStyle = isBlue ? '#7dd3fc' : (levelNum === 10 ? '#fde047' : '#fca5a5');
                targetCtx.fillRect(bx - 13, cy - 13, 26, 14);
            });
        };
        drawThreeMiniBases(42, false);
        drawThreeMiniBases(H - 42, true);
    }

    targetCtx.restore();
}

const canvas = document.getElementById('battleCanvas');
const ctx = canvas.getContext('2d');

const GAS_UPGRADE_LEVELS = [
    { level: 1, interval: 3.0, cost: 4, label: '➔ 2.0s' },
    { level: 2, interval: 2.0, cost: 6, label: '➔ 1.5s' },
    { level: 3, interval: 1.5, cost: 9, label: '➔ 1.1s' },
    { level: 4, interval: 1.1, cost: 13, label: '➔ 0.8s' },
    { level: 5, interval: 0.8, cost: 18, label: '➔ 0.55s' },
    { level: 6, interval: 0.55, cost: 0, label: 'MAX' }
];

// ============================================================================
// TRẠNG THÁI GAME TRONG TRẬN (WAVE SURVIVAL + EXP + ROGUELIKE DECK 5 Ô)
// ============================================================================
let game = {
    inMenu: true,
    paused: false,
    draftActive: false,
    gameOver: false,
    currentLevel: 1,
    currentDifficulty: 'easy',
    elapsedTime: 0,
    showRangeCircles: true,

    // Thanh xăng
    gasUpgradeIndex: 0,
    gasInterval: 3.0,
    gasTimer: 3.0,
    gasCount: 0,
    maxGas: 99,

    // Deck 5 ô quân trong trận & cấp độ nâng cấp từng quân
    battleDeck: [],
    unitLevels: {},
    buffs: {
        dmgMult: 1.0,
        hpMult: 1.0,
        fireRateMult: 1.0,
        rangeMult: 1.0
    },

    // Hệ thống EXP & Level trong trận
    currentLevelInBattle: 1,
    playerExp: 0,
    expToNextLevel: 8,
    pendingDraftCount: 0,

    // Hệ thống 10 Wave Sinh tồn
    currentWave: 1,
    maxWaves: MAX_WAVES,
    waveState: 'spawning', // 'spawning' | 'fighting' | 'intermission'
    waveTotalEnemies: 0,
    waveSpawnQueue: [],
    waveSpawnTimer: 0,
    waveIntermissionTimer: 0,
    waveIntermissionMax: 3.5,

    rallyX: null,

    blueBase: {
        team: 'blue',
        x: LOGICAL_WIDTH / 2,
        y: PLAYFIELD_HEIGHT - 56,
        width: 268,
        height: 64,
        hp: 100,
        maxHp: 100
    },
    redOutpost: {
        team: 'red',
        x: LOGICAL_WIDTH / 2,
        y: 64,
        width: 268,
        height: 64
    },

    units: [],
    bullets: [],
    planes: [],
    particles: [],
    floatingTexts: [],

    shakeTime: 0,
    shakeIntensity: 0,

    stats: {
        spawned: 0,
        kills: 0
    }
};

function calcExpRequired(lv) {
    return 8 + (lv - 1) * 6;
}

function buildStaticMapCanvas(levelNum = game.currentLevel) {
    const off = document.createElement('canvas');
    off.width = LOGICAL_WIDTH;
    off.height = PLAYFIELD_HEIGHT;
    const mCtx = off.getContext('2d');
    mCtx.imageSmoothingEnabled = false;

    renderMap1To15(mCtx, LOGICAL_WIDTH, PLAYFIELD_HEIGHT, levelNum, false);
    atlas.bakedMapCanvas = off;
}

function renderMapPreviewThumb(levelNum) {
    const thumbCanvas = document.getElementById('selected-map-preview');
    if (!thumbCanvas) return;
    const tCtx = thumbCanvas.getContext('2d');
    tCtx.imageSmoothingEnabled = false;
    tCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    renderMap1To15(tCtx, thumbCanvas.width, thumbCanvas.height, levelNum, true);
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = LOGICAL_WIDTH * dpr;
    canvas.height = LOGICAL_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============================================================================
// DOM ELEMENTS CHÍNH
// ============================================================================
const lobbyWrapperEl = document.getElementById('lobby-wrapper');
const draftModalEl = document.getElementById('draft-modal');
const draftCardsContainerEl = document.getElementById('draft-cards-container');
const draftBadgeTextEl = document.getElementById('draft-badge-text');
const draftTitleEl = document.getElementById('draft-title');
const draftSubtitleEl = document.getElementById('draft-subtitle');

const gasCountTextEl = document.getElementById('gas-count-text');
const speedIndicatorEl = document.getElementById('speed-indicator');
const currentLevelLabelEl = document.getElementById('current-level-label');
const gasRateLabelEl = document.getElementById('gas-rate-label');

const battleLvLabelEl = document.getElementById('battle-lv-label');
const battleExpLabelEl = document.getElementById('battle-exp-label');
const battleExpFillEl = document.getElementById('battle-exp-fill');

const btnUpgradeGasEl = document.getElementById('btnUpgradeGas');
const upgradeCostTextEl = document.getElementById('upgrade-cost-text');
const upgradeNextSpeedEl = document.getElementById('upgrade-next-speed');
const blockUpgradeEl = document.getElementById('blockUpgrade');
const upgradeLockCostEl = document.getElementById('upgrade-lock-cost');

const gasLoadEls = [
    document.getElementById('L1'),
    document.getElementById('L2'),
    document.getElementById('L3'),
    document.getElementById('L4'),
    document.getElementById('L5')
];

// ============================================================================
// HỆ THỐNG GIAO DIỆN LOBBY, TOP BAR, 3 TABS & MODALS META-GAME
// ============================================================================
function updateTopBarUI() {
    const nameEl = document.getElementById('player-name-display');
    if (nameEl) {
        nameEl.textContent = metaState.playerName || 'COMMANDER';
    }
    const gemsEl = document.getElementById('gems-count-display');
    if (gemsEl) {
        gemsEl.textContent = formatCurrency(metaState.gems);
    }
    const coinsEl = document.getElementById('coins-count-display');
    if (coinsEl) {
        coinsEl.textContent = formatCurrency(metaState.coins);
    }
    updateMissionNotificationDot();
}

function switchLobbyTab(tabName) {
    currentLobbyTab = tabName;
    sfx.play('gas');

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

    if (tabName === 'battle') {
        renderStageScreenUI();
    } else if (tabName === 'army') {
        renderArmyTabUI();
    }
    updateTopBarUI();
}

window.openLobbyScreen = function(tabName = 'battle') {
    game.inMenu = true;
    game.draftActive = false;
    game.paused = false;
    draftModalEl.classList.remove('active');
    document.getElementById('win-panel').classList.remove('active');
    document.getElementById('lose-panel').classList.remove('active');

    if (lobbyWrapperEl) {
        lobbyWrapperEl.classList.add('active');
    }
    switchLobbyTab(tabName);
};

window.openStageScreen = function(levelNum = getMaxUnlockedMapLevel()) {
    currentStageViewLevel = Math.max(1, Math.min(getMaxUnlockedMapLevel(), levelNum));
    currentSelectedDifficulty = getDefaultDifficultyForMap(currentStageViewLevel);
    window.openLobbyScreen('battle');
};

// Gắn sự kiện Bottom Navigation Bar (3 Tabs: SHOP - BATTLE - ARMY)
document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) switchLobbyTab(tab);
    });
});

// ============================================================================
// 1. POPUP ĐẶT TÊN NHÂN VẬT LẦN ĐẦU VÀO GAME
// ============================================================================
function checkAndPromptPlayerName(forceOpen = false) {
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

document.getElementById('btn-edit-name')?.addEventListener('click', () => {
    sfx.play('gas');
    checkAndPromptPlayerName(true);
});

document.getElementById('btn-confirm-name')?.addEventListener('click', () => {
    const input = document.getElementById('player-name-input');
    const errEl = document.getElementById('name-error-msg');
    if (!input) return;

    const val = input.value.trim();
    if (val.length < 1 || val.length > 14) {
        if (errEl) errEl.classList.remove('hidden');
        sfx.play('cannon');
        return;
    }

    metaState.playerName = val;
    saveProgress();
    updateTopBarUI();
    sfx.play('upgrade');
    document.getElementById('name-modal')?.classList.remove('active');
});

document.getElementById('player-name-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('btn-confirm-name')?.click();
    }
});

// ============================================================================
// 2. TAB "BATTLE": CHỌN MAP, ĐỘ KHÓ (EASY - NORMAL - DIFFICULT), DEMO MAP
// ============================================================================
function renderStageScreenUI() {
    const maxUnlocked = getMaxUnlockedMapLevel();
    currentStageViewLevel = Math.max(1, Math.min(maxUnlocked, currentStageViewLevel));
    const cfg = LEVELS[currentStageViewLevel - 1] || LEVELS[0];
    const mapProg = metaState.mapDifficultyProgress[cfg.level] || { easy: false, normal: false, difficult: false };

    if (!isDifficultyUnlocked(cfg.level, currentSelectedDifficulty)) {
        currentSelectedDifficulty = getDefaultDifficultyForMap(cfg.level);
    }

    const titleEl = document.getElementById('stage-map-title');
    if (titleEl) titleEl.textContent = `${cfg.level}. ${cfg.name.toUpperCase()}`;

    const progressTextEl = document.getElementById('stage-progress-text');
    if (progressTextEl) {
        progressTextEl.textContent = `ĐÃ MỞ KHÓA: MAP ${maxUnlocked} / ${LEVELS.length}`;
    }

    const prevBtn = document.getElementById('btn-prev-stage');
    if (prevBtn) prevBtn.disabled = currentStageViewLevel <= 1;

    const nextBtn = document.getElementById('btn-next-stage');
    if (nextBtn) nextBtn.disabled = currentStageViewLevel >= maxUnlocked;

    // Cập nhật 3 nút độ khó Easy - Normal - Difficult
    DIFFICULTY_ORDER.forEach(diffKey => {
        const btn = document.getElementById(`diff-btn-${diffKey}`);
        const statusEl = document.getElementById(`diff-status-${diffKey}`);
        const unlocked = isDifficultyUnlocked(cfg.level, diffKey);
        const cleared = !!mapProg[diffKey];

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

    // Banner thông tin hệ số quái & phần thưởng Vàng
    const diffCfg = DIFFICULTY_CONFIG[currentSelectedDifficulty] || DIFFICULTY_CONFIG.easy;
    const rewardCoins = diffCfg.calcReward(cfg.level);
    const diffBannerEl = document.getElementById('diff-info-banner');
    if (diffBannerEl) {
        diffBannerEl.innerHTML = `Quái: <b>${diffCfg.statMult}x HP & DMG</b> • Thưởng thắng: <b class="text-amber-300">🪙 ${formatCurrency(rewardCoins)} Coins</b>`;
    }

    const waterBadge = document.getElementById('select-map-water-badge');
    if (waterBadge) {
        if (cfg.hasWater) {
            waterBadge.className = 'map-water-pill has-water';
            waterBadge.textContent = '🌊 CÓ NƯỚC: CÓ THỦY QUÂN';
        } else {
            waterBadge.className = 'map-water-pill no-water';
            waterBadge.textContent = '⛰️ KHÔNG NƯỚC: LỤC & KHÔNG QUÂN';
        }
    }

    const clearedStampEl = document.getElementById('stage-cleared-stamp');
    if (clearedStampEl) {
        if (mapProg[currentSelectedDifficulty]) {
            clearedStampEl.classList.remove('hidden');
            clearedStampEl.textContent = `✓ ĐÃ THẮNG (${diffCfg.label})`;
        } else {
            clearedStampEl.classList.add('hidden');
        }
    }

    const descEl = document.getElementById('select-map-desc');
    if (descEl) descEl.textContent = cfg.desc;

    renderMapPreviewThumb(cfg.level);
    updateTopBarUI();
}

document.getElementById('btn-prev-stage')?.addEventListener('click', () => {
    if (currentStageViewLevel > 1) {
        currentStageViewLevel--;
        currentSelectedDifficulty = getDefaultDifficultyForMap(currentStageViewLevel);
        sfx.play('gas');
        renderStageScreenUI();
    }
});

document.getElementById('btn-next-stage')?.addEventListener('click', () => {
    if (currentStageViewLevel < getMaxUnlockedMapLevel()) {
        currentStageViewLevel++;
        currentSelectedDifficulty = getDefaultDifficultyForMap(currentStageViewLevel);
        sfx.play('gas');
        renderStageScreenUI();
    }
});

DIFFICULTY_ORDER.forEach(diffKey => {
    const btn = document.getElementById(`diff-btn-${diffKey}`);
    if (btn) {
        btn.addEventListener('click', () => {
            if (!isDifficultyUnlocked(currentStageViewLevel, diffKey)) {
                sfx.play('cannon');
                return;
            }
            currentSelectedDifficulty = diffKey;
            sfx.play('gas');
            renderStageScreenUI();
        });
    }
});

document.getElementById('btn-start-battle')?.addEventListener('click', () => {
    sfx.play('spawn');
    startLevel(currentStageViewLevel, currentSelectedDifficulty);
});

// ============================================================================
// 3. HỆ THỐNG NHIỆM VỤ (MISSIONS MODAL) & GIFTCODE (HUNGDEPTRAI)
// ============================================================================
function updateMissionNotificationDot() {
    const dotEl = document.getElementById('mission-notif-dot');
    if (!dotEl) return;
    const mp = metaState.missionsProgress;
    const hasClaimable = MISSIONS_CATALOG.some(m => {
        const cur = Number(mp[m.statKey]) || 0;
        return cur >= m.target && !mp.claimed[m.id];
    });
    dotEl.classList.toggle('hidden', !hasClaimable);
}

function renderMissionsList() {
    const container = document.getElementById('mission-list-container');
    if (!container) return;
    container.innerHTML = '';

    const mp = metaState.missionsProgress;

    MISSIONS_CATALOG.forEach(m => {
        const cur = Math.min(m.target, Number(mp[m.statKey]) || 0);
        const pct = Math.max(0, Math.min(100, Math.round((cur / m.target) * 100)));
        const isClaimed = !!mp.claimed[m.id];
        const canClaim = cur >= m.target && !isClaimed;

        const item = document.createElement('div');
        item.className = 'mission-item-card';
        item.innerHTML = `
            <div class="flex-1 text-left">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold text-slate-900">${m.title}</span>
                    <span class="text-[11px] font-black text-emerald-600">💎 +${m.rewardGems}</span>
                </div>
                <div class="mission-progress-track">
                    <div class="mission-progress-fill" style="width: ${pct}%"></div>
                </div>
                <div class="text-[10px] font-bold text-slate-500 mt-0.5">
                    Tiến độ: ${cur} / ${m.target}
                </div>
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
                metaState.gems += m.rewardGems;
                saveProgress();
                sfx.play('upgrade');
                renderMissionsList();
                updateTopBarUI();
            });
        }

        container.appendChild(item);
    });
}

document.getElementById('btn-open-missions')?.addEventListener('click', () => {
    sfx.play('gas');
    renderMissionsList();
    document.getElementById('mission-modal')?.classList.add('active');
});

document.getElementById('btn-close-missions')?.addEventListener('click', () => {
    document.getElementById('mission-modal')?.classList.remove('active');
});

// Giftcode Modal
document.getElementById('btn-open-code')?.addEventListener('click', () => {
    sfx.play('gas');
    const input = document.getElementById('giftcode-input');
    const fb = document.getElementById('giftcode-feedback');
    if (input) input.value = '';
    if (fb) fb.classList.add('hidden');
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
        sfx.play('cannon');
        return;
    }

    if (rawCode === 'HUNGDEPTRAI') {
        metaState.gems += 999999;
        metaState.coins += 999999999;
        if (!metaState.usedCodes.includes(rawCode)) {
            metaState.usedCodes.push(rawCode);
        }
        saveProgress();
        updateTopBarUI();
        sfx.play('upgrade');

        fb.className = 'text-xs font-extrabold mt-2 text-emerald-600';
        fb.innerHTML = '🎉 CHÚC MỪNG! Đã cộng <b>+999,999 Gems</b> & <b>+999,999,999 Coins</b>!';
        input.value = '';
    } else {
        fb.className = 'text-xs font-extrabold mt-2 text-rose-600';
        fb.textContent = '❌ Mã Giftcode không hợp lệ hoặc đã hết hạn!';
        sfx.play('cannon');
    }
});

// ============================================================================
// 4. TAB "SHOP": MỞ RƯƠNG GACHA TƯỚNG (LEGENDARY CRATE & EPIC CRATE)
// ============================================================================
function rollRarityFromTable(oddsTable) {
    const rand = Math.random() * 100;
    let acc = 0;
    for (const item of oddsTable) {
        acc += item.weight;
        if (rand <= acc) return item.rarity;
    }
    return oddsTable[0].rarity;
}

function openGachaCrate(crateType, count) {
    const isLegendary = crateType === 'legendary';
    const cost = isLegendary
        ? (count === 10 ? 2700 : 300)
        : (count === 10 ? 1350 : 150);

    if (metaState.gems < cost) {
        alert(`Bạn không đủ Gems! Cần ${formatCurrency(cost)} 💎 Gems (Hiện có: ${formatCurrency(metaState.gems)} 💎).`);
        sfx.play('cannon');
        return;
    }

    metaState.gems -= cost;
    metaState.missionsProgress.cratesOpened = (metaState.missionsProgress.cratesOpened || 0) + count;

    const oddsTable = isLegendary
        ? [
            { rarity: 'uncommon', weight: 50 },
            { rarity: 'rare', weight: 35 },
            { rarity: 'epic', weight: 12 },
            { rarity: 'legendary', weight: 3 }
        ]
        : [
            { rarity: 'common', weight: 55 },
            { rarity: 'uncommon', weight: 30 },
            { rarity: 'rare', weight: 12 },
            { rarity: 'epic', weight: 3 }
        ];

    const pulledCards = [];
    for (let i = 0; i < count; i++) {
        const rarity = rollRarityFromTable(oddsTable);
        const randomUnit = UNIT_CATALOG[Math.floor(Math.random() * UNIT_CATALOG.length)];
        const newCard = {
            uid: 'card_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '_' + i,
            unitId: randomUnit.id,
            rarity
        };
        metaState.inventory.push(newCard);
        pulledCards.push(newCard);
    }

    saveProgress();
    updateTopBarUI();
    sfx.play('upgrade');

    // Hiển thị Popup Kết quả mở rương
    const modal = document.getElementById('gacha-result-modal');
    const titleEl = document.getElementById('gacha-modal-title');
    const gridEl = document.getElementById('gacha-cards-grid');

    if (titleEl) {
        titleEl.textContent = isLegendary
            ? `👑 MỞ LEGENDARY CRATE X${count}`
            : `🧰 MỞ EPIC CRATE X${count}`;
    }

    if (gridEl) {
        gridEl.innerHTML = '';
        pulledCards.forEach(c => {
            const u = UNIT_BY_ID[c.unitId];
            const rCfg = RARITY_CONFIG[c.rarity] || RARITY_CONFIG.common;
            const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';

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
            gridEl.appendChild(cardEl);
        });
    }

    if (modal) modal.classList.add('active');
}

document.getElementById('btn-open-leg-1')?.addEventListener('click', () => openGachaCrate('legendary', 1));
document.getElementById('btn-open-leg-10')?.addEventListener('click', () => openGachaCrate('legendary', 10));
document.getElementById('btn-open-epic-1')?.addEventListener('click', () => openGachaCrate('epic', 1));
document.getElementById('btn-open-epic-10')?.addEventListener('click', () => openGachaCrate('epic', 10));

document.getElementById('btn-close-gacha')?.addEventListener('click', () => {
    document.getElementById('gacha-result-modal')?.classList.remove('active');
    if (currentLobbyTab === 'army') renderArmyTabUI();
});

// ============================================================================
// 5. TAB "ARMY": QUẢN LÝ QUÂN ĐỘI, NÂNG CẤP LEVEL BẰNG COINS & MERGE GHÉP TƯỚNG
// ============================================================================
function renderArmyShowcaseCanvas() {
    const sCanvas = document.getElementById('army-hero-showcase');
    if (!sCanvas) return;
    const sCtx = sCanvas.getContext('2d');
    sCtx.imageSmoothingEnabled = false;
    sCtx.clearRect(0, 0, sCanvas.width, sCanvas.height);

    const u = UNIT_BY_ID[showcaseUnitId] || UNIT_CATALOG[0];
    const highestRarity = getHighestRarityForUnit(u.id);
    const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;

    if (atlas.ready) {
        const bob = Math.sin(performance.now() * 0.005) * 3;
        atlas.draw(sCtx, u.spriteCol, 7, 64, 62 + bob, 78, 78);
    }

    const nameEl = document.getElementById('army-showcase-name');
    if (nameEl) nameEl.textContent = `${u.name.toUpperCase()} (LV.${metaState.armyPermanentLevels[u.id] || 1})`;

    const rarityEl = document.getElementById('army-showcase-rarity');
    if (rarityEl) {
        rarityEl.className = `rarity-badge ${rCfg.cssClass}`;
        rarityEl.textContent = rCfg.name.toUpperCase();
    }
}

function renderArmyTabUI() {
    renderArmyShowcaseCanvas();

    const btnArmy = document.getElementById('btn-mode-army');
    const btnMerge = document.getElementById('btn-mode-merge');
    const listView = document.getElementById('army-list-view');
    const mergeView = document.getElementById('army-merge-view');
    const headingEl = document.getElementById('army-panel-title');

    if (currentArmyMode === 'army') {
        btnArmy?.classList.add('active');
        btnMerge?.classList.remove('active');
        listView?.classList.add('active');
        mergeView?.classList.remove('active');
        if (headingEl) headingEl.textContent = 'QUÂN ĐỘI (11 BINH CHỦNG)';
        renderArmyUnitsGrid();
    } else {
        btnArmy?.classList.remove('active');
        btnMerge?.classList.add('active');
        listView?.classList.remove('active');
        mergeView?.classList.add('active');
        if (headingEl) headingEl.textContent = `GHÉP TƯỚNG (${metaState.inventory.length} THẺ)`;
        renderMergeWorkbenchAndInventory();
    }
}

function renderArmyUnitsGrid() {
    const grid = document.getElementById('army-units-grid');
    if (!grid) return;
    grid.innerHTML = '';

    UNIT_CATALOG.forEach(u => {
        const permLv = metaState.armyPermanentLevels[u.id] || 1;
        const highestRarity = getHighestRarityForUnit(u.id);
        const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;
        const owned = hasUnitInInventory(u.id);
        const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';

        const card = document.createElement('div');
        card.className = `army-unit-card ${rCfg.cssClass}`;
        card.innerHTML = `
            <div class="card-top-lv">
                <span>LV.${permLv}</span>
                ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : `<span class="text-[8px] opacity-90">${owned ? rCfg.name : 'Cơ bản'}</span>`}
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

function calcUnitPermanentStats(spec, rarityId, permLv) {
    const rCfg = RARITY_CONFIG[rarityId] || RARITY_CONFIG.common;
    const lvMult = 1 + (permLv - 1) * 0.12;
    const totalMult = rCfg.mult * lvMult;
    return {
        damage: Math.max(1, Math.round(spec.damage * totalMult)),
        hp: Math.max(1, Math.round(spec.hp * totalMult)),
        rawDmg: +(spec.damage * totalMult).toFixed(1),
        rawHp: +(spec.hp * totalMult).toFixed(1)
    };
}

function openUnitUpgradeModal(unitId) {
    inspectingUnitId = unitId;
    const u = UNIT_BY_ID[unitId];
    if (!u) return;

    sfx.play('gas');
    const permLv = metaState.armyPermanentLevels[u.id] || 1;
    const highestRarity = getHighestRarityForUnit(u.id);
    const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;
    const costCoins = getUnitUpgradeCost(permLv);

    const curStats = calcUnitPermanentStats(u, highestRarity, permLv);
    const nextStats = calcUnitPermanentStats(u, highestRarity, permLv + 1);

    const nameEl = document.getElementById('upg-modal-unit-name');
    if (nameEl) nameEl.textContent = u.name.toUpperCase();

    const frameEl = document.getElementById('upg-modal-card-frame');
    if (frameEl) frameEl.className = `upg-unit-avatar-box ${rCfg.cssClass}`;

    const spriteEl = document.getElementById('upg-modal-sprite');
    if (spriteEl && atlas.ready) spriteEl.src = atlas.toDataURL(u.spriteCol, 7);

    const rarityBadge = document.getElementById('upg-modal-rarity-badge');
    if (rarityBadge) {
        rarityBadge.className = `rarity-badge ${rCfg.cssClass}`;
        rarityBadge.textContent = rCfg.name.toUpperCase();
    }

    const lvBadge = document.getElementById('upg-modal-level-badge');
    if (lvBadge) lvBadge.textContent = `LV.${permLv}`;

    const roleEl = document.getElementById('upg-modal-role');
    if (roleEl) roleEl.textContent = u.role;

    const multInfoEl = document.getElementById('upg-modal-mult-info');
    if (multInfoEl) {
        multInfoEl.textContent = `Độ hiếm ${rCfg.name}: ${rCfg.mult}x HP & DMG • Cấp ${permLv}: +${(permLv - 1) * 12}%`;
    }

    const curDmgEl = document.getElementById('upg-cur-dmg');
    if (curDmgEl) curDmgEl.textContent = `${curStats.damage} (${curStats.rawDmg})`;

    const nextDmgEl = document.getElementById('upg-next-dmg');
    if (nextDmgEl) nextDmgEl.textContent = `${nextStats.damage} (${nextStats.rawDmg})`;

    const curHpEl = document.getElementById('upg-cur-hp');
    if (curHpEl) curHpEl.textContent = u.isAirstrike ? `Phá nhà ${u.baseDamage}` : `${curStats.hp} (${curStats.rawHp})`;

    const nextHpEl = document.getElementById('upg-next-hp');
    if (nextHpEl) nextHpEl.textContent = u.isAirstrike ? `Phá nhà ${Math.round(u.baseDamage * (1 + permLv * 0.12))}` : `${nextStats.hp} (${nextStats.rawHp})`;

    const gasEl = document.getElementById('upg-unit-gas');
    if (gasEl) gasEl.textContent = `${u.cost} Xăng`;

    const costEl = document.getElementById('upg-cost-coins');
    if (costEl) costEl.textContent = `🪙 ${formatCurrency(costCoins)}`;

    const btnUpg = document.getElementById('btn-confirm-unit-upgrade');
    if (btnUpg) {
        btnUpg.disabled = metaState.coins < costCoins;
    }

    document.getElementById('unit-upgrade-modal')?.classList.add('active');
}

document.getElementById('btn-close-upg-modal')?.addEventListener('click', () => {
    document.getElementById('unit-upgrade-modal')?.classList.remove('active');
});

document.getElementById('btn-confirm-unit-upgrade')?.addEventListener('click', () => {
    const u = UNIT_BY_ID[inspectingUnitId];
    if (!u) return;

    const permLv = metaState.armyPermanentLevels[u.id] || 1;
    const costCoins = getUnitUpgradeCost(permLv);

    if (metaState.coins < costCoins) {
        sfx.play('cannon');
        return;
    }

    metaState.coins -= costCoins;
    metaState.armyPermanentLevels[u.id] = permLv + 1;
    metaState.missionsProgress.upgrades = (metaState.missionsProgress.upgrades || 0) + 1;

    saveProgress();
    sfx.play('upgrade');
    updateTopBarUI();
    renderArmyTabUI();
    openUnitUpgradeModal(u.id);
});

// Chuyển đổi chế độ ARMY <-> MERGE
document.getElementById('btn-mode-army')?.addEventListener('click', () => {
    currentArmyMode = 'army';
    sfx.play('gas');
    renderArmyTabUI();
});

document.getElementById('btn-mode-merge')?.addEventListener('click', () => {
    currentArmyMode = 'merge';
    mergeSelectedCardUids = [];
    sfx.play('gas');
    renderArmyTabUI();
});

// Logic Ghép Tướng (MERGE)
function renderMergeWorkbenchAndInventory() {
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
        const u = UNIT_BY_ID[cardObj.unitId];
        const rCfg = RARITY_CONFIG[cardObj.rarity] || RARITY_CONFIG.common;
        const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';
        slotEl.className = `merge-slot ${rCfg.cssClass}`;
        slotEl.innerHTML = `
            <img src="${spriteUrl}" class="w-8 h-8 pixel-art" alt="${u.name}" />
            <span class="text-[8px] font-black text-white leading-none mt-0.5">${rCfg.name}</span>
        `;
    };

    renderMiniSlotCard(slot1El, card1, '+ THẺ 1');
    renderMiniSlotCard(slot2El, card2, '+ THẺ 2');

    if (card1 && card2 && card1.unitId === card2.unitId && card1.rarity === card2.rarity) {
        const nextRarityId = RARITY_CONFIG[card1.rarity]?.next;
        if (nextRarityId && RARITY_CONFIG[nextRarityId]) {
            const u = UNIT_BY_ID[card1.unitId];
            const nextRCfg = RARITY_CONFIG[nextRarityId];
            const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';
            if (slotResEl) {
                slotResEl.className = `merge-slot result-slot ${nextRCfg.cssClass}`;
                slotResEl.innerHTML = `
                    <img src="${spriteUrl}" class="w-9 h-9 pixel-art" alt="${u.name}" />
                    <span class="text-[8px] font-black text-white leading-none mt-0.5">${nextRCfg.name}</span>
                `;
            }
            if (btnMergeExec) btnMergeExec.disabled = false;
            if (hintEl) {
                hintEl.innerHTML = `Sẵn sàng ghép 2 <b>${u.name} (${RARITY_CONFIG[card1.rarity].name})</b> ➔ <b class="text-amber-300">${nextRCfg.name}</b> & <b>+1 Level vĩnh viễn</b>!`;
            }
        }
    } else {
        if (slotResEl) {
            slotResEl.className = 'merge-slot result-slot';
            slotResEl.innerHTML = `<span class="merge-slot-placeholder">KẾT QUẢ</span>`;
        }
        if (btnMergeExec) btnMergeExec.disabled = true;
        if (card1) {
            const u = UNIT_BY_ID[card1.unitId];
            const rCfg = RARITY_CONFIG[card1.rarity];
            if (hintEl) {
                hintEl.innerHTML = `Hãy chọn thêm 1 thẻ <b>${u.name} (${rCfg.name})</b> giống hệt để ghép!`;
            }
        } else if (hintEl) {
            hintEl.innerHTML = `Chọn 2 thẻ tướng <b>cùng tên & cùng độ hiếm</b> để tiến hóa bậc cao hơn (+1 Level vĩnh viễn)!`;
        }
    }

    if (!invGrid) return;
    invGrid.innerHTML = '';

    // Sắp xếp kho theo độ hiếm giảm dần, sau đó theo tên tướng
    const sortedInv = [...metaState.inventory].sort((a, b) => {
        const rA = RARITY_CONFIG[a.rarity]?.rank ?? 0;
        const rB = RARITY_CONFIG[b.rarity]?.rank ?? 0;
        if (rB !== rA) return rB - rA;
        return a.unitId.localeCompare(b.unitId);
    });

    sortedInv.forEach(cardObj => {
        const u = UNIT_BY_ID[cardObj.unitId];
        const rCfg = RARITY_CONFIG[cardObj.rarity] || RARITY_CONFIG.common;
        if (!u) return;

        const isSelected = mergeSelectedCardUids.includes(cardObj.uid);
        const isMaxLegendary = !rCfg.next;
        const permLv = metaState.armyPermanentLevels[u.id] || 1;
        const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';

        let isDimmed = false;
        if (isMaxLegendary) {
            isDimmed = true;
        } else if (card1 && !isSelected) {
            if (cardObj.unitId !== card1.unitId || cardObj.rarity !== card1.rarity) {
                isDimmed = true;
            }
        }

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
            <div class="card-unit-title">${u.name}</div>
        `;

        cardEl.addEventListener('click', () => {
            showcaseUnitId = u.id;
            renderArmyShowcaseCanvas();

            if (isSelected) {
                mergeSelectedCardUids = mergeSelectedCardUids.filter(id => id !== cardObj.uid);
                sfx.play('gas');
                renderMergeWorkbenchAndInventory();
                return;
            }

            if (isMaxLegendary) {
                sfx.play('cannon');
                return;
            }

            if (mergeSelectedCardUids.length === 0) {
                mergeSelectedCardUids.push(cardObj.uid);
                sfx.play('gas');
            } else if (mergeSelectedCardUids.length === 1) {
                const firstCard = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[0]);
                if (firstCard && firstCard.unitId === cardObj.unitId && firstCard.rarity === cardObj.rarity) {
                    mergeSelectedCardUids.push(cardObj.uid);
                    sfx.play('spawn');
                } else {
                    // Đổi sang chọn thẻ mới làm thẻ #1
                    mergeSelectedCardUids = [cardObj.uid];
                    sfx.play('gas');
                }
            } else {
                mergeSelectedCardUids = [cardObj.uid];
                sfx.play('gas');
            }

            renderMergeWorkbenchAndInventory();
        });

        invGrid.appendChild(cardEl);
    });
}

document.getElementById('merge-slot-1')?.addEventListener('click', () => {
    if (mergeSelectedCardUids.length > 0) {
        mergeSelectedCardUids.shift();
        sfx.play('gas');
        renderMergeWorkbenchAndInventory();
    }
});

document.getElementById('merge-slot-2')?.addEventListener('click', () => {
    if (mergeSelectedCardUids.length > 1) {
        mergeSelectedCardUids.pop();
        sfx.play('gas');
        renderMergeWorkbenchAndInventory();
    }
});

document.getElementById('btn-execute-merge')?.addEventListener('click', () => {
    if (mergeSelectedCardUids.length < 2) return;
    const card1 = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[0]);
    const card2 = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[1]);

    if (!card1 || !card2 || card1.unitId !== card2.unitId || card1.rarity !== card2.rarity) return;
    const nextRarity = RARITY_CONFIG[card1.rarity]?.next;
    if (!nextRarity) return;

    // Tiêu hao 2 thẻ nguyên liệu
    const removeSet = new Set([card1.uid, card2.uid]);
    metaState.inventory = metaState.inventory.filter(c => !removeSet.has(c.uid));

    // Tạo 1 thẻ bậc độ hiếm mới cao hơn
    const newCard = {
        uid: 'merged_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        unitId: card1.unitId,
        rarity: nextRarity
    };
    metaState.inventory.push(newCard);

    // Tự động cộng +1 Level vĩnh viễn cho binh chủng đó
    metaState.armyPermanentLevels[card1.unitId] = (metaState.armyPermanentLevels[card1.unitId] || 1) + 1;
    metaState.missionsProgress.merges = (metaState.missionsProgress.merges || 0) + 1;

    mergeSelectedCardUids = [];
    showcaseUnitId = card1.unitId;

    saveProgress();
    sfx.play('upgrade');
    updateTopBarUI();
    renderArmyTabUI();

    const u = UNIT_BY_ID[card1.unitId];
    const nextRCfg = RARITY_CONFIG[nextRarity];
    const hintEl = document.getElementById('merge-hint-text');
    if (hintEl && u && nextRCfg) {
        hintEl.innerHTML = `🎉 GHÉP THÀNH CÔNG: <b>${u.name}</b> tiến hóa lên <b class="text-amber-300">${nextRCfg.name}</b> & tăng lên <b>LV.${metaState.armyPermanentLevels[u.id]}</b>!`;
    }
});

// ============================================================================
// 7. ĐỒNG BỘ CHỈ SỐ VÀO TRẬN ĐẤU (IN-GAME INTEGRATION) & ROGUELIKE DRAFTING
// ============================================================================
function getEffectiveUnitStats(spec, isPlayer = true) {
    if (!spec) return { damage: 1, hp: 10, range: 100, fireRate: 1, speed: 40, lv: 1, rarity: 'common' };
    if (!isPlayer) {
        return {
            damage: spec.damage,
            hp: spec.hp,
            range: spec.range,
            fireRate: spec.fireRate,
            speed: spec.speed,
            lv: 1,
            rarity: 'common'
        };
    }

    // 1. Hệ số Độ hiếm cao nhất đang sở hữu của binh chủng đó
    const highestRarity = getHighestRarityForUnit(spec.id);
    const rarityMult = (RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common).mult;

    // 2. Hệ số Level nâng cấp vĩnh viễn bằng Vàng ngoài Army (+12% mỗi cấp)
    const permLv = metaState.armyPermanentLevels[spec.id] || 1;
    const permLvMult = 1 + (permLv - 1) * 0.12;

    // 3. Hệ số Level/Buff Roguelike trong trận (+22% mỗi cấp trong trận)
    const inGameLv = game.unitLevels[spec.id] || 1;
    const inGameLvMult = 1 + (inGameLv - 1) * 0.22;

    const totalDmg = spec.damage * rarityMult * permLvMult * inGameLvMult * game.buffs.dmgMult;
    const totalHp = spec.hp * rarityMult * permLvMult * inGameLvMult * game.buffs.hpMult;

    return {
        damage: Math.max(1, Math.round(totalDmg)),
        hp: Math.max(1, Math.round(totalHp)),
        range: spec.isAirstrike ? 999 : Math.round(spec.range * game.buffs.rangeMult),
        fireRate: spec.isAirstrike ? 1 : Math.max(0.25, +(spec.fireRate * game.buffs.fireRateMult).toFixed(2)),
        speed: spec.speed,
        lv: inGameLv,
        permLv,
        rarity: highestRarity
    };
}

function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function generateDraftChoices(isInitialPick = false) {
    const cfg = LEVELS[game.currentLevel - 1] || LEVELS[0];

    const allowedUnits = UNIT_CATALOG.filter(u => {
        if (u.isNaval && !cfg.hasWater) return false;
        if (isInitialPick && (u.isAirstrike || u.cost > 7)) return false;
        return true;
    });

    const unownedUnits = allowedUnits.filter(u => !game.battleDeck.includes(u.id));
    const choices = [];

    if (game.battleDeck.length < MAX_DECK_SLOTS && unownedUnits.length > 0) {
        const pickedUnits = shuffleArray(unownedUnits).slice(0, 3);
        pickedUnits.forEach(u => {
            choices.push({
                type: 'new_unit',
                unit: u
            });
        });
    }

    if (choices.length < 3) {
        const upgradePool = [];

        game.battleDeck.forEach(unitId => {
            const u = UNIT_BY_ID[unitId];
            if (u) {
                const nextLv = (game.unitLevels[unitId] || 1) + 1;
                upgradePool.push({
                    type: 'upgrade_unit',
                    unit: u,
                    nextLv
                });
            }
        });

        BUFF_CATALOG.forEach(b => {
            upgradePool.push({
                type: 'buff',
                buff: b
            });
        });

        if (game.battleDeck.length >= MAX_DECK_SLOTS && unownedUnits.length > 0) {
            const replaceCandidate = unownedUnits[Math.floor(Math.random() * unownedUnits.length)];
            upgradePool.push({
                type: 'replace_unit',
                unit: replaceCandidate,
                slotIndex: MAX_DECK_SLOTS - 1
            });
        }

        const shuffledUpgrades = shuffleArray(upgradePool);
        for (const item of shuffledUpgrades) {
            if (choices.length >= 3) break;
            choices.push(item);
        }
    }

    return choices.slice(0, 3);
}

function openDraftModal(isInitialPick = false) {
    game.draftActive = true;
    const choices = generateDraftChoices(isInitialPick);

    if (isInitialPick) {
        draftBadgeTextEl.textContent = `MAP ${game.currentLevel} (${DIFFICULTY_CONFIG[game.currentDifficulty].label}) • KHỞI ĐẦU`;
        draftTitleEl.textContent = 'CHỌN QUÂN TIÊN PHONG';
        draftSubtitleEl.textContent = 'Chọn 1 trong 3 đơn vị dưới đây để mở khóa ô chiến đấu đầu tiên';
    } else {
        draftBadgeTextEl.textContent = `🎉 LEVEL UP! ĐẠT CẤP ĐỘ ${game.currentLevelInBattle}`;
        if (game.battleDeck.length < MAX_DECK_SLOTS) {
            draftTitleEl.textContent = 'CHIÊU MỘ CHIẾN BINH MỚI';
            draftSubtitleEl.textContent = `Chọn 1 quân để thêm vào thanh điều khiển (${game.battleDeck.length}/${MAX_DECK_SLOTS} ô)`;
        } else {
            draftTitleEl.textContent = 'CƯỜNG HÓA QUÂN ĐỘI';
            draftSubtitleEl.textContent = 'Đã tối đa 5 ô quân! Chọn 1 nâng cấp sức mạnh hoặc thay thế quân';
        }
    }

    draftCardsContainerEl.innerHTML = '';

    choices.forEach(choice => {
        const card = document.createElement('div');

        if (choice.type === 'new_unit' || choice.type === 'replace_unit') {
            const u = choice.unit;
            const eff = getEffectiveUnitStats(u, true);
            const rCfg = RARITY_CONFIG[eff.rarity] || RARITY_CONFIG.common;
            const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';
            const isReplace = choice.type === 'replace_unit';
            const oldUnit = isReplace ? UNIT_BY_ID[game.battleDeck[choice.slotIndex]] : null;

            card.className = 'draft-card';
            card.innerHTML = `
                <span class="draft-card-tag">${isReplace ? '🔄 THAY Ô #5' : `${rCfg.name.toUpperCase()} • LV.${eff.permLv}`}</span>
                <div class="my-1 flex flex-col items-center">
                    <img src="${spriteUrl}" class="w-11 h-11 pixel-art drop-shadow" alt="${u.name}" />
                    <div class="text-xs font-extrabold text-white mt-1 leading-tight">${u.name}</div>
                    <div class="text-[9px] text-sky-300 font-semibold">${u.role}</div>
                </div>
                <div class="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-1.5 text-[9.5px] font-bold space-y-0.5">
                    <div class="flex justify-between">
                        <span class="text-slate-400">Chi phí:</span>
                        <span class="text-amber-300">⛽ ${u.cost} Xăng</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Sát thương:</span>
                        <span class="text-rose-400">⚔️ ${eff.damage}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">${u.isAirstrike ? 'Phá căn cứ:' : 'Máu (HP):'}</span>
                        <span class="text-emerald-400">${u.isAirstrike ? '💥 ' + u.baseDamage : '❤️ ' + eff.hp}</span>
                    </div>
                </div>
                <div class="w-full mt-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[10px] py-1 rounded-md shadow">
                    ${isReplace ? `THAY ${oldUnit ? oldUnit.name : 'Ô 5'}` : 'CHỌN QUÂN NÀY'}
                </div>
            `;

            card.addEventListener('click', () => {
                if (isReplace) {
                    game.battleDeck[choice.slotIndex] = u.id;
                    game.unitLevels[u.id] = Math.max(1, game.unitLevels[u.id] || 1);
                    addFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT - 80, `🔄 ĐÃ ĐỔI SANG ${u.name.toUpperCase()}!`, '#38bdf8', 14);
                } else {
                    game.battleDeck.push(u.id);
                    game.unitLevels[u.id] = 1;
                    addFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT - 80, `✨ ĐÃ THU NẠP: ${u.name.toUpperCase()}!`, '#4ade80', 14);
                }
                finishDraftSelection();
            });
        } else if (choice.type === 'upgrade_unit') {
            const u = choice.unit;
            const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';

            card.className = 'draft-card buff-card';
            card.innerHTML = `
                <span class="draft-card-tag">⬆️ THĂNG CẤP LV.${choice.nextLv}</span>
                <div class="my-1 flex flex-col items-center">
                    <img src="${spriteUrl}" class="w-11 h-11 pixel-art drop-shadow" alt="${u.name}" />
                    <div class="text-xs font-extrabold text-amber-300 mt-1 leading-tight">${u.name}</div>
                    <div class="text-[9px] text-purple-200 font-semibold">Cấp ${choice.nextLv - 1} ➔ Cấp ${choice.nextLv}</div>
                </div>
                <div class="w-full bg-slate-950/80 border border-purple-500/40 rounded-lg p-1.5 text-[9.5px] text-slate-200 leading-snug">
                    Tăng <b class="text-rose-300">+22% Sát thương</b> & <b class="text-emerald-300">+22% Máu</b> cho mọi đơn vị <b>${u.name}</b>!
                </div>
                <div class="w-full mt-1.5 bg-purple-400 hover:bg-purple-300 text-slate-950 font-extrabold text-[10px] py-1 rounded-md shadow">
                    NÂNG CẤP NGAY
                </div>
            `;

            card.addEventListener('click', () => {
                game.unitLevels[u.id] = choice.nextLv;
                const eff = getEffectiveUnitStats(u, true);
                game.units.forEach(unit => {
                    if (unit.team === 'blue' && unit.unitId === u.id) {
                        unit.damage = eff.damage;
                        unit.maxHp = eff.hp;
                        unit.hp = Math.min(unit.maxHp, unit.hp + Math.round(eff.hp * 0.3));
                    }
                });
                addFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2, `⬆️ ${u.name.toUpperCase()} ĐẠT LV.${choice.nextLv}!`, '#fde047', 15);
                finishDraftSelection();
            });
        } else if (choice.type === 'buff') {
            const b = choice.buff;
            const iconUrl = atlas.ready ? atlas.toDataURL(b.iconCol, b.iconRow) : '';

            card.className = 'draft-card buff-card';
            card.innerHTML = `
                <span class="draft-card-tag">⚡ ${b.tag}</span>
                <div class="my-1 flex flex-col items-center">
                    <img src="${iconUrl}" class="w-10 h-10 pixel-art drop-shadow my-0.5" alt="${b.name}" />
                    <div class="text-xs font-extrabold text-amber-300 mt-1 leading-tight">${b.name}</div>
                </div>
                <div class="w-full bg-slate-950/80 border border-purple-500/40 rounded-lg p-1.5 text-[9.5px] text-slate-200 leading-snug">
                    ${b.desc}
                </div>
                <div class="w-full mt-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[10px] py-1 rounded-md shadow">
                    KÍCH HOẠT BUFF
                </div>
            `;

            card.addEventListener('click', () => {
                b.apply();
                finishDraftSelection();
            });
        }

        draftCardsContainerEl.appendChild(card);
    });

    draftModalEl.classList.add('active');
}

function finishDraftSelection() {
    sfx.play('upgrade');
    draftModalEl.classList.remove('active');
    game.draftActive = false;

    renderBattleDeckButtons();
    updateControllerUI();

    if (game.pendingDraftCount > 0 && !game.gameOver) {
        game.pendingDraftCount--;
        setTimeout(() => {
            if (!game.gameOver && !game.inMenu) {
                openDraftModal(false);
            }
        }, 120);
    }
}

function gainExp(amount) {
    if (game.gameOver || game.inMenu) return;
    game.playerExp += amount;

    while (game.playerExp >= game.expToNextLevel) {
        game.playerExp -= game.expToNextLevel;
        game.currentLevelInBattle++;
        game.expToNextLevel = calcExpRequired(game.currentLevelInBattle);
        game.pendingDraftCount++;
        sfx.play('upgrade');
    }

    updateExpUI();

    if (game.pendingDraftCount > 0 && !game.draftActive) {
        game.pendingDraftCount--;
        openDraftModal(false);
    }
}

function updateExpUI() {
    if (battleLvLabelEl) battleLvLabelEl.textContent = `LV.${game.currentLevelInBattle}`;
    if (battleExpLabelEl) battleExpLabelEl.textContent = `EXP ${game.playerExp} / ${game.expToNextLevel}`;
    if (battleExpFillEl) {
        const pct = Math.max(0, Math.min(100, (game.playerExp / game.expToNextLevel) * 100));
        battleExpFillEl.style.width = `${pct}%`;
    }
}

// ============================================================================
// HỆ THỐNG 10 WAVE SINH TỒN (WAVE SURVIVAL MANAGER + DIFFICULTY MULTIPLIER)
// ============================================================================
function buildWaveEnemyPool(levelNum, waveNum) {
    const cfg = LEVELS[levelNum - 1] || LEVELS[0];
    return UNIT_CATALOG.filter(u => {
        if (u.isAirstrike) return false;
        if (u.isNaval && !cfg.hasWater) return false;
        if (waveNum === 1 && u.cost > 3) return false;
        if (waveNum === 2 && u.cost > 4) return false;
        if (waveNum <= 4 && u.cost > 6) return false;
        if (waveNum <= 6 && u.cost > 8) return false;
        return true;
    });
}

function spawnWave(waveNum) {
    game.currentWave = waveNum;
    game.waveState = 'spawning';

    const cfg = LEVELS[game.currentLevel - 1] || LEVELS[0];
    const pool = buildWaveEnemyPool(cfg.level, waveNum);
    const diffCfg = DIFFICULTY_CONFIG[game.currentDifficulty] || DIFFICULTY_CONFIG.easy;

    const totalCount = 4 + Math.floor(waveNum * 1.7) + Math.floor((cfg.level - 1) * 0.45);
    const baseWaveHpMult = 1 + (waveNum - 1) * 0.25 + (cfg.level - 1) * 0.06;
    const baseWaveDmgMult = 1 + (waveNum - 1) * 0.15 + (cfg.level - 1) * 0.04;

    // Nhân thêm Hệ số Độ khó (Easy: 1.0x | Normal: 1.35x | Difficult: 1.75x)
    const hpMult = +(baseWaveHpMult * diffCfg.statMult).toFixed(2);
    const dmgMult = +(baseWaveDmgMult * diffCfg.statMult).toFixed(2);

    game.waveSpawnQueue = [];
    for (let i = 0; i < totalCount; i++) {
        let pick = pool[Math.floor(Math.random() * pool.length)] || UNIT_BY_ID['infantry'];
        if (i === totalCount - 1 && waveNum >= 4) {
            const heavyPool = pool.filter(u => u.cost >= 6);
            if (heavyPool.length > 0) {
                pick = heavyPool[Math.floor(Math.random() * heavyPool.length)];
            }
        }
        game.waveSpawnQueue.push({
            spec: pick,
            hpMult,
            dmgMult
        });
    }

    game.waveTotalEnemies = totalCount;
    game.waveSpawnTimer = 0.4;

    sfx.play('spawn');
    addFloatingText(
        LOGICAL_WIDTH / 2,
        145,
        `⚠️ WAVE ${waveNum} / ${game.maxWaves} (${totalCount} ĐỊCH)!`,
        waveNum === game.maxWaves ? '#fde047' : '#fb7185',
        16
    );

    if ((waveNum === 6 || waveNum === 10) && cfg.level >= 3) {
        setTimeout(() => {
            if (!game.inMenu && !game.gameOver) {
                attackPlane('red', UNIT_BY_ID['airstrike']);
            }
        }, 1200);
    }
}

function getAliveRedUnitsCount() {
    let count = 0;
    for (const u of game.units) {
        if (u.team === 'red' && u.hp > 0) count++;
    }
    return count;
}

function updateWaveSystem(dt) {
    if (game.waveState === 'spawning') {
        game.waveSpawnTimer -= dt;
        if (game.waveSpawnTimer <= 0 && game.waveSpawnQueue.length > 0) {
            const nextEnemy = game.waveSpawnQueue.shift();
            const gateSpread = 180;
            const rx = (LOGICAL_WIDTH / 2 - gateSpread / 2) + Math.random() * gateSpread;
            spawnUnitBySpec('red', nextEnemy.spec, rx, 108, nextEnemy.hpMult, nextEnemy.dmgMult);

            game.waveSpawnTimer = Math.max(0.55, 1.55 - game.currentWave * 0.08);
        }

        if (game.waveSpawnQueue.length === 0) {
            game.waveState = 'fighting';
        }
    } else if (game.waveState === 'fighting') {
        const aliveRed = getAliveRedUnitsCount();
        if (aliveRed === 0) {
            if (game.currentWave >= game.maxWaves) {
                triggerWinGame();
            } else {
                game.waveState = 'intermission';
                game.waveIntermissionTimer = game.waveIntermissionMax;
                game.gasCount = Math.min(game.maxGas, game.gasCount + 2);
                sfx.play('gas');
                addFloatingText(LOGICAL_WIDTH / 2, 165, `✓ DỌN SẠCH WAVE ${game.currentWave}! (+2 ⛽)`, '#34d399', 15);
                updateControllerUI();
            }
        }
    } else if (game.waveState === 'intermission') {
        game.waveIntermissionTimer -= dt;
        if (game.waveIntermissionTimer <= 0) {
            spawnWave(game.currentWave + 1);
        }
    }
}

// ============================================================================
// RENDER 5 Ô QUÂN DƯỚI THANH ĐIỀU KHIỂN (BOTTOM DECK 5 SLOTS)
// ============================================================================
function renderBattleDeckButtons() {
    const container = document.getElementById('battle-deck-slots');
    if (!container) return;
    container.innerHTML = '';

    const gasUrl = atlas.ready ? atlas.toDataURL(12, 10) : '';
    const lockUrl = atlas.ready ? atlas.toDataURL(13, 10) : '';

    for (let i = 0; i < MAX_DECK_SLOTS; i++) {
        const unitId = game.battleDeck[i];
        const btn = document.createElement('div');

        if (unitId && UNIT_BY_ID[unitId]) {
            const u = UNIT_BY_ID[unitId];
            const eff = getEffectiveUnitStats(u, true);
            const rCfg = RARITY_CONFIG[eff.rarity] || RARITY_CONFIG.common;
            const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';

            btn.id = `btnSlot${i}`;
            btn.className = 'unit-btn' + (u.isNaval ? ' naval-btn' : '');
            btn.style.borderColor = rCfg.color;
            btn.innerHTML = `
                <span class="hotkey-badge">${i + 1}</span>
                <span class="unit-lv-badge">L${eff.lv}</span>
                <div class="text-[8px] font-bold text-sky-200 uppercase tracking-tight truncate w-full text-center px-0.5 mt-1">${u.name}</div>
                <div class="flex flex-col items-center justify-center">
                    <img src="${spriteUrl}" class="w-6 h-6 pixel-art" alt="${u.name}" />
                    <span class="dmg-mini-tag">⚔️${eff.damage}</span>
                    <span class="rng-mini-tag">🎯${u.isAirstrike ? 'Map' : eff.range}</span>
                </div>
                <div class="cost-badge">
                    <img src="${gasUrl}" class="gas-inline-sprite w-2.5 h-2.5 pixel-art" alt="Gas" />
                    <span>${u.cost}</span>
                </div>
                <div id="blockSlot${i}" class="lock-overlay">
                    <img src="${lockUrl}" class="lock-sprite w-3.5 h-3.5 pixel-art mb-0.5" alt="Lock" />
                    <div class="flex items-center gap-0.5">
                        <span class="text-[8.5px] font-bold text-amber-400">${u.cost}</span>
                        <img src="${gasUrl}" class="gas-inline-sprite w-2.5 h-2.5 pixel-art" alt="Gas" />
                    </div>
                </div>
            `;
            btn.addEventListener('click', () => buyUnitFromSlot(i));
        } else {
            btn.className = 'unit-btn empty-slot-btn';
            btn.innerHTML = `
                <span class="hotkey-badge">${i + 1}</span>
                <div class="flex flex-col items-center justify-center text-slate-500">
                    <span class="text-xs font-extrabold">🔒</span>
                    <span class="text-[7.5px] font-bold uppercase mt-0.5">Lên Cấp</span>
                </div>
            `;
        }

        container.appendChild(btn);
    }
}

// ============================================================================
// KHỞI TẠO TRẬN ĐẤU MỚI
// ============================================================================
function startLevel(levelNum, difficultyId = currentSelectedDifficulty) {
    const cfg = LEVELS[levelNum - 1] || LEVELS[0];
    game.currentLevel = cfg.level;
    game.currentDifficulty = DIFFICULTY_CONFIG[difficultyId] ? difficultyId : 'easy';
    game.inMenu = false;
    game.paused = false;
    game.draftActive = false;
    game.gameOver = false;
    game.elapsedTime = 0;

    game.gasUpgradeIndex = 0;
    game.gasInterval = GAS_UPGRADE_LEVELS[0].interval;
    game.gasTimer = game.gasInterval;
    game.gasCount = cfg.startingGas;
    game.rallyX = null;

    game.battleDeck = [];
    game.unitLevels = {};
    game.buffs = {
        dmgMult: 1.0,
        hpMult: 1.0,
        fireRateMult: 1.0,
        rangeMult: 1.0
    };
    game.currentLevelInBattle = 1;
    game.playerExp = 0;
    game.expToNextLevel = calcExpRequired(1);
    game.pendingDraftCount = 0;

    game.blueBase.maxHp = cfg.playerBaseHp;
    game.blueBase.hp = cfg.playerBaseHp;

    game.units = [];
    game.bullets = [];
    game.planes = [];
    game.particles = [];
    game.floatingTexts = [];
    game.stats.spawned = 0;
    game.stats.kills = 0;

    if (lobbyWrapperEl) {
        lobbyWrapperEl.classList.remove('active');
    }
    draftModalEl.classList.remove('active');
    document.getElementById('win-panel').classList.remove('active');
    document.getElementById('lose-panel').classList.remove('active');
    document.getElementById('pause-btn').textContent = '⏸';

    const diffLabel = DIFFICULTY_CONFIG[game.currentDifficulty].label;
    currentLevelLabelEl.textContent = `MAP ${cfg.level} • ${diffLabel}`;

    buildStaticMapCanvas(cfg.level);
    renderBattleDeckButtons();
    updateExpUI();
    updateControllerUI();

    spawnWave(1);
    openDraftModal(true);
}

document.getElementById('menu-return-btn')?.addEventListener('click', () => {
    window.openLobbyScreen('battle');
});

const rangeToggleBtn = document.getElementById('range-toggle-btn');
if (rangeToggleBtn) {
    rangeToggleBtn.addEventListener('click', () => {
        game.showRangeCircles = !game.showRangeCircles;
        rangeToggleBtn.className = game.showRangeCircles
            ? 'bg-emerald-900/90 hover:bg-emerald-800 text-emerald-200 border border-emerald-400 rounded-lg px-1.5 py-1 text-[10.5px] font-bold transition'
            : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 border border-slate-600 rounded-lg px-1.5 py-1 text-[10.5px] font-bold transition';
    });
}

function timerEnded() {
    if (game.gasCount < game.maxGas) {
        game.gasCount++;
        sfx.play('gas');
    }
    gasCountTextEl.textContent = game.gasCount.toString();
    game.gasTimer = game.gasInterval;
}

window.upgradeGasRate = function() {
    if (game.inMenu || game.gameOver || game.paused || game.draftActive) return;
    const currentTier = GAS_UPGRADE_LEVELS[game.gasUpgradeIndex];
    if (!currentTier || currentTier.cost === 0) return;

    if (game.gasCount < currentTier.cost) {
        addFloatingText(120, PLAYFIELD_HEIGHT - 20, 'THIẾU XĂNG!', '#f87171', 12);
        return;
    }

    game.gasCount -= currentTier.cost;
    game.gasUpgradeIndex++;
    const newTier = GAS_UPGRADE_LEVELS[game.gasUpgradeIndex];
    game.gasInterval = newTier.interval;
    game.gasTimer = Math.min(game.gasTimer, game.gasInterval);

    sfx.play('upgrade');
    addFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT - 60, `⚡ TỐC ĐỘ: ${game.gasInterval}s/bình!`, '#34d399', 15);
    triggerShake(0.15, 3.5);
    updateControllerUI();
};

function updateControllerUI() {
    gasCountTextEl.textContent = game.gasCount.toString();
    speedIndicatorEl.textContent = `${game.gasInterval}s`;
    gasRateLabelEl.textContent = `+1/${game.gasInterval}s`;

    const progress = Math.max(0, Math.min(1, 1 - (game.gasTimer / game.gasInterval)));
    gasLoadEls.forEach((el, index) => {
        if (progress >= (index + 1) * 0.2) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    const currentTier = GAS_UPGRADE_LEVELS[game.gasUpgradeIndex];
    if (currentTier.cost === 0) {
        upgradeNextSpeedEl.textContent = 'MAX';
        upgradeCostTextEl.textContent = '-';
        blockUpgradeEl.classList.remove('unlocked');
        upgradeLockCostEl.textContent = 'MAX';
        btnUpgradeGasEl.classList.remove('ready');
    } else {
        upgradeNextSpeedEl.textContent = currentTier.label;
        upgradeCostTextEl.textContent = currentTier.cost.toString();
        upgradeLockCostEl.textContent = `${currentTier.cost}`;

        if (game.gasCount >= currentTier.cost && !game.gameOver) {
            blockUpgradeEl.classList.add('unlocked');
            btnUpgradeGasEl.classList.add('ready');
        } else {
            blockUpgradeEl.classList.remove('unlocked');
            btnUpgradeGasEl.classList.remove('ready');
        }
    }

    for (let i = 0; i < MAX_DECK_SLOTS; i++) {
        const unitId = game.battleDeck[i];
        const btnEl = document.getElementById(`btnSlot${i}`);
        const lockEl = document.getElementById(`blockSlot${i}`);
        if (!unitId || !btnEl || !lockEl) continue;

        const spec = UNIT_BY_ID[unitId];
        if (game.gasCount >= spec.cost && !game.gameOver) {
            lockEl.classList.add('unlocked');
            btnEl.classList.add('ready');
        } else {
            lockEl.classList.remove('unlocked');
            btnEl.classList.remove('ready');
        }
    }
}

document.getElementById('gas-generator-btn').addEventListener('click', () => {
    if (game.inMenu || game.gameOver || game.paused || game.draftActive) return;
    game.gasTimer -= 0.35;
    sfx.play('gas');
    addFloatingText(80, PLAYFIELD_HEIGHT - 18, '+NẠP ⚡', '#4ade80', 12);
    if (game.gasTimer <= 0.0) {
        timerEnded();
    }
    updateControllerUI();
});

window.buyUnitFromSlot = function(slotIndex) {
    if (game.inMenu || game.gameOver || game.paused || game.draftActive) return;
    const unitId = game.battleDeck[slotIndex];
    if (!unitId || !UNIT_BY_ID[unitId]) return;

    const spec = UNIT_BY_ID[unitId];
    if (game.gasCount < spec.cost) return;

    game.gasCount -= spec.cost;
    game.stats.spawned++;
    metaState.missionsProgress.spawns = (metaState.missionsProgress.spawns || 0) + 1;
    saveProgress();

    if (spec.isAirstrike) {
        attackPlane('blue', spec);
    } else {
        spawnUnitBySpec('blue', spec);
        sfx.play('spawn');
    }
    updateControllerUI();
};

function spawnUnitBySpec(team, spec, customX = null, customY = null, enemyHpMult = 1, enemyDmgMult = 1) {
    if (!spec) return;
    const isBlue = team === 'blue';
    const base = isBlue ? game.blueBase : game.redOutpost;
    const eff = getEffectiveUnitStats(spec, isBlue);

    const finalHp = isBlue ? eff.hp : Math.max(1, Math.round(spec.hp * enemyHpMult));
    const finalDmg = isBlue ? eff.damage : Math.max(1, Math.round(spec.damage * enemyDmgMult));

    let prefX = customX;
    let prefY = customY !== null ? customY : (isBlue ? base.y - 42 : base.y + 42);

    if (prefX === null) {
        if (isBlue && game.rallyX !== null) {
            prefX = game.rallyX + (Math.random() * 28 - 14);
        } else {
            const gateWidth = base.width - 56;
            prefX = (base.x - gateWidth / 2) + Math.random() * gateWidth;
        }
    }
    prefX = Math.max(36, Math.min(LOGICAL_WIDTH - 36, prefX));

    const validPt = nav.findValidSpawnPoint(team, spec, prefX, prefY);
    const spawnX = validPt.x;
    const spawnY = validPt.y;

    const spriteRow = isBlue ? 7 : 8;

    const unitObj = {
        id: Math.random().toString(36).slice(2),
        unitId: spec.id,
        name: spec.name,
        team: team,
        spriteCol: spec.spriteCol,
        spriteRow: spriteRow,
        flipX: !isBlue,
        x: spawnX,
        y: spawnY,
        vx: 0,
        vy: isBlue ? -1 : 1,
        moveAngle: isBlue ? -Math.PI / 2 : Math.PI / 2,
        aimAngle: isBlue ? -Math.PI / 2 : Math.PI / 2,
        baseHp: spec.hp,
        hp: finalHp,
        maxHp: finalHp,
        moveSpeed: eff.speed + (Math.random() * 3 - 1.5),
        baseDamage: spec.damage,
        damage: finalDmg,
        expReward: spec.cost || 2,
        targetTime: 0.35,
        baseFireRate: spec.fireRate,
        fireRate: eff.fireRate,
        beamActiveTimer: 0,
        muzzleFlashTimer: 0,
        shoot: false,
        lastTargetX: null,
        lastTargetY: null,
        baseRange: spec.range,
        range: eff.range,
        radius: spec.radius,
        attackType: spec.attackType,
        projType: spec.projType || 'shell',
        arcHeight: spec.arcHeight || 0,
        projSpeed: spec.projSpeed || 250,
        projRadius: spec.projRadius || 6,
        animStyle: spec.animStyle || 'vehicle_cannon',
        isWalker: !!spec.isWalker,
        isNaval: !!spec.isNaval,
        isAir: !!spec.isAir,
        walkCycle: Math.random() * Math.PI * 2,
        rotorAngle: Math.random() * Math.PI * 2,
        wakeTimer: 0,
        dustTimer: 0,
        recoil: 0
    };

    nav.resolveHardCollisions(unitObj);
    game.units.push(unitObj);

    spawnExplosion(unitObj.x, unitObj.y, isBlue ? '#60a5fa' : '#f87171', 7, 16);
}

function attackPlane(team, spec = UNIT_BY_ID['airstrike']) {
    const isBlue = team === 'blue';
    const eff = getEffectiveUnitStats(spec, isBlue);
    const diffMult = isBlue ? 1 : (DIFFICULTY_CONFIG[game.currentDifficulty]?.statMult || 1);
    sfx.play('airstrike');

    game.planes.push({
        team: team,
        spriteRow: isBlue ? 7 : 8,
        x: LOGICAL_WIDTH / 2,
        y: isBlue ? PLAYFIELD_HEIGHT + 55 : -55,
        vy: isBlue ? -350 : 350,
        unitDamage: isBlue ? eff.damage : Math.round((spec.damage || 14) * diffMult),
        baseDamage: Math.round((spec.baseDamage || 18) * diffMult),
        hitEntities: new Set()
    });

    addFloatingText(
        LOGICAL_WIDTH / 2,
        isBlue ? PLAYFIELD_HEIGHT - 120 : 140,
        isBlue ? `✈️ KHÔNG KÍCH XANH (-${eff.damage} DMG)!` : '⚠️ PHI ĐỘI ĐỎ OANH TẠC!',
        isBlue ? '#38bdf8' : '#f87171',
        15
    );
}

// ============================================================================
// TÌM MỤC TIÊU & CHIẾN ĐẤU TRONG TRẬN
// ============================================================================
function findTargetForUnit(unit) {
    const enemyTeam = unit.team === 'blue' ? 'red' : 'blue';

    let nearestTarget = null;
    let minDistance = Infinity;

    for (const other of game.units) {
        if (other.team !== enemyTeam || other.hp <= 0) continue;
        const dx = other.x - unit.x;
        const dy = other.y - unit.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= unit.range + other.radius) {
            if (dist < minDistance) {
                minDistance = dist;
                nearestTarget = { isBase: false, entity: other, hitX: other.x, hitY: other.y };
            }
        }
    }

    if (nearestTarget) return nearestTarget;

    if (unit.team === 'red') {
        const enemyBase = game.blueBase;
        const halfW = enemyBase.width * 0.5;
        const halfH = enemyBase.height * 0.5;
        const clampedX = Math.max(enemyBase.x - halfW, Math.min(unit.x, enemyBase.x + halfW));
        const clampedY = Math.max(enemyBase.y - halfH, Math.min(unit.y, enemyBase.y + halfH));
        const distToBase = Math.hypot(unit.x - clampedX, unit.y - clampedY);

        if (distToBase <= unit.range) {
            return { isBase: true, entity: enemyBase, hitX: clampedX, hitY: clampedY };
        }
    }

    return null;
}

function applyDamageToTarget(targetObj, damage, isBlue) {
    if (!targetObj || !targetObj.entity) return;
    targetObj.entity.hp = Math.max(0, targetObj.entity.hp - damage);

    const tx = targetObj.isBase ? (targetObj.hitX || targetObj.entity.x) : targetObj.entity.x;
    const ty = targetObj.isBase ? (targetObj.hitY || targetObj.entity.y) : targetObj.entity.y - 12;

    addFloatingText(tx, ty, `-${damage}`, isBlue ? '#38bdf8' : '#fb7185', 13);
    spawnExplosion(tx, ty, '#fde047', 5, 12);

    if (targetObj.isBase) {
        checkGameOver();
    }
}

// ============================================================================
// CẬP NHẬT DI CHUYỂN & CHIẾN ĐẤU CỦA CÁC ĐƠN VỊ (NỐI TIẾP TỪ DÒNG BỊ NGẮT)
// ============================================================================
function updateUnits(dt) {
    for (let i = 0; i < game.units.length; i++) {
        const u1 = game.units[i];
        for (let j = i + 1; j < game.units.length; j++) {
            const u2 = game.units[j];
            if (u1.isAir !== u2.isAir || u1.isNaval !== u2.isNaval) continue;
            const dx = u2.x - u1.x;
            const dy = u2.y - u1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = u1.radius + u2.radius + 2;

            if (dist < minDist && dist > 0.001) {
                const overlap = (minDist - dist) * 0.45;
                const nx = dx / dist;
                const ny = dy / dist;

                u1.x -= nx * overlap;
                u2.x += nx * overlap;
                u1.y -= ny * overlap * 0.5;
                u2.y += ny * overlap * 0.5;
            }
        }
    }

    for (let i = game.units.length - 1; i >= 0; i--) {
        const u = game.units[i];
        if (u.hp <= 0) {
            const color = u.team === 'blue' ? '#3b82f6' : '#ef4444';
            spawnExplosion(u.x, u.y, color, u.radius > 16 ? 20 : 12, u.radius > 16 ? 30 : 18);
            sfx.play(u.radius > 16 ? 'boom' : 'cannon');

            if (u.team === 'red') {
                game.stats.kills++;
                metaState.missionsProgress.kills = (metaState.missionsProgress.kills || 0) + 1;
                const expGain = u.expReward || 2;
                addFloatingText(u.x, u.y - 18, `+${expGain} EXP`, '#fde047', 12);
                gainExp(expGain);
            }

            game.units.splice(i, 1);
            continue;
        }

        if (u.recoil > 0) u.recoil = Math.max(0, u.recoil - dt * 16);
        if (u.beamActiveTimer > 0) u.beamActiveTimer = Math.max(0, u.beamActiveTimer - dt);
        if (u.muzzleFlashTimer > 0) u.muzzleFlashTimer = Math.max(0, u.muzzleFlashTimer - dt);
        if (u.isAir) u.rotorAngle += dt * 22;

        u.targetTime -= dt;
        const target = findTargetForUnit(u);

        if (target) {
            u.shoot = true;
            const tx = target.hitX !== undefined ? target.hitX : target.entity.x;
            const ty = target.hitY !== undefined ? target.hitY : target.entity.y;
            u.lastTargetX = tx;
            u.lastTargetY = ty;
            u.aimAngle = Math.atan2(ty - u.y, tx - u.x);
            u.flipX = Math.cos(u.aimAngle) < -0.15;

            if (u.attackType === 'beam') {
                if (u.targetTime <= 0) {
                    u.targetTime = u.fireRate;
                    u.beamActiveTimer = 0.16;
                    u.muzzleFlashTimer = 0.12;
                    u.recoil = 3.2;
                    sfx.play('beam');
                    applyDamageToTarget(target, u.damage, u.team === 'blue');
                }
            } else {
                if (u.targetTime <= 0) {
                    u.targetTime = u.fireRate;
                    u.muzzleFlashTimer = 0.15;
                    u.recoil = u.isWalker ? 3.5 : 5.0;
                    spawnUnitProjectile(u, target);
                }
            }
        } else {
            u.shoot = false;

            if (u.team === 'blue' && u.y <= 118) {
                u.vx = 0;
                u.vy = 0;
                u.aimAngle = -Math.PI / 2;
                nav.resolveHardCollisions(u);
                continue;
            }

            const dir = u.team === 'blue' ? -1 : 1;
            let moveDirX = 0;
            let moveDirY = dir;

            if (u.isAir) {
                const goalX = LOGICAL_WIDTH / 2;
                const goalY = u.team === 'blue' ? 115 : game.blueBase.y;
                const ang = Math.atan2(goalY - u.y, goalX - u.x);
                moveDirX = Math.cos(ang) * 0.25;
                moveDirY = Math.sin(ang);
            } else {
                const flow = nav.getFlowDirection(u.x, u.y, u.team, u.isNaval);
                moveDirX = flow.dirX;
                moveDirY = flow.dirY;
            }

            for (const ally of game.units) {
                if (ally === u || ally.team !== u.team || ally.isAir !== u.isAir || ally.isNaval !== u.isNaval) continue;
                const dx = ally.x - u.x;
                const dy = ally.y - u.y;
                const dist = Math.hypot(dx, dy);
                if (dist < u.radius + ally.radius + 10) {
                    const pushSide = dx >= 0 ? -1 : 1;
                    moveDirX += pushSide * 0.45;
                }
            }

            const norm = Math.hypot(moveDirX, moveDirY) || 1;
            moveDirX /= norm;
            moveDirY /= norm;

            u.vx = moveDirX * u.moveSpeed;
            u.vy = moveDirY * u.moveSpeed;
            u.x += u.vx * dt;
            u.y += u.vy * dt;

            u.moveAngle = Math.atan2(u.vy, u.vx);
            u.aimAngle = u.moveAngle;
            if (Math.abs(moveDirX) > 0.22) {
                u.flipX = moveDirX < 0;
            } else {
                u.flipX = u.team !== 'blue';
            }

            u.walkCycle += dt * (u.isWalker ? 13 : 9);

            if (u.isNaval) {
                u.wakeTimer -= dt;
                if (u.wakeTimer <= 0) {
                    u.wakeTimer = 0.14;
                    game.particles.push({
                        x: u.x - moveDirX * (u.radius * 0.8),
                        y: u.y - moveDirY * (u.radius * 0.8),
                        vx: (Math.random() - 0.5) * 12,
                        vy: (Math.random() - 0.5) * 12,
                        size: 3.5,
                        color: '#e0f2fe',
                        alpha: 0.75,
                        life: 0.28
                    });
                }
            } else if (!u.isAir) {
                u.dustTimer -= dt;
                if (u.dustTimer <= 0) {
                    u.dustTimer = u.isWalker ? 0.24 : 0.16;
                    game.particles.push({
                        x: u.x - moveDirX * (u.radius * 0.65),
                        y: u.y + u.radius * 0.55,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 8,
                        size: u.isWalker ? 2.2 : 3.2,
                        color: '#d6d3d1',
                        alpha: 0.6,
                        life: 0.2
                    });
                }
            }
        }

        nav.resolveHardCollisions(u);
    }
}

function spawnUnitProjectile(unit, target) {
    const tx = target.hitX !== undefined ? target.hitX : target.entity.x;
    const ty = target.hitY !== undefined ? target.hitY : target.entity.y;

    const angle = Math.atan2(ty - unit.y, tx - unit.x);
    const bx = unit.x + Math.cos(angle) * (unit.radius + 5);
    const by = unit.y + Math.sin(angle) * (unit.radius + 5);

    if (unit.animStyle === 'walker_bazooka') {
        const backX = unit.x - Math.cos(angle) * (unit.radius + 4);
        const backY = unit.y - Math.sin(angle) * (unit.radius + 4);
        spawnExplosion(backX, backY, '#e2e8f0', 6, 12);
    } else {
        spawnExplosion(bx, by, '#fde047', 5, 10);
    }

    sfx.play('cannon');

    const totalDist = Math.max(10, Math.hypot(tx - bx, ty - by));

    game.bullets.push({
        team: unit.team,
        projType: unit.projType || 'shell',
        startX: bx,
        startY: by,
        x: bx,
        y: by,
        targetX: tx,
        targetY: ty,
        totalDist: totalDist,
        traveled: 0,
        arcHeight: unit.arcHeight || 0,
        vx: Math.cos(angle) * unit.projSpeed,
        vy: Math.sin(angle) * unit.projSpeed,
        speed: unit.projSpeed,
        damage: unit.damage,
        radius: unit.projRadius,
        trailTimer: 0
    });
}

function updateBullets(dt) {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const b = game.bullets[i];
        const stepX = (b.vx || 0) * dt;
        const stepY = b.vy * dt;
        b.x += stepX;
        b.y += stepY;
        b.traveled += Math.hypot(stepX, stepY);

        if (b.projType === 'rocket_short' || b.projType === 'arc_missile' || b.projType === 'air_missile') {
            b.trailTimer -= dt;
            if (b.trailTimer <= 0) {
                b.trailTimer = 0.03;
                const currentLift = b.arcHeight
                    ? Math.sin(Math.min(1, b.traveled / b.totalDist) * Math.PI) * b.arcHeight
                    : 0;
                game.particles.push({
                    x: b.x,
                    y: b.y - currentLift,
                    vx: (Math.random() - 0.5) * 14,
                    vy: (Math.random() - 0.5) * 14,
                    size: 3.2,
                    color: b.projType === 'arc_missile' ? '#fb923c' : '#cbd5e1',
                    alpha: 0.8,
                    life: 0.18
                });
            }
        }

        const enemyTeam = b.team === 'blue' ? 'red' : 'blue';
        let hitSomething = false;

        const isHighInAir = b.arcHeight > 0 && (b.traveled / b.totalDist) > 0.18 && (b.traveled / b.totalDist) < 0.82;

        if (!isHighInAir) {
            for (const u of game.units) {
                if (u.team !== enemyTeam || u.hp <= 0) continue;
                if (Math.hypot(u.x - b.x, u.y - b.y) <= u.radius + b.radius + 4) {
                    u.hp -= b.damage;
                    spawnExplosion(b.x, b.y, '#fb923c', 10, 20);
                    addFloatingText(u.x, u.y - 14, `-${b.damage}`, '#fde047', 13);
                    hitSomething = true;
                    break;
                }
            }

            if (!hitSomething && b.team === 'red') {
                const enemyBase = game.blueBase;
                const inBaseX = Math.abs(b.x - enemyBase.x) <= enemyBase.width / 2;
                const inBaseY = Math.abs(b.y - enemyBase.y) <= enemyBase.height / 2;
                if (inBaseX && inBaseY) {
                    enemyBase.hp = Math.max(0, enemyBase.hp - b.damage);
                    spawnExplosion(b.x, b.y, '#f97316', 12, 24);
                    addFloatingText(b.x, enemyBase.y, `-${b.damage}`, '#f87171', 14);
                    checkGameOver();
                    hitSomething = true;
                }
            }
        }

        if (!hitSomething && b.arcHeight > 0 && b.traveled >= b.totalDist) {
            spawnExplosion(b.x, b.y, '#f97316', 14, 26);
            for (const u of game.units) {
                if (u.team !== enemyTeam || u.hp <= 0) continue;
                if (Math.hypot(u.x - b.x, u.y - b.y) <= u.radius + 22) {
                    u.hp -= b.damage;
                    addFloatingText(u.x, u.y - 14, `-${b.damage}`, '#fde047', 13);
                    break;
                }
            }
            hitSomething = true;
        }

        if (hitSomething || b.y < -20 || b.y > PLAYFIELD_HEIGHT + 20 || b.x < -20 || b.x > LOGICAL_WIDTH + 20) {
            game.bullets.splice(i, 1);
        }
    }
}

function updatePlanes(dt) {
    for (let i = game.planes.length - 1; i >= 0; i--) {
        const plane = game.planes[i];
        plane.y += plane.vy * dt;

        const enemyTeam = plane.team === 'blue' ? 'red' : 'blue';

        for (const u of game.units) {
            if (u.team !== enemyTeam || u.hp <= 0) continue;
            if (!plane.hitEntities.has(u.id) && Math.abs(u.y - plane.y) <= 32) {
                plane.hitEntities.add(u.id);
                u.hp -= plane.unitDamage;
                spawnExplosion(u.x, u.y, '#f97316', 18, 36);
                addFloatingText(u.x, u.y - 14, `-${plane.unitDamage} ✈️`, '#fb923c', 15);
                sfx.play('boom');
                triggerShake(0.18, 5);
            }
        }

        if (plane.team === 'red' && !plane.hitEntities.has('base') && Math.abs(game.blueBase.y - plane.y) <= 34) {
            plane.hitEntities.add('base');
            game.blueBase.hp = Math.max(0, game.blueBase.hp - plane.baseDamage);
            spawnExplosion(game.blueBase.x, game.blueBase.y, '#ef4444', 28, 52);
            addFloatingText(game.blueBase.x, game.blueBase.y, `-${plane.baseDamage} 💥`, '#ef4444', 17);
            sfx.play('boom');
            triggerShake(0.25, 7);
            checkGameOver();
        }

        if ((plane.team === 'blue' && plane.y < -90) || (plane.team === 'red' && plane.y > PLAYFIELD_HEIGHT + 90)) {
            game.planes.splice(i, 1);
        }
    }
}

function spawnExplosion(x, y, color, count = 12, maxRadius = 24) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 20 + Math.random() * (maxRadius * 3);
        game.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2.5 + Math.random() * 4,
            color: i % 3 === 0 ? '#fde047' : color,
            alpha: 1,
            life: 0.25 + Math.random() * 0.22
        });
    }
}

function addFloatingText(x, y, text, color = '#fff', size = 12) {
    game.floatingTexts.push({
        x,
        y,
        text,
        color,
        size,
        alpha: 1,
        life: 0.75
    });
}

function triggerShake(duration, intensity) {
    game.shakeTime = Math.max(game.shakeTime, duration);
    game.shakeIntensity = Math.max(game.shakeIntensity, intensity);
}

function updateEffects(dt) {
    if (game.shakeTime > 0) {
        game.shakeTime = Math.max(0, game.shakeTime - dt);
    }

    for (let i = game.particles.length - 1; i >= 0; i--) {
        const pt = game.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        pt.alpha = Math.max(0, pt.life * 2.5);
        if (pt.life <= 0) game.particles.splice(i, 1);
    }

    for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
        const ft = game.floatingTexts[i];
        ft.y -= 28 * dt;
        ft.life -= dt;
        ft.alpha = Math.max(0, ft.life / 0.75);
        if (ft.life <= 0) game.floatingTexts.splice(i, 1);
    }
}

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// ============================================================================
// XỬ LÝ KẾT THÚC TRẬN ĐẤU (THẮNG / THUA) & CỘNG THƯỞNG META-GAME
// ============================================================================
function triggerWinGame() {
    if (game.gameOver) return;
    game.gameOver = true;
    game.draftActive = false;
    draftModalEl.classList.remove('active');

    const mapLv = game.currentLevel;
    const diffId = game.currentDifficulty || 'easy';
    const diffCfg = DIFFICULTY_CONFIG[diffId] || DIFFICULTY_CONFIG.easy;

    if (!metaState.mapDifficultyProgress[mapLv]) {
        metaState.mapDifficultyProgress[mapLv] = { easy: false, normal: false, difficult: false };
    }
    metaState.mapDifficultyProgress[mapLv][diffId] = true;

    const rewardCoins = diffCfg.calcReward(mapLv);
    metaState.coins += rewardCoins;
    metaState.missionsProgress.wins = (metaState.missionsProgress.wins || 0) + 1;
    if (diffId === 'difficult') {
        metaState.missionsProgress.diffWins = (metaState.missionsProgress.diffWins || 0) + 1;
    }

    saveProgress();
    updateTopBarUI();

    spawnExplosion(game.redOutpost.x, game.redOutpost.y, '#38bdf8', 45, 70);
    sfx.play('boom');

    const cfg = LEVELS[mapLv - 1];
    const subEl = document.getElementById('win-subtitle');
    if (subEl) {
        subEl.textContent = `Đã phá đảo Map ${mapLv} (${diffCfg.label}): ${cfg ? cfg.name : ''}!`;
    }
    const rewardEl = document.getElementById('win-coins-reward');
    if (rewardEl) {
        rewardEl.textContent = `+${formatCurrency(rewardCoins)} 🪙`;
    }

    document.getElementById('win-time').textContent = formatTime(game.elapsedTime);
    document.getElementById('win-hp').textContent = `${Math.ceil(game.blueBase.hp)} / ${game.blueBase.maxHp}`;
    document.getElementById('win-spawned').textContent = `LV.${game.currentLevelInBattle}`;
    document.getElementById('win-kills').textContent = game.stats.kills;
    document.getElementById('win-panel').classList.add('active');
    updateControllerUI();
}

function checkGameOver() {
    if (game.gameOver) return;

    if (game.blueBase.hp <= 0) {
        game.blueBase.hp = 0;
        game.gameOver = true;
        game.draftActive = false;
        draftModalEl.classList.remove('active');

        saveProgress();
        updateTopBarUI();

        spawnExplosion(game.blueBase.x, game.blueBase.y, '#3b82f6', 45, 70);
        sfx.play('boom');

        document.getElementById('lose-time').textContent = formatTime(game.elapsedTime);
        const loseWaveEl = document.getElementById('lose-wave');
        if (loseWaveEl) loseWaveEl.textContent = `Wave ${game.currentWave} / ${game.maxWaves}`;
        document.getElementById('lose-spawned').textContent = game.stats.spawned;
        document.getElementById('lose-kills').textContent = game.stats.kills;
        document.getElementById('lose-panel').classList.add('active');
        updateControllerUI();
    }
}

window.restartGame = function() {
    startLevel(game.currentLevel, game.currentDifficulty);
};

window.nextOrRestartLevel = function() {
    if (game.currentDifficulty === 'easy') {
        currentStageViewLevel = game.currentLevel;
        currentSelectedDifficulty = 'normal';
        startLevel(currentStageViewLevel, currentSelectedDifficulty);
    } else if (game.currentDifficulty === 'normal') {
        currentStageViewLevel = game.currentLevel;
        currentSelectedDifficulty = 'difficult';
        startLevel(currentStageViewLevel, currentSelectedDifficulty);
    } else {
        const nextLv = game.currentLevel < LEVELS.length ? game.currentLevel + 1 : 1;
        currentStageViewLevel = nextLv;
        currentSelectedDifficulty = 'easy';
        startLevel(currentStageViewLevel, currentSelectedDifficulty);
    }
};

// ============================================================================
// VẼ NỀN BẢN ĐỒ, CĂN CỨ XANH & THANH WAVE TRÊN ĐỈNH MÀN HÌNH
// ============================================================================
function drawMapBackground() {
    if (atlas.bakedMapCanvas) {
        ctx.drawImage(atlas.bakedMapCanvas, 0, 0);
    } else {
        ctx.fillStyle = '#58a846';
        ctx.fillRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);
    }

    if (game.rallyX !== null) {
        const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.1;
        const ry = game.blueBase.y - 48;

        if (atlas.ready) {
            atlas.draw(ctx, 7, 3, game.rallyX, ry, 28 * pulse, 28 * pulse);
            atlas.draw(ctx, 16, 10, game.rallyX + 18, ry + 10, 20, 20);
        } else {
            ctx.beginPath();
            ctx.arc(game.rallyX, ry, 12, 0, Math.PI * 2);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.5;
        ctx.font = 'bold 9px Chakra Petch';
        ctx.textAlign = 'center';
        ctx.strokeText('MŨI TIẾN CÔNG', game.rallyX, ry - 16);
        ctx.fillText('MŨI TIẾN CÔNG', game.rallyX, ry - 16);
    }
}

function drawTopWaveOutpostAndHUD() {
    const outpost = game.redOutpost;
    const bRow = game.currentLevel === 10 ? 4 : 3;
    const x = outpost.x - outpost.width / 2;
    const y = outpost.y - outpost.height / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const buildingCols = [10, 9, 13];
    const offsetsX = [-72, 0, 72];

    offsetsX.forEach((dx, idx) => {
        const bx = outpost.x + dx;
        const by = outpost.y;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(bx - 26, by - 24, 52, 48, 8);
        ctx.fill();

        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (atlas.ready) {
            atlas.draw(ctx, buildingCols[idx], bRow, bx, by, 44, 44);
        }
    });

    if (atlas.ready) {
        const wave = Math.sin(performance.now() * 0.006) * 0.08;
        const flagY = y + outpost.height + 4;
        atlas.draw(ctx, 16, bRow, x + 16, flagY, 24, 24, { rotation: wave });
        atlas.draw(ctx, 17, bRow, x + outpost.width - 16, flagY, 24, 24, { rotation: -wave });
    }

    const barW = 236;
    const barH = 22;
    const barX = outpost.x - barW / 2;
    const barY = y + outpost.height - 2;

    const aliveRed = getAliveRedUnitsCount();
    const remainingInWave = aliveRed + game.waveSpawnQueue.length;
    const totalInWave = Math.max(1, game.waveTotalEnemies);

    let fillRatio = 1;
    let fillColor = '#f43f5e';
    let statusText = `WAVE ${game.currentWave}/${game.maxWaves} • Còn: ${remainingInWave} địch`;

    if (game.waveState === 'intermission') {
        fillRatio = Math.max(0, Math.min(1, 1 - (game.waveIntermissionTimer / game.waveIntermissionMax)));
        fillColor = '#eab308';
        statusText = `WAVE ${game.currentWave + 1}/${game.maxWaves} sau ${game.waveIntermissionTimer.toFixed(1)}s`;
    } else {
        fillRatio = Math.max(0, Math.min(1, remainingInWave / totalInWave));
    }

    ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();

    ctx.strokeStyle = game.waveState === 'intermission' ? '#facc15' : '#fb7185';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (fillRatio > 0) {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.roundRect(barX + 2, barY + 2, (barW - 4) * fillRatio, barH - 4, 4);
        ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Chakra Petch';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusText, outpost.x, barY + barH / 2 + 0.5);

    ctx.restore();
}

function drawPlayerBase(base) {
    const bRow = 2;
    const x = base.x - base.width / 2;
    const y = base.y - base.height / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const buildingCols = [10, 9, 13];
    const offsetsX = [-72, 0, 72];

    offsetsX.forEach((dx, idx) => {
        const bx = base.x + dx;
        const by = base.y;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(bx - 26, by - 24, 52, 48, 8);
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (atlas.ready) {
            atlas.draw(ctx, buildingCols[idx], bRow, bx, by, 44, 44);
        }
    });

    if (atlas.ready) {
        const wave = Math.sin(performance.now() * 0.006) * 0.08;
        const flagY = y - 4;
        atlas.draw(ctx, 16, bRow, x + 16, flagY, 24, 24, { rotation: wave });
        atlas.draw(ctx, 17, bRow, x + base.width - 16, flagY, 24, 24, { rotation: -wave });
    }

    const barW = 216;
    const barH = 18;
    const barX = base.x - barW / 2;
    const barY = y - 16;
    const hpRatio = Math.max(0, base.hp / base.maxHp);

    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    if (hpRatio > 0) {
        ctx.beginPath();
        ctx.roundRect(barX + 2, barY + 2, (barW - 4) * hpRatio, barH - 4, 4);
        ctx.fill();
    }

    if (atlas.ready) {
        atlas.draw(ctx, 15, 10, barX + 12, barY + barH / 2, 14, 14);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Chakra Petch';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        `CĂN CỨ XANH: ${Math.ceil(base.hp)} / ${base.maxHp}`,
        base.x + 6,
        barY + barH / 2 + 0.5
    );

    ctx.restore();
}

function drawUnits() {
    if (game.showRangeCircles) {
        for (const u of game.units) {
            ctx.save();
            ctx.translate(u.x, u.y);
            ctx.beginPath();
            ctx.arc(0, 0, u.range, 0, Math.PI * 2);
            ctx.strokeStyle = u.team === 'blue'
                ? (u.shoot ? 'rgba(56, 189, 248, 0.45)' : 'rgba(56, 189, 248, 0.18)')
                : (u.shoot ? 'rgba(251, 113, 133, 0.40)' : 'rgba(251, 113, 133, 0.14)');
            ctx.lineWidth = u.shoot ? 1.5 : 1;
            ctx.setLineDash(u.isWalker ? [3, 3] : [6, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    for (const u of game.units) {
        const isBlue = u.team === 'blue';
        const recoilX = -Math.cos(u.aimAngle) * u.recoil;
        const recoilY = -Math.sin(u.aimAngle) * u.recoil;

        let bobY = 0;
        let strideX = 0;
        let tilt = 0;
        let scaleX = 1;
        let scaleY = 1;

        if (!u.shoot) {
            if (u.isWalker) {
                bobY = -Math.abs(Math.sin(u.walkCycle)) * 3.2;
                strideX = Math.cos(u.walkCycle) * 1.2;
                tilt = Math.sin(u.walkCycle) * 0.09;
                scaleY = 1 + Math.sin(u.walkCycle * 2) * 0.05;
            } else if (u.isNaval) {
                bobY = Math.sin(u.walkCycle * 0.7) * 2.0;
                tilt = Math.cos(u.walkCycle * 0.7) * 0.04;
            } else if (u.isAir) {
                bobY = Math.sin(u.walkCycle * 0.8) * 3.5;
                tilt = (u.vx / Math.max(1, u.moveSpeed)) * 0.14;
            } else {
                bobY = Math.sin(u.walkCycle * 1.5) * 0.9;
                tilt = (u.vx / Math.max(1, u.moveSpeed)) * 0.08;
            }
        } else {
            const squash = Math.min(0.14, u.recoil * 0.025);
            scaleX = 1 + squash;
            scaleY = 1 - squash * 0.7;
        }

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(u.x + recoilX + strideX, u.y + recoilY + bobY);

        if (u.attackType === 'beam' && u.beamActiveTimer > 0 && u.lastTargetX !== null) {
            const relTX = u.lastTargetX - u.x;
            const relTY = u.lastTargetY - u.y;
            ctx.save();
            ctx.strokeStyle = isBlue ? '#38bdf8' : '#fb7185';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(relTX, relTY);
            ctx.stroke();

            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(relTX, relTY);
            ctx.stroke();
            ctx.restore();
        }

        if (u.isNaval) {
            const waveExpand = 1 + Math.sin(performance.now() * 0.008 + u.walkCycle) * 0.12;
            ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(0, u.radius - 3, (u.radius + 3) * waveExpand, 7 * waveExpand, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (u.isWalker) {
            const leftFootY = u.radius - 2 + (u.shoot ? 0 : Math.sin(u.walkCycle) * 2.5);
            const rightFootY = u.radius - 2 - (u.shoot ? 0 : Math.sin(u.walkCycle) * 2.5);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
            ctx.beginPath();
            ctx.arc(-4, leftFootY, 2.5, 0, Math.PI * 2);
            ctx.arc(4, rightFootY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
            ctx.beginPath();
            ctx.ellipse(0, u.isAir ? u.radius + 11 : u.radius - 2, u.radius * 0.85, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.scale(scaleX, scaleY);
        const drawSize = u.radius * 2 + 4;
        const drewSprite = atlas.draw(ctx, u.spriteCol, u.spriteRow, 0, 0, drawSize, drawSize, {
            flipX: u.flipX,
            rotation: tilt
        });

        if (!drewSprite) {
            ctx.fillStyle = isBlue ? '#3b82f6' : '#ef4444';
            ctx.beginPath();
            ctx.arc(0, 0, u.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        if (u.isAir) {
            ctx.save();
            ctx.rotate(u.rotorAngle);
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(-u.radius * 1.15, 0);
            ctx.lineTo(u.radius * 1.15, 0);
            ctx.moveTo(0, -u.radius * 1.15);
            ctx.lineTo(0, u.radius * 1.15);
            ctx.stroke();
            ctx.restore();
        }

        if (u.muzzleFlashTimer > 0) {
            const mx = Math.cos(u.aimAngle) * (u.radius + 4);
            const my = Math.sin(u.aimAngle) * (u.radius + 4);
            ctx.save();
            ctx.translate(mx, my);
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(0, 0, u.isWalker ? 4.5 : 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        if (u.hp < u.maxHp) {
            const bw = Math.max(24, u.radius * 1.7);
            const bh = 4.5;
            const by = -u.radius - 11;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(-bw / 2, by, bw, bh);
            ctx.fillStyle = isBlue ? '#38bdf8' : '#f87171';
            ctx.fillRect(-bw / 2 + 1, by + 1, (bw - 2) * Math.max(0, u.hp / u.maxHp), bh - 2);
        }

        ctx.restore();
    }
}

function drawBullets() {
    for (const b of game.bullets) {
        const isBlue = b.team === 'blue';
        const progress = b.totalDist > 0 ? Math.min(1, b.traveled / b.totalDist) : 0;
        const liftY = b.arcHeight ? Math.sin(progress * Math.PI) * b.arcHeight : 0;
        const drawX = b.x;
        const drawY = b.y - liftY;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        if (b.arcHeight > 0) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, b.radius * 0.9, b.radius * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        if (b.projType === 'tracer') {
            const ang = Math.atan2(b.vy, b.vx || 0);
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            ctx.lineTo(drawX - Math.cos(ang) * 14, drawY - Math.sin(ang) * 14);
            ctx.stroke();
        } else {
            ctx.fillStyle = isBlue ? 'rgba(56, 189, 248, 0.45)' : 'rgba(248, 113, 113, 0.45)';
            ctx.beginPath();
            ctx.arc(drawX, drawY, b.radius + 2, 0, Math.PI * 2);
            ctx.fill();

            const rot = Math.atan2(b.vy, b.vx || 0);
            const scale = 1 + (liftY / 90);
            const size = 16 * scale;
            if (!atlas.draw(ctx, 11, 10, drawX, drawY, size, size, { rotation: rot })) {
                ctx.fillStyle = isBlue ? '#38bdf8' : '#f87171';
                ctx.beginPath();
                ctx.arc(drawX, drawY, b.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

function drawPlanes() {
    for (const plane of game.planes) {
        const isBlue = plane.team === 'blue';
        const row = plane.spriteRow;
        const jetRot = isBlue ? -Math.PI / 2 : Math.PI / 2;

        const squadron = [
            { col: 10, dx: 0,    dy: 0,                 size: 56, rot: jetRot },
            { col: 10, dx: -95,  dy: isBlue ? 28 : -28, size: 46, rot: jetRot },
            { col: 10, dx: 95,   dy: isBlue ? 28 : -28, size: 46, rot: jetRot },
            { col: 11, dx: -155, dy: isBlue ? 48 : -48, size: 42, rot: 0 },
            { col: 11, dx: 155,  dy: isBlue ? 48 : -48, size: 42, rot: 0 }
        ];

        for (const member of squadron) {
            const px = plane.x + member.dx;
            const py = plane.y + member.dy;

            atlas.draw(ctx, member.col, 5, px + 18, py + 24, member.size * 0.85, member.size * 0.85, {
                rotation: member.rot,
                alpha: 0.35
            });

            ctx.save();
            ctx.fillStyle = '#fde047';
            const tailY = py + (isBlue ? 22 : -22);
            ctx.beginPath();
            ctx.arc(px, tailY, 4 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            atlas.draw(ctx, member.col, row, px, py, member.size, member.size, {
                rotation: member.rot
            });
        }
    }
}

function drawEffects() {
    for (const pt of game.particles) {
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        ctx.restore();
    }

    for (const ft of game.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = `800 ${ft.size}px Chakra Petch`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }
}

// ============================================================================
// VÒNG LẶP GAME CHÍNH (MAIN GAME LOOP) & SỰ KIỆN ĐIỀU KHIỂN
// ============================================================================
let lastFrameTime = performance.now();

function gameLoop(now) {
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (game.inMenu && currentLobbyTab === 'army') {
        renderArmyShowcaseCanvas();
    }

    if (!game.inMenu && !game.paused && !game.draftActive && !game.gameOver) {
        game.elapsedTime += dt;

        game.gasTimer -= dt;
        if (game.gasTimer <= 0.0) {
            timerEnded();
        }
        updateControllerUI();

        updateWaveSystem(dt);
        updateUnits(dt);
        updateBullets(dt);
        updatePlanes(dt);
    }

    updateEffects(dt);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    if (game.shakeTime > 0) {
        const dx = (Math.random() - 0.5) * game.shakeIntensity * 2;
        const dy = (Math.random() - 0.5) * game.shakeIntensity * 2;
        ctx.translate(dx, dy);
    }

    drawMapBackground();
    drawTopWaveOutpostAndHUD();
    drawPlayerBase(game.blueBase);
    drawUnits();
    drawBullets();
    drawPlanes();
    drawEffects();

    if (game.paused && !game.draftActive && !game.gameOver && !game.inMenu) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.fillRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px Chakra Petch';
        ctx.textAlign = 'center';
        ctx.fillText('TẠM DỪNG (PAUSED)', LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2);
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('pointerdown', (e) => {
    if (game.inMenu || game.gameOver || game.paused || game.draftActive) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;

    if (clickY < PLAYFIELD_HEIGHT) {
        if (clickY > game.blueBase.y - 20) {
            game.rallyX = null;
            addFloatingText(LOGICAL_WIDTH / 2, game.blueBase.y - 45, 'XUẤT TOÀN CỔNG', '#38bdf8', 13);
        } else {
            game.rallyX = Math.max(50, Math.min(LOGICAL_WIDTH - 50, clickX));
            addFloatingText(game.rallyX, game.blueBase.y - 50, 'ĐÃ ĐẶT MŨI TIẾN CÔNG', '#4ade80', 12);
        }
    }
});

// Phím tắt bàn phím 1, 2, 3, 4, 5 gọi 5 ô quân + Space nạp xăng + U nâng tốc xăng
window.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (game.inMenu || game.draftActive) return;
    if (e.key === '1') buyUnitFromSlot(0);
    if (e.key === '2') buyUnitFromSlot(1);
    if (e.key === '3') buyUnitFromSlot(2);
    if (e.key === '4') buyUnitFromSlot(3);
    if (e.key === '5') buyUnitFromSlot(4);
    if (e.key.toLowerCase() === 'u') upgradeGasRate();
    if (e.code === 'Space') {
        e.preventDefault();
        document.getElementById('gas-generator-btn')?.click();
    }
});

document.getElementById('sound-btn')?.addEventListener('click', (e) => {
    sfx.enabled = !sfx.enabled;
    e.currentTarget.textContent = sfx.enabled ? '🔊' : '🔇';
});

document.getElementById('pause-btn')?.addEventListener('click', (e) => {
    if (game.inMenu || game.gameOver || game.draftActive) return;
    game.paused = !game.paused;
    e.currentTarget.textContent = game.paused ? '▶' : '⏸';
});

window.onload = function() {
    updateTopBarUI();
    buildStaticMapCanvas(currentStageViewLevel);
    renderStageScreenUI();
    renderArmyTabUI();
    renderBattleDeckButtons();
    updateExpUI();
    updateControllerUI();
    checkAndPromptPlayerName(false);
    requestAnimationFrame(gameLoop);
};