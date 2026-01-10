// index.js
let countries = {};
try { countries = require('./countries.json'); } catch (e) { countries = {}; }

// use desktop user-agent for full html
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};

// helper to clean backslashes from regex matches
function cleanMatch(str) {
  return str ? str.replace(/\\/g, '') : null;
}

// helper to extract regex match
function extract(regex, text) {
  const match = text.match(regex);
  return match ? cleanMatch(match[1]) : null;
}

async function fetchProfile(username) {
  const cleanUser = username.trim().replace(/^@/, '');
  const url = `https://www.tiktok.com/@${cleanUser}`;
  const controller = new AbortController();
  
  // timeout 15s
  setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const html = await response.text();

    // step 1: try to get the full json object
    let rawData = { user: {}, stats: {} }; 

    try {
      const universalMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
      const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>([^<]+)<\/script>/);

      if (universalMatch) {
        const json = JSON.parse(universalMatch[1]);
        const defaultScope = json["__DEFAULT_SCOPE__"] || {};
        const webappUser = defaultScope["webapp.user-detail"] || {};
        
        // merge json data
        if (webappUser.userInfo) {
          rawData.user = { ...rawData.user, ...(webappUser.userInfo.user || {}) };
          rawData.stats = { ...rawData.stats, ...(webappUser.userInfo.stats || {}) };
          // preserve other keys
          for (const key in webappUser.userInfo) {
              if (key !== 'user' && key !== 'stats') rawData[key] = webappUser.userInfo[key];
          }
        }
      } 
      else if (sigiMatch) {
        const json = JSON.parse(sigiMatch[1]);
        if (json.UserModule && json.UserModule.users) {
          const key = Object.keys(json.UserModule.users)[0];
          rawData.user = { ...rawData.user, ...(json.UserModule.users[key] || {}) };
          rawData.stats = { ...rawData.stats, ...(json.UserModule.stats[key] || {}) };
        }
      }
    } catch (e) {
      // ignore json errors
    }

    // step 2: scrape the region using "super aggressive" strategy
    let scrapedRegion = null;
    const uniqueIdStr = cleanUser;
    const baseIndex = html.indexOf(uniqueIdStr);
    
    // strategy a: look in a massive block around the username
    if (baseIndex !== -1) {
      // look 50,000 chars back (covers almost the whole json blob)
      const start = Math.max(0, baseIndex - 50000);
      const end = Math.min(html.length, baseIndex + 10000);
      const block = html.substring(start, end);

      // regex allows for spaces: "region" : "US"
      scrapedRegion = extract(/(?:\\?)"region(?:\\?)"\s*:\s*(?:\\?)"(.*?)(?:\\?)"/, block);
    }

    // strategy b: if still null, search the ENTIRE html for the specific user-region pattern
    if (!scrapedRegion) {
        // this is a fallback that looks for standard unescaped region key
        // rarely needed but good for "weird" layouts
        scrapedRegion = extract(/"region"\s*:\s*"([A-Z]{2})"/, html);
    }

    // step 3: merge/force region into the data
    if (scrapedRegion) {
      if (!rawData.user) rawData.user = {};
      rawData.user.region = scrapedRegion;
      rawData.user.regionName = countries[scrapedRegion] || scrapedRegion;
    }

    // ensure uniqueId exists
    if (!rawData.user.uniqueId) {
      rawData.user.uniqueId = cleanUser;
    }

    return rawData;

  } catch (e) {
    return { error: e.message };
  }
}

module.exports = fetchProfile;