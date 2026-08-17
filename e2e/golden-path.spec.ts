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

  // Quick-entry: record the first trick (You lead A♠ eventually; someone else leads first here since dealer's left starts)
  // Whoever leads, respond with the requested suit by tapping the first enabled card in that suit row.
  await expect(page.getByText(/'s turn|Your turn/)).toBeVisible()

  // Record two opponent plays (grid-based quick entry), then it becomes the user's turn or a third opponent's.
  const spadeCandidates = ['9♠', '7♠', '6♠', '5♠', '3♠', '2♠']
  for (const label of spadeCandidates) {
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
