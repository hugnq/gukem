/**
 * ============================================================================
 * TINY BATTLE - COMBAT ENTITIES, TURRETS, PROJECTILES & MIXED WAVES (js/entities.js)
 * - Tính toán chỉ số hiệu dụng (41 Rarity + Chips + 6 Nhánh Skill Tree + Talents)
 * - Điều hướng A* né nước + Hard Collision Check cho Zombie/Quân trên cạn
 * - Tâm ngắm & Hitbox chuẩn xác trên Mansion Xanh / Đỏ
 * - Ụ Pháo xoay 360° trên nóc Mansion, Kỹ năng Q-W-E-R & Đợt quái hỗn hợp Campaign
 * ============================================================================
 */

'use strict';

/* --------------------------------------------------------------------------
 * 1. TÍNH TOÁN CHỈ SỐ HIỆU DỤNG CỦA BINH CHỦNG (GET EFFECTIVE UNIT STATS)
 * -------------------------------------------------------------------------- */
function getEffectiveUnitStats(unitId, side = 'blue', overrideLevel = null, overrideRarityId = null) {
  const base =
    UNIT_CATALOG.find((u) => u.id === unitId) ||
    (unitId === 'skeleton' ? SKELETON_SUMMON_SPEC : null) ||
    (unitId === 'airstrike' ? AIRSTRIKE_SPEC : null);

  if (!base) return null;

  const tree = getSkillTreeBonuses();

  // Nếu là quân phe Đỏ (Enemy), tính chỉ số theo cấp độ ải hiện tại
  if (side === 'red') {
    const stageLv = Math.max(1, Number(overrideLevel) || game.stageLevel || 1);
    const scale = 1 + (stageLv - 1) * 0.115;
    return {
      ...base,
      hp: Math.round(base.hp * scale),
      atk: Math.round(base.atk * scale),
      atkSpeed: base.atkSpeed,
      range: base.range,
      speed: base.speed,
      armor: clamp(base.armor + (stageLv - 1) * 0.004, 0, 0.72),
      armorPierce: base.armorPierce || 0,
      aoeRadius: base.aoeRadius || 0,
      cost: base.cost || 0,
      cooldown: base.cooldown || 2.0,
      critRate: 0.05,
      critDmg: 1.5,
      lifesteal: 0
    };
  }

  // Quân phe Xanh (Player): Kết hợp Level + Rarity (41 bậc) + Chips + Skill Tree 6 nhánh + Roguelike
  const uState = metaState.units[unitId] || { level: 1, rarityId: 'common', sockets: [] };
  const lv = overrideLevel || uState.level || 1;
  const rarityTier = getRarityTierById(overrideRarityId || uState.rarityId || 'common');

  const lvMult = computeUnitLevelMultiplier(lv);
  const rarityMult = rarityTier.mult || 1.0;

  // Tổng hợp hiệu ứng từ 3 ổ Chip bổ trợ
  let chipHpPct = 0;
  let chipAtkPct = 0;
  let chipAtkSpdPct = 0;
  let chipCdRedPct = 0;
  let chipPierceBonus = 0;
  let chipAoePct = 0;
  let chipLifesteal = 0;

  const sockets = Array.isArray(uState.sockets) ? uState.sockets : [];
  for (let i = 0; i < sockets.length; i++) {
    const chipId = sockets[i];
    if (!chipId) continue;
    if (chipId === 'overclock_core')  chipCdRedPct += 0.15;
    if (chipId === 'vampiric_fang')   chipLifesteal += 0.08;
    if (chipId === 'tungsten_rounds') { chipPierceBonus += 0.25; chipAtkPct += 0.15; }
    if (chipId === 'nano_plating')    chipHpPct += 0.22;
    if (chipId === 'plasma_coil')     { chipAtkSpdPct += 0.20; chipAoePct += 0.15; }
  }

  // Cộng chỉ số riêng cho Chiến Binh Xương từ Nhánh 3 (Chiêu Hồn)
  const skeletonBonus = unitId === 'skeleton' ? tree.skeletonStatPct : 0;

  // Cộng xuyên giáp đặc biệt cho Sniper, Railgun Walker & Tank từ Nhánh 2
  const pierceSpecialist =
    unitId === 'sniper' || unitId === 'railgun_walker' || unitId === 'tank' || unitId === 'heavy_tank'
      ? tree.armorPierceBonus
      : 0;

  const finalHp = Math.round(
    base.hp * lvMult * rarityMult * (1 + tree.unitHpPct + chipHpPct + skeletonBonus + game.roguelikeBuffs.hpPct)
  );

  const finalAtk = Math.round(
    base.atk * lvMult * rarityMult * (1 + tree.unitAtkPct + chipAtkPct + skeletonBonus + game.roguelikeBuffs.atkPct)
  );

  const finalAtkSpeed =
    base.atkSpeed * (1 + tree.unitAtkSpdPct + chipAtkSpdPct + game.roguelikeBuffs.atkSpdPct);

  const totalCdRed = clamp(chipCdRedPct, 0, 0.65);
  const challengeCdMult = game.mode === 'challenge' ? CHALLENGE_COOLDOWN_MULT : 1.0;
  const finalCooldown = Math.max(0.45, (base.cooldown || 2.0) * (1 - totalCdRed) * challengeCdMult);

  const finalCost = Math.max(
    5,
    Math.round((base.cost || 20) * (1 - clamp(tree.deployCostRedPct, 0, 0.45)))
  );

  const finalAoe = Math.round(
    (base.aoeRadius || 0) * (1 + tree.aoeRadiusPct + chipAoePct)
  );

  return {
    ...base,
    hp: finalHp,
    atk: finalAtk,
    atkSpeed: finalAtkSpeed,
    range: base.range,
    speed: base.speed,
    armor: clamp(base.armor || 0, 0, 0.78),
    armorPierce: clamp((base.armorPierce || 0) + chipPierceBonus + pierceSpecialist, 0, 0.95),
    aoeRadius: finalAoe,
    cost: finalCost,
    cooldown: finalCooldown,
    critRate: clamp(0.05 + (base.critBonus || 0) + tree.critRateBonus + game.roguelikeBuffs.critRate, 0, 0.85),
    critDmg: 1.5 + tree.critDmgBonus,
    lifesteal: chipLifesteal,
    burnDps: (base.burnDps || 0) * (1 + tree.burnDmgPct),
    slowPct: clamp((base.slowPct || 0) + (base.slowPct ? tree.slowEffectBonus : 0), 0, 0.75)
  };
}

