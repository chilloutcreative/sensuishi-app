import { type ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export const Layout = ({ children, showNav = true }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-surface-50 font-sans selection:bg-primary-200 dark:selection:bg-primary-900">
      <div className="max-w-md mx-auto h-screen w-full bg-white dark:bg-surface-800 shadow-xl overflow-hidden flex flex-col relative">
        <main className={`flex-1 overflow-y-auto w-full h-full ${showNav ? 'pb-16' : ''}`}>
          {children}
        </main>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
};
