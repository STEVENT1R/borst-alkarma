/**
 * Centralized Error Handler Middleware
 * Use with: app.use(errorHandler) AFTER all routes
 */
const errorHandler = (err, req, res, _next) => {
  console.error('[ErrorHandler]', err.stack || err.message || err);

  // Already handled / custom status
  if (res.statusCode && res.statusCode !== 200) {
    return res.status(res.statusCode).json({
      error: process.env.NODE_ENV === 'production' ? 'حدث خطأ' : (err.message || 'حدث خطأ'),
    });
  }

  const status = err.status || 500;
  // لا تسريب لتفاصيل الخطأ الداخلية في الإنتاج
  const message = process.env.NODE_ENV === 'production'
    ? 'خطأ داخلي في الخادم'
    : (err.message || 'خطأ داخلي في الخادم');

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
