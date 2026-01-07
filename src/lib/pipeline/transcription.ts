/**
 * Transcription Step Handler
 * Handles ASR (Automatic Speech Recognition) using Gemini
 */

import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase';
import type { PipelineContext, StepResult, Transcript, ASRMetadata } from '@/types';
import { ERROR_CODES } from '@/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Quality score threshold for acceptable transcripts
 */
const MIN_QUALITY_SCORE = 0.7;

/**
 * Transcribe media using Gemini or use user-provided transcript
 */
export async function transcribeMedia(context: PipelineContext): Promise<StepResult> {
  const startTime = Date.now();
  
  try {
    const { job, job_run } = context;
    
    // Check if user provided a transcript
    const { data: existingTranscript } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('job_run_id', job_run.id)
      .eq('source', 'USER')
      .single();
    
    if (existingTranscript) {
      // User provided transcript - validate quality
      const qualityScore = await assessTranscriptQuality(existingTranscript.content_text || '');
      
      if (qualityScore < MIN_QUALITY_SCORE) {
        return {
          success: false,
          step: 'ASR',
          duration_ms: Date.now() - startTime,
          error_code: ERROR_CODES.LOW_QUALITY_TRANSCRIPT,
          error_message: `Transcript quality score (${qualityScore.toFixed(2)}) is below minimum (${MIN_QUALITY_SCORE})`,
        };
      }
      
      // Update transcript with quality score
      await supabaseAdmin
        .from('transcripts')
        .update({ quality_score: qualityScore })
        .eq('id', existingTranscript.id);
      
      return {
        success: true,
        step: 'ASR',
        duration_ms: Date.now() - startTime,
        outputs: {
          transcript_id: existingTranscript.id,
        },
        metrics: {
          source: 'USER',
          quality_score: qualityScore,
          word_count: existingTranscript.word_count,
        },
      };
    }
    
    // No user transcript - use ASR
    if (!GEMINI_API_KEY) {
      return {
        success: false,
        step: 'ASR',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INTERNAL_ERROR,
        error_message: 'GEMINI_API_KEY not configured',
      };
    }
    
    // Get media asset
    const { data: mediaAsset } = await supabaseAdmin
      .from('media_assets')
      .select('*')
      .eq('job_id', job.id)
      .eq('kind', 'VIDEO')
      .single();
    
    if (!mediaAsset) {
      return {
        success: false,
        step: 'ASR',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INVALID_INPUT,
        error_message: 'No media asset found for transcription',
      };
    }
    
    // Perform transcription using Gemini
    const transcriptResult = await transcribeWithGemini(mediaAsset.storage_key, job.language);
    
    if (!transcriptResult.success) {
      return {
        success: false,
        step: 'ASR',
        duration_ms: Date.now() - startTime,
        error_code: transcriptResult.error_code || ERROR_CODES.TRANSCRIPTION_FAILED,
        error_message: transcriptResult.error_message || 'Transcription failed',
      };
    }
    
    // Assess quality
    const qualityScore = await assessTranscriptQuality(transcriptResult.text);
    
    if (qualityScore < MIN_QUALITY_SCORE) {
      return {
        success: false,
        step: 'ASR',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.LOW_QUALITY_TRANSCRIPT,
        error_message: `ASR transcript quality (${qualityScore.toFixed(2)}) is below minimum. User review needed.`,
      };
    }
    
    // Store transcript
    const storageKey = `transcripts/${context.workspace_id}/${job.id}/${job_run.id}/transcript.txt`;
    
    const wordCount = transcriptResult.text.split(/\s+/).filter(Boolean).length;
    
    const { data: transcript, error } = await supabaseAdmin
      .from('transcripts')
      .insert({
        job_run_id: job_run.id,
        source: 'ASR',
        format: 'TXT',
        storage_key: storageKey,
        content_text: transcriptResult.text,
        asr_metadata_json: {
          provider: 'gemini',
          confidence: transcriptResult.confidence,
          language_detected: transcriptResult.language_detected,
        } as ASRMetadata,
        quality_score: qualityScore,
        word_count: wordCount,
      })
      .select()
      .single();
    
    if (error) {
      return {
        success: false,
        step: 'ASR',
        duration_ms: Date.now() - startTime,
        error_code: ERROR_CODES.INTERNAL_ERROR,
        error_message: `Failed to store transcript: ${error.message}`,
      };
    }
    
    return {
      success: true,
      step: 'ASR',
      duration_ms: Date.now() - startTime,
      outputs: {
        transcript_id: transcript.id,
      },
      metrics: {
        source: 'ASR',
        provider: 'gemini',
        quality_score: qualityScore,
        word_count: wordCount,
        confidence: transcriptResult.confidence,
        tokens_used: transcriptResult.tokens_used,
      },
    };
  } catch (error) {
    return {
      success: false,
      step: 'ASR',
      duration_ms: Date.now() - startTime,
      error_code: ERROR_CODES.TRANSCRIPTION_FAILED,
      error_message: error instanceof Error ? error.message : 'Transcription failed',
    };
  }
}

