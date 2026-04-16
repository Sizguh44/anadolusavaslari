import { CITY_DEFINITIONS } from './cityDefinitions'

export type MapFeatureProperties = Record<string, unknown>

export interface FeatureIdentifierSource {
  property: string
  rawValue: unknown
  normalizedValue: string | null
}

export interface FeatureIdentifierMatch {
  property: string
  rawValue: unknown
  normalizedValue: string
  cityId: string
}

export interface MapFeatureCityMatch {
  cityId: string | null
  cityName: string | null
  matchedBy: 'code' | 'name' | 'code+name' | 'unmatched'
  codeSource: FeatureIdentifierSource | null
  nameSource: FeatureIdentifierSource | null
  codeMatch: FeatureIdentifierMatch | null
  nameMatch: FeatureIdentifierMatch | null
  nameAccepted: boolean
  hasNameConflict: boolean
}

const FEATURE_CODE_KEYS = [
  'number',
  'plate',
  'plate_no',
  'plateNo',
  'plaka',
  'province_code',
  'provinceCode',
  'city_code',
  'cityCode',
  'id',
] as const

const FEATURE_NAME_KEYS = [
  'name',
  'NAME_1',
  'name_1',
  'province',
  'province_name',
  'provinceName',
  'city',
  'city_name',
  'cityName',
  'il',
  'il_adi',
  'ilAdi',
] as const

const CITY_NAME_ALIASES: Record<string, string> = {
  afyon: '03',
  icel: '33',
  izmit: '41',
  adapazari: '54',
  antakya: '31',
  kmaras: '46',
  urfa: '63',
}

const knownCityIds = new Set(CITY_DEFINITIONS.map((city) => city.id))
const cityById = new Map(CITY_DEFINITIONS.map((city) => [city.id, city]))
const cityByNormalizedName = new Map(
  CITY_DEFINITIONS.map((city) => [normalizeMapCityName(city.name) ?? city.name, city]),
)
const approvedNameKeysByCityId = buildApprovedNameKeysByCity()

function buildApprovedNameKeysByCity() {
  const approved = new Map<string, Set<string>>()

  for (const city of CITY_DEFINITIONS) {
    approved.set(city.id, new Set([normalizeMapCityName(city.name) ?? city.name]))
  }

  for (const [alias, cityId] of Object.entries(CITY_NAME_ALIASES)) {
    approved.get(cityId)?.add(alias)
  }

  return approved
}

export function normalizeProvinceCode(value: unknown): string | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    if (value < 1 || value > 81) {
      return null
    }

    return String(value).padStart(2, '0')
  }

  if (typeof value !== 'string') {
    return null
  }

  const digitsOnly = value.trim()

  if (!/^\d{1,2}$/.test(digitsOnly)) {
    return null
  }

  const numericCode = Number(digitsOnly)

  if (!Number.isInteger(numericCode) || numericCode < 1 || numericCode > 81) {
    return null
  }

  return String(numericCode).padStart(2, '0')
}

export function normalizeMapCityName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/ı/g, 'i')
    .replace(/['’`"]/g, '')
    .replace(/[^a-z0-9]/g, '')

  return normalized.length > 0 ? normalized : null
}

function getPropertyCandidates<T extends readonly string[]>(
  properties: MapFeatureProperties,
  keys: T,
  normalizer: (value: unknown) => string | null,
): FeatureIdentifierSource[] {
  const candidates: FeatureIdentifierSource[] = []

  for (const key of keys) {
    if (!(key in properties)) {
      continue
    }

    candidates.push({
      property: key,
      rawValue: properties[key],
      normalizedValue: normalizer(properties[key]),
    })
  }

  return candidates
}

function findFirstPropertySource<T extends readonly string[]>(
  properties: MapFeatureProperties,
  keys: T,
  normalizer: (value: unknown) => string | null,
): FeatureIdentifierSource | null {
  const candidates = getPropertyCandidates(properties, keys, normalizer)

  return candidates[0] ?? null
}

function findCodeMatch(codeSource: FeatureIdentifierSource | null): FeatureIdentifierMatch | null {
  if (!codeSource?.normalizedValue || !knownCityIds.has(codeSource.normalizedValue)) {
    return null
  }

  return {
    property: codeSource.property,
    rawValue: codeSource.rawValue,
    normalizedValue: codeSource.normalizedValue,
    cityId: codeSource.normalizedValue,
  }
}

function findNameMatch(nameSource: FeatureIdentifierSource | null): FeatureIdentifierMatch | null {
  if (!nameSource?.normalizedValue) {
    return null
  }

  const aliasedCityId = CITY_NAME_ALIASES[nameSource.normalizedValue]
  if (aliasedCityId) {
    return {
      property: nameSource.property,
      rawValue: nameSource.rawValue,
      normalizedValue: nameSource.normalizedValue,
      cityId: aliasedCityId,
    }
  }

  const city = cityByNormalizedName.get(nameSource.normalizedValue)
  if (!city) {
    return null
  }

  return {
    property: nameSource.property,
    rawValue: nameSource.rawValue,
    normalizedValue: nameSource.normalizedValue,
    cityId: city.id,
  }
}

export function getFeatureDisplayName(
  properties: MapFeatureProperties,
  fallbackCityId: string | null = null,
): string {
  const preferredName = getPropertyCandidates(properties, FEATURE_NAME_KEYS, normalizeMapCityName).find(
    (candidate) => typeof candidate.rawValue === 'string' && candidate.rawValue.trim().length > 0,
  )

  if (preferredName && typeof preferredName.rawValue === 'string') {
    return preferredName.rawValue.trim()
  }

  if (fallbackCityId) {
    return cityById.get(fallbackCityId)?.name ?? fallbackCityId
  }

  return 'Bilinmeyen Şehir'
}

export function matchFeatureToCityDefinition(properties: MapFeatureProperties): MapFeatureCityMatch {
  const codeSource = findFirstPropertySource(properties, FEATURE_CODE_KEYS, normalizeProvinceCode)
  const nameSource = findFirstPropertySource(properties, FEATURE_NAME_KEYS, normalizeMapCityName)
  const codeMatch = findCodeMatch(codeSource)
  const nameMatch = findNameMatch(nameSource)
  const codeCityId = codeMatch?.cityId ?? null
  const nameCityId = nameMatch?.cityId ?? null
  const cityId = codeCityId ?? nameCityId
  const city = cityId ? cityById.get(cityId) ?? null : null
  const hasNameConflict = Boolean(codeCityId && nameCityId && codeCityId !== nameCityId)
  const nameAccepted =
    city && nameSource?.normalizedValue
      ? approvedNameKeysByCityId.get(city.id)?.has(nameSource.normalizedValue) ?? false
      : Boolean(city)

  return {
    cityId: city?.id ?? null,
    cityName: city?.name ?? null,
    matchedBy:
      codeCityId && nameCityId && codeCityId === nameCityId
        ? 'code+name'
        : codeCityId
          ? 'code'
          : nameCityId
            ? 'name'
            : 'unmatched',
    codeSource,
    nameSource,
    codeMatch,
    nameMatch,
    nameAccepted,
    hasNameConflict,
  }
}

export function getApprovedCityNameKeys(cityId: string): string[] {
  return [...(approvedNameKeysByCityId.get(cityId) ?? new Set<string>())].sort()
}
