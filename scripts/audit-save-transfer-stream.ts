/* 20 Nov 2026 (Hotfix 4, iPhone pass: importing a 64 MB career sometimes took the web view down). Save transfer now
   signs and fingerprints data by walking it and hashing as it goes, instead of building its whole stable text. Every
   signature and fingerprint must stay byte-for-byte what it was, or every transfer file ever made would be refused:
   - tricky values (sparse arrays, undefined, functions, NaN/Infinity/-0, unicode, emoji, lone surrogates, text far
     longer than one hashing chunk) against Node's crypto over the old stableStringify text;
   - real transfer files given as AE_TRANSFER_FILES (the 64 MB iPhone export, an Android-made copy, an edited copy): the
     signed ones are accepted, the edited one is refused, and the file text is let go after parsing. */
import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { __saveTransferTest } from '../services/saveTransfer';

const { stableStringify, signBody, hashTransferValue, parseArchive } = __saveTransferTest;
const SECRET = 'actor-empire-android-transfer-v1:7e74c91f4f2b4a2d9e0b0a8b2c1d6f35';
const b64url = (buffer: Buffer) => buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const oldSignature = (value: unknown) => b64url(createHmac('sha256', SECRET).update(Buffer.from(stableStringify(value), 'utf8')).digest());
const oldFingerprint = (value: unknown) => b64url(createHash('sha256').update(Buffer.from(stableStringify(value), 'utf8')).digest());

let checks = 0;
const same = async (label: string, value: unknown) => {
    assert.equal(await signBody(value as never), oldSignature(value), `signature: ${label}`);
    assert.equal(await hashTransferValue(value), oldFingerprint(value), `fingerprint: ${label}`);
    checks += 2;
};

const run = async () => {
    // eslint-disable-next-line no-sparse-arrays
    const sparse = [1, , 3, , , 'x'];
    const withHoles: unknown[] = new Array(5); withHoles[2] = { a: 1 };
    const cases: Array<[string, unknown]> = [
        ['null', null], ['undefined', undefined], ['number', 42.5], ['negative zero', -0], ['NaN', NaN], ['Infinity', -Infinity],
        ['true', true], ['empty string', ''], ['quotes', 'he said "hi"\n\t\\'], ['unicode', 'Ünïcødé ₹ 🎬   \u0000'],
        ['lone surrogate', 'a\uD800b'], ['emoji keys', { '🎬': 1, 'é': 2, a: 3, B: 4 }],
        ['sparse array', sparse], ['array with holes', withHoles], ['undefined in arrays', [undefined, null, () => 1]],
        ['functions and undefined in objects', { a: undefined, b: () => 1, c: 1, d: [undefined] }],
        ['nested', { z: [{ y: { x: [1, 'two', { w: null }] } }], a: { b: { c: { d: 'deep' } } } }],
        ['date', { when: new Date(0) }],
        ['long text', { text: 'x'.repeat(200_000) + '🎬'.repeat(40_000) }],
        ['many keys', Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`k${(i * 7919) % 5000}`, i % 3 ? i : `v${i}`]))],
    ];
    for (const [label, value] of cases) await same(label, value);
    for (let round = 0; round < 50; round += 1) {
        const bytes = randomBytes(64);
        const value = { round, blob: bytes.toString('base64'), list: Array.from(bytes).map(byte => (byte % 5 === 0 ? undefined : byte % 7 === 0 ? String.fromCharCode(0xd800 + byte) : byte)), nested: { [bytes.toString('hex').slice(0, 8)]: round } };
        await same(`random ${round}`, value);
    }

    const files = (process.env.AE_TRANSFER_FILES || '').split(',').filter(Boolean);
    for (const file of files) {
        if (!existsSync(file)) throw new Error(`missing ${file}`);
        const text = readFileSync(file, 'utf8');
        const holder = { text: text as string | null };
        const edited = /edited/.test(file);
        try {
            const archive = await parseArchive(holder);
            assert.ok(!edited, `${file}: an edited file must be refused`);
            const { signature, ...body } = archive;
            assert.equal(signature.value, oldSignature(body), `${file}: the file's signature is what the old way computes`);
            assert.equal(holder.text, null, `${file}: the text is let go after parsing`);
            console.log(`accepted ${file.split('/').pop()} (${Math.round(text.length / 1e5) / 10} MB)`);
        } catch (error) {
            if (!edited) throw error;
            assert.match(String((error as Error).message), /edited or is corrupted/);
            console.log(`refused ${file.split('/').pop()} as edited`);
        }
        checks += 1;
    }
    console.log(`save transfer stream audit passed (${checks} checks)`);
};
run().catch(error => { console.error(error); process.exit(1); });
