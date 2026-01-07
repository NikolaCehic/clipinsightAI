/**
 * Versioned Prompt Templates
 * Based on Prompt Spec Pack section 3D
 */

/**
 * Prompt version identifiers
 */
export const PROMPT_VERSIONS = {
  planner: 'v1',
  writer: 'v1',
  reviewer: 'v1',
} as const;

/**
 * Prompt template type
 */
export interface PromptTemplate {
  version: string;
  system: string;
  user: string;
}

/**
 * Planner prompt templates by version
 */
const PLANNER_PROMPTS: Record<string, PromptTemplate> = {
  v1: {
    version: 'v1',
    system: `Create a content plan for transforming the transcript + insight pack into the required formats. 

Your output should include:
1. A short plan per format (target angle, structure, key points to emphasize)
2. A shared vocabulary list of key terms to use consistently

Rules:
- Respect the Generation Contract provided
- Do not write the full drafts - only the plan
- Identify the most compelling angles from the source material
- Consider the target audience for each format
- Note any quotes with timestamps that should be featured`,
    user: `Create a content plan based on:

GENERATION CONTRACT:
{{contract_json}}

INSIGHT PACK:
{{insights_json}}

TRANSCRIPT SUMMARY:
{{transcript_summary}}

Provide a plan for: Newsletter, Blog Post, Twitter Thread, LinkedIn Post`,
  },
};

/**
 * Writer prompt templates by version
 */
const WRITER_PROMPTS: Record<string, PromptTemplate> = {
  v1: {
    version: 'v1',
    system: `You are writing content strictly grounded in the provided transcript and insight pack.

CRITICAL RULES:
1. Never invent facts or quotes not present in the source material
2. All quotes must include timestamps as provided in the insight pack
3. If referencing claims, frame them as "as stated in the video" or similar
4. Follow the Generation Contract exactly
5. Match the specified tone and audience
6. Avoid banned terms
7. Include the brand CTA where appropriate
8. Stay within length constraints

Your output must be complete, polished content ready for publishing.`,
    user: `Write a {{format}} based on:

CONTENT PLAN:
{{plan}}

GENERATION CONTRACT:
{{contract_json}}

INSIGHT PACK (use for structure and quotes):
{{insights_json}}

TRANSCRIPT (use for grounding):
{{transcript}}

FORMAT REQUIREMENTS:
{{format_requirements}}

Generate the complete content now.`,
  },
};

/**
 * Reviewer prompt templates by version
 */
const REVIEWER_PROMPTS: Record<string, PromptTemplate> = {
  v1: {
    version: 'v1',
    system: `You are a content QA reviewer. Your job is to verify that generated content:

1. FORMAT COMPLIANCE: Follows the required structure exactly
2. GROUNDING: All claims are supported by the source transcript
3. READABILITY: Is clear, scannable, and free of repetition
4. RISK: Contains no policy violations or unsupported factual claims

Score each dimension 0.0 to 1.0 where:
- 1.0 = Perfect
- 0.8+ = Minor issues
- 0.6-0.8 = Needs improvement
- <0.6 = Significant problems

Provide specific, actionable feedback for any issues.`,
    user: `Review this {{format}} content:

CONTENT TO REVIEW:
{{content}}

GENERATION CONTRACT:
{{contract_json}}

SOURCE TRANSCRIPT (for grounding check):
{{transcript}}

Evaluate and provide:
1. Scores for each dimension
2. Overall status (APPROVED / FIX_REQUIRED / MANUAL_REVIEW)
3. Required fixes with specific locations and instructions
4. Warnings and suggestions`,
  },
};

/**
 * Format-specific requirements
 */
export const FORMAT_REQUIREMENTS: Record<string, string> = {
  NEWSLETTER: `Newsletter format requirements:
- Subject line + preview text
- Hook paragraph (max 80 words)
- 3-5 sections with headings
- "Key Takeaways" bullet list (5 bullets)
- CTA section
- Total length: 700-1100 words`,

  BLOG: `Blog post format requirements:
- H1 title + compelling intro
- 4-7 H2 sections, optional H3s
- Include a summary box near the top
- Conclusion + CTA
- Total length: 900-1600 words`,

  TWITTER_THREAD: `Twitter thread format requirements:
- Tweet 1: Strong hook (no hashtags)
- 6-12 tweets total
- Each tweet <= 280 characters
- Write as numbered plain text (1., 2., etc.)
- Last tweet: CTA + link placeholder [LINK]`,

  LINKEDIN: `LinkedIn post format requirements:
- First line hook (<= 12 words)
- Short paragraphs (1-2 sentences each)
- 3-5 bullet takeaways
- CTA final line
- Max 3 hashtags
- Total length: 150-260 words`,
};

/**
 * Get prompt template
 */
export function getPromptTemplate(
  role: 'planner' | 'writer' | 'reviewer',
  version?: string
): PromptTemplate {
  const v = version || PROMPT_VERSIONS[role];
  
  switch (role) {
    case 'planner':
      return PLANNER_PROMPTS[v] || PLANNER_PROMPTS.v1;
    case 'writer':
      return WRITER_PROMPTS[v] || WRITER_PROMPTS.v1;
    case 'reviewer':
      return REVIEWER_PROMPTS[v] || REVIEWER_PROMPTS.v1;
    default:
      throw new Error(`Unknown prompt role: ${role}`);
  }
}

/**
 * Interpolate template variables
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return result;
}

/**
 * Build complete prompt for a role
 */
export function buildPrompt(
  role: 'planner' | 'writer' | 'reviewer',
  variables: Record<string, string>,
  version?: string
): { system: string; user: string } {
  const template = getPromptTemplate(role, version);
  
  return {
    system: interpolateTemplate(template.system, variables),
    user: interpolateTemplate(template.user, variables),
  };
}

