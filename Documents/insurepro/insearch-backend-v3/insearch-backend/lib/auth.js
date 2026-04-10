import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// 토큰 생성
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// 토큰 검증
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// request에서 유저 추출
export function getUser(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  return verifyToken(token);
}

// 인증 필수 미들웨어
export function requireAuth(req, res) {
  const user = getUser(req);
  if (!user) {
    res.status(401).json({ error: '로그인이 필요합니다' });
    return null;
  }
  return user;
}

// 역할 체크
export function requireRole(req, res, roles) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (!roles.includes(user.role)) {
    res.status(403).json({ error: '권한이 없습니다' });
    return null;
  }
  return user;
}
