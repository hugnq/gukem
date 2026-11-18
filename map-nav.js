/**
 * ============================================================================
 * TINY BATTLE - TERRAIN NAVGRID, A* PATHFINDING & WORLD MAP UX (js/map-nav.js)
 * - Lưới địa hình 24x40 khớp 54 bản đồ (Đất liền, Cầu, Nước/Dung nham/Axit)
 * - Thuật toán A* né nước + Hard Collision Check chặn Zombie lội xuyên nước
 * - Điều hướng World_map với bán kính bắt điểm 46px, Hào quang xoay & Tooltip
 * ============================================================================
 */

'use strict';

/* --------------------------------------------------------------------------
 * 1. HẰNG SỐ ĐỊA HÌNH (TERRAIN CELL TYPES)
 * -------------------------------------------------------------------------- */
const TERRAIN_TYPE = {
  LAND: 0,          // Đất liền, đường mòn (Bộ binh, xe tăng, zombie đi được)
  BRIDGE: 1,        // Cầu bắc qua sông/dung nham/axit (Nút thắt chiến thuật)
  WATER_HAZARD: 2   // Nước sâu, sông băng, dung nham, hồ axit (CẤM đơn vị ground)
};

const NAV_GRID_COLS = 24;
const NAV_GRID_ROWS = 40;

/* --------------------------------------------------------------------------
 * 2. LƯỚI ĐỊA HÌNH & TÌM ĐƯỜNG A* NÉ NƯỚC (TERRAIN NAV GRID - PHẦN 4)
 * -------------------------------------------------------------------------- */
class TerrainNavGrid {
  constructor(stageLevel = 1, mapWidth = 420, mapHeight = 760) {
    this.cols = NAV_GRID_COLS;
    this.rows = NAV_GRID_ROWS;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.cellW = mapWidth / this.cols;
    this.cellH = mapHeight / this.rows;

    const stage = STAGE_CATALOG[clamp(stageLevel - 1, 0, STAGE_CATALOG.length - 1)];
    this.stageLevel = stage.level;
    this.profile = stage.terrainProfile || 'open_land';

    this.grid = new Uint8Array(this.cols * this.rows);
    this.bridges = []; // Danh sách tọa độ tâm các cây cầu { x, y, col, row }

    this.buildTerrainFromProfile(this.profile);
  }

  indexOf(col, row) {
    return row * this.cols + col;
  }

  inBounds(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  worldToGrid(x, y) {
    const col = clamp(Math.floor(x / this.cellW), 0, this.cols - 1);
    const row = clamp(Math.floor(y / this.cellH), 0, this.rows - 1);
    return { col, row };
  }

  gridToWorld(col, row) {
    return {
      x: (col + 0.5) * this.cellW,
      y: (row + 0.5) * this.cellH
    };
  }

  /**
   * Dựng bản đồ ô địa hình khớp chính xác với bố cục hình ảnh 54 map
   */
  buildTerrainFromProfile(profile) {
    this.grid.fill(TERRAIN_TYPE.LAND);
    this.bridges = [];

    for (let r = 0; r < this.rows; r++) {
      const ny = (r + 0.5) / this.rows; // 0 (trên) -> 1 (dưới)
      for (let c = 0; c < this.cols; c++) {
        const nx = (c + 0.5) / this.cols; // 0 (trái) -> 1 (phải)
        const idx = this.indexOf(c, r);

        if (profile === 'river_center_bridge') {
          // Sông/vực ngang ở giữa bản đồ (ny: 0.44..0.54), cầu ở chính giữa (nx: 0.41..0.59)
          if (ny >= 0.44 && ny <= 0.54) {
            if (nx >= 0.41 && nx <= 0.59) {
              this.grid[idx] = TERRAIN_TYPE.BRIDGE;
            } else {
              this.grid[idx] = TERRAIN_TYPE.WATER_HAZARD;
            }
          }
        } else if (profile === 'lake_center_ring') {
          // Hồ nước / Miệng núi lửa / Hồ axit tròn ở trung tâm, đường vòng 2 bên trái & phải
          const dx = (nx - 0.5) / 0.24;
          const dy = (ny - 0.48) / 0.16;
          if (dx * dx + dy * dy <= 1.0) {
            this.grid[idx] = TERRAIN_TYPE.WATER_HAZARD;
          }
        } else if (profile === 'lake_island_dual_bridge') {
          // Hồ lớn có đảo trung tâm và 2 cây cầu hai bên trái/phải (như map7)
          const outerDx = (nx - 0.5) / 0.36;
          const outerDy = (ny - 0.48) / 0.16;
          const innerDx = (nx - 0.5) / 0.14;
          const innerDy = (ny - 0.48) / 0.08;
          const inOuter = outerDx * outerDx + outerDy * outerDy <= 1.0;
          const inIsland = innerDx * innerDx + innerDy * innerDy <= 1.0;

          if (inOuter && !inIsland) {
            const onLeftBridge = nx >= 0.16 && nx <= 0.29 && ny >= 0.42 && ny <= 0.54;
            const onRightBridge = nx >= 0.71 && nx <= 0.84 && ny >= 0.42 && ny <= 0.54;
            this.grid[idx] = (onLeftBridge || onRightBridge)
              ? TERRAIN_TYPE.BRIDGE
              : TERRAIN_TYPE.WATER_HAZARD;
          }
        } else if (profile === 'diagonal_river_dual_bridge') {
          // Dòng sông/nham thạch/axit chéo qua sân với 2 cầu bắc qua (như map14, 19, 32, 37, 46, 50)
          const riverCenterY = 0.68 - nx * 0.38;
          if (Math.abs(ny - riverCenterY) <= 0.055) {
            const onBridge1 = nx >= 0.26 && nx <= 0.42;
            const onBridge2 = nx >= 0.62 && nx <= 0.78;
            this.grid[idx] = (onBridge1 || onBridge2)
              ? TERRAIN_TYPE.BRIDGE
              : TERRAIN_TYPE.WATER_HAZARD;
          }
        } else if (profile === 'side_ponds') {
          // Hai hồ nước bên sườn trái & phải (như map52)
          const leftPond = Math.hypot((nx - 0.14) / 0.14, (ny - 0.62) / 0.11) <= 1.0;
          const rightPond = Math.hypot((nx - 0.86) / 0.14, (ny - 0.54) / 0.11) <= 1.0;
          if (leftPond || rightPond) {
            this.grid[idx] = TERRAIN_TYPE.WATER_HAZARD;
          }
        }
      }
    }

    // Lưu danh sách điểm cầu để hỗ trợ điều hướng nhanh
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[this.indexOf(c, r)] === TERRAIN_TYPE.BRIDGE) {
          const wp = this.gridToWorld(c, r);
          this.bridges.push({ col: c, row: r, x: wp.x, y: wp.y });
        }
      }
    }
  }

  getCellTypeAt(x, y) {
    const { col, row } = this.worldToGrid(x, y);
    return this.grid[this.indexOf(col, row)];
  }

  /**
   * Kiểm tra một ô có đi được với loại di chuyển (ground / air / naval) hay không
   */
  isCellWalkable(col, row, movementType = 'ground') {
    if (!this.inBounds(col, row)) return false;
    if (movementType === 'air') return true;

    const cell = this.grid[this.indexOf(col, row)];
    if (movementType === 'naval') {
      // Nếu bản đồ có vùng nước, tàu chỉ chạy trên nước; nếu bản đồ cạn hoàn toàn, cho phép chạy trên hành lang trung tâm
      return cell === TERRAIN_TYPE.WATER_HAZARD || this.profile === 'open_land';
    }

    // Đơn vị ground (Zombie, Bộ binh, Xe tăng, Boss): tuyệt đối cấm WATER_HAZARD
    return cell === TERRAIN_TYPE.LAND || cell === TERRAIN_TYPE.BRIDGE;
  }

  isWalkableAt(x, y, movementType = 'ground') {
    const { col, row } = this.worldToGrid(x, y);
    return this.isCellWalkable(col, row, movementType);
  }

  /**
   * Tìm tâm cây cầu gần nhất với vị trí (x, y)
   */
  findNearestBridgeCenter(x, y) {
    if (this.bridges.length === 0) return null;
    let best = null;
    let bestD2 = Infinity;
    for (let i = 0; i < this.bridges.length; i++) {
      const b = this.bridges[i];
      const d2 = distSq(x, y, b.x, b.y);
      if (d2 < bestD2) {
        bestD2 = d2;
        best = b;
      }
    }
    return best;
  }

  /**
   * Tìm ô đi được gần nhất nếu điểm xuất phát/đích vô tình rơi vào ô nước
   */
  findNearestWalkableCell(col, row, movementType = 'ground') {
    if (this.isCellWalkable(col, row, movementType)) {
      return { col, row };
    }
    for (let radius = 1; radius <= 8; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nc = col + dc;
          const nr = row + dr;
          if (this.isCellWalkable(nc, nr, movementType)) {
            return { col: nc, row: nr };
          }
        }
      }
    }
    return { col: Math.floor(this.cols / 2), row };
  }

  /**
   * Thuật toán tìm đường A* 8 hướng né nước & ưu tiên băng qua cầu (Phần 4)
   */
  findPathAStar(startX, startY, goalX, goalY, movementType = 'ground') {
    if (movementType === 'air') {
      return [{ x: goalX, y: goalY }];
    }

    const rawStart = this.worldToGrid(startX, startY);
    const rawGoal = this.worldToGrid(goalX, goalY);
    const start = this.findNearestWalkableCell(rawStart.col, rawStart.row, movementType);
    const goal = this.findNearestWalkableCell(rawGoal.col, rawGoal.row, movementType);

    if (start.col === goal.col && start.row === goal.row) {
      return [{ x: goalX, y: goalY }];
    }

    const totalNodes = this.cols * this.rows;
    const gScore = new Float32Array(totalNodes);
    const fScore = new Float32Array(totalNodes);
    const cameFrom = new Int32Array(totalNodes);
    const closed = new Uint8Array(totalNodes);

    gScore.fill(Infinity);
    fScore.fill(Infinity);
    cameFrom.fill(-1);

    const startIdx = this.indexOf(start.col, start.row);
    const goalIdx = this.indexOf(goal.col, goal.row);

    gScore[startIdx] = 0;
    fScore[startIdx] = Math.hypot(goal.col - start.col, goal.row - start.row);

    const openList = [startIdx];

    const dirs = [
      [0, -1, 1.0], [1, 0, 1.0], [0, 1, 1.0], [-1, 0, 1.0],
      [1, -1, 1.414], [1, 1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]
    ];

    let iterations = 0;
    const maxIterations = 1400;

    while (openList.length > 0 && iterations < maxIterations) {
      iterations++;

      // Lấy nút có fScore nhỏ nhất trong openList
      let bestOpenPos = 0;
      let current = openList[0];
      for (let i = 1; i < openList.length; i++) {
        const idx = openList[i];
        if (fScore[idx] < fScore[current]) {
          current = idx;
          bestOpenPos = i;
        }
      }

      if (current === goalIdx) {
        return this.reconstructPath(cameFrom, current, goalX, goalY);
      }

      openList.splice(bestOpenPos, 1);
      closed[current] = 1;

      const curCol = current % this.cols;
      const curRow = (current - curCol) / this.cols;

      for (let d = 0; d < dirs.length; d++) {
        const dc = dirs[d][0];
        const dr = dirs[d][1];
        const stepCost = dirs[d][2];

        const nCol = curCol + dc;
        const nRow = curRow + dr;
        if (!this.isCellWalkable(nCol, nRow, movementType)) continue;

        // Ngăn cắt góc chéo qua ô nước/chướng ngại vật
        if (dc !== 0 && dr !== 0) {
          if (
            !this.isCellWalkable(curCol + dc, curRow, movementType) ||
            !this.isCellWalkable(curCol, curRow + dr, movementType)
          ) {
            continue;
          }
        }

        const nIdx = this.indexOf(nCol, nRow);
        if (closed[nIdx]) continue;

        // Ưu tiên đi trên cầu (giảm nhẹ chi phí) để các đơn vị hội tụ qua cầu mượt mà
        const bridgeBonus = this.grid[nIdx] === TERRAIN_TYPE.BRIDGE ? 0.85 : 1.0;
        const tentativeG = gScore[current] + stepCost * bridgeBonus;

        if (tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = current;
          gScore[nIdx] = tentativeG;
          fScore[nIdx] = tentativeG + Math.hypot(goal.col - nCol, goal.row - nRow);
          if (openList.indexOf(nIdx) === -1) {
            openList.push(nIdx);
          }
        }
      }
    }

    // Fallback: nếu chưa chạm đích do giới hạn vòng lặp, hướng tới cầu gần nhất
    const bridge = this.findNearestBridgeCenter(startX, startY);
    if (bridge) {
      return [{ x: bridge.x, y: bridge.y }, { x: goalX, y: goalY }];
    }
    return [{ x: goalX, y: goalY }];
  }

  reconstructPath(cameFrom, currentIdx, finalGoalX, finalGoalY) {
    const waypoints = [];
    let curr = currentIdx;
    while (curr !== -1 && cameFrom[curr] !== -1) {
      const col = curr % this.cols;
      const row = (curr - col) / this.cols;
      waypoints.push(this.gridToWorld(col, row));
      curr = cameFrom[curr];
    }
    waypoints.reverse();
    waypoints.push({ x: finalGoalX, y: finalGoalY });
    return waypoints;
  }

  /**
   * Lớp kiểm tra va chạm cứng (Hard Collision Check - Phần 4):
   * Đảm bảo đơn vị ground tuyệt đối không bao giờ bước chân lên ô WATER_HAZARD.
   * Nếu vị trí tiếp theo rơi vào nước, trượt dọc theo bờ hướng về cầu gần nhất.
   */
  resolveHardCollision(curX, curY, nextX, nextY, movementType = 'ground') {
    const clampedX = clamp(nextX, 16, this.mapWidth - 16);
    const clampedY = clamp(nextY, 24, this.mapHeight - 24);

    if (movementType === 'air') {
      return { x: clampedX, y: clampedY, blockedByWater: false };
    }

    // Nếu điểm kế tiếp hợp lệ, cho phép di chuyển bình thường
    if (this.isWalkableAt(clampedX, clampedY, movementType)) {
      return { x: clampedX, y: clampedY, blockedByWater: false };
    }

    // Thử trượt theo trục X (giữ nguyên Y) để men theo bờ sông/hồ
    if (this.isWalkableAt(clampedX, curY, movementType)) {
      return { x: clampedX, y: curY, blockedByWater: true };
    }

    // Thử trượt theo trục Y (giữ nguyên X)
    if (this.isWalkableAt(curX, clampedY, movementType)) {
      return { x: curX, y: clampedY, blockedByWater: true };
    }

    // Nếu cả 2 hướng đều vướng bờ nước, đẩy nhẹ dọc bờ hướng về phía cây cầu gần nhất
    const bridge = this.findNearestBridgeCenter(curX, curY);
    if (bridge) {
      const stepDist = Math.hypot(nextX - curX, nextY - curY) || 1.2;
      const angleToBridge = Math.atan2(bridge.y - curY, bridge.x - curX);
      const slideX = clamp(curX + Math.cos(angleToBridge) * stepDist, 16, this.mapWidth - 16);
      if (this.isWalkableAt(slideX, curY, movementType)) {
        return { x: slideX, y: curY, blockedByWater: true };
      }
    }

    // Giữ nguyên vị trí an toàn trên bờ
    return { x: curX, y: curY, blockedByWater: true };
  }
}

