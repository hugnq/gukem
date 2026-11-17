/* ============================================================================
   TINY BATTLE - MAIN ENTRY, RENDER LOOP, DRAG-DROP, RALLY FLAG & 3S RELOCATE (js/main.js)
   100% Procedural Canvas 2D (Zero External Images) • 60-120 FPS Fixed-Timestep
   Battle: Drag-and-Drop + Blue Rally Flag Deployment
   Challenge: Full-Map 7x11 Grid + 3.0s Long-Press Ring to Relocate Any Tower
   Left-Side Floating LEVEL UP (+N) Button • 4 Ancient Skill Tree Keystones
   ============================================================================ */

import {
    LOGICAL_WIDTH,
    LOGICAL_HEIGHT,
    PLAYFIELD_HEIGHT,
    MAX_WAVES,
    CHALLENGE_MAX_WAVES,
    CHALLENGE_DECK_SLOTS,
    CHALLENGE_RELOCATE_HOLD_SEC,
    TD_GRID_COLS,
    TD_CELL_SIZE,
    TD_GRID_TOP_Y,
    TD_GRID_ROWS,
    BATTLE_SPEED_MULTIPLIERS,
    GAS_UPGRADE_LEVELS,
    DIFFICULTY_CONFIG,
    calcStageRewardCoins,
    calcChallengeRewards,
    UNIT_CATALOG,
    UNIT_BY_ID,
    ZOMBIE_CATALOG,
    LEVELS
} from './config.js';

import { triggerHaptic } from './math.js';
import {
    metaState,
    PRIMARY_INFANTRY_ID,
    normalizeUnitId,
    loadProgress,
    saveProgress,
    hasUnitInInventory,
    getAncientSkillTreeBonuses
} from './state.js';

import {
    sfx,
    mapBufferCache,
    projCache,
    particlePool,
    drawUnitArt,
    drawBaseTurretArt,
    getUnitSpriteDataURL,
    drawRoundRectPath,
    populateProceduralUIIcons
} from './engine-core.js';

import { nav, renderMap, buildStaticMapCanvas, drawDynamicSineWater } from './map-nav.js';

import {
    game,
    getTdGridCellFromPixel,
    getTdCellCenterPixel,
    canPlaceTowerAtCell,
    placeTowerInChallengeGrid,
    relocateTowerToCell,
    spendMatchGas,
    refreshEternalShields,
    addScreenShake,
    spawnShockwave,
    spawnFloatingText,
    spawnExplosionFX,
    updateBaseHpHUD,
    updateActiveSynergies,
    getEffectiveUnitStats,
    updateBaseTurret,
    triggerMeteorStormSkill,
    damageBase,
    spawnUnit,
    spawnZombie,
    launchAirstrike,
    updateFloatingLevelUpButtonUI,
    grantBattleExp,
    openBattleLevelUpChain,
    updateCommanderSkillsUI,
    triggerCommanderSkill,
    showBossWarningBanner,
    initRaidBoss,
    updateRaidBossHUD,
    updateRaidBoss,
    drawRaidBoss,
    renderFogOfWarOverlay,
    triggerRoguelikeMutationDraft,
    setOnEndBattleHandler,
    setOnDeckChangedHandler
} from './entities.js';

import {
    openLobbyScreen,
    bindLobbyEvents,
    updateLobbyTopBar,
    renderChallengeRoadmap,
    renderSkillTreeTab
} from './lobby-ui.js';

const canvas = document.getElementById('battleCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// ============================================================================
// 1. CHUYỂN ĐỔI TỌA ĐỘ CON TRỎ SANG HỆ TỌA ĐỘ LOGIC 420x840
// ============================================================================
function clientToLogicalCoords(clientX, clientY) {
    if (!canvas) return { x: LOGICAL_WIDTH / 2, y: PLAYFIELD_HEIGHT / 2 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = LOGICAL_WIDTH / Math.max(1, rect.width);
    const scaleY = LOGICAL_HEIGHT / Math.max(1, rect.height);
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

// ============================================================================
// 2. XÂY DỰNG THANH DECK ĐÁY (5 Ô BATTLE / 6 Ô CHALLENGE) & KÉO-THẢ ĐẶT QUÂN
// ============================================================================
export function renderBattleDeckSlots() {
    const container = document.getElementById('unitDeckContainer');
    if (!container) return;

    const isChallenge = game.battleMode === 'challenge';
    const slotCount = isChallenge ? CHALLENGE_DECK_SLOTS : 5;

    container.classList.toggle('challenge-6-slots', isChallenge);
    container.innerHTML = '';

    for (let i = 0; i < slotCount; i++) {
        const unitId = game.deckIds[i];
        const btn = document.createElement('div');
        btn.dataset.slotIdx = String(i);

        if (!unitId) {
            btn.className = 'unit-btn empty-slot-btn';
            btn.innerHTML = `
                <span class="hotkey-badge">${i + 1}</span>
                <span style="font-size:16px; opacity:0.35;">➕</span>
                <span style="font-size:7.5px; color:#64748b; font-weight:800;">TRỐNG</span>
            `;
            container.appendChild(btn);
            continue;
        }

        const sp = getEffectiveUnitStats(unitId, 'blue');
        const spriteUrl = getUnitSpriteDataURL(sp, 'blue');
        const stars = game.battleUnitStars[sp.id] || 1;

        btn.className = `unit-btn ${sp.isNaval ? 'naval-btn' : ''}`;
        btn.id = `deck-slot-btn-${i}`;
        btn.innerHTML = `
            <span class="hotkey-badge">${i + 1}</span>
            <span class="unit-lv-badge">★${stars}</span>
            <div class="unit-card-art">
                <img src="${spriteUrl}" class="pixel-art" alt="${sp.name}" />
            </div>
            <div class="unit-card-name">${sp.name}</div>
            <div class="cost-badge">
                <span class="unit-cost-val">${sp.cost}</span>
                <span>⛽</span>
            </div>
            <div class="cooldown-radial-overlay" id="deck-cd-overlay-${i}">
                <span class="unit-cd-timer" id="deck-cd-text-${i}"></span>
            </div>
            <div class="cooldown-bar-track">
                <div class="cooldown-bar-fill" id="deck-cd-bar-${i}"></div>
            </div>
        `;

        // Hỗ trợ cả Bấm nhanh (Quick Tap) lẫn Kéo-Thả (Drag & Drop) trực tiếp lên sân
        let pointerStartX = 0;
        let pointerStartY = 0;
        let isDraggingCard = false;

        btn.addEventListener('pointerdown', e => {
            if (!game.running || game.paused || game.gameOver) return;
            pointerStartX = e.clientX;
            pointerStartY = e.clientY;
            isDraggingCard = false;

            if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') {
                game.autoSelectedSlotIdx = i;
                game.autoSelectedUnitId = unitId;
                document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('ab-selected-slot'));
                btn.classList.add('ab-selected-slot');
                sfx.play('gas');
                return;
            }

            if (unitId === 'airstrike') return;

            const onPointerMove = moveEv => {
                const dist = Math.hypot(moveEv.clientX - pointerStartX, moveEv.clientY - pointerStartY);
                if (dist > 10 && !isDraggingCard) {
                    isDraggingCard = true;
                    game.dragDeploy.active = true;
                    game.dragDeploy.slotIdx = i;
                    game.dragDeploy.unitId = unitId;
                }
                if (isDraggingCard) {
                    const pt = clientToLogicalCoords(moveEv.clientX, moveEv.clientY);
                    game.dragDeploy.x = pt.x;
                    game.dragDeploy.y = pt.y;

                    if (isChallenge) {
                        const cell = getTdGridCellFromPixel(pt.x, pt.y);
                        if (cell) {
                            game.dragDeploy.gridCol = cell.col;
                            game.dragDeploy.gridRow = cell.row;
                            game.dragDeploy.isValid = canPlaceTowerAtCell(sp, cell.col, cell.row);
                        } else {
                            game.dragDeploy.gridCol = -1;
                            game.dragDeploy.gridRow = -1;
                            game.dragDeploy.isValid = false;
                        }
                    } else {
                        game.dragDeploy.isValid = nav.isValidBattleDeployPoint(sp, pt.x, pt.y);
                    }
                }
            };

            const onPointerUp = upEv => {
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);

                if (isDraggingCard) {
                    const pt = clientToLogicalCoords(upEv.clientX, upEv.clientY);
                    if (isChallenge) {
                        const cell = getTdGridCellFromPixel(pt.x, pt.y);
                        if (cell && canPlaceTowerAtCell(sp, cell.col, cell.row)) {
                            deployDeckSlot(i, null, null, cell.col, cell.row);
                        } else {
                            sfx.play('cannon');
                        }
                    } else if (nav.isValidBattleDeployPoint(sp, pt.x, pt.y)) {
                        deployDeckSlot(i, pt.x, pt.y);
                    } else {
                        sfx.play('cannon');
                    }
                    game.dragDeploy.active = false;
                    game.dragDeploy.slotIdx = -1;
                    game.dragDeploy.unitId = null;
                } else {
                    // Bấm nhanh (Quick Tap): triển khai tại Cờ Tập Kết (Battle) hoặc ô trống đầu tiên (Challenge)
                    deployDeckSlot(i);
                }
            };

            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
        });

        container.appendChild(btn);
    }
}

