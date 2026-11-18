/**
 * ============================================================================
 * TINY BATTLE - SPRITE PROCESSOR, ASSET LOADER & RENDER ENGINE (js/engine-core.js)
 * - Tự động nạp 112 Asset (.png <-> .jpg fallback), tách nền Chroma-Key #00FF00
 * - Khử viền xanh (Green Spill Suppression) & Lọc rác watermark góc ảnh
 * - Cắt lưới 2x2, Auto-Trim khung bao & Đổi màu giáp Phe Xanh -> Phe Đỏ
 * - Object Pool 240 hạt hiệu ứng, WebAudio SFX & Canvas 2D BattleRenderer
 * ============================================================================
 */

'use strict';

/* --------------------------------------------------------------------------
 * 1. BỘ XỬ LÝ ẢNH PIXEL-ART TỰ ĐỘNG (SPRITE PROCESSOR - PHẦN 1.1)
 * -------------------------------------------------------------------------- */
const SpriteProcessor = {
  createCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(h));
    return canvas;
  },

  /**
   * Chuyển đổi RGB (0..255) sang HSL (H: 0..360, S: 0..1, L: 0..1)
   */
  rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) * 0.5;
    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rn:
          h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
          break;
        case gn:
          h = ((bn - rn) / d + 2) * 60;
          break;
        case bn:
          h = ((rn - gn) / d + 4) * 60;
          break;
      }
    }
    return [h, s, l];
  },

  /**
   * Chuyển đổi HSL (H: 0..360, S: 0..1, L: 0..1) sang RGB (0..255)
   */
  hslToRgb(h, s, l) {
    const hn = ((h % 360) + 360) % 360 / 360;
    if (s === 0) {
      const v = Math.round(l * 255);
      return [v, v, v];
    }
    const hue2rgb = (p, q, t) => {
      let tn = t;
      if (tn < 0) tn += 1;
      if (tn > 1) tn -= 1;
      if (tn < 1 / 6) return p + (q - p) * 6 * tn;
      if (tn < 1 / 2) return q;
      if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, hn) * 255),
      Math.round(hue2rgb(p, q, hn - 1 / 3) * 255)
    ];
  },

  /**
   * Thuật toán tách nền Chroma-Key (#00FF00) & Khử viền xanh (Green Spill Suppression)
   */
  applyChromaKeyAndDeSpill(imageData) {
    const data = imageData.data;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a === 0) continue;

      // Khoảng cách màu tới xanh lá thuần #00FF00 trong không gian RGB
      const distToPureGreen = Math.hypot(r, 255 - g, b);
      const greenDominance = g - Math.max(r, b);

      // Vùng nền xanh lá tươi (#00FF00)
      if ((r < 95 && g > 175 && b < 95) || distToPureGreen < 115 || greenDominance > 85) {
        data[i + 3] = 0;
        continue;
      }

      // Vùng chuyển tiếp rìa nhân vật (bán trong suốt nhẹ + khử ám xanh)
      if (greenDominance > 32 && g > 110) {
        const edgeAlpha = clamp(1 - (greenDominance - 32) / 53, 0.15, 1);
        data[i + 3] = Math.round(a * edgeAlpha);
        data[i + 1] = Math.min(g, Math.round((r + b) * 0.55));
      } else if (g > r && g > b) {
        // Khử ám xanh nhẹ trên viền đen pixel-art
        data[i + 1] = Math.min(g, Math.round((r + b) * 0.58 + 12));
      }
    }
  },

  /**
   * Lọc rác góc ảnh (Connected-Component Cleanup):
   * Loại bỏ các cụm pixel cô lập diện tích nhỏ nằm sát 4 góc frame (ví dụ watermark sao 4 cánh)
   */
  removeCornerArtifacts(imageData) {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;
    const totalPixels = w * h;
    const visited = new Uint8Array(totalPixels);

    // Ngưỡng diện tích cụm rác góc (tỷ lệ theo kích thước ảnh, tối thiểu 30px)
    const maxArtifactArea = Math.max(35, Math.round(totalPixels * 0.0045));
    const cornerMarginX = Math.round(w * 0.16);
    const cornerMarginY = Math.round(h * 0.16);

    const isInCornerZone = (x, y) => {
      const nearLeft = x < cornerMarginX;
      const nearRight = x >= w - cornerMarginX;
      const nearTop = y < cornerMarginY;
      const nearBottom = y >= h - cornerMarginY;
      return (nearLeft || nearRight) && (nearTop || nearBottom);
    };

    const queue = new Int32Array(totalPixels);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!isInCornerZone(x, y)) continue;
        const startIdx = y * w + x;
        if (visited[startIdx] || data[startIdx * 4 + 3] === 0) continue;

        let head = 0;
        let tail = 0;
        queue[tail++] = startIdx;
        visited[startIdx] = 1;

        let touchesCenter = false;

        while (head < tail) {
          const cur = queue[head++];
          const cx = cur % w;
          const cy = (cur - cx) / w;

          if (!isInCornerZone(cx, cy)) {
            touchesCenter = true;
          }

          // Duyệt 4 hướng lân cận
          if (cx > 0) {
            const ni = cur - 1;
            if (!visited[ni] && data[ni * 4 + 3] > 0) {
              visited[ni] = 1;
              queue[tail++] = ni;
            }
          }
          if (cx + 1 < w) {
            const ni = cur + 1;
            if (!visited[ni] && data[ni * 4 + 3] > 0) {
              visited[ni] = 1;
              queue[tail++] = ni;
            }
          }
          if (cy > 0) {
            const ni = cur - w;
            if (!visited[ni] && data[ni * 4 + 3] > 0) {
              visited[ni] = 1;
              queue[tail++] = ni;
            }
          }
          if (cy + 1 < h) {
            const ni = cur + w;
            if (!visited[ni] && data[ni * 4 + 3] > 0) {
              visited[ni] = 1;
              queue[tail++] = ni;
            }
          }
        }

        // Nếu cụm pixel nằm gọn trong vùng góc và có diện tích nhỏ -> xóa sạch
        if (!touchesCenter && tail <= maxArtifactArea) {
          for (let k = 0; k < tail; k++) {
            data[queue[k] * 4 + 3] = 0;
          }
        }
      }
    }
  },

  /**
   * Loại bỏ đường viền đen chia lưới 1px-4px ở giữa ảnh và dải chữ chú thích đáy ảnh (nếu có)
   */
  stripGridLinesAndCaptions(imageData) {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;

    // 1. Quét dải chữ chú thích cô lập ở 8% đáy ảnh (nếu có dải ngăn cách hoàn toàn với nhân vật)
    const scanStartY = Math.floor(h * 0.90);
    let emptyGapRow = -1;
    for (let y = scanStartY; y < h - 4; y++) {
      let opaqueCount = 0;
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 20) opaqueCount++;
      }
      if (opaqueCount === 0) {
        emptyGapRow = y;
        break;
      }
    }
    if (emptyGapRow !== -1) {
      for (let y = emptyGapRow + 1; y < h; y++) {
        for (let x = 0; x < w; x++) {
          data[(y * w + x) * 4 + 3] = 0;
        }
      }
    }

    // 2. Xóa đường kẻ chia ô ở trục giữa dọc (w/2 ± 2px) nếu đường đó kéo dài gần suốt chiều cao
    const midX = Math.floor(w / 2);
    for (let dx = -2; dx <= 2; dx++) {
      const cx = midX + dx;
      if (cx < 0 || cx >= w) continue;
      let darkLinePixels = 0;
      for (let y = 0; y < h; y++) {
        const idx = (y * w + cx) * 4;
        if (data[idx + 3] > 200 && data[idx] < 45 && data[idx + 1] < 45 && data[idx + 2] < 45) {
          darkLinePixels++;
        }
      }
      if (darkLinePixels > h * 0.82) {
        for (let y = 0; y < h; y++) {
          data[(y * w + cx) * 4 + 3] = 0;
        }
      }
    }

    // 3. Xóa đường kẻ chia ô ở trục giữa ngang (h/2 ± 2px)
    const midY = Math.floor(h / 2);
    for (let dy = -2; dy <= 2; dy++) {
      const cy = midY + dy;
      if (cy < 0 || cy >= h) continue;
      let darkLinePixels = 0;
      for (let x = 0; x < w; x++) {
        const idx = (cy * w + x) * 4;
        if (data[idx + 3] > 200 && data[idx] < 45 && data[idx + 1] < 45 && data[idx + 2] < 45) {
          darkLinePixels++;
        }
      }
      if (darkLinePixels > w * 0.82) {
        for (let x = 0; x < w; x++) {
          data[(cy * w + x) * 4 + 3] = 0;
        }
      }
    }
  },

  /**
   * Bounding-Box Auto-Trim: Cắt gọn khung hình bao trọn nhân vật và gắn điểm neo chân (0.5, 0.85)
   */
  autoTrimCanvas(sourceCanvas) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 15) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return {
        canvas: sourceCanvas,
        width: w,
        height: h,
        anchorX: 0.5,
        anchorY: 0.85
      };
    }

    const pad = 2;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(w - cropX, maxX - minX + 1 + pad * 2);
    const cropH = Math.min(h - cropY, maxY - minY + 1 + pad * 2);

    const trimmed = this.createCanvas(cropW, cropH);
    const tCtx = trimmed.getContext('2d');
    tCtx.imageSmoothingEnabled = false;
    tCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    return {
      canvas: trimmed,
      width: cropW,
      height: cropH,
      anchorX: 0.5,
      anchorY: 0.85
    };
  },

  /**
   * Đổi tông màu giáp/áo từ Xanh Dương (H ∈ [190°, 255°]) sang Đỏ Thẫm (H ∈ [0°, 12°])
   * cho đội hình Phe Đỏ (Enemy), giữ nguyên màu da, kim loại, lửa và viền đen
   */
  recolorBlueToRed(trimmedFrame) {
    const src = trimmedFrame.canvas;
    const w = src.width;
    const h = src.height;
    const outCanvas = this.createCanvas(w, h);
    const oCtx = outCanvas.getContext('2d', { willReadFrequently: true });
    oCtx.drawImage(src, 0, 0);

    const imgData = oCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 20) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Giữ nguyên viền đen và vùng tối sâu
      if (r < 35 && g < 35 && b < 45) continue;

      const [hue, sat, light] = this.rgbToHsl(r, g, b);

      // Vùng sắc độ Xanh Dương / Xanh Lơ đặc trưng của quân phục & giáp Phe Xanh
      if (hue >= 185 && hue <= 255 && sat >= 0.22 && light >= 0.14 && light <= 0.86) {
        const targetHue = ((hue - 185) / 70) * 12; // Ánh xạ sang dải Đỏ Thẫm 0°..12°
        const targetSat = Math.min(1, sat * 1.08);
        const [nr, ng, nb] = this.hslToRgb(targetHue, targetSat, light);
        data[i] = nr;
        data[i + 1] = ng;
        data[i + 2] = nb;
      }
    }

    oCtx.putImageData(imgData, 0, 0);
    return {
      canvas: outCanvas,
      width: w,
      height: h,
      anchorX: trimmedFrame.anchorX,
      anchorY: trimmedFrame.anchorY
    };
  },

  /**
   * Xử lý hoàn chỉnh 1 ảnh theo chế độ (fullOpaque | singleChroma | sprites2x2)
   */
  processLoadedImage(img, spec) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    if (spec.mode === 'fullOpaque') {
      const canvas = this.createCanvas(w, h);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return { type: 'fullOpaque', canvas, width: w, height: h };
    }

    // Vẽ lên canvas tạm để tách nền chroma-key & lọc rác góc
    const workCanvas = this.createCanvas(w, h);
    const wCtx = workCanvas.getContext('2d', { willReadFrequently: true });
    wCtx.drawImage(img, 0, 0);

    const fullImgData = wCtx.getImageData(0, 0, w, h);
    this.applyChromaKeyAndDeSpill(fullImgData);
    this.removeCornerArtifacts(fullImgData);

    if (spec.mode === 'sprites2x2') {
      this.stripGridLinesAndCaptions(fullImgData);
    }

    wCtx.putImageData(fullImgData, 0, 0);

    // Nếu là sprite đơn (turrets, projectiles, props, skills, ui icons)
    if (spec.mode === 'singleChroma') {
      const trimmed = this.autoTrimCanvas(workCanvas);
      return {
        type: 'singleChroma',
        canvas: trimmed.canvas,
        width: trimmed.width,
        height: trimmed.height,
        anchorX: 0.5,
        anchorY: 0.5,
        baseAngleOffset: spec.baseAngleOffset || 0,
        dataURL: trimmed.canvas.toDataURL('image/png')
      };
    }

    // Nếu là sprite sheet 2x2 (units, bosses, zombies)
    const cellW = Math.floor(w / 2);
    const cellH = Math.floor(h / 2);
    const gridCoords = [
      { col: 0, row: 0 }, // Frame 0: Idle (Trên-Trái)
      { col: 1, row: 0 }, // Frame 1: Move 1 (Trên-Phải)
      { col: 0, row: 1 }, // Frame 2: Move 2 (Dưới-Trái)
      { col: 1, row: 1 }  // Frame 3: Attack (Dưới-Phải)
    ];

    const blueFrames = [];
    const redFrames = [];

    for (let f = 0; f < 4; f++) {
      const cellCanvas = this.createCanvas(cellW, cellH);
      const cCtx = cellCanvas.getContext('2d', { willReadFrequently: true });
      cCtx.drawImage(
        workCanvas,
        gridCoords[f].col * cellW,
        gridCoords[f].row * cellH,
        cellW,
        cellH,
        0,
        0,
        cellW,
        cellH
      );

      // Lọc lại rác góc cho từng ô nhỏ (đề phòng watermark nằm ở góc ô thứ 4)
      const cellData = cCtx.getImageData(0, 0, cellW, cellH);
      this.removeCornerArtifacts(cellData);
      cCtx.putImageData(cellData, 0, 0);

      const trimmed = this.autoTrimCanvas(cellCanvas);
      blueFrames.push(trimmed);

      if (spec.recolorEnemy) {
        redFrames.push(this.recolorBlueToRed(trimmed));
      } else {
        redFrames.push(trimmed);
      }
    }

    return {
      type: 'sprites2x2',
      blueFrames,
      redFrames,
      avatarDataURL: blueFrames[0].canvas.toDataURL('image/png')
    };
  }
};

