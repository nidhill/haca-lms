import { Menu, Bell, Search, ChevronDown } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarFallback } from './ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

const routeLabels: Record<string, string> = {
  '/dashboard':    'Overview',
  '/courses':      'My Courses',
  '/assignments':  'Assignments',
  '/attendance':   'Attendance',
  '/exams':        'Exam Results',
  '/certificates': 'Certificates',
  '/profile':      'Profile',
}

interface NavbarProps { onMenuClick: () => void }

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'ST'
  const currentPage = routeLabels[location.pathname] || 'Overview'

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white border-b border-border px-5 md:px-6 gap-4">

      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{currentPage}</h1>
      </div>

      {/* Center: search */}
      <div className="hidden md:flex flex-1 max-w-sm mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-4 text-sm rounded-xl border border-border bg-muted/50 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 relative rounded-xl">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/60 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[11px] font-bold text-white" style={{ background: '#0d6b5c' }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-foreground leading-none">{user?.name?.split(' ')[0]}</p>
                <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Student</p>
              </div>
              <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {user?.batchName && (
                <span className="inline-block mt-1.5 text-[10px] font-medium bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100">
                  {user.batchName}
                </span>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
