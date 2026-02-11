'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { LanguageSelector } from '@/components/language-selector'
import { supabaseBrowser } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    grade: '',
    classNumber: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      alert(t('passwordMismatch'))
      return
    }

    setIsLoading(true)

    try {
      const supabase = supabaseBrowser()
      const parsedGrade = formData.grade ? parseInt(formData.grade, 10) : null
      const classNumber = formData.classNumber.trim() || null
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            name: formData.name.trim(),
            username: formData.username.trim() || null,
            grade: parsedGrade,
            class_number: classNumber,
          },
        },
      })

      if (error) {
        alert(t('signupFailed') + ': ' + error.message)
        return
      }

      const userId = data.user?.id
      if (userId && data.session) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: userId,
            username: formData.username.trim() || null,
            name: formData.name.trim(),
            grade: parsedGrade,
            class_number: classNumber,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

        if (profileError) {
          alert(t('profileCreateFailed') + ': ' + profileError.message)
          return
        }
      }

      if (data.session) {
        alert(t('signupSuccess'))
        router.push('/home')
      } else {
        alert(t('signupCheckEmail'))
        router.push('/login')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="fixed top-4 right-4">
        <LanguageSelector />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">K</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t('signup')}</CardTitle>
          <CardDescription>
            {t('joinCommunity')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">{t('username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder="student123 (display handle)"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">{t('grade')}</Label>
                <Select
                  value={formData.grade}
                  onValueChange={(value) => setFormData({ ...formData, grade: value })}
                  required
                >
                  <SelectTrigger id="grade">
                    <SelectValue placeholder={t('selectGrade')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                      <SelectItem key={grade} value={grade.toString()}>
                        G{grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="classNumber">반 번호</Label>
                <Input
                  id="classNumber"
                  type="text"
                  placeholder="예: 1반"
                  value={formData.classNumber}
                  onChange={(e) => setFormData({ ...formData, classNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700" 
              disabled={isLoading}
            >
              {isLoading ? t('signingUp') : t('signupButton')}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              {t('alreadyHaveAccount')}{' '}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium">
                {t('login')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
