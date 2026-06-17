import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Mail, Phone, Lock, Loader2, Eye, EyeOff, Camera,
  CheckCircle2, Award, BookOpen, BarChart2, Users,
  Edit2, Check, X, CalendarDays, Wifi, MapPin,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileStats {
  completedLessons: number
  totalLessons: number
  progressPercent: number
  attendancePercent: number
  certCount: number
}

interface Activity {
  type: 'lesson' | 'certificate'
  title: string
  subtitle: string
  date: string
}

// ─── Password schema ──────────────────────────────────────────────────────────
const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirm: z.string(),
}).refine(d => d.newPassword === d.confirm, { message: "Passwords don't match", path: ['confirm'] })
type PwForm = z.infer<typeof pwSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return fmtDate(d)
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 font-medium leading-none mb-0.5">{label}</p>
        <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, refreshUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingActivity, setLoadingActivity] = useState(true)

  // Edit phone
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneVal, setPhoneVal] = useState(user?.phone || '')
  const [savingPhone, setSavingPhone] = useState(false)

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Change password
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  })

  const initials = user?.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'ST'

  useEffect(() => {
    api.get('/auth/profile-stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false))
    api.get('/auth/activity')
      .then(r => setActivities(r.data.activities || []))
      .catch(() => {})
      .finally(() => setLoadingActivity(false))
  }, [])

  const savePhone = async () => {
    setSavingPhone(true)
    try {
      await api.patch('/auth/update-profile', { phone: phoneVal })
      await refreshUser()
      setEditingPhone(false)
      toast.success('Phone updated')
    } catch { toast.error('Failed to update') }
    finally { setSavingPhone(false) }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const fd = new FormData()
    fd.append('avatar', file)
    try {
      const r = await api.post('/auth/upload-avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await api.patch('/auth/update-profile', { avatar: r.data.url })
      await refreshUser()
      toast.success('Avatar updated')
    } catch { toast.error('Upload failed') }
    finally { setUploadingAvatar(false); e.target.value = '' }
  }

  const onChangePassword = async (data: PwForm) => {
    try {
      await api.patch('/auth/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword })
      toast.success('Password updated')
      reset()
    } catch { toast.error('Incorrect current password') }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">

      {/* ── Hero card ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {/* Navy top strip */}
        <div className="h-20 bg-gradient-to-r from-[#1a2744] to-[#243567]" />
        <div className="px-6 pb-5">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-4 border-white bg-[#1a2744] flex items-center justify-center overflow-hidden shadow-md">
                {user?.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-white">{initials}</span>
                }
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-[#1a2744] border-2 border-white flex items-center justify-center hover:bg-[#243567] transition-colors"
              >
                {uploadingAvatar
                  ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                  : <Camera className="h-3.5 w-3.5 text-white" />
                }
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1a2744]/10 text-[#1a2744] mb-1">
              Student
            </span>
          </div>

          {/* Name + meta */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-800">{user?.name}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                <Mail className="h-3.5 w-3.5" /> {user?.email}
              </span>
              {user?.batchName && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Users className="h-3.5 w-3.5" /> {user.batchName}
                </span>
              )}
              {user?.modeOfStudy && (
                <span className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full ${
                  user.modeOfStudy === 'Online'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {user.modeOfStudy === 'Online' ? <Wifi className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                  {user.modeOfStudy}
                </span>
              )}
              {user?.createdAt && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" /> Joined {fmtDate(user.createdAt)}
                </span>
              )}
            </div>

            {/* Phone row — inline edit */}
            <div className="flex items-center gap-2 pt-1">
              <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              {editingPhone ? (
                <div className="flex items-center gap-2">
                  <input
                    value={phoneVal}
                    onChange={e => setPhoneVal(e.target.value)}
                    placeholder="Enter phone number"
                    className="h-7 text-sm px-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30 w-44"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') savePhone(); if (e.key === 'Escape') setEditingPhone(false) }}
                  />
                  <button onClick={savePhone} disabled={savingPhone}
                    className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white disabled:opacity-50">
                    {savingPhone ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => { setEditingPhone(false); setPhoneVal(user?.phone || '') }}
                    className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-500">{user?.phone || 'Add phone number'}</span>
                  <button onClick={() => { setPhoneVal(user?.phone || ''); setEditingPhone(true) }}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#1a2744] transition-colors">
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      {loadingStats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 h-20 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100" />
                <div className="space-y-2 flex-1">
                  <div className="h-2 bg-slate-100 rounded w-2/3" />
                  <div className="h-5 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={BookOpen} label="Lessons Done" value={stats.completedLessons}
            sub={stats.totalLessons > 0 ? `of ${stats.totalLessons}` : undefined} color="bg-blue-500" />
          <StatCard icon={BarChart2} label="Progress" value={`${stats.progressPercent}%`}
            sub="Course completion" color="bg-violet-500" />
          <StatCard icon={CheckCircle2} label="Attendance" value={`${stats.attendancePercent}%`}
            sub="All time" color="bg-emerald-500" />
          <StatCard icon={Award} label="Certificates" value={stats.certCount}
            sub="Earned" color="bg-amber-500" />
        </div>
      )}

      {/* ── Recent Activity ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>
        </div>
        {loadingActivity ? (
          <div className="p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No activity yet. Start watching lessons!
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  a.type === 'certificate' ? 'bg-amber-100' : 'bg-blue-50'
                }`}>
                  {a.type === 'certificate'
                    ? <Award className="h-4 w-4 text-amber-600" />
                    : <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{a.title}</p>
                  {a.subtitle && <p className="text-xs text-slate-400 truncate">{a.subtitle}</p>}
                </div>
                <span className="text-[11px] text-slate-400 flex-shrink-0 mt-0.5">{timeAgo(a.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Change Password ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Change Password</h3>
        </div>
        <div className="p-5">
          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            {(['currentPassword', 'newPassword', 'confirm'] as const).map((field, i) => (
              <div key={field} className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 block">
                  {field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <input
                    {...register(field)}
                    type={showPw ? 'text' : 'password'}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 text-sm px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20 focus:border-[#1a2744]/40"
                  />
                  {i === 1 && (
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {errors[field] && <p className="text-xs text-red-500">{errors[field]?.message}</p>}
              </div>
            ))}
            <button type="submit" disabled={isSubmitting}
              className="flex items-center gap-2 px-5 h-9 rounded-xl bg-[#1a2744] hover:bg-[#243567] text-white text-sm font-medium disabled:opacity-50 transition-colors">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Password
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}
