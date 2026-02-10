const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.body?.user_id || req.params?.userId,
  });

  if (err.code === 'P2002') {
    error = new AppError('Duplicate entry found', 409);
  } else if (err.code === 'P2025') {
    error = new AppError('Record not found', 404);
  } else if (err.code?.startsWith('P')) {
    error = new AppError('Database operation failed', 500);
  }

  if (err.name === 'RedisError' || err.name === 'ReplyError') {
    error = new AppError('Cache operation failed', 500);
  }

  if (err.name === 'ValidationError') {
    error = new AppError(err.message, 400);
  }

  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational !== undefined ? error.isOperational : false;

  res.status(statusCode).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error,
    }),
    timestamp: new Date().toISOString(),
  });

  if (!isOperational) {
    logger.error('Non-operational error detected. Application might be in unstable state.');
    
  }
};


const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  AppError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
};
