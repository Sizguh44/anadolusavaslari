// Harita görsel rolü seçicisi.
// Bir şehrin tek baskın "durumunu" (renk-dışı ikinci sinyalle birlikte)
// belirler. TurkeyMapBoard bu rollere bakarak hem CSS class hem de SVG
// marker üretir; böylece class kombinasyonu çakışması tek yerden yönetilir.
//
// Oyun kurallarını değiştirmez; yalnızca reducer'dan türetilen set'leri
// okur ve sunuma dönüştürür.

import type { ActionMode, CityState, GameStage, PlayerId } from './types'
import type { CardType } from './cards'

export type MapCityRole =
  | 'idle'
  | 'source'
  | 'source-candidate'
  | 'selected'
  | 'target'
  | 'annex-target'
  | 'transfer-target'
  | 'attack-target'
  | 'capital-choice'
  | 'capital-forbidden'
  | 'card-targetable'
  | 'invalid'
  | 'dimmed'

export interface MapCityDecoration {
  /** CSS class'larına eklenen kök rol. */
  role: MapCityRole
  /** Bu şehir oyuncunun kendi başkenti mi. Her zaman gösterilen kalıcı rozet. */
  isCapital: boolean
  /** Bu şehir seçili olduğunda değişmeyen base outline sinyali. */
  isSelected: boolean
  /** Aktif aksiyonun kaynağı mı. */
  isSource: boolean
  /** Aktif aksiyonun hedefi mi. */
  isTarget: boolean
}

export interface MapRoleContext {
  stage: GameStage
  currentPlayer: PlayerId
  actionMode: ActionMode | null
  selectedCityId: string | null
  sourceCityId: string | null
  targetCityId: string | null
  pendingCardType: CardType | null
  validAnnexSourceIds: Set<string>
  validAnnexTargetIds: Set<string>
  validTransferSourceIds: Set<string>
  validTransferTargetIds: Set<string>
  validAttackSourceIds: Set<string>
  validAttackTargetIds: Set<string>
  capitalForbiddenIds: Set<string>
  globalAnnexableIds: Set<string>
  cardTargetIds: Set<string>
}

/**
 * Tek karar noktası: şehrin baskın görsel rolünü döner.
 * Birden fazla durum çakıştığında öncelik şudur:
 *   target > selected > card-targetable > (mode hedefleri) > source > capital-choice
 *   > capital-forbidden > invalid > dimmed > idle
 */
export function getMapCityDecoration(city: CityState, ctx: MapRoleContext): MapCityDecoration {
  const isSelected = ctx.selectedCityId === city.id
  const isSource = ctx.sourceCityId === city.id
  const isTarget = ctx.targetCityId === city.id

  const role = resolveRole(city, ctx, { isSelected, isSource, isTarget })

  return {
    role,
    isCapital: city.isCapital && city.owner !== null,
    isSelected,
    isSource,
    isTarget,
  }
}

function resolveRole(
  city: CityState,
  ctx: MapRoleContext,
  flags: { isSelected: boolean; isSource: boolean; isTarget: boolean },
): MapCityRole {
  // P0 — target (seçili target varsa selected ile çakışmada target kazanır).
  if (flags.isTarget && ctx.actionMode) return 'target'

  // P0.5 — source öne çıksın (selected'tan önce; kullanıcı zaten buradan yayılıyor).
  if (flags.isSource && ctx.actionMode) return 'source'

  // Kurulum fazı kendi özel rolleri ile önde.
  if (ctx.stage === 'CAPITAL_SELECTION') {
    if (city.owner) return 'idle'
    if (ctx.capitalForbiddenIds.has(city.id)) return 'capital-forbidden'
    return 'capital-choice'
  }

  // Kart hedefleme aktif — yalnızca geçerli hedefler renklenir.
  if (ctx.pendingCardType) {
    if (ctx.cardTargetIds.has(city.id)) return 'card-targetable'
    if (flags.isSelected) return 'selected'
    return 'invalid'
  }

  // Aktif aksiyon modu: hedef adayları + kaynak adayları.
  // Source henüz seçilmemişse kendi şehirlerin "source-candidate" rolünde
  // belirginleşir — oyuncu haritayı tarayıp kaynağı seçebilir.
  if (ctx.actionMode === 'ANNEX') {
    if (ctx.validAnnexTargetIds.has(city.id)) return 'annex-target'
    if (!ctx.sourceCityId && ctx.globalAnnexableIds.has(city.id)) return 'annex-target'
    if (ctx.validAnnexSourceIds.has(city.id)) {
      if (flags.isSelected) return 'selected'
      return ctx.sourceCityId ? 'idle' : 'source-candidate'
    }
    if (flags.isSelected) return 'selected'
    return 'dimmed'
  }

  if (ctx.actionMode === 'TRANSFER') {
    if (ctx.validTransferTargetIds.has(city.id)) return 'transfer-target'
    if (ctx.validTransferSourceIds.has(city.id)) {
      if (flags.isSelected) return 'selected'
      return ctx.sourceCityId ? 'idle' : 'source-candidate'
    }
    if (flags.isSelected) return 'selected'
    return 'dimmed'
  }

  if (ctx.actionMode === 'ATTACK') {
    if (ctx.validAttackTargetIds.has(city.id)) return 'attack-target'
    if (ctx.validAttackSourceIds.has(city.id)) {
      if (flags.isSelected) return 'selected'
      return ctx.sourceCityId ? 'idle' : 'source-candidate'
    }
    if (flags.isSelected) return 'selected'
    return 'dimmed'
  }

  // Nötr — kart yok, mod yok.
  if (flags.isSelected) return 'selected'
  return 'idle'
}

export function getMapCityClassName(decoration: MapCityDecoration, ownerCls: string): string {
  return [
    'map-city',
    ownerCls,
    `map-city--role-${decoration.role}`,
    decoration.isSelected ? 'is-selected' : '',
    decoration.isSource ? 'is-source' : '',
    decoration.isTarget ? 'is-target' : '',
    decoration.isCapital ? 'is-capital' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
