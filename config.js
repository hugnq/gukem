/**
 * ============================================================================
 * TINY BATTLE - CONFIGURATION & GAME DATA (js/config.js)
 * Kiến trúc Pixel-Art Asset chuẩn hóa, 54 Maps, 6-Branch Skill Tree & Mixed Waves
 * ============================================================================
 */

'use strict';

/* --------------------------------------------------------------------------
 * 1. DANH MỤC NẠP ASSET TRUNG TÂM (112 ASSETS TRONG 9 THƯ MỤC)
 * Quy ước:
 * - sprites2x2: Tự động tách nền #00FF00, khử viền xanh, lọc rác góc, cắt lưới 2x2
 * - singleChroma: Tách nền #00FF00 + lọc rác góc, giữ nguyên 1 khung hình
 * - fullOpaque: Ảnh nền bản đồ / sảnh giữ nguyên toàn bộ pixel
 * -------------------------------------------------------------------------- */
const ASSET_MANIFEST = {
  maps: {
    World_map: { path: 'assets/maps/World_map', mode: 'fullOpaque' },
    // Vùng 1: Thảo Nguyên Xanh (map1 -> map9)
    map1:  { path: 'assets/maps/biome_1/map1',  mode: 'fullOpaque' },
    map2:  { path: 'assets/maps/biome_1/map2',  mode: 'fullOpaque' },
    map3:  { path: 'assets/maps/biome_1/map3',  mode: 'fullOpaque' },
    map4:  { path: 'assets/maps/biome_1/map4',  mode: 'fullOpaque' },
    map5:  { path: 'assets/maps/biome_1/map5',  mode: 'fullOpaque' },
    map6:  { path: 'assets/maps/biome_1/map6',  mode: 'fullOpaque' },
    map7:  { path: 'assets/maps/biome_1/map7',  mode: 'fullOpaque' },
    map8:  { path: 'assets/maps/biome_1/map8',  mode: 'fullOpaque' },
    map9:  { path: 'assets/maps/biome_1/map9',  mode: 'fullOpaque' },
    // Vùng 2: Hẻm Núi Hoang Mạc (map10 -> map18)
    map10: { path: 'assets/maps/biome_2/map10', mode: 'fullOpaque' },
    map11: { path: 'assets/maps/biome_2/map11', mode: 'fullOpaque' },
    map12: { path: 'assets/maps/biome_2/map12', mode: 'fullOpaque' },
    map13: { path: 'assets/maps/biome_2/map13', mode: 'fullOpaque' },
    map14: { path: 'assets/maps/biome_2/map14', mode: 'fullOpaque' },
    map15: { path: 'assets/maps/biome_2/map15', mode: 'fullOpaque' },
    map16: { path: 'assets/maps/biome_2/map16', mode: 'fullOpaque' },
    map17: { path: 'assets/maps/biome_2/map17', mode: 'fullOpaque' },
    map18: { path: 'assets/maps/biome_2/map18', mode: 'fullOpaque' },
    // Vùng 3: Lãnh Nguyên Băng Giá (map19 -> map27)
    map19: { path: 'assets/maps/biome_3/map19', mode: 'fullOpaque' },
    map20: { path: 'assets/maps/biome_3/map20', mode: 'fullOpaque' },
    map21: { path: 'assets/maps/biome_3/map21', mode: 'fullOpaque' },
    map22: { path: 'assets/maps/biome_3/map22', mode: 'fullOpaque' },
    map23: { path: 'assets/maps/biome_3/map23', mode: 'fullOpaque' },
    map24: { path: 'assets/maps/biome_3/map24', mode: 'fullOpaque' },
    map25: { path: 'assets/maps/biome_3/map25', mode: 'fullOpaque' },
    map26: { path: 'assets/maps/biome_3/map26', mode: 'fullOpaque' },
    map27: { path: 'assets/maps/biome_3/map27', mode: 'fullOpaque' },
    // Vùng 4: Miệng Núi Lửa Dung Nham (map28 -> map36)
    map28: { path: 'assets/maps/biome_4/map28', mode: 'fullOpaque' },
    map29: { path: 'assets/maps/biome_4/map29', mode: 'fullOpaque' },
    map30: { path: 'assets/maps/biome_4/map30', mode: 'fullOpaque' },
    map31: { path: 'assets/maps/biome_4/map31', mode: 'fullOpaque' },
    map32: { path: 'assets/maps/biome_4/map32', mode: 'fullOpaque' },
    map33: { path: 'assets/maps/biome_4/map33', mode: 'fullOpaque' },
    map34: { path: 'assets/maps/biome_4/map34', mode: 'fullOpaque' },
    map35: { path: 'assets/maps/biome_4/map35', mode: 'fullOpaque' },
    map36: { path: 'assets/maps/biome_4/map36', mode: 'fullOpaque' },
    // Vùng 5: Đầm Lầy Độc Tố Axit (map37 -> map45)
    map37: { path: 'assets/maps/biome_5/map37', mode: 'fullOpaque' },
    map38: { path: 'assets/maps/biome_5/map38', mode: 'fullOpaque' },
    map39: { path: 'assets/maps/biome_5/map39', mode: 'fullOpaque' },
    map40: { path: 'assets/maps/biome_5/map40', mode: 'fullOpaque' },
    map41: { path: 'assets/maps/biome_5/map41', mode: 'fullOpaque' },
    map42: { path: 'assets/maps/biome_5/map42', mode: 'fullOpaque' },
    map43: { path: 'assets/maps/biome_5/map43', mode: 'fullOpaque' },
    map44: { path: 'assets/maps/biome_5/map44', mode: 'fullOpaque' },
    map45: { path: 'assets/maps/biome_5/map45', mode: 'fullOpaque' },
    // Vùng 6: Thung Lũng Hoa Anh Đào (map46 -> map54 - tự động fallback .jpg)
    map46: { path: 'assets/maps/biome_6/map46', mode: 'fullOpaque' },
    map47: { path: 'assets/maps/biome_6/map47', mode: 'fullOpaque' },
    map48: { path: 'assets/maps/biome_6/map48', mode: 'fullOpaque' },
    map49: { path: 'assets/maps/biome_6/map49', mode: 'fullOpaque' },
    map50: { path: 'assets/maps/biome_6/map50', mode: 'fullOpaque' },
    map51: { path: 'assets/maps/biome_6/map51', mode: 'fullOpaque' },
    map52: { path: 'assets/maps/biome_6/map52', mode: 'fullOpaque' },
    map53: { path: 'assets/maps/biome_6/map53', mode: 'fullOpaque' },
    map54: { path: 'assets/maps/biome_6/map54', mode: 'fullOpaque' }
  },

  units: {
    infantry:       { path: 'assets/units/infantry',       mode: 'sprites2x2', recolorEnemy: true },
    bazooka:        { path: 'assets/units/bazooka',        mode: 'sprites2x2', recolorEnemy: true },
    sniper:         { path: 'assets/units/sniper',         mode: 'sprites2x2', recolorEnemy: true },
    humvee:         { path: 'assets/units/humvee',         mode: 'sprites2x2', recolorEnemy: true },
    apc:            { path: 'assets/units/apc',            mode: 'sprites2x2', recolorEnemy: true },
    tank:           { path: 'assets/units/tank',           mode: 'sprites2x2', recolorEnemy: true },
    heavy_tank:     { path: 'assets/units/heavy_tank',     mode: 'sprites2x2', recolorEnemy: true },
    heli:           { path: 'assets/units/heli',           mode: 'sprites2x2', recolorEnemy: true },
    patrol_boat:    { path: 'assets/units/patrol_boat',    mode: 'sprites2x2', recolorEnemy: true },
    destroyer:      { path: 'assets/units/destroyer',      mode: 'sprites2x2', recolorEnemy: true },
    battleship:     { path: 'assets/units/battleship',     mode: 'sprites2x2', recolorEnemy: true },
    pyromancer:     { path: 'assets/units/pyromancer',     mode: 'sprites2x2', recolorEnemy: true },
    cryomancer:     { path: 'assets/units/cryomancer',     mode: 'sprites2x2', recolorEnemy: true },
    cleric:         { path: 'assets/units/cleric',         mode: 'sprites2x2', recolorEnemy: true },
    necromancer:    { path: 'assets/units/necromancer',    mode: 'sprites2x2', recolorEnemy: true },
    mecha_paladin:  { path: 'assets/units/mecha_paladin',  mode: 'sprites2x2', recolorEnemy: true },
    railgun_walker: { path: 'assets/units/railgun_walker', mode: 'sprites2x2', recolorEnemy: true },
    skeleton:       { path: 'assets/units/skeleton',       mode: 'sprites2x2', recolorEnemy: true },
    airstrike:      { path: 'assets/units/airstrike',      mode: 'sprites2x2', recolorEnemy: true }
  },

  bosses: {
    boss_butcher:      { path: 'assets/bosses/boss_butcher',      mode: 'sprites2x2', recolorEnemy: false },
    boss_chimera:      { path: 'assets/bosses/boss_chimera',      mode: 'sprites2x2', recolorEnemy: false },
    boss_omega_tyrant: { path: 'assets/bosses/boss_omega_tyrant', mode: 'sprites2x2', recolorEnemy: false },
    raid_boss:         { path: 'assets/bosses/raid_boss',         mode: 'sprites2x2', recolorEnemy: false }
  },

  zombies: {
    zombie_walker:    { path: 'assets/zombies/zombie_walker',    mode: 'sprites2x2', recolorEnemy: false },
    zombie_runner:    { path: 'assets/zombies/zombie_runner',    mode: 'sprites2x2', recolorEnemy: false },
    zombie_brute:     { path: 'assets/zombies/zombie_brute',     mode: 'sprites2x2', recolorEnemy: false },
    zombie_spitter:   { path: 'assets/zombies/zombie_spitter',   mode: 'sprites2x2', recolorEnemy: false },
    zombie_bomber:    { path: 'assets/zombies/zombie_bomber',    mode: 'sprites2x2', recolorEnemy: false },
    zombie_necrolord: { path: 'assets/zombies/zombie_necrolord', mode: 'sprites2x2', recolorEnemy: false }
  },

  turrets: {
    turret_gatling: { path: 'assets/turrets/turret_gatling', mode: 'singleChroma' },
    turret_laser:   { path: 'assets/turrets/turret_laser',   mode: 'singleChroma' },
    turret_missile: { path: 'assets/turrets/turret_missile', mode: 'singleChroma' },
    turret_tesla:   { path: 'assets/turrets/turret_tesla',   mode: 'singleChroma' }
  },

  projectiles: {
    proj_bullet:   { path: 'assets/projectiles/proj_bullet',   mode: 'singleChroma', baseAngleOffset: Math.PI / 4 },
    proj_rocket:   { path: 'assets/projectiles/proj_rocket',   mode: 'singleChroma', baseAngleOffset: Math.PI / 4 },
    proj_shell:    { path: 'assets/projectiles/proj_shell',    mode: 'singleChroma', baseAngleOffset: Math.PI / 4 },
    proj_fireball: { path: 'assets/projectiles/proj_fireball', mode: 'singleChroma', baseAngleOffset: Math.PI / 4 },
    proj_iceshard: { path: 'assets/projectiles/proj_iceshard', mode: 'singleChroma', baseAngleOffset: Math.PI / 4 },
    proj_darkorb:  { path: 'assets/projectiles/proj_darkorb',  mode: 'singleChroma', baseAngleOffset: 0 }
  },

  props: {
    prop_landmine:      { path: 'assets/props/prop_landmine',      mode: 'singleChroma' },
    prop_airdrop_crate: { path: 'assets/props/prop_airdrop_crate', mode: 'singleChroma' },
    prop_rally_flag:    { path: 'assets/props/prop_rally_flag',    mode: 'singleChroma' },
    prop_target_dummy:  { path: 'assets/props/prop_target_dummy',  mode: 'singleChroma' }
  },

  skills: {
    skill_airdrop:   { path: 'assets/skills/skill_airdrop',   mode: 'singleChroma' },
    skill_minefield: { path: 'assets/skills/skill_minefield', mode: 'singleChroma' },
    skill_emp:       { path: 'assets/skills/skill_emp',       mode: 'singleChroma' },
    skill_blitz:     { path: 'assets/skills/skill_blitz',     mode: 'singleChroma' }
  },

  ui: {
    lobby_bg:        { path: 'assets/ui/lobby_bg',        mode: 'fullOpaque' },
    crate_legendary: { path: 'assets/ui/crate_legendary', mode: 'singleChroma' },
    crate_epic:      { path: 'assets/ui/crate_epic',      mode: 'singleChroma' },
    chest_gold:      { path: 'assets/ui/chest_gold',      mode: 'singleChroma' },
    lucky_wheel:     { path: 'assets/ui/lucky_wheel',     mode: 'singleChroma' },
    icon_coin:       { path: 'assets/ui/icon_coin',       mode: 'singleChroma' },
    icon_gem:        { path: 'assets/ui/icon_gem',        mode: 'singleChroma' },
    icon_medal:      { path: 'assets/ui/icon_medal',      mode: 'singleChroma' },
    icon_pearl:      { path: 'assets/ui/icon_pearl',      mode: 'singleChroma' },
    icon_fuel:       { path: 'assets/ui/icon_fuel',       mode: 'singleChroma' }
  }
};

