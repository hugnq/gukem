/**
 * ============================================================================
 * TINY BATTLE - LOBBY UI, SKILL TREE PAN/ZOOM, SANDBOX DPS & MODALS (js/lobby-ui.js)
 * - Quản lý toàn bộ 5 Tab Sảnh (Shop, Army, Battle, Challenge, Skill Tree)
 * - Cây Kỹ Năng 6 nhánh kéo thả (Drag-to-Pan) & Phóng to (Zoom) + SVG Connectors
 * - Phòng tập Sandbox đo DPS thời gian thực với prop_target_dummy
 * - Gacha 1 Tỷ Rương O(1), Auto-Merge, Vòng Quay, Mini-game, Giftcode & Result Modals
 * ============================================================================
 */

'use strict';

/* --------------------------------------------------------------------------
 * 1. TIỆN ÍCH HIỂN THỊ THÔNG BÁO NỔI & MỞ/ĐÓNG MODAL
 * -------------------------------------------------------------------------- */
function showFloatingCurrencyToast(text, color = '#FACC15') {
  const layer = document.getElementById('currency-float-layer');
  if (!layer) return;

  const toast = document.createElement('div');
  toast.className = 'currency-float-toast';
  toast.style.color = color;
  toast.style.borderColor = color;
  toast.style.left = `${42 + Math.random() * 16}%`;
  toast.style.top = `${14 + Math.random() * 6}%`;
  toast.textContent = text;

  layer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 1180);
}

function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('hidden');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('hidden');
}

/* --------------------------------------------------------------------------
 * 2. ĐỒNG BỘ THANH TÀI NGUYÊN & THÔNG TIN MÀN CHƠI Ở SẢNH
 * -------------------------------------------------------------------------- */
function updateTopResourceBar() {
  const nameEl = document.getElementById('hud-player-name');
  const rankEl = document.getElementById('hud-player-rank');
  const pearlsEl = document.getElementById('hud-pearls');
  const medalsEl = document.getElementById('hud-medals');
  const gemsEl = document.getElementById('hud-gems');
  const coinsEl = document.getElementById('hud-coins');

  if (nameEl) {
    nameEl.textContent = metaState.isAdminMode ? `${metaState.playerName} [ADMIN]` : metaState.playerName;
  }
  if (rankEl) {
    rankEl.textContent = `Lv.${metaState.playerLevel} • Chỉ Huy`;
  }
  if (pearlsEl) pearlsEl.textContent = metaState.isAdminMode ? '∞' : formatCompactNumber(metaState.pearls);
  if (medalsEl) medalsEl.textContent = metaState.isAdminMode ? '∞' : formatCompactNumber(metaState.medals);
  if (gemsEl)   gemsEl.textContent   = metaState.isAdminMode ? '∞' : formatCompactNumber(metaState.gems);
  if (coinsEl)  coinsEl.textContent  = metaState.isAdminMode ? '∞' : formatCompactNumber(metaState.coins);

  const pityBadge = document.getElementById('gacha-pity-badge');
  if (pityBadge) {
    const rem = Math.max(1, 50 - (Number(metaState.gachaPity) || 0));
    pityBadge.textContent = `Bảo hiểm: ${rem}`;
  }

  // Cập nhật chấm đỏ thông báo nhiệm vụ hoàn thành
  const notifyDot = document.getElementById('mission-notify-dot');
  if (notifyDot) {
    const hasClaimable = MISSION_CATALOG.some(
      (m) => !metaState.claimedMissions[m.id] && (metaState.stats[m.stat] || 0) >= m.target
    );
    notifyDot.classList.toggle('hidden', !hasClaimable);
  }
}

function syncLobbyStageDisplay() {
  const stage = STAGE_CATALOG[clamp(metaState.selectedStage - 1, 0, STAGE_CATALOG.length - 1)];
  const biomeEl = document.getElementById('lobby-biome-name');
  const titleEl = document.getElementById('lobby-stage-title');
  const starsEl = document.getElementById('lobby-stage-stars');

  if (biomeEl) biomeEl.textContent = stage.biomeName.toUpperCase();
  if (titleEl) titleEl.textContent = `MÀN ${String(stage.level).padStart(2, '0')} • ${stage.name.toUpperCase()}`;
  if (starsEl) {
    const s = Number(metaState.stageStars[stage.level]) || 0;
    starsEl.textContent = `${s >= 1 ? '★' : '☆'} ${s >= 2 ? '★' : '☆'} ${s >= 3 ? '★' : '☆'} (${s}/3)`;
  }

  if (typeof WorldRoadmapController !== 'undefined') {
    WorldRoadmapController.renderLobbyMiniMap();
  }
}

/* --------------------------------------------------------------------------
 * 3. CHUYỂN CẢNH XUYÊN MÂY & KHỞI CHẠY TRẬN ĐẤU
 * -------------------------------------------------------------------------- */
function launchBattleWithCloudDive(mode, stageLevel) {
  const cloudLayer = document.getElementById('cloud-dive-layer');
  if (cloudLayer) {
    cloudLayer.classList.remove('hidden');
    // Reset CSS animation
    cloudLayer.style.animation = 'none';
    void cloudLayer.offsetWidth;
    cloudLayer.style.animation = '';
  }

  setTimeout(() => {
    if (typeof startBattle === 'function') {
      startBattle(mode, stageLevel);
    }
  }, 240);

  setTimeout(() => {
    if (cloudLayer) cloudLayer.classList.add('hidden');
  }, 680);
}

/* --------------------------------------------------------------------------
 * 4. TAB 1: CỬA HÀNG GACHA & CHIP BỔ TRỢ (SHOP)
 * -------------------------------------------------------------------------- */
const CRATE_COSTS = {
  legendary: {
    currency: 'gems',
    1: 100,
    10: 900,
    100: 8500,
    10000: 800000,
    1000000: 75000000,
    1000000000: 70000000000
  },
  epic: {
    currency: 'coins',
    1: 500,
    10: 4500,
    100: 40000
  }
};

function handleOpenGachaCrate(crateType, count) {
  const table = CRATE_COSTS[crateType];
  if (!table || !table[count]) return;

  const cost = table[count];
  const currency = table.currency;

  if (!spendCurrency(currency, cost)) {
    showFloatingCurrencyToast(
      currency === 'gems' ? 'Không đủ Đá Quý (Gems)!' : 'Không đủ Vàng (Coins)!',
      '#FB7185'
    );
    return;
  }

  const result = rollGachaCratesO1(crateType, count, metaState.gachaPity);
  applyGachaDropsToMeta(result.drops, result.newPity);
  metaState.stats.totalCrates = (metaState.stats.totalCrates || 0) + count;
  saveProgress();

  updateTopResourceBar();
  renderArmyTab();
  renderGachaResultModal(result);
}

function renderGachaResultModal(result) {
  const titleEl = document.getElementById('gacha-result-title');
  const gridEl = document.getElementById('gacha-result-grid');
  if (!gridEl) return;

  if (titleEl) {
    titleEl.textContent = `KẾT QUẢ MỞ ${formatCompactNumber(result.totalOpened)} RƯƠNG`;
  }

  // Hiển thị tối đa 36 nhóm thẻ tiêu biểu nhất (sắp xếp từ bậc hiếm cao xuống thấp)
  const topDrops = result.drops.slice(0, 36);
  gridEl.innerHTML = topDrops
    .map((d) => {
      const unitSpec = UNIT_CATALOG.find((u) => u.id === d.unitId) || UNIT_CATALOG[0];
      const tier = getRarityTierById(d.rarityId);
      const avatarUrl = AssetLoader.getAvatarDataURL(unitSpec.spriteKey);
      return `
        <div class="gacha-drop-card" style="border-color: ${tier.color};">
          <img src="${avatarUrl}" alt="${unitSpec.name}" />
          <div class="unit-card-name">${unitSpec.name}</div>
          <div class="unit-card-rarity-label" style="color: ${tier.color};">${tier.name}</div>
          <div class="text-gold" style="font-size: 11px; font-weight: 900;">x${formatCompactNumber(d.count)}</div>
        </div>
      `;
    })
    .join('');

  openModal('modal-gacha-result');
}

