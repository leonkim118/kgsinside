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
import { readJSON } from '@/lib/storage'
import { useMyProfile } from '@/hooks/use-my-profile'

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams() as { id?: string | string[] }
  const studentId = Array.isArray(params.id) ? params.id[0] : params.id
  const [student, setStudent] = useState<any>(null)
  const { profile, isLoading } = useMyProfile()

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/login')
      return
    }

    if (!studentId) return

    const registeredUsers = readJSON<any[]>('kgscp_registered_users', [])
    const safeRegisteredUsers = Array.isArray(registeredUsers) ? registeredUsers : []
    const foundStudent = safeRegisteredUsers.find((s: any) => s.id === studentId)
    setStudent(foundStudent)
  }, [router, studentId, isLoading, profile])

  if (isLoading) {
    return null
  }

  if (!profile || !student) {
    return null
  }

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
                  {student.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{student.name}</CardTitle>
                <Badge className="mt-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  G{student.grade} {student.classNumber && `- ${student.classNumber}`}
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
                <p className="text-lg font-medium">G{student.grade}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">반</Label>
                <p className="text-lg font-medium">{student.classNumber || '-'}</p>
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
                <p className="text-lg font-medium">{student.otherScores || student.externalScores || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">내신</Label>
                <p className="text-lg font-medium">{student.gpa || '-'}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-sm">가장 자신있는 과목</Label>
                <p className="text-lg font-medium">{student.bestSubject || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {student.interests && student.interests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>관심사</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {student.interests.map((interest: string) => (
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
