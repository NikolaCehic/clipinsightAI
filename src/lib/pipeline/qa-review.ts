/**
 * QA Review Step Handler
 * Reviews generated artifacts for quality, grounding, and compliance
 */

import { GoogleGenAI, Type, Schema } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase';
import type { 
  PipelineContext, 
  StepResult, 
  ArtifactType,
  ReviewNotes,
  GenerationContract,
} from '@/types';
import { ERROR_CODES } from '@/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Minimum scores for auto-approval
 */
const MIN_SCORES = {
  format_compliance: 0.8,
  grounding: 0.85,
  readability: 0.7,
  risk: 0.3, // Lower is better for risk
};

/**
 * JSON schema for review output
 */
const reviewSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    format_compliance_score: {
      type: Type.NUMBER,
      description: 'Score 0-1 for structural compliance',
    },
    grounding_score: {
      type: Type.NUMBER,
      description: 'Score 0-1 for factual accuracy',
    },
    readability_score: {
      type: Type.NUMBER,
      description: 'Score 0-1 for clarity and flow',
    },
    risk_score: {
      type: Type.NUMBER,
      description: 'Score 0-1 for policy/brand risks',
    },
    status: {
      type: Type.STRING,
      enum: ['APPROVED', 'FIX_REQUIRED', 'MANUAL_REVIEW'],
    },
    required_fixes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING },
          issue: { type: Type.STRING },
          instruction: { type: Type.STRING },
        },
        required: ['location', 'issue', 'instruction'],
      },
    },
    warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'format_compliance_score',
    'grounding_score',
    'readability_score',
    'risk_score',
    'status',
  ],
};

/**
 * Review all artifacts for a job run
 */
export async function reviewArtifacts(context: PipelineContext): Promise<StepResult> {
  const startTime = Date.now();
  
  try {
    const { job_run, contract } = context;
    
    if (!GEMINI_API_KEY) {
      return {
        success: false,
        step: 'QA',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INTERNAL_ERROR,
        error_message: 'GEMINI_API_KEY not configured',
      };
    }
    
    // Get all artifacts for this run
    const { data: artifacts, error: fetchError } = await supabaseAdmin
      .from('artifacts')
      .select('*')
      .eq('job_run_id', job_run.id);
    
    if (fetchError || !artifacts?.length) {
      return {
        success: false,
        step: 'QA',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INVALID_INPUT,
        error_message: 'No artifacts found for review',
      };
    }
    
    // Get transcript for grounding check
    const { data: transcript } = await supabaseAdmin
      .from('transcripts')
      .select('content_text')
      .eq('job_run_id', job_run.id)
      .single();
    
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    let allApproved = true;
    let requiresManualReview = false;
    let totalTokens = 0;
    
    // Review each artifact
    for (const artifact of artifacts) {
      const review = await reviewSingleArtifact(
        ai,
        artifact.type as ArtifactType,
        artifact.content_text || '',
        transcript?.content_text || '',
        contract
      );
      
      totalTokens += review.tokensUsed || 0;
      
      // Store review
      const { error: reviewError } = await supabaseAdmin
        .from('artifact_reviews')
        .insert({
          artifact_id: artifact.id,
          reviewer_type: 'AUTO',
          format_compliance_score: review.format_compliance_score,
          grounding_score: review.grounding_score,
          readability_score: review.readability_score,
          risk_score: review.risk_score,
          overall_score: review.overall_score,
          status: review.status,
          notes_json: review.notes,
        });
      
      if (reviewError) {
        console.error('Failed to store review:', reviewError);
      }
      
      // Update artifact status based on review
      let artifactStatus: string;
      if (review.status === 'APPROVED') {
        artifactStatus = 'REVIEWED_OK';
      } else if (review.status === 'MANUAL_REVIEW') {
        artifactStatus = 'NEEDS_FIX';
        requiresManualReview = true;
        allApproved = false;
      } else {
        artifactStatus = 'NEEDS_FIX';
        allApproved = false;
        
        // Attempt auto-fix if possible
        if (review.notes?.required_fixes?.length) {
          const fixResult = await attemptAutoFix(
            ai,
            artifact.content_text || '',
            review.notes.required_fixes,
            contract
          );
          
          if (fixResult.success && fixResult.fixedContent) {
            // Update artifact with fixed content
            await supabaseAdmin
              .from('artifacts')
              .update({
                content_text: fixResult.fixedContent,
                content_preview: fixResult.fixedContent.slice(0, 200),
                word_count: fixResult.fixedContent.split(/\s+/).filter(Boolean).length,
                char_count: fixResult.fixedContent.length,
                updated_at: new Date().toISOString(),
              })
              .eq('id', artifact.id);
            
            // Re-review after fix
            const reReview = await reviewSingleArtifact(
              ai,
              artifact.type as ArtifactType,
              fixResult.fixedContent,
              transcript?.content_text || '',
              contract
            );
            
            totalTokens += fixResult.tokensUsed || 0;
            totalTokens += reReview.tokensUsed || 0;
            
            // Store re-review
            await supabaseAdmin
              .from('artifact_reviews')
              .insert({
                artifact_id: artifact.id,
                reviewer_type: 'AUTO',
                format_compliance_score: reReview.format_compliance_score,
                grounding_score: reReview.grounding_score,
                readability_score: reReview.readability_score,
                risk_score: reReview.risk_score,
                overall_score: reReview.overall_score,
                status: reReview.status,
                notes_json: { ...reReview.notes, auto_fixed: true },
              });
            
            if (reReview.status === 'APPROVED') {
              artifactStatus = 'REVIEWED_OK';
              allApproved = allApproved; // Don't change if already false
            }
          }
        }
      }
      
      await supabaseAdmin
        .from('artifacts')
        .update({ status: artifactStatus })
        .eq('id', artifact.id);
    }
    
    // Determine overall result
    if (requiresManualReview) {
      return {
        success: false,
        step: 'QA',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.HIGH_RISK_CONTENT,
        error_message: 'Content requires manual review due to high risk score',
        metrics: {
          artifacts_reviewed: artifacts.length,
          all_approved: false,
          requires_manual: true,
          tokens_used: totalTokens,
        },
      };
    }
    
    return {
      success: true,
      step: 'QA',
      duration_ms: Date.now() - startTime,
      metrics: {
        artifacts_reviewed: artifacts.length,
        all_approved: allApproved,
        tokens_used: totalTokens,
      },
    };
  } catch (error) {
    return {
      success: false,
      step: 'QA',
      duration_ms: Date.now() - startTime,
      error_code: ERROR_CODES.INTERNAL_ERROR,
      error_message: error instanceof Error ? error.message : 'QA review failed',
    };
  }
}

