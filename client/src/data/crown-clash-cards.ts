// Types previously from crown-clash (being rebuilt on BabylonJS)
type BuildingType = 'barracks' | 'archery_range' | 'mage_tower' | 'healing_shrine' | 'siege_workshop' | 'fortification' | 'spawner_hut' | 'bomb_tower';
type UnitRole = 'melee' | 'ranged' | 'elite_melee' | 'elite_ranged' | 'hero_king' | 'hero_queen';
type FactionId = 'elves' | 'orcs';

export type CardType = 'building' | 'hero' | 'spell' | 'unit';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CrownClashCard {
  id: string;
  name: string;
  type: CardType;
  elixirCost: number;
  rarity: Rarity;
  description: string;
  // Building cards
  buildingType?: BuildingType;
  // Unit cards
  unitRole?: UnitRole;
  spawnCount?: number;
  // Spell cards
  spellRadius?: number;
  spellDamage?: number;
  spellHeal?: number;
  spellDuration?: number;
  spellEffect?: 'fireball' | 'heal' | 'freeze' | 'rage';
  // Hero cards
  heroRole?: UnitRole;
  // Card art references (resolved from manifest)
  cardArtIndex?: number; // 0-2 maps to version1-3 TCG templates
  faction?: FactionId; // Which faction this card belongs to (null = universal)
}

// ========================
// BUILDING CARDS (primary mechanic — 8 cards)
// ========================
const BUILDING_CARDS: CrownClashCard[] = [
  {
    id: 'barracks', name: 'Barracks', type: 'building', elixirCost: 5, rarity: 'rare',
    description: 'Deploys melee warriors every 8 seconds.',
    buildingType: 'barracks', cardArtIndex: 0,
  },
  {
    id: 'archery_range', name: 'Archery Range', type: 'building', elixirCost: 5, rarity: 'rare',
    description: 'Trains archers every 10 seconds.',
    buildingType: 'archery_range', cardArtIndex: 1,
  },
  {
    id: 'mage_tower', name: 'Mage Tower', type: 'building', elixirCost: 6, rarity: 'epic',
    description: 'Shoots magic bolts and spawns elite casters.',
    buildingType: 'mage_tower', cardArtIndex: 2,
  },
  {
    id: 'healing_shrine', name: 'Healing Shrine', type: 'building', elixirCost: 4, rarity: 'rare',
    description: 'Heals nearby friendly units in an aura.',
    buildingType: 'healing_shrine', cardArtIndex: 0,
  },
  {
    id: 'siege_workshop', name: 'Siege Workshop', type: 'building', elixirCost: 7, rarity: 'epic',
    description: 'Produces heavy elite melee troops every 16 seconds.',
    buildingType: 'siege_workshop', cardArtIndex: 1,
  },
  {
    id: 'fortification', name: 'Fortification', type: 'building', elixirCost: 3, rarity: 'common',
    description: 'A sturdy wall that blocks enemy advance.',
    buildingType: 'fortification', cardArtIndex: 2,
  },
  {
    id: 'spawner_hut', name: 'Goblin Hut', type: 'building', elixirCost: 3, rarity: 'common',
    description: 'Rapidly spawns cheap melee units every 5 seconds.',
    buildingType: 'spawner_hut', cardArtIndex: 0,
  },
  {
    id: 'bomb_tower', name: 'Bomb Tower', type: 'building', elixirCost: 5, rarity: 'epic',
    description: 'Defensive tower that deals splash damage.',
    buildingType: 'bomb_tower', cardArtIndex: 1,
  },
];

// ========================
// HERO CARDS (4 — powerful direct-deploy characters)
// ========================
const HERO_CARDS: CrownClashCard[] = [
  {
    id: 'elf_king', name: 'Elf King', type: 'hero', elixirCost: 7, rarity: 'legendary',
    description: 'Powerful melee hero with devastating charge attack.',
    heroRole: 'hero_king', faction: 'elves', cardArtIndex: 0,
  },
  {
    id: 'elf_queen', name: 'Elf Queen', type: 'hero', elixirCost: 7, rarity: 'legendary',
    description: 'Elite ranged hero with piercing magic arrows.',
    heroRole: 'hero_queen', faction: 'elves', cardArtIndex: 1,
  },
  {
    id: 'orc_king', name: 'Orc Warchief', type: 'hero', elixirCost: 7, rarity: 'legendary',
    description: 'Massive orc champion with area-of-effect attacks.',
    heroRole: 'hero_king', faction: 'orcs', cardArtIndex: 0,
  },
  {
    id: 'orc_queen', name: 'Orc Shaman', type: 'hero', elixirCost: 7, rarity: 'legendary',
    description: 'Orc spellcaster with ranged hex bolts.',
    heroRole: 'hero_queen', faction: 'orcs', cardArtIndex: 1,
  },
];