/* --------------------------------------------------------------------------
 * 2. CẤU HÌNH HITBOX & TÂM NGẮM MANSION XANH / ĐỎ (PHẦN 2)
 * -------------------------------------------------------------------------- */
const MANSION_CONFIG = {
  blue: {
    label: 'MANSION XANH',
    centerXRatio: 0.5,
    bottomOffset: 95,
    hitWidth: 150,
    hitHeight: 95,
    hitRadius: 68,
    turretOffsetY: -22
  },
  red: {
    label: 'MANSION ĐỎ',
    centerXRatio: 0.5,
    topOffset: 95,
    hitWidth: 150,
    hitHeight: 95,
    hitRadius: 68
  }
};

/* --------------------------------------------------------------------------
 * 3. CẤU HÌNH BÁN KÍNH TƯƠNG TÁC BẢN ĐỒ THẾ GIỚI (PHẦN 3)
 * -------------------------------------------------------------------------- */
const WORLD_MAP_CONFIG = {
  hitRadius: 46,        // Bán kính bắt điểm từ tính 46px (gấp >2.5 lần node hiển thị)
  visualRadius: 17,     // Bán kính vẽ node trên World_map
  hoverScale: 1.18,     // Phóng to 1.18x khi hover
  haloColor: '#FACC15'  // Vòng hào quang vàng kim
};

const CHALLENGE_COOLDOWN_MULT = 3.0;
const BASE_DECK_SIZE_BATTLE = 5;
const BASE_DECK_SIZE_CHALLENGE = 6;
const ADMIN_SECRET_CODE = 'HUNGADMINDZ';

/* --------------------------------------------------------------------------
 * 4. HỆ THỐNG 41 BẬC ĐỘ HIẾM (MÀU SÁNG TƯƠNG PHẢN CAO >= 4.5:1)
 * -------------------------------------------------------------------------- */
const RARITY_TIERS = [
  { id: 'common',       name: 'Common',          color: '#E2E8F0', mult: 1.00, weight: 320000 },
  { id: 'uncommon',     name: 'Uncommon',        color: '#86EFAC', mult: 1.18, weight: 210000 },
  { id: 'rare',         name: 'Rare',            color: '#7DD3FC', mult: 1.40, weight: 140000 },
  { id: 'super_rare',   name: 'Super Rare',      color: '#38BDF8', mult: 1.65, weight: 95000 },
  { id: 'epic',         name: 'Epic',            color: '#D8B4FE', mult: 1.95, weight: 65000 },
  { id: 'super_epic',   name: 'Super Epic',      color: '#C084FC', mult: 2.30, weight: 45000 },
  { id: 'ultra_epic',   name: 'Ultra Epic',      color: '#A855F7', mult: 2.75, weight: 32000 },
  { id: 'legendary',    name: 'Legendary',       color: '#FDE047', mult: 3.30, weight: 24000 },
  { id: 'super_leg',    name: 'Super Legend',    color: '#FACC15', mult: 3.95, weight: 18000 },
  { id: 'ultra_leg',    name: 'Ultra Legend',    color: '#F59E0B', mult: 4.75, weight: 13500 },
  { id: 'mythic',       name: 'Mythic',          color: '#FDA4AF', mult: 5.70, weight: 10000 },
  { id: 'super_mythic', name: 'Super Mythic',    color: '#FB7185', mult: 6.85, weight: 7500 },
  { id: 'ultra_mythic', name: 'Ultra Mythic',    color: '#F43F5E', mult: 8.20, weight: 5600 },
  { id: 'ancient1',     name: 'Ancient I',       color: '#FDBA74', mult: 9.85, weight: 4200 },
  { id: 'ancient2',     name: 'Ancient II',      color: '#FB923C', mult: 11.8, weight: 3200 },
  { id: 'ancient3',     name: 'Ancient III',     color: '#F97316', mult: 14.2, weight: 2400 },
  { id: 'celestial1',   name: 'Celestial I',     color: '#67E8F9', mult: 17.0, weight: 1800 },
  { id: 'celestial2',   name: 'Celestial II',    color: '#22D3EE', mult: 20.5, weight: 1350 },
  { id: 'celestial3',   name: 'Celestial III',   color: '#06B6D4', mult: 24.6, weight: 1000 },
  { id: 'divine1',      name: 'Divine I',        color: '#FEF08A', mult: 29.5, weight: 750 },
  { id: 'divine2',      name: 'Divine II',       color: '#FDE047', mult: 35.4, weight: 560 },
  { id: 'divine3',      name: 'Divine III',      color: '#FACC15', mult: 42.5, weight: 420 },
  { id: 'immortal1',    name: 'Immortal I',      color: '#6EE7B7', mult: 51.0, weight: 310 },
  { id: 'immortal2',    name: 'Immortal II',     color: '#34D399', mult: 61.2, weight: 230 },
  { id: 'immortal3',    name: 'Immortal III',    color: '#10B981', mult: 73.5, weight: 170 },
  { id: 'transcend1',   name: 'Transcendent I',  color: '#A5B4FC', mult: 88.2, weight: 125 },
  { id: 'transcend2',   name: 'Transcendent II', color: '#818CF8', mult: 106,  weight: 92 },
  { id: 'transcend3',   name: 'Transcendent III',color: '#6366F1', mult: 127,  weight: 68 },
  { id: 'master1',      name: 'Master I',        color: '#5EEAD4', mult: 152,  weight: 50 },
  { id: 'master2',      name: 'Master II',       color: '#2DD4BF', mult: 183,  weight: 36 },
  { id: 'master3',      name: 'Master III',      color: '#14B8A6', mult: 220,  weight: 26 },
  { id: 'demon1',       name: 'Demon Lord I',    color: '#F0ABFC', mult: 265,  weight: 19 },
  { id: 'demon2',       name: 'Demon Lord II',   color: '#E879F9', mult: 318,  weight: 14 },
  { id: 'demon3',       name: 'Demon Lord III',  color: '#D946EF', mult: 382,  weight: 10 },
  { id: 'demon4',       name: 'Abyssal IV',      color: '#C084FC', mult: 460,  weight: 7 },
  { id: 'demon5',       name: 'Abyssal V',       color: '#A855F7', mult: 552,  weight: 5 },
  { id: 'demon6',       name: 'Abyssal VI',      color: '#9333EA', mult: 665,  weight: 3.5 },
  { id: 'demon7',       name: 'Overlord VII',    color: '#FB7185', mult: 800,  weight: 2.2 },
  { id: 'demon8',       name: 'Overlord VIII',   color: '#F43F5E', mult: 960,  weight: 1.4 },
  { id: 'demon9',       name: 'Overlord IX',     color: '#FF6B6B', mult: 1155, weight: 0.8 },
  { id: 'demon10',      name: 'APEX DEMON X',    color: '#FFE066', mult: 1400, weight: 0.4 }
];

