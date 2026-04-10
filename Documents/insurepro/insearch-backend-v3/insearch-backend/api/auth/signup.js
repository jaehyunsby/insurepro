import supabase from '../../lib/supabase.js';
import { cors } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, name, phone, team, role = 'agent' } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: '이메일, 비밀번호, 이름은 필수입니다' });
  }

  // 중복 체크
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .limit(1);

  if (existing?.length) {
    return res.status(409).json({ error: '이미 가입된 이메일입니다' });
  }

  const { data, error } = await supabase.from('users').insert({
    email: email.toLowerCase().trim(),
    password,  // TODO: 추후 bcrypt 해싱
    name,
    phone: phone || '',
    role: ['agent', 'staff'].includes(role) ? role : 'agent',
    team: team || '',
    status: 'pending',
    join_date: new Date().toISOString().slice(0, 10),
  }).select().single();

  if (error) return res.status(500).json({ error: '가입 중 오류가 발생했습니다' });

  return res.status(201).json({ message: '가입 신청 완료. 관리자 승인 후 로그인 가능합니다', userId: data.id });
}
