import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger.js';

/**
 * Rewrite URLs in HTML files from absolute to relative
 */
export async function rewriteUrls(directory, originalUrl, stagingUrl) {
  try {
    const originalDomain = new URL(originalUrl).origin;
    const stagingDomain = new URL(stagingUrl).origin;

    const files = await fs.readdir(directory);
    const htmlFiles = files.filter(f => f.endsWith('.html') || f.endsWith('.htm'));

    logger.info(`Rewriting URLs in ${htmlFiles.length} files`);

    for (const file of htmlFiles) {
      const filePath = path.join(directory, file);
      await rewriteUrlsInFile(filePath, originalDomain, stagingDomain);
    }

    logger.info('URL rewriting completed');

    return {
      success: true,
      filesProcessed: htmlFiles.length
    };

  } catch (error) {
    logger.error('URL rewrite error:', error.message);
    throw new Error(`URL rewrite failed: ${error.message}`);
  }
}

/**
 * Rewrite URLs in a single HTML file
 */
async function rewriteUrlsInFile(filePath, originalDomain, stagingDomain) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');

    // Replace absolute URLs with staging domain
    // Matches: http://example.com or https://example.com
    const domainRegex = new RegExp(originalDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    content = content.replace(domainRegex, stagingDomain);

    // Rewrite common absolute path patterns
    // href="/path" -> href="./path"
    content = content.replace(/href="\/([^\/"])/g, 'href="./$1');
    content = content.replace(/src="\/([^\/"])/g, 'src="./$1');

    // Rewrite protocol-relative URLs
    // //example.com -> https://example.com
    content = content.replace(/\/\/([a-z0-9.-]+)/gi, 'https://$1');

    await fs.writeFile(filePath, content, 'utf-8');

  } catch (error) {
    logger.error(`Failed to rewrite ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Convert absolute URLs to relative within the same domain
 */
export function makeUrlsRelative(html, baseUrl) {
  const base = new URL(baseUrl);

  // Replace absolute URLs from the same domain with relative paths
  const domainRegex = new RegExp(`${base.origin}(/[^"' ]*)`, 'gi');
  html = html.replace(domainRegex, '.$1');

  return html;
}
