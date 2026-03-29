'use client';
import { useState } from 'react';
import ResourcesList from '@/components/resources/ResourcesList';
import ResourceSearch from '@/components/resources/ResourceSearch';
import ResourceTabs from '@/components/resources/ResourceTabs';

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState('tenant');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="text-center mb-12 mt-8">
        <h1 className="text-4xl font-bold text-white mb-4">
          Help Center & Resources
        </h1>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Find guides, FAQs, and tutorials to help you get the most out of our
          platform.
        </p>
      </div>

      <ResourceSearch query={searchQuery} onChange={setSearchQuery} />
      <ResourceTabs active={activeTab} onChange={setActiveTab} />

      <div className="mt-8">
        <ResourcesList role={activeTab} search={searchQuery} />
      </div>
    </div>
  );
}
