#!/usr/bin/env node
const readline = require('readline');
const fetchProfile = require('./index');

// formatting helper for timestamps
function formatVal(key, val) {
  if (key.toLowerCase().includes('time') && typeof val === 'number') {
    try {
      return `${val} (${new Date(val * 1000).toISOString().replace('T', ' ').split('.')[0]})`;
    } catch (e) { return val; }
  }
  return val;
}

// recursive function to print everything that isn't empty
function printTree(obj, indent = 0) {
  const space = '   '.repeat(indent);
  
  for (const [key, val] of Object.entries(obj)) {
    // skip empty strings, nulls, or undefined
    if (val === null || val === undefined || val === '') continue;
    
    // skip empty arrays
    if (Array.isArray(val) && val.length === 0) continue;

    // skip empty objects
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) continue;

    if (typeof val === 'object' && !Array.isArray(val)) {
      // print object header and recurse
      console.log(`${space}📂 ${key}`);
      printTree(val, indent + 1);
    } else {
      // print value
      console.log(`${space}• ${key}: ${formatVal(key, val)}`);
    }
  }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('username: ', (input) => {
  if (!input) { console.log("no username provided."); rl.close(); return; }

  rl.question('format (j = json, b = beautified): ', async (formatInput) => {
    try {
      console.log(`\nfetching data for @${input}...\n`);
      const rawData = await fetchProfile(input);
      
      if (rawData.error) {
        console.error("error:", rawData.error);
        rl.close();
        return;
      }

      const fmt = formatInput.trim().toLowerCase();
      
      if (fmt === 'j' || fmt === 'json') {
        console.log(JSON.stringify(rawData, null, 2));
      } else {
        console.log("==================================================");
        // prints every single non-empty field found in the json
        printTree(rawData);
        console.log("==================================================");
      }
    } catch (error) {
      console.error("fatal error:", error.message);
    } finally {
      rl.close();
    }
  });
});