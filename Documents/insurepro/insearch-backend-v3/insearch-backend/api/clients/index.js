import supabase from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import { cors } from '../../lib/cors.js';

const ROLE_ORDER = ['superadmin', 'bureau_head', 'branch_head', 'team_head', 'agent'];

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const user = requireAuth(req, res);
  if (!user) return;

  // GET - 고객 목록 (역할별 필터)
  if (req.method === 'GET') {
    let query = supabase.from('clients').select('*, contracts(*)');

    // 역할에 따른 필터
    if (user.role === 'agent' || user.role === 'team_head') {
      // 본인 고객만
      query = query.eq('agent_id', user.agentId);
    } else if (user.role === 'branch_head') {
      // 지사 소속 에이전트 고객만
      const { data: agents } = await supabase
        .from('agents').select('id').eq('branch_id', user.branchId);
      const agentIds = agents?.map(a => a.id) || [];
      query = query.in('agent_id', agentIds);
    } else if (user.role === 'bureau_head') {
      const { data: agents } = await supabase
        .from('agents').select('id').eq('bureau_id', user.bureauId);
      const agentIds = agents?.map(a => a.id) || [];
      query = query.in('agent_id', agentIds);
    }
    // superadmin은 전체

    const { data, error } = await query.order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST - 고객 등록
  if (req.method === 'POST') {
    const body = req.body;
    const { data, error } = await supabase.from('clients').insert({
      agent_id: user.agentId,
      name: body.name,
      phone: body.phone || null,
      ssn: body.ssn || '',
      addr: body.addr || '',
      job: body.job || '',
      body: body.body || null,
      driving: body.driving || null,
      monthly_premium: body.monthlyPremium || null,
      status: body.status || 'active',
      next_contact: body.nextContact || null,
      memo: body.memo || '',
      alarms: body.alarms || [],
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
