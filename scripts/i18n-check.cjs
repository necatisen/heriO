// i18n checker for Birthchat.
//  1. Collects every translatable TR string: L('tr', 'en') calls + TR/EN data pairs
//     ({ tr: '..', en: '..' }, xTr/xEn properties, const xTr/xEn, tr:[..]/en:[..] arrays).
//  2. Reports TR keys missing from each lib/locales/<lang>.json.
//  3. Reports user-visible literals that bypass L() (JSX text, Alert.alert/alert strings).
// Usage: node scripts/i18n-check.cjs [--write-source] [--hardcoded]
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const LANGS = ['ru', 'ar', 'de', 'fr', 'es'];
const dirs = ['app', 'components', 'lib', 'contexts', 'hooks'];

function walk(d, out = []) {
  if (!fs.existsSync(d)) return out;
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f.name)) out.push(p);
  }
  return out;
}
const files = dirs.flatMap((d) => walk(path.join(root, d))).filter((f) => !f.endsWith(path.join('lib', 'l10n.ts')));
const strText = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);

const pairs = new Map(); // tr -> { en, where }
const add = (tr, en, where) => {
  if (tr == null || en == null || !tr.trim()) return;
  if (!pairs.has(tr)) pairs.set(tr, { en, where });
};
const hardcoded = [];

for (const file of files) {
  const rel = path.relative(root, file);
  const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const line = (n) => src.getLineAndCharacterOfPosition(n.getStart()).line + 1;

  const visit = (n) => {
    // L('tr', 'en') / Lfor(lang, 'tr', 'en')
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === 'L' || n.expression.text === 'Lfor')) {
      const a = n.expression.text === 'L' ? n.arguments : n.arguments.slice(1);
      add(strText(a[0]), strText(a[1]), `${rel}:${line(n)}`);
    }
    // object literal pairs
    if (ts.isObjectLiteralExpression(n)) {
      const props = {};
      for (const p of n.properties) if (ts.isPropertyAssignment(p) && p.name) props[p.name.getText().replace(/['"]/g, '')] = p.initializer;
      if (props.tr && props.en) {
        if (strText(props.tr) != null) add(strText(props.tr), strText(props.en), `${rel}:${line(n)}`);
        if (ts.isArrayLiteralExpression(props.tr) && ts.isArrayLiteralExpression(props.en))
          props.tr.elements.forEach((e, i) => add(strText(e), strText(props.en.elements[i]), `${rel}:${line(n)}`));
        if (ts.isObjectLiteralExpression(props.tr) && ts.isObjectLiteralExpression(props.en)) {
          const enMap = Object.fromEntries(props.en.properties.filter(ts.isPropertyAssignment).map((p) => [p.name.getText(), p.initializer]));
          for (const p of props.tr.properties.filter(ts.isPropertyAssignment)) add(strText(p.initializer), strText(enMap[p.name.getText()]), `${rel}:${line(n)}`);
        }
      }
      for (const k of Object.keys(props)) {
        const m = k.match(/^(.*)Tr$/);
        if (m && props[`${m[1]}En`]) add(strText(props[k]), strText(props[`${m[1]}En`]), `${rel}:${line(n)}`);
      }
    }
    // const xTr = '..'; const xEn = '..';
    if (ts.isVariableStatement(n)) {
      for (const d of n.declarationList.declarations) {
        const m = d.name.getText().match(/^(.*)Tr$/);
        if (!m || !d.initializer) continue;
        const sib = n.parent.statements?.flatMap((s) => (ts.isVariableStatement(s) ? s.declarationList.declarations : [])).find((x) => x.name.getText() === `${m[1]}En`);
        if (sib) add(strText(d.initializer), strText(sib.initializer), `${rel}:${line(n)}`);
      }
    }
    // hard-coded visible text
    if (ts.isJsxText(n) && /\p{L}{2,}/u.test(n.text.trim())) hardcoded.push(`${rel}:${line(n)}  JSX "${n.text.trim().slice(0, 60)}"`);
    if (ts.isCallExpression(n) && /^(Alert\.alert|alert)$/.test(n.expression.getText())) {
      for (const a of n.arguments.slice(0, 2)) {
        const t = strText(a);
        if (t && /\p{L}{2,}/u.test(t)) hardcoded.push(`${rel}:${line(n)}  alert "${t.slice(0, 60)}"`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
}

const source = Object.fromEntries([...pairs].map(([tr, v]) => [tr, v.en]));
if (process.argv.includes('--write-source')) {
  fs.mkdirSync(path.join(root, 'lib/locales'), { recursive: true });
  fs.writeFileSync(path.join(root, 'lib/locales/_source.json'), JSON.stringify(source, null, 1) + '\n');
}

let missingTotal = 0;
for (const lang of LANGS) {
  const p = path.join(root, `lib/locales/${lang}.json`);
  const dict = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  const missing = Object.keys(source).filter((k) => !(k in dict) || !String(dict[k]).trim());
  // placeholders must survive translation
  const badVars = Object.keys(source).filter((k) => k in dict && (k.match(/\{\d+\}/g) || []).sort().join() !== (String(dict[k]).match(/\{\d+\}/g) || []).sort().join());
  missingTotal += missing.length + badVars.length;
  console.log(`${lang}: ${Object.keys(source).length - missing.length}/${Object.keys(source).length} translated${missing.length ? `, ${missing.length} missing` : ''}${badVars.length ? `, ${badVars.length} placeholder mismatch` : ''}`);
  if (process.argv.includes('--verbose')) missing.slice(0, 20).forEach((k) => console.log('   - ' + k));
  badVars.forEach((k) => console.log(`   ! ${k}  =>  ${dict[k]}`));
}
if (process.argv.includes('--hardcoded')) {
  console.log(`\nHard-coded visible text (${hardcoded.length}):`);
  hardcoded.forEach((h) => console.log('  ' + h));
}
console.log(`\nstrings=${Object.keys(source).length} problems=${missingTotal}${hardcoded.length ? ` hardcoded=${hardcoded.length}` : ''}`);
process.exitCode = missingTotal ? 1 : 0;
