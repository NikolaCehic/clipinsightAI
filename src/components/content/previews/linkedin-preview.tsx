'use client';

import { Textarea } from '@/components/ui/textarea';
import { MoreHorizontal, Globe, Heart, MessageCircle, Repeat, Send } from 'lucide-react';

interface LinkedInPreviewProps {
  data: string;
  isEditing: boolean;
  onUpdate: (data: string) => void;
}

export function LinkedInPreview({ data, isEditing, onUpdate }: LinkedInPreviewProps) {
  return (
    <div className="max-w-[555px] mx-auto bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden font-sans text-zinc-900">
      <div className="p-4">
        {/* Post Header */}
        <div className="flex gap-3 mb-3">
          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
            CI
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm truncate">ClipInsight User</span>
              <MoreHorizontal className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="text-xs text-zinc-500 truncate">
              Content Strategist & AI Enthusiast
            </div>
            <div className="text-xs text-zinc-500 flex items-center gap-1">
              <span>1h •</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Post Content */}
        {isEditing ? (
          <Textarea
            className="w-full h-[300px] bg-zinc-50 border border-zinc-200 text-sm resize-none"
            value={data}
            onChange={(e) => onUpdate(e.target.value)}
          />
        ) : (
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-zinc-800 break-words">
            {data}
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      <div className="px-4 py-2 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <div className="flex -space-x-1">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <div className="w-4 h-4 rounded-full bg-green-500" />
          </div>
          <span className="ml-1 hover:underline hover:text-blue-600 cursor-pointer">845</span>
        </div>
        <div className="text-xs text-zinc-500 hover:underline hover:text-blue-600 cursor-pointer">
          42 comments • 12 reposts
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-2 py-1 border-t border-zinc-100 flex items-center justify-between">
        <button className="flex items-center justify-center gap-2 px-3 py-3 rounded hover:bg-zinc-100 flex-1 transition-colors">
          <Heart className="w-5 h-5 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-500">Like</span>
        </button>
        <button className="flex items-center justify-center gap-2 px-3 py-3 rounded hover:bg-zinc-100 flex-1 transition-colors">
          <MessageCircle className="w-5 h-5 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-500">Comment</span>
        </button>
        <button className="flex items-center justify-center gap-2 px-3 py-3 rounded hover:bg-zinc-100 flex-1 transition-colors">
          <Repeat className="w-5 h-5 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-500">Repost</span>
        </button>
        <button className="flex items-center justify-center gap-2 px-3 py-3 rounded hover:bg-zinc-100 flex-1 transition-colors">
          <Send className="w-5 h-5 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-500">Send</span>
        </button>
      </div>
    </div>
  );
}

