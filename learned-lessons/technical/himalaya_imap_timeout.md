---
tier: 2
category: technical
domain: email-integration
last_updated: 2026-05-29
---
# Lesson Learned: Himalaya CLI Large IMAP Fetch Timeout

## Context
When reading or exporting extremely large emails (e.g. sent emails containing massive 15MB+ base64-encoded attachments) over IMAP using the Himalaya CLI on a connection with standard bandwidth or high latency, the CLI may hang and eventually crash.

## Discovery
1. **Network Timeout:** Standard IMAP connections in Rust library backends (used by Himalaya) have a built-in TCP/TLS connection timeout.
2. **Crash Output:** The process exits with code 1 and throws:
   ```plain
   Error: 0: cannot fetch IMAP messages: request timed out
   ```
3. **MIME Bloat:** Base64 encoding adds ~33% overhead. A 16MB email becomes 22MB+ of raw data to pull over IMAP, easily exceeding the default connection timeout on slower networks (such as slower restricted or institutional networks).

## Solution
1. **Bypass IMAP Fetch for Large Sent Messages:** Avoid retrieving sent messages with large attachments over IMAP if the exact email body is already known or cached locally.
2. **Direct CLI Piping:** Construct the raw MIME email locally using a zero-dependency script (e.g. Node.js or Python) and pipe it directly to `himalaya message send` to bypass fetching and editing cycles.
3. **MIME Optimization:** Pre-emptively optimize all attachment file sizes (e.g. converting heavy JPG/PNG files to WebP) before composing and sending to ensure the total MIME footprint remains under 3MB.
