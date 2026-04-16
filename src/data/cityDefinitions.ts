import { RULES } from './constants'
import { createFreshArmyStack } from '../engine/armyStacks'
import type { CityState, CitySpecialty, PlayerId } from '../engine/types'

interface CityDefinition {
  id: string
  name: string
  neighbors: string[]
  specialty: CitySpecialty
}

export interface CityTaxConflict {
  cityName: string
  values: number[]
  chosen: number
}

export const CITY_DEFINITIONS: CityDefinition[] = [
  { id: '01', name: 'Adana', neighbors: ['33', '51', '38', '46', '80', '31'], specialty: 'GOLD' },
  { id: '02', name: 'Adıyaman', neighbors: ['44', '46', '27', '63', '21'], specialty: 'IRON' },
  { id: '03', name: 'Afyonkarahisar', neighbors: ['43', '64', '20', '15', '32', '42', '26'], specialty: 'ENERGY' },
  { id: '04', name: 'Ağrı', neighbors: ['76', '36', '25', '49', '13', '65'], specialty: 'FOOD' },
  { id: '05', name: 'Amasya', neighbors: ['55', '60', '66', '19'], specialty: 'RESEARCH' },
  { id: '06', name: 'Ankara', neighbors: ['14', '18', '71', '40', '68', '42', '26'], specialty: 'POPULATION' },
  { id: '07', name: 'Antalya', neighbors: ['48', '15', '32', '42', '33', '70'], specialty: 'GOLD' },
  { id: '08', name: 'Artvin', neighbors: ['53', '25', '75'], specialty: 'IRON' },
  { id: '09', name: 'Aydın', neighbors: ['35', '45', '20', '48'], specialty: 'ENERGY' },
  { id: '10', name: 'Balikesir', neighbors: ['17', '16', '43', '45', '35'], specialty: 'FOOD' },
  { id: '11', name: 'Bilecik', neighbors: ['54', '14', '26', '43', '16'], specialty: 'RESEARCH' },
  { id: '12', name: 'Bingöl', neighbors: ['24', '25', '49', '21', '23', '62'], specialty: 'POPULATION' },
  { id: '13', name: 'Bitlis', neighbors: ['49', '04', '65', '56', '72'], specialty: 'GOLD' },
  { id: '14', name: 'Bolu', neighbors: ['81', '54', '11', '26', '06', '18', '67', '78'], specialty: 'IRON' },
  { id: '15', name: 'Burdur', neighbors: ['20', '03', '32', '07', '48'], specialty: 'ENERGY' },
  { id: '16', name: 'Bursa', neighbors: ['77', '41', '54', '11', '43', '10'], specialty: 'FOOD' },
  { id: '17', name: 'Çanakkale', neighbors: ['22', '59', '10'], specialty: 'RESEARCH' },
  { id: '18', name: 'Çankırı', neighbors: ['37', '19', '71', '06', '14', '78'], specialty: 'POPULATION' },
  { id: '19', name: 'Çorum', neighbors: ['55', '05', '66', '71', '18', '37', '57'], specialty: 'GOLD' },
  { id: '20', name: 'Denizli', neighbors: ['09', '45', '64', '03', '15', '48'], specialty: 'IRON' },
  { id: '21', name: 'Diyarbakır', neighbors: ['23', '12', '49', '72', '47', '63', '02', '44'], specialty: 'ENERGY' },
  { id: '22', name: 'Edirne', neighbors: ['39', '59', '17'], specialty: 'FOOD' },
  { id: '23', name: 'Elazığ', neighbors: ['62', '12', '21', '44', '24'], specialty: 'RESEARCH' },
  { id: '24', name: 'Erzincan', neighbors: ['28', '29', '69', '25', '12', '62', '44', '58', '23'], specialty: 'POPULATION' },
  { id: '25', name: 'Erzurum', neighbors: ['53', '08', '75', '36', '04', '12', '24', '69'], specialty: 'GOLD' },
  { id: '26', name: 'Eskişehir', neighbors: ['11', '14', '06', '42', '03', '43'], specialty: 'IRON' },
  { id: '27', name: 'Gaziantep', neighbors: ['46', '02', '63', '79', '31', '80'], specialty: 'ENERGY' },
  { id: '28', name: 'Giresun', neighbors: ['52', '60', '58', '24', '29', '61'], specialty: 'FOOD' },
  { id: '29', name: 'Gümüşhane', neighbors: ['61', '28', '24', '69'], specialty: 'RESEARCH' },
  { id: '30', name: 'Hakkari', neighbors: ['65', '73'], specialty: 'POPULATION' },
  { id: '31', name: 'Hatay', neighbors: ['01', '80', '27', '79'], specialty: 'GOLD' },
  { id: '32', name: 'Isparta', neighbors: ['03', '42', '07', '15'], specialty: 'IRON' },
  { id: '33', name: 'Mersin', neighbors: ['07', '42', '70', '01', '51'], specialty: 'ENERGY' },
  { id: '34', name: 'İstanbul', neighbors: ['59', '41', '39'], specialty: 'FOOD' },
  { id: '35', name: 'İzmir', neighbors: ['10', '45', '09'], specialty: 'RESEARCH' },
  { id: '36', name: 'Kars', neighbors: ['75', '04', '25', '76'], specialty: 'POPULATION' },
  { id: '37', name: 'Kastamonu', neighbors: ['74', '57', '19', '18', '78'], specialty: 'GOLD' },
  { id: '38', name: 'Kayseri', neighbors: ['58', '46', '01', '51', '50', '66'], specialty: 'IRON' },
  { id: '39', name: 'Kırklareli', neighbors: ['22', '59', '34'], specialty: 'ENERGY' },
  { id: '40', name: 'Kırşehir', neighbors: ['71', '66', '50', '68', '06'], specialty: 'FOOD' },
  { id: '41', name: 'Kocaeli', neighbors: ['34', '77', '16', '54'], specialty: 'RESEARCH' },
  { id: '42', name: 'Konya', neighbors: ['06', '68', '51', '33', '07', '32', '03', '26', '70'], specialty: 'POPULATION' },
  { id: '43', name: 'Kütahya', neighbors: ['16', '11', '26', '03', '64', '10'], specialty: 'GOLD' },
  { id: '44', name: 'Malatya', neighbors: ['58', '24', '23', '21', '02', '46'], specialty: 'IRON' },
  { id: '45', name: 'Manisa', neighbors: ['10', '43', '64', '20', '09', '35'], specialty: 'ENERGY' },
  { id: '46', name: 'Kahramanmaraş', neighbors: ['58', '44', '02', '27', '80', '01', '38'], specialty: 'FOOD' },
  { id: '47', name: 'Mardin', neighbors: ['63', '21', '72', '73'], specialty: 'RESEARCH' },
  { id: '48', name: 'Muğla', neighbors: ['09', '20', '07', '15'], specialty: 'POPULATION' },
  { id: '49', name: 'Muş', neighbors: ['25', '04', '13', '21', '12'], specialty: 'GOLD' },
  { id: '50', name: 'Nevşehir', neighbors: ['66', '38', '51', '68', '40'], specialty: 'IRON' },
  { id: '51', name: 'Niğde', neighbors: ['50', '38', '01', '33', '42', '68'], specialty: 'ENERGY' },
  { id: '52', name: 'Ordu', neighbors: ['55', '60', '28'], specialty: 'FOOD' },
  { id: '53', name: 'Rize', neighbors: ['61', '08', '25', '69'], specialty: 'RESEARCH' },
  { id: '54', name: 'Sakarya', neighbors: ['41', '81', '14', '11', '16'], specialty: 'POPULATION' },
  { id: '55', name: 'Samsun', neighbors: ['57', '19', '05', '60', '52'], specialty: 'GOLD' },
  { id: '56', name: 'Siirt', neighbors: ['13', '65', '73', '72'], specialty: 'IRON' },
  { id: '57', name: 'Sinop', neighbors: ['37', '55', '19'], specialty: 'ENERGY' },
  { id: '58', name: 'Sivas', neighbors: ['52', '28', '24', '44', '46', '38', '66', '60'], specialty: 'FOOD' },
  { id: '59', name: 'Tekirdağ', neighbors: ['39', '34', '17', '22'], specialty: 'RESEARCH' },
  { id: '60', name: 'Tokat', neighbors: ['55', '52', '28', '58', '66', '05'], specialty: 'POPULATION' },
  { id: '61', name: 'Trabzon', neighbors: ['28', '29', '69', '53'], specialty: 'GOLD' },
  { id: '62', name: 'Tunceli', neighbors: ['24', '12', '23'], specialty: 'IRON' },
  { id: '63', name: 'Şanlıurfa', neighbors: ['27', '02', '21', '47'], specialty: 'ENERGY' },
  { id: '64', name: 'Uşak', neighbors: ['43', '03', '20', '45'], specialty: 'FOOD' },
  { id: '65', name: 'Van', neighbors: ['04', '76', '13', '56', '73', '30'], specialty: 'RESEARCH' },
  { id: '66', name: 'Yozgat', neighbors: ['19', '05', '60', '58', '38', '50', '40', '71'], specialty: 'POPULATION' },
  { id: '67', name: 'Zonguldak', neighbors: ['74', '78', '14', '81'], specialty: 'GOLD' },
  { id: '68', name: 'Aksaray', neighbors: ['40', '50', '51', '42', '06'], specialty: 'IRON' },
  { id: '69', name: 'Bayburt', neighbors: ['61', '53', '25', '24', '29'], specialty: 'ENERGY' },
  { id: '70', name: 'Karaman', neighbors: ['42', '33', '07'], specialty: 'FOOD' },
  { id: '71', name: 'Kırıkkale', neighbors: ['18', '19', '66', '40', '06'], specialty: 'RESEARCH' },
  { id: '72', name: 'Batman', neighbors: ['21', '49', '13', '56', '47'], specialty: 'POPULATION' },
  { id: '73', name: 'Şırnak', neighbors: ['56', '65', '30', '47'], specialty: 'GOLD' },
  { id: '74', name: 'Bartin', neighbors: ['67', '78', '37'], specialty: 'IRON' },
  { id: '75', name: 'Ardahan', neighbors: ['08', '25', '36'], specialty: 'ENERGY' },
  { id: '76', name: 'Iğdır', neighbors: ['36', '04'], specialty: 'FOOD' },
  { id: '77', name: 'Yalova', neighbors: ['41', '16'], specialty: 'RESEARCH' },
  { id: '78', name: 'Karabük', neighbors: ['74', '37', '14', '67', '18'], specialty: 'POPULATION' },
  { id: '79', name: 'Kilis', neighbors: ['27', '31'], specialty: 'GOLD' },
  { id: '80', name: 'Osmaniye', neighbors: ['46', '27', '31', '01'], specialty: 'IRON' },
  { id: '81', name: 'Düzce', neighbors: ['54', '67', '14'], specialty: 'ENERGY' },
]

