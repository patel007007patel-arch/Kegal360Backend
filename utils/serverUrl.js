/**
 * Base URL for serving uploaded assets (videos, images, custom-logs).
 * Use for storing full URLs in DB so clients can access directly.
 */
export const getServerUrl = () => {
  const base = (process.env.SERVER_URL || process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
  return base;
};

export default getServerUrl;