/* --------------------------------------------------------------------------
 * 5. DANH SÁCH 17 BINH CHỦNG CHÍNH + 2 ĐƠN VỊ TRIỆU HỒI ĐẶC BIỆT
 * Tất cả dùng sprite 2x2 trong assets/units/, gắn movementType & projectileKey
 * -------------------------------------------------------------------------- */
const UNIT_CATALOG = [
  {
    id: 'infantry',
    name: 'Bộ Binh Xung Kích',
    role: 'Tuyến đầu • Chi phí thấp',
    movementType: 'ground',
    spriteKey: 'infantry',
    projectileKey: 'proj_bullet',
    cost: 20,
    cooldown: 1.8,
    hp: 160,
    atk: 24,
    atkSpeed: 1.1,
    range: 105,
    speed: 58,
    armor: 0.05,
    armorPierce: 0,
    aoeRadius: 0,
    desc: 'Lính bộ binh cơ động trang bị súng trường tự động, tốc độ triển khai nhanh.'
  },
  {
    id: 'bazooka',
    name: 'Xạ Thủ Bazooka',
    role: 'Phá giáp • Sát thương nổ',
    movementType: 'ground',
    spriteKey: 'bazooka',
    projectileKey: 'proj_rocket',
    cost: 35,
    cooldown: 2.6,
    hp: 145,
    atk: 68,
    atkSpeed: 0.65,
    range: 175,
    speed: 48,
    armor: 0.05,
    armorPierce: 0.35,
    aoeRadius: 42,
    desc: 'Bắn tên lửa chống tăng gây nổ diện rộng và xuyên giáp cơ giới.'
  },
  {
    id: 'sniper',
    name: 'Bắn Tỉa Ngụy Trang',
    role: 'Tầm siêu xa • Chí mạng',
    movementType: 'ground',
    spriteKey: 'sniper',
    projectileKey: 'proj_bullet',
    cost: 45,
    cooldown: 3.2,
    hp: 120,
    atk: 125,
    atkSpeed: 0.5,
    range: 290,
    speed: 44,
    armor: 0,
    armorPierce: 0.5,
    aoeRadius: 0,
    critBonus: 0.25,
    desc: 'Tiêu diệt mục tiêu giá trị cao từ khoảng cách cực xa với độ chính xác tuyệt đối.'
  },
  {
    id: 'humvee',
    name: 'Xe Thiết Giáp Humvee',
    role: 'Cơ giới nhanh • Càn quét',
    movementType: 'ground',
    spriteKey: 'humvee',
    projectileKey: 'proj_bullet',
    cost: 55,
    cooldown: 3.5,
    hp: 340,
    atk: 46,
    atkSpeed: 1.6,
    range: 145,
    speed: 78,
    armor: 0.18,
    armorPierce: 0.1,
    aoeRadius: 0,
    desc: 'Xe trinh sát hạng nhẹ gắn đại liên hạng nặng, tốc độ di chuyển cao.'
  },
  {
    id: 'apc',
    name: 'Thiết Vận Xa APC',
    role: 'Bọc thép • Hỏa lực liên thanh',
    movementType: 'ground',
    spriteKey: 'apc',
    projectileKey: 'proj_bullet',
    cost: 70,
    cooldown: 4.2,
    hp: 560,
    atk: 58,
    atkSpeed: 1.4,
    range: 155,
    speed: 62,
    armor: 0.28,
    armorPierce: 0.15,
    aoeRadius: 24,
    desc: 'Xe bọc thép 6 bánh chịu đòn bền bỉ, yểm trợ bộ binh tiến công.'
  },
  {
    id: 'tank',
    name: 'Xe Tăng Chiến Đấu',
    role: 'Chủ lực • Pháo nổ mạnh',
    movementType: 'ground',
    spriteKey: 'tank',
    projectileKey: 'proj_shell',
    cost: 95,
    cooldown: 5.0,
    hp: 880,
    atk: 145,
    atkSpeed: 0.72,
    range: 195,
    speed: 46,
    armor: 0.38,
    armorPierce: 0.3,
    aoeRadius: 50,
    desc: 'Cỗ máy chiến tranh chủ lực với lớp giáp dày và pháo nòng trơn uy lực.'
  },
  {
    id: 'heavy_tank',
    name: 'Siêu Tăng Nòng Đôi',
    role: 'Pháo đài di động • Hủy diệt',
    movementType: 'ground',
    spriteKey: 'heavy_tank',
    projectileKey: 'proj_shell',
    cost: 140,
    cooldown: 6.8,
    hp: 1550,
    atk: 235,
    atkSpeed: 0.65,
    range: 210,
    speed: 36,
    armor: 0.5,
    armorPierce: 0.45,
    aoeRadius: 65,
    desc: 'Khai hỏa đồng thời hai nòng pháo hạng nặng, nghiền nát mọi tuyến phòng ngự.'
  },
  {
    id: 'heli',
    name: 'Trực Thăng Vũ Trang',
    role: 'Không quân • Bay vượt địa hình',
    movementType: 'air',
    spriteKey: 'heli',
    projectileKey: 'proj_rocket',
    cost: 110,
    cooldown: 5.5,
    hp: 520,
    atk: 115,
    atkSpeed: 1.15,
    range: 190,
    speed: 82,
    armor: 0.15,
    armorPierce: 0.3,
    aoeRadius: 45,
    desc: 'Bay lượn tự do qua sông hồ và vực thẳm, phóng loạt tên lửa dẫn đường.'
  },
  {
    id: 'patrol_boat',
    name: 'Tàu Tuần Tra Cao Tốc',
    role: 'Hải quân • Bắn tỉa nhanh',
    movementType: 'naval',
    spriteKey: 'patrol_boat',
    projectileKey: 'proj_bullet',
    cost: 65,
    cooldown: 3.8,
    hp: 460,
    atk: 64,
    atkSpeed: 1.5,
    range: 185,
    speed: 74,
    armor: 0.2,
    armorPierce: 0.15,
    aoeRadius: 0,
    desc: 'Tàu tuần tra trang bị pháo tự động nòng đôi cơ động cao.'
  },
  {
    id: 'destroyer',
    name: 'Tàu Khu Trục Tên Lửa',
    role: 'Hải quân • Pháo hạm tầm xa',
    movementType: 'naval',
    spriteKey: 'destroyer',
    projectileKey: 'proj_shell',
    cost: 125,
    cooldown: 6.0,
    hp: 1120,
    atk: 175,
    atkSpeed: 0.85,
    range: 245,
    speed: 54,
    armor: 0.35,
    armorPierce: 0.35,
    aoeRadius: 55,
    desc: 'Oanh tạc mục tiêu từ xa bằng pháo hạm hai đầu mũi và đuôi tàu.'
  },
  {
    id: 'battleship',
    name: 'Thiết Giáp Hạm Yamato',
    role: 'Hải quân tối thượng • Oanh kích',
    movementType: 'naval',
    spriteKey: 'battleship',
    projectileKey: 'proj_shell',
    cost: 180,
    cooldown: 8.5,
    hp: 2200,
    atk: 320,
    atkSpeed: 0.55,
    range: 285,
    speed: 40,
    armor: 0.52,
    armorPierce: 0.5,
    aoeRadius: 80,
    desc: 'Siêu chiến hạm bọc thép dày đặc, trút mưa đạn pháo hạng nặng lên căn cứ địch.'
  },
  {
    id: 'pyromancer',
    name: 'Pháp Sư Hỏa Ngục',
    role: 'Nguyên tố Lửa • Thiêu đốt AoE',
    movementType: 'ground',
    spriteKey: 'pyromancer',
    projectileKey: 'proj_fireball',
    cost: 75,
    cooldown: 4.0,
    hp: 260,
    atk: 105,
    atkSpeed: 0.85,
    range: 180,
    speed: 50,
    armor: 0.08,
    armorPierce: 0.25,
    aoeRadius: 58,
    burnDps: 28,
    desc: 'Triệu hồi cầu lửa khổng lồ thiêu rụi bầy quái đông và gây sát thương cháy theo giây.'
  },
  {
    id: 'cryomancer',
    name: 'Nữ Vương Băng Giá',
    role: 'Nguyên tố Băng • Làm chậm',
    movementType: 'ground',
    spriteKey: 'cryomancer',
    projectileKey: 'proj_iceshard',
    cost: 75,
    cooldown: 4.0,
    hp: 270,
    atk: 88,
    atkSpeed: 0.9,
    range: 185,
    speed: 52,
    armor: 0.1,
    armorPierce: 0.2,
    aoeRadius: 54,
    slowPct: 0.42,
    desc: 'Phóng bão tinh thể băng xuyên thấu kẻ địch và giảm 42% tốc độ di chuyển.'
  },
  {
    id: 'cleric',
    name: 'Thánh Sư Hồi Phục',
    role: 'Hỗ trợ • Hồi máu đồng minh',
    movementType: 'ground',
    spriteKey: 'cleric',
    projectileKey: 'proj_darkorb',
    cost: 60,
    cooldown: 4.4,
    hp: 290,
    atk: 55,
    atkSpeed: 1.0,
    range: 165,
    speed: 52,
    armor: 0.12,
    armorPierce: 0,
    aoeRadius: 75,
    healAmount: 65,
    desc: 'Nâng quyền trượng ánh sáng hồi phục sinh lực cho toàn bộ đồng minh xung quanh.'
  },
  {
    id: 'necromancer',
    name: 'Pháp Sư Chiêu Hồn',
    role: 'Triệu hồi • Đội quân xương',
    movementType: 'ground',
    spriteKey: 'necromancer',
    projectileKey: 'proj_darkorb',
    cost: 90,
    cooldown: 5.2,
    hp: 310,
    atk: 82,
    atkSpeed: 0.85,
    range: 190,
    speed: 48,
    armor: 0.1,
    armorPierce: 0.2,
    aoeRadius: 40,
    summonInterval: 4.5,
    desc: 'Phóng cầu hắc ám và liên tục gọi dậy các Chiến Binh Xương từ lòng đất.'
  },
  {
    id: 'mecha_paladin',
    name: 'Hiệp Sĩ Cơ Giáp Mecha',
    role: 'Đấu sĩ cận chiến • Khiên năng lượng',
    movementType: 'ground',
    spriteKey: 'mecha_paladin',
    projectileKey: 'proj_bullet',
    cost: 120,
    cooldown: 5.8,
    hp: 1380,
    atk: 195,
    atkSpeed: 1.15,
    range: 68,
    speed: 64,
    armor: 0.46,
    armorPierce: 0.35,
    aoeRadius: 48,
    desc: 'Trang bị khiên năng lượng xanh và kiếm plasma chém quét mục tiêu cận chiến.'
  },
  {
    id: 'railgun_walker',
    name: 'Nhện Máy Railgun',
    role: 'Siêu vũ khí • Xuyên giáp tuyệt đối',
    movementType: 'ground',
    spriteKey: 'railgun_walker',
    projectileKey: 'proj_shell',
    cost: 160,
    cooldown: 7.5,
    hp: 1450,
    atk: 310,
    atkSpeed: 0.6,
    range: 265,
    speed: 46,
    armor: 0.42,
    armorPierce: 0.75,
    aoeRadius: 45,
    desc: 'Robot 4 chân bắn tia điện từ Railgun xuyên thủng 75% giáp của mục tiêu.'
  }
];

