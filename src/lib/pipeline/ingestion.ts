/**
 * Ingestion Step Handler
 * Handles media upload and storage
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { PipelineContext, StepResult } from '@/types';
import { ERROR_CODES } from '@/types';

/**
 * YouTube video info extraction (stub - would use youtube-dl or similar)
 */
interface YouTubeVideoInfo {
  title: string;
  duration_sec: number;
  thumbnail_url: string;
}

/**
 * Ingest media (upload to storage or download from URL)
 */
export async function ingestMedia(context: PipelineContext): Promise<StepResult> {
  const startTime = Date.now();
  
  try {
    const { job } = context;
    
    if (job.source_type === 'YOUTUBE_URL') {
      // For YouTube URLs, we need to:
      // 1. Extract video info
      // 2. Download video (or just audio for transcription)
      // 3. Store in object storage
      
      // Note: In production, use youtube-dl, yt-dlp, or a service API
      // For now, we'll create a placeholder
      
      const videoInfo = await extractYouTubeInfo(job.source_url!);
      
      if (!videoInfo) {
        return {
          success: false,
          step: 'INGESTION',
          duration_ms: Date.now() - startTime,
          error_code: ERROR_CODES.INVALID_URL,
          error_message: 'Failed to extract YouTube video info',
        };
      }
      
      // Update job with duration
      await supabaseAdmin
        .from('jobs')
        .update({
          video_duration_sec: videoInfo.duration_sec,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      
      // In production: Download and store the video/audio
      // For now, we'll store metadata only
      
      const storageKey = `videos/${context.workspace_id}/${job.id}/youtube_source.json`;
      
      // Create media asset record
      const { data: mediaAsset, error } = await supabaseAdmin
        .from('media_assets')
        .insert({
          job_id: job.id,
          kind: 'VIDEO',
          storage_key: storageKey,
          mime_type: 'application/json', // Placeholder
          size_bytes: 0,
        })
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          step: 'INGESTION',
          duration_ms: Date.now() - startTime,
          error_code: ERROR_CODES.UPLOAD_FAILED,
          error_message: `Failed to create media asset: ${error.message}`,
        };
      }
      
      return {
        success: true,
        step: 'INGESTION',
        duration_ms: Date.now() - startTime,
        outputs: {
          media_asset_id: mediaAsset.id,
        },
        metrics: {
          video_duration_sec: videoInfo.duration_sec,
        },
      };
    } else if (job.source_type === 'UPLOAD') {
      // For uploads, the media should already be stored
      // We just need to verify it exists and is accessible
      
      const { data: mediaAsset } = await supabaseAdmin
        .from('media_assets')
        .select('*')
        .eq('job_id', job.id)
        .eq('kind', 'VIDEO')
        .single();
      
      if (!mediaAsset) {
        return {
          success: false,
          step: 'INGESTION',
          duration_ms: Date.now() - startTime,
          error_code: ERROR_CODES.INVALID_INPUT,
          error_message: 'Media asset not found for uploaded video',
        };
      }
      
      // Verify storage key exists
      // In production: Check Supabase Storage for the file
      
      return {
        success: true,
        step: 'INGESTION',
        duration_ms: Date.now() - startTime,
        outputs: {
          media_asset_id: mediaAsset.id,
        },
        metrics: {
          size_bytes: mediaAsset.size_bytes,
          duration_sec: mediaAsset.duration_sec,
        },
      };
    }
    
    return {
      success: false,
      step: 'INGESTION',
      duration_ms: Date.now() - startTime,
      error_code: ERROR_CODES.UNSUPPORTED_FORMAT,
      error_message: `Unsupported source type: ${job.source_type}`,
    };
  } catch (error) {
    return {
      success: false,
      step: 'INGESTION',
      duration_ms: Date.now() - startTime,
      error_code: ERROR_CODES.UPLOAD_FAILED,
      error_message: error instanceof Error ? error.message : 'Ingestion failed',
    };
  }
}

/**
 * Extract YouTube video info
 * In production: Use youtube-dl, yt-dlp, or YouTube Data API
 */
async function extractYouTubeInfo(url: string): Promise<YouTubeVideoInfo | null> {
  // Extract video ID from URL
  const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([^&?]+)/);
  if (!videoIdMatch) {
    return null;
  }
  
  const videoId = videoIdMatch[1];
  
  // In production, call YouTube API or use yt-dlp
  // For now, return placeholder data
  return {
    title: `YouTube Video ${videoId}`,
    duration_sec: 300, // 5 minutes placeholder
    thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  };
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: Buffer | Blob,
  contentType: string
): Promise<{ key: string; size: number } | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: true,
    });
  
  if (error) {
    console.error('Storage upload error:', error);
    return null;
  }
  
  return {
    key: data.path,
    size: file instanceof Buffer ? file.length : 0,
  };
}

/**
 * Get file from Supabase Storage
 */
export async function downloadFromStorage(
  bucket: string,
  path: string
): Promise<Blob | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(path);
  
  if (error) {
    console.error('Storage download error:', error);
    return null;
  }
  
  return data;
}

