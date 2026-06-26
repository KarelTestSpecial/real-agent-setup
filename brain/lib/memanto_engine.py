# Copyright 2026 Google LLC
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import json
import uuid
import datetime
import math
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

def _load_env_manually():
    """Loads environment variables from standard .env file locations if present."""
    paths = [
        os.path.join(os.path.expanduser("~"), ".gemini", ".env"),
        os.path.join(os.path.expanduser("~"), ".env"),
        os.path.join(os.getcwd(), ".env")
    ]
    for path in paths:
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip().strip("'\"")
                            if key and key not in os.environ:
                                os.environ[key] = val
            except Exception:
                pass

# Predefined 13 Memanto Memory Categories
MEMANTO_CATEGORIES = {
    "Instruction": {"stable": True, "decay_rate": 0.0},
    "Fact": {"stable": True, "decay_rate": 0.0},
    "Decision": {"stable": True, "decay_rate": 0.0},
    "Goal": {"stable": True, "decay_rate": 0.0},
    "Commitment": {"stable": True, "decay_rate": 0.02},  # Low decay over time
    "Preference": {"stable": True, "decay_rate": 0.0},
    "Relationship": {"stable": True, "decay_rate": 0.01},
    "Context": {"stable": False, "decay_rate": 0.05},    # Faster decay for transient situational data
    "Event": {"stable": False, "decay_rate": 0.03},
    "Learning": {"stable": True, "decay_rate": 0.0},
    "Observation": {"stable": False, "decay_rate": 0.02},
    "Artifact": {"stable": True, "decay_rate": 0.0},
    "Error": {"stable": True, "decay_rate": 0.0}
}

