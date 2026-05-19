import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MessageSquare, Reply, Star, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import api from '../services/api'
import { formatDate } from '../lib/utils'
import type { Comment } from '../types'

const schema = z.object({ body: z.string().min(2, 'Comment cannot be empty') })
type FormValues = z.infer<typeof schema>

interface DiscussionThreadProps { lessonId: string }

export function DiscussionThread({ lessonId }: DiscussionThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const fetchComments = async () => {
    try {
      const r = await api.get(`/discussions/${lessonId}`)
      setComments(r.data.comments || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchComments() }, [lessonId])

  const onSubmit = async (data: FormValues) => {
    try {
      await api.post(`/discussions/${lessonId}`, {
        body: data.body,
        parentComment: replyTo || undefined,
      })
      reset()
      setReplyTo(null)
      fetchComments()
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Discussion ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Post comment form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          {replyTo && (
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded">
              <span>Replying to a comment</span>
              <button type="button" onClick={() => setReplyTo(null)} className="hover:text-foreground">Cancel</button>
            </div>
          )}
          <Textarea {...register('body')} placeholder={replyTo ? 'Write a reply…' : 'Ask a question or share a thought…'} rows={3} />
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {replyTo ? 'Post Reply' : 'Post Comment'}
          </Button>
        </form>

        <Separator />

        {/* Comments */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading discussion…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-4">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <CommentItem key={c._id} comment={c} onReply={() => setReplyTo(c._id)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CommentItem({ comment, onReply }: { comment: Comment; onReply: () => void }) {
  const initials = comment.author.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{comment.author.name}</span>
            {comment.isBestAnswer && (
              <Badge variant="success" className="text-xs flex items-center gap-1">
                <Star className="h-2.5 w-2.5" /> Best Answer
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{formatDate(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-muted-foreground">{comment.body}</p>
          <button
            onClick={onReply}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Reply className="h-3 w-3" /> Reply
          </button>
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies?.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-muted pl-4">
          {comment.replies.map((r) => (
            <CommentItem key={r._id} comment={r} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  )
}
