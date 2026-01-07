'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, ContentTab } from '@/types';
import { ContentTabs } from '@/components/content/content-tabs';
import { NewsletterPreview } from '@/components/content/previews/newsletter-preview';
import { TwitterPreview } from '@/components/content/previews/twitter-preview';
import { LinkedInPreview } from '@/components/content/previews/linkedin-preview';
import { BlogPreview } from '@/components/content/previews/blog-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Edit3,
  Copy,
  Check,
  Globe,
  ArrowLeft,
  Loader2,
  Send,
  Twitter,
  Linkedin,
  Mail,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('newsletter');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchProject(params.id as string);
    }
  }, [params.id]);

  const fetchProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects?id=${id}`);
      if (!response.ok) throw new Error('Project not found');
      const data = await response.json();
      setProject(data.project);
    } catch (error) {
      toast.error('Failed to load project');
      router.push('/history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: project.id,
          project_title: project.title,
          newsletter: {
            subject: project.newsletter_subject,
            body: project.newsletter_body,
          },
          twitter_thread: project.twitter_thread,
          linkedin_post: project.linkedin_post,
          blog_post: project.blog_post,
          status: project.status,
        }),
      });
      if (!response.ok) throw new Error('Failed to save');
      toast.success('Project saved!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (!project) return;
    let content = '';
    switch (activeTab) {
      case 'newsletter':
        content = `${project.newsletter_subject}\n\n${project.newsletter_body}`;
        break;
      case 'twitter':
        content = project.twitter_thread.join('\n\n---\n\n');
        break;
      case 'linkedin':
        content = project.linkedin_post;
        break;
      case 'blog':
        content = project.blog_post;
        break;
    }
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (platform: string) => {
    if (!project) return;
    try {
      const response = await fetch(`/api/export/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Export failed');
      }
      
      toast.success(`Successfully published to ${platform}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-white mb-2">Project not found</h2>
        <Link href="/history" className="text-purple-400 hover:text-purple-300">
          Back to History
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Back Link */}
      <Link
        href="/history"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to History
      </Link>

      {/* Project Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-6 border-b border-zinc-800/50 pb-8">
        <div className="w-full md:w-auto">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={
                project.status === 'published'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }
            >
              {project.status}
            </Badge>
            <span className="text-xs text-zinc-500">
              Created {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <Input
                className="text-2xl font-bold bg-zinc-900/50 border-purple-500 text-white w-full md:min-w-[400px]"
                value={project.title}
                onChange={(e) => setProject({ ...project, title: e.target.value })}
              />
            ) : (
              <h2 className="text-3xl font-bold text-white tracking-tight">{project.title}</h2>
            )}
            <Button
              variant={isEditing ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setIsEditing(!isEditing)}
              className={isEditing ? 'gradient-purple' : 'text-zinc-500 hover:text-zinc-300'}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
                <Send className="w-4 h-4 mr-2" />
                Publish
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem
                onClick={() => handleExport('twitter')}
                className="text-zinc-300 focus:text-white"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Post to Twitter/X
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('linkedin')}
                className="text-zinc-300 focus:text-white"
              >
                <Linkedin className="w-4 h-4 mr-2" />
                Post to LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('email')}
                className="text-zinc-300 focus:text-white"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Newsletter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 md:flex-none bg-white text-zinc-950 hover:bg-zinc-200"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Navigation Tabs */}
        <div className="lg:col-span-3">
          <ContentTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-9">
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl min-h-[600px] flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/20">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-400">Preview Mode</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-2" />
                )}
                {copied ? 'Copied!' : 'Copy Content'}
              </Button>
            </div>

            {/* Content Preview */}
            <div className="p-6 md:p-8 flex-1 bg-zinc-950/30">
              {activeTab === 'newsletter' && (
                <NewsletterPreview
                  data={{
                    subject: project.newsletter_subject,
                    body: project.newsletter_body,
                  }}
                  isEditing={isEditing}
                  onUpdate={(newsletter) =>
                    setProject({
                      ...project,
                      newsletter_subject: newsletter.subject,
                      newsletter_body: newsletter.body,
                    })
                  }
                />
              )}
              {activeTab === 'twitter' && (
                <TwitterPreview
                  data={project.twitter_thread}
                  isEditing={isEditing}
                  onUpdate={(twitter_thread) =>
                    setProject({ ...project, twitter_thread })
                  }
                />
              )}
              {activeTab === 'linkedin' && (
                <LinkedInPreview
                  data={project.linkedin_post}
                  isEditing={isEditing}
                  onUpdate={(linkedin_post) =>
                    setProject({ ...project, linkedin_post })
                  }
                />
              )}
              {activeTab === 'blog' && (
                <BlogPreview
                  data={project.blog_post}
                  title={project.title}
                  isEditing={isEditing}
                  onUpdate={(blog_post) => setProject({ ...project, blog_post })}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

