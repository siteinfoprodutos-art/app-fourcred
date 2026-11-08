import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ProposalForm } from './components/form/ProposalForm';
import { CreditDeskDashboard } from './components/admin/CreditDeskDashboard';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/admin' ? '/admin' : '/';
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname === '/admin' ? '/admin' : '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans flex flex-col selection:bg-[#FF6B1A] selection:text-white">
      <Header currentPath={currentPath} onNavigate={handleNavigate} />
      <main className="flex-1 w-full bg-[#0F172A]">
        {currentPath === '/admin' ? (
          <CreditDeskDashboard />
        ) : (
          <ProposalForm />
        )}
      </main>
      <Footer />
    </div>
  );
}
