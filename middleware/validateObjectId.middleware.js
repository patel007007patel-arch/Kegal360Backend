import { isValidObjectId } from '../utils/validateObjectId.js';

/**
 * Express param middleware: validates req.params[paramName] is a valid MongoDB ObjectId.
 * Use: router.param('id', validateObjectIdParam('id'))
 * Sends 400 if invalid; otherwise next().
 */
export const validateObjectIdParam = (paramName) => (req, res, next) => {
  const value = req.params[paramName];
  if (value === undefined) return next();
  if (!isValidObjectId(value)) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${paramName}`
    });
  }
  next();
};

export default validateObjectIdParam;
