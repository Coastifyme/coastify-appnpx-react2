export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { base64 } = await req.json();
    // Simple mock extraction — replace with real OCR/AI integration in production
    // For now we return a deterministic mock if base64 is present
    if (!base64) return res.status(400).json({ error: 'Missing base64 payload' });
    return res.json({ name: 'Demo Person', email: 'demo@coastify.org', company: 'Coastify', role: 'Founder' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
