import { describe, expect, test } from 'vitest'
import {
  CARD_PRICES,
  ESPIONAGE_TURN_OFFSET,
  YATIRIM_MAX_PER_PLAYER,
  YATIRIM_TAX_MULTIPLIER,
  type CardType,
} from '../game/cards'
import {
  createNewGameState,
  gameReducer,
  getAttackableReadyArmy,
  getCityEspionageLock,
  getCityTaxIncome,
  hasAttackOpportunity,
  STARTING_TREASURY,
} from '../game/state'
import type { GameAction, GameState, PlayerId } from '../game/types'

function dispatchActions(initial: GameState, actions: GameAction[]) {
  return actions.reduce((state, action) => gameReducer(state, action), initial)
}

function completeCapitalSelection() {
  return dispatchActions(createNewGameState(), [
    { type: 'SELECT_CITY', cityId: '06' },
    { type: 'CONFIRM_CAPITAL' },
    { type: 'SELECT_CITY', cityId: '34' },
    { type: 'CONFIRM_CAPITAL' },
  ])
}

function withCity(state: GameState, cityId: string, patch: Partial<GameState['cities'][string]>) {
  return {
    ...state,
    cities: {
      ...state.cities,
      [cityId]: { ...state.cities[cityId], ...patch },
    },
  }
}

function withPlayerCards(state: GameState, playerId: PlayerId, patch: Partial<Record<CardType, number>>) {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        cards: { ...state.players[playerId].cards, ...patch },
      },
    },
  }
}

describe('Casus kartı', () => {
  test('Rakip şehirdeki ordunun 1/3\'ünü kilitler, savunma etkilenmez', () => {
    let state = completeCapitalSelection()
    state = withCity(state, '34', { army: 9, readyArmy: 9 })
    state = withPlayerCards(state, 'P1', { CASUS: 1 })

    const defendingArmyBefore = state.cities['34'].army
    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'CASUS', cityId: '34' })

    expect(state.cities['34'].espionageLock?.lockedCount).toBe(3)
    expect(state.cities['34'].espionageLock?.casterId).toBe('P1')
    expect(state.cities['34'].espionageLock?.expiresAtTurn).toBe(state.turn + ESPIONAGE_TURN_OFFSET)

    // Savunma için ordu miktarı değişmez.
    expect(state.cities['34'].army).toBe(defendingArmyBefore)
    expect(getCityEspionageLock(state, '34')).toBe(3)

    // Saldırıya çıkabilecek hazır birlik 9 - 3 = 6.
    expect(getAttackableReadyArmy(state.cities['34'], state.turn)).toBe(6)

    // Envanter tüketildi.
    expect(state.players.P1.cards.CASUS).toBe(0)
  })

  test('Dost şehre uygulanamaz', () => {
    let state = completeCapitalSelection()
    state = withPlayerCards(state, 'P1', { CASUS: 1 })

    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'CASUS', cityId: '06' })

    expect(state.cities['06'].espionageLock ?? null).toBeNull()
    expect(state.players.P1.cards.CASUS).toBe(1)
  })

  test('Aktif casus bulunan şehre ikinci kez uygulanamaz', () => {
    let state = completeCapitalSelection()
    state = withCity(state, '34', { army: 9, readyArmy: 9 })
    state = withPlayerCards(state, 'P1', { CASUS: 2 })

    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'CASUS', cityId: '34' })
    expect(state.players.P1.cards.CASUS).toBe(1)

    const originalLock = state.cities['34'].espionageLock

    // İkinci deneme reddedilir.
    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'CASUS', cityId: '34' })
    expect(state.players.P1.cards.CASUS).toBe(1)
    expect(state.cities['34'].espionageLock).toEqual(originalLock)
  })

  test('Etki sahibin bir sonraki sırasında otomatik temizlenir', () => {
    let state = completeCapitalSelection()
    state = withCity(state, '34', { army: 9, readyArmy: 9 })
    state = withPlayerCards(state, 'P1', { CASUS: 1 })
    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'CASUS', cityId: '34' })

    expect(state.cities['34'].espionageLock).not.toBeNull()

    // P1 turunu bitirir → P2'nin sırası (kilit aktif).
    state = gameReducer(state, { type: 'END_TURN' })
    expect(state.currentPlayer).toBe('P2')
    expect(state.cities['34'].espionageLock).not.toBeNull()

    // P2 turunu bitirir → tekrar P1'in sırası, kilit temizlenir.
    state = gameReducer(state, { type: 'END_TURN' })
    expect(state.currentPlayer).toBe('P1')
    expect(state.cities['34'].espionageLock ?? null).toBeNull()
  })
})

