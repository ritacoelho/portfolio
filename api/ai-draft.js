// POST /api/ai-draft
// Admin-only: generate a first-draft case study for a new project using Claude.
// Requires ANTHROPIC_API_KEY environment variable to be set in Vercel.

const jwt = require('jsonwebtoken');

function isAdmin(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    jwt.verify(token, process.env.ADMIN_SESSION_SECRET);
    return true;
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'AI features are not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables.',
    });
  }

  const { title, summary, tags, role, company, period } = req.body || {};

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const tagsList = Array.isArray(tags) ? tags.join(', ') : (tags || 'not specified');

  const prompt = `You are helping a UX designer named Rita Coelho write a case study for her portfolio website.

Project details:
- Title: ${title}
- Company / Client: ${company || 'not specified'}
- My role: ${role || 'not specified'}
- Period: ${period || 'not specified'}
- Tags / disciplines: ${tagsList}
- Summary: ${summary || 'not provided'}

Write a portfolio case study as a JSON array of content blocks. Use these block types only:
  { "type": "heading", "level": 2, "text": "Section heading" }
  { "type": "paragraph", "text": "Body text." }
  { "type": "callout", "text": "Key insight or notable result." }
  { "type": "divider" }

Requirements:
- Write in first person as Rita
- Structure: Context / Brief → The challenge → My approach → Key decisions or process → Outcome / Impact
- Use a divider block between each major section
- 1–2 paragraphs per section; keep each paragraph concise (2–4 sentences)
- Include one callout for a particularly notable insight, decision, or outcome
- Use placeholder text where specific details are unknown (e.g. "[add metrics here]")
- Do NOT wrap the JSON in markdown code fences — return ONLY the raw JSON array`;

  try {
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    });

    const raw   = (message.content[0] && message.content[0].text) || '';
    const match = raw.match(/\[[\s\S]*\]/);

    if (!match) {
      console.error('ai-draft: unexpected response', raw.slice(0, 400));
      return res.status(500).json({ error: 'Could not parse AI response — please try again' });
    }

    let blocks;
    try {
      blocks = JSON.parse(match[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Malformed JSON in AI response' });
    }

    return res.status(200).json({ content: blocks });
  } catch (err) {
    console.error('ai-draft error:', err);
    return res.status(500).json({ error: err.message || 'AI generation failed' });
  }
};
