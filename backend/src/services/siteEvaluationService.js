import puppeteer from 'puppeteer';
import { logger } from '../utils/logger.js';

/**
 * Evaluate a site before pulling to provide insights and recommendations
 * @param {string} url - The URL to evaluate
 * @returns {Promise<object>} Evaluation results
 */
export async function evaluateSite(url) {
  let browser = null;

  try {
    logger.info(`Starting site evaluation for: ${url}`);

    // Validate URL
    const parsedUrl = new URL(url);

    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const startTime = Date.now();

    // Track resources loaded
    const resources = {
      html: [],
      css: [],
      js: [],
      images: [],
      fonts: [],
      other: [],
      failed: []
    };

    let totalSize = 0;

    // Intercept requests to track resources
    page.on('response', async (response) => {
      try {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';
        const status = response.status();

        if (status >= 200 && status < 300) {
          // Successful response
          const buffer = await response.buffer().catch(() => null);
          const size = buffer ? buffer.length : 0;
          totalSize += size;

          const resource = { url, size, type: contentType };

          if (contentType.includes('text/html')) {
            resources.html.push(resource);
          } else if (contentType.includes('text/css')) {
            resources.css.push(resource);
          } else if (contentType.includes('javascript')) {
            resources.js.push(resource);
          } else if (contentType.includes('image')) {
            resources.images.push(resource);
          } else if (contentType.includes('font')) {
            resources.fonts.push(resource);
          } else {
            resources.other.push(resource);
          }
        } else if (status >= 400) {
          resources.failed.push({ url, status, type: contentType });
        }
      } catch (error) {
        // Ignore resource tracking errors
      }
    });

    // Navigate to the page with timeout
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    } catch (error) {
      if (error.name === 'TimeoutError') {
        logger.warn(`Page load timed out for ${url}, continuing with partial data`);
      } else {
        throw error;
      }
    }

    const loadTime = Date.now() - startTime;

    // Extract page information
    const pageInfo = await page.evaluate(() => {
      // Find all internal links
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.href)
        .filter(href => {
          try {
            const linkUrl = new URL(href);
            return linkUrl.origin === window.location.origin;
          } catch {
            return false;
          }
        });

      // Detect platform indicators
      const platformIndicators = {
        wordpress: !!(
          document.querySelector('meta[name="generator"][content*="WordPress"]') ||
          document.querySelector('link[href*="wp-content"]') ||
          document.querySelector('script[src*="wp-includes"]') ||
          document.body.className.includes('wp-')
        ),
        wix: !!(
          document.querySelector('meta[name="generator"][content*="Wix"]') ||
          window.location.hostname.includes('wixsite.com')
        ),
        shopify: !!(
          document.querySelector('meta[name="generator"][content*="Shopify"]') ||
          document.querySelector('script[src*="cdn.shopify.com"]')
        ),
        squarespace: !!(
          document.querySelector('meta[name="generator"][content*="Squarespace"]') ||
          document.body.className.includes('squarespace')
        ),
        react: !!(
          document.querySelector('[data-reactroot]') ||
          document.querySelector('[data-reactid]') ||
          window.React
        ),
        vue: !!(
          document.querySelector('[data-v-]') ||
          window.Vue
        ),
        angular: !!(
          document.querySelector('[ng-version]') ||
          document.querySelector('[ng-app]') ||
          window.angular
        )
      };

      // Check for dynamic content indicators
      const hasDynamicContent = !!(
        document.querySelector('[data-reactroot]') ||
        document.querySelector('[data-v-]') ||
        document.querySelector('[ng-version]') ||
        document.querySelector('[data-vue-]')
      );

      // Extract comprehensive SEO data
      const getMetaContent = (name) => {
        const meta = document.querySelector(`meta[name="${name}"]`) ||
                     document.querySelector(`meta[property="${name}"]`);
        return meta ? meta.getAttribute('content') : null;
      };

      const seoData = {
        // Basic meta
        title: document.title,
        description: getMetaContent('description'),
        keywords: getMetaContent('keywords'),
        author: getMetaContent('author'),
        robots: getMetaContent('robots'),

        // Canonical & URLs
        canonical: document.querySelector('link[rel="canonical"]')?.href || null,

        // Open Graph
        ogTitle: getMetaContent('og:title'),
        ogDescription: getMetaContent('og:description'),
        ogImage: getMetaContent('og:image'),
        ogUrl: getMetaContent('og:url'),
        ogType: getMetaContent('og:type'),
        ogSiteName: getMetaContent('og:site_name'),

        // Twitter Card
        twitterCard: getMetaContent('twitter:card'),
        twitterTitle: getMetaContent('twitter:title'),
        twitterDescription: getMetaContent('twitter:description'),
        twitterImage: getMetaContent('twitter:image'),
        twitterSite: getMetaContent('twitter:site'),

        // Technical
        viewport: getMetaContent('viewport'),
        charset: document.characterSet || document.charset,
        lang: document.documentElement.lang || null,

        // Favicon
        favicon: document.querySelector('link[rel="icon"]')?.href ||
                 document.querySelector('link[rel="shortcut icon"]')?.href || null,
        appleTouchIcon: document.querySelector('link[rel="apple-touch-icon"]')?.href || null,

        // Structured data (JSON-LD)
        structuredData: Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
          .map(script => {
            try {
              return JSON.parse(script.textContent);
            } catch {
              return null;
            }
          })
          .filter(Boolean),

        // Headings structure
        headings: {
          h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()).slice(0, 5),
          h2Count: document.querySelectorAll('h2').length,
          h3Count: document.querySelectorAll('h3').length
        },

        // Images without alt
        imagesWithoutAlt: document.querySelectorAll('img:not([alt]), img[alt=""]').length,
        totalImages: document.querySelectorAll('img').length,

        // Links
        externalLinks: Array.from(document.querySelectorAll('a[href]'))
          .filter(a => {
            try {
              return new URL(a.href).origin !== window.location.origin;
            } catch {
              return false;
            }
          }).length,

        // Hreflang tags
        hreflangTags: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'))
          .map(link => ({
            hreflang: link.getAttribute('hreflang'),
            href: link.href
          }))
      };

      return {
        title: document.title,
        internalLinks: [...new Set(links)].slice(0, 100), // Unique links, max 100
        linkCount: links.length,
        platformIndicators,
        hasDynamicContent,
        hasCanonical: !!seoData.canonical,
        hasMetaDescription: !!seoData.description,
        hasViewport: !!seoData.viewport,
        lang: seoData.lang || 'unknown',
        seoData
      };
    });

    await browser.close();
    browser = null;

    // Analyze results and generate recommendations
    const analysis = analyzeEvaluationResults({
      url,
      loadTime,
      totalSize,
      resources,
      pageInfo
    });

    logger.info(`Site evaluation completed for ${url}`);

    return analysis;

  } catch (error) {
    logger.error(`Site evaluation error for ${url}:`, error.message);

    if (browser) {
      await browser.close().catch(() => {});
    }

    throw new Error(`Failed to evaluate site: ${error.message}`);
  }
}

