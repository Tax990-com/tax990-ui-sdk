import { NavLink, Outlet } from 'react-router';
import { Button, Avatar } from '@heroui/react';
import { FileText, Building2, Home, Wrench, LogOut } from 'lucide-react';
import { useAuth } from '@/auth';

const navItems = [
  { to: '/', icon: Home, label: 'Overview' },
  { to: '/form990n', icon: FileText, label: 'Form 990-N' },
  { to: '/utility', icon: Wrench, label: 'Utility' },
  { to: '/nonprofits', icon: Building2, label: 'Nonprofits' }  
];

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-disable">
      <header className="sticky top-0 z-40 h-[60px] shrink-0 bg-tertiary text-white flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
            <img src='/images/tax990-white-logo.svg'></img>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80 hidden sm:inline">{user}</span>
          <Avatar
            name={user ?? undefined}
            size="sm"
            className="bg-white/15 text-white uppercase text-xs"
          />
          <Button
            isIconOnly
            size="sm"
            variant="light"
            radius='full'
            onPress={signOut}
            className="text-white hover:text-white"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-56 shrink-0 bg-white border-r border-grey-lighten-2 p-3">
          <nav className="flex flex-col gap-1 sticky top-[65px]">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-secondary text-white'
                      : 'text-tertiary hover:bg-tertiary-lighten-2'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
