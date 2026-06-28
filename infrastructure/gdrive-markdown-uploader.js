/**
 * 🚀 Google Drive Uploader & Converter
 * 
 * PURPOSE:
 * This script uploads local markdown documents to Google Drive,
 * automatically converts them into Google Docs, and sets their permissions
 * to "Anyone with the link can view".
 *
 * CREDENTIALS & TOKEN PATHS:
 * - Credentials: ~/.config/maccha/credentials.json (symlink naar het client_secret-file)
 * - Token: ~/.config/maccha/google-drive-token.json (canoniek)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(process.env.HOME, '.config/maccha/credentials.json');
const TOKEN_PATH = path.join(process.env.HOME, '.config/maccha/google-drive-token.json');

const SCOPES = [
    'https://www.googleapis.com/auth/drive.file'
];

async function main() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth });

    let filesToUpload = [
        {
            localPath: '/path/to/your/document.md',
            title: 'Document Title - For Google Docs'
        }
    ];


    console.log('\n=== Start van de upload en conversie naar Google Docs ===\n');

    const results = {};

    for (const item of filesToUpload) {
        if (!fs.existsSync(item.localPath)) {
            console.error(`❌ File not found: ${item.localPath}`);
            continue;
        }

        console.log(`📤 Uploaden en converteren: "${path.basename(item.localPath)}"...`);
        
        try {
            // 1. Upload & converteren naar Google Doc
            const fileMetadata = {
                name: item.title,
                mimeType: 'application/vnd.google-apps.document'
            };
            const media = {
                mimeType: 'text/markdown',
                body: fs.createReadStream(item.localPath)
            };

            const file = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id,webViewLink'
            });

            const fileId = file.data.id;
            let webViewLink = file.data.webViewLink;

            // Sommige accounts vereisen een expliciete get om de volledige link te krijgen
            if (!webViewLink) {
                const getRes = await drive.files.get({
                    fileId: fileId,
                    fields: 'webViewLink'
                });
                webViewLink = getRes.data.webViewLink;
            }

            // 2. Machtigingen instellen op "Iedereen met de link kan lezen"
            await drive.permissions.create({
                fileId: fileId,
                resource: {
                    role: 'reader',
                    type: 'anyone'
                }
            });

            console.log(`✅ Converted successfully!`);
            console.log(`   🔗 Google Doc Link: ${webViewLink}\n`);
            results[path.basename(item.localPath)] = webViewLink;
        } catch (error) {
            console.error(`❌ Upload failed voor ${path.basename(item.localPath)}:`, error.message);
        }
    }

    console.log('=== Uploads finished! ===\n');
    console.log('Use these links to update your email guide:\n');
    for (const [filename, link] of Object.entries(results)) {
        console.log(`${filename}: ${link}`);
    }
}

/**
 * Autorisatie-functie met OAuth client-secret
 */
async function authorize(forceNew = false) {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(`❌ Credentials file missing at ${CREDENTIALS_PATH}`);
    }

    const content = fs.readFileSync(CREDENTIALS_PATH);
    const credentials = JSON.parse(content).installed;
    const { client_secret, client_id, redirect_uris } = credentials;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (fs.existsSync(TOKEN_PATH) && !forceNew) {
        const token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    }

    return getNewToken(oAuth2Client);
}

function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    console.log('\n🚀 VISUAL ACTION REQUIRED FOR GOOGLE DRIVE ACCESS:');
    console.log('1. Open deze URL in je browser (klik of kopieer):');
    console.log(authUrl);
    console.log('\n2. Geef toestemming met je Google Account.');
    console.log('3. Plak de VOLLEDIGE redirect URL (http://localhost/?code=...) hieronder:\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve, reject) => {
        rl.question('Voer de volledige redirect URL in: ', (url) => {
            rl.close();
            try {
                const code = new URL(url).searchParams.get('code');
                if (!code) throw new Error("No autorisatiecode found in de URL.");

                oAuth2Client.getToken(code, (err, token) => {
                    if (err) return reject(console.error('❌ Error fetching OAuth token:', err));
                    oAuth2Client.setCredentials(token);
                    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
                    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                    console.log('✅ Token successfully opgeslagen in:', TOKEN_PATH);
                    resolve(oAuth2Client);
                });
            } catch (e) {
                reject(console.error('❌ Ongeldige URL of code:', e.message));
            }
        });
    });
}

main();
