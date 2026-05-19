import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, MonitorPlay, Bell, Video, Menu, X,
  ShieldCheck, LogOut, ChevronRight,
} from 'lucide-react'

const SESSION_WRITE_ROLES = ['admin', 'ceo_haca', 'leadership', 'academic', 'ssho', 'pl', 'mentor']

const ALL_NAV = [
  { to: '/admin',               icon: LayoutDashboard, label: 'Dashboard',     end: true,  roles: null },
  { to: '/admin/live-classes',  icon: Video,           label: 'Live Classes',              roles: null },
  { to: '/admin/sessions',      icon: MonitorPlay,     label: 'Sessions',                  roles: SESSION_WRITE_ROLES },
  { to: '/admin/students',      icon: Users,           label: 'Students',                  roles: null },
  { to: '/admin/announcements', icon: Bell,            label: 'Announcements',             roles: null },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}')
  const NAV = ALL_NAV.filter(item => !item.roles || item.roles.includes(user.role))

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    navigate('/admin/login')
  }

  const initials = user.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'AD'

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f4f4]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 flex flex-col transition-transform duration-200
        md:relative md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: '#0d2b2b' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">HACA Admin</p>
            <p className="text-white/40 text-[10px] mt-0.5">LMS Control Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-[#0d2b2b]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`
              }>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-40" />
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.name}</p>
              <p className="text-white/40 text-[10px] capitalize">{user.role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay (mobile) */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-border flex items-center px-5 gap-4 shrink-0">
          <button className="md:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-muted-foreground">Admin Panel</span>
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
