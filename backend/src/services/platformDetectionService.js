import { connectSftp, disconnectSftp, fileExists, directoryExists, readFileContent } from './connection/sftpService.js';
import { logger } from '../utils/logger.js';

/**
 * Detect platform type by checking for WordPress-specific files and directories
 */
export async function detectPlatform(credentials, remotePath = '/') {
  let sftp = null;

  try {
    sftp = await connectSftp(credentials);

    // Check for WordPress indicators
    const isWordPress = await isWordPressSite(sftp, remotePath);
    if (isWordPress) {
      logger.info('Platform detected: WordPress');
      return {
        platformType: 'wordpress',
        confidence: 'high',
        indicators: {
          wpConfig: await fileExists(sftp, `${remotePath}/wp-config.php`),
          wpContent: await directoryExists(sftp, `${remotePath}/wp-content`),
          wpIncludes: await directoryExists(sftp, `${remotePath}/wp-includes`),
          wpAdmin: await directoryExists(sftp, `${remotePath}/wp-admin`)
        }
      };
    }

    // Check for other CMS indicators
    const joomlaCheck = await isJoomlaSite(sftp, remotePath);
    if (joomlaCheck) {
      logger.info('Platform detected: Joomla');
      return {
        platformType: 'joomla',
        confidence: 'high',
        indicators: joomlaCheck
      };
    }

    const drupalCheck = await isDrupalSite(sftp, remotePath);
    if (drupalCheck) {
      logger.info('Platform detected: Drupal');
      return {
        platformType: 'drupal',
        confidence: 'medium',
        indicators: drupalCheck
      };
    }

    // Default to static HTML
    logger.info('Platform detected: Static HTML');
    return {
      platformType: 'static',
      confidence: 'low',
      indicators: {
        note: 'No CMS detected, assuming static HTML'
      }
    };

  } catch (error) {
    logger.error('Platform detection error:', error.message);
    throw new Error(`Platform detection failed: ${error.message}`);
  } finally {
    if (sftp) {
      await disconnectSftp(sftp);
    }
  }
}

/**
 * Check if site is WordPress
 */
async function isWordPressSite(sftp, basePath) {
  try {
    // WordPress signature files/directories
    const wpConfig = await fileExists(sftp, `${basePath}/wp-config.php`);
    const wpContent = await directoryExists(sftp, `${basePath}/wp-content`);
    const wpIncludes = await directoryExists(sftp, `${basePath}/wp-includes`);

    // At least wp-config.php or wp-content should exist
    return wpConfig || (wpContent && wpIncludes);
  } catch (error) {
    return false;
  }
}

/**
 * Check if site is Joomla
 */
async function isJoomlaSite(sftp, basePath) {
  try {
    const configFile = await fileExists(sftp, `${basePath}/configuration.php`);
    const administratorDir = await directoryExists(sftp, `${basePath}/administrator`);
    const librariesDir = await directoryExists(sftp, `${basePath}/libraries`);

    if (configFile && administratorDir && librariesDir) {
      return {
        configurationPhp: configFile,
        administrator: administratorDir,
        libraries: librariesDir
      };
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Check if site is Drupal
 */
async function isDrupalSite(sftp, basePath) {
  try {
    const sitesDir = await directoryExists(sftp, `${basePath}/sites`);
    const modulesDir = await directoryExists(sftp, `${basePath}/modules`);
    const themesDir = await directoryExists(sftp, `${basePath}/themes`);
    const coreDir = await directoryExists(sftp, `${basePath}/core`);

    if (sitesDir && (modulesDir || coreDir)) {
      return {
        sites: sitesDir,
        modules: modulesDir,
        themes: themesDir,
        core: coreDir
      };
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Get WordPress version if it's a WordPress site
 */
export async function getWordPressVersion(credentials, remotePath = '/') {
  let sftp = null;

  try {
    sftp = await connectSftp(credentials);

    const versionFile = `${remotePath}/wp-includes/version.php`;
    const exists = await fileExists(sftp, versionFile);

    if (!exists) {
      return null;
    }

    const content = await readFileContent(sftp, versionFile);

    // Parse version from file
    const versionMatch = content.match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);
    if (versionMatch) {
      return versionMatch[1];
    }

    return null;
  } catch (error) {
    logger.error('Failed to get WordPress version:', error.message);
    return null;
  } finally {
    if (sftp) {
      await disconnectSftp(sftp);
    }
  }
}

/**
 * Get WordPress database configuration
 */
export async function getWordPressDbConfig(credentials, remotePath = '/') {
  let sftp = null;

  try {
    sftp = await connectSftp(credentials);

    const configFile = `${remotePath}/wp-config.php`;
    const exists = await fileExists(sftp, configFile);

    if (!exists) {
      return null;
    }

    const content = await readFileContent(sftp, configFile);

    // Parse database configuration (basic extraction)
    const config = {
      dbName: extractConfigValue(content, 'DB_NAME'),
      dbUser: extractConfigValue(content, 'DB_USER'),
      dbHost: extractConfigValue(content, 'DB_HOST'),
      tablePrefix: extractTablePrefix(content)
    };

    return config;
  } catch (error) {
    logger.error('Failed to get WordPress DB config:', error.message);
    return null;
  } finally {
    if (sftp) {
      await disconnectSftp(sftp);
    }
  }
}

/**
 * Extract configuration value from wp-config.php
 */
function extractConfigValue(content, key) {
  const regex = new RegExp(`define\\s*\\(\\s*['"]${key}['"]\\s*,\\s*['"]([^'"]+)['"]`, 'i');
  const match = content.match(regex);
  return match ? match[1] : null;
}

/**
 * Extract table prefix from wp-config.php
 */
function extractTablePrefix(content) {
  const regex = /\$table_prefix\s*=\s*['"]([^'"]+)['"]/;
  const match = content.match(regex);
  return match ? match[1] : 'wp_';
}