export const DEFAULT_CITY_BASE_TAX = 60

const ORDERED_CITY_TAX_GROUPS: Array<{ amount: number; cities: string[] }> = [
  {
    amount: 100,
    cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Kocaeli', 'Antalya', 'Tekirdag', 'Konya', 'Adana', 'Gaziantep'],
  },
  {
    amount: 90,
    cities: ['Mersin', 'Kayseri', 'Manisa', 'Balikesir', 'Sakarya', 'Denizli', 'Mugla', 'Eskisehir', 'Hatay', 'Aydin'],
  },
  {
    amount: 80,
    cities: ['Canakkale', 'Edirne', 'Afyonkarahisar', 'Kahramanmaras', 'Malatya', 'Samsun', 'Ordu', 'Trabzon', 'Zonguldak', 'Elazig'],
  },
  {
    amount: 70,
    cities: ['Sanliurfa', 'Diyarbakir', 'Kutahya', 'Isparta', 'Bolu', 'Yalova', 'Usak', 'Kirklareli', 'Karaman', 'Aksaray'],
  },
  {
    amount: 60,
    cities: ['Nigde', 'Nevsehir', 'Rize', 'Artvin', 'Giresun', 'Tokat', 'Corum', 'Yozgat', 'Kastamonu', 'Sinop'],
  },
  {
    amount: 50,
    cities: ['Amasya', 'Kirikkale', 'Bilecik', 'Bartin', 'Karabuk', 'Duzce', 'Kilis', 'Osmaniye', 'Adiyaman', 'Erzincan'],
  },
  {
    amount: 40,
    cities: ['Erzurum', 'Bayburt', 'Gumushane', 'Tunceli', 'Bingol', 'Mus', 'Bitlis', 'Van', 'Hakkari', 'Siirt'],
  },
  {
    amount: 30,
    cities: ['Sirnak', 'Batman', 'Mardin', 'Igdir', 'Agri', 'Kars', 'Ardahan', 'Sivas', 'Cankiri', 'Isparta', 'Burdur'],
  },
]

