'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Home } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

export default function PropertiesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Your Properties
          </h1>
          <p className="text-neutral-500 mt-1">
            Manage and monitor all your properties
          </p>
        </div>
        <Link
          href="/landlords/properties/add"
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-blue-dark transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Add Property</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : properties.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No Properties Found"
          description="Start by adding your first property to manage rentals and track performance."
          actionLabel="Add Your First Property"
          onAction={() => router.push('/landlords/properties/add')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Render properties here when not empty */}
            </div>
      )}
    </div>
  );
}
