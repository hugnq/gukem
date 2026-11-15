/* ============================================================================
   TINY BATTLE - NAVIGATION FLOW-FIELD & 30 MAPS RENDERER (js/map-nav.js)
   Dijkstra Flow-Field Pathfinding, Procedural Sine Water & 30 Tactical Maps
   ============================================================================ */

import {
    LOGICAL_WIDTH,
    PLAYFIELD_HEIGHT,
    NAV_CELL,
    GRID_W,
    GRID_H,
    T_OPEN,
    T_ROAD,
    T_WATER,
    T_BRIDGE,
    T_OBSTACLE
} from './config.js';
import { atlas } from './engine-core.js';

// ============================================================================
// 1. HỆ THỐNG LƯỚI ĐỊA HÌNH VÀ TÌM ĐƯỜNG FLOW-FIELD (NAVSYSTEM)
// ============================================================================
export class NavSystem {
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
        if (cy < 115 || cy > PLAYFIELD_HEIGHT - 115) {
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
        this.bridges.push({ x: bx, y: by, w: bw, h: bh, isVertical });
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
        this.markRect(75, 92, 270, 26, T_ROAD, false);
        this.markRect(75, PLAYFIELD_HEIGHT - 118, 270, 26, T_ROAD, false);

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

        let bestVal = distArr[this.idx(gx, gy)];
        if (bestVal >= 1e8) {
            return { dirX: 0, dirY: team === 'blue' ? -1 : 1 };
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
                    const d = Math.hypot(dx, dy);
                    const w = diff / d;
                    gradX += (dx / d) * w;
                    gradY += (dy / d) * w;
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
            u.y = Math.max(30, Math.min(PLAYFIELD_HEIGHT - 24, u.y));
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

                    if (dist < effR && dist > 0.001) {
                        u.x = closestX + (dx / dist) * effR;
                        u.y = closestY + (dy / dist) * effR;
                    }
                }
            }
        }

        if (!u.isNaval && this.isPointInWaterRaw(u.x, u.y)) {
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
        } else if (u.isNaval) {
            const cell = this.getCellAtPixel(u.x, u.y);
            if (cell !== T_WATER && cell !== T_BRIDGE) {
                const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(u.x / NAV_CELL)));
                const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(u.y / NAV_CELL)));
                let bestX = u.x, bestY = u.y, minD = Infinity;

                for (let r = -6; r <= 6; r++) {
                    for (let c = -6; c <= 6; c++) {
                        const nx = gx + c, ny = gy + r;
                        if (!this.inBounds(nx, ny)) continue;
                        if (this.grid[this.idx(nx, ny)] === T_WATER) {
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

export const nav = new NavSystem();

// ============================================================================
// 2. HIỆU ỨNG MẶT NƯỚC ĐA LỚP ĐỘNG (PROCEDURAL SINE WATER & FOAM EDGE)
// ============================================================================
export function calcProceduralWaveOffset(time, x) {
    return Math.sin(time * 2.5 + x * 0.05) * 3 + Math.sin(-time * 1.8 + x * 0.08) * 1.5;
}

export function drawDynamicSineWater(targetCtx, timeSec, levelNum) {
    if (!nav.waterBoxes || nav.waterBoxes.length === 0) return;

    const baseId = ((levelNum - 1) % 15) + 1;
    const isCoastMap = [10, 13].includes(baseId);

    for (const wb of nav.waterBoxes) {
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.roundRect(wb.x, wb.y, wb.w, wb.h, wb.rounded || 0);
        targetCtx.clip();

        targetCtx.fillStyle = 'rgba(2, 132, 199, 0.45)';
        for (let baseRowY = wb.y + 12; baseRowY < wb.y + wb.h - 6; baseRowY += 22) {
            for (let x = wb.x + 4; x < wb.x + wb.w - 8; x += 8) {
                const yOff = calcProceduralWaveOffset(timeSec, x + baseRowY * 0.4);
                targetCtx.fillRect(x, Math.round(baseRowY + yOff), 6, 3);
            }
        }

        targetCtx.fillStyle = 'rgba(224, 242, 254, 0.82)';
        for (let baseRowY = wb.y + 20; baseRowY < wb.y + wb.h - 8; baseRowY += 26) {
            for (let x = wb.x + 10; x < wb.x + wb.w - 12; x += 14) {
                const yOff = calcProceduralWaveOffset(timeSec + 1.1, x - baseRowY * 0.3);
                targetCtx.fillRect(x, Math.round(baseRowY + yOff), 9, 2.5);
            }
        }

        targetCtx.fillStyle = '#e0f2fe';
        const foamAmp = isCoastMap ? 2.2 : 1.4;

        for (let x = wb.x; x < wb.x + wb.w; x += 6) {
            const waveShift = Math.sin(timeSec * 3.2 + x * 0.09) * foamAmp;
            if (wb.y > 5) {
                targetCtx.fillRect(x, wb.y + Math.max(0, waveShift), 5, isCoastMap ? 3.5 : 2.5);
            }
            if (wb.y + wb.h < PLAYFIELD_HEIGHT - 5) {
                targetCtx.fillRect(x, wb.y + wb.h - 3 + Math.min(0, waveShift), 5, isCoastMap ? 3.5 : 2.5);
            }
        }

        for (let y = wb.y; y < wb.y + wb.h; y += 6) {
            const waveShift = Math.cos(timeSec * 3.0 + y * 0.08) * foamAmp;
            if (wb.x > 5) {
                targetCtx.fillRect(wb.x + Math.max(0, waveShift), y, isCoastMap ? 4 : 2.5, 5);
            }
            if (wb.x + wb.w < LOGICAL_WIDTH - 5) {
                targetCtx.fillRect(wb.x + wb.w - 3.5 + Math.min(0, waveShift), y, isCoastMap ? 4 : 2.5, 5);
            }
        }

        targetCtx.restore();
    }

    for (const br of nav.bridges) {
        targetCtx.save();
        targetCtx.fillStyle = '#451a03';
        targetCtx.fillRect(br.x - 3, br.y - 2, br.w + 6, br.h + 4);
        targetCtx.fillStyle = '#b45309';
        targetCtx.fillRect(br.x, br.y, br.w, br.h);
        targetCtx.fillStyle = '#d97706';
        if (br.h >= br.w) {
            for (let py = br.y + 4; py < br.y + br.h - 3; py += 8) {
                targetCtx.fillRect(br.x + 2, py, br.w - 4, 5);
            }
        } else {
            for (let px = br.x + 4; px < br.x + br.w - 3; px += 8) {
                targetCtx.fillRect(px, br.y + 2, 5, br.h - 4);
            }
        }
        targetCtx.restore();
    }
}

// ============================================================================
// 3. BỘ VẼ BẢN ĐỒ CHI TIẾT 30 MAP (KHỚP CHÍNH XÁC 15 MAPS.PNG)
// ============================================================================
export function renderMap(targetCtx, targetW, targetH, levelNum, includeMiniBases = false) {
    const W = LOGICAL_WIDTH;
    const H = PLAYFIELD_HEIGHT;
    const registerNav = !includeMiniBases && targetW === LOGICAL_WIDTH && targetH === PLAYFIELD_HEIGHT;

    if (registerNav) {
        nav.reset();
    }

    targetCtx.save();
    targetCtx.scale(targetW / W, targetH / H);
    targetCtx.imageSmoothingEnabled = false;

    const baseTemplateId = ((Math.max(1, Number(levelNum) || 1) - 1) % 15) + 1;
    const isVeteran = levelNum > 15;

    const fillGrassBg = (shade = '#7bc64d') => {
        if (isVeteran && levelNum % 2 === 0) {
            fillBrownEarthBg('#8B5A2B');
            return;
        }
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
        for (let i = 0; i < 32; i++) {
            const gx = ((i * 73 + levelNum * 29) % (W - 30)) + 15;
            const gy = ((i * 113 + levelNum * 43) % (H - 40)) + 20;
            targetCtx.fillStyle = i % 4 === 0 ? '#fde047' : '#5ea332';
            targetCtx.fillRect(gx, gy, 4, 4);
        }
    };

    const fillBrownEarthBg = (baseTone = '#9c6644') => {
        targetCtx.fillStyle = baseTone;
        targetCtx.fillRect(0, 0, W, H);
        const TILE = 30;
        const shades = ['#8B5A2B', '#9c6644', '#b08968', '#7f4f24'];
        for (let r = 0; r < Math.ceil(H / TILE); r++) {
            for (let c = 0; c < Math.ceil(W / TILE); c++) {
                const h = (r * 23 + c * 37 + levelNum * 13) % 11;
                if (h < 4) {
                    targetCtx.fillStyle = shades[h];
                    targetCtx.fillRect(c * TILE, r * TILE, TILE, TILE);
                }
            }
        }
        for (let i = 0; i < 42; i++) {
            const px = ((i * 67 + levelNum * 31) % (W - 24)) + 12;
            const py = ((i * 109 + levelNum * 47) % (H - 36)) + 18;
            targetCtx.fillStyle = i % 3 === 0 ? '#d4a373' : '#5c3a21';
            targetCtx.fillRect(px, py, 5, 4);
        }
    };

    const drawRoadPath = (pts, width = 36, paved = false) => {
        if (registerNav) nav.markPolyline(pts, width + 8, T_ROAD);
        targetCtx.save();
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';

        targetCtx.strokeStyle = paved ? '#334155' : '#9a6b32';
        targetCtx.lineWidth = width + 8;
        targetCtx.beginPath();
        pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
        targetCtx.stroke();

        targetCtx.strokeStyle = paved ? '#64748b' : '#eab308';
        targetCtx.lineWidth = width;
        targetCtx.beginPath();
        pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
        targetCtx.stroke();

        if (paved) {
            targetCtx.strokeStyle = '#e2e8f0';
            targetCtx.lineWidth = 2.5;
            targetCtx.setLineDash([10, 10]);
            targetCtx.beginPath();
            pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
            targetCtx.stroke();
        } else {
            targetCtx.strokeStyle = '#fde68a';
            targetCtx.lineWidth = Math.max(8, width - 14);
            targetCtx.beginPath();
            pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
            targetCtx.stroke();
        }
        targetCtx.restore();
    };

    const drawRingRoad = (cx, cy, r, width = 34, paved = true) => {
        if (registerNav) nav.markRing(cx, cy, r, width + 8, T_ROAD);
        targetCtx.save();
        targetCtx.strokeStyle = paved ? '#334155' : '#9a6b32';
        targetCtx.lineWidth = width + 8;
        targetCtx.beginPath();
        targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
        targetCtx.stroke();

        targetCtx.strokeStyle = paved ? '#64748b' : '#eab308';
        targetCtx.lineWidth = width;
        targetCtx.beginPath();
        targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
        targetCtx.stroke();

        if (paved) {
            targetCtx.strokeStyle = '#e2e8f0';
            targetCtx.lineWidth = 2.5;
            targetCtx.setLineDash([9, 9]);
            targetCtx.beginPath();
            targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
            targetCtx.stroke();
        }
        targetCtx.restore();
    };

    const drawWaterBox = (x, y, w, h, rounded = 0) => {
        if (registerNav) {
            nav.markRect(x, y, w, h, T_WATER, true);
            nav.waterBoxes.push({ x, y, w, h, rounded });
        }
        targetCtx.save();
        targetCtx.fillStyle = '#0284c7';
        targetCtx.beginPath();
        targetCtx.roundRect(x - 3, y - 3, w + 6, h + 6, rounded);
        targetCtx.fill();

        targetCtx.fillStyle = '#29b6f6';
        targetCtx.beginPath();
        targetCtx.roundRect(x, y, w, h, rounded);
        targetCtx.fill();
        targetCtx.restore();
    };

    const drawBridgeBox = (cx, cy, w = 50, h = 92, isVertical = true) => {
        if (registerNav) nav.addBridge(cx, cy, w, h, isVertical);
        const bw = isVertical ? w : h;
        const bh = isVertical ? h : w;
        const bx = cx - bw / 2;
        const by = cy - bh / 2;

        targetCtx.save();
        targetCtx.fillStyle = '#451a03';
        targetCtx.fillRect(bx - 3, by - 2, bw + 6, bh + 4);
        targetCtx.fillStyle = '#b45309';
        targetCtx.fillRect(bx, by, bw, bh);
        targetCtx.fillStyle = '#d97706';
        if (isVertical) {
            for (let py = by + 4; py < by + bh - 3; py += 8) {
                targetCtx.fillRect(bx + 2, py, bw - 4, 5);
            }
        } else {
            for (let px = bx + 4; px < bx + bw - 3; px += 8) {
                targetCtx.fillRect(px, by + 2, 5, bh - 4);
            }
        }
        targetCtx.restore();
    };

    const drawTree = (x, y, scale = 1, variant = 0) => {
        const rad = 14 * scale;
        if (registerNav && nav.isRoadOrBridgeOrSpawn(x, y, rad + 4)) return;
        if (registerNav) nav.addCircleObstacle(x, y, rad, 'tree');

        const col = variant === 0 ? 15 : 16;
        const row = variant === 2 ? 5 : 4;
        if (atlas.ready && atlas.draw(targetCtx, col, row, x, y, 36 * scale, 36 * scale)) return;

        targetCtx.save();
        targetCtx.fillStyle = '#14532d';
        targetCtx.beginPath();
        targetCtx.arc(x, y + 2, 15 * scale, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillStyle = '#22c55e';
        targetCtx.beginPath();
        targetCtx.arc(x, y - 1, 12 * scale, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
    };

    const drawRockMountain = (cx, cy, r = 24) => {
        if (registerNav && nav.isRoadOrBridgeOrSpawn(cx, cy, r * 0.65)) return;
        if (registerNav) nav.addCircleObstacle(cx, cy, r * 0.68, 'rock');
        targetCtx.save();
        targetCtx.translate(cx, cy);
        targetCtx.fillStyle = '#334155';
        targetCtx.beginPath();
        targetCtx.moveTo(-r, r * 0.7);
        targetCtx.lineTo(-r * 0.65, -r * 0.45);
        targetCtx.lineTo(0, -r * 0.95);
        targetCtx.lineTo(r * 0.7, -r * 0.35);
        targetCtx.lineTo(r, r * 0.7);
        targetCtx.closePath();
        targetCtx.fill();

        targetCtx.fillStyle = '#94a3b8';
        targetCtx.beginPath();
        targetCtx.moveTo(-r * 0.85, r * 0.6);
        targetCtx.lineTo(-r * 0.55, -r * 0.38);
        targetCtx.lineTo(0, -r * 0.85);
        targetCtx.lineTo(0, r * 0.6);
        targetCtx.closePath();
        targetCtx.fill();

        targetCtx.fillStyle = '#64748b';
        targetCtx.beginPath();
        targetCtx.moveTo(0, -r * 0.85);
        targetCtx.lineTo(r * 0.62, -r * 0.32);
        targetCtx.lineTo(r * 0.85, r * 0.6);
        targetCtx.lineTo(0, r * 0.6);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.restore();
    };

    const drawHouse = (x, y, w = 44, h = 44, roofCol = 8, roofRow = 0) => {
        if (registerNav && nav.isRoadOrBridgeOrSpawn(x + w / 2, y + h / 2, Math.max(w, h) * 0.52)) return;
        if (registerNav) nav.addBoxObstacle(x, y, w, h, 'building');

        const cx = x + w / 2;
        const cy = y + h / 2;
        if (atlas.ready && atlas.draw(targetCtx, roofCol, roofRow, cx, cy, w + 6, h + 6)) return;

        targetCtx.save();
        targetCtx.fillStyle = '#1e293b';
        targetCtx.fillRect(x - 2, y - 2, w + 4, h + 4);
        targetCtx.fillStyle = roofRow >= 2 ? '#0284c7' : '#ea580c';
        targetCtx.fillRect(x, y, w, h);
        targetCtx.fillStyle = '#fed7aa';
        targetCtx.fillRect(x + 5, y + 5, w - 10, h - 10);
        targetCtx.restore();
    };

    const drawStoneWallBox = (x, y, w, h) => {
        if (registerNav) nav.addBoxObstacle(x, y, w, h, 'wall');
        targetCtx.save();
        targetCtx.fillStyle = '#1e293b';
        targetCtx.fillRect(x - 2, y - 2, w + 4, h + 4);
        targetCtx.fillStyle = '#64748b';
        targetCtx.fillRect(x, y, w, h);
        targetCtx.fillStyle = '#94a3b8';
        targetCtx.fillRect(x + 3, y + 3, Math.max(4, w - 6), Math.max(4, h * 0.45));
        targetCtx.restore();
    };

    switch (baseTemplateId) {
        case 1: {
            fillGrassBg('#7bc64d');
            drawWaterBox(0, H / 2 - 54, W, 108, 0);
            drawRoadPath([[105, 85], [315, 85]], 30, false);
            drawRoadPath([[105, H - 85], [315, H - 85]], 30, false);
            drawRoadPath([[210, 65], [210, H - 65]], 38, false);
            drawBridgeBox(210, H / 2, 56, 118, true);
            [[38, 95], [382, 95], [38, H - 95], [382, H - 95]].forEach(([x, y]) => drawRockMountain(x, y, 26));
            [[75, 225], [345, 225], [75, H - 225], [345, H - 225]].forEach(([x, y]) => drawTree(x, y, 1.05, 0));
            break;
        }
        case 2: {
            fillGrassBg('#6cb83b');
            drawRoadPath([
                [210, 65],
                [210, 145],
                [95, 195],
                [95, 330],
                [325, 390],
                [325, 520],
                [135, 575],
                [210, H - 65]
            ], 36, true);
            [[42, 90], [92, 95], [45, 155], [372, H - 95], [330, H - 85], [375, H - 155]].forEach(([x, y]) =>
                drawRockMountain(x, y, 25)
            );
            [[240, 250], [310, 250], [120, 455], [190, 455], [45, 420], [375, 240]].forEach(([x, y], i) =>
                drawTree(x, y, 1.1, i % 2)
            );
            break;
        }
        case 3: {
            fillGrassBg('#64748b');
            drawRoadPath([[88, 55], [88, H - 55]], 32, true);
            drawRoadPath([[210, 55], [210, H - 55]], 34, true);
            drawRoadPath([[332, 55], [332, H - 55]], 32, true);
            drawRoadPath([[25, 210], [W - 25, 210]], 30, true);
            drawRoadPath([[25, 360], [W - 25, 360]], 30, true);
            drawRoadPath([[25, 510], [W - 25, 510]], 30, true);
            drawHouse(126, 250, 48, 65, 8, 1);
            drawHouse(246, 250, 48, 65, 9, 1);
            drawHouse(126, 400, 48, 65, 10, 3);
            drawHouse(246, 400, 48, 65, 8, 3);
            break;
        }
        case 4: {
            fillGrassBg('#7bc64d');
            drawWaterBox(34, 155, W - 68, H - 310, 28);
            if (registerNav) nav.markRect(142, H / 2 - 58, 136, 116, T_ROAD, true);
            targetCtx.fillStyle = '#7bc64d';
            targetCtx.beginPath();
            targetCtx.roundRect(142, H / 2 - 58, 136, 116, 16);
            targetCtx.fill();

            drawBridgeBox(210, 205, 48, 110, true);
            drawBridgeBox(210, H - 205, 48, 110, true);
            drawRoadPath([[125, H / 2], [295, H / 2]], 30, false);
            drawHouse(184, H / 2 - 26, 52, 52, 7, 0);
            break;
        }
        case 5: {
            fillGrassBg('#5ea332');
            drawRoadPath([[210, 65], [105, 175], [105, 355], [210, 445], [105, 545], [210, H - 65]], 34, true);
            drawRoadPath([[210, 65], [315, 175], [315, 355], [210, 445], [315, 545], [210, H - 65]], 34, true);
            drawRoadPath([[105, 265], [315, 265]], 30, true);
            [[210, 195], [210, 345], [210, 535], [42, 260], [378, 260], [42, 460], [378, 460]].forEach(([x, y], i) =>
                drawTree(x, y, 1.15, i % 2)
            );
            break;
        }
        case 6: {
            fillBrownEarthBg('#64748b');
            drawRoadPath([[95, 65], [95, H - 65]], 34, true);
            drawRoadPath([[325, 65], [325, H - 65]], 34, true);
            drawRoadPath([[40, 235], [380, 235]], 32, true);
            drawRoadPath([[40, 475], [380, 475]], 32, true);
            drawRoadPath([[210, 235], [210, 475]], 32, true);
            drawHouse(132, 295, 52, 54, 11, 0);
            drawHouse(236, 295, 52, 54, 11, 4);
            drawHouse(132, 375, 52, 54, 10, 4);
            drawHouse(236, 375, 52, 54, 9, 4);
            break;
        }
        case 7: {
            fillGrassBg('#74c043');
            drawWaterBox(64, 155, 175, 150, 20);
            drawWaterBox(180, 410, 175, 150, 20);
            drawRoadPath([
                [315, 65],
                [315, 315],
                [105, 395],
                [105, H - 65]
            ], 36, true);
            drawRoadPath([[125, 85], [315, 85]], 30, true);
            drawRoadPath([[105, H - 85], [295, H - 85]], 30, true);
            for (let y = 140; y <= H - 140; y += 58) {
                drawRockMountain(26, y, 22);
                drawRockMountain(W - 26, y, 22);
            }
            break;
        }
        case 8: {
            fillGrassBg('#6cb83b');
            drawRoadPath([[210, 65], [210, H - 65]], 38, true);
            drawRoadPath([[105, 65], [105, 220], [210, 260]], 30, true);
            drawRoadPath([[315, H - 65], [315, H - 220], [210, H - 260]], 30, true);
            [[42, 320], [95, 340], [142, 355], [278, 355], [325, 340], [378, 320],
             [48, 395], [102, 395], [318, 395], [372, 395]].forEach(([x, y]) =>
                drawRockMountain(x, y, 25)
            );
            break;
        }
        case 9: {
            fillGrassBg('#7bc64d');
            drawRingRoad(210, 205, 54, 30, true);
            drawRingRoad(210, H - 205, 54, 30, true);
            drawRoadPath([[95, 205], [95, H - 205]], 32, true);
            drawRoadPath([[325, 205], [325, H - 205]], 32, true);
            drawRoadPath([[210, 65], [210, 150]], 34, true);
            drawRoadPath([[210, H - 150], [210, H - 65]], 34, true);
            drawHouse(142, H / 2 - 48, 40, 40, 8, 2);
            drawHouse(238, H / 2 - 48, 40, 40, 9, 3);
            drawHouse(142, H / 2 + 12, 40, 40, 9, 1);
            drawHouse(238, H / 2 + 12, 40, 40, 8, 3);
            break;
        }
        case 10: {
            targetCtx.fillStyle = '#fde68a';
            targetCtx.fillRect(0, 0, W, H);
            targetCtx.fillStyle = '#7bc64d';
            targetCtx.fillRect(215, 0, W - 215, H);
            drawWaterBox(0, 0, 118, H, 0);
            drawRoadPath([[165, 65], [165, H - 65]], 34, false);
            drawRoadPath([[285, 65], [265, 240], [300, 450], [275, H - 65]], 34, false);
            drawRoadPath([[165, H / 2], [285, H / 2]], 30, false);
            for (let y = 120; y <= H - 120; y += 64) {
                drawRockMountain(378, y, 24);
            }
            break;
        }
        case 11: {
            fillGrassBg('#65a30d');
            drawRoadPath([[210, 60], [210, H - 60]], 38, true);
            drawRoadPath([[45, 245], [W - 45, 245]], 32, true);
            drawRoadPath([[45, H - 245], [W - 45, H - 245]], 32, true);
            drawRoadPath([[95, 130], [95, H - 130]], 28, true);
            drawRoadPath([[325, 130], [325, H - 130]], 28, true);
            drawHouse(125, 145, 48, 48, 14, 0);
            drawHouse(247, 145, 48, 48, 14, 0);
            drawHouse(125, H - 193, 48, 48, 14, 3);
            drawHouse(247, H - 193, 48, 48, 14, 3);
            break;
        }
        case 12: {
            fillGrassBg('#74c043');
            drawRoadPath([[95, 165], [325, 165], [325, H - 165], [95, H - 165], [95, 165]], 34, true);
            drawRoadPath([[210, 65], [210, 165]], 36, true);
            drawRoadPath([[210, H - 165], [210, H - 65]], 36, true);
            drawStoneWallBox(148, H / 2 - 62, 124, 124);
            drawHouse(184, H / 2 - 26, 52, 52, 7, 0);
            break;
        }
        case 13: {
            fillGrassBg('#7bc64d');
            drawWaterBox(0, 210, W, 62, 0);
            drawWaterBox(0, H - 272, W, 62, 0);
            drawWaterBox(180, 135, 60, H - 270, 0);

            drawRoadPath([[105, 65], [105, H - 65]], 32, true);
            drawRoadPath([[315, 65], [315, H - 65]], 32, true);
            drawRoadPath([[105, H / 2], [315, H / 2]], 32, true);

            drawBridgeBox(105, 241, 46, 72, true);
            drawBridgeBox(315, 241, 46, 72, true);
            drawBridgeBox(105, H - 241, 46, 72, true);
            drawBridgeBox(315, H - 241, 46, 72, true);
            drawBridgeBox(210, H / 2, 46, 74, false);
            break;
        }
        case 14: {
            fillGrassBg('#6cb83b');
            drawRingRoad(210, H / 2, 132, 36, true);
            drawRoadPath([[210, 65], [210, H / 2 - 132]], 36, true);
            drawRoadPath([[210, H / 2 + 132], [210, H - 65]], 36, true);
            drawWaterBox(166, H / 2 - 44, 88, 88, 16);
            [[52, 150], [368, 150], [52, H - 150], [368, H - 150], [140, H / 2 - 62], [280, H / 2 + 62]].forEach(
                ([x, y], i) => drawTree(x, y, 1.1, i % 2)
            );
            break;
        }
        case 15:
        default: {
            fillGrassBg('#7bc64d');
            drawRoadPath([[95, 65], [95, H - 65]], 34, true);
            drawRoadPath([[210, 65], [210, H - 65]], 36, true);
            drawRoadPath([[325, 65], [325, H - 65]], 34, true);

            drawStoneWallBox(12, 215, 52, 28);
            drawStoneWallBox(126, 215, 52, 28);
            drawStoneWallBox(242, 215, 52, 28);
            drawStoneWallBox(356, 215, 52, 28);

            drawStoneWallBox(12, H - 243, 52, 28);
            drawStoneWallBox(126, H - 243, 52, 28);
            drawStoneWallBox(242, H - 243, 52, 28);
            drawStoneWallBox(356, H - 243, 52, 28);
            break;
        }
    }

    if (includeMiniBases) {
        targetCtx.fillStyle = '#dc2626';
        targetCtx.strokeStyle = '#0f172a';
        targetCtx.lineWidth = 3;
        targetCtx.beginPath();
        targetCtx.roundRect(W / 2 - 42, 34, 84, 42, 8);
        targetCtx.fill();
        targetCtx.stroke();

        targetCtx.fillStyle = '#0284c7';
        targetCtx.beginPath();
        targetCtx.roundRect(W / 2 - 42, H - 76, 84, 42, 8);
        targetCtx.fill();
        targetCtx.stroke();
    }

    targetCtx.restore();

    if (registerNav) {
        nav.buildFlowFields();
    }
}

export function buildStaticMapCanvas(levelNum) {
    if (!atlas.bakedMapCanvas) {
        atlas.bakedMapCanvas = document.createElement('canvas');
        atlas.bakedMapCanvas.width = LOGICAL_WIDTH;
        atlas.bakedMapCanvas.height = PLAYFIELD_HEIGHT;
    }
    const bCtx = atlas.bakedMapCanvas.getContext('2d');
    bCtx.clearRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);
    renderMap(bCtx, LOGICAL_WIDTH, PLAYFIELD_HEIGHT, levelNum, false);
}