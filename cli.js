#!/usr/bin/env node
const readline = require('readline');
const fetchProfile = require('./index');

function printBeautified(data) {
  console.log("\n==================================================");
  console.log(`👤  @${data.username} (${data.nickname})`);
  if (data.verified) console.log(`✅  Verified Account`);
  if (data.private) console.log(`🔒  Private Account`);
  console.log("--------------------------------------------------");
  console.log("📊  STATISTICS");
  console.log(`   • Followers:  ${data.stats.followers.toLocaleString()}`);
  console.log(`   • Following:  ${data.stats.following.toLocaleString()}`);
  console.log(`   • Likes:      ${data.stats.hearts.toLocaleString()}`);
  console.log(`   • Videos:     ${data.stats.videos.toLocaleString()}`);
  console.log("--------------------------------------------------");
  console.log("📝  BIO");
  console.log(`   ${data.bio ? data.bio.replace(/\n/g, '\n   ') : 'No bio'}`);
  console.log("--------------------------------------------------");
  console.log("ℹ️   INFO");
  console.log(`   • Region:     ${data.region || 'N/A'}`);
  console.log(`   • Created:    ${data.create_time || 'N/A'}`);
  if (data.secUid) {
    console.log("--------------------------------------------------");
    console.log(`🔑  SecUid: ${data.secUid.substring(0, 25)}...`);
  }
  console.log("==================================================\n");
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Username: ', (input) => {
  if (!input) { console.log("No username provided."); rl.close(); return; }

  rl.question('Format (j = JSON, b = Beautified): ', async (formatInput) => {
    try {
      const info = await fetchProfile(input);
      const fmt = formatInput.trim().toLowerCase();
      
      if (fmt === 'j' || fmt === 'json') {
        console.log(JSON.stringify(info, null, 2));
      } else {
        printBeautified(info);
      }
    } catch (error) {
      console.error("Error:", error.message);
    } finally {
      rl.close();
    }
  });
});