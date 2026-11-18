/**
 * ============================================================================
 * TINY BATTLE - MAIN GAME LOOP, BATTLE ORCHESTRATOR & BOOTSTRAP (js/main.js)
 * - Khởi động AssetLoader kèm thanh tiến trình % thực tế
 * - Vòng lặp chiến đấu 60-120 FPS với Sub-stepping chống xuyên địa hình ở tốc độ x4
 * - Triển khai quân từ Deck 5/6 ô, Cờ tập kết Rally Flag, Phím tắt Q-W-E-R & 1..6
 * - Tổng kết chiến thắng, tính sao (1-3 ★), thưởng tài nguyên & mở khóa ải kế tiếp
 * ============================================================================
 */

'use strict';

let battleCanvas = null;
let battleCtx = null;
let currentNavGrid = null;
let battleRafId = null;
let lastBattleFrameTime = 0;

/* --------------------------------------------------------------------------
 * 1. ĐIỀU CHỈNH KÍCH THƯỚC CANVAS CHIẾN TRƯỜNG CHUẨN RETINA / DPR
 * -------------------------------------------------------------------------- */
function resizeBattleCanvas() {
  if (!battleCanvas) battleCanvas = document.getElementById('battleCanvas');
  if (!battleCanvas) return { width: 420, height: 760 };

  const parent = battleCanvas.parentElement || document.getElementById('game-viewport');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const logicalW = (parent && parent.clientWidth) || 420;
  const logicalH = (parent && parent.clientHeight) || 760;

  battleCanvas.width = Math.round(logicalW * dpr);
  battleCanvas.height = Math.round(logicalH * dpr);

  battleCtx = battleCanvas.getContext('2d');
  battleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  battleCtx.imageSmoothingEnabled = false;

  return { width: logicalW, height: logicalH };
}

/* --------------------------------------------------------------------------
 * 2. BẮT ĐẦU & KẾT THÚC TRẬN ĐẤU (START / STOP / END BATTLE)
 * -------------------------------------------------------------------------- */
function startBattle(mode = 'campaign', stageLevel = 1) {
  const battleScreen = document.getElementById('battle-screen');
  if (battleScreen) battleScreen.classList.remove('hidden');

  const dims = resizeBattleCanvas();
  resetBattleState(mode, stageLevel, dims.width, dims.height);

  // Khởi tạo lưới địa hình 24x40 khớp với bản đồ ải hiện tại (Phần 4)
  currentNavGrid = new TerrainNavGrid(game.stageLevel, dims.width, dims.height);

  // Thiết lập HUD riêng cho từng chế độ chơi
  const modeBadge = document.getElementById('hud-mode-badge');
  if (modeBadge) modeBadge.textContent = mode.toUpperCase();

  const enemyLabel = document.getElementById('hud-enemy-base-label');
  if (enemyLabel) {
    enemyLabel.textContent = mode === 'challenge' ? 'CỔNG XÁC SỐNG' : 'MANSION ĐỎ';
  }

  document.getElementById('raid-boss-hud')?.classList.toggle('hidden', mode !== 'raid');
  document.getElementById('autobattler-hud')?.classList.toggle('hidden', mode !== 'autobattler');

  // Đồng bộ trạng thái nút AUTO & Tốc độ
  game.autoDeploy = mode === 'autobattler';
  syncSpeedAndAutoButtons();
  renderBattleDeckCards();
  updateBattleHUD();

  // Bắt đầu vòng lặp 60-120 FPS
  if (battleRafId) cancelAnimationFrame(battleRafId);
  lastBattleFrameTime = performance.now();

  const frameLoop = (now) => {
    if (!game.active) return;
    const rawDt = Math.min(0.05, Math.max(0.001, (now - lastBattleFrameTime) / 1000));
    lastBattleFrameTime = now;

    if (!game.paused) {
      // Sub-stepping theo speedMult (x1, x2, x4) để giữ độ chính xác va chạm nước/cầu
      const steps = Math.max(1, Math.round(game.speedMult || 1));
      for (let s = 0; s < steps; s++) {
        if (!game.active || game.paused) break;
        updateBattleSimulation(rawDt);
      }
      updateBattleHUD();
    }

    if (battleCtx) {
      BattleRenderer.render(battleCtx);
    }

    battleRafId = requestAnimationFrame(frameLoop);
  };

  battleRafId = requestAnimationFrame(frameLoop);
}

