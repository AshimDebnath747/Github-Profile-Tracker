import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { RepositoriesPage } from '@/features/dashboard/pages/RepositoriesPage';
import { PortfolioPage } from '@/features/portfolio/pages/PortfolioPage';
import { getCurrentUser } from '@/features/auth/services/auth';
import type { User } from '@/types/api';
import { ApiError } from '@/services/api/client';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { PublicPortfolioPage } from '@/features/portfolio/pages/PublicPortfolioPage';

export default function App() {
  const location = useLocation();
  const publicPortfolioPath = location.pathname.match(/^\/portfolio\/([^/]+)\/?$/);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => { getCurrentUser().then(({ data }) => setUser(data)).catch((error: unknown) => { if (!(error instanceof ApiError) || error.status !== 401) console.error(error); }).finally(() => setChecking(false)); }, []);
  if (location.pathname.startsWith('/portfolio/')) {
    const slug = publicPortfolioPath ? decodeURIComponent(publicPortfolioPath[1]) : '';
    return <PublicPortfolioPage slug={slug} />;
  }
  if (checking) return <div className="boot-screen"><span className="brand-mark">R</span><span>Loading your workspace…</span></div>;
  return user ? <Shell user={user} onLogout={() => setUser(null)}><Routes><Route path="/" element={<DashboardPage user={user} />} /><Route path="/repositories" element={<RepositoriesPage />} /><Route path="/portfolio" element={<PortfolioPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Shell> : <LoginPage />;
}
