'use client'

import { useEffect, useState } from 'react'
import { MainNav } from '@/components/main-nav'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { readJSON } from '@/lib/storage'
import { useMyProfile } from '@/hooks/use-my-profile'

interface Student {
  id: string
  name: string
  grade: number
  bio: string
  interests: string[]
  email: string
}

export default function DirectoryPage() {
  const router = useRouter()
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { profile, isLoading } = useMyProfile()

  useEffect(() => {
    if (!isLoading && !profile) router.push('/login')
  }, [router, isLoading, profile])

  if (isLoading) {
    return null
  }

  if (!profile) {
    return null
  }

  const registeredUsers = readJSON<any[]>('kgscp_registered_users', [])
  const safeRegisteredUsers = Array.isArray(registeredUsers) ? registeredUsers : []
  
  const filteredStudents = safeRegisteredUsers.filter((student: any) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGrade = selectedGrade === null || student.grade === selectedGrade
    return matchesSearch && matchesGrade
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNav />
      
      <main className="container mx-auto py-6 max-w-6xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">학생 목록</h1>
          <p className="text-muted-foreground mt-1">
            학년별로 학생들을 확인하세요
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름으로 검색..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedGrade === null ? "default" : "outline"}
            onClick={() => setSelectedGrade(null)}
            className={selectedGrade === null ? "bg-indigo-600" : ""}
          >
            전체
          </Button>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
            <Button
              key={grade}
              variant={selectedGrade === grade ? "default" : "outline"}
              onClick={() => setSelectedGrade(grade)}
              className={selectedGrade === grade ? "bg-indigo-600" : ""}
            >
              G{grade}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student: any) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <Link href={`/directory/${student.id}`}>
                  <div className="flex flex-col items-center text-center mb-4">
                    <Avatar className="h-16 w-16 mb-3">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xl">
                        {student.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-lg">{student.name}</h3>
                    <Badge variant="secondary" className="mt-1">
                      G{student.grade}
                    </Badge>
                  </div>

                  {student.bio && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                      {student.bio}
                    </p>
                  )}
                </Link>

                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  size="sm"
                  asChild
                >
                  <Link href={`/messages?to=${student.id}`}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    쪽지 보내기
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">학생이 없습니다</p>
          </Card>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          총 {filteredStudents.length}명의 학생
        </div>
      </main>
    </div>
  )
}
