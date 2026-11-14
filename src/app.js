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
  res.render('index', { title: 'Hello', navCurrent: 'home' });
});

app.get('/demos', (req, res) => {
  res.render('demos/index', { title: 'Demos', navCurrent: 'demos' });
});

app.get('/demos/components', (req, res) => {
  res.render('demos/components', { title: 'Components demo', navCurrent: 'demos' });
});

app.get('/demos/layout', (req, res) => {
  res.render('demos/layout', { title: 'Layout demo', navCurrent: 'demos' });
});

app.get('/demos/htmx', (req, res) => {
  res.render('demos/htmx', { title: 'HTMX demo', navCurrent: 'demos' });
});

app.get('/demos/htmx/boosted', (req, res) => {
  res.render('demos/htmx-boosted', { title: 'Boosted navigation', navCurrent: 'demos' });
});

app.get('/demos/theme', (req, res) => {
  res.render('demos/theme', { title: 'Theme demo', navCurrent: 'demos' });
});

app.get('/demo/greeting', (req, res) => {
  res.render('fragments/greeting', {
    time: new Date().toLocaleTimeString(),
  });
});

app.get('/demo/counter', (req, res) => {
  const n = Number(req.query.n);
  const count = Number.isFinite(n) ? n + 1 : 1;
  res.render('fragments/counter', { count });
});

app.get('/demo/panel-a', (req, res) => {
  res.render('fragments/panel-a');
});

app.get('/demo/panel-b', (req, res) => {
  res.render('fragments/panel-b');
});

export default app;
