import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ExternalLink, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { Separator } from '../components/ui/separator'
import { PdfViewer } from '../components/PdfViewer'
import { VideoPlayer } from '../components/VideoPlayer'
import { DiscussionThread } from '../components/DiscussionThread'
import api from '../services/api'
import type { Lesson } from '../types'

interface LessonData {
  lesson: Lesson & { isComplete: boolean; lastPosition?: number }
  prevLesson?: { _id: string; title: string }
  nextLesson?: { _id: string; title: string }
}

export default function LessonView() {
  const { courseId, lessonId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<LessonData | null>(null)
  const [courseTitle, setCourseTitle] = useState<string>('Course')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/courses/lessons/${lessonId}`),
      courseId ? api.get(`/courses/${courseId}`) : Promise.resolve(null)
    ])
      .then(([lessonRes, courseRes]) => {
        setData(lessonRes.data)
        if (courseRes?.data?.course?.title) {
          setCourseTitle(courseRes.data.course.title)
        }
      })
      .catch(() => navigate(`/courses/${courseId}`))
      .finally(() => setLoading(false))
  }, [lessonId, courseId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="aspect-video rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    )
  }

  if (!data) return null
  const { lesson, prevLesson, nextLesson } = data

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/courses" className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <Link to={`/courses/${courseId}`} className="hover:text-foreground truncate">{courseTitle}</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{lesson.title}</span>
      </div>

      {/* Title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{lesson.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize text-xs">{lesson.type}</Badge>
            {lesson.isComplete && (
              <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle className="h-3.5 w-3.5" />
                Completed
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {lesson.type === 'video' && lesson.contentUrl && (
        <VideoPlayer
          lessonId={lessonId!}
          courseId={courseId!}
          url={lesson.contentUrl}
          startPosition={lesson.lastPosition}
          isComplete={lesson.isComplete}
          onComplete={() => setData(d => d ? { ...d, lesson: { ...d.lesson, isComplete: true } } : d)}
        />
      )}

      {lesson.type === 'pdf' && lesson.contentUrl && (
        <PdfViewer url={lesson.contentUrl} />
      )}

      {lesson.type === 'text' && lesson.description && (
        <Card>
          <CardContent className="p-6 prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: lesson.description }} />
          </CardContent>
        </Card>
      )}

      {lesson.type === 'link' && lesson.contentUrl && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <ExternalLink className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">External Resource</p>
              <p className="text-sm text-muted-foreground">{lesson.contentUrl}</p>
            </div>
            <a href={lesson.contentUrl} target="_blank" rel="noopener noreferrer">
              <Button>Open Resource</Button>
            </a>
          </CardContent>
        </Card>
      )}

      {lesson.description && lesson.type !== 'text' && (
        <Card>
          <CardHeader><CardTitle className="text-sm">About this lesson</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{lesson.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Prev / Next navigation */}
      <div className="flex items-center justify-between pt-2">
        {prevLesson ? (
          <Button variant="outline" onClick={() => navigate(`/courses/${courseId}/lessons/${prevLesson._id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="max-w-[140px] truncate">{prevLesson.title}</span>
          </Button>
        ) : <div />}
        {nextLesson && (
          <Button onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson._id}`)}>
            <span className="max-w-[140px] truncate">{nextLesson.title}</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Discussion */}
      <DiscussionThread lessonId={lessonId!} />
    </div>
  )
}
