#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createRequire } = require('module');
const req = createRequire('$HOME/INFRA/');
const { google } = req('googleapis');

const CREDENTIALS_PATH = path.join(process.env.HOME, '.config/maccha/credentials.json');
const TOKEN_PATH = path.join(process.env.HOME, '.config/maccha/calendar-token.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) return showHelp();

  const forceAuth = args.includes('--auth');
  const auth = await authorize(forceAuth);
  const calendar = google.calendar({ version: 'v3', auth });
  if (forceAuth) {
    console.log('✅ OAuth token saved.');
    return;
  }

  const calId = args[0];
  const summary = args[1];
  const startStr = args[2];
  const endStr = args[3];
  const desc = args[4] || '';

  if (!calId || !summary || !startStr) {
    console.error('Usage: calendar-add.js <calendarId> <summary> <start> [end] [description]');
    process.exit(1);
  }

  const event = {
    summary,
    description: desc,
    start: {
      dateTime: startStr,
      timeZone: 'Europe/Brussels',
    },
    end: {
      dateTime: endStr || startStr,
      timeZone: 'Europe/Brussels',
    },
  };

  if (!event.end.dateTime || event.end.dateTime === event.start.dateTime) {
    // Default: 1 hour
    const endDate = new Date(new Date(event.start.dateTime).getTime() + 60 * 60 * 1000);
    event.end.dateTime = endDate.toISOString();
  }

  const res = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  console.log(`✅ Event created: "${res.data.summary}" on ${calId}`);
  console.log(`   ${res.data.start.dateTime} → ${res.data.end.dateTime}`);
  console.log(`   Link: ${res.data.htmlLink}`);
}

function authorize(forceNew) {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const credentials = JSON.parse(content).installed;
  const { client_secret, client_id, redirect_uris } = credentials;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH) && !forceNew) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    return Promise.resolve(oAuth2Client);
  }
  return getNewToken(oAuth2Client);
}

function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  console.log('🔑 Open deze link in de browser:');
  console.log(authUrl);
  console.log('\nPlak hier de authorization code:');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    rl.question('Code: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return reject(err);
        oAuth2Client.setCredentials(token);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token), { mode: 0o600 });
        console.log(`Token saved to ${TOKEN_PATH}`);
        resolve(oAuth2Client);
      });
    });
  });
}

function showHelp() {
  console.log(`
📅 MACCHA Calendar Add
  calendar-add.js <calendarId> <summary> <startISO> [endISO] [description]
  --auth    Re-authenticate (browser login)

Examples:
  calendar-add.js userdfpc@gmail.com "Tandarts" "2026-07-16T11:00:00+02:00" "2026-07-16T12:00:00+02:00" "iSmile - bevestigd door Elias"
  `);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
