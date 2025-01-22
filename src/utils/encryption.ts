import crypto from 'crypto';

// Validate that the encryption key is defined in the environment variables
if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY must be defined in environment variables');
}

// Constants
// Key used for encryption and decryption   
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
// Encryption algorithm
const ALGORITHM = 'aes-256-cbc';
// Length of the initialization vector (IV)
const IV_LENGTH = 16;

// Function to generate a valid encryption key
const getEncryptionKey = (): Buffer => {
    // Convert the key to a buffer
    const key = Buffer.from(ENCRYPTION_KEY);

    // Ensure the key is 32 bytes (required by AES-256)
    if (key.length !== 32) {
        // Create a SHA-256 hash of the key
        const hash = crypto.createHash('sha256');
        hash.update(ENCRYPTION_KEY);
        // Return the 32-byte hash
        return hash.digest();
    }

    return key;
};

// Encrypts a given plain text string
export const encryptText = (text: string): string => {
    try {
        // Generate new IV and encrypt
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = getEncryptionKey();
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
        console.error('❌ Error encrypting text:', error);
        throw new Error('Encryption failed');
    }
};

// Decrypts an encrypted string back to plain text
export const decryptText = (text: string): string => {
    try {
        // Try to decrypt with the new format
        if (text.includes(':')) {
            const [ivHex, encryptedHex] = text.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const encryptedText = Buffer.from(encryptedHex, 'hex');
            const key = getEncryptionKey();
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return decrypted.toString();
        } else {
            // If it does not have the new format, assume it is the old format
            return text;
        }
    } catch (error) {
        console.error('❌ Error decrypting text:', error);
        return text; // In case of error, return the original text
    }
};
