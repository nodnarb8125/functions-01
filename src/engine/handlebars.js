import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';

function registerPartialsFromDir(dir, prefix = '') {
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.hbs')) continue;
    const name = prefix + file.slice(0, -4);
    const source = readFileSync(path.join(dir, file), 'utf8');
    Handlebars.registerPartial(name, source);
  }
}

registerPartialsFromDir(path.join(import.meta.dirname, '../../views/partials'));
registerPartialsFromDir(
  path.join(import.meta.dirname, '../../views/fragments'),
  'fragments/',
);

Handlebars.registerHelper('eq', (a, b) => a === b);

export default function handlebarsEngine(path, options, callback) {
  try {
    const source = readFileSync(path, 'utf8');
    const template = Handlebars.compile(source);
    const html = template(options);
    callback(null, html);
  } catch (err) {
    callback(err);
  }
}
