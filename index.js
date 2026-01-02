// index.js
let countries = {};
try { countries = require('./countries.json'); } catch (e) { countries = {}; }

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_40.6.0 BytedanceWebview/d8a21c6",
  "Accept": "text/html"
};

function ts(timestamp) {
  try {
    if (!timestamp) return null;
    const date = new Date(parseInt(timestamp, 10) * 1000);
    return isNaN(date.getTime()) ? null : date.toISOString().replace('T', ' ').split('.')[0];
  } catch (e) { return null; }
}

function extract(regex, text) {
  const match = text.match(regex);
  return match ? match[1] : null;
}

async function fetchProfile(username) {
  const cleanUser = username.trim().replace(/^@/, '');
  const url = `https://www.tiktok.com/@${cleanUser}?isUniqueId=true&isSecured=true`;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const html = await response.text();

    const uniqueIdStr = `"uniqueId":"${cleanUser}"`;
    const baseIndex = html.indexOf(uniqueIdStr);
    const block = baseIndex !== -1 ? html.substring(baseIndex, baseIndex + 10000) : html;

    return {
      username: cleanUser,
      nickname: extract(/"nickname":"(.*?)"/, block),
      secUid: extract(/"secUid":"(.*?)"/, block),
      verified: extract(/"verified":(true|false)/, block) === 'true',
      private: extract(/"privateAccount":(true|false)/, block) === 'true',
      region: countries[extract(/"region":"(.*?)"/, block)] || extract(/"region":"(.*?)"/, block),
      language: extract(/"language":"(.*?)"/, block),
      bio: extract(/"signature":"(.*?)"/, block),
      stats: {
        followers: parseInt(extract(/"followerCount":(\d+)/, block) || 0),
        following: parseInt(extract(/"followingCount":(\d+)/, block) || 0),
        hearts: parseInt(extract(/"heartCount":(\d+)/, block) || 0),
        videos: parseInt(extract(/"videoCount":(\d+)/, block) || 0),
      },
      create_time: ts(extract(/"createTime":(\d{10})/, block)),
    };
  } finally {
    // Cleanup handled by GC, but good practice to clear timeout if logic allowed
  }
}

module.exports = fetchProfile;