// ============================================================================
// 3. TRIỂN KHAI ĐƠN VỊ TỪ DECK (RALLY POINT / DRAG-DROP / CHALLENGE 7x11)
// ============================================================================
export function deployDeckSlot(slotIdx, targetX = null, targetY = null, tdCol = -1, tdRow = -1) {
    if (!game.running || game.paused || game.gameOver) return;
    const unitId = game.deckIds[slotIdx];
    if (!unitId) return;

    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') {
        game.autoSelectedSlotIdx = slotIdx;
        game.autoSelectedUnitId = unitId;
        document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('ab-selected-slot'));
        document.getElementById(`deck-slot-btn-${slotIdx}`)?.classList.add('ab-selected-slot');
        return;
    }

    if ((game.deckCooldowns[slotIdx] || 0) > 0) {
        sfx.play('cannon');
        return;
    }

    const sp = getEffectiveUnitStats(unitId, 'blue');
    if (game.gas < sp.cost) {
        sfx.play('cannon');
        return;
    }

    // 1. Không kích
    if (unitId === 'airstrike') {
        spendMatchGas(sp.cost);
        game.deckMaxCooldowns[slotIdx] = sp.cooldown;
        game.deckCooldowns[slotIdx] = sp.cooldown;
        const strikeY = targetY ?? PLAYFIELD_HEIGHT * 0.42;
        launchAirstrike('blue', strikeY);
        triggerHaptic(25);
        return;
    }

    // 2. Chế độ CHALLENGE (Full Map 7x11 Tower Defense)
    if (game.battleMode === 'challenge') {
        let col = tdCol;
        let row = tdRow;
        if (col < 0 || row < 0) {
            // Tìm ô trống hợp lệ gần trung tâm nhất khi người chơi bấm nhanh thẻ bài
            let bestDist = Infinity;
            for (let r = 2; r < TD_GRID_ROWS - 1; r++) {
                for (let c = 0; c < TD_GRID_COLS; c++) {
                    if (canPlaceTowerAtCell(sp, c, r)) {
                        const center = getTdCellCenterPixel(c, r);
                        const d = Math.hypot(center.x - LOGICAL_WIDTH / 2, center.y - PLAYFIELD_HEIGHT * 0.55);
                        if (d < bestDist) {
                            bestDist = d;
                            col = c;
                            row = r;
                        }
                    }
                }
            }
        }

        if (col < 0 || row < 0 || !canPlaceTowerAtCell(sp, col, row)) {
            sfx.play('cannon');
            spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT * 0.55, '⚠️ KHÔNG CÓ Ô TRỐNG HỢP LỆ!', '#fb7185', 13);
            return;
        }

        const tower = placeTowerInChallengeGrid(unitId, col, row);
        if (!tower) return;

        // Áp dụng Khiên Phản Chấn Vĩnh Cửu nếu đã mở khóa Mốc 10 Nhánh Pháo Đài
        const treeB = getAncientSkillTreeBonuses();
        if (treeB.eternal_shield) {
            tower.maxShield = Math.round(tower.maxHp * 0.25);
            tower.shield = tower.maxShield;
        }

        spendMatchGas(sp.cost);
        game.deckMaxCooldowns[slotIdx] = sp.cooldown;
        game.deckCooldowns[slotIdx] = sp.cooldown;
        sfx.play('spawn');
        triggerHaptic(20);
        spawnShockwave(tower.x, tower.y, 28, '#38bdf8', 2.5);
        return;
    }

    // 3. Chế độ Battle Bình Thường (Ưu tiên điểm Kéo-Thả -> Cờ Tập Kết -> Sân nhà)
    let spawnX = targetX;
    let spawnY = targetY;
    let exactPref = false;

    if (spawnX !== null && spawnY !== null) {
        exactPref = true;
    } else if (game.rallyPoint.active) {
        spawnX = game.rallyPoint.x + (Math.random() - 0.5) * 14;
        spawnY = game.rallyPoint.y + (Math.random() - 0.5) * 10;
        exactPref = nav.isValidBattleDeployPoint(sp, spawnX, spawnY);
    } else {
        spawnX = LOGICAL_WIDTH / 2 + (Math.random() - 0.5) * 90;
        spawnY = PLAYFIELD_HEIGHT - 120;
    }

    spendMatchGas(sp.cost);
    game.deckMaxCooldowns[slotIdx] = sp.cooldown;
    game.deckCooldowns[slotIdx] = sp.cooldown;
    sfx.play('spawn');
    triggerHaptic(18);

    const u = spawnUnit('blue', unitId, spawnX, spawnY, null, exactPref);
    if (u) {
        spawnShockwave(u.x, u.y, 24, '#38bdf8', 2.2);
    }
}

