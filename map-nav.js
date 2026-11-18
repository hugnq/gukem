/* ============================================================================
   TINY BATTLE - NAVIGATION FLOW-FIELD, 54 MAPS & WORLD ROADMAP (js/map-nav.js)
   Tích hợp trực tiếp 7 ảnh bản đồ gốc (assets/maps/*.png) + Cắt lưới 3x3
   Lưới điều hướng ngầm NavSystem 42x71 khớp 100% 54 chiến trường •
   1440x900 World Campaign Roadmap • Hiệu ứng môi trường động 60-120 FPS
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
    T_OBSTACLE,
    WORLD_MAP_WIDTH,
    WORLD_MAP_HEIGHT,
    LEVELS
} from './config.js';
import { mapBufferCache, mapAssets, drawRoundRectPath } from './engine-core.js';

export const worldMapBufferCache = {
    canvas: null,
    hasRealImage: false
};

// ============================================================================
// 1. HỆ THỐNG LƯỚI ĐỊA HÌNH VÀ TÌM ĐƯỜNG DIJKSTRA FLOW-FIELD (NAVSYSTEM 42x71)
// ============================================================================
export class NavSystem {
    constructor() {
        this.grid = new Uint8Array(GRID_W * GRID_H);
        this.waterMask = new Uint8Array(GRID_W * GRID_H);
        this.obstacles = [];
        this.bridges = [];
        this.waterBoxes = [];
        this.lavaBoxes = [];
        this.acidBoxes = [];
        this.iceZones = [];
        this.toxicZones = [];
        this.campfires = [];
        this.flowBlueLand = new Float32Array(GRID_W * GRID_H);
        this.flowRedLand = new Float32Array(GRID_W * GRID_H);
        this.flowBlueNaval = new Float32Array(GRID_W * GRID_H);
        this.flowRedNaval = new Float32Array(GRID_W * GRID_H);
    }

    reset() {
        this.grid.fill(T_OPEN);
        this.waterMask.fill(0);
        this.obstacles = [];
        this.bridges = [];
        this.waterBoxes = [];
        this.lavaBoxes = [];
        this.acidBoxes = [];
        this.iceZones = [];
        this.toxicZones = [];
        this.campfires = [];
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

    isNavalWaterIndex(i) {
        const ct = this.grid[i];
        return ct === T_WATER || (ct === T_BRIDGE && this.waterMask[i] === 1);
    }

    isNavalWaterCell(gx, gy) {
        if (!this.inBounds(gx, gy)) return false;
        return this.isNavalWaterIndex(this.idx(gx, gy));
    }

    hasNavigableWater() {
        for (let i = 0; i < this.grid.length; i++) {
            if (this.isNavalWaterIndex(i)) return true;
        }
        return false;
    }

    isValidBattleDeployPoint(spec, x, y) {
        if (!spec) return false;
        if (x < 26 || x > LOGICAL_WIDTH - 26) return false;
        if (y < PLAYFIELD_HEIGHT * 0.48 || y > PLAYFIELD_HEIGHT - 95) return false;

        if (spec.isAir) return true;

        const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(x / NAV_CELL)));
        const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(y / NAV_CELL)));

        if (spec.isNaval) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (this.isNavalWaterCell(gx + dx, gy + dy)) return true;
                }
            }
            return false;
        }

        const cell = this.grid[this.idx(gx, gy)];
        if (cell === T_WATER || cell === T_OBSTACLE) return false;

        const effR = Math.max(8, (spec.radius || 12) * 0.72);
        for (const obs of this.obstacles) {
            if (obs.type === 'circle') {
                if (Math.hypot(x - obs.x, y - obs.y) < obs.r + effR) return false;
            } else if (obs.type === 'box') {
                const cx = Math.max(obs.x, Math.min(x, obs.x + obs.w));
                const cy = Math.max(obs.y, Math.min(y, obs.y + obs.h));
                if (Math.hypot(x - cx, y - cy) < effR) return false;
            }
        }
        return true;
    }

    isValidChallengeTileTerrain(spec, x, y) {
        if (!spec) return false;
        if (spec.isAir) return true;

        const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(x / NAV_CELL)));
        const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(y / NAV_CELL)));
        const cell = this.grid[this.idx(gx, gy)];

        if (spec.isNaval) {
            return cell === T_WATER;
        }
        return cell !== T_WATER && cell !== T_OBSTACLE;
    }

    markRect(x, y, w, h, type, overrideAll = true) {
        const c0 = Math.max(0, Math.floor(x / NAV_CELL));
        const c1 = Math.min(GRID_W - 1, Math.floor((x + w) / NAV_CELL));
        const r0 = Math.max(0, Math.floor(y / NAV_CELL));
        const r1 = Math.min(GRID_H - 1, Math.floor((y + h) / NAV_CELL));

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const i = this.idx(c, r);
                if (type === T_WATER) {
                    this.waterMask[i] = 1;
                }
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
                    if (type === T_WATER) {
                        this.waterMask[i] = 1;
                    }
                    if (overrideAll || this.grid[i] === T_OPEN) {
                        this.grid[i] = type;
                    }
                }
            }
        }
    }

    markPolyline(pts, width, type, overrideAll = false) {
        const halfW = width * 0.5;
        for (let i = 0; i < pts.length - 1; i++) {
            const [x1, y1] = pts[i];
            const [x2, y2] = pts[i + 1];
            const len = Math.hypot(x2 - x1, y2 - y1);
            const steps = Math.max(1, Math.ceil(len / (NAV_CELL * 0.45)));
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const px = x1 + (x2 - x1) * t;
                const py = y1 + (y2 - y1) * t;
                this.markCircle(px, py, halfW, type, overrideAll);
            }
        }
    }

    markRing(cx, cy, r, width, type) {
        const halfW = width * 0.5;
        const steps = Math.max(24, Math.ceil((2 * Math.PI * r) / (NAV_CELL * 0.45)));
        for (let s = 0; s < steps; s++) {
            const a = (s / steps) * Math.PI * 2;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            this.markCircle(px, py, halfW, type, false);
        }
    }

    isRoadOrBridgeOrSpawn(cx, cy, pad = 18) {
        if (cy < 118 || cy > PLAYFIELD_HEIGHT - 118) {
            if (cx > 58 && cx < LOGICAL_WIDTH - 58) return true;
        }
        const c0 = Math.max(0, Math.floor((cx - pad) / NAV_CELL));
        const c1 = Math.min(GRID_W - 1, Math.floor((cx + pad) / NAV_CELL));
        const r0 = Math.max(0, Math.floor((cy - pad) / NAV_CELL));
        const r1 = Math.min(GRID_H - 1, Math.floor((cy + pad) / NAV_CELL));

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const cell = this.grid[this.idx(c, r)];
                if (cell === T_ROAD || cell === T_BRIDGE || cell === T_WATER) return true;
            }
        }
        return false;
    }

    hasObstacleNear(cx, cy, minDist = 24) {
        for (const obs of this.obstacles) {
            if (obs.type === 'circle') {
                if (Math.hypot(cx - obs.x, cy - obs.y) < obs.r + minDist) return true;
            } else if (obs.type === 'box') {
                const bx = Math.max(obs.x, Math.min(cx, obs.x + obs.w));
                const by = Math.max(obs.y, Math.min(cy, obs.y + obs.h));
                if (Math.hypot(cx - bx, cy - by) < minDist) return true;
            }
        }
        return false;
    }

    addCircleObstacle(x, y, r, kind = 'tree') {
        this.obstacles.push({ type: 'circle', kind, x, y, r });
        const c0 = Math.max(0, Math.floor((x - (r + 2)) / NAV_CELL));
        const c1 = Math.min(GRID_W - 1, Math.floor((x + (r + 2)) / NAV_CELL));
        const r0 = Math.max(0, Math.floor((y - (r + 2)) / NAV_CELL));
        const r1 = Math.min(GRID_H - 1, Math.floor((y + (r + 2)) / NAV_CELL));
        for (let gy = r0; gy <= r1; gy++) {
            for (let gx = c0; gx <= c1; gx++) {
                const px = (gx + 0.5) * NAV_CELL;
                const py = (gy + 0.5) * NAV_CELL;
                if (Math.hypot(px - x, py - y) <= r + 2) {
                    const i = this.idx(gx, gy);
                    this.grid[i] = T_OBSTACLE;
                    this.waterMask[i] = 0;
                }
            }
        }
    }

    addBoxObstacle(x, y, w, h, kind = 'building') {
        this.obstacles.push({ type: 'box', kind, x, y, w, h });
        const c0 = Math.max(0, Math.floor((x - 2) / NAV_CELL));
        const c1 = Math.min(GRID_W - 1, Math.floor((x + w + 2) / NAV_CELL));
        const r0 = Math.max(0, Math.floor((y - 2) / NAV_CELL));
        const r1 = Math.min(GRID_H - 1, Math.floor((y + h + 2) / NAV_CELL));
        for (let gy = r0; gy <= r1; gy++) {
            for (let gx = c0; gx <= c1; gx++) {
                const i = this.idx(gx, gy);
                this.grid[i] = T_OBSTACLE;
                this.waterMask[i] = 0;
            }
        }
    }

    addBridge(cx, cy, w, h, isVertical = true, angleRad = 0, style = 'wood') {
        const bw = isVertical ? w : h;
        const bh = isVertical ? h : w;
        const bx = cx - bw / 2;
        const by = cy - bh / 2;
        this.bridges.push({ x: bx, y: by, cx, cy, w: bw, h: bh, isVertical, angleRad, style });
        const padX = isVertical ? 4 : 12;
        const padY = isVertical ? 12 : 4;
        this.markRect(bx - padX, by - padY, bw + padX * 2, bh + padY * 2, T_BRIDGE, true);
    }

    isPointOnBridge(x, y, margin = 5) {
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
        if (this.isPointOnBridge(x, y, 5)) return false;
        const cell = this.getCellAtPixel(x, y);
        return cell === T_WATER;
    }

    isPointOnIce(x, y) {
        for (const iz of this.iceZones) {
            if (x >= iz.x && x <= iz.x + iz.w && y >= iz.y && y <= iz.y + iz.h) {
                return true;
            }
        }
        return false;
    }

    isPointInToxicSwamp(x, y) {
        if (this.isPointOnBridge(x, y, 5)) return false;
        const cell = this.getCellAtPixel(x, y);
        if (cell === T_ROAD || cell === T_BRIDGE) return false;
        for (const tz of this.toxicZones) {
            if (x >= tz.x && x <= tz.x + tz.w && y >= tz.y && y <= tz.y + tz.h) {
                return true;
            }
        }
        return false;
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
        let minWaterRow = GRID_H;
        let maxWaterRow = -1;
        for (let r = 0; r < GRID_H; r++) {
            for (let c = 0; c < GRID_W; c++) {
                const i = this.idx(c, r);
                if (this.isNavalWaterIndex(i)) {
                    if (r < minWaterRow) minWaterRow = r;
                    if (r > maxWaterRow) maxWaterRow = r;
                }
            }
        }
        if (maxWaterRow >= minWaterRow) {
            for (let r = minWaterRow; r <= Math.min(GRID_H - 1, minWaterRow + 3); r++) {
                for (let c = 0; c < GRID_W; c++) {
                    if (this.isNavalWaterCell(c, r)) blueNavalGoals.push([c, r]);
                }
            }
            for (let r = Math.max(0, maxWaterRow - 3); r <= maxWaterRow; r++) {
                for (let c = 0; c < GRID_W; c++) {
                    if (this.isNavalWaterCell(c, r)) redNavalGoals.push([c, r]);
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
                    if (!this.isNavalWaterIndex(nIdx)) continue;
                    if (dx !== 0 && dy !== 0) {
                        if (!this.isNavalWaterCell(cx + dx, cy) || !this.isNavalWaterCell(cx, cy + dy)) {
                            continue;
                        }
                    }
                    terrainCost = 1.0;
                } else {
                    if (cellType === T_OBSTACLE || cellType === T_WATER) continue;
                    if (cellType === T_BRIDGE) terrainCost = 0.70;
                    else if (cellType === T_ROAD) terrainCost = 0.80;
                    else terrainCost = 1.40;
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

        const bestVal = distArr[this.idx(gx, gy)];
        if (bestVal >= 1e8) {
            return { dirX: 0, dirY: team === 'blue' ? -1 : 1 };
        }

        let gradX = 0;
        let gradY = 0;
        const radius = isNaval ? 1 : 2;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = gx + dx;
                const ny = gy + dy;
                if (!this.inBounds(nx, ny)) continue;
                const nIdx = this.idx(nx, ny);
                if (isNaval && !this.isNavalWaterIndex(nIdx)) continue;
                const nVal = distArr[nIdx];
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
            let bestX = u.x;
            let bestY = u.y;
            let minD = Infinity;

            for (let r = -5; r <= 5; r++) {
                for (let c = -5; c <= 5; c++) {
                    const nx = gx + c;
                    const ny = gy + r;
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
            const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(u.x / NAV_CELL)));
            const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(u.y / NAV_CELL)));
            if (!this.isNavalWaterCell(gx, gy)) {
                let bestX = u.x;
                let bestY = u.y;
                let minD = Infinity;

                for (let r = -6; r <= 6; r++) {
                    for (let c = -6; c <= 6; c++) {
                        const nx = gx + c;
                        const ny = gy + r;
                        if (!this.inBounds(nx, ny)) continue;
                        if (this.isNavalWaterCell(nx, ny)) {
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
                u.x += (bestX - u.x) * 0.65;
                u.y += (bestY - u.y) * 0.65;
            }
        }

        u.x = Math.max(24, Math.min(LOGICAL_WIDTH - 24, u.x));
        u.y = Math.max(30, Math.min(PLAYFIELD_HEIGHT - 24, u.y));
    }

    findValidSpawnPoint(team, spec, prefX, prefY, exactPref = false) {
        if (spec.isAir) return { x: prefX, y: prefY };

        if (spec.isNaval) {
            let bestX = prefX;
            let bestY = prefY;
            let bestScore = Infinity;
            const targetY = exactPref ? prefY : (team === 'blue' ? PLAYFIELD_HEIGHT - 120 : 120);
            for (let r = 4; r < GRID_H - 4; r++) {
                for (let c = 2; c < GRID_W - 2; c++) {
                    if (this.isNavalWaterCell(c, r)) {
                        const px = (c + 0.5) * NAV_CELL;
                        const py = (r + 0.5) * NAV_CELL;
                        const score = exactPref
                            ? Math.hypot(px - prefX, py - prefY)
                            : Math.abs(py - targetY) * 1.5 + Math.abs(px - prefX) * 0.35 + (Math.random() * 14);
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

        if (exactPref && this.isValidBattleDeployPoint(spec, prefX, prefY)) {
            return { x: prefX, y: prefY };
        }

        const gx = Math.max(2, Math.min(GRID_W - 3, Math.floor(prefX / NAV_CELL)));
        const gy = Math.max(3, Math.min(GRID_H - 4, Math.floor(prefY / NAV_CELL)));
        const distArr = team === 'blue' ? this.flowBlueLand : this.flowRedLand;

        let bestX = prefX;
        let bestY = prefY;
        let minScore = Infinity;
        for (let r = -4; r <= 4; r++) {
            for (let c = -14; c <= 14; c++) {
                const nx = gx + c;
                const ny = gy + r;
                if (!this.inBounds(nx, ny)) continue;
                const i = this.idx(nx, ny);
                const ct = this.grid[i];
                if ((ct === T_ROAD || ct === T_OPEN || ct === T_BRIDGE) && distArr[i] < 1e8) {
                    const px = (nx + 0.5) * NAV_CELL;
                    const py = (ny + 0.5) * NAV_CELL;
                    const roadBonus = (!exactPref && ct === T_ROAD) ? -12 : 0;
                    const score = Math.hypot(px - prefX, (py - prefY) * (exactPref ? 1.0 : 2.0)) + roadBonus;
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
// 2. LỚP HIỆU ỨNG MÔI TRƯỜNG ĐỘNG PHỦ TRÊN ẢNH MAP .PNG (60-120 FPS)
// ============================================================================
export function calcProceduralWaveOffset(time, x) {
    return Math.sin(time * 2.5 + x * 0.05) * 3 + Math.sin(-time * 1.8 + x * 0.08) * 1.5;
}

export function drawDynamicSineWater(targetCtx, timeSec, levelNum) {
    const lv = Math.max(1, Number(levelNum) || 1);
    const biomeId = Math.ceil(lv / 9);
    const hasPngSheet = !!mapAssets.getImage(`biome_${biomeId}`);

    // 1. Sóng lăn tăn nhẹ nhàng trên vùng nước (không che đè cầu/đất của ảnh gốc)
    if (nav.waterBoxes && nav.waterBoxes.length > 0) {
        for (const wb of nav.waterBoxes) {
            targetCtx.save();
            drawRoundRectPath(targetCtx, wb.x, wb.y, wb.w, wb.h, wb.rounded || 0);
            targetCtx.clip();

            targetCtx.fillStyle = hasPngSheet ? 'rgba(224, 242, 254, 0.36)' : 'rgba(224, 242, 254, 0.78)';
            for (let baseRowY = wb.y + 14; baseRowY < wb.y + wb.h - 6; baseRowY += 22) {
                for (let x = wb.x + 8; x < wb.x + wb.w - 10; x += 14) {
                    const yOff = calcProceduralWaveOffset(timeSec, x + baseRowY * 0.35);
                    targetCtx.fillRect(x, Math.round(baseRowY + yOff), 7, 2);
                }
            }
            targetCtx.restore();
        }
    }

    // 2. Tia lửa & bong bóng nham thạch sôi sục (Vùng 4: Map 28–36)
    if (nav.lavaBoxes && nav.lavaBoxes.length > 0) {
        for (const lb of nav.lavaBoxes) {
            targetCtx.save();
            drawRoundRectPath(targetCtx, lb.x, lb.y, lb.w, lb.h, lb.rounded || 0);
            targetCtx.clip();

            targetCtx.fillStyle = hasPngSheet ? 'rgba(254, 240, 138, 0.55)' : '#fef08a';
            for (let i = 0; i < 7; i++) {
                const bx = lb.x + 10 + ((i * 53 + Math.floor(timeSec * 14)) % Math.max(14, lb.w - 20));
                const by = lb.y + 10 + ((i * 37 + Math.floor(timeSec * 10)) % Math.max(14, lb.h - 20));
                const r = 1.8 + Math.abs(Math.sin(timeSec * 4.2 + i)) * 2.2;
                targetCtx.beginPath();
                targetCtx.arc(bx, by, r, 0, Math.PI * 2);
                targetCtx.fill();
            }
            targetCtx.restore();
        }
    }

    // 3. Bong bóng axit nổi lên và vỡ (Vùng 5: Map 37–45)
    if (nav.acidBoxes && nav.acidBoxes.length > 0) {
        for (const ab of nav.acidBoxes) {
            targetCtx.save();
            drawRoundRectPath(targetCtx, ab.x, ab.y, ab.w, ab.h, ab.rounded || 0);
            targetCtx.clip();

            for (let i = 0; i < 8; i++) {
                const cycle = (timeSec * 1.4 + i * 0.37) % 1;
                const bx = ab.x + 8 + ((i * 43) % Math.max(12, ab.w - 16));
                const by = ab.y + 8 + ((i * 31) % Math.max(12, ab.h - 16));
                const r = 1.8 + cycle * 3.6;
                targetCtx.strokeStyle = `rgba(217, 249, 157, ${(1 - cycle) * 0.85})`;
                targetCtx.lineWidth = 1.4;
                targetCtx.beginPath();
                targetCtx.arc(bx, by, r, 0, Math.PI * 2);
                targetCtx.stroke();
            }
            targetCtx.restore();
        }
    }

    // Chỉ vẽ cầu thủ công khi dùng nền dự phòng (không có ảnh .png)
    if (!hasPngSheet) {
        for (const br of nav.bridges) {
            targetCtx.save();
            targetCtx.translate(br.cx, br.cy);
            if (br.angleRad) targetCtx.rotate(br.angleRad);
            targetCtx.fillStyle = '#78350f';
            targetCtx.strokeStyle = '#0f172a';
            targetCtx.lineWidth = 2;
            targetCtx.fillRect(-br.w / 2, -br.h / 2, br.w, br.h);
            targetCtx.strokeRect(-br.w / 2, -br.h / 2, br.w, br.h);
            targetCtx.restore();
        }
    }

    // 4. Đống lửa trại bập bùng (Map 11)
    if (nav.campfires && nav.campfires.length > 0) {
        for (const cf of nav.campfires) {
            targetCtx.save();
            const flicker = 1 + Math.sin(timeSec * 14 + cf.x) * 0.22;
            targetCtx.fillStyle = 'rgba(249, 115, 22, 0.85)';
            targetCtx.beginPath();
            targetCtx.arc(cf.x, cf.y - 2, 5 * flicker, 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.restore();
        }
    }

    // 5. Khói trắng bay lên nhẹ từ ống khói Dinh Thự Đỏ & Xanh trên ảnh gốc
    targetCtx.save();
    [[238, 22], [238, PLAYFIELD_HEIGHT - 84]].forEach(([sx, sy], idx) => {
        for (let s = 0; s < 3; s++) {
            const age = (timeSec * 0.55 + s * 0.33 + idx * 0.2) % 1;
            targetCtx.globalAlpha = (1 - age) * 0.36;
            targetCtx.fillStyle = '#f8fafc';
            targetCtx.beginPath();
            targetCtx.arc(sx + Math.sin(timeSec * 1.8 + s) * 5, sy - age * 24, 3.2 + age * 4.2, 0, Math.PI * 2);
            targetCtx.fill();
        }
    });
    targetCtx.restore();

    // 6. Hạt thời tiết đặc trưng từng Quần Xã (6 Biomes) phủ nhẹ bên trên ảnh map .png
    targetCtx.save();
    if (biomeId === 1) {
        // Thảo nguyên: Đom đóm vàng nhẹ
        targetCtx.fillStyle = 'rgba(254, 240, 138, 0.72)';
        for (let i = 0; i < 12; i++) {
            const fx = (i * 61 + Math.sin(timeSec * 1.5 + i) * 22 + LOGICAL_WIDTH) % LOGICAL_WIDTH;
            const fy = (i * 53 + Math.cos(timeSec * 1.2 + i) * 18 + PLAYFIELD_HEIGHT) % PLAYFIELD_HEIGHT;
            targetCtx.fillRect(fx, fy, 2.4, 2.4);
        }
    } else if (biomeId === 2) {
        // Hoang mạc: Gió cát sa mạc bay ngang
        targetCtx.fillStyle = 'rgba(253, 186, 116, 0.38)';
        for (let i = 0; i < 18; i++) {
            const sx = ((i * 67 + Math.floor(timeSec * 115)) % (LOGICAL_WIDTH + 30)) - 15;
            const sy = (i * 83 + Math.floor(Math.sin(timeSec * 2 + i) * 14)) % PLAYFIELD_HEIGHT;
            targetCtx.fillRect(sx, sy, 12, 2);
        }
    } else if (biomeId === 3) {
        // Băng giá: Bông tuyết rơi lất phất
        targetCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let i = 0; i < 26; i++) {
            const sx = (i * 43 + Math.sin(timeSec * 2 + i) * 16 + LOGICAL_WIDTH) % LOGICAL_WIDTH;
            const sy = (i * 37 + timeSec * 42) % PLAYFIELD_HEIGHT;
            targetCtx.beginPath();
            targetCtx.arc(sx, sy, 2, 0, Math.PI * 2);
            targetCtx.fill();
        }
    } else if (biomeId === 4) {
        // Núi lửa: Tàn lửa cam bay lên
        targetCtx.fillStyle = 'rgba(251, 146, 60, 0.82)';
        for (let i = 0; i < 22; i++) {
            const ax = (i * 59 + Math.sin(timeSec * 1.8 + i) * 18 + LOGICAL_WIDTH) % LOGICAL_WIDTH;
            const ay = PLAYFIELD_HEIGHT - ((i * 47 + timeSec * 40) % PLAYFIELD_HEIGHT);
            targetCtx.fillRect(ax, ay, 2.8, 2.8);
        }
    } else if (biomeId === 5) {
        // Đầm lầy: Bào tử khí độc xanh neon lơ lửng
        targetCtx.fillStyle = 'rgba(163, 230, 53, 0.72)';
        for (let i = 0; i < 18; i++) {
            const px = (i * 53 + Math.sin(timeSec * 1.6 + i) * 20 + LOGICAL_WIDTH) % LOGICAL_WIDTH;
            const py = PLAYFIELD_HEIGHT - ((i * 41 + timeSec * 22) % PLAYFIELD_HEIGHT);
            targetCtx.beginPath();
            targetCtx.arc(px, py, 2.5, 0, Math.PI * 2);
            targetCtx.fill();
        }
    } else if (biomeId === 6) {
        // Anh đào: Cánh hoa anh đào hồng bay theo gió
        targetCtx.fillStyle = 'rgba(244, 114, 182, 0.88)';
        for (let i = 0; i < 24; i++) {
            const px = (i * 49 + Math.sin(timeSec * 2.2 + i) * 26 + timeSec * 18) % LOGICAL_WIDTH;
            const py = (i * 39 + timeSec * 28) % PLAYFIELD_HEIGHT;
            targetCtx.beginPath();
            targetCtx.ellipse(px, py, 3.2, 1.8, timeSec * 2 + i, 0, Math.PI * 2);
            targetCtx.fill();
        }
    }

    // 7. Bóng mây trôi nhẹ qua sân đấu
    targetCtx.fillStyle = 'rgba(15, 23, 42, 0.08)';
    const cloudX = ((timeSec * 14) % (LOGICAL_WIDTH + 260)) - 130;
    targetCtx.beginPath();
    targetCtx.ellipse(cloudX, PLAYFIELD_HEIGHT * 0.36, 95, 36, 0.15, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.restore();
}

// ============================================================================
// 3. RENDER 54 CHIẾN TRƯỜNG TỪ ẢNH GỐC (.PNG) + ĐỒNG BỘ LƯỚI NAVSYSTEM 42x71
// ============================================================================
export function renderMap(targetCtx, targetW, targetH, levelNum) {
    const W = LOGICAL_WIDTH;
    const H = PLAYFIELD_HEIGHT;
    const registerNav = targetW === LOGICAL_WIDTH && targetH === PLAYFIELD_HEIGHT;

    if (registerNav) {
        nav.reset();
    }

    targetCtx.save();
    targetCtx.scale(targetW / W, targetH / H);
    targetCtx.imageSmoothingEnabled = false;

    const lv = Math.max(1, Math.min(54, Number(levelNum) || 1));
    const biomeId = Math.ceil(lv / 9);

    // 1. Cắt trực tiếp ô bản đồ từ 6 tấm sprite sheet gốc (assets/maps/biome_1..6.png)
    const hasPngTile = mapAssets.drawSlicedMapTile(targetCtx, lv, 0, 0, W, H);

    // 2. Nếu ảnh chưa kịp nạp (fallback), vẽ nền màu quần xã dự phòng để không bị màn hình đen
    if (!hasPngTile) {
        const fallbackGround = ['#65a30d', '#c2410c', '#bae6fd', '#262223', '#3f4a2c', '#6ec256'][biomeId - 1] || '#65a30d';
        targetCtx.fillStyle = fallbackGround;
        targetCtx.fillRect(0, 0, W, H);
    }

    // Helper đăng ký lưới địa hình ngầm cho NavSystem (không vẽ đè lên ảnh gốc nếu đã có ảnh .png)
    const regRoad = (pts, width = 34) => {
        if (registerNav) nav.markPolyline(pts, width + 8, T_ROAD);
        if (!hasPngTile) {
            targetCtx.save();
            targetCtx.strokeStyle = '#ca8a04';
            targetCtx.lineWidth = width;
            targetCtx.lineCap = 'round';
            targetCtx.lineJoin = 'round';
            targetCtx.beginPath();
            pts.forEach((p, i) => (i === 0 ? targetCtx.moveTo(p[0], p[1]) : targetCtx.lineTo(p[0], p[1])));
            targetCtx.stroke();
            targetCtx.restore();
        }
    };

    const regRing = (cx, cy, r, width = 34) => {
        if (registerNav) nav.markRing(cx, cy, r, width + 8, T_ROAD);
        if (!hasPngTile) {
            targetCtx.save();
            targetCtx.strokeStyle = '#ca8a04';
            targetCtx.lineWidth = width;
            targetCtx.beginPath();
            targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
            targetCtx.stroke();
            targetCtx.restore();
        }
    };

    const regWaterRect = (x, y, w, h, rounded = 0) => {
        if (registerNav) {
            nav.markRect(x, y, w, h, T_WATER, true);
            nav.waterBoxes.push({ x, y, w, h, rounded });
        }
        if (!hasPngTile) {
            targetCtx.fillStyle = '#0284c7';
            targetCtx.fillRect(x, y, w, h);
        }
    };

    const regLavaRect = (x, y, w, h, rounded = 12) => {
        if (registerNav) {
            nav.markRect(x, y, w, h, T_WATER, true);
            nav.lavaBoxes.push({ x, y, w, h, rounded });
        }
        if (!hasPngTile) {
            targetCtx.fillStyle = '#ea580c';
            targetCtx.fillRect(x, y, w, h);
        }
    };

    const regAcidRect = (x, y, w, h, rounded = 14) => {
        if (registerNav) {
            nav.markRect(x, y, w, h, T_OBSTACLE, true);
            nav.acidBoxes.push({ x, y, w, h, rounded });
        }
        if (!hasPngTile) {
            targetCtx.fillStyle = '#4ade80';
            targetCtx.fillRect(x, y, w, h);
        }
    };

    const regDiagonalStream = (pts, width = 62, kind = 'water') => {
        if (!registerNav) return;
        for (let i = 0; i < pts.length - 1; i++) {
            const [x1, y1] = pts[i];
            const [x2, y2] = pts[i + 1];
            const len = Math.hypot(x2 - x1, y2 - y1);
            const steps = Math.max(1, Math.ceil(len / 10));
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const px = x1 + (x2 - x1) * t;
                const py = y1 + (y2 - y1) * t;
                if (kind === 'acid') {
                    nav.markCircle(px, py, width * 0.45, T_OBSTACLE, true);
                    nav.acidBoxes.push({ x: px - width / 2, y: py - width / 2, w: width, h: width, rounded: width / 2 });
                } else {
                    nav.markCircle(px, py, width * 0.46, T_WATER, true);
                    if (kind === 'lava') {
                        nav.lavaBoxes.push({ x: px - width / 2, y: py - width / 2, w: width, h: width, rounded: width / 2 });
                    } else {
                        nav.waterBoxes.push({ x: px - width / 2, y: py - width / 2, w: width, h: width, rounded: width / 2 });
                    }
                }
            }
        }
    };

    const regBridge = (cx, cy, w = 48, h = 88, isVertical = true, style = 'wood', angleRad = 0) => {
        if (registerNav) {
            nav.addBridge(cx, cy, w, h, isVertical, angleRad, style);
        }
    };

    const regCircleObs = (x, y, r, kind = 'rock') => {
        if (registerNav) nav.addCircleObstacle(x, y, r, kind);
    };

    const regBoxObs = (x, y, w, h, kind = 'ruins') => {
        if (registerNav) nav.addBoxObstacle(x, y, w, h, kind);
    };

    // ========================================================================
    // 3. ĐĂNG KÝ ĐỊA HÌNH NGẦM KHỚP 100% VỚI 54 Ô TRÊN 6 ẢNH .PNG
    // ========================================================================
    if (registerNav) {
        switch (lv) {
            // ==================== BIOME 1 (01 – 09) ====================
            case 1:
                regWaterRect(0, H / 2 - 44, W, 88, 0);
                regRoad([[210, 90], [115, 155], [115, 235], [210, 285]], 30);
                regRoad([[210, 90], [305, 155], [305, 235], [210, 285]], 30);
                regRoad([[210, 285], [210, H - 285]], 36);
                regRoad([[210, H - 285], [115, H - 235], [115, H - 155], [210, H - 90]], 30);
                regRoad([[210, H - 285], [305, H - 235], [305, H - 155], [210, H - 90]], 30);
                regBridge(210, H / 2, 52, 98, true, 'wood');
                break;
            case 2:
                regRoad([[210, 85], [285, 130], [285, 195], [125, 255], [125, 345], [295, 415], [295, 505], [140, 565], [210, H - 85]], 36);
                regCircleObs(175, 190, 18);
                regCircleObs(255, 315, 20);
                regCircleObs(175, 455, 18);
                break;
            case 3:
                regRoad([[95, 90], [95, H - 90]], 32);
                regRoad([[325, 90], [325, H - 90]], 32);
                regRoad([[95, 115], [325, 115]], 28);
                regRoad([[95, H - 115], [325, H - 115]], 28);
                regBoxObs(152, 235, 116, 26);
                regBoxObs(152, 261, 26, 190);
                regBoxObs(242, 261, 26, 190);
                regBoxObs(152, 451, 116, 26);
                break;
            case 4:
                regRing(210, H / 2, 118, 34);
                regRoad([[210, 85], [210, H / 2 - 118]], 34);
                regRoad([[210, H / 2 + 118], [210, H - 85]], 34);
                regWaterRect(132, H / 2 - 78, 156, 156, 78);
                break;
            case 5:
                regRoad([[210, 85], [115, 145], [285, 215], [325, 360], [285, 505], [125, 565], [210, H - 85]], 34);
                [[165, 285], [215, 275], [145, 340], [195, 355], [240, 345], [160, 415], [215, 425]].forEach(([x, y]) => regCircleObs(x, y, 14));
                break;
            case 6:
                regRoad([[210, 85], [210, H - 85]], 34);
                regRoad([[75, 235], [345, 235]], 30);
                regRoad([[75, 475], [345, 475]], 30);
                regBoxObs(95, 275, 42, 36);
                regBoxObs(148, 335, 42, 36);
                regBoxObs(265, 275, 42, 36);
                regBoxObs(275, 385, 42, 36);
                regBoxObs(95, 395, 42, 36);
                break;
            case 7:
                regRoad([[95, 185], [325, 185], [325, H - 185], [95, H - 185], [95, 185]], 32);
                regRoad([[210, 85], [210, 185]], 34);
                regRoad([[210, H - 185], [210, H - 85]], 34);
                regWaterRect(65, H / 2 - 64, W - 130, 128, 34);
                regBridge(95, H / 2, 46, 138, true, 'wood');
                regBridge(325, H / 2, 46, 138, true, 'wood');
                break;
            case 8:
                regRing(210, H / 2, 108, 34);
                regRoad([[210, 85], [210, H / 2 - 108]], 34);
                regRoad([[210, H / 2 + 108], [210, H - 85]], 34);
                regRoad([[45, H / 2], [210 - 108, H / 2]], 30);
                regRoad([[210 + 108, H / 2], [W - 45, H / 2]], 30);
                regBoxObs(186, H / 2 - 28, 48, 56);
                break;
            case 9:
                regRoad([[105, 145], [210, H / 2], [315, 145]], 32);
                regRoad([[105, H - 145], [210, H / 2], [315, H - 145]], 32);
                regRoad([[210, 85], [210, H - 85]], 34);
                regRoad([[45, H / 2], [W - 45, H / 2]], 30);
                break;

            // ==================== BIOME 2 (10 – 18) ====================
            case 10:
                nav.markRect(0, H / 2 - 48, W, 96, T_OBSTACLE, true);
                regRoad([[210, 85], [210, H - 85]], 36);
                regBridge(210, H / 2, 50, 122, true, 'steel');
                break;
            case 11:
                regRoad([[210, 85], [295, 155], [125, 245], [295, 345], [125, 445], [285, 535], [210, H - 85]], 34);
                nav.campfires.push({ x: 146, y: 169 }, { x: 296, y: 469 });
                break;
            case 12:
                regRoad([[95, 185], [325, 185], [325, H - 185], [95, H - 185], [95, 185]], 32);
                regRoad([[210, 85], [210, 185]], 34);
                regRoad([[210, H - 185], [210, H - 85]], 34);
                regBoxObs(145, H / 2 - 68, 130, 24);
                regBoxObs(145, H / 2 + 44, 130, 24);
                regBoxObs(145, H / 2 - 44, 24, 88);
                regBoxObs(251, H / 2 - 44, 24, 88);
                break;
            case 13:
                regRing(210, H / 2, 114, 34);
                regRoad([[210, 85], [210, H / 2 - 114]], 34);
                regRoad([[210, H / 2 + 114], [210, H - 85]], 34);
                regCircleObs(210, H / 2, 24, 'derrick');
                break;
            case 14:
                regDiagonalStream([[45, 110], [165, 275], [255, 435], [375, 605]], 64, 'water');
                regRoad([[210, 85], [295, 185], [145, 345], [275, 465], [210, H - 85]], 34);
                regBridge(195, 315, 46, 78, true, 'wood', -0.55);
                regBridge(235, 415, 46, 78, true, 'wood', -0.55);
                break;
            case 15:
                regRoad([[88, 90], [88, H - 90]], 30);
                regRoad([[210, 90], [210, H - 90]], 32);
                regRoad([[332, 90], [332, H - 90]], 30);
                regBoxObs(28, 175, 132, 22);
                regBoxObs(260, 175, 132, 22);
                regCircleObs(150, H / 2 - 20, 18);
                regCircleObs(270, H / 2 + 20, 18);
                regBoxObs(28, H - 197, 132, 22);
                regBoxObs(260, H - 197, 132, 22);
                break;
            case 16:
                regRoad([[210, 85], [295, 185], [125, 345], [295, 485], [210, H - 85]], 34);
                regCircleObs(115, 245, 18);
                regCircleObs(310, 355, 18);
                break;
            case 17:
                regRoad([[105, 90], [105, H - 90]], 32);
                regRoad([[315, 90], [315, H - 90]], 32);
                regRoad([[105, 145], [315, 145]], 28);
                regRoad([[105, H - 145], [315, H - 145]], 28);
                regBoxObs(168, 215, 84, H - 430);
                break;
            case 18:
                regRoad([[210, 85], [305, 185], [115, 345], [305, 495], [210, H - 85]], 34);
                regBoxObs(121, 231, 28, 28);
                regBoxObs(271, 231, 28, 28);
                regBoxObs(261, 441, 28, 28);
                break;

            // ==================== BIOME 3 (19 – 27) ====================
            case 19:
                regDiagonalStream([[385, 130], [255, 285], [165, 435], [35, 585]], 64, 'water');
                regRoad([[210, 85], [135, 185], [275, 345], [145, 475], [210, H - 85]], 34);
                regBridge(265, 275, 46, 78, true, 'wood', 0.55);
                regBridge(155, 445, 46, 78, true, 'wood', 0.55);
                break;
            case 20:
                regRoad([[210, 85], [315, 145], [105, 235], [315, 335], [105, 435], [305, 525], [210, H - 85]], 34);
                regCircleObs(125, 155, 16);
                regCircleObs(295, 245, 16);
                regCircleObs(125, 345, 16);
                break;
            case 21:
                regRoad([[95, 185], [325, 185], [325, H - 185], [95, H - 185], [95, 185]], 32);
                regRoad([[210, 85], [210, 185]], 34);
                regRoad([[210, H - 185], [210, H - 85]], 34);
                regBoxObs(145, H / 2 - 68, 130, 24);
                regBoxObs(145, H / 2 + 44, 130, 24);
                regBoxObs(145, H / 2 - 44, 24, 88);
                regBoxObs(251, H / 2 - 44, 24, 88);
                break;
            case 22:
                nav.iceZones.push({ x: 128, y: H / 2 - 82, w: 164, h: 164 });
                regRing(210, H / 2, 118, 34);
                regRoad([[210, 85], [210, H / 2 - 118]], 34);
                regRoad([[210, H / 2 + 118], [210, H - 85]], 34);
                regCircleObs(185, H / 2 - 15, 14);
                regCircleObs(235, H / 2 + 18, 13);
                break;
            case 23:
                regDiagonalStream([[75, 155], [210, 325], [210, 565]], 54, 'water');
                regDiagonalStream([[345, 155], [210, 325]], 54, 'water');
                regRoad([[210, 85], [125, 245], [285, 365], [145, 495], [210, H - 85]], 34);
                regBridge(238, 285, 46, 72, true, 'wood', -0.45);
                regBridge(182, 425, 46, 72, true, 'wood', 0.45);
                break;
            case 24:
                regRoad([[210, 85], [305, 185], [115, 345], [305, 495], [210, H - 85]], 34);
                [[130, 210, 18], [175, 235, 16], [245, 445, 18], [290, 420, 16]].forEach(([x, y, r]) => regCircleObs(x, y, r));
                break;
            case 25:
                regRoad([[210, 85], [315, 225], [315, 485], [210, H - 85]], 34);
                regCircleObs(195, H / 2, 22);
                break;
            case 26:
                regRoad([[210, 85], [105, 165], [295, 265], [105, 395], [295, 505], [210, H - 85]], 34);
                [[245, 165], [155, 295], [245, 415], [155, 515]].forEach(([x, y]) => regCircleObs(x, y, 14));
                break;
            case 27:
                regRoad([[95, 90], [95, H - 90]], 30);
                regRoad([[210, 90], [210, H - 90]], 32);
                regRoad([[325, 90], [325, H - 90]], 30);
                regRoad([[95, 235], [325, 235]], 28);
                regRoad([[95, 465], [325, 465]], 28);
                regBoxObs(131, 161, 28, 28);
                regBoxObs(261, 161, 28, 28);
                regBoxObs(145, 315, 130, 26);
                break;

            // ==================== BIOME 4 (28 – 36) ====================
            case 28:
                regLavaRect(0, H / 2 - 48, W, 96, 0);
                regRoad([[210, 85], [105, 185], [105, H - 185], [210, H - 85]], 32);
                regRoad([[210, 85], [315, 185], [315, H - 185], [210, H - 85]], 32);
                regRoad([[210, 85], [210, H - 85]], 32);
                regBridge(105, H / 2, 46, 108, true, 'steel');
                regBridge(210, H / 2, 46, 108, true, 'steel');
                regBridge(315, H / 2, 46, 108, true, 'steel');
                break;
            case 29:
                regLavaRect(12, 145, 58, H - 290, 14);
                regLavaRect(W - 70, 145, 58, H - 290, 14);
                regRoad([[210, 85], [295, 185], [125, 345], [295, 495], [210, H - 85]], 34);
                break;
            case 30:
                regLavaRect(85, 175, W - 170, H - 350, 22);
                regRoad([[70, 160], [350, 160], [350, H - 160], [70, H - 160], [70, 160]], 32);
                regRoad([[210, 85], [210, 160]], 34);
                regRoad([[210, H - 160], [210, H - 85]], 34);
                regBoxObs(152, H / 2 - 58, 116, 116);
                break;
            case 31:
                regRing(210, H / 2, 118, 34);
                regRoad([[210, 85], [210, H / 2 - 118]], 34);
                regRoad([[210, H / 2 + 118], [210, H - 85]], 34);
                regLavaRect(132, H / 2 - 78, 156, 156, 78);
                break;
            case 32:
                regDiagonalStream([[385, 130], [255, 285], [165, 435], [35, 585]], 68, 'lava');
                regRoad([[210, 85], [135, 185], [275, 345], [145, 475], [210, H - 85]], 34);
                regBridge(265, 275, 48, 82, true, 'steel', 0.55);
                regBridge(155, 445, 48, 82, true, 'steel', 0.55);
                break;
            case 33:
                regLavaRect(45, 235, 135, 36, 12);
                regLavaRect(240, 425, 135, 36, 12);
                regRoad([[210, 85], [295, 175], [115, 345], [295, 515], [210, H - 85]], 34);
                break;
            case 34:
                regLavaRect(65, 275, 95, 95, 28);
                regLavaRect(235, 385, 105, 85, 24);
                regRoad([[210, 85], [305, 195], [115, 455], [210, H - 85]], 34);
                break;
            case 35:
                regLavaRect(0, H / 2 - 44, W, 88, 0);
                regRoad([[210, 85], [115, 175], [285, 255], [285, H - 235], [210, H - 85]], 34);
                regBridge(285, H / 2, 52, 102, true, 'steel');
                break;
            case 36:
                regRoad([[95, 90], [95, H - 90]], 32);
                regRoad([[210, 90], [210, H - 90]], 34);
                regRoad([[325, 90], [325, H - 90]], 32);
                regRoad([[95, 245], [325, 245]], 30);
                regRoad([[95, 465], [325, 465]], 30);
                regBoxObs(131, 171, 28, 28);
                regBoxObs(261, 171, 28, 28);
                regBoxObs(131, 331, 28, 28);
                regBoxObs(261, 331, 28, 28);
                break;

            // ==================== BIOME 5 (37 – 45) ====================
            case 37:
                nav.toxicZones.push({ x: 0, y: 120, w: W, h: H - 240 });
                regDiagonalStream([[365, 120], [185, 245], [255, 395], [95, 565]], 66, 'acid');
                regRoad([[210, 85], [125, 215], [285, 345], [145, 485], [210, H - 85]], 34);
                regBridge(245, 215, 48, 76, true, 'wood', 0.45);
                regBridge(210, 355, 48, 76, true, 'wood', -0.45);
                regBridge(155, 495, 48, 76, true, 'wood', 0.45);
                break;
            case 38:
                nav.toxicZones.push({ x: 0, y: 120, w: W, h: H - 240 });
                regAcidRect(16, 155, 56, H - 310, 16);
                regAcidRect(W - 72, 155, 56, H - 310, 16);
                regRoad([[210, 85], [295, 185], [125, 345], [295, 495], [210, H - 85]], 34);
                break;
            case 39:
                nav.toxicZones.push({ x: 0, y: 120, w: W, h: H - 240 });
                regAcidRect(82, 175, W - 164, H - 350, 22);
                regRoad([[68, 160], [352, 160], [352, H - 160], [68, H - 160], [68, 160]], 32);
                regRoad([[210, 85], [210, 160]], 34);
                regRoad([[210, H - 160], [210, H - 85]], 34);
                regBoxObs(152, H / 2 - 58, 116, 116);
                break;
            case 40:
                nav.toxicZones.push({ x: 0, y: 120, w: W, h: H - 240 });
                regRing(210, H / 2, 118, 34);
                regRoad([[210, 85], [210, H / 2 - 118]], 34);
                regRoad([[210, H / 2 + 118], [210, H - 85]], 34);
                regAcidRect(132, H / 2 - 78, 156, 156, 78);
                break;
            case 41:
                nav.toxicZones.push({ x: 0, y: 120, w: W, h: H - 240 });
                regDiagonalStream([[45, 130], [210, 355], [375, 580]], 58, 'acid');
                regDiagonalStream([[375, 130], [210, 355], [45, 580]], 58, 'acid');
                regRoad([[210, 85], [115, 255], [210, 355], [305, 465], [210, H - 85]], 34);
                regBridge(125, 240, 46, 72, true, 'wood', -0.5);
                regBridge(210, 355, 50, 74, true, 'wood', 0);
                regBridge(295, 470, 46, 72, true, 'wood', -0.5);
                break;
            case 42:
                regAcidRect(245, 195, 125, 45, 14);
                regAcidRect(55, 435, 125, 45, 14);
                regRoad([[210, 85], [125, 195], [295, 355], [125, 505], [210, H - 85]], 34);
                break;
            case 43:
                regAcidRect(45, 365, 115, 95, 24);
                regAcidRect(285, 215, 95, 85, 20);
                regRoad([[210, 85], [305, 215], [115, 465], [210, H - 85]], 34);
                break;
            case 44:
                nav.toxicZones.push({ x: 0, y: 120, w: W, h: H - 240 });
                regAcidRect(55, 225, 120, 44, 14);
                regAcidRect(245, 345, 120, 44, 14);
                regAcidRect(65, 465, 120, 44, 14);
                regRoad([[210, 85], [305, 155], [115, 295], [305, 425], [115, 535], [210, H - 85]], 34);
                break;
            case 45:
                nav.toxicZones.push({ x: 0, y: 120, w: W, h: H - 240 });
                regAcidRect(42, 165, W - 84, 38, 12);
                regAcidRect(42, H - 203, W - 84, 38, 12);
                regRoad([[210, 85], [210, H - 85]], 36);
                regRoad([[95, 255], [325, 255], [325, H - 255], [95, H - 255], [95, 255]], 30);
                regBridge(210, 184, 48, 52, true, 'wood');
                regBridge(210, H - 184, 48, 52, true, 'wood');
                regBoxObs(121, 221, 28, 28);
                regBoxObs(271, 221, 28, 28);
                regBoxObs(121, H - 249, 28, 28);
                regBoxObs(271, H - 249, 28, 28);
                break;

            // ==================== BIOME 6 (46 – 54) ====================
            case 46:
                regDiagonalStream([[365, 120], [185, 245], [255, 395], [95, 565]], 64, 'water');
                regRoad([[210, 85], [125, 215], [285, 345], [145, 485], [210, H - 85]], 34);
                regBridge(245, 215, 46, 74, true, 'sakura_arch', 0.45);
                regBridge(210, 355, 46, 74, true, 'sakura_arch', -0.45);
                regBridge(155, 495, 46, 74, true, 'sakura_arch', 0.45);
                break;
            case 47:
                regRoad([[210, 85], [295, 185], [125, 345], [295, 495], [210, H - 85]], 34);
                break;
            case 48:
                regRoad([[95, 185], [325, 185], [325, H - 185], [95, H - 185], [95, 185]], 32);
                regRoad([[210, 85], [210, 185]], 34);
                regRoad([[210, H - 185], [210, H - 85]], 34);
                regBoxObs(152, H / 2 - 58, 116, 116);
                break;
            case 49:
                regRing(210, H / 2, 118, 34);
                regRoad([[210, 85], [210, H / 2 - 118]], 34);
                regRoad([[210, H / 2 + 118], [210, H - 85]], 34);
                regWaterRect(132, H / 2 - 78, 156, 156, 78);
                break;
            case 50:
                regDiagonalStream([[385, 130], [255, 285], [165, 435], [35, 585]], 64, 'water');
                regRoad([[210, 85], [135, 185], [275, 345], [145, 475], [210, H - 85]], 34);
                regBridge(265, 275, 46, 78, true, 'sakura_arch', 0.55);
                regBridge(155, 445, 46, 78, true, 'sakura_arch', 0.55);
                break;
            case 51:
                regWaterRect(255, 195, 48, H - 390, 18);
                regRoad([[210, 85], [135, 195], [185, 355], [135, 505], [210, H - 85]], 34);
                break;
            case 52:
                regWaterRect(36, 225, 105, 115, 24);
                regWaterRect(W - 141, H - 340, 105, 115, 24);
                regRoad([[210, 85], [285, 215], [135, 455], [210, H - 85]], 34);
                regBoxObs(265, 155, 42, 36);
                break;
            case 53:
                regWaterRect(0, 415, W, 64, 0);
                regRoad([[210, 85], [125, 175], [295, 265], [125, 355], [295, 445], [145, 545], [210, H - 85]], 34);
                regBridge(295, 447, 46, 74, true, 'sakura_arch');
                regCircleObs(210, 265, 18);
                break;
            case 54:
            default:
                regWaterRect(0, H - 225, W, 62, 0);
                regRoad([[115, 85], [115, H - 85]], 32);
                regRoad([[305, 85], [305, H - 85]], 32);
                regRoad([[115, 265], [305, 265]], 30);
                regBridge(115, H - 194, 46, 72, true, 'sakura_arch');
                regBridge(305, H - 194, 46, 72, true, 'sakura_arch');
                regBoxObs(61, 181, 28, 28);
                regBoxObs(196, 181, 28, 28);
                regBoxObs(331, 181, 28, 28);
                break;
        }
    }

    targetCtx.restore();

    if (registerNav) {
        nav.buildFlowFields();
    }
}

export function buildStaticMapCanvas(levelNum) {
    if (!mapBufferCache.canvas) {
        mapBufferCache.canvas = document.createElement('canvas');
        mapBufferCache.canvas.width = LOGICAL_WIDTH;
        mapBufferCache.canvas.height = PLAYFIELD_HEIGHT;
    }
    const bCtx = mapBufferCache.canvas.getContext('2d');
    bCtx.clearRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);
    renderMap(bCtx, LOGICAL_WIDTH, PLAYFIELD_HEIGHT, levelNum);
}

// ============================================================================
// 4. BỘ VẼ WORLD CAMPAIGN ROADMAP TOÀN CẢNH 1440x900 (TỪ assets/maps/world_map.png)
// ============================================================================
export function buildWorldCampaignCanvas() {
    const worldImg = mapAssets.getImage('world_map');
    if (worldMapBufferCache.canvas && (worldMapBufferCache.hasRealImage || !worldImg)) {
        return worldMapBufferCache.canvas;
    }

    const c = worldMapBufferCache.canvas || document.createElement('canvas');
    c.width = WORLD_MAP_WIDTH;
    c.height = WORLD_MAP_HEIGHT;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT);

    if (worldImg) {
        ctx.drawImage(worldImg, 0, 0, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT);
        worldMapBufferCache.hasRealImage = true;
    } else {
        // Nền dự phòng 6 quần xã nếu ảnh world_map.png chưa nạp xong
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 0, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT);

        ctx.fillStyle = '#65a30d';
        ctx.fillRect(40, 120, 420, 740);
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(460, 110, 470, 410);
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(930, 90, 470, 320);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(930, 410, 480, 270);
        ctx.fillStyle = '#3f4a2c';
        ctx.fillRect(850, 680, 520, 190);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(455, 520, 405, 355);
        worldMapBufferCache.hasRealImage = false;
    }

    worldMapBufferCache.canvas = c;
    return c;
}

/**
 * Vẽ lớp tương tác động 60-120 FPS lên World Campaign Roadmap:
 * - Đường nối nét đứt chạy động từ 01 -> 54 (đã vượt: vàng-xanh sáng | chưa mở: trắng mờ)
 * - 54 huy hiệu chuẩn hóa 01 -> 54 tại đúng tọa độ (rx, ry) trên world_map.png
 * - Dải 3 sao ★★★, vòng Radar & cờ chỉ huy tại Level hiện tại
 */
