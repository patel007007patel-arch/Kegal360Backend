export const authRouteLogger = (req, _res, next) => {
  console.log(`🔐 Auth Route: ${req.method} ${req.path}`);
  next();
};

export const loginRequestLogger = (req, _res, next) => {
  console.log('🔑 Login endpoint hit!');
  console.log('📧 Request body:', { email: req.body?.email, password: '***' });
  next();
};