/* --------------------------------------------------------------------------
 * 2. LỚP THỰC THỂ CHIẾN ĐẤU (UNIT, ZOMBIE, BOSS, SKELETON, TARGET DUMMY)
 * -------------------------------------------------------------------------- */
class Combatant {
  constructor(opts) {
    this.id = opts.id;
    this.name = opts.name || opts.id;
    this.side = opts.side || 'blue'; // 'blue' (tiến từ dưới lên) | 'red' (tiến từ trên xuống)
    this.movementType = opts.movementType || 'ground';
    this.spriteKey = opts.spriteKey || opts.id;
    this.projectileKey = opts.projectileKey || 'proj_bullet';

    this.x = opts.x;
    this.y = opts.y;

    this.maxHp = Math.max(1, Math.round(opts.hp || 100));
    this.hp = this.maxHp;
    this.atk = Math.max(1, Math.round(opts.atk || 10));
    this.atkSpeed = Math.max(0.2, opts.atkSpeed || 1.0);
    this.range = opts.range || 60;
    this.speed = opts.speed || 50;
    this.armor = opts.armor || 0;
    this.armorPierce = opts.armorPierce || 0;
    this.aoeRadius = opts.aoeRadius || 0;

    this.critRate = opts.critRate || 0.05;
    this.critDmg = opts.critDmg || 1.5;
    this.lifesteal = opts.lifesteal || 0;
    this.burnDps = opts.burnDps || 0;
    this.slowPct = opts.slowPct || 0;
    this.healAmount = opts.healAmount || 0;
    this.summonInterval = opts.summonInterval || 0;

    this.deployCost = opts.cost || 0;
    this.rewardCoins = opts.rewardCoins || 5;
    this.expValue = opts.exp || 8;
    this.isBoss = Boolean(opts.isBoss);
    this.isZombie = Boolean(opts.isZombie);
    this.isSuicideBomber = Boolean(opts.isSuicideBomber);
    this.isTargetDummy = Boolean(opts.isTargetDummy);

    // Trạng thái hoạt ảnh lưới 2x2: 0 = Idle, 1 = Move 1, 2 = Move 2, 3 = Attack
    this.animFrame = 0;
    this.animTimer = 0;
    this.attackAnimTimer = 0;
    this.atkCooldown = 0;
    this.summonTimer = this.summonInterval > 0 ? this.summonInterval * 0.5 : 0;

    // Hiệu ứng khống chế & sát thương theo thời gian
    this.stunTimer = 0;
    this.slowTimer = 0;
    this.slowStrength = 0;
    this.burnTimer = 0;
    this.burnTickDps = 0;
    this.burnTickAcc = 0;

    // Đường đi A* tránh nước (Phần 4)
    this.waypoints = [];
    this.repathTimer = 0;
    this.dead = false;
  }

  /**
   * Tìm mục tiêu gần nhất (đơn vị đối phương hoặc Mansion đối phương)
   */
  acquireTarget(opponents, targetMansion) {
    let bestTarget = null;
    let bestDist = Infinity;

    for (let i = 0; i < opponents.length; i++) {
      const opp = opponents[i];
      if (opp.dead) continue;
      // Đơn vị cận chiến tầm ngắn (< 80px) không đánh được đơn vị bay trên không
      if (opp.movementType === 'air' && this.range < 80) continue;

      const d = dist(this.x, this.y, opp.x, opp.y);
      if (d < bestDist) {
        bestDist = d;
        bestTarget = opp;
      }
    }

    // So sánh với khoảng cách hiệu dụng tới vùng va chạm (hitbox) của Mansion đối phương (Phần 2)
    if (targetMansion && !this.isTargetDummy) {
      const mansionEffDist = getMansionEffectiveDistance(this.x, this.y, targetMansion);
      if (!bestTarget || mansionEffDist <= Math.min(this.range, bestDist)) {
        return { type: 'mansion', mansion: targetMansion, distance: mansionEffDist };
      }
    }

    if (bestTarget) {
      return { type: 'unit', unit: bestTarget, distance: bestDist };
    }

    return null;
  }

  update(dt, navGrid) {
    if (this.dead || this.isTargetDummy) return;

    // 1. Cập nhật hiệu ứng Thiêu đốt (Burn DoT)
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.burnTickAcc += dt;
      if (this.burnTickAcc >= 0.5) {
        this.burnTickAcc -= 0.5;
        this.takeDamage(Math.max(1, Math.round(this.burnTickDps * 0.5)), null, false, '#FB923C');
      }
    }