/* --------------------------------------------------------------------------
 * 2. BỘ NẠP ASSET TRUNG TÂM CÓ FALLBACK .PNG <-> .JPG (ASSET LOADER - PHẦN 1.2)
 * -------------------------------------------------------------------------- */
const AssetLoader = {
  cache: {
    maps: {},
    units: {},
    bosses: {},
    zombies: {},
    turrets: {},
    projectiles: {},
    props: {},
    skills: {},
    ui: {}
  },
  isReady: false,

  /**
   * Nạp một tệp ảnh với cơ chế tự động thử .png trước -> fallback sang .jpg nếu lỗi
   */
  loadImageWithFallback(basePath) {
    return new Promise((resolve) => {
      const tryExtensions = ['.png', '.jpg'];
      let attempt = 0;

      const tryNext = () => {
        if (attempt >= tryExtensions.length) {
          resolve(null);
          return;
        }
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => {
          attempt++;
          tryNext();
        };
        img.src = `${basePath}${tryExtensions[attempt]}`;
      };

      tryNext();
    });
  },

  /**
   * Nạp toàn bộ 112 asset theo nhóm và cập nhật thanh tiến trình Loading %
   */
  async loadAll(onProgress) {
    const tasks = [];
    const categories = Object.keys(ASSET_MANIFEST);

    for (let c = 0; c < categories.length; c++) {
      const cat = categories[c];
      const entries = ASSET_MANIFEST[cat];
      const keys = Object.keys(entries);
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        tasks.push({ category: cat, key, spec: entries[key] });
      }
    }

    const total = tasks.length;
    let completed = 0;

    // Xử lý theo lô song song (batch = 8) để vừa nhanh vừa mượt UI thanh tiến trình
    const batchSize = 8;
    for (let i = 0; i < total; i += batchSize) {
      const slice = tasks.slice(i, i + batchSize);
      await Promise.all(
        slice.map(async (task) => {
          const img = await this.loadImageWithFallback(task.spec.path);
          if (img) {
            this.cache[task.category][task.key] = SpriteProcessor.processLoadedImage(img, task.spec);
          } else {
            console.warn(`[AssetLoader] Không tìm thấy tệp: ${task.spec.path}.(png|jpg)`);
          }
          completed++;
          if (typeof onProgress === 'function') {
            onProgress(completed, total, `${task.category}/${task.key}`);
          }
        })
      );
    }

    this.isReady = true;
    this.hydrateDOMAssets();
  },

  /**
   * Tự động gắn toàn bộ ảnh đã tách nền vào các thẻ <img> và nền Sảnh #lobby-bg-layer
   */
  hydrateDOMAssets() {
    // 1. Nền sảnh chính lobby_bg
    const lobbyBgEl = document.getElementById('lobby-bg-layer');
    const lobbyAsset = this.cache.ui.lobby_bg;
    if (lobbyBgEl && lobbyAsset && lobbyAsset.canvas) {
      lobbyBgEl.style.backgroundImage = `url("${lobbyAsset.canvas.toDataURL('image/png')}")`;
    }

    // 2. Toàn bộ icon tiền tệ, rương & vòng quay (data-asset-ui)
    document.querySelectorAll('[data-asset-ui]').forEach((imgEl) => {
      const key = imgEl.getAttribute('data-asset-ui');
      const asset = this.cache.ui[key];
      if (asset && asset.dataURL) {
        imgEl.src = asset.dataURL;
      }
    });

    // 3. Toàn bộ icon kỹ năng chỉ huy Q-W-E-R (data-asset-skill)
    document.querySelectorAll('[data-asset-skill]').forEach((imgEl) => {
      const key = imgEl.getAttribute('data-asset-skill');
      const asset = this.cache.skills[key];
      if (asset && asset.dataURL) {
        imgEl.src = asset.dataURL;
      }
    });

    // 4. Toàn bộ icon ụ pháo (data-asset-turret)
    document.querySelectorAll('[data-asset-turret]').forEach((imgEl) => {
      const key = imgEl.getAttribute('data-asset-turret');
      const asset = this.cache.turrets[key];
      if (asset && asset.dataURL) {
        imgEl.src = asset.dataURL;
      }
    });
  },

  getMap(mapKey) {
    const entry = this.cache.maps[mapKey];
    return entry ? entry.canvas : null;
  },

  getUnitSprite(spriteKey, side = 'blue') {
    const entry =
      this.cache.units[spriteKey] ||
      this.cache.bosses[spriteKey] ||
      this.cache.zombies[spriteKey];
    if (!entry) return null;
    return side === 'red' ? entry.redFrames : entry.blueFrames;
  },

  getAvatarDataURL(spriteKey) {
    const entry =
      this.cache.units[spriteKey] ||
      this.cache.bosses[spriteKey] ||
      this.cache.zombies[spriteKey];
    return entry ? entry.avatarDataURL : '';
  },

  getTurret(turretKey) {
    return this.cache.turrets[turretKey] || null;
  },

  getProjectile(projKey) {
    return this.cache.projectiles[projKey] || null;
  },

  getProp(propKey) {
    return this.cache.props[propKey] || null;
  },

  getUIIconURL(uiKey) {
    const entry = this.cache.ui[uiKey];
    return entry ? entry.dataURL : '';
  }
};

