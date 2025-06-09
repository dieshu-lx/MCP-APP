export default () => ({
  port: parseInt(process.env.PORT, 10) || 10000,
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  },
  api: {
    timeout: parseInt(process.env.API_TIMEOUT, 10) || 5000,
  },
}); 