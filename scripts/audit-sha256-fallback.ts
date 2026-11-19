/* 19 Nov 2026: services/sha256Fallback.ts must give exactly what Web Crypto gives (it signs save transfer files on a web
   view without crypto.subtle). Checked against Node's crypto: every length around the 64-byte block edges, random data,
   unicode, a long key, and a 30 MB message. */
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { hmacSha256Fallback, sha256Fallback } from '../services/sha256Fallback';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
let checks = 0;
const same = (label: string, a: string, b: string) => { checks++; if (a !== b) { console.error(`FAIL ${label}: ${a} != ${b}`); process.exit(1); } };
const key = new TextEncoder().encode('actor-empire-android-transfer-v1:7e74c91f4f2b4a2d9e0b0a8b2c1d6f35');
for (let length = 0; length <= 300; length++) {
  const data = new Uint8Array(randomBytes(length));
  same(`sha256 ${length}`, hex(sha256Fallback(data)), createHash('sha256').update(data).digest('hex'));
  same(`hmac ${length}`, hex(hmacSha256Fallback(key, data)), createHmac('sha256', key).update(data).digest('hex'));
}
const unicode = new TextEncoder().encode('Ünïcødé ₹ 🎬 actor "empire"   end');
same('unicode', hex(hmacSha256Fallback(key, unicode)), createHmac('sha256', key).update(unicode).digest('hex'));
const longKey = new Uint8Array(randomBytes(200));
same('long key', hex(hmacSha256Fallback(longKey, unicode)), createHmac('sha256', longKey).update(unicode).digest('hex'));
const big = new Uint8Array(randomBytes(30 * 1024 * 1024 + 13));
const t0 = Date.now();
const mine = hex(hmacSha256Fallback(key, big));
const ms = Date.now() - t0;
same('30 MB', mine, createHmac('sha256', key).update(big).digest('hex'));
console.log(`sha256 fallback audit passed (${checks} checks; 30 MB HMAC in ${ms} ms).`);
