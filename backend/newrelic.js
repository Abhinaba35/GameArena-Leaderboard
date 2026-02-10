'use strict';

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'GameArena-Leaderboard'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  
  agent_enabled: true, 
  
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    filepath: 'stdout'
  },
  
  allow_all_headers: true,
  
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  },
  
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
    explain_threshold: 500
  },
  
  error_collector: {
    enabled: true,
    ignore_status_codes: [404]
  },
  
  distributed_tracing: {
    enabled: true
  },
  
  instrumentation: {
    '@prisma/client': {
      module: '@prisma/client'
    }
  }
};
