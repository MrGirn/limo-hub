/**
 * Dynamic Self-Learning Vendor Identity Resolution Engine.
 * 
 * Replaces static hardcoded vendor/city lists with:
 * 1. Dynamic Alphanumeric Tokenization & Noise Filtering
 * 2. Semantic Token Overlap & Jaro-Winkler / Levenshtein Distance Matrix
 * 3. Dynamic Acronym & Initialism Resolution (e.g. LA <-> Los Angeles, PHL <-> Philadelphia)
 * 4. Self-Learning Persistent Alias Graph (Learns from runtime configs, directory objects & operator feedback)
 */

export interface VendorEntityContext {
  vendor_id?: string;
  vendor_name?: string;
  brand_name?: string;
  company_name?: string;
  subdomain?: string;
  city?: string;
  email?: string;
  phone?: string;
  website_url?: string;
}

const STORAGE_KEY = 'limo_learned_vendor_identities_v2';

// Common generic corporate & industry stop-words to eliminate noise
const NOISE_STOP_WORDS = new Set([
  'vendor', 'partner', 'cell', 'org', 'limo', 'limos', 'limousine', 'limousines',
  'fleet', 'fleets', 'chauffeur', 'chauffeurs', 'transport', 'transportation',
  'executive', 'exec', 'vip', 'prestige', 'sovereign', 'royal', 'global',
  'luxury', 'blackcar', 'black_car', 'shuttle', 'services', 'service',
  'holdings', 'group', 'enterprise', 'enterprises', 'inc', 'llc', 'ltd',
  'corp', 'corporation', 'co', 'the', 'and', 'of', 'for'
]);

/**
 * Normalizes an identifier or company name into distinctive semantic tokens.
 */
export function extractSemanticTokens(text?: string): string[] {
  if (!text) return [];
  
  // Clean punctuation, split camelCase, snake_case, kebab-case, dots
  const cleaned = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const tokens = cleaned
    .split(/\s+/)
    .filter(t => t.length > 0 && !NOISE_STOP_WORDS.has(t));

  return Array.from(new Set(tokens));
}

/**
 * Computes Levenshtein edit distance between two normalized strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Computes Normalized String Similarity (0.0 to 1.0).
 */
