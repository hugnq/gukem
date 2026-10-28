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
        enemyBaseHp: 95 + lv * 30,
        playerBaseHp: 100 + Math.floor(lv / 3) * 10,
        aiGasInterval: Math.max(0.85, 2.75 - lv * 0.11),
        aiPlaneInterval: Math.max(14, 32 - lv * 1.1),
        initialRedUnits: Math.min(5, Math.floor((lv + 1) / 2)),
        startingGas: lv <= 2 ? 5 : 4
    };
});

// ============================================================================
// CÁC CHẾ ĐỘ TÙY CHỌN TẦM BẮN CHO NHÂN VẬT
// ============================================================================
const RANGE_MODES = [
    {
        id: 'short',
        label: 'Cơ Động (Gần)',
        shortTag: 'Gần',
        rangeMult: 0.84,
        fireRateMult: 0.85,
        speedMult: 1.12
    },
    {
        id: 'standard',
        label: 'Chuẩn',
        shortTag: 'Chuẩn',
        rangeMult: 1.0,
        fireRateMult: 1.0,
        speedMult: 1.0
    },
    {
        id: 'long',
        label: 'Yểm Trợ (Xa)',
        shortTag: 'Xa',
        rangeMult: 1.20,
        fireRateMult: 1.15,
        speedMult: 0.92
    }
];

const unitRangeSelection = {};

// ============================================================================
// DANH SÁCH BINH CHỦNG (PHÂN HÓA RÕ TẦM BẮN & ANIMATION)
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
        range: 48, // Đi bộ súng trường: tầm bắn rất gần, phải áp sát
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
        range: 84, // Đi bộ vác B41: tầm ngắn-trung
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
        range: 115, // Cơ giới bắn đại liên tầm trung
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
        range: 215, // Pháo binh bắn cầu vồng tầm cực xa
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
        range: 230, // Đại pháo hạm đội tầm xa nhất
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
        damage: 14,
        baseDamage: 20,
        cost: 12,
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
    unitRangeSelection[u.id] = 1; // Mặc định chế độ 'Chuẩn'
});

function getEffectiveUnitStats(spec, isPlayer = true) {
    if (!spec || spec.isAirstrike) return { range: 999, fireRate: 1, speed: 350, mode: RANGE_MODES[1] };
    const modeIdx = isPlayer ? (unitRangeSelection[spec.id] ?? 1) : 1;
    const mode = RANGE_MODES[modeIdx] || RANGE_MODES[1];
    return {
        range: Math.round(spec.range * mode.rangeMult),
        fireRate: +(spec.fireRate * mode.fireRateMult).toFixed(2),
        speed: Math.round(spec.speed * mode.speedMult),
        mode
    };
}

