# Playwright Testing Guide for GreenShoe

## Overview

Playwright is a powerful end-to-end testing framework that lets you test your web application in real browsers. This guide shows you all the ways to run and debug tests.

## Quick Reference

```bash
# Run all tests (headless)
npx playwright test

# Run with UI (RECOMMENDED for development)
npx playwright test --ui

# Run with visible browser
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e/auth.spec.js

# Run tests matching a pattern
npx playwright test auth

# Run in debug mode
npx playwright test --debug

# Run a single test by line number
npx playwright test tests/e2e/auth.spec.js:19

# View last test report
npx playwright show-report
```

## Installation

### First Time Setup
```bash
# Install Playwright browsers (Chrome, Firefox, Safari)
npx playwright install

# Or install just Chromium
npx playwright install chromium
```

## Running Tests

### 1. UI Mode (BEST for Development) ⭐

**Most powerful and recommended for development!**

```bash
npm run test:e2e:ui

# Or directly:
npx playwright test --ui
```

**Features:**
- 📊 Visual test runner with tree view
- ⏯️ Run tests one-by-one or in batches
- 🔍 Live DOM inspector
- 📷 Screenshot comparison
- ⏱️ Time travel debugging (step through each action)
- 🎬 Watch mode (auto-reruns on file changes)
- 🐛 Pick locators interactively

**When to use:** During development, debugging failing tests, exploring the app

---

### 2. Headed Mode (See the Browser)

```bash
npm run test:e2e:headed

# Or directly:
npx playwright test --headed
```

**Features:**
- See the browser window as tests run
- Watch the automation happen in real-time
- Useful for understanding what the test is doing

**When to use:** When you want to see the browser but don't need debugging features

---

### 3. Headless Mode (Fast, No UI)

```bash
npm run test:e2e

# Or directly:
npx playwright test
```

**Features:**
- Fastest test execution
- No browser window (runs in background)
- Used in CI/CD pipelines
- Generates HTML report at the end

**When to use:** Running full test suite, CI/CD, quick verification

---

### 4. Debug Mode (Step Through Tests)

```bash
npx playwright test --debug

# Debug specific test
npx playwright test tests/e2e/auth.spec.js:19 --debug
```

**Features:**
- Opens Playwright Inspector
- Step through each action
- Pause on failures
- Record test actions
- Pick locators interactively

**When to use:** Debugging a specific failing test, writing new tests

---

## Running Specific Tests

### By File
```bash
# Run single file
npx playwright test tests/e2e/auth.spec.js

# Run multiple files
npx playwright test tests/e2e/auth.spec.js tests/e2e/rbac.spec.js
```

### By Test Name (grep)
```bash
# Run tests with "login" in the name
npx playwright test -g "login"

# Run all authentication tests
npx playwright test -g "User Authentication"

# Run tests with specific acceptance criteria
npx playwright test -g "A15"
```

### By Line Number
```bash
# Run the test at line 19
npx playwright test tests/e2e/auth.spec.js:19
```

### By Project (Browser)
```bash
# Run only on Chromium
npx playwright test --project=chromium

# Run on all browsers
npx playwright test --project=chromium --project=firefox --project=webkit
```

---

## Test Reports

### HTML Report (Auto-opens on failure)

```bash
# View last report
npm run test:e2e:report

# Or directly:
npx playwright show-report
```

**Features:**
- Visual test results with screenshots
- Video recordings of failed tests
- Traces for debugging
- Filter by test status (passed/failed)
- Search functionality

### List Reporter (Terminal)

```bash
npx playwright test --reporter=list
```

Shows real-time progress in terminal.

### JSON Reporter

```bash
npx playwright test --reporter=json
```

Outputs `results.json` for programmatic analysis.

---

## Debugging Strategies

### 1. Use `page.pause()` in Tests

Add `await page.pause();` to stop execution at any point:

```javascript
test('my test', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // Execution stops here - opens inspector
  await page.click('button');
});
```

### 2. Use Playwright Inspector

```bash
npx playwright test --debug
```

Then use:
- **Step over** - Execute next action
- **Resume** - Continue until next pause/breakpoint
- **Pick locator** - Click elements to generate selectors

### 3. Screenshots and Videos

Failed tests automatically capture:
- **Screenshots** - In `test-results/` folder
- **Videos** - In `test-results/` folder
- **Traces** - Full timeline of actions

### 4. View Trace Files

```bash
npx playwright show-trace test-results/trace.zip
```

Shows:
- Timeline of all actions
- Network requests
- Console logs
- DOM snapshots at each step

---

## Writing Tests - Best Practices

### Use User-Facing Locators

```javascript
// ✅ GOOD - User-facing, resilient
await page.getByRole('button', { name: /login/i });
await page.getByLabel('Email');
await page.getByText('Welcome');

// ❌ BAD - Implementation details, brittle
await page.locator('#btn-123');
await page.locator('.css-xyz-abc');
```

