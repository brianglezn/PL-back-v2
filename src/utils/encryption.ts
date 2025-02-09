import crypto from 'crypto';

// Ensure that the encryption key is defined in the environment variables
if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY must be defined in environment variables');
}

// Key used for both encryption and decryption   
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
// Encryption algorithm to be used
const ALGORITHM = 'aes-256-cbc';
// Length of the initialization vector (IV) required for the algorithm
const IV_LENGTH = 16;

// Function to generate a valid encryption key
const getEncryptionKey = (): Buffer => {
    // Convert the key from string to a buffer
    const key = Buffer.from(ENCRYPTION_KEY);

    // Ensure the key is exactly 32 bytes (required by AES-256)
    if (key.length !== 32) {
        // Create a SHA-256 hash of the key to ensure it is 32 bytes
        const hash = crypto.createHash('sha256');
        hash.update(ENCRYPTION_KEY);
        // Return the 32-byte hash
        return hash.digest();
    }

    return key;
};

// Encrypts a given plain text string and returns the encrypted format
export const encryptText = (text: string): string => {
    try {
        // Generate a new IV and perform encryption
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = getEncryptionKey();
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        // Return the IV and encrypted text in a combined format
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
        console.error('❌ Error encrypting text:', error);
        throw new Error('Encryption failed');
    }
};

// Decrypts an encrypted string back to plain text
export const decryptText = (text: string): string => {
    try {
        // Attempt to decrypt using the new format
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
            // If the format is not recognized, return the original text
            return text;
        }
    } catch (error) {
        console.error('❌ Error decrypting text:', error);
        return text; // In case of error, return the original text
    }
};

// Encrypts a number by converting it to a string first
export const encryptNumber = (num: number): string => {
    return encryptText(num.toString());
};

// Decrypts an encrypted string back to a number
export const decryptNumber = (encrypted: string): number => {
    const decrypted = decryptText(encrypted);
    return parseFloat(decrypted) || 0; // Return 0 if parsing fails
};
