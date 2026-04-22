// 81 Türkiye iliyle başkent / komşuluk / vergi temeli.
// Bu dosya veri katmanıdır; runtime state üretmez. Oyun motoru yalnızca
// CITY_DEFINITIONS ve getCityBaseTaxByName() sözleşmesini tüketir.

export interface CityDefinition {
  id: string
  name: string
  neighbors: string[]
}

export interface CityTaxConflict {
  cityName: string
  values: number[]
  chosen: number
}

export const CITY_DEFINITIONS: CityDefinition[] = [
  { id: '01', name: 'Adana', neighbors: ['33', '51', '38', '46', '80', '31'] },
  { id: '02', name: 'Adıyaman', neighbors: ['44', '46', '27', '63', '21'] },
  { id: '03', name: 'Afyonkarahisar', neighbors: ['43', '64', '20', '15', '32', '42', '26'] },
  { id: '04', name: 'Ağrı', neighbors: ['76', '36', '25', '49', '13', '65'] },
  { id: '05', name: 'Amasya', neighbors: ['55', '60', '66', '19'] },
  { id: '06', name: 'Ankara', neighbors: ['14', '18', '71', '40', '68', '42', '26'] },
  { id: '07', name: 'Antalya', neighbors: ['48', '15', '32', '42', '33', '70'] },
  { id: '08', name: 'Artvin', neighbors: ['53', '25', '75'] },
  { id: '09', name: 'Aydın', neighbors: ['35', '45', '20', '48'] },
  { id: '10', name: 'Balikesir', neighbors: ['17', '16', '43', '45', '35'] },
  { id: '11', name: 'Bilecik', neighbors: ['54', '14', '26', '43', '16'] },
  { id: '12', name: 'Bingöl', neighbors: ['24', '25', '49', '21', '23', '62'] },
  { id: '13', name: 'Bitlis', neighbors: ['49', '04', '65', '56', '72'] },
  { id: '14', name: 'Bolu', neighbors: ['81', '54', '11', '26', '06', '18', '67', '78'] },
  { id: '15', name: 'Burdur', neighbors: ['20', '03', '32', '07', '48'] },
  { id: '16', name: 'Bursa', neighbors: ['77', '41', '54', '11', '43', '10'] },
  { id: '17', name: 'Çanakkale', neighbors: ['22', '59', '10'] },
  { id: '18', name: 'Çankırı', neighbors: ['37', '19', '71', '06', '14', '78'] },
  { id: '19', name: 'Çorum', neighbors: ['55', '05', '66', '71', '18', '37', '57'] },
  { id: '20', name: 'Denizli', neighbors: ['09', '45', '64', '03', '15', '48'] },
  { id: '21', name: 'Diyarbakır', neighbors: ['23', '12', '49', '72', '47', '63', '02', '44'] },
  { id: '22', name: 'Edirne', neighbors: ['39', '59', '17'] },
  { id: '23', name: 'Elazığ', neighbors: ['62', '12', '21', '44', '24'] },
  { id: '24', name: 'Erzincan', neighbors: ['28', '29', '69', '25', '12', '62', '44', '58', '23'] },
  { id: '25', name: 'Erzurum', neighbors: ['53', '08', '75', '36', '04', '12', '24', '69'] },
  { id: '26', name: 'Eskişehir', neighbors: ['11', '14', '06', '42', '03', '43'] },
  { id: '27', name: 'Gaziantep', neighbors: ['46', '02', '63', '79', '31', '80'] },
  { id: '28', name: 'Giresun', neighbors: ['52', '60', '58', '24', '29', '61'] },
  { id: '29', name: 'Gümüşhane', neighbors: ['61', '28', '24', '69'] },
  { id: '30', name: 'Hakkari', neighbors: ['65', '73'] },
  { id: '31', name: 'Hatay', neighbors: ['01', '80', '27', '79'] },
  { id: '32', name: 'Isparta', neighbors: ['03', '42', '07', '15'] },
  { id: '33', name: 'Mersin', neighbors: ['07', '42', '70', '01', '51'] },
  { id: '34', name: 'İstanbul', neighbors: ['59', '41', '39'] },
  { id: '35', name: 'İzmir', neighbors: ['10', '45', '09'] },
  { id: '36', name: 'Kars', neighbors: ['75', '04', '25', '76'] },
  { id: '37', name: 'Kastamonu', neighbors: ['74', '57', '19', '18', '78'] },
  { id: '38', name: 'Kayseri', neighbors: ['58', '46', '01', '51', '50', '66'] },
  { id: '39', name: 'Kırklareli', neighbors: ['22', '59', '34'] },
  { id: '40', name: 'Kırşehir', neighbors: ['71', '66', '50', '68', '06'] },
  { id: '41', name: 'Kocaeli', neighbors: ['34', '77', '16', '54'] },
  { id: '42', name: 'Konya', neighbors: ['06', '68', '51', '33', '07', '32', '03', '26', '70'] },
  { id: '43', name: 'Kütahya', neighbors: ['16', '11', '26', '03', '64', '10'] },
  { id: '44', name: 'Malatya', neighbors: ['58', '24', '23', '21', '02', '46'] },
  { id: '45', name: 'Manisa', neighbors: ['10', '43', '64', '20', '09', '35'] },
  { id: '46', name: 'Kahramanmaraş', neighbors: ['58', '44', '02', '27', '80', '01', '38'] },
  { id: '47', name: 'Mardin', neighbors: ['63', '21', '72', '73'] },
  { id: '48', name: 'Muğla', neighbors: ['09', '20', '07', '15'] },
  { id: '49', name: 'Muş', neighbors: ['25', '04', '13', '21', '12'] },
  { id: '50', name: 'Nevşehir', neighbors: ['66', '38', '51', '68', '40'] },
  { id: '51', name: 'Niğde', neighbors: ['50', '38', '01', '33', '42', '68'] },
  { id: '52', name: 'Ordu', neighbors: ['55', '60', '28'] },
  { id: '53', name: 'Rize', neighbors: ['61', '08', '25', '69'] },
  { id: '54', name: 'Sakarya', neighbors: ['41', '81', '14', '11', '16'] },
  { id: '55', name: 'Samsun', neighbors: ['57', '19', '05', '60', '52'] },
  { id: '56', name: 'Siirt', neighbors: ['13', '65', '73', '72'] },
  { id: '57', name: 'Sinop', neighbors: ['37', '55', '19'] },
  { id: '58', name: 'Sivas', neighbors: ['52', '28', '24', '44', '46', '38', '66', '60'] },
  { id: '59', name: 'Tekirdağ', neighbors: ['39', '34', '17', '22'] },
  { id: '60', name: 'Tokat', neighbors: ['55', '52', '28', '58', '66', '05'] },
  { id: '61', name: 'Trabzon', neighbors: ['28', '29', '69', '53'] },
  { id: '62', name: 'Tunceli', neighbors: ['24', '12', '23'] },
  { id: '63', name: 'Şanlıurfa', neighbors: ['27', '02', '21', '47'] },
  { id: '64', name: 'Uşak', neighbors: ['43', '03', '20', '45'] },
  { id: '65', name: 'Van', neighbors: ['04', '76', '13', '56', '73', '30'] },
  { id: '66', name: 'Yozgat', neighbors: ['19', '05', '60', '58', '38', '50', '40', '71'] },
  { id: '67', name: 'Zonguldak', neighbors: ['74', '78', '14', '81'] },
  { id: '68', name: 'Aksaray', neighbors: ['40', '50', '51', '42', '06'] },
  { id: '69', name: 'Bayburt', neighbors: ['61', '53', '25', '24', '29'] },
  { id: '70', name: 'Karaman', neighbors: ['42', '33', '07'] },
  { id: '71', name: 'Kırıkkale', neighbors: ['18', '19', '66', '40', '06'] },
  { id: '72', name: 'Batman', neighbors: ['21', '49', '13', '56', '47'] },
  { id: '73', name: 'Şırnak', neighbors: ['56', '65', '30', '47'] },
  { id: '74', name: 'Bartin', neighbors: ['67', '78', '37'] },
  { id: '75', name: 'Ardahan', neighbors: ['08', '25', '36'] },
  { id: '76', name: 'Iğdır', neighbors: ['36', '04'] },
  { id: '77', name: 'Yalova', neighbors: ['41', '16'] },
  { id: '78', name: 'Karabük', neighbors: ['74', '37', '14', '67', '18'] },
  { id: '79', name: 'Kilis', neighbors: ['27', '31'] },
  { id: '80', name: 'Osmaniye', neighbors: ['46', '27', '31', '01'] },
  { id: '81', name: 'Düzce', neighbors: ['54', '67', '14'] },
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
