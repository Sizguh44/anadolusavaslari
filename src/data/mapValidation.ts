import type { FeatureCollection, Geometry } from 'geojson'
import { CITY_DEFINITIONS } from './cityDefinitions'
import {
  getApprovedCityNameKeys,
  getFeatureDisplayName,
  matchFeatureToCityDefinition,
  type MapFeatureProperties,
} from './mapMatching'

export interface MapValidationResult {
  ok: boolean
  issues: string[]
  matchedCount: number
  unmatchedCount: number
}

function summarizeFeature(properties: MapFeatureProperties) {
  const match = matchFeatureToCityDefinition(properties)
  const codeSource = match.codeSource
    ? `${match.codeSource.property}=${JSON.stringify(match.codeSource.rawValue)}`
    : 'code=yok'
  const nameSource = match.nameSource
    ? `${match.nameSource.property}=${JSON.stringify(match.nameSource.rawValue)}`
    : 'name=yok'

  return `${codeSource}, ${nameSource}`
}

export function validateCityDefinitionsConsistency(): MapValidationResult {
  const issues: string[] = []
  const knownIds = new Set(CITY_DEFINITIONS.map((city) => city.id))

  for (const city of CITY_DEFINITIONS) {
    for (const neighborId of city.neighbors) {
      if (!knownIds.has(neighborId)) {
        issues.push(`${city.id} sehri bilinmeyen komsu id kullaniyor: ${neighborId}`)
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    matchedCount: CITY_DEFINITIONS.length,
    unmatchedCount: 0,
  }
}

export function validateMapFeatureCollection(
  featureCollection: FeatureCollection<Geometry, MapFeatureProperties>,
): MapValidationResult {
  const issues: string[] = []
  const matchedCityIds = new Set<string>()
  let unmatchedCount = 0

  for (const feature of featureCollection.features) {
    const properties = (feature.properties ?? {}) as MapFeatureProperties
    const match = matchFeatureToCityDefinition(properties)

    if (!match.cityId) {
      unmatchedCount += 1
      issues.push(
        `Harita feature eslesmedi: ${summarizeFeature(properties)}. Gorunen ad: ${getFeatureDisplayName(
          properties,
        )}.`,
      )
      continue
    }

    const displayName = getFeatureDisplayName(properties, match.cityId)

    if (matchedCityIds.has(match.cityId)) {
      issues.push(
        `Harita assetinde ayni sehir birden fazla kez eslesiyor: ${match.cityId} ${match.cityName}. Feature: ${summarizeFeature(
          properties,
        )}.`,
      )
      continue
    }

    matchedCityIds.add(match.cityId)

    if (match.hasNameConflict) {
      issues.push(
        `Harita feature cakisiyor: code ${match.codeMatch?.normalizedValue} ile ${match.cityName} bulundu ama name ${JSON.stringify(
          match.nameMatch?.rawValue,
        )} baska bir sehri isaret ediyor. Feature: ${summarizeFeature(properties)}.`,
      )
      continue
    }

    if (match.nameSource && !match.nameAccepted) {
      issues.push(
        `Harita ve cityDefinitions isimleri uyusmuyor: ${match.cityId}. Okunan ${match.nameSource.property}=${JSON.stringify(
          match.nameSource.rawValue,
        )}, gorunen ad=${displayName}, kabul edilen adlar=${getApprovedCityNameKeys(match.cityId).join(', ')}.`,
      )
    }
  }

  for (const city of CITY_DEFINITIONS) {
    if (!matchedCityIds.has(city.id)) {
      issues.push(`Harita assetinde eksik sehir var: ${city.id} ${city.name}`)
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    matchedCount: matchedCityIds.size,
    unmatchedCount,
  }
}