function stopBattleAndReturnLobby() {
  game.active = false;
  game.paused = false;
  if (battleRafId) {
    cancelAnimationFrame(battleRafId);
    battleRafId = null;
  }

  closeModal('modal-pause');
  closeModal('modal-battle-result');
  closeModal('modal-roguelike-draft');

  document.getElementById('battle-screen')?.classList.add('hidden');

  updateTopResourceBar();
  syncLobbyStageDisplay();
  renderArmyTab();
  renderChallengeStageList();
}

function finishBattle(isVictory) {
  if (!game.active) return;
  game.active = false;
  if (battleRafId) {
    cancelAnimationFrame(battleRafId);
    battleRafId = null;
  }

  const stage = STAGE_CATALOG[clamp(game.stageLevel - 1, 0, STAGE_CATALOG.length - 1)];
  const tree = getSkillTreeBonuses();
  const rewards = {};
  let stars = 0;

  if (isVictory) {
    // Tính số sao dựa trên tỷ lệ máu còn lại của Mansion Xanh
    const hpRatio = game.playerHp / Math.max(1, game.playerMaxHp);
    stars = hpRatio >= 0.75 ? 3 : (hpRatio >= 0.35 ? 2 : 1);

    const coinReward = Math.round(stage.rewardCoins * (1 + tree.coinRewardPct));
    const gemReward = Math.round(
      (game.mode === 'challenge' ? stage.rewardGems + 25 : stage.rewardGems) * (1 + tree.gemRewardPct)
    );
    const pearlReward = stage.rewardPearls + (game.mode === 'challenge' ? 1 : 0);
    const medalReward = game.mode === 'raid' || game.mode === 'bossrush' ? 3 : 1;

    rewards.coins = coinReward;
    rewards.gems = gemReward;
    if (pearlReward > 0) rewards.pearls = pearlReward;
    rewards.medals = medalReward;

    addCurrency('coins', coinReward);
    addCurrency('gems', gemReward);
    if (pearlReward > 0) addCurrency('pearls', pearlReward);
    addCurrency('medals', medalReward);

    // Cập nhật tiến độ sao, mở khóa màn kế tiếp & kinh nghiệm Chỉ Huy
    const prevStars = Number(metaState.stageStars[stage.level]) || 0;
    if (stars > prevStars) {
      metaState.stageStars[stage.level] = stars;
    }

    if (game.mode === 'challenge') {
      metaState.challengeCleared[stage.level] = true;
    } else if (stage.level >= metaState.maxUnlockedStage && stage.level < 54) {
      metaState.maxUnlockedStage = stage.level + 1;
      metaState.selectedStage = stage.level + 1;
    }

    metaState.stats.totalWins = (metaState.stats.totalWins || 0) + 1;
    metaState.playerExp += 40 + stage.level * 10;
    while (metaState.playerExp >= metaState.playerLevel * 120) {
      metaState.playerExp -= metaState.playerLevel * 120;
      metaState.playerLevel += 1;
    }
    SoundFX.coin();
  } else {
    // Thưởng an ủi 25% Vàng khi thất bại
    const consolationCoins = Math.round(stage.rewardCoins * 0.25);
    rewards.coins = consolationCoins;
    addCurrency('coins', consolationCoins);
  }

  saveProgress();
  showBattleResultModal(isVictory, stars, rewards);
}

/* --------------------------------------------------------------------------
 * 3. CẬP NHẬT LOGIC MÔ PHỎNG TRẬN ĐẤU (SIMULATION STEP)
 * -------------------------------------------------------------------------- */