/* Đơn vị triệu hồi của Necromancer */
const SKELETON_SUMMON_SPEC = {
  id: 'skeleton',
  name: 'Chiến Binh Xương',
  movementType: 'ground',
  spriteKey: 'skeleton',
  projectileKey: 'proj_bullet',
  hp: 135,
  atk: 34,
  atkSpeed: 1.25,
  range: 52,
  speed: 68,
  armor: 0.08,
  armorPierce: 0.1,
  aoeRadius: 0
};

/* Đơn vị Không Kích Oanh Tạc */
const AIRSTRIKE_SPEC = {
  id: 'airstrike',
  name: 'Tiêm Kích Oanh Tạc',
  movementType: 'air',
  spriteKey: 'airstrike',
  projectileKey: 'proj_rocket',
  hp: 9999,
  atk: 260,
  atkSpeed: 2.0,
  range: 220,
  speed: 240,
  armor: 0.9,
  armorPierce: 0.6,
  aoeRadius: 85
};

/* --------------------------------------------------------------------------
 * 6. DANH MỤC 6 LOẠI ZOMBIE (DÙNG CHO CẢ CHALLENGE & CAMPAIGN MIXED WAVES)
 * -------------------------------------------------------------------------- */
const ZOMBIE_CATALOG = [
  {
    id: 'zombie_walker',
    name: 'Xác Sống Lang Thang',
    movementType: 'ground',
    spriteKey: 'zombie_walker',
    projectileKey: 'proj_bullet',
    hp: 140,
    atk: 22,
    atkSpeed: 1.0,
    range: 46,
    speed: 42,
    armor: 0,
    rewardCoins: 6,
    exp: 10
  },
  {
    id: 'zombie_runner',
    name: 'Xác Sống Điên Cuồng',
    movementType: 'ground',
    spriteKey: 'zombie_runner',
    projectileKey: 'proj_bullet',
    hp: 115,
    atk: 32,
    atkSpeed: 1.5,
    range: 46,
    speed: 86,
    armor: 0,
    rewardCoins: 8,
    exp: 14
  },
  {
    id: 'zombie_brute',
    name: 'Khổng Lồ Đột Biến',
    movementType: 'ground',
    spriteKey: 'zombie_brute',
    projectileKey: 'proj_shell',
    hp: 780,
    atk: 85,
    atkSpeed: 0.75,
    range: 56,
    speed: 34,
    armor: 0.32,
    aoeRadius: 42,
    rewardCoins: 22,
    exp: 35
  },
  {
    id: 'zombie_spitter',
    name: 'Quái Phun Axit',
    movementType: 'ground',
    spriteKey: 'zombie_spitter',
    projectileKey: 'proj_darkorb',
    hp: 210,
    atk: 54,
    atkSpeed: 0.85,
    range: 175,
    speed: 44,
    armor: 0.05,
    aoeRadius: 38,
    rewardCoins: 14,
    exp: 22
  },
  {
    id: 'zombie_bomber',
    name: 'Cảm Tử Thùng Nổ',
    movementType: 'ground',
    spriteKey: 'zombie_bomber',
    projectileKey: 'proj_fireball',
    hp: 165,
    atk: 240,
    atkSpeed: 1.0,
    range: 48,
    speed: 76,
    armor: 0.05,
    aoeRadius: 78,
    isSuicideBomber: true,
    rewardCoins: 16,
    exp: 25
  },
  {
    id: 'zombie_necrolord',
    name: 'Chúa Tể Gọi Hồn',
    movementType: 'ground',
    spriteKey: 'zombie_necrolord',
    projectileKey: 'proj_darkorb',
    hp: 520,
    atk: 78,
    atkSpeed: 0.8,
    range: 195,
    speed: 38,
    armor: 0.15,
    aoeRadius: 45,
    summonInterval: 5.0,
    rewardCoins: 30,
    exp: 48
  }
];

/* --------------------------------------------------------------------------
 * 7. DANH MỤC 4 TRÙM CUỐI (BOSSES)
 * -------------------------------------------------------------------------- */
const BOSS_CATALOG = [
  {
    id: 'boss_butcher',
    name: 'Đồ Tể Xích Sắt',
    movementType: 'ground',
    spriteKey: 'boss_butcher',
    projectileKey: 'proj_shell',
    hp: 3600,
    atk: 190,
    atkSpeed: 0.8,
    range: 72,
    speed: 38,
    armor: 0.35,
    aoeRadius: 68,
    rewardCoins: 120,
    exp: 180
  },
  {
    id: 'boss_chimera',
    name: 'Quái Thú Ba Đầu Chimera',
    movementType: 'ground',
    spriteKey: 'boss_chimera',
    projectileKey: 'proj_fireball',
    hp: 5200,
    atk: 230,
    atkSpeed: 0.95,
    range: 165,
    speed: 46,
    armor: 0.38,
    aoeRadius: 74,
    rewardCoins: 180,
    exp: 260
  },
  {
    id: 'boss_omega_tyrant',
    name: 'Bạo Chúa Sinh Học Omega',
    movementType: 'ground',
    spriteKey: 'boss_omega_tyrant',
    projectileKey: 'proj_rocket',
    hp: 8400,
    atk: 295,
    atkSpeed: 0.9,
    range: 185,
    speed: 40,
    armor: 0.45,
    aoeRadius: 80,
    rewardCoins: 260,
    exp: 380
  },
  {
    id: 'raid_boss',
    name: 'Pháo Đài Chiến Xa Leviathan',
    movementType: 'ground',
    spriteKey: 'raid_boss',
    projectileKey: 'proj_shell',
    hp: 16000,
    atk: 360,
    atkSpeed: 1.1,
    range: 230,
    speed: 28,
    armor: 0.52,
    aoeRadius: 95,
    rewardCoins: 500,
    exp: 650
  }
];

/* --------------------------------------------------------------------------
 * 8. DANH MỤC 4 Ụ PHÁO GẮN TRÊN NÓC MANSION XANH (PHẦN 1.2)
 * -------------------------------------------------------------------------- */
