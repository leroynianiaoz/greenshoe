import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { logger } from '../../utils/logger.js';

/**
 * Asset types and their file extensions
 */
const ASSET_TYPES = {
  css: ['.css'],
  js: ['.js', '.mjs'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif'],
  fonts: ['.woff', '.woff2', '.ttf', '.otf', '.eot'],
  videos: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
};

/**
 * Content-type to asset type mapping
 */
const CONTENT_TYPE_MAP = {
  'text/css': 'css',
  'application/javascript': 'js',
  'text/javascript': 'js',
  'image/': 'images',
  'video/': 'videos',
  'font/': 'fonts',
  'application/font': 'fonts'
};

/**
 * Download all assets from a webpage
 * @param {Page} page - Puppeteer page object
 * @param {string} outputDir - Directory to save assets
 * @param {object} options - Download options
 * @returns {Promise<object>} Download results
 */
export async function downloadPageAssets(page, outputDir, options = {}) {
  const {
    downloadVideos = true,
    downloadFonts = true,
    downloadImages = true,
    downloadCss = true,
    downloadJs = true,
    maxVideoSizeMB = 100,
    timeout = 30000
  } = options;

  const assetsDir = path.join(outputDir, 'assets');
  const results = {
    downloaded: [],
    failed: [],
    skipped: [],
    totalSize: 0
  };

  try {
    // Create assets subdirectories
    await fs.mkdir(path.join(assetsDir, 'css'), { recursive: true });
    await fs.mkdir(path.join(assetsDir, 'js'), { recursive: true });
    await fs.mkdir(path.join(assetsDir, 'images'), { recursive: true });
    await fs.mkdir(path.join(assetsDir, 'fonts'), { recursive: true });
    await fs.mkdir(path.join(assetsDir, 'videos'), { recursive: true });

    // Extract all asset URLs from the page
    const assetUrls = await page.evaluate(() => {
      const assets = {
        css: [],
        js: [],
        images: [],
        fonts: [],
        videos: []
      };

      // CSS files
      document.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
        if (el.href) assets.css.push(el.href);
      });

      // JavaScript files
      document.querySelectorAll('script[src]').forEach(el => {
        if (el.src) assets.js.push(el.src);
      });

      // Images (including lazy-loaded)
      document.querySelectorAll('img').forEach(el => {
        if (el.src) assets.images.push(el.src);
        if (el.dataset.src) assets.images.push(el.dataset.src);
        // Handle srcset
        if (el.srcset) {
          el.srcset.split(',').forEach(src => {
            const url = src.trim().split(' ')[0];
            if (url) assets.images.push(url);
          });
        }
      });

      // Background images from inline styles
      document.querySelectorAll('[style*="background"]').forEach(el => {
        const match = el.style.backgroundImage?.match(/url\(["']?([^"')]+)["']?\)/);
        if (match && match[1]) assets.images.push(match[1]);
      });

      // Picture sources
      document.querySelectorAll('source[srcset]').forEach(el => {
        el.srcset.split(',').forEach(src => {
          const url = src.trim().split(' ')[0];
          if (url) assets.images.push(url);
        });
      });

      // Videos
      document.querySelectorAll('video source').forEach(el => {
        if (el.src) assets.videos.push(el.src);
      });
      document.querySelectorAll('video[src]').forEach(el => {
        if (el.src) assets.videos.push(el.src);
      });

      // Fonts from CSS (we'll also extract from downloaded CSS files)
      // Look for preloaded fonts
      document.querySelectorAll('link[rel="preload"][as="font"]').forEach(el => {
        if (el.href) assets.fonts.push(el.href);
      });

      return assets;
    });

    // Download each asset type based on options
    if (downloadCss) {
      for (const url of [...new Set(assetUrls.css)]) {
        await downloadAsset(url, path.join(assetsDir, 'css'), results, timeout);
      }
    }

    if (downloadJs) {
      for (const url of [...new Set(assetUrls.js)]) {
        await downloadAsset(url, path.join(assetsDir, 'js'), results, timeout);
      }
    }

    if (downloadImages) {
      for (const url of [...new Set(assetUrls.images)]) {
        await downloadAsset(url, path.join(assetsDir, 'images'), results, timeout);
      }
    }

    if (downloadFonts) {
      for (const url of [...new Set(assetUrls.fonts)]) {
        await downloadAsset(url, path.join(assetsDir, 'fonts'), results, timeout);
      }
    }

    if (downloadVideos) {
      for (const url of [...new Set(assetUrls.videos)]) {
        await downloadAsset(url, path.join(assetsDir, 'videos'), results, timeout, maxVideoSizeMB * 1024 * 1024);
      }
    }

    // Extract fonts from downloaded CSS files
    if (downloadFonts && downloadCss) {
      await extractAndDownloadFontsFromCss(path.join(assetsDir, 'css'), path.join(assetsDir, 'fonts'), results, timeout);
    }

    logger.info(`Assets downloaded: ${results.downloaded.length} success, ${results.failed.length} failed, ${results.skipped.length} skipped`);

    return results;

  } catch (error) {
    logger.error('Asset download error:', error.message);
    throw new Error(`Asset download failed: ${error.message}`);
  }
}

/**
 * Download a single asset
 */
