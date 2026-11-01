// Key generation utility

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const NUMS = '0123456789';
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateKey(prefix: string, pattern: string): string {
  const parts = pattern.split('-');
  let key = prefix;
  for (const part of parts) {
    const len = parseInt(part.replace(/[^0-9]/g, ''), 10) || 4;
    const type = part.replace(/[0-9]/g, '');
    const pool = type === 'N' ? NUMS : type === 'A' ? LETTERS : CHARS;
    let random = '';
    for (let i = 0; i < len; i++) {
      random += pool[Math.floor(Math.random() * pool.length)];
    }
    key += '-' + random;
  }
  return key;
}

export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'Tk-';
  for (let i = 0; i < 16; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}
