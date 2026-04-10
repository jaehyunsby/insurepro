const ALLOWED_ORIGINS = [
  'https://insearchlap.kr',
  'https://jaehyunsby.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

export function cors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
