/**
 * Insights Step Handler
 * Generates insight pack from transcript using Gemini
 */

import { GoogleGenAI, Type, Schema } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase';
import type { PipelineContext, StepResult, InsightPackContent } from '@/types';
import { ERROR_CODES } from '@/types';
import { getTranscript } from './transcription';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * JSON schema for insight pack output
 */
const insightPackSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    executive_summary_bullets: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '5-8 key takeaway bullets',
    },
    themes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ['name', 'explanation'],
      },
      description: '3-7 main themes with explanations',
    },
    takeaways: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '5-10 actionable takeaways',
    },
    quotes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          timestamp: { type: Type.STRING },
          context: { type: Type.STRING },
        },
        required: ['quote', 'timestamp'],
      },
      description: '3-8 notable quotes with timestamps',
    },
    outline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          h2: { type: Type.STRING },
          h3: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['h2'],
      },
      description: 'Blog-ready content outline',
    },
    title_options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '10 potential titles',
    },
    hook_options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '10 potential hooks/opening lines',
    },
    risk_flags: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          claim: { type: Type.STRING },
          why_risky: { type: Type.STRING },
          suggested_rewrite: { type: Type.STRING },
        },
        required: ['claim', 'why_risky'],
      },
      description: 'Claims that appear factual but are not directly supported',
    },
  },
  required: [
    'executive_summary_bullets',
    'themes',
    'takeaways',
    'quotes',
    'outline',
    'title_options',
    'hook_options',
    'risk_flags',
  ],
};

/**
 * Generate insights from transcript
 */
export async function generateInsights(context: PipelineContext): Promise<StepResult> {
  const startTime = Date.now();
  
  try {
    const { job, job_run, contract } = context;
    
    // Get transcript
    const { data: transcriptData } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('job_run_id', job_run.id)
      .single();
    
    if (!transcriptData?.content_text) {
      return {
        success: false,
        step: 'INSIGHTS',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INVALID_INPUT,
        error_message: 'No transcript found for insight generation',
      };
    }
    
    if (!GEMINI_API_KEY) {
      return {
        success: false,
        step: 'INSIGHTS',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INTERNAL_ERROR,
        error_message: 'GEMINI_API_KEY not configured',
      };
    }
    
    // Generate insights using Gemini
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const systemPrompt = `You are an expert content analyst. Your task is to analyze video transcripts and extract structured insights that will be used for content repurposing.

Key requirements:
- All quotes MUST have accurate timestamps from the transcript
- Executive summary should capture the most important 5-8 points
- Themes should be distinct and meaningful
- Takeaways should be actionable for the target audience: ${contract.audience}
- Flag any claims that seem factual but aren't directly supported by the transcript
- Consider the tone: ${contract.tone}`;

    const userPrompt = `Analyze this transcript and generate a comprehensive insight pack:

TRANSCRIPT:
${transcriptData.content_text}

Generate the insight pack following the exact schema structure. Ensure:
1. 5-8 executive summary bullets
2. 3-7 distinct themes with explanations
3. 5-10 actionable takeaways
4. 3-8 notable quotes with exact timestamps
5. A blog-ready outline with H2/H3 structure
6. 10 title options
7. 10 hook options
8. Any risk flags for unsupported claims`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: { parts: [{ text: userPrompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: insightPackSchema,
        systemInstruction: systemPrompt,
      },
    });
    
    const responseText = response.text;
    if (!responseText) {
      return {
        success: false,
        step: 'INSIGHTS',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.GENERATION_FAILED,
        error_message: 'No response from Gemini',
      };
    }
    
    let insightContent: InsightPackContent;
    try {
      insightContent = JSON.parse(responseText);
    } catch {
      return {
        success: false,
        step: 'INSIGHTS',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.GENERATION_FAILED,
        error_message: 'Failed to parse insight pack JSON',
      };
    }
    
    // Calculate risk score based on flags
    const riskScore = Math.min(
      (insightContent.risk_flags?.length || 0) * 0.15,
      1.0
    );
    
    // Create summary text from executive bullets
    const summaryText = insightContent.executive_summary_bullets?.slice(0, 3).join(' ') || '';
    
    // Store insight pack
    const storageKey = `insights/${context.workspace_id}/${job.id}/${job_run.id}/insights.json`;
    
    const { data: insightPack, error } = await supabaseAdmin
      .from('insight_packs')
      .insert({
        job_run_id: job_run.id,
        storage_key: storageKey,
        content_json: insightContent,
        summary_text: summaryText.slice(0, 500),
        risk_score: riskScore,
      })
      .select()
      .single();
    
    if (error) {
      return {
        success: false,
        step: 'INSIGHTS',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INTERNAL_ERROR,
        error_message: `Failed to store insight pack: ${error.message}`,
      };
    }
    
    // Estimate tokens used (rough estimate)
    const tokensUsed = Math.ceil(
      (transcriptData.content_text.length + responseText.length) / 4
    );
    
    return {
      success: true,
      step: 'INSIGHTS',
      duration_ms: Date.now() - startTime,
      outputs: {
        insight_pack_id: insightPack.id,
      },
      metrics: {
        themes_count: insightContent.themes?.length || 0,
        quotes_count: insightContent.quotes?.length || 0,
        risk_score: riskScore,
        risk_flags_count: insightContent.risk_flags?.length || 0,
        tokens_used: tokensUsed,
      },
    };
  } catch (error) {
    // Classify the error for better handling
    const errorMessage = error instanceof Error ? error.message : 'Insight generation failed';
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
      step: 'INSIGHTS',
      duration_ms: Date.now() - startTime,
      error_code: errorCode,
      error_message: errorMessage,
    };
  }
}

/**
 * Get insight pack by ID
 */
export async function getInsightPack(insightPackId: string): Promise<InsightPackContent | null> {
  const { data, error } = await supabaseAdmin
    .from('insight_packs')
    .select('content_json')
    .eq('id', insightPackId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data.content_json as InsightPackContent;
}