function normalizeCityName(name: string) {
  return name
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z]/g, '')
}

function buildCityTaxLookup() {
  const taxLookup = new Map<string, number>()
  const conflictTracker = new Map<string, CityTaxConflict>()

  for (const group of ORDERED_CITY_TAX_GROUPS) {
    for (const cityName of group.cities) {
      const key = normalizeCityName(cityName)
      const previousValue = taxLookup.get(key)

      if (typeof previousValue === 'number' && previousValue !== group.amount) {
        const conflict = conflictTracker.get(key)

        if (conflict) {
          if (!conflict.values.includes(group.amount)) {
            conflict.values.push(group.amount)
          }
          conflict.chosen = group.amount
        } else {
          conflictTracker.set(key, {
            cityName,
            values: [previousValue, group.amount],
            chosen: group.amount,
          })
        }
      }

      taxLookup.set(key, group.amount)
    }
  }

  return {
    taxLookup,
    conflicts: [...conflictTracker.values()].sort((left, right) => left.cityName.localeCompare(right.cityName, 'tr')),
  }
}

const { taxLookup: CITY_TAX_LOOKUP, conflicts: CITY_TAX_CONFLICTS_INTERNAL } = buildCityTaxLookup()

export const CITY_TAX_CONFLICTS = CITY_TAX_CONFLICTS_INTERNAL

