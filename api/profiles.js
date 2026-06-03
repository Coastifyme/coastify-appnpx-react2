const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function buildHeaders() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${SUPABASE_KEY}`,
    apikey: SUPABASE_KEY,
  };
}

function normalizeSlug(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 7);
}

async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const headers = { ...buildHeaders(), ...options.headers };
  const response = await fetch(url, { ...options, headers });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function profileExists(slug) {
  const { response, body } = await supabaseFetch(`/rest/v1/profiles?slug=eq.${encodeURIComponent(slug)}&select=slug`);
  if (!response.ok) {
    throw new Error(body?.message || 'Failed to check slug availability.');
  }
  return Array.isArray(body) && body.length > 0;
}

async function ensureUniqueSlug(base) {
  let slug = normalizeSlug(base);
  if (!slug) slug = `coastify-${randomSuffix()}`;

  for (let i = 0; i < 6; i += 1) {
    if (!(await profileExists(slug))) return slug;
    slug = `${slug}-${randomSuffix()}`;
  }

  return `${slug}-${randomSuffix()}`;
}

async function getProfileBySlug(slug) {
  const { response, body } = await supabaseFetch(`/rest/v1/profiles?slug=eq.${encodeURIComponent(slug)}&select=profile`);
  if (!response.ok) {
    throw new Error(body?.message || 'Failed to fetch profile.');
  }
  return Array.isArray(body) && body.length ? body[0].profile : null;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const slug = req.query.slug || req.url?.split('?')[0]?.split('/').pop();
    if (!slug) return res.status(400).json({ error: 'Missing slug query parameter' });

    try {
      const profile = await getProfileBySlug(slug);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      return res.json({ profile });
    } catch (err) {
      return res.status(500).json({ error: 'Profile fetch failed', details: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        name,
        role,
        tagline,
        emoji,
        color,
        website,
        linkedin,
        instagram,
        facebook,
        threads,
        email,
      } = await req.json();

      if (!name || !role) {
        return res.status(400).json({ error: 'Name and role are required.' });
      }

      const slug = await ensureUniqueSlug(name);
      const profile = {
        name,
        role,
        tagline: tagline || '',
        emoji: emoji || '✨',
        color: color || '#ff4fa3',
        accentGradient: `linear-gradient(135deg,${color || '#ff4fa3'},#6b0040)`,
        email: email || '',
        website: website || '',
        linkedin: linkedin || '',
        instagram: instagram || '',
        facebook: facebook || '',
        threads: threads || '',
        activeMode: 'social',
        links: [
          { label: '📸 Instagram', url: instagram || 'https://www.instagram.com' },
          { label: '📘 Facebook', url: facebook || 'https://www.facebook.com' },
          { label: '🧵 Threads', url: threads || 'https://www.threads.net' },
          { label: '🔗 LinkedIn', url: linkedin || 'https://www.linkedin.com' },
          { label: '🌐 Website', url: website || 'https://www.coastify.org' },
        ],
      };

      const { response, body } = await supabaseFetch('/rest/v1/profiles', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ slug, profile }),
      });

      if (!response.ok) {
        return res.status(500).json({ error: 'Profile creation failed', details: body?.message || JSON.stringify(body) });
      }

      const created = Array.isArray(body) && body.length ? body[0] : null;
      return res.status(201).json({ slug, profile: created?.profile || profile });
    } catch (err) {
      return res.status(500).json({ error: 'Profile creation failed', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
