require('dotenv').config();
const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`RedFlag backend listening on port ${env.port}`);
});
