const BASE   = 'https://molochdagod.github.io/ObjectStore/sprites/effects';
const CUSTOM = `${BASE}/custom`;
const RETRO  = `${BASE}/retro_impact`;

export type VfxType =
  | 'holy_heal' | 'holyheal_aura' | 'thunder_hit' | 'thunder_hit2'
  | 'fire_hit' | 'firebolt_hit' | 'energy_hit'
  | 'bullet_green' | 'bullet_purple' | 'water_hit' | 'crit_hit'
  | 'fire_explosion_2'
  | 'arcaneslash' | 'smear_h3' | 'smear_v2' | 'water_blast' | 'effect3'
  | 'felspell' | 'freezing' | 'sunburn'
  | 'slash_red' | 'slash_purple' | 'hit_effect_1'
  | 'retro_magenta_a' | 'retro_magenta_b'
  | 'retro_green_a' | 'retro_green_b'
  | 'retro_blue_a' | 'retro_blue_b'
  | 'retro_red_a' | 'retro_red_b'
  | 'retro_yellow_a' | 'retro_yellow_b'
  | 'retro_white_a' | 'retro_white_b' | 'retro_white_c'
  | 'retro_orange_a' | 'retro_orange_b'
  // WC3-specific
  | 'level_up' | 'hero_revive' | 'item_drop';

export interface VfxConfig {
  src: string;
  cols: number;
  frameW: number;
  frameH: number;
  displaySize: number;
  duration: number;
  singleFrame?: boolean;
  looping?: boolean;
  growing?: boolean;
}

