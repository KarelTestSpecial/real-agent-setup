---
tier: 2
category: technical
domain: email-integration
last_updated: 2026-05-27
---
# Lesson Learned: Himalaya CLI Email Integration & Duplicate Control

## Context
When integrating the command-line email client Himalaya CLI (especially with Gmail backends), sending messages can lead to visual duplicate entries in the "Sent Mail" / "Alle e-mail" folders.

## Discovery
1. **Gmail Auto-Save vs IMAP Append:** Gmail's SMTP server automatically saves a copy of every message passing through it to the "Sent" folder.
2. **Himalaya Save-Copy:** By default, Himalaya explicitly uploads (via IMAP APPEND) the sent message to the mapped sent folder.
3. **Double Entry:** This behavior causes two identical records of the same email to appear in the user's folders, although only one actual email was dispatched to the recipient.

## Solution
To prevent duplicates, disable Himalaya's explicit save-copy behavior by setting:
```toml
message.send.save-copy = false
```
in each account section of `~/.config/himalaya/config.toml`. The mail provider's SMTP server will continue to automatically handle storing the sent messages correctly.
