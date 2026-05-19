import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, GraduationCap, BookOpen, Award, Users } from 'lucide-react'
import axios from 'axios'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

const features = [
  { icon: BookOpen, label: 'Access course videos & PDFs' },
  { icon: Award,    label: 'Track certificates & results' },
  { icon: Users,    label: 'Batch attendance & progress' },
]

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/lms', '') || 'http://localhost:5001'

export default function Login() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    setLoginError('')
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, data)
      const { token, portalType, user } = res.data

      if (portalType === 'admin') {
        localStorage.setItem('admin_token', token)
        localStorage.setItem('admin_user', JSON.stringify(user))
        toast.success(`Welcome, ${user.name?.split(' ')[0]}!`)
        navigate('/admin')
      } else {
        localStorage.setItem('lms_token', token)
        setSession(user)
        toast.success('Welcome back!')
        navigate('/dashboard')
      }
    } catch (err: any) {
      setLoginError(err?.response?.data?.message || 'Invalid email or password')
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden" style={{ background: '#0d2b2b' }}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#1a5c5c' }}>
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">HACA LMS</p>
            <p className="text-white/40 text-xs">Learning Portal</p>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Your learning<br />journey starts here.
          </h2>
          <p className="text-white/50 text-base mb-10">
            Access your courses, track your progress, and grow your skills — all in one place.
          </p>
          <div className="space-y-4">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 border border-white/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-white/70 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/20 text-xs relative z-10">© 2026 HACA · Happily A Career Academy</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="flex lg:hidden items-center gap-2 mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg">HACA LMS</span>
        </div>

        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to continue to your portal</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <Input
                id="email" type="email" placeholder="you@example.com"
                autoComplete="email" className="h-11" {...register('email')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" autoComplete="current-password"
                  className="h-11 pr-11" {...register('password')}
                />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {loginError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <span className="text-sm text-red-600 font-medium">{loginError}</span>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-semibold shadow-md shadow-primary/20" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Having trouble? Contact your mentor or{' '}
            <a href="mailto:tech.haca@gmail.com" className="text-primary hover:underline font-medium">support</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