function renderChipShop() {
  const grid = document.getElementById('chip-shop-grid');
  if (!grid) return;

  const coinIcon = AssetLoader.getUIIconURL('icon_coin');

  grid.innerHTML = CHIP_CATALOG.map((chip) => {
    const owned = Number(metaState.chipInventory[chip.id]) || 0;
    return `
      <div class="chip-shop-card" style="border-color: ${chip.color}55;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
            <span class="chip-shop-title" style="color:${chip.color};">${chip.name}</span>
            <span class="text-secondary" style="font-size:10px; font-weight:800;">Kho: ${owned}</span>
          </div>
          <p class="chip-shop-desc mt-4">${chip.desc}</p>
        </div>
        <button class="btn-primary-sm" data-buy-chip="${chip.id}" style="width:100%; padding:5px 8px; font-size:11px;">
          <span>Mua Chip</span>
          <span class="cost-inline"><img class="ui-icon-xs" src="${coinIcon}" alt="" /> ${chip.cost}</span>
        </button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-buy-chip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chipId = btn.getAttribute('data-buy-chip');
      const spec = CHIP_CATALOG.find((c) => c.id === chipId);
      if (!spec) return;
      if (!spendCurrency('coins', spec.cost)) {
        showFloatingCurrencyToast('Không đủ Vàng mua Chip!', '#FB7185');
        return;
      }
      metaState.chipInventory[chipId] = (Number(metaState.chipInventory[chipId]) || 0) + 1;
      saveProgress();
      updateTopResourceBar();
      renderChipShop();
      showFloatingCurrencyToast(`+1 ${spec.name}!`, spec.color);
    });
  });
}

/* --------------------------------------------------------------------------
 * 5. TAB 2: QUÂN ĐỘI, CHI TIẾT ĐƠN VỊ, HỢP NHẤT & PHÒNG TẬP SANDBOX DPS
 * -------------------------------------------------------------------------- */
let currentInspectedUnitId = 'infantry';

function renderArmyTab() {
  renderEquippedTurretButton();
  renderActiveDeckSlots();
  renderArmyUnitGrid();
  renderMergeLabList();
}

function renderEquippedTurretButton() {
  const spec = TURRET_CATALOG.find((t) => t.id === metaState.equippedTurret) || TURRET_CATALOG[0];
  const imgEl = document.getElementById('hud-equipped-turret-img');
  const nameEl = document.getElementById('hud-equipped-turret-name');
  const asset = AssetLoader.getTurret(spec.id);

  if (imgEl && asset && asset.dataURL) imgEl.src = asset.dataURL;
  if (nameEl) {
    const lv = (metaState.turrets[spec.id] && metaState.turrets[spec.id].level) || 1;
    nameEl.textContent = `${spec.name} (Lv.${lv})`;
  }
}

function renderActiveDeckSlots() {
  const container = document.getElementById('army-deck-slots');
  if (!container) return;

  const fuelIcon = AssetLoader.getUIIconURL('icon_fuel');

  // Hiển thị 6 ô: 5 ô dùng cho Battle + Challenge, ô thứ 6 mở rộng riêng cho Challenge Mode
  const slotsHtml = [];
  for (let i = 0; i < BASE_DECK_SIZE_CHALLENGE; i++) {
    const unitId = i < BASE_DECK_SIZE_BATTLE ? metaState.battleDeck[i] : metaState.challengeDeck[i];
    const isChallengeSlot = i === BASE_DECK_SIZE_CHALLENGE - 1;

    if (unitId) {
      const spec = UNIT_CATALOG.find((u) => u.id === unitId);
      const eff = getEffectiveUnitStats(unitId, 'blue');
      const avatarUrl = spec ? AssetLoader.getAvatarDataURL(spec.spriteKey) : '';
      slotsHtml.push(`
        <div class="deck-slot-card filled ${isChallengeSlot ? 'challenge-only' : ''}" data-deck-slot="${i}" title="Nhấn để tháo khỏi đội hình">
          <span class="deck-slot-badge">${isChallengeSlot ? 'CHL' : `#${i + 1}`}</span>
          <img src="${avatarUrl}" alt="${spec ? spec.name : ''}" />
          <span class="deck-slot-cost"><img class="ui-icon-xs" src="${fuelIcon}" alt="" style="width:10px;height:10px;" />${eff ? eff.cost : 20}</span>
        </div>
      `);
    } else {
      slotsHtml.push(`
        <div class="deck-slot-card ${isChallengeSlot ? 'challenge-only' : ''}" data-deck-slot="${i}">
          <span class="deck-slot-badge">${isChallengeSlot ? 'CHL' : `#${i + 1}`}</span>
          <span class="deck-slot-empty-hint">${isChallengeSlot ? 'Ô 6\nChallenge' : 'Trống'}</span>
        </div>
      `);
    }
  }

  container.innerHTML = slotsHtml.join('');

  container.querySelectorAll('[data-deck-slot]').forEach((slotEl) => {
    slotEl.addEventListener('click', () => {
      const idx = Number(slotEl.getAttribute('data-deck-slot'));
      const isChl = idx === BASE_DECK_SIZE_CHALLENGE - 1;
      const uid = isChl ? metaState.challengeDeck[idx] : metaState.battleDeck[idx];
      if (!uid) return;
      toggleUnitInDeck(uid, isChl);
      // Đồng bộ cả 2 deck cho 5 ô đầu
      if (!isChl) {
        for (let k = 0; k < BASE_DECK_SIZE_BATTLE; k++) {
          metaState.challengeDeck[k] = metaState.battleDeck[k];
        }
        saveProgress();
      }
      renderArmyTab();
    });
  });
}

function renderArmyUnitGrid() {
  const grid = document.getElementById('army-unit-grid');
  if (!grid) return;

  const fuelIcon = AssetLoader.getUIIconURL('icon_fuel');

  grid.innerHTML = UNIT_CATALOG.map((u) => {
    const uState = metaState.units[u.id];
    const tier = getRarityTierById(uState.rarityId);
    const eff = getEffectiveUnitStats(u.id, 'blue');
    const reqShards = computeShardRequirement(uState.level);
    const pct = clamp((uState.shards / reqShards) * 100, 0, 100);
    const isEquipped =
      metaState.battleDeck.includes(u.id) || metaState.challengeDeck.includes(u.id);
    const avatarUrl = AssetLoader.getAvatarDataURL(u.spriteKey);

    return `
      <div class="unit-card-item ${isEquipped ? 'equipped' : ''} ${uState.unlocked ? '' : 'locked'}"
           data-unit-card="${u.id}"
           style="border-color: ${uState.unlocked ? tier.color : ''};">
        <div class="unit-card-top-row">
          <span class="unit-card-cost-pill"><img class="ui-icon-xs" src="${fuelIcon}" alt="" style="width:11px;height:11px;" />${eff.cost}</span>
          <span class="unit-card-lv-tag">Lv.${uState.level}</span>
        </div>
        <div class="unit-card-sprite-box">
          <img class="unit-card-sprite" src="${avatarUrl}" alt="${u.name}" />
        </div>
        <div class="unit-card-name">${u.name}</div>
        <div class="unit-card-rarity-label" style="color:${tier.color};">${tier.name}</div>
        <div class="unit-shard-bar">
          <div class="unit-shard-fill ${uState.shards >= reqShards ? 'ready' : ''}" style="width:${pct}%;"></div>
          <span class="unit-shard-text">${uState.unlocked ? `${formatCompactNumber(uState.shards)}/${reqShards}` : 'CHƯA MỞ'}</span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-unit-card]').forEach((card) => {
    card.addEventListener('click', () => {
      const uid = card.getAttribute('data-unit-card');
      openUnitDetailModal(uid);
    });
  });
}

