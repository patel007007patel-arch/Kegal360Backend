import User from '../models/User.model.js';
import { generateToken } from '../utils/jwt.js';

export const createUser = async (userData) => {
  const user = new User(userData);
  await user.save();
  return user;
};

export const findUserByEmail = async (email) => {
  return await User.findOne({ email: email.toLowerCase() });
};

export const findUserById = async (id) => {
  return await User.findById(id).select('-password');
};

export const validatePassword = async (user, password) => {
  return await user.comparePassword(password);
};

export const generateUserToken = (userId, role) => {
  return generateToken(userId, role);
};

export default {
  createUser,
  findUserByEmail,
  findUserById,
  validatePassword,
  generateUserToken
};
