import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listCampaigns } from '../../api/campaigns';
import { listAssignments } from '../../api/training';
import { NAV } from './nav';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { PageSkeleton } from './PageSkeleton';

// Live counts for sidebar pills; failures just hide the pill.
function useNavCounts(role, pathname) {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    let cancelled = false;
    const load =
      role === 'admin'
        ? listCampaigns().then((list) => ({
            runningCampaigns: list.filter((c) => c.status === 'running').length,
          }))
        : role === 'employee'
          ? listAssignments().then((list) => ({
              pendingTraining: list.filter((a) => a.status !== 'completed').length,
            }))
          : Promise.resolve({});
    load.then((c) => !cancelled && setCounts(c)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [role, pathname]);
  return counts;
}

// Fixed 240px sidebar + sticky top bar + scrollable content. Below 1280px the sidebar is a drawer.
function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = NAV[user.role] || NAV.employee;
  const counts = useNavCounts(user.role, pathname);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-page">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-control focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 xl:block">
        <Sidebar nav={nav} counts={counts} onLogout={handleLogout} />
      </aside>
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div
            className="absolute inset-0 animate-fade bg-overlay"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-60 animate-slide-left shadow-pop">
            <Sidebar
              nav={nav}
              counts={counts}
              onLogout={handleLogout}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </div>
      )}
      <div className="flex min-h-screen flex-col xl:pl-60">
        <TopBar
          user={user}
          nav={nav}
          onLogout={handleLogout}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <main id="main" className="flex-1 p-4 sm:p-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
