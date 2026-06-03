const PROMPT = `Extract contact information from this business card image. Return ONLY valid JSON with these exact keys and nothing else: name, company, role, email, phone, website, instagram. Use an empty string for missing values. No markdown, no explanation, no surrounding text, only a raw JSON object.`

function sanitizeJson(raw) {
  const cleaned = raw?.replace(/```(?:json)?/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : cleaned);
}

// Ensure the Google client library picks up the configured key if provided
if (process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

async function uploadImageToSupabase(base64, mediaType) {
  const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!SUPABASE_URL || !SUPABASE_KEY || !bucket) return null;

  const extension = mediaType.split("/")[1] || "jpg";
  const fileName = `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const path = `card-uploads/${fileName}`;
  const body = Buffer.from(base64, "base64");
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}`;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": mediaType,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn("Supabase storage upload failed:", response.status, text);
    return null;
  }

  return {
    bucket,
    path,
    publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}`,
  };
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

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { base64, mediaType } = await req.json();
    if (!base64) return res.status(400).json({ error: 'Missing base64 payload' });
    if (!mediaType) return res.status(400).json({ error: 'Missing mediaType' });

    const storageInfo = await uploadImageToSupabase(base64, mediaType);

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return res.status(400).json({ error: 'Google Generative AI is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY.' });
    }

    const result = await extractWithGemini(base64, mediaType);
    return res.json({ ...result, storageInfo });
  } catch (err) {
    return res.status(500).json({ error: 'AI extraction failed', details: err.message });
  }
}

export default handler;