function openUnitDetailModal(unitId) {
  currentInspectedUnitId = unitId;
  const spec = UNIT_CATALOG.find((u) => u.id === unitId);
  const uState = metaState.units[unitId];
  if (!spec || !uState) return;

  const tier = getRarityTierById(uState.rarityId);
  const eff = getEffectiveUnitStats(unitId, 'blue');
  const reqShards = computeShardRequirement(uState.level);
  const coinCost = 80 + uState.level * 45;

  document.getElementById('modal-unit-name').textContent = spec.name.toUpperCase();
  document.getElementById('modal-unit-avatar').src = AssetLoader.getAvatarDataURL(spec.spriteKey);

  const rarityEl = document.getElementById('modal-unit-rarity');
  rarityEl.textContent = tier.name.toUpperCase();
  rarityEl.style.color = tier.color;

  document.getElementById('modal-unit-level').textContent =
    `Cấp ${uState.level} • Mảnh: ${formatCompactNumber(uState.shards)}/${reqShards}`;
  document.getElementById('modal-unit-role').textContent = `Vai trò: ${spec.role}`;
  document.getElementById('modal-unit-desc').textContent = spec.desc;

  document.getElementById('modal-unit-stats-grid').innerHTML = `
    <div class="stat-box-item"><span class="stat-box-label">Sinh Lực (HP)</span><span class="stat-box-val text-green">${formatCompactNumber(eff.hp)}</span></div>
    <div class="stat-box-item"><span class="stat-box-label">Sát Thương</span><span class="stat-box-val text-gold">${formatCompactNumber(eff.atk)}</span></div>
    <div class="stat-box-item"><span class="stat-box-label">Tốc Đánh</span><span class="stat-box-val text-cyan">${eff.atkSpeed.toFixed(2)}/s</span></div>
    <div class="stat-box-item"><span class="stat-box-label">Tầm Bắn</span><span class="stat-box-val">${eff.range}px</span></div>
    <div class="stat-box-item"><span class="stat-box-label">Xuyên Giáp</span><span class="stat-box-val">${Math.round(eff.armorPierce * 100)}%</span></div>
    <div class="stat-box-item"><span class="stat-box-label">Chí Mạng</span><span class="stat-box-val text-gold">${Math.round(eff.critRate * 100)}%</span></div>
  `;

  // Render 3 ổ khảm Chip bổ trợ
  const socketsRow = document.getElementById('modal-unit-sockets');
  socketsRow.innerHTML = uState.sockets
    .map((chipId, sIdx) => {
      const chip = chipId ? CHIP_CATALOG.find((c) => c.id === chipId) : null;
      return `
        <button class="socket-slot-btn ${chip ? 'has-chip' : ''}" data-socket-idx="${sIdx}" style="color:${chip ? chip.color : ''};">
          ${chip ? chip.name : `+ Ô Chip ${sIdx + 1}`}
        </button>
      `;
    })
    .join('');

  socketsRow.querySelectorAll('[data-socket-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sIdx = Number(btn.getAttribute('data-socket-idx'));
      cycleSocketChip(unitId, sIdx);
      openUnitDetailModal(unitId);
      renderArmyTab();
    });
  });

  const equipBtn = document.getElementById('btn-modal-equip-unit');
  const isEquipped = metaState.battleDeck.includes(unitId);
  equipBtn.textContent = !uState.unlocked
    ? 'Chưa Mở Khóa'
    : isEquipped
      ? 'Tháo Khỏi Đội Hình'
      : 'Đưa Vào Đội Hình';
  equipBtn.disabled = !uState.unlocked;

  const upgBtn = document.getElementById('btn-modal-upgrade-unit');
  upgBtn.textContent = `Nâng Cấp (${formatCompactNumber(coinCost)} Vàng)`;
  upgBtn.disabled = !uState.unlocked;

  openModal('modal-unit-detail');
}

function cycleSocketChip(unitId, socketIdx) {
  const uState = metaState.units[unitId];
  if (!uState) return;

  // Nếu đang gắn chip -> tháo trả về kho
  const currentChip = uState.sockets[socketIdx];
  if (currentChip) {
    metaState.chipInventory[currentChip] = (Number(metaState.chipInventory[currentChip]) || 0) + 1;
    uState.sockets[socketIdx] = null;
    saveProgress();
    return;
  }

  // Tìm chip có sẵn trong kho để gắn vào
  const available = CHIP_CATALOG.find((c) => (Number(metaState.chipInventory[c.id]) || 0) > 0);
  if (!available) {
    showFloatingCurrencyToast('Kho Chip trống! Hãy mua ở Shop.', '#FB7185');
    return;
  }

  metaState.chipInventory[available.id] -= 1;
  uState.sockets[socketIdx] = available.id;
  saveProgress();
  showFloatingCurrencyToast(`Đã khảm ${available.name}!`, available.color);
}

