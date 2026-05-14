// ╔═══════════════════════════════════════════════════════════╗
// ║               DEAD WAVE — ULTIMATE EDITION                ║
// ╚═══════════════════════════════════════════════════════════╝

// --- GLOBAL VARIABLES AND INITIAL SETUP ---
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
});

// --- CONSTANTS ---
const PLAYER_R = 18;
const BULLET_R = 4;
const BASE_FIRE_RATE = 160; // ms
const PLAYER_SAFE_ZONE = 300; // Distance from player center before monsters teleport
const MONSTER_TELEPORT_MIN_DIST_SQ = 10000; // Monsters won't teleport too close to player

// --- WEAPON DEFINITIONS ---
const WEAPONS = {
  pistol: {
    name: 'PISTOL', color: '#dddddd', baseAmmo: 12, baseFireRate: 300, baseDamage: 1,
    spread: 0.08, pierce: 1, critChance: 0.05, critMult: 1.5,
    bulletColor: '#ffffaa', trailColor: 'rgba(255,255,150,0.3)',
    isDraco: false,
    attachments: ['extended_mag_pistol', 'laser_sight_pistol', 'auto_switch_glock']
  },
  smg: {
    name: 'SMG', color: '#88bbff', baseAmmo: 30, baseFireRate: 100, baseDamage: 1,
    spread: 0.12, pierce: 1, critChance: 0.08, critMult: 1.5,
    bulletColor: '#aaddff', trailColor: 'rgba(150,200,255,0.3)',
    isDraco: false,
    attachments: ['extended_mag_smg', 'laser_sight_smg']
  },
  shotgun: {
    name: 'SHOTGUN', color: '#ff8844', baseAmmo: 8, baseFireRate: 600, baseDamage: 1.5,
    pellets: 6, spread: 0.35, pierce: 1, critChance: 0.05, critMult: 2,
    bulletColor: '#ffaa66', trailColor: 'rgba(255,160,80,0.3)',
    isDraco: false,
    attachments: ['extended_mag_shotgun', 'choke']
  },
  micro_draco: {
    name: 'MICRO DRACO', color: '#ff4500', baseAmmo: 18, baseFireRate: 120, baseDamage: 2.2,
    spread: 0.06, pierce: 3, critChance: 0.15, critMult: 2.0,
    bulletColor: '#ff2200', trailColor: 'rgba(255,80,0,0.4)',
    isDraco: true,
    attachments: ['extended_mag_draco', 'draco_scope']
  },
  draco: {
    name: '✦ THE DRACO ✦', color: '#ff8c00', baseAmmo: 20, baseFireRate: 200, baseDamage: 3.5,
    spread: 0.04, pierce: 4, critChance: 0.25, critMult: 2.5,
    igniteChance: 0.35, roarChance: 0.04,
    bulletColor: '#ff4500', trailColor: 'rgba(255,100,0,0.5)',
    isDraco: true,
    attachments: ['draco_breath', 'draco_scales', 'draco_wings', 'draco_exe']
  }
};

// ─────────────────────────────────────────
//  JACKPOT WHEEL WEAPON SLOTS
// ─────────────────────────────────────────
// Defines what the player can win from the jackpot wheel
const WEAPON_WHEEL_SLOTS = [
    { type: 'weapon', id: 'pistol' },
    { type: 'weapon', id: 'smg' },
    { type: 'weapon', id: 'shotgun' },
    { type: 'weapon', id: 'micro_draco' },
    // Draco is a special case, might be awarded via pickup or specific upgrade path
    // { type: 'weapon', id: 'draco' },
    { type: 'upgrade_points', amount: 5 }, // Example for other rewards
    { type: 'luck', amount: 3 },
];


// ─────────────────────────────────────────
//  ATTACHMENT DEFINITIONS
// ─────────────────────────────────────────
const ATTACHMENTS = {
  // Pistol Attachments
  extended_mag_pistol: { name: 'EXTENDED MAG', desc: '+50% Max Ammo', tier: 'rare', apply: s => { s.upgrades.ammoMult = (s.upgrades.ammoMult||1) * 1.5; } },
  laser_sight_pistol:  { name: 'LASER SIGHT', desc: '-15% Spread', tier: 'rare', apply: s => { s.upgrades.spreadMult = (s.upgrades.spreadMult||1) * 0.85; } },
  auto_switch_glock:   { name: 'AUTO SWITCH', desc: 'Enables full auto', tier: 'special', apply: s => { s.upgrades.auto_fire = true; } },

  // SMG Attachments
  extended_mag_smg:    { name: 'EXTENDED MAG', desc: '+50% Max Ammo', tier: 'rare', apply: s => { s.upgrades.ammoMult = (s.upgrades.ammoMult||1) * 1.5; } },
  laser_sight_smg:     { name: 'LASER SIGHT', desc: '-15% Spread', tier: 'rare', apply: s => { s.upgrades.spreadMult = (s.upgrades.spreadMult||1) * 0.85; } },

  // Shotgun Attachments
  extended_mag_shotgun:{ name: 'EXTENDED MAG', desc: '+50% Max Ammo', tier: 'rare', apply: s => { s.upgrades.ammoMult = (s.upgrades.ammoMult||1) * 1.5; } },
  choke:               { name: 'CHOKE', desc: '-25% Spread (tightens spread)', tier: 'special', apply: s => { s.upgrades.spreadMult = (s.upgrades.spreadMult||1) * 0.75; } },

  // Micro Draco Attachments
  extended_mag_draco:  { name: 'EXTENDED MAG', desc: '+50% Max Ammo', tier: 'epic', apply: s => { s.upgrades.ammoMult = (s.upgrades.ammoMult||1) * 1.5; } },
  draco_scope:         { name: 'DRACO SCOPE', desc: '+10% Crit Chance', tier: 'epic', apply: s => { s.upgrades.critChance = (s.upgrades.critChance||0) + 0.10; } },

  // Draco Mythic Upgrades (These are special, not really "attachments" but handled similarly)
  draco_breath: { name: "DRAGON'S BREATH", desc: 'Wider flame, scorches row of zombies', tier: 'mythic', apply: s => { s.upgrades.draco_breath = true; } },
  draco_scales: { name: 'ANCIENT SCALES', desc: 'Every 8 kills, regen 15 HP', tier: 'mythic', apply: s => { s.upgrades.draco_scales = true; } },
  draco_wings:  { name: 'INFERNAL WINGS', desc: 'Kill → brief speed surge', tier: 'mythic', apply: s => { s.upgrades.draco_wings = true; } },
  draco_exe:    { name: 'DRACONIC SOUL', desc: '+100% Draco damage, wide roar', tier: 'mythic', apply: s => { s.upgrades.damage=(s.upgrades.damage||1)*2; s.upgrades.draco_wideRoar=true; } },
};


// ─────────────────────────────────────────
//  UPGRADE POOL (Combined with Attachments)
// ─────────────────────────────────────────
const UPGRADE_POOL = [
  // General Upgrades
  { id:'dmg1',      icon:'🔴', name:'HOLLOW POINT',       desc:'+25% bullet damage',               tier:'common', minLuck:0,  apply: s=>{ s.upgrades.damage = (s.upgrades.damage||1)*1.25; } },
  { id:'dmg2',      icon:'💀', name:'ARMOR PIERCE',       desc:'+50% damage, ignores armor',        tier:'rare',   minLuck:10, apply: s=>{ s.upgrades.damage = (s.upgrades.damage||1)*1.5; } },
  { id:'fire1',     icon:'⚡', name:'HAIR TRIGGER',       desc:'-20% fire delay',                   tier:'common', minLuck:0,  apply: s=>{ s.upgrades.fireRate = (s.upgrades.fireRate||1)*0.80; } },
  { id:'fire2',     icon:'🌩', name:'FULL AUTO',           desc:'-35% fire delay',                   tier:'rare',   minLuck:8,  apply: s=>{ s.upgrades.fireRate = (s.upgrades.fireRate||1)*0.65; } },
  { id:'crit1',     icon:'✨', name:'KEEN EYE',            desc:'+15% crit chance',                  tier:'common', minLuck:0,  apply: s=>{ s.upgrades.critChance = (s.upgrades.critChance||0)+0.15; } },
  { id:'crit2',     icon:'💥', name:'EXECUTIONER',        desc:'Crits deal 3x instead of 2x',       tier:'epic',   minLuck:15, apply: s=>{ s.upgrades.critMult = (s.upgrades.critMult||1)*1.5; } },
  { id:'pierce1',   icon:'➡', name:'PENETRATOR',          desc:'+2 pierce (bullets hit more)',      tier:'rare',   minLuck:5,  apply: s=>{ s.upgrades.pierce = (s.upgrades.pierce||0)+2; } },
  { id:'reload1',   icon:'🔄', name:'SPEED LOADER',       desc:'-25% reload time',                  tier:'common', minLuck:0,  apply: s=>{ s.upgrades.reload = (s.upgrades.reload||1)*0.75; } },
  { id:'freeze1',   icon:'❄', name:'CRYO ROUNDS',         desc:'Bullets slow zombies -30%',         tier:'epic',   minLuck:12, apply: s=>{ s.upgrades.cryo = true; } },
  { id:'toxic1',    icon:'☠', name:'TOXIC ROUNDS',        desc:'Bullets poison zombies (DoT)',      tier:'epic',   minLuck:12, apply: s=>{ s.upgrades.toxic = true; } },

  // Attachments (will be filtered by current weapon)
  // Pistol
  { id:'extended_mag_pistol', icon: '📦', name: ATTACHMENTS.extended_mag_pistol.name, desc: ATTACHMENTS.extended_mag_pistol.desc, tier: ATTACHMENTS.extended_mag_pistol.tier, minLuck: 0, apply: ATTACHMENTS.extended_mag_pistol.apply },
  { id:'laser_sight_pistol', icon: '🎯', name: ATTACHMENTS.laser_sight_pistol.name, desc: ATTACHMENTS.laser_sight_pistol.desc, tier: ATTACHMENTS.laser_sight_pistol.tier, minLuck: 5, apply: ATTACHMENTS.laser_sight_pistol.apply },
  { id:'auto_switch_glock', icon: '🔫', name: ATTACHMENTS.auto_switch_glock.name, desc: ATTACHMENTS.auto_switch_glock.desc, tier: ATTACHMENTS.auto_switch_glock.tier, minLuck: 15, apply: ATTACHMENTS.auto_switch_glock.apply },

  // SMG
  { id:'extended_mag_smg', icon: '📦', name: ATTACHMENTS.extended_mag_smg.name, desc: ATTACHMENTS.extended_mag_smg.desc, tier: ATTACHMENTS.extended_mag_smg.tier, minLuck: 0, apply: ATTACHMENTS.extended_mag_smg.apply },
  { id:'laser_sight_smg', icon: '🎯', name: ATTACHMENTS.laser_sight_smg.name, desc: ATTACHMENTS.laser_sight_smg.desc, tier: ATTACHMENTS.laser_sight_smg.tier, minLuck: 5, apply: ATTACHMENTS.laser_sight_smg.apply },

  // Shotgun
  { id:'extended_mag_shotgun', icon: '📦', name: ATTACHMENTS.extended_mag_shotgun.name, desc: ATTACHMENTS.extended_mag_shotgun.desc, tier: ATTACHMENTS.extended_mag_shotgun.tier, minLuck: 0, apply: ATTACHMENTS.extended_mag_shotgun.apply },
  { id:'choke', icon: '🪶', name: ATTACHMENTS.choke.name, desc: ATTACHMENTS.choke.desc, tier: ATTACHMENTS.choke.tier, minLuck: 8, apply: ATTACHMENTS.choke.apply },

  // Micro Draco
  { id:'extended_mag_draco', icon: '📦', name: ATTACHMENTS.extended_mag_draco.name, desc: ATTACHMENTS.extended_mag_draco.desc, tier: ATTACHMENTS.extended_mag_draco.tier, minLuck: 0, apply: ATTACHMENTS.extended_mag_draco.apply },
  { id:'draco_scope', icon: '🔭', name: ATTACHMENTS.draco_scope.name, desc: ATTACHMENTS.draco_scope.desc, tier: ATTACHMENTS.draco_scope.tier, minLuck: 12, apply: ATTACHMENTS.draco_scope.apply },

  // Draco Mythic Upgrades (handled as special upgrades)
  { id:'draco_breath', icon: '🐉', name: ATTACHMENTS.draco_breath.name, desc: ATTACHMENTS.draco_breath.desc, tier: ATTACHMENTS.draco_breath.tier, minLuck: 5, apply: ATTACHMENTS.draco_breath.apply },
  { id:'draco_scales', icon: '🛡', name: ATTACHMENTS.draco_scales.name, desc: ATTACHMENTS.draco_scales.desc, tier: ATTACHMENTS.draco_scales.tier, minLuck: 5, apply: ATTACHMENTS.draco_scales.apply },
  { id:'draco_wings',  icon: '🜂', name: ATTACHMENTS.draco_wings.name, desc: ATTACHMENTS.draco_wings.desc, tier: ATTACHMENTS.draco_wings.tier, minLuck: 5, apply: ATTACHMENTS.draco_wings.apply },
  { id:'draco_exe',    icon: '⚰', name: ATTACHMENTS.draco_exe.name, desc: ATTACHMENTS.draco_exe.desc, tier: ATTACHMENTS.draco_exe.tier, minLuck: 20, apply: ATTACHMENTS.draco_exe.apply },
];