    // 2. Cập nhật làm chậm & choáng EMP
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowStrength = 0;
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.animFrame = 0;
      return;
    }

    // 3. Hệ số tốc độ từ Blitzkrieg [R], Cuồng Nộ Chiến Trường (Ult Nhánh 2) & Làm chậm
    const tree = getSkillTreeBonuses();
    let speedMult = 1.0;
    let atkSpdMult = 1.0;

    if (this.side === 'blue') {
      if (game.blitzTimer > 0) {
        speedMult += COMMANDER_SKILLS.R.spdBonus;
        atkSpdMult += COMMANDER_SKILLS.R.spdBonus;
      }
      // Tối thượng Nhánh 2: Cuồng Nộ Chiến Trường khi HP Mansion Xanh < 50%
      if (tree.lowHpFrenzyPct > 0 && game.playerHp < game.playerMaxHp * 0.5) {
        atkSpdMult += tree.lowHpFrenzyPct;
      }
    }

    if (this.slowTimer > 0) {
      speedMult *= Math.max(0.2, 1 - this.slowStrength);
      atkSpdMult *= Math.max(0.35, 1 - this.slowStrength * 0.6);
    }

    // 4. Kỹ năng đặc biệt: Triệu hồi Xương / Xác Sống (Necromancer & Necrolord)
    if (this.summonInterval > 0) {
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        const cdRed = this.side === 'blue' ? clamp(tree.summonCdRedPct, 0, 0.5) : 0;
        this.summonTimer = this.summonInterval * (1 - cdRed);
        this.performSummon(navGrid);
      }
    }

    // 5. Kỹ năng đặc biệt: Hồi máu đồng minh (Thánh Sư Cleric)
    if (this.healAmount > 0 && this.atkCooldown <= 0) {
      const healed = this.performAllyHeal(tree);
      if (healed) {
        this.atkCooldown = 1 / (this.atkSpeed * atkSpdMult);
        this.attackAnimTimer = 0.32;
        this.animFrame = 3;
        return;
      }
    }

    // 6. Tìm mục tiêu & Ra đòn nếu nằm trong tầm bắn
    const opponents = this.side === 'blue' ? game.enemies : game.units;
    const targetMansion = this.side === 'blue' ? game.redMansion : game.blueMansion;
    const targetInfo = this.acquireTarget(opponents, targetMansion);

    if (this.atkCooldown > 0) {
      this.atkCooldown -= dt;
    }

    if (targetInfo && targetInfo.distance <= this.range) {
      // Đã vào tầm bắn -> Dừng bước và khai hỏa
      if (this.atkCooldown <= 0) {
        this.atkCooldown = 1 / (this.atkSpeed * atkSpdMult);
        this.attackAnimTimer = 0.34;
        this.executeAttack(targetInfo);
      }
      this.animFrame = this.attackAnimTimer > 0 ? 3 : 0;
      if (this.attackAnimTimer > 0) this.attackAnimTimer -= dt;
      return;
    }

    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer -= dt;
      this.animFrame = 3;
      return;
    }

    // 7. Di chuyển theo lộ trình A* né nước & qua cầu (Phần 4)
    this.moveAlongNavPath(dt, speedMult, targetInfo, targetMansion, navGrid);
  }

  moveAlongNavPath(dt, speedMult, targetInfo, targetMansion, navGrid) {
    // Xác định điểm đến chiến thuật
    let goalX = targetMansion ? targetMansion.centerX : this.x;
    let goalY = targetMansion ? targetMansion.centerY : (this.side === 'blue' ? 95 : game.mapHeight - 95);

    if (targetInfo && targetInfo.type === 'unit') {
      goalX = targetInfo.unit.x;
      goalY = targetInfo.unit.y;
    } else if (this.side === 'blue' && game.rallyPoint && game.rallyPoint.ttl > 0) {
      goalX = game.rallyPoint.x;
      goalY = game.rallyPoint.y;
    }

    // Cập nhật lộ trình A* định kỳ mỗi 0.55s hoặc khi hết waypoint
    this.repathTimer -= dt;
    if (navGrid && (this.repathTimer <= 0 || this.waypoints.length === 0)) {
      this.repathTimer = 0.55 + Math.random() * 0.2;
      this.waypoints = navGrid.findPathAStar(this.x, this.y, goalX, goalY, this.movementType);
    }

    let nextTargetX = goalX;
    let nextTargetY = goalY;

    if (this.waypoints.length > 0) {
      const wp = this.waypoints[0];
      if (dist(this.x, this.y, wp.x, wp.y) < 14) {
        this.waypoints.shift();
      }
      if (this.waypoints.length > 0) {
        nextTargetX = this.waypoints[0].x;
        nextTargetY = this.waypoints[0].y;
      }
    }

    const dx = nextTargetX - this.x;
    const dy = nextTargetY - this.y;
    const d = Math.hypot(dx, dy);

    if (d > 1) {
      const step = this.speed * speedMult * dt;
      const rawNextX = this.x + (dx / d) * step;
      const rawNextY = this.y + (dy / d) * step;

      // Lớp kiểm tra va chạm cứng: Chặn tuyệt đối đơn vị ground lội xuống nước (Phần 4)
      if (navGrid) {
        const resolved = navGrid.resolveHardCollision(this.x, this.y, rawNextX, rawNextY, this.movementType);
        this.x = resolved.x;
        this.y = resolved.y;
        if (resolved.blockedByWater) {
          this.repathTimer = 0; // Tính lại đường vòng qua cầu ngay ở frame kế tiếp
        }
      } else {
        this.x = clamp(rawNextX, 16, game.mapWidth - 16);
        this.y = clamp(rawNextY, 24, game.mapHeight - 24);
      }

      // Chuyển đổi hoạt ảnh bước chân Move 1 (Frame 1) <-> Move 2 (Frame 2)
      this.animTimer += dt * speedMult;
      if (this.animTimer >= 0.22) {
        this.animTimer = 0;
        this.animFrame = this.animFrame === 1 ? 2 : 1;
      } else if (this.animFrame === 0 || this.animFrame === 3) {
        this.animFrame = 1;
      }
    } else {
      this.animFrame = 0;
    }
  }

  executeAttack(targetInfo) {
    let finalAtk = this.atk;
    if (this.side === 'blue' && game.blitzTimer > 0) {
      finalAtk = Math.round(finalAtk * (1 + COMMANDER_SKILLS.R.atkBonus));
    }

    // Quái Cảm Tử Thùng Nổ (zombie_bomber): Phát nổ diện rộng ngay khi áp sát
    if (this.isSuicideBomber) {
      particlePool.spawnExplosion(this.x, this.y, this.aoeRadius || 78, '#FB923C');
      SoundFX.explosion();
      applyAreaDamage(this.x, this.y, this.aoeRadius || 78, finalAtk, this.side, this);
      if (targetInfo.type === 'mansion') {
        damageMansion(targetInfo.mansion.side, finalAtk);
      }
      this.dead = true;
      return;
    }

    // Xác định tọa độ đích của đạn
    let destX;
    let destY;
    let targetUnit = null;
    let targetMansionSide = null;

    if (targetInfo.type === 'unit') {
      targetUnit = targetInfo.unit;
      destX = targetUnit.x;
      destY = targetUnit.y;
    } else {
      // Bắn vào Mansion: Chọn điểm va chạm ngẫu nhiên ngay trên mái/tường tòa nhà (Phần 2)
      const impact = getRandomMansionImpactPoint(targetInfo.mansion);
      destX = impact.x;
      destY = impact.y;
      targetMansionSide = targetInfo.mansion.side;
    }

    // Tầm gần (< 75px) gây sát thương trực tiếp tức thì; tầm xa phóng đạn Pixel-Art
    if (this.range < 75 && this.id !== 'bazooka') {
      const isCrit = Math.random() < this.critRate;
      const dmg = Math.round(finalAtk * (isCrit ? this.critDmg : 1));
      if (targetUnit) {
        targetUnit.takeDamage(dmg, this, isCrit);
        if (this.aoeRadius > 0) {
          applyAreaDamage(targetUnit.x, targetUnit.y, this.aoeRadius, Math.round(dmg * 0.55), this.side, this, targetUnit);
        }
      } else if (targetMansionSide) {
        damageMansion(targetMansionSide, dmg);
        particlePool.spawnHitSpark(destX, destY, this.side === 'blue' ? '#38BDF8' : '#FB7185');
      }
      SoundFX.hit();
      return;
    }

    // Phóng đạn Pixel-Art xoay theo vector vận tốc
    const speed = this.projectileKey === 'proj_bullet' ? 420 : (this.projectileKey === 'proj_rocket' ? 310 : 270);
    const angle = Math.atan2(destY - (this.y - 16), destX - this.x);

    game.projectiles.push({
      x: this.x,
      y: this.y - 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      destX,
      destY,
      side: this.side,
      owner: this,
      targetUnit,
      targetMansionSide,
      projectileKey: this.projectileKey,
      damage: finalAtk,
      armorPierce: this.armorPierce,
      aoeRadius: this.aoeRadius,
      critRate: this.critRate,
      critDmg: this.critDmg,
      burnDps: this.burnDps,
      slowPct: this.slowPct,
      size: this.projectileKey === 'proj_shell' || this.projectileKey === 'proj_fireball' ? 28 : 22,
      life: 0,
      maxLife: 2.2,
      dead: false
    });

    SoundFX.shoot();
  }

  performAllyHeal(tree) {
    const allies = this.side === 'blue' ? game.units : game.enemies;
    const healVal = Math.round(this.healAmount * (1 + (this.side === 'blue' ? tree.healPowerPct : 0)));
    let healedAny = false;

    for (let i = 0; i < allies.length; i++) {
      const ally = allies[i];
      if (ally.dead || ally === this || ally.hp >= ally.maxHp) continue;
      if (dist(this.x, this.y, ally.x, ally.y) <= this.range) {
        ally.hp = Math.min(ally.maxHp, ally.hp + healVal);
        spawnFloatingCombatText(ally.x, ally.y - 26, `+${healVal}`, '#4ADE80', false);
        healedAny = true;
      }
    }
    return healedAny;
  }

  performSummon(navGrid) {
    const tree = getSkillTreeBonuses();
    if (this.side === 'blue') {
      const maxSkel = 3 + Math.round(tree.maxSkeletonBonus);
      const currentSkels = game.units.filter((u) => !u.dead && u.id === 'skeleton').length;
      if (currentSkels >= maxSkel) return;

      const skelStats = getEffectiveUnitStats('skeleton', 'blue');
      const spawnX = clamp(this.x + (Math.random() - 0.5) * 34, 24, game.mapWidth - 24);
      const spawnY = clamp(this.y - 14, 40, game.mapHeight - 40);
      if (navGrid && !navGrid.isWalkableAt(spawnX, spawnY, 'ground')) return;

      game.units.push(new Combatant({ ...skelStats, side: 'blue', x: spawnX, y: spawnY }));
      particlePool.spawnHitSpark(spawnX, spawnY, '#C084FC');
    } else {
      // Zombie Necrolord triệu hồi thêm Zombie Walker
      if (game.enemies.length >= 45) return;
      const walkerSpec = ZOMBIE_CATALOG[0];
      const scale = 1 + (game.stageLevel - 1) * 0.11;
      const spawnX = clamp(this.x + (Math.random() - 0.5) * 36, 24, game.mapWidth - 24);
      const spawnY = clamp(this.y + 14, 40, game.mapHeight - 40);
      if (navGrid && !navGrid.isWalkableAt(spawnX, spawnY, 'ground')) return;

      game.enemies.push(
        new Combatant({
          ...walkerSpec,
          side: 'red',
          isZombie: true,
          hp: Math.round(walkerSpec.hp * scale),
          atk: Math.round(walkerSpec.atk * scale),
          x: spawnX,
          y: spawnY
        })
      );
      particlePool.spawnHitSpark(spawnX, spawnY, '#A855F7');
    }
  }

  takeDamage(rawDamage, attacker = null, isCrit = false, customColor = null) {
    if (this.dead) return 0;

    // Bia tập bắn Sandbox (HP ∞) vẫn ghi nhận tổng sát thương để đo DPS
    if (this.isTargetDummy) {
      const dmg = Math.max(1, Math.round(rawDamage));
      if (typeof SandboxController !== 'undefined') {
        SandboxController.recordDamage(dmg);
      }
      spawnFloatingCombatText(
        this.x,
        this.y - 34,
        isCrit ? `CRIT ${dmg}!` : `-${dmg}`,
        customColor || (isCrit ? '#FACC15' : '#F8FAFC'),
        isCrit
      );
      return dmg;
    }

    const pierce = attacker ? (attacker.armorPierce || 0) : 0;
    const effectiveArmor = clamp(this.armor * (1 - pierce), 0, 0.85);
    const finalDmg = Math.max(1, Math.round(rawDamage * (1 - effectiveArmor)));

    this.hp -= finalDmg;

    // Hút máu từ Chip Vampiric Fang của kẻ tấn công
    if (attacker && attacker.lifesteal > 0 && !attacker.dead) {
      const heal = Math.max(1, Math.round(finalDmg * attacker.lifesteal));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    }

    const textColor = customColor || (isCrit ? '#FACC15' : (this.side === 'red' ? '#F8FAFC' : '#FB7185'));
    spawnFloatingCombatText(
      this.x,
      this.y - 28,
      isCrit ? `💥${finalDmg}` : `-${finalDmg}`,
      textColor,
      isCrit
    );

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.onDeath();
    }
    return finalDmg;
  }

  onDeath() {
    const tree = getSkillTreeBonuses();
    particlePool.spawnExplosion(this.x, this.y, this.isBoss ? 68 : 30, this.side === 'blue' ? '#38BDF8' : '#FB7185');

    if (this.side === 'blue') {
      // Hoàn Xăng khi hy sinh (Talent battlefield_harvest 15% + Nhánh 3 deathGasRefundPct)
      const harvestLv = Number(metaState.metaTalents.battlefield_harvest) || 0;
      const refundPct = (harvestLv > 0 ? 0.15 : 0) + (tree.deathGasRefundPct || 0);
      if (refundPct > 0 && this.deployCost > 0) {
        const gasBack = this.deployCost * refundPct;
        game.gas = Math.min(game.maxGas, game.gas + gasBack);
        spawnFloatingCombatText(this.x, this.y - 16, `+${gasBack.toFixed(1)}⛽`, '#FACC15', false);
      }
    } else {
      // Kẻ địch bị tiêu diệt: Cộng thống kê nhiệm vụ, EXP Roguelike & Coins
      metaState.stats.totalKills = (metaState.stats.totalKills || 0) + 1;
      grantBattleExp(this.expValue || 10);

      const coinGain = Math.round((this.rewardCoins || 5) * (1 + tree.coinRewardPct));
      if (coinGain > 0) {
        addCurrency('coins', coinGain);
      }

      // Tối thượng Nhánh 3 (Huyết Tế Hấp Thụ): Quân đồng minh xung quanh hồi 5%/lv HP tối đa
      if (tree.bloodSiphonPct > 0) {
        for (let i = 0; i < game.units.length; i++) {
          const ally = game.units[i];
          if (ally.dead) continue;
          if (dist(this.x, this.y, ally.x, ally.y) <= 135) {
            const healAmt = Math.max(2, Math.round(ally.maxHp * tree.bloodSiphonPct));
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
          }
        }
      }
    }
  }
}

