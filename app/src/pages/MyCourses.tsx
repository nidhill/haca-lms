import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, GraduationCap, Layers, Sparkles, ExternalLink, PlayCircle, Clock } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import api from '../services/api'

interface CourseCard {
  _id: string; courseId?: string; title: string; batchName: string
  thumbnail?: string; moduleCount: number; totalLessons: number
  completedLessons: number; progressPercent: number
}

interface ExtraCourse {
  _id: string; title: string; description?: string; thumbnail?: string
  link?: string; category?: string; totalLessons?: number; hasContent?: boolean
}

function CourseCardView({ course, onClick, index }: { course: CourseCard; onClick: () => void; index: number }) {
  const done = course.progressPercent === 100
  const started = course.completedLessons > 0 && !done

  const statusColor = done
    ? 'bg-emerald-500 text-white'
    : started
      ? 'bg-blue-500 text-white'
      : 'bg-slate-600/70 text-white'

  const statusIcon = done ? '✓' : started ? '⚡' : '○'

  return (
    <button
      onClick={onClick}
      className="text-left group w-full animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative rounded-xl overflow-hidden shadow-lg aspect-[4/3] border border-white/10">
        {/* Background */}
        {course.thumbnail
          ? <img src={course.thumbnail} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)' }} />
        }

        {/* Gradient overlay - improved */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

        {/* Status badge - repositioned */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md ${statusColor}`}>
            {statusIcon} {done ? 'Completed' : started ? 'In Progress' : 'Start'}
          </span>
        </div>

        {/* Content container */}
        <div className="absolute inset-0 flex flex-col justify-between p-5 transition-all duration-500">
          {/* Top: Batch name */}
          <div>
            <p className="text-white/60 text-xs font-medium tracking-wide uppercase">{course.batchName}</p>
          </div>

          {/* Bottom: Title, progress, action */}
          <div className="space-y-3">
            {/* Title */}
            <div>
              <h3 className="text-white font-bold text-base leading-snug line-clamp-2">
                {course.title}
              </h3>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-white/70 text-xs opacity-90">
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />{course.moduleCount}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />{course.totalLessons}
              </span>
              <div className="ml-auto font-semibold text-white">{course.progressPercent}%</div>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-blue-400 to-blue-500"
                style={{ width: `${course.progressPercent}%` }}
              />
            </div>

            {/* Action button */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-semibold text-white">
                {done ? 'Review' : started ? 'Continue' : 'Start'}
              </span>
              <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                <ChevronRight className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

function ExtraCourseCard({ course, index, onOpen }: { course: ExtraCourse; index: number; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="text-left group w-full animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="relative rounded-xl overflow-hidden shadow-lg aspect-[4/3] border border-white/10">
        {/* Background */}
        {course.thumbnail
          ? <img src={course.thumbnail} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' }} />
        }

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

        {/* Bonus badge */}
        <div className="absolute top-4 left-4">
          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 text-white backdrop-blur-md shadow-lg">
            <Sparkles className="h-3.5 w-3.5" /> Bonus
          </span>
        </div>

        {/* Content container */}
        <div className="absolute inset-0 flex flex-col justify-between p-5 transition-all duration-500">
          {/* Top: Category */}
          <div>
            {course.category && (
              <p className="text-violet-200 text-xs font-medium tracking-wide uppercase">{course.category}</p>
            )}
          </div>

          {/* Bottom: Title, description, action */}
          <div className="space-y-2.5">
            {/* Title */}
            <div>
              <h3 className="text-white font-bold text-base leading-snug line-clamp-2">
                {course.title}
              </h3>
            </div>

            {/* Description */}
            {course.description && (
              <p className="text-white/70 text-xs line-clamp-2 opacity-90">
                {course.description}
              </p>
            )}

            {/* Lessons count */}
            {course.hasContent && course.totalLessons ? (
              <p className="text-white/70 text-xs flex items-center gap-1.5 opacity-90">
                <PlayCircle className="h-3.5 w-3.5" /> {course.totalLessons} lesson{course.totalLessons === 1 ? '' : 's'}
              </p>
            ) : null}

            {/* Action button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-white">
                {course.hasContent ? 'Learn' : course.link ? 'Visit' : 'Coming'}
              </span>
              <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                {course.hasContent
                  ? <ChevronRight className="h-4 w-4 text-white" />
                  : <ExternalLink className="h-4 w-4 text-white" />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

export default function MyCourses() {
  const [courses, setCourses] = useState<CourseCard[]>([])
  const [extraCourses, setExtraCourses] = useState<ExtraCourse[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get('/courses').then(r => setCourses(r.data.courses || [])).catch(() => {}),
      api.get('/extra-courses').then(r => setExtraCourses(r.data.extraCourses || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-9 w-48 rounded-lg" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {courses.length} course{courses.length === 1 ? '' : 's'} in your learning path
          {extraCourses.length > 0 && ` · ${extraCourses.length} bonus`}
        </p>
      </div>

      {courses.length === 0 && extraCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-semibold text-muted-foreground">No courses found</p>
          <p className="text-sm text-muted-foreground">Your curriculum will appear here once it's published.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c, i) => (
            <CourseCardView
              key={c._id}
              course={c}
              index={i}
              onClick={() => navigate(`/courses/${encodeURIComponent(c.courseId || c._id)}`)}
            />
          ))}
          {extraCourses.map((c, i) => (
            <ExtraCourseCard
              key={c._id}
              course={c}
              index={courses.length + i}
              onOpen={() => navigate(`/extra-courses/${c._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