function renderMergeLabList() {
  const listEl = document.getElementById('army-merge-list');
  if (!listEl) return;

  listEl.innerHTML = UNIT_CATALOG.map((u) => {
    const uState = metaState.units[u.id];
    const tier = getRarityTierById(uState.rarityId);
    const totalCards = Object.values(uState.rarityCounts || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);
    const avatarUrl = AssetLoader.getAvatarDataURL(u.spriteKey);

    return `
      <div class="merge-row-card">
        <div class="merge-row-left">
          <img src="${avatarUrl}" alt="${u.name}" />
          <div>
            <div class="unit-card-name" style="text-align:left;">${u.name}</div>
            <div style="font-size:11px; font-weight:800; color:${tier.color};">Bậc cao nhất: ${tier.name}</div>
            <div class="text-secondary" style="font-size:10.5px;">Tổng thẻ sở hữu: ${formatCompactNumber(totalCards)}</div>
          </div>
        </div>
        <button class="btn-primary-sm" data-merge-unit="${u.id}" style="padding:6px 10px; font-size:11px;">
          Gộp Thẻ
        </button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-merge-unit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-merge-unit');
      const uState = metaState.units[uid];
      if (!uState) return;
      const res = computeAutoMergeChain(uState.rarityCounts);
      if (res.totalMerges <= 0) {
        showFloatingCurrencyToast('Cần ít nhất 3 thẻ cùng bậc để gộp!', '#FB7185');
        return;
      }
      uState.rarityCounts = res.updatedMap;
      uState.rarityId = res.highestRarityId;
      saveProgress();
      renderArmyTab();
      showFloatingCurrencyToast(`Hợp nhất thành công x${res.totalMerges} lần!`, '#4ADE80');
    });
  });
}

/* --------------------------------------------------------------------------
 * 5B. BỘ ĐIỀU KHIỂN PHÒNG TẬP SANDBOX ĐO DPS (SỬ DỤNG PROP_TARGET_DUMMY)
 * -------------------------------------------------------------------------- */
const SandboxController = {
  canvas: null,
  ctx: null,
  running: false,
  rafId: null,
  lastTime: 0,
  dummy: null,
  testUnits: [],
  totalDamage: 0,
  elapsedTime: 0,

  init() {
    this.canvas = document.getElementById('sandboxCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.renderUnitPicker();
  },

  renderUnitPicker() {
    const picker = document.getElementById('sandbox-unit-picker');
    if (!picker) return;

    picker.innerHTML = UNIT_CATALOG.map((u) => {
      const avatarUrl = AssetLoader.getAvatarDataURL(u.spriteKey);
      return `
        <button class="sandbox-pick-btn" data-sandbox-spawn="${u.id}" title="Triệu hồi ${u.name}">
          <img src="${avatarUrl}" alt="${u.name}" />
          <span>${u.name.split(' ')[0]}</span>
        </button>
      `;
    }).join('');

    picker.querySelectorAll('[data-sandbox-spawn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-sandbox-spawn');
        this.spawnTestUnit(uid);
      });
    });
  },

  start() {
    if (!this.canvas) this.init();
    this.running = true;
    this.resetArena();
    this.lastTime = performance.now();

    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  },

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  },

  resetArena() {
    const w = this.canvas ? this.canvas.width : 360;
    const h = this.canvas ? this.canvas.height : 240;

    this.dummy = new Combatant({
      id: 'target_dummy',
      name: 'Bia Tập Bắn',
      side: 'red',
      isTargetDummy: true,
      hp: 999999999,
      atk: 0,
      range: 0,
      speed: 0,
      x: w * 0.5,
      y: 66
    });
    this.testUnits = [];
    this.totalDamage = 0;
    this.elapsedTime = 0;
    this.updateDpsHud();
  },

  spawnTestUnit(unitId) {
    if (!this.dummy) this.resetArena();
    const w = this.canvas ? this.canvas.width : 360;
    const h = this.canvas ? this.canvas.height : 240;
    const stats = getEffectiveUnitStats(unitId, 'blue');
    if (!stats) return;

    this.testUnits.push(
      new Combatant({
        ...stats,
        side: 'blue',
        x: w * 0.5 + (Math.random() - 0.5) * 140,
        y: h - 32
      })
    );
  },

  recordDamage(dmg) {
    this.totalDamage += dmg;
  },

  updateDpsHud() {
    const dpsEl = document.getElementById('sandbox-dps-val');
    const totEl = document.getElementById('sandbox-total-dmg');
    const dps = this.elapsedTime > 0.2 ? Math.round(this.totalDamage / this.elapsedTime) : 0;
    if (dpsEl) dpsEl.textContent = formatCompactNumber(dps);
    if (totEl) totEl.textContent = formatCompactNumber(this.totalDamage);
  },

  update(dt) {
    if (this.testUnits.length > 0) {
      this.elapsedTime += dt;
    }

    // Tạm dùng danh sách kẻ địch chỉ gồm bia tập bắn prop_target_dummy
    const prevEnemies = game.enemies;
    const prevUnits = game.units;
    const prevRedMansion = game.redMansion;

    game.enemies = [this.dummy];
    game.units = this.testUnits;
    game.redMansion = null;

    for (let i = 0; i < this.testUnits.length; i++) {
      this.testUnits[i].update(dt, null);
    }
    updateProjectiles(dt);
    particlePool.update(dt);

    game.enemies = prevEnemies;
    game.units = prevUnits;
    game.redMansion = prevRedMansion;

    this.updateDpsHud();
  },

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Nền sân tập luyện cỏ xanh pixel
    const map1 = AssetLoader.getMap('map1');
    if (map1) {
      ctx.drawImage(map1, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#14532D';
      ctx.fillRect(0, 0, w, h);
    }

    if (this.dummy) {
      BattleRenderer.renderCombatant(ctx, this.dummy);
    }
    for (let i = 0; i < this.testUnits.length; i++) {
      BattleRenderer.renderCombatant(ctx, this.testUnits[i]);
    }
    BattleRenderer.renderProjectiles(ctx);
    particlePool.render(ctx);
    BattleRenderer.renderFloatingTexts(ctx);
  }
};

/* --------------------------------------------------------------------------
 * 6. TAB 4: DANH SÁCH 54 MÀN THỬ THÁCH XÁC SỐNG (CHALLENGE MODE)
 * -------------------------------------------------------------------------- */
let currentChallengeBiomeFilter = 'all';

function renderChallengeStageList() {
  const listEl = document.getElementById('challenge-stage-list');
  if (!listEl) return;

  const filtered = STAGE_CATALOG.filter(
    (s) => currentChallengeBiomeFilter === 'all' || String(s.biomeId) === currentChallengeBiomeFilter
  );

  listEl.innerHTML = filtered
    .map((stage) => {
      const cleared = Boolean(metaState.challengeCleared[stage.level]);
      return `
        <div class="challenge-stage-card ${cleared ? 'cleared' : ''}">
          <div>
            <div class="text-cyan" style="font-size:10px; font-weight:800;">${stage.biomeName}</div>
            <div class="text-primary" style="font-size:13px; font-weight:900;">
              Ải ${String(stage.level).padStart(2, '0')} • ${stage.name}
            </div>
            <div class="text-secondary" style="font-size:11px;">
              20 Waves Zombie • Thưởng: <span class="text-gold">+${stage.rewardGems + 25} Gems</span>
            </div>
          </div>
          <button class="${cleared ? 'btn-secondary-sm' : 'btn-danger-sm'}" data-start-challenge="${stage.level}">
            ${cleared ? 'Đánh Lại' : 'Thử Thách'}
          </button>
        </div>
      `;
    })
    .join('');

  listEl.querySelectorAll('[data-start-challenge]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lv = Number(btn.getAttribute('data-start-challenge'));
      launchBattleWithCloudDive('challenge', lv);
    });
  });
}

/* --------------------------------------------------------------------------
 * 7. TAB 5: CÂY KỸ NĂNG 6 NHÁNH (DRAG-TO-PAN + ZOOM + SVG LINES - PHẦN 5)
 * -------------------------------------------------------------------------- */
const SkillTreeUI = {
  selectedNodeId: 'fort_1',
  activeBranch: 'all',
  panX: 16,
  panY: 16,
  zoom: 0.72,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,

  init() {
    this.bindViewportGestures();
    this.render();
  },

  bindViewportGestures() {
    const viewport = document.getElementById('skill-tree-viewport');
    if (!viewport) return;

    viewport.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.skill-node-btn')) return;
      this.isDragging = true;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      this.panX = clamp(e.clientX - this.dragStartX, -620, 140);
      this.panY = clamp(e.clientY - this.dragStartY, -380, 120);
      this.applyTransform();
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    document.getElementById('btn-skill-zoom-in')?.addEventListener('click', () => {
      this.zoom = clamp(this.zoom + 0.14, 0.45, 1.35);
      this.applyTransform();
    });

    document.getElementById('btn-skill-zoom-out')?.addEventListener('click', () => {
      this.zoom = clamp(this.zoom - 0.14, 0.45, 1.35);
      this.applyTransform();
    });

    document.getElementById('btn-skill-reset-view')?.addEventListener('click', () => {
      this.focusBranch(this.activeBranch);
    });

    document.querySelectorAll('#skill-branch-tabs .branch-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#skill-branch-tabs .branch-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeBranch = btn.getAttribute('data-branch') || 'all';
        this.focusBranch(this.activeBranch);
        this.render();
      });
    });

    document.getElementById('btn-upgrade-skill')?.addEventListener('click', () => {
      const res = upgradeSkillTreeNode(this.selectedNodeId);
      if (!res.ok) {
        showFloatingCurrencyToast(res.reason, '#FB7185');
        return;
      }
      updateTopResourceBar();
      this.render();
      showFloatingCurrencyToast(`Nâng cấp thành công Lv.${res.newLevel}!`, '#4ADE80');
    });
  },

  focusBranch(branchId) {
    if (branchId === 'all') {
      this.panX = 12;
      this.panY = 14;
      this.zoom = 0.62;
    } else {
      const firstNode = ANCIENT_SKILL_TREE.find((n) => n.branch === branchId);
      if (firstNode) {
        this.zoom = 0.92;
        this.panX = 190 - firstNode.pos.x * this.zoom;
        this.panY = 24;
      }
    }
    this.applyTransform();
  },

  applyTransform() {
    const wrap = document.getElementById('skill-tree-canvas-wrap');
    if (wrap) {
      wrap.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }
  },

  render() {
    const svgEl = document.getElementById('skill-tree-svg');
    const nodesContainer = document.getElementById('skill-tree-nodes');
    if (!svgEl || !nodesContainer) return;

    this.applyTransform();

    // 1. Vẽ các đường nối SVG phát sáng giữa các node trong 6 nhánh
    const lines = [];
    for (let i = 0; i < ANCIENT_SKILL_TREE.length; i++) {
      const node = ANCIENT_SKILL_TREE[i];
      if (!node.requires) continue;
      const parent = ANCIENT_SKILL_TREE.find((n) => n.id === node.requires);
      if (!parent) continue;

      const parentLv = Number(metaState.skillTree[parent.id]) || 0;
      const activeLine = parentLv > 0;
      const dimmed = this.activeBranch !== 'all' && node.branch !== this.activeBranch;

      lines.push(`
        <line x1="${parent.pos.x}" y1="${parent.pos.y}"
              x2="${node.pos.x}" y2="${node.pos.y}"
              stroke="${activeLine ? '#4ADE80' : '#334155'}"
              stroke-width="${activeLine ? 4 : 2.5}"
              stroke-opacity="${dimmed ? 0.2 : 0.95}"
              stroke-dasharray="${activeLine ? 'none' : '6 5'}" />
      `);
    }
    svgEl.innerHTML = lines.join('');

    // 2. Vẽ 36 nút kỹ năng
    nodesContainer.innerHTML = ANCIENT_SKILL_TREE.map((node) => {
      const lv = Number(metaState.skillTree[node.id]) || 0;
      const unlocked = isSkillNodeUnlocked(node);
      const isMaxed = lv >= node.maxLv;
      const isSelected = this.selectedNodeId === node.id;
      const dimmed = this.activeBranch !== 'all' && node.branch !== this.activeBranch;

      const classes = [
        'skill-node-btn',
        lv > 0 ? 'unlocked' : (unlocked ? 'available' : ''),
        isMaxed ? 'maxed' : '',
        node.isUltimate ? 'ultimate' : '',
        isSelected ? 'selected' : '',
        dimmed ? 'dimmed' : ''
      ]
        .filter(Boolean)
        .join(' ');

      return `
        <button class="${classes}"
                data-skill-node="${node.id}"
                style="left:${node.pos.x}px; top:${node.pos.y}px;">
          <span class="skill-node-title">${node.name.replace('TỐI THƯỢNG: ', '★ ')}</span>
          <span class="skill-node-lv">${lv}/${node.maxLv}</span>
        </button>
      `;
    }).join('');

    nodesContainer.querySelectorAll('[data-skill-node]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedNodeId = btn.getAttribute('data-skill-node');
        this.render();
      });
    });

    this.renderInspector();
  },

  renderInspector() {
    const node = ANCIENT_SKILL_TREE.find((n) => n.id === this.selectedNodeId) || ANCIENT_SKILL_TREE[0];
    if (!node) return;

    const lv = Number(metaState.skillTree[node.id]) || 0;
    const isMaxed = lv >= node.maxLv;
    const cost = getSkillUpgradeCost(node);
    const pearlIcon = AssetLoader.getUIIconURL('icon_pearl');

    document.getElementById('skill-insp-branch').textContent = node.branchName.toUpperCase();
    document.getElementById('skill-insp-name').textContent = node.name;
    document.getElementById('skill-insp-level').textContent = `Lv. ${lv} / ${node.maxLv}`;
    document.getElementById('skill-insp-desc').textContent = node.desc;

    const curPct = Math.round(lv * node.valPerLv * 100);
    const nextPct = Math.round(Math.min(node.maxLv, lv + 1) * node.valPerLv * 100);
    document.getElementById('skill-insp-stats').textContent = isMaxed
      ? `Đã đạt tối đa (+${curPct}%)`
      : `Hiện tại: +${curPct}% ➔ Kế tiếp: +${nextPct}%`;

    const upgBtn = document.getElementById('btn-upgrade-skill');
    const costEl = document.getElementById('skill-insp-cost');
    upgBtn.disabled = isMaxed || !isSkillNodeUnlocked(node);
    costEl.innerHTML = isMaxed
      ? 'MAX'
      : `<img class="ui-icon-xs" src="${pearlIcon}" alt="" /> ${cost}`;
  }
};

/* --------------------------------------------------------------------------
 * 8. CÁC MODAL PHỤ TRỢ (TURRETS, MISSION, TALENTS, WHEEL, INDEX, MINI-GAME)
 * -------------------------------------------------------------------------- */
function renderTurretsModal() {
  const container = document.getElementById('turret-list-container');
  if (!container) return;

  const coinIcon = AssetLoader.getUIIconURL('icon_coin');

  container.innerHTML = TURRET_CATALOG.map((t) => {
    const state = metaState.turrets[t.id];
    const asset = AssetLoader.getTurret(t.id);
    const isEquipped = metaState.equippedTurret === t.id;
    const upgCost = state.unlocked
      ? Math.round(t.upgBaseCost * Math.pow(1.35, state.level - 1))
      : t.unlockCost;

    return `
      <div class="turret-item-card ${isEquipped ? 'equipped' : ''}">
        <img class="turret-sprite-thumb" src="${asset ? asset.dataURL : ''}" alt="${t.name}" />
        <div class="turret-item-info">
          <div class="text-primary" style="font-size:13px; font-weight:900;">
            ${t.name} ${state.unlocked ? `<span class="text-gold">Lv.${state.level}</span>` : ''}
          </div>
          <p class="text-secondary" style="font-size:11px; margin-top:2px;">${t.desc}</p>
        </div>
        <div class="turret-item-actions">
          <button class="btn-primary-sm" data-upg-turret="${t.id}" style="padding:5px 8px; font-size:10.5px;">
            <span>${state.unlocked ? 'Nâng Cấp' : 'Mở Khóa'}</span>
            <span class="cost-inline"><img class="ui-icon-xs" src="${coinIcon}" alt="" /> ${formatCompactNumber(upgCost)}</span>
          </button>
          ${
            state.unlocked
              ? `<button class="${isEquipped ? 'btn-secondary-sm' : 'btn-chip-outline'}" data-equip-turret="${t.id}" style="padding:4px 8px; font-size:10.5px;">
                   ${isEquipped ? '✓ Đang Gắn' : 'Trang Bị'}
                 </button>`
              : ''
          }
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-upg-turret]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tid = btn.getAttribute('data-upg-turret');
      const res = upgradeOrUnlockTurret(tid);
      if (!res.ok) {
        showFloatingCurrencyToast(res.reason, '#FB7185');
        return;
      }
      updateTopResourceBar();
      renderEquippedTurretButton();
      renderTurretsModal();
      showFloatingCurrencyToast('Nâng cấp Ụ Pháo thành công!', '#4ADE80');
    });
  });

  container.querySelectorAll('[data-equip-turret]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tid = btn.getAttribute('data-equip-turret');
      equipTurret(tid);
      renderEquippedTurretButton();
      renderTurretsModal();
    });
  });
}