class MemantoMemory:
    def __init__(self, memory_file: str = "data/memanto_memory.json"):
        _load_env_manually()
        self.memory_file = memory_file
        os.makedirs(os.path.dirname(self.memory_file) if os.path.dirname(self.memory_file) else "data", exist_ok=True)
        self.memories: List[Dict[str, Any]] = []
        self._load_memories()

        # Initialize genai client (detecting studio API keys vs Vertex environment)
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "False").lower() == "true"
        
        try:
            if self.api_key:
                self.client = genai.Client(api_key=self.api_key)
                self.model_name = "gemini-2.5-flash"
                self.embedding_model = "gemini-embedding-2"
                print(f"[Memanto] Initialized Gemini AI Studio Client (Key present)")
            else:
                vertex_project = os.getenv("VERTEX_PROJECT_ID", "your-vertex-project-id")
                self.client = genai.Client(
                    vertexai=True,
                    project=vertex_project,
                    location=os.getenv("VERTEX_LOCATION", "us-central1")
                )
                self.model_name = "gemini-2.5-flash"
                self.embedding_model = "gemini-embedding-2"
                print(f"[Memanto] Initialized Gemini Vertex AI Client (Keyless/ADC) on project: {vertex_project}")
        except Exception as e:
            self.client = None
            print(f"[Memanto] Initialization failed or delayed: {e}")

    def _load_memories(self):
        """Loads memory instances from disk and applies decay calculations."""
        if os.path.exists(self.memory_file):
            try:
                with open(self.memory_file, "r") as f:
                    self.memories = json.load(f)
                self._apply_temporal_decay()
            except Exception as e:
                print(f"[Memanto] Error loading memory file: {e}")
                self.memories = []

    def _save_memories(self):
        """Persists active memory states to disk."""
        try:
            with open(self.memory_file, "w") as f:
                json.dump(self.memories, f, indent=2)
        except Exception as e:
            print(f"[Memanto] Error writing memory file: {e}")

    def _apply_temporal_decay(self):
        """Calculates and applies confidence decay based on elapsed time."""
        now = datetime.datetime.now()
        updated = False
        for item in self.memories:
            if item.get("superseded_by") or item.get("confidence", 0.0) <= 0.0:
                continue
            
            created_at = datetime.datetime.fromisoformat(item["created_at"])
            days_elapsed = (now - created_at).total_seconds() / (24 * 3600)
            
            category = item.get("category", "Context")
            decay_rate = MEMANTO_CATEGORIES.get(category, {}).get("decay_rate", 0.02)
            
            if decay_rate > 0.0 and days_elapsed > 0.5:
                # Exponential decay formula
                original_confidence = item.get("confidence", 1.0)
                new_confidence = original_confidence * math.exp(-decay_rate * days_elapsed)
                
                # Minimum threshold
                if new_confidence < 0.05:
                    new_confidence = 0.0
                
                if abs(original_confidence - new_confidence) > 0.01:
                    item["confidence"] = round(new_confidence, 3)
                    updated = True
                    
        if updated:
            self._save_memories()

    def detect_conflicts(self, new_text: str, category: str) -> Optional[str]:
        """Scans existing active memories of the same category for semantic contradictions."""
        if category not in ["Decision", "Preference", "Fact", "Instruction"]:
            return None # Static categories are checked; transient events/contexts are not

        active_memories = [
            m for m in self.memories 
            if m["category"] == category 
            and not m.get("superseded_by") 
            and m.get("confidence", 0.0) > 0.3
        ]

        if not active_memories or not self.client:
            return None

        for old_memory in active_memories:
            prompt = f"""
            You are the core conflict-detection subsystem of the Memanto Sovereign Active Memory layer.
            Analyze the relationship between the existing memory and a newly proposed memory in the '{category}' category.

            [Existing Memory]
            "{old_memory['text']}"

            [Newly Proposed Memory]
            "{new_text}"

            Determine if these two memories conflict:
            - CONTRADICTS: The new memory directly conflicts or negates the existing memory.
            - UPDATES: The new memory is a direct update, refinement, or revision of the existing one (e.g., changing version numbers, status updates).
            - COMPATIBLE: The memories are complementary or completely independent.

            Respond with EXACTLY one of these three uppercase words: CONTRADICTS, UPDATES, or COMPATIBLE. Do not output any other character or explanation.
            """
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                
                # Thought Signatures Compliance: Extract text safely
                parts = response.candidates[0].content.parts if response.candidates else []
                text_part = next((p.text for p in parts if p.text), "")
                decision = text_part.strip().upper() if text_part else (response.text.strip().upper() if response.text else "COMPATIBLE")

                if "CONTRADICTS" in decision or "UPDATES" in decision:
                    print(f"🧠 [Conflict Detector] New memory in '{category}' {decision} existing memory: '{old_memory['text']}'")
                    return old_memory["id"]
            except Exception as e:
                print(f"[Conflict Detector] Contradiction check failed: {e}")
        return None

    # ─── Core Primitive 1: REMEMBER ──────────────────────────────────────────
    def remember(
        self, 
        text: str, 
        category: str, 
        confidence: float = 1.0, 
        source: str = "agent", 
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Stores a new memory. Resolves semantic contradictions pro-actively."""
        if category not in MEMANTO_CATEGORIES:
            raise ValueError(f"Invalid Memanto Category. Must be one of: {list(MEMANTO_CATEGORIES.keys())}")
            
        memory_id = str(uuid.uuid4())
        timestamp = datetime.datetime.now().isoformat()
        
        # Conflict detection & resolution step
        conflict_id = self.detect_conflicts(text, category)
        if conflict_id:
            # Supersede the old memory
            for item in self.memories:
                if item["id"] == conflict_id:
                    item["superseded_by"] = memory_id
                    item["confidence"] = 0.0
                    print(f"Superseding older memory {conflict_id} with new memory {memory_id}")
        
        new_memory = {
            "id": memory_id,
            "text": text,
            "category": category,
            "confidence": round(confidence, 3),
            "source": source,
            "created_at": timestamp,
            "last_accessed": timestamp,
            "access_count": 0,
            "metadata": metadata or {},
            "superseded_by": None
        }
        
        self.memories.append(new_memory)
        self._save_memories()
        return memory_id

    # ─── Core Primitive 2: RECALL ────────────────────────────────────────────
    def recall(
        self, 
        query: str, 
        category: Optional[str] = None, 
        min_confidence: float = 0.05, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Queries memory. Uses a hybrid embedding/text similarity engine with confidence-weighting."""
        self._apply_temporal_decay()
        
        # Filter active and relevant items
        candidates = [
            m for m in self.memories 
            if not m.get("superseded_by") 
            and m.get("confidence", 0.0) >= min_confidence
        ]
        
        if category:
            candidates = [c for c in candidates if c["category"] == category]
            
        if not candidates:
            return []

        # 1. Primary Vector Cosine Similarity
        # Empty query = "give recent items": embedding is then pointless (and a 400 from the API),
        # so go straight to the keyword/recency fallback.
        scores = []
        if self.client and query and query.strip():
            try:
                candidate_texts = [c["text"] for c in candidates]
                # Embed candidates in batch.
                # gemini-embedding-2 reads a list of bare strings as a single document;
                # explicit Content objects force one embedding per text.
                candidates_emb = self.client.models.embed_content(
                    model=self.embedding_model,
                    contents=[types.Content(parts=[types.Part(text=t)]) for t in candidate_texts]
                )
                
                # Embed query
                query_emb = self.client.models.embed_content(
                    model=self.embedding_model,
                    contents=query
                )
                
                query_vec = query_emb.embeddings[0].values
                
                for idx, item in enumerate(candidates):
                    emb_vec = candidates_emb.embeddings[idx].values
                    # Compute Cosine similarity
                    dot_product = sum(q * e for q, e in zip(query_vec, emb_vec))
                    norm_q = math.sqrt(sum(q * q for q in query_vec))
                    norm_e = math.sqrt(sum(e * e for e in emb_vec))
                    similarity = dot_product / (norm_q * norm_e) if norm_q and norm_e else 0.0
                    
                    # Weight score by memory confidence
                    final_score = similarity * item.get("confidence", 1.0)
                    scores.append((final_score, item))
            except Exception as e:
                print(f"[Memanto] Vector recall failed ({e}). Falling back to keyword overlap...")
                scores = []

        # 2. Fallback: Keyword Overlap scoring if embeddings fail or are missing
        if not scores:
            query_words = set(query.lower().split())
            for item in candidates:
                item_words = set(item["text"].lower().split())
                overlap = len(query_words.intersection(item_words))
                union = len(query_words.union(item_words))
                jaccard = overlap / union if union > 0 else 0.0
                
                # Confidence multiplier
                final_score = jaccard * item.get("confidence", 1.0)
                scores.append((final_score, item))

        # Sort and return top candidates
        scores.sort(key=lambda x: x[0], reverse=True)
        results = []
        now_str = datetime.datetime.now().isoformat()
        
        for score, item in scores[:limit]:
            # Update access statistics
            item["last_accessed"] = now_str
            item["access_count"] = item.get("access_count", 0) + 1
            item_copy = item.copy()
            item_copy["relevance_score"] = round(score, 4)
            results.append(item_copy)
            
        self._save_memories()
        return results

    # ─── Core Primitive 3: ANSWER ────────────────────────────────────────────
    def answer(self, query: str, category: Optional[str] = None) -> str:
        """Generates a query response fully grounded in recalled memory context."""
        recalled = self.recall(query, category=category, limit=6)
        
        if not recalled:
            return "No relevant memories found to answer this query."
            
        if not self.client:
            # Fallback simple list
            summary = "\n".join([f"- [{m['category']}] {m['text']} (Confidence: {m['confidence']})" for m in recalled])
            return f"Answer grounded in flat memories:\n{summary}"

        context_str = ""
        for idx, m in enumerate(recalled):
            context_str += f"[{idx+1}] Category: {m['category']} | Confidence: {m['confidence']} | Text: {m['text']}\n"

        prompt = f"""
        You are the answer synthesis module of the Memanto Sovereign Active Memory layer.
        Answer the following user query directly and ONLY using the retrieved context from the agent's memory.

        RULES:
        1. Be completely factual. Do not synthesize or assume details outside of the memory entries.
        2. Reference the source categories when helpful.
        3. If the memory contains contradictory information or updates, explain it using the context provided.
        4. If the retrieved memory is not relevant to the query, state: "No relevant memories found."

        [Recalled Memories]
        {context_str}

        [User Query]
        "{query}"

        Response:
        """
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            # Thought Signatures Safe Extract
            parts = response.candidates[0].content.parts if response.candidates else []
            text_part = next((p.text for p in parts if p.text), "")
            return text_part.strip() if text_part else (response.text.strip() if response.text else "No response generated.")
        except Exception as e:
            return f"Error synthesizing answer from memory: {e}"