function updateBattleSimulation(dt) {
  const tree = getSkillTreeBonuses();
  game.elapsedTime += dt;

  // Kiểm tra giới hạn thời gian ở chế độ Time Attack (90s)
  if (game.timeLimit > 0 && game.elapsedTime >= game.timeLimit) {
    finishBattle(false);
    return;
  }

  // 1. Hồi năng lượng Xăng triển khai quân
  const totalGasRate = game.gasIncomePerSec * (1 + game.roguelikeBuffs.gasRegenPct);
  game.gas = Math.min(game.maxGas, game.gas + totalGasRate * dt);

  // 2. Tái tạo Lớp Giáp Ảo Pháo Đài mỗi 20 giây (Tối thượng Nhánh 1)
  if (game.playerMaxShield > 0) {
    game.shieldRegenTimer -= dt;
    if (game.shieldRegenTimer <= 0) {
      game.shieldRegenTimer = 20;
      game.playerShield = game.playerMaxShield;
      spawnFloatingCombatText(
        game.blueMansion.centerX,
        game.blueMansion.centerY - 38,
        `🛡️ +${game.playerMaxShield} Giáp Pháo Đài!`,
        '#38BDF8',
        true
      );
    }
  }

  // 3. Giảm thời gian hồi chiêu kỹ năng Q-W-E-R, Blitzkrieg, Rally Point & Deck
  if (game.blitzTimer > 0) {
    game.blitzTimer = Math.max(0, game.blitzTimer - dt);
  }
  if (game.rallyPoint && game.rallyPoint.ttl > 0) {
    game.rallyPoint.ttl = Math.max(0, game.rallyPoint.ttl - dt);
  }

  ['Q', 'W', 'E', 'R'].forEach((k) => {
    if (game.skillCooldowns[k] > 0) {
      game.skillCooldowns[k] = Math.max(0, game.skillCooldowns[k] - dt);
    }
  });

  for (let i = 0; i < game.deckCooldowns.length; i++) {
    if (game.deckCooldowns[i] > 0) {
      game.deckCooldowns[i] = Math.max(0, game.deckCooldowns[i] - dt);
    }
  }

  // 4. Tự động triển khai quân nếu bật chế độ AUTO hoặc Auto-Battler
  if (game.autoDeploy) {
    runAutoDeployAI();
  }

  // 5. Sinh đợt quái hỗn hợp (Binh chủng Phe Đỏ + Zombie + Boss)
  WaveSpawner.update(dt, currentNavGrid);

  // 6. Cập nhật Ụ Pháo xoay 360° trên nóc Mansion Xanh
  updateMountedTurret(dt);

  // 7. Cập nhật toàn bộ Quân đồng minh & Kẻ địch
  for (let i = 0; i < game.units.length; i++) {
    game.units[i].update(dt, currentNavGrid);
  }
  for (let i = 0; i < game.enemies.length; i++) {
    game.enemies[i].update(dt, currentNavGrid);
  }

  // 8. Cập nhật đạn pháo, mìn mặt đất, hạt nổ & chữ sát thương nổi
  updateProjectiles(dt);
  updateBattleProps(dt);
  particlePool.update(dt);

  for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
    const ft = game.floatingTexts[i];
    ft.life += dt;
    ft.y += ft.vy * dt;
    if (ft.life >= ft.maxLife) {
      game.floatingTexts.splice(i, 1);
    }
  }

  // Dọn dẹp thực thể đã bị tiêu diệt khỏi mảng
  game.units = game.units.filter((u) => !u.dead);
  game.enemies = game.enemies.filter((e) => !e.dead);
  game.projectiles = game.projectiles.filter((p) => !p.dead);
  game.props = game.props.filter((pr) => !pr.dead);

  // 9. Kiểm tra điều kiện Thắng / Thua
  if (game.playerHp <= 0) {
    finishBattle(false);
    return;
  }

  if (game.enemyHp <= 0) {
    finishBattle(true);
    return;
  }

  // Ở Challenge Mode: Thắng khi đánh bại toàn bộ 20 Waves Zombie
  if (
    game.mode === 'challenge' &&
    game.wave > game.maxWaves &&
    game.spawnQueue.length === 0 &&
    game.enemies.length === 0
  ) {
    finishBattle(true);
  }
}

/* --------------------------------------------------------------------------
 * 4. TRIỂN KHAI QUÂN TỪ DECK (5 Ô BATTLE / 6 Ô CHALLENGE) & AUTO AI
 * -------------------------------------------------------------------------- */
function getActiveBattleDeck() {
  return game.mode === 'challenge' ? metaState.challengeDeck : metaState.battleDeck;
}

