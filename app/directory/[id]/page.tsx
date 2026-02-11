'use client'

import { useEffect, useState } from 'react'
import { MainNav } from '@/components/main-nav'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { ChevronLeft, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useMyProfile } from '@/hooks/use-my-profile'

interface StudentProfile {
  id: string
  name: string
  username: string | null
  grade: number | null
  class_number: string | null
  mbti: string | null
  toefl: string | null
  sat: string | null
  ap: string | null
  other_scores: string | null
  gpa: string | null
  best_subject: string | null
  interests: string[] | null
  bio: string | null
}

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams() as { id?: string | string[] }
  const studentId = Array.isArray(params.id) ? params.id[0] : params.id
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [isStudentLoading, setIsStudentLoading] = useState(true)
  const [studentError, setStudentError] = useState<string | null>(null)
  const { profile, isLoading, supabase } = useMyProfile()

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/login')
      return
    }

    if (!studentId) return

    let isActive = true
    ;(async () => {
      setIsStudentLoading(true)
      setStudentError(null)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .maybeSingle()

      if (!isActive) return
      if (error) {
        setStudent(null)
        setStudentError(error.message)
        setIsStudentLoading(false)
        return
      }
      setStudent((data as StudentProfile | null) ?? null)
      setIsStudentLoading(false)
    })()

    return () => {
      isActive = false
    }
  }, [router, studentId, isLoading, profile, supabase])

  if (isLoading) {
    return null
  }

  if (!profile) {
    return null
  }

  if (isStudentLoading) {
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

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <MainNav />
        <main className="container mx-auto py-6 max-w-4xl px-4">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              {studentError ? `학생 정보를 불러오지 못했습니다: ${studentError}` : '학생 정보를 찾을 수 없습니다'}
            </p>
            <Button className="mt-4" asChild>
              <Link href="/directory">학생 목록으로 돌아가기</Link>
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  const interests = Array.isArray(student.interests) ? student.interests : []
  const studentInitial = student.name?.trim()?.charAt(0) || 'U'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNav />
      
      <main className="container mx-auto py-6 max-w-4xl px-4">
        <Button variant="ghost" className="mb-4" asChild>
          <Link href="/directory">
            <ChevronLeft className="h-4 w-4 mr-2" />
            목록으로
          </Link>
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-2xl">
                  {studentInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{student.name}</CardTitle>
                <Badge className="mt-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  G{student.grade ?? '-'} {student.class_number && `- ${student.class_number}`}
                </Badge>
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                <Link href={`/messages?to=${student.id}`}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  쪽지 보내기
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-muted-foreground text-sm">학년</Label>
                <p className="text-lg font-medium">G{student.grade ?? '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">반</Label>
                <p className="text-lg font-medium">{student.class_number || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">이름</Label>
                <p className="text-lg font-medium">{student.name}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>학업 정보</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-muted-foreground text-sm">MBTI</Label>
                <p className="text-lg font-medium">{student.mbti || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">TOEFL</Label>
                <p className="text-lg font-medium">{student.toefl || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">SAT</Label>
                <p className="text-lg font-medium">{student.sat || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">AP</Label>
                <p className="text-lg font-medium">{student.ap || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">기타 외부 성적</Label>
                <p className="text-lg font-medium">{student.other_scores || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">내신</Label>
                <p className="text-lg font-medium">{student.gpa || '-'}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-sm">가장 자신있는 과목</Label>
                <p className="text-lg font-medium">{student.best_subject || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {interests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>관심사</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>하고싶은말</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{student.bio || '-'}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
