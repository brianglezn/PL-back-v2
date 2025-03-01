import { encryptText, decryptNumber } from './encryption';
import type { IAccount, IYearRecord, YearRecord } from '../types/models/IAccount';

/**
 * Crea un registro anual encriptado con todos los valores en 0.
 */
export const createEncryptedYearRecord = (): IYearRecord => {
    return {
        jan: encryptText('0'),
        feb: encryptText('0'),
        mar: encryptText('0'),
        apr: encryptText('0'),
        may: encryptText('0'),
        jun: encryptText('0'),
        jul: encryptText('0'),
        aug: encryptText('0'),
        sep: encryptText('0'),
        oct: encryptText('0'),
        nov: encryptText('0'),
        dec: encryptText('0')
    };
};

/**
 * Desencripta un registro anual.
 */
export const decryptYearRecord = (yearRecord: IYearRecord): YearRecord => {
    return {
        jan: decryptNumber(yearRecord.jan),
        feb: decryptNumber(yearRecord.feb),
        mar: decryptNumber(yearRecord.mar),
        apr: decryptNumber(yearRecord.apr),
        may: decryptNumber(yearRecord.may),
        jun: decryptNumber(yearRecord.jun),
        jul: decryptNumber(yearRecord.jul),
        aug: decryptNumber(yearRecord.aug),
        sep: decryptNumber(yearRecord.sep),
        oct: decryptNumber(yearRecord.oct),
        nov: decryptNumber(yearRecord.nov),
        dec: decryptNumber(yearRecord.dec)
    };
};

/**
 * Encripta un registro anual completo.
 */
export const encryptYearRecord = (yearRecord: YearRecord): IYearRecord => {
    return {
        jan: encryptText(yearRecord.jan.toString()),
        feb: encryptText(yearRecord.feb.toString()),
        mar: encryptText(yearRecord.mar.toString()),
        apr: encryptText(yearRecord.apr.toString()),
        may: encryptText(yearRecord.may.toString()),
        jun: encryptText(yearRecord.jun.toString()),
        jul: encryptText(yearRecord.jul.toString()),
        aug: encryptText(yearRecord.aug.toString()),
        sep: encryptText(yearRecord.sep.toString()),
        oct: encryptText(yearRecord.oct.toString()),
        nov: encryptText(yearRecord.nov.toString()),
        dec: encryptText(yearRecord.dec.toString())
    };
};

/**
 * Desencripta todos los registros de una cuenta.
 */
export const decryptAccountRecords = (account: IAccount): Record<string, YearRecord> => {
    return Object.entries(account.records).reduce((acc, [year, yearRecord]) => ({
        ...acc,
        [year]: decryptYearRecord(yearRecord)
    }), {});
}; 