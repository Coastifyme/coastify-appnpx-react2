import supabase from './supabaseClient.js'

const PROMPT = `Extract contact information from this business card image. Return ONLY valid JSON with these exact keys (use empty string "" if not found): name, company, role, email, phone, website, instagram. No markdown, no explanation, just the JSON object.`

async function parseJsonResponse(raw) {
  const cleaned = raw.replace(/```json|```/gi, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch (err) {
    const match = cleaned.match(/(\{[\s\S]*\})/)
    if (match) {
      return JSON.parse(match[1])
    }
    throw err
  }
}

async function extractWithAnthropic(base64, mediaType) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic error ${response.status}`)
  }

  const data = await response.json()
  const raw = data.content?.[0]?.text ?? '{}'
  return parseJsonResponse(raw)
}

async function extractWithOpenAI(base64, mediaType) {
  const imageUrl = `data:${mediaType};base64,${base64}`
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: PROMPT },
          { type: 'input_image', image_url: imageUrl },
        ],
      }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'contact',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              company: { type: 'string' },
              role: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              website: { type: 'string' },
              instagram: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI error ${response.status}`)
  }

  const data = await response.json()
  const raw = data.output?.[0]?.content?.find(item => item.type === 'output_text')?.text ?? data.output_text ?? JSON.stringify(data.output ?? {})
  return parseJsonResponse(raw)
}

// -- Gemini (Google) support (dynamic import) ---------------------------------
async function extractWithGemini(base64, mediaType) {
  // Attempts a dynamic import so deployments without the package don't fail at startup.
  try {
    const { google } = await import('@ai-sdk/google')
    // Many helper libraries expose a unified `generateText` helper. We'll try dynamic import
    // of a commonly used helper but fall back to using the google client directly.
    let rawText = null

    try {
      const { generateText } = await import('ai')
      // If `ai` is available, use it with the google model wrapper
      const result = await generateText({ model: google('gemini-2.5-flash'), prompt: PROMPT })
      rawText = result?.text ?? JSON.stringify(result ?? {})
    } catch (e) {
      // Fallback: call google client directly if `ai` is not present
      const client = google({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
      if (!client) throw new Error('Google AI client initialization failed')
      // Many SDKs expose `generateText` or `text.generate` — attempt both safely
      if (typeof client.generateText === 'function') {
        const r = await client.generateText({ model: 'gemini-2.5-flash', prompt: PROMPT })
        rawText = r?.text ?? JSON.stringify(r ?? {})
      } else if (client.text && typeof client.text.generate === 'function') {
        const r = await client.text.generate({ model: 'gemini-2.5-flash', prompt: PROMPT })
        rawText = r?.candidates?.[0]?.output ?? JSON.stringify(r ?? {})
      } else {
        throw new Error('Unsupported google client shape')
      }
    }

    return parseJsonResponse(rawText || '{}')
  } catch (err) {
    // Bubble a clear error so caller can fallback to other providers
    throw new Error('Gemini extraction failed: ' + (err?.message || err))
  }
}

async function extractContact(base64, mediaType) {
  // Prefer Google Gemini if key present
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return extractWithGemini(base64, mediaType)
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return extractWithAnthropic(base64, mediaType)
  }

  if (process.env.OPENAI_API_KEY) {
    return extractWithOpenAI(base64, mediaType)
  }

  return {
    name: 'Demo Person',
    email: 'demo@coastify.org',
    company: 'Coastify',
    role: 'Founder',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { base64, mediaType = 'image/jpeg' } = await req.json()
    if (!base64) return res.status(400).json({ error: 'Missing base64 payload' })

    const extracted = await extractContact(base64, mediaType)

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data, error } = await supabase
        .from('contacts')
        .insert([{ name: extracted.name, email: extracted.email, company: extracted.company, role: extracted.role }])
        .select()

      if (error) {
        console.warn('Supabase insert error', error)
      } else if (data && data[0]) {
        return res.json({ ...extracted, ...data[0] })
      }
    }

    return res.json(extracted)
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message })
  }
}
