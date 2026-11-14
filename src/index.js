import loadEnvSecrets from './load-env-secrets.js';
import app from './app.js';

loadEnvSecrets();

const port = process.env.PORT ?? 3456;

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
