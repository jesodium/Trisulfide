// index.js
let countries = {};
try { 
  countries = require('./countries.json'); 
} catch (e) { 
  countries = {}; 
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};

const HEADERS_MOBILE = {
  "User-Agent": "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_40.6.0 BytedanceWebview/d8a21c6",
  "Accept": "text/html"
};

function extract(regex, text) {
  const match = text.match(regex);
  return match ? match[1] : null;
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
    
    // Fetch again with mobile headers to get region data
    const mobileUrl = `https://www.tiktok.com/@${cleanUser}?isUniqueId=true&isSecured=true`;
    const mobileController = new AbortController();
    setTimeout(() => mobileController.abort(), 15000);
    
    const mobileResponse = await fetch(mobileUrl, { headers: HEADERS_MOBILE, signal: mobileController.signal });
    if (mobileResponse.ok) {
      const mobileHtml = await mobileResponse.text();
      const uniqueIdStr = `"uniqueId":"${cleanUser}"`;
      const baseIndex = mobileHtml.indexOf(uniqueIdStr);
      const block = baseIndex !== -1 ? mobileHtml.substring(baseIndex, baseIndex + 10000) : mobileHtml;
      const regionCode = extract(/"region":"(.*?)"/, block);
      
      // Add region to the user object
      if (regionCode) {
        rawData.user.region = countries[regionCode] || regionCode;
      }
    }
    
    // return the full raw json object
    return rawData;
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = fetchProfile;