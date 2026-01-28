import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { downloadPageAssets, rewriteAssetUrls } from './assetDownloadService.js';
import { disableForms, detectInteractiveElements, generateDisabledReport } from './formDisableService.js';

/**
 * Crawl a website and save to static HTML with all assets
 */
export async function crawlWebsite(url, outputDir, options = {}) {
  const {
    maxPages = 100,
    timeout = 30000,
    waitUntil = 'networkidle2',
    onProgress = null,
    // Asset download options
    downloadAssets = true,
    downloadVideos = true,
    downloadFonts = true,
    downloadImages = true,
    downloadCss = true,
    downloadJs = true,
    maxVideoSizeMB = 100,
    // Form handling options
    disableFormsOnStaging = true,
    showStagingNotice = true,
    disableSearchForms = true,
    disableLoginForms = true,
    disableContactForms = true,
    disableCartButtons = true
  } = options;

  let browser = null;
  const visitedUrls = new Set();
  const urlsToCrawl = [url];
  const baseUrl = new URL(url);
  let pageCount = 0;
  const assetMapping = {}; // Track downloaded assets for URL rewriting
  const interactiveReport = { forms: { total: 0 }, cartElements: 0 };

  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    logger.info(`Starting crawl of ${url}`);

    while (urlsToCrawl.length > 0 && pageCount < maxPages) {
      const currentUrl = urlsToCrawl.shift();

      // Skip if already visited
      if (visitedUrls.has(currentUrl)) {
        continue;
      }

      visitedUrls.add(currentUrl);
      pageCount++;

      try {
        const pageResult = await crawlPage(browser, currentUrl, baseUrl, outputDir, {
          timeout,
          waitUntil,
          urlsToCrawl,
          visitedUrls,
          maxPages,
          downloadAssets,
          downloadVideos,
          downloadFonts,
          downloadImages,
          downloadCss,
          downloadJs,
          maxVideoSizeMB,
          disableFormsOnStaging,
          showStagingNotice,
          disableSearchForms,
          disableLoginForms,
          disableContactForms,
          disableCartButtons,
          assetMapping
        });

        // Aggregate interactive element reports
        if (pageResult.interactiveElements) {
          interactiveReport.forms.total += pageResult.interactiveElements.forms.total;
          interactiveReport.cartElements += pageResult.interactiveElements.cartElements;
        }

        if (onProgress) {
          onProgress({
            currentUrl,
            pagesProcessed: pageCount,
            pagesRemaining: Math.min(urlsToCrawl.length, maxPages - pageCount),
            totalVisited: visitedUrls.size,
            assetsDownloaded: Object.keys(assetMapping).length
          });
        }

        logger.info(`Crawled [${pageCount}/${maxPages}]: ${currentUrl}`);
      } catch (error) {
        logger.error(`Failed to crawl ${currentUrl}:`, error.message);
      }
    }

    // Log interactive elements report
    if (disableFormsOnStaging && interactiveReport.forms.total > 0) {
      logger.info(generateDisabledReport(interactiveReport));
    }

    logger.info(`Crawl completed: ${visitedUrls.size} pages, ${Object.keys(assetMapping).length} assets`);

    return {
      success: true,
      pagesProcessed: visitedUrls.size,
      assetsDownloaded: Object.keys(assetMapping).length,
      interactiveElementsDisabled: interactiveReport,
      outputDir
    };

  } catch (error) {
    logger.error('Crawl error:', error.message);
    throw new Error(`Crawl failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Crawl a single page with asset downloading and form disabling
 */
async function crawlPage(browser, url, baseUrl, outputDir, options) {
  const {
    timeout,
    waitUntil,
    urlsToCrawl,
    visitedUrls,
    maxPages,
    downloadAssets,
    downloadVideos,
    downloadFonts,
    downloadImages,
    downloadCss,
    downloadJs,
    maxVideoSizeMB,
    disableFormsOnStaging,
    showStagingNotice,
    disableSearchForms,
    disableLoginForms,
    disableContactForms,
    disableCartButtons,
    assetMapping
  } = options;

  const page = await browser.newPage();
  let interactiveElements = null;

  try {
    // Navigate to page
    await page.goto(url, {
      timeout,
      waitUntil
    });

    // Download assets if enabled
    if (downloadAssets) {
      try {
        const assetResults = await downloadPageAssets(page, outputDir, {
          downloadVideos,
          downloadFonts,
          downloadImages,
          downloadCss,
          downloadJs,
          maxVideoSizeMB,
          timeout
        });

        // Update asset mapping for URL rewriting
        for (const asset of assetResults.downloaded) {
          assetMapping[asset.url] = {
            filename: asset.filename,
            localPath: asset.localPath
          };
        }
      } catch (error) {
        logger.warn(`Asset download error for ${url}:`, error.message);
      }
    }

    // Get page content
    let html = await page.content();

    // Rewrite asset URLs to local paths
    if (downloadAssets && Object.keys(assetMapping).length > 0) {
      html = rewriteAssetUrls(html, assetMapping, './assets');
    }

    // Detect and disable forms/interactive elements
    if (disableFormsOnStaging) {
      interactiveElements = detectInteractiveElements(html);

      html = disableForms(html, {
        disableAllForms: true,
        disableSearchForms,
        disableLoginForms,
        disableContactForms,
        disableCartButtons,
        showStagingNotice
      });
    }

    // Extract links from the page
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors.map(a => a.href);
    });

    // Filter and queue links
    for (const link of links) {
      try {
        const linkUrl = new URL(link);

        // Only crawl same-origin links
        if (linkUrl.origin === baseUrl.origin && !visitedUrls.has(link)) {
          if (urlsToCrawl.length + visitedUrls.size < maxPages) {
            urlsToCrawl.push(link);
          }
        }
      } catch (error) {
        // Invalid URL, skip
      }
    }

    // Save page HTML
    const urlPath = new URL(url);
    let filename = urlPath.pathname;

    // Convert path to filename
    if (filename === '/' || filename === '') {
      filename = 'index.html';
    } else if (!filename.endsWith('.html') && !filename.endsWith('.htm')) {
      filename = filename.replace(/\/$/, '') + '.html';
    }

    // Clean filename
    filename = filename.replace(/^\//, '').replace(/\//g, '_');

    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, html, 'utf-8');

    return { interactiveElements };

  } finally {
    await page.close();
  }
}

/**
 * Get estimated site size (simplified)
 */
export async function estimateSiteSize(url) {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Count links as rough estimate
    const linkCount = await page.evaluate(() => {
      return document.querySelectorAll('a[href]').length;
    });

    return {
      estimatedPages: Math.min(linkCount, 100),
      estimatedSizeMB: linkCount * 0.5 // Rough estimate: 500KB per page
    };

  } catch (error) {
    logger.error('Site size estimation error:', error.message);
    return {
      estimatedPages: 10,
      estimatedSizeMB: 5
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
