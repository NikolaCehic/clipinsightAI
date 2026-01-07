'use client';

import { useState } from 'react';
import { VideoUploader } from '@/components/dashboard/video-uploader';
import { ContentDisplay } from '@/components/content/content-display';
import { JobList, CreateJob } from '@/components/jobs';
import { ContentPackage } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ListIcon, Zap } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('quick');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [generatedContent, setGeneratedContent] = useState<ContentPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setProgressMessage('Preparing video...');
    setProgressPercent(5);

    try {
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProgressMessage('Uploading to AI...');
      setProgressPercent(20);

      // Call API route
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoData: base64Data,
          mimeType: file.type,
          filename: file.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate content');
      }

      setProgressMessage('Processing response...');
      setProgressPercent(80);

      const data = await response.json();
      setGeneratedContent(data.content);
      setProgressPercent(100);
      setProgressMessage('Complete!');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setGeneratedContent(null);
    setProgressMessage('');
    setProgressPercent(0);
    setError(null);
  };

  const handleJobCreated = (jobId: string) => {
    // Switch to jobs tab after creation
    setActiveTab('jobs');
  };

  return (
    <div className="animate-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Create and manage your video content campaigns
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="quick" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Generate
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Job
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <ListIcon className="h-4 w-4" />
              My Jobs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Quick Generate Tab - Original Flow */}
        <TabsContent value="quick">
          {!generatedContent ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="text-center mb-12 max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
                  Quick Content Generation
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Upload your raw video footage for instant content generation.
                  Results are displayed immediately but not saved to your history.
                </p>
              </div>
              <VideoUploader
                onUpload={handleUpload}
                isAnalyzing={isAnalyzing}
                progressMessage={progressMessage}
                progressPercent={progressPercent}
                error={error}
              />
            </div>
          ) : (
            <ContentDisplay data={generatedContent} onReset={handleReset} />
          )}
        </TabsContent>

        {/* Create New Job Tab */}
        <TabsContent value="create">
          <div className="max-w-2xl mx-auto">
            <CreateJob onJobCreated={handleJobCreated} />
          </div>
        </TabsContent>

        {/* Jobs List Tab */}
        <TabsContent value="jobs">
          <JobList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