// ============================================================================
// 4. TƯƠNG TÁC TRÊN SÂN ĐẤU: CẮM CỜ TẬP KẾT (BATTLE) & GIỮ 3.0S ĐỔI VỊ TRÍ TOWER (CHALLENGE)
// ============================================================================
function bindBattleCanvasInteractions() {
    if (!canvas) return;

    canvas.addEventListener('pointerdown', e => {
        if (!game.running || game.paused || game.gameOver) return;
        const pt = clientToLogicalCoords(e.clientX, e.clientY);
        if (pt.y > PLAYFIELD_HEIGHT) return;

        // A. Chế độ Đặt Trận Tự Động (Auto-Battler Prep)
        if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') {
            // Chạm vào đơn vị đã đặt để thu hồi 100% Xăng
            for (let i = game.units.length - 1; i >= 0; i--) {
                const u = game.units[i];
                if (!u.dead && u.team === 'blue' && Math.hypot(u.x - pt.x, u.y - pt.y) <= u.radius + 10) {
                    game.gas += u.spec.cost || 0;
                    game.units.splice(i, 1);
                    sfx.play('gas');
                    document.getElementById('autobattler-fuel-display').textContent = Math.floor(game.gas);
                    return;
                }
            }

            // Đặt đơn vị mới vào nửa sân dưới
            const uId = game.autoSelectedUnitId;
            if (!uId || uId === 'airstrike') return;
            const sp = getEffectiveUnitStats(uId, 'blue');
            if (game.gas < sp.cost) {
                sfx.play('cannon');
                return;
            }
            if (!nav.isValidBattleDeployPoint(sp, pt.x, pt.y)) {
                sfx.play('cannon');
                return;
            }
            game.gas -= sp.cost;
            spawnUnit('blue', uId, pt.x, pt.y, null, true);
            sfx.play('spawn');
            document.getElementById('autobattler-fuel-display').textContent = Math.floor(game.gas);
            return;
        }

        // B. Chế độ CHALLENGE: Nhấn giữ 3.0 giây lên Tower để nhấc và đổi vị trí
        if (game.battleMode === 'challenge') {
            let clickedTower = null;
            for (const u of game.units) {
                if (!u.dead && u.team === 'blue' && u.isTower) {
                    if (Math.hypot(u.x - pt.x, u.y - pt.y) <= 26) {
                        clickedTower = u;
                        break;
                    }
                }
            }

            if (clickedTower) {
                game.towerRelocate.holding = true;
                game.towerRelocate.dragging = false;
                game.towerRelocate.tower = clickedTower;
                game.towerRelocate.holdTime = 0;
                game.towerRelocate.x = pt.x;
                game.towerRelocate.y = pt.y;
                game.towerRelocate.targetCol = clickedTower.tdCol;
                game.towerRelocate.targetRow = clickedTower.tdRow;
                game.towerRelocate.isValid = true;
            }
            return;
        }

        // C. Chế độ Battle Bình Thường: Chạm vào nửa sân dưới để cắm Cờ Tập Kết Xanh (Rally Point)
        if (pt.y >= PLAYFIELD_HEIGHT * 0.48 && pt.y <= PLAYFIELD_HEIGHT - 95) {
            const refUnitId = game.deckIds.find(id => id && id !== 'airstrike') || PRIMARY_INFANTRY_ID;
            const refSpec = getEffectiveUnitStats(refUnitId, 'blue');
            if (nav.isValidBattleDeployPoint(refSpec, pt.x, pt.y)) {
                game.rallyPoint.active = true;
                game.rallyPoint.x = pt.x;
                game.rallyPoint.y = pt.y;
                sfx.play('gas');
                triggerHaptic(12);
                spawnShockwave(pt.x, pt.y, 22, '#4ade80', 2);
            } else {
                sfx.play('cannon');
            }
        }
    });

    window.addEventListener('pointermove', e => {
        const rel = game.towerRelocate;
        if (!rel.holding && !rel.dragging) return;
        const pt = clientToLogicalCoords(e.clientX, e.clientY);

        if (rel.holding && !rel.dragging) {
            // Nếu kéo ngón tay đi xa quá 24px trước khi đủ 3.0s thì hủy đếm giữ
            if (Math.hypot(pt.x - rel.x, pt.y - rel.y) > 24) {
                rel.holding = false;
                rel.tower = null;
                rel.holdTime = 0;
            }
            return;
        }

        if (rel.dragging && rel.tower) {
            rel.x = pt.x;
            rel.y = pt.y;
            const cell = getTdGridCellFromPixel(pt.x, pt.y);
            if (cell) {
                rel.targetCol = cell.col;
                rel.targetRow = cell.row;
                rel.isValid = canPlaceTowerAtCell(rel.tower.spec, cell.col, cell.row, rel.tower);
            } else {
                rel.targetCol = -1;
                rel.targetRow = -1;
                rel.isValid = false;
            }
        }
    });

    const finishTowerRelocate = () => {
        const rel = game.towerRelocate;
        if (rel.dragging && rel.tower) {
            if (rel.isValid && rel.targetCol >= 0 && rel.targetRow >= 0) {
                if (relocateTowerToCell(rel.tower, rel.targetCol, rel.targetRow)) {
                    sfx.play('upgrade');
                    triggerHaptic(25);
                    spawnShockwave(rel.tower.x, rel.tower.y, 32, '#fde047', 3);
                    spawnFloatingText(rel.tower.x, rel.tower.y - 18, '🔄 ĐÃ ĐỔI VỊ TRÍ!', '#fde047', 12);
                }
            } else {
                sfx.play('cannon');
            }
        }
        rel.holding = false;
        rel.dragging = false;
        rel.tower = null;
        rel.holdTime = 0;
    };

    window.addEventListener('pointerup', finishTowerRelocate);
    window.addEventListener('pointercancel', finishTowerRelocate);
}

// ============================================================================
// 5. KHỞI TẠO TRẬN ĐẤU (START LEVEL & CHALLENGE)
// ============================================================================
export function startLevel(levelNum = 1, diffId = 'easy', modeId = 'destroy') {
    const lv = Math.max(1, Math.min(LEVELS.length, Number(levelNum) || 1));
    const mapCfg = LEVELS[lv - 1] || LEVELS[0];
    const diffCfg = DIFFICULTY_CONFIG[diffId] || DIFFICULTY_CONFIG.easy;

    game.running = true;
    game.paused = false;
    game.gameOver = false;
    game.currentLevel = lv;
    game.difficulty = diffId;
    game.battleMode = modeId;
    game.timeSec = 0;
    game.matchKills = 0;
    game.matchSpawns = 0;

    // Tổng hợp chỉ số cộng thêm từ Talents & Cây Kỹ Năng Cổ Thụ 4 Nhánh
    const treeB = getAncientSkillTreeBonuses();
    const logiLv = Number(metaState?.metaTalents?.optimal_logistics) || 0;
    const bastionLv = Number(metaState?.metaTalents?.immortal_bastion) || 0;

    // Giới hạn Xăng tối đa: 20 + Bình Chứa Mở Rộng + Lò Phản Ứng Vô Cực (30)
    game.maxGas = Math.max(20 + (treeB.maxGasFlat || 0), treeB.infinite_reactor ? 30 : 20);
    game.gas = Math.min(
        game.maxGas,
        (mapCfg.startingGas || 6) + Math.floor(logiLv / 2) + (treeB.startGasFlat || 0)
    );
    game.gasGenLevel = 0;
    game.gasTimer = 0;
    game.gasSpentAccumulator = 0;

    // Hệ thống Cấp Độ Trận & Nút Nổi LEVEL UP (+N)
    game.battleLv = 1;
    game.battleExp = 0;
    game.battleNextExp = 35;
    game.pendingLevelUps = 0;
    game.battleUnitStars = {};
    game.rerollsLeft = 1;
    game.isRollModalOpen = false;
    updateFloatingLevelUpButtonUI();

    game.wave = 1;
    game.maxWaves = modeId === 'challenge'
        ? CHALLENGE_MAX_WAVES
        : (modeId === 'endless_siege' ? 999 : MAX_WAVES);
    game.waveTimer = 0;
    game.enemySpawnTimer = 1.2;
    game.challengeWaveSpawnedCount = 0;
    game.challengeWaveTotalToSpawn = 10;
    game.meteorStormTimer = 14.0;

    // Reset lưới ô vuông 7x11 Full Map
    game.tdGrid = new Array(TD_GRID_ROWS * TD_GRID_COLS).fill(null);

    // Reset Cờ Tập Kết & Kéo-Thả & Relocate
    game.rallyPoint = {
        active: false,
        x: LOGICAL_WIDTH / 2,
        y: PLAYFIELD_HEIGHT - 122
    };
    game.dragDeploy.active = false;
    game.towerRelocate = {
        holding: false,
        dragging: false,
        tower: null,
        holdTime: 0,
        x: 0,
        y: 0,
        targetCol: -1,
        targetRow: -1,
        isValid: false
    };

    // Máu Căn cứ Xanh & Đỏ + Khiên Phản Chấn Vĩnh Cửu
    const baseHpMult = 1 + bastionLv * 0.10 + (treeB.baseHpPct || 0);
    const blueMaxHp = Math.round((mapCfg.playerBaseHp || 250) * baseHpMult);
    game.playerBase.hp = blueMaxHp;
    game.playerBase.maxHp = blueMaxHp;
    game.playerBase.shield = treeB.eternal_shield ? Math.round(blueMaxHp * 0.25) : 0;
    game.playerBase.maxShield = game.playerBase.shield;
    game.playerBase.hitFlash = 0;
    game.playerBase.turretAngle = -Math.PI / 2;

    const redMaxHp = Math.round((mapCfg.enemyBaseHp || 260) * diffCfg.baseHpMult);
    game.enemyBase.hp = redMaxHp;
    game.enemyBase.maxHp = redMaxHp;
    game.enemyBase.hitFlash = 0;

    game.units = [];
    game.projectiles = [];
    game.airstrikes = [];
    game.landmines = [];
    game.paratroops = [];
    game.tireTracks = [];
    game.scorchMarks = [];
    game.shockwaves = [];
    game.muzzleFlashes = [];
    game.beamEffects = [];
    game.floatingTexts = [];
    game.activeMutations = [];
    game.awaitingMutationChoice = false;
    game.blitzkriegTimer = 0;
    game.raidBoss = null;
    particlePool.clear();

    // Khởi tạo Bộ bài xuất phát (1 thẻ đầu tiên + ô Không kích trong Battle | 1 Tower đầu tiên trong Challenge)
    const starterPool = UNIT_CATALOG.filter(u => hasUnitInInventory(u.id));
    const firstUnit = (starterPool[0] || UNIT_CATALOG[0]).id;

    if (modeId === 'challenge') {
        game.deckIds = [firstUnit, null, null, null, null, null];
        game.deckCooldowns = [0, 0, 0, 0, 0, 0];
        game.gas = 14 + (treeB.startGasFlat || 0);
    } else {
        game.deckIds = [firstUnit, null, null, null, 'airstrike'];
        game.deckCooldowns = [0, 0, 0, 0, 0, 0];
    }
    game.battleUnitStars[firstUnit] = 1;

    game.tacticCooldowns = { airdrop: 0, minefield: 0, emp_blast: 0, blitzkrieg: 0 };

    // Build bản đồ tĩnh & lưới tìm đường Flow-Field
    buildStaticMapCanvas(lv);

    // Ẩn Sảnh & Hiển thị Giao diện Trận đấu
    document.getElementById('lobby-wrapper')?.classList.remove('active');
    document.getElementById('win-panel')?.classList.remove('active');
    document.getElementById('lose-panel')?.classList.remove('active');
    document.getElementById('draft-modal')?.classList.remove('active');

    document.getElementById('current-level-label').textContent =
        modeId === 'challenge' ? `CHALLENGE ${lv}` : `MAP ${lv}`;

    // Chế độ Đặt Trận Tự Động (Auto-Battler)
    const abBar = document.getElementById('autobattler-setup-bar');
    if (modeId === 'auto_battler') {
        game.autoBattlerPhase = 'prep';
        game.gas = 28 + (treeB.startGasFlat || 0);
        game.deckIds = [...(metaState.selectedDeck || [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'tank', 'airstrike'])];
        game.autoSelectedSlotIdx = 0;
        game.autoSelectedUnitId = game.deckIds[0];
        abBar?.classList.add('active');
        document.getElementById('autobattler-fuel-display').textContent = Math.floor(game.gas);

        // Sinh đội hình địch mẫu phía trên
        ['infantry', 'bazooka', 'humvee', 'tank', 'apc'].forEach((eId, idx) => {
            spawnUnit('red', eId, 75 + idx * 68, 145 + (idx % 2) * 28);
        });
    } else {
        game.autoBattlerPhase = 'fight';
        abBar?.classList.remove('active');
    }

    if (modeId === 'raid_boss') {
        initRaidBoss();
    } else {
        updateRaidBossHUD();
    }

    renderBattleDeckSlots();
    updateCommanderSkillsUI();
    updateBaseHpHUD();
}

