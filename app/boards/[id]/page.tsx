'use client'

import { useEffect, useState } from 'react'
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
import { readJSON, writeJSON } from '@/lib/storage'
import { useMyProfile } from '@/hooks/use-my-profile'

export default function BoardPostPage() {
  const router = useRouter()
  const params = useParams() as { id?: string | string[] }
  const postId = Array.isArray(params.id) ? params.id[0] : params.id
  const [post, setPost] = useState<any>(null)
  const [hasCountedView, setHasCountedView] = useState(false)
  const [comment, setComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [isAnonymousComment, setIsAnonymousComment] = useState(false)
  const { profile, isLoading: isAuthLoading } = useMyProfile()

  const persistPost = (updatedPost: any) => {
    const posts = readJSON<any[]>('kgscp_posts', [])
    const updatedPosts = Array.isArray(posts)
      ? posts.map((p: any) => (p.id === updatedPost.id ? updatedPost : p))
      : [updatedPost]
    writeJSON('kgscp_posts', updatedPosts)
  }

  useEffect(() => {
    if (!isAuthLoading && !profile) {
      router.push('/login')
      return
    }

    if (!postId) return

    const posts = readJSON<any[]>('kgscp_posts', [])
    const foundPost = Array.isArray(posts) ? posts.find((p: any) => p.id === postId) : null
    
    if (foundPost) {
      const normalizedPost = {
        ...foundPost,
        comments: Array.isArray(foundPost.comments) ? foundPost.comments : [],
        dislikes: foundPost.dislikes ?? 0,
        likes: foundPost.likes ?? 0,
        views: foundPost.views || 0,
      }
      
      setPost(normalizedPost)
    }
  }, [router, postId, isAuthLoading, profile])

  useEffect(() => {
    if (!post || hasCountedView) return
    setHasCountedView(true)

    const updatedPost = { ...post, views: (post.views || 0) + 1 }
    setPost(updatedPost)
    persistPost(updatedPost)
  }, [post, hasCountedView])

  if (isAuthLoading) {
    return null
  }

  if (!profile || !post) {
    return null
  }

  const addReplyToComments = (comments: any[], targetId: string, reply: any): any[] => {
    return comments.map((c) => {
      if (c.id === targetId) {
        const nextReplies = Array.isArray(c.replies) ? c.replies : []
        return { ...c, replies: [...nextReplies, reply] }
      }
      if (Array.isArray(c.replies) && c.replies.length > 0) {
        return { ...c, replies: addReplyToComments(c.replies, targetId, reply) }
      }
      return c
    })
  }

  const removeCommentFromComments = (comments: any[], targetId: string): any[] => {
    return comments
      .filter((c) => c.id !== targetId)
      .map((c) => ({
        ...c,
        replies: Array.isArray(c.replies) ? removeCommentFromComments(c.replies, targetId) : [],
      }))
  }

  const handleLike = () => {
    const likes = post.likes || 0
    const dislikes = post.dislikes || 0
    let nextLikes = likes
    let nextDislikes = dislikes
    let nextIsLiked = isLiked
    let nextIsDisliked = isDisliked

    if (isLiked) {
      nextLikes = Math.max(0, likes - 1)
      nextIsLiked = false
    } else {
      nextLikes = likes + 1
      nextIsLiked = true
      if (isDisliked) {
        nextDislikes = Math.max(0, dislikes - 1)
        nextIsDisliked = false
      }
    }

    const updatedPost = { ...post, likes: nextLikes, dislikes: nextDislikes }
    setIsLiked(nextIsLiked)
    setIsDisliked(nextIsDisliked)
    setPost(updatedPost)
    persistPost(updatedPost)
  }

  const handleDislike = () => {
    const likes = post.likes || 0
    const dislikes = post.dislikes || 0
    let nextLikes = likes
    let nextDislikes = dislikes
    let nextIsLiked = isLiked
    let nextIsDisliked = isDisliked

    if (isDisliked) {
      nextDislikes = Math.max(0, dislikes - 1)
      nextIsDisliked = false
    } else {
      nextDislikes = dislikes + 1
      nextIsDisliked = true
      if (isLiked) {
        nextLikes = Math.max(0, likes - 1)
        nextIsLiked = false
      }
    }

    const updatedPost = { ...post, likes: nextLikes, dislikes: nextDislikes }
    setIsLiked(nextIsLiked)
    setIsDisliked(nextIsDisliked)
    setPost(updatedPost)
    persistPost(updatedPost)
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    const newComment = {
      id: 'comment-' + Date.now(),
      author: profile.name,
      authorId: profile.id,
      isAnonymous: isAnonymousComment,
      content: comment,
      createdAt: new Date().toISOString(),
      replies: []
    }

    const currentComments = Array.isArray(post.comments) ? post.comments : []
    const updatedComments = replyTo
      ? addReplyToComments(currentComments, replyTo, newComment)
      : [...currentComments, newComment]

    const updatedPost = { ...post, comments: updatedComments }
    setPost(updatedPost)
    persistPost(updatedPost)
    setComment('')
    setReplyTo(null)
    setIsAnonymousComment(false)
  }

  const handleDeletePost = () => {
    if (confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      const posts = readJSON<any[]>('kgscp_posts', [])
      const updatedPosts = Array.isArray(posts) ? posts.filter((p: any) => p.id !== post.id) : []
      writeJSON('kgscp_posts', updatedPosts)
      router.push('/boards')
    }
  }

  const handleDeleteComment = (commentId: string) => {
    if (confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
      const currentComments = Array.isArray(post.comments) ? post.comments : []
      const updatedComments = removeCommentFromComments(currentComments, commentId)
      const updatedPost = { ...post, comments: updatedComments }
      setPost(updatedPost)
      persistPost(updatedPost)
    }
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

  const renderComments = (comments: any[], depth = 0) => {
    return comments.map((comment) => (
      <div key={comment.id} className={depth > 0 ? 'ml-8 border-l-2 pl-4' : ''}>
        <div className="flex gap-3 mb-4">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-indigo-100 text-indigo-700">
              {comment.isAnonymous ? '?' : comment.author.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">
                {comment.isAnonymous ? '익명' : comment.author}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-2">{comment.content}</p>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2"
                onClick={() => setReplyTo(comment.id)}
              >
                답글
              </Button>
              {comment.authorId === profile?.id && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-red-600 hover:text-red-700"
                  onClick={() => handleDeleteComment(comment.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {renderComments(comment.replies, depth + 1)}
          </div>
        )}
      </div>
    ))
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
                    {post.isAnonymous ? '?' : post.author.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">
                    {post.isAnonymous ? '익명' : post.author}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(post.createdAt)}
                  </span>
                </div>
              </div>
              {post.authorId === profile.id && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeletePost}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed">{post.content}</p>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Button
                variant={isLiked ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={handleLike}
              >
                <ThumbsUp className="h-4 w-4" />
                좋아요 {post.likes}
              </Button>
              <Button
                variant={isDisliked ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={handleDislike}
              >
                <ThumbsDown className="h-4 w-4" />
                싫어요 {post.dislikes}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                댓글 {post.comments.length}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-lg">
              댓글 {post.comments.length}개
            </h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              {replyTo && (
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950 p-2 rounded">
                  <span className="text-sm">답글 작성 중...</span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setReplyTo(null)}
                  >
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
              {post.comments.length > 0 ? (
                renderComments(post.comments)
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  첫 댓글을 작성해보세요
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