const TURRET_CATALOG = [
  {
    id: 'turret_gatling',
    name: 'Ụ Pháo Gatling',
    spriteKey: 'turret_gatling',
    projectileKey: 'proj_bullet',
    atk: 22,
    atkSpeed: 3.4,
    range: 255,
    aoeRadius: 0,
    unlockCost: 0,
    upgBaseCost: 150,
    desc: 'Súng máy xoay 6 nòng tốc độ bắn cực cao, dọn dẹp lính bộ binh áp sát.'
  },
  {
    id: 'turret_laser',
    name: 'Pháo Năng Lượng Laser',
    spriteKey: 'turret_laser',
    projectileKey: 'proj_iceshard',
    atk: 65,
    atkSpeed: 1.6,
    range: 285,
    aoeRadius: 20,
    armorPierce: 0.45,
    unlockCost: 600,
    upgBaseCost: 260,
    desc: 'Bắn chùm tia năng lượng xuyên giáp, khắc chế xe tăng và quái khổng lồ.'
  },
  {
    id: 'turret_missile',
    name: 'Bệ Phóng Tên Lửa 6 Nòng',
    spriteKey: 'turret_missile',
    projectileKey: 'proj_rocket',
    atk: 115,
    atkSpeed: 0.95,
    range: 320,
    aoeRadius: 62,
    unlockCost: 1200,
    upgBaseCost: 380,
    desc: 'Phóng loạt tên lửa tầm xa gây sát thương nổ diện rộng cực lớn.'
  },
  {
    id: 'turret_tesla',
    name: 'Tháp Sét Hồ Quang Tesla',
    spriteKey: 'turret_tesla',
    projectileKey: 'proj_darkorb',
    atk: 85,
    atkSpeed: 1.35,
    range: 265,
    aoeRadius: 55,
    slowPct: 0.3,
    unlockCost: 2000,
    upgBaseCost: 500,
    desc: 'Phóng hồ quang điện giật lan nhiều mục tiêu và làm tê liệt kẻ địch.'
  }
];

/* --------------------------------------------------------------------------
 * 9. 4 KỸ NĂNG CHỈ HUY CHỦ ĐỘNG (Q - W - E - R)
 * -------------------------------------------------------------------------- */
const COMMANDER_SKILLS = {
  Q: {
    id: 'Q',
    key: 'airdrop',
    name: 'Thả Dù Tiếp Viện',
    iconKey: 'skill_airdrop',
    propKey: 'prop_airdrop_crate',
    cooldown: 16,
    needsTarget: false,
    desc: 'Thả hòm tiếp tế xuống chiến trường, triệu hồi 3 Bộ Binh tinh nhuệ và hồi +35 Xăng.'
  },
  W: {
    id: 'W',
    key: 'minefield',
    name: 'Rải Bãi Mìn Chống Tăng',
    iconKey: 'skill_minefield',
    propKey: 'prop_landmine',
    cooldown: 18,
    baseMines: 5,
    damage: 240,
    radius: 56,
    needsTarget: false,
    desc: 'Rải hàng mìn chống tăng ngang phòng tuyến trước Mansion Xanh.'
  },
  E: {
    id: 'E',
    key: 'emp',
    name: 'Xung Điện Từ EMP',
    iconKey: 'skill_emp',
    cooldown: 22,
    baseStun: 3.0,
    damage: 140,
    needsTarget: false,
    desc: 'Phóng xung điện từ làm choáng toàn bộ kẻ địch trên sân và gây sát thương.'
  },
  R: {
    id: 'R',
    key: 'blitz',
    name: 'Tổng Tấn Công Blitzkrieg',
    iconKey: 'skill_blitz',
    cooldown: 28,
    duration: 7.0,
    atkBonus: 0.45,
    spdBonus: 0.35,
    needsTarget: false,
    desc: 'Tăng +45% Sát thương và +35% Tốc độ đánh/chạy cho toàn quân trong 7 giây.'
  }
};

/* --------------------------------------------------------------------------
 * 10. CÂY KỸ NĂNG MỞ RỘNG 6 NHÁNH CHUYÊN SÂU (36 NODES - PHẦN 5)
 * -------------------------------------------------------------------------- */
const SKILL_TREE_BRANCHES = [
  { id: 'fortification', name: '1. Công Sự & Pháo Đài', color: '#38BDF8' },
  { id: 'firepower',     name: '2. Hỏa Lực & Tinh Nhuệ', color: '#FB7185' },
  { id: 'necromancy',    name: '3. Chiêu Hồn & Quân Đoàn', color: '#C084FC' },
  { id: 'logistics',     name: '4. Hậu Cần & Kinh Tế', color: '#FACC15' },
  { id: 'tactics',       name: '5. Nghệ Thuật Chỉ Huy', color: '#4ADE80' },
  { id: 'elemental',     name: '6. Nguyên Tố & Chí Mạng', color: '#FB923C' }
];

