/**
 * New Relic Agent Configuration
 * 
 * This file configures the New Relic APM agent for monitoring:
 * - API response times and throughput
 * - Database query performance
 * - Error rates and exceptions
 * - Custom transaction traces
 */

'use strict';

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'GameArena-Leaderboard'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  
  // Enable/disable the agent
  agent_enabled: true, // Force enable New Relic agent
  
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    filepath: 'stdout'
  },
  
  // Allow all data to be collected
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
  
  // Transaction tracer configuration
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
    explain_threshold: 500
  },
  
  // Error collector configuration
  error_collector: {
    enabled: true,
    ignore_status_codes: [404]
  },
  
  // Distributed tracing
  distributed_tracing: {
    enabled: true
  },
  
  // Custom instrumentation for database queries
  instrumentation: {
    '@prisma/client': {
      module: '@prisma/client'
    }
  }
};