function renderMissionModal() {
  const totalStars = Object.values(metaState.stageStars || {}).reduce((acc, s) => acc + (Number(s) || 0), 0);
  const progressText = document.getElementById('star-chest-progress-text');
  if (progressText) progressText.textContent = `Tổng sao: ${totalStars} / 162 ★`;

  const listEl = document.getElementById('mission-list-container');
  if (!listEl) return;

  listEl.innerHTML = MISSION_CATALOG.map((m) => {
    const cur = Math.min(m.target, Number(metaState.stats[m.stat]) || 0);
    const claimed = Boolean(metaState.claimedMissions[m.id]);
    const ready = !claimed && cur >= m.target;

    return `
      <div class="mission-row-card">
        <div>
          <div class="text-primary" style="font-size:12px; font-weight:800;">${m.title}</div>
          <div class="text-gold" style="font-size:11px; font-weight:900;">
            Tiến độ: ${cur}/${m.target} • Thưởng: +${m.rewardVal} ${m.rewardType.toUpperCase()}
          </div>
        </div>
        <button class="${ready ? 'btn-primary-sm' : 'btn-secondary-sm'}"
                data-claim-mission="${m.id}"
                ${ready ? '' : 'disabled'}
                style="padding:5px 10px; font-size:11px;">
          ${claimed ? 'Đã Nhận' : ready ? 'Nhận' : 'Chưa Đủ'}
        </button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-claim-mission]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mid = btn.getAttribute('data-claim-mission');
      const spec = MISSION_CATALOG.find((m) => m.id === mid);
      if (!spec || metaState.claimedMissions[mid]) return;
      metaState.claimedMissions[mid] = true;
      addCurrency(spec.rewardType, spec.rewardVal);
      saveProgress();
      updateTopResourceBar();
      renderMissionModal();
      showFloatingCurrencyToast(`+${spec.rewardVal} ${spec.rewardType.toUpperCase()}!`, '#4ADE80');
    });
  });
}

function renderTalentsModal() {
  const listEl = document.getElementById('talent-list-container');
  if (!listEl) return;

  const coinIcon = AssetLoader.getUIIconURL('icon_coin');

  listEl.innerHTML = META_TALENTS.map((t) => {
    const lv = Number(metaState.metaTalents[t.id]) || 0;
    const isMax = lv >= t.maxLv;
    const cost = Math.round(t.baseCost * Math.pow(1.4, lv));

    return `
      <div class="talent-row-card">
        <div>
          <div class="text-primary" style="font-size:12.5px; font-weight:900;">
            ${t.name} <span class="text-gold">(Lv.${lv}/${t.maxLv})</span>
          </div>
          <div class="text-secondary" style="font-size:11px;">${t.desc}</div>
        </div>
        <button class="btn-primary-sm" data-upg-talent="${t.id}" ${isMax ? 'disabled' : ''} style="padding:6px 10px; font-size:11px;">
          ${isMax ? 'MAX' : `<span class="cost-inline"><img class="ui-icon-xs" src="${coinIcon}" alt="" /> ${formatCompactNumber(cost)}</span>`}
        </button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-upg-talent]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tid = btn.getAttribute('data-upg-talent');
      const spec = META_TALENTS.find((t) => t.id === tid);
      if (!spec) return;
      const lv = Number(metaState.metaTalents[tid]) || 0;
      if (lv >= spec.maxLv) return;
      const cost = Math.round(spec.baseCost * Math.pow(1.4, lv));
      if (!spendCurrency('coins', cost)) {
        showFloatingCurrencyToast('Không đủ Vàng!', '#FB7185');
        return;
      }
      metaState.metaTalents[tid] = lv + 1;
      saveProgress();
      updateTopResourceBar();
      renderTalentsModal();
      showFloatingCurrencyToast(`Nâng cấp ${spec.name} Lv.${lv + 1}!`, '#FACC15');
    });
  });
}

