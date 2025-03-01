import { encryptNumber, decryptNumber } from './encryption';
import type { ITransaction } from '../types/models/ITransaction';

/**
 * Encrypts the 'amount' field of a transaction object.
 * @param transaction A transaction object containing an 'amount' as a number.
 * @returns A transaction object with the 'amount' field encrypted as a string.
 */
export const encryptTransactionAmount = (transaction: Partial<ITransaction> & { amount: number }): Partial<ITransaction> => {
    return {
        ...transaction,
        amount: encryptNumber(transaction.amount)
    };
};

/**
 * Decrypts the 'amount' field of a transaction object.
 * @param transaction A transaction object with the 'amount' field encrypted as a string.
 * @returns A transaction object with the 'amount' field decrypted back to a number.
 */
export const decryptTransactionAmount = (transaction: any): any => {
    if (transaction && typeof transaction.amount === 'string') {
        return {
            ...transaction,
            amount: decryptNumber(transaction.amount)
        };
    }
    return transaction;
};

/**
 * Decrypts the 'amount' fields of an array of transaction objects.
 * @param transactions An array of transaction objects with 'amount' fields encrypted.
 * @returns An array of transaction objects with 'amount' fields decrypted back to numbers.
 */
export const decryptTransactionsAmounts = (transactions: any[]): any[] => {
    return transactions.map(decryptTransactionAmount);
};

/**
 * Encrypts a numeric value for secure storage in the database.
 * @param amount A numeric value that needs to be encrypted.
 * @returns The encrypted value represented as a string.
 */
export const encryptAmount = (amount: number): string => {
    return encryptNumber(amount);
};

/**
 * Decrypts an encrypted value back to its original numeric form.
 * @param encryptedAmount The encrypted value represented as a string.
 * @returns The decrypted numeric value.
 */
export const decryptAmount = (encryptedAmount: string): number => {
    return decryptNumber(encryptedAmount);
}; 