/**
 * Analyze evaluation results and generate recommendations
 */
function analyzeEvaluationResults({ url, loadTime, totalSize, resources, pageInfo }) {
  const warnings = [];
  const recommendations = [];
  const platformDetected = [];

  // Detect platform
  Object.entries(pageInfo.platformIndicators).forEach(([platform, detected]) => {
    if (detected) {
      platformDetected.push(platform);
    }
  });

  // Check for SPA/dynamic content
  if (pageInfo.hasDynamicContent) {
    warnings.push({
      type: 'dynamic_content',
      severity: 'medium',
      message: 'Site appears to use client-side rendering (React/Vue/Angular)',
      impact: 'Static HTML crawling may not capture dynamic content'
    });
    recommendations.push({
      type: 'crawler_type',
      message: 'Consider using JavaScript-enabled crawler for better accuracy',
      action: 'Enable JavaScript rendering in pull settings'
    });
  }

  // Check for failed resources
  if (resources.failed.length > 0) {
    warnings.push({
      type: 'failed_resources',
      severity: 'low',
      message: `${resources.failed.length} resources failed to load`,
      impact: 'Some assets may be missing in pulled version',
      details: resources.failed.slice(0, 5) // Show first 5
    });
  }

  // Check page size
  const sizeMB = totalSize / (1024 * 1024);
  if (sizeMB > 10) {
    warnings.push({
      type: 'large_page',
      severity: 'low',
      message: `Page size is ${sizeMB.toFixed(2)}MB`,
      impact: 'Large pages may take longer to pull'
    });
  }

  // Check load time
  if (loadTime > 10000) {
    warnings.push({
      type: 'slow_load',
      severity: 'low',
      message: `Page took ${(loadTime / 1000).toFixed(1)}s to load`,
      impact: 'Slow loading sites may timeout during pull'
    });
  }

  // Estimate total pages
  const estimatedPages = Math.min(pageInfo.linkCount, 100);
  const estimatedSize = (totalSize * Math.min(estimatedPages, 50)) / (1024 * 1024);

  // SEO checks
  const seoData = pageInfo.seoData || {};

  if (!pageInfo.hasMetaDescription) {
    recommendations.push({
      type: 'seo',
      message: 'Homepage missing meta description',
      action: 'Consider adding SEO metadata'
    });
  } else if (seoData.description && seoData.description.length < 120) {
    recommendations.push({
      type: 'seo',
      message: `Meta description is short (${seoData.description.length} chars)`,
      action: 'Ideal length is 150-160 characters'
    });
  }

  if (!pageInfo.hasCanonical) {
    recommendations.push({
      type: 'seo',
      message: 'No canonical URL specified',
      action: 'Consider adding canonical tags'
    });
  }

  // Open Graph checks
  if (!seoData.ogTitle || !seoData.ogDescription || !seoData.ogImage) {
    recommendations.push({
      type: 'seo',
      message: 'Missing Open Graph tags for social sharing',
      action: 'Add og:title, og:description, and og:image tags'
    });
  }

  // Twitter Card checks
  if (!seoData.twitterCard) {
    recommendations.push({
      type: 'seo',
      message: 'No Twitter Card meta tags',
      action: 'Add twitter:card meta tag for better Twitter sharing'
    });
  }

  // Heading structure
  if (seoData.headings) {
    if (seoData.headings.h1.length === 0) {
      warnings.push({
        type: 'seo_headings',
        severity: 'medium',
        message: 'No H1 heading found on page',
        impact: 'H1 is important for SEO and accessibility'
      });
    } else if (seoData.headings.h1.length > 1) {
      warnings.push({
        type: 'seo_headings',
        severity: 'low',
        message: `Multiple H1 headings found (${seoData.headings.h1.length})`,
        impact: 'Best practice is to have a single H1 per page'
      });
    }
  }

  // Images without alt
  if (seoData.imagesWithoutAlt > 0) {
    const percentage = Math.round((seoData.imagesWithoutAlt / seoData.totalImages) * 100);
    warnings.push({
      type: 'seo_accessibility',
      severity: percentage > 50 ? 'medium' : 'low',
      message: `${seoData.imagesWithoutAlt} of ${seoData.totalImages} images missing alt text (${percentage}%)`,
      impact: 'Alt text improves SEO and accessibility'
    });
  }

  // Robots meta
  if (seoData.robots && (seoData.robots.includes('noindex') || seoData.robots.includes('nofollow'))) {
    warnings.push({
      type: 'seo_robots',
      severity: 'high',
      message: `Robots meta contains: ${seoData.robots}`,
      impact: 'Page may not be indexed by search engines'
    });
  }

  // Determine crawl strategy
  let crawlStrategy = 'static';
  if (pageInfo.hasDynamicContent) {
    crawlStrategy = 'javascript';
  }

  // Calculate accuracy score (0-100)
  let accuracyScore = 100;
  if (pageInfo.hasDynamicContent) accuracyScore -= 20;
  if (resources.failed.length > 0) accuracyScore -= Math.min(resources.failed.length * 2, 20);
  if (platformDetected.includes('wix') || platformDetected.includes('squarespace')) accuracyScore -= 15;

  return {
    url,
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      title: pageInfo.title,
      loadTime: `${(loadTime / 1000).toFixed(1)}s`,
      pageSize: `${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
      internalLinks: pageInfo.linkCount,
      estimatedPages,
      estimatedSize: `${estimatedSize.toFixed(2)}MB`,
      platform: platformDetected.length > 0 ? platformDetected.join(', ') : 'Unknown',
      hasDynamicContent: pageInfo.hasDynamicContent,
      accuracyScore,
      crawlStrategy
    },
    resources: {
      html: resources.html.length,
      css: resources.css.length,
      javascript: resources.js.length,
      images: resources.images.length,
      fonts: resources.fonts.length,
      other: resources.other.length,
      failed: resources.failed.length,
      total: resources.html.length + resources.css.length + resources.js.length +
             resources.images.length + resources.fonts.length + resources.other.length
    },
    warnings,
    recommendations,
    seo: {
      // Basic checks (for quick status display)
      hasMetaDescription: pageInfo.hasMetaDescription,
      hasCanonical: pageInfo.hasCanonical,
      hasViewport: pageInfo.hasViewport,
      lang: pageInfo.lang,

      // Full SEO data
      title: pageInfo.seoData?.title || null,
      description: pageInfo.seoData?.description || null,
      keywords: pageInfo.seoData?.keywords || null,
      canonical: pageInfo.seoData?.canonical || null,
      robots: pageInfo.seoData?.robots || null,

      // Open Graph
      openGraph: {
        title: pageInfo.seoData?.ogTitle || null,
        description: pageInfo.seoData?.ogDescription || null,
        image: pageInfo.seoData?.ogImage || null,
        url: pageInfo.seoData?.ogUrl || null,
        type: pageInfo.seoData?.ogType || null,
        siteName: pageInfo.seoData?.ogSiteName || null
      },

      // Twitter Card
      twitter: {
        card: pageInfo.seoData?.twitterCard || null,
        title: pageInfo.seoData?.twitterTitle || null,
        description: pageInfo.seoData?.twitterDescription || null,
        image: pageInfo.seoData?.twitterImage || null,
        site: pageInfo.seoData?.twitterSite || null
      },

      // Technical
      charset: pageInfo.seoData?.charset || null,
      viewport: pageInfo.seoData?.viewport || null,
      favicon: pageInfo.seoData?.favicon || null,
      appleTouchIcon: pageInfo.seoData?.appleTouchIcon || null,

      // Content analysis
      headings: pageInfo.seoData?.headings || null,
      imagesWithoutAlt: pageInfo.seoData?.imagesWithoutAlt || 0,
      totalImages: pageInfo.seoData?.totalImages || 0,
      externalLinks: pageInfo.seoData?.externalLinks || 0,

      // Structured data
      structuredData: pageInfo.seoData?.structuredData || [],
      hreflangTags: pageInfo.seoData?.hreflangTags || []
    }
  };
}
