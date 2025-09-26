'use client';

import { TabKey } from './types';

type Tab = {
  key: TabKey;
  label: string;
};

type AdminTabsProps = {
  tabs: Tab[];
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
};

export function AdminTabs({ tabs, activeTab, onChange }: AdminTabsProps) {
  return (
    <div className="border-b border-white/10">
      <nav className="flex space-x-8">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-[#60A5FA] text-white'
                  : 'border-transparent text-white/60 hover:text-white/80 hover:border-white/20'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
