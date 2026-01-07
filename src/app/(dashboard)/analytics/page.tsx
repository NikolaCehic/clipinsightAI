'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Zap, 
  Calendar,
  ArrowUp,
  ArrowDown,
  Loader2,
  Video,
  Copy,
  Download,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalyticsData {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  total_artifacts: number;
  artifacts_copied: number;
  artifacts_exported: number;
  regenerate_count: number;
}

interface UsageData {
  jobs_count: number;
  minutes_processed: number;
  tokens_used: number;
  cost_usd: number;
}

interface EntitlementData {
  plan_name: string;
  jobs_per_day: number;
  minutes_per_day: number;
  max_video_duration_sec: number;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [entitlement, setEntitlement] = useState<EntitlementData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch workspace details which includes usage and entitlement
      const workspacesRes = await fetch('/api/workspaces');
      if (workspacesRes.ok) {
        const { workspaces } = await workspacesRes.json();
        if (workspaces.length > 0) {
          const workspaceRes = await fetch(`/api/workspaces/${workspaces[0].id}`);
          if (workspaceRes.ok) {
            const workspaceData = await workspaceRes.json();
            setUsage(workspaceData.usage);
            setEntitlement(workspaceData.entitlement);
          }
        }
      }

      // For now, use calculated analytics from jobs
      const jobsRes = await fetch('/api/jobs?limit=100');
      if (jobsRes.ok) {
        const { jobs, total } = await jobsRes.json();
        const completed = jobs.filter((j: { status: string }) => 
          j.status === 'ANALYTICS_LOGGED' || j.status === 'DELIVERED' || j.status === 'STORED'
        ).length;
        const failed = jobs.filter((j: { status: string }) => 
          j.status.includes('FAILED') || j.status === 'BLOCKED_ENTITLEMENT'
        ).length;

        setAnalytics({
          total_jobs: total,
          completed_jobs: completed,
          failed_jobs: failed,
          total_artifacts: completed * 4, // Estimate: 4 artifacts per job
          artifacts_copied: Math.floor(completed * 2), // Estimate
          artifacts_exported: Math.floor(completed * 0.5), // Estimate
          regenerate_count: jobs.filter((j: { job_runs?: Array<unknown> }) => 
            j.job_runs && j.job_runs.length > 1
          ).length,
        });
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Jobs',
      value: analytics?.total_jobs || 0,
      icon: Video,
      description: 'Videos processed',
    },
    {
      title: 'Completed',
      value: analytics?.completed_jobs || 0,
      icon: CheckCircle2,
      description: 'Successfully generated',
      color: 'text-green-500',
    },
    {
      title: 'Failed',
      value: analytics?.failed_jobs || 0,
      icon: XCircle,
      description: 'Errors encountered',
      color: 'text-red-500',
    },
    {
      title: 'Artifacts',
      value: analytics?.total_artifacts || 0,
      icon: FileText,
      description: 'Content pieces created',
    },
  ];

  const usageStats = [
    {
      title: 'Jobs Today',
      value: usage?.jobs_count || 0,
      max: entitlement?.jobs_per_day || 3,
      icon: Zap,
    },
    {
      title: 'Minutes Today',
      value: usage?.minutes_processed || 0,
      max: entitlement?.minutes_per_day || 10,
      icon: Clock,
    },
    {
      title: 'Tokens Used',
      value: usage?.tokens_used || 0,
      max: null,
      icon: TrendingUp,
    },
  ];

  const engagementStats = [
    {
      title: 'Artifacts Copied',
      value: analytics?.artifacts_copied || 0,
      icon: Copy,
    },
    {
      title: 'Artifacts Exported',
      value: analytics?.artifacts_exported || 0,
      icon: Download,
    },
    {
      title: 'Regenerations',
      value: analytics?.regenerate_count || 0,
      icon: RefreshCw,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your content generation metrics and usage
          </p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Plan Status */}
      {entitlement && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Current Plan</CardTitle>
              <Badge variant={entitlement.plan_name === 'free' ? 'secondary' : 'default'}>
                {entitlement.plan_name.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {entitlement.jobs_per_day} jobs/day • {entitlement.minutes_per_day} min/day • Max {Math.floor(entitlement.max_video_duration_sec / 60)} min/video
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`w-4 h-4 ${stat.color || 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Usage and Engagement */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Usage</CardTitle>
            <CardDescription>Your resource consumption for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {usageStats.map((stat, i) => {
              const Icon = stat.icon;
              const percentage = stat.max ? (stat.value / stat.max) * 100 : null;
              
              return (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{stat.title}</span>
                    </div>
                    <span className="font-medium">
                      {stat.value}
                      {stat.max && <span className="text-muted-foreground"> / {stat.max}</span>}
                    </span>
                  </div>
                  {percentage !== null && (
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          percentage > 80 ? 'bg-destructive' : percentage > 50 ? 'bg-yellow-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Engagement */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
            <CardDescription>How you're using generated content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {engagementStats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="text-center p-4 rounded-lg bg-secondary/50">
                    <Icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.title}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Success Rate
          </CardTitle>
          <CardDescription>Job completion statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            {analytics && analytics.total_jobs > 0 ? (
              <>
                <div className="flex-1">
                  <div className="h-4 bg-secondary rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-green-500"
                      style={{ 
                        width: `${(analytics.completed_jobs / analytics.total_jobs) * 100}%` 
                      }}
                    />
                    <div
                      className="h-full bg-red-500"
                      style={{ 
                        width: `${(analytics.failed_jobs / analytics.total_jobs) * 100}%` 
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>{Math.round((analytics.completed_jobs / analytics.total_jobs) * 100)}% Success</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>{Math.round((analytics.failed_jobs / analytics.total_jobs) * 100)}% Failed</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 w-full">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No jobs yet. Create your first job to see analytics.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
