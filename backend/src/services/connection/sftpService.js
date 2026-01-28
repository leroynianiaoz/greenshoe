import SftpClient from 'ssh2-sftp-client';
import { logger } from '../../utils/logger.js';

/**
 * Create and configure an SFTP client
 */
export function createSftpClient() {
  return new SftpClient();
}

/**
 * Connect to SFTP server
 * @param {Object} credentials - SFTP credentials
 * @returns {Promise<SftpClient>} Connected SFTP client
 */
export async function connectSftp(credentials) {
  const { host, port = 22, username, password, privateKey } = credentials;

  if (!host || !username) {
    throw new Error('Missing required SFTP credentials: host and username');
  }

  const sftp = createSftpClient();

  const config = {
    host,
    port,
    username,
    ...(password && { password }),
    ...(privateKey && { privateKey }),
    readyTimeout: 10000, // 10 seconds
    retries: 2
  };

  try {
    await sftp.connect(config);
    logger.info(`SFTP connected to ${host}:${port} as ${username}`);
    return sftp;
  } catch (error) {
    logger.error(`SFTP connection failed to ${host}:${port}:`, error.message);
    throw new Error(`SFTP connection failed: ${error.message}`);
  }
}

/**
 * Test SFTP connection
 */
export async function testSftpConnection(credentials) {
  const sftp = await connectSftp(credentials);

  try {
    // Try to list root directory to verify connection works
    await sftp.list('/');
    await sftp.end();
    return {
      success: true,
      message: 'SFTP connection successful'
    };
  } catch (error) {
    await sftp.end();
    throw new Error(`SFTP connection test failed: ${error.message}`);
  }
}

/**
 * Check if a file exists on SFTP server
 */
export async function fileExists(sftp, remotePath) {
  try {
    const stat = await sftp.stat(remotePath);
    return stat !== false;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a directory exists on SFTP server
 */
export async function directoryExists(sftp, remotePath) {
  try {
    const list = await sftp.list(remotePath);
    return Array.isArray(list);
  } catch (error) {
    return false;
  }
}

/**
 * List files in a directory
 */
export async function listFiles(sftp, remotePath) {
  try {
    const list = await sftp.list(remotePath);
    return list;
  } catch (error) {
    logger.error(`Failed to list files in ${remotePath}:`, error.message);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * Download a file from SFTP server
 */
export async function downloadFile(sftp, remotePath, localPath) {
  try {
    await sftp.get(remotePath, localPath);
    logger.info(`Downloaded ${remotePath} to ${localPath}`);
  } catch (error) {
    logger.error(`Failed to download ${remotePath}:`, error.message);
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

/**
 * Upload a file to SFTP server
 */
export async function uploadFile(sftp, localPath, remotePath) {
  try {
    await sftp.put(localPath, remotePath);
    logger.info(`Uploaded ${localPath} to ${remotePath}`);
  } catch (error) {
    logger.error(`Failed to upload ${localPath}:`, error.message);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Read file content as string
 */
export async function readFileContent(sftp, remotePath) {
  try {
    const buffer = await sftp.get(remotePath);
    return buffer.toString('utf-8');
  } catch (error) {
    logger.error(`Failed to read ${remotePath}:`, error.message);
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

/**
 * Safely disconnect from SFTP server
 */
export async function disconnectSftp(sftp) {
  try {
    await sftp.end();
    logger.info('SFTP disconnected');
  } catch (error) {
    logger.error('SFTP disconnect error:', error.message);
  }
}
