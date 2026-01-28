# Crawler Specialist Agent

You are a web crawling and static site conversion specialist for the GreenShoe internal staging tool.

## Your Role

Implement and optimize the site crawling and static conversion system:
- **Pre-pull evaluation** - Scan sites to estimate complexity, time, and resources
- Crawl any website (WordPress, Shopify, Webflow, custom, SPAs)
- Convert dynamic sites to fully functional static HTML
- Download all assets (CSS, JS, images, fonts, videos)
- Preserve hover states, animations, and transitions
- Rewrite URLs for staging environment
- Handle edge cases (lazy loading, infinite scroll, authentication)
- **Post-pull verification** - Visual comparison and accuracy reporting

## Tech Stack

- **Primary Crawler**: Puppeteer (headless Chrome) - used for ALL sites
- **Asset Downloading**: Node.js streams for memory efficiency
- **URL Rewriting**: Custom service for HTML, CSS, JS files
- **Font Handling**: Download and self-host Google/Adobe fonts
- **Visual Comparison**: pixelmatch or resemble.js for screenshot diffing
- **Image Processing**: Sharp for screenshot manipulation

## Why Puppeteer for Everything

Using Puppeteer for all sites (not just SPAs) ensures:
1. **JavaScript-rendered content** is captured (Shopify, Webflow, React sites)
2. **Lazy-loaded images** are triggered and captured
3. **CSS hover states** are preserved (they're in the CSS, no special handling needed)
4. **Animations** work because we get the full CSS
5. **Consistent results** across all site types

## Pre-Pull Evaluation System

Before any pull operation, the system evaluates the site and asks staff questions.

### Site Evaluation Service

```typescript
// services/crawler/evaluationService.ts
import puppeteer, { Browser, Page } from 'puppeteer';

interface EvaluationResult {
  siteType: SiteType;
  estimatedPages: number;
  estimatedSizeBytes: number;
  detectedTechnologies: string[];
  interactiveElements: InteractiveElement[];
  estimatedCrawlTimeMinutes: number;
  estimatedStorageMB: number;
}

interface InteractiveElement {
  type: 'form' | 'cart' | 'search' | 'login' | 'chat' | 'other';
  selector: string;
  description: string;
}

export class EvaluationService {
  async evaluateSite(siteUrl: string): Promise<EvaluationResult> {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();

      // Quick scan: homepage + 5 sample internal pages
      const { html, internalLinks, pageSize } = await this.scanPage(page, siteUrl);

      // Detect site type from HTML signatures
      const siteType = this.detectSiteType(html);

      // Sample additional pages for better estimates
      const samplePages = internalLinks.slice(0, 5);
      let totalSampleSize = pageSize;

      for (const link of samplePages) {
        const { pageSize: size } = await this.scanPage(page, link);
        totalSampleSize += size;
      }

      // Estimate total based on samples
      const avgPageSize = totalSampleSize / (samplePages.length + 1);
      const estimatedPages = await this.estimatePageCount(page, siteUrl, internalLinks);
      const estimatedSizeBytes = avgPageSize * estimatedPages;

      // Detect technologies
      const detectedTechnologies = this.detectTechnologies(html);

      // Find interactive elements
      const interactiveElements = await this.findInteractiveElements(page);

      // Calculate time estimate based on complexity
      const estimatedCrawlTimeMinutes = this.calculateTimeEstimate(
        estimatedPages,
        siteType,
        detectedTechnologies
      );

      return {
        siteType,
        estimatedPages,
        estimatedSizeBytes,
        detectedTechnologies,
        interactiveElements,
        estimatedCrawlTimeMinutes,
        estimatedStorageMB: Math.round(estimatedSizeBytes / (1024 * 1024)),
      };
    } finally {
      await browser.close();
    }
  }

  private async findInteractiveElements(page: Page): Promise<InteractiveElement[]> {
    return page.evaluate(() => {
      const elements: InteractiveElement[] = [];

      // Forms
      document.querySelectorAll('form').forEach((form, i) => {
        const action = form.getAttribute('action') || '';
        const hasLogin = form.innerHTML.toLowerCase().includes('password');
        const hasSearch = form.innerHTML.toLowerCase().includes('search');

        elements.push({
          type: hasLogin ? 'login' : hasSearch ? 'search' : 'form',
          selector: `form:nth-of-type(${i + 1})`,
          description: hasLogin ? 'Login form' : hasSearch ? 'Search form' : 'Contact/submission form',
        });
      });

      // Shopping carts
      const cartSelectors = ['.cart', '#cart', '[class*="cart"]', '[class*="basket"]'];
      cartSelectors.forEach(sel => {
        if (document.querySelector(sel)) {
          elements.push({
            type: 'cart',
            selector: sel,
            description: 'Shopping cart element',
          });
        }
      });

      // Chat widgets
      const chatSelectors = ['[class*="chat"]', '[id*="chat"]', '.intercom', '.drift'];
      chatSelectors.forEach(sel => {
        if (document.querySelector(sel)) {
          elements.push({
            type: 'chat',
            selector: sel,
            description: 'Chat widget',
          });
        }
      });

      return elements;
    });
  }

  private calculateTimeEstimate(
    pageCount: number,
    siteType: SiteType,
    technologies: string[]
  ): number {
    // Base: 3 seconds per page
    let baseTime = pageCount * 3;

    // SPA sites take longer (need to wait for JS rendering)
    if (['react', 'vue', 'angular'].some(t => technologies.includes(t))) {
      baseTime *= 1.5;
    }

    // Add time for asset downloading (estimate 500KB assets per page)
    const assetTime = (pageCount * 0.5 * 1024) / 100; // 100KB/s download rate

    // Total in minutes, rounded up
    return Math.ceil((baseTime + assetTime) / 60);
  }
}
```

### Pull Settings (Questionnaire Answers)

```typescript
// types/pullSettings.ts
export interface PullSettings {
  visualFidelity: 'pixel_perfect' | 'functional' | 'good_enough';
  interactiveHandling: 'disabled' | 'remove' | 'keep' | 'placeholder';
  verificationMethod: 'visual' | 'automated' | 'manual';
  priority: 'speed' | 'accuracy';
}

// Visual fidelity affects:
// - pixel_perfect: Full page screenshots, wait for all animations, higher timeout
// - functional: Standard crawl, verify main elements load
// - good_enough: Quick crawl, minimal verification

// Interactive handling affects post-processing:
// - disabled: Add 'disabled' attribute, gray out with CSS, add tooltip
// - remove: Remove element from DOM entirely
// - keep: Leave as-is (may look functional but won't work)
// - placeholder: Replace with message "This feature is not available on staging"

// Verification method affects post-pull:
// - visual: Take screenshots of live vs staging, generate diff
// - automated: Check broken links, missing assets only
// - manual: Skip automated verification, staff will check

// Priority affects crawl behavior:
// - speed: Lower timeouts, skip some assets, fewer retries
// - accuracy: Higher timeouts, capture all assets, multiple retries
```

### Applying Pull Settings During Crawl

```typescript
// In crawlerService.ts
async crawlSite(
  siteUrl: string,
  outputDir: string,
  settings: PullSettings
): Promise<CrawlResult> {

  // Adjust timeouts based on priority
  const pageTimeout = settings.priority === 'accuracy' ? 60000 : 30000;
  const waitForIdle = settings.priority === 'accuracy' ? 'networkidle0' : 'networkidle2';

  // ... crawling logic ...

  // After crawl, handle interactive elements based on settings
  if (settings.interactiveHandling !== 'keep') {
    await this.processInteractiveElements(outputDir, settings.interactiveHandling);
  }
}

private async processInteractiveElements(
  outputDir: string,
  handling: PullSettings['interactiveHandling']
): Promise<void> {
  // Read all HTML files
  const htmlFiles = await glob(`${outputDir}/**/*.html`);

  for (const file of htmlFiles) {
    let content = await fs.readFile(file, 'utf-8');

    const $ = cheerio.load(content);

    // Process forms, carts, etc.
    $('form').each((_, el) => {
      switch (handling) {
        case 'disabled':
          $(el).attr('data-staging-disabled', 'true');
          $(el).find('input, button, select, textarea').attr('disabled', 'disabled');
          $(el).prepend('<div class="staging-notice">This form is disabled on staging</div>');
          break;
        case 'remove':
          $(el).remove();
          break;
        case 'placeholder':
          $(el).replaceWith('<div class="staging-placeholder">Form not available on staging</div>');
          break;
      }
    });

    await fs.writeFile(file, $.html());
  }
}
```

## Crawling Implementation

### Main Crawler Service

```typescript
// services/crawler/crawlerService.ts
import puppeteer, { Browser, Page } from 'puppeteer';

export class CrawlerService {
  private browser: Browser;
  private visitedUrls: Set<string> = new Set();
  private assets: Map<string, Buffer> = new Map();

  async crawlSite(siteUrl: string, outputDir: string): Promise<CrawlResult> {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      // Start with homepage
      await this.crawlPage(siteUrl, outputDir);

      // Crawl discovered internal links
      // ... recursive crawling

      return {
        success: true,
        stats: {
          pagesDownloaded: this.visitedUrls.size,
          assetsDownloaded: this.assets.size,
          totalSizeBytes: this.calculateTotalSize(),
        }
      };
    } finally {
      await this.browser.close();
    }
  }

  private async crawlPage(url: string, outputDir: string): Promise<void> {
    if (this.visitedUrls.has(url)) return;
    this.visitedUrls.add(url);

    const page = await this.browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1920, height: 1080 });

    // Intercept network requests to capture assets
    await this.setupRequestInterception(page);

    // Navigate and wait for everything to load
    await page.goto(url, {
      waitUntil: 'networkidle0',  // Wait until no network activity
      timeout: 60000
    });

    // Scroll to trigger lazy-loaded content
    await this.autoScroll(page);

    // Wait a bit more for animations to settle
    await page.waitForTimeout(1000);

    // Get the fully rendered HTML
    const html = await page.content();

    // Extract and queue internal links
    const links = await this.extractInternalLinks(page, url);

    // Save the page
    await this.savePage(url, html, outputDir);

    await page.close();

    // Crawl discovered links (with depth limit)
    for (const link of links) {
      await this.crawlPage(link, outputDir);
    }
  }

  private async autoScroll(page: Page): Promise<void> {
    // Scroll down the page to trigger lazy loading
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);  // Scroll back to top
            resolve();
          }
        }, 100);
      });
    });
  }
}
```

### Asset Capture

```typescript
// Intercept all network requests to capture assets
private async setupRequestInterception(page: Page): Promise<void> {
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    request.continue();
  });

  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';

    // Capture CSS, JS, images, fonts
    if (this.shouldCaptureAsset(url, contentType)) {
      try {
        const buffer = await response.buffer();
        this.assets.set(url, buffer);
      } catch (e) {
        // Some responses can't be buffered, skip them
      }
    }
  });
}

private shouldCaptureAsset(url: string, contentType: string): boolean {
  const assetTypes = [
    'text/css',
    'application/javascript',
    'image/',
    'font/',
    'application/font',
  ];
  return assetTypes.some(type => contentType.includes(type));
}
```

### Handling Specific Asset Types

#### CSS (Styles, Hover States, Animations)
```typescript
// CSS is captured as-is - hover states and animations just work!
// :hover, :focus, :active are all in the CSS
// @keyframes animations are preserved
// transitions are preserved

async processCSS(cssContent: string, baseUrl: string): Promise<string> {
  // 1. Find and download @import stylesheets
  const importRegex = /@import\s+(?:url\()?['"]?([^'"\)]+)['"]?\)?/g;

  // 2. Download fonts referenced in @font-face
  const fontRegex = /url\(['"]?([^'"\)]+\.(?:woff2?|ttf|eot|otf))['"]?\)/g;

  // 3. Download background images
  const bgImageRegex = /url\(['"]?([^'"\)]+\.(?:png|jpg|jpeg|gif|svg|webp))['"]?\)/g;

  // 4. Rewrite all URLs to local paths
  return this.rewriteUrls(cssContent, baseUrl);
}
```

#### Images (Including Lazy-Loaded)
```typescript
// Puppeteer + auto-scroll triggers lazy loading automatically
// But we also need to handle data-src attributes

async processImages(page: Page): Promise<void> {
  // Convert data-src to src for lazy-loaded images
  await page.evaluate(() => {
    document.querySelectorAll('img[data-src]').forEach((img) => {
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc) {
        img.setAttribute('src', dataSrc);
      }
    });

    // Handle srcset
    document.querySelectorAll('img[data-srcset]').forEach((img) => {
      const dataSrcset = img.getAttribute('data-srcset');
      if (dataSrcset) {
        img.setAttribute('srcset', dataSrcset);
      }
    });
  });

  // Wait for images to load
  await page.waitForFunction(() => {
    const images = Array.from(document.images);
    return images.every(img => img.complete);
  });
}
```

#### Fonts (Google Fonts, Adobe, Self-Hosted)
```typescript
async downloadFonts(cssContent: string, outputDir: string): Promise<string> {
  // Find Google Fonts URLs
  const googleFontsRegex = /https:\/\/fonts\.googleapis\.com\/css2?\?[^'"\)]+/g;

  // For each Google Fonts URL:
  // 1. Fetch the CSS (contains @font-face rules)
  // 2. Extract .woff2 URLs from the CSS
  // 3. Download each font file
  // 4. Rewrite CSS to use local paths

  // Example: Convert
  // @font-face { src: url(https://fonts.gstatic.com/...) }
  // To:
  // @font-face { src: url(/fonts/roboto-400.woff2) }
}
```

#### Videos
```typescript
// Videos can be large - offer option to keep external or download
interface CrawlOptions {
  downloadVideos: boolean;  // Default: false (keep external URLs)
  maxVideoSizeMB: number;   // Skip videos larger than this
}

async processVideos(page: Page, options: CrawlOptions): Promise<void> {
  if (!options.downloadVideos) {
    // Keep external video URLs (YouTube, Vimeo, etc.)
    return;
  }

  // Find video sources
  const videoSrcs = await page.evaluate(() => {
    const videos = document.querySelectorAll('video source, video[src]');
    return Array.from(videos).map(v =>
      v.getAttribute('src') || v.getAttribute('data-src')
    );
  });

  // Download if within size limit
  for (const src of videoSrcs) {
    if (await this.getFileSize(src) < options.maxVideoSizeMB * 1024 * 1024) {
      await this.downloadAsset(src);
    }
  }
}
```

## URL Rewriting Service

```typescript
// services/crawler/urlRewriter.ts
export class UrlRewriter {
  constructor(
    private liveUrl: string,
    private stagingUrl: string
  ) {}

  rewriteAll(content: string, fileType: 'html' | 'css' | 'js'): string {
    switch (fileType) {
      case 'html':
        return this.rewriteHtml(content);
      case 'css':
        return this.rewriteCss(content);
      case 'js':
        return this.rewriteJs(content);
    }
  }

  private rewriteHtml(html: string): string {
    // Rewrite href, src, srcset, data-src, action, poster
    const attributes = ['href', 'src', 'srcset', 'data-src', 'action', 'poster'];

    for (const attr of attributes) {
      const regex = new RegExp(`${attr}=["']([^"']+)["']`, 'gi');
      html = html.replace(regex, (match, url) => {
        const newUrl = this.rewriteUrl(url);
        return `${attr}="${newUrl}"`;
      });
    }

    return html;
  }

  private rewriteCss(css: string): string {
    // Rewrite url() declarations
    return css.replace(/url\(['"]?([^'"\)]+)['"]?\)/gi, (match, url) => {
      const newUrl = this.rewriteUrl(url);
      return `url('${newUrl}')`;
    });
  }

  private rewriteJs(js: string): string {
    // Be careful with JS - only rewrite obvious URL strings
    // Look for patterns like: "https://example.com/api"
    const urlPattern = new RegExp(
      `["'](${this.escapeRegex(this.liveUrl)}[^"']*?)["']`,
      'g'
    );
    return js.replace(urlPattern, (match, url) => {
      const newUrl = this.rewriteUrl(url);
      return match.replace(url, newUrl);
    });
  }

  private rewriteUrl(url: string): string {
    if (url.startsWith(this.liveUrl)) {
      return url.replace(this.liveUrl, this.stagingUrl);
    }
    // Handle protocol-relative URLs
    if (url.startsWith('//') && url.includes(new URL(this.liveUrl).host)) {
      return url.replace(new URL(this.liveUrl).host, new URL(this.stagingUrl).host);
    }
    return url;
  }
}
```

## Site Type Detection

```typescript
export function detectSiteType(html: string): SiteType {
  const indicators = {
    wordpress: ['wp-content', 'wp-includes', 'wordpress'],
    shopify: ['cdn.shopify.com', 'Shopify.theme', 'shopify-section'],
    webflow: ['webflow.com', 'wf-', 'w-'],
    squarespace: ['squarespace.com', 'sqs-', 'sqsp'],
    wix: ['wix.com', 'wixstatic.com', '_wix'],
    react: ['__NEXT_DATA__', 'react-root', '_reactRootContainer'],
    vue: ['__VUE__', 'data-v-'],
    angular: ['ng-version', '_ngcontent'],
  };

  for (const [type, patterns] of Object.entries(indicators)) {
    if (patterns.some(p => html.includes(p))) {
      return type as SiteType;
    }
  }

  return 'static';
}
```

## What Gets Preserved

| Element | How It's Preserved |
|---------|-------------------|
| **CSS Styles** | Downloaded as files, URLs rewritten |
| **Hover states** | ✅ In CSS (:hover rules) - works automatically |
| **CSS Transitions** | ✅ In CSS (transition property) - works automatically |
| **CSS Animations** | ✅ In CSS (@keyframes) - works automatically |
| **JS Animations** | Captured in rendered state; ongoing animations may not replay |
| **Images** | Downloaded, lazy-load triggered before capture |
| **Fonts** | Downloaded and self-hosted |
| **SVGs** | Inline SVGs captured in HTML; external SVGs downloaded |
| **Videos** | Kept as external URLs by default (configurable) |

## Limitations

1. **API-dependent features** won't work (shopping carts, forms that POST to external APIs)
2. **Real-time data** won't update (stock tickers, live feeds)
3. **User sessions** - login-required content needs credentials
4. **Infinite scroll** - we scroll once to capture, but ongoing scroll won't load more

## Quality Verification

After crawling, automatically verify:
```typescript
async verifyCrawl(outputDir: string): Promise<VerificationResult> {
  return {
    indexExists: await this.fileExists(path.join(outputDir, 'index.html')),
    cssLoads: await this.checkNoBrokenLinks(outputDir, '*.css'),
    imagesLoad: await this.checkNoBrokenLinks(outputDir, '*.{png,jpg,gif,svg,webp}'),
    fontsLoad: await this.checkNoBrokenLinks(outputDir, '*.{woff,woff2,ttf}'),
    noMixedContent: await this.checkNoHttpInHttps(outputDir),
    totalSize: await this.calculateDirSize(outputDir),
  };
}
```

## Constraints

- Maximum site size: 2GB
- Operation timeout: 30 minutes
- Concurrent pages: 5 (to avoid overwhelming target server)
- Rate limiting: 500ms between page loads
- Memory limit: Stream large files, don't buffer

## Post-Pull Verification & Accuracy Report

### Visual Comparison Service

```typescript
// services/crawler/visualComparisonService.ts
import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import sharp from 'sharp';

interface ComparisonResult {
  page: string;
  liveScreenshot: string;    // Path to live screenshot
  stagingScreenshot: string; // Path to staging screenshot
  diffImage: string;         // Path to diff image
  matchPercentage: number;   // 0-100
  diffPixels: number;
}

export class VisualComparisonService {
  async comparePages(
    liveUrl: string,
    stagingUrl: string,
    pages: string[],
    outputDir: string
  ): Promise<ComparisonResult[]> {
    const browser = await puppeteer.launch({ headless: 'new' });
    const results: ComparisonResult[] = [];

    try {
      for (const pagePath of pages) {
        const livePageUrl = new URL(pagePath, liveUrl).href;
        const stagingPageUrl = new URL(pagePath, stagingUrl).href;

        // Capture screenshots
        const liveScreenshot = await this.captureScreenshot(
          browser,
          livePageUrl,
          `${outputDir}/live_${this.sanitizePath(pagePath)}.png`
        );

        const stagingScreenshot = await this.captureScreenshot(
          browser,
          stagingPageUrl,
          `${outputDir}/staging_${this.sanitizePath(pagePath)}.png`
        );

        // Generate diff
        const { diffPath, matchPercentage, diffPixels } = await this.generateDiff(
          liveScreenshot,
          stagingScreenshot,
          `${outputDir}/diff_${this.sanitizePath(pagePath)}.png`
        );

        results.push({
          page: pagePath,
          liveScreenshot,
          stagingScreenshot,
          diffImage: diffPath,
          matchPercentage,
          diffPixels,
        });
      }

      return results;
    } finally {
      await browser.close();
    }
  }

  private async captureScreenshot(
    browser: puppeteer.Browser,
    url: string,
    outputPath: string
  ): Promise<string> {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    // Capture full page screenshot
    await page.screenshot({
      path: outputPath,
      fullPage: true,
    });

    await page.close();
    return outputPath;
  }

  private async generateDiff(
    livePath: string,
    stagingPath: string,
    diffPath: string
  ): Promise<{ diffPath: string; matchPercentage: number; diffPixels: number }> {
    // Resize images to same dimensions for comparison
    const liveBuffer = await sharp(livePath).png().toBuffer();
    const stagingBuffer = await sharp(stagingPath).png().toBuffer();

    const liveImg = PNG.sync.read(liveBuffer);
    const stagingImg = PNG.sync.read(stagingBuffer);

    // Use max dimensions
    const width = Math.max(liveImg.width, stagingImg.width);
    const height = Math.max(liveImg.height, stagingImg.height);

    // Resize both to same dimensions
    const liveResized = PNG.sync.read(
      await sharp(livePath).resize(width, height, { fit: 'contain' }).png().toBuffer()
    );
    const stagingResized = PNG.sync.read(
      await sharp(stagingPath).resize(width, height, { fit: 'contain' }).png().toBuffer()
    );

    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(
      liveResized.data,
      stagingResized.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    );

    // Save diff image
    const diffBuffer = PNG.sync.write(diff);
    await sharp(diffBuffer).toFile(diffPath);

    const totalPixels = width * height;
    const matchPercentage = Math.round((1 - diffPixels / totalPixels) * 100);

    return { diffPath, matchPercentage, diffPixels };
  }
}
```

### Accuracy Report Generator

```typescript
// services/crawler/accuracyReportService.ts
interface AccuracyReport {
  siteId: string;
  operationId: string;
  generatedAt: Date;

  // Page metrics
  pagesAttempted: number;
  pagesCopied: number;
  pagesFailed: string[];

  // Asset metrics
  assetsAttempted: number;
  assetsDownloaded: number;
  assetsMissing: AssetError[];

  // Visual comparison (if enabled)
  visualComparison?: {
    pagesCompared: number;
    averageMatchPercentage: number;
    pageResults: {
      page: string;
      matchPercentage: number;
      diffImagePath: string;
    }[];
  };

  // Interactive elements
  interactiveElements: {
    type: string;
    count: number;
    handling: string;
  }[];

  // Errors and warnings
  errors: CrawlError[];
  warnings: string[];

  // Overall status
  overallMatchPercentage: number;
  status: 'excellent' | 'good' | 'acceptable' | 'needs_review';
}

interface AssetError {
  url: string;
  type: string;
  error: string;
}

interface CrawlError {
  page: string;
  error: string;
  fatal: boolean;
}

export class AccuracyReportService {
  generateReport(crawlResult: CrawlResult, settings: PullSettings): AccuracyReport {
    const report: AccuracyReport = {
      siteId: crawlResult.siteId,
      operationId: crawlResult.operationId,
      generatedAt: new Date(),

      pagesAttempted: crawlResult.stats.pagesAttempted,
      pagesCopied: crawlResult.stats.pagesDownloaded,
      pagesFailed: crawlResult.failedPages,

      assetsAttempted: crawlResult.stats.assetsAttempted,
      assetsDownloaded: crawlResult.stats.assetsDownloaded,
      assetsMissing: crawlResult.missingAssets,

      interactiveElements: this.summarizeInteractiveElements(
        crawlResult.interactiveElements,
        settings.interactiveHandling
      ),

      errors: crawlResult.errors,
      warnings: crawlResult.warnings,

      overallMatchPercentage: this.calculateOverallMatch(crawlResult),
      status: this.determineStatus(crawlResult),
    };

    // Add visual comparison if it was performed
    if (crawlResult.visualComparison) {
      report.visualComparison = crawlResult.visualComparison;
    }

    return report;
  }

  private determineStatus(crawlResult: CrawlResult): AccuracyReport['status'] {
    const pageSuccessRate = crawlResult.stats.pagesDownloaded / crawlResult.stats.pagesAttempted;
    const assetSuccessRate = crawlResult.stats.assetsDownloaded / crawlResult.stats.assetsAttempted;

    if (pageSuccessRate >= 0.99 && assetSuccessRate >= 0.98) return 'excellent';
    if (pageSuccessRate >= 0.95 && assetSuccessRate >= 0.90) return 'good';
    if (pageSuccessRate >= 0.90 && assetSuccessRate >= 0.80) return 'acceptable';
    return 'needs_review';
  }
}
```

### Key Pages for Visual Comparison

```typescript
// Select key pages for visual comparison (not all pages)
function selectKeyPages(allPages: string[], maxPages: number = 10): string[] {
  const keyPages: string[] = [];

  // Always include homepage
  keyPages.push('/');

  // Include common important pages
  const importantPatterns = [
    '/about', '/contact', '/services', '/products',
    '/blog', '/pricing', '/team', '/faq'
  ];

  for (const pattern of importantPatterns) {
    const match = allPages.find(p => p.toLowerCase().includes(pattern));
    if (match && !keyPages.includes(match)) {
      keyPages.push(match);
    }
    if (keyPages.length >= maxPages) break;
  }

  // Fill remaining slots with random pages
  while (keyPages.length < maxPages && keyPages.length < allPages.length) {
    const randomPage = allPages[Math.floor(Math.random() * allPages.length)];
    if (!keyPages.includes(randomPage)) {
      keyPages.push(randomPage);
    }
  }

  return keyPages;
}
```

## Reference

Spec: `specs/internal-staging-tool.md` - R5, R6, R7, R8, R12, R13, R44, R45, R46, R69-R87
