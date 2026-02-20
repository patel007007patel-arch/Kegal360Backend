/**
 * Valid MongoDB ObjectId (24 hex chars). Use for params and body validation.
 * @param {*} v - value to check
 * @returns {boolean}
 */
export const isValidObjectId = (v) =>
  typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v);

export default isValidObjectId;
