'use client'

import { useEffect, useState } from 'react'
import { MainNav } from '@/components/main-nav'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Heart, Key, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useMyProfile } from '@/hooks/use-my-profile'
import { useLanguage } from '@/lib/language-context'

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { profile, user, isLoading, refresh, supabase } = useMyProfile()
  const [interests, setInterests] = useState<string[]>([])
  const [newInterest, setNewInterest] = useState('')
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/login')
      return
    }
    setInterests(profile?.interests || [])
  }, [router, isLoading, profile])

  if (isLoading) {
    return null
  }

  if (!profile || !user) {
    return null
  }

  const handleAddInterest = async () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      const updatedInterests = [...interests, newInterest.trim()]
      setInterests(updatedInterests)

      const { error } = await supabase
        .from('profiles')
        .update({ interests: updatedInterests, updated_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (error) {
        alert(error.message)
        return
      }

      await refresh()
      setNewInterest('')
      alert('관심목록이 업데이트되었습니다')
    }
  }

  const handleRemoveInterest = async (interest: string) => {
    const updatedInterests = interests.filter((i) => i !== interest)
    setInterests(updatedInterests)

    const { error } = await supabase
      .from('profiles')
      .update({ interests: updatedInterests, updated_at: new Date().toISOString() })
      .eq('id', profile.id)

    if (error) {
      alert(error.message)
      return
    }
    await refresh()
  }

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('새 비밀번호가 일치하지 않습니다')
      return
    }
    
    if (passwordData.new.length < 6) {
      alert('비밀번호는 최소 6자 이상이어야 합니다')
      return
    }

    if (!user.email) {
      alert('이메일 정보를 찾을 수 없습니다')
      return
    }

    // Re-authenticate for better security (Supabase may require it depending on settings).
    const reauth = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwordData.current,
    })

    if (reauth.error) {
      alert('현재 비밀번호가 일치하지 않습니다')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: passwordData.new })
    if (error) {
      alert(error.message)
      return
    }
    
    setPasswordData({ current: '', new: '', confirm: '' })
    alert('비밀번호가 변경되었습니다')
  }

  const handleDeleteAccount = () => {
    alert('회원 탈퇴(계정 삭제)는 아직 지원하지 않습니다. 관리자용(서비스 키) 서버 기능이 필요해요.')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNav />
      
      <main className="container py-6 max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t('settings')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('manageSettings')}
          </p>
        </div>

        <div className="space-y-6">
          {/* Interests */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-indigo-600" />
                <CardTitle>관심목록</CardTitle>
              </div>
              <CardDescription>관심 있는 주제나 활동을 추가하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddInterest()
                    }
                  }}
                  placeholder="관심사 추가 (예: 농구, 수학)"
                />
                <Button onClick={handleAddInterest} className="bg-indigo-600 hover:bg-indigo-700">
                  추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="text-sm cursor-pointer hover:bg-red-100 dark:hover:bg-red-950"
                    onClick={() => handleRemoveInterest(interest)}
                  >
                    {interest} ×
                  </Badge>
                ))}
                {interests.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    관심사를 추가해보세요
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-indigo-600" />
                <CardTitle>비밀번호 변경</CardTitle>
              </div>
              <CardDescription>새로운 비밀번호를 설정하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>현재 비밀번호</Label>
                <Input
                  type="password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>새 비밀번호</Label>
                <Input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>새 비밀번호 확인</Label>
                <Input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <Button onClick={handleChangePassword} className="w-full bg-indigo-600 hover:bg-indigo-700">
                비밀번호 변경
              </Button>
            </CardContent>
          </Card>

          {/* Delete Account */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-600">위험 영역</CardTitle>
              </div>
              <CardDescription>계정 삭제는 되돌릴 수 없습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    회원 탈퇴
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>정말 탈퇴하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 작업은 되돌릴 수 없습니다. 모든 데이터가 영구적으로 삭제됩니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                      탈퇴하기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