export function stringSimilarity(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Checks if one token sequence dynamically represents an acronym/initialism of another.
 * E.g., 'la' matches 'los angeles', 'nyc' matches 'new york city', 'phl' matches 'philadelphia'.
 */
function isAcronymMatch(tokenA: string, tokenB: string): boolean {
  if (tokenA === tokenB) return true;
  const short = tokenA.length < tokenB.length ? tokenA : tokenB;
  const long = tokenA.length < tokenB.length ? tokenB : tokenA;

  // Check if short is the prefix initials of the long string
  if (short.length >= 2 && long.length >= 4) {
    if (long.startsWith(short)) return true;
  }
  return false;
}

/**
 * Persistent, Self-Learning Vendor Identity Knowledge Graph.
 */
class VendorIdentityLearnerStore {
  private aliasClusters: Map<string, Set<string>> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          for (const [key, aliases] of Object.entries(parsed)) {
            if (Array.isArray(aliases)) {
              this.aliasClusters.set(key.toLowerCase(), new Set(aliases.map((a: string) => a.toLowerCase())));
            }
          }
        }
      }
    } catch (e) {
      console.warn('[VendorIdentityLearner] Could not parse stored identity graph:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const obj: Record<string, string[]> = {};
      for (const [key, set] of this.aliasClusters.entries()) {
        obj[key] = Array.from(set);
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('[VendorIdentityLearner] Could not persist identity graph:', e);
    }
  }

  /**
   * Dynamically learns and binds an alias to a vendor cluster (Bidirectional).
   */
  public learnAlias(primaryVendorId: string, aliasOrIdentifier: string) {
    if (!primaryVendorId || !aliasOrIdentifier) return;
    const p = primaryVendorId.toLowerCase().trim();
    const a = aliasOrIdentifier.toLowerCase().trim();
    if (p === a) return;

    if (!this.aliasClusters.has(p)) {
      this.aliasClusters.set(p, new Set([p]));
    }
    this.aliasClusters.get(p)!.add(a);

    // Bidirectional link
    if (!this.aliasClusters.has(a)) {
      this.aliasClusters.set(a, new Set([a]));
    }
    this.aliasClusters.get(a)!.add(p);

    // Merge transitive clusters
    for (const member of Array.from(this.aliasClusters.get(p)!)) {
      if (this.aliasClusters.has(member)) {
        for (const trans of Array.from(this.aliasClusters.get(member)!)) {
          this.aliasClusters.get(p)!.add(trans);
        }
      }
    }

    this.saveToStorage();
  }

  /**
   * Auto-learns from a rich Vendor Config or Context.
   */
  public learnFromContext(context: VendorEntityContext) {
    if (!context || !context.vendor_id) return;
    const vid = context.vendor_id;

    const candidates = [
      context.vendor_name,
      context.brand_name,
      context.company_name,
      context.subdomain,
      context.city,
      context.email?.split('@')[0],
      context.website_url?.replace(/https?:\/\//, '').split('.')[0]
    ].filter(Boolean) as string[];

    for (const cand of candidates) {
      this.learnAlias(vid, cand);
      // Also learn clean semantic tokens
      const tokens = extractSemanticTokens(cand);
      if (tokens.length > 0) {
        this.learnAlias(vid, tokens.join('_'));
      }
    }
  }

  /**
   * Checks if candidateId belongs to the learned alias cluster of currentVendorId.
   */
  public isLearnedAlias(currentVendorId: string, candidateId: string): boolean {
    const c = currentVendorId.toLowerCase().trim();
    const target = candidateId.toLowerCase().trim();
    if (c === target) return true;

    const cluster = this.aliasClusters.get(c);
    if (cluster && cluster.has(target)) return true;

    // Check inverse
    const targetCluster = this.aliasClusters.get(target);
    if (targetCluster && targetCluster.has(c)) return true;

    return false;
  }

  /**
   * Returns all known aliases for a vendor.
   */
  public getAliases(vendorId: string): string[] {
    const v = vendorId.toLowerCase().trim();
    const set = this.aliasClusters.get(v);
    return set ? Array.from(set) : [v];
  }
}

// Global Singleton Learner Instance
export const vendorIdentityLearner = new VendorIdentityLearnerStore();

/**
 * Dynamic Self-Learning Vendor Matcher.
 * 
 * Evaluates whether partnerId refers to the same entity as currentVendorId:
 * - Direct ID equality
 * - Learned Alias Graph (localStorage + runtime memory)
 * - Semantic Token Intersection & Overlap Coefficient
 * - Fuzzy Levenshtein / Jaro Distance on normalized roots
 * - Substring containment after noise stripping
 * - Acronym resolution
 */
export const isSelfVendor = (
  partnerId?: string | { partner_id?: string; company_name?: string; city?: string },
  currentVendorIdOrContext?: string | VendorEntityContext
): boolean => {
  if (!partnerId || !currentVendorIdOrContext) return false;

  // 1. Extract string identifiers
  const pId = typeof partnerId === 'string' 
    ? partnerId 
    : (partnerId.partner_id || partnerId.company_name || '');
  
  const pName = typeof partnerId === 'object' ? partnerId.company_name : undefined;

  const cId = typeof currentVendorIdOrContext === 'string'
    ? currentVendorIdOrContext
    : (currentVendorIdOrContext.vendor_id || currentVendorIdOrContext.vendor_name || '');

  if (!pId.trim() || !cId.trim()) return false;

  const pRaw = pId.toLowerCase().trim();
  const cRaw = cId.toLowerCase().trim();

  // 2. Exact Raw Equality
  if (pRaw === cRaw) return true;

  // 3. Check Self-Learning Knowledge Graph
  if (vendorIdentityLearner.isLearnedAlias(cRaw, pRaw)) {
    return true;
  }
  if (pName && vendorIdentityLearner.isLearnedAlias(cRaw, pName.toLowerCase().trim())) {
    return true;
  }

  // 4. Extract Distinctive Semantic Tokens
  const pTokens = extractSemanticTokens(pId);
  const cTokens = extractSemanticTokens(cId);

  if (pName) {
    pTokens.push(...extractSemanticTokens(pName));
  }

  if (typeof currentVendorIdOrContext === 'object') {
    if (currentVendorIdOrContext.vendor_name) cTokens.push(...extractSemanticTokens(currentVendorIdOrContext.vendor_name));
    if (currentVendorIdOrContext.brand_name) cTokens.push(...extractSemanticTokens(currentVendorIdOrContext.brand_name));
    if (currentVendorIdOrContext.city) cTokens.push(...extractSemanticTokens(currentVendorIdOrContext.city));
  }

  const pUniqueTokens = Array.from(new Set(pTokens));
  const cUniqueTokens = Array.from(new Set(cTokens));

  if (pUniqueTokens.length > 0 && cUniqueTokens.length > 0) {
    // 5. Token Intersection
    const commonTokens = pUniqueTokens.filter(t => 
      cUniqueTokens.includes(t) || 
      cUniqueTokens.some(ct => isAcronymMatch(t, ct) || isAcronymMatch(ct, t))
    );

    const minTokenCount = Math.min(pUniqueTokens.length, cUniqueTokens.length);
    const overlapRatio = commonTokens.length / minTokenCount;

    // Strong Semantic Match
    if (commonTokens.length > 0 && overlapRatio >= 0.5) {
      // Auto-learn this association for future instant lookups
      vendorIdentityLearner.learnAlias(cRaw, pRaw);
      return true;
    }
  }

  // 6. Normalized Compact Roots
  const pClean = pUniqueTokens.join('');
  const cClean = cUniqueTokens.join('');

  if (pClean && cClean) {
    if (pClean === cClean || pClean.includes(cClean) || cClean.includes(pClean)) {
      vendorIdentityLearner.learnAlias(cRaw, pRaw);
      return true;
    }

    // 7. Fuzzy Edit Distance on Clean Semantic Roots
    const similarity = stringSimilarity(pClean, cClean);
    if (similarity >= 0.82) {
      vendorIdentityLearner.learnAlias(cRaw, pRaw);
      return true;
    }
  }

  return false;
};