/* --------------------------------------------------------------------------
 * 3. SÁT THƯƠNG MANSION & DIỆN RỘNG (AOE)
 * -------------------------------------------------------------------------- */
function damageMansion(mansionSide, rawDamage) {
  const tree = getSkillTreeBonuses();
  if (mansionSide === 'blue') {
    const reduced = Math.max(1, Math.round(rawDamage * (1 - clamp(tree.baseArmorPct, 0, 0.65))));
    let remaining = reduced;

    // Ưu tiên trừ vào Lớp Giáp Ảo Pháo Đài (Ult Nhánh 1) trước
    if (game.playerShield > 0) {
      const absorbed = Math.min(game.playerShield, remaining);
      game.playerShield -= absorbed;
      remaining -= absorbed;
    }
    if (remaining > 0) {
      game.playerHp = Math.max(0, game.playerHp - remaining);
      spawnFloatingCombatText(game.blueMansion.centerX, game.blueMansion.centerY - 25, `-${remaining}`, '#FB7185', false);
    }
  } else {
    const dmg = Math.max(1, Math.round(rawDamage));
    game.enemyHp = Math.max(0, game.enemyHp - dmg);
    spawnFloatingCombatText(game.redMansion.centerX, game.redMansion.centerY + 25, `-${dmg}`, '#FACC15', false);
  }
}

