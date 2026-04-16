import http from 'node:http'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const STORAGE_KEY = 'anadolu-stratejisi-save-v6'
const HOST = '127.0.0.1'
const PORT = 4173
const BASE_URL = `http://${HOST}:${PORT}`

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

async function waitForServer(url, timeoutMs = 20_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const isReady = await new Promise((resolve) => {
      const request = http.get(url, (response) => {
        response.resume()
        resolve(response.statusCode === 200)
      })

      request.on('error', () => resolve(false))
      request.setTimeout(1_000, () => {
        request.destroy()
        resolve(false)
      })
    })

    if (isReady) {
      return
    }

    await delay(250)
  }

  throw new Error(`Preview server did not become ready at ${url}`)
}

async function expectSingleScreenLayout(page, label) {
  const metrics = await page.evaluate(() => {
    const root = document.documentElement
    return {
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
    }
  })

  if (metrics.scrollHeight > metrics.clientHeight + 4) {
    throw new Error(`${label}: page still overflows vertically.`)
  }

  if (metrics.bodyOverflowY !== 'hidden') {
    throw new Error(`${label}: body overflow should stay hidden on desktop gameplay.`)
  }
}

async function runBrowserFlow() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 920 } })

  function city(id) {
    return page.locator(`[data-city-id="${id}"]`)
  }

  function button(label) {
    return page.locator(`button:has-text("${label}")`).first()
  }

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.locator('text=Anadolu Savaşları').first().waitFor()
    await button('Yeni savaşı başlat').click()
    await button('Başkent Yap').waitFor()
    await expectSingleScreenLayout(page, 'Capital selection')

    await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey)

      if (!raw) {
        throw new Error('Saved game state not found after starting a new game.')
      }

      const state = JSON.parse(raw)
      const p1Tax = state.cities['06'].baseTax
      state.stage = 'PLAYING'
      state.currentPlayer = 'P1'
      state.capitalSelectionPlayer = 'P2'
      state.turn = 1
      state.selectedCityId = null
      state.actionMode = null
      state.actionSourceCityId = null
      state.actionTargetCityId = null
      state.actionAmount = 0
      state.conquestUsed = false
      state.statusMessage = 'Başkent seçimi tamamlandı. Mavi oyuncu ilk turunda vergi toplayıp komuta başlayabilir.'
      state.winner = null
      state.victorySummary = null
      state.events = []
      state.nextEventId = 1
      state.players.P1.treasury = 2000 + p1Tax
      state.players.P1.lastCollectedTax = p1Tax
      state.players.P2.treasury = 2000
      state.players.P2.lastCollectedTax = 0
      state.cities['06'] = { ...state.cities['06'], owner: 'P1', isCapital: true, army: 6, readyArmy: 6, fortLevel: 1 }
      state.cities['34'] = { ...state.cities['34'], owner: 'P2', isCapital: true, army: 6, readyArmy: 0, fortLevel: 1 }
      window.localStorage.setItem(storageKey, JSON.stringify(state))
    }, STORAGE_KEY)

    await page.reload({ waitUntil: 'networkidle' })
    await button('Turu Bitir').waitFor()
    await expectSingleScreenLayout(page, 'Main gameplay board')

    const map = page.locator('svg.turkey-map')
    const initialViewBox = await map.getAttribute('viewBox')
    const mapBox = await map.boundingBox()

    if (!mapBox) {
      throw new Error('Map was not rendered.')
    }

    await page.evaluate(async () => {
      const svg = document.querySelector('svg.turkey-map')

      if (!(svg instanceof SVGSVGElement)) {
        throw new Error('Map svg not found.')
      }

      const rect = svg.getBoundingClientRect()
      svg.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          button: 0,
          clientX: rect.left + 24,
          clientY: rect.top + 24,
        }),
      )
      svg.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          buttons: 1,
          clientX: rect.left + 180,
          clientY: rect.top + 96,
        }),
      )
      svg.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
          button: 0,
          clientX: rect.left + 180,
          clientY: rect.top + 96,
        }),
      )

      await new Promise((resolve) => requestAnimationFrame(() => resolve()))
    })

    const draggedViewBox = await map.getAttribute('viewBox')
    if (!draggedViewBox || draggedViewBox === initialViewBox) {
      throw new Error('Map drag did not update the viewport.')
    }

    await map.hover()
    await page.mouse.wheel(0, -300)
    await page.waitForTimeout(120)
    const wheelViewBox = await map.getAttribute('viewBox')
    if (!wheelViewBox || wheelViewBox !== draggedViewBox) {
      throw new Error('Wheel zoom should stay disabled.')
    }

    await map.dblclick()
    await page.waitForTimeout(150)
    const zoomedViewBox = await map.getAttribute('viewBox')
    if (!zoomedViewBox || zoomedViewBox === draggedViewBox) {
      throw new Error('Double click zoom did not update the viewport.')
    }

    await button('Günlük').click()
    await page.locator('text=Son kararlar').first().waitFor()
    await button('Kapat').click()
    await expectSingleScreenLayout(page, 'Gameplay board after log modal')

    await city('06').click()
    await button('İlhak').click()
    await city('71').click()
    await button('Onayla').click()
    await page.waitForFunction(
      ({ storageKey }) => {
        const raw = window.localStorage.getItem(storageKey)
        if (!raw) {
          return false
        }

        const state = JSON.parse(raw)
        return state.cities['71'].owner === 'P1' && state.cities['71'].army === 1 && state.conquestUsed === true
      },
      { storageKey: STORAGE_KEY },
    )

    await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) {
        throw new Error('Saved game state not found.')
      }

      const state = JSON.parse(raw)
      state.stage = 'PLAYING'
      state.currentPlayer = 'P1'
      state.turn = 3
      state.selectedCityId = null
      state.actionMode = null
      state.actionSourceCityId = null
      state.actionTargetCityId = null
      state.actionAmount = 0
      state.conquestUsed = false
      state.statusMessage = 'Mavi oyuncunun saldırı turu.'
      state.winner = null
      state.victorySummary = null
      state.events = []
      state.nextEventId = 1
      state.cities['41'] = { ...state.cities['41'], owner: 'P1', army: 8, readyArmy: 8, fortLevel: 0, isCapital: false }
      state.cities['16'] = { ...state.cities['16'], owner: 'P2', army: 3, readyArmy: 0, fortLevel: 1, isCapital: false }
      window.localStorage.setItem(storageKey, JSON.stringify(state))
    }, STORAGE_KEY)

    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('text=Saldırı').first().waitFor()
    await expectSingleScreenLayout(page, 'Attack scenario')

    await city('41').click()
    await button('Saldırı').click()
    await city('16').click()
    await button('Onayla').click()
    await page.waitForFunction(
      ({ storageKey }) => {
        const raw = window.localStorage.getItem(storageKey)
        if (!raw) {
          return false
        }

        const state = JSON.parse(raw)
        return state.cities['16'].owner === 'P1' && state.cities['16'].army === 5
      },
      { storageKey: STORAGE_KEY },
    )

    const storedAttackState = await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : null
    }, STORAGE_KEY)

    if (!storedAttackState) {
      throw new Error('Saved game state missing after attack scenario.')
    }

    if (storedAttackState.cities['16'].owner !== 'P1' || storedAttackState.cities['16'].army !== 5) {
      throw new Error('Attack capture did not persist expected Bursa ownership and army.')
    }

    console.log(
      'Browser smoke passed: capital selection, annex flow, drag, wheel lock, double-click zoom, and deterministic attack capture all worked.',
    )
  } finally {
    await browser.close()
  }
}

const previewServer = spawn(getNpmCommand(), ['run', 'preview', '--', '--host', HOST, '--port', String(PORT)], {
  cwd: process.cwd(),
  stdio: 'pipe',
})

previewServer.stdout.on('data', (chunk) => {
  process.stdout.write(chunk)
})

previewServer.stderr.on('data', (chunk) => {
  process.stderr.write(chunk)
})

try {
  await waitForServer(BASE_URL)
  await runBrowserFlow()
} finally {
  previewServer.kill('SIGTERM')
  await delay(300)

  if (!previewServer.killed) {
    previewServer.kill('SIGKILL')
  }
}