const ANCIENT_SKILL_TREE = [
  // === NHÁNH 1: CÔNG SỰ & PHÁO ĐÀI (x = 90) ===
  { id: 'fort_1', branch: 'fortification', branchName: 'Nhánh 1 • Công Sự', tier: 1, name: 'Gia Cố Tường Thành', maxLv: 5, baseCost: 1, costStep: 1, requires: null, pos: { x: 90, y: 70 }, statKey: 'baseHpPct', valPerLv: 0.15, desc: 'Tăng +15% HP tối đa cho Mansion Xanh mỗi cấp.' },
  { id: 'fort_2', branch: 'fortification', branchName: 'Nhánh 1 • Công Sự', tier: 2, name: 'Giáp Thép Pháo Đài', maxLv: 5, baseCost: 2, costStep: 1, requires: 'fort_1', pos: { x: 90, y: 175 }, statKey: 'baseArmorPct', valPerLv: 0.06, desc: 'Giảm +6% sát thương nhận vào của Mansion Xanh mỗi cấp.' },
  { id: 'fort_3', branch: 'fortification', branchName: 'Nhánh 1 • Công Sự', tier: 3, name: 'Nòng Pháo Cường Hóa', maxLv: 5, baseCost: 2, costStep: 2, requires: 'fort_2', pos: { x: 90, y: 280 }, statKey: 'turretAtkPct', valPerLv: 0.18, desc: 'Tăng +18% sát thương cho toàn bộ 4 loại Ụ Pháo Mansion.' },
  { id: 'fort_4', branch: 'fortification', branchName: 'Nhánh 1 • Công Sự', tier: 4, name: 'Hệ Thống Nạp Đạn Nhanh', maxLv: 5, baseCost: 3, costStep: 2, requires: 'fort_3', pos: { x: 90, y: 385 }, statKey: 'turretSpdPct', valPerLv: 0.14, desc: 'Tăng +14% tốc độ bắn của Ụ Pháo Mansion mỗi cấp.' },
  { id: 'fort_5', branch: 'fortification', branchName: 'Nhánh 1 • Công Sự', tier: 5, name: 'Pháo Đài Bất Khả Xâm', maxLv: 5, baseCost: 4, costStep: 2, requires: 'fort_4', pos: { x: 90, y: 490 }, statKey: 'baseHpPct', valPerLv: 0.25, desc: 'Tăng thêm +25% HP tối đa Mansion Xanh và +10% tầm bắn Ụ Pháo.' },
  { id: 'fort_ult', branch: 'fortification', branchName: 'Nhánh 1 • Công Sự', tier: 6, isUltimate: true, name: 'TỐI THƯỢNG: Lá Chắn Pháo Đài', maxLv: 3, baseCost: 6, costStep: 4, requires: 'fort_5', pos: { x: 90, y: 600 }, statKey: 'fortressShieldPct', valPerLv: 0.20, desc: 'Tự động tạo lớp Giáp Ảo bằng 20% HP tối đa cho Mansion Xanh mỗi 20 giây.' },

  // === NHÁNH 2: HỎA LỰC & TINH NHUỆ QUÂN ĐỘI (x = 240) ===
  { id: 'fire_1', branch: 'firepower', branchName: 'Nhánh 2 • Hỏa Lực', tier: 1, name: 'Đạn Xuyên Phá Cơ Bản', maxLv: 5, baseCost: 1, costStep: 1, requires: null, pos: { x: 240, y: 70 }, statKey: 'unitAtkPct', valPerLv: 0.12, desc: 'Tăng +12% sát thương cơ bản cho toàn bộ binh chủng mỗi cấp.' },
  { id: 'fire_2', branch: 'firepower', branchName: 'Nhánh 2 • Hỏa Lực', tier: 2, name: 'Huấn Luyện Xạ Kích', maxLv: 5, baseCost: 2, costStep: 1, requires: 'fire_1', pos: { x: 240, y: 175 }, statKey: 'unitAtkSpdPct', valPerLv: 0.10, desc: 'Tăng +10% tốc độ đánh cho toàn bộ quân đội mỗi cấp.' },
  { id: 'fire_3', branch: 'firepower', branchName: 'Nhánh 2 • Hỏa Lực', tier: 3, name: 'Giáp Composite Quân Đội', maxLv: 5, baseCost: 2, costStep: 2, requires: 'fire_2', pos: { x: 240, y: 280 }, statKey: 'unitHpPct', valPerLv: 0.14, desc: 'Tăng +14% HP tối đa cho mọi đơn vị quân triệu hồi.' },
  { id: 'fire_4', branch: 'firepower', branchName: 'Nhánh 2 • Hỏa Lực', tier: 4, name: 'Mũi Khoan Hủy Diệt', maxLv: 5, baseCost: 3, costStep: 2, requires: 'fire_3', pos: { x: 240, y: 385 }, statKey: 'armorPierceBonus', valPerLv: 0.08, desc: 'Tăng +8% khả năng xuyên giáp cho Sniper, Railgun Walker và Tank.' },
  { id: 'fire_5', branch: 'firepower', branchName: 'Nhánh 2 • Hỏa Lực', tier: 5, name: 'Quân Đoàn Tinh Nhuệ', maxLv: 5, baseCost: 4, costStep: 2, requires: 'fire_4', pos: { x: 240, y: 490 }, statKey: 'unitAtkPct', valPerLv: 0.20, desc: 'Tăng thêm +20% tổng sát thương toàn quân đội.' },
  { id: 'fire_ult', branch: 'firepower', branchName: 'Nhánh 2 • Hỏa Lực', tier: 6, isUltimate: true, name: 'TỐI THƯỢNG: Cuồng Nộ Chiến Trường', maxLv: 3, baseCost: 6, costStep: 4, requires: 'fire_5', pos: { x: 240, y: 600 }, statKey: 'lowHpFrenzyPct', valPerLv: 0.25, desc: 'Khi HP Mansion Xanh dưới 50%, toàn quân tăng ngay +25% tốc độ bắn mỗi cấp.' },

  // === NHÁNH 3: CHIÊU HỒN & QUÂN ĐOÀN ĐÔNG ĐẢO (x = 390) ===
  { id: 'necro_1', branch: 'necromancy', branchName: 'Nhánh 3 • Chiêu Hồn', tier: 1, name: 'Xương Cốt Cứng Cáp', maxLv: 5, baseCost: 1, costStep: 1, requires: null, pos: { x: 390, y: 70 }, statKey: 'skeletonStatPct', valPerLv: 0.22, desc: 'Tăng +22% HP và Sát thương cho Chiến Binh Xương triệu hồi.' },
  { id: 'necro_2', branch: 'necromancy', branchName: 'Nhánh 3 • Chiêu Hồn', tier: 2, name: 'Nghi Lễ Triệu Hồi Nhanh', maxLv: 5, baseCost: 2, costStep: 1, requires: 'necro_1', pos: { x: 390, y: 175 }, statKey: 'summonCdRedPct', valPerLv: 0.12, desc: 'Giảm 12% thời gian hồi chiêu gọi xương của Necromancer.' },
  { id: 'necro_3', branch: 'necromancy', branchName: 'Nhánh 3 • Chiêu Hồn', tier: 3, name: 'Ánh Sáng Ban Phước', maxLv: 5, baseCost: 2, costStep: 2, requires: 'necro_2', pos: { x: 390, y: 280 }, statKey: 'healPowerPct', valPerLv: 0.20, desc: 'Tăng +20% lượng máu hồi phục của Thánh Sư Cleric.' },
  { id: 'necro_4', branch: 'necromancy', branchName: 'Nhánh 3 • Chiêu Hồn', tier: 4, name: 'Quân Đoàn Bất Tử', maxLv: 5, baseCost: 3, costStep: 2, requires: 'necro_3', pos: { x: 390, y: 385 }, statKey: 'maxSkeletonBonus', valPerLv: 1, desc: 'Tăng +1 giới hạn Chiến Binh Xương tối đa trên sân mỗi cấp.' },
  { id: 'necro_5', branch: 'necromancy', branchName: 'Nhánh 3 • Chiêu Hồn', tier: 5, name: 'Linh Hồn Cộng Hưởng', maxLv: 5, baseCost: 4, costStep: 2, requires: 'necro_4', pos: { x: 390, y: 490 }, statKey: 'deathGasRefundPct', valPerLv: 0.05, desc: 'Hoàn lại +5% chi phí Xăng khi quân đồng minh hy sinh.' },
  { id: 'necro_ult', branch: 'necromancy', branchName: 'Nhánh 3 • Chiêu Hồn', tier: 6, isUltimate: true, name: 'TỐI THƯỢNG: Huyết Tế Hấp Thụ', maxLv: 3, baseCost: 6, costStep: 4, requires: 'necro_5', pos: { x: 390, y: 600 }, statKey: 'bloodSiphonPct', valPerLv: 0.05, desc: 'Mỗi khi tiêu diệt 1 kẻ địch, quân đồng minh xung quanh hồi 5% HP tối đa.' },

  // === NHÁNH 4: HẬU CẦN & KINH TẾ CHIẾN TRANH (x = 540) ===
  { id: 'logi_1', branch: 'logistics', branchName: 'Nhánh 4 • Hậu Cần', tier: 1, name: 'Lọc Nhiên Liệu Cao Cấp', maxLv: 5, baseCost: 1, costStep: 1, requires: null, pos: { x: 540, y: 70 }, statKey: 'gasRegenPct', valPerLv: 0.10, desc: 'Tăng +10% tốc độ hồi Xăng triển khai quân trong trận.' },
  { id: 'logi_2', branch: 'logistics', branchName: 'Nhánh 4 • Hậu Cần', tier: 2, name: 'Chiến Lợi Phẩm Vàng', maxLv: 5, baseCost: 2, costStep: 1, requires: 'logi_1', pos: { x: 540, y: 175 }, statKey: 'coinRewardPct', valPerLv: 0.15, desc: 'Tăng +15% lượng Coins nhận được sau mỗi trận thắng.' },
  { id: 'logi_3', branch: 'logistics', branchName: 'Nhánh 4 • Hậu Cần', tier: 3, name: 'Tối Ưu Tuyến Tiếp Vận', maxLv: 5, baseCost: 2, costStep: 2, requires: 'logi_2', pos: { x: 540, y: 280 }, statKey: 'deployCostRedPct', valPerLv: 0.05, desc: 'Giảm 5% giá Xăng triệu hồi toàn bộ thẻ bài binh chủng.' },
  { id: 'logi_4', branch: 'logistics', branchName: 'Nhánh 4 • Hậu Cần', tier: 4, name: 'Kho Dự Trữ Năng Lượng', maxLv: 5, baseCost: 3, costStep: 2, requires: 'logi_3', pos: { x: 540, y: 385 }, statKey: 'maxGasBonus', valPerLv: 25, desc: 'Tăng +25 giới hạn bình chứa Xăng tối đa trong trận.' },
  { id: 'logi_5', branch: 'logistics', branchName: 'Nhánh 4 • Hậu Cần', tier: 5, name: 'Thợ Săn Đá Quý', maxLv: 5, baseCost: 4, costStep: 2, requires: 'logi_4', pos: { x: 540, y: 490 }, statKey: 'gemRewardPct', valPerLv: 0.15, desc: 'Tăng +15% lượng Gems thưởng thêm khi hoàn thành màn chơi.' },
  { id: 'logi_ult', branch: 'logistics', branchName: 'Nhánh 4 • Hậu Cần', tier: 6, isUltimate: true, name: 'TỐI THƯỢNG: Tiếp Viện Tức Thì', maxLv: 3, baseCost: 6, costStep: 4, requires: 'logi_5', pos: { x: 540, y: 600 }, statKey: 'startGasBonus', valPerLv: 150, desc: 'Bắt đầu mỗi trận đấu với +150 Xăng triển khai sẵn (tối đa +450 Xăng).' },

  // === NHÁNH 5: NGHỆ THUẬT CHỈ HUY Q-W-E-R (x = 690) ===
  { id: 'tac_1', branch: 'tactics', branchName: 'Nhánh 5 • Chỉ Huy', tier: 1, name: 'Liên Lạc Vệ Tinh', maxLv: 5, baseCost: 1, costStep: 1, requires: null, pos: { x: 690, y: 70 }, statKey: 'skillCdRedPct', valPerLv: 0.08, desc: 'Giảm 8% thời gian hồi chiêu cả 4 kỹ năng Chỉ Huy Q-W-E-R.' },
  { id: 'tac_2', branch: 'tactics', branchName: 'Nhánh 5 • Chỉ Huy', tier: 2, name: 'Bãi Mìn Dày Đặc', maxLv: 5, baseCost: 2, costStep: 1, requires: 'tac_1', pos: { x: 690, y: 175 }, statKey: 'extraMinesCount', valPerLv: 1, desc: 'Kỹ năng Rải Mìn [W] thả thêm +1 quả mìn và tăng +15% sát thương nổ.' },
  { id: 'tac_3', branch: 'tactics', branchName: 'Nhánh 5 • Chỉ Huy', tier: 3, name: 'Tụ Điện Quá Tải EMP', maxLv: 5, baseCost: 2, costStep: 2, requires: 'tac_2', pos: { x: 690, y: 280 }, statKey: 'empStunBonus', valPerLv: 0.6, desc: 'Kéo dài thời gian làm choáng của kỹ năng EMP [E] thêm +0.6 giây.' },
  { id: 'tac_4', branch: 'tactics', branchName: 'Nhánh 5 • Chỉ Huy', tier: 4, name: 'Hòm Tiếp Tế Hạng Nặng', maxLv: 5, baseCost: 3, costStep: 2, requires: 'tac_3', pos: { x: 690, y: 385 }, statKey: 'airdropGasBonus', valPerLv: 15, desc: 'Thả Dù [Q] cộng thêm +15 Xăng và triệu hồi lính cấp cao hơn.' },
  { id: 'tac_5', branch: 'tactics', branchName: 'Nhánh 5 • Chỉ Huy', tier: 5, name: 'Hiệu Lệnh Blitzkrieg', maxLv: 5, baseCost: 4, costStep: 2, requires: 'tac_4', pos: { x: 690, y: 490 }, statKey: 'blitzDurationBonus', valPerLv: 1.2, desc: 'Tăng thời gian duy trì kỹ năng Blitzkrieg [R] thêm +1.2 giây.' },
  { id: 'tac_ult', branch: 'tactics', branchName: 'Nhánh 5 • Chỉ Huy', tier: 6, isUltimate: true, name: 'TỐI THƯỢNG: Không Kích Yểm Trợ', maxLv: 3, baseCost: 6, costStep: 4, requires: 'tac_5', pos: { x: 690, y: 600 }, statKey: 'airstrikeProcChance', valPerLv: 0.15, desc: 'Mỗi lần dùng kỹ năng Q/W/E/R có 15% tỷ lệ gọi thêm 1 phi đội Tiêm Kích ném bom!' },

  // === NHÁNH 6: NGUYÊN TỐ & SÁT THƯƠNG CHÍ MẠNG (x = 840) ===
  { id: 'elem_1', branch: 'elemental', branchName: 'Nhánh 6 • Nguyên Tố', tier: 1, name: 'Điểm Yếu Chí Mạng', maxLv: 5, baseCost: 1, costStep: 1, requires: null, pos: { x: 840, y: 70 }, statKey: 'critRateBonus', valPerLv: 0.05, desc: 'Tăng +5% tỷ lệ đánh chí mạng cho toàn bộ binh chủng & ụ pháo.' },
  { id: 'elem_2', branch: 'elemental', branchName: 'Nhánh 6 • Nguyên Tố', tier: 2, name: 'Đòn Đánh Hủy Diệt', maxLv: 5, baseCost: 2, costStep: 1, requires: 'elem_1', pos: { x: 840, y: 175 }, statKey: 'critDmgBonus', valPerLv: 0.25, desc: 'Tăng +25% sát thương chí mạng mỗi cấp.' },
  { id: 'elem_3', branch: 'elemental', branchName: 'Nhánh 6 • Nguyên Tố', tier: 3, name: 'Ngọn Lửa Địa Ngục', maxLv: 5, baseCost: 2, costStep: 2, requires: 'elem_2', pos: { x: 840, y: 280 }, statKey: 'burnDmgPct', valPerLv: 0.25, desc: 'Tăng +25% sát thương thiêu đốt của Pyromancer & cầu lửa.' },
  { id: 'elem_4', branch: 'elemental', branchName: 'Nhánh 6 • Nguyên Tố', tier: 4, name: 'Hàn Băng Vĩnh Cửu', maxLv: 5, baseCost: 3, costStep: 2, requires: 'elem_3', pos: { x: 840, y: 385 }, statKey: 'slowEffectBonus', valPerLv: 0.08, desc: 'Tăng thêm +8% hiệu quả làm chậm và kéo dài thời gian đóng băng của Cryomancer.' },
  { id: 'elem_5', branch: 'elemental', branchName: 'Nhánh 6 • Nguyên Tố', tier: 5, name: 'Bão Tố Nguyên Tố', maxLv: 5, baseCost: 4, costStep: 2, requires: 'elem_4', pos: { x: 840, y: 490 }, statKey: 'aoeRadiusPct', valPerLv: 0.12, desc: 'Mở rộng +12% bán kính vụ nổ và vùng sát thương diện rộng toàn quân.' },
  { id: 'elem_ult', branch: 'elemental', branchName: 'Nhánh 6 • Nguyên Tố', tier: 6, isUltimate: true, name: 'TỐI THƯỢNG: Nhiệt Sốc Nguyên Tố', maxLv: 3, baseCost: 6, costStep: 4, requires: 'elem_5', pos: { x: 840, y: 600 }, statKey: 'thermalShockPct', valPerLv: 0.30, desc: 'Đánh chí mạng lên mục tiêu đang bị Cháy hoặc Làm Chậm gây nổ +30% sát thương lan!' }
];

