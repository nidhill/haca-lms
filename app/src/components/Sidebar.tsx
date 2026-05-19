import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, ClipboardList, CalendarDays,
  BarChart3, Award, User, X, GraduationCap, LogOut, HelpCircle,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Overview' },
  { to: '/courses',      icon: BookOpen,        label: 'My Courses' },
  { to: '/assignments',  icon: ClipboardList,   label: 'Assignments' },
  { to: '/attendance',   icon: CalendarDays,    label: 'Attendance' },
  { to: '/exams',        icon: BarChart3,       label: 'Exam Results' },
  { to: '/certificates', icon: Award,           label: 'Certificates' },
  { to: '/profile',      icon: User,            label: 'Profile' },
]

interface SidebarProps { open: boolean; onClose: () => void }

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      )}

      <aside
        style={{ background: '#0d2b2b' }}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-60 flex-col transition-transform duration-300 md:relative md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: '#1a5c5c' }}>
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-wide">HACA LMS</span>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden h-7 w-7 text-white/50 hover:text-white hover:bg-white/10" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-white text-[#0d2b2b] shadow-sm'
                  : 'text-white/55 hover:text-white hover:bg-white/8'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[#0d6b5c]' : 'text-white/45 group-hover:text-white/80')} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-white/8 px-3 py-3 space-y-0.5">
          <button className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/45 hover:text-white hover:bg-white/8 transition-all">
            <HelpCircle className="h-4 w-4 shrink-0" />
            Support
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/45 hover:text-red-400 hover:bg-white/8 transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>

        {/* User pill at very bottom */}
        {user && (
          <div className="px-3 pb-4">
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600/40 text-white text-xs font-bold">
                {user.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/80 truncate leading-none">{user.name}</p>
                <p className="text-[10px] text-white/35 truncate mt-0.5">Student</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