function getRangeCategoryLabel(range) {
    if (range >= 900) return 'Toàn Map';
    if (range <= 60) return `Rất gần (${range})`;
    if (range <= 98) return `Ngắn (${range})`;
    if (range <= 145) return `Trung (${range})`;
    if (range <= 185) return `Xa (${range})`;
    return `Siêu xa (${range})`;
}

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
        this.renderMenuHeroArt();
        buildStaticMapCanvas(game.currentLevel);
        renderLevelGrid();
        renderBattleDeckButtons();
        if (unitSelectEl.classList.contains('active')) {
            renderUnitSelectionUI();
        }
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

    renderMenuHeroArt() {
        const heroCanvas = document.getElementById('menuHeroCanvas');
        if (!heroCanvas) return;
        const hCtx = heroCanvas.getContext('2d');
        hCtx.imageSmoothingEnabled = false;
        hCtx.clearRect(0, 0, 120, 120);

        for (let r = 1; r <= 2; r++) {
            for (let c = 1; c <= 2; c++) {
                const grass = this.get((r + c) % 3, 0);
                if (grass) hCtx.drawImage(grass, c * 36 - 14, r * 36 - 10, 36, 36);
            }
        }
        this.draw(hCtx, 9, 2, 60, 34, 38, 38);
        this.draw(hCtx, 16, 2, 28, 34, 28, 28);
        this.draw(hCtx, 8, 7, 46, 76, 44, 44);
        this.draw(hCtx, 14, 7, 82, 78, 38, 38);
        this.draw(hCtx, 10, 7, 62, 24, 34, 34, { rotation: -Math.PI / 4 });
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
        drawThreeMiniBases(42, true);
        drawThreeMiniBases(H - 42, false);
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

let completedLevels = new Set();
let pendingSelectLevel = 1;
let selectedDeckIds = ['infantry', 'bazooka', 'tank', 'airstrike'];

let game = {
    inMenu: true,
    paused: false,
    gameOver: false,
    currentLevel: 1,
    elapsedTime: 0,
    showRangeCircles: true,

    gasUpgradeIndex: 0,
    gasInterval: 3.0,
    gasTimer: 3.0,
    gasCount: 0,
    maxGas: 99,

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
    redBase: {
        team: 'red',
        x: LOGICAL_WIDTH / 2,
        y: 64,
        width: 268,
        height: 64,
        hp: 100,
        maxHp: 100
    },

    aiGas: 2,
    aiGasTimer: 0,
    aiDecisionTimer: 1.5,
    aiPlaneTimer: 0,

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

const mainMenuEl = document.getElementById('main-menu');
const levelSelectEl = document.getElementById('level-select-screen');
const unitSelectEl = document.getElementById('unit-select-screen');
const levelGridEl = document.getElementById('level-grid');
const gasCountTextEl = document.getElementById('gas-count-text');
const speedIndicatorEl = document.getElementById('speed-indicator');
const currentLevelLabelEl = document.getElementById('current-level-label');
const gasRateLabelEl = document.getElementById('gas-rate-label');

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
// HIỂN THỊ BẢNG CHỌN 15 MAP
// ============================================================================
function renderLevelGrid() {
    levelGridEl.innerHTML = '';
    LEVELS.forEach(cfg => {
        const cell = document.createElement('button');
        cell.className = 'level-cell' + (completedLevels.has(cfg.level) ? ' completed' : '');

        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 96;
        miniCanvas.height = 128;
        miniCanvas.className = 'level-cell-canvas pixel-art';
        const mCtx = miniCanvas.getContext('2d');
        renderMap1To15(mCtx, miniCanvas.width, miniCanvas.height, cfg.level, true);

        const waterTag = document.createElement('span');
        waterTag.className = 'level-water-tag';
        waterTag.textContent = cfg.hasWater ? '🌊' : '⛰️';

        const nameBar = document.createElement('span');
        nameBar.className = 'level-name-bar';
        nameBar.textContent = cfg.name;

        const numBadge = document.createElement('span');
        numBadge.className = 'level-num-corner';
        numBadge.textContent = cfg.level;

        cell.appendChild(miniCanvas);
        cell.appendChild(waterTag);
        cell.appendChild(nameBar);
        cell.appendChild(numBadge);

        cell.addEventListener('click', () => {
            sfx.play('spawn');
            openUnitSelectForLevel(cfg.level);
        });
        levelGridEl.appendChild(cell);
    });
}

window.openLevelSelect = function() {
    game.inMenu = true;
    document.getElementById('win-panel').classList.remove('active');
    document.getElementById('lose-panel').classList.remove('active');
    mainMenuEl.classList.remove('active');
    unitSelectEl.classList.remove('active');
    renderLevelGrid();
    levelSelectEl.classList.add('active');
};

window.openUnitSelectForLevel = function(levelNum) {
    pendingSelectLevel = levelNum;
    const cfg = LEVELS[levelNum - 1] || LEVELS[0];

    if (!cfg.hasWater) {
        selectedDeckIds = selectedDeckIds.filter(id => {
            const u = UNIT_BY_ID[id];
            return u && !u.isNaval;
        });
        if (selectedDeckIds.length === 0) {
            selectedDeckIds = ['infantry', 'bazooka', 'tank', 'airstrike'];
        }
    }

    game.inMenu = true;
    document.getElementById('win-panel').classList.remove('active');
    document.getElementById('lose-panel').classList.remove('active');
    mainMenuEl.classList.remove('active');
    levelSelectEl.classList.remove('active');

    renderUnitSelectionUI();
    unitSelectEl.classList.add('active');
};

function renderUnitSelectionUI() {
    const cfg = LEVELS[pendingSelectLevel - 1] || LEVELS[0];
    document.getElementById('select-map-num').textContent = `MAP ${cfg.level}`;
    document.getElementById('select-map-title').textContent = cfg.name;

    const waterBadge = document.getElementById('select-map-water-badge');
    if (cfg.hasWater) {
        waterBadge.className = 'water-status-badge has-water mt-1';
        waterBadge.textContent = '🌊 CÓ NƯỚC: Thuyền đi dưới nước, Bộ binh phải qua cầu';
    } else {
        waterBadge.className = 'water-status-badge no-water mt-1';
        waterBadge.textContent = '🚫 KHÔNG CÓ NƯỚC: Thuyền bị khóa, Bộ binh lách vật cản';
    }

    document.getElementById('select-map-desc').textContent = cfg.desc;
    const stars = '★'.repeat(Math.min(5, Math.ceil(cfg.level / 3))) + '☆'.repeat(5 - Math.min(5, Math.ceil(cfg.level / 3)));
    document.getElementById('select-map-stats').textContent = `HP Pháo đài Đỏ: ${cfg.enemyBaseHp} | Độ khó: ${stars}`;

    renderMapPreviewThumb(cfg.level);

    const slotsContainer = document.getElementById('selected-deck-slots');
    slotsContainer.innerHTML = '';
    document.getElementById('deck-count-badge').textContent = `${selectedDeckIds.length} / 4`;

    for (let i = 0; i < 4; i++) {
        const unitId = selectedDeckIds[i];
        const card = document.createElement('div');

        if (unitId && UNIT_BY_ID[unitId]) {
            const u = UNIT_BY_ID[unitId];
            const eff = getEffectiveUnitStats(u, true);
            const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';
            card.className = 'deck-slot-card';
            card.innerHTML = `
                <div class="deck-slot-remove">✕</div>
                <div class="text-[8.5px] font-bold text-sky-200 truncate w-full text-center">${u.name}</div>
                <img src="${spriteUrl}" class="w-6 h-6 pixel-art" alt="${u.name}" />
                <div class="rng-mini-tag">🎯${u.isAirstrike ? 'Map' : eff.range + ' (' + eff.mode.shortTag + ')'}</div>
                <div class="flex items-center justify-between w-full px-1 text-[8px] font-extrabold">
                    <span class="text-rose-300">⚔️${u.damage}</span>
                    <span class="text-amber-300">⛽${u.cost}</span>
                </div>
            `;
            card.addEventListener('click', () => {
                selectedDeckIds.splice(i, 1);
                sfx.play('gas');
                renderUnitSelectionUI();
            });
        } else {
            card.className = 'deck-slot-card empty';
            card.innerHTML = `<span>+ Ô trống ${i + 1}</span>`;
        }
        slotsContainer.appendChild(card);
    }

    const rosterGrid = document.getElementById('unit-roster-grid');
    rosterGrid.innerHTML = '';

    UNIT_CATALOG.forEach(u => {
        const isSelected = selectedDeckIds.includes(u.id);
        const isLockedByWater = u.isNaval && !cfg.hasWater;
        const eff = getEffectiveUnitStats(u, true);
        const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';

        const item = document.createElement('div');
        item.className = 'roster-card' +
            (isSelected ? ' selected' : '') +
            (isLockedByWater ? ' disabled-water' : '');

        const rangeBtnHtml = u.isAirstrike
            ? `<span class="text-[8.5px] text-sky-300 font-bold">🎯 Toàn bản đồ</span>`
            : `<button type="button" class="range-opt-btn bg-slate-800 hover:bg-sky-900 border border-sky-400/60 text-sky-200 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded transition" title="Chạm để đổi tùy chọn tầm bắn">
                   🎯 ${getRangeCategoryLabel(eff.range)} • ${eff.mode.shortTag} ⟳
               </button>`;

        item.innerHTML = `
            <img src="${spriteUrl}" class="w-9 h-9 pixel-art flex-shrink-0" alt="${u.name}" />
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-extrabold text-white truncate">${u.name}</span>
                    <span class="bg-amber-400/20 border border-amber-400 text-amber-300 text-[9.5px] font-extrabold px-1.5 rounded-full flex items-center gap-0.5">
                        ⛽ ${u.cost}
                    </span>
                </div>
                <div class="text-[8.5px] text-sky-300 font-semibold truncate">${u.role}</div>
                <div class="flex items-center gap-2 mt-0.5 text-[9px] font-bold">
                    <span class="text-rose-400">⚔️ ${u.damage}</span>
                    <span class="text-emerald-400">${u.isAirstrike ? '💥 Nhà: ' + u.baseDamage : '❤️ ' + u.hp}</span>
                </div>
                <div class="mt-0.5">${rangeBtnHtml}</div>
            </div>
            ${isLockedByWater ? '<div class="water-ban-badge">🚫 MAP KHÔNG CÓ NƯỚC</div>' : ''}
        `;

        const rangeBtn = item.querySelector('.range-opt-btn');
        if (rangeBtn) {
            rangeBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                unitRangeSelection[u.id] = ((unitRangeSelection[u.id] ?? 1) + 1) % RANGE_MODES.length;
                sfx.play('upgrade');
                renderUnitSelectionUI();
                renderBattleDeckButtons();
            });
        }

        item.addEventListener('click', () => {
            if (isLockedByWater) {
                sfx.play('cannon');
                return;
            }
            const existingIdx = selectedDeckIds.indexOf(u.id);
            if (existingIdx !== -1) {
                selectedDeckIds.splice(existingIdx, 1);
                sfx.play('gas');
            } else {
                if (selectedDeckIds.length >= 4) {
                    selectedDeckIds.shift();
                }
                selectedDeckIds.push(u.id);
                sfx.play('spawn');
            }
            renderUnitSelectionUI();
        });

        rosterGrid.appendChild(item);
    });
}

