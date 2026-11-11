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
  mail: {
    host: process.env.MAIL_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    user: process.env.MAIL_USER ?? '',
    pass: process.env.MAIL_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'OpenAid Platform <thaihoaa246@gmail.com>',
  },
});
