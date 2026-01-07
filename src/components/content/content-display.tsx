'use client';

import { useState } from 'react';
import { ContentPackage, ContentTab } from '@/types';
import { ContentTabs } from './content-tabs';
import { NewsletterPreview } from './previews/newsletter-preview';
import { TwitterPreview } from './previews/twitter-preview';
import { LinkedInPreview } from './previews/linkedin-preview';
import { BlogPreview } from './previews/blog-preview';
import { Edit3, Copy, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ContentDisplayProps {
  data: ContentPackage;
  onReset: () => void;
}

export function ContentDisplay({ data, onReset }: ContentDisplayProps) {
  const [activeTab, setActiveTab] = useState<ContentTab>('newsletter');
  const [copied, setCopied] = useState(false);
  const [editableData, setEditableData] = useState<ContentPackage>(data);
  const [isEditing, setIsEditing] = useState(false);

  const handleCopy = () => {
    let contentToCopy = '';
    if (activeTab === 'newsletter') {
      contentToCopy = `${editableData.newsletter.subject}\n\n${editableData.newsletter.body}`;
    }
    if (activeTab === 'twitter') {
      contentToCopy = editableData.twitter_thread.join('\n\n---\n\n');
    }
    if (activeTab === 'linkedin') {
      contentToCopy = editableData.linkedin_post;
    }
    if (activeTab === 'blog') {
      contentToCopy = editableData.blog_post;
    }
    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editableData),
      });

      if (!response.ok) throw new Error('Failed to save project');
      
      toast.success('Project saved successfully!');
    } catch (error) {
      toast.error('Failed to save project');
    }
  };

  return (
    <div className="w-full animate-in">
      {/* Project Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-6 border-b border-zinc-800/50 pb-8">
        <div className="w-full md:w-auto">
          <span className="text-xs font-bold tracking-wider text-purple-400 uppercase mb-2 block">
            Active Project
          </span>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <Input
                className="text-2xl font-bold bg-zinc-900/50 border-purple-500 text-white w-full md:min-w-[400px]"
                value={editableData.project_title}
                onChange={(e) =>
                  setEditableData({ ...editableData, project_title: e.target.value })
                }
              />
            ) : (
              <h2 className="text-3xl font-bold text-white tracking-tight">
                {editableData.project_title}
              </h2>
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
          <Button
            variant="ghost"
            onClick={onReset}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            Discard
          </Button>
          <Button onClick={handleSave} className="flex-1 md:flex-none bg-white text-zinc-950 hover:bg-zinc-200">
            Save Project
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
                  data={editableData.newsletter}
                  isEditing={isEditing}
                  onUpdate={(newsletter) =>
                    setEditableData({ ...editableData, newsletter })
                  }
                />
              )}
              {activeTab === 'twitter' && (
                <TwitterPreview
                  data={editableData.twitter_thread}
                  isEditing={isEditing}
                  onUpdate={(twitter_thread) =>
                    setEditableData({ ...editableData, twitter_thread })
                  }
                />
              )}
              {activeTab === 'linkedin' && (
                <LinkedInPreview
                  data={editableData.linkedin_post}
                  isEditing={isEditing}
                  onUpdate={(linkedin_post) =>
                    setEditableData({ ...editableData, linkedin_post })
                  }
                />
              )}
              {activeTab === 'blog' && (
                <BlogPreview
                  data={editableData.blog_post}
                  title={editableData.project_title}
                  isEditing={isEditing}
                  onUpdate={(blog_post) =>
                    setEditableData({ ...editableData, blog_post })
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

