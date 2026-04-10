import supabase from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import { cors } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id 필수' });

  // 해당 고객 확인
  const { data: client } = await supabase
    .from('clients').select('agent_id').eq('id', id).single();
  if (!client) return res.status(404).json({ error: '고객을 찾을 수 없습니다' });

  // 권한 체크: 본인 또는 관리자
  const isMgr = ['superadmin', 'bureau_head', 'branch_head'].includes(user.role);
  if (!isMgr && client.agent_id !== user.agentId) {
    return res.status(403).json({ error: '권한이 없습니다' });
  }

  // PUT - 수정
  if (req.method === 'PUT') {
    const body = req.body;
    const { data, error } = await supabase.from('clients').update({
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
      lat: body.lat || null,
      lng: body.lng || null,
    }).eq('id', id).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // DELETE - 삭제
  if (req.method === 'DELETE') {
    // 계약 먼저 삭제
    await supabase.from('contracts').delete().eq('client_id', id);
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  // PATCH - 알람만 업데이트
  if (req.method === 'PATCH') {
    const { alarms } = req.body;
    const { error } = await supabase.from('clients')
      .update({ alarms })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
