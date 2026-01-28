# Visual Testing Setup Guide

This guide explains how to set up browser-based visual testing so Claude can see and interact with your UI.

---

## Option A: Browser MCP Server (Recommended)

The Browser MCP server gives Claude direct browser control.

### Step 1: Install the MCP Server

```bash
npm install -g @anthropic/mcp-server-puppeteer
```

Or with npx (no global install):
```bash
npx @anthropic/mcp-server-puppeteer
```

### Step 2: Configure MCP

Create or update `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic/mcp-server-puppeteer"
      ]
    }
  }
}
```

For visible browser (not headless):
```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic/mcp-server-puppeteer",
        "--headless=false"
      ]
    }
  }
}
```

### Step 3: Restart Claude Code

After updating `.mcp.json`, restart Claude Code to load the MCP server.

### Step 4: Verify Setup

Ask Claude:
```
"Navigate to http://localhost:3000 and take a screenshot"
```

Claude should now have access to:
- `puppeteer_navigate` - Go to URLs
- `puppeteer_screenshot` - Capture viewport
- `puppeteer_click` - Click elements
- `puppeteer_fill` - Fill form fields
- `puppeteer_evaluate` - Run JavaScript

---

## Option B: Playwright MCP Server

Alternative using Playwright (supports more browsers).

### Step 1: Install

```bash
npm install -g @anthropic/mcp-server-playwright
```

### Step 2: Configure

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic/mcp-server-playwright"
      ]
    }
  }
}
```

---

## Option C: Custom Puppeteer Script

If MCP servers aren't available, create a script Claude can invoke.

### Step 1: Install Dependencies

```bash
npm install puppeteer --save-dev
```

### Step 2: Create Test Script

Create `scripts/visual-test.js`:

```javascript
const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

async function visualTest(options) {
  const {
    url = 'http://localhost:3000',
    output = 'screenshots/test.png',
    width = 1280,
    height = 800,
    fullPage = true,
    waitFor = 'networkidle0'
  } = options

  // Ensure output directory exists
  const dir = path.dirname(output)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const browser = await puppeteer.launch({
    headless: false,  // Set to true for CI
    defaultViewport: { width, height }
  })

  try {
    const page = await browser.newPage()

    console.log(`Navigating to: ${url}`)
    await page.goto(url, { waitUntil: waitFor })

    console.log(`Capturing screenshot: ${output}`)
    await page.screenshot({ path: output, fullPage })

    console.log('Screenshot saved successfully')
    return { success: true, path: output }
  } catch (error) {
    console.error('Error:', error.message)
    return { success: false, error: error.message }
  } finally {
    await browser.close()
  }
}

// CLI usage
const args = process.argv.slice(2)
const url = args[0] || 'http://localhost:3000'
const output = args[1] || 'screenshots/test.png'

visualTest({ url, output })
```

### Step 3: Create Interactive Test Script

Create `scripts/visual-interact.js`:

```javascript
const puppeteer = require('puppeteer')

async function interactiveTest(config) {
  const {
    url,
    actions = [],
    viewport = { width: 1280, height: 800 },
    screenshotDir = 'screenshots'
  } = config

  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  await page.setViewport(viewport)

  const results = []
  let step = 0

  try {
    // Navigate
    console.log(`Navigating to: ${url}`)
    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.screenshot({ path: `${screenshotDir}/step-${step++}-initial.png` })

    // Execute actions
    for (const action of actions) {
      console.log(`Executing: ${action.type} - ${action.selector || action.value || ''}`)

      switch (action.type) {
        case 'click':
          await page.click(action.selector)
          break
        case 'type':
          await page.type(action.selector, action.value)
          break
        case 'wait':
          await page.waitForSelector(action.selector)
          break
        case 'screenshot':
          // Just take screenshot, handled below
          break
      }

      // Screenshot after each action
      await page.waitForTimeout(500)  // Allow animations
      const screenshotPath = `${screenshotDir}/step-${step++}-${action.type}.png`
      await page.screenshot({ path: screenshotPath })

      results.push({
        action: action.type,
        selector: action.selector,
        screenshot: screenshotPath,
        success: true
      })
    }

    return { success: true, results }
  } catch (error) {
    return { success: false, error: error.message, results }
  } finally {
    await browser.close()
  }
}

// Example usage from command line
// node scripts/visual-interact.js '{"url":"http://localhost:3000","actions":[{"type":"click","selector":"#login-btn"}]}'

const configArg = process.argv[2]
if (configArg) {
  const config = JSON.parse(configArg)
  interactiveTest(config).then(console.log)
}

module.exports = { interactiveTest }
```

### Step 4: Usage

Claude can now run:

```bash
# Simple screenshot
node scripts/visual-test.js http://localhost:3000 screenshots/home.png

# Interactive test
node scripts/visual-interact.js '{"url":"http://localhost:3000/login","actions":[{"type":"type","selector":"#email","value":"test@example.com"},{"type":"click","selector":"#submit"}]}'
```

---

## Option D: Browserbase MCP (Cloud Browsers)

For CI/CD or remote testing, use cloud browsers.

### Step 1: Get Browserbase API Key

Sign up at [browserbase.com](https://browserbase.com) and get an API key.

### Step 2: Configure

```json
{
  "mcpServers": {
    "browserbase": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-browserbase"],
      "env": {
        "BROWSERBASE_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## Directory Structure

After setup, your project should have:

```
my-project/
├── .mcp.json              # MCP server configuration
├── scripts/
│   ├── visual-test.js     # Screenshot script (Option C)
│   └── visual-interact.js # Interactive test script
├── screenshots/           # Captured screenshots (gitignored)
│   ├── test.png
│   └── step-*.png
└── prompts/
    └── visual-tester.md   # Visual tester agent
```

Add to `.gitignore`:
```
screenshots/
```

---

## Verify Setup Works

### Test 1: Basic Screenshot

```bash
# Start your dev server
npm run dev

# In another terminal, test screenshot
node scripts/visual-test.js http://localhost:3000 screenshots/verify.png
```

### Test 2: With Claude

Start Claude Code and ask:

```
"Take a screenshot of http://localhost:3000 and tell me what you see"
```

If using MCP, Claude will use `puppeteer_screenshot` directly.
If using scripts, Claude will run the bash command.

### Test 3: Visual Test Loop

```
"Navigate to the login page, fill in test@example.com and password123,
click submit, and capture screenshots of each step"
```

---

## Troubleshooting

### Browser won't launch

```bash
# Install Chromium dependencies (Linux)
sudo apt-get install -y chromium-browser

# Or let Puppeteer download Chromium
npx puppeteer browsers install chrome
```

### Permission denied on screenshots folder

```bash
mkdir -p screenshots
chmod 755 screenshots
```

### MCP server not connecting

1. Check `.mcp.json` syntax is valid JSON
2. Restart Claude Code after changes
3. Verify the command works manually:
   ```bash
   npx -y @anthropic/mcp-server-puppeteer
   ```

### Screenshots are blank

- Ensure dev server is running
- Check the URL is correct
- Add longer wait time:
  ```javascript
  await page.waitForTimeout(2000)
  ```

### Headless mode issues

Some apps detect headless browsers. Use:
```javascript
const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
})
```

---

## Next Steps

1. **Configure MCP** (Option A or B) - Recommended
2. **Test the setup** with a simple screenshot
3. **Run visual tests** using the Visual Tester agent
4. **Integrate with Controller** for automated UI verification

See [prompts/visual-tester.md](../prompts/visual-tester.md) for the full agent protocol.