export function renderWorldCampaignDynamicOverlay(ctx, timeSec, currentLevel, maxUnlockedLevel, getStarsFn) {
    // 1. Đường nối nét đứt chạy động từ 01 -> 54
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < LEVELS.length - 1; i++) {
        const m1 = LEVELS[i];
        const m2 = LEVELS[i + 1];
        const isClearedSeg = m2.id <= maxUnlockedLevel;

        ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        ctx.moveTo(m1.worldPos.x, m1.worldPos.y);
        ctx.lineTo(m2.worldPos.x, m2.worldPos.y);
        ctx.stroke();

        ctx.strokeStyle = isClearedSeg ? '#fde047' : 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 3.2;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -(timeSec * 22) % 14;
        ctx.beginPath();
        ctx.moveTo(m1.worldPos.x, m1.worldPos.y);
        ctx.lineTo(m2.worldPos.x, m2.worldPos.y);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // 2. Vẽ 54 Huy Hiệu Mốc Chiến Dịch chuẩn hóa 01 -> 54 tại đúng tọa độ (rx, ry)
    for (let i = 0; i < LEVELS.length; i++) {
        const m = LEVELS[i];
        const lv = m.id;
        const { x, y } = m.worldPos;
        const unlocked = lv <= maxUnlockedLevel;
        const isCurrent = lv === currentLevel;
        const stars = typeof getStarsFn === 'function' ? getStarsFn(lv) : (m.stars || 0);

        ctx.save();
        ctx.translate(x, y);

        // 2 Vòng sóng Radar lan tỏa đồng tâm & Mũi tên chỉ huy cho Level hiện tại
        if (isCurrent) {
            for (let rIdx = 0; rIdx < 2; rIdx++) {
                const phase = (timeSec * 1.15 + rIdx * 0.5) % 1;
                ctx.strokeStyle = `rgba(253, 224, 71, ${(1 - phase) * 0.92})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 18 + phase * 28, 0, Math.PI * 2);
                ctx.stroke();
            }

            const bob = Math.sin(timeSec * 6) * 4;
            ctx.fillStyle = '#fde047';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -32 + bob);
            ctx.lineTo(-8, -43 + bob);
            ctx.lineTo(8, -43 + bob);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // Bóng đổ huy hiệu
        ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
        ctx.beginPath();
        ctx.arc(1.5, 2.5, 16.5, 0, Math.PI * 2);
        ctx.fill();

        // Nền huy hiệu tròn viền sắc nét đè chuẩn lên nút trên world_map.png
        ctx.fillStyle = !unlocked
            ? '#334155'
            : (isCurrent ? '#f59e0b' : (stars > 0 ? '#16a34a' : '#eab308'));
        ctx.strokeStyle = isCurrent ? '#ffffff' : '#0f172a';
        ctx.lineWidth = isCurrent ? 3.2 : 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Số thứ tự chuẩn hóa 01 -> 54
        ctx.fillStyle = !unlocked ? '#94a3b8' : (stars > 0 || isCurrent ? '#ffffff' : '#0f172a');
        ctx.font = '900 12.5px "Chakra Petch", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(lv).padStart(2, '0'), 0, 0.5);

        // Dãy 3 sao ★★★ phía trên điểm mốc hoặc ổ khóa
        if (unlocked) {
            ctx.font = '900 9.5px sans-serif';
            for (let s = 0; s < 3; s++) {
                const sx = (s - 1) * 10;
                const sy = -22;
                ctx.fillStyle = s < stars ? '#facc15' : 'rgba(15, 23, 42, 0.72)';
                ctx.fillText('★', sx, sy);
            }
        } else {
            ctx.font = '900 9.5px sans-serif';
            ctx.fillText('🔒', 0, -22);
        }

        ctx.restore();
    }

    // 3. Bóng mây trôi nhẹ qua toàn cảnh lục địa
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let c = 0; c < 4; c++) {
        const cx = ((timeSec * 18 + c * 380) % (WORLD_MAP_WIDTH + 300)) - 150;
        const cy = 140 + c * 195;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 130, 44, 0.1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}