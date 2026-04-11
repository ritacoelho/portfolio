// POST /api/seed  — admin only
// Seeds existing static projects and journey entries into KV.
// Safe to run multiple times (skips existing slugs/ids).

const { Redis } = require('@upstash/redis');
const jwt       = require('jsonwebtoken');

const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function isAdmin(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { jwt.verify(token, process.env.ADMIN_SESSION_SECRET); return true; }
  catch { return false; }
}

// ── Static project seed data ──────────────────────────────────────
const PROJECTS = [
  {
    slug: 'hexagon',
    title: 'Hexagon: Enterprise Scale Design',
    summary: 'UX across Hexagon\'s geospatial and industrial software suite. NDA protected; enter access code to view.',
    tags: ['Enterprise UX', 'Product Design', 'Design Systems'],
    year: 2024,
    period: '2022 to Present',
    role: 'UX Designer',
    company: 'Hexagon AB',
    location: 'Zurich, Switzerland',
    coverImage: null,
    isLocked: true,
    isStatic: true,
    isHidden: false,
    order: 1,
    content: [],
  },
  {
    slug: 'atlassian',
    title: 'Pilot: AI-Assisted Workplace Onboarding',
    summary: 'Bridging the gap between student skills and workplace expectations for Atlassian, from research to interactive prototype.',
    tags: ['UX Design', 'Product Strategy'],
    year: 2023,
    period: '2023',
    role: 'UX Designer (Academic)',
    company: 'Atlassian (Academic project)',
    location: 'Sydney, Australia',
    coverImage: '/images/projects/atlassian/cover.png',
    isLocked: false,
    isStatic: true,
    isHidden: false,
    order: 2,
    content: [],
  },
  {
    slug: 'last-mile',
    title: 'Last Mile: Reducing Delivery Anxiety',
    summary: 'How do you reduce failed deliveries and the anxiety spiral they create for customers and couriers?',
    tags: ['Service Design', 'Mobile UX'],
    year: 2022,
    period: '2022',
    role: 'UX / Service Designer',
    company: 'Academic project',
    location: 'Sydney, Australia',
    coverImage: '/images/work/ipad-screens.png',
    isLocked: false,
    isStatic: true,
    isHidden: false,
    order: 3,
    content: [],
  },
  {
    slug: 'sonic-link',
    title: 'MAP Mima: Music as Public Space',
    summary: 'Designed and coded a mobile experience connecting personal sound palettes to real-time light patterns across a public installation, including the MQTT layer.',
    tags: ['Interaction Design', 'Public Installation'],
    year: 2022,
    period: '2022',
    role: 'Interaction Designer & Developer',
    company: 'University of Sydney',
    location: 'Sydney, Australia',
    coverImage: '/images/work/sonic-thumbnail.png',
    isLocked: false,
    isStatic: true,
    isHidden: false,
    order: 4,
    content: [],
  },
];

