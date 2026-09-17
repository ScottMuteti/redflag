require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'redflag',
    password: process.env.DB_PASSWORD || 'redflag',
    database: process.env.DB_NAME || 'redflag',
  },
  gophish: {
    apiUrl: process.env.GOPHISH_API_URL || '',
    apiKey: process.env.GOPHISH_API_KEY || '',
  },
  africasTalking: {
    apiKey: process.env.AT_API_KEY || '',
    username: process.env.AT_USERNAME || 'sandbox',
  },
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
};
