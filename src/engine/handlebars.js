import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';

const partialsDir = path.join(import.meta.dirname, '../../views/partials');

for (const file of readdirSync(partialsDir)) {
  if (!file.endsWith('.hbs')) continue;
  const name = file.slice(0, -4);
  const source = readFileSync(path.join(partialsDir, file), 'utf8');
  Handlebars.registerPartial(name, source);
}

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
