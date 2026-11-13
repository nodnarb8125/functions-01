import { readFileSync } from 'node:fs';
import Handlebars from 'handlebars';

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