// ─────────────────────────────────────────
//  BOSS DEFINITIONS
// ─────────────────────────────────────────
const BOSSES = {
  wave_5_1: {
    name: 'THE ABOMINATION', hp: 150, speed: 0.4, radius: 40, damage: 25, score: 200, color: '#6a0dad',
    eyeColor: '#ff00ff', deathGore: 'burst', attackRate: 50,
    abilities: ['slam', 'spit_acid']
  },
  wave_10_1: {
    name: 'THE COLOSSUS', hp: 300, speed: 0.3, radius: 55, damage: 40, score: 400, color: '#8b4513',
    eyeColor: '#ffa500', deathGore: 'burst', attackRate: 70,
    abilities: ['ground_pound', 'charge']
  },
  wave_15_1: {
    name: 'THE VOID REAPER', hp: 450, speed: 0.6, radius: 35, damage: 35, score: 600, color: '#000080',
    eyeColor: '#00ffff', deathGore: 'smear', attackRate: 40,
    abilities: ['teleport', 'soul_drain']
  }
};

// ─────────────────────────────────────────
//  ZOMBIE DEFINITIONS
// ─────────────────────────────────────────
const ZOMBIE_TYPES = {
  walker: {
    name:'walker', hp:3, speed:0.9, radius:16, damage:10, score:10, color:'#3d6e2a',
    eyeColor:'#ff2222', deathGore:'normal', attackRate:40,
    dropBloodTrail: false
  },
  runner: {
    name:'runner', hp:1.5, speed:2.8, radius:12, damage:6, score:15, color:'#5aaa3a',
    eyeColor:'#ff6600', deathGore:'smear', attackRate:25,
    dropBloodTrail: true
  },
  brute: {
    name:'brute', hp:12, speed:0.55, radius:28, damage:22, score:35, color:'#1e3d10',
    eyeColor:'#ff0000', deathGore:'burst', attackRate:60,
    dropBloodTrail: false
  },
  exploder: {
    name:'exploder', hp:2, speed:1.6, radius:15, damage:0, score:20, color:'#7c5500',
    eyeColor:'#ffaa00', deathGore:'explode', attackRate:999,
    dropBloodTrail: false
  }
};

// ─────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────
function makeState() {
  return {
    player: {
      x: 0, y: 0, angle: 0, // Start at 0,0 for infinite map
      hp: 100, maxHp: 100,
      ammo: 12, reloading: false, reloadTimer: 0,
      speed: 3.6, speedBoost: 0,
      invincible: 0,
      weapon: 'pistol', // Starter weapon is pistol
      hasDraco: false,
      dracoWeaponSlot: null, // To store the specific Draco weapon instance

      // Leveling system
      playerLevel: 1,
      xp: 0,
      xpToLevelUp: 100, // Initial XP needed
    },
    upgrades: {
      damage:1, fireRate:1, critChance:0, critMult:1, pierce:0, reload:1,
      ammoMult:1, spreadMult:1, // Added spreadMult
      cryo: false, toxic: false, auto_fire: false, // status effects
      draco_breath: false, draco_scales: false, draco_wings: false, draco_wideRoar: false // Draco specific
    },
    appliedUpgrades: [], // Stores IDs of applied upgrades
    luck: 0,
    score: 0, kills: 0, bloodSpilled: 0,
    combo: 0, comboTimer: 0,
    wave: 0,
    zombiesToSpawn: 0, zombiesSpawned: 0, zombiesRemaining: 0,
    spawnTimer: 0,
    lastFire: 0,
    state: 'menu', // menu playing waveComplete gameover
    waveTimer: 0,
    screenShake: 0,
    dracoKillStreak: 0,
    totalDracoKills: 0,

    // Boss fight specific
    currentBoss: null,
    bossActive: false,
    bossHealthBarVisible: false,

    // entities
    bullets: [], zombies: [], particles: [], pickups: [],
    corpses: [], burnMarks: [], flashes: [], roarBlasts: [],

    // camera
    cam: { x:0, y:0 }, // Camera starts at 0,0

    // input
    keys: {}, mouse: { x:0, y:0, down:false },

    // Jackpot Wheel state
    jackpotWheelVisible: false,
    jackpotSpinning: false,
    jackpotResult: null,
  };
}
let G = makeState();

