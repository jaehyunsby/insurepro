import { requireAuth } from '../../lib/auth.js';
import { cors } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { title, body, userIds, url } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title, body 필수' });

  const appId   = process.env.ONESIGNAL_APP_ID;
  const restKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restKey) {
    return res.status(500).json({ error: 'OneSignal 설정 오류' });
  }

  try {
    const payload = {
      app_id: appId,
      headings: { ko: title, en: title },
      contents: { ko: body, en: body },
    };

    if (userIds?.length) {
      payload.include_external_user_ids = userIds.map(String);
    } else {
      payload.included_segments = ['All'];
    }

    if (url) payload.url = url;

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.errors?.join(', ') || '발송 실패' });

    return res.status(200).json({ success: true, id: data.id, recipients: data.recipients });
  } catch (e) {
    return res.status(500).json({ error: '푸시 발송 오류: ' + e.message });
  }
}