describe('Kundaklama kartı', () => {
  test("1/3'ü şehirde bırakır, 2/3'ü dost komşulara dağıtır, sur 1 azalır, toplam ordu korunur", () => {
    let state = completeCapitalSelection()
    // 41 Kocaeli'nin komşuları: 34 (P2 başkenti), 77, 16, 54 (boş).
    state = withCity(state, '41', { owner: 'P2', army: 12, readyArmy: 12, fortLevel: 2 })
    state = withPlayerCards(state, 'P1', { KUNDAKLAMA: 1 })

    const armyBefore = state.cities['41'].army + state.cities['34'].army
    const fortBefore = state.cities['41'].fortLevel

    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'KUNDAKLAMA', cityId: '41' })

    // floor(12/3) = 4 birlik şehirde kalır.
    expect(state.cities['41'].army).toBe(4)
    // 12 - 4 = 8 birlik tek dost komşu olan 34'e gider (34.army = 6 + 8 = 14).
    expect(state.cities['34'].army).toBe(14)
    // Sur 1 azaldı.
    expect(state.cities['41'].fortLevel).toBe(fortBefore - 1)
    // Toplam P2 ordusu korunur.
    expect(state.cities['41'].army + state.cities['34'].army).toBe(armyBefore)
    // Envanter tüketildi.
    expect(state.players.P1.cards.KUNDAKLAMA).toBe(0)
  })

  test('Dost komşusu olmayan şehre uygulanamaz, kart tüketilmez', () => {
    let state = completeCapitalSelection()
    // 77 Yalova'nın komşuları: 41, 16 (her ikisi de boş).
    state = withCity(state, '77', { owner: 'P2', army: 6, readyArmy: 6, fortLevel: 1 })
    state = withPlayerCards(state, 'P1', { KUNDAKLAMA: 1 })

    const cityBefore = state.cities['77']
    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'KUNDAKLAMA', cityId: '77' })

    expect(state.cities['77'].army).toBe(cityBefore.army)
    expect(state.cities['77'].fortLevel).toBe(cityBefore.fortLevel)
    expect(state.players.P1.cards.KUNDAKLAMA).toBe(1)
  })
})

describe('Kudret kartı', () => {
  test('Aynı tur içinde +1 ek saldırı sağlar ve ikinci kez kullanılamaz', () => {
    let state = completeCapitalSelection()
    // 41 P1'in elinde, 77 ve 16 P2 hedefleri.
    state = withCity(state, '41', { owner: 'P1', army: 10, readyArmy: 10 })
    state = withCity(state, '77', { owner: 'P2', army: 1, readyArmy: 1, fortLevel: 0 })
    state = withCity(state, '16', { owner: 'P2', army: 1, readyArmy: 1, fortLevel: 0 })
    state = withPlayerCards(state, 'P1', { KUDRET: 2 })

    // Kudret kullan.
    state = gameReducer(state, { type: 'USE_CARD_SELF', cardType: 'KUDRET' })
    expect(state.players.P1.kudretUsedThisTurn).toBe(true)
    expect(state.players.P1.bonusAttacksRemaining).toBe(1)
    expect(state.players.P1.cards.KUDRET).toBe(1)

    // İkinci Kudret reddedilir.
    state = gameReducer(state, { type: 'USE_CARD_SELF', cardType: 'KUDRET' })
    expect(state.players.P1.bonusAttacksRemaining).toBe(1)
    expect(state.players.P1.cards.KUDRET).toBe(1)

    // Ana saldırı: 41 → 77.
    state = dispatchActions(state, [
      { type: 'SET_ACTION_MODE', mode: 'ATTACK' },
      { type: 'SELECT_CITY', cityId: '41' },
      { type: 'SELECT_CITY', cityId: '77' },
      { type: 'SET_ACTION_AMOUNT', amount: 5 },
      { type: 'CONFIRM_ACTION' },
    ])
    expect(state.conquestUsed).toBe(true)
    expect(state.players.P1.bonusAttacksRemaining).toBe(1)
    expect(hasAttackOpportunity(state, 'P1')).toBe(true)

    // Bonus saldırı: 41 → 16.
    state = dispatchActions(state, [
      { type: 'SET_ACTION_MODE', mode: 'ATTACK' },
      { type: 'SELECT_CITY', cityId: '41' },
      { type: 'SELECT_CITY', cityId: '16' },
      { type: 'SET_ACTION_AMOUNT', amount: 4 },
      { type: 'CONFIRM_ACTION' },
    ])
    expect(state.conquestUsed).toBe(true)
    expect(state.players.P1.bonusAttacksRemaining).toBe(0)
    expect(hasAttackOpportunity(state, 'P1')).toBe(false)

    // Üçüncü saldırı modu açılamaz.
    const beforeThirdAttempt = state
    state = gameReducer(state, { type: 'SET_ACTION_MODE', mode: 'ATTACK' })
    expect(state.actionMode).toBe(beforeThirdAttempt.actionMode)
  })

  test('Tur sonunda Kudret sayaçları sıfırlanır', () => {
    let state = completeCapitalSelection()
    state = withPlayerCards(state, 'P1', { KUDRET: 1 })
    state = gameReducer(state, { type: 'USE_CARD_SELF', cardType: 'KUDRET' })
    expect(state.players.P1.kudretUsedThisTurn).toBe(true)
    expect(state.players.P1.bonusAttacksRemaining).toBe(1)

    // P1 → P2 → P1
    state = gameReducer(state, { type: 'END_TURN' })
    state = gameReducer(state, { type: 'END_TURN' })

    expect(state.currentPlayer).toBe('P1')
    expect(state.players.P1.kudretUsedThisTurn).toBe(false)
    expect(state.players.P1.bonusAttacksRemaining).toBe(0)
  })
})

