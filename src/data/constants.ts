import type { CitySpecialty, CoinSide, Phase, PlayerId, Resources } from '../engine/types'

export const STORAGE_KEY = 'anadolu-stratejisi-kale-save-v4'

export const PHASE_SEQUENCE: Phase[] = ['COMMAND']

export const COIN_LABELS: Record<CoinSide, string> = {
  HEADS: 'Yazi',
  TAILS: 'Tura',
}

export const PLAYER_META: Record<
  PlayerId,
  { short: string; long: string; color: string; accent: string; surface: string }
> = {
  P1: {
    short: 'Mavi',
    long: 'Mavi Komutanlik',
    color: '#4ea1ff',
    accent: '#7cc5ff',
    surface: '#173860',
  },
  P2: {
    short: 'Kirmizi',
    long: 'Kirmizi Komutanlik',
    color: '#ff6b6b',
    accent: '#ff9f8c',
    surface: '#5a2121',
  },
}

export const SPECIALTY_META: Record<
  CitySpecialty,
  { label: string; short: string; mapBadge: string; color: string }
> = {
  GOLD: { label: 'Altin', short: 'ALT', mapBadge: 'A', color: '#d6b85a' },
  IRON: { label: 'Demir', short: 'DEM', mapBadge: 'D', color: '#9aa7b8' },
  ENERGY: { label: 'Enerji', short: 'ENR', mapBadge: 'E', color: '#58c7a5' },
  FOOD: { label: 'Gida', short: 'GID', mapBadge: 'G', color: '#f1a95d' },
  RESEARCH: { label: 'Arastirma', short: 'ARS', mapBadge: 'R', color: '#7e8dff' },
  POPULATION: { label: 'Nufus', short: 'NUF', mapBadge: 'N', color: '#d07cff' },
}

export const RULES = {
  startingResources: {
    gold: 2000,
    iron: 0,
    energy: 0,
    food: 0,
    research: 0,
    population: 0,
  } satisfies Resources,
  city: {
    baseTax: 60,
    capitalBonusTax: 0,
    baseFood: 0,
    basePopulation: 0,
    capitalArmyCap: 12,
    normalArmyCap: 8,
  },
  capital: {
    startingArmy: 6,
    startingFortLevel: 1,
    capturePoints: 1,
  },
  reinforcement: {
    free: {
      limit: 0,
      armyGain: 1,
      cost: {
        gold: 0,
        iron: 0,
        energy: 0,
        food: 0,
        research: 0,
        population: 0,
      },
    },
    paid: {
      limit: 99,
      armyGain: 1,
      cost: {
        gold: 1000,
        iron: 0,
        energy: 0,
        food: 0,
        research: 0,
        population: 0,
      },
    },
  },
  fort: {
    maxLevel: 3,
    cost: {
      gold: 1000,
      iron: 0,
    },
  },
  movement: {
    baseEnergyCost: 0,
    disconnectedPenalty: 0,
  },
  militiaRaid: {
    energyCost: 9999,
    limitPerTurn: 0,
  },
  combat: {
    minimumAttackArmy: 1,
    baseEnergyCost: 0,
    fortifiedEnergyCost: 0,
    capitalEnergyCost: 0,
    supportPerCity: 0,
    supportMax: 0,
    fortDefensePerLevel: 1,
    capitalDefenseBonus: 1,
    supplyDefenseBonus: 0,
    successfulCaptureMinimumArmy: 1,
  },
  upkeep: {
    armyGold: 0,
    armyFood: 0,
    fortGold: 0,
  },
  specialties: {
    GOLD: { gold: 0 },
    IRON: { iron: 0 },
    ENERGY: { energy: 0 },
    FOOD: { food: 0 },
    RESEARCH: { research: 0 },
    POPULATION: { population: 0 },
  } satisfies Record<CitySpecialty, Partial<Resources>>,
  sabotage: {
    cost: {
      gold: 9999,
      energy: 9999,
      research: 9999,
    },
    fortPenalty: 0,
  },
  emergencyLogistics: {
    cost: {
      gold: 9999,
      energy: 9999,
      research: 9999,
    },
    temporaryDefenseBonus: 0,
  },
  crisis: {
    defeatAfterStreak: 9999,
  },
  warWeariness: {
    stagnationRounds: 9999,
    taxPenaltyPerLevel: 0,
    extraFortUpkeepPerLevel: 0,
  },
  victory: {
    cityTarget: 12,
  },
}

export const PHASE_LABELS: Record<Phase, string> = {
  COMMAND: 'Komuta',
  INCOME_UPKEEP: 'Gelir ve Bakim',
  BUILD_REINFORCE: 'Takviye',
  MOVE: 'Hareket',
  COMBAT_OPS: 'Savas',
}
