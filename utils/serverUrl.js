/**
 * Base URL for serving uploaded assets (videos, images, audio, custom-logs).
 * Set UPLOAD_BASE_URL in .env for the domain prefix used in stored URLs.
 */
export const getServerUrl = () => {
  const base = (
    process.env.UPLOAD_BASE_URL ||
    process.env.SERVER_URL ||
    process.env.BASE_URL ||
    'http://localhost:5000'
  ).replace(/\/$/, '');
  return base;
};

export default getServerUrl;
