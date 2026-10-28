export default () => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'change-me-in-production') {
    throw new Error(
      'JWT_SECRET must be set and must not equal "change-me-in-production". ' +
        'Generate a strong random value: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
    );
  }

  return {
  port: parseInt(process.env.PORT ?? '3000', 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  },

  tmdb: {
    accessToken: process.env.TMDB_ACCESS_TOKEN,
    baseUrl: process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3',
    imageBaseUrl: process.env.TMDB_IMAGE_BASE_URL ?? 'https://image.tmdb.org/t/p',
    posterSize: process.env.TMDB_POSTER_SIZE ?? 'w500',
    backdropSize: process.env.TMDB_BACKDROP_SIZE ?? 'w1280',
    language: process.env.TMDB_LANGUAGE ?? 'uk-UA',
    region: process.env.TMDB_REGION ?? 'UA',
  },

  ai: {
    primaryProvider: process.env.AI_PRIMARY_PROVIDER ?? 'google',
    enableFallback: process.env.AI_ENABLE_FALLBACK === 'true',
    google: {
      apiKey: process.env.GOOGLE_AI_API_KEY,
      model: process.env.GOOGLE_AI_MODEL ?? 'gemini-1.5-flash',
      timeoutMs: parseInt(process.env.GOOGLE_AI_TIMEOUT_MS ?? '10000', 10),
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
      model: process.env.OPENROUTER_MODEL ?? 'mistralai/mistral-7b-instruct',
      timeoutMs: parseInt(process.env.OPENROUTER_TIMEOUT_MS ?? '10000', 10),
    },
  },

  sync: {
    enabled: process.env.SYNC_ENABLED === 'true',
    cronEnabled: process.env.TMDB_CRON_ENABLED !== 'false',
    popularPages: parseInt(process.env.SYNC_POPULAR_PAGES ?? '5', 10),
    nowPlayingPages: parseInt(process.env.SYNC_NOW_PLAYING_PAGES ?? '3', 10),
  },

  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@cinematch.local',
    password: process.env.ADMIN_PASSWORD ?? 'change_me',
  },
  };
};

