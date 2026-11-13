import path from 'node:path';
import express from 'express';
import handlebarsEngine from './engine/handlebars.js';

const viewsDir = path.join(import.meta.dirname, '../views');

const app = express();

const publicDir = path.join(import.meta.dirname, '../public');
const htmxDir = path.join(import.meta.dirname, '../node_modules/htmx.org/dist');
app.use(express.static(publicDir));
app.use('/htmx', express.static(htmxDir));

app.engine('hbs', handlebarsEngine);
app.set('view engine', 'hbs');
app.set('views', viewsDir);

app.get('/', (req, res) => {
  res.render('index', { title: 'Hello' });
});

app.get('/demo/greeting', (req, res) => {
  res.render('fragments/greeting', {
    time: new Date().toLocaleTimeString(),
  });
});

export default app;
