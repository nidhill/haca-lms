import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, Mail, CheckCircle2 } from 'lucide-react'
import api from '../services/api'
import { toast } from 'sonner'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type FormValues = z.infer<typeof schema>

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    try {
      await api.post('/auth/forgot-password', data)
      setSent(true)
    } catch {
      toast.error('Could not send reset email. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#eef2f7' }}>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">

        <img src="/haca-logo.png" alt="HACA" className="h-10 w-auto object-contain mb-7" />

        {sent ? (
          <div className="w-full max-w-[430px] flex flex-col items-center text-center space-y-5">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Check Your Email</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                If that email is registered, you'll receive a password reset link shortly.
                Check your inbox and spam folder.
              </p>
            </div>
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: '#1a2744' }}
            >
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Forgot Password?</h1>
            <p className="text-gray-500 text-sm mb-9 text-center">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[430px] space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                style={{ background: '#1a2744' }}
              >
                {isSubmitting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <>Send Reset Link <ArrowRight className="h-4 w-4" /></>
                }
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors pt-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </Link>

            </form>
          </>
        )}
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
