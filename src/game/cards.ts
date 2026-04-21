import type { CityState, PlayerId } from './types'

// ─── Deterministik yuvarlama kuralı ───────────────────────────────────────────
// Tüm kart hesaplamalarında tutarlı olmak adına aşağı yuvarlama kullanılır.
// Örn. 1/3 birlik hesabında 10 → 3, 7 → 2, 5 → 1.
export function roundDown(value: number): number {
  return Math.floor(value)
}

// ─── Kart tipi ve hedef türü ──────────────────────────────────────────────────
export type CardType = 'CASUS' | 'KUNDAKLAMA' | 'KUDRET' | 'YATIRIM'

export type CardTargetKind = 'NONE' | 'SELF_CITY' | 'ENEMY_CITY'

export interface CardDefinition {
  id: CardType
  name: string
  description: string
  targetKind: CardTargetKind
  price: number
  duration: string
  usageConstraint: string
  singleUse: boolean
}

// ─── Sabitler ─────────────────────────────────────────────────────────────────
export const CARD_PRICES: Record<CardType, number> = {
  CASUS: 1200,
  KUNDAKLAMA: 1800,
  KUDRET: 1500,
  YATIRIM: 2500,
}

export const ESPIONAGE_LOCK_RATIO = 1 / 3
export const KUNDAKLAMA_STAYED_RATIO = 1 / 3
export const YATIRIM_MAX_PER_PLAYER = 5
export const YATIRIM_TAX_MULTIPLIER = 2

// Casus atıldığında, hedef oyuncunun BİR sırası boyunca etki sürer.
// Atan oyuncu T turunda kullanır → etki T+1 (rakibin sırası) boyunca aktif,
// T+2 (atanın tekrar sırası) başında otomatik silinir.
export const ESPIONAGE_TURN_OFFSET = 2

export const CARD_TYPES: CardType[] = ['CASUS', 'KUNDAKLAMA', 'KUDRET', 'YATIRIM']

export const CARD_CATALOG: Record<CardType, CardDefinition> = {
  CASUS: {
    id: 'CASUS',
    name: 'Casus',
    description:
      "Rakip şehirdeki ordunun 1/3'ü bir tur boyunca saldırıya katılamaz, savunmada görev almaya devam eder.",
    targetKind: 'ENEMY_CITY',
    price: CARD_PRICES.CASUS,
    duration: '1 tur',
    usageConstraint: 'Aktif casus etkisi bulunan şehre tekrar uygulanamaz.',
    singleUse: true,
  },
  KUNDAKLAMA: {
    id: 'KUNDAKLAMA',
    name: 'Kundaklama',
    description:
      "Rakip şehrin ordusu 3'e bölünür: 1/3 şehirde kalır, 2/3'ü komşu dost şehirlere rastgele dağılır, sur 1 azalır.",
    targetKind: 'ENEMY_CITY',
    price: CARD_PRICES.KUNDAKLAMA,
    duration: 'Anlık',
    usageConstraint: 'Hedefin en az bir dost komşu şehri bulunmalı.',
    singleUse: true,
  },
  KUDRET: {
    id: 'KUDRET',
    name: 'Kudret',
    description: 'Bu tur boyunca +1 ek saldırı hakkı verir.',
    targetKind: 'NONE',
    price: CARD_PRICES.KUDRET,
    duration: 'Bu tur',
    usageConstraint: 'Aynı tur içinde yalnızca bir kez kullanılabilir.',
    singleUse: true,
  },
  YATIRIM: {
    id: 'YATIRIM',
    name: 'Yatırım',
    description:
      'Seçilen kendi şehrinin vergi gelirini kalıcı olarak 2 katına çıkarır. Şehir el değiştirse bile etki şehirde kalır.',
    targetKind: 'SELF_CITY',
    price: CARD_PRICES.YATIRIM,
    duration: 'Kalıcı',
    usageConstraint: 'Bir şehirde tek kez; her oyuncu en fazla 5 şehirde kullanabilir.',
    singleUse: true,
  },
}

// ─── Envanter yardımcıları ────────────────────────────────────────────────────
export function createEmptyCardInventory(): Record<CardType, number> {
  return {
    CASUS: 0,
    KUNDAKLAMA: 0,
    KUDRET: 0,
    YATIRIM: 0,
  }
}

export function hasCard(inventory: Record<CardType, number> | undefined, type: CardType): boolean {
  return Boolean(inventory && (inventory[type] ?? 0) > 0)
}

// ─── Etki yardımcıları ────────────────────────────────────────────────────────
/**
 * Şehir için o an aktif olan casus kilidini döner.
 * Şehrin mevcut ordusundan büyük olamaz (kayıp yaşandıysa kilit otomatik küçülür).
 */
export function getEffectiveEspionageLock(city: CityState, currentTurn: number): number {
  const lock = city.espionageLock
  if (!lock) return 0
  if (lock.expiresAtTurn <= currentTurn) return 0
  return Math.min(lock.lockedCount, Math.max(0, city.army), Math.max(0, city.readyArmy))
}

/**
 * Saldırı planlaması için kullanılabilir hazır birlik. Kilit savunmada serbest
 * kalsa da saldırı limiti hesaplanırken mutlaka düşülür.
 */
export function getAttackableReadyArmy(city: CityState, currentTurn: number): number {
  return Math.max(0, city.readyArmy - getEffectiveEspionageLock(city, currentTurn))
}

/**
 * Kundaklama'nın 2/3 birliği komşu dost şehirlere dağıtır. Toplam birlik
 * korunur. Komşuların kapasitesi dolarsa artan birlikler "overflow" olarak döner
 * ve çağıran tarafından kaynak şehirde tutulur.
 */
export function distributeUnitsToFriendlyNeighbors(
  units: number,
  friendlyNeighborIds: string[],
  cities: Record<string, CityState>,
  cityArmyLimit: number,
  random: () => number = Math.random,
): { distribution: Record<string, number>; overflow: number } {
  const distribution: Record<string, number> = {}
  if (units <= 0 || friendlyNeighborIds.length === 0) {
    return { distribution, overflow: units }
  }

  const capacity: Record<string, number> = {}
  for (const id of friendlyNeighborIds) {
    const neighbor = cities[id]
    capacity[id] = neighbor ? Math.max(0, cityArmyLimit - neighbor.army) : 0
    distribution[id] = 0
  }

  let remaining = units
  while (remaining > 0) {
    const available = friendlyNeighborIds.filter((id) => (capacity[id] ?? 0) > 0)
    if (available.length === 0) break
    const pickIndex = Math.floor(random() * available.length)
    const chosen = available[Math.min(pickIndex, available.length - 1)]
    distribution[chosen] = (distribution[chosen] ?? 0) + 1
    capacity[chosen] -= 1
    remaining -= 1
  }

  return { distribution, overflow: remaining }
}

/**
 * Hedef şehre kundaklama uygulayabilmek için, hedefin en az bir dost komşusu
 * (hedef sahibine ait) olmalıdır. Kapasitesi dolu olanlar da sayılır; dağıtım
 * sırasında overflow geri kaynak şehre döner.
 */
export function getFriendlyNeighborIds(
  city: CityState,
  owner: PlayerId,
  cities: Record<string, CityState>,
): string[] {
  return city.neighbors.filter((neighborId) => cities[neighborId]?.owner === owner)
}

// ─── Casus hata ayıklama/etiket yardımcıları ─────────────────────────────────
export function hasActiveEspionage(city: CityState, currentTurn: number): boolean {
  return getEffectiveEspionageLock(city, currentTurn) > 0
}
