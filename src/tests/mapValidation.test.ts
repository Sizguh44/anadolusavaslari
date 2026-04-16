/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { CITY_DEFINITIONS } from '../data/cityDefinitions'
import { matchFeatureToCityDefinition, normalizeMapCityName, normalizeProvinceCode } from '../data/mapMatching'
import { validateMapFeatureCollection } from '../data/mapValidation'

function createFeatureCollection(
  overrides: Partial<Record<string, { name?: unknown; number?: unknown }>> = {},
) {
  return {
    type: 'FeatureCollection' as const,
    features: CITY_DEFINITIONS.map((city) => ({
      type: 'Feature' as const,
      properties: {
        name: city.id === '03' ? 'Afyon' : city.name,
        number: Number(city.id),
        ...overrides[city.id],
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [0, 0] as [number, number],
      },
    })),
  }
}

describe('map matching', () => {
  test('matches by zero-padded plate code like 03', () => {
    const match = matchFeatureToCityDefinition({
      number: '03',
      name: 'Afyon',
    })

    expect(normalizeProvinceCode('03')).toBe('03')
    expect(match.cityId).toBe('03')
    expect(match.cityName).toBe('Afyonkarahisar')
    expect(match.nameAccepted).toBe(true)
  })

  test('matches by numeric code like 3', () => {
    const match = matchFeatureToCityDefinition({
      number: 3,
    })

    expect(normalizeProvinceCode(3)).toBe('03')
    expect(match.cityId).toBe('03')
    expect(match.matchedBy).toBe('code')
  })

  test('matches by normalized Turkish city name', () => {
    const match = matchFeatureToCityDefinition({
      name: 'İzmir',
    })

    expect(normalizeMapCityName('İzmir')).toBe('izmir')
    expect(match.cityId).toBe('35')
    expect(match.cityName).toBe('İzmir')
    expect(match.matchedBy).toBe('name')
  })

  test('mismatched invalid feature still fails validation', () => {
    const validation = validateMapFeatureCollection(
      createFeatureCollection({
        '03': {
          name: 'Bambaska',
        },
      }),
    )

    expect(validation.ok).toBe(false)
    expect(validation.issues[0]).toContain('03')
    expect(validation.issues[0]).toContain('kabul edilen adlar')
  })

  test('valid feature set passes validation', () => {
    const validation = validateMapFeatureCollection(createFeatureCollection())

    expect(validation.ok).toBe(true)
    expect(validation.issues).toEqual([])
    expect(validation.matchedCount).toBe(81)
    expect(validation.unmatchedCount).toBe(0)
  })

  test('bundled local GeoJSON asset passes validation', () => {
    const asset = JSON.parse(readFileSync(`${process.cwd()}/public/maps/tr-cities.geojson`, 'utf8'))
    const validation = validateMapFeatureCollection(asset)

    expect(validation.ok).toBe(true)
    expect(validation.issues).toEqual([])
  })
})