let wheelRotationDeg = 0;
let isWheelSpinning = false;

function spinLuckyWheel() {
  if (isWheelSpinning) return;
  if (!spendCurrency('gems', 50)) {
    showFloatingCurrencyToast('Cần 50 Gems để quay!', '#FB7185');
    return;
  }

  isWheelSpinning = true;
  updateTopResourceBar();

  const rewards = [
    { label: '+1,000 Vàng!', type: 'coins', val: 1000 },
    { label: '+120 Gems!', type: 'gems', val: 120 },
    { label: '+2 Ngọc Trai Cổ Đại!', type: 'pearls', val: 2 },
    { label: '+2,500 Vàng!', type: 'coins', val: 2500 },
    { label: '+250 Gems!', type: 'gems', val: 250 },
    { label: '+5 Huy Chương!', type: 'medals', val: 5 }
  ];

  const pickIdx = Math.floor(Math.random() * rewards.length);
  const prize = rewards[pickIdx];
  wheelRotationDeg += 1440 + pickIdx * 60 + Math.floor(Math.random() * 25);

  const spinner = document.getElementById('lucky-wheel-spinner');
  const resText = document.getElementById('wheel-result-text');
  if (spinner) spinner.style.transform = `rotate(${wheelRotationDeg}deg)`;
  if (resText) resText.textContent = 'Đang quay thưởng...';

  setTimeout(() => {
    isWheelSpinning = false;
    addCurrency(prize.type, prize.val);
    saveProgress();
    updateTopResourceBar();
    if (resText) resText.textContent = `Chúc mừng bạn trúng: ${prize.label}`;
    showFloatingCurrencyToast(prize.label, '#FACC15');
  }, 3250);
}

function renderIndexCatalog(category = 'units') {
  const grid = document.getElementById('index-catalog-grid');
  if (!grid) return;

  const list =
    category === 'bosses'
      ? BOSS_CATALOG
      : category === 'zombies'
        ? ZOMBIE_CATALOG
        : UNIT_CATALOG;

  grid.innerHTML = list
    .map((item) => {
      const avatarUrl = AssetLoader.getAvatarDataURL(item.spriteKey);
      return `
        <div class="index-entry-card">
          <img src="${avatarUrl}" alt="${item.name}" />
          <div class="text-primary" style="font-size:12px; font-weight:900;">${item.name}</div>
          <div class="text-gold" style="font-size:10.5px;">HP: ${formatCompactNumber(item.hp)} • ATK: ${formatCompactNumber(item.atk)}</div>
          <div class="text-secondary" style="font-size:10px;">${item.role || (category === 'bosses' ? 'Trùm Cuối Chiến Trường' : 'Binh Đoàn Xác Sống')}</div>
        </div>
      `;
    })
    .join('');
}

function renderRarityTableModal() {
  const listEl = document.getElementById('rarity-tiers-list');
  if (!listEl) return;

  listEl.innerHTML = RARITY_TIERS.map(
    (t, idx) => `
      <div class="rarity-tier-row" style="border-color:${t.color}66;">
        <span style="color:${t.color};">#${idx + 1} ${t.name}</span>
        <span class="text-gold">x${t.mult}</span>
      </div>
    `
  ).join('');
}

/* Mini-game Phá Mìn Nhận Gem (5x5) */
const MiniGameMines = {
  bombs: new Set(),
  revealed: new Set(),
  currentGems: 0,
  gameOver: false,

  reset() {
    this.bombs.clear();
    this.revealed.clear();
    this.currentGems = 0;
    this.gameOver = false;
    while (this.bombs.size < 5) {
      this.bombs.add(Math.floor(Math.random() * 25));
    }
    this.render();
  },

  render() {
    const grid = document.getElementById('minigame-grid');
    const status = document.getElementById('minigame-status');
    if (!grid) return;

    if (status) {
      status.textContent = this.gameOver
        ? '💥 Chạm mìn rồi! Nhấn Chơi Ván Mới.'
        : `Thưởng hiện tại: ${this.currentGems} Gems`;
    }

    const cells = [];
    for (let i = 0; i < 25; i++) {
      const isRev = this.revealed.has(i);
      const isBomb = this.bombs.has(i);
      let cls = 'minigame-cell';
      let label = '?';
      if (isRev) {
        cls += isBomb ? ' bomb' : ' safe';
        label = isBomb ? '💣' : '💎';
      }
      cells.push(`<button class="${cls}" data-mg-cell="${i}">${label}</button>`);
    }
    grid.innerHTML = cells.join('');

    grid.querySelectorAll('[data-mg-cell]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.gameOver) return;
        const idx = Number(btn.getAttribute('data-mg-cell'));
        if (this.revealed.has(idx)) return;
        this.revealed.add(idx);

        if (this.bombs.has(idx)) {
          this.gameOver = true;
          this.currentGems = 0;
          this.bombs.forEach((b) => this.revealed.add(b));
        } else {
          this.currentGems += 15;
        }
        this.render();
      });
    });
  },

  cashout() {
    if (this.currentGems <= 0 || this.gameOver) return;
    addCurrency('gems', this.currentGems);
    saveProgress();
    updateTopResourceBar();
    showFloatingCurrencyToast(`+${this.currentGems} Gems!`, '#38BDF8');
    this.reset();
  }
};

/* --------------------------------------------------------------------------
 * 9. MODALS TRONG TRẬN & KẾT QUẢ (ROGUELIKE DRAFT & VICTORY/DEFEAT)
 * -------------------------------------------------------------------------- */