// ========================
// SPELL CARDS (4 — area effects)
// ========================
const SPELL_CARDS: CrownClashCard[] = [
  {
    id: 'fireball', name: 'Fireball', type: 'spell', elixirCost: 4, rarity: 'rare',
    description: 'Deals heavy damage in an area.',
    spellEffect: 'fireball', spellRadius: 5, spellDamage: 280, cardArtIndex: 2,
  },
  {
    id: 'heal_spell', name: 'Nature\'s Blessing', type: 'spell', elixirCost: 3, rarity: 'rare',
    description: 'Heals friendly troops in an area.',
    spellEffect: 'heal', spellRadius: 5, spellHeal: 200, cardArtIndex: 0,
  },
  {
    id: 'freeze', name: 'Frost Nova', type: 'spell', elixirCost: 4, rarity: 'epic',
    description: 'Freezes all enemies in area for 3 seconds.',
    spellEffect: 'freeze', spellRadius: 5, spellDuration: 3, cardArtIndex: 1,
  },
  {
    id: 'rage', name: 'Blood Rage', type: 'spell', elixirCost: 2, rarity: 'epic',
    description: 'Boosts nearby troops\' attack speed by 40%.',
    spellEffect: 'rage', spellRadius: 6, spellDuration: 6, cardArtIndex: 2,
  },
];

// ========================
// UNIT CARDS (4 — direct-deploy squads)
// ========================
const UNIT_CARDS: CrownClashCard[] = [
  {
    id: 'warrior_squad', name: 'Warrior Squad', type: 'unit', elixirCost: 4, rarity: 'common',
    description: 'Deploys 3 melee fighters.',
    unitRole: 'melee', spawnCount: 3, cardArtIndex: 0,
  },
  {
    id: 'archer_squad', name: 'Archer Squad', type: 'unit', elixirCost: 4, rarity: 'common',
    description: 'Deploys 3 ranged archers.',
    unitRole: 'ranged', spawnCount: 3, cardArtIndex: 1,
  },
  {
    id: 'elite_guard', name: 'Elite Guard', type: 'unit', elixirCost: 5, rarity: 'rare',
    description: 'Deploys 2 heavily armored elite soldiers.',
    unitRole: 'elite_melee', spawnCount: 2, cardArtIndex: 2,
  },
  {
    id: 'sniper_duo', name: 'Sniper Duo', type: 'unit', elixirCost: 5, rarity: 'rare',
    description: 'Deploys 2 elite long-range shooters.',
    unitRole: 'elite_ranged', spawnCount: 2, cardArtIndex: 0,
  },
];

// ========================
// ALL CARDS
// ========================
export const ALL_CARDS: CrownClashCard[] = [
  ...BUILDING_CARDS,
  ...HERO_CARDS,
  ...SPELL_CARDS,
  ...UNIT_CARDS,
];

export function getCardsByType(type: CardType): CrownClashCard[] {
  return ALL_CARDS.filter(c => c.type === type);
}

export function getCardById(id: string): CrownClashCard | undefined {
  return ALL_CARDS.find(c => c.id === id);
}

export function getCardsForFaction(faction: FactionId): CrownClashCard[] {
  // Building, spell, and unit cards are universal
  // Hero cards are faction-specific
  return ALL_CARDS.filter(c =>
    c.type !== 'hero' || c.faction === faction
  );
}

export function getDefaultDeck(faction: FactionId): CrownClashCard[] {
  const heroCards = HERO_CARDS.filter(c => c.faction === faction);
  return [
    BUILDING_CARDS[0], // Barracks
    BUILDING_CARDS[1], // Archery Range
    BUILDING_CARDS[3], // Healing Shrine
    BUILDING_CARDS[6], // Spawner Hut
    heroCards[0],       // King
    SPELL_CARDS[0],     // Fireball
    UNIT_CARDS[0],      // Warrior Squad
    UNIT_CARDS[1],      // Archer Squad
  ];
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

export const CARD_TYPE_COLORS: Record<CardType, string> = {
  building: '#8b4513',
  hero: '#b8860b',
  spell: '#4b0082',
  unit: '#2563eb',
};
