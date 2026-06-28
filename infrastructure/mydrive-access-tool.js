/**
 * 🔄 MACCHA Universal Sync Tool (Google Sheets & Docs)
 * 
 * PURPOSE:
 * This is the central bridge between local data (TSV/CSV/Text) and Google Workspace.
 * It supports bidirectional synchronization for the MACCHA ecosystem.
 *
 * SCOPES REQUIRED:
 * - https://www.googleapis.com/auth/spreadsheets (For CMS updates)
 * - https://www.googleapis.com/auth/documents.readonly (For reading strategy/philosophy docs)
 *
 * USAGE FOR AGENTS & HUMANS:
 * 1. Setup Auth:     node INFRA/mydrive-access-tool.js --auth
 * 2. Sync to Sheet:  node INFRA/mydrive-access-tool.js <SPREADSHEET_ID> <LOCAL_PATH> [RANGE]
 * 3. Read from Doc:  node INFRA/mydrive-access-tool.js --read-doc <DOCUMENT_ID>
 *
 * PROJECT CONTEXT:
 * Created for private project setup. 
 * This tool enables "Proof of Work" by allowing AI agents to manage site content 
 * via user-friendly interfaces (Google Sheets).
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

// Configuration Paths - Configurable via environment variables or defaulting to clean, standard paths
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || path.join(process.env.HOME, '.config/maccha/credentials.json');
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || path.join(process.env.HOME, '.config/maccha/sheets-token.json');
// Service account key (preferred when present): project-owned identity, no browser consent.
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SA_PATH || path.join(process.env.HOME, '.config/maccha/service-account.json');

// Required Scopes (Updated May 2026 for Docs support)
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents.readonly'
];

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        showHelp();
        return;
    }

    // --- SUB-COMMAND: Auth ---
    if (args.includes('--auth')) {
        await authorize(true);
        return;
    }

    // --- SUB-COMMAND: Whoami (which identity does MACCHA write as?) ---
    if (args.includes('--whoami')) {
        if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
            const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH));
            console.log(`🤖 Service account: ${sa.client_email}`);
            console.log(`   (project: ${sa.project_id}) — deel sheets met dit adres als Bewerker.`);
        } else {
            console.log('👤 OAuth user-flow token (no service account ingesteld).');
            console.log('   E-mail not uitleesbaar: token heeft no "email"-scope.');
        }
        return;
    }

    // --- SUB-COMMAND: Read Google Doc ---
    if (args.includes('--read-doc')) {
        const docId = args[args.indexOf('--read-doc') + 1];
        if (!docId) return console.error('❌ Error: Missing Document ID');
        const auth = await authorize();
        await readGoogleDoc(auth, docId);
        return;
    }

    // --- SUB-COMMAND: Read Google Sheet (prints TSV) ---
    if (args.includes('--read-sheet')) {
        const i = args.indexOf('--read-sheet');
        const sheetId = args[i + 1];
        const range = args[i + 2] || 'A1:Z1000';
        if (!sheetId) return console.error('❌ Error: Missing Sheet ID');
        const auth = await authorize();
        await readSheet(auth, sheetId, range);
        return;
    }

    // --- DEFAULT: Sync Data to Sheet ---
    const [spreadsheetId, localPath, range = 'Sheet1!A1'] = args;
    if (!spreadsheetId || !localPath) {
        showHelp();
        process.exit(1);
    }

    const auth = await authorize();
    await syncData(auth, spreadsheetId, localPath, range);
}

function showHelp() {
   console.log(`
MyDrive Access Tool (MACCHA)
---------------------------
Commands:
  --auth                     Initialize or refresh OAuth tokens (user-flow).
  --whoami                   Show which identity MACCHA writes as (service account or OAuth).
  --read-doc <id>            Reads a Google Doc and prints text to stdout.
  --read-sheet <id> [range]  Reads a Google Sheet and prints TSV to stdout.
  <sheet_id> <path> [range]  Uploads local file (TSV/CSV) to a Google Sheet.

Auth priority: service account key (~/.config/maccha/service-account.json) if present,
otherwise the OAuth user token. Share target sheets with the writer identity (--whoami).

Example:
  node INFRA/mydrive-access-tool.js 1abc... ./data.tsv 'Hero!A1'
   `);
}

/**
 * Authorize a client with credentials, then acquire a new token if necessary.
 */
