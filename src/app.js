import path from 'node:path';
import express from 'express';
import handlebarsEngine from './engine/handlebars.js';

const viewsDir = path.join(import.meta.dirname, '../views');

const app = express();

const bootstrapDir = path.join(import.meta.dirname, '../node_modules/bootstrap/dist');
app.use('/bootstrap', express.static(bootstrapDir));

app.engine('hbs', handlebarsEngine);
app.set('view engine', 'hbs');
app.set('views', viewsDir);

app.get('/', (req, res) => {
  res.render('index', { title: 'Hello' });
});

export default app;
