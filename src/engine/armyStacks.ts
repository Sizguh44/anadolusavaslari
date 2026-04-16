import type { ArmyStack, CityState } from './types'

function mergeStacksByActionState(stacks: ArmyStack[]): ArmyStack[] {
  const grouped = new Map<boolean, number>()

  for (const stack of stacks) {
    if (stack.size <= 0) {
      continue
    }

    grouped.set(stack.actedThisTurn, (grouped.get(stack.actedThisTurn) ?? 0) + stack.size)
  }

  const normalized: ArmyStack[] = []

  if ((grouped.get(false) ?? 0) > 0) {
    normalized.push({ size: grouped.get(false) ?? 0, actedThisTurn: false })
  }

  if ((grouped.get(true) ?? 0) > 0) {
    normalized.push({ size: grouped.get(true) ?? 0, actedThisTurn: true })
  }

  return normalized
}

export function getArmyTotal(stacks: ArmyStack[]): number {
  return stacks.reduce((sum, stack) => sum + stack.size, 0)
}

export function normalizeStacks(stacks: ArmyStack[]): ArmyStack[] {
  return mergeStacksByActionState(stacks)
}

export function syncCityArmy(city: CityState, stacks: ArmyStack[]): CityState {
  const normalizedStacks = normalizeStacks(stacks)
  return {
    ...city,
    stacks: normalizedStacks,
    army: getArmyTotal(normalizedStacks),
  }
}

export function createFreshArmyStack(size: number, actedThisTurn = false): ArmyStack {
  return {
    size,
    actedThisTurn,
  }
}

export function getReadyStacks(city: CityState): ArmyStack[] {
  return city.stacks.filter((stack) => !stack.actedThisTurn)
}

export function getReadyArmySize(city: CityState): number {
  return getReadyStacks(city).reduce((sum, stack) => sum + stack.size, 0)
}

export function getExhaustedArmySize(city: CityState): number {
  return city.stacks
    .filter((stack) => stack.actedThisTurn)
    .reduce((sum, stack) => sum + stack.size, 0)
}

export function getMovableArmySize(city: CityState, minimumGarrison = 1): number {
  const readyArmy = getReadyArmySize(city)
  const exhaustedArmy = getExhaustedArmySize(city)
  const reserveNeededFromReady = Math.max(0, minimumGarrison - exhaustedArmy)

  return Math.max(0, readyArmy - reserveNeededFromReady)
}

export function hasReadyArmy(city: CityState, minimum = 1): boolean {
  return getReadyArmySize(city) >= minimum
}

export function addArmyToReadyStacks(city: CityState, amount: number): CityState {
  if (amount <= 0) {
    return city
  }

  const readySize = getReadyArmySize(city)
  const exhaustedSize = getExhaustedArmySize(city)
  const nextStacks: ArmyStack[] = []

  if (readySize + amount > 0) {
    nextStacks.push(createFreshArmyStack(readySize + amount, false))
  }

  if (exhaustedSize > 0) {
    nextStacks.push(createFreshArmyStack(exhaustedSize, true))
  }

  return syncCityArmy(city, nextStacks)
}

export function addArmyToExhaustedStacks(city: CityState, amount: number): CityState {
  if (amount <= 0) {
    return city
  }

  const readySize = getReadyArmySize(city)
  const exhaustedSize = getExhaustedArmySize(city)
  const nextStacks: ArmyStack[] = []

  if (readySize > 0) {
    nextStacks.push(createFreshArmyStack(readySize, false))
  }

  if (exhaustedSize + amount > 0) {
    nextStacks.push(createFreshArmyStack(exhaustedSize + amount, true))
  }

  return syncCityArmy(city, nextStacks)
}

export function resetStacksForNewTurn(city: CityState): CityState {
  if (city.army <= 0) {
    return syncCityArmy(city, [])
  }

  return syncCityArmy(city, [createFreshArmyStack(city.army, false)])
}

export function removeArmyFromCity(city: CityState, amount: number): CityState {
  if (amount <= 0 || city.army <= 0) {
    return city
  }

  let remaining = amount
  const stacks = [...city.stacks]
    .sort((left, right) => {
      if (right.size !== left.size) {
        return right.size - left.size
      }

      return Number(left.actedThisTurn) - Number(right.actedThisTurn)
    })
    .map((stack) => ({ ...stack }))

  for (const stack of stacks) {
    if (remaining <= 0) {
      break
    }

    const delta = Math.min(stack.size, remaining)
    stack.size -= delta
    remaining -= delta
  }

  return syncCityArmy(city, stacks)
}

export function consumeReadyArmy(city: CityState): { updatedCity: CityState; movedArmy: number } {
  const movedArmy = getReadyArmySize(city)
  const updatedCity = syncCityArmy(
    city,
    city.stacks.filter((stack) => stack.actedThisTurn),
  )

  return {
    updatedCity,
    movedArmy,
  }
}

export function consumeMovableArmy(city: CityState, minimumGarrison = 1): { updatedCity: CityState; movedArmy: number } {
  return moveReadyArmy(city, getMovableArmySize(city, minimumGarrison), minimumGarrison)
}

export function moveReadyArmy(
  city: CityState,
  requestedAmount: number,
  minimumGarrison = 1,
): { updatedCity: CityState; movedArmy: number } {
  const movedArmy = Math.min(requestedAmount, getMovableArmySize(city, minimumGarrison))

  if (movedArmy <= 0) {
    return {
      updatedCity: city,
      movedArmy: 0,
    }
  }

  let remainingToMove = movedArmy
  const nextStacks = city.stacks.map((stack) => {
    if (stack.actedThisTurn || remainingToMove <= 0) {
      return { ...stack }
    }

    const delta = Math.min(stack.size, remainingToMove)
    remainingToMove -= delta

    return {
      ...stack,
      size: stack.size - delta,
    }
  })

  return {
    updatedCity: syncCityArmy(city, nextStacks),
    movedArmy,
  }
}

export function exhaustReadyArmy(city: CityState, losses: number): { updatedCity: CityState; survivingArmy: number } {
  const readyArmy = getReadyArmySize(city)
  const exhaustedArmy = getExhaustedArmySize(city)
  const survivingArmy = Math.max(0, readyArmy - losses)
  const nextStacks: ArmyStack[] = []

  if (survivingArmy > 0) {
    nextStacks.push(createFreshArmyStack(survivingArmy, true))
  }

  if (exhaustedArmy > 0) {
    nextStacks.push(createFreshArmyStack(exhaustedArmy, true))
  }

  return {
    updatedCity: syncCityArmy(city, nextStacks),
    survivingArmy,
  }
}

export function addIncomingArmy(city: CityState, size: number, actedThisTurn: boolean): CityState {
  if (size <= 0) {
    return city
  }

  return syncCityArmy(city, [...city.stacks, createFreshArmyStack(size, actedThisTurn)])
}
