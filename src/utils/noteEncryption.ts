import { encryptText, decryptText } from './encryption';
import type { INote } from '../types/models/INote';

/**
 * Encripta una nota completa.
 */
export const encryptNote = (note: Partial<INote> & { title?: string; content?: string }): Partial<INote> => {
    return {
        ...note,
        title: note.title ? encryptText(note.title) : encryptText('New Note'),
        content: note.content ? encryptText(note.content) : ''
    };
};

/**
 * Desencripta una nota completa.
 */
export const decryptNote = (note: INote): INote & { title: string; content: string } => {
    return {
        ...note,
        title: note.title ? decryptText(note.title) : 'Untitled',
        content: note.content ? decryptText(note.content) : ''
    };
};

/**
 * Desencripta un array de notas.
 */
export const decryptNotes = (notes: INote[]): (INote & { title: string; content: string })[] => {
    return notes.map(decryptNote);
}; 