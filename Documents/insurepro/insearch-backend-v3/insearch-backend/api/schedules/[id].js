import supabase from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import { cors } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const { data: sched } = await supabase
    .from('schedules').select('agent_id').eq('id', id).single();
  if (!sched) return res.status(404).json({ error: '일정을 찾을 수 없습니다' });

  const isMgr = ['superadmin', 'bureau_head', 'branch_head'].includes(user.role);
  if (!isMgr && sched.agent_id !== user.agentId) {
    return res.status(403).json({ error: '본인 일정만 수정/삭제할 수 있습니다' });
  }

  if (req.method === 'PUT') {
    const body = req.body;
    const { data, error } = await supabase.from('schedules').update({
      client_name: body.clientName,
      type: body.type,
      date: body.date,
      time: body.time,
      location: body.location || '',
      memo: body.memo || '',
      done: body.done || false,
    }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'PATCH') {
    // done 토글
    const { done } = req.body;
    const { error } = await supabase.from('schedules')
      .update({ done }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
