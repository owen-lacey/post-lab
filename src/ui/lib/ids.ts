import { customAlphabet } from 'nanoid';

/** A new item ID: 8 characters from 0-9 and a-z, matching `ID_PATTERN`. */
export const newItemId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);
