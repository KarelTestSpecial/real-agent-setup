#!/usr/bin/env node

/**
 * 🕵️‍♂️ Deep Research CLI Tool for Google Gemini
 * 
 * Powered by Google Gemini Interactions API & the 'deep-research-pro-preview-12-2025' Agent.
 * Run this directly from your Chromebook terminal to generate comprehensive, multi-step research reports.
 * 
 * Usage:
 *   node run_deep_research.js "Your detailed research query"
 */

const fs = require('fs');
const path = require('path');
const http = require('https');

// Configuration
const API_VERSION = 'v1beta';
const BASE_URL = 'generativelanguage.googleapis.com';

// 1. Locate API Key (Proactive fallback check)
let apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    const fallbackPaths = [
        path.join(__dirname, '.env'),
        path.join(process.cwd(), '.env'),
        path.join(process.env.HOME, '.config/maccha/.env'),
        path.join(process.env.HOME, '.env')
    ];

    for (const dotenvPath of fallbackPaths) {
        if (fs.existsSync(dotenvPath)) {
            try {
                const content = fs.readFileSync(dotenvPath, 'utf8');
                const match = content.match(/^GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m);
                if (match && match[1]) {
                    apiKey = match[1].trim();
                    break;
                }
            } catch (e) {
                // Ignore read errors and continue
            }
        }
    }
}

if (!apiKey) {
    console.error('\x1b[31m❌ Error: No GEMINI_API_KEY found!\x1b[0m');
    console.error('Make sure GEMINI_API_KEY is in your environment: export GEMINI_API_KEY="your-key"');
    console.error('Or add it to a .env file.');
    process.exit(1);
}

// 2. Validate input arguments
const query = process.argv.slice(2).join(' ');
if (!query) {
    console.log('\x1b[34mℹ️  Usage:\x1b[0m');
    console.log('  node run_deep_research.js "Your research topic here"');
    console.log('\n\x1b[33mExample:\x1b[0m');
    console.log('  node run_deep_research.js "Give a detailed analysis of EU AI Act compliance rules for chatbots from August 2026"');
    process.exit(0);
}

console.log(`\n\x1b[36m🧠 Starting Deep Research on:\x1b[0m "\x1b[1m${query}\x1b[22m"`);
console.log(`\x1b[90mKey detected (starts with: ${apiKey.substring(0, 8)}...)\x1b[0m\n`);

// Helper to make HTTPS requests using native node.js https module
function makeRequest(method, urlPath, payload = null) {
    return new Promise((resolve, reject) => {
        const data = payload ? JSON.stringify(payload) : null;
        
        const options = {
            hostname: BASE_URL,
            port: 443,
            path: `/${API_VERSION}${urlPath}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            }
        };

        if (data) {
            options.headers['Content-Length'] = Buffer.byteLength(data);
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    try {
                        const errJson = JSON.parse(body);
                        reject(new Error(errJson.error?.message || `HTTP ${res.statusCode}`));
                    } catch (e) {
                        reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                    }
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(data);
        }
        req.end();
    });
}

// Polling and Execution Flow
async function main() {
    try {
        // A. Create Interaction
        const initialPayload = {
            agent: 'deep-research-pro-preview-12-2025',
            input: query,
            agent_config: {
                type: 'deep-research',
                collaborative_planning: false
            }
        };

        const createRes = await makeRequest('POST', '/interactions', initialPayload);
        const interactionId = createRes.id;
        
        if (!interactionId) {
            throw new Error('No Interaction ID received from the API.');
        }

        console.log(`\x1b[32m✅ Deep Research Session Started!\x1b[0m ID: \x1b[90m${interactionId}\x1b[0m`);
        console.log(`\x1b[33m⏳ Searching and analyzing in depth (this may take a few minutes)... \x1b[0m`);

        // B. Polling Loop
        let elapsed = 0;
        const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let spinnerIdx = 0;

        const interval = setInterval(() => {
            elapsed += 1;
            const spinChar = spinner[spinnerIdx];
            spinnerIdx = (spinnerIdx + 1) % spinner.length;
            process.stdout.write(`\r\x1b[36m${spinChar} Analyzing... [${elapsed}s elapsed]\x1b[0m`);
        }, 1000);

        let finished = false;
        let result = null;

        while (!finished) {
            // Wait 5 seconds between polls to be polite to the API
            await new Promise(r => setTimeout(r, 5000));
            
            try {
                const statusRes = await makeRequest('GET', `/interactions/${interactionId}`);
                const status = statusRes.status;

                if (status === 'completed') {
                    clearInterval(interval);
                    process.stdout.write('\r\x1b[32m✅ Analysis complete!\x1b[0m                        \n');
                    result = statusRes;
                    finished = true;
                } else if (status === 'failed') {
                    clearInterval(interval);
                    process.stdout.write('\r\x1b[31m❌ Analysis failed!\x1b[0m                       \n');
                    throw new Error(statusRes.error?.message || 'Gemini Deep Research returned an unknown error.');
                } else if (status === 'cancelled') {
                    clearInterval(interval);
                    process.stdout.write('\r\x1b[31m❌ Analysis cancelled!\x1b[0m                   \n');
                    throw new Error('Session was cancelled.');
                }
            } catch (pollError) {
                // If temporary network error, log and keep trying
                process.stdout.write(`\r\x1b[33m⚠️  Connection problem, retrying...\x1b[0m`);
            }
        }

        // C. Process and Display Results (Gemini 3.0 Compliance check)
        const outputs = result.outputs || [];
        let finalReport = '';
        let thoughtProcess = '';

        for (const output of outputs) {
            const parts = output.parts || [];
            
            // Extract thought signature / reasoning
            const thoughtPart = parts.find(p => p.thought);
            if (thoughtPart && thoughtPart.thought) {
                thoughtProcess += thoughtPart.thought + '\n';
            }

            // Extract main text content
            const textPart = parts.find(p => p.text);
            if (textPart && textPart.text) {
                finalReport += textPart.text + '\n';
            }
        }

        if (!finalReport) {
            console.log('\x1b[33m⚠️  No textual output generated by the model.\x1b[0m');
            process.exit(0);
        }

        // D. Output Report and Save to File
        const cleanReportName = `deep_research_${Date.now()}.md`;
        const outputPath = path.join(process.cwd(), cleanReportName);
        
        fs.writeFileSync(outputPath, finalReport, 'utf8');

        console.log(`\n==============================================================================`);
        console.log(`\x1b[32m✨ DEEP RESEARCH REPORT GENERATED!\x1b[0m`);
        console.log(`📂 Saved as: \x1b[1m${outputPath}\x1b[22m`);
        console.log(`==============================================================================\n`);

        // Print first 800 chars of the report to the terminal
        console.log('\x1b[36m📝 Report preview:\x1b[0m');
        console.log(finalReport.substring(0, 800) + (finalReport.length > 800 ? '\n\n[... Report continues in the saved file ...]' : ''));

    } catch (e) {
        console.error(`\n\x1b[31m❌ Error during Deep Research:\x1b[0m ${e.message}`);
        process.exit(1);
    }
}

main();
