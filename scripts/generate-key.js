#!/usr/bin/env node
/**
 * CLI key generator (Node.js)
 * Usage: node generate-key.js [prefix] [pattern] [count]
 * Example: node generate-key.js PAN X8-X4-X4 5
 */

function generateKey(prefix, pattern) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const nums = '0123456789';
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const parts = pattern.split('-');
  let key = prefix;
  for (const part of parts) {
    const len = parseInt(part.replace(/[^0-9]/g, ''), 10) || 4;
    const type = part.replace(/[0-9]/g, '');
    const pool = type === 'N' ? nums : type === 'A' ? letters : chars;
    let random = '';
    for (let i = 0; i < len; i++) {
      random += pool[Math.floor(Math.random() * pool.length)];
    }
    key += '-' + random;
  }
  return key;
}

const prefix  = process.argv[2] || 'PAN';
const pattern = process.argv[3] || 'X8-X4-X4';
let count     = parseInt(process.argv[4], 10) || 1;
if (count < 1) count = 1;
if (count > 100) count = 100;

for (let i = 0; i < count; i++) {
  console.log(generateKey(prefix, pattern));
}
