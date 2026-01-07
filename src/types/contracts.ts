/**
 * Generation Contract Types for ClipInsight AI
 * Based on Prompt Spec Pack section 3A
 */

// ============================================================================
// GENERATION CONTRACT SCHEMA
// ============================================================================

/**
 * Full generation contract that controls content generation
 */
export interface GenerationContract {
  /** Target language for generated content (ISO 639-1) */
  language: string;
  
  /** Target audience description */
  audience: string;
  
  /** Writing tone/style */
  tone: string;
  
  /** Brand configuration */
  brand: BrandConfig;
  
  /** Content constraints and rules */
  constraints: ContentConstraints;
  
  /** Format-specific constraints */
  formats: FormatConstraints;
}

/**
 * Brand-specific configuration
 */
export interface BrandConfig {
  /** Keywords to include when relevant */
  keywords: string[];
  
  /** Call-to-action text */
  cta: string;
  
  /** Terms/phrases to avoid */
  banned_terms: string[];
  
  /** Additional style guidance */
  style_notes: string;
}

/**
 * Content generation constraints
 */
export interface ContentConstraints {
  /** Never invent facts not in source */
  no_fabrication: boolean;
  
  /** All quotes must have timestamps */
  quotes_require_timestamps: boolean;
  
  /** Avoid medical/legal/financial advice */
  avoid_medical_legal_financial_advice: boolean;
}

/**
 * Format-specific length/count constraints
 */
export interface FormatConstraints {
  newsletter: NewsletterConstraints;
  blog: BlogConstraints;
  twitter_thread: TwitterConstraints;
  linkedin: LinkedInConstraints;
}

export interface NewsletterConstraints {
  /** Word count range, e.g. "700-1100 words" */
  length: string;
  min_words?: number;
  max_words?: number;
}

export interface BlogConstraints {
  /** Word count range, e.g. "900-1600 words" */
  length: string;
  min_words?: number;
  max_words?: number;
}

export interface TwitterConstraints {
  /** Tweet count range, e.g. "8-12" */
  tweets: string;
  min_tweets?: number;
  max_tweets?: number;
}

export interface LinkedInConstraints {
  /** Word count range, e.g. "150-260 words" */
  length: string;
  min_words?: number;
  max_words?: number;
}

// ============================================================================
// DEFAULT CONTRACT
// ============================================================================

/**
 * Default generation contract
 */
export const DEFAULT_CONTRACT: GenerationContract = {
  language: 'en',
  audience: 'builders interested in AI tooling',
  tone: 'professional, concise, actionable',
  brand: {
    keywords: ['ClipInsightAI', 'repurpose', 'insights'],
    cta: 'Try ClipInsightAI to turn videos into high-performing posts.',
    banned_terms: ['guaranteed', 'get rich quick'],
    style_notes: 'Avoid hype. Use clear headings. Prefer short sentences.',
  },
  constraints: {
    no_fabrication: true,
    quotes_require_timestamps: true,
    avoid_medical_legal_financial_advice: true,
  },
  formats: {
    newsletter: { length: '700-1100 words', min_words: 700, max_words: 1100 },
    blog: { length: '900-1600 words', min_words: 900, max_words: 1600 },
    twitter_thread: { tweets: '8-12', min_tweets: 8, max_tweets: 12 },
    linkedin: { length: '150-260 words', min_words: 150, max_words: 260 },
  },
};

// ============================================================================
// CONTRACT UTILITIES
// ============================================================================

/**
 * Merge user preferences with default contract
 */
export function mergeContract(
  defaults: GenerationContract,
  overrides: Partial<GenerationContract>
): GenerationContract {
  return {
    language: overrides.language ?? defaults.language,
    audience: overrides.audience ?? defaults.audience,
    tone: overrides.tone ?? defaults.tone,
    brand: {
      ...defaults.brand,
      ...overrides.brand,
      keywords: overrides.brand?.keywords ?? defaults.brand.keywords,
      banned_terms: overrides.brand?.banned_terms ?? defaults.brand.banned_terms,
    },
    constraints: {
      ...defaults.constraints,
      ...overrides.constraints,
    },
    formats: {
      newsletter: { ...defaults.formats.newsletter, ...overrides.formats?.newsletter },
      blog: { ...defaults.formats.blog, ...overrides.formats?.blog },
      twitter_thread: { ...defaults.formats.twitter_thread, ...overrides.formats?.twitter_thread },
      linkedin: { ...defaults.formats.linkedin, ...overrides.formats?.linkedin },
    },
  };
}

/**
 * Convert brand preset to contract overrides
 */
export function brandPresetToContractOverrides(
  preset: import('./database').BrandPresetDefaults
): Partial<GenerationContract> {
  return {
    audience: preset.audience,
    tone: preset.tone,
    brand: {
      keywords: preset.keywords ?? [],
      cta: preset.cta ?? '',
      banned_terms: preset.banned_terms ?? [],
      style_notes: preset.style_notes ?? '',
    },
  };
}

/**
 * Validate contract completeness
 */
export function validateContract(contract: GenerationContract): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!contract.language) errors.push('Missing language');
  if (!contract.audience) errors.push('Missing audience');
  if (!contract.tone) errors.push('Missing tone');
  
  if (!contract.formats.newsletter?.length) errors.push('Missing newsletter length constraint');
  if (!contract.formats.blog?.length) errors.push('Missing blog length constraint');
  if (!contract.formats.twitter_thread?.tweets) errors.push('Missing twitter thread tweet count');
  if (!contract.formats.linkedin?.length) errors.push('Missing linkedin length constraint');
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse length string to min/max values
 * e.g. "700-1100 words" -> { min: 700, max: 1100 }
 */
export function parseLengthConstraint(length: string): { min: number; max: number } | null {
  const match = length.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return null;
  return {
    min: parseInt(match[1], 10),
    max: parseInt(match[2], 10),
  };
}

/**
 * Check if content meets length constraints
 */
export function meetsLengthConstraint(
  wordCount: number,
  constraint: { min_words?: number; max_words?: number }
): boolean {
  const { min_words, max_words } = constraint;
  if (min_words && wordCount < min_words) return false;
  if (max_words && wordCount > max_words) return false;
  return true;
}

// ============================================================================
// CONTRACT SERIALIZATION
// ============================================================================

/**
 * Serialize contract to JSON string (for storage)
 */
export function serializeContract(contract: GenerationContract): string {
  return JSON.stringify(contract);
}

/**
 * Parse contract from JSON string
 */
export function parseContract(json: string): GenerationContract {
  const parsed = JSON.parse(json);
  return mergeContract(DEFAULT_CONTRACT, parsed);
}

/**
 * Get contract version identifier
 */
export function getContractVersion(): string {
  return 'v1.0.0';
}

