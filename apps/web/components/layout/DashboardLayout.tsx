import React from 'react';

/**
 * Main application layout for the SeoEdge dashboard.
 *
 * This component establishes the primary UI structure, featuring a fixed-left sidebar
 * for navigation and a main content area. It is designed to be a static, responsive,
 * and server-rendered component using a dark-mode-first theme with Tailwind CSS.
 *
 * @param {object} props - The properties for the component.
 * @param {React.ReactNode} props.children - The child elements to be rendered in the main content area.
 * @returns {JSX.Element} The rendered dashboard layout.
 */
const DashboardLayout = ({ children }: { children: React.ReactNode }): JSX.Element => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar - visible on medium screens and up */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-gray-800 p-4">
        <div className="flex items-center mb-8">
          <h1 className="text-2xl font-bold text-white">SeoEdge</h1>
        </div>
        <nav className="flex-1 space-y-4">
          <a href="#" className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors duration-200">
            <span className="text-lg">[D]</span>
            <span>Dashboard</span>
          </a>
          <a href="#" className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors duration-200">
            <span className="text-lg">[R]</span>
            <span>Reports</span>
          </a>
          <a href="#" className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors duration-200">
            <span className="text-lg">[DS]</span>
            <span>Data Sources</span>
          </a>
          <a href="#" className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors duration-200">
            <span className="text-lg">[S]</span>
            <span>Settings</span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 md:p-8">
        {/* A mobile header could be added here if needed, but is excluded to keep the component static. */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Dashboard Overview</h2>
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
