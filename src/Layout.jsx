import React from 'react';

export default function Layout({ children, currentPageName }) {
  // Pages that should have no layout wrapper
  const noLayoutPages = ['Home', 'Subscribe', 'CustomerDashboard', 'AdminDashboard', 'AdminPlans', 'AdminPowerPlants'];
  
  if (noLayoutPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}