/* --------------------------------------------------------------------------
 * 3. HỆ THỐNG HẠT HIỆU ỨNG OBJECT POOLING (240 HẠT CHỐNG GIẬT LAG)
 * -------------------------------------------------------------------------- */
const MAX_PARTICLE_POOL = 240;

class ParticlePool {
  constructor() {
    this.pool = Array.from({ length: MAX_PARTICLE_POOL }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      color: '#FACC15',
      alpha: 1,
      life: 0,
      maxLife: 0.4,
      ring: false
    }));
  }

  spawn(x, y, vx, vy, size, color, maxLife = 0.38, ring = false) {
    for (let i = 0; i < MAX_PARTICLE_POOL; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.size = size;
        p.color = color;
        p.alpha = 1;
        p.life = 0;
        p.maxLife = maxLife;
        p.ring = ring;
        return;
      }
    }
  }

  spawnExplosion(x, y, radius = 42, primaryColor = '#FB923C') {
    // Sóng xung kích vòng tròn
    this.spawn(x, y, 0, 0, radius, primaryColor, 0.32, true);
    const count = Math.min(16, Math.max(6, Math.round(radius / 5)));
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = 45 + Math.random() * 110;
      const col = i % 2 === 0 ? primaryColor : '#FACC15';
      this.spawn(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, 3 + Math.random() * 3.5, col, 0.28 + Math.random() * 0.2, false);
    }
  }

  spawnHitSpark(x, y, color = '#38BDF8') {
    for (let i = 0; i < 5; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 35 + Math.random() * 75;
      this.spawn(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, 2.5 + Math.random() * 2, color, 0.22, false);
    }
  }

  update(dt) {
    for (let i = 0; i < MAX_PARTICLE_POOL; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 1 - p.life / p.maxLife;
    }
  }

  render(ctx) {
    for (let i = 0; i < MAX_PARTICLE_POOL; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      ctx.save();
      ctx.globalAlpha = clamp(p.alpha, 0, 1);
      if (p.ring) {
        const progress = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(4, p.size * progress), 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * (1 - progress) + 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      }
      ctx.restore();
    }
  }
}

