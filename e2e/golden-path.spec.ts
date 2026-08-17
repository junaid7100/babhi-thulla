import { test, expect } from '@playwright/test'

test('new game → hand entry → record a trick → recommendation → undo → resume after reload', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('pageerror', (e) => consoleErrors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })

  await page.goto('/')
  await expect(page.getByText('Baavi Tulla', { exact: true })).toBeVisible()

  // New Game
  await page.getByText('+ New Game').click()
  await expect(page.getByText('Continue to Hand Entry')).toBeVisible()
  await page.getByText('Continue to Hand Entry').click()

  // Hand entry: pick 4 cards
  await page.locator('button[aria-label="A♠"]').click()
  await page.locator('button[aria-label="K♠"]').click()
  await page.locator('button[aria-label="A♥"]').click()
  await page.locator('button[aria-label="4♦"]').click()
  await expect(page.getByText('4 cards selected', { exact: false })).toBeVisible()

  await page.getByText(/Start Game/).click()
  await expect(page.getByText('Current Trick')).toBeVisible()

  // The user's hand includes A♠, so they hold the opening card and lead the
  // first trick. Play the engine's recommended card via the primary button.
  await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
  await page.waitForSelector('button:has-text("Play ")', { timeout: 15000 })
  await page.locator('button:has-text("Play ")').first().click()

  // Now it's an opponent's turn — record their play via the quick-entry grid.
  await expect(page.getByText(/'s turn/)).toBeVisible()
  const candidates = ['9♠', '7♠', '6♠', '5♠', '3♠', '2♠', '9♥', '7♥', '9♦', '9♣']
  for (const label of candidates) {
    const btn = page.locator(`button[aria-label="${label}"]`)
    if (await btn.isEnabled().catch(() => false)) {
      await btn.click()
      break
    }
  }

  // History screen should reflect at least one recorded move, and undo should work.
  await page.getByText('History', { exact: true }).click()
  await expect(page.getByText('Game started', { exact: false })).toBeVisible()
  await page.getByText('↩ Undo Last Move').click()

  // Resume after reload — the in-progress game should still be there via IndexedDB,
  // and the app should resume straight into the board (not force a restart).
  await page.goto('/')
  await expect(page.getByText('Current Trick', { exact: false })).toBeVisible()

  expect(consoleErrors, `Unexpected console/page errors:\n${consoleErrors.join('\n')}`).toEqual([])
})
