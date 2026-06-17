import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, ClipboardList, CalendarDays,
  BarChart3, Award, User, X, LogOut, HelpCircle, ChevronLeft, ChevronRight,
  Bell, Video, Trophy, MessageSquare, Users,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const studentNavItems = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Overview' },
  { to: '/courses',        icon: BookOpen,        label: 'My Courses' },
  { to: '/live-classes',   icon: Video,           label: 'Live Classes' },
  { to: '/announcements',  icon: Bell,            label: 'Announcements' },
  { to: '/assignments',    icon: ClipboardList,   label: 'Assignments' },
  { to: '/attendance',     icon: CalendarDays,    label: 'Attendance' },
  { to: '/exams',          icon: BarChart3,       label: 'Exam Results' },
  { to: '/leaderboard',    icon: Trophy,          label: 'Leaderboard' },
  { to: '/feedback',       icon: MessageSquare,   label: 'My Feedback' },
  { to: '/certificates',   icon: Award,           label: 'Certificates' },
  { to: '/profile',        icon: User,            label: 'Profile' },
]

const shoNavItems = [
  { to: '/students',      icon: Users,  label: 'My Students' },
  { to: '/live-classes',  icon: Video,  label: 'Live Classes' },
  { to: '/announcements', icon: Bell,   label: 'Announcements' },
  { to: '/profile',       icon: User,   label: 'Profile' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }
  const navItems = user?.role === 'sho' ? shoNavItems : studentNavItems

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      )}

      <aside
        style={{ background: '#1a2744' }}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col transition-all duration-300 md:relative md:translate-x-0',
          collapsed ? 'w-[68px]' : 'w-60',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="flex h-16 items-center justify-between px-3.5 border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <img src="/haca-logo.png" alt="HACA" className="h-7 w-auto object-contain brightness-0 invert" />
              <span
                className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md"
                style={{ background: '#0d9488', color: '#fff', letterSpacing: '0.15em' }}
              >
                LMS
              </span>
            </div>
          )}
          {collapsed && <div className="flex-1" />}

          {/* Mobile close / Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10 shrink-0 md:flex hidden"
            onClick={onToggleCollapse}
          >
            {collapsed
              ? <ChevronRight className="h-3.5 w-3.5" />
              : <ChevronLeft className="h-3.5 w-3.5" />
            }
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group',
                collapsed ? 'justify-center px-0 mx-1' : '',
                isActive
                  ? 'bg-white text-[#1a2744] shadow-sm'
                  : 'text-white/55 hover:text-white hover:bg-white/8'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    collapsed ? '' : '',
                    isActive ? 'text-blue-600' : 'text-white/45 group-hover:text-white/80'
                  )} />
                  {!collapsed && <span>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-white/10 px-2 py-3 space-y-0.5">
          <button
            title={collapsed ? 'Support' : undefined}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/45 hover:text-white hover:bg-white/8 transition-all',
              collapsed ? 'justify-center px-0 mx-1 w-auto' : ''
            )}
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            {!collapsed && 'Support'}
          </button>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/45 hover:text-red-400 hover:bg-white/8 transition-all',
              collapsed ? 'justify-center px-0 mx-1 w-auto' : ''
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && 'Logout'}
          </button>
        </div>

        {/* User pill */}
        {user && !collapsed && (
          <div className="px-3 pb-4">
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/30 text-white text-xs font-bold">
                {user.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/80 truncate leading-none">{user.name}</p>
                <p className="text-[10px] text-white/35 truncate mt-0.5">{user.role === 'sho' ? 'SHO' : 'Student'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed user avatar */}
        {user && collapsed && (
          <div className="pb-4 flex justify-center">
            <div
              title={user.name}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/30 text-white text-xs font-bold cursor-default"
            >
              {user.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