// ─────────────────────────────────────────
//  INPUT
// ─────────────────────────────────────────
window.addEventListener('keydown', e => {
  G.keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'r') tryReload();
  if (e.key.toLowerCase() === 'q') switchWeapon();
  if (e.key.toLowerCase() === ' ') { // Spacebar for special actions or maybe firing?
    if (G.player.weapon === 'draco' && G.upgrades.draco_breath) {
      // Implement Draco Breath action if available
    }
  }
  e.preventDefault();
});
window.addEventListener('keyup',   e => { G.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove',e => { G.mouse.x = e.clientX; G.mouse.y = e.clientY; });
canvas.addEventListener('mousedown',e => {
  if(e.button===0) G.mouse.down = true;
  if(G.state === 'playing' || G.state === 'waveComplete') tryShoot(); // Shoot on click
});
canvas.addEventListener('mouseup',  e => { if(e.button===0) G.mouse.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────
function lerp(a,b,t){ return a+(b-a)*t; }
function dist2(ax,ay,bx,by){ const dx=ax-bx,dy=ay-by; return dx*dx+dy*dy; }
function dist(ax,ay,bx,by){ return Math.sqrt(dist2(ax,ay,bx,by)); }
function rnd(min,max){ return min+Math.random()*(max-min); }
function rndInt(min,max){ return Math.floor(rnd(min,max+1)); }
function chance(p){ return Math.random()<p; }
function clamp(v,lo,hi){ return v<lo?lo:v>hi?hi:v; }
function luckScale(base, luckVal){ return base * (1 + luckVal * 0.03); }
function clampToMap(x, y, radius) {
    // For infinite map, we don't clamp to fixed boundaries.
    // However, we might want to keep entities within a certain radius of the player
    // to prevent them from going *too* far off-screen and causing performance issues.
    // For now, we'll let them roam freely.
    return { x, y };
}

// ─────────────────────────────────────────
//  PARTICLES
// ─────────────────────────────────────────
class Particle {
  constructor(x,y,vx,vy,life,size,color,gravity=0){
    this.x=x; this.y=y; this.vx=vx; this.vy=vy;
    this.life=life; this.maxLife=life;
    this.size=size; this.color=color; this.gravity=gravity;
  }
  update(){
    this.x+=this.vx; this.y+=this.vy;
    this.vy+=this.gravity;
    this.vx*=0.93; this.vy*=0.93;
    this.life--;
  }
  get alpha(){ return this.life/this.maxLife; }
}

function spawnBlood(x,y,count=8,big=false){
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2;
    const spd=rnd(big?2:1, big?6:4);
    const size=big?rnd(3,7):rnd(1.5,4);
    G.particles.push(new Particle(x,y,Math.cos(a)*spd,Math.sin(a)*spd,rndInt(20,45),size,'#cc0000',0.06));
  }
  // ground splatter
  for(let i=0;i<(big?5:2);i++){
    const ox=rnd(-15,15), oy=rnd(-15,15);
    G.burnMarks.push({ x:x+ox, y:y+oy, r:big?rnd(8,20):rnd(4,10), color:'rgba(100,0,0,0.45)', life:1200, maxLife:1200 });
  }
  G.bloodSpilled += count*2;
}

function spawnEmbers(x,y,count=6){
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2;
    const spd=rnd(1,4);
    G.particles.push(new Particle(x,y,Math.cos(a)*spd,Math.sin(a)*spd,rndInt(15,35),rnd(1.5,3.5),'#ff6600',0.04));
  }
}

function spawnGore(x,y,color='#880000'){
  for(let i=0;i<12;i++){
    const a=Math.random()*Math.PI*2;
    const spd=rnd(1.5,7);
    const sz=rnd(2,6);
    G.particles.push(new Particle(x,y,Math.cos(a)*spd,Math.sin(a)*spd,rndInt(25,55),sz,color,0.05));
  }
}

function spawnFlesh(x,y){
  const chunks=['#8B2500','#A83200','#660000'];
  for(let i=0;i<5;i++){
    const a=Math.random()*Math.PI*2;
    const spd=rnd(2,8);
    const c=chunks[Math.floor(Math.random()*chunks.length)];
    G.particles.push(new Particle(x,y,Math.cos(a)*spd,Math.sin(a)*spd,rndInt(20,45),rnd(3,8),c,0.1));
  }
}

// ─────────────────────────────────────────
//  WEAPON LOGIC
// ─────────────────────────────────────────
function getWeaponData(){
  const p = G.player;
  const baseWeapon = WEAPONS[p.weapon];

  // Handle Draco weapon slot specifically
  let currentWeapon = baseWeapon;
  if (p.weapon === 'draco' && p.dracoWeaponSlot) {
      currentWeapon = p.dracoWeaponSlot; // Use the specific Draco instance if available
  }

  const u = G.upgrades;

  // Base stats
  let damage = currentWeapon.baseDamage;
  let fireRate = currentWeapon.baseFireRate;
  let maxAmmo = currentWeapon.baseAmmo;
  let spread = currentWeapon.spread;
  let pierce = currentWeapon.pierce;
  let critChance = currentWeapon.critChance;
  let critMult = currentWeapon.critMult;

  // Apply general upgrades
  damage *= (u.damage || 1);
  fireRate *= (u.fireRate || 1);
  maxAmmo = Math.floor(maxAmmo * (u.ammoMult || 1));
  spread *= (u.spreadMult || 1); // Apply spread multiplier
  pierce += (u.pierce || 0);
  critChance += (u.critChance || 0);
  critMult *= (u.critMult || 1);

  // Apply weapon-specific upgrades/attachments
  if (p.weapon === 'pistol') {
    if (u.auto_fire) {
      fireRate = Math.max(50, fireRate * 0.5); // Make it fully auto, capped fire rate
      maxAmmo = Math.floor(maxAmmo * 1.2); // Small ammo bonus for auto
    }
    // Spread multiplier is handled by G.upgrades.spreadMult, which applies to all weapons if defined
  }
  if (p.weapon === 'smg' && u.spreadMult !== undefined) spread *= u.spreadMult;
  if (p.weapon === 'shotgun' && u.spreadMult !== undefined) spread *= u.spreadMult; // Choke effect

  // Clamp values
  critChance = Math.min(0.95, critChance);
  spread = Math.max(0.01, spread); // Ensure spread is not zero or negative

  return {
    ...currentWeapon, // Spread base properties
    damage, fireRate, maxAmmo, spread, pierce, critChance, critMult,
    isDraco: currentWeapon.isDraco, // Ensure this is correctly set
    igniteChance: currentWeapon.igniteChance,
    roarChance: currentWeapon.roarChance,
    pellets: currentWeapon.pellets,
  };
}

function applyWeaponSpecificUpgrades(weaponId, upgradesState) {
    const weaponUpgrades = {};
    // General upgrades
    weaponUpgrades.damage = WEAPONS[weaponId].baseDamage;
    weaponUpgrades.fireRate = WEAPONS[weaponId].baseFireRate;
    weaponUpgrades.maxAmmo = WEAPONS[weaponId].baseAmmo;
    weaponUpgrades.spread = WEAPONS[weaponId].spread;
    weaponUpgrades.pierce = WEAPONS[weaponId].pierce;
    weaponUpgrades.critChance = WEAPONS[weaponId].critChance;
    weaponUpgrades.critMult = WEAPONS[weaponId].critMult;

    // Apply general upgrades from G.upgrades
    weaponUpgrades.damage *= (upgradesState.damage || 1);
    weaponUpgrades.fireRate *= (upgradesState.fireRate || 1);
    weaponUpgrades.maxAmmo = Math.floor(weaponUpgrades.maxAmmo * (upgradesState.ammoMult || 1));
    weaponUpgrades.spread *= (upgradesState.spreadMult || 1);
    weaponUpgrades.pierce += (upgradesState.pierce || 0);
    weaponUpgrades.critChance += (upgradesState.critChance || 0);
    weaponUpgrades.critMult *= (upgradesState.critMult || 1);

    // Apply weapon-specific upgrades/attachments
    if (weaponId === 'pistol') {
        if (upgradesState.auto_fire) {
            weaponUpgrades.fireRate = Math.max(50, weaponUpgrades.fireRate * 0.5);
            weaponUpgrades.maxAmmo = Math.floor(weaponUpgrades.maxAmmo * 1.2);
        }
        // Spread multiplier is handled by G.upgrades.spreadMult, which applies to all weapons if defined
    }
    // Add other weapon-specific logic here if needed

    return weaponUpgrades;
}


function tryReload(){
  const p = G.player;
  if(p.reloading) return;
  const wd = getWeaponData();
  if(p.ammo >= wd.maxAmmo) return;
  p.reloading = true;
  const reloadTime = (p.weapon === 'shotgun' ? 900 : 600) * (G.upgrades.reload||1);
  p.reloadTimer = reloadTime;
}

function switchWeapon(){
  const p = G.player;
  const currentWeaponId = p.weapon;
  const availableWeapons = Object.keys(WEAPONS);

  let nextWeaponId = currentWeaponId;
  let currentIndex = availableWeapons.indexOf(currentWeaponId);

  // Cycle through weapons
  do {
      currentIndex = (currentIndex + 1) % availableWeapons.length;
      nextWeaponId = availableWeapons[currentIndex];
  } while (
      // Skip Draco if player doesn't have it equipped or found
      (nextWeaponId === 'draco' && !p.hasDraco) ||
      // Skip Micro Draco if player doesn't have it
      (nextWeaponId === 'micro_draco' && !WEAPONS[nextWeaponId]) || // Check if micro_draco is defined
      // Skip Glock auto if player hasn't unlocked the attachment
      (nextWeaponId === 'pistol' && WEAPONS.pistol.attachments.includes('auto_switch_glock') && !G.upgrades.auto_fire)
  );

  p.weapon = nextWeaponId;
  // Set ammo to max for new weapon
  p.ammo = getWeaponData().maxAmmo;
  p.reloading = false; // Cancel any current reload
  p.reloadTimer = 0;
}

function tryShoot(){
  const p = G.player;
  const wd = getWeaponData();
  const now = performance.now();

  // Check if auto-fire is enabled for pistol
  const isAutoPistol = (p.weapon === 'pistol' && G.upgrades.auto_fire);

  if(p.reloading) return;
  if(p.ammo <= 0){
    if (!p.reloading) tryReload(); // Only try to reload if not already reloading
    return;
  }
  if(now - G.lastFire < wd.fireRate) return;

  // Draco-specific checks
  if (wd.isDraco) {
    // Draco has ignite and roar chances
    if (chance(wd.igniteChance)) { /* Ignite logic handled by bullet */ }
    if (chance(wd.roarChance + (G.upgrades.draco_wideRoar ? 0.06 : 0))) {
      triggerDraconicRoar(p.x, p.y);
    }
  }

  G.lastFire = now;
  const shots = wd.pellets || 1;
  for(let s=0; s<shots; s++){
    const spreadAngle = (Math.random()-0.5)*wd.spread;
    const angle = p.angle + spreadAngle;
    const isCrit = chance(wd.critChance);
    const dmg = wd.damage * (isCrit ? wd.critMult : 1);
    const bx = p.x + Math.cos(angle)*28;
    const by = p.y + Math.sin(angle)*28;

    // Add bullet properties
    const bulletProps = {
      x:bx, y:by,
      vx: Math.cos(angle)*12,
      vy: Math.sin(angle)*12,
      damage: dmg,
      pierce: wd.pierce,
      pierceCount: 0,
      life: 90,
      crit: isCrit,
      color: wd.bulletColor,
      trailColor: wd.trailColor,
      isDraco: wd.isDraco,
      ignited: wd.isDraco && chance(wd.igniteChance), // Assign ignite chance here
      cryo: G.upgrades.cryo || false,
      toxic: G.upgrades.toxic || false,
      hitIds: new Set(), // To prevent hitting the same zombie multiple times per bullet
    };
    G.bullets.push(bulletProps);
  }

  p.ammo--;
  G.screenShake = Math.max(G.screenShake, wd.isDraco ? 5 : 2);

  // Muzzle flash
  G.flashes.push({
    x: p.x+Math.cos(p.angle)*30,
    y: p.y+Math.sin(p.angle)*30,
    life:1, angle: p.angle, isDraco: wd.isDraco
  });

  // If it's an auto pistol, allow shooting again quickly if ammo is available
  if (isAutoPistol && p.ammo > 0) {
      G.lastFire = now - wd.fireRate + 50; // Allow rapid firing by reducing the cooldown slightly
  }
}


function triggerDraconicRoar(x,y){
  const radius = G.upgrades.draco_wideRoar ? 260 : 180;
  G.roarBlasts.push({ x, y, r:0, maxR:radius, life:1 });
  G.screenShake = Math.max(G.screenShake, 14);
  for(let i=0;i<30;i++) spawnEmbers(x,y);
  showWaveAnnounce('🐉 DRACONIC ROAR 🐉', '#ff8c00');

  // Damage all zombies in range
  for(let i=G.zombies.length-1;i>=0;i--){
    const z=G.zombies[i];
    if(dist2(x,y,z.x,z.y)<radius*radius){
      const angle2=Math.atan2(z.y-y,z.x-x);
      z.x += Math.cos(angle2)*80; // Push them back
      z.y += Math.sin(angle2)*80;
      z.hp -= 999; // Vaporize
      z.ignited = true; // Ignite them
      z.igniteTicks = 120;
    }
  }
}

// ─────────────────────────────────────────
//  ZOMBIE SPAWNING & TELEPORTATION
// ─────────────────────────────────────────
function getZombieTypeForWave(wave){
  const roll = Math.random();
  if(wave<2) return 'walker';
  if(wave<4){ return roll<0.7?'walker':'runner'; }
  if(wave<6){ if(roll<0.5) return 'walker'; if(roll<0.8) return 'runner'; return 'brute'; }
  if(wave<8) { if(roll<0.3) return 'walker'; if(roll<0.6) return 'runner'; if(roll<0.85) return 'brute'; return 'exploder'; }
  // Higher waves get more variety and tougher enemies
  if(roll<0.2) return 'walker';
  if(roll<0.45) return 'runner';
  if(roll<0.7) return 'brute';
  if(roll<0.9) return 'exploder';
  return 'brute'; // More brutes in later waves
}

function spawnZombie(){
  const p = G.player;
  let x, y;

  // Try to spawn zombies further away from the player for infinite map
  const spawnRadius = Math.max(canvas.width, canvas.height) * 1.5 + G.wave * 30; // Spawn further as wave increases
  const angle = Math.random() * Math.PI * 2;
  x = p.x + Math.cos(angle) * spawnRadius;
  y = p.y + Math.sin(angle) * spawnRadius;

  // Ensure zombies don't spawn *exactly* on the player
  if (dist2(x, y, p.x, p.y) < PLAYER_SAFE_ZONE * PLAYER_SAFE_ZONE) {
      // Reposition further away if too close
      const angleToPlayer = Math.atan2(y - p.y, x - p.x);
      x = p.x + Math.cos(angleToPlayer) * (PLAYER_SAFE_ZONE + rnd(50, 150));
      y = p.y + Math.sin(angleToPlayer) * (PLAYER_SAFE_ZONE + rnd(50, 150));
  }

  const typeName = getZombieTypeForWave(G.wave);
  const tpl = ZOMBIE_TYPES[typeName];
  const wm = 1 + G.wave*0.12; // Wave multiplier for stats

  G.zombies.push({
    id: Math.random(),
    x, y,
    type: typeName,
    hp: tpl.hp*wm, maxHp: tpl.hp*wm,
    speed: tpl.speed*(1+G.wave*0.03),
    radius: tpl.radius,
    damage: tpl.damage,
    score: tpl.score,
    color: tpl.color,
    eyeColor: tpl.eyeColor,
    deathGore: tpl.deathGore,
    attackRate: tpl.attackRate,
    attackTimer: 0,
    wobble: Math.random()*Math.PI*2,
    wobbleSpd: rnd(0.08,0.15),
    ignited: false, igniteTicks: 0, igniteTimer: 0,
    poisoned: false, poisonTicks: 0,
    frozen: false, frozenTimer: 0,
    bloodTrail: tpl.dropBloodTrail,
    bloodTrailTimer: 0,
    hitFlash: 0,
    // Boss specific properties (if it's a boss)
    isBoss: false,
  });
  G.zombiesSpawned++;
}

function teleportMonsters(){
  const p = G.player;
  const playerDistSq = dist2(p.x, p.y, 0, 0); // Distance from origin (or a central point)

  // Only teleport if player is significantly far from origin
  if (playerDistSq < PLAYER_SAFE_ZONE * PLAYER_SAFE_ZONE) return;

  for (let i = G.zombies.length - 1; i >= 0; i--) {
    const z = G.zombies[i];
    if (z.isBoss) continue; // Don't teleport bosses

    const distToPlayerSq = dist2(z.x, z.y, p.x, p.y);

    // If a monster is too far from the player, reposition it closer
    if (distToPlayerSq > (PLAYER_SAFE_ZONE * 1.8) * (PLAYER_SAFE_ZONE * 1.8) && distToPlayerSq > MONSTER_TELEPORT_MIN_DIST_SQ) {
      const angle = Math.random() * Math.PI * 2;
      // Reposition it within a radius around the player
      const repositionRadius = PLAYER_SAFE_ZONE + rnd(50, 150);
      z.x = p.x + Math.cos(angle) * repositionRadius;
      z.y = p.y + Math.sin(angle) * repositionRadius;
      z.attackTimer = Math.max(0, z.attackTimer - 30); // Reduce attack timer slightly to prevent instant attack on teleport
    }
  }
}

// ─────────────────────────────────────────
//  PICKUPS
// ─────────────────────────────────────────
const PICKUP_COLORS = { ammo:'#ffcc00', health:'#39ff14', luck:'#dd88ff', draco:'#ff8c00', chest:'#ffd700' };

function trySpawnPickup(x,y,lucky){
  const luckFactor = 1 + G.luck*0.02;
  const roll = Math.random();

  // Special pickup logic based on luck and wave
  if(G.wave>=5 && !G.player.hasDraco && chance(luckScale(0.04, G.luck))){
    G.pickups.push({ x, y, type:'draco', life:800, bob:Math.random()*Math.PI*2 });
    return;
  }
  if(chance(0.06+luckFactor)){
    G.pickups.push({ x, y, type:'chest', life:700, bob:Math.random()*Math.PI*2 });
    return;
  }
  if(chance(0.22+luckFactor*0.5)){
    const t = roll<0.45?'ammo':roll<0.75?'health':'luck';
    G.pickups.push({ x, y, type:t, life:600, bob:Math.random()*Math.PI*2 });
  }
}

// ─────────────────────────────────────────
//  BOSS FIGHT LOGIC
// ─────────────────────────────────────────
function startBossFight(bossId) {
    G.currentBoss = BOSSES[bossId];
    G.currentBoss.id = Math.random(); // Unique ID for boss
    G.currentBoss.x = 0; // Boss starts at origin
    G.currentBoss.y = 0;
    G.currentBoss.hp = G.currentBoss.hp; // Ensure starting HP
    G.currentBoss.maxHp = G.currentBoss.hp;
    G.currentBoss.isBoss = true;
    G.currentBoss.attackTimer = 0;
    G.currentBoss.targetAngle = 0; // For movement
    G.currentBoss.specialTimer = 0; // For abilities
    G.currentBoss.wobble = Math.random()*Math.PI*2; // Add wobble for boss too
    G.currentBoss.wobbleSpd = rnd(0.04,0.08); // Slower wobble for boss

    // Add boss to the zombies list
    G.zombies.push(G.currentBoss);
    G.bossActive = true;
    G.bossHealthBarVisible = true;
    document.getElementById('boss-name').textContent = G.currentBoss.name;
    document.getElementById('boss-health-bar-container').classList.add('visible');
    showWaveAnnounce(`BOSS APPROACHING: ${G.currentBoss.name}`, '#ff4444');
}

function endBossFight() {
    G.bossActive = false;
    G.bossHealthBarVisible = false;
    document.getElementById('boss-health-bar-container').classList.remove('visible');
    G.currentBoss = null;
    // Continue to end wave logic
    endWave();
}

function handleBossAbilities() {
    if (!G.currentBoss) return;
    const boss = G.currentBoss;
    const p = G.player;
    const distToPlayer = dist(boss.x, boss.y, p.x, p.y);

    // Boss movement (simplified)
    if (!boss.isCharging && !boss.isTeleporting) { // Don't move during charge or teleport
        const angleToPlayer = Math.atan2(p.y - boss.y, p.x - boss.x);
        boss.targetAngle = angleToPlayer;
        boss.x += Math.cos(angleToPlayer) * boss.speed;
        boss.y += Math.sin(angleToPlayer) * boss.speed;
    }

    // Boss wobble
    boss.wobble += boss.wobbleSpd;

    // Attack timers
    if (boss.attackTimer > 0) boss.attackTimer--;
    if (boss.specialTimer > 0) boss.specialTimer--;

    // Execute abilities
    for (const ability of boss.abilities) {
        if (boss.attackTimer === 0 && distToPlayer < boss.radius * 1.8) { // Attack range check (slightly larger)
            if (ability === 'slam' && boss.attackTimer === 0) {
                boss.attackTimer = boss.attackRate * 1.5; // Longer cooldown for slam
                boss.isSlamming = true; // Flag for animation/effect
                G.screenShake = Math.max(G.screenShake, 15);
                spawnBlood(p.x, p.y, 20, true); // Player takes damage
                p.hp -= boss.damage * 1.2;
                setTimeout(() => { boss.isSlamming = false; }, 300); // Slam effect duration
                break; // Only one ability per "attack cycle" for now
            }
            if (ability === 'spit_acid' && boss.attackTimer === 0) {
                boss.attackTimer = boss.attackRate * 1.2;
                boss.isSpitting = true;
                const acidAng = Math.atan2(p.y - boss.y, p.x - boss.x) + rnd(-0.1, 0.1);
                G.bullets.push({ // Acid projectile
                    x: boss.x + Math.cos(acidAng) * boss.radius,
                    y: boss.y + Math.sin(acidAng) * boss.radius,
                    vx: Math.cos(acidAng) * 10,
                    vy: Math.sin(acidAng) * 10,
                    damage: boss.damage * 0.8, // Acid does less direct damage but might have DoT
                    pierce: 1, life: 120, color: '#00ff00', trailColor: 'rgba(0,255,0,0.3)', isBossProjectile: true,
                    isAcid: true, // Mark as acid
                });
                setTimeout(() => { boss.isSpitting = false; }, 200);
                break;
            }
            if (ability === 'charge' && boss.attackTimer === 0 && distToPlayer > boss.radius * 4) { // Charge when player is further away
                boss.attackTimer = boss.attackRate * 2.5;
                boss.isCharging = true;
                boss.chargeAngle = Math.atan2(p.y - boss.y, p.x - boss.x);
                const chargeSpeed = boss.speed * 5;
                const chargeDuration = 60; // Frames for charge
                const chargeInterval = setInterval(() => {
                    if (!boss.isCharging || !G.currentBoss) { clearInterval(chargeInterval); return; }
                    boss.x += Math.cos(boss.chargeAngle) * chargeSpeed;
                    boss.y += Math.sin(boss.chargeAngle) * chargeSpeed;
                    if (dist2(boss.x, boss.y, p.x, p.y) < (boss.radius + PLAYER_R) * (boss.radius + PLAYER_R)) {
                        p.hp -= boss.damage * 1.5; // Collision damage
                        p.invincible = 40;
                        G.screenShake = Math.max(G.screenShake, 12);
                        boss.isCharging = false; // Stop charging on hit
                        clearInterval(chargeInterval);
                    }
                }, 16);
                setTimeout(() => {
                    if (boss.isCharging) boss.isCharging = false; // Stop if player dodged
                }, chargeDuration * 16);
                break;
            }
            if (ability === 'teleport' && boss.attackTimer === 0 && distToPlayer > boss.radius * 3) { // Teleport when player is far
                boss.attackTimer = boss.attackRate * 3; // Long cooldown
                boss.isTeleporting = true;
                const angle = Math.atan2(p.y - boss.y, p.x - boss.x);
                const teleportDist = distToPlayer * 0.8; // Teleport closer but not too close
                boss.x = p.x - Math.cos(angle) * teleportDist + rnd(-50, 50);
                boss.y = p.y - Math.sin(angle) * teleportDist + rnd(-50, 50);
                setTimeout(() => { boss.isTeleporting = false; }, 400);
                break;
            }
            if (ability === 'soul_drain' && boss.specialTimer === 0 && distToPlayer < boss.radius * 2) { // Drain when close
                boss.specialTimer = boss.attackRate * 4; // Very long cooldown
                boss.isDraining = true;
                const drainAmount = 15;
                p.hp -= drainAmount;
                boss.hp += drainAmount * 0.8; // Boss heals slightly
                boss.hp = Math.min(boss.maxHp, boss.hp);
                G.screenShake = Math.max(G.screenShake, 8);
                setTimeout(() => { boss.isDraining = false; }, 500);
                break;
            }
        }
    }
}


// ─────────────────────────────────────────
//  WAVE MANAGEMENT
// ─────────────────────────────────────────
function startWave(){
  G.wave++;
  G.zombiesToSpawn = Math.floor(6 + G.wave*3 + G.wave*G.wave*0.25);
  G.zombiesSpawned = 0;
  G.zombiesRemaining = G.zombiesToSpawn;
  G.spawnTimer = 0;
  G.state = 'playing';
  G.player.ammo = getWeaponData().maxAmmo; // Refill ammo on new wave

  // Boss fight check
  if (G.wave % 5 === 0) {
    G.bossActive = true;
    let bossId = `wave_${G.wave}_1`; // Simple boss naming for now
    if (!BOSSES[bossId]) bossId = Object.keys(BOSSES)[Math.floor(Math.random() * Object.keys(BOSSES).length)]; // Fallback to random boss
    startBossFight(bossId);
  } else {
    G.bossActive = false;
    G.bossHealthBarVisible = false;
    document.getElementById('boss-health-bar-container').classList.remove('visible');
  }

  if (!G.bossActive) {
      showWaveAnnounce(`WAVE ${G.wave}`, '#ff4444');
  }
  updateHUD();
}

function endWave(){
  G.state = 'waveComplete';
  G.waveTimer = 240;

  // XP gain for leveling up
  const xpGain = 50 + G.wave * 10; // Gain more XP on later waves
  G.player.xp += xpGain;
  let leveledUp = false;
  while (G.player.xp >= G.player.xpToLevelUp) {
      G.player.xp -= G.player.xpToLevelUp;
      G.player.playerLevel++;
      G.player.xpToLevelUp = Math.floor(G.player.xpToLevelUp * 1.3); // Increase XP needed for next level
      leveledUp = true;
  }

  if (leveledUp) {
      openJackpotWheel(); // Open the wheel on level up
      // Don't immediately start next wave, wait for wheel to close
      return;
  }

  // Luck gain per wave (scaling)
  const luckGain = 1 + Math.floor(G.wave*0.4);
  G.luck += luckGain;

  // Check luck milestones
  checkLuckMilestone();

  // HP regen
  G.player.hp = Math.min(G.player.maxHp, G.player.hp + 15);

  if (!G.bossActive) {
    showWaveAnnounce(`WAVE ${G.wave} CLEAR!`, '#39ff14');
    setTimeout(()=>{ openUpgradeMenu(); }, 1600);
  } else {
    // Boss defeated
    showWaveAnnounce(`BOSS DEFEATED!`, '#39ff14');
    G.player.ammo = getWeaponData().maxAmmo; // Full ammo after boss
    setTimeout(()=>{ openUpgradeMenu(); }, 1600);
  }
}

function checkLuckMilestone(){
  const milestones = [10,20,30,50,75,100, 150, 200]; // Added more milestones
  for(const m of milestones){
    if(G.luck>=m && G.luck-Math.floor(G.wave*0.4)<m){ // Check if we just crossed the milestone
      if(m===10)  showLuckNotify('LUCK SURGES!');
      else if(m===20) showLuckNotify('DRACONIC FORTUNE!');
      else if(m===30) showLuckNotify('✦ LEGENDARY LUCK ✦');
      else if(m>=50) showLuckNotify('✦ DIVINE FAVOR ✦');
    }
  }
}

// ─────────────────────────────────────────
//  UPGRADE MENU
// ─────────────────────────────────────────
function openUpgradeMenu(){
  const menu = document.getElementById('upgrade-menu');
  const cardsEl = document.getElementById('upgrade-cards');
  const subEl = document.getElementById('upgrade-sub');

  subEl.textContent = `LUCK: ${G.luck} — Higher luck unlocks rarer upgrades`;

  // Filter available upgrades based on current weapon and player's Draco status
  let pool = UPGRADE_POOL.filter(u => {
    // Check if it's a Draco-specific upgrade (mythic tier)
    if (u.tier === 'mythic' && u.id.startsWith('draco_')) return true; // Draco upgrades are always available if unlocked by luck

    // Check if it's a weapon-specific attachment
    if (u.id.includes('_')) {
        const parts = u.id.split('_');
        const weaponName = parts.pop(); // Last part is the weapon name
        const attachmentType = parts.join('_'); // Rest is the attachment type

        // If the attachment is for the current weapon, include it
        if (G.player.weapon === weaponName) return true;

        // Handle general attachments that might apply to multiple weapons
        if (attachmentType === 'extended_mag' && (weaponName === 'pistol' || weaponName === 'smg' || weaponName === 'shotgun')) return true;
        if (attachmentType === 'laser_sight' && (weaponName === 'pistol' || weaponName === 'smg')) return true;

        return false; // Attachment not relevant to current weapon
    }

    // General upgrades are always available
    return true;
  });

  // Filter out already applied upgrades (unless it's a choice between similar upgrades)
  pool = pool.filter(u => !G.appliedUpgrades.includes(u.id) || u.id === 'dmg1' || u.id === 'fire1'); // Allow stacking common upgrades if desired

  // Weight by tier and luck
  function tierWeight(u){
    if(u.tier==='common') return 4;
    if(u.tier==='rare')   return G.luck>=u.minLuck ? 2.5 : 0.5;
    if(u.tier==='epic')   return G.luck>=u.minLuck ? 1.5 : 0.1;
    if(u.tier==='special') return G.luck>=u.minLuck ? 2.0 : 0.2; // Special tier weighting
    if(u.tier==='mythic') return G.luck>=u.minLuck ? 1.0 : 0.0;
    return 1;
  }

  // Pick 3 unique upgrades
  let chosen = [];
  let attempts = 0;
  const maxAttempts = 200; // Prevent infinite loops

  while(chosen.length<3 && attempts<maxAttempts){
    attempts++;
    if (pool.length === 0) break; // No more upgrades to choose from

    // Weighted random selection
    let totalWeight = pool.reduce((sum, item) => sum + tierWeight(item), 0);
    let randomWeight = Math.random() * totalWeight;
    let selectedItem = null;

    for (const item of pool) {
        randomWeight -= tierWeight(item);
        if (randomWeight <= 0) {
            selectedItem = item;
            break;
        }
    }

    if (!selectedItem) selectedItem = pool[pool.length - 1]; // Fallback

    if(chosen.find(c=>c.id===selectedItem.id)) continue; // Already chosen
    chosen.push(selectedItem);
  }

  cardsEl.innerHTML = '';
  chosen.forEach(u=>{
    const tier = u.tier;
    const locked = G.luck < u.minLuck; // Locked if luck is below minimum
    const card = document.createElement('div');
    card.className = `upgrade-card${u.id.includes('draco')?' draco-card':''}${locked?' locked':''}`;
    card.innerHTML = `
      <div class="up-icon">${u.icon}</div>
      <div class="up-name${u.id.includes('draco')?' draco':''}">${u.name}</div>
      <div class="up-desc">${u.desc}</div>
      <div class="up-tier tier-${tier}">${tier.toUpperCase()}</div>
    `;
    if(!locked){
      card.addEventListener('click', ()=>{
        applyUpgrade(u);
        closeUpgradeMenu();
      });
    }
    cardsEl.appendChild(card);
  });

  menu.classList.add('visible');
}

function applyUpgrade(u){
  u.apply(G); // Apply the upgrade's effect to G.upgrades
  G.appliedUpgrades.push(u.id);

  // Special handling for Draco weapon setup
  if (u.id === 'draco_breath' || u.id === 'draco_scales' || u.id === 'draco_wings' || u.id === 'draco_exe') {
      if (!G.player.hasDraco) { // If player just found Draco via upgrade
          G.player.hasDraco = true;
          G.player.weapon = 'draco'; // Switch to Draco
          G.player.dracoWeaponSlot = { // Create a specific instance for the Draco
              ...WEAPONS.draco, // Base Draco properties
              name: WEAPONS.draco.name, // Keep original name
              isDraco: true,
              // Initialize base stats to allow upgrades to modify them
              baseDamage: WEAPONS.draco.baseDamage,
              baseFireRate: WEAPONS.draco.baseFireRate,
              baseAmmo: WEAPONS.draco.baseAmmo,
          };
          // Re-apply Draco-specific upgrades to this instance
          if (G.upgrades.draco_breath) G.player.dracoWeaponSlot.draco_breath = true;
          if (G.upgrades.draco_scales) G.player.dracoWeaponSlot.draco_scales = true;
          if (G.upgrades.draco_wings) G.player.dracoWeaponSlot.draco_wings = true;
          if (G.upgrades.draco_wideRoar) G.player.dracoWeaponSlot.draco_wideRoar = true; // This is part of draco_exe

          G.player.ammo = getWeaponData().maxAmmo; // Set ammo to max for Draco
      }
  }

  // Recalculate weapon data after applying upgrade
  const wd = getWeaponData();
  if(G.player.ammo > wd.maxAmmo) G.player.ammo = wd.maxAmmo;
}

function closeUpgradeMenu(){
  document.getElementById('upgrade-menu').classList.remove('visible');
  // Resume / start next wave after brief delay
  setTimeout(()=>{
    if(G.state==='waveComplete') startWave();
  }, 800);
}

// ─────────────────────────────────────────
//  JACKPOT WHEEL
// ─────────────────────────────────────────
let jackpotCanvas = document.getElementById('jackpot-canvas');
let jackpotCtx = jackpotCanvas.getContext('2d');
let wheelSpinning = false;
let wheelRotation = 0;
let wheelTargetRotation = 0;
let spinSpeed = 0;
const PI = Math.PI;

function drawJackpotWheel() {
    const ctx = jackpotCtx;
    const canvasSize = jackpotCanvas.width;
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const radius = canvasSize / 2 * 0.9; // Slightly smaller radius to fit in canvas

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const numSegments = WEAPON_WHEEL_SLOTS.length;
    const angleStep = (2 * PI) / numSegments;

    for (let i = 0; i < numSegments; i++) {
        const angle = wheelRotation + i * angleStep;
        const startAngle = angle;
        const endAngle = angle + angleStep;

        // Draw segment arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineTo(centerX, centerY);
        ctx.closePath();

        // Alternate colors
        ctx.fillStyle = i % 2 === 0 ? '#e6c300' : '#ccaa00';
        ctx.fill();

        // Draw dividing lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineTo(centerX, centerY);
        ctx.stroke();

        // Draw text label
        const labelAngle = startAngle + angleStep / 2;
        const labelRadius = radius * 0.75;
        const labelX = centerX + Math.cos(labelAngle) * labelRadius;
        const labelY = centerY + Math.sin(labelAngle) * labelRadius;

        ctx.save();
        ctx.translate(labelX, labelY);
        ctx.rotate(labelAngle + PI / 2); // Rotate text to be radial
        ctx.textAlign = 'center';
        ctx.font = '8px Press Start 2P, monospace';
        ctx.fillStyle = '#000';

        let labelText = '';
        const slot = WEAPON_WHEEL_SLOTS[i];
        if (slot.type === 'weapon') {
            labelText = WEAPONS[slot.id].name.replace('✦', '').replace('✦', ''); // Remove Draco stars for cleaner text
        } else if (slot.type === 'luck') {
            labelText = `LUCK +${slot.amount}`;
        } else if (slot.type === 'upgrade_points') {
            labelText = `UPGRADE`;
        }
        ctx.fillText(labelText, 0, 0);
        ctx.restore();
    }
}

function spinJackpotWheel() {
    if (wheelSpinning) return;
    wheelSpinning = true;
    document.getElementById('spin-button').disabled = true;

    // Randomly determine spin duration and final stop point
    const spinDuration = rnd(3000, 5000); // ms
    const finalStopAngle = rnd(0, 2 * PI); // Where the pointer should ideally stop

    // Calculate target rotation to ensure it stops near the pointer
    // We want the pointer to align with a segment. The pointer is at the top (angle PI/2 or -PI/2).
    // Let's assume pointer is at top, so we need to stop at an angle that aligns with a segment's center.
    const numSegments = WEAPON_WHEEL_SLOTS.length;
    const angleStep = (2 * PI) / numSegments;
    let bestStopAngle = 0;
    let closestSegmentIndex = -1;

    for (let i = 0; i < numSegments; i++) {
        const segmentCenterAngle = (i * angleStep) + angleStep / 2;
        // Calculate the difference between segment center and desired stop angle
        let diff = Math.abs(finalStopAngle - segmentCenterAngle);
        // Handle wrap-around for angles (e.g., 0.1 and 6.18 are close)
        if (diff > PI) diff = 2 * PI - diff;

        if (closestSegmentIndex === -1 || diff < Math.abs(finalStopAngle - (closestSegmentIndex * angleStep + angleStep / 2))) {
            closestSegmentIndex = i;
        }
    }
    // The target angle is the center of the chosen segment
    wheelTargetRotation = (closestSegmentIndex * angleStep) + angleStep / 2;

    // Add some extra full rotations for visual effect
    wheelTargetRotation += rnd(3, 7) * 2 * PI;

    spinSpeed = 0.05; // Initial spin speed
    const startTime = performance.now();

    function animateSpin(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / spinDuration, 1);

        // Ease-out function for deceleration
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        wheelRotation = wheelTargetRotation * easedProgress; // Move towards target

        drawJackpotWheel();

        if (progress < 1) {
            requestAnimationFrame(animateSpin);
        } else {
            // Spin finished
            wheelRotation = wheelTargetRotation; // Ensure it's exactly at the target
            drawJackpotWheel(); // Final draw

            const winningSegmentIndex = Math.round(wheelTargetRotation / angleStep) % numSegments;
            const result = WEAPON_WHEEL_SLOTS[winningSegmentIndex];
            G.jackpotResult = result;

            let resultText = '';
            let resultClass = 'wheel-result';

            if (result.type === 'weapon') {
                const weaponName = WEAPONS[result.id].name;
                resultText = `YOU WON: ${weaponName}!`;
                // Add weapon if not already owned
                if (!G.player.ownedWeapons || !G.player.ownedWeapons.includes(result.id)) {
                    if (!G.player.ownedWeapons) G.player.ownedWeapons = [];
                    G.player.ownedWeapons.push(result.id);
                    G.player.weapon = result.id; // Switch to the new weapon
                    G.player.ammo = getWeaponData().maxAmmo; // Refill ammo
                } else {
                    // If weapon is already owned, maybe give ammo or bonus
                    G.player.ammo = Math.min(getWeaponData().maxAmmo, G.player.ammo + Math.floor(WEAPONS[result.id].baseAmmo * 0.75));
                    resultText = `YOU WON AMMO FOR ${weaponName}!`;
                }
            } else if (result.type === 'luck') {
                G.luck += result.amount;
                resultText = `LUCK +${result.amount}!`;
                showLuckNotify(`✦ LUCK +${result.amount} ✦`);
            } else if (result.type === 'upgrade_points') {
                // Implement upgrade points system later if needed, for now, maybe give a small bonus
                G.player.hp = Math.min(G.player.maxHp, G.player.hp + 10);
                resultText = `BONUS HEALTH!`;
            } else {
                resultText = 'BETTER LUCK NEXT TIME!';
                resultClass += ' lost';
            }

            document.getElementById('wheel-result').textContent = resultText;
            document.getElementById('wheel-result').className = resultClass;

            document.getElementById('spin-button').disabled = false;
            wheelSpinning = false;
        }
    }
    requestAnimationFrame(animateSpin);
}

function openJackpotWheel() {
    const overlay = document.getElementById('jackpot-wheel-overlay');
    overlay.classList.add('visible');
    G.jackpotWheelVisible = true;
    G.jackpotSpinning = false;
    G.jackpotResult = null;
    wheelRotation = 0; // Reset rotation
    wheelTargetRotation = 0;
    spinSpeed = 0;
    document.getElementById('spin-button').disabled = false;
    document.getElementById('wheel-result').textContent = '';

    // Initialize canvas and draw the wheel
    jackpotCanvas.width = 300; // Reset canvas size for clarity
    jackpotCanvas.height = 300;
    drawJackpotWheel();
}

function closeJackpotWheel() {
    const overlay = document.getElementById('jackpot-wheel-overlay');
    overlay.classList.remove('visible');
    G.jackpotWheelVisible = false;
    // After closing, potentially start the next wave if it was pending
    if (G.state === 'waveComplete') {
        startWave();
    }
}

function spinJackpotWheel() {
    spinJackpotWheel(); // Call the actual spin function
}

// ─────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────
function showWaveAnnounce(text, color='#ff4444'){
  const el = document.getElementById('wave-announce');
  el.textContent = text;
  el.style.color = color;
  el.style.textShadow = `0 0 20px ${color}`;
  el.style.opacity = '1';
  setTimeout(()=>{ el.style.opacity='0'; }, 2200);
}

function showLuckNotify(text){
  const el = document.getElementById('luck-notify');
  el.textContent = text;
  el.style.opacity = '1';
  setTimeout(()=>{ el.style.opacity='0'; }, 2500);
}

// ─────────────────────────────────────────
//  HUD UPDATE
// ─────────────────────────────────────────
function updateHUD(){
  const p = G.player;
  const wd = getWeaponData();
  document.getElementById('hud-hp').textContent = Math.ceil(p.hp);
  document.getElementById('bar-hp').style.width = `${(p.hp/p.maxHp)*100}%`;
  document.getElementById('hud-ammo').textContent = `${p.ammo}/${wd.maxAmmo}`;
  document.getElementById('bar-ammo').style.width = `${(p.ammo/wd.maxAmmo)*100}%`;
  document.getElementById('hud-luck').textContent = G.luck;
  document.getElementById('bar-luck').style.width = `${Math.min(100, G.luck)}%`;
  document.getElementById('hud-wave').textContent = G.wave;
  document.getElementById('hud-remain').textContent = G.bossActive ? `BOSS: ${G.currentBoss.name}` : `${G.zombiesRemaining} ZOMBIES`;
  document.getElementById('hud-score').textContent = G.score.toLocaleString();
  document.getElementById('hud-kills').textContent = G.kills;
  document.getElementById('hud-combo').textContent = G.combo>1?`x${G.combo} COMBO`:'';

  const wb = document.getElementById('weapon-box');
  const wn = document.getElementById('weapon-name');
  if(wd.isDraco){ wb.classList.add('draco-active'); wn.className='weapon-name draco'; }
  else { wb.classList.remove('draco-active'); wn.className='weapon-name'; }
  wn.textContent = wd.name;

  const hint = document.getElementById('hud-reload-hint');
  if(p.reloading) hint.textContent='RELOADING...';
  else if(p.ammo<=3 && !p.reloading) hint.textContent='[R] RELOAD';
  else hint.textContent='';

  // Update boss health bar
  const bossBarContainer = document.getElementById('boss-health-bar-container');
  const bossBar = document.getElementById('boss-bar');
  if (G.bossActive && G.currentBoss) {
      bossBar.style.width = `${(G.currentBoss.hp / G.currentBoss.maxHp) * 100}%`;
      bossBarContainer.classList.add('visible');
  } else {
      bossBarContainer.classList.remove('visible');
  }

  // damage vignette
  const vig = document.getElementById('damage-vignette');
  if(p.hp/p.maxHp < 0.3){
    vig.style.background = `radial-gradient(ellipse at center, transparent 50%, rgba(180,0,0,${0.4-(p.hp/p.maxHp)*0.8}) 100%)`;
  } else { vig.style.background=''; }
}

// ─────────────────────────────────────────
//  MAIN UPDATE
// ─────────────────────────────────────────
function update(){
  if(G.state !== 'playing') return;

  const p = G.player;

  // ── MOVEMENT ──
  let dx=0, dy=0;
  if(G.keys['w']||G.keys['arrowup'])    dy-=1;
  if(G.keys['s']||G.keys['arrowdown'])  dy+=1;
  if(G.keys['a']||G.keys['arrowleft'])  dx-=1;
  if(G.keys['d']||G.keys['arrowright']) dx+=1;

  // Player speed boost from Draco wings
  const currentSpeed = p.speed + (p.speedBoost > 0 ? 2.5 : 0);
  if(dx||dy){ const l=Math.hypot(dx,dy); p.x+=dx/l*currentSpeed; p.y+=dy/l*currentSpeed; }

  // Player invincible timer
  if(p.invincible>0) p.invincible--;

  // ── CAMERA ──
  // Camera follows player smoothly, but doesn't have hard map limits
  G.cam.x = lerp(G.cam.x, p.x - canvas.width/2, 0.1);
  G.cam.y = lerp(G.cam.y, p.y - canvas.height/2, 0.1);

  // ── ANGLE ──
  p.angle = Math.atan2(G.mouse.y+G.cam.y - p.y, G.mouse.x+G.cam.x - p.x);

  // ── SHOOT ──
  if(G.mouse.down) tryShoot();

  // ── RELOAD TIMER ──
  if(p.reloading){
    p.reloadTimer -= 16;
    if(p.reloadTimer<=0){
      p.reloading = false;
      p.ammo = getWeaponData().maxAmmo;
    }
  }

  // ── SPAWN ZOMBIES ──
  if(!G.bossActive && G.zombiesSpawned < G.zombiesToSpawn){
    G.spawnTimer++;
    const interval = Math.max(4, 28 - G.wave*1.5); // Spawn faster on higher waves
    if(G.spawnTimer >= interval){
      G.spawnTimer = 0;
      const batch = Math.min(1+Math.floor(G.wave/4), G.zombiesToSpawn - G.zombiesSpawned); // Spawn in batches
      for(let i=0;i<batch;i++) spawnZombie();
    }
  }

  // ── MONSTER TELEPORTATION ──
  if (!G.bossActive) teleportMonsters();

  // ── BULLETS ──
  for(let i=G.bullets.length-1;i>=0;i--){
    const b=G.bullets[i];
    b.x+=b.vx; b.y+=b.vy; b.life--;

    // Remove bullets that go too far off-screen (performance optimization for infinite map)
    const maxBulletDist = Math.max(canvas.width, canvas.height) * 2;
    if(b.life<=0 || dist2(b.x, b.y, p.x, p.y) > maxBulletDist * maxBulletDist){
      G.bullets.splice(i,1); continue;
    }

    // Hit zombies
    let hitSomething = false;
    for(let j=G.zombies.length-1;j>=0;j--){
      const z=G.zombies[j];
      if(b.hitIds.has(z.id)) continue; // Already hit this zombie with this bullet

      const r2=(BULLET_R+z.radius)*(BULLET_R+z.radius);
      if(dist2(b.x,b.y,z.x,z.y)<r2){
        b.hitIds.add(z.id);
        b.pierceCount++;

        // Hit effects
        spawnBlood(z.x+rnd(-8,8), z.y+rnd(-8,8), b.crit?12:6, b.crit);
        G.screenShake = Math.max(G.screenShake, b.crit?6:2);
        z.hitFlash = 6;
        z.hp -= b.damage;

        // Status effects
        if(b.ignited) { z.ignited=true; z.igniteTicks=180; }
        if(b.cryo){ z.frozen=true; z.frozenTimer=90; }
        if(b.toxic){ z.poisoned=true; z.poisonTicks=200; }

        // Acid projectile effect
        if (b.isAcid) {
            z.hp -= 0.5; // DoT damage
            z.ignited = true; // Acid might also cause burning effect
            z.igniteTicks = 120;
            z.poisoned = true; // Acid is toxic
            z.poisonTicks = 180;
            spawnEmbers(z.x, z.y, 3);
        }

        if(b.pierceCount > b.pierce){
          G.bullets.splice(i,1); hitSomething=true; break;
        }
      }
    }
  }

  // ── ZOMBIES & BOSSES ──
  for(let i=G.zombies.length-1;i>=0;i--){
    const z=G.zombies[i];
    z.wobble += z.wobbleSpd;

    // Status effect timers
    if (z.ignited) { z.igniteTicks--; z.igniteTimer++; if (z.igniteTimer % 20 === 0) { z.hp -= 0.5; spawnEmbers(z.x, z.y, 2); } if (z.igniteTicks <= 0) z.ignited = false; }
    if (z.poisoned) { z.poisonTicks--; if (z.poisonTicks % 15 === 0) z.hp -= 0.3; if (z.poisonTicks <= 0) z.poisoned = false; }
    if (z.frozen && --z.frozenTimer <= 0) z.frozen = false;
    if (z.hitFlash > 0) z.hitFlash--;

    // If zombie HP is depleted
    if(z.hp<=0){
      if (z.isBoss) {
          endBossFight(); // Boss defeated
      } else {
          killZombie(i, false); // Regular zombie killed
      }
      continue; // Move to next zombie
    }

    // Boss specific logic
    if (z.isBoss) {
        handleBossAbilities();
        // Boss attack logic is handled within handleBossAbilities
    } else {
        // Regular zombie movement and attack
        const toX = p.x-z.x, toY = p.y-z.y;
        const d = Math.hypot(toX,toY);
        if(d>0){
          const spd2 = z.frozen ? z.speed*0.3 : z.speed;
          z.x += toX/d*spd2;
          z.y += toY/d*spd2;
        }
        z.x=clampToMap(z.x,z.y,z.radius).x; // Use clampToMap for potentially infinite map
        z.y=clampToMap(z.x,z.y,z.radius).y;

        // Blood trail (runners)
        if(z.bloodTrail){ z.bloodTrailTimer++; if(z.bloodTrailTimer%12===0) G.burnMarks.push({x:z.x,y:z.y,r:rnd(2,5),color:'rgba(120,0,0,0.3)',life:400,maxLife:400}); }

        // Attack player
        if(d < PLAYER_R + z.radius){
          if(z.type==='exploder'){ killZombie(i, true); continue; } // Exploder kills itself
          if(z.attackTimer<=0 && p.invincible<=0){
            p.hp -= z.damage;
            p.invincible = 20;
            G.screenShake = Math.max(G.screenShake, 10);
            spawnBlood(p.x, p.y, 6);
          }
        }
        if(z.attackTimer>0) z.attackTimer--;
    }
  }

  // ── PICKUPS ──
  for(let i=G.pickups.length-1;i>=0;i--){
    const pk=G.pickups[i];
    pk.life--; pk.bob+=0.06;
    if(pk.life<=0){ G.pickups.splice(i,1); continue; }
    const wd2 = getWeaponData();
    if(dist2(p.x,p.y,pk.x,pk.y) < (PLAYER_R+16)*(PLAYER_R+16)){
      collectPickup(pk);
      G.pickups.splice(i,1);
    }
  }

  // ── ROAR BLASTS ──
  for(let i=G.roarBlasts.length-1;i>=0;i--){
    const rb=G.roarBlasts[i];
    rb.r = lerp(rb.r, rb.maxR, 0.18);
    rb.life -= 0.035;
    if(rb.life<=0) G.roarBlasts.splice(i,1);
  }

  // ── PARTICLES ──
  for(let i=G.particles.length-1;i>=0;i--){
    G.particles[i].update();
    if(G.particles[i].life<=0) G.particles.splice(i,1);
  }

  // ── FLASHES ──
  for(let i=G.flashes.length-1;i>=0;i--){
    G.flashes[i].life -= 0.12;
    if(G.flashes[i].life<=0) G.flashes.splice(i,1);
  }

  // ── BURN MARKS ──
  for(let i=G.burnMarks.length-1;i>=0;i--){
    G.burnMarks[i].life--;
    if(G.burnMarks[i].life<=0) G.burnMarks.splice(i,1);
  }

  // ── CORPSES ──
  for(let i=G.corpses.length-1;i>=0;i--){
    G.corpses[i].alpha -= 0.0008;
    if(G.corpses[i].alpha<=0) G.corpses.splice(i,1);
    if(G.corpses.length>200) G.corpses.splice(0,10); // Limit number of corpses for performance
  }

  // ── SCREEN SHAKE ──
  G.screenShake *= 0.82;
  if(G.screenShake<0.3) G.screenShake=0;

  // ── COMBO ──
  if(G.comboTimer>0){ G.comboTimer--; } else { G.combo=0; }

  // ── WAVE COMPLETE CHECK ──
  if(!G.bossActive && G.zombiesRemaining<=0 && G.zombiesSpawned>=G.zombiesToSpawn && G.zombies.length===0){
    endWave();
  }

  // ── DEATH ──
  if(p.hp<=0){
    p.hp=0;
    G.state='gameover';
    showGameOver();
  }

  updateHUD();
}

// ─────────────────────────────────────────
//  KILL ZOMBIE
// ─────────────────────────────────────────
function killZombie(idx, explode){
  const z = G.zombies[idx];
  G.kills++;
  G.zombiesRemaining--;
  G.score += z.score * Math.max(1, G.combo);
  G.combo++; G.comboTimer=100;

  // Draco stats
  if(G.player.weapon==='draco'){
    G.dracoKillStreak++; G.totalDracoKills++;
    if(G.upgrades.draco_scales && G.totalDracoKills%8===0){
      G.player.hp = Math.min(G.player.maxHp, G.player.hp+15);
      showWaveAnnounce('SCALES: +15 HP', '#39ff14');
    }
    if(G.upgrades.draco_wings){ G.player.speedBoost=90; }
  }

  // Gore by type
  if(z.deathGore==='burst' || z.type==='brute'){
    spawnBlood(z.x, z.y, 25, true);
    spawnFlesh(z.x, z.y);
    spawnGore(z.x, z.y, '#660000');
    G.screenShake = Math.max(G.screenShake, 8);
    for(let i=0;i<3;i++) G.burnMarks.push({x:z.x+rnd(-20,20),y:z.y+rnd(-20,20),r:rnd(14,28),color:'rgba(80,0,0,0.5)',life:900,maxLife:900});
  } else if(z.deathGore==='smear'){
    spawnBlood(z.x, z.y, 10);
    // smear trail
    for(let i=0;i<5;i++) G.burnMarks.push({x:z.x+rnd(-30,30),y:z.y+rnd(-10,10),r:rnd(4,9),color:'rgba(130,0,0,0.4)',life:700,maxLife:700});
  } else if(z.deathGore==='explode' || explode){
    spawnBlood(z.x, z.y, 30, true);
    spawnGore(z.x, z.y, '#993300');
    G.screenShake = Math.max(G.screenShake, 12);
    // Exploder damages nearby
    const explR = 100;
    G.player.hp -= dist2(G.player.x,G.player.y,z.x,z.y)<explR*explR ? 18:0;
    for(let j=G.zombies.length-1;j>=0;j--){
      if(j===idx) continue;
      if(dist2(G.zombies[j].x,G.zombies[j].y,z.x,z.y)<explR*explR) G.zombies[j].hp-=2;
    }
  } else {
    spawnBlood(z.x, z.y, 10, z.type==='brute');
  }

  // Corpse
  G.corpses.push({ x:z.x, y:z.y, radius:z.radius, color:z.color, alpha:0.55, ignited:z.ignited });

  // Pickup chance
  trySpawnPickup(z.x, z.y, G.luck);

  G.zombies.splice(idx, 1);
}

// ─────────────────────────────────────────
//  COLLECT PICKUP
// ─────────────────────────────────────────
function collectPickup(pk){
  const luckFactor = 1 + G.luck*0.02;
  if(pk.type==='ammo'){
    G.player.ammo = Math.min(getWeaponData().maxAmmo, G.player.ammo + Math.floor(8*luckFactor));
    showWaveAnnounce('+AMMO', '#ffcc00');
  } else if(pk.type==='health'){
    G.player.hp = Math.min(G.player.maxHp, G.player.hp + Math.floor(20*luckFactor));
    showWaveAnnounce('+HEALTH', '#39ff14');
  } else if(pk.type==='luck'){
    const luckGain = Math.floor(2+G.wave*0.3);
    G.luck += luckGain;
    showLuckNotify('✦ LUCK +' + luckGain + ' ✦');
  } else if(pk.type==='draco'){
    G.player.hasDraco = true;
    G.player.weapon = 'draco'; // Switch to Draco
    G.player.dracoWeaponSlot = { // Create a specific instance for the Draco
        ...WEAPONS.draco, // Base Draco properties
        name: WEAPONS.draco.name, // Keep original name
        isDraco: true,
        // Initialize base stats to allow upgrades to modify them
        baseDamage: WEAPONS.draco.baseDamage,
        baseFireRate: WEAPONS.draco.baseFireRate,
        baseAmmo: WEAPONS.draco.baseAmmo,
    };
    G.player.ammo = getWeaponData().maxAmmo; // Set ammo to max for Draco
    showWaveAnnounce('✦ THE DRACO FOUND ✦', '#ff8c00');
    G.screenShake = 15;
  } else if(pk.type==='chest'){
    // Chest: luck-based reward
    const roll = Math.random();
    const luckP = Math.min(0.95, G.luck*0.015);
    if(roll < luckP){
      // Rare: upgrade
      showLuckNotify('✦ DRACONIC FORTUNE ✦');
      setTimeout(openUpgradeMenu, 300);
    } else {
      G.player.hp = Math.min(G.player.maxHp, G.player.hp+30);
      G.player.ammo = getWeaponData().maxAmmo;
      showWaveAnnounce('CHEST: FULL RESTORE', '#ffd700');
    }
  }
}

// ─────────────────────────────────────────
//  SKIP UPGRADE / CLOSE JACKPOT (exposed globally)
// ─────────────────────────────────────────
window.Game = {
  skipUpgrade: ()=>{ closeUpgradeMenu(); },
  closeJackpot: ()=>{ closeJackpotWheel(); }
};

// ─────────────────────────────────────────
//  RENDER
// ─────────────────────────────────────────
const GRID=72;

function render(){
  const w=canvas.width, h=canvas.height;
  const sx = G.screenShake ? (Math.random()-0.5)*G.screenShake*2 : 0;
  const sy = G.screenShake ? (Math.random()-0.5)*G.screenShake*2 : 0;

  ctx.clearRect(0,0,w,h);
  ctx.save();
  ctx.translate(-G.cam.x+sx, -G.cam.y+sy);

  // ── GROUND ──
  ctx.fillStyle='#0b0e14';
  ctx.fillRect(-10000,-10000,20000,20000); // Render a large area for infinite map

  // Grid (only render visible grid lines)
  ctx.strokeStyle='rgba(57,255,20,0.04)';
  ctx.lineWidth=1;
  const gx0=Math.floor((G.cam.x)/GRID)*GRID;
  const gy0=Math.floor((G.cam.y)/GRID)*GRID;
  for(let x=gx0;x<G.cam.x+w+GRID;x+=GRID){ ctx.beginPath();ctx.moveTo(x,G.cam.y);ctx.lineTo(x,G.cam.y+h);ctx.stroke(); }
  for(let y=gy0;y<G.cam.y+h+GRID;y+=GRID){ ctx.beginPath();ctx.moveTo(G.cam.x,y);ctx.lineTo(G.cam.x+w,y);ctx.stroke(); }

  // ── BURN MARKS / BLOOD POOLS ──
  for(const bm of G.burnMarks){
    const a = (bm.life/bm.maxLife)*0.6;
    ctx.globalAlpha=a;
    ctx.fillStyle=bm.color;
    ctx.beginPath(); ctx.arc(bm.x,bm.y,bm.r,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;

  // ── CORPSES ──
  for(const c of G.corpses){
    ctx.globalAlpha=c.alpha;
    ctx.fillStyle=c.ignited?'#2a1a00':'#1a2a0a';
    ctx.beginPath(); ctx.ellipse(c.x,c.y,c.radius*1.2,c.radius*0.7,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
  }

  // ── PARTICLES ──
  for(const p of G.particles){
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;

  // ── ROAR BLASTS ──
  for(const rb of G.roarBlasts){
    ctx.globalAlpha = rb.life*0.35;
    const grd=ctx.createRadialGradient(rb.x,rb.y,0,rb.x,rb.y,rb.r);
    grd.addColorStop(0,'rgba(255,140,0,0.6)');
    grd.addColorStop(0.6,'rgba(255,50,0,0.3)');
    grd.addColorStop(1,'rgba(255,0,0,0)');
    ctx.fillStyle=grd;
    ctx.beginPath(); ctx.arc(rb.x,rb.y,rb.r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=`rgba(255,140,0,${rb.life*0.7})`;
    ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(rb.x,rb.y,rb.r,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=1;
  }

  // ── PICKUPS ──
  for(const pk of G.pickups){
    const bob=Math.sin(pk.bob)*4;
    const a=pk.life<80?pk.life/80:1;
    ctx.globalAlpha=a;
    ctx.save(); ctx.translate(pk.x, pk.y+bob);
    const col=PICKUP_COLORS[pk.type]||'#fff';
    ctx.shadowColor=col; ctx.shadowBlur=14;
    if(pk.type==='health'){
      ctx.fillStyle=col; ctx.fillRect(-3,-9,6,18); ctx.fillRect(-9,-3,18,6);
    } else if(pk.type==='ammo'){
      ctx.fillStyle=col; ctx.fillRect(-5,-9,10,18); ctx.fillStyle='#aa8800'; ctx.fillRect(-3,-7,6,4);
    } else if(pk.type==='luck'){
      ctx.fillStyle=col;
      for(let star=0;star<5;star++){
        const sa=star/5*Math.PI*2; ctx.beginPath(); ctx.arc(Math.cos(sa)*8,Math.sin(sa)*8,3,0,Math.PI*2); ctx.fill();
      }
    } else if(pk.type==='draco'){
      // Special Draco glow
      ctx.fillStyle='#ff8c00'; ctx.font='bold 22px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🐉',0,0);
    } else if(pk.type==='chest'){
      ctx.fillStyle='#ffd700'; ctx.fillRect(-10,-8,20,16); ctx.fillStyle='#aa8800'; ctx.fillRect(-10,-9,20,4);
    }
    ctx.shadowBlur=0; ctx.restore();
    ctx.globalAlpha=1;
  }

  // ── ZOMBIES & BOSSES ──
  for(const z of G.zombies){
    ctx.save(); ctx.translate(z.x, z.y);

    // Boss specific rendering
    if (z.isBoss) {
        const boss = z; // Alias for clarity
        const wx=Math.sin(boss.wobble)*2.5, wy=Math.cos(boss.wobble*1.2)*1.5;

        // Boss Shadow
        ctx.fillStyle='rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(wx, boss.radius+5+wy, boss.radius*0.9, boss.radius*0.4, 0, 0, Math.PI*2); ctx.fill();

        // Boss Body
        ctx.fillStyle = boss.isCharging ? '#ff8844' : boss.isTeleporting ? '#8844ff' : boss.isDraining ? '#aa44ff' : boss.color;
        ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(wx,wy,boss.radius,0,Math.PI*2); ctx.fill(); ctx.stroke();

        // Boss Eyes
        ctx.shadowColor=boss.eyeColor; ctx.shadowBlur=15;
        ctx.fillStyle=boss.eyeColor;
        const eyeSize = boss.radius / 5;
        const eyeDist = boss.radius * 0.4;
        const bossAngle = Math.atan2(G.player.y - boss.y, G.player.x - boss.x);

        // Left Eye
        ctx.beginPath(); ctx.arc(wx + Math.cos(bossAngle - 0.3) * eyeDist, wy + Math.sin(bossAngle - 0.3) * eyeDist, eyeSize, 0, Math.PI*2); ctx.fill();
        // Right Eye
        ctx.beginPath(); ctx.arc(wx + Math.cos(bossAngle + 0.3) * eyeDist, wy + Math.sin(bossAngle + 0.3) * eyeDist, eyeSize, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;

        // Boss special effects
        if (boss.isCharging) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ff8844';
            ctx.beginPath(); ctx.arc(wx, wy, boss.radius + 10, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
        }
        if (boss.isDraining) {
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = '#aa44ff'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(wx, wy, boss.radius + 15, 0, Math.PI*2); ctx.stroke();
            ctx.globalAlpha = 1;
        }
        if (boss.isTeleporting) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#8844ff';
            ctx.beginPath(); ctx.arc(wx, wy, boss.radius + 8, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
        }

    } else {
        // Regular Zombie Rendering
        const wx=Math.sin(z.wobble)*2.5, wy=Math.cos(z.wobble*1.2)*1.5;

        // Shadow
        ctx.fillStyle='rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(wx,z.radius+3+wy,z.radius*0.85,z.radius*0.3,0,0,Math.PI*2); ctx.fill();

        // Body glow if ignited or frozen
        if(z.ignited){ ctx.shadowColor='#ff4400'; ctx.shadowBlur=16; }
        if(z.frozen)  { ctx.shadowColor='#44aaff'; ctx.shadowBlur=10; }

        const col = z.hitFlash>0 ? '#ffffff' : z.ignited ? '#cc3300' : z.frozen ? '#88ccff' : z.color;
        ctx.fillStyle=col;
        ctx.beginPath(); ctx.arc(wx,wy,z.radius,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0; // Reset shadow blur

        // Body outline
        ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(wx,wy,z.radius,0,Math.PI*2); ctx.stroke();

        // Wound texture on brutes
        if(z.type==='brute'){
          ctx.fillStyle='rgba(0,0,0,0.2)';
          for(let sc=0;sc<3;sc++){
            ctx.beginPath(); ctx.arc(wx+rnd(-8,8),wy+rnd(-8,8),3,0,Math.PI*2); ctx.fill();
          }
        }

        // Eyes
        const ea=Math.atan2(G.player.y-z.y, G.player.x-z.x);
        ctx.shadowColor=z.eyeColor; ctx.shadowBlur=8;
        ctx.fillStyle=z.eyeColor;
        ctx.beginPath(); ctx.arc(wx+Math.cos(ea-0.4)*z.radius*0.45,wy+Math.sin(ea-0.4)*z.radius*0.45,z.type==='brute'?4:2.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(wx+Math.cos(ea+0.4)*z.radius*0.45,wy+Math.sin(ea+0.4)*z.radius*0.45,z.type==='brute'?4:2.5,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;

        // HP bar (if damaged)
        if(z.hp<z.maxHp){
          const bw=z.radius*2.2;
          ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(-bw/2,-z.radius-12,bw,5);
          const pct=z.hp/z.maxHp;
          ctx.fillStyle=pct>0.5?'#39ff14':pct>0.25?'#ffaa00':'#ff2222';
          ctx.fillRect(-bw/2,-z.radius-12,bw*pct,5);
        }

        // Ignite embers (render-side)
        if(z.ignited && Math.random()<0.4){
          const ea2=Math.random()*Math.PI*2;
          ctx.fillStyle=`rgba(255,${Math.floor(rnd(60,160))},0,0.8)`;
          ctx.beginPath(); ctx.arc(wx+Math.cos(ea2)*z.radius,wy+Math.sin(ea2)*z.radius,rnd(1,3),0,Math.PI*2); ctx.fill();
        }

        // Poison tint
        if(z.poisoned){ ctx.globalAlpha=0.25; ctx.fillStyle='#44ff44'; ctx.beginPath(); ctx.arc(wx,wy,z.radius,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
    }
    ctx.restore();
  }

  // ── BULLETS ──
  for(const b of G.bullets){
    // Trail
    ctx.strokeStyle=b.trailColor;
    ctx.lineWidth=b.isDraco?3:2;
    ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x-b.vx*4,b.y-b.vy*4); ctx.stroke();

    // Bullet
    ctx.shadowColor=b.color; ctx.shadowBlur=b.isDraco?16:8;
    ctx.fillStyle=b.color;
    const br=b.isDraco?5.5:b.crit?5:BULLET_R;
    ctx.beginPath(); ctx.arc(b.x,b.y,br,0,Math.PI*2); ctx.fill();

    // Draco: flame aura
    if(b.isDraco){
      ctx.globalAlpha=0.3+Math.random()*0.2;
      ctx.fillStyle='#ff6600';
      ctx.beginPath(); ctx.arc(b.x,b.y,9+Math.random()*4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }
    ctx.shadowBlur=0;
  }

  // ── MUZZLE FLASHES ──
  for(const f of G.flashes){
    ctx.globalAlpha=f.life;
    if(f.isDraco){
      ctx.shadowColor='#ff4500'; ctx.shadowBlur=30;
      ctx.fillStyle='#ff8c00';
      ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.life*3);
      // Dragon flare shape
      for(let pt=0;pt<6;pt++){
        const ang=pt/6*Math.PI*2;
        const len=(12+Math.random()*8)*f.life;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(ang)*len,Math.sin(ang)*len); ctx.strokeStyle=`rgba(255,${Math.floor(100+Math.random()*100)},0,${f.life})`; ctx.lineWidth=3; ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.fillStyle='#fffde0';
      ctx.shadowColor='#ffdd44'; ctx.shadowBlur=20;
      ctx.beginPath(); ctx.arc(f.x,f.y,10*f.life,0,Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur=0; ctx.globalAlpha=1;
  }

  // ── PLAYER ──
  const p=G.player;
  ctx.save(); ctx.translate(p.x,p.y);

  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0,PLAYER_R+3,PLAYER_R*0.8,PLAYER_R*0.3,0,0,Math.PI*2); ctx.fill();

  // Speed boost aura
  if(p.speedBoost>0){
    ctx.globalAlpha=0.3*p.speedBoost/90;
    ctx.strokeStyle='#ff8c00'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,PLAYER_R+5,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=1;
  }

  // Body
  ctx.fillStyle = p.invincible>0 ? `rgba(200,200,255,${0.5+Math.sin(p.invincible*0.4)*0.5})` : '#c8d0e0';
  ctx.strokeStyle='#556677'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,PLAYER_R,0,Math.PI*2); ctx.fill(); ctx.stroke();

  // Gun
  ctx.save(); ctx.rotate(p.angle);
  if(G.player.weapon==='draco' && G.player.dracoWeaponSlot){
    const wd = G.player.dracoWeaponSlot; // Use the specific Draco instance
    ctx.fillStyle='#2a1a00';
    ctx.shadowColor='#ff4500'; ctx.shadowBlur=12;
    ctx.fillRect(8,-4,28,8); ctx.fillStyle='#ff6600'; ctx.fillRect(28,-3,8,6);
    // Rune glow
    ctx.globalAlpha=0.5+Math.sin(Date.now()*0.005)*0.3;
    ctx.fillStyle='#ff8c00'; ctx.beginPath(); ctx.arc(18,0,3,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1; ctx.shadowBlur=0;
  } else {
    ctx.fillStyle='#44556a'; ctx.fillRect(8,-3,24,6);
    ctx.fillStyle='#334455'; ctx.fillRect(26,-4,7,8);
  }
  ctx.restore();

  // Eyes
  ctx.shadowColor='#3399ff'; ctx.shadowBlur=5; ctx.fillStyle='#55aaff';
  ctx.beginPath(); ctx.arc(Math.cos(p.angle-0.4)*7,Math.sin(p.angle-0.4)*7,2.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(Math.cos(p.angle+0.4)*7,Math.sin(p.angle+0.4)*7,2.5,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;

  ctx.restore();
  ctx.restore(); // end camera
}

// ─────────────────────────────────────────
//  SCREENS
// ─────────────────────────────────────────
function showScreen(html){
  const sc = document.getElementById('main-screen');
  sc.innerHTML = html;
  document.getElementById('overlay').classList.remove('hidden');
}

function hideOverlay(){
  document.getElementById('overlay').classList.add('hidden');
}

function showMenu(){
  showScreen(`
    <div class="game-title">DEAD WAVE</div>
    <div class="sub-title">ULTIMATE EDITION</div>
    <div class="draco-label">⚠ THE DRACO AWAITS THE WORTHY ⚠</div>
    <div class="controls-grid">
      <div class="ctrl-item"><span>WASD</span>MOVE</div>
      <div class="ctrl-item"><span>MOUSE</span>AIM & SHOOT</div>
      <div class="ctrl-item"><span>R</span>RELOAD</div>
      <div class="ctrl-item"><span>Q</span>SWITCH WEAPON</div>
    </div>
    <div style="margin-bottom:20px;font-size:7px;color:#555;line-height:2">
      DEFEAT WAVES · GAIN LUCK · FIND THE DRACO<br>
      UNLOCK UPGRADES · SURVIVE AS LONG AS YOU CAN
    </div>
    <button class="btn" onclick="startGame()">START GAME</button>
  `);
  G.state='menu';
}

function showGameOver(){
  document.getElementById('hud').style.display='none';
  setTimeout(()=>{
    showScreen(`
      <div class="game-title" style="color:#ff2222;font-size:clamp(22px,4vw,40px)">YOU DIED</div>
      <div class="sub-title">THE HORDE CONSUMES ALL</div>
      <div class="go-stats">
        <div class="go-stat"><div class="go-stat-label">HIGHEST WAVE</div><div class="go-stat-val">${G.wave}</div></div>
        <div class="go-stat"><div class="go-stat-label">TOTAL KILLS</div><div class="go-stat-val" style="color:#ff4444">${G.kills}</div></div>
        <div class="go-stat"><div class="go-stat-label">BLOOD SPILLED</div><div class="go-stat-val" style="color:#cc0000">${G.bloodSpilled.toLocaleString()} ml</div></div>
        <div class="go-stat"><div class="go-stat-label">FINAL SCORE</div><div class="go-stat-val">${G.score.toLocaleString()}</div></div>
        <div class="go-stat"><div class="go-stat-label">FINAL LUCK</div><div class="go-stat-val" style="color:#dd88ff">${G.luck}</div></div>
        <div class="go-stat"><div class="go-stat-label">DRACO KILLS</div><div class="go-stat-val" style="color:#ff8c00">${G.totalDracoKills}</div></div>
        <div class="go-stat"><div class="go-stat-label">PLAYER LEVEL</div><div class="go-stat-val">${G.player.playerLevel}</div></div>
      </div>
      <button class="btn red" onclick="startGame()" style="margin-right:10px">TRY AGAIN</button>
      <button class="btn" onclick="showMenu()" style="background:linear-gradient(135deg,#334,#223);color:#aaa;box-shadow:none;margin-top:10px">MENU</button>
    `);
  }, 800);
}

// ─────────────────────────────────────────
//  START / RESTART
// ─────────────────────────────────────────
window.startGame = function(){
  G = makeState();
  document.getElementById('hud').style.display='block';
  hideOverlay();
  startWave();
  loop();
};
window.showMenu = showMenu;

// ─────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────
let rafId=null;
function loop(){
  if(rafId) cancelAnimationFrame(rafId);
  function tick(){
    if(G.state==='playing' || G.state==='waveComplete'){
      update();
      render();
    }
    rafId=requestAnimationFrame(tick);
  }
  rafId=requestAnimationFrame(tick);
}

// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────
showMenu();
loop(); // start loop so idle renders