describe('Yatırım kartı', () => {
  test('Seçilen kendi şehrinin vergi gelirini kalıcı olarak 2 katına çıkarır', () => {
    let state = completeCapitalSelection()
    state = withCity(state, '71', { owner: 'P1' })
    state = withPlayerCards(state, 'P1', { YATIRIM: 1 })
    const baseTax = state.cities['71'].baseTax

    expect(getCityTaxIncome(state.cities['71'])).toBe(baseTax)

    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'YATIRIM', cityId: '71' })

    expect(state.cities['71'].investmentApplied).toBe(true)
    expect(getCityTaxIncome(state.cities['71'])).toBe(baseTax * YATIRIM_TAX_MULTIPLIER)
    expect(state.players.P1.investedCityIds).toEqual(['71'])
    expect(state.players.P1.cards.YATIRIM).toBe(0)
  })

  test('Aynı şehre ikinci kez uygulanamaz, kart tüketilmez', () => {
    let state = completeCapitalSelection()
    state = withCity(state, '71', { owner: 'P1' })
    state = withPlayerCards(state, 'P1', { YATIRIM: 2 })
    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'YATIRIM', cityId: '71' })
    expect(state.players.P1.cards.YATIRIM).toBe(1)

    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'YATIRIM', cityId: '71' })
    expect(state.players.P1.cards.YATIRIM).toBe(1)
    expect(state.players.P1.investedCityIds).toEqual(['71'])
  })

  test('Başkente Yatırım kartı uygulanamaz, kart tüketilmez', () => {
    let state = completeCapitalSelection()
    state = withPlayerCards(state, 'P1', { YATIRIM: 1 })

    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'YATIRIM', cityId: '06' })

    expect(state.cities['06'].isCapital).toBe(true)
    expect(state.cities['06'].investmentApplied).toBeFalsy()
    expect(state.players.P1.cards.YATIRIM).toBe(1)
    expect(state.players.P1.investedCityIds).toEqual([])
  })

  test('Rakip şehre uygulanamaz', () => {
    let state = completeCapitalSelection()
    state = withPlayerCards(state, 'P1', { YATIRIM: 1 })

    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'YATIRIM', cityId: '34' })

    expect(state.cities['34'].investmentApplied).toBeFalsy()
    expect(state.players.P1.cards.YATIRIM).toBe(1)
    expect(state.players.P1.investedCityIds).toEqual([])
  })

  test('Oyuncu başına en fazla 5 şehirde uygulanabilir', () => {
    let state = completeCapitalSelection()
    const p1Cities = ['71', '18', '14', '40', '68', '05']
    for (const id of p1Cities) {
      state = withCity(state, id, { owner: 'P1' })
    }
    state = withPlayerCards(state, 'P1', { YATIRIM: 6 })

    for (const id of p1Cities.slice(0, YATIRIM_MAX_PER_PLAYER)) {
      state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'YATIRIM', cityId: id })
      expect(state.cities[id].investmentApplied).toBe(true)
    }

    expect(state.players.P1.investedCityIds).toHaveLength(YATIRIM_MAX_PER_PLAYER)
    expect(state.players.P1.cards.YATIRIM).toBe(1)

    // 6. deneme reddedilir.
    const sixthId = p1Cities[YATIRIM_MAX_PER_PLAYER]
    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'YATIRIM', cityId: sixthId })
    expect(state.cities[sixthId].investmentApplied).toBeFalsy()
    expect(state.players.P1.cards.YATIRIM).toBe(1)
  })

  test('Yatırımlı şehir el değiştirirse etki korunur', () => {
    let state = completeCapitalSelection()
    // 41 P1 elinde olsun ve yatırım uygulansın.
    state = withCity(state, '41', { owner: 'P1', army: 2, readyArmy: 2 })
    state = withPlayerCards(state, 'P1', { YATIRIM: 1 })
    state = gameReducer(state, { type: 'USE_CARD_ON_CITY', cardType: 'YATIRIM', cityId: '41' })
    expect(state.cities['41'].investmentApplied).toBe(true)
    const baseTax = state.cities['41'].baseTax

    // Fetih sonucu olarak el değiştirmeyi simüle edelim: P2'ye devret.
    state = gameReducer(state, { type: 'END_TURN' })
    expect(state.currentPlayer).toBe('P2')

    state = withCity(state, '16', { owner: 'P2', army: 10, readyArmy: 10 })
    // 16 → 41: 41 P1'den alınır.
    state = dispatchActions(state, [
      { type: 'SET_ACTION_MODE', mode: 'ATTACK' },
      { type: 'SELECT_CITY', cityId: '16' },
      { type: 'SELECT_CITY', cityId: '41' },
      { type: 'SET_ACTION_AMOUNT', amount: 9 },
      { type: 'CONFIRM_ACTION' },
    ])

    expect(state.cities['41'].owner).toBe('P2')
    expect(state.cities['41'].investmentApplied).toBe(true)
    expect(getCityTaxIncome(state.cities['41'])).toBe(baseTax * YATIRIM_TAX_MULTIPLIER)
  })
})