// ── Static journey seed data ──────────────────────────────────────
const JOURNEY = [
  {
    id: 'j-hexagon',
    role: 'UX/UI Designer',
    org: 'Hexagon Geosystems',
    type: 'work',
    location: 'Zurich, Switzerland',
    startYear: 2024, startMonth: 5,
    endYear: null, endMonth: null, isCurrent: true,
    description: 'Working on UX/UI for geospatial and industrial software products at one of the world\'s leading digital reality companies. Cross-functional collaboration across design, product and engineering.',
    bullets: [],
    isHidden: false,
  },
  {
    id: 'j-masters',
    role: 'Master\'s in Interaction Design & Electronic Arts',
    org: 'University of Sydney',
    type: 'edu',
    location: 'Sydney, Australia',
    startYear: 2022, startMonth: 8,
    endYear: 2024, endMonth: 1, isCurrent: false,
    description: 'Specialising in interaction design, physical computing and electronic arts. Studio projects included the MAP Mima Sonic Link installation, designed, coded and deployed end-to-end.',
    bullets: [],
    isHidden: false,
  },
  {
    id: 'j-sap',
    role: 'UX & Cloud Associate Development Consultant',
    org: 'SAP',
    type: 'work',
    location: 'Lisbon, Portugal',
    startYear: 2021, startMonth: 11,
    endYear: 2022, endMonth: 7, isCurrent: false,
    description: 'Part of a multidisciplinary team developing SAP Fiori Elements for UX projects on cloud using CDS and Node.js. Bridging UX and frontend implementation.',
    bullets: [],
    isHidden: false,
  },
  {
    id: 'j-vodafone',
    role: 'Web Developer',
    org: 'Vodafone',
    type: 'work',
    location: 'Lisbon, Portugal',
    startYear: 2020, startMonth: 11,
    endYear: 2021, endMonth: 10, isCurrent: false,
    description: 'Responsible for design, development, testing and deployment of an internal web application for the Transport Network Operations team, end-to-end across the full product lifecycle.',
    bullets: [],
    isHidden: false,
  },
  {
    id: 'j-buildup',
    role: 'Mobile / Web Application Developer',
    org: 'Build Up Labs',
    type: 'work',
    location: 'Lisbon, Portugal',
    startYear: 2020, startMonth: 7,
    endYear: 2020, endMonth: 9, isCurrent: false,
    description: 'Startup studio internship. Contributed to the full development cycle of a mobile app, from business strategy and competitor analysis through to wireframing and front-end development with back-end integration.',
    bullets: [],
    isHidden: false,
  },
  {
    id: 'j-baseform',
    role: 'User Experience',
    org: 'Baseform',
    type: 'work',
    location: 'Lisbon, Portugal',
    startYear: 2019, startMonth: 9,
    endYear: 2019, endMonth: 12, isCurrent: false,
    description: 'Supported product development in user interface design and user activity notifications for a water infrastructure software platform.',
    bullets: [],
    isHidden: false,
  },
  {
    id: 'j-bachelor',
    role: 'Bachelor\'s in Computer Science & Engineering',
    org: 'Instituto Superior Técnico',
    type: 'edu',
    location: 'Lisbon, Portugal',
    startYear: 2015, startMonth: null,
    endYear: 2020, endMonth: null, isCurrent: false,
    description: 'Foundation in software engineering, algorithms, systems and human-computer interaction. The CS background informs how I think about design constraints, technical feasibility and working across disciplines.',
    bullets: [],
    isHidden: false,
  },
];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = { projects: [], journey: [], skipped: [], purged: [] };

  // ── Purge non-static (dynamic/test) project entries ───────────
  // Projects are now static HTML files. Any KV entry without isStatic:true
  // is a leftover test/dynamic entry and should be removed.
  const staticSlugs = PROJECTS.map(p => p.slug);
  const existingList = (await kv.get('project:list')) || [];
  const slugsToPurge = existingList.filter(s => !staticSlugs.includes(s));

  for (const slug of slugsToPurge) {
    await kv.del(`project:${slug}`);
    results.purged.push(slug);
  }

  // ── Seed projects ─────────────────────────────────────────────
  // Start fresh from the canonical static list only
  const projectList = existingList.filter(s => staticSlugs.includes(s));

  for (const p of PROJECTS) {
    if (projectList.includes(p.slug)) {
      // Re-apply seed data but preserve isHidden / isLocked if already set
      const existing = await kv.get(`project:${p.slug}`);
      const entry = {
        ...p,
        isHidden: existing ? existing.isHidden : (p.isHidden || false),
        isLocked: existing ? existing.isLocked : (p.isLocked || false),
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await kv.set(`project:${p.slug}`, entry);
      results.skipped.push('project:' + p.slug);
      continue;
    }
    const entry = {
      ...p,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`project:${p.slug}`, entry);
    projectList.push(p.slug);
    results.projects.push(p.slug);
  }
  await kv.set('project:list', projectList);

  // ── Seed journey ──────────────────────────────────────────────
  const journeyList = (await kv.get('journey:list')) || [];

  for (const e of JOURNEY) {
    if (journeyList.includes(e.id)) {
      results.skipped.push('journey:' + e.id);
      continue;
    }
    const entry = {
      ...e,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`journey:${e.id}`, entry);
    journeyList.push(e.id);
    results.journey.push(e.id);
  }
  await kv.set('journey:list', journeyList);

  return res.status(200).json({
    message: 'Seed complete',
    seeded:  { projects: results.projects, journey: results.journey },
    skipped: results.skipped,
    purged:  results.purged,
  });
};
