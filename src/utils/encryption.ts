import crypto from 'crypto';

if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY must be defined in environment variables');
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const getEncryptionKey = (): Buffer => {
    const key = Buffer.from(ENCRYPTION_KEY);
    if (key.length !== 32) {
        const hash = crypto.createHash('sha256');
        hash.update(ENCRYPTION_KEY);
        return hash.digest();
    }
    return key;
};

export const encryptText = (text: string): string => {
    try {
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

export const decryptText = (text: string): string => {
    try {
        const [ivHex, encryptedHex] = text.split(':');
        if (!ivHex || !encryptedHex) {
            throw new Error('Invalid encrypted text format');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');
        const key = getEncryptionKey();
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString();
    } catch (error) {
        console.error('❌ Error decrypting text:', error);
        throw new Error('Decryption failed');
    }
}; 