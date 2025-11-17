import * as Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string()
    .pattern(/^[a-zA-Z][a-zA-Z0-9]*$/)
    .default('api'),

  // Database
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required()
    .messages({
      'string.uri': 'DATABASE_URL must be a valid PostgreSQL connection string',
      'any.required': 'DATABASE_URL is required',
    }),

  // JWT
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters long',
    'any.required': 'JWT_SECRET is required for security',
  }),
  JWT_EXPIRATION: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('1h')
    .messages({
      'string.pattern.base':
        'JWT_EXPIRATION must be in format like "1h", "30m", "7d"',
    }),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters long',
    'any.required': 'JWT_REFRESH_SECRET is required for security',
  }),
  JWT_REFRESH_EXPIRATION: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('7d'),

  // CORS
  CORS_ORIGIN: Joi.alternatives()
    .try(
      Joi.string().valid('*'),
      Joi.string().uri(),
      Joi.array().items(Joi.string().uri()),
    )
    .default('*'),

  // External Services
  STRIPE_SECRET_KEY: Joi.string()
    .pattern(/^sk_(test|live)_/)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required().messages({
        'any.required': 'STRIPE_SECRET_KEY is required in production',
      }),
      otherwise: Joi.optional(),
    }),
  STRIPE_WEBHOOK_SECRET: Joi.string()
    .pattern(/^whsec_/)
    .when('STRIPE_SECRET_KEY', {
      is: Joi.exist(),
      then: Joi.required().messages({
        'any.required':
          'STRIPE_WEBHOOK_SECRET is required when Stripe is configured',
      }),
      otherwise: Joi.optional(),
    }),

  // Twilio SMS
  TWILIO_ACCOUNT_SID: Joi.string()
    .pattern(/^AC[a-zA-Z0-9]{32}$/)
    .optional(),
  TWILIO_AUTH_TOKEN: Joi.string().when('TWILIO_ACCOUNT_SID', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TWILIO_PHONE_NUMBER: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .when('TWILIO_ACCOUNT_SID', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

  // AWS S3 (for file storage)
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().when('AWS_ACCESS_KEY_ID', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  AWS_REGION: Joi.string().default('eu-west-1'),
  AWS_S3_BUCKET: Joi.string().when('AWS_ACCESS_KEY_ID', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().integer().min(1).default(60000), // 1 minute
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(100),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),

  // Security
  BCRYPT_ROUNDS: Joi.number().integer().min(8).max(15).default(12),

  // Session/Cookie
  COOKIE_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Email (if you plan to add email functionality)
  SMTP_HOST: Joi.string().hostname().optional(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: Joi.string().email().when('SMTP_HOST', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PASS: Joi.string().when('SMTP_HOST', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Redis (for caching and sessions)
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .optional(),
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
});
