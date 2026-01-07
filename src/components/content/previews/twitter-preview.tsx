'use client';

import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Repeat, Bookmark } from 'lucide-react';

interface TwitterPreviewProps {
  data: string[];
  isEditing: boolean;
  onUpdate: (data: string[]) => void;
}

export function TwitterPreview({ data, isEditing, onUpdate }: TwitterPreviewProps) {
  const updateTweet = (index: number, value: string) => {
    const newThread = [...data];
    newThread[index] = value;
    onUpdate(newThread);
  };

  return (
    <div className="max-w-[600px] mx-auto space-y-0">
      {data.map((tweet, index) => (
        <div key={index} className="relative pl-8 pb-8 last:pb-0">
          {/* Connector Line */}
          {index !== data.length - 1 && (
            <div className="absolute left-[19px] top-12 bottom-0 w-0.5 bg-zinc-800" />
          )}

          <div className="flex gap-4">
            {/* Avatar */}
            <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-950 overflow-hidden flex items-center justify-center shrink-0 z-10">
              <div className="gradient-purple w-full h-full" />
            </div>

            <div className="flex-1">
              {/* Tweet Header */}
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-white text-[15px]">You</span>
                <span className="text-zinc-500 text-[15px]">@creator</span>
                <span className="text-zinc-600 text-[15px]">·</span>
                <span className="text-zinc-500 text-[15px]">1m</span>
              </div>

              {/* Tweet Content */}
              {isEditing ? (
                <Textarea
                  className="w-full bg-zinc-900 border-zinc-800 text-zinc-200 resize-none h-24 text-[15px] leading-normal"
                  value={tweet}
                  onChange={(e) => updateTweet(index, e.target.value)}
                />
              ) : (
                <p className="text-zinc-200 text-[15px] whitespace-pre-wrap leading-normal mb-3">
                  {tweet}
                </p>
              )}

              {/* Tweet Actions */}
              <div className="flex items-center justify-between max-w-[400px] text-zinc-500 mt-2">
                <div className="group flex items-center gap-2 cursor-pointer hover:text-blue-400">
                  <div className="p-2 group-hover:bg-blue-500/10 rounded-full transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span className="text-xs">24</span>
                </div>
                <div className="group flex items-center gap-2 cursor-pointer hover:text-green-400">
                  <div className="p-2 group-hover:bg-green-500/10 rounded-full transition-colors">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <span className="text-xs">12</span>
                </div>
                <div className="group flex items-center gap-2 cursor-pointer hover:text-pink-400">
                  <div className="p-2 group-hover:bg-pink-500/10 rounded-full transition-colors">
                    <Heart className="w-4 h-4" />
                  </div>
                  <span className="text-xs">148</span>
                </div>
                <div className="group flex items-center gap-2 cursor-pointer hover:text-blue-400">
                  <div className="p-2 group-hover:bg-blue-500/10 rounded-full transition-colors">
                    <Bookmark className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