function openRoguelikeDraftModal() {
  if (game.pendingLevelUps <= 0) return;
  game.paused = true;

  const pool = [
    { id: 'rl_atk', title: 'Hỏa Lực Tối Đa', desc: 'Tăng +20% Sát thương toàn quân đội trong trận này.', apply: () => { game.roguelikeBuffs.atkPct += 0.20; } },
    { id: 'rl_hp',  title: 'Giáp Phản Ứng', desc: 'Tăng +25% HP tối đa toàn quân & hồi 300 HP Mansion Xanh.', apply: () => { game.roguelikeBuffs.hpPct += 0.25; game.playerHp = Math.min(game.playerMaxHp, game.playerHp + 300); } },
    { id: 'rl_spd', title: 'Đột Kích Thần Tốc', desc: 'Tăng +20% Tốc độ đánh toàn quân đội.', apply: () => { game.roguelikeBuffs.atkSpdPct += 0.20; } },
    { id: 'rl_gas', title: 'Nhà Máy Lọc Dầu', desc: 'Tăng +25% Tốc độ hồi Xăng & cộng ngay +40 Xăng.', apply: () => { game.roguelikeBuffs.gasRegenPct += 0.25; game.gas = Math.min(game.maxGas, game.gas + 40); } },
    { id: 'rl_crt', title: 'Xạ Thủ Tinh Anh', desc: 'Tăng +15% Tỷ lệ đánh chí mạng toàn quân.', apply: () => { game.roguelikeBuffs.critRate += 0.15; } }
  ];

  // Chọn ngẫu nhiên 3 thẻ nâng cấp
  const choices = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  const container = document.getElementById('roguelike-draft-cards');
  if (container) {
    container.innerHTML = choices
      .map(
        (c, idx) => `
          <button class="draft-option-card" data-draft-idx="${idx}">
            <strong class="text-gold" style="font-size:13.5px;">${c.title}</strong>
            <span class="text-primary" style="font-size:12px;">${c.desc}</span>
          </button>
        `
      )
      .join('');

    container.querySelectorAll('[data-draft-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-draft-idx'));
        choices[idx].apply();
        game.pendingLevelUps = Math.max(0, game.pendingLevelUps - 1);
        closeModal('modal-roguelike-draft');
        game.paused = false;
      });
    });
  }

  openModal('modal-roguelike-draft');
}

function showBattleResultModal(isVictory, stars = 3, rewards = {}) {
  const titleEl = document.getElementById('result-banner-title');
  const starsEl = document.getElementById('result-stars-display');
  const subEl = document.getElementById('result-subtitle');
  const gridEl = document.getElementById('result-rewards-grid');
  const nextBtn = document.getElementById('btn-result-next');

  if (titleEl) {
    titleEl.textContent = isVictory ? 'CHIẾN THẮNG!' : 'THẤT BẠI!';
    titleEl.className = `result-title ${isVictory ? 'text-gold' : 'text-danger'}`;
  }
  if (starsEl) {
    starsEl.textContent = isVictory
      ? `${stars >= 1 ? '★' : '☆'} ${stars >= 2 ? '★' : '☆'} ${stars >= 3 ? '★' : '☆'}`
      : '☆ ☆ ☆';
  }
  if (subEl) {
    subEl.textContent = isVictory
      ? 'Mansion Đỏ đã bị san phẳng hoàn toàn!'
      : 'Mansion Xanh đã thất thủ! Hãy nâng cấp quân đội và thử lại.';
  }

  if (gridEl) {
    const pills = [];
    if (rewards.coins) {
      pills.push(`<div class="reward-pill-box"><img class="ui-icon" src="${AssetLoader.getUIIconURL('icon_coin')}" alt="" /> +${formatCompactNumber(rewards.coins)}</div>`);
    }
    if (rewards.gems) {
      pills.push(`<div class="reward-pill-box"><img class="ui-icon" src="${AssetLoader.getUIIconURL('icon_gem')}" alt="" /> +${formatCompactNumber(rewards.gems)}</div>`);
    }
    if (rewards.pearls) {
      pills.push(`<div class="reward-pill-box"><img class="ui-icon" src="${AssetLoader.getUIIconURL('icon_pearl')}" alt="" /> +${rewards.pearls}</div>`);
    }
    if (rewards.medals) {
      pills.push(`<div class="reward-pill-box"><img class="ui-icon" src="${AssetLoader.getUIIconURL('icon_medal')}" alt="" /> +${rewards.medals}</div>`);
    }
    gridEl.innerHTML = pills.join('');
  }

  if (nextBtn) {
    nextBtn.style.display = isVictory && game.stageLevel < 54 ? 'inline-flex' : 'none';
  }

  openModal('modal-battle-result');
}

/* --------------------------------------------------------------------------
 * 10. GẮN TOÀN BỘ SỰ KIỆN GIAO DIỆN SẢNH (INIT LOBBY UI)
 * -------------------------------------------------------------------------- */