describe('Kart mağazası', () => {
  test('Kart satın alma altını düşer, envantere ekler', () => {
    let state = completeCapitalSelection()
    const treasuryBefore = state.players.P1.treasury

    state = gameReducer(state, { type: 'BUY_CARD', cardType: 'CASUS' })

    expect(state.players.P1.treasury).toBe(treasuryBefore - CARD_PRICES.CASUS)
    expect(state.players.P1.cards.CASUS).toBe(1)
  })

  test('Kasa yetersizse satın alma reddedilir', () => {
    let state = completeCapitalSelection()
    // YATIRIM fiyatı 2500; başlangıç kasası (STARTING_TREASURY + baseTax) yetmeyebilir.
    // Güvenli olsun diye kasayı 0'a çekelim.
    state = {
      ...state,
      players: {
        ...state.players,
        P1: { ...state.players.P1, treasury: 0 },
      },
    }

    state = gameReducer(state, { type: 'BUY_CARD', cardType: 'YATIRIM' })

    expect(state.players.P1.treasury).toBe(0)
    expect(state.players.P1.cards.YATIRIM).toBe(0)
  })

  test('Yeterli altınla tüm kartlar satın alınabilir', () => {
    let state = completeCapitalSelection()
    // Kasayı bolca doldur
    state = {
      ...state,
      players: {
        ...state.players,
        P1: { ...state.players.P1, treasury: STARTING_TREASURY + 20_000 },
      },
    }
    const types: CardType[] = ['CASUS', 'KUNDAKLAMA', 'KUDRET', 'YATIRIM']
    for (const type of types) {
      state = gameReducer(state, { type: 'BUY_CARD', cardType: type })
    }
    expect(state.players.P1.cards.CASUS).toBe(1)
    expect(state.players.P1.cards.KUNDAKLAMA).toBe(1)
    expect(state.players.P1.cards.KUDRET).toBe(1)
    expect(state.players.P1.cards.YATIRIM).toBe(1)
  })
})
