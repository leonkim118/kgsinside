'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainNav } from '@/components/main-nav'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Plus, MessageSquare, ThumbsUp } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useMyProfile } from '@/hooks/use-my-profile'

export default function BoardsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { profile, isLoading: isAuthLoading, supabase } = useMyProfile()
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [isPostsLoading, setIsPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState<string | null>(null)
  const profileId = profile?.id

  type Post = {
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
    dislikes_count: number
    comments_count: number
  }

  useEffect(() => {
    if (!isAuthLoading && !profile) {
      router.push('/login')
    }
  }, [router, isAuthLoading, profile])

  useEffect(() => {
    if (isAuthLoading) return
    if (!profileId) return

    let isActive = true
    ;(async () => {
      setIsPostsLoading(true)
      setPostsError(null)
      const { data, error } = await supabase
        .from('post_summaries')
        .select(
          'id, author_id, author_name, author_username, category, title, content, is_anonymous, created_at, likes_count, dislikes_count, comments_count'
        )
        .order('created_at', { ascending: false })

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
  }, [isAuthLoading, profileId, supabase])

  const categories = [
    { value: '전체', label: t('categoryAll') },
    { value: '동아리', label: t('categoryClub') },
    { value: '학교 과제', label: t('categoryAssignment') },
    { value: '교과목', label: t('categorySubject') },
    { value: '교내 대회', label: t('categoryContest') },
    { value: '멘토 멘티', label: t('categoryMentor') },
    { value: '기타', label: t('categoryOther') },
  ]

  const filteredPosts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return posts.filter((post) => {
      const matchesCategory =
        selectedCategory === '전체' || post.category === selectedCategory
      if (!normalizedQuery) return matchesCategory
      const title = post.title?.toLowerCase() || ''
      const content = post.content?.toLowerCase() || ''
      const author = post.author_name?.toLowerCase() || ''
      const matchesSearch =
        title.includes(normalizedQuery) ||
        content.includes(normalizedQuery) ||
        author.includes(normalizedQuery)
      return matchesCategory && matchesSearch
    })
  }, [posts, searchQuery, selectedCategory])

  if (isAuthLoading) {
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
    if (!dateString) return t('justNow')
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return t('justNow')
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return t('justNow')
    if (hours < 24) return t('hoursAgo').replace('{hours}', hours.toString())
    return date.toLocaleString('ko-KR')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNav />
      
      <main className="container mx-auto py-6 max-w-6xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <Card className="p-4">
              <h3 className="font-bold mb-4">{t('category')}</h3>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(cat.value)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
              
              <div className="mt-6">
                <h3 className="font-bold mb-3">{t('searchTitle')}</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('search')}
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </Card>
          </aside>

          <div className="lg:col-span-3">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">{t('boardTitle')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('shareStories')}
              </p>
            </div>

            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <Link key={post.id} href={`/boards/${post.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {post.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {post.is_anonymous ? t('anonymous') : post.author_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(post.created_at)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-lg mb-1 hover:text-indigo-600 transition-colors">
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              {post.likes_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {post.comments_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {!isPostsLoading && postsError && (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">
                    {t('loading')} 실패: {postsError}
                  </p>
                </Card>
              )}

              {!isPostsLoading && !postsError && filteredPosts.length === 0 && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">{t('noPosts')}</p>
                </Card>
              )}

              {isPostsLoading && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">{t('loading')}</p>
                </Card>
              )}
            </div>
          </div>
        </div>

        <Link href="/boards/new">
          <Button
            size="icon"
            className="fixed bottom-8 right-8 h-16 w-16 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg"
          >
            <Plus className="h-8 w-8" />
          </Button>
        </Link>
      </main>
    </div>
  )
}
