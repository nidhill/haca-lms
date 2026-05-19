import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { Skeleton } from '../components/ui/skeleton'
import { cn } from '../lib/utils'
import api from '../services/api'
import type { Quiz, QuizAnswer, QuizResult } from '../types'

// ─── Timer ────────────────────────────────────────────────────────────────────

function useTimer(limitMinutes: number, onExpire: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(limitMinutes * 60)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(Date.now())

  useEffect(() => {
    if (limitMinutes === 0) return
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000)
      const remaining = limitMinutes * 60 - elapsed
      if (remaining <= 0) {
        clearInterval(intervalRef.current!)
        setSecondsLeft(0)
        onExpire()
      } else {
        setSecondsLeft(remaining)
      }
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [limitMinutes])

  return secondsLeft
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const { quizId } = useParams()
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [timeTaken, setTimeTaken] = useState(0)
  const startTime = useRef(Date.now())

  useEffect(() => {
    api.get(`/quizzes/${quizId}`)
      .then((r) => setQuiz(r.data.quiz))
      .catch(() => navigate(-1))
      .finally(() => setLoading(false))
  }, [quizId])

  const secondsLeft = useTimer(
    quiz?.timeLimit ?? 0,
    () => { if (!result) handleSubmit() }
  )

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }
  if (!quiz) return null

  const q = quiz.questions[currentQ]
  const totalAnswered = Object.keys(answers).length + Object.keys(textAnswers).length
  const progressPct = (totalAnswered / quiz.questions.length) * 100

  const handleSubmit = async () => {
    if (submitting || result) return
    setSubmitting(true)
    const timeTakenSeconds = Math.floor((Date.now() - startTime.current) / 1000)
    const payload: QuizAnswer[] = quiz.questions.map((_, i) => ({
      questionIndex: i,
      selectedOptionId: answers[i],
      textAnswer: textAnswers[i],
    }))
    try {
      const r = await api.post(`/quizzes/${quizId}/attempt`, { answers: payload, timeTakenSeconds })
      setResult(r.data.result)
      setTimeTaken(timeTakenSeconds)
    } catch {
      setSubmitting(false)
    }
  }

  // ─── Result screen ────────────────────────────────────────────────────────

  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Score card */}
        <Card className={cn('border-2', result.isPassed ? 'border-green-400' : 'border-red-400')}>
          <CardContent className="p-8 text-center space-y-3">
            {result.isPassed
              ? <CheckCircle className="mx-auto h-14 w-14 text-green-500" />
              : <XCircle className="mx-auto h-14 w-14 text-red-500" />}
            <h2 className="text-2xl font-bold">{result.isPassed ? 'Passed!' : 'Not Passed'}</h2>
            <p className="text-5xl font-bold text-primary">{result.percentage}%</p>
            <p className="text-muted-foreground">{result.score} / {result.totalMarks} marks</p>
            <p className="text-xs text-muted-foreground">Time taken: {formatTime(timeTaken)}</p>
          </CardContent>
        </Card>

        {/* Answer breakdown */}
        {quiz.showExplanations && (
          <Card>
            <CardHeader><CardTitle className="text-base">Answer Review</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {quiz.questions.map((qItem, i) => {
                const ans = result.answers[i]
                return (
                  <div key={qItem._id} className={cn('rounded-md border p-4', ans?.isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50')}>
                    <div className="flex gap-2 mb-2">
                      {ans?.isCorrect
                        ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        : <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                      <p className="text-sm font-medium">{qItem.text}</p>
                    </div>
                    {ans?.explanation && (
                      <p className="text-xs text-muted-foreground ml-6">{ans.explanation}</p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        <Button variant="outline" onClick={() => navigate(-1)}>Back to Course</Button>
      </div>
    )
  }

  // ─── Quiz UI ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{quiz.title}</h1>
          <p className="text-sm text-muted-foreground">
            Question {currentQ + 1} of {quiz.questions.length}
          </p>
        </div>
        {quiz.timeLimit > 0 && (
          <div className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
            secondsLeft < 60 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
          )}>
            <Clock className="h-4 w-4" />
            {formatTime(secondsLeft)}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <Progress value={progressPct} className="h-1.5" />
        <p className="text-xs text-muted-foreground text-right">{totalAnswered}/{quiz.questions.length} answered</p>
      </div>

      {/* Question card */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <Badge variant="outline" className="mb-3 capitalize text-xs">{q.type.replace('_', ' ')}</Badge>
            <p className="text-base font-medium leading-relaxed">{q.text}</p>
            <p className="text-xs text-muted-foreground mt-1">{q.marks} mark{q.marks !== 1 ? 's' : ''}</p>
          </div>

          {(q.type === 'mcq' || q.type === 'true_false') && (
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button
                  key={opt._id}
                  onClick={() => setAnswers({ ...answers, [currentQ]: opt._id })}
                  className={cn(
                    'w-full text-left rounded-md border p-3.5 text-sm transition-all',
                    answers[currentQ] === opt._id
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'hover:bg-muted/50'
                  )}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          {q.type === 'short_answer' && (
            <textarea
              className="w-full min-h-[120px] rounded-md border border-input bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Type your answer here…"
              value={textAnswers[currentQ] || ''}
              onChange={(e) => setTextAnswers({ ...textAnswers, [currentQ]: e.target.value })}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={currentQ === 0}
          onClick={() => setCurrentQ(currentQ - 1)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>

        <div className="flex gap-2">
          {/* Question dots */}
          {quiz.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={cn(
                'h-2.5 w-2.5 rounded-full transition-colors',
                i === currentQ ? 'bg-primary' : (answers[i] || textAnswers[i]) ? 'bg-green-400' : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>

        {currentQ < quiz.questions.length - 1 ? (
          <Button onClick={() => setCurrentQ(currentQ + 1)}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Quiz
          </Button>
        )}
      </div>

      {/* Submit warning */}
      {currentQ === quiz.questions.length - 1 && totalAnswered < quiz.questions.length && (
        <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-md px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          You have {quiz.questions.length - totalAnswered} unanswered question{quiz.questions.length - totalAnswered !== 1 ? 's' : ''}.
        </div>
      )}
    </div>
  )
}
