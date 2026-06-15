const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

/**
 * TMS Integrity Hook (SessionEnd)
 * Runs at the end of every Gemini CLI session.
 */
function main() {
    const homeDir = os.homedir();
    const scriptPath = path.join(homeDir, 'INFRA/maintenance/tms_integrity_hook.py');
    
    try {
        // Run the python script and capture output
        const output = execSync(`python3 ${scriptPath}`, { encoding: 'utf8' });
        
        // Stderr is for logging, stdout is for the final JSON result
        process.stderr.write(output + '\n');
        
        console.log(JSON.stringify({
            systemMessage: "✅ TMS Integrity check passed at session end."
        }));
    } catch (error) {
        // If script fails (exit code 1), log to stderr
        process.stderr.write(`❌ TMS Integrity Discrepancy Found:\n${error.stdout}\n`);
        
        console.log(JSON.stringify({
            systemMessage: "⚠️ TMS Integrity Discrepancy detected at session end. Please review the logs above."
        }));
    }
}

main();
