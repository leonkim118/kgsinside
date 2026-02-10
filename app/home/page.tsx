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
import { readJSON } from '@/lib/storage'
import { useMyProfile } from '@/hooks/use-my-profile'

interface Post {
  id: string
  title: string
  content: string
  author: string
  authorId: string
  category: string
  likes: number
  dislikes: number
  comments: any[]
  views: number
  createdAt: string
  isAnonymous?: boolean
}

export default function HomePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [posts, setPosts] = useState<Post[]>([])
  const { profile, isLoading } = useMyProfile()

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/login')
      return
    }
    const savedPosts = readJSON<Post[]>('kgscp_posts', [])
    setPosts(Array.isArray(savedPosts) ? savedPosts.slice(0, 10) : [])
  }, [router, isLoading, profile])

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
                    {profile.name.charAt(0)}
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
              {posts.map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <Link href={`/boards/${post.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {post.isAnonymous ? '?' : post.author.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">
                                {post.isAnonymous ? t('anonymous') : post.author}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {post.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(post.createdAt)}
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
                          {post.likes || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {Array.isArray(post.comments) ? post.comments.length : 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {post.views || 0}
                        </span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}

              {posts.length === 0 && (
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
