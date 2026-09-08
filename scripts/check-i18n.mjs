import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseTemplate, TmplAstText } from '@angular/compiler';

const read = (path) => readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
const flatten = (object, prefix = '') =>
  Object.entries(object).flatMap(([key, value]) =>
    typeof value === 'object' ? flatten(value, prefix + key + '.') : [[prefix + key, value]],
  );
const en = new Map(flatten(JSON.parse(read('public/i18n/en.json'))));
const es = new Map(flatten(JSON.parse(read('public/i18n/es.json'))));
const errors = [];
for (const key of new Set([...en.keys(), ...es.keys()])) {
  if (!en.get(key) || !es.get(key)) errors.push('Missing or empty translation: ' + key);
  const params = (text) =>
    [...(text ?? '').matchAll(/{{\s*(\w+)\s*}}/g)]
      .map((match) => match[1])
      .sort()
      .join(',');
  if (params(en.get(key)) !== params(es.get(key))) errors.push('Interpolation mismatch: ' + key);
}
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
const namespaces = new Set([...en.keys()].map((key) => key.split('.')[0]));
for (const file of walk('src/app').filter(
  (file) => /\.(ts|html)$/.test(file) && !file.endsWith('.spec.ts'),
)) {
  const source = read(file);
  for (const match of source.matchAll(/['"]([A-Za-z]+\.[A-Za-z][A-Za-z0-9]*)['"]/g)) {
    if (namespaces.has(match[1].split('.')[0]) && !en.has(match[1]))
      errors.push(file + ': unknown translation ' + match[1]);
  }
  if (!file.endsWith('.html')) continue;
  const parsed = parseTemplate(source, file);
  for (const error of parsed.errors ?? []) errors.push(error.toString());
  const visit = (nodes) => {
    for (const node of nodes ?? []) {
      if (node.name === 'mat-icon') continue; // Icon ligatures are assets, not UI copy.
      if (node instanceof TmplAstText && /\p{L}/u.test(node.value))
        errors.push(file + ': hardcoded visible text ' + node.value.trim());
      for (const attr of node.attributes ?? [])
        if (['aria-label', 'title', 'alt', 'placeholder'].includes(attr.name) && attr.value)
          errors.push(file + ': hardcoded ' + attr.name);
      for (const property of ['children', 'branches', 'cases']) visit(node[property]);
      if (node.empty) visit(node.empty.children);
    }
  };
  visit(parsed.nodes);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    'i18n passed: ' +
      en.size +
      ' keys per locale, matching parameters, no hardcoded template copy.',
  );
