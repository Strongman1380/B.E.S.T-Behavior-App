import dotenv from 'dotenv';
dotenv.config();

export function applyCors(req, res) {
  const env = process.env.NODE_ENV || 'development';
  const list = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers?.origin;
  const host = req.headers?.host ? `http://${req.headers.host}` : null;

  let allowed = true;
  let allowValue = '*';

  if (!origin) {
    // No origin header (likely same-origin or non-browser client)
    allowed = true;
  } else {
    if (list.length > 0) {
      allowed = list.includes(origin);
      if (allowed) allowValue = origin;
    } else if (env === 'production') {
      // In production without explicit list, allow same-origin
      if (host && origin.includes(host)) {
        allowed = true;
        allowValue = origin;
      } else {
        allowed = false;
      }
    }
  }

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowValue);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return allowed;
}
