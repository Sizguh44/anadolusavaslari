// Oyun durumu → UI sunum metni köprüsü.
// Bu dosya saf fonksiyonlar içerir; reducer'ı değiştirmez. UI bileşenleri
// bu seçicileri çağırarak aynı cümle ve ipucu havuzundan beslenir.

import { CITY_ARMY_LIMIT, CITY_FORT_LIMIT, getModeLabel } from './state'
import type { ActionMode, CityState, GameState } from './types'

export function getTurnBanner(state: GameState): string {
  const names = state.playerNames

  if (state.stage === 'CAPITAL_SELECTION') {
    return `${names[state.capitalSelectionPlayer]} başkent seçiyor`
  }

  if (state.stage === 'GAME_OVER' && state.winner) {
    return `${names[state.winner]} kazandı`
  }

  return `${names[state.currentPlayer]} oyuncunun sırası`
}

export function getActionPrompt(
  state: GameState,
  sourceCity: CityState | null,
  targetCity: CityState | null,
): string {
  if (state.stage === 'CAPITAL_SELECTION') {
    return 'Sahipsiz bir şehir seç ve Başkent Yap ile onayla.'
  }

  if (state.stage === 'GAME_OVER') {
    return 'Savaş sona erdi. Yeni oyun veya ana sayfa için menüyü kullan.'
  }

  if (!state.actionMode) {
    return state.conquestUsed
      ? 'Ana fetih hakkı kullanıldı. Takviye yapabilir veya turu bitirebilirsin.'
      : 'Bir şehir seç ve harita kartından aksiyon başlat.'
  }

  if (state.actionMode === 'ANNEX') {
    if (!sourceCity) {
      return 'İlhak için kendi şehirlerinden birini kaynak seç.'
    }
    return `${sourceCity.name} hazır. Komşu sahipsiz şehre tıkla → ilhak anında gerçekleşir.`
  }

  if (state.actionMode === 'TRANSFER') {
    if (!sourceCity) {
      return 'İntikal için kaynak şehir seç.'
    }
    if (!targetCity) {
      return `${sourceCity.name} kaynağından dost bir hedef seç.`
    }
    return `${sourceCity.name} → ${targetCity.name} için birlik miktarını ayarla ve onayla.`
  }

  if (!sourceCity) {
    return 'Saldırı için kaynak şehir seç.'
  }

  if (!targetCity) {
    return `${sourceCity.name} hazır. Komşu düşman hedef seç.`
  }

  return `${sourceCity.name} → ${targetCity.name} için gücü ayarla ve onayla.`
}

export function getCityActionTags(
  city: CityState,
  state: GameState,
  validAnnexSourceIds: string[],
  validTransferSourceIds: string[],
  validAttackSourceIds: string[],
): string[] {
  const tags: string[] = []

  if (city.owner !== state.currentPlayer || state.stage !== 'PLAYING') {
    return tags
  }

  if (validAnnexSourceIds.includes(city.id) && !state.conquestUsed) {
    tags.push('İlhak')
  }

  if (validTransferSourceIds.includes(city.id)) {
    tags.push('İntikal')
  }

  if (validAttackSourceIds.includes(city.id) && !state.conquestUsed) {
    tags.push('Saldırı')
  }

  if (city.army >= CITY_ARMY_LIMIT) {
    tags.push('Ordu tavan')
  }

  if (city.fortLevel >= CITY_FORT_LIMIT) {
    tags.push('Sur tavan')
  }

  if (city.isCapital) {
    tags.push('Başkent')
  }

  return tags
}

export function getModeSummary(state: GameState): string {
  if (state.stage === 'CAPITAL_SELECTION') {
    return 'Kurulum'
  }

  if (state.stage === 'GAME_OVER') {
    return 'Zafer'
  }

  if (state.actionMode) {
    return getModeLabel(state.actionMode)
  }

  return state.conquestUsed ? 'Takviye' : 'Serbest'
}

export function getConfirmLabel(state: GameState): string {
  if (state.stage === 'CAPITAL_SELECTION') {
    return 'Başkent Yap'
  }

  return 'Onayla'
}