function initLobbyUI() {
  updateTopResourceBar();
  syncLobbyStageDisplay();
  renderChipShop();
  renderArmyTab();
  renderChallengeStageList();
  SkillTreeUI.init();
  SandboxController.init();

  // 1. Chuyển đổi 5 Tab dưới đáy
  document.querySelectorAll('#lobby-bottom-nav .nav-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      document.querySelectorAll('#lobby-bottom-nav .nav-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.lobby-tab-panel').forEach((p) => {
        p.classList.toggle('active', p.getAttribute('data-tab') === target);
      });

      if (target === 'skill-tree') {
        SkillTreeUI.render();
      }
      if (target === 'battle') {
        syncLobbyStageDisplay();
      }
      if (target !== 'army') {
        SandboxController.stop();
      }
    });
  });

  // 2. Chuyển 3 Sub-tab trong Tab ARMY (Quân đội / Phòng tập DPS / Hợp nhất)
  document.querySelectorAll('.army-subtab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sub = btn.getAttribute('data-subtab');
      document.querySelectorAll('.army-subtab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      document.getElementById('army-subpanel-army')?.classList.toggle('hidden', sub !== 'army');
      document.getElementById('army-subpanel-review')?.classList.toggle('hidden', sub !== 'review');
      document.getElementById('army-subpanel-merge')?.classList.toggle('hidden', sub !== 'merge');

      if (sub === 'review') {
        SandboxController.start();
      } else {
        SandboxController.stop();
      }
    });
  });

  document.getElementById('btn-reset-sandbox')?.addEventListener('click', () => {
    SandboxController.resetArena();
  });

  // 3. Nút Gacha mở rương & Auto-Merge tất cả
  document.querySelectorAll('.btn-gacha-open').forEach((btn) => {
    btn.addEventListener('click', () => {
      const crate = btn.getAttribute('data-crate');
      const count = Number(btn.getAttribute('data-count')) || 1;
      handleOpenGachaCrate(crate, count);
    });
  });

  document.getElementById('btn-auto-merge-all')?.addEventListener('click', () => {
    let grandTotal = 0;
    UNIT_CATALOG.forEach((u) => {
      const uState = metaState.units[u.id];
      if (!uState) return;
      const res = computeAutoMergeChain(uState.rarityCounts);
      if (res.totalMerges > 0) {
        uState.rarityCounts = res.updatedMap;
        uState.rarityId = res.highestRarityId;
        grandTotal += res.totalMerges;
      }
    });
    saveProgress();
    renderArmyTab();
    showFloatingCurrencyToast(
      grandTotal > 0 ? `Auto-Merge hoàn tất x${grandTotal} lần!` : 'Chưa có đủ 3 thẻ cùng bậc để gộp!',
      grandTotal > 0 ? '#4ADE80' : '#FB7185'
    );
  });

  // 4. Các nút Sảnh trung tâm (Battle Tab) & World Roadmap
  document.getElementById('lobby-map-preview-card')?.addEventListener('click', () => {
    WorldRoadmapController.open();
  });

  document.getElementById('btn-close-roadmap')?.addEventListener('click', () => {
    WorldRoadmapController.close();
  });

  document.querySelectorAll('#roadmap-biome-bar .biome-jump-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#roadmap-biome-bar .biome-jump-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      WorldRoadmapController.jumpToBiome(btn.getAttribute('data-biome'));
    });
  });

  document.getElementById('btn-roadmap-deploy')?.addEventListener('click', () => {
    WorldRoadmapController.close();
    launchBattleWithCloudDive(metaState.selectedMode || 'campaign', metaState.selectedStage);
  });

  // Popover chọn 7 chế độ chơi
  const modePopover = document.getElementById('mode-select-popover');
  document.getElementById('btn-select-mode')?.addEventListener('click', () => {
    modePopover?.classList.toggle('hidden');
  });

  document.querySelectorAll('.mode-option-item').forEach((opt) => {
    opt.addEventListener('click', () => {
      const mode = opt.getAttribute('data-mode') || 'campaign';
      metaState.selectedMode = mode;
      saveProgress();

      document.querySelectorAll('.mode-option-item').forEach((o) => o.classList.remove('active'));
      opt.classList.add('active');

      const labelEl = document.getElementById('current-mode-label');
      if (labelEl) {
        labelEl.textContent = opt.querySelector('strong')?.textContent.replace(/^\d+\.\s*/, '').toUpperCase() || mode.toUpperCase();
      }
      modePopover?.classList.add('hidden');
    });
  });

  document.getElementById('btn-start-battle')?.addEventListener('click', () => {
    launchBattleWithCloudDive(metaState.selectedMode || 'campaign', metaState.selectedStage);
  });

  // 5. Bộ lọc Biome trong Challenge Tab
  document.querySelectorAll('#challenge-biome-filters .biome-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#challenge-biome-filters .biome-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentChallengeBiomeFilter = pill.getAttribute('data-biome') || 'all';
      renderChallengeStageList();
    });
  });

  // 6. Các nút mở Modal & Đóng Modal
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeModal(btn.getAttribute('data-close-modal'));
    });
  });

  document.getElementById('btn-open-profile')?.addEventListener('click', () => openModal('modal-settings'));
  document.getElementById('btn-open-code')?.addEventListener('click', () => openModal('modal-settings'));

  document.getElementById('btn-open-turret-modal')?.addEventListener('click', () => {
    renderTurretsModal();
    openModal('modal-turrets');
  });

  document.getElementById('btn-open-mission')?.addEventListener('click', () => {
    renderMissionModal();
    openModal('modal-mission');
  });

  document.getElementById('btn-claim-star-chest')?.addEventListener('click', () => {
    const totalStars = Object.values(metaState.stageStars || {}).reduce((acc, s) => acc + (Number(s) || 0), 0);
    const reqStars = (metaState.starChestClaimed + 1) * 15;
    if (totalStars < reqStars) {
      showFloatingCurrencyToast(`Cần đạt ${reqStars} ★ để mở rương này!`, '#FB7185');
      return;
    }
    metaState.starChestClaimed += 1;
    addCurrency('gems', 150);
    addCurrency('pearls', 2);
    saveProgress();
    updateTopResourceBar();
    renderMissionModal();
    showFloatingCurrencyToast('+150 Gems & +2 Ngọc Trai!', '#FACC15');
  });

  document.getElementById('btn-open-talents')?.addEventListener('click', () => {
    renderTalentsModal();
    openModal('modal-talents');
  });

  document.getElementById('btn-open-wheel')?.addEventListener('click', () => openModal('modal-wheel'));
  document.getElementById('btn-spin-wheel')?.addEventListener('click', spinLuckyWheel);

  document.getElementById('btn-open-index')?.addEventListener('click', () => {
    renderIndexCatalog('units');
    openModal('modal-index');
  });

  document.querySelectorAll('.index-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.index-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderIndexCatalog(btn.getAttribute('data-index-cat'));
    });
  });

  document.getElementById('btn-open-rarity-modal')?.addEventListener('click', () => {
    renderRarityTableModal();
    openModal('modal-rarity');
  });

  document.getElementById('btn-open-chip-mod')?.addEventListener('click', () => {
    const invGrid = document.getElementById('chip-inventory-grid');
    if (invGrid) {
      invGrid.innerHTML = CHIP_CATALOG.map((c) => {
        const cnt = Number(metaState.chipInventory[c.id]) || 0;
        return `
          <div class="chip-shop-card" style="border-color:${c.color};">
            <strong style="color:${c.color}; font-size:12px;">${c.name}</strong>
            <span class="text-secondary" style="font-size:11px;">${c.desc}</span>
            <strong class="text-gold" style="font-size:11.5px;">Số lượng: ${cnt}</strong>
          </div>
        `;
      }).join('');
    }
    openModal('modal-chip-mod');
  });

  document.getElementById('btn-open-minigame')?.addEventListener('click', () => {
    MiniGameMines.reset();
    openModal('modal-minigame');
  });

  document.getElementById('btn-minigame-cashout')?.addEventListener('click', () => MiniGameMines.cashout());
  document.getElementById('btn-minigame-restart')?.addEventListener('click', () => MiniGameMines.reset());

  // 7. Các nút trong Modal Chi Tiết Binh Chủng
  document.getElementById('btn-modal-equip-unit')?.addEventListener('click', () => {
    toggleUnitInDeck(currentInspectedUnitId, false);
    for (let k = 0; k < BASE_DECK_SIZE_BATTLE; k++) {
      metaState.challengeDeck[k] = metaState.battleDeck[k];
    }
    saveProgress();
    renderArmyTab();
    openUnitDetailModal(currentInspectedUnitId);
  });

  document.getElementById('btn-modal-upgrade-unit')?.addEventListener('click', () => {
    const res = upgradeUnitLevel(currentInspectedUnitId);
    if (!res.ok) {
      showFloatingCurrencyToast(res.reason, '#FB7185');
      return;
    }
    updateTopResourceBar();
    renderArmyTab();
    openUnitDetailModal(currentInspectedUnitId);
    showFloatingCurrencyToast(`Tăng cấp thành công Lv.${res.newLevel}!`, '#4ADE80');
  });

  // 8. Giftcode, Cài đặt & Admin Mode
  document.getElementById('btn-redeem-code')?.addEventListener('click', () => {
    const input = document.getElementById('input-giftcode');
    const feedback = document.getElementById('giftcode-feedback');
    if (!input) return;

    const res = redeemGiftcode(input.value);
    if (feedback) {
      feedback.textContent = res.msg;
      feedback.className = `mt-4 ${res.ok ? 'text-green' : 'text-danger'}`;
    }
    if (res.ok) {
      input.value = '';
      updateTopResourceBar();
      renderChallengeStageList();
      if (res.isAdmin) {
        document.getElementById('admin-panel-banner')?.classList.remove('hidden');
      }
    }
  });

  document.getElementById('btn-Return-normal-mode')?.addEventListener('click', () => {
    metaState.isAdminMode = false;
    document.getElementById('admin-panel-banner')?.classList.add('hidden');
    updateTopResourceBar();
    showFloatingCurrencyToast('Đã thoát chế độ Admin!', '#38BDF8');
  });

  document.getElementById('chk-sfx-enabled')?.addEventListener('change', (e) => {
    metaState.settings.sfxEnabled = e.target.checked;
    saveProgress();
  });

  document.getElementById('chk-dmg-numbers')?.addEventListener('change', (e) => {
    metaState.settings.showDamageNumbers = e.target.checked;
    saveProgress();
  });

  document.getElementById('btn-reset-save')?.addEventListener('click', () => {
    resetAllProgress();
    updateTopResourceBar();
    syncLobbyStageDisplay();
    renderArmyTab();
    renderChallengeStageList();
    SkillTreeUI.render();
    closeModal('modal-settings');
    showFloatingCurrencyToast('Đã đặt lại toàn bộ dữ liệu!', '#FB7185');
  });
}