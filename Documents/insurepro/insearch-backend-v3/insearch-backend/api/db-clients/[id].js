import supabase from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import { cors } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const user = requireAuth(req, res);
  if (!user) return;

  const { id, action } = req.query;
  const isMgr = ['superadmin', 'bureau_head', 'branch_head'].includes(user.role);

  const { data: dbClient } = await supabase
    .from('db_clients').select('*').eq('id', id).single();
  if (!dbClient) return res.status(404).json({ error: 'DB 고객을 찾을 수 없습니다' });

  // PUT - 정보 수정 (관리자만)
  if (req.method === 'PUT') {
    if (!isMgr) return res.status(403).json({ error: '권한 없음' });
    const body = req.body;
    const { data, error } = await supabase.from('db_clients').update({
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
    }).eq('id', id).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // DELETE
  if (req.method === 'DELETE') {
    if (!isMgr) return res.status(403).json({ error: '권한 없음' });
    const { error } = await supabase.from('db_clients').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  // PATCH - 처리상태 변경 / 배분 / 계약완료
  if (req.method === 'PATCH') {
    const { type } = req.body;

    // 처리상태 변경 (배분된 설계사 or 관리자)
    if (type === 'process_status') {
      const canEdit = isMgr || dbClient.assigned_to === user.agentId;
      if (!canEdit) return res.status(403).json({ error: '권한 없음' });
      const { error } = await supabase.from('db_clients')
        .update({ process_status: req.body.processStatus })
        .eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // 배분 (관리자만)
    if (type === 'assign') {
      if (!isMgr) return res.status(403).json({ error: '권한 없음' });
      const { agentId, agentName, agentTeam } = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from('db_clients').update({
        assigned_to: agentId,
        assigned_name: agentName,
        assigned_team: agentTeam,
        assigned_date: today,
        status: 'assigned',
        process_status: '미처리',
      }).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // 배분 회수 (관리자만)
    if (type === 'unassign') {
      if (!isMgr) return res.status(403).json({ error: '권한 없음' });
      const { error } = await supabase.from('db_clients').update({
        assigned_to: null, assigned_name: null, assigned_team: null,
        assigned_date: null, status: 'unassigned', process_status: '미처리',
      }).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // 계약완료 + 고객관리 자동 연동
    if (type === 'contract') {
      const { amount, product, date, memo: contractMemo } = req.body;
      if (!amount || !date) return res.status(400).json({ error: '금액, 계약일 필수' });

      // db_clients 업데이트
      await supabase.from('db_clients').update({
        process_status: '계약완료',
        contract_amount: amount,
        contract_product: product || '',
        contract_date: date,
        contract_memo: contractMemo || '',
      }).eq('id', id);

      // clients 테이블 중복 체크 후 추가
      let clientId = null;
      if (dbClient.phone) {
        const { data: existing } = await supabase
          .from('clients').select('id').eq('phone', dbClient.phone).single();
        if (!existing) {
          const { data: newClient } = await supabase.from('clients').insert({
            agent_id: dbClient.assigned_to,
            name: dbClient.name,
            phone: dbClient.phone || null,
            ssn: dbClient.ssn || '',
            addr: dbClient.addr || '',
            job: dbClient.job || '',
            body: dbClient.body || null,
            driving: dbClient.driving || null,
            monthly_premium: dbClient.monthly_premium || null,
            status: 'active',
            memo: (dbClient.memo || '') + '\n[DB 연동] ' + date,
            alarms: [],
          }).select().single();
          clientId = newClient?.id;
        } else {
          clientId = existing.id;
        }
      }

      // 계약 정보 저장
      if (clientId) {
        await supabase.from('contracts').insert({
          client_id: clientId,
          agent_id: dbClient.assigned_to,
          product: product || '',
          premium: amount,
          date,
          status: '유지',
          memo: contractMemo || '',
        });
      }

      return res.status(200).json({ success: true, clientId });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