const particlePool = new ParticlePool();

/* --------------------------------------------------------------------------
 * 4. CHỮ SÁT THƯƠNG NỔI TƯƠNG PHẢN CAO TRÊN CANVAS (PHẦN 7)
 * -------------------------------------------------------------------------- */
function spawnFloatingCombatText(x, y, text, color = '#F8FAFC', isCrit = false) {
  if (!metaState.settings.showDamageNumbers) return;
  if (game.floatingTexts.length > 45) {
    game.floatingTexts.shift();
  }
  game.floatingTexts.push({
    x: x + (Math.random() - 0.5) * 14,
    y,
    vy: isCrit ? -48 : -34,
    text: String(text),
    color,
    isCrit,
    life: 0,
    maxLife: isCrit ? 0.85 : 0.65
  });
}

/* --------------------------------------------------------------------------
 * 5. ÂM THANH TỔNG HỢP RETRO NHẸ (WEBAUDIO SFX)
 * -------------------------------------------------------------------------- */
const SoundFX = {
  ctx: null,
  lastPlayTime: {},

  ensureContext() {
    if (!metaState.settings.sfxEnabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },

  playTone(key, freqStart, freqEnd, duration = 0.08, type = 'square', gainVal = 0.04) {
    const now = performance.now();
    if (this.lastPlayTime[key] && now - this.lastPlayTime[key] < 45) return;
    this.lastPlayTime[key] = now;

    const ac = this.ensureContext();
    if (!ac) return;

    try {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), ac.currentTime + duration);

      gain.gain.setValueAtTime(gainVal, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + duration);
    } catch (_) {
      // Bỏ qua nếu trình duyệt chưa cho phép phát âm thanh
    }
  },

  shoot()     { this.playTone('shoot', 520, 180, 0.06, 'square', 0.025); },
  explosion() { this.playTone('boom', 140, 36, 0.18, 'sawtooth', 0.055); },
  hit()       { this.playTone('hit', 280, 110, 0.05, 'triangle', 0.03); },
  coin()      { this.playTone('coin', 880, 1320, 0.09, 'sine', 0.04); },
  skill()     { this.playTone('skill', 320, 960, 0.22, 'sawtooth', 0.05); }
};

