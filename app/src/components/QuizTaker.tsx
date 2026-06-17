import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, ChevronRight, RotateCcw } from 'lucide-react'
import { Button } from './ui/button'
import api from '../services/api'

interface Option {
  _id: string
  text: string
}

interface Question {
  _id: string
  text: string
  type: 'mcq' | 'true_false' | 'short_answer'
  options?: Option[]
  marks?: number
}

interface Quiz {
  _id: string
  title: string
  description?: string
  questions: Question[]
  timeLimit?: number
}

interface QuizTakerProps {
  quizId: string
  isComplete?: boolean
  onMarkComplete?: () => void
}

export function QuizTaker({ quizId, isComplete, onMarkComplete }: QuizTakerProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, { selectedOptionId?: string; textAnswer?: string }>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const r = await api.get(`/quizzes/${quizId}`)
        setQuiz(r.data.quiz)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load quiz:', err)
        setLoading(false)
      }
    }
    if (quizId) fetchQuiz()
  }, [quizId])

  if (loading) {
    return (
      <div className="aspect-video flex items-center justify-center bg-slate-900 text-white">
        <p>Loading quiz...</p>
      </div>
    )
  }

  if (!quiz || !quiz.questions?.length) {
    return (
      <div className="aspect-video flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
        <p>No quiz available</p>
      </div>
    )
  }

  const current = quiz.questions[currentIndex]
  const isAnswered = answers[currentIndex] !== undefined
  const totalQuestions = quiz.questions.length

  const handleSelectOption = (optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: { selectedOptionId: optionId }
    }))
  }

  const handleTextAnswer = (text: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: { textAnswer: text }
    }))
  }

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Format answers for backend
      const formattedAnswers = Object.keys(answers).map(idx => answers[Number(idx)] || {})

      const r = await api.post(`/quizzes/${quizId}/attempt`, {
        answers: formattedAnswers,
        timeTakenSeconds: 0,
      })

      setResult(r.data.result)
      setSubmitted(true)
    } catch (err) {
      console.error('Failed to submit quiz:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted && result) {
    const percentage = result.percentage || 0
    const passed = result.isPassed || percentage >= 50

    return (
      <div className="aspect-video flex flex-col items-center justify-center gap-6 bg-slate-900 text-white p-8">
        <div className="text-center">
          {passed ? (
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          )}
          <h2 className="text-3xl font-bold mb-2">{passed ? 'Passed!' : 'Not Passed'}</h2>
          <p className="text-4xl font-bold text-blue-400 mb-2">{percentage}%</p>
          <p className="text-lg text-gray-300">
            Score: {result.score} / {result.totalMarks} marks
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              setSubmitted(false)
              setCurrentIndex(0)
              setAnswers({})
              setResult(null)
            }}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Retake Quiz
          </Button>
          {onMarkComplete && (
            <Button
              size="lg"
              onClick={onMarkComplete}
              disabled={isComplete}
              className={`gap-2 ${isComplete ? 'bg-emerald-600/50' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isComplete ? 'Completed' : 'Mark as Complete'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const answeredCount = Object.keys(answers).length

  return (
    <div className="aspect-video flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 px-8 py-4 border-b border-slate-700">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">{quiz.title}</h2>
          <span className="text-sm text-gray-400">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div>
          <h3 className="text-lg font-semibold mb-6">{current.text}</h3>

          {(current.type === 'mcq' || current.type === 'true_false') && current.options && (
            <div className="space-y-3">
              {current.options.map((option) => (
                <label
                  key={option._id}
                  className="flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all"
                  style={{
                    borderColor:
                      answers[currentIndex]?.selectedOptionId === option._id ? '#3b82f6' : '#374151',
                    backgroundColor:
                      answers[currentIndex]?.selectedOptionId === option._id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name={current._id}
                    value={option._id}
                    checked={answers[currentIndex]?.selectedOptionId === option._id}
                    onChange={() => handleSelectOption(option._id)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span>{option.text}</span>
                </label>
              ))}
            </div>
          )}

          {current.type === 'short_answer' && (
            <input
              type="text"
              placeholder="Type your answer..."
              value={answers[currentIndex]?.textAnswer || ''}
              onChange={e => handleTextAnswer(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-800 px-8 py-4 border-t border-slate-700 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>

        <span className="text-sm text-gray-400">
          {answeredCount} of {totalQuestions} answered
        </span>

        {currentIndex < totalQuestions - 1 ? (
          <Button onClick={handleNext} className="gap-2 bg-blue-600 hover:bg-blue-700">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={answeredCount === 0 || submitting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        )}
      </div>
    </div>
  )
}
