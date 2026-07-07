import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

const schema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

const API_BASE = import.meta.env.VITE_API_URL || '/api/lms'
const REMEMBER_KEY = 'lms_remembered_email'

export default function Login() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBER_KEY))
  const [loginError, setLoginError] = useState('')

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) setValue('email', saved)
  }, [setValue])

  const onSubmit = async (data: FormValues) => {
    setLoginError('')
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, data.email)
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, data)
      const { token, user } = res.data
      localStorage.setItem('lms_token', token)
      setSession(user)
      toast.success('Welcome back!')
      navigate(user.role === 'sho' ? '/students' : '/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid email or password'
      setLoginError(msg)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#eef2f7' }}>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">

        {/* Logo + product name */}
        <div className="flex flex-col items-center mb-7 gap-2">
          <img src="/haca-logo.png" alt="HACA" className="h-10 w-auto object-contain" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 border border-gray-200 rounded-full px-3 py-0.5">
            Learning Management System
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Welcome Back</h1>
        <p className="text-gray-500 text-sm mb-9">Access your learning dashboard and resources.</p>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[430px] space-y-5">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email or Username
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Enter your email"
                autoComplete="email"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600 cursor-pointer"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Error */}
          {loginError && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm text-red-600">{loginError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{ background: '#1a2744' }}
          >
            {isSubmitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <>Sign In <ArrowRight className="h-4 w-4" /></>
            }
          </button>

          {/* Contact admin */}
          <p className="text-center text-sm text-gray-500 pt-1">
            New to the institution?{' '}
            <a href="mailto:tech.haca@gmail.com" className="text-blue-600 hover:underline font-medium">
              Contact administration
            </a>
          </p>

        </form>
      </div>

      {/* Footer */}
      <footer className="py-5 px-6 border-t border-gray-200/80 bg-white/50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">© 2025 HACA · Harisandco Academy. All rights reserved.</p>
          <div className="flex items-center gap-5">
            {['Support', 'Privacy Policy', 'Terms of Service'].map(l => (
              <a key={l} href="mailto:tech.haca@gmail.com"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}
