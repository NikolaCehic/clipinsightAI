'use client';

import { Textarea } from '@/components/ui/textarea';
import { User, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface BlogPreviewProps {
  data: string;
  title: string;
  isEditing: boolean;
  onUpdate: (data: string) => void;
}

export function BlogPreview({ data, title, isEditing, onUpdate }: BlogPreviewProps) {
  return (
    <div className="max-w-3xl mx-auto h-full">
      {isEditing ? (
        <Textarea
          className="w-full h-full min-h-[500px] bg-zinc-950/50 border-zinc-800 text-zinc-300 font-mono text-sm leading-relaxed resize-none"
          value={data}
          onChange={(e) => onUpdate(e.target.value)}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 md:p-12 min-h-[600px] text-zinc-900">
          {/* Blog Header */}
          <div className="mb-8 border-b border-zinc-100 pb-8">
            <span className="text-purple-600 font-bold text-xs uppercase tracking-widest mb-2 block">
              Blog Post
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
              {title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" /> Editorial Team
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Blog Content */}
          <div className="prose prose-zinc prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold text-zinc-900 mt-8 mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-zinc-900 mt-8 mb-4">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-bold text-zinc-900 mt-6 mb-3">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-zinc-700 leading-relaxed mb-4">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-zinc-700 mb-4 space-y-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-zinc-700 mb-4 space-y-2">{children}</ol>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-purple-500 pl-4 italic text-zinc-600 my-4">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-sm text-purple-600">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto my-4">
                    {children}
                  </pre>
                ),
              }}
            >
              {data}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