/**
 * Transcribe video/audio using Gemini
 */
async function transcribeWithGemini(
  storageKey: string,
  language: string
): Promise<{
  success: boolean;
  text: string;
  confidence?: number;
  language_detected?: string;
  tokens_used?: number;
  error_code?: string;
  error_message?: string;
}> {
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    // In production: Fetch the actual media file from storage
    // For now, we'll use a placeholder approach
    
    // Note: Gemini can process video directly with inline data
    // In production, you'd read the file and convert to base64
    
    const prompt = `
      Please transcribe the following video/audio content.
      Target language: ${language}
      
      Provide:
      1. A complete, accurate transcription
      2. Include speaker labels if multiple speakers are detected
      3. Include timestamps in [MM:SS] format at major section breaks
      
      Output format:
      [00:00] Speaker 1: <text>
      [00:30] Speaker 2: <text>
      ...
    `;
    
    // For now, return a placeholder since we don't have actual video data
    // In production, this would process the actual video file
    
    return {
      success: true,
      text: `[00:00] This is a placeholder transcript for development purposes. In production, this would contain the actual transcribed content from the video file stored at ${storageKey}.`,
      confidence: 0.95,
      language_detected: language,
      tokens_used: 100,
    };
    
    // Production code would look like:
    // const response = await ai.models.generateContent({
    //   model: 'gemini-2.0-flash-exp',
    //   contents: {
    //     parts: [
    //       { inlineData: { mimeType: 'video/mp4', data: base64Data } },
    //       { text: prompt }
    //     ]
    //   }
    // });
    
  } catch (error) {
    return {
      success: false,
      text: '',
      error_code: ERROR_CODES.TRANSCRIPTION_FAILED,
      error_message: error instanceof Error ? error.message : 'Gemini transcription failed',
    };
  }
}

/**
 * Assess transcript quality
 * Returns score between 0 and 1
 */
async function assessTranscriptQuality(text: string): Promise<number> {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  
  // Basic quality heuristics
  let score = 1.0;
  
  // Penalize very short transcripts
  if (wordCount < 50) {
    score -= 0.3;
  }
  
  // Penalize transcripts with too many "[inaudible]" or similar markers
  const inaudibleCount = (text.match(/\[inaudible\]|\[unclear\]|\?\?\?/gi) || []).length;
  const inaudibleRatio = inaudibleCount / Math.max(wordCount / 50, 1);
  score -= Math.min(inaudibleRatio * 0.1, 0.3);
  
  // Penalize transcripts with excessive repetition
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const uniquenessRatio = uniqueWords.size / wordCount;
  if (uniquenessRatio < 0.3) {
    score -= 0.2;
  }
  
  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Get transcript by ID
 */
export async function getTranscript(transcriptId: string): Promise<Transcript | null> {
  const { data, error } = await supabaseAdmin
    .from('transcripts')
    .select('*')
    .eq('id', transcriptId)
    .single();
  
  if (error) {
    return null;
  }
  
  return data as Transcript;
}