async function authorize(forceNew = false) {
    // Preferred path: service account key (project-owned identity, no browser consent).
    if (fs.existsSync(SERVICE_ACCOUNT_PATH) && !forceNew) {
        const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH));
        const jwt = new google.auth.JWT({
            email: sa.client_email,
            key: sa.private_key,
            scopes: SCOPES,
        });
        await jwt.authorize();
        return jwt;
    }

    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(`❌ Credentials file missing at ${CREDENTIALS_PATH}`);
    }

    const content = fs.readFileSync(CREDENTIALS_PATH);
    const credentials = JSON.parse(content).installed;
    const { client_secret, client_id, redirect_uris } = credentials;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // If token exists and we aren't forcing a new one, use it
    if (fs.existsSync(TOKEN_PATH) && !forceNew) {
        const token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    }

    return getNewToken(oAuth2Client);
}

/**
 * Get and store new token.
 */
function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    console.log('🚀 VISUAL ACTION REQUIRED:');
    console.log('1. Visit this URL in your browser:');
    console.log(authUrl);
    console.log('\n2. After approval, paste the FULL redirect URL (http://localhost/?code=...) here:');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve, reject) => {
        rl.question('Enter URL: ', (url) => {
            rl.close();
            try {
                const code = new URL(url).searchParams.get('code');
                if (!code) throw new Error("No code found in URL");

                oAuth2Client.getToken(code, (err, token) => {
                    if (err) return reject(console.error('❌ Token acquisition failed', err));
                    oAuth2Client.setCredentials(token);
                    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
                    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                    console.log('✅ Token saved to', TOKEN_PATH);
                    resolve(oAuth2Client);
                });
            } catch (e) {
                reject(console.error('❌ Invalid URL or Code:', e.message));
            }
        });
    });
}

/**
 * Upload local file to Google Sheet
 */
async function syncData(auth, spreadsheetId, localPath, range) {
    const sheets = google.sheets({ version: 'v4', auth });
    try {
        const absolutePath = path.resolve(localPath);
        if (!fs.existsSync(absolutePath)) throw new Error(`Local file not found: ${localPath}`);

        const data = fs.readFileSync(absolutePath, 'utf8');
        const delimiter = localPath.endsWith('.tsv') ? '\t' : ',';
        const rows = data.trim().split(/\r?\n/).map(line => line.split(delimiter));

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource: { values: rows }
        });

        console.log(`✅ Success: ${path.basename(localPath)} -> Sheet ${spreadsheetId}`);
    } catch (error) {
        console.error('❌ Sync Failed:', error.message);
    }
}

/**
 * Read a Google Sheet and print as TSV
 */
async function readSheet(auth, spreadsheetId, range) {
    const sheets = google.sheets({ version: 'v4', auth });
    try {
        const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        const rows = res.data.values || [];
        rows.forEach(r => console.log(r.join('\t')));
    } catch (error) {
        console.error('❌ Error reading Sheet:', error.message);
    }
}

/**
 * Read Google Doc content and print to console
 */
async function readGoogleDoc(auth, documentId) {
    const docs = google.docs({ version: 'v1', auth });
    try {
        const res = await docs.documents.get({ documentId });
        let text = '';
        res.data.body.content.forEach(element => {
            if (element.paragraph) {
                element.paragraph.elements.forEach(el => {
                    if (el.textRun) text += el.textRun.content;
                });
            }
        });
        console.log(text);
    } catch (error) {
        console.error('❌ Error reading Doc:', error.message);
    }
}

main();