/* --------------------------------------------------------------------------
 * 11. DỮ LIỆU 6 VÙNG BIOME & 54 MÀN CHƠI (BẢN ĐỒ THẬT + ĐỊA HÌNH + ZOMBIE MIX)
 * -------------------------------------------------------------------------- */
const BIOME_CONFIG = [
  {
    id: 1,
    name: 'Vùng 1: Thảo Nguyên Xanh',
    shortName: 'Thảo Nguyên',
    levels: [1, 9],
    themeColor: '#4ADE80',
    mapKeys: ['map1', 'map2', 'map3', 'map4', 'map5', 'map6', 'map7', 'map8', 'map9']
  },
  {
    id: 2,
    name: 'Vùng 2: Hẻm Núi Hoang Mạc',
    shortName: 'Sa Mạc',
    levels: [10, 18],
    themeColor: '#FB923C',
    mapKeys: ['map10', 'map11', 'map12', 'map13', 'map14', 'map15', 'map16', 'map17', 'map18']
  },
  {
    id: 3,
    name: 'Vùng 3: Lãnh Nguyên Băng Giá',
    shortName: 'Băng Tuyết',
    levels: [19, 27],
    themeColor: '#38BDF8',
    mapKeys: ['map19', 'map20', 'map21', 'map22', 'map23', 'map24', 'map25', 'map26', 'map27']
  },
  {
    id: 4,
    name: 'Vùng 4: Miệng Núi Lửa Dung Nham',
    shortName: 'Núi Lửa',
    levels: [28, 36],
    themeColor: '#FB7185',
    mapKeys: ['map28', 'map29', 'map30', 'map31', 'map32', 'map33', 'map34', 'map35', 'map36']
  },
  {
    id: 5,
    name: 'Vùng 5: Đầm Lầy Độc Tố Axit',
    shortName: 'Đầm Lầy',
    levels: [37, 45],
    themeColor: '#A3E635',
    mapKeys: ['map37', 'map38', 'map39', 'map40', 'map41', 'map42', 'map43', 'map44', 'map45']
  },
  {
    id: 6,
    name: 'Vùng 6: Thung Lũng Hoa Anh Đào',
    shortName: 'Anh Đào',
    levels: [46, 54],
    themeColor: '#F472B6',
    mapKeys: ['map46', 'map47', 'map48', 'map49', 'map50', 'map51', 'map52', 'map53', 'map54']
  }
];

const STAGE_NAMES_54 = [
  // Biome 1 (1-9)
  'Cầu Qua Sông', 'Đường Đèo Chữ S', 'Tàn Tích Đồng Cỏ', 'Hồ Ngọc Trung Tâm', 'Rừng Thông Rậm Rạp',
  'Làng Mạc Thanh Bình', 'Hồ Đảo Song Cầu', 'Bùng Binh Tượng Đài', 'Vòng Xoay Phòng Thủ',
  // Biome 2 (10-18)
  'Cầu Sắt Vực Sâu', 'Trại Lửa Hoang Mạc', 'Phế Tích Thành Cát', 'Tháp Khoan Dầu', 'Sông Hẻm Núi Đỏ',
  'Ba Hành Lang Đá', 'Mỏ Khai Thác Goòng', 'Chiến Hào Bao Cát', 'Chòi Canh Biên Ải',
  // Biome 3 (19-27)
  'Sông Băng Song Cầu', 'Đèo Tuyết Bốn Khúc', 'Pháo Đài Tuyết Phủ', 'Hồ Băng Đóng Cứng', 'Khe Nứt Vực Băng',
  'Hẻm Núi Pha Lê', 'Đường Hầm Tàu Băng', 'Rừng Thông Tuyết Trắng', 'Thành Lũy Băng Giá',
  // Biome 4 (28-36)
  'Sông Dung Nham Ba Cầu', 'Đèo Thác Dung Nham', 'Tàn Tích Hắc Diện Thạch', 'Miệng Núi Lửa Sôi', 'Dòng Nham Thạch Chéo',
  'Khe Nứt Núi Lửa', 'Mỏ Khai Thác Nham Thạch', 'Cầu Sắt Rực Lửa', 'Pháo Đài Obsidian',
  // Biome 5 (37-45)
  'Đầm Lầy Axit Bốn Cầu', 'Vực Khí Độc Xanh', 'Phế Tích Đầm Lầy', 'Hồ Axit Trung Tâm', 'Hẻm Núi Độc Tố',
  'Con Đường Rắn Độc', 'Đường Ray Đầm Lầy', 'Suối Axit Uốn Lượn', 'Pháo Đài Đầm Lầy',
  // Biome 6 (46-54)
  'Tam Cầu Hoa Anh Đào', 'Cổng Đền Torii Cổ', 'Đền Thờ Rêu Phong', 'Hồ Sen Anh Đào', 'Suối Đào Ba Nhịp Cầu',
  'Thung Lũng Suối Hoa', 'Song Hồ Anh Đào', 'Khúc Quanh Đá Rêu', 'Thành Cổ Hoa Anh Đào'
];

