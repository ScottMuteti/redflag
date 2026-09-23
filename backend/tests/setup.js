process.env.JWT_SECRET = 'test-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'redflag';
process.env.DB_PASSWORD = 'redflag';
process.env.DB_NAME = 'redflag_test';
process.env.GOPHISH_WEBHOOK_SECRET = 'test-gophish-secret';
process.env.PUBLIC_BACKEND_URL = 'http://localhost:4000';
// The africastalking SDK validates its API key eagerly at module load time
// (app.js -> campaigns.routes -> smsClient), so tests need a placeholder.
process.env.AT_API_KEY = 'test-at-api-key';
process.env.AT_USERNAME = 'sandbox';