export const CITY_TAX_DIAGNOSTICS = {
  conflicts: CITY_TAX_CONFLICTS,
  defaultTax: DEFAULT_CITY_BASE_TAX,
  defaultedCityNames: CITY_DEFINITIONS
    .filter((city) => !CITY_TAX_LOOKUP.has(normalizeCityName(city.name)))
    .map((city) => city.name)
    .sort((left, right) => left.localeCompare(right, 'tr')),
}

export function getCityBaseTaxByName(cityName: string): number {
  return CITY_TAX_LOOKUP.get(normalizeCityName(cityName)) ?? DEFAULT_CITY_BASE_TAX
}

const CAPITAL_RESET = {
  cpRemaining: RULES.capital.capturePoints,
  underSiegeBy: null,
} as const

function buildBidirectionalNeighbors(definition: CityDefinition, all: CityDefinition[]): string[] {
  const neighborSet = new Set(definition.neighbors)

  for (const candidate of all) {
    if (candidate.id !== definition.id && candidate.neighbors.includes(definition.id)) {
      neighborSet.add(candidate.id)
    }
  }

  return [...neighborSet].sort((left, right) => left.localeCompare(right))
}

export function createInitialCities(): Record<string, CityState> {
  return CITY_DEFINITIONS.reduce<Record<string, CityState>>((accumulator, definition) => {
    accumulator[definition.id] = {
      id: definition.id,
      name: definition.name,
      neighbors: buildBidirectionalNeighbors(definition, CITY_DEFINITIONS),
      owner: null,
      isCapital: false,
      army: 0,
      stacks: [],
      armyCap: RULES.city.normalArmyCap,
      fortLevel: 0,
      specialty: definition.specialty,
      baseTax: getCityBaseTaxByName(definition.name),
      baseFood: RULES.city.baseFood,
      basePopulation: RULES.city.basePopulation,
      supplyConnected: true,
      captureState: { ...CAPITAL_RESET },
      unrest: 0,
      sabotage: null,
      emergencySupport: null,
    }

    return accumulator
  }, {})
}

export function setCapitalState(city: CityState, owner: PlayerId): CityState {
  return {
    ...city,
    owner,
    isCapital: true,
    army: RULES.capital.startingArmy,
    stacks: [createFreshArmyStack(RULES.capital.startingArmy, false)],
    armyCap: RULES.city.capitalArmyCap,
    fortLevel: RULES.capital.startingFortLevel,
    captureState: {
      cpRemaining: RULES.capital.capturePoints,
      underSiegeBy: null,
    },
  }
}