function deployUnitFromDeck(slotIndex) {
  if (!game.active || game.paused) return false;
  const deck = getActiveBattleDeck();
  const unitId = deck[slotIndex];
  if (!unitId) return false;

  if ((game.deckCooldowns[slotIndex] || 0) > 0) return false;

  const stats = getEffectiveUnitStats(unitId, 'blue');
  if (!stats) return false;

  if (game.gas < stats.cost) {
    spawnFloatingCombatText(game.blueMansion.centerX, game.blueMansion.top - 10, 'Thiếu Xăng!', '#FB7185', false);
    return false;
  }

  game.gas -= stats.cost;
  game.deckCooldowns[slotIndex] = stats.cooldown;

  // Điểm xuất phát ngay trước cửa Mansion Xanh
  const baseX = game.blueMansion ? game.blueMansion.centerX : game.mapWidth * 0.5;
  const baseY = game.blueMansion ? game.blueMansion.top - 12 : game.mapHeight - 145;
  let spawnX = clamp(baseX + (Math.random() - 0.5) * 76, 26, game.mapWidth - 26);
  let spawnY = baseY;

  if (currentNavGrid && stats.movementType === 'ground' && !currentNavGrid.isWalkableAt(spawnX, spawnY, 'ground')) {
    spawnX = baseX;
  }

  game.units.push(new Combatant({ ...stats, side: 'blue', x: spawnX, y: spawnY }));
  metaState.stats.totalSummons = (metaState.stats.totalSummons || 0) + 1;
  particlePool.spawnHitSpark(spawnX, spawnY, '#4ADE80');

  return true;
}

function runAutoDeployAI() {
  const deck = getActiveBattleDeck();
  for (let i = 0; i < deck.length; i++) {
    if (!deck[i] || game.deckCooldowns[i] > 0) continue;
    const stats = getEffectiveUnitStats(deck[i], 'blue');
    if (stats && game.gas >= stats.cost) {
      deployUnitFromDeck(i);
      break;
    }
  }
}

function upgradeInBattleGasGenerator() {
  if (!game.active || game.paused) return;
  if (game.gas < game.gasUpgCost) {
    spawnFloatingCombatText(game.mapWidth - 80, game.mapHeight - 125, 'Không đủ Xăng!', '#FB7185', false);
    return;
  }
  game.gas -= game.gasUpgCost;
  game.gasUpgLevel += 1;
  game.maxGas += 30;
  game.gasIncomePerSec += 3.5;
  game.gasUpgCost = Math.round(game.gasUpgCost * 1.45);
  SoundFX.coin();
}

/* --------------------------------------------------------------------------
 * 5. CẬP NHẬT GIAO DIỆN TRONG TRẬN (IN-BATTLE HUD & DECK CARDS)
 * -------------------------------------------------------------------------- */
function renderBattleDeckCards() {
  const container = document.getElementById('battle-deck-slots');
  if (!container) return;

  const deck = getActiveBattleDeck();
  const fuelIcon = AssetLoader.getUIIconURL('icon_fuel');

  container.innerHTML = deck
    .map((unitId, idx) => {
      if (!unitId) {
        return `<div class="battle-deck-card insufficient" style="opacity:0.35;"><span class="text-secondary" style="font-size:10px;">Trống</span></div>`;
      }
      const spec = UNIT_CATALOG.find((u) => u.id === unitId);
      const uState = metaState.units[unitId] || { level: 1 };
      const eff = getEffectiveUnitStats(unitId, 'blue');
      const avatarUrl = spec ? AssetLoader.getAvatarDataURL(spec.spriteKey) : '';

      return `
        <button class="battle-deck-card" id="battle-deck-btn-${idx}" data-deploy-slot="${idx}">
          <span class="deck-card-lv">Lv.${uState.level}</span>
          <img src="${avatarUrl}" alt="${spec ? spec.name : ''}" />
          <span class="deck-card-cost"><img class="ui-icon-xs" src="${fuelIcon}" alt="" style="width:11px;height:11px;" />${eff.cost}</span>
          <div id="battle-deck-cd-${idx}" class="deck-card-cd-mask hidden">0.0s</div>
        </button>
      `;
    })
    .join('');

  container.querySelectorAll('[data-deploy-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slot = Number(btn.getAttribute('data-deploy-slot'));
      deployUnitFromDeck(slot);
    });
  });
}

