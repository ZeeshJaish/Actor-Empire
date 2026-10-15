import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Read-only diagnostic: inventories are candidates, not a claim of full UI coverage.
const root = process.cwd();
const out = path.join(root, 'docs/superpowers/reports/2026-10-01-localization-audit');
fs.mkdirSync(out, { recursive: true });
const languages = ['en', 'pt-BR', 'fr', 'es', 'tr', 'de'];
const locales = {};
const duplicates = [];
for (const language of languages) {
  const file = `services/localization/locales/${language}.ts`;
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const entries = {};
  const visit = node => {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name) && ts.isStringLiteralLike(node.initializer)) {
      const key = node.name.text;
      if (entries[key]) duplicates.push({ language, key });
      entries[key] = { value: node.initializer.text, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1 };
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  locales[language] = entries;
}
const en = locales.en;
const placeholders = value => [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(m => m[1]).sort();
const domain = key => key.startsWith('services.') ? key.split('.').slice(0, 2).join('.') : key.split('.')[0];
const rows = [];
const issues = [];
const variants = [];
for (const language of languages.slice(1)) {
  const groups = {};
  for (const [key, entry] of Object.entries(en)) {
    const translated = locales[language][key];
    const group = groups[domain(key)] ||= { language, domain: domain(key), total: 0, missing: 0, mirrors: 0, sentenceMirrors: 0, changed: 0 };
    group.total++;
    if (!translated) {
      group.missing++;
      issues.push({ language, kind: 'missing', key, english: entry.value });
      continue;
    }
    if (translated.value === entry.value) {
      group.mirrors++;
      if ((entry.value.match(/[\p{L}]+/gu) || []).length >= 4) {
        group.sentenceMirrors++;
        issues.push({ language, kind: 'sentence-mirror-candidate', key, english: entry.value, line: translated.line });
      }
    } else group.changed++;
    if (JSON.stringify(placeholders(entry.value)) !== JSON.stringify(placeholders(translated.value))) {
      issues.push({ language, kind: 'placeholder-mismatch', key, english: entry.value, translated: translated.value });
    }
    if (entry.value.includes(' || ')) {
      const sourceParts = entry.value.split(' || ');
      const parts = translated.value.split(' || ');
      const row = { language, key, sourceCount: sourceParts.length, translatedCount: parts.length, mirroredVariants: parts.filter((part, i) => part === sourceParts[i]).length };
      variants.push(row);
      if (parts.length !== sourceParts.length) issues.push({ ...row, kind: 'variant-count-mismatch' });
      // Different variants can legitimately use different variables. Require each
      // corresponding alternative to retain its own source interpolation contract.
      parts.forEach((part, i) => {
        if (sourceParts[i] !== undefined && JSON.stringify(placeholders(part)) !== JSON.stringify(placeholders(sourceParts[i]))) {
          issues.push({ language, key, kind: 'variant-placeholder-mismatch', index: i });
        }
      });
    }
  }
  rows.push(...Object.values(groups));
}
const summaries = languages.slice(1).map(language => {
  const groups = rows.filter(row => row.language === language);
  return { language, total: Object.keys(en).length, localeKeys: Object.keys(locales[language]).length,
    ...Object.fromEntries(['missing', 'mirrors', 'sentenceMirrors', 'changed'].map(field => [field, groups.reduce((sum, row) => sum + row[field], 0)])) };
});
const candidates = [];
const unknownLiteralKeys = [];
const engineBanks = [];
const engineFile = 'services/reactionTemplateEngine.ts';
const engineSource = ts.createSourceFile(engineFile, fs.readFileSync(engineFile, 'utf8'), ts.ScriptTarget.Latest, true);
const collectBank = node => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^[A-Z][A-Z_]+$/.test(node.name.text) && node.initializer) {
    const strings = [];
    const collect = child => {
      if (ts.isStringLiteralLike(child)) strings.push(child.text);
      ts.forEachChild(child, collect);
    };
    collect(node.initializer);
    engineBanks.push({ name: node.name.text, line: engineSource.getLineAndCharacterOfPosition(node.getStart()).line + 1, strings: strings.length, examples: strings.slice(0, 2) });
  }
  ts.forEachChild(node, collectBank);
};
collectBank(engineSource);
const walk = dir => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [path.join(dir, entry.name)] : []);
};
const files = ['App.tsx', ...['views', 'components', 'services', 'hooks'].flatMap(walk)].filter(file => !file.includes('localization/locales/'));
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const record = (node, kind, value) => candidates.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, kind, text: value });
  const visit = node => {
    if (ts.isJsxText(node)) {
      const value = node.text.replace(/\s+/g, ' ').trim();
      if (/[a-zA-Z]{3}/.test(value)) record(node, 'jsx-text', value);
    }
    if (ts.isJsxAttribute(node) && ['title', 'placeholder', 'aria-label', 'alt'].includes(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer) && /[a-zA-Z]{3}/.test(node.initializer.text)) record(node, 'jsx-attribute', node.initializer.text);
    if (ts.isPropertyAssignment(node) && /^(headline|subtext|content|caption|description|label|message|log|text|note|blurb|summary)$/.test(node.name.getText(source).replace(/['"]/g, '')) && (ts.isStringLiteralLike(node.initializer) || ts.isTemplateExpression(node.initializer))) {
      const value = ts.isTemplateExpression(node.initializer) ? node.initializer.getText(source) : node.initializer.text;
      if (/[a-zA-Z]{3}/.test(value)) record(node, 'text-field-candidate', value);
    }
    if (ts.isCallExpression(node) && ['t', 'tr'].includes(node.expression.getText(source))) {
      const arg = node.arguments[node.expression.getText(source) === 't' ? 1 : 0];
      if (arg && ts.isStringLiteralLike(arg) && !en[arg.text]) unknownLiteralKeys.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, key: arg.text });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
const qualitySampleKeys = [
  'developmentLab.franchise.role.supporting', 'production.crisis.equipmentFailure.backup.log',
  'production.event.animeFandom.polish.log', 'services.x.reply', 'services.regulatorPressure.inbox.cleared.text',
  'dating.tinder.modal.hookupLocked.title', 'app.ads.save.failedSubtext',
  'guide.handbook.greenlight.p1', 'guide.handbook.gettingStarted.p3',
  'services.news.release.open.subtext', 'services.news.industry.trend',
  'forbes.studioProfile.status.rivalBid.action', 'services.talentService.negotiation.standardAccept',
];
const qualitySamples = languages.slice(1).flatMap(language => qualitySampleKeys.map(key => ({
  language, key, english: en[key]?.value, translated: locales[language][key]?.value, line: locales[language][key]?.line,
})));
const result = { summaries, duplicates, domains: rows, issues, variants, engineBanks, qualitySamples, unknownLiteralKeys, hardcodedCandidates: candidates, methodology: 'AST strings and JSX inventory. Equality includes legitimate brands/units. Changed values are not a quality pass. Hardcoded candidates include data, fallbacks and dev fixtures; inspect call paths before treating as defects.' };
fs.writeFileSync(path.join(out, 'coverage.json'), JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'domain-coverage.csv'), ['language,domain,total,missing,mirrors,sentenceMirrors,changed', ...rows.map(row => [row.language,row.domain,row.total,row.missing,row.mirrors,row.sentenceMirrors,row.changed].join(','))].join('\n') + '\n');
fs.writeFileSync(path.join(out, 'existing-audit.txt'), fs.readFileSync('/tmp/actor-i18n-existing-audit.txt', 'utf8'));
console.log(JSON.stringify({ summaries, duplicateCount: duplicates.length, placeholderIssues: issues.filter(issue => issue.kind.includes('placeholder')), variantCountIssues: issues.filter(issue => issue.kind === 'variant-count-mismatch'), unknownLiteralKeys, hardcodedCandidates: candidates.length, jsxTextCandidates: candidates.filter(row => row.kind === 'jsx-text').length, report: out }, null, 2));
