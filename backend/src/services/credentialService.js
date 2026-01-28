import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16 bytes
const AUTH_TAG_LENGTH = 16; // Authentication tag length for GCM
const SALT_LENGTH = 64; // Salt for key derivation

// Get master key from environment
const MASTER_KEY = process.env.ENCRYPTION_KEY;

if (!MASTER_KEY || MASTER_KEY === 'your-64-character-hex-encryption-key-change-in-production') {
  logger.warn('WARNING: Using default encryption key. Generate a secure key for production!');
  logger.warn('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

/**
 * Derive an encryption key from the master key
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 */
function deriveKey(salt) {
  // Use the master key as-is for now (in production, use proper key derivation)
  const keyBuffer = Buffer.from(MASTER_KEY || 'default-key-for-development-only-change-this', 'utf-8');

  // Ensure key is exactly 32 bytes for AES-256
  return crypto.createHash('sha256').update(keyBuffer).update(salt).digest();
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @returns {string} Encrypted data (base64 encoded: salt:iv:authTag:ciphertext)
 */
export function encrypt(plaintext) {
  try {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty data');
    }

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive encryption key
    const key = deriveKey(salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine salt, IV, auth tag, and ciphertext
    const result = [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted
    ].join(':');

    return result;
  } catch (error) {
    logger.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Encrypted data (base64 encoded: salt:iv:authTag:ciphertext)
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedData) {
  try {
    if (!encryptedData) {
      throw new Error('Cannot decrypt empty data');
    }

    // Split the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [saltB64, ivB64, authTagB64, encrypted] = parts;

    // Decode from base64
    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    // Derive decryption key
    const key = deriveKey(salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Redact sensitive data from logs
 * @param {Object} data - Data object that may contain credentials
 * @returns {Object} Data with credentials redacted
 */
export function redactCredentials(data) {
  const sensitiveFields = [
    'password',
    'credentials',
    'encryptedCredentials',
    'passwordHash',
    'token',
    'apiKey',
    'secret'
  ];

  const redacted = { ...data };

  for (const field of sensitiveFields) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }

  return redacted;
}

/**
 * Test the encryption/decryption functionality
 * @returns {boolean} True if test passes
 */
export function testEncryption() {
  try {
    const testData = 'Test sensitive data: password123!@#';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);

    if (testData !== decrypted) {
      throw new Error('Decrypted data does not match original');
    }

    logger.info('Encryption test passed');
    return true;
  } catch (error) {
    logger.error('Encryption test failed:', error.message);
    return false;
  }
}
