
import React from 'react';

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ sidebar, children }) => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row -mx-4">
        <aside className="md:w-1/4 px-4 mb-8 md:mb-0">
          {sidebar}
        </aside>
        <main className="md:w-3/4 px-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