/* --------------------------------------------------------------------------
 * 3. BỘ ĐIỀU KHIỂN BẢN ĐỒ THẾ GIỚI 54 ẢI & TOOLTIP HOVER (PHẦN 3)
 * -------------------------------------------------------------------------- */
const WorldRoadmapController = {
  canvas: null,
  ctx: null,
  tooltipEl: null,
  hoveredNode: null,
  screenNodes: [],
  animFrameId: null,
  haloAngle: 0,
  isOpen: false,

  init() {
    this.canvas = document.getElementById('worldRoadmapCanvas');
    this.tooltipEl = document.getElementById('world-node-tooltip');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.bindEvents();
  },

  bindEvents() {
    if (!this.canvas) return;

    // Di chuột / chạm để bắt điểm từ tính trong bán kính hitRadius = 46px
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isOpen) return;
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      this.handlePointerHover(px, py);
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.hoveredNode = null;
      this.canvas.style.cursor = 'default';
      if (this.tooltipEl) this.tooltipEl.classList.add('hidden');
    });

    // Click chọn ải ngay lập tức; click lần 2 vào ải đang chọn sẽ vào trận nhanh
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.isOpen) return;
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const hit = findNearestWorldNode(px, py, this.screenNodes, WORLD_MAP_CONFIG.hitRadius);
      if (!hit) return;

      if (!hit.unlocked && !metaState.isAdminMode) {
        if (typeof showFloatingCurrencyToast === 'function') {
          showFloatingCurrencyToast(`Cần vượt Màn ${hit.level - 1} để mở khóa!`, '#FB7185');
        }
        return;
      }

      const wasAlreadySelected = metaState.selectedStage === hit.level;
      metaState.selectedStage = hit.level;
      saveProgress();

      this.updateSelectedFooterLabel();
      if (typeof syncLobbyStageDisplay === 'function') {
        syncLobbyStageDisplay();
      }

      if (wasAlreadySelected && typeof launchBattleWithCloudDive === 'function') {
        this.close();
        launchBattleWithCloudDive(metaState.selectedMode || 'campaign', hit.level);
      }
    });
  },

  open() {
    const overlay = document.getElementById('world-roadmap-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    this.isOpen = true;
    this.resizeCanvas();
    this.updateSelectedFooterLabel();
    this.startRenderLoop();
  },

  close() {
    const overlay = document.getElementById('world-roadmap-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (this.tooltipEl) this.tooltipEl.classList.add('hidden');
    this.isOpen = false;
    this.hoveredNode = null;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const container = this.canvas.parentElement;
    if (!container) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = container.clientWidth || 420;
    const h = container.clientHeight || 620;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.logicalW = w;
    this.logicalH = h;
    this.recomputeScreenNodes();
  },

  recomputeScreenNodes() {
    const w = this.logicalW || 420;
    const h = this.logicalH || 620;
    this.screenNodes = STAGE_CATALOG.map((stage) => ({
      ...stage,
      screenX: stage.worldPos.x * w,
      screenY: stage.worldPos.y * h,
      unlocked: stage.level <= metaState.maxUnlockedStage || metaState.isAdminMode,
      stars: Number(metaState.stageStars[stage.level]) || 0
    }));
  },

  jumpToBiome(biomeId) {
    const bId = Number(biomeId) || 1;
    const firstLevel = (bId - 1) * 9 + 1;
    const targetNode = this.screenNodes.find((n) => n.level === firstLevel);
    if (targetNode) {
      if (targetNode.unlocked) {
        metaState.selectedStage = targetNode.level;
        saveProgress();
        this.updateSelectedFooterLabel();
        if (typeof syncLobbyStageDisplay === 'function') syncLobbyStageDisplay();
      }
      this.hoveredNode = targetNode;
      this.positionTooltipForNode(targetNode);
    }
  },

  handlePointerHover(px, py) {
    const hit = findNearestWorldNode(px, py, this.screenNodes, WORLD_MAP_CONFIG.hitRadius);
    if (!hit) {
      this.hoveredNode = null;
      this.canvas.style.cursor = 'default';
      if (this.tooltipEl) this.tooltipEl.classList.add('hidden');
      return;
    }

    this.hoveredNode = hit;
    this.canvas.style.cursor = 'pointer';
    this.positionTooltipForNode(hit);
  },

  positionTooltipForNode(node) {
    if (!this.tooltipEl) return;
    const biomeEl = document.getElementById('tooltip-biome-name');
    const titleEl = document.getElementById('tooltip-stage-title');
    const starsEl = document.getElementById('tooltip-stars');

    if (biomeEl) biomeEl.textContent = node.biomeName;
    if (titleEl) titleEl.textContent = `Level ${String(node.level).padStart(2, '0')} • ${node.name}`;
    if (starsEl) {
      const s = node.stars || 0;
      const starIcons = `${s >= 1 ? '★' : '☆'} ${s >= 2 ? '★' : '☆'} ${s >= 3 ? '★' : '☆'}`;
      starsEl.textContent = node.unlocked ? `${starIcons} (${s}/3)` : '🔒 Chưa mở khóa';
    }

    const w = this.logicalW || 420;
    const clampedX = clamp(node.screenX, 95, w - 95);
    const clampedY = Math.max(76, node.screenY);

    this.tooltipEl.style.left = `${clampedX}px`;
    this.tooltipEl.style.top = `${clampedY}px`;
    this.tooltipEl.classList.remove('hidden');
  },

  updateSelectedFooterLabel() {
    const lbl = document.getElementById('roadmap-selected-label');
    if (!lbl) return;
    const stage = STAGE_CATALOG[clamp(metaState.selectedStage - 1, 0, STAGE_CATALOG.length - 1)];
    lbl.textContent = `Màn ${String(stage.level).padStart(2, '0')} - ${stage.name}`;
  },

  startRenderLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    const tick = () => {
      if (!this.isOpen) return;
      this.haloAngle += 0.045;
      this.render();
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  },

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.logicalW || 420;
    const h = this.logicalH || 620;

    ctx.clearRect(0, 0, w, h);

    // 1. Vẽ ảnh bản đồ tổng thể World_map.png
    const worldImg = typeof AssetLoader !== 'undefined' ? AssetLoader.getMap('World_map') : null;
    if (worldImg) {
      ctx.drawImage(worldImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#0C4A6E';
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Vẽ đường nối lộ trình 54 ải
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < this.screenNodes.length; i++) {
      const n = this.screenNodes[i];
      if (i === 0) ctx.moveTo(n.screenX, n.screenY);
      else ctx.lineTo(n.screenX, n.screenY);
    }
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // 3. Vẽ từng node Level & Vòng hào quang vàng kim xoay quanh node đang hover
    for (let i = 0; i < this.screenNodes.length; i++) {
      const node = this.screenNodes[i];
      const isHovered = this.hoveredNode && this.hoveredNode.level === node.level;
      const isSelected = metaState.selectedStage === node.level;
      const scale = isHovered ? WORLD_MAP_CONFIG.hoverScale : (isSelected ? 1.12 : 1.0);
      const radius = WORLD_MAP_CONFIG.visualRadius * scale;

      ctx.save();
      ctx.translate(node.screenX, node.screenY);

      // Vòng hào quang xoay vàng kim (#FACC15) khi hover hoặc đang chọn
      if (isHovered || isSelected) {
        ctx.save();
        ctx.rotate(this.haloAngle);
        ctx.beginPath();
        ctx.arc(0, 0, radius + 7, 0, Math.PI * 2);
        ctx.strokeStyle = WORLD_MAP_CONFIG.haloColor;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 4]);
        ctx.stroke();
        ctx.restore();
      }

      // Nền tròn node Level
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      if (!node.unlocked) {
        ctx.fillStyle = '#1E293B';
      } else if (node.stars >= 3) {
        ctx.fillStyle = '#15803D';
      } else if (isSelected || isHovered) {
        ctx.fillStyle = '#B45309';
      } else {
        ctx.fillStyle = '#0F172A';
      }
      ctx.fill();

      ctx.lineWidth = isHovered || isSelected ? 2.5 : 2;
      ctx.strokeStyle = !node.unlocked ? '#64748B' : (isHovered || isSelected ? '#FACC15' : '#38BDF8');
      ctx.stroke();

      // Số Level tương phản cao có viền đen
      ctx.font = '900 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = node.unlocked ? String(node.level) : '🔒';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.lineWidth = 3;
      ctx.strokeText(label, 0, 0.5);
      ctx.fillStyle = node.unlocked ? '#F8FAFC' : '#CBD5E1';
      ctx.fillText(label, 0, 0.5);

      ctx.restore();
    }
  },

  /**
   * Vẽ khung xem trước bản đồ thật của ải đang chọn tại Sảnh chính (Phần 1.2)
   */
  renderLobbyMiniMap() {
    const miniCanvas = document.getElementById('lobby-mini-map-canvas');
    if (!miniCanvas) return;
    const ctx = miniCanvas.getContext('2d');
    const w = miniCanvas.width;
    const h = miniCanvas.height;

    const stage = STAGE_CATALOG[clamp(metaState.selectedStage - 1, 0, STAGE_CATALOG.length - 1)];
    const mapImg = typeof AssetLoader !== 'undefined' ? AssetLoader.getMap(stage.mapKey) : null;

    ctx.clearRect(0, 0, w, h);
    if (mapImg) {
      ctx.drawImage(mapImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 0, w, h);
    }
  }
};