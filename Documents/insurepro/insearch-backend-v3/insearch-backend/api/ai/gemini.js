import { requireAuth } from '../../lib/auth.js';
import { cors } from '../../lib/cors.js';
import supabase from '../../lib/supabase.js';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { feature, contents, systemInstruction, generationConfig } = req.body;
  if (!contents) return res.status(400).json({ error: 'contents 필수' });

  // Gemini API 키는 환경변수에서 가져옴 (프론트엔드에 노출 안됨)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI 서비스 설정 오류' });

  try {
    const body = { contents };
    if (systemInstruction) body.systemInstruction = systemInstruction;
    if (generationConfig) body.generationConfig = generationConfig;

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'AI 오류' });
    }

    // 사용량 로그
    const tokIn  = data.usageMetadata?.promptTokenCount || 0;
    const tokOut = data.usageMetadata?.candidatesTokenCount || 0;
    const costKRW = Math.round((tokIn * 0.000075 + tokOut * 0.0003) * 1350);

    await supabase.from('usage_logs').insert({
      created_at: new Date().toISOString(),
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      feature: feature || 'ai',
      meta: JSON.stringify({ tokIn, tokOut, costKRW }),
    });

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'AI 서버 오류: ' + e.message });
  }
}