export function getConfirmReady(state: GameState): boolean {
  if (state.stage === 'CAPITAL_SELECTION') {
    return Boolean(state.selectedCityId)
  }

  if (state.stage !== 'PLAYING' || !state.actionMode) {
    return false
  }

  if (state.actionMode === 'ANNEX') {
    return Boolean(state.actionSourceCityId && state.actionTargetCityId)
  }

  return Boolean(state.actionSourceCityId && state.actionTargetCityId && state.actionAmount > 0)
}

// ─── Karar berraklığı için ek seçiciler ──────────────────────────────────────

/** Aktif oyuncu pill'ine metin değil, hamle durumu özeti döner. */
export function getPhaseSummary(state: GameState): string {
  if (state.stage === 'HOME' || state.stage === 'SETUP') {
    return 'Kurulum bekliyor'
  }

  if (state.stage === 'CAPITAL_SELECTION') {
    return 'Başkent seçimi'
  }

  if (state.stage === 'GAME_OVER') {
    return 'Savaş bitti'
  }

  const bonus = state.players[state.currentPlayer].bonusAttacksRemaining

  if (!state.conquestUsed) {
    return 'Ana hamle hazır'
  }

  if (bonus > 0) {
    return `Kudret bonusu +${bonus}`
  }

  return 'Takviye aşaması'
}

/** "Tur" pill'ine faz bağlamı — oyuncu adı tekrarı yok. */
export function getTurnMeta(state: GameState): string {
  if (state.stage === 'HOME' || state.stage === 'SETUP') {
    return 'Oyun başlamadı'
  }

  if (state.stage === 'CAPITAL_SELECTION') {
    return 'Kurulum'
  }

  if (state.stage === 'GAME_OVER') {
    return 'Savaş bitti'
  }

  return 'Cephe'
}

/** Boş "Seçili Şehir" pill'i için bağlam duyarlı yer tutucu. */
export function getSelectedCityPlaceholder(state: GameState): string {
  if (state.stage === 'CAPITAL_SELECTION') {
    return 'Başkent adayı seç'
  }

  if (state.actionMode === 'ANNEX') {
    return 'İlhak kaynağı seç'
  }

  if (state.actionMode === 'TRANSFER') {
    return 'İntikal kaynağı seç'
  }

  if (state.actionMode === 'ATTACK') {
    return 'Saldırı kaynağı seç'
  }

  if (state.pendingCardUse) {
    return 'Kart hedefi seç'
  }

  return 'Haritadan şehir seç'
}

/** Status-strip'in ikincil/alternatif satırı. Primary ile çakışmayacak yalnızca
 *  gerçekten ek bilgi taşıdığı durumlarda döner; aksi halde null. */
export function getSecondaryHint(state: GameState): string | null {
  if (state.stage === 'CAPITAL_SELECTION') {
    return 'Rakip başkente komşu iller kapalıdır.'
  }

  if (state.stage === 'GAME_OVER') {
    return null
  }

  if (state.pendingCardUse) {
    return 'ESC ile kartı iptal edebilirsin.'
  }

  if (state.actionMode) {
    return 'ESC veya Temizle ile aksiyonu iptal edebilirsin.'
  }

  // conquestUsed durumunda primary zaten "Ana fetih hakkı kullanıldı. Takviye
  // yapabilir veya turu bitirebilirsin." diyor — ikinci satır tekrar olmasın.
  if (state.conquestUsed) {
    return null
  }

  return 'Kart, takviye ve tur sonu seçenekleri her zaman açık.'
}

/**
 * "Turu Bitir" butonunun görsel önemi — doğal sonraki aksiyon tur sonuysa
 * primary ton, değilse ghost. Sadece sunum; reducer'ı etkilemez.
 */
export function isEndTurnPrimary(state: GameState): boolean {
  if (state.stage !== 'PLAYING') return false
  if (state.actionMode) return false
  if (state.pendingCardUse) return false
  if (!state.conquestUsed) return false
  // Kudret bonusu varsa hâlâ saldırı seçeneği doğal — tur sonu öne çıkmasın.
  if (state.players[state.currentPlayer].bonusAttacksRemaining > 0) return false
  return true
}

/** Mod pill'ine iptal affordance'ı için: tıklama şu an aktif bir aksiyon iptaliyse true. */
export function isModePillCancelable(state: GameState): boolean {
  if (state.stage !== 'PLAYING') return false
  return Boolean(state.actionMode || state.pendingCardUse)
}

export type ActionModeLike = ActionMode | null
