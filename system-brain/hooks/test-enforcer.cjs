const fs = require('fs');
const path = require('path');

/**
 * AfterAgent Hook: Test Enforcer
 * Enforces that code changes are accompanied by test changes.
 */
function main() {
    let input = '';
    process.stdin.on('data', chunk => { input += chunk; });
    process.stdin.on('end', () => {
        try {
            if (!input) {
                process.exit(0);
            }
            const data = JSON.parse(input);
            const transcriptPath = data.transcript_path;
            
            if (!transcriptPath || !fs.existsSync(transcriptPath)) {
                process.exit(0);
            }

            const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
            const messages = transcript.messages || [];
            
            // Find the last assistant message that had tool calls
            const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0);

            if (!lastAssistantMessage) {
                process.exit(0);
            }

            const codeExtensions = ['.js', '.ts', '.py', '.go', '.java', '.c', '.cpp', '.rs', '.jsx', '.tsx'];
            const metaFiles = ['todo.md', 'done.md', 'GEMINI.md', 'MEMORY.md', 'STATE.md', 'INVENTORY.md', 'package.json', 'pnpm-lock.yaml', '.gitignore', 'README.md'];
            
            const modifiedCodeFiles = [];
            const modifiedTestFiles = [];

            lastAssistantMessage.toolCalls.forEach(tc => {
                const name = tc.name || tc.call;
                const args = tc.args || {};
                
                if (name === 'write_file' || name === 'replace') {
                    const filePath = args.file_path;
                    if (!filePath) return;

                    const ext = path.extname(filePath).toLowerCase();
                    const isMeta = metaFiles.some(mf => filePath.endsWith(mf)) || filePath.includes('.gemini') || filePath.includes('scripts/maintenance');
                    const isTest = filePath.toLowerCase().includes('test') || filePath.toLowerCase().includes('spec') || filePath.includes('__tests__');

                    if (codeExtensions.includes(ext) && !isMeta) {
                        if (isTest) {
                            modifiedTestFiles.push(filePath);
                        } else {
                            modifiedCodeFiles.push(filePath);
                        }
                    }
                }
            });

            // If code was modified but no tests were added/updated
            if (modifiedCodeFiles.length > 0 && modifiedTestFiles.length === 0) {
                // Check if we are already in a retry loop for tests to avoid infinite loops
                if (data.stop_hook_active) {
                    process.exit(0);
                }

                console.log(JSON.stringify({
                    decision: "deny",
                    reason: `⚠️ TEST ENFORCEMENT: You modified code in: ${modifiedCodeFiles.join(', ')}. However, no tests were (re)written. Per the 'Technical Integrity' mandate, every functional change must be accompanied by validation logic. Add tests for these changes.`,
                    systemMessage: "🛡️ Test-Enforcer: Code changed without tests. Context cleared, retry forced...",
                    hookSpecificOutput: {
                        clearContext: true
                    }
                }));
            } else {
                process.exit(0);
            }
        } catch (e) {
            process.stderr.write(`Error in test-enforcer hook: ${e.message}\n`);
            process.exit(0);
        }
    });
}

main();