function applyAreaDamage(cx, cy, radius, damage, attackerSide, attacker = null, excludeUnit = null) {
  const targets = attackerSide === 'blue' ? game.enemies : game.units;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (t.dead || t === excludeUnit) continue;
    if (dist(cx, cy, t.x, t.y) <= radius) {
      t.takeDamage(damage, attacker, false);
    }
  }
}

function grantBattleExp(amount) {
  game.battleExp += amount;
  while (game.battleExp >= game.nextLvExp) {
    game.battleExp -= game.nextLvExp;
    game.battleLv += 1;
    game.nextLvExp = Math.round(game.nextLvExp * 1.28);
    game.pendingLevelUps += 1;
  }
}

/* --------------------------------------------------------------------------
 * 4. CẬP NHẬT Ụ PHÁO XOAY 360° TRÊN NÓC MANSION XANH (PHẦN 1.2)
 * -------------------------------------------------------------------------- */
function updateMountedTurret(dt) {
  if (!game.blueMansion) return;
  const spec = TURRET_CATALOG.find((t) => t.id === game.turret.id) || TURRET_CATALOG[0];
  const tState = metaState.turrets[spec.id] || { level: 1 };
  const tree = getSkillTreeBonuses();

  // Giảm dần độ giật nòng pháo
  if (game.turret.recoil > 0) {
    game.turret.recoil = Math.max(0, game.turret.recoil - dt * 24);
  }

  if (game.turret.cooldown > 0) {
    game.turret.cooldown -= dt;
  }

  const mountX = game.blueMansion.centerX;
  const mountY = game.blueMansion.centerY + (MANSION_CONFIG.blue.turretOffsetY || -22);
  const effectiveRange = spec.range * (1 + (tree.turretAtkPct > 0.5 ? 0.1 : 0));

  // Tìm kẻ địch gần nhất trong tầm bắn của ụ pháo
  let nearestEnemy = null;
  let nearestDist = effectiveRange;

  for (let i = 0; i < game.enemies.length; i++) {
    const e = game.enemies[i];
    if (e.dead) continue;
    const d = dist(mountX, mountY, e.x, e.y);
    if (d <= nearestDist) {
      nearestDist = d;
      nearestEnemy = e;
    }
  }

  if (!nearestEnemy) return;

  // Xoay nòng pháo mượt mà hướng thẳng về mục tiêu
  const targetAngle = Math.atan2(nearestEnemy.y - mountY, nearestEnemy.x - mountX);
  game.turret.angle = targetAngle;

  if (game.turret.cooldown <= 0) {
    const lvMult = 1 + (tState.level - 1) * 0.18;
    const atkSpd = spec.atkSpeed * (1 + tree.turretSpdPct);
    const dmg = Math.round(spec.atk * lvMult * (1 + tree.turretAtkPct));

    game.turret.cooldown = 1 / atkSpd;
    game.turret.recoil = 5.5;

    const projSpeed = 450;
    const barrelLen = 20;
    const spawnX = mountX + Math.cos(targetAngle) * barrelLen;
    const spawnY = mountY + Math.sin(targetAngle) * barrelLen;

    game.projectiles.push({
      x: spawnX,
      y: spawnY,
      vx: Math.cos(targetAngle) * projSpeed,
      vy: Math.sin(targetAngle) * projSpeed,
      destX: nearestEnemy.x,
      destY: nearestEnemy.y,
      side: 'blue',
      owner: null,
      targetUnit: nearestEnemy,
      targetMansionSide: null,
      projectileKey: spec.projectileKey,
      damage: dmg,
      armorPierce: spec.armorPierce || 0.15,
      aoeRadius: Math.round((spec.aoeRadius || 0) * (1 + tree.aoeRadiusPct)),
      critRate: 0.05 + tree.critRateBonus,
      critDmg: 1.5 + tree.critDmgBonus,
      burnDps: 0,
      slowPct: spec.slowPct || 0,
      size: spec.projectileKey === 'proj_rocket' ? 24 : 20,
      life: 0,
      maxLife: 1.5,
      dead: false
    });

    SoundFX.shoot();
  }
}

