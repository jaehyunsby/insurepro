import supabase from '../../lib/supabase.js';
import { signToken } from '../../lib/auth.js';
import { cors } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: '이메일과 비밀번호를 입력하세요' });

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .limit(1);

  if (error || !users?.length) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 틀렸습니다' });
  }

  const user = users[0];

  if (user.status !== 'approved') {
    return res.status(403).json({ error: '관리자 승인 대기 중입니다' });
  }

  // 비밀번호 확인 (현재 평문 → 추후 bcrypt로 마이그레이션)
  if (user.password !== password) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 틀렸습니다' });
  }

  // 마지막 로그인 업데이트
  await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', user.id);

  // JWT 발급
  const token = signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    agentId: user.agent_id,
    team: user.team,
    branchId: user.branch_id,
    bureauId: user.bureau_id,
  });

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      agentId: user.agent_id,
      team: user.team,
    }
  });
}
