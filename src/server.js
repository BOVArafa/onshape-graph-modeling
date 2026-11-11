require('dotenv').config();

const createApp = require('./app');

const DEFAULT_PORT = 3000;
const port = process.env.PORT || DEFAULT_PORT;

const app = createApp();

app.listen(port, () => {
  console.log(`Servidor disponível em http://localhost:${port}`);
});
