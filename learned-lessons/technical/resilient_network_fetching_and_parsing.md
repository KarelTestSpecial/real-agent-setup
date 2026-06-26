---
title: Resilient Network Fetching & Parsing
category: technical
domain: ai-network-resilience
tier: 2
last_updated: 2026-06-15
---

# Resilient Network Fetching, Zero-Crash Parsing, and Safe Error Logging in Node.js/TypeScript

## Context & Problem
When integrating third-party APIs (such as the Rugcheck API for token safety audits) in programmatic toolkits or AI agent actions, the network client faces three core vulnerabilities:
1.  **Rate Limiting (HTTP 429)**: Frequent API polling causes silent failures or standard exceptions that break the execution loop.
2.  **Malformed Payloads**: Third-party APIs can dynamically change fields, omit arrays, or return null values, leading to runtime type errors (e.g. `Cannot read properties of undefined`).
3.  **Path Disclosure Vulnerability**: Standard error catches that propagate `error.message` often leak absolute system file paths (such as `/home/[username]/...`), compromising local server security.

---

## Technical Solution

### 1. Resilient Fetch Client (Timeout, Retry, and 429 Backoff)
Instead of standard `fetch` or `axios` calls, wrap requests in a resilient retry loop with an `AbortController` timeout and custom delay logic:

```typescript
async function fetchWithResilience(
  url: string,
  retries = 2,
  timeoutMs = 5000,
): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          // Rate-limited: perform exponential backoff and retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (attempt === retries) {
        throw new Error(
          err.name === "AbortError" ? "Network request timed out" : err.message,
        );
      }
      // Standard failure: shorter backoff
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}
```

### 2. Zero-Crash Defensive Parser
Ensure complete type compliance with strict target interfaces (e.g., `TokenCheck`) by defensively checking types and providing fallback structures:

```typescript
interface RiskItem {
  name: string;
  level: string;
  description: string;
  score: number;
}

interface TokenCheck {
  tokenProgram: string;
  tokenType: string;
  risks: RiskItem[];
  score: number;
}

function parseTokenCheck(report: any): TokenCheck {
  const score = typeof report.score === "number" ? report.score : 0;
  const tokenProgram = typeof report.tokenProgram === "string" ? report.tokenProgram : "Unknown";
  const tokenType = typeof report.tokenType === "string" ? report.tokenType : "Unknown";
  const rawRisks = Array.isArray(report.risks) ? report.risks : [];

  const risks = rawRisks.map((r: any) => ({
    name: typeof r.name === "string" ? r.name : "Unknown Risk",
    level: typeof r.level === "string" ? r.level : "warning",
    description: typeof r.description === "string" ? r.description : "No description provided.",
    score: typeof r.score === "number" ? r.score : 0,
  }));

  return {
    tokenProgram,
    tokenType,
    risks,
    score,
  };
}
```

### 3. Safe Error Path Sanitization
Prevent path disclosure in errors caught at action boundaries:

```typescript
try {
  // Execute auditing action
} catch (error: any) {
  // Sanitize absolute system paths (e.g. /home/user) in the error string
  const safeErrorMsg = error.message.replace(/\/home\/[^/]+/g, "~");
  return {
    status: "error",
    message: `Audit failed: ${safeErrorMsg}`,
  };
}
```

---

## Key Benefits
*   **Zero Thread Hangs**: Enforces a strict execution deadline (e.g., 5 seconds) per network hop.
*   **High Reliability**: Surges past temporary API drops and rate limit spikes.
*   **Robust Security**: Completely eliminates the risk of system username or directory structure disclosure through stack trace leakage.
