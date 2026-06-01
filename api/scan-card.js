const PROMPT = `Extract contact information from this business card image. Return ONLY valid JSON with these exact keys and nothing else: name, company, role, email, phone, website, instagram. Use an empty string for missing values. No markdown, no explanation, no surrounding text, only a raw JSON object.`

function sanitizeJson(raw) {
  const cleaned = raw?.replace(/```(?:json)?/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : cleaned);
}

async function extractWithGemini(base64, mediaType) {
  const { google } = await import('@ai-sdk/google');
  const { generateText } = await import('ai');
  const response = await generateText({
    model: google('gemini-2.5-flash'),
    prompt: `${PROMPT}\n\nImage base64 (media_type=${mediaType}):\n${base64}`,
    temperature: 0.0,
  });
  const raw = response?.text ?? JSON.stringify(response ?? {});
  return sanitizeJson(raw);
}

async function extractWithOpenAI(base64, mediaType) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) throw new Error('OpenAI API key is not configured.');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: `Image base64 (media_type=${mediaType}):\n${base64}` },
      ],
      temperature: 0.0,
      max_tokens: 800,
    }),
  });

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? JSON.stringify(data ?? {});
  return sanitizeJson(raw);
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { base64, mediaType } = await req.json();
    if (!base64) return res.status(400).json({ error: 'Missing base64 payload' });
    if (!mediaType) return res.status(400).json({ error: 'Missing mediaType' });

    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const result = await extractWithGemini(base64, mediaType);
      return res.json(result);
    }

    if (process.env.OPENAI_API_KEY) {
      const result = await extractWithOpenAI(base64, mediaType);
      return res.json(result);
    }

    return res.status(400).json({ error: 'No supported AI provider is configured. Add GOOGLE_GENERATIVE_AI_API_KEY or OPENAI_API_KEY.' });
  } catch (err) {
    return res.status(500).json({ error: 'AI extraction failed', details: err.message });
  }
}

export default handler;
