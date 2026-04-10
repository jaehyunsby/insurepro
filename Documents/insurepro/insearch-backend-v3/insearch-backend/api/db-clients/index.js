import supabase from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import { cors } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const user = requireAuth(req, res);
  if (!user) return;

  const isMgr = ['superadmin', 'bureau_head', 'branch_head'].includes(user.role);

  // GET - 목록
  if (req.method === 'GET') {
    let query = supabase.from('db_clients').select('*').order('id', { ascending: false });

    if (!isMgr) {
      // 설계사·팀장: 본인에게 배분된 것만
      query = query.eq('assigned_to', user.agentId);
    } else if (user.role === 'branch_head') {
      // 지사장: 본인 지사 에이전트에게 배분된 것 + 미배분
      const { data: agents } = await supabase
        .from('agents').select('id').eq('branch_id', user.branchId);
      const agentIds = (agents || []).map(a => a.id);
      query = query.or(`assigned_to.in.(${agentIds.join(',')}),assigned_to.is.null`);
    } else if (user.role === 'bureau_head') {
      const { data: agents } = await supabase
        .from('agents').select('id').eq('bureau_id', user.bureauId);
      const agentIds = (agents || []).map(a => a.id);
      query = query.or(`assigned_to.in.(${agentIds.join(',')}),assigned_to.is.null`);
    }
    // superadmin: 전체

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST - 등록 (관리자만)
  if (req.method === 'POST') {
    if (!isMgr) return res.status(403).json({ error: '관리자만 DB 고객을 등록할 수 있습니다' });

    const body = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from('db_clients').insert({
      name: body.name,
      phone: body.phone || null,
      ssn: body.ssn || '',
      addr: body.addr || '',
      job: body.job || '',
      body: body.body || null,
      driving: body.driving || null,
      monthly_premium: body.monthlyPremium || null,
      source: body.source || '기타',
      memo: body.memo || '',
      status: 'unassigned',
      process_status: '미처리',
      reg_date: today,
      reg_month: today.slice(0, 7),
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
