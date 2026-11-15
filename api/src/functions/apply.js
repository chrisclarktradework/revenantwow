// POST /api/apply : takes a guild application from the site form and sends it to Discord.
// The Discord webhook URL is the app setting DISCORD_WEBHOOK_URL of the Static Web App.
// It is never in the repo or in the page.
const ALLOWED_ORIGINS = [
  'https://www.revenantwow.com',
  'https://revenantwow.com',
  'https://lemon-dune-01b6cce10.5.azurestaticapps.net'
];
const TIMES = ['7pm-10pm EST', '9pm-midnight EST', '10pm-1am EST', '10am-1pm EST'];
const hits = new Map(); // best effort limit: 5 applications per 10 minutes for each address

function text(v, max) {
  if (typeof v !== 'string') return '';
  const s = v.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
function json(status, body) {
  return { status, jsonBody: body, headers: { 'Cache-Control': 'no-store' } };
}
function limited(ip, now) {
  const list = (hits.get(ip) || []).filter(t => now - t < 600000);
  if (list.length >= 5) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

async function handle(req, env, send, now) {
  const origin = req.headers.get('origin') || '';
  if (!ALLOWED_ORIGINS.includes(origin)) return json(403, { error: 'origin' });
  let b;
  try { b = await req.json(); } catch (e) { return json(400, { error: 'body' }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json(400, { error: 'body' });
  if (b.website) return json(200, { ok: true }); // bot trap: accept and send nothing

  const f = {
    charName: text(b.charName, 60), discord: text(b.discord, 100), mainRC: text(b.mainRC, 50), mainSpec: text(b.mainSpec, 100),
    altRC: text(b.altRC, 50), altSpec: text(b.altSpec, 100), raidOn: text(b.raidOn, 20), level: text(b.level, 20),
    priority: text(b.priority, 20), fav: text(b.fav, 1000), more: text(b.more, 1000)
  };
  const times = Array.isArray(b.times) ? b.times.filter(t => TIMES.includes(t)) : [];
  if (!f.charName || !f.discord || !f.mainRC || !f.mainSpec || !f.fav || !f.priority || times.length === 0) return json(400, { error: 'fields' });

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (limited(ip, now)) return json(429, { error: 'rate' });

  const url = env.DISCORD_WEBHOOK_URL || '';
  if (url.indexOf('https://discord.com/api/webhooks/') !== 0) return json(503, { error: 'not configured' });

  const payload = {
    username: 'Revenant Applications',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: 'New guild application: ' + f.charName,
      color: 0xc9341f,
      fields: [
        { name: 'Discord', value: f.discord, inline: true },
        { name: 'Main race and class', value: f.mainRC, inline: true },
        { name: 'Main spec and role', value: f.mainSpec, inline: true },
        { name: 'Alt race and class', value: f.altRC || 'None', inline: true },
        { name: 'Alt spec and role', value: f.altSpec || 'None', inline: true },
        { name: 'Raiding on', value: f.raidOn || '-', inline: true },
        { name: 'Level', value: f.level || '-', inline: true },
        { name: 'Highest priority', value: f.priority, inline: true },
        { name: 'Preferred time of play', value: times.join(', ') },
        { name: 'Favorite things about WoW', value: f.fav },
        { name: 'Anything else', value: f.more || '-' }
      ],
      footer: { text: 'www.revenantwow.com' },
      timestamp: new Date(now).toISOString()
    }]
  };
  let r;
  try { r = await send(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
  catch (e) { return json(502, { error: 'discord' }); }
  if (!r.ok) return json(502, { error: 'discord', status: r.status });
  return json(200, { ok: true });
}

module.exports = { handle };

try {
  const { app } = require('@azure/functions');
  app.http('apply', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'apply',
    handler: (req) => handle(req, process.env, fetch, Date.now())
  });
} catch (e) { /* the unit test loads this file without the Azure package */ }
