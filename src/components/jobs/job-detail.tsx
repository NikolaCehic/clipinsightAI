'use client';

/**
 * Job Detail Component
 * Displays job details, artifacts, and actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Video,
  Youtube,
  Link2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Copy,
  Download,
  FileText,
  Mail,
  Twitter,
  Linkedin,
  BookOpen,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import type { Job, Artifact, ArtifactType, JobStatus } from '@/types';

interface JobDetailProps {
  jobId: string;
}

interface JobWithArtifacts extends Job {
  progress: number;
  artifacts: Artifact[];
  transcript: { content_text: string } | null;
  insight_pack: { content_json: object; summary_text: string } | null;
}

/**
 * Get icon for artifact type
 */
function getArtifactIcon(type: ArtifactType) {
  const icons: Record<ArtifactType, React.ReactNode> = {
    INSIGHTS: <FileText className="h-4 w-4" />,
    NEWSLETTER: <Mail className="h-4 w-4" />,
    BLOG: <BookOpen className="h-4 w-4" />,
    TWITTER_THREAD: <Twitter className="h-4 w-4" />,
    LINKEDIN: <Linkedin className="h-4 w-4" />,
  };
  return icons[type] || <FileText className="h-4 w-4" />;
}

/**
 * Get label for artifact type
 */
function getArtifactLabel(type: ArtifactType): string {
  const labels: Record<ArtifactType, string> = {
    INSIGHTS: 'Insights',
    NEWSLETTER: 'Newsletter',
    BLOG: 'Blog Post',
    TWITTER_THREAD: 'Twitter Thread',
    LINKEDIN: 'LinkedIn Post',
  };
  return labels[type] || type;
}

export function JobDetail({ jobId }: JobDetailProps) {
  const router = useRouter();
  const [job, setJob] = useState<JobWithArtifacts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job');
      const data = await res.json();
      setJob(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  // All terminal states where polling should stop
  const TERMINAL_STATES = [
    'ANALYTICS_LOGGED',
    'FAILED',
    'FAILED_VALIDATION',
    'BLOCKED_ENTITLEMENT',
    'REQUIRES_MANUAL_REVIEW',
    'NEEDS_USER_INPUT',
    'STORED',
    'DELIVERED',
  ];

  // Poll for updates on in-progress jobs (with visibility check)
  useEffect(() => {
    if (!job || TERMINAL_STATES.includes(job.status)) return;

    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(fetchJob, 3000);
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    // Handle visibility changes to pause/resume polling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchJob(); // Fetch immediately when tab becomes visible
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Start polling only if tab is visible
    if (document.visibilityState === 'visible') {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [job?.status]);

  const handleCopy = async (artifact: Artifact) => {
    if (!artifact.content_text) return;
    
    await navigator.clipboard.writeText(artifact.content_text);
    setCopiedId(artifact.id);
    setTimeout(() => setCopiedId(null), 2000);
    
    // Track copy
    await fetch(`/api/artifacts/${artifact.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'copy' }),
    });
  };

  const handleExport = async (artifactId: string, format: 'markdown' | 'html' | 'text') => {
    const res = await fetch(`/api/artifacts/${artifactId}?export=${format}`);
    if (!res.ok) return;
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `artifact.${format === 'markdown' ? 'md' : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = async () => {
    if (!job) return;
    
    setRegenerating(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (res.ok) {
        await fetchJob();
      }
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <XCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">{error || 'Job not found'}</p>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isComplete = job.progress === 100;
  const isFailed = job.status.includes('FAILED') || job.status === 'BLOCKED_ENTITLEMENT';
  const canRegenerate = isComplete || isFailed || job.status === 'REQUIRES_MANUAL_REVIEW' || job.status === 'NEEDS_USER_INPUT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {job.source_filename || job.source_url || `Job ${job.id.slice(0, 8)}`}
            </h1>
            <p className="text-muted-foreground">
              Created {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={fetchJob} variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canRegenerate && (
            <Button onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
          )}
        </div>
      </div>

      {/* Status and Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {job.source_type === 'YOUTUBE_URL' ? (
                <Youtube className="h-6 w-6 text-red-500" />
              ) : (
                <Video className="h-6 w-6 text-blue-500" />
              )}
              <div>
                <div className="font-medium">{job.source_type === 'YOUTUBE_URL' ? 'YouTube Video' : 'Uploaded Video'}</div>
                <div className="text-sm text-muted-foreground">
                  {job.video_duration_sec && (
                    <>Duration: {Math.floor(job.video_duration_sec / 60)}:{String(job.video_duration_sec % 60).padStart(2, '0')}</>
                  )}
                  {job.language && <> • Language: {job.language.toUpperCase()}</>}
                </div>
              </div>
            </div>

            <Badge variant={isComplete ? 'default' : isFailed ? 'destructive' : 'secondary'}>
              {isComplete ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Complete</>
              ) : isFailed ? (
                <><XCircle className="h-3 w-3 mr-1" /> Failed</>
              ) : (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing</>
              )}
            </Badge>
          </div>

          {/* Progress bar */}
          {!isComplete && !isFailed && (
            <div className="space-y-2">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <div className="text-sm text-muted-foreground text-center">
                {job.status.replace(/_/g, ' ')} ({job.progress}%)
              </div>
            </div>
          )}

          {/* Error message */}
          {job.status_reason && isFailed && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
              {job.status_reason}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Artifacts */}
      {job.artifacts && job.artifacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>
              {job.artifacts.length} content pieces generated from your video
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={job.artifacts[0]?.type}>
              <TabsList className="w-full justify-start flex-wrap h-auto gap-2 bg-transparent p-0">
                {job.artifacts.map((artifact) => (
                  <TabsTrigger
                    key={artifact.id}
                    value={artifact.type}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {getArtifactIcon(artifact.type)}
                    <span className="ml-2">{getArtifactLabel(artifact.type)}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {job.artifacts.map((artifact) => (
                <TabsContent key={artifact.id} value={artifact.type} className="mt-4">
                  <div className="space-y-4">
                    {/* Artifact header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{artifact.title || getArtifactLabel(artifact.type)}</h3>
                        <p className="text-sm text-muted-foreground">
                          {artifact.word_count} words • {artifact.char_count} characters
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(artifact)}
                        >
                          {copiedId === artifact.id ? (
                            <><CheckCircle2 className="h-4 w-4 mr-2" /> Copied!</>
                          ) : (
                            <><Copy className="h-4 w-4 mr-2" /> Copy</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(artifact.id, 'markdown')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Artifact content */}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[500px]">
                        {artifact.content_text}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Insights Summary */}
      {job.insight_pack && (
        <Card>
          <CardHeader>
            <CardTitle>Insights Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{job.insight_pack.summary_text}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