### Use expect for Assertions

```javascript
// Check visibility
await expect(page.getByText('Success')).toBeVisible();

// Check URL
await expect(page).toHaveURL(/dashboard/);

// Check title
await expect(page).toHaveTitle(/GreenShoe/);

// Check attribute
await expect(button).toBeDisabled();
```

### Use beforeEach for Setup

```javascript
test.beforeEach(async ({ page }) => {
  // Login before each test
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('admin@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /login/i }).click();
  await expect(page).toHaveURL(/dashboard/);
});
```

---

## GreenShoe Test Structure

### Test Files

```
tests/e2e/
├── auth.spec.js              # Authentication (A15, A16)
├── site-management.spec.js   # Site CRUD (A1, A2)
├── pull-workflow.spec.js     # Pull operations (A3-A6, A25-A26)
├── rbac.spec.js              # Role-based access (A11, A15, A16)
└── demo.spec.js              # Playwright demo (no app needed)
```

### Test Naming Convention

Tests reference acceptance criteria from the spec:

```javascript
test('should login with valid credentials (A15)', async ({ page }) => {
  // A15 = Acceptance criteria 15 from spec
});
```

### Running Tests by Phase

```bash
# Phase 2: Authentication
npx playwright test tests/e2e/auth.spec.js tests/e2e/rbac.spec.js

# Phase 3: Site Management
npx playwright test tests/e2e/site-management.spec.js

# Phase 4: Pull System
npx playwright test tests/e2e/pull-workflow.spec.js
```

---

## Common Commands

### Development Workflow
```bash
# 1. Write test in UI mode (watch mode)
npx playwright test --ui

# 2. Run specific test in headed mode
npx playwright test tests/e2e/auth.spec.js --headed

# 3. Debug failing test
npx playwright test tests/e2e/auth.spec.js:19 --debug

# 4. Run full suite
npm run test:e2e

# 5. View report
npm run test:e2e:report
```

### CI/CD Commands
```bash
# Run all tests in headless mode
npx playwright test

# Run with retries
npx playwright test --retries=2

# Run specific browser only
npx playwright test --project=chromium

# Generate report
npx playwright test --reporter=html,json
```

---

## Playwright Configuration

Main config: [playwright.config.js](playwright.config.js)

```javascript
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 60 * 1000,        // 30 min max per test
  expect: { timeout: 10000 },      // 10s for assertions

  use: {
    baseURL: 'http://localhost:5173',  // Frontend URL
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  // Auto-start backend and frontend
  webServer: [
    {
      command: 'cd backend && npm run dev',
      url: 'http://localhost:3000/api/health',
    },
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:5173',
    }
  ],
});
```

---

## Codegen - Record Tests

Generate tests by recording your actions:

```bash
# Record actions and generate test code
npx playwright codegen http://localhost:5173

# Record with specific viewport
npx playwright codegen --viewport-size=1280,720 http://localhost:5173

# Record in specific browser
npx playwright codegen --browser=firefox http://localhost:5173
```

This opens a browser and generates test code as you click around.

---

## Tips & Tricks

### 1. Run Only Changed Tests
```bash
npx playwright test --only-changed
```

### 2. Update Snapshots
```bash
npx playwright test --update-snapshots
```

### 3. Run Tests in Parallel
```bash
npx playwright test --workers=4
```

### 4. Run in Slow Motion
```bash
npx playwright test --headed --slow-mo=1000
```

### 5. Get Test List
```bash
npx playwright test --list
```

### 6. Filter by Tag
```javascript
// In test file:
test('critical test @smoke', async ({ page }) => { });

// Run:
npx playwright test --grep @smoke
```

---

## Troubleshooting

### Tests Timeout
- Increase timeout in `playwright.config.js`
- Check if backend/frontend started correctly
- Use `await page.pause()` to inspect state

### Can't Find Elements
- Use Playwright Inspector to pick locators
- Check if element is in correct DOM state (visible, enabled)
- Wait for navigation: `await page.waitForURL('/dashboard')`

### Tests Flaky
- Add explicit waits: `await expect(element).toBeVisible()`
- Avoid hard-coded `page.waitForTimeout()`
- Use network waiting: `await page.waitForResponse()`

### Backend Not Starting
- Verify backend exists: `cd backend && npm run dev`
- Check `playwright.config.js` webServer settings
- Run tests with `--debug` to see startup logs

---

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Locators Cheat Sheet](https://playwright.dev/docs/locators)

---

## Next Steps

1. **Run the demo tests** to verify Playwright works:
   ```bash
   npx playwright test --config=playwright.demo.config.js --ui
   ```

2. **Start implementing GreenShoe** (Tasks 1-4)

3. **Write tests as you implement** each feature

4. **Run E2E tests** after completing each phase

---

**Remember**: Tests are spec verification. Every acceptance criterion should have a passing E2E test!
