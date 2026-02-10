'use client'

import { useEffect, useState } from 'react'
import { MainNav } from '@/components/main-nav'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Save } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { useMyProfile } from '@/hooks/use-my-profile'

export default function ProfilePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const { profile, isLoading, refresh, supabase } = useMyProfile()
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    grade: '',
    classNumber: '',
    mbti: '',
    toefl: '',
    sat: '',
    ap: '',
    otherScores: '',
    gpa: '',
    bestSubject: '',
    bio: '',
  })

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/login')
      return
    }
    if (profile) {
      setFormData({
        name: profile.name || '',
        username: profile.username || '',
        grade: profile.grade?.toString() || '',
        classNumber: profile.class_number || '',
        mbti: profile.mbti || '',
        toefl: profile.toefl || '',
        sat: profile.sat || '',
        ap: profile.ap || '',
        otherScores: profile.other_scores || '',
        gpa: profile.gpa || '',
        bestSubject: profile.best_subject || '',
        bio: profile.bio || '',
      })
    }
  }, [router, isLoading, profile])

  if (isLoading) {
    return null
  }

  if (!profile) {
    return null
  }

  const handleSave = async () => {
    const updates = {
      username: formData.username || null,
      name: formData.name,
      grade: formData.grade ? parseInt(formData.grade) : null,
      class_number: formData.classNumber || null,
      mbti: formData.mbti || null,
      toefl: formData.toefl || null,
      sat: formData.sat || null,
      ap: formData.ap || null,
      other_scores: formData.otherScores || null,
      gpa: formData.gpa || null,
      best_subject: formData.bestSubject || null,
      bio: formData.bio || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)
    if (error) {
      alert(error.message)
      return
    }

    await refresh()
    setIsEditing(false)
    alert(t('profileUpdated'))
  }

  const userInitial = profile.name.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNav />
      
      <main className="container py-6 max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t('myInfo')}</h1>
          <p className="text-muted-foreground mt-1">
            내 프로필 정보를 관리하세요
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-indigo-600 text-white text-2xl">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{profile.name}</CardTitle>
                  <CardDescription>@{profile.username}</CardDescription>
                  <Badge className="mt-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    G{profile.grade ?? '-'} {profile.class_number && `- ${profile.class_number}`}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? 'outline' : 'default'}
                className={!isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              >
                {isEditing ? '취소' : '수정'}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>프로필 수정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>이름</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>학년</Label>
                  <Input
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>반 번호</Label>
                <Input
                  value={formData.classNumber}
                  onChange={(e) => setFormData({ ...formData, classNumber: e.target.value })}
                  placeholder="예: 1반"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>MBTI</Label>
                  <Input
                    value={formData.mbti}
                    onChange={(e) => setFormData({ ...formData, mbti: e.target.value })}
                    placeholder="예: ENFP"
                  />
                </div>
                <div className="space-y-2">
                  <Label>TOEFL</Label>
                  <Input
                    value={formData.toefl}
                    onChange={(e) => setFormData({ ...formData, toefl: e.target.value })}
                    placeholder="예: 110"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SAT</Label>
                  <Input
                    value={formData.sat}
                    onChange={(e) => setFormData({ ...formData, sat: e.target.value })}
                    placeholder="예: 1450"
                  />
                </div>
                <div className="space-y-2">
                  <Label>AP</Label>
                  <Input
                    value={formData.ap}
                    onChange={(e) => setFormData({ ...formData, ap: e.target.value })}
                    placeholder="예: Calculus BC (5)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>기타 외부 성적</Label>
                <Input
                  value={formData.otherScores}
                  onChange={(e) => setFormData({ ...formData, otherScores: e.target.value })}
                  placeholder="예: IELTS 8.0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>내신</Label>
                  <Input
                    value={formData.gpa}
                    onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                    placeholder="예: 4.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>가장 자신있는 과목</Label>
                  <Input
                    value={formData.bestSubject}
                    onChange={(e) => setFormData({ ...formData, bestSubject: e.target.value })}
                    placeholder="예: 수학"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>하고싶은말</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="자신을 소개해주세요..."
                  rows={4}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.bio.length}/200
                </p>
              </div>

              <Button
                onClick={handleSave}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="h-4 w-4 mr-2" />
                저장하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-muted-foreground text-sm">학년</Label>
                  <p className="text-lg font-medium">G{profile.grade ?? '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">반</Label>
                  <p className="text-lg font-medium">{profile.class_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">이름</Label>
                  <p className="text-lg font-medium">{profile.name}</p>
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
                  <p className="text-lg font-medium">{profile.mbti || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">TOEFL</Label>
                  <p className="text-lg font-medium">{profile.toefl || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">SAT</Label>
                  <p className="text-lg font-medium">{profile.sat || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">AP</Label>
                  <p className="text-lg font-medium">{profile.ap || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">기타 외부 성적</Label>
                  <p className="text-lg font-medium">{profile.other_scores || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">내신</Label>
                  <p className="text-lg font-medium">{profile.gpa || '-'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-sm">가장 자신있는 과목</Label>
                  <p className="text-lg font-medium">{profile.best_subject || '-'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>하고싶은말</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{profile.bio || '-'}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