/* --------------------------------------------------------------------------
 * 6. BỘ DỰNG HÌNH CHIẾN TRƯỜNG 60-120 FPS (BATTLE RENDERER)
 * -------------------------------------------------------------------------- */
const BattleRenderer = {
  render(ctx) {
    const w = game.mapWidth;
    const h = game.mapHeight;

    ctx.clearRect(0, 0, w, h);

    // 1. Vẽ nền bản đồ Pixel-Art thật của ải hiện tại (map1..map54)
    const stage = STAGE_CATALOG[clamp(game.stageLevel - 1, 0, STAGE_CATALOG.length - 1)];
    const mapImg = AssetLoader.getMap(stage.mapKey);
    if (mapImg) {
      ctx.drawImage(mapImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Vẽ hiệu ứng hào quang mục tiêu trên 2 Mansion & Lá chắn Pháo đài
    this.renderMansionAuras(ctx);

    // 3. Vẽ các vật thể mặt đất (Mìn, Hòm dù tiếp tế, Cờ tập kết Rally Flag)
    this.renderProps(ctx);

    // 4. Vẽ Ụ Pháo xoay 360° gắn cố định trên nóc Mansion Xanh
    this.renderMountedTurret(ctx);

    // 5. Gộp và sắp xếp chiều sâu (Y-sorting) toàn bộ Quân đồng minh + Địch/Zombie/Boss
    const renderList = [];
    for (let i = 0; i < game.units.length; i++) {
      if (!game.units[i].dead) renderList.push(game.units[i]);
    }
    for (let i = 0; i < game.enemies.length; i++) {
      if (!game.enemies[i].dead) renderList.push(game.enemies[i]);
    }
    renderList.sort((a, b) => a.y - b.y);

    for (let i = 0; i < renderList.length; i++) {
      this.renderCombatant(ctx, renderList[i]);
    }

    // 6. Vẽ đạn pháo & phép thuật xoay theo vector vận tốc
    this.renderProjectiles(ctx);

    // 7. Vẽ hạt nổ & chữ sát thương nổi viền đen sắc nét
    particlePool.render(ctx);
    this.renderFloatingTexts(ctx);
  },

  renderMansionAuras(ctx) {
    // Vòng chỉ báo vùng va chạm nhẹ trên Mansion Đỏ & Xanh
    if (game.redMansion) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(game.redMansion.centerX, game.redMansion.centerY + 18, 62, 24, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    if (game.blueMansion) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(game.blueMansion.centerX, game.blueMansion.centerY + 18, 62, 24, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Hiệu ứng Lá Chắn Năng Lượng Pháo Đài (Tối thượng Nhánh 1)
      if (game.playerShield > 0) {
        ctx.beginPath();
        ctx.arc(game.blueMansion.centerX, game.blueMansion.centerY, 74, Math.PI * 0.9, Math.PI * 2.1);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }
      ctx.restore();
    }
  },

  renderMountedTurret(ctx) {
    if (!game.blueMansion) return;
    const turretAsset = AssetLoader.getTurret(game.turret.id);
    if (!turretAsset || !turretAsset.canvas) return;

    const mountX = game.blueMansion.centerX;
    const mountY = game.blueMansion.centerY + (MANSION_CONFIG.blue.turretOffsetY || -22);

    // Giật lùi nòng pháo nhẹ theo hướng ngược góc bắn
    const recoilDist = game.turret.recoil || 0;
    const drawX = mountX - Math.cos(game.turret.angle) * recoilDist;
    const drawY = mountY - Math.sin(game.turret.angle) * recoilDist;

    ctx.save();
    ctx.translate(drawX, drawY);
    // Sprite ụ pháo gốc hướng thẳng lên trên (-PI/2), cộng PI/2 để khớp atan2
    ctx.rotate(game.turret.angle + Math.PI / 2);

    const drawSize = 46;
    ctx.drawImage(turretAsset.canvas, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
    ctx.restore();
  },

  renderProps(ctx) {
    // Vẽ cờ điểm tập kết Rally Flag nếu người chơi vừa chạm chỉ định trên sân
    if (game.rallyPoint && game.rallyPoint.ttl > 0) {
      const flagAsset = AssetLoader.getProp('prop_rally_flag');
      ctx.save();
      ctx.beginPath();
      ctx.arc(game.rallyPoint.x, game.rallyPoint.y, 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (flagAsset && flagAsset.canvas) {
        ctx.drawImage(flagAsset.canvas, game.rallyPoint.x - 16, game.rallyPoint.y - 34, 32, 36);
      }
      ctx.restore();
    }

    // Vẽ Mìn chống tăng & Hòm tiếp tế trên mặt đất
    for (let i = 0; i < game.props.length; i++) {
      const prop = game.props[i];
      if (prop.dead) continue;
      const asset = AssetLoader.getProp(prop.propKey);
      if (!asset || !asset.canvas) continue;

      const size = prop.propKey === 'prop_airdrop_crate' ? 38 : 26;
      ctx.save();
      ctx.drawImage(asset.canvas, prop.x - size * 0.5, prop.y - size * 0.5, size, size);
      ctx.restore();
    }
  },

  renderCombatant(ctx, entity) {
    const frames = AssetLoader.getUnitSprite(entity.spriteKey, entity.side);

    // 1. Vẽ bóng & vòng chân đế phân biệt Phe Xanh (#38BDF8) / Phe Đỏ (#FB7185)
    const footRadiusX = entity.isBoss ? 24 : 13;
    const footRadiusY = entity.isBoss ? 10 : 6;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(entity.x, entity.y, footRadiusX, footRadiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = entity.side === 'blue'
      ? 'rgba(56, 189, 248, 0.75)'
      : 'rgba(251, 113, 133, 0.80)';
    ctx.stroke();
    ctx.restore();

    // 2. Vẽ Sprite Frame cắt từ lưới 2x2 với điểm neo chân (anchorX = 0.5, anchorY = 0.85)
    let spriteHeight = entity.isBoss ? 78 : 44;
    if (entity.isTargetDummy) spriteHeight = 56;

    if (entity.isTargetDummy) {
      const dummyAsset = AssetLoader.getProp('prop_target_dummy');
      if (dummyAsset && dummyAsset.canvas) {
        const aspect = dummyAsset.width / Math.max(1, dummyAsset.height);
        const drawW = spriteHeight * aspect;
        ctx.drawImage(dummyAsset.canvas, entity.x - drawW * 0.5, entity.y - spriteHeight * 0.88, drawW, spriteHeight);
      }
    } else if (frames && frames[entity.animFrame]) {
      const frame = frames[entity.animFrame];
      const aspect = frame.width / Math.max(1, frame.height);
      const drawH = spriteHeight;
      const drawW = drawH * aspect;
      const drawX = entity.x - drawW * frame.anchorX;
      const drawY = entity.y - drawH * frame.anchorY;

      ctx.save();
      // Đảo chiều ngang nhẹ cho Phe Đỏ nếu cần giữ sự đa dạng góc nhìn
      if (entity.side === 'red' && entity.flipX) {
        ctx.translate(entity.x, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(frame.canvas, -drawW * frame.anchorX, drawY, drawW, drawH);
      } else {
        ctx.drawImage(frame.canvas, drawX, drawY, drawW, drawH);
      }

      // Hiệu ứng trạng thái: Đóng băng / Thiêu đốt / Choáng EMP
      if (entity.slowTimer > 0) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.fillRect(drawX, drawY, drawW, drawH);
      }
      if (entity.burnTimer > 0) {
        ctx.fillStyle = 'rgba(251, 146, 60, 0.26)';
        ctx.fillRect(drawX, drawY, drawW, drawH);
      }
      ctx.restore();
    }

    // 3. Vẽ thanh máu HP nhỏ phía trên đầu đơn vị
    if (!entity.isTargetDummy && entity.hp < entity.maxHp) {
      const barW = entity.isBoss ? 54 : 28;
      const barH = entity.isBoss ? 6 : 4;
      const bx = entity.x - barW * 0.5;
      const by = entity.y - spriteHeight * 0.92 - 6;
      const ratio = clamp(entity.hp / Math.max(1, entity.maxHp), 0, 1);

      ctx.fillStyle = 'rgba(5, 8, 17, 0.88)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

      ctx.fillStyle = entity.side === 'blue' ? '#4ADE80' : '#FB7185';
      ctx.fillRect(bx, by, barW * ratio, barH);
    }

    // Biểu tượng choáng EMP trên đầu
    if (entity.stunTimer > 0) {
      ctx.save();
      ctx.font = '900 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText('⚡STUN', entity.x, entity.y - spriteHeight - 8);
      ctx.fillStyle = '#38BDF8';
      ctx.fillText('⚡STUN', entity.x, entity.y - spriteHeight - 8);
      ctx.restore();
    }
  },

  renderProjectiles(ctx) {
    for (let i = 0; i < game.projectiles.length; i++) {
      const proj = game.projectiles[i];
      if (proj.dead) continue;

      const asset = AssetLoader.getProjectile(proj.projectileKey);
      const angle = Math.atan2(proj.vy, proj.vx);

      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate(angle + (asset ? asset.baseAngleOffset : 0));

      if (asset && asset.canvas) {
        const size = proj.size || 24;
        ctx.drawImage(asset.canvas, -size * 0.5, -size * 0.5, size, size);
      } else {
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  renderFloatingTexts(ctx) {
    for (let i = 0; i < game.floatingTexts.length; i++) {
      const ft = game.floatingTexts[i];
      const alpha = clamp(1 - ft.life / ft.maxLife, 0, 1);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = ft.isCrit
        ? '900 14px "Segoe UI", sans-serif'
        : '800 11.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
      ctx.lineWidth = 3.2;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
};