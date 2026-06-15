# Himalaya CLI Raw Message Send & Mandatory From Header

## 1. Sending Raw Emails via stdin (EML integration)
- **Problem:** When sending pre-formatted or drafted outreach emails using the Himalaya CLI v2.0+, passing the email body directly can cause escaping errors or miss standard email headers (like `To:`, `Subject:`, or attachments).
- **Solution:** Save the email as a standard raw `.eml` text file containing all standard MIME headers and the body, then feed it into the stdin of himalaya.
- **Command:** `himalaya message send -a <account_name> < /path/to/email.eml`

## 2. Mandatory "From" Header requirement
- **Problem:** Executing `himalaya message send -a <account_name> < email.eml` without a `From:` header in the EML file will fail with the error:
  `Error: cannot send message without a sender`
  This happens even if the account (`-a <account_name>`) is specified in the CLI parameters, because the SMTP and MIME envelope parsing layers require an explicit `From:` header matching the authenticated account email.
- **Solution:** Always ensure the first line of the `.eml` file specifies the exact sender matching the account email address:
  `From: user@example.com`
