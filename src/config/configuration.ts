export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'openaid_jwt_secret_key_caps1_2026',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
});
