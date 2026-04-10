import supabase from '../lib/supabase.js';
import { requireAuth, requireRole } from '../lib/auth.js';
import { cors } from '../lib/cors.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const { id } = req.query;

  // 목록 조회
  if (!id && req.method === 'GET') {
    const admin = requireRole(req, res, ['superadmin', 'bureau_head', 'branch_head']);
    if (!admin) return;
    const { data, error } = await supabase
      .from('users')
      .select('id,email,name,phone,role,team,branch_id,bureau_id,agent_id,status,join_date,last_login')
      .order('join_date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // 개별 수정/삭제
  if (id) {
    const admin = requireRole(req, res, ['superadmin', 'bureau_head', 'branch_head']);
    if (!admin) return;

    if (req.method === 'PATCH') {
      const { action, role, status, team, branchId, bureauId } = req.body;
      if (action === 'approve') {
        await supabase.from('users').update({ status: 'approved' }).eq('id', id);
        return res.status(200).json({ success: true });
      }
      if (action === 'reject') {
        await supabase.from('users').update({ status: 'rejected' }).eq('id', id);
        return res.status(200).json({ success: true });
      }
      if (action === 'update_role') {
        if (admin.role !== 'superadmin') return res.status(403).json({ error: '전체관리자만 역할 변경 가능' });
        await supabase.from('users').update({ role, team: team || '', branch_id: branchId || null, bureau_id: bureauId || null }).eq('id', id);
        return res.status(200).json({ success: true });
      }
    }

    if (req.method === 'DELETE') {
      if (admin.role !== 'superadmin') return res.status(403).json({ error: '전체관리자만 삭제 가능' });
      await supabase.from('users').delete().eq('id', id);
      return res.status(200).json({ success: true });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
