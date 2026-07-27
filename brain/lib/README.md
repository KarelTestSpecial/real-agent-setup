# Memanto Engine — Custom Implementation

## Overview
This is a custom implementation of a memory engine for AI agents, inspired by the Memanto concept (13 memory categories, remember/recall/answer primitives). It is **not** a fork of any existing open-source project.

## Origin
- **Copyright:** Google LLC (Apache 2.0 License)
- **Implementation:** Custom-written for the MACCHA (Multi-Agent Continuous Context Harness) project
- **Dependencies:** Google Generative AI SDK (`google-genai`)

## Key Customizations (vs. original concept)
| Feature | Status | Notes |
|---|---|---|
| **Temporal Decay** | Implemented | Exponential decay with configurable rates per category |
| **Pin/Unpin** | Added | Pinned entries are immune to decay |
| **Conflict Detection** | Implemented | Semantic contradiction detection via Gemini |
| **Truncation Length** | 500 chars | Increased from 200 to preserve more context |
| **Category System** | 13 categories | Instruction, Fact, Decision, Goal, Commitment, Preference, Relationship, Context, Event, Learning, Observation, Artifact, Error |

## Decay Rates
| Category | Decay Rate | Stability |
|---|---|---|
| Instruction | 0.0005 | Stable |
| Fact | 0.0005 | Stable |
| Decision | 0.001 | Stable |
| Goal | 0.001 | Stable |
| Commitment | 0.02 | Stable |
| Preference | 0.0005 | Stable |
| Relationship | 0.01 | Stable |
| Context | 0.05 | Transient |
| Event | 0.03 | Transient |
| Learning | 0.0 | Stable (no decay) |
| Observation | 0.02 | Transient |
| Artifact | 0.0 | Stable (no decay) |
| Error | 0.0 | Stable (no decay) |

## Maintenance
- **Last Updated:** 2026-07-27
- **Maintainer:** Karel Decherf (MACCHA project)
- **Source Location:** `~/INFRA/agents-brain/lib/memanto_engine.py`
- **Synced to:** `real-agent-setup/brain/lib/` via `publish.sh`

## Update Strategy
Since this is a custom implementation with no upstream repository:
1. When updating the `google-genai` SDK, verify compatibility with this engine
2. Test with: `~/bin/maccha/memanto_cli.py recall "test query"`
3. Changes should be committed to both local and real-agent-setup repos

## Related Files
- `~/bin/maccha/memanto_cli.py` — CLI interface for the engine
- `~/BRAIN/memanto/memanto_global.json` — Memory data store
- `~/INFRA/agents-brain/lib/memanto_engine.py` — This engine