/* --------------------------------------------------------------------------
 * 5. CẬP NHẬT ĐẠN PHÁO & PHÉP THUẬT (PROJECTILES)
 * -------------------------------------------------------------------------- */
function updateProjectiles(dt) {
  const tree = getSkillTreeBonuses();

  for (let i = 0; i < game.projectiles.length; i++) {
    const p = game.projectiles[i];
    if (p.dead) continue;

    p.life += dt;
    if (p.life >= p.maxLife) {
      p.dead = true;
      continue;
    }

    // Cập nhật vector đuổi mục tiêu nếu mục tiêu di động vẫn còn sống
    if (p.targetUnit && !p.targetUnit.dead) {
      p.destX = p.targetUnit.x;
      p.destY = p.targetUnit.y - 12;
      const spd = Math.hypot(p.vx, p.vy) || 320;
      const ang = Math.atan2(p.destY - p.y, p.destX - p.x);
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Kiểm tra va chạm với đích đến
    const distToDest = dist(p.x, p.y, p.destX, p.destY);
    const hitMansionBox =
      p.targetMansionSide === 'red'
        ? isPointInsideMansion(p.x, p.y, game.redMansion)
        : p.targetMansionSide === 'blue'
          ? isPointInsideMansion(p.x, p.y, game.blueMansion)
          : false;

    if (distToDest <= 16 || hitMansionBox) {
      p.dead = true;
      const isCrit = Math.random() < (p.critRate || 0.05);
      let finalDmg = Math.round(p.damage * (isCrit ? (p.critDmg || 1.5) : 1));

      if (p.targetUnit && !p.targetUnit.dead) {
        // Tối thượng Nhánh 6 (Nhiệt Sốc Nguyên Tố): Chí mạng lên mục tiêu đang Cháy/Chậm gây +30%/lv sát thương nổ
        const hasElementalStatus = p.targetUnit.burnTimer > 0 || p.targetUnit.slowTimer > 0;
        if (isCrit && hasElementalStatus && tree.thermalShockPct > 0) {
          finalDmg = Math.round(finalDmg * (1 + tree.thermalShockPct));
          particlePool.spawnExplosion(p.x, p.y, 52, '#38BDF8');
        }

        p.targetUnit.takeDamage(finalDmg, p.owner, isCrit);

        if (p.burnDps > 0) {
          p.targetUnit.burnTimer = 3.0;
          p.targetUnit.burnTickDps = p.burnDps;
        }
        if (p.slowPct > 0) {
          p.targetUnit.slowTimer = 2.8;
          p.targetUnit.slowStrength = p.slowPct;
        }
      } else if (p.targetMansionSide) {
        damageMansion(p.targetMansionSide, finalDmg);
      }

      if (p.aoeRadius > 0) {
        const boomColor =
          p.projectileKey === 'proj_fireball'
            ? '#FB923C'
            : p.projectileKey === 'proj_iceshard'
              ? '#38BDF8'
              : '#FACC15';
        particlePool.spawnExplosion(p.x, p.y, p.aoeRadius, boomColor);
        applyAreaDamage(p.x, p.y, p.aoeRadius, Math.round(finalDmg * 0.65), p.side, p.owner, p.targetUnit);
        SoundFX.explosion();
      } else {
        particlePool.spawnHitSpark(p.x, p.y, p.side === 'blue' ? '#38BDF8' : '#FB7185');
      }
    }
  }
}

/* --------------------------------------------------------------------------
 * 6. KỸ NĂNG CHỈ HUY (Q-W-E-R) & VẬT THỂ MẶT ĐẤT (MÌN, HÒM DÙ)
 * -------------------------------------------------------------------------- */
function activateCommanderSkill(slotKey) {
  const key = String(slotKey || '').toUpperCase();
  const spec = COMMANDER_SKILLS[key];
  if (!spec || !game.active || game.paused) return false;

  if ((game.skillCooldowns[key] || 0) > 0) return false;

  const tree = getSkillTreeBonuses();
  const cdRed = clamp(tree.skillCdRedPct, 0, 0.55);
  game.skillCooldowns[key] = spec.cooldown * (1 - cdRed);
  SoundFX.skill();

  if (key === 'Q') {
    // Thả Dù Tiếp Viện: Đặt prop_airdrop_crate + triệu hồi 3 Bộ Binh + hồi Xăng
    const dropX = game.blueMansion.centerX + (Math.random() - 0.5) * 80;
    const dropY = game.blueMansion.centerY - 95;
    game.props.push({
      propKey: 'prop_airdrop_crate',
      type: 'airdrop',
      x: dropX,
      y: dropY,
      ttl: 4.5,
      dead: false
    });

    const gasGain = 35 + Math.round(tree.airdropGasBonus);
    game.gas = Math.min(game.maxGas, game.gas + gasGain);
    spawnFloatingCombatText(dropX, dropY - 22, `+${gasGain} Xăng!`, '#FACC15', true);

    const infStats = getEffectiveUnitStats('infantry', 'blue');
    for (let i = -1; i <= 1; i++) {
      game.units.push(
        new Combatant({
          ...infStats,
          side: 'blue',
          x: clamp(dropX + i * 24, 24, game.mapWidth - 24),
          y: dropY + 12
        })
      );
    }
  } else if (key === 'W') {
    // Rải Bãi Mìn Chống Tăng: Đặt prop_landmine ngang phòng tuyến
    const mineCount = spec.baseMines + Math.round(tree.extraMinesCount);
    const mineDmg = Math.round(spec.damage * (1 + (tree.extraMinesCount || 0) * 0.15));
    const lineY = game.blueMansion.centerY - 125;

    for (let i = 0; i < mineCount; i++) {
      const ratio = (i + 1) / (mineCount + 1);
      const mx = 36 + ratio * (game.mapWidth - 72);
      const my = lineY + (i % 2 === 0 ? -10 : 10);
      game.props.push({
        propKey: 'prop_landmine',
        type: 'mine',
        x: mx,
        y: my,
        damage: mineDmg,
        radius: spec.radius,
        ttl: 30,
        dead: false
      });
    }
    spawnFloatingCombatText(game.blueMansion.centerX, lineY - 20, `Rải ${mineCount} Mìn!`, '#4ADE80', true);
  } else if (key === 'E') {
    // Xung Điện Từ EMP: Làm choáng toàn bộ kẻ địch trên sân
    const stunDur = spec.baseStun + tree.empStunBonus;
    particlePool.spawnExplosion(game.mapWidth * 0.5, game.mapHeight * 0.48, 190, '#38BDF8');

    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      if (e.dead) continue;
      e.stunTimer = Math.max(e.stunTimer, stunDur);
      e.takeDamage(spec.damage, null, false, '#38BDF8');
    }
    spawnFloatingCombatText(game.mapWidth * 0.5, game.mapHeight * 0.45, `⚡ EMP (${stunDur.toFixed(1)}s)!`, '#38BDF8', true);
  } else if (key === 'R') {
    // Tổng Tấn Công Blitzkrieg
    const dur = spec.duration + tree.blitzDurationBonus;
    game.blitzTimer = dur;
    particlePool.spawnExplosion(game.blueMansion.centerX, game.blueMansion.centerY - 60, 140, '#FACC15');
    spawnFloatingCombatText(game.blueMansion.centerX, game.blueMansion.centerY - 70, `🔥 BLITZKRIEG (${dur.toFixed(1)}s)!`, '#FACC15', true);
  }

  // Tối thượng Nhánh 5 (Không Kích Yểm Trợ): Tỷ lệ gọi thêm phi đội Tiêm Kích ném bom
  if (tree.airstrikeProcChance > 0 && Math.random() < tree.airstrikeProcChance) {
    const strikeX = game.redMansion.centerX + (Math.random() - 0.5) * 90;
    const strikeY = game.redMansion.centerY + 90;
    particlePool.spawnExplosion(strikeX, strikeY, 110, '#FB7185');
    applyAreaDamage(strikeX, strikeY, 110, 320, 'blue', null);
    damageMansion('red', 180);
    spawnFloatingCombatText(strikeX, strikeY - 20, '✈️ KHÔNG KÍCH!', '#FACC15', true);
  }

  return true;
}