/**
 * Review a single artifact
 */
async function reviewSingleArtifact(
  ai: GoogleGenAI,
  type: ArtifactType,
  content: string,
  transcript: string,
  contract: GenerationContract
): Promise<{
  format_compliance_score: number;
  grounding_score: number;
  readability_score: number;
  risk_score: number;
  overall_score: number;
  status: 'APPROVED' | 'FIX_REQUIRED' | 'MANUAL_REVIEW';
  notes: ReviewNotes;
  tokensUsed: number;
}> {
  const systemPrompt = `You are a content QA reviewer. Evaluate the content against these criteria:

1. FORMAT COMPLIANCE (0-1): Does the content follow the required structure for ${type}?
2. GROUNDING (0-1): Are all claims supported by the transcript? Are quotes accurate?
3. READABILITY (0-1): Is the content clear, scannable, and free of repetition?
4. RISK (0-1): Does the content contain policy violations, unsupported claims, or brand issues?

Banned terms: ${contract.brand.banned_terms.join(', ')}
Constraints: ${contract.constraints.no_fabrication ? 'No fabrication allowed' : ''}

Provide specific, actionable feedback for any issues found.`;

  const userPrompt = `Review this ${type} content:

CONTENT:
${content}

TRANSCRIPT (for grounding check):
${transcript.slice(0, 5000)}${transcript.length > 5000 ? '...[truncated]' : ''}

Provide scores and detailed feedback.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [{ text: userPrompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: reviewSchema,
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    });
    
    const responseText = response.text || '{}';
    const review = JSON.parse(responseText);
    
    // Calculate overall score
    const overall = (
      review.format_compliance_score * 0.25 +
      review.grounding_score * 0.35 +
      review.readability_score * 0.20 +
      (1 - review.risk_score) * 0.20
    );
    
    // Determine status
    let status: 'APPROVED' | 'FIX_REQUIRED' | 'MANUAL_REVIEW' = 'APPROVED';
    
    if (review.risk_score > 0.7) {
      status = 'MANUAL_REVIEW';
    } else if (
      review.format_compliance_score < MIN_SCORES.format_compliance ||
      review.grounding_score < MIN_SCORES.grounding ||
      review.readability_score < MIN_SCORES.readability ||
      review.risk_score > MIN_SCORES.risk
    ) {
      status = 'FIX_REQUIRED';
    }
    
    const tokensUsed = Math.ceil((content.length + transcript.slice(0, 5000).length + responseText.length) / 4);
    
    return {
      format_compliance_score: review.format_compliance_score,
      grounding_score: review.grounding_score,
      readability_score: review.readability_score,
      risk_score: review.risk_score,
      overall_score: overall,
      status: review.status || status,
      notes: {
        required_fixes: review.required_fixes || [],
        warnings: review.warnings || [],
        suggestions: review.suggestions || [],
      },
      tokensUsed,
    };
  } catch (error) {
    // Return conservative scores on error
    return {
      format_compliance_score: 0.5,
      grounding_score: 0.5,
      readability_score: 0.5,
      risk_score: 0.5,
      overall_score: 0.5,
      status: 'FIX_REQUIRED',
      notes: {
        required_fixes: [],
        warnings: ['Review failed - please manually verify content'],
      },
      tokensUsed: 0,
    };
  }
}

/**
 * Attempt to auto-fix issues in content
 */
async function attemptAutoFix(
  ai: GoogleGenAI,
  content: string,
  fixes: ReviewNotes['required_fixes'],
  contract: GenerationContract
): Promise<{
  success: boolean;
  fixedContent?: string;
  tokensUsed?: number;
}> {
  if (!fixes?.length) {
    return { success: false };
  }
  
  const fixInstructions = fixes.map((f, i) => 
    `${i + 1}. Location: ${f.location}\n   Issue: ${f.issue}\n   Fix: ${f.instruction}`
  ).join('\n\n');
  
  const prompt = `Fix the following issues in this content:

ISSUES TO FIX:
${fixInstructions}

CURRENT CONTENT:
${content}

REQUIREMENTS:
- Maintain the same structure and format
- Only fix the specific issues mentioned
- Keep the same tone: ${contract.tone}
- Do not add new information not in original

Return the complete fixed content.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [{ text: prompt }] },
      config: {
        temperature: 0.3,
      },
    });
    
    const fixedContent = response.text;
    if (!fixedContent) {
      return { success: false };
    }
    
    const tokensUsed = Math.ceil((content.length + fixedContent.length) / 4);
    
    return {
      success: true,
      fixedContent,
      tokensUsed,
    };
  } catch (error) {
    return { success: false };
  }
}