document.getElementById('btn-auto-deck').addEventListener('click', () => {
    const cfg = LEVELS[pendingSelectLevel - 1] || LEVELS[0];
    if (cfg.hasWater) {
        selectedDeckIds = ['infantry', 'gunboat', 'destroyer', 'airstrike'];
    } else {
        selectedDeckIds = ['infantry', 'humvee', 'tank', 'rocket'];
    }
    sfx.play('upgrade');
    renderUnitSelectionUI();
});

document.getElementById('btn-start-battle').addEventListener('click', () => {
    if (selectedDeckIds.length === 0) {
        alert('Vui lòng chọn ít nhất 1 nhân vật để ra trận!');
        return;
    }
    startLevel(pendingSelectLevel);
});

document.getElementById('btn-open-levels').addEventListener('click', () => {
    sfx.play('spawn');
    openLevelSelect();
});

document.getElementById('btn-back-menu').addEventListener('click', () => {
    levelSelectEl.classList.remove('active');
    mainMenuEl.classList.add('active');
});

document.getElementById('btn-back-levels').addEventListener('click', () => {
    unitSelectEl.classList.remove('active');
    openLevelSelect();
});

document.getElementById('menu-return-btn').addEventListener('click', () => {
    openLevelSelect();
});

document.getElementById('deck-reselect-btn').addEventListener('click', () => {
    openUnitSelectForLevel(game.currentLevel);
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

// ============================================================================
// KHỞI TẠO TRẬN ĐẤU VÀ 4 NÚT GỌI QUÂN TRONG TRẬN
// ============================================================================
function renderBattleDeckButtons() {
    const container = document.getElementById('battle-deck-slots');
    if (!container) return;
    container.innerHTML = '';

    const gasUrl = atlas.ready ? atlas.toDataURL(12, 10) : '';
    const lockUrl = atlas.ready ? atlas.toDataURL(13, 10) : '';

    for (let i = 0; i < 4; i++) {
        const unitId = selectedDeckIds[i];
        const btn = document.createElement('div');

        if (unitId && UNIT_BY_ID[unitId]) {
            const u = UNIT_BY_ID[unitId];
            const eff = getEffectiveUnitStats(u, true);
            const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';
            btn.id = `btnSlot${i}`;
            btn.className = 'unit-btn' + (u.isNaval ? ' naval-btn' : '');
            btn.innerHTML = `
                <div class="text-[8.5px] font-bold text-sky-200 uppercase tracking-tight truncate w-full text-center px-0.5">${u.name}</div>
                <div class="flex flex-col items-center justify-center">
                    <img src="${spriteUrl}" class="w-6 h-6 pixel-art" alt="${u.name}" />
                    <span class="dmg-mini-tag">⚔️DMG ${u.damage}</span>
                    <span class="rng-mini-tag">🎯${u.isAirstrike ? 'Map' : eff.range}</span>
                </div>
                <div class="cost-badge">
                    <img src="${gasUrl}" class="gas-inline-sprite w-2.5 h-2.5 pixel-art" alt="Gas" />
                    <span>${u.cost}</span>
                </div>
                <div id="blockSlot${i}" class="lock-overlay">
                    <img src="${lockUrl}" class="lock-sprite w-4 h-4 pixel-art mb-0.5" alt="Lock" />
                    <div class="flex items-center gap-0.5">
                        <span class="text-[9px] font-bold text-amber-400">${u.cost}</span>
                        <img src="${gasUrl}" class="gas-inline-sprite w-2.5 h-2.5 pixel-art" alt="Gas" />
                    </div>
                </div>
            `;
            btn.addEventListener('click', () => buyUnitFromSlot(i));
        } else {
            btn.className = 'unit-btn empty-slot-btn';
            btn.innerHTML = `<span class="text-[9px] text-slate-500 font-bold m-auto">TRỐNG</span>`;
        }

        container.appendChild(btn);
    }
}

function startLevel(levelNum) {
    const cfg = LEVELS[levelNum - 1] || LEVELS[0];
    game.currentLevel = cfg.level;
    game.inMenu = false;
    game.paused = false;
    game.gameOver = false;
    game.elapsedTime = 0;

    game.gasUpgradeIndex = 0;
    game.gasInterval = GAS_UPGRADE_LEVELS[0].interval;
    game.gasTimer = game.gasInterval;
    game.gasCount = cfg.startingGas;
    game.rallyX = null;

    game.blueBase.maxHp = cfg.playerBaseHp;
    game.blueBase.hp = cfg.playerBaseHp;
    game.redBase.maxHp = cfg.enemyBaseHp;
    game.redBase.hp = cfg.enemyBaseHp;

    game.aiGas = 3;
    game.aiGasTimer = 0;
    game.aiDecisionTimer = 1.2;
    game.aiPlaneTimer = cfg.aiPlaneInterval;

    game.units = [];
    game.bullets = [];
    game.planes = [];
    game.particles = [];
    game.floatingTexts = [];
    game.stats.spawned = 0;
    game.stats.kills = 0;

    mainMenuEl.classList.remove('active');
    levelSelectEl.classList.remove('active');
    unitSelectEl.classList.remove('active');
    document.getElementById('win-panel').classList.remove('active');
    document.getElementById('lose-panel').classList.remove('active');
    document.getElementById('pause-btn').textContent = '⏸';

    currentLevelLabelEl.textContent = `MAP ${cfg.level}`;

    buildStaticMapCanvas(cfg.level);
    renderBattleDeckButtons();

    for (let i = 0; i < cfg.initialRedUnits; i++) {
        let unitId = 'infantry';
        if (cfg.hasWater && i === 0 && cfg.level >= 4) {
            unitId = 'gunboat';
        } else if (i === cfg.initialRedUnits - 1 && cfg.level >= 3) {
            unitId = 'tank';
        }
        const gateSpread = 160;
        const rx = (LOGICAL_WIDTH / 2 - gateSpread / 2) + Math.random() * gateSpread;
        const offsetY = 110 + i * 22;
        spawnUnitBySpec('red', UNIT_BY_ID[unitId], rx, offsetY);
    }

    sfx.play('spawn');
    updateControllerUI();
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
    if (game.inMenu || game.gameOver || game.paused) return;
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
    speedIndicatorEl.textContent = `${game.gasInterval}s/bình`;
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

    for (let i = 0; i < 4; i++) {
        const unitId = selectedDeckIds[i];
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
    if (game.inMenu || game.gameOver || game.paused) return;
    game.gasTimer -= 0.35;
    sfx.play('gas');
    addFloatingText(80, PLAYFIELD_HEIGHT - 18, '+NẠP ⚡', '#4ade80', 12);
    if (game.gasTimer <= 0.0) {
        timerEnded();
    }
    updateControllerUI();
});

window.buyUnitFromSlot = function(slotIndex) {
    if (game.inMenu || game.gameOver || game.paused) return;
    const unitId = selectedDeckIds[slotIndex];
    if (!unitId || !UNIT_BY_ID[unitId]) return;

    const spec = UNIT_BY_ID[unitId];
    if (game.gasCount < spec.cost) return;

    game.gasCount -= spec.cost;
    game.stats.spawned++;

    if (spec.isAirstrike) {
        attackPlane('blue', spec);
    } else {
        spawnUnitBySpec('blue', spec);
        sfx.play('spawn');
    }
    updateControllerUI();
};

function spawnUnitBySpec(team, spec, customX = null, customY = null) {
    if (!spec) return;
    const isBlue = team === 'blue';
    const base = isBlue ? game.blueBase : game.redBase;
    const eff = getEffectiveUnitStats(spec, isBlue);

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
        hp: spec.hp,
        maxHp: spec.hp,
        moveSpeed: eff.speed + (Math.random() * 3 - 1.5),
        damage: spec.damage,
        targetTime: 0.35,
        fireRate: eff.fireRate,
        beamActiveTimer: 0,
        muzzleFlashTimer: 0,
        shoot: false,
        lastTargetX: null,
        lastTargetY: null,
        range: eff.range,
        rangeModeTag: eff.mode.shortTag,
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
    sfx.play('airstrike');

    game.planes.push({
        team: team,
        spriteRow: isBlue ? 7 : 8,
        x: LOGICAL_WIDTH / 2,
        y: isBlue ? PLAYFIELD_HEIGHT + 55 : -55,
        vy: isBlue ? -350 : 350,
        unitDamage: spec.damage || 14,
        baseDamage: spec.baseDamage || 20,
        hitEntities: new Set()
    });

    addFloatingText(
        LOGICAL_WIDTH / 2,
        isBlue ? PLAYFIELD_HEIGHT - 120 : 120,
        isBlue ? `✈️ KHÔNG KÍCH XANH (-${spec.damage} DMG)!` : '⚠️ PHI ĐỘI ĐỎ OANH TẠC!',
        isBlue ? '#38bdf8' : '#f87171',
        15
    );
}

function updateEnemyAI(dt) {
    const cfg = LEVELS[game.currentLevel - 1] || LEVELS[0];

    game.aiGasTimer += dt;
    if (game.aiGasTimer >= cfg.aiGasInterval) {
        game.aiGasTimer -= cfg.aiGasInterval;
        game.aiGas = Math.min(30, game.aiGas + 1);
    }

    game.aiPlaneTimer -= dt;
    if (game.aiPlaneTimer <= 0) {
        game.aiPlaneTimer = cfg.aiPlaneInterval;
        if (game.currentLevel >= 3) {
            attackPlane('red', UNIT_BY_ID['airstrike']);
        }
    }

    game.aiDecisionTimer -= dt;
    if (game.aiDecisionTimer <= 0) {
        game.aiDecisionTimer = 0.9 + Math.random() * 0.7;

        const candidates = UNIT_CATALOG.filter(u => {
            if (u.isAirstrike) return false;
            if (u.isNaval && !cfg.hasWater) return false;
            if (u.cost > 6 && game.currentLevel < 4) return false;
            if (u.cost > 8 && game.currentLevel < 8) return false;
            return u.cost <= game.aiGas;
        });

        if (candidates.length > 0) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            game.aiGas -= pick.cost;
            spawnUnitBySpec('red', pick);
        }
    }
}

// ============================================================================
// TÌM MỤC TIÊU THEO ĐÚNG BÁN KÍNH TẦM BẮN THỰC TẾ (TRÒN 360 ĐỘ)
// ============================================================================
function findTargetForUnit(unit) {
    const enemyTeam = unit.team === 'blue' ? 'red' : 'blue';
    const enemyBase = unit.team === 'blue' ? game.redBase : game.blueBase;

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

    const halfW = enemyBase.width * 0.5;
    const halfH = enemyBase.height * 0.5;
    const clampedX = Math.max(enemyBase.x - halfW, Math.min(unit.x, enemyBase.x + halfW));
    const clampedY = Math.max(enemyBase.y - halfH, Math.min(unit.y, enemyBase.y + halfH));
    const distToBase = Math.hypot(unit.x - clampedX, unit.y - clampedY);

    if (distToBase <= unit.range) {
        return { isBase: true, entity: enemyBase, hitX: clampedX, hitY: clampedY };
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
// CẬP NHẬT DI CHUYỂN TRÁNH VẬT CẢN, ĐI QUA CẦU & ANIMATION CHIẾN ĐẤU
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
            if (u.team === 'red') game.stats.kills++;
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
            const dir = u.team === 'blue' ? -1 : 1;
            let moveDirX = 0;
            let moveDirY = dir;

            if (u.isAir) {
                const goalX = LOGICAL_WIDTH / 2;
                const goalY = u.team === 'blue' ? game.redBase.y : game.blueBase.y;
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
        const enemyBase = b.team === 'blue' ? game.redBase : game.blueBase;
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

            if (!hitSomething) {
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
        const enemyBase = plane.team === 'blue' ? game.redBase : game.blueBase;

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

        if (!plane.hitEntities.has('base') && Math.abs(enemyBase.y - plane.y) <= 34) {
            plane.hitEntities.add('base');
            enemyBase.hp = Math.max(0, enemyBase.hp - plane.baseDamage);
            spawnExplosion(enemyBase.x, enemyBase.y, '#ef4444', 28, 52);
            addFloatingText(enemyBase.x, enemyBase.y, `-${plane.baseDamage} 💥`, '#ef4444', 17);
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

function checkGameOver() {
    if (game.gameOver) return;

    if (game.redBase.hp <= 0) {
        game.redBase.hp = 0;
        game.gameOver = true;
        completedLevels.add(game.currentLevel);
        spawnExplosion(game.redBase.x, game.redBase.y, '#ef4444', 45, 70);
        sfx.play('boom');

        const cfg = LEVELS[game.currentLevel - 1];
        document.getElementById('win-subtitle').textContent = `Chinh phục Map ${game.currentLevel}: ${cfg ? cfg.name : ''}!`;
        document.getElementById('win-time').textContent = formatTime(game.elapsedTime);
        document.getElementById('win-hp').textContent = `${Math.ceil(game.blueBase.hp)} / ${game.blueBase.maxHp}`;
        document.getElementById('win-spawned').textContent = game.stats.spawned;
        document.getElementById('win-kills').textContent = game.stats.kills;
        document.getElementById('win-panel').classList.add('active');
        updateControllerUI();
    } else if (game.blueBase.hp <= 0) {
        game.blueBase.hp = 0;
        game.gameOver = true;
        spawnExplosion(game.blueBase.x, game.blueBase.y, '#3b82f6', 45, 70);
        sfx.play('boom');

        document.getElementById('lose-time').textContent = formatTime(game.elapsedTime);
        document.getElementById('lose-hp').textContent = `${Math.ceil(game.redBase.hp)} / ${game.redBase.maxHp}`;
        document.getElementById('lose-spawned').textContent = game.stats.spawned;
        document.getElementById('lose-kills').textContent = game.stats.kills;
        document.getElementById('lose-panel').classList.add('active');
        updateControllerUI();
    }
}

window.restartGame = function() {
    startLevel(game.currentLevel);
};

window.nextOrRestartLevel = function() {
    const nextLv = game.currentLevel < LEVELS.length ? game.currentLevel + 1 : 1;
    openUnitSelectForLevel(nextLv);
};

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

function drawBase(base) {
    const isBlue = base.team === 'blue';
    const bRow = isBlue ? 2 : (game.currentLevel === 10 ? 4 : 3);
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

        ctx.strokeStyle = isBlue ? '#38bdf8' : '#f87171';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (atlas.ready) {
            atlas.draw(ctx, buildingCols[idx], bRow, bx, by, 44, 44);
        }
    });

    if (atlas.ready) {
        const wave = Math.sin(performance.now() * 0.006) * 0.08;
        const flagY = isBlue ? y - 4 : y + base.height + 4;
        atlas.draw(ctx, 16, bRow, x + 16, flagY, 24, 24, { rotation: wave });
        atlas.draw(ctx, 17, bRow, x + base.width - 16, flagY, 24, 24, { rotation: -wave });
    }

    const barW = 210;
    const barH = 18;
    const barX = base.x - barW / 2;
    const barY = isBlue ? y - 16 : y + base.height - 2;
    const hpRatio = Math.max(0, base.hp / base.maxHp);

    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();

    ctx.fillStyle = isBlue ? '#38bdf8' : '#f43f5e';
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
        `${isBlue ? 'CĂN CỨ XANH' : 'PHÁO ĐÀI ĐỎ'}: ${Math.ceil(base.hp)} / ${base.maxHp}`,
        base.x + 6,
        barY + barH / 2 + 0.5
    );

    ctx.restore();
}

// ============================================================================
// VẼ NHÂN VẬT VỚI ANIMATION RIÊNG BIỆT & VÒNG TẦM BẮN TÙY CHỌN
// ============================================================================
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

let lastFrameTime = performance.now();

function gameLoop(now) {
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (!game.inMenu && !game.paused && !game.gameOver) {
        game.elapsedTime += dt;

        game.gasTimer -= dt;
        if (game.gasTimer <= 0.0) {
            timerEnded();
        }
        updateControllerUI();

        updateEnemyAI(dt);
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
    drawBase(game.redBase);
    drawBase(game.blueBase);
    drawUnits();
    drawBullets();
    drawPlanes();
    drawEffects();

    if (game.paused && !game.gameOver && !game.inMenu) {
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
    if (game.inMenu || game.gameOver || game.paused) return;
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

window.addEventListener('keydown', (e) => {
    if (game.inMenu) return;
    if (e.key === '1') buyUnitFromSlot(0);
    if (e.key === '2') buyUnitFromSlot(1);
    if (e.key === '3') buyUnitFromSlot(2);
    if (e.key === '4') buyUnitFromSlot(3);
    if (e.key.toLowerCase() === 'u') upgradeGasRate();
    if (e.code === 'Space') {
        e.preventDefault();
        document.getElementById('gas-generator-btn').click();
    }
});

document.getElementById('sound-btn').addEventListener('click', (e) => {
    sfx.enabled = !sfx.enabled;
    e.currentTarget.textContent = sfx.enabled ? '🔊' : '🔇';
});

document.getElementById('pause-btn').addEventListener('click', (e) => {
    if (game.inMenu || game.gameOver) return;
    game.paused = !game.paused;
    e.currentTarget.textContent = game.paused ? '▶' : '⏸';
});

window.onload = function() {
    buildStaticMapCanvas(1);
    renderLevelGrid();
    renderBattleDeckButtons();
    updateControllerUI();
    requestAnimationFrame(gameLoop);
};