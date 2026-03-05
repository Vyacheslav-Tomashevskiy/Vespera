'use client';

import Sidebar from '@/components/tenants/Sidebar';
import TopNav from '@/components/tenants/TopNav';
import { useState } from 'react';

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapseNav, setCollapseNav] = useState(true);

  return (
    <section className=" flex flex-row items-stretch h-screen ">
      <aside
        className="transition-all duration-300 ease-in-out"
        style={{
          width: collapseNav ? '3rem' : '16rem',
        }}
      >
        <Sidebar collapseNav={collapseNav} setCollapseNav={setCollapseNav} />
      </aside>

      <main className="w-full flex-1  bg-[#f2f5fc] h-full overflow-y-auto  ">
        <TopNav />
        {children}
      </main>
    </section>
  );
}
