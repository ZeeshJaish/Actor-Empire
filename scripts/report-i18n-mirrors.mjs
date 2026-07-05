#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const localeDir = path.join(root, 'services/localization/locales');
const languages = ['pt-BR', 'fr', 'es', 'tr', 'de'];
const prefixes = [
  'nav',
  'home',
  'career',
  'improve',
  'connections',
  'mobile',
  'messages',
  'forbes',
  'box',
  'stocks',
  'team',
  'bank',
  'imdb',
  'dating',
  'luxe',
  'instagram',
  'x',
  'youtube',
  'settings',
  'guide',
  'lifestyle',
  'activities',
  'developmentLab',
  'production',
  'store',
  'castLink',
];

const parseEntries = (language) => {
  const source = fs.readFileSync(path.join(localeDir, `${language}.ts`), 'utf8');
  const bodyMatch = source.match(/=\s*\{([\s\S]*)\};/);
  if (!bodyMatch) throw new Error(`Unable to read ${language} locale body.`);

  const entries = new Map();
  const entryPattern = /^\s*'([^']+)':\s*(['"`])((?:\\.|(?!\2).)*)\2,?\s*$/gm;
  for (const match of bodyMatch[1].matchAll(entryPattern)) {
    entries.set(match[1], match[3]);
  }
  return entries;
};

const english = parseEntries('en');
const requestedLanguage = process.argv[2];
const requestedPrefix = process.argv[3];

if (requestedLanguage && requestedPrefix) {
  const entries = parseEntries(requestedLanguage);
  for (const [key, englishValue] of english.entries()) {
    if (key !== requestedPrefix && !key.startsWith(`${requestedPrefix}.`)) continue;
    if (entries.get(key) === englishValue) {
      console.log(`${key}: ${englishValue}`);
    }
  }
  process.exit(0);
}

for (const language of languages) {
  const entries = parseEntries(language);
  const rows = prefixes
    .map((prefix) => {
      let total = 0;
      let mirrors = 0;
      for (const [key, englishValue] of english.entries()) {
        if (key !== prefix && !key.startsWith(`${prefix}.`)) continue;
        total += 1;
        if (entries.get(key) === englishValue) mirrors += 1;
      }
      return { prefix, mirrors, total };
    })
    .filter((row) => row.total > 0 && row.mirrors > 0)
    .sort((left, right) => right.mirrors - left.mirrors);

  console.log(`\n${language}`);
  for (const row of rows) {
    console.log(`${row.prefix}: ${row.mirrors}/${row.total}`);
  }
}
