'use client'

import { useEffect, useState } from 'react'
import { MainNav } from '@/components/main-nav'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquare, ThumbsUp, Eye } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useMyProfile } from '@/hooks/use-my-profile'

interface Post {
  id: string
  author_id: string
  author_name: string
  author_username: string | null
  category: string
  title: string
  content: string
  is_anonymous: boolean
  created_at: string
  likes_count: number
  comments_count: number
}

export default function HomePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [posts, setPosts] = useState<Post[]>([])
  const [isPostsLoading, setIsPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState<string | null>(null)
  const { profile, isLoading, supabase } = useMyProfile()

  useEffect(() => {
    if (isLoading) return
    if (!profile) {
      router.push('/login')
      return
    }

    let isActive = true
    ;(async () => {
      setIsPostsLoading(true)
      setPostsError(null)
      const { data, error } = await supabase
        .from('post_summaries')
        .select(
          'id, author_id, author_name, author_username, category, title, content, is_anonymous, created_at, likes_count, comments_count'
        )
        .order('created_at', { ascending: false })
        .limit(10)

      if (!isActive) return
      if (error) {
        setPosts([])
        setPostsError(error.message)
        setIsPostsLoading(false)
        return
      }

      setPosts((data as Post[]) || [])
      setIsPostsLoading(false)
    })()

    return () => {
      isActive = false
    }
  }, [router, isLoading, profile, supabase])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <MainNav />
        <main className="container mx-auto py-6 max-w-6xl px-4">
          <Card className="p-6">
            <p className="text-muted-foreground">{t('loading')}</p>
          </Card>
        </main>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (hours < 1) return t('justNow')
    if (hours < 24) return t('hoursAgo').replace('{hours}', hours.toString())
    if (days < 7) return t('daysAgo').replace('{days}', days.toString())
    return date.toLocaleDateString('ko-KR')
  }

  const profileInitial = profile.name?.trim()?.charAt(0) || 'U'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNav />
      
      <main className="container mx-auto py-6 max-w-6xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <Card className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarFallback className="bg-indigo-600 text-white text-2xl">
                    {profileInitial}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-bold text-lg">{profile.name}</h3>
                <Badge className="mt-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {t('gradeNumber')} {profile.grade ?? '-'}
                </Badge>
                <p className="text-sm text-muted-foreground mt-4">
                  @{profile.username ?? ''}
                </p>
              </div>
            </Card>
          </aside>

          <div className="lg:col-span-3">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">
                {t('welcomeUser').replace('{name}', profile.name)}
              </h1>
              <p className="text-muted-foreground">
                {t('checkLatestPosts')}
              </p>
            </div>

            <div className="space-y-4">
              {isPostsLoading && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">{t('loading')}</p>
                </Card>
              )}

              {!isPostsLoading && postsError && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    {t('loading')} 실패: {postsError}
                  </p>
                </Card>
              )}

              {posts.map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <Link href={`/boards/${post.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {post.is_anonymous ? '?' : post.author_name?.trim()?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">
                                {post.is_anonymous ? t('anonymous') : post.author_name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {post.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(post.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <h3 className="font-semibold text-lg mb-2 hover:text-indigo-600 transition-colors">
                        {post.title}
                      </h3>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          {post.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {post.comments_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          0
                        </span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}

              {!isPostsLoading && !postsError && posts.length === 0 && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">{t('noPosts')}</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