async function downloadAsset(url, outputDir, results, timeout, maxSize = null) {
  try {
    // Skip data URLs
    if (url.startsWith('data:')) {
      results.skipped.push({ url, reason: 'data URL' });
      return;
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      results.skipped.push({ url, reason: 'invalid URL' });
      return;
    }

    // Generate filename from URL
    const filename = generateFilename(parsedUrl);
    const outputPath = path.join(outputDir, filename);

    // Check if already downloaded
    try {
      await fs.access(outputPath);
      results.skipped.push({ url, reason: 'already exists', localPath: outputPath });
      return;
    } catch {
      // File doesn't exist, proceed with download
    }

    // Download the file
    const { buffer, size } = await fetchUrl(url, timeout, maxSize);

    if (buffer) {
      await fs.writeFile(outputPath, buffer);
      results.downloaded.push({
        url,
        localPath: outputPath,
        filename,
        size
      });
      results.totalSize += size;
    } else {
      results.skipped.push({ url, reason: 'exceeds max size' });
    }

  } catch (error) {
    results.failed.push({ url, error: error.message });
  }
}

/**
 * Fetch URL content
 */
function fetchUrl(url, timeout, maxSize = null) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, { timeout }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchUrl(response.headers.location, timeout, maxSize)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      // Check content-length for max size
      const contentLength = parseInt(response.headers['content-length'], 10);
      if (maxSize && contentLength && contentLength > maxSize) {
        resolve({ buffer: null, size: contentLength });
        return;
      }

      const chunks = [];
      let totalSize = 0;

      response.on('data', (chunk) => {
        totalSize += chunk.length;
        if (maxSize && totalSize > maxSize) {
          request.destroy();
          resolve({ buffer: null, size: totalSize });
          return;
        }
        chunks.push(chunk);
      });

      response.on('end', () => {
        resolve({ buffer: Buffer.concat(chunks), size: totalSize });
      });

      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Generate a safe filename from URL
 */
function generateFilename(parsedUrl) {
  let filename = path.basename(parsedUrl.pathname) || 'index';

  // Remove query string from filename
  filename = filename.split('?')[0];

  // Add hash of URL to ensure uniqueness
  const hash = Buffer.from(parsedUrl.href).toString('base64').slice(0, 8).replace(/[/+=]/g, '_');

  // Get extension
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);

  // Sanitize filename
  const safeName = base.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);

  return `${safeName}_${hash}${ext || '.bin'}`;
}

/**
 * Extract font URLs from CSS files and download them
 */
async function extractAndDownloadFontsFromCss(cssDir, fontsDir, results, timeout) {
  try {
    const files = await fs.readdir(cssDir);
    const cssFiles = files.filter(f => f.endsWith('.css'));

    for (const file of cssFiles) {
      const filePath = path.join(cssDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract font URLs from @font-face rules
      const fontUrlRegex = /url\(["']?([^"')]+\.(woff2?|ttf|otf|eot)[^"')]*?)["']?\)/gi;
      let match;

      while ((match = fontUrlRegex.exec(content)) !== null) {
        const fontUrl = match[1];
        // Handle relative URLs
        if (!fontUrl.startsWith('http')) {
          continue; // Skip relative URLs for now
        }
        await downloadAsset(fontUrl, fontsDir, results, timeout);
      }
    }
  } catch (error) {
    logger.warn('Error extracting fonts from CSS:', error.message);
  }
}

/**
 * Update HTML to use local asset paths
 * @param {string} html - Original HTML content
 * @param {object} assetMapping - Map of original URLs to local paths
 * @param {string} baseAssetsPath - Base path for assets (e.g., './assets')
 * @returns {string} Updated HTML
 */
export function rewriteAssetUrls(html, assetMapping, baseAssetsPath = './assets') {
  let updatedHtml = html;

  for (const [originalUrl, localInfo] of Object.entries(assetMapping)) {
    if (!localInfo || !localInfo.filename) continue;

    // Determine asset type directory
    let assetDir = 'other';
    const ext = path.extname(localInfo.filename).toLowerCase();

    if (ASSET_TYPES.css.includes(ext)) assetDir = 'css';
    else if (ASSET_TYPES.js.includes(ext)) assetDir = 'js';
    else if (ASSET_TYPES.images.includes(ext)) assetDir = 'images';
    else if (ASSET_TYPES.fonts.includes(ext)) assetDir = 'fonts';
    else if (ASSET_TYPES.videos.includes(ext)) assetDir = 'videos';

    const localPath = `${baseAssetsPath}/${assetDir}/${localInfo.filename}`;

    // Escape special regex characters in URL
    const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace all occurrences
    updatedHtml = updatedHtml.replace(new RegExp(escapedUrl, 'g'), localPath);
  }

  return updatedHtml;
}

/**
 * Get asset type from URL or content-type
 */
export function getAssetType(url, contentType = '') {
  const ext = path.extname(new URL(url).pathname).toLowerCase();

  for (const [type, extensions] of Object.entries(ASSET_TYPES)) {
    if (extensions.includes(ext)) return type;
  }

  for (const [typePrefix, assetType] of Object.entries(CONTENT_TYPE_MAP)) {
    if (contentType.includes(typePrefix)) return assetType;
  }

  return 'other';
}
