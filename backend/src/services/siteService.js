import { encrypt, decrypt } from './credentialService.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/db.js';

/**
 * Create a URL-friendly slug from a site name
 */
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate connection type
 */
function isValidConnectionType(type) {
  return ['sftp', 'ssh', 'crawl-only'].includes(type);
}

/**
 * Validate site status
 */
function isValidStatus(status) {
  return ['NEVER_PULLED', 'PULLING', 'ACTIVE', 'PUSHING', 'ERROR'].includes(status);
}

/**
 * Create a new site
 */
export async function createSite({ name, liveUrl, connectionType, credentials, encryptedCredentials: preEncryptedCredentials, platformType, userId }) {
  // Validation
  if (!name || !liveUrl || !connectionType || !userId) {
    throw new Error('Missing required fields: name, liveUrl, connectionType');
  }

  if (!isValidConnectionType(connectionType)) {
    throw new Error(`Invalid connection type: ${connectionType}`);
  }

  // Generate slug
  const slug = createSlug(name);

  // Check if slug already exists
  const existing = await prisma.site.findUnique({ where: { slug } });
  if (existing) {
    throw new Error(`Site with slug "${slug}" already exists`);
  }

  // Handle credentials - either encrypt plain credentials or use pre-encrypted ones
  let encryptedCredentials = preEncryptedCredentials || null;
  if (credentials && connectionType !== 'crawl-only') {
    try {
      encryptedCredentials = encrypt(JSON.stringify(credentials));
    } catch (error) {
      logger.error('Failed to encrypt credentials:', error.message);
      throw new Error('Failed to encrypt credentials');
    }
  }

  // Create site
  const site = await prisma.site.create({
    data: {
      name,
      slug,
      liveUrl,
      connectionType,
      encryptedCredentials,
      platformType: platformType || null,
      createdById: userId,
      status: 'NEVER_PULLED'
    }
  });

  logger.info(`Site created: ${site.name} (${site.slug}) by user ${userId}`);

  // Return site (encryptedCredentials are safe to return as they're encrypted)
  return site;
}

/**
 * Get all sites
 */
export async function getAllSites(userId, userRole) {
  // All authenticated users can view all sites
  const sites = await prisma.site.findMany({
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Return sites (encryptedCredentials are safe to return as they're encrypted)
  return sites;
}

/**
 * Get a single site by ID
 */
export async function getSiteById(siteId, userId, userRole) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    }
  });

  if (!site) {
    throw new Error('Site not found');
  }

  // All authenticated users can view all sites
  // RBAC permissions are enforced for operations (pull, push, etc.)

  // Return site (encryptedCredentials are safe to return as they're encrypted)
  return site;
}

/**
 * Get decrypted credentials for a site (internal use only)
 */
export async function getSiteCredentials(siteId) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { encryptedCredentials: true, connectionType: true }
  });

  if (!site) {
    throw new Error('Site not found');
  }

  if (!site.encryptedCredentials) {
    return null;
  }

  try {
    const decrypted = decrypt(site.encryptedCredentials);
    return JSON.parse(decrypted);
  } catch (error) {
    logger.error(`Failed to decrypt credentials for site ${siteId}:`, error.message);
    throw new Error('Failed to decrypt credentials');
  }
}

/**
 * Update a site
 */
export async function updateSite(siteId, updates, userId, userRole) {
  const site = await prisma.site.findUnique({
    where: { id: siteId }
  });

  if (!site) {
    throw new Error('Site not found');
  }

  // Developers can only update their own sites
  if (userRole === 'DEVELOPER' && site.createdById !== userId) {
    throw new Error('Access denied');
  }

  // Validate updates
  if (updates.connectionType && !isValidConnectionType(updates.connectionType)) {
    throw new Error(`Invalid connection type: ${updates.connectionType}`);
  }

  if (updates.status && !isValidStatus(updates.status)) {
    throw new Error(`Invalid status: ${updates.status}`);
  }

  // Handle credential updates
  if (updates.credentials !== undefined) {
    if (updates.credentials === null) {
      updates.encryptedCredentials = null;
    } else {
      try {
        updates.encryptedCredentials = encrypt(JSON.stringify(updates.credentials));
      } catch (error) {
        logger.error('Failed to encrypt credentials:', error.message);
        throw new Error('Failed to encrypt credentials');
      }
    }
    delete updates.credentials;
  }

  // Update slug if name changed
  if (updates.name && updates.name !== site.name) {
    updates.slug = createSlug(updates.name);

    // Check if new slug conflicts
    const existing = await prisma.site.findUnique({ where: { slug: updates.slug } });
    if (existing && existing.id !== siteId) {
      throw new Error(`Site with slug "${updates.slug}" already exists`);
    }
  }

  // Perform update
  const updatedSite = await prisma.site.update({
    where: { id: siteId },
    data: updates
  });

  logger.info(`Site updated: ${updatedSite.name} (${updatedSite.slug})`);

  // Remove encrypted credentials from response
  const { encryptedCredentials: _, ...siteWithoutCredentials } = updatedSite;
  return siteWithoutCredentials;
}

/**
 * Delete a site (Admin only)
 */
export async function deleteSite(siteId, userId, userRole) {
  if (userRole !== 'ADMIN') {
    throw new Error('Only admins can delete sites');
  }

  const site = await prisma.site.findUnique({
    where: { id: siteId }
  });

  if (!site) {
    throw new Error('Site not found');
  }

  await prisma.site.delete({
    where: { id: siteId }
  });

  logger.info(`Site deleted: ${site.name} (${site.slug}) by user ${userId}`);

  return { message: 'Site deleted successfully' };
}

/**
 * Update site platform type (internal use)
 */
export async function updateSitePlatform(siteId, platformType) {
  const site = await prisma.site.update({
    where: { id: siteId },
    data: { platformType }
  });

  logger.info(`Site platform updated: ${site.name} -> ${platformType}`);
  return site;
}

/**
 * Update site status (internal use)
 */
export async function updateSiteStatus(siteId, status) {
  if (!isValidStatus(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const site = await prisma.site.update({
    where: { id: siteId },
    data: { status }
  });

  logger.info(`Site status updated: ${site.name} -> ${status}`);
  return site;
}