/* Tọa độ 54 node phân bố khớp 6 quần xã trên ảnh World_map.png (normalized 0..1) */
const WORLD_MAP_NODE_COORDS = [
  // Biome 1: Thảo Nguyên Xanh (Góc Trên-Trái của World_map)
  { x: 0.14, y: 0.68 }, { x: 0.11, y: 0.60 }, { x: 0.19, y: 0.57 },
  { x: 0.13, y: 0.49 }, { x: 0.21, y: 0.46 }, { x: 0.16, y: 0.37 },
  { x: 0.24, y: 0.35 }, { x: 0.19, y: 0.26 }, { x: 0.27, y: 0.25 },
  // Biome 2: Hẻm Núi Hoang Mạc (Giữa-Trên của World_map)
  { x: 0.36, y: 0.27 }, { x: 0.45, y: 0.23 }, { x: 0.52, y: 0.29 },
  { x: 0.41, y: 0.36 }, { x: 0.49, y: 0.41 }, { x: 0.39, y: 0.47 },
  { x: 0.47, y: 0.52 }, { x: 0.56, y: 0.55 }, { x: 0.61, y: 0.48 },
  // Biome 3: Lãnh Nguyên Băng Giá (Góc Trên-Phải của World_map)
  { x: 0.62, y: 0.34 }, { x: 0.61, y: 0.23 }, { x: 0.69, y: 0.21 },
  { x: 0.72, y: 0.31 }, { x: 0.77, y: 0.24 }, { x: 0.82, y: 0.32 },
  { x: 0.74, y: 0.39 }, { x: 0.68, y: 0.43 }, { x: 0.79, y: 0.44 },
  // Biome 4: Miệng Núi Lửa Dung Nham (Cực Phải của World_map)
  { x: 0.87, y: 0.36 }, { x: 0.93, y: 0.26 }, { x: 0.95, y: 0.38 },
  { x: 0.89, y: 0.47 }, { x: 0.94, y: 0.55 }, { x: 0.86, y: 0.58 },
  { x: 0.79, y: 0.56 }, { x: 0.83, y: 0.66 }, { x: 0.91, y: 0.67 },
  // Biome 5: Đầm Lầy Độc Tố Axit (Góc Dưới-Phải của World_map)
  { x: 0.78, y: 0.74 }, { x: 0.72, y: 0.68 }, { x: 0.66, y: 0.73 },
  { x: 0.73, y: 0.80 }, { x: 0.65, y: 0.84 }, { x: 0.72, y: 0.89 },
  { x: 0.80, y: 0.86 }, { x: 0.85, y: 0.79 }, { x: 0.77, y: 0.93 },
  // Biome 6: Thung Lũng Hoa Anh Đào (Dưới-Giữa của World_map)
  { x: 0.58, y: 0.88 }, { x: 0.55, y: 0.78 }, { x: 0.49, y: 0.72 },
  { x: 0.46, y: 0.82 }, { x: 0.48, y: 0.91 }, { x: 0.40, y: 0.88 },
  { x: 0.38, y: 0.77 }, { x: 0.32, y: 0.83 }, { x: 0.29, y: 0.91 }
];

/* Phân loại hình dạng địa hình nước/cầu đặc trưng cho từng màn (dùng cho TerrainNavGrid) */
const MAP_TERRAIN_PROFILES = {
  map1: 'river_center_bridge',
  map4: 'lake_center_ring',
  map7: 'lake_island_dual_bridge',
  map10: 'river_center_bridge',
  map14: 'diagonal_river_dual_bridge',
  map19: 'diagonal_river_dual_bridge',
  map22: 'lake_center_ring',
  map23: 'river_center_bridge',
  map25: 'river_center_bridge',
  map28: 'river_center_bridge',
  map30: 'lake_center_ring',
  map31: 'lake_center_ring',
  map32: 'diagonal_river_dual_bridge',
  map33: 'river_center_bridge',
  map34: 'lake_center_ring',
  map35: 'river_center_bridge',
  map37: 'diagonal_river_dual_bridge',
  map38: 'river_center_bridge',
  map39: 'lake_center_ring',
  map40: 'lake_center_ring',
  map41: 'diagonal_river_dual_bridge',
  map42: 'river_center_bridge',
  map43: 'lake_center_ring',
  map44: 'river_center_bridge',
  map45: 'river_center_bridge',
  map46: 'diagonal_river_dual_bridge',
  map49: 'lake_center_ring',
  map50: 'diagonal_river_dual_bridge',
  map51: 'diagonal_river_dual_bridge',
  map52: 'side_ponds',
  map53: 'river_center_bridge',
  map54: 'river_center_bridge'
};

const STAGE_CATALOG = Array.from({ length: 54 }, (_, idx) => {
  const level = idx + 1;
  const biomeObj = BIOME_CONFIG[Math.floor(idx / 9)];
  const mapKey = `map${level}`;
  return {
    id: level,
    level,
    biomeId: biomeObj.id,
    biomeName: biomeObj.name,
    biomeShort: biomeObj.shortName,
    name: STAGE_NAMES_54[idx] || `Màn ${level}`,
    mapKey,
    terrainProfile: MAP_TERRAIN_PROFILES[mapKey] || 'open_land',
    worldPos: WORLD_MAP_NODE_COORDS[idx] || { x: 0.5, y: 0.5 },
    enemyBaseHp: Math.round(900 * Math.pow(1.085, idx)),
    rewardCoins: Math.round(120 + idx * 38),
    rewardGems: 15 + Math.floor(idx / 3) * 5,
    rewardPearls: level % 3 === 0 ? 1 + Math.floor(idx / 12) : 0,
    bossId: level % 9 === 0 ? BOSS_CATALOG[Math.min(3, Math.floor(idx / 14))].id : null
  };
});

/**
 * Lấy danh sách Zombie trộn vào đợt quái Campaign Mode theo tiến trình Level (Phần 6)
 */
function getCampaignZombiePool(level) {
  if (level <= 15) {
    return ['zombie_walker', 'zombie_runner'];
  }
  if (level <= 35) {
    return ['zombie_walker', 'zombie_runner', 'zombie_spitter', 'zombie_brute'];
  }
  return ['zombie_runner', 'zombie_brute', 'zombie_spitter', 'zombie_bomber', 'zombie_necrolord'];
}

/* --------------------------------------------------------------------------
 * 12. DANH MỤC CHIP BỔ TRỢ, THIÊN PHÚ, NHIỆM VỤ & GIFTCODES
 * -------------------------------------------------------------------------- */
const CHIP_CATALOG = [
  { id: 'overclock_core',  name: 'Lõi Ép Xung',       color: '#38BDF8', cost: 300,  desc: 'Giảm 15% thời gian hồi chiêu thẻ bài.' },
  { id: 'vampiric_fang',   name: 'Chip Hút Huyết',    color: '#FB7185', cost: 450,  desc: 'Hồi 8% sát thương gây ra thành HP.' },
  { id: 'tungsten_rounds', name: 'Đầu Đạn Vonfram',   color: '#FACC15', cost: 400,  desc: 'Tăng +25% xuyên giáp và +15% sát thương.' },
  { id: 'nano_plating',    name: 'Giáp Nano Tự Phục', color: '#4ADE80', cost: 350,  desc: 'Tăng +22% HP tối đa cho đơn vị.' },
  { id: 'plasma_coil',     name: 'Cuộn Cảm Plasma',   color: '#C084FC', cost: 500,  desc: 'Tăng +20% tốc độ đánh và +15% phạm vi nổ.' }
];

const META_TALENTS = [
  { id: 'battlefield_harvest', name: 'Thu Hoạch Chiến Trường', maxLv: 5, baseCost: 200, desc: 'Hoàn lại 15% chi phí Xăng khi quân đồng minh hy sinh.' },
  { id: 'command_logistics',   name: 'Tiếp Vận Chỉ Huy',      maxLv: 10, baseCost: 150, desc: 'Tăng +6% tốc độ hồi Xăng cơ bản mỗi cấp.' },
  { id: 'fortress_masonry',    name: 'Kiến Trúc Mansion',     maxLv: 10, baseCost: 180, desc: 'Tăng +12% HP tối đa Mansion Xanh mỗi cấp.' },
  { id: 'tactical_warfare',    name: 'Học Thuyết Quân Sự',    maxLv: 10, baseCost: 220, desc: 'Tăng +8% sát thương toàn quân đội mỗi cấp.' }
];

const MISSION_CATALOG = [
  { id: 'm_kill_50',   title: 'Tiêu diệt 50 kẻ địch trên chiến trường', target: 50,  stat: 'totalKills',   rewardType: 'coins',  rewardVal: 500 },
  { id: 'm_win_3',     title: 'Giành chiến thắng 3 trận bất kỳ',         target: 3,   stat: 'totalWins',    rewardType: 'gems',   rewardVal: 120 },
  { id: 'm_summon_30', title: 'Triệu hồi 30 đơn vị quân ra trận',        target: 30,  stat: 'totalSummons', rewardType: 'pearls', rewardVal: 2 },
  { id: 'm_gacha_5',   title: 'Mở 5 Rương tiếp tế trong Cửa Hàng',       target: 5,   stat: 'totalCrates',  rewardType: 'gems',   rewardVal: 150 }
];

const GIFTCODES = {
  TINY2026:    { coins: 2500, gems: 300, pearls: 5, label: 'Quà Tân Thủ Tiny Battle 2026!' },
  PIXELART:    { coins: 5000, gems: 500, pearls: 8, label: 'Gói Tài Nguyên Pixel-Art!' },
  HUNGADMINDZ: { admin: true, label: 'ĐÃ KÍCH HOẠT CHẾ ĐỘ ADMIN TOÀN QUYỀN!' }
};