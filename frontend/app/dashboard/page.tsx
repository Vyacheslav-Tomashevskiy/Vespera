"use client";

import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards from "@/components/dashboard/KPICards";
import RecentListings from "@/components/dashboard/RecentListings";
import WalletCard from "@/components/dashboard/WalletCard";
import RecentPayouts from "@/components/dashboard/RecentPayouts";
import NewLeads from "@/components/dashboard/NewLeads";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top KPI Cards */}
        <KPICards />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Listings (Takes 2/3) */}
          <div className="xl:col-span-2">
            <RecentListings />
          </div>

          {/* Right Column - Widgets (Takes 1/3) */}
          <div className="space-y-6">
            <WalletCard />
            <RecentPayouts />
            <NewLeads />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}