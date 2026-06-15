# 🧠 Agents Brain (Global Shared Memory)

This directory contains the global infrastructure for agentic memory, powered by **Memanto**.

## Structure
- `/lib/memanto_engine.py`: The core Python logic (remember, recall, answer).
- `/data/memanto_global.json`: The physical storage of all shared memories.

## Usage for Agents
To use this global brain, agents should import the `MemantoMemory` class and point it to the global JSON file.

```python
import sys
sys.path.append('~/INFRA/agents-brain/lib')
from memanto_engine import MemantoMemory

# Initialize with the global data path
brain = MemantoMemory(memory_file='~/INFRA/agents-brain/data/memanto_global.json')
```

## Maintenance
- **Temporal Decay**: Memories lose confidence over time unless reinforced.
- **Pruning**: Redundant or contradicted memories are superseded automatically.
