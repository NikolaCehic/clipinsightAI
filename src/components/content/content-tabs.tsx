'use client';

import { ContentTab } from '@/types';
import { Mail, Twitter, Linkedin, FileText } from 'lucide-react';

interface ContentTabsProps {
  activeTab: ContentTab;
  onTabChange: (tab: ContentTab) => void;
}

const tabs = [
  { id: 'newsletter' as ContentTab, label: 'Newsletter', icon: Mail },
  { id: 'twitter' as ContentTab, label: 'X Thread', icon: Twitter },
  { id: 'linkedin' as ContentTab, label: 'LinkedIn', icon: Linkedin },
  { id: 'blog' as ContentTab, label: 'SEO Blog', icon: FileText },
];

export function ContentTabs({ activeTab, onTabChange }: ContentTabsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">
        Channels
      </div>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 text-left border
              ${
                isActive
                  ? 'bg-zinc-800/50 border-zinc-700/50 text-white shadow-sm'
                  : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'
              }
            `}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : ''}`} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

