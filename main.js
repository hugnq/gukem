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

// ============================================================================
// ĐỊNH NGHĨA 15 MAP THEO ĐÚNG ẢNH "15 maps.png" (3 CỘT x 5 HÀNG)
// ============================================================================
const MAPS_DATA = [
    {
        level: 1,
        name: 'Cầu Qua Sông',
        hasWater: true,
        waterZones: [{ x: 0, y: 310, w: 420, h: 95 }],
        bridgeLanes: [210],
        desc: 'Sông lớn cắt ngang chiến trường với cây cầu trung tâm.'
    },
    {
        level: 2,
        name: 'Đường Đèo Rừng Thông',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [210],
        desc: 'Đường đèo uốn lượn chữ S xuyên qua rừng thông và núi đá.'
    },
    {
        level: 3,
        name: 'Đại Lộ Đô Thị',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [90, 210, 330],
        desc: 'Đường phố đô thị chia ô vuông với nhiều tòa nhà cao tầng.'
    },
    {
        level: 4,
        name: 'Pháo Đài Hồ Nước',
        hasWater: true,
        waterZones: [
            { x: 25, y: 150, w: 120, h: 410 },
            { x: 275, y: 150, w: 120, h: 410 }
        ],
        bridgeLanes: [210],
        desc: 'Hồ nước bao quanh pháo đài đảo giữa cùng 2 cầu gỗ.'
    },
    {
        level: 5,
        name: 'Mê Cung Rừng Rậm',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [130, 210, 290],
        desc: 'Mạng lưới đường rừng nhiều nhánh rẽ hiểm trở.'
    },
    {
        level: 6,
        name: 'Khu Công Nghiệp',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [95, 210, 325],
        desc: 'Khu nhà máy công nghiệp nặng với mặt đường bê tông.'
    },
    {
        level: 7,
        name: 'Hồ Đôi Vách Đá',
        hasWater: true,
        waterZones: [
            { x: 65, y: 185, w: 230, h: 130 },
            { x: 125, y: 395, w: 230, h: 130 }
        ],
        bridgeLanes: [210],
        desc: 'Hai hồ nước lớn nằm kẹp giữa đường đèo và vách núi đá.'
    },
    {
        level: 8,
        name: 'Hẻm Núi Đá Hiểm Trở',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [210],
        desc: 'Đường độc đạo xuyên qua hẻm núi đá dựng đứng.'
    },
    {
        level: 9,
        name: 'Vòng Xoay Thị Trấn',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [110, 210, 310],
        desc: 'Hai vòng xoay giao thông bao quanh khu dân cư.'
    },
    {
        level: 10,
        name: 'Bờ Biển Cát Vàng',
        hasWater: true,
        waterZones: [{ x: 0, y: 100, w: 135, h: 520 }],
        bridgeLanes: [240, 310],
        desc: 'Biển rộng phía Tây, bãi cát vàng ở giữa và dãy núi phía Đông.'
    },
    {
        level: 11,
        name: 'Căn Cứ Tên Lửa',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [100, 210, 320],
        desc: 'Tổ hợp quân sự kiên cố với bệ phóng tên lửa và radar.'
    },
    {
        level: 12,
        name: 'Thành Cổ Kiên Cố',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [105, 210, 315],
        desc: 'Vòng tường thành đá bao quanh pháo đài trung tâm.'
    },
    {
        level: 13,
        name: 'Quần Đảo Cầu Gỗ',
        hasWater: true,
        waterZones: [
            { x: 0, y: 150, w: 420, h: 420 }
        ],
        bridgeLanes: [95, 210, 325],
        desc: 'Quần đảo ngập nước nối liền bằng hệ thống 10 cây cầu gỗ.'
    },
    {
        level: 14,
        name: 'Vòng Xoay Hồ Trung Tâm',
        hasWater: true,
        waterZones: [{ x: 145, y: 295, w: 130, h: 125 }],
        bridgeLanes: [110, 210, 310],
        desc: 'Đường cao tốc hình tròn ôm trọn hồ nước giữa rừng thông.'
    },
    {
        level: 15,
        name: 'Chiến Tuyến Phòng Thủ',
        hasWater: false,
        waterZones: [],
        bridgeLanes: [105, 210, 315],
        desc: 'Hai lớp tường thành đá kiên cố chắn ngang chiến trường.'
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
// DANH SÁCH BINH CHỦNG (GIÁ XĂNG TƯƠNG ỨNG VỚI SÁT THƯƠNG)
// ============================================================================
const UNIT_CATALOG = [
    {
        id: 'infantry',
        name: 'Bộ Binh',
        role: 'Bộ binh',
        spriteCol: 16,
        damage: 2,
        cost: 2,
        hp: 8,
        speed: 52,
        fireRate: 0.95,
        range: 46,
        radius: 13,
        attackType: 'beam',
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'bazooka',
        name: 'Lính Tên Lửa',
        role: 'Chống tăng',
        spriteCol: 17,
        damage: 3,
        cost: 3,
        hp: 10,
        speed: 45,
        fireRate: 1.15,
        range: 95,
        radius: 14,
        attackType: 'bullet',
        projSpeed: 230,
        projRadius: 5,
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'humvee',
        name: 'Xe Thiết Giáp',
        role: 'Cơ giới',
        spriteCol: 5,
        damage: 4,
        cost: 4,
        hp: 15,
        speed: 62,
        fireRate: 1.0,
        range: 110,
        radius: 16,
        attackType: 'bullet',
        projSpeed: 260,
        projRadius: 5,
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'apc',
        name: 'Pháo Tự Hành',
        role: 'Thiết giáp',
        spriteCol: 7,
        damage: 5,
        cost: 5,
        hp: 19,
        speed: 40,
        fireRate: 1.2,
        range: 145,
        radius: 17,
        attackType: 'bullet',
        projSpeed: 250,
        projRadius: 6,
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'gunboat',
        name: 'Thuyền Tuần Tra',
        role: 'Thủy quân 🌊',
        spriteCol: 15,
        damage: 5,
        cost: 5,
        hp: 20,
        speed: 50,
        fireRate: 1.05,
        range: 165,
        radius: 17,
        attackType: 'bullet',
        projSpeed: 270,
        projRadius: 6,
        isNaval: true,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'tank',
        name: 'Xe Tăng Nặng',
        role: 'Chủ lực',
        spriteCol: 8,
        damage: 6,
        cost: 6,
        hp: 26,
        speed: 35,
        fireRate: 1.25,
        range: 155,
        radius: 19,
        attackType: 'bullet',
        projSpeed: 250,
        projRadius: 6.5,
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'heli',
        name: 'Trực Thăng',
        role: 'Không quân',
        spriteCol: 11,
        damage: 7,
        cost: 7,
        hp: 20,
        speed: 58,
        fireRate: 1.1,
        range: 140,
        radius: 17,
        attackType: 'bullet',
        projSpeed: 280,
        projRadius: 6,
        isNaval: false,
        isAir: true,
        isAirstrike: false
    },
    {
        id: 'destroyer',
        name: 'Tàu Khu Trục',
        role: 'Thủy quân 🌊',
        spriteCol: 13,
        damage: 8,
        cost: 8,
        hp: 30,
        speed: 38,
        fireRate: 1.2,
        range: 190,
        radius: 19,
        attackType: 'bullet',
        projSpeed: 280,
        projRadius: 7,
        isNaval: true,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'rocket',
        name: 'Pháo Phản Lực',
        role: 'Pháo binh',
        spriteCol: 9,
        damage: 9,
        cost: 9,
        hp: 22,
        speed: 32,
        fireRate: 1.45,
        range: 205,
        radius: 18,
        attackType: 'bullet',
        projSpeed: 290,
        projRadius: 7.5,
        isNaval: false,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'battleship',
        name: 'Chiến Hạm Lớn',
        role: 'Thủy quân 🌊',
        spriteCol: 14,
        damage: 11,
        cost: 11,
        hp: 40,
        speed: 30,
        fireRate: 1.35,
        range: 215,
        radius: 21,
        attackType: 'bullet',
        projSpeed: 300,
        projRadius: 8,
        isNaval: true,
        isAir: false,
        isAirstrike: false
    },
    {
        id: 'airstrike',
        name: 'Không Kích',
        role: 'Oanh tạc ✈️',
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
        isNaval: false,
        isAir: true,
        isAirstrike: true
    }
];

const UNIT_BY_ID = {};
UNIT_CATALOG.forEach(u => { UNIT_BY_ID[u.id] = u; });

// ============================================================================
// QUẢN LÝ ATLAS SPRITE ("Preview.png") VÀ ẢNH 15 BẢN ĐỒ ("15 maps.png")
// ============================================================================
class SpriteAtlas {
    constructor() {
        this.ready = false;
        this.mapsImageReady = false;
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

        this.mapsSheet = new Image();
        this.mapsSheet.src = '15 maps.png';
        this.mapsSheet.onload = () => {
            this.mapsImageReady = true;
            buildStaticMapCanvas(game.currentLevel);
            renderMapPreviewThumb(pendingSelectLevel);
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

const canvas = document.getElementById('battleCanvas');
const ctx = canvas.getContext('2d');

const LOGICAL_WIDTH = 420;
const LOGICAL_HEIGHT = 840;
const BOTTOM_UI_HEIGHT = 126;
const PLAYFIELD_HEIGHT = LOGICAL_HEIGHT - BOTTOM_UI_HEIGHT;

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
// Đội hình tối đa 4 nhân vật người chơi chọn
let selectedDeckIds = ['infantry', 'bazooka', 'tank', 'airstrike'];

let game = {
    inMenu: true,
    paused: false,
    gameOver: false,
    currentLevel: 1,
    elapsedTime: 0,

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

// ============================================================================
// VẼ 15 BẢN ĐỒ TỪ FILE "15 maps.png" (HOẶC DỰNG TỪ TILES NẾU CHƯA TẢI XONG)
// ============================================================================
function drawMapFromSheetOrProcedural(targetCtx, targetW, targetH, levelNum) {
    const idx = Math.max(0, Math.min(14, levelNum - 1));
    const col = idx % 3;
    const row = Math.floor(idx / 3);

    if (atlas.mapsImageReady && atlas.mapsSheet.naturalWidth > 0) {
        const sheetW = atlas.mapsSheet.naturalWidth;
        const sheetH = atlas.mapsSheet.naturalHeight;
        const cellW = sheetW / 3;
        const cellH = sheetH / 5;
        const borderPad = Math.max(3, Math.round(cellW * 0.015));

        const sx = col * cellW + borderPad;
        const sy = row * cellH + borderPad;
        const sw = cellW - borderPad * 2;
        const sh = cellH - borderPad * 2;

        targetCtx.save();
        targetCtx.imageSmoothingEnabled = false;
        // Lật dọc ảnh ô map để Pháo đài Đỏ ở phía trên và Căn cứ Xanh ở phía dưới khớp chiều quân chạy
        targetCtx.translate(0, targetH);
        targetCtx.scale(1, -1);
        targetCtx.drawImage(atlas.mapsSheet, sx, sy, sw, sh, 0, 0, targetW, targetH);
        targetCtx.restore();
        return;
    }

    // Fallback dựng bằng Tile từ Preview.png nếu 15 maps.png chưa sẵn sàng
    targetCtx.fillStyle = '#58a846';
    targetCtx.fillRect(0, 0, targetW, targetH);
    if (!atlas.ready) return;

    const TILE = 30;
    const cols = Math.ceil(targetW / TILE);
    const rows = Math.ceil(targetH / TILE);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tile = atlas.get((r + c) % 3, 0);
            if (tile) targetCtx.drawImage(tile, c * TILE, r * TILE, TILE, TILE);
        }
    }

    const mapCfg = LEVELS[idx];
    if (mapCfg && mapCfg.waterZones) {
        targetCtx.fillStyle = '#38bdf8';
        for (const wz of mapCfg.waterZones) {
            const scaleX = targetW / LOGICAL_WIDTH;
            const scaleY = targetH / PLAYFIELD_HEIGHT;
            targetCtx.fillRect(wz.x * scaleX, wz.y * scaleY, wz.w * scaleX, wz.h * scaleY);
        }
    }
}

function buildStaticMapCanvas(levelNum = game.currentLevel) {
    const off = document.createElement('canvas');
    off.width = LOGICAL_WIDTH;
    off.height = PLAYFIELD_HEIGHT;
    const mCtx = off.getContext('2d');
    mCtx.imageSmoothingEnabled = false;

    drawMapFromSheetOrProcedural(mCtx, LOGICAL_WIDTH, PLAYFIELD_HEIGHT, levelNum);
    atlas.bakedMapCanvas = off;
}

function renderMapPreviewThumb(levelNum) {
    const thumbCanvas = document.getElementById('selected-map-preview');
    if (!thumbCanvas) return;
    const tCtx = thumbCanvas.getContext('2d');
    tCtx.imageSmoothingEnabled = false;
    tCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    drawMapFromSheetOrProcedural(tCtx, thumbCanvas.width, thumbCanvas.height, levelNum);
}

function isPointInWater(x, y, levelNum = game.currentLevel) {
    const cfg = LEVELS[levelNum - 1];
    if (!cfg || !cfg.hasWater) return false;
    for (const wz of cfg.waterZones) {
        if (x >= wz.x && x <= wz.x + wz.w && y >= wz.y && y <= wz.y + wz.h) {
            return true;
        }
    }
    return false;
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
// MÀN HÌNH CHỌN 15 MAP & UI CHỌN NHÂN VẬT ĐẦU TRẬN
// ============================================================================
function renderLevelGrid() {
    levelGridEl.innerHTML = '';
    LEVELS.forEach(cfg => {
        const cell = document.createElement('button');
        cell.className = 'level-cell' + (completedLevels.has(cfg.level) ? ' completed' : '');
        cell.innerHTML = `
            <span class="level-water-tag" title="${cfg.hasWater ? 'Bản đồ có nước' : 'Không có nước'}">${cfg.hasWater ? '🌊' : '⛰️'}</span>
            <span class="level-num-badge">MAP ${cfg.level}</span>
            <span class="level-map-name">${cfg.name}</span>
            <span class="level-stars">${completedLevels.has(cfg.level) ? '★★★' : '☆☆☆'}</span>
        `;
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

    // Nếu map KHÔNG có nước, tự động loại bỏ các Thuyền ra khỏi đội hình đang chọn
    if (!cfg.hasWater) {
        selectedDeckIds = selectedDeckIds.filter(id => {
            const u = UNIT_BY_ID[id];
            return u && !u.isNaval;
        });
        // Nếu đội hình bị trống, tự bù các nhân vật bộ binh cơ bản
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
        waterBadge.textContent = '🌊 CÓ NƯỚC: Được phép chọn Thuyền / Tàu chiến';
    } else {
        waterBadge.className = 'water-status-badge no-water mt-1';
        waterBadge.textContent = '🚫 KHÔNG CÓ NƯỚC: Thuyền bị khóa ở Map này';
    }

    const stars = '★'.repeat(Math.min(5, Math.ceil(cfg.level / 3))) + '☆'.repeat(5 - Math.min(5, Math.ceil(cfg.level / 3)));
    document.getElementById('select-map-desc').textContent = `HP Địch: ${cfg.enemyBaseHp} | Độ khó: ${stars}`;

    renderMapPreviewThumb(cfg.level);

    // Render 4 ô đội hình đã chọn
    const slotsContainer = document.getElementById('selected-deck-slots');
    slotsContainer.innerHTML = '';
    document.getElementById('deck-count-badge').textContent = `${selectedDeckIds.length} / 4`;

    const gasIconUrl = atlas.ready ? atlas.toDataURL(12, 10) : '';

    for (let i = 0; i < 4; i++) {
        const unitId = selectedDeckIds[i];
        const card = document.createElement('div');

        if (unitId && UNIT_BY_ID[unitId]) {
            const u = UNIT_BY_ID[unitId];
            const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';
            card.className = 'deck-slot-card';
            card.innerHTML = `
                <div class="deck-slot-remove">✕</div>
                <div class="text-[8.5px] font-bold text-sky-200 truncate w-full text-center">${u.name}</div>
                <img src="${spriteUrl}" class="w-7 h-7 pixel-art" alt="${u.name}" />
                <div class="flex items-center justify-between w-full px-1 text-[8.5px] font-extrabold">
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

    // Render danh sách toàn bộ binh chủng
    const rosterGrid = document.getElementById('unit-roster-grid');
    rosterGrid.innerHTML = '';

    UNIT_CATALOG.forEach(u => {
        const isSelected = selectedDeckIds.includes(u.id);
        const isLockedByWater = u.isNaval && !cfg.hasWater;
        const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';

        const item = document.createElement('div');
        item.className = 'roster-card' +
            (isSelected ? ' selected' : '') +
            (isLockedByWater ? ' disabled-water' : '');

        item.innerHTML = `
            <img src="${spriteUrl}" class="w-9 h-9 pixel-art flex-shrink-0" alt="${u.name}" />
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-extrabold text-white truncate">${u.name}</span>
                    <span class="bg-amber-400/20 border border-amber-400 text-amber-300 text-[9.5px] font-extrabold px-1.5 rounded-full flex items-center gap-0.5">
                        ⛽ ${u.cost}
                    </span>
                </div>
                <div class="text-[9px] text-sky-300 font-semibold">${u.role}</div>
                <div class="flex items-center gap-2 mt-0.5 text-[9.5px] font-bold">
                    <span class="text-rose-400">⚔️ DMG: ${u.damage}</span>
                    <span class="text-emerald-400">${u.isAirstrike ? '💥 Nhà: ' + u.baseDamage : '❤️ HP: ' + u.hp}</span>
                </div>
            </div>
            ${isLockedByWater ? '<div class="water-ban-badge">🚫 MAP KHÔNG CÓ NƯỚC</div>' : ''}
        `;

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
                    // Thay thế ô cuối nếu đã đủ 4 nhân vật hoặc báo đầy
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

// Nút đề xuất đội hình thông minh theo Map
document.getElementById('btn-auto-deck').addEventListener('click', () => {
    const cfg = LEVELS[pendingSelectLevel - 1] || LEVELS[0];
    if (cfg.hasWater) {
        selectedDeckIds = ['infantry', 'gunboat', 'destroyer', 'airstrike'];
    } else {
        selectedDeckIds = ['infantry', 'humvee', 'tank', 'airstrike'];
    }
    sfx.play('upgrade');
    renderUnitSelectionUI();
});

// Nút Bắt đầu trận chiến từ UI chọn nhân vật
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
            const spriteUrl = atlas.ready ? atlas.toDataURL(u.spriteCol, 7) : '';
            btn.id = `btnSlot${i}`;
            btn.className = 'unit-btn' + (u.isNaval ? ' naval-btn' : '');
            btn.innerHTML = `
                <div class="text-[8.5px] font-bold text-sky-200 uppercase tracking-tight truncate w-full text-center px-0.5">${u.name}</div>
                <div class="flex flex-col items-center justify-center">
                    <img src="${spriteUrl}" class="w-7 h-7 pixel-art" alt="${u.name}" />
                    <span class="dmg-mini-tag">⚔️DMG ${u.damage}</span>
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

    // Tạo quân Đỏ ban đầu phù hợp địa hình Map
    for (let i = 0; i < cfg.initialRedUnits; i++) {
        let unitId = 'infantry';
        if (cfg.hasWater && i === 0 && cfg.level >= 4) {
            unitId = 'gunboat';
        } else if (i === cfg.initialRedUnits - 1 && cfg.level >= 3) {
            unitId = 'tank';
        }
        const gateSpread = 180;
        const rx = (LOGICAL_WIDTH / 2 - gateSpread / 2) + Math.random() * gateSpread;
        const offsetY = 120 + i * 34;
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

    // Cập nhật khóa/mở khóa cho 4 ô nhân vật đã chọn
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
    const cfg = LEVELS[game.currentLevel - 1] || LEVELS[0];

    let spawnX = customX;
    let spawnY = customY !== null ? customY : (isBlue ? base.y - 38 : base.y + 38);

    // Nếu là Thuyền (isNaval) trên Map có nước, ưu tiên đặt vào làn nước của Map
    if (spec.isNaval && cfg.hasWater && cfg.waterZones.length > 0) {
        const wz = cfg.waterZones[Math.floor(Math.random() * cfg.waterZones.length)];
        spawnX = wz.x + 24 + Math.random() * Math.max(10, wz.w - 48);
        if (customY === null) {
            spawnY = isBlue
                ? Math.min(base.y - 40, wz.y + wz.h - 18)
                : Math.max(base.y + 40, wz.y + 18);
        }
    } else if (spawnX === null) {
        if (isBlue && game.rallyX !== null) {
            spawnX = game.rallyX + (Math.random() * 32 - 16);
        } else {
            const gateWidth = base.width - 50;
            spawnX = (base.x - gateWidth / 2) + Math.random() * gateWidth;
        }
    }
    spawnX = Math.max(38, Math.min(LOGICAL_WIDTH - 38, spawnX));

    const spriteRow = isBlue ? 7 : 8;

    game.units.push({
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
        hp: spec.hp,
        maxHp: spec.hp,
        moveSpeed: spec.speed + (Math.random() * 4 - 2),
        damage: spec.damage,
        targetTime: 0.6,
        fireRate: spec.fireRate,
        beamActiveTimer: 0,
        shoot: false,
        range: spec.range,
        radius: spec.radius,
        attackType: spec.attackType,
        projSpeed: spec.projSpeed || 250,
        projRadius: spec.projRadius || 6,
        isNaval: !!spec.isNaval,
        isAir: !!spec.isAir,
        walkCycle: Math.random() * Math.PI * 2,
        recoil: 0
    });

    spawnExplosion(spawnX, spawnY, isBlue ? '#60a5fa' : '#f87171', 7, 16);
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

function findTargetForUnit(unit) {
    const enemyTeam = unit.team === 'blue' ? 'red' : 'blue';
    const enemyBase = unit.team === 'blue' ? game.redBase : game.blueBase;
    const dir = unit.team === 'blue' ? -1 : 1;

    let nearestTarget = null;
    let minDistance = Infinity;
    const lateralSight = unit.isNaval ? 140 : Math.max(48, unit.range * 0.55);

    for (const other of game.units) {
        if (other.team !== enemyTeam || other.hp <= 0) continue;
        const dy = (other.y - unit.y) * dir;
        const dx = Math.abs(other.x - unit.x);

        if (dy >= -15 && dy <= unit.range + other.radius && dx <= lateralSight) {
            const dist = Math.hypot(dx, dy);
            if (dist < minDistance) {
                minDistance = dist;
                nearestTarget = { isBase: false, entity: other };
            }
        }
    }

    if (nearestTarget) return nearestTarget;

    const baseEdgeY = enemyTeam === 'red'
        ? enemyBase.y + enemyBase.height / 2
        : enemyBase.y - enemyBase.height / 2;
    const distToBase = (baseEdgeY - unit.y) * dir;
    const dxBase = Math.abs(unit.x - enemyBase.x);

    if (distToBase >= -15 && distToBase <= unit.range && dxBase <= enemyBase.width / 2 + 25) {
        return { isBase: true, entity: enemyBase, hitY: baseEdgeY };
    }

    return null;
}

function applyDamageToTarget(targetObj, damage, isBlue) {
    if (!targetObj || !targetObj.entity) return;
    targetObj.entity.hp = Math.max(0, targetObj.entity.hp - damage);

    const tx = targetObj.isBase ? targetObj.entity.x + (Math.random() * 60 - 30) : targetObj.entity.x;
    const ty = targetObj.isBase ? targetObj.entity.y : targetObj.entity.y - 12;

    addFloatingText(tx, ty, `-${damage}`, isBlue ? '#38bdf8' : '#fb7185', 13);
    spawnExplosion(tx, ty, '#fde047', 5, 12);

    if (targetObj.isBase) {
        checkGameOver();
    }
}

function updateUnits(dt) {
    const cfg = LEVELS[game.currentLevel - 1] || LEVELS[0];

    for (let i = 0; i < game.units.length; i++) {
        const u1 = game.units[i];
        for (let j = i + 1; j < game.units.length; j++) {
            const u2 = game.units[j];
            if (u1.isAir !== u2.isAir) continue;
            const dx = u2.x - u1.x;
            const dy = u2.y - u1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = u1.radius + u2.radius + 3;

            if (dist < minDist && dist > 0.001) {
                const overlap = (minDist - dist) * 0.5;
                const nx = dx / dist;
                const ny = dy / dist;
                const xPushMultiplier = (u1.team === u2.team) ? 1.7 : 1.0;

                u1.x -= nx * overlap * xPushMultiplier;
                u2.x += nx * overlap * xPushMultiplier;
                u1.y -= ny * overlap * 0.4;
                u2.y += ny * overlap * 0.4;
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

        u.x = Math.max(30, Math.min(LOGICAL_WIDTH - 30, u.x));

        if (u.recoil > 0) u.recoil = Math.max(0, u.recoil - dt * 15);
        if (u.beamActiveTimer > 0) u.beamActiveTimer = Math.max(0, u.beamActiveTimer - dt);
        u.targetTime -= dt;

        const target = findTargetForUnit(u);

        if (target) {
            u.shoot = true;
            if (u.attackType === 'beam') {
                if (u.targetTime <= 0) {
                    u.targetTime = u.fireRate;
                    u.beamActiveTimer = 0.18;
                    u.recoil = 3.5;
                    sfx.play('beam');
                    applyDamageToTarget(target, u.damage, u.team === 'blue');
                }
            } else {
                if (u.targetTime <= 0) {
                    u.targetTime = u.fireRate;
                    u.recoil = 4.5;
                    spawnUnitProjectile(u, target);
                }
            }
        } else {
            u.shoot = false;
            const dir = u.team === 'blue' ? -1 : 1;
            let avoidForceX = 0;
            let forwardBlocked = false;

            // Nếu là đơn vị bộ/xe gặp nước ở Map có cầu, tự động hướng về phía cầu gần nhất
            if (!u.isNaval && !u.isAir && cfg.hasWater) {
                const nextY = u.y + dir * 24;
                if (isPointInWater(u.x, nextY, cfg.level) && cfg.bridgeLanes && cfg.bridgeLanes.length > 0) {
                    let nearestBridgeX = cfg.bridgeLanes[0];
                    let bestDist = Math.abs(u.x - nearestBridgeX);
                    for (const bx of cfg.bridgeLanes) {
                        if (Math.abs(u.x - bx) < bestDist) {
                            bestDist = Math.abs(u.x - bx);
                            nearestBridgeX = bx;
                        }
                    }
                    if (bestDist > 22) {
                        avoidForceX += Math.sign(nearestBridgeX - u.x) * 55;
                    }
                }
            }

            // Nếu là Thuyền (isNaval), giữ thuyền di chuyển trong vùng nước để pháo kích
            if (u.isNaval && cfg.hasWater && cfg.waterZones.length > 0) {
                const nextY = u.y + dir * 20;
                if (!isPointInWater(u.x, nextY, cfg.level)) {
                    const wz = cfg.waterZones[0];
                    const centerWaterX = wz.x + wz.w / 2;
                    avoidForceX += Math.sign(centerWaterX - u.x) * 35;
                }
            }

            for (const ally of game.units) {
                if (ally === u || ally.team !== u.team || ally.isAir !== u.isAir) continue;
                const dy = (ally.y - u.y) * dir;
                const dx = ally.x - u.x;

                if (dy > 0 && dy < u.radius + ally.radius + 14 && Math.abs(dx) < u.radius + ally.radius + 6) {
                    if (ally.shoot || dy < u.radius + ally.radius + 4) {
                        forwardBlocked = true;
                        avoidForceX += (dx >= 0 ? -1 : 1) * 36;
                    }
                }
            }

            if (Math.abs(avoidForceX) > 5) {
                u.flipX = avoidForceX < 0;
            }

            u.x += avoidForceX * dt;

            if (!forwardBlocked) {
                u.y += dir * u.moveSpeed * dt;
            } else {
                u.y += dir * (u.moveSpeed * 0.25) * dt;
            }

            u.walkCycle += dt * 10;
        }
    }
}

function spawnUnitProjectile(unit, target) {
    const isBlue = unit.team === 'blue';
    const dir = isBlue ? -1 : 1;
    const bx = unit.x;
    const by = unit.y + dir * (unit.radius + 6);

    let vx = 0;
    let vy = dir * unit.projSpeed;

    if (target && target.entity) {
        const tx = target.entity.x;
        const ty = target.isBase ? (target.hitY || target.entity.y) : target.entity.y;
        const angle = Math.atan2(ty - by, tx - bx);
        vx = Math.cos(angle) * unit.projSpeed;
        vy = Math.sin(angle) * unit.projSpeed;
    }

    sfx.play('cannon');
    spawnExplosion(bx, by, '#fde047', 5, 10);

    game.bullets.push({
        team: unit.team,
        x: bx,
        y: by,
        vx: vx,
        vy: vy,
        damage: unit.damage,
        radius: unit.projRadius
    });
}

function updateBullets(dt) {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const b = game.bullets[i];
        b.x += (b.vx || 0) * dt;
        b.y += b.vy * dt;

        const enemyTeam = b.team === 'blue' ? 'red' : 'blue';
        const enemyBase = b.team === 'blue' ? game.redBase : game.blueBase;
        let hitSomething = false;

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
    const bRow = isBlue ? 2 : 3;
    const x = base.x - base.width / 2;
    const y = base.y - base.height / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = isBlue ? '#38bdf8' : '#f87171';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x, y, base.width, base.height, 12);
    ctx.fill();
    ctx.stroke();

    if (atlas.ready) {
        for (let gx = x + 18; gx < x + base.width - 10; gx += 30) {
            atlas.draw(ctx, 7, 1, gx, base.y + (isBlue ? 10 : -10), 28, 28, { alpha: 0.65 });
        }

        const buildingY = isBlue ? base.y + 6 : base.y - 6;
        const layout = [
            { col: 13, dx: -106, size: 34 },
            { col: 11, dx: -72, size: 36 },
            { col: 10, dx: -36, size: 36 },
            { col: 9,  dx: 0,   size: 44 },
            { col: 12, dx: 36,  size: 36 },
            { col: 14, dx: 72,  size: 36 },
            { col: 13, dx: 106, size: 34 }
        ];

        for (const item of layout) {
            atlas.draw(ctx, item.col, bRow, base.x + item.dx, buildingY, item.size, item.size);
        }

        const wave = Math.sin(performance.now() * 0.006) * 0.08;
        const flagY = isBlue ? y - 6 : y + base.height + 4;
        atlas.draw(ctx, 16, bRow, x + 14, flagY, 26, 26, { rotation: wave });
        atlas.draw(ctx, 17, bRow, x + base.width - 14, flagY, 26, 26, { rotation: -wave });
    }

    const barW = 210;
    const barH = 18;
    const barX = base.x - barW / 2;
    const barY = isBlue ? y - 14 : y + base.height - 4;
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

function drawUnits() {
    for (const u of game.units) {
        const isBlue = u.team === 'blue';
        const dir = isBlue ? -1 : 1;
        const recoilOffset = -dir * u.recoil;
        const bob = u.shoot ? 0 : Math.sin(u.walkCycle) * (u.isAir ? 3.0 : 1.6);
        const tilt = u.shoot ? 0 : Math.cos(u.walkCycle) * 0.05;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(u.x, u.y + recoilOffset + bob);

        if (u.attackType === 'beam' && u.beamActiveTimer > 0) {
            ctx.fillStyle = isBlue ? 'rgba(56, 189, 248, 0.9)' : 'rgba(251, 113, 133, 0.9)';
            const beamH = 26;
            const beamY = isBlue ? -u.radius - beamH : u.radius;
            ctx.beginPath();
            ctx.roundRect(-3.5, beamY, 7, beamH, 3);
            ctx.fill();

            if (atlas.ready) {
                atlas.draw(ctx, 11, 10, 0, isBlue ? -u.radius - 10 : u.radius + 10, 14, 14);
            }
        }

        // Vòng sóng nước nếu là Thuyền
        if (u.isNaval) {
            ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, u.radius - 3, u.radius + 3, 7, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
            ctx.beginPath();
            ctx.ellipse(0, u.isAir ? u.radius + 8 : u.radius - 2, u.radius * 0.85, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

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
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = isBlue ? 'rgba(56, 189, 248, 0.45)' : 'rgba(248, 113, 113, 0.45)';
        ctx.beginPath();
        ctx.arc(b.x, b.y - Math.sign(b.vy) * 6, b.radius, 0, Math.PI * 2);
        ctx.fill();

        const rot = Math.atan2(b.vy, b.vx || 0);
        if (!atlas.draw(ctx, 11, 10, b.x, b.y, 16, 16, { rotation: rot })) {
            ctx.fillStyle = isBlue ? '#38bdf8' : '#f87171';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
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
    renderLevelGrid();
    renderBattleDeckButtons();
    updateControllerUI();
    requestAnimationFrame(gameLoop);
};