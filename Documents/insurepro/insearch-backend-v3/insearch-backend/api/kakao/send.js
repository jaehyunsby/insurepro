import { requireAuth } from '../../lib/auth.js';
import { cors } from '../../lib/cors.js';
import supabase from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { to, templateCode, variables, from } = req.body;
  if (!to || !templateCode) {
    return res.status(400).json({ error: '수신번호와 템플릿코드는 필수입니다' });
  }

  // 사용자별 Solapi 설정 가져오기
  let apiKey, apiSecret, senderPhone;

  if (req.body.apiKey && req.body.apiSecret) {
    // 프론트에서 직접 전달한 경우 (사용자 본인 설정)
    apiKey    = req.body.apiKey;
    apiSecret = req.body.apiSecret;
    senderPhone = req.body.from || from;
  } else {
    // 환경변수 (전체관리자 기본 설정)
    apiKey    = process.env.SOLAPI_API_KEY;
    apiSecret = process.env.SOLAPI_API_SECRET;
    senderPhone = process.env.SOLAPI_SENDER;
  }

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: 'Solapi API 키를 설정해주세요' });
  }

  try {
    const timestamp = Date.now().toString();
    const salt = Math.random().toString(36).slice(2);
    const signature = await makeHmacSignature(apiSecret, timestamp, salt);

    const payload = {
      message: {
        to: to.replace(/-/g, ''),
        from: senderPhone,
        kakaoOptions: {
          pfId: process.env.SOLAPI_PF_ID || req.body.pfId,
          templateId: templateCode,
          variables: variables || {},
        },
      }
    };

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${apiKey}, date=${timestamp}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.message || '발송 실패' });

    // 발송 로그
    await supabase.from('usage_logs').insert({
      created_at: new Date().toISOString(),
      user_id: user.id, user_name: user.name, user_role: user.role,
      feature: 'kakao_send',
      meta: JSON.stringify({ to, templateCode }),
    });

    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ error: '카카오 발송 오류: ' + e.message });
  }
}

async function makeHmacSignature(secret, date, salt) {
  const { createHmac } = await import('crypto');
  return createHmac('sha256', secret)
    .update(date + salt)
    .digest('hex');
}
