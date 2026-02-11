'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MainNav } from '@/components/main-nav'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { ThumbsUp, ThumbsDown, MessageSquare, ChevronLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { useMyProfile } from '@/hooks/use-my-profile'

type PostDetail = {
  id: string
  author_id: string
  author_name: string
  category: string
  title: string
  content: string
  is_anonymous: boolean
  created_at: string
  likes_count: number
  dislikes_count: number
  comments_count: number
}

type FlatComment = {
  id: string
  post_id: string
  parent_comment_id: string | null
  author_id: string
  author_name: string
  content: string
  is_anonymous: boolean
  created_at: string
}

type Attachment = {
  id: string
  bucket: string
  file_path: string
  file_name: string | null
  mime_type: string | null
  size_bytes: number | null
  sort_order: number
  public_url: string
}

type CommentNode = FlatComment & {
  replies: CommentNode[]
}

const buildCommentTree = (flat: FlatComment[]): CommentNode[] => {
  const byId = new Map<string, CommentNode>()
  const roots: CommentNode[] = []
  for (const c of flat) byId.set(c.id, { ...c, replies: [] })
  for (const c of flat) {
    const node = byId.get(c.id)!
    if (c.parent_comment_id && byId.has(c.parent_comment_id)) {
      byId.get(c.parent_comment_id)!.replies.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export default function BoardPostPage() {
  const router = useRouter()
  const params = useParams() as { id?: string | string[] }
  const postId = Array.isArray(params.id) ? params.id[0] : params.id
  const { profile, isLoading: isAuthLoading, supabase } = useMyProfile()

  const [isPageLoading, setIsPageLoading] = useState(true)
  const [post, setPost] = useState<PostDetail | null>(null)
  const [comments, setComments] = useState<FlatComment[]>([])
  const [comment, setComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [isAnonymousComment, setIsAnonymousComment] = useState(false)
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const isAdmin = profile?.role === 'admin'

  const loadPostPage = useCallback(async () => {
    if (!postId || !profile) return
    setIsPageLoading(true)

    const [
      { data: postData, error: postError },
      { data: commentData, error: commentError },
      { data: myReaction, error: reactionError },
      { data: attachmentData, error: attachmentError },
    ] = await Promise.all([
      supabase
        .from('post_summaries')
        .select(
          'id, author_id, author_name, category, title, content, is_anonymous, created_at, likes_count, dislikes_count, comments_count'
        )
        .eq('id', postId)
        .maybeSingle(),
      supabase
        .from('comment_summaries')
        .select('id, post_id, parent_comment_id, author_id, author_name, content, is_anonymous, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }),
      supabase.from('reactions').select('reaction').eq('post_id', postId).eq('user_id', profile.id).maybeSingle(),
      supabase
        .from('post_attachments')
        .select('id, bucket, file_path, file_name, mime_type, size_bytes, sort_order')
        .eq('post_id', postId)
        .order('sort_order', { ascending: true }),
    ])

    if (postError || !postData) {
      setPost(null)
      setComments([])
      setReaction(null)
      setAttachments([])
      setIsPageLoading(false)
      return
    }

    setPost(postData as PostDetail)
    setComments((commentData as FlatComment[]) || [])
    setReaction((myReaction?.reaction as 'like' | 'dislike' | null) || null)
    if (attachmentData && !attachmentError) {
      const parsed = (attachmentData as Omit<Attachment, 'public_url'>[]).map((row) => {
        const publicUrl = supabase.storage.from(row.bucket).getPublicUrl(row.file_path).data.publicUrl
        return { ...row, public_url: publicUrl }
      })
      setAttachments(parsed)
    } else {
      setAttachments([])
    }
    if (commentError || reactionError || attachmentError) {
      // Non-fatal: page can still render without these.
    }
    setIsPageLoading(false)
  }, [postId, profile, supabase])

  useEffect(() => {
    if (!isAuthLoading && !profile) {
      router.push('/login')
      return
    }
    if (!postId || !profile) return
    void loadPostPage()
  }, [router, isAuthLoading, profile, postId, loadPostPage])

  const commentTree = useMemo(() => buildCommentTree(comments), [comments])

  const handleReaction = async (next: 'like' | 'dislike') => {
    if (!profile || !post) return

    if (reaction === next) {
      const { error } = await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', profile.id)
      if (error) return
    } else {
      const { error } = await supabase.from('reactions').upsert(
        { post_id: post.id, user_id: profile.id, reaction: next },
        { onConflict: 'post_id,user_id' }
      )
      if (error) return
    }

    await loadPostPage()
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !post || !comment.trim()) return

    const { error } = await supabase.from('comments').insert({
      post_id: post.id,
      author_id: profile.id,
      parent_comment_id: replyTo,
      content: comment.trim(),
      is_anonymous: isAnonymousComment,
    })

    if (error) {
      alert(error.message)
      return
    }

    setComment('')
    setReplyTo(null)
    setIsAnonymousComment(false)
    await loadPostPage()
  }

  const handleDeletePost = async () => {
    if (!post) return
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return

    if (attachments.length > 0) {
      const pathsByBucket = attachments.reduce<Record<string, string[]>>((acc, attachment) => {
        if (!acc[attachment.bucket]) acc[attachment.bucket] = []
        acc[attachment.bucket].push(attachment.file_path)
        return acc
      }, {})

      await Promise.all(
        Object.entries(pathsByBucket).map(([bucket, paths]) =>
          supabase.storage.from(bucket).remove(paths)
        )
      )
    }

    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) {
      alert(error.message)
      return
    }
    router.push('/boards')
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) {
      alert(error.message)
      return
    }
    await loadPostPage()
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '방금 전'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '방금 전'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    return date.toLocaleDateString('ko-KR')
  }

  const renderComments = (nodes: CommentNode[], depth = 0) =>
    nodes.map((node) => (
      <div key={node.id} className={depth > 0 ? 'ml-8 border-l-2 pl-4' : ''}>
        <div className="flex gap-3 mb-4">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-indigo-100 text-indigo-700">
              {node.is_anonymous ? '?' : node.author_name?.trim()?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{node.is_anonymous ? '익명' : node.author_name}</span>
              <span className="text-xs text-muted-foreground">{formatDate(node.created_at)}</span>
            </div>
            <p className="text-sm leading-relaxed mb-2">{node.content}</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setReplyTo(node.id)}>
                답글
              </Button>
              {(node.author_id === profile?.id || isAdmin) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-red-600 hover:text-red-700"
                  onClick={() => handleDeleteComment(node.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
        {node.replies.length > 0 && <div className="mt-2">{renderComments(node.replies, depth + 1)}</div>}
      </div>
    ))

  if (isAuthLoading || isPageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <MainNav />
        <main className="container mx-auto py-6 max-w-4xl px-4">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">로딩중...</p>
          </Card>
        </main>
      </div>
    )
  }

  if (!profile || !post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <MainNav />
        <main className="container mx-auto py-6 max-w-4xl px-4">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">게시글을 찾을 수 없습니다.</p>
            <Button className="mt-4" asChild>
              <Link href="/boards">게시판으로 돌아가기</Link>
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNav />

      <main className="container mx-auto py-6 max-w-4xl px-4">
        <Button variant="ghost" className="mb-4" asChild>
          <Link href="/boards">
            <ChevronLeft className="h-4 w-4 mr-2" />
            목록으로
          </Link>
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline">{post.category}</Badge>
            </div>
            <h1 className="text-2xl font-bold">{post.title}</h1>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-indigo-600 text-white">
                    {post.is_anonymous ? '?' : post.author_name?.trim()?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{post.is_anonymous ? '익명' : post.author_name}</div>
                  <span className="text-sm text-muted-foreground">{formatDate(post.created_at)}</span>
                </div>
              </div>
              {(post.author_id === profile.id || isAdmin) && (
                <Button variant="destructive" size="sm" onClick={handleDeletePost}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {attachments.length > 0 && (
              <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.public_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border bg-black/5 hover:opacity-95"
                    >
                      <img
                        src={attachment.public_url}
                        alt={attachment.file_name || '게시글 이미지'}
                        className="h-64 w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed">{post.content}</p>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Button
                variant={reaction === 'like' ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => handleReaction('like')}
              >
                <ThumbsUp className="h-4 w-4" />
                좋아요 {post.likes_count}
              </Button>
              <Button
                variant={reaction === 'dislike' ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => handleReaction('dislike')}
              >
                <ThumbsDown className="h-4 w-4" />
                싫어요 {post.dislikes_count}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                댓글 {comments.length}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-lg">댓글 {comments.length}개</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              {replyTo && (
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950 p-2 rounded">
                  <span className="text-sm">답글 작성 중...</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                    취소
                  </Button>
                </div>
              )}
              <Textarea
                placeholder="댓글을 작성하세요..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-24"
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={isAnonymousComment}
                  onChange={(e) => setIsAnonymousComment(e.target.checked)}
                />
                익명으로 댓글 달기
              </label>
              <div className="flex justify-end">
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  댓글 입력
                </Button>
              </div>
            </form>

            <Separator />

            <div className="space-y-4">
              {comments.length > 0 ? (
                renderComments(commentTree)
              ) : (
                <p className="text-center text-muted-foreground py-8">첫 댓글을 작성해보세요</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
