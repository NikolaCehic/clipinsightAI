'use client';

/**
 * Job List Component
 * Displays list of jobs with status, progress, and actions
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
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
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Job, JobStatus, JobSourceType } from '@/types';

interface JobListProps {
  initialJobs?: Job[];
}

/**
 * Get icon for source type
 */
function getSourceIcon(sourceType: JobSourceType) {
  switch (sourceType) {
    case 'YOUTUBE_URL':
      return <Youtube className="h-4 w-4 text-red-500" />;
    case 'UPLOAD':
      return <Video className="h-4 w-4 text-blue-500" />;
    default:
      return <Link2 className="h-4 w-4 text-gray-500" />;
  }
}

/**
 * Get status badge
 */
function getStatusBadge(status: JobStatus) {
  const statusConfig: Record<JobStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
    RECEIVED: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'Received' },
    VALIDATED: { variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Validating' },
    INGESTED: { variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Processing' },
    TRANSCRIBED: { variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Transcribing' },
    INSIGHTS: { variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Analyzing' },
    DRAFTED: { variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Drafting' },
    REVIEWED: { variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Reviewing' },
    DELIVERED: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Ready' },
    STORED: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Complete' },
    ANALYTICS_LOGGED: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Complete' },
    FAILED_VALIDATION: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Invalid' },
    BLOCKED_ENTITLEMENT: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Quota Exceeded' },
    REQUIRES_MANUAL_REVIEW: { variant: 'outline', icon: <AlertCircle className="h-3 w-3" />, label: 'Needs Review' },
    NEEDS_USER_INPUT: { variant: 'outline', icon: <AlertCircle className="h-3 w-3" />, label: 'Action Required' },
    FAILED: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Failed' },
  };

  const config = statusConfig[status] || { variant: 'secondary' as const, icon: null, label: status };

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}

/**
 * Get progress percentage
 */
function getProgress(status: JobStatus): number {
  const progressMap: Record<JobStatus, number> = {
    RECEIVED: 5,
    VALIDATED: 15,
    INGESTED: 30,
    TRANSCRIBED: 45,
    INSIGHTS: 60,
    DRAFTED: 75,
    REVIEWED: 90,
    DELIVERED: 100,
    STORED: 100,
    ANALYTICS_LOGGED: 100,
    FAILED_VALIDATION: 0,
    BLOCKED_ENTITLEMENT: 0,
    REQUIRES_MANUAL_REVIEW: 90,
    NEEDS_USER_INPUT: 45,
    FAILED: 0,
  };
  return progressMap[status] ?? 0;
}

export function JobList({ initialJobs }: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs || []);
  const [loading, setLoading] = useState(!initialJobs);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openDeleteDialog = (job: Job, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setJobToDelete(job);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setJobToDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    
    setDeletingId(jobToDelete.id);
    setDeleteError(null);
    
    try {
      const res = await fetch(`/api/jobs/${jobToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete job');
      }
      // Remove from local state immediately
      setJobs(prev => prev.filter(j => j.id !== jobToDelete.id));
      closeDeleteDialog();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete job');
    } finally {
      setDeletingId(null);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setJobs(data.jobs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialJobs) {
      fetchJobs();
    }
  }, [initialJobs]);

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
    const hasInProgress = jobs.some(j => !TERMINAL_STATES.includes(j.status));

    if (!hasInProgress) return;

    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(fetchJobs, 5000);
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
        fetchJobs(); // Fetch immediately when tab becomes visible
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
  }, [jobs]);

  if (loading && jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <XCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchJobs} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Video className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-semibold">No jobs yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload a video or paste a YouTube URL to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Jobs</h2>
          <Button onClick={fetchJobs} variant="ghost" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4">
          {jobs.map((job) => {
            const progress = getProgress(job.status);
            const isComplete = progress === 100;
            const isFailed = job.status.includes('FAILED') || job.status === 'BLOCKED_ENTITLEMENT';

            return (
              <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getSourceIcon(job.source_type)}
                        </div>
                        <div>
                          <div className="font-medium">
                            {job.source_filename || job.source_url || `Job ${job.id.slice(0, 8)}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                            {job.video_duration_sec && (
                              <span className="ml-2">
                                • {Math.floor(job.video_duration_sec / 60)}:{String(job.video_duration_sec % 60).padStart(2, '0')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(job.status)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => openDeleteDialog(job, e)}
                          disabled={deletingId === job.id}
                        >
                          {deletingId === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Progress bar for in-progress jobs */}
                    {!isComplete && !isFailed && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {job.status_reason && isFailed && (
                      <div className="mt-2 text-sm text-destructive">
                        {job.status_reason}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Job
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {jobToDelete && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {getSourceIcon(jobToDelete.source_type)}
                <div>
                  <div className="font-medium text-sm">
                    {jobToDelete.source_filename || jobToDelete.source_url || `Job ${jobToDelete.id.slice(0, 8)}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(jobToDelete.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {deleteError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {deleteError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletingId !== null}
            >
              {deletingId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