function updateBattleProps(dt) {
  for (let i = 0; i < game.props.length; i++) {
    const prop = game.props[i];
    if (prop.dead) continue;

    prop.ttl -= dt;
    if (prop.ttl <= 0) {
      prop.dead = true;
      continue;
    }

    if (prop.type === 'mine') {
      // Kiểm tra kẻ địch dẫm phải mìn
      for (let j = 0; j < game.enemies.length; j++) {
        const e = game.enemies[j];
        if (e.dead || e.movementType === 'air') continue;
        if (dist(prop.x, prop.y, e.x, e.y) <= 24) {
          prop.dead = true;
          particlePool.spawnExplosion(prop.x, prop.y, prop.radius || 56, '#FB923C');
          SoundFX.explosion();
          applyAreaDamage(prop.x, prop.y, prop.radius || 56, prop.damage || 240, 'blue', null);
          break;
        }
      }
    }
  }
}

/* --------------------------------------------------------------------------
 * 7. BỘ SINH ĐỢT QUÁI HỖN HỢP CAMPAIGN + CHALLENGE (WAVE SPAWNER - PHẦN 6)
 * -------------------------------------------------------------------------- */
const WaveSpawner = {
  update(dt, navGrid) {
    if (game.spawnQueue.length > 0) {
      const next = game.spawnQueue[0];
      next.delay -= dt;
      if (next.delay <= 0) {
        game.spawnQueue.shift();
        this.spawnSingleEnemy(next, navGrid);
      }
      return;
    }

    game.waveTimer -= dt;
    if (game.waveTimer <= 0) {
      if (game.wave <= game.maxWaves) {
        this.enqueueWave(game.wave);
        game.wave += 1;
        game.waveTimer = game.mode === 'challenge' ? 11.5 : 13.0;
      } else if (game.mode === 'endless') {
        game.maxWaves += 1;
        this.enqueueWave(game.wave);
        game.wave += 1;
        game.waveTimer = 11.0;
      }
    }
  },

  enqueueWave(waveNum) {
    const stage = STAGE_CATALOG[clamp(game.stageLevel - 1, 0, STAGE_CATALOG.length - 1)];
    const level = stage.level;

    // CHẾ ĐỘ CHALLENGE: Toàn bộ Zombie + Boss mỗi 5 Wave
    if (game.mode === 'challenge') {
      const count = 6 + waveNum * 2;
      const availableZombies = ZOMBIE_CATALOG.slice(0, Math.min(ZOMBIE_CATALOG.length, 2 + Math.floor(waveNum / 3)));
      for (let i = 0; i < count; i++) {
        const z = availableZombies[Math.floor(Math.random() * availableZombies.length)];
        game.spawnQueue.push({
          kind: 'zombie',
          specId: z.id,
          delay: i * 0.55,
          hpScale: 1 + (level - 1) * 0.14 + (waveNum - 1) * 0.12
        });
      }
      if (waveNum % 5 === 0) {
        const bossSpec = BOSS_CATALOG[Math.min(BOSS_CATALOG.length - 1, Math.floor(waveNum / 5) - 1)];
        game.spawnQueue.push({
          kind: 'boss',
          specId: bossSpec.id,
          delay: 1.5,
          hpScale: 1 + (level - 1) * 0.15
        });
      }
      return;
    }

    // CHẾ ĐỘ RAID BOSS / BOSS RUSH
    if (game.mode === 'raid' || game.mode === 'bossrush') {
      const bossSpec =
        game.mode === 'raid'
          ? BOSS_CATALOG[3] // Leviathan Raid Boss
          : BOSS_CATALOG[(waveNum - 1) % BOSS_CATALOG.length];
      game.spawnQueue.push({
        kind: 'boss',
        specId: bossSpec.id,
        delay: 0.6,
        hpScale: 1 + (level - 1) * 0.14
      });
    }

    // CHẾ ĐỘ CAMPAIGN THƯỜNG (54 MÀN) & CÁC CHẾ ĐỘ KHÁC:
    // Trộn đội hình Binh Chủng Phe Đỏ + Nhóm Zombie đột kích theo tiến trình Level (Phần 6)
    const maxUnitTier = Math.min(UNIT_CATALOG.length, 3 + Math.floor(level / 3));
    const redUnitPool =
      game.mode === 'mirror'
        ? metaState.battleDeck.filter(Boolean)
        : UNIT_CATALOG.slice(0, maxUnitTier).map((u) => u.id);

    const redCount = 3 + Math.floor(waveNum * 1.5) + Math.floor(level / 12);
    for (let i = 0; i < redCount; i++) {
      const uid = redUnitPool[Math.floor(Math.random() * redUnitPool.length)] || 'infantry';
      game.spawnQueue.push({
        kind: 'unit',
        specId: uid,
        delay: i * 0.85,
        hpScale: 1.0
      });
    }

    // Chèn thêm nhóm Zombie đột kích vào giữa & cuối đợt tấn công Campaign (Phần 6)
    const zombiePoolIds = getCampaignZombiePool(level);
    const zombieCount = 2 + Math.floor(waveNum * 1.2) + Math.floor(level / 10);
    for (let z = 0; z < zombieCount; z++) {
      const zid = zombiePoolIds[Math.floor(Math.random() * zombiePoolIds.length)];
      game.spawnQueue.push({
        kind: 'zombie',
        specId: zid,
        delay: 0.65,
        hpScale: 1 + (level - 1) * 0.12
      });
    }

    // Triệu hồi Trùm Cuối ở Wave cuối của các ải Boss (Level 9, 18, 27, 36, 45, 54)
    if (stage.bossId && waveNum === game.maxWaves) {
      game.spawnQueue.push({
        kind: 'boss',
        specId: stage.bossId,
        delay: 1.5,
        hpScale: 1 + (level - 1) * 0.12
      });
    }
  },

  spawnSingleEnemy(item, navGrid) {
    // Vị trí xuất phát ở cửa Mansion Đỏ phía trên bản đồ
    const baseX = game.redMansion ? game.redMansion.centerX : game.mapWidth * 0.5;
    const baseY = game.redMansion ? game.redMansion.bottom + 14 : 145;
    let spawnX = clamp(baseX + (Math.random() - 0.5) * 90, 28, game.mapWidth - 28);
    let spawnY = baseY;

    if (item.kind === 'unit') {
      const stats = getEffectiveUnitStats(item.specId, 'red', game.stageLevel);
      if (!stats) return;
      if (navGrid && stats.movementType === 'ground' && !navGrid.isWalkableAt(spawnX, spawnY, 'ground')) {
        spawnX = baseX;
      }
      game.enemies.push(new Combatant({ ...stats, side: 'red', x: spawnX, y: spawnY }));
    } else if (item.kind === 'zombie') {
      const zSpec = ZOMBIE_CATALOG.find((z) => z.id === item.specId) || ZOMBIE_CATALOG[0];
      const sc = item.hpScale || 1;
      game.enemies.push(
        new Combatant({
          ...zSpec,
          side: 'red',
          isZombie: true,
          hp: Math.round(zSpec.hp * sc),
          atk: Math.round(zSpec.atk * sc),
          x: spawnX,
          y: spawnY
        })
      );
    } else if (item.kind === 'boss') {
      const bSpec = BOSS_CATALOG.find((b) => b.id === item.specId) || BOSS_CATALOG[0];
      const sc = item.hpScale || 1;
      game.enemies.push(
        new Combatant({
          ...bSpec,
          side: 'red',
          isBoss: true,
          hp: Math.round(bSpec.hp * sc),
          atk: Math.round(bSpec.atk * sc),
          x: baseX,
          y: baseY
        })
      );
    }
  }
};