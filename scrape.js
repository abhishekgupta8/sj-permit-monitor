const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Configuration
  const TARGET_RSN = '7906405';
  const TARGET_FOLDER_HREF = '2093387';

  console.log('[Auto-Checker] Starting navigation...');
  await page.goto('https://sjpermits.org/permits/general/scheduleinspection.asp', { waitUntil: 'networkidle' });

  // STEP 1: Enter RSN
  console.log('[Auto-Checker] Step 1: Entering RSN.');
  await page.fill('#cin', TARGET_RSN);
  await page.locator('input[value="Enter"]').click({ force: true });
  await page.waitForLoadState('networkidle');

  // STEP 2: Intermediate Continue
  console.log('[Auto-Checker] Step 2: Clicking intermediate Continue.');
  const continueBtn = page.locator('input[value="Continue >>"]');
  await continueBtn.click({ force: true });
  await page.waitForLoadState('networkidle');

  // STEP 3: Find file link
  console.log('[Auto-Checker] Step 3: Found the file link!');
  const fileLink = page.locator(`a[href*="${TARGET_FOLDER_HREF}"]`);
  await fileLink.click();
  await page.waitForLoadState('networkidle');

  // STEP 4: Scrape ALL dates
  console.log('[Auto-Checker] Step 4: Scraping all available dates...');
  await page.waitForSelector('#cmbscheduledDate');
  
  // Collect all options from the dropdown
  const allDates = await page.locator('#cmbscheduledDate option').evaluateAll(options => 
    options.map(option => option.textContent.trim())
  );

  // Filter out empty options or default placeholders (e.g., "Select")
  const dateList = allDates.filter(d => d.length > 0 && d !== 'Select');

  console.log(`[Auto-Checker] Found ${dateList.length} dates:`, dateList);

  // SEND NOTIFICATION
  if (process.env.PUSHOVER_TOKEN && process.env.PUSHOVER_USER) {
    console.log('[Auto-Checker] Sending notification...');
    
    // Create a readable list for the notification
    const messageBody = dateList.length > 0 
      ? `Available inspection dates:\n${dateList.join('\n')}` 
      : 'No available appointments found.';

    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: process.env.PUSHOVER_TOKEN,
        user: process.env.PUSHOVER_USER,
        message: messageBody,
        title: 'Permit Monitor Update'
      })
    });

    if (response.ok) {
      console.log('[Auto-Checker] Notification sent successfully!');
    } else {
      console.error('[Auto-Checker] Failed to send notification:', await response.text());
    }
  } else {
    console.warn('[Auto-Checker] Skipping notification: Secrets not found in environment.');
  }

  await browser.close();
})();
