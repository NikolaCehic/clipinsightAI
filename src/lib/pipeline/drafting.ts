/**
 * Drafting Step Handler
 * Generates content drafts for all formats using Gemini
 */

import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase';
import type { 
  PipelineContext, 
  StepResult, 
  ArtifactType, 
  InsightPackContent,
  GenerationContract,
} from '@/types';
import { ERROR_CODES } from '@/types';
import { getPromptTemplate, PROMPT_VERSIONS } from '@/lib/prompts';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Format-specific generation settings
 */
const FORMAT_SETTINGS: Record<ArtifactType, { 
  systemRole: string; 
  temperature: number;
}> = {
  INSIGHTS: { systemRole: 'analyst', temperature: 0.3 },
  NEWSLETTER: { systemRole: 'newsletter_writer', temperature: 0.7 },
  BLOG: { systemRole: 'blog_writer', temperature: 0.7 },
  TWITTER_THREAD: { systemRole: 'twitter_writer', temperature: 0.8 },
  LINKEDIN: { systemRole: 'linkedin_writer', temperature: 0.7 },
};

/**
 * Generate drafts for all formats
 */
export async function generateDrafts(context: PipelineContext): Promise<StepResult> {
  const startTime = Date.now();
  
  try {
    const { job, job_run, contract } = context;
    
    if (!GEMINI_API_KEY) {
      return {
        success: false,
        step: 'DRAFTING',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INTERNAL_ERROR,
        error_message: 'GEMINI_API_KEY not configured',
      };
    }
    
    // Get transcript
    const { data: transcript } = await supabaseAdmin
      .from('transcripts')
      .select('content_text')
      .eq('job_run_id', job_run.id)
      .single();
    
    if (!transcript?.content_text) {
      return {
        success: false,
        step: 'DRAFTING',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INVALID_INPUT,
        error_message: 'No transcript found for drafting',
      };
    }
    
    // Get insight pack
    const { data: insightPack } = await supabaseAdmin
      .from('insight_packs')
      .select('content_json')
      .eq('job_run_id', job_run.id)
      .single();
    
    if (!insightPack?.content_json) {
      return {
        success: false,
        step: 'DRAFTING',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INVALID_INPUT,
        error_message: 'No insight pack found for drafting',
      };
    }
    
    const insights = insightPack.content_json as InsightPackContent;
    
    // Determine which formats to generate
    const formatsToGenerate: ArtifactType[] = [
      'NEWSLETTER',
      'BLOG',
      'TWITTER_THREAD',
      'LINKEDIN',
    ];
    
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const artifactIds: Record<ArtifactType, string> = {} as Record<ArtifactType, string>;
    let totalTokens = 0;
    
    // Generate each format
    for (const format of formatsToGenerate) {
      const result = await generateSingleDraft(
        ai,
        format,
        transcript.content_text,
        insights,
        contract,
        job_run.id,
        context.workspace_id,
        job.id
      );
      
      if (!result.success) {
        // Log but continue with other formats
        console.error(`Failed to generate ${format}:`, result.error);
        continue;
      }
      
      artifactIds[format] = result.artifactId!;
      totalTokens += result.tokensUsed || 0;
    }
    
    // Check if we generated at least one artifact
    const generatedCount = Object.keys(artifactIds).length;
    if (generatedCount === 0) {
      return {
        success: false,
        step: 'DRAFTING',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.GENERATION_FAILED,
        error_message: 'Failed to generate any content formats',
      };
    }
    
    return {
      success: true,
      step: 'DRAFTING',
      duration_ms: Date.now() - startTime,
      outputs: {
        artifact_ids: artifactIds,
      },
      metrics: {
        formats_generated: generatedCount,
        formats_requested: formatsToGenerate.length,
        tokens_used: totalTokens,
      },
    };
  } catch (error) {
    // Classify the error for better handling
    const errorMessage = error instanceof Error ? error.message : 'Drafting failed';
    let errorCode = ERROR_CODES.GENERATION_FAILED;
    
    // Check for specific API errors
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      errorCode = ERROR_CODES.API_QUOTA_EXCEEDED;
    } else if (errorMessage.includes('401') || errorMessage.includes('API key') || errorMessage.includes('UNAUTHENTICATED')) {
      errorCode = ERROR_CODES.API_KEY_INVALID;
    } else if (errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('UNAVAILABLE')) {
      errorCode = ERROR_CODES.API_UNAVAILABLE;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED')) {
      errorCode = ERROR_CODES.TIMEOUT;
    } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
      errorCode = ERROR_CODES.NETWORK_ERROR;
    }
    
    return {
      success: false,
      step: 'DRAFTING',
      duration_ms: Date.now() - startTime,
      error_code: errorCode,
      error_message: errorMessage,
    };
  }
}

/**
 * Generate a single format draft
 */