window.startChallengeLevel = mapLv => {
    startLevel(mapLv, 'difficult', 'challenge');
};

window.restartGame = () => {
    startLevel(game.currentLevel, game.difficulty, game.battleMode);
};

window.nextOrRestartLevel = () => {
    const nextLv = game.currentLevel < LEVELS.length ? game.currentLevel + 1 : 1;
    startLevel(nextLv, game.difficulty, game.battleMode);
};

window.openLobbyScreen = openLobbyScreen;

// ============================================================================
// 6. KẾT THÚC TRẬN ĐẤU (THẮNG / THUA) & CẬP NHẬT LƯU TRỮ
// ============================================================================
function handleEndBattle(isWin) {
    if (game.gameOver) return;
    game.gameOver = true;
    game.running = false;
    updateFloatingLevelUpButtonUI();

    const treeB = getAncientSkillTreeBonuses();
    const harvestLv = Number(metaState?.metaTalents?.battlefield_harvest) || 0;
    const goldMult = 1 + harvestLv * 0.08 + (treeB.goldBonusPct || 0);

    const mins = String(Math.floor(game.timeSec / 60)).padStart(2, '0');
    const secs = String(Math.floor(game.timeSec % 60)).padStart(2, '0');
    const timeStr = `${mins}:${secs}`;

    if (isWin) {
        sfx.play('upgrade');
        metaState.missionsProgress.wins = (metaState.missionsProgress.wins || 0) + 1;

        if (game.battleMode === 'challenge') {
            metaState.challengeClearedMaps[game.currentLevel] = true;
            metaState.challengeBestWave[game.currentLevel] = CHALLENGE_MAX_WAVES;
            const rew = calcChallengeRewards(game.currentLevel, treeB.pearlBonusPct);
            const finalCoins = Math.round(rew.coins * goldMult);
            metaState.pearls = (metaState.pearls || 0) + rew.pearls;
            metaState.gems += rew.gems;
            metaState.coins += finalCoins;
            saveProgress();

            document.getElementById('win-subtitle').textContent = `Đã chinh phục 20 Wave Zombie Ải ${game.currentLevel}!`;
            document.getElementById('win-coins-reward').textContent = `+${rew.pearls} ⚪ | +${rew.gems} 💎 | +${finalCoins.toLocaleString('en-US')} 🪙`;
        } else {
            const prog = metaState.mapDifficultyProgress[game.currentLevel] || {};
            prog[game.difficulty] = true;
            prog[`${game.difficulty}_${game.battleMode}`] = true;
            metaState.mapDifficultyProgress[game.currentLevel] = prog;

            if (game.battleMode === 'auto_battler') metaState.autobattlerWins = (metaState.autobattlerWins || 0) + 1;
            if (game.battleMode === 'raid_boss') metaState.raidBossClears = (metaState.raidBossClears || 0) + 1;

            const baseCoins = calcStageRewardCoins(game.currentLevel, game.difficulty, game.battleMode);
            const finalCoins = Math.round(baseCoins * goldMult);
            const medalGain = game.difficulty === 'difficult' ? 3 : 0;
            metaState.coins += finalCoins;
            metaState.medals = (metaState.medals || 0) + medalGain;
            saveProgress();

            document.getElementById('win-subtitle').textContent = `Hoàn thành Map ${game.currentLevel} (${DIFFICULTY_CONFIG[game.difficulty]?.name || 'Dễ'})!`;
            document.getElementById('win-coins-reward').textContent =
                `+${finalCoins.toLocaleString('en-US')} 🪙${medalGain > 0 ? ` | +${medalGain} 🎖️` : ''}`;
        }

        document.getElementById('win-time').textContent = timeStr;
        document.getElementById('win-hp').textContent = `${Math.ceil(game.playerBase.hp)} / ${game.playerBase.maxHp}`;
        document.getElementById('win-spawned').textContent = `WAVE ${game.wave}`;
        document.getElementById('win-kills').textContent = `${DIFFICULTY_CONFIG[game.difficulty]?.shortLabel || 'DỄ'} • ${game.matchKills}`;
        document.getElementById('win-panel')?.classList.add('active');
    } else {
        sfx.play('boom');
        if (game.battleMode === 'challenge') {
            const prevBest = metaState.challengeBestWave[game.currentLevel] || 0;
            if (game.wave > prevBest) metaState.challengeBestWave[game.currentLevel] = game.wave;
            saveProgress();
        } else if (game.battleMode === 'endless_siege') {
            if (game.wave > (metaState.endlessBestWave || 0)) {
                metaState.endlessBestWave = game.wave;
            }
            const endlessCoins = Math.round(game.wave * 180 * goldMult);
            metaState.coins += endlessCoins;
            saveProgress();
        }

        document.getElementById('lose-time').textContent = timeStr;
        document.getElementById('lose-wave').textContent = `Wave ${game.wave} / ${game.maxWaves === 999 ? '∞' : game.maxWaves}`;
        document.getElementById('lose-spawned').textContent = String(game.matchSpawns);
        document.getElementById('lose-kills').textContent = `MAP ${game.currentLevel} • ${game.matchKills}`;
        document.getElementById('lose-panel')?.classList.add('active');
    }
}

setOnEndBattleHandler(handleEndBattle);
setOnDeckChangedHandler(renderBattleDeckSlots);