export const VFX_CONFIGS: Record<VfxType, VfxConfig> = {
  holy_heal:        { src:`${BASE}/holy_vfx_02.png`,                cols:8, frameW:64, frameH:64, displaySize:72,  duration:0.7 },
  thunder_hit:      { src:`${BASE}/thunder_projectile.png`,          cols:6, frameW:32, frameH:32, displaySize:52,  duration:0.45 },
  thunder_hit2:     { src:`${BASE}/thunder_projectile_2.png`,        cols:6, frameW:32, frameH:32, displaySize:52,  duration:0.45 },
  fire_hit:         { src:`${BASE}/pixel/fire_breath.png`,           cols:5, frameW:32, frameH:32, displaySize:60,  duration:0.4 },
  firebolt_hit:     { src:`${BASE}/pixel/firebolt.png`,              cols:4, frameW:32, frameH:32, displaySize:48,  duration:0.35 },
  energy_hit:       { src:`${BASE}/energy_projectile.png`,           cols:6, frameW:32, frameH:32, displaySize:48,  duration:0.4 },
  bullet_green:     { src:`${BASE}/bullet_impact/bullet_green.png`,  cols:5, frameW:20, frameH:20, displaySize:36,  duration:0.25 },
  bullet_purple:    { src:`${BASE}/bullet_impact/bullet_purple.png`, cols:5, frameW:20, frameH:20, displaySize:36,  duration:0.25 },
  water_hit:        { src:`${BASE}/pixel/water_ball.png`,            cols:5, frameW:32, frameH:32, displaySize:52,  duration:0.4 },
  holyheal_aura:    { src:`${CUSTOM}/holyheal.png`,   cols:1, frameW:128, frameH:128, displaySize:88, duration:0.9, singleFrame:true },
  crit_hit:         { src:`${CUSTOM}/crit.png`,       cols:1, frameW:64,  frameH:64,  displaySize:60, duration:0.4, singleFrame:true },
  fire_explosion_2: { src:`${BASE}/fire_explosion_2.png`, cols:8, frameW:64, frameH:64, displaySize:120, duration:1.0, growing:true },
  arcaneslash:      { src:`${CUSTOM}/arcaneslash.png`, cols:1, frameW:256, frameH:256, displaySize:130, duration:0.5, singleFrame:true },
  smear_h3:         { src:`${BASE}/pixel/smear_h3.png`,    cols:4, frameW:48, frameH:16, displaySize:64, duration:0.28 },
  smear_v2:         { src:`${BASE}/pixel/smear_v2.png`,    cols:4, frameW:16, frameH:48, displaySize:64, duration:0.28 },
  water_blast:      { src:`${BASE}/pixel/water_blast.png`, cols:5, frameW:32, frameH:32, displaySize:64, duration:0.4 },
  effect3:          { src:`${BASE}/pixel/effect3.png`,     cols:4, frameW:32, frameH:32, displaySize:48, duration:0.3 },
  felspell:         { src:`${BASE}/pixel/17_felspell_spritesheet.png`, cols:6, frameW:32, frameH:32, displaySize:88, duration:6.0, looping:true },
  freezing:         { src:`${BASE}/pixel/19_freezing_spritesheet.png`, cols:6, frameW:32, frameH:32, displaySize:88, duration:6.0, looping:true },
  sunburn:          { src:`${BASE}/pixel/16_sunburn_spritesheet.png`,  cols:6, frameW:32, frameH:32, displaySize:88, duration:6.0, looping:true },
  slash_red:        { src:`${BASE}/slash/slash_red_sm.png`,    cols:5, frameW:32, frameH:32, displaySize:52, duration:0.35 },
  slash_purple:     { src:`${BASE}/slash/slash_purple_md.png`, cols:6, frameW:32, frameH:32, displaySize:64, duration:0.4 },
  hit_effect_1:     { src:`${BASE}/hit_effect_1.png`,          cols:4, frameW:32, frameH:32, displaySize:44, duration:0.3 },
  retro_magenta_a:  { src:`${RETRO}/impactMagentaA.png`, cols:1, frameW:200, frameH:200, displaySize:64, duration:0.3, singleFrame:true },
  retro_magenta_b:  { src:`${RETRO}/impactMagentaB.png`, cols:1, frameW:200, frameH:200, displaySize:64, duration:0.3, singleFrame:true },
  retro_green_a:    { src:`${RETRO}/impactGreenA.png`,   cols:1, frameW:200, frameH:200, displaySize:60, duration:0.3, singleFrame:true },
  retro_green_b:    { src:`${RETRO}/impactGreenB.png`,   cols:1, frameW:200, frameH:200, displaySize:60, duration:0.3, singleFrame:true },
  retro_blue_a:     { src:`${RETRO}/impactBlueA.png`,    cols:1, frameW:200, frameH:200, displaySize:60, duration:0.3, singleFrame:true },
  retro_blue_b:     { src:`${RETRO}/impactBlueB.png`,    cols:1, frameW:200, frameH:200, displaySize:60, duration:0.3, singleFrame:true },
  retro_red_a:      { src:`${RETRO}/impactRedA.png`,     cols:1, frameW:200, frameH:200, displaySize:60, duration:0.3, singleFrame:true },
  retro_red_b:      { src:`${RETRO}/impactRedB.png`,     cols:1, frameW:200, frameH:200, displaySize:60, duration:0.3, singleFrame:true },
  retro_yellow_a:   { src:`${RETRO}/impactYellowA.png`,  cols:1, frameW:200, frameH:200, displaySize:60, duration:0.3, singleFrame:true },
  retro_yellow_b:   { src:`${RETRO}/impactYellowB.png`,  cols:1, frameW:200, frameH:200, displaySize:60, duration:0.3, singleFrame:true },
  retro_white_a:    { src:`${RETRO}/impactWhiteA.png`,   cols:1, frameW:200, frameH:200, displaySize:64, duration:0.3, singleFrame:true },
  retro_white_b:    { src:`${RETRO}/impactWhiteB.png`,   cols:1, frameW:200, frameH:200, displaySize:64, duration:0.3, singleFrame:true },
  retro_white_c:    { src:`${RETRO}/impactWhiteC.png`,   cols:1, frameW:200, frameH:200, displaySize:64, duration:0.3, singleFrame:true },
  retro_orange_a:   { src:`${RETRO}/impactOrangeA.png`,  cols:1, frameW:200, frameH:200, displaySize:60, duration:0.3, singleFrame:true },
  retro_orange_b:   { src:`${RETRO}/impactOrangeB.png`,  cols:1, frameW:200, frameH:200, displaySize:60, duration:0.3, singleFrame:true },
  // WC3-specific VFX
  level_up:         { src:`${CUSTOM}/holyheal.png`,   cols:1, frameW:128, frameH:128, displaySize:100, duration:1.2, singleFrame:true, growing:true },
  hero_revive:      { src:`${BASE}/holy_vfx_02.png`,  cols:8, frameW:64,  frameH:64,  displaySize:96,  duration:1.5 },
  item_drop:        { src:`${RETRO}/impactYellowA.png`,cols:1, frameW:200, frameH:200, displaySize:48,  duration:0.5, singleFrame:true },
};

export const HIT_VFX: Partial<Record<string, VfxType>> = {
  priest:'holy_heal', mage:'energy_hit', necromancer:'thunder_hit', ballista:'thunder_hit2',
  orcMage:'firebolt_hit', orcShaman:'energy_hit', bowman:'bullet_green', musketeer:'bullet_green',
  dragon:'fire_hit', warrior:'retro_red_a', lancer:'retro_orange_a', swordsman:'retro_red_b',
  axeman:'retro_orange_b', knight:'retro_red_a', assasin:'retro_magenta_a', spearman:'retro_blue_a',
  pawn:'retro_blue_b', goblin:'retro_green_a', orc:'retro_green_b', orcWarrior:'retro_green_a',
  skeleton:'retro_magenta_b',
};

export const RETRO_CRIT_POOL: VfxType[] = [
  'retro_magenta_a','retro_magenta_b','retro_yellow_a','retro_yellow_b',
  'retro_white_a','retro_white_b','retro_white_c','retro_orange_a','retro_orange_b',
];

export function randomRetroCrit(): VfxType {
  return RETRO_CRIT_POOL[Math.floor(Math.random() * RETRO_CRIT_POOL.length)];
}
