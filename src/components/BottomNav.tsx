import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, RefreshCw, Settings } from 'lucide-react';

export const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'ホーム', icon: Home },
    { path: '/study', label: '学習', icon: BookOpen },
    { path: '/review', label: '復習', icon: RefreshCw },
    { path: '/settings', label: '設定', icon: Settings },
  ];

  return (
    <nav className="absolute bottom-0 w-full h-16 bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 flex justify-around items-center px-4 pb-safe z-50">
      {navItems.map(({ path, label, icon: Icon }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
              isActive 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-200'
            }`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
