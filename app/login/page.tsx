'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { LanguageSelector } from '@/components/language-selector'
import { supabaseBrowser } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    setTimeout(async () => {
      try {
        const supabase = supabaseBrowser()
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
        alert(t('loginFailed') + ': ' + error.message)
        return
      }

        router.push('/home')
      } finally {
        setIsLoading(false)
      }
    }, 500)
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
          <CardTitle className="text-2xl font-bold">KGSCP {t('login')}</CardTitle>
          <CardDescription>
            {t('welcomeToKGSCP')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {isLoading ? t('loggingIn') : t('loginButton')}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              {t('noAccount')}{' '}
              <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium">
                {t('signup')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
