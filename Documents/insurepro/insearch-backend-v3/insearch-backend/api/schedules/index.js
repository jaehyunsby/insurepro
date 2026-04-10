import supabase from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import { cors } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const user = requireAuth(req, res);
  if (!user) return;

  const isMgr = ['superadmin', 'bureau_head', 'branch_head'].includes(user.role);

  if (req.method === 'GET') {
    let query = supabase.from('schedules').select('*').order('date');
    if (!isMgr) query = query.eq('agent_id', user.agentId);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const { data, error } = await supabase.from('schedules').insert({
      agent_id: user.agentId,
      client_name: body.clientName,
      type: body.type || '상담',
      date: body.date,
      time: body.time || '09:00',
      location: body.location || '',
      memo: body.memo || '',
      done: false,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
