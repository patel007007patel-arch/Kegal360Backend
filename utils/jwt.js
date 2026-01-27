import jwt from 'jsonwebtoken';

export const generateToken = (userId, role = 'user') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'your_jwt_secret_key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export default { generateToken, verifyToken };
