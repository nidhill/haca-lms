import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Lock, ArrowRight } from 'lucide-react'
import api from '../services/api'
import { toast } from 'sonner'

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ['confirm'],
})
type FormValues = z.infer<typeof schema>

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    try {
      await api.post(`/auth/reset-password/${token}`, { password: data.password })
      toast.success('Password updated. Please log in.')
      navigate('/login')
    } catch {
      // api interceptor handles error toast
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#eef2f7' }}>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">

        <img src="/haca-logo.png" alt="HACA" className="h-10 w-auto object-contain mb-7" />

        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Set New Password</h1>
        <p className="text-gray-500 text-sm mb-9 text-center">
          Choose a strong password for your account.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[430px] space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                {...register('confirm')}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{ background: '#1a2744' }}
          >
            {isSubmitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <>Update Password <ArrowRight className="h-4 w-4" /></>
            }
          </button>

        </form>
      </div>

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