// ============================================================================
// 7. VÒNG LẶP CẬP NHẬT LOGIC CHIẾN ĐẤU (UPDATE BATTLE)
// ============================================================================
function updateBattle(dt) {
    if (!game.running || game.paused || game.gameOver) return;

    game.timeSec += dt;

    // 1. Cập nhật đếm giữ 3.0 giây để Đổi Vị Trí Tower trong CHALLENGE
    const rel = game.towerRelocate;
    if (rel.holding && !rel.dragging && rel.tower) {
        if (rel.tower.dead) {
            rel.holding = false;
            rel.tower = null;
        } else {
            rel.holdTime += dt;
            if (rel.holdTime >= CHALLENGE_RELOCATE_HOLD_SEC) {
                rel.holding = false;
                rel.dragging = true;
                sfx.play('spawn');
                triggerHaptic(35);
                spawnFloatingText(rel.tower.x, rel.tower.y - 24, '✋ THẢ VÀO Ô MỚI!', '#fde047', 12);
            }
        }
    }

    if (game.shakeTimer > 0) game.shakeTimer = Math.max(0, game.shakeTimer - dt);
    if (game.blitzkriegTimer > 0) game.blitzkriegTimer = Math.max(0, game.blitzkriegTimer - dt);
    if (game.playerBase.hitFlash > 0) game.playerBase.hitFlash = Math.max(0, game.playerBase.hitFlash - dt);
    if (game.enemyBase.hitFlash > 0) game.enemyBase.hitFlash = Math.max(0, game.enemyBase.hitFlash - dt);

    // 2. Kỹ năng Đặc Biệt Mốc 10 Nhánh Hỏa Lực: Bão Thiên Thạch (Mỗi 14 giây)
    const treeB = getAncientSkillTreeBonuses();
    if (treeB.meteor_storm && !(game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep')) {
        game.meteorStormTimer -= dt;
        if (game.meteorStormTimer <= 0) {
            game.meteorStormTimer = 14.0;
            triggerMeteorStormSkill();
        }
    }

    // 3. Hồi Xăng tự động (trừ giai đoạn chuẩn bị Auto-Battler)
    if (!(game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep')) {
        const oilLv = Number(metaState?.metaTalents?.oil_refining) || 0;
        const mapGasMult = (LEVELS[game.currentLevel - 1]?.gasRateMult) || 1.0;
        const baseInterval = GAS_UPGRADE_LEVELS[game.gasGenLevel]?.interval || 3.0;
        const effInterval = Math.max(
            0.45,
            (baseInterval - oilLv * 0.06) / (mapGasMult * (1 + (treeB.gasRegenPct || 0)))
        );

        game.gasTimer += dt;
        if (game.gasTimer >= effInterval) {
            game.gasTimer -= effInterval;
            if (game.gas < game.maxGas) {
                game.gas = Math.min(game.maxGas, game.gas + 1);
            }
        }
    }

    // 4. Giảm hồi chiêu thẻ bài & 4 kỹ năng Chỉ huy Q/W/E/R
    for (let i = 0; i < game.deckCooldowns.length; i++) {
        if (game.deckCooldowns[i] > 0) {
            game.deckCooldowns[i] = Math.max(0, game.deckCooldowns[i] - dt);
        }
    }
    for (const k of Object.keys(game.tacticCooldowns)) {
        if (game.tacticCooldowns[k] > 0) {
            game.tacticCooldowns[k] = Math.max(0, game.tacticCooldowns[k] - dt);
        }
    }

    // 5. Quản lý Wave & Sinh quân địch / Zombie
    if (game.battleMode === 'challenge') {
        updateChallengeZombieWave(dt);
    } else if (game.battleMode !== 'auto_battler') {
        updateStandardEnemyWave(dt);
    }

    // 6. Cập nhật Thực thể, Đạn, Không kích, Mìn, Lính Dù, Ụ Pháo & Boss
    updateActiveSynergies();
    updateBaseTurret(dt);
    if (game.battleMode === 'raid_boss') updateRaidBoss(dt);

    for (let i = 0; i < game.units.length; i++) {
        game.units[i].update(dt);
    }
    game.units = game.units.filter(u => !u.dead);

    for (let i = 0; i < game.projectiles.length; i++) {
        game.projectiles[i].update(dt);
    }
    game.projectiles = game.projectiles.filter(p => !p.done);

    // Không kích
    for (const strike of game.airstrikes) {
        strike.x += strike.speed * dt;
        const dropXs = [95, 175, 255, 335];
        dropXs.forEach((dx, idx) => {
            if (!strike.droppedBombs[idx] && strike.x >= dx) {
                strike.droppedBombs[idx] = true;
                sfx.play('boom');
                addScreenShake(4.5, 0.16);
                spawnExplosionFX(dx, strike.y, 52, true, false);
                for (const u of game.units) {
                    if (!u.dead && u.team !== strike.team && Math.hypot(u.x - dx, u.y - strike.y) <= 56) {
                        u.takeDamage(strike.damage, null, true, false);
                    }
                }
                if (strike.team === 'blue' && game.battleMode !== 'challenge' && Math.hypot(game.enemyBase.x - dx, game.enemyBase.y - strike.y) <= 68) {
                    damageBase(game.enemyBase, strike.damage * 0.75);
                }
                if (strike.team === 'blue' && game.battleMode === 'raid_boss' && game.raidBoss && Math.hypot(game.raidBoss.x - dx, game.raidBoss.y - strike.y) <= 75) {
                    damageRaidBoss(strike.damage, dx);
                }
            }
        });
        if (strike.x > LOGICAL_WIDTH + 80) strike.done = true;
    }
    game.airstrikes = game.airstrikes.filter(a => !a.done);

    // Mìn chống tăng [W]
    for (const mine of game.landmines) {
        if (mine.exploded) continue;
        mine.blinkTimer += dt * 5;
        for (const u of game.units) {
            if (!u.dead && u.team === 'red' && !u.isAir && Math.hypot(u.x - mine.x, u.y - mine.y) <= mine.radius + u.radius) {
                mine.exploded = true;
                sfx.play('boom');
                addScreenShake(5, 0.2);
                spawnExplosionFX(mine.x, mine.y, mine.splash, true, false);
                for (const target of game.units) {
                    if (!target.dead && target.team === 'red' && !target.isAir && Math.hypot(target.x - mine.x, target.y - mine.y) <= mine.splash) {
                        target.takeDamage(mine.damage);
                    }
                }
                break;
            }
        }
    }
    game.landmines = game.landmines.filter(m => !m.exploded);

    // Lính nhảy dù [Q]
    for (const para of game.paratroops) {
        para.y += 95 * dt;
        if (para.y >= para.targetY) {
            para.done = true;
            spawnUnit('blue', para.unitId, para.x, para.targetY);
            spawnShockwave(para.x, para.targetY, 22, '#4ade80', 2);
        }
    }
    game.paratroops = game.paratroops.filter(p => !p.done);

    // Hiệu ứng hạt & text bay
    particlePool.update(dt);
    game.scorchMarks.forEach(s => (s.alpha -= (s.decayRate || 0.03) * dt));
    game.scorchMarks = game.scorchMarks.filter(s => s.alpha > 0);
    game.tireTracks.forEach(t => (t.alpha -= 0.05 * dt));
    game.tireTracks = game.tireTracks.filter(t => t.alpha > 0);
    game.shockwaves.forEach(sw => {
        sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 9);
        sw.alpha -= dt * 2.2;
    });
    game.shockwaves = game.shockwaves.filter(sw => sw.alpha > 0);
    game.muzzleFlashes.forEach(mf => (mf.ttl -= dt));
    game.muzzleFlashes = game.muzzleFlashes.filter(mf => mf.ttl > 0);
    game.beamEffects.forEach(bm => (bm.ttl -= dt));
    game.beamEffects = game.beamEffects.filter(bm => bm.ttl > 0);
    game.floatingTexts.forEach(ft => {
        ft.y += ft.vy * dt;
        ft.alpha -= dt * 1.15;
    });
    game.floatingTexts = game.floatingTexts.filter(ft => ft.alpha > 0);

    // Auto-Play AI nếu bật
    if (game.autoPlay && !(game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep')) {
        game.autoPlayTimer -= dt;
        if (game.autoPlayTimer <= 0) {
            game.autoPlayTimer = 0.75;
            const maxSlots = game.battleMode === 'challenge' ? CHALLENGE_DECK_SLOTS : 5;
            for (let i = 0; i < maxSlots; i++) {
                const uId = game.deckIds[i];
                if (uId && (game.deckCooldowns[i] || 0) <= 0) {
                    const sp = getEffectiveUnitStats(uId, 'blue');
                    if (game.gas >= sp.cost) {
                        deployDeckSlot(i);
                        break;
                    }
                }
            }
        }
    }

    // Kiểm tra kết thúc Auto-Battler
    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'fight') {
        const blueAlive = game.units.some(u => !u.dead && u.team === 'blue');
        const redAlive = game.units.some(u => !u.dead && u.team === 'red');
        if (!redAlive) handleEndBattle(true);
        else if (!blueAlive) handleEndBattle(false);
    }

    updateInGameHUD(dt);
}

function updateStandardEnemyWave(dt) {
    game.waveTimer += dt;
    if (game.waveTimer >= game.waveDuration) {
        game.waveTimer = 0;
        if (game.wave >= game.maxWaves && game.battleMode === 'survival') {
            handleEndBattle(true);
            return;
        }
        game.wave++;
        refreshEternalShields();
        if (game.battleMode === 'endless_siege' && game.wave % 2 === 0) {
            triggerRoguelikeMutationDraft();
        }
    }

    game.enemySpawnTimer -= dt;
    if (game.enemySpawnTimer <= 0) {
        const pace = Math.max(1.6, 4.4 - game.wave * 0.22 - game.currentLevel * 0.04);
        game.enemySpawnTimer = pace;

        const mapObj = LEVELS[game.currentLevel - 1] || LEVELS[0];
        const landPool = ['infantry', 'bazooka', 'sniper', 'humvee', 'apc', 'tank', 'pyromancer', 'cryomancer'];
        if (game.wave >= 4) landPool.push('heavy_tank', 'mecha_paladin', 'railgun_walker', 'heli');
        if (mapObj.hasWater && Math.random() < 0.28) {
            landPool.push('patrol_boat', 'destroyer');
            if (game.wave >= 6) landPool.push('battleship');
        }

        const pickId = landPool[Math.floor(Math.random() * landPool.length)];
        const sx = 65 + Math.random() * (LOGICAL_WIDTH - 130);
        spawnUnit('red', pickId, sx, 118);
    }
}

function updateChallengeZombieWave(dt) {
    const redZombiesAlive = game.units.some(u => !u.dead && u.team === 'red');

    // Khi sinh đủ số Zombie của Wave hiện tại và tiêu diệt sạch thì sang Wave tiếp theo
    if (game.challengeWaveSpawnedCount >= game.challengeWaveTotalToSpawn && !redZombiesAlive) {
        if (game.wave >= CHALLENGE_MAX_WAVES) {
            handleEndBattle(true);
            return;
        }
        game.wave++;
        game.challengeWaveSpawnedCount = 0;
        game.challengeWaveTotalToSpawn = 10 + game.wave * 2;
        game.enemySpawnTimer = 1.5;

        // Thưởng Xăng & Hồi Khiên Phản Chấn Vĩnh Cửu sau mỗi Wave
        game.gas = Math.min(game.maxGas, game.gas + 5);
        refreshEternalShields();
        spawnFloatingText(LOGICAL_WIDTH / 2, 125, `☠️ WAVE ${game.wave} / ${CHALLENGE_MAX_WAVES}!`, '#fb7185', 16);

        if (game.wave === 7) showBossWarningBanner('BOSS WAVE 7: ĐỒ TỂ KHỔNG LỒ!', 'Cẩn thận đòn dao phay chém lan diện rộng!');
        else if (game.wave === 14) showBossWarningBanner('BOSS WAVE 14: QUÁI THÚ CHIMERA!', 'Tiếng gầm sóng âm làm choáng toàn bộ Tower!');
        else if (game.wave === 20) showBossWarningBanner('ĐẠI BOSS WAVE 20: BẠO CHÚA OMEGA!', 'Wave cuối cùng! Hủy diệt Bạo Chúa để nhận Ngọc Trai Trắng!');
        return;
    }

    if (game.challengeWaveSpawnedCount < game.challengeWaveTotalToSpawn) {
        game.enemySpawnTimer -= dt;
        if (game.enemySpawnTimer <= 0) {
            game.enemySpawnTimer = Math.max(0.55, 1.85 - game.wave * 0.05);
            game.challengeWaveSpawnedCount++;

            // Sinh Boss ở cuối Wave 7, 14, 20
            if (game.challengeWaveSpawnedCount === game.challengeWaveTotalToSpawn) {
                if (game.wave === 7) {
                    spawnZombie('boss_butcher', LOGICAL_WIDTH / 2, 36);
                    return;
                } else if (game.wave === 14) {
                    spawnZombie('boss_chimera', LOGICAL_WIDTH / 2, 36);
                    return;
                } else if (game.wave === 20) {
                    spawnZombie('boss_omega_tyrant', LOGICAL_WIDTH / 2, 36);
                    return;
                }
            }

            const maxIdx = Math.min(ZOMBIE_CATALOG.length - 4, 2 + Math.floor(game.wave * 0.55));
            const zSpec = ZOMBIE_CATALOG[Math.floor(Math.random() * (maxIdx + 1))];
            const sx = 36 + Math.random() * (LOGICAL_WIDTH - 72);
            spawnZombie(zSpec.id, sx, 34);
        }
    }
}

// ============================================================================
// 8. CẬP NHẬT HUD & THANH DECK DƯỚI ĐÁY
// ============================================================================
function updateInGameHUD() {
    const mins = String(Math.floor(game.timeSec / 60)).padStart(2, '0');
    const secs = String(Math.floor(game.timeSec % 60)).padStart(2, '0');
    const timerEl = document.getElementById('hud-match-timer');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;

    const lvEl = document.getElementById('battle-lv-label');
    const expEl = document.getElementById('battle-exp-label');
    const expFill = document.getElementById('battle-exp-fill');
    if (lvEl) lvEl.textContent = `BATTLE LV.${game.battleLv}`;
    if (expEl) expEl.textContent = `${game.battleExp}/${game.battleNextExp} EXP`;
    if (expFill) expFill.style.width = `${Math.min(100, Math.round((game.battleExp / Math.max(1, game.battleNextExp)) * 100))}%`;

    const waveEl = document.getElementById('hud-wave-counter');
    if (waveEl) waveEl.textContent = `${game.wave}/${game.maxWaves === 999 ? '∞' : game.maxWaves}`;

    const gasInt = Math.floor(game.gas);
    const gasCountEl = document.getElementById('gasCountText');
    if (gasCountEl) gasCountEl.textContent = String(gasInt);

    const curUpg = GAS_UPGRADE_LEVELS[game.gasGenLevel] || GAS_UPGRADE_LEVELS[0];
    const rateLabel = document.getElementById('gas-rate-label');
    const speedInd = document.getElementById('speed-indicator');
    if (rateLabel) rateLabel.textContent = `+1/${curUpg.interval.toFixed(1)}s`;
    if (speedInd) speedInd.textContent = `${curUpg.interval.toFixed(1)}s`;

    // 5 vạch nạp xăng
    const segFill = Math.floor(((game.gas - gasInt) + (game.gasTimer / curUpg.interval)) * 5);
    for (let s = 1; s <= 5; s++) {
        document.getElementById(`L${s}`)?.classList.toggle('active', s <= segFill);
    }

    // Nút nâng cấp Xăng
    const upgNextEl = document.getElementById('upgrade-next-speed');
    const upgCostEl = document.getElementById('upgrade-cost-text');
    const upgLockCost = document.getElementById('upgrade-lock-cost');
    const blockUpg = document.getElementById('blockUpgrade');
    const isMaxGasUpg = curUpg.cost === 0 || game.battleMode === 'challenge';

    if (upgNextEl) upgNextEl.textContent = game.battleMode === 'challenge' ? 'TD MODE' : curUpg.label;
    if (upgCostEl) upgCostEl.textContent = isMaxGasUpg ? 'MAX' : String(curUpg.cost);
    if (upgLockCost) upgLockCost.textContent = String(curUpg.cost);
    if (blockUpg) {
        blockUpg.classList.toggle('unlocked', isMaxGasUpg || game.gas >= curUpg.cost);
    }

    // Trạng thái từng thẻ trên Deck
    const maxSlots = game.battleMode === 'challenge' ? CHALLENGE_DECK_SLOTS : 5;
    for (let i = 0; i < maxSlots; i++) {
        const unitId = game.deckIds[i];
        const btn = document.getElementById(`deck-slot-btn-${i}`);
        if (!btn || !unitId) continue;

        const sp = getEffectiveUnitStats(unitId, 'blue');
        const cd = game.deckCooldowns[i] || 0;
        const maxCd = game.deckMaxCooldowns[i] || sp.cooldown || 1.5;
        const overlay = document.getElementById(`deck-cd-overlay-${i}`);
        const cdTxt = document.getElementById(`deck-cd-text-${i}`);
        const cdBar = document.getElementById(`deck-cd-bar-${i}`);

        const hasFuel = game.gas >= sp.cost;
        btn.classList.toggle('insufficient-fuel', !hasFuel);
        btn.classList.toggle('on-cooldown', cd > 0.05);
        btn.classList.toggle('ready', hasFuel && cd <= 0.05);

        if (overlay) {
            const pct = Math.min(100, Math.round((cd / Math.max(0.1, maxCd)) * 100));
            overlay.style.setProperty('--cd-deg', `${Math.round(pct * 3.6)}deg`);
            if (cdTxt) cdTxt.textContent = cd > 0.05 ? `${cd.toFixed(1)}s` : '';
            if (cdBar) cdBar.style.setProperty('--cd-pct', `${pct}%`);
        }
    }

    updateCommanderSkillsUI();
}

// ============================================================================
// 9. VẼ TOÀN BỘ CHIẾN TRƯỜNG (RENDER BATTLE CANVAS)
// ============================================================================
function renderBattleCanvas() {
    if (!ctx) return;
    ctx.save();

    if (game.shakeTimer > 0) {
        const sx = (Math.random() - 0.5) * game.shakeIntensity * 2;
        const sy = (Math.random() - 0.5) * game.shakeIntensity * 2;
        ctx.translate(sx, sy);
    }

    // 1. Vẽ nền bản đồ tĩnh từ Offscreen Buffer + hiệu ứng nước/dung nham/thời tiết động
    if (mapBufferCache.canvas) {
        ctx.drawImage(mapBufferCache.canvas, 0, 0);
    }
    drawDynamicSineWater(ctx, game.timeSec, game.currentLevel);

    // 2. Vẽ Lưới 7x11 Full Map trong chế độ CHALLENGE (khi đang kéo thả hoặc giữ đổi vị trí Tower)
    if (game.battleMode === 'challenge') {
        const showGrid = game.dragDeploy.active || game.towerRelocate.dragging;
        if (showGrid) {
            const activeSpec = game.dragDeploy.active
                ? getEffectiveUnitStats(game.dragDeploy.unitId, 'blue')
                : game.towerRelocate.tower?.spec;

            for (let r = 0; r < TD_GRID_ROWS; r++) {
                for (let c = 0; c < TD_GRID_COLS; c++) {
                    const gx = c * TD_CELL_SIZE;
                    const gy = TD_GRID_TOP_Y + r * TD_CELL_SIZE;
                    const valid = canPlaceTowerAtCell(activeSpec, c, r, game.towerRelocate.tower);
                    const isHover =
                        (game.dragDeploy.active && game.dragDeploy.gridCol === c && game.dragDeploy.gridRow === r) ||
                        (game.towerRelocate.dragging && game.towerRelocate.targetCol === c && game.towerRelocate.targetRow === r);

                    ctx.fillStyle = isHover
                        ? (valid ? 'rgba(74, 222, 128, 0.45)' : 'rgba(239, 68, 68, 0.48)')
                        : (valid ? 'rgba(56, 189, 248, 0.14)' : 'rgba(15, 23, 42, 0.25)');
                    ctx.fillRect(gx + 1, gy + 1, TD_CELL_SIZE - 2, TD_CELL_SIZE - 2);

                    ctx.strokeStyle = isHover ? '#fde047' : 'rgba(255, 255, 255, 0.22)';
                    ctx.lineWidth = isHover ? 2.5 : 1;
                    ctx.strokeRect(gx + 1, gy + 1, TD_CELL_SIZE - 2, TD_CELL_SIZE - 2);
                }
            }
        }
    }

    // 3. Vẽ Cờ Tập Kết Xanh (Rally Point) trong chế độ Battle Bình Thường
    if (game.battleMode !== 'challenge' && game.rallyPoint.active) {
        const rx = game.rallyPoint.x;
        const ry = game.rallyPoint.y;
        const pulse = 1 + Math.sin(game.timeSec * 6) * 0.12;

        ctx.save();
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(rx, ry, 16 * pulse, 8 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Cột cờ & Lá cờ xanh
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx, ry - 24);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(rx, ry - 24);
        ctx.lineTo(rx + 14, ry - 19);
        ctx.lineTo(rx, ry - 14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // 4. Vết bánh xe & Vệt cháy nổ
    for (const tr of game.tireTracks) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, tr.alpha);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(tr.x1 - 1.5, tr.y1 - 1.5, 3, 3);
        ctx.fillRect(tr.x2 - 1.5, tr.y2 - 1.5, 3, 3);
        ctx.restore();
    }
    for (const sc of game.scorchMarks) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sc.alpha);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, sc.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 5. Vẽ Căn Cứ Đỏ & Căn Cứ Xanh + Ụ Pháo Căn Cứ Xanh
    if (game.battleMode !== 'challenge' && game.battleMode !== 'raid_boss') {
        drawBaseBuilding(ctx, game.enemyBase, false);
    }
    drawBaseBuilding(ctx, game.playerBase, true);

    // 6. Vẽ Mìn chống tăng
    for (const m of game.landmines) {
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = Math.sin(m.blinkTimer * 3) > 0 ? '#ef4444' : '#7f1d1d';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 7. Vẽ bóng & thân toàn bộ Đơn vị (sắp xếp theo trục Y)
    const sortedUnits = [...game.units].sort((a, b) => a.y - b.y);
    for (const u of sortedUnits) u.drawShadow(ctx);
    for (const u of sortedUnits) u.drawBody(ctx);

    if (game.battleMode === 'raid_boss') {
        drawRaidBoss(ctx);
    }

    // 8. Vẽ Vòng Tròn Tiến Trình Màu Vàng 0.0s -> 3.0s khi nhấn giữ Tower (CHALLENGE)
    const rel = game.towerRelocate;
    if (rel.holding && rel.tower && !rel.tower.dead) {
        const progress = Math.min(1, rel.holdTime / CHALLENGE_RELOCATE_HOLD_SEC);
        const tx = rel.tower.x;
        const ty = rel.tower.y;

        ctx.save();
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(tx, ty, 28, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(tx, ty, 28, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();

        ctx.font = '900 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fde047';
        ctx.fillText(`${rel.holdTime.toFixed(1)}s / 3.0s`, tx, ty - 34);
        ctx.restore();
    }

    // Vẽ bóng Tower đang được kéo sang ô mới
    if (rel.dragging && rel.tower) {
        const sp = rel.tower.spec;
        ctx.save();
        ctx.strokeStyle = rel.isValid ? 'rgba(74, 222, 128, 0.85)' : 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(rel.x, rel.y, sp.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.globalAlpha = 0.85;
        drawUnitArt(ctx, rel.tower.id, rel.x, rel.y, 34, 'blue', game.timeSec, -Math.PI / 2);
        ctx.restore();
    }

    // 9. Vẽ Bóng Kéo - Thả Đặt Quân từ Deck (Drag & Drop Preview)
    if (game.dragDeploy.active && game.dragDeploy.unitId) {
        const sp = getEffectiveUnitStats(game.dragDeploy.unitId, 'blue');
        const dx = game.dragDeploy.x;
        const dy = game.dragDeploy.y;
        const ok = game.dragDeploy.isValid;

        ctx.save();
        ctx.strokeStyle = ok ? 'rgba(74, 222, 128, 0.85)' : 'rgba(239, 68, 68, 0.85)';
        ctx.fillStyle = ok ? 'rgba(74, 222, 128, 0.16)' : 'rgba(239, 68, 68, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(dx, dy, sp.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(dx, dy, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.85;
        drawUnitArt(ctx, sp.id, dx, dy, 34, 'blue', game.timeSec, -Math.PI / 2);
        ctx.restore();
    }

    // 10. Đạn pháo, Tia Laser, Máy bay Không kích, Hạt & Chữ nổi
    for (const p of game.projectiles) p.draw(ctx);

    for (const bm of game.beamEffects) {
        ctx.save();
        ctx.strokeStyle = bm.color;
        ctx.lineWidth = bm.width;
        ctx.beginPath();
        ctx.moveTo(bm.x1, bm.y1);
        ctx.lineTo(bm.x2, bm.y2);
        ctx.stroke();
        ctx.restore();
    }

    for (const mf of game.muzzleFlashes) {
        if (projCache.muzzleStarCanvas) {
            ctx.save();
            ctx.translate(mf.x, mf.y);
            ctx.rotate(mf.angle);
            ctx.scale(mf.scale, mf.scale);
            ctx.drawImage(projCache.muzzleStarCanvas, -14, -14);
            ctx.restore();
        }
    }

    for (const strike of game.airstrikes) {
        drawUnitArt(ctx, 'airstrike', strike.x, strike.y, 44, strike.team, game.timeSec, 0);
    }

    for (const para of game.paratroops) {
        ctx.save();
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(para.x, para.y - 16, 12, Math.PI, 0);
        ctx.fill();
        drawUnitArt(ctx, para.unitId, para.x, para.y, 26, 'blue', game.timeSec, null);
        ctx.restore();
    }

    particlePool.draw(ctx);

    for (const sw of game.shockwaves) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = sw.lineWidth;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    renderFogOfWarOverlay(ctx);

    for (const ft of game.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = `900 ${ft.size}px "Chakra Petch", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }

    ctx.restore();
}

function drawBaseBuilding(ctx, baseObj, isBlue) {
    if (!baseObj) return;
    ctx.save();
    ctx.translate(baseObj.x, baseObj.y);

    // Vùng triển khai nửa sân dưới mờ nhẹ
    if (isBlue && game.battleMode !== 'challenge') {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(-LOGICAL_WIDTH / 2 + 16, -PLAYFIELD_HEIGHT * 0.42);
        ctx.lineTo(LOGICAL_WIDTH / 2 - 16, -PLAYFIELD_HEIGHT * 0.42);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Khiên Phản Chấn Vĩnh Cửu quanh Căn Cứ Xanh
    if (isBlue && (baseObj.shield || 0) > 0) {
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 56 + Math.sin(game.timeSec * 5) * 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    drawRoundRectPath(ctx, -44, -22, 92, 48, 10);
    ctx.fill();

    ctx.fillStyle = baseObj.hitFlash > 0 ? '#ffffff' : (isBlue ? '#0284c7' : '#dc2626');
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    drawRoundRectPath(ctx, -46, -24, 92, 46, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isBlue ? '#1e3a8a' : '#7f1d1d';
    drawRoundRectPath(ctx, -34, -15, 68, 28, 6);
    ctx.fill();

    // Vẽ Ụ Pháo Phòng Thủ trên nóc Căn Cứ Xanh
    if (isBlue) {
        const tType = metaState?.baseTurret?.type || 'gatling';
        drawBaseTurretArt(ctx, tType, 0, -6, baseObj.turretAngle || -Math.PI / 2, game.timeSec);
    }

    ctx.restore();
}

// ============================================================================
// 10. KHỞI ĐỘNG ỨNG DỤNG & GẮN SỰ KIỆN HUD TRONG TRẬN
// ============================================================================
function initApplication() {
    loadProgress();

    if (canvas) {
        canvas.width = LOGICAL_WIDTH;
        canvas.height = LOGICAL_HEIGHT;
    }

    bindLobbyEvents((mapLv, diffId, modeId) => {
        startLevel(mapLv, diffId, modeId);
    });

    bindBattleCanvasInteractions();

    // Nút LEVEL UP (+N) bên trái trong trận
    document.getElementById('btn-battle-levelup-notify')?.addEventListener('click', () => {
        openBattleLevelUpChain();
    });

    // Nút Nạp Xăng nhanh & Nâng cấp tốc độ hồi Xăng
    document.getElementById('gas-generator-btn')?.addEventListener('click', () => {
        if (!game.running || game.paused || game.gameOver || game.battleMode === 'challenge') return;
        game.gasTimer += 0.35;
        sfx.play('gas');
    });

    document.getElementById('btnUpgradeGas')?.addEventListener('click', () => {
        if (!game.running || game.paused || game.gameOver || game.battleMode === 'challenge') return;
        const cur = GAS_UPGRADE_LEVELS[game.gasGenLevel];
        if (!cur || cur.cost <= 0 || game.gas < cur.cost) {
            sfx.play('cannon');
            return;
        }
        spendMatchGas(cur.cost);
        game.gasGenLevel++;
        sfx.play('upgrade');
        triggerHaptic(20);
        spawnFloatingText(85, PLAYFIELD_HEIGHT - 85, `⛽ NÂNG XĂNG LV.${game.gasGenLevel + 1}!`, '#4ade80', 13);
    });

    // Các nút trên HUD trên cùng
    document.getElementById('range-toggle-btn')?.addEventListener('click', e => {
        game.showRanges = !game.showRanges;
        e.currentTarget.style.opacity = game.showRanges ? '1' : '0.65';
    });

    document.getElementById('menu-return-btn')?.addEventListener('click', () => {
        game.running = false;
        updateFloatingLevelUpButtonUI();
        openLobbyScreen('battle');
    });

    document.getElementById('sound-btn')?.addEventListener('click', e => {
        sfx.enabled = !sfx.enabled;
        e.currentTarget.textContent = sfx.enabled ? '🔊' : '🔇';
    });

    document.getElementById('pause-btn')?.addEventListener('click', e => {
        if (!game.running || game.gameOver) return;
        game.paused = !game.paused;
        e.currentTarget.textContent = game.paused ? '▶' : '⏸';
    });

    document.getElementById('speed-mult-btn')?.addEventListener('click', e => {
        const idx = BATTLE_SPEED_MULTIPLIERS.indexOf(game.speedMult);
        game.speedMult = BATTLE_SPEED_MULTIPLIERS[(idx + 1) % BATTLE_SPEED_MULTIPLIERS.length];
        e.currentTarget.textContent = `⚡x${game.speedMult}`;
        e.currentTarget.className = `bg-amber-900/90 hover:bg-amber-800 text-amber-200 border border-amber-400 rounded-lg px-2 py-0.5 text-[10px] font-extrabold transition ${game.speedMult === 2 ? 'speed-x2' : (game.speedMult === 4 ? 'speed-x4' : '')}`;
    });

    document.getElementById('auto-play-btn')?.addEventListener('click', e => {
        game.autoPlay = !game.autoPlay;
        e.currentTarget.textContent = game.autoPlay ? '🤖 AUTO: BẬT' : '🤖 AUTO: TẮT';
        e.currentTarget.classList.toggle('auto-active', game.autoPlay);
    });

    // 4 Nút Kỹ Năng Chỉ Huy Q / W / E / R
    document.getElementById('tactic-btn-airdrop')?.addEventListener('click', () => triggerCommanderSkill('airdrop'));
    document.getElementById('tactic-btn-mines')?.addEventListener('click', () => triggerCommanderSkill('minefield'));
    document.getElementById('tactic-btn-emp')?.addEventListener('click', () => triggerCommanderSkill('emp_blast'));
    document.getElementById('tactic-btn-blitz')?.addEventListener('click', () => triggerCommanderSkill('blitzkrieg'));

    // Auto-Battler controls
    document.getElementById('btn-ab-clear')?.addEventListener('click', () => {
        if (game.battleMode !== 'auto_battler' || game.autoBattlerPhase !== 'prep') return;
        for (let i = game.units.length - 1; i >= 0; i--) {
            const u = game.units[i];
            if (u.team === 'blue') {
                game.gas += u.spec.cost || 0;
                game.units.splice(i, 1);
            }
        }
        document.getElementById('autobattler-fuel-display').textContent = Math.floor(game.gas);
        sfx.play('gas');
    });

    document.getElementById('btn-ab-fight')?.addEventListener('click', () => {
        if (game.battleMode !== 'auto_battler' || game.autoBattlerPhase !== 'prep') return;
        if (!game.units.some(u => u.team === 'blue')) {
            sfx.play('cannon');
            return;
        }
        game.autoBattlerPhase = 'fight';
        document.getElementById('autobattler-setup-bar')?.classList.remove('active');
        document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('ab-selected-slot'));
        sfx.play('blitz');
    });

    // Phím tắt bàn phím (1-6, Q/W/E/R, Space)
    window.addEventListener('keydown', e => {
        if (!game.running || game.gameOver) return;
        const k = e.key.toLowerCase();
        if (k >= '1' && k <= '6') deployDeckSlot(parseInt(k, 10) - 1);
        else if (k === 'q') triggerCommanderSkill('airdrop');
        else if (k === 'w') triggerCommanderSkill('minefield');
        else if (k === 'e') triggerCommanderSkill('emp_blast');
        else if (k === 'r') triggerCommanderSkill('blitzkrieg');
    });

    // Mở sảnh chính & bắt đầu vòng lặp 60-120 FPS
    openLobbyScreen('battle');

    if (!metaState.playerName) {
        document.getElementById('name-modal')?.classList.add('active');
    }

    let lastFrameTime = performance.now();
    const mainGameLoop = now => {
        const rawDt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
        lastFrameTime = now;

        if (game.running) {
            const subSteps = game.speedMult || 1;
            for (let s = 0; s < subSteps; s++) {
                updateBattle(rawDt);
            }
            renderBattleCanvas();
        }

        requestAnimationFrame(mainGameLoop);
    };

    requestAnimationFrame(mainGameLoop);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApplication);
} else {
    initApplication();
}