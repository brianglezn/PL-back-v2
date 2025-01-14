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
        // Generate a random initialization vector
        const iv = crypto.randomBytes(IV_LENGTH);
        // Get the encryption key
        const key = getEncryptionKey();
        // Create the cipher with the algorithm, key, and IV
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // Encrypt the text
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        // Return the IV and encrypted text as a single string
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
        console.error('❌ Error encrypting text:', error);
        throw new Error('Encryption failed');
    }
};

// Decrypts an encrypted string back to plain text
export const decryptText = (text: string): string => {
    try {
        // Split the input into IV and encrypted text
        const [ivHex, encryptedHex] = text.split(':');
        if (!ivHex || !encryptedHex) {
            throw new Error('Invalid encrypted text format');
        }

        // Convert IV and encrypted text from hex to buffers
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');
        // Get the decryption key
        const key = getEncryptionKey();

        // Create the decipher with the algorithm, key, and IV
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        // Decrypt the text
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        // Return the decrypted plain text
        return decrypted.toString();
    } catch (error) {
        console.error('❌ Error decrypting text:', error);
        throw new Error('Decryption failed');
    }
};
