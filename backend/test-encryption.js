import 'dotenv/config';
import { encrypt, decrypt, testEncryption } from './src/services/credentialService.js';

console.log('Testing credential encryption service...\n');

// Test 1: Basic encryption/decryption
console.log('Test 1: Basic encryption/decryption');
const testPassword = 'MySecurePassword123!@#';
console.log('Original:', testPassword);

const encrypted = encrypt(testPassword);
console.log('Encrypted:', encrypted);

const decrypted = decrypt(encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', testPassword === decrypted ? '✅' : '❌');
console.log();

// Test 2: Different inputs produce different ciphertexts
console.log('Test 2: Different inputs produce different ciphertexts');
const enc1 = encrypt('password1');
const enc2 = encrypt('password1');
console.log('Encryption 1:', enc1.substring(0, 50) + '...');
console.log('Encryption 2:', enc2.substring(0, 50) + '...');
console.log('Different ciphertexts:', enc1 !== enc2 ? '✅' : '❌');
console.log();

// Test 3: JSON credentials
console.log('Test 3: JSON credentials');
const credentials = {
  host: 'ftp.example.com',
  username: 'admin',
  password: 'secret123',
  port: 21
};
const jsonString = JSON.stringify(credentials);
const encryptedJson = encrypt(jsonString);
const decryptedJson = decrypt(encryptedJson);
const parsedCreds = JSON.parse(decryptedJson);
console.log('Original:', credentials);
console.log('Decrypted:', parsedCreds);
console.log('Match:', JSON.stringify(credentials) === JSON.stringify(parsedCreds) ? '✅' : '❌');
console.log();

// Test 4: Run built-in test
console.log('Test 4: Built-in encryption test');
const testResult = testEncryption();
console.log('Result:', testResult ? '✅ PASS' : '❌ FAIL');
console.log();

console.log('All encryption tests completed!');
