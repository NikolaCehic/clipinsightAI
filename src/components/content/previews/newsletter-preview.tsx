'use client';

import { NewsletterContent } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';

interface NewsletterPreviewProps {
  data: NewsletterContent;
  isEditing: boolean;
  onUpdate: (data: NewsletterContent) => void;
}

export function NewsletterPreview({ data, isEditing, onUpdate }: NewsletterPreviewProps) {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden text-zinc-900">
      {/* Email Client Header */}
      <div className="bg-zinc-50 border-b border-zinc-200 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span className="font-mono">New Message</span>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm border-b border-zinc-100 pb-1">
            <span className="text-zinc-500 w-12">To:</span>
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
              Subscribers List
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500 w-12">Subject:</span>
            {isEditing ? (
              <Input
                className="flex-1 bg-transparent border-zinc-200 h-8 text-sm"
                value={data.subject}
                onChange={(e) => onUpdate({ ...data, subject: e.target.value })}
              />
            ) : (
              <span className="font-medium text-zinc-900">{data.subject}</span>
            )}
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="p-8 min-h-[400px] bg-white">
        {isEditing ? (
          <Textarea
            className="w-full h-full min-h-[400px] resize-none border-zinc-200 text-sm leading-relaxed text-zinc-800"
            value={data.body}
            onChange={(e) => onUpdate({ ...data, body: e.target.value })}
          />
        ) : (
          <div className="prose prose-sm max-w-none text-zinc-700">
            <ReactMarkdown>{data.body}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

