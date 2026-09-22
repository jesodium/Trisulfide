// index.js
let countries = {};
try { countries = require('./countries.json'); } catch (e) { countries = {}; }

// IMPORTANT NOTE: desktop UAs now get TikTok's WAF JS challenge ("Please wait..."),
// mobile Safari UA still gets the rehydration JSON. If this breaks too, need a real browser.
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};

// fetch a tiktok page as html with a 15s timeout
async function getHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    return res.ok ? await res.text() : '';
  } finally { clearTimeout(t); }
}

// TikTok removed region from the profile object. It still ships per-video as
// itemStruct.locationCreated (country the video was posted from), and both
// pages below are unsigned: embed page -> video ids, video page -> location.
// IMPORTANT NOTE: this is where the user posts from, not the account's signup
// region — same thing for almost everyone. Tries the first 3 videos; no public
// videos (private / empty account) = no region.
async function fetchRegion(username) {
  const embed = await getHtml(`https://www.tiktok.com/embed/@${username}`);
  const m = embed.match(/<script id="__FRONTITY_CONNECT_STATE__"[^>]*>([^<]+)<\/script>/);
  if (!m) return null;
  const page = JSON.parse(m[1]).source.data[`/embed/@${username}`] || {};

  for (const v of (page.videoList || []).slice(0, 3)) {
    const html = await getHtml(`https://www.tiktok.com/@${username}/video/${v.id}`);
    const code = (html.match(/"locationCreated":"([A-Z]{2})"/) || [])[1];
    if (code) return countries[code] || code;
  }
  return null;
}

async function fetchProfile(username) {
  // clean up the username input
  const cleanUser = username.trim().replace(/^@/, '');
  const url = `https://www.tiktok.com/@${cleanUser}`;
  const controller = new AbortController();
  
  // timeout after 15 seconds
  setTimeout(() => controller.abort(), 15000);
  
  try {
    // fetch the html from tiktok with desktop headers for full JSON
    const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    
    const html = await response.text();
    let rawData = null;
    
    // look for the universal data script tag
    const universalMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
    // look for the legacy sigi state script tag
    const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>([^<]+)<\/script>/);
    
    if (universalMatch) {
      // parse the main json object
      const json = JSON.parse(universalMatch[1]);
      const defaultScope = json["__DEFAULT_SCOPE__"] || {};
      const webappUser = defaultScope["webapp.user-detail"] || {};
      rawData = webappUser.userInfo;
    } 
    else if (sigiMatch) {
      // fallback parsing for older layouts
      const json = JSON.parse(sigiMatch[1]);
      if (json.UserModule && json.UserModule.users) {
        const key = Object.keys(json.UserModule.users)[0];
        rawData = {
          user: json.UserModule.users[key],
          stats: json.UserModule.stats[key]
        };
      }
    }
    
    if (!rawData || !rawData.user) {
      return { error: "unable to find json data in response" };
    }

    // region: best-effort, never fail the whole fetch over it
    const region = await fetchRegion(cleanUser).catch(() => null);
    if (region) rawData.user.region = region;

    // return the full raw json object
    return rawData;
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = fetchProfile;

// self-check: `node index.js` — live region fetch for known accounts.
if (require.main === module) {
  const assert = require('assert');
  assert.strictEqual(countries['US'], 'United States 🇺🇸', 'country code must map to name');
  (async () => {
    for (const [u, want] of [['tiktok', 'US'], ['bbc', 'GB']]) {
      const d = await fetchProfile(u);
      assert(d.user, `@${u}: ${d.error}`);
      assert.strictEqual(d.user.region, countries[want], `@${u} region`);
      console.log(`@${u}: ${d.user.region}`);
    }
    console.log('ok');
  })();
}
