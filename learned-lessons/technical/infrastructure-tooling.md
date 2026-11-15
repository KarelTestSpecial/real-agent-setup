# infrastructure-tooling

> Domain file. Routing: `../ROUTER.md`.

- [Measure your token budget with a real tokenizer — never estimate](token_budget_measure_with_real_tokenizer.md): `chars/4` and `words×1.33` gave a band (1 862–2 647) around a 2 500 limit while the actual cl100k counts were 2 764 / 3 457 / 4 325 — all three mandate files breached the rule without any estimate seeing it. Fix: `js-tiktoken@1.0.21` (ranks bundled, pinned past the 7-day cooldown, `ignore-scripts`) in three lines of node, wrapped as `~/bin/maccha/count-tokens` where available; count before declaring "green".
