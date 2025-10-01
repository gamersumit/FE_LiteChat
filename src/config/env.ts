/**
 * Type-safe environment configuration for the ChatLite frontend
 */

interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  auth: {
    cookieName: string;
    refreshInterval: number;
  };
  app: {
    name: string;
    version: string;
    defaultTheme: string;
    itemsPerPage: number;
  };
  features: {
    enableDebug: boolean;
    enableAnalytics: boolean;
    maxUploadSize: number;
    enableMockData: boolean;
  };
  websocket: {
    url: string;
    reconnectInterval: number;
  };
  defaults: {
    maxPages: number;
    crawlDepth: number;
    paginationSize: number;
  };
  widget: {
    frontendUrl: string;
  };
  environment: string;
}

function validateConfig(): void {
  const requiredVars = [
    'VITE_API_BASE_URL'
  ];

  const missingVars = requiredVars.filter(varName =>
    !import.meta.env[varName] || import.meta.env[varName].trim() === ''
  );

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Validate configuration on module load
if (import.meta.env.MODE === 'production') {
  validateConfig();
}

export const config: AppConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
  },
  auth: {
    cookieName: import.meta.env.VITE_AUTH_COOKIE_NAME || 'auth_token',
    refreshInterval: parseInt(import.meta.env.VITE_AUTH_REFRESH_INTERVAL) || 300000,
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'ChatLite',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'dark',
    itemsPerPage: parseInt(import.meta.env.VITE_ITEMS_PER_PAGE) || 10,
  },
  features: {
    enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
    maxUploadSize: parseInt(import.meta.env.VITE_MAX_UPLOAD_SIZE) || 10485760,
    enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
  },
  websocket: {
    url: import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws',
    reconnectInterval: parseInt(import.meta.env.VITE_WS_RECONNECT_INTERVAL) || 5000,
  },
  defaults: {
    maxPages: parseInt(import.meta.env.VITE_DEFAULT_MAX_PAGES) || 100,
    crawlDepth: parseInt(import.meta.env.VITE_DEFAULT_CRAWL_DEPTH) || 3,
    paginationSize: parseInt(import.meta.env.VITE_PAGINATION_SIZE) || 10,
  },
  widget: {
    frontendUrl: import.meta.env.VITE_WIDGET_FRONTEND_URL || 'http://localhost:5174',
  },
  environment: import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || 'development',
};

// Log configuration in development
if (config.features.enableDebug && config.environment === 'development') {
}

export default config;