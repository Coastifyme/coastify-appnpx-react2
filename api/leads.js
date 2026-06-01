import supabase from './supabaseClient.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('leads')
      .select('id,name,email,phone,note,created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return res.status(500).json({ error: error.message || 'Unable to load leads' })
    }

    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const name = String(body.name || '').trim()
      const email = String(body.email || '').trim()
      const phone = String(body.phone || '').trim()
      const note = String(body.note || '').trim()

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' })
      }

      const { data, error } = await supabase
        .from('leads')
        .insert([{ name, email, phone, note }])
        .select()
        .single()

      if (error) {
        throw error
      }

      return res.status(201).json(data)
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Unable to save lead' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
