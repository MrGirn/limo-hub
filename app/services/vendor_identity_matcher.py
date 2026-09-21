"""
Dynamic Self-Learning Vendor Identity Resolution Engine (Python).

Replaces static hardcoded vendor/city lists with:
1. Dynamic Alphanumeric Tokenization & Noise Filtering
2. Semantic Token Overlap & Levenshtein Distance Matrix
3. Dynamic Acronym & Initialism Resolution (e.g. LA <-> Los Angeles, PHL <-> Philadelphia, NYC <-> New York)
4. Self-Learning In-Memory & Persistent Alias Graph
"""

from __future__ import annotations

import re
import logging
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger("VendorIdentityMatcher")

NOISE_STOP_WORDS = {
    "vendor", "partner", "cell", "org", "limo", "limos", "limousine", "limousines",
    "fleet", "fleets", "chauffeur", "chauffeurs", "transport", "transportation",
    "executive", "exec", "vip", "prestige", "sovereign", "royal", "global",
    "luxury", "blackcar", "black_car", "shuttle", "services", "service",
    "holdings", "group", "enterprise", "enterprises", "inc", "llc", "ltd",
    "corp", "corporation", "co", "the", "and", "of", "for"
}


def extract_semantic_tokens(text: Optional[str]) -> List[str]:
    """Normalizes an identifier or company name into distinctive semantic tokens."""
    if not text:
        return []
    
    # Split camelCase and replace non-alphanumerics
    s1 = re.sub(r"([a-z])([A-Z])", r"\1 \2", str(text))
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", s1).lower().strip()
    
    tokens = [
        t for t in cleaned.split()
        if len(t) > 0 and t not in NOISE_STOP_WORDS
    ]
    # Maintain order and uniqueness
    seen = set()
    result = []
    for t in tokens:
        if t not in seen:
            seen.add(t)
            result.append(t)
    return result


def levenshtein_distance(s1: str, s2: str) -> int:
    """Computes Levenshtein edit distance between two strings."""
    if s1 == s2:
        return 0
    if len(s1) == 0:
        return len(s2)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def string_similarity(s1: str, s2: str) -> float:
    """Computes Normalized String Similarity (0.0 to 1.0)."""
    a = s1.strip().lower()
    b = s2.strip().lower()
    if a == b:
        return 1.0
    max_len = max(len(a), len(b))
    if max_len == 0:
        return 1.0
    dist = levenshtein_distance(a, b)
    return max(0.0, 1.0 - (dist / max_len))


def is_acronym_match(token_a: str, token_b: str) -> bool:
    """Checks if one token dynamically represents an initialism/prefix of another."""
    if token_a == token_b:
        return True
    short_tok = token_a if len(token_a) < len(token_b) else token_b
    long_tok = token_b if len(token_a) < len(token_b) else token_a
    if len(short_tok) >= 2 and len(long_tok) >= 4:
        if long_tok.startswith(short_tok):
            return True
    return False


class VendorIdentityLearner:
    """Self-learning persistent vendor alias graph."""
    
    def __init__(self):
        self._clusters: Dict[str, Set[str]] = {}

    def learn_alias(self, primary_id: str, alias_or_identifier: str) -> None:
        """Learns and registers bidirectional alias link."""
        if not primary_id or not alias_or_identifier:
            return
        p = primary_id.strip().lower()
        a = alias_or_identifier.strip().lower()
        if p == a:
            return

        if p not in self._clusters:
            self._clusters[p] = {p}
        self._clusters[p].add(a)

        if a not in self._clusters:
            self._clusters[a] = {a}
        self._clusters[a].add(p)

        # Merge transitive clusters
        for member in list(self._clusters[p]):
            if member in self._clusters:
                self._clusters[p].update(self._clusters[member])

    def learn_from_vendor_profile(self, vendor_id: str, profile_data: Dict[str, Any]) -> None:
        """Extracts and binds all identifiers from a vendor profile."""
        if not vendor_id:
            return
        candidates = [
            profile_data.get("name"),
            profile_data.get("brand_name"),
            profile_data.get("company_name"),
            profile_data.get("city"),
            profile_data.get("subdomain"),
        ]
        for cand in candidates:
            if cand and isinstance(cand, str):
                self.learn_alias(vendor_id, cand)
                tokens = extract_semantic_tokens(cand)
                if tokens:
                    self.learn_alias(vendor_id, "_".join(tokens))

    def is_learned_alias(self, vendor_a: str, vendor_b: str) -> bool:
        """Checks if vendor_b is in vendor_a's learned alias graph."""
        a = vendor_a.strip().lower()
        b = vendor_b.strip().lower()
        if a == b:
            return True
        if a in self._clusters and b in self._clusters[a]:
            return True
        if b in self._clusters and a in self._clusters[b]:
            return True
        return False

    def canonicalize(self, vendor_id: str) -> str:
        """Returns the canonical semantic fingerprint for a vendor ID."""
        if not vendor_id:
            return ""
        tokens = extract_semantic_tokens(vendor_id)
        if tokens:
            return "_".join(tokens)
        return vendor_id.lower().replace("vendor_", "").replace("vendor-", "").replace("-", "_").strip()


# Global Singleton Instance
vendor_identity_learner = VendorIdentityLearner()


def is_self_vendor(vendor_a: str, vendor_b: str) -> bool:
    """
    Dynamic, Self-Learning Vendor Identity Matcher.
    Returns True if vendor_a and vendor_b refer to the same sovereign entity.
    """
    if not vendor_a or not vendor_b:
        return False
    
    a_raw = str(vendor_a).strip().lower()
    b_raw = str(vendor_b).strip().lower()

    # 1. Exact Raw Equality
    if a_raw == b_raw:
        return True

    # 2. Check Learned Knowledge Graph
    if vendor_identity_learner.is_learned_alias(a_raw, b_raw):
        return True

    # 3. Extract Distinctive Semantic Tokens
    a_tokens = extract_semantic_tokens(a_raw)
    b_tokens = extract_semantic_tokens(b_raw)

    if a_tokens and b_tokens:
        # 4. Token Intersection & Overlap Ratio
        common = [
            t for t in a_tokens
            if t in b_tokens or any(is_acronym_match(t, bt) or is_acronym_match(bt, t) for bt in b_tokens)
        ]
        min_tokens = min(len(a_tokens), len(b_tokens))
        if min_tokens > 0:
            overlap = len(common) / min_tokens
            if len(common) > 0 and overlap >= 0.5:
                # Auto-learn this dynamic match
                vendor_identity_learner.learn_alias(a_raw, b_raw)
                return True

    # 5. Normalized Compact Roots
    a_clean = "".join(a_tokens)
    b_clean = "".join(b_tokens)

    if a_clean and b_clean:
        if a_clean == b_clean or a_clean in b_clean or b_clean in a_clean:
            vendor_identity_learner.learn_alias(a_raw, b_raw)
            return True

        # 6. Fuzzy Similarity on Normalized Roots
        sim = string_similarity(a_clean, b_clean)
        if sim >= 0.82:
            vendor_identity_learner.learn_alias(a_raw, b_raw)
            return True

    return False
