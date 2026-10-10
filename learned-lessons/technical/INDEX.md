# Technical Knowledge Index (Tier 2)

Welcome to the MACCHA Technical Knowledge Index. This directory contains curated, reusable technical lessons that are PII-free and ready for your AI agent to reference during local execution.

## Domain: Google Workspace Integration
- [Google Sheets CSV Export Bypass](./google_sheets_csv_export_bypass.md)

## Domain: AI & Network Resilience
- [Resilient Network Fetching & Parsing](./resilient_network_fetching_and_parsing.md)

## Domain: Extension & Browser Testing
- [Testing Chrome extensions: `--load-extension` is blocked in branded Chrome](./chrome_for_testing_extension_loading.md)

## Domain: Memory Hygiene
- [Decay without prune = silent bloat](./decay_without_prune_silent_bloat.md)

## Domain: Agent Methodology
- [Measure your token budget with a real tokenizer — never estimate](./token_budget_measure_with_real_tokenizer.md): `chars/4` and `words×1.33` gave a band (1 862–2 647) around a 2 500 limit while the actual cl100k counts were 2 764 / 3 457 / 4 325 — all three mandate files breached the rule without any estimate seeing it. Fix: `js-tiktoken@1.0.21` (ranks bundled, pinned past the 7-day cooldown, `ignore-scripts`) in three lines of node, wrapped as `~/bin/maccha/count-tokens` where available; count before declaring "green".
- [Three-layer QA for agent output](./three_layer_qa_for_agent_output.md)
- [Enforce completeness in tooling, not in memory](./enforce_completeness_in_tooling_not_memory.md)

## Domain: Capsule & Scaffolding
- [Capsule sync — always diff in both directions](./capsule_sync_bidirectional_drift.md)

## Domain: Email Integration (Himalaya CLI)
- [Himalaya Duplicate Prevention](./himalaya_duplicate_prevention.md)
- [Himalaya IMAP Fetch Timeout](./himalaya_imap_timeout.md)
- [Himalaya Message Send Sender Header](./himalaya_message_send_sender_header.md)
