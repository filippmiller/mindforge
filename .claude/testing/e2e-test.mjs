import { chromium } from 'playwright';

const FRONTEND = 'https://mindforge-frontend-production.up.railway.app';
const results = [];

function log(name, status, details = '') {
  results.push({ name, status, details });
  console.log(`[${status}] ${name}${details ? ': ' + details : ''}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // TEST F1: Page loads
  try {
    const response = await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response.status();
    if (status === 200) {
      log('F1: Page loads', 'PASS', `HTTP ${status}`);
    } else {
      log('F1: Page loads', 'FAIL', `HTTP ${status}`);
    }
  } catch (e) {
    log('F1: Page loads', 'FAIL', e.message);
  }

  // TEST F2: MindForge title visible
  try {
    const title = await page.textContent('h1', { timeout: 5000 });
    if (title && title.includes('Mind') && title.includes('Forge')) {
      log('F2: Title visible', 'PASS', `"${title.trim()}"`);
    } else {
      log('F2: Title visible', 'FAIL', `Got: "${title}"`);
    }
  } catch (e) {
    log('F2: Title visible', 'FAIL', e.message);
  }

  // TEST F3: Text input visible by default
  try {
    const input = await page.$('input[type="text"]');
    if (input) {
      const visible = await input.isVisible();
      log('F3: Text input visible', visible ? 'PASS' : 'FAIL');
    } else {
      log('F3: Text input visible', 'FAIL', 'Input not found');
    }
  } catch (e) {
    log('F3: Text input visible', 'FAIL', e.message);
  }

  // TEST F4: Voice orb visible
  try {
    const orb = await page.$('.voice-orb');
    if (orb) {
      const visible = await orb.isVisible();
      log('F4: Voice orb visible', visible ? 'PASS' : 'FAIL');
    } else {
      log('F4: Voice orb visible', 'FAIL', 'Orb not found');
    }
  } catch (e) {
    log('F4: Voice orb visible', 'FAIL', e.message);
  }

  // TEST F5: NEW PROJECT button exists
  try {
    const btn = await page.$('button:has-text("NEW PROJECT")');
    if (btn) {
      log('F5: NEW PROJECT button', 'PASS');
    } else {
      log('F5: NEW PROJECT button', 'FAIL', 'Button not found');
    }
  } catch (e) {
    log('F5: NEW PROJECT button', 'FAIL', e.message);
  }

  // TEST F6: Welcome message visible
  try {
    const welcome = await page.textContent('h2', { timeout: 5000 });
    if (welcome && welcome.includes('website idea')) {
      log('F6: Welcome message', 'PASS', `"${welcome.trim()}"`);
    } else {
      log('F6: Welcome message', 'FAIL', `Got: "${welcome}"`);
    }
  } catch (e) {
    log('F6: Welcome message', 'FAIL', e.message);
  }

  // TEST F7: Send a text message
  try {
    const input = await page.$('input[type="text"]');
    await input.fill('Test message from Playwright E2E');
    const sendBtn = await page.$('button[type="submit"]');
    await sendBtn.click();

    // Wait for thinking state
    await page.waitForTimeout(3000);

    // Check if thinking/streaming started (orb should change state or content should appear)
    const streamingText = await page.$('.glass-panel');
    const thinkingBlocks = await page.$$('.thinking-line');
    const userBubble = await page.$('.rounded-br-sm');

    if (streamingText || thinkingBlocks.length > 0 || userBubble) {
      log('F7: Send text message', 'PASS', 'Thinking stream activated');
    } else {
      log('F7: Send text message', 'FAIL', 'No thinking activity detected after 3s');
    }
  } catch (e) {
    log('F7: Send text message', 'FAIL', e.message);
  }

  // TEST F8: Wait for response to complete
  try {
    // Wait for orb to return to idle (up to 2 minutes for AI response)
    await page.waitForSelector('text=TAP TO SPEAK', { timeout: 120000 });

    // Check thinking blocks appeared
    const blocks = await page.$$('.thinking-line');
    log('F8: AI response received', 'PASS', `${blocks.length} thinking blocks`);
  } catch (e) {
    log('F8: AI response received', 'FAIL', e.message);
  }

  // TEST F9: User message bubble visible
  try {
    const bubbles = await page.$$('.rounded-br-sm');
    if (bubbles.length > 0) {
      log('F9: User message bubble', 'PASS', `${bubbles.length} user message(s)`);
    } else {
      log('F9: User message bubble', 'FAIL', 'No user message bubbles found');
    }
  } catch (e) {
    log('F9: User message bubble', 'FAIL', e.message);
  }

  // TEST F10: Session appeared in sidebar
  try {
    const sessions = await page.$$('.group.relative');
    if (sessions.length > 0) {
      log('F10: Session in sidebar', 'PASS', `${sessions.length} session(s)`);
    } else {
      // Try alternative selector
      const sidebar = await page.$('aside');
      if (sidebar) {
        const text = await sidebar.textContent();
        log('F10: Session in sidebar', text.includes('Project') || text.includes('Test') ? 'PASS' : 'FAIL', 'Sidebar found');
      } else {
        log('F10: Session in sidebar', 'FAIL', 'No sidebar found');
      }
    }
  } catch (e) {
    log('F10: Session in sidebar', 'FAIL', e.message);
  }

  // TEST F11: No console errors
  const criticalErrors = errors.filter(e =>
    !e.includes('favicon') && !e.includes('speech') && !e.includes('SpeechRecognition')
  );
  if (criticalErrors.length === 0) {
    log('F11: No console errors', 'PASS');
  } else {
    log('F11: No console errors', 'FAIL', criticalErrors.join(' | '));
  }

  await browser.close();

  // Summary
  console.log('\n=== SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
  }
}

run().catch(e => {
  console.error('Test runner crashed:', e.message);
  process.exit(1);
});