async function generateSingleDraft(
  ai: GoogleGenAI,
  format: ArtifactType,
  transcript: string,
  insights: InsightPackContent,
  contract: GenerationContract,
  jobRunId: string,
  workspaceId: string,
  jobId: string
): Promise<{
  success: boolean;
  artifactId?: string;
  tokensUsed?: number;
  error?: string;
}> {
  try {
    const settings = FORMAT_SETTINGS[format];
    const systemPrompt = getSystemPrompt(format, contract);
    const userPrompt = getUserPrompt(format, transcript, insights, contract);
    
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: { parts: [{ text: userPrompt }] },
      config: {
        temperature: settings.temperature,
        systemInstruction: systemPrompt,
      },
    });
    
    const content = response.text;
    if (!content) {
      return { success: false, error: 'No content generated' };
    }
    
    // Extract title from content
    const title = extractTitle(content, format);
    
    // Calculate word/char counts
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const charCount = content.length;
    
    // Store artifact
    const storageKey = `artifacts/${workspaceId}/${jobId}/${jobRunId}/${format.toLowerCase()}.md`;
    
    const { data: artifact, error } = await supabaseAdmin
      .from('artifacts')
      .insert({
        job_run_id: jobRunId,
        type: format,
        variant: 'DEFAULT',
        status: 'DRAFT',
        title,
        storage_key: storageKey,
        content_text: content,
        content_preview: content.slice(0, 200),
        word_count: wordCount,
        char_count: charCount,
      })
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Estimate tokens used
    const tokensUsed = Math.ceil((transcript.length + content.length) / 4);
    
    return {
      success: true,
      artifactId: artifact.id,
      tokensUsed,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get system prompt for format
 */
function getSystemPrompt(format: ArtifactType, contract: GenerationContract): string {
  const basePrompt = `You are writing content strictly grounded in the provided transcript and insight pack. Follow these rules:
- Never invent facts or quotes not present in the source material
- All quotes must include timestamps as provided in the insight pack
- Match the tone: ${contract.tone}
- Target audience: ${contract.audience}
- ${contract.constraints.avoid_medical_legal_financial_advice ? 'Avoid medical, legal, or financial advice' : ''}
- Banned terms: ${contract.brand.banned_terms.join(', ')}`;

  const formatPrompts: Record<ArtifactType, string> = {
    INSIGHTS: basePrompt,
    NEWSLETTER: `${basePrompt}

Newsletter format requirements:
- Subject line + preview text
- Hook paragraph (max 80 words)
- 3-5 sections with headings
- "Key Takeaways" bullet list (5 bullets)
- CTA section
- Target length: ${contract.formats.newsletter.length}`,
    BLOG: `${basePrompt}

Blog post format requirements:
- H1 + compelling intro
- 4-7 H2 sections, optional H3s
- Include a summary box near the top
- Conclusion + CTA
- Target length: ${contract.formats.blog.length}`,
    TWITTER_THREAD: `${basePrompt}

Twitter thread format requirements:
- Tweet 1: Strong hook (no hashtags)
- 6-12 tweets total
- Each tweet <= 280 characters
- Write as numbered plain text
- Last tweet: CTA + link placeholder
- Target: ${contract.formats.twitter_thread.tweets} tweets`,
    LINKEDIN: `${basePrompt}

LinkedIn post format requirements:
- First line hook (<= 12 words)
- Short paragraphs (1-2 sentences each)
- 3-5 bullet takeaways
- CTA final line
- Max 3 hashtags
- Target length: ${contract.formats.linkedin.length}`,
  };
  
  return formatPrompts[format];
}

/**
 * Get user prompt for format
 */
function getUserPrompt(
  format: ArtifactType,
  transcript: string,
  insights: InsightPackContent,
  contract: GenerationContract
): string {
  const insightsJson = JSON.stringify(insights, null, 2);
  
  return `Create a ${format.toLowerCase().replace('_', ' ')} based on the following:

INSIGHT PACK:
${insightsJson}

TRANSCRIPT (for reference and quotes):
${transcript.slice(0, 10000)}${transcript.length > 10000 ? '...[truncated]' : ''}

BRAND CTA: ${contract.brand.cta}
KEYWORDS TO INCLUDE: ${contract.brand.keywords.join(', ')}

Generate the content now, following all format requirements exactly.`;
}

/**
 * Extract title from generated content
 */
function extractTitle(content: string, format: ArtifactType): string {
  // Try to extract from first line or heading
  const lines = content.split('\n').filter(l => l.trim());
  
  if (format === 'NEWSLETTER') {
    // Look for "Subject:" line
    const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'));
    if (subjectLine) {
      return subjectLine.replace(/^subject:\s*/i, '').trim();
    }
  }
  
  if (format === 'BLOG') {
    // Look for H1
    const h1 = lines.find(l => l.startsWith('# '));
    if (h1) {
      return h1.replace(/^#\s*/, '').trim();
    }
  }
  
  if (format === 'TWITTER_THREAD') {
    // First tweet is the hook
    const firstTweet = lines.find(l => /^1[\.\):]/.test(l) || !l.startsWith('#'));
    if (firstTweet) {
      return firstTweet.replace(/^1[\.\):]\s*/, '').slice(0, 100);
    }
  }
  
  // Default: first non-empty line
  return (lines[0] || 'Untitled').slice(0, 200);
}

