#!/usr/bin/env node
/**
 * 📅 MACCHA Google Calendar Reader
 * Commands:
 *   --auth                  OAuth setup (browser login)
 *   --list                  List all calendars
 *   --today [calendarId]    Show today's events (default: primary)
 *   --events <calendarId> [days]  Show events for next N days (default: 7)
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(process.env.HOME, '.config/maccha/credentials.json');
const TOKEN_PATH = path.join(process.env.HOME, '.config/maccha/calendar-token.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) return showHelp();

  const auth = await authorize(args.includes('--auth'));
  const calendar = google.calendar({ version: 'v3', auth });

  if (args.includes('--auth')) {
    console.log('✅ OAuth token saved.');
    return;
  }

  if (args.includes('--list')) {
    const res = await calendar.calendarList.list();
    for (const cal of res.data.items) {
      console.log(`${cal.id}${cal.primary ? ' ⭐ primary' : ''}  — ${cal.summary}`);
    }
    return;
  }

  if (args.includes('--today')) {
    const calId = args[args.indexOf('--today') + 1] || 'primary';
    const res = await listEvents(calendar, calId, 0, 1);
    console.log(formatEvents(res, `📅 Today (${calId})`));
    return;
  }

  if (args.includes('--events')) {
    const i = args.indexOf('--events');
    const calId = args[i + 1] || 'primary';
    const days = parseInt(args[i + 2]) || 7;
    const res = await listEvents(calendar, calId, 0, days);
    console.log(formatEvents(res, `📅 Agenda (${days} days) — ${calId}`));
    return;
  }

  showHelp();
}

async function listEvents(calendar, calId, daysFromNow, days) {
  const now = new Date();
  const min = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysFromNow);
  const max = new Date(min);
  max.setDate(max.getDate() + days);

  const res = await calendar.events.list({
    calendarId: calId,
    timeMin: min.toISOString(),
    timeMax: max.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });
  return res.data.items || [];
}

function formatEvents(events, title) {
  if (events.length === 0) return `${title}\n  (no events)`;
  let out = title;
  for (const e of events) {
    const start = e.start?.dateTime || e.start?.date || '?';
    let day = '', time = '';
    if (start.includes('T')) {
      const d = new Date(start);
      day = d.toLocaleDateString('nl-BE', { weekday: 'short', day: '2-digit', month: '2-digit' });
      time = d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
    } else {
      day = start;
    }
    out += `\n  ${day.padEnd(12)} ${time.padEnd(6)} ${e.summary || '(no title)'}`;
  }
  return out;
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
  console.log('🔑 Open this link in the browser (on this device or via phone):');
  console.log(authUrl);
  console.log('\nPaste the authorization code here:');

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
📅 MACCHA Calendar Reader
  --auth             OAuth setup (one-time, browser login)
  --list             List all calendars
  --today [calId]    Today's events (default: primary)
  --events <calId> [days]  Upcoming events (default: 7 days)
  `);
}

main().catch(console.error);