function updateBattleHUD() {
  // 1. Máu Mansion Đỏ
  const enemyHpText = document.getElementById('hud-enemy-hp-text');
  const enemyHpFill = document.getElementById('hud-enemy-hp-fill');
  if (enemyHpText) {
    enemyHpText.textContent = `${formatCompactNumber(game.enemyHp)} / ${formatCompactNumber(game.enemyMaxHp)}`;
  }
  if (enemyHpFill) {
    enemyHpFill.style.width = `${clamp((game.enemyHp / Math.max(1, game.enemyMaxHp)) * 100, 0, 100)}%`;
  }

  // 2. Máu Mansion Xanh + Lớp Giáp Ảo Pháo Đài
  const playerHpText = document.getElementById('hud-player-hp-text');
  const playerHpFill = document.getElementById('hud-player-hp-fill');
  const shieldText = document.getElementById('hud-player-shield-text');
  if (playerHpText) {
    playerHpText.textContent = `${formatCompactNumber(game.playerHp)} / ${formatCompactNumber(game.playerMaxHp)}`;
  }
  if (playerHpFill) {
    playerHpFill.style.width = `${clamp((game.playerHp / Math.max(1, game.playerMaxHp)) * 100, 0, 100)}%`;
  }
  if (shieldText) {
    if (game.playerShield > 0) {
      shieldText.textContent = `[+${formatCompactNumber(game.playerShield)} Giáp] `;
      shieldText.classList.remove('hidden');
    } else {
      shieldText.classList.add('hidden');
    }
  }

  // 3. Wave & Đồng hồ trận đấu
  const waveEl = document.getElementById('hud-wave-text');
  const timerEl = document.getElementById('hud-timer-text');
  if (waveEl) {
    const shownWave = Math.min(game.wave, game.maxWaves);
    waveEl.textContent = game.mode === 'endless' ? `WAVE ${shownWave}` : `WAVE ${shownWave}/${game.maxWaves}`;
  }
  if (timerEl) {
    const tSec = game.timeLimit > 0 ? Math.max(0, Math.ceil(game.timeLimit - game.elapsedTime)) : Math.floor(game.elapsedTime);
    const mm = String(Math.floor(tSec / 60)).padStart(2, '0');
    const ss = String(tSec % 60).padStart(2, '0');
    timerEl.textContent = `${mm}:${ss}`;
  }

  // 4. Thanh EXP & Nút Level Up Roguelike
  const lvEl = document.getElementById('hud-battle-lv');
  const expFill = document.getElementById('hud-exp-fill');
  const lvUpBtn = document.getElementById('btn-in-battle-levelup');
  const lvUpCnt = document.getElementById('levelup-pending-count');

  if (lvEl) lvEl.textContent = `LV.${game.battleLv}`;
  if (expFill) expFill.style.width = `${clamp((game.battleExp / Math.max(1, game.nextLvExp)) * 100, 0, 100)}%`;
  if (lvUpBtn && lvUpCnt) {
    lvUpCnt.textContent = `+${game.pendingLevelUps}`;
    lvUpBtn.classList.toggle('hidden', game.pendingLevelUps <= 0);
  }

  // 5. Thanh máu Raid Boss (nếu đang ở chế độ Raid)
  if (game.mode === 'raid') {
    const boss = game.enemies.find((e) => e.isBoss && !e.dead);
    const rFill = document.getElementById('raid-boss-hp-fill');
    const rName = document.getElementById('raid-boss-name');
    if (boss && rFill && rName) {
      rName.textContent = boss.name.toUpperCase();
      rFill.style.width = `${clamp((boss.hp / Math.max(1, boss.maxHp)) * 100, 0, 100)}%`;
    }
  }

  // 6. Hồi chiêu 4 Kỹ Năng Chỉ Huy Q-W-E-R
  const tree = getSkillTreeBonuses();
  const cdRed = clamp(tree.skillCdRedPct, 0, 0.55);
  ['Q', 'W', 'E', 'R'].forEach((k) => {
    const spec = COMMANDER_SKILLS[k];
    const maxCd = Math.max(0.5, spec.cooldown * (1 - cdRed));
    const rem = game.skillCooldowns[k] || 0;
    const pct = clamp((rem / maxCd) * 100, 0, 100);
    const mask = document.getElementById(`skill-cd-${k}`);
    const btn = document.getElementById(`skill-btn-${k}`);
    if (mask) mask.style.setProperty('--cd-pct', `${pct.toFixed(1)}%`);
    if (btn) btn.disabled = rem > 0;
  });

  // 7. Thanh Xăng & 5 vạch phân đoạn
  const gasVal = document.getElementById('hud-gas-value');
  const gasMax = document.getElementById('hud-gas-max');
  const gasCost = document.getElementById('hud-gas-upg-cost');
  const gasBtn = document.getElementById('btn-upgrade-gas');

  if (gasVal) gasVal.textContent = Math.floor(game.gas);
  if (gasMax) gasMax.textContent = game.maxGas;
  if (gasCost) gasCost.textContent = game.gasUpgCost;
  if (gasBtn) gasBtn.disabled = game.gas < game.gasUpgCost;

  const filledSegs = Math.round((game.gas / Math.max(1, game.maxGas)) * 5);
  for (let s = 0; s < 5; s++) {
    const segEl = document.getElementById(`gas-seg-${s}`);
    if (segEl) segEl.classList.toggle('filled', s < filledSegs);
  }

  // 8. Trạng thái từng thẻ bài trên Deck
  const deck = getActiveBattleDeck();
  for (let i = 0; i < deck.length; i++) {
    const uid = deck[i];
    if (!uid) continue;
    const btn = document.getElementById(`battle-deck-btn-${i}`);
    const cdMask = document.getElementById(`battle-deck-cd-${i}`);
    if (!btn || !cdMask) continue;

    const eff = getEffectiveUnitStats(uid, 'blue');
    const remCd = game.deckCooldowns[i] || 0;
    const canBuy = game.gas >= (eff ? eff.cost : 999);

    btn.classList.toggle('ready', remCd <= 0 && canBuy);
    btn.classList.toggle('insufficient', !canBuy && remCd <= 0);

    if (remCd > 0) {
      cdMask.classList.remove('hidden');
      cdMask.textContent = `${remCd.toFixed(1)}s`;
    } else {
      cdMask.classList.add('hidden');
    }
  }
}

function syncSpeedAndAutoButtons() {
  document.getElementById('btn-toggle-auto')?.classList.toggle('active', game.autoDeploy);
  [1, 2, 4].forEach((spd) => {
    document.getElementById(`btn-speed-${spd}x`)?.classList.toggle('active', game.speedMult === spd);
  });
}

/* --------------------------------------------------------------------------
 * 6. GẮN SỰ KIỆN ĐIỀU KHIỂN TRONG TRẬN & KHỞI ĐỘNG TOÀN HỆ THỐNG
 * -------------------------------------------------------------------------- */
function bindBattleControls() {
  // Nút AUTO & Tốc độ x1 / x2 / x4
  document.getElementById('btn-toggle-auto')?.addEventListener('click', () => {
    game.autoDeploy = !game.autoDeploy;
    syncSpeedAndAutoButtons();
  });

  [1, 2, 4].forEach((spd) => {
    document.getElementById(`btn-speed-${spd}x`)?.addEventListener('click', () => {
      game.speedMult = spd;
      syncSpeedAndAutoButtons();
    });
  });

  // Tạm dừng, Chơi lại & Về Sảnh
  document.getElementById('btn-pause-battle')?.addEventListener('click', () => {
    if (!game.active) return;
    game.paused = true;
    openModal('modal-pause');
  });

  document.getElementById('btn-resume-battle')?.addEventListener('click', () => {
    closeModal('modal-pause');
    game.paused = false;
    lastBattleFrameTime = performance.now();
  });

  document.getElementById('btn-restart-battle')?.addEventListener('click', () => {
    closeModal('modal-pause');
    startBattle(game.mode, game.stageLevel);
  });

  document.getElementById('btn-quit-battle')?.addEventListener('click', () => {
    stopBattleAndReturnLobby();
  });

  document.getElementById('btn-result-lobby')?.addEventListener('click', () => {
    stopBattleAndReturnLobby();
  });

  document.getElementById('btn-result-next')?.addEventListener('click', () => {
    closeModal('modal-battle-result');
    const nextLv = Math.min(54, game.stageLevel + 1);
    metaState.selectedStage = nextLv;
    saveProgress();
    launchBattleWithCloudDive(game.mode, nextLv);
  });

  // Nút thăng cấp Roguelike trong trận
  document.getElementById('btn-in-battle-levelup')?.addEventListener('click', () => {
    openRoguelikeDraftModal();
  });

  // Nút nâng cấp Xăng & 4 nút kỹ năng Q-W-E-R
  document.getElementById('btn-upgrade-gas')?.addEventListener('click', upgradeInBattleGasGenerator);

  ['Q', 'W', 'E', 'R'].forEach((k) => {
    document.getElementById(`skill-btn-${k}`)?.addEventListener('click', () => {
      activateCommanderSkill(k);
    });
  });

  // Chạm lên sân chiến đấu để đặt Cờ Tập Kết (Rally Flag) điều hướng quân qua cầu
  const canvasEl = document.getElementById('battleCanvas');
  canvasEl?.addEventListener('pointerdown', (e) => {
    if (!game.active || game.paused) return;
    const rect = canvasEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (currentNavGrid && !currentNavGrid.isWalkableAt(clickX, clickY, 'ground')) {
      spawnFloatingCombatText(clickX, clickY, 'Không thể cắm cờ dưới nước!', '#FB7185', false);
      return;
    }

    game.rallyPoint = { x: clickX, y: clickY, ttl: 8.0 };
    particlePool.spawnHitSpark(clickX, clickY, '#38BDF8');
  });

  // Phím tắt bàn phím PC (Q-W-E-R cho kỹ năng, 1-6 cho thẻ bài, Space/Esc tạm dừng)
  window.addEventListener('keydown', (e) => {
    if (!game.active) return;
    const key = e.key.toUpperCase();

    if (key === 'Q' || key === 'W' || key === 'E' || key === 'R') {
      activateCommanderSkill(key);
    } else if (key >= '1' && key <= '6') {
      deployUnitFromDeck(Number(key) - 1);
    } else if (e.key === 'Escape') {
      if (game.paused) {
        closeModal('modal-pause');
        game.paused = false;
        lastBattleFrameTime = performance.now();
      } else {
        game.paused = true;
        openModal('modal-pause');
      }
    }
  });
}

/* --------------------------------------------------------------------------
 * 7. KHỞI ĐỘNG TOÀN BỘ HỆ THỐNG KHI TẢI XONG DOM (BOOTSTRAP)
 * -------------------------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', async () => {
  loadProgress();

  const statusText = document.getElementById('loading-status-text');
  const progressFill = document.getElementById('loading-progress-fill');
  const detailText = document.getElementById('loading-asset-detail');
  const pctText = document.getElementById('loading-progress-pct');

  // Nạp và xử lý tách nền chroma-key + cắt lưới 2x2 toàn bộ 112 assets
  await AssetLoader.loadAll((loaded, total, currentName) => {
    const pct = Math.round((loaded / Math.max(1, total)) * 100);
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (pctText) pctText.textContent = `${pct}%`;
    if (detailText) detailText.textContent = `${loaded} / ${total} Assets`;
    if (statusText) statusText.textContent = `Đang xử lý Pixel-Art: ${currentName}...`;
  });

  if (statusText) statusText.textContent = 'Hoàn tất nạp tài nguyên! Đang vào Sảnh Chỉ Huy...';

  // Khởi tạo giao diện Sảnh, Bản đồ Thế giới 54 ải & Điều khiển chiến đấu
  WorldRoadmapController.init();
  initLobbyUI();
  bindBattleControls();

  // Ẩn màn hình Loading mượt mà
  setTimeout(() => {
    const loadingScreen = document.getElementById('asset-loading-screen');
    if (loadingScreen) loadingScreen.classList.add('fade-out');
  }, 260);
});