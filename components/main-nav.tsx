'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageSquare, Users, User, Menu, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useLanguage } from '@/lib/language-context'
import { LanguageSelector } from '@/components/language-selector'
import { useMyProfile } from '@/hooks/use-my-profile'
import { useRouter } from 'next/navigation'

export function MainNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const { profile, signOut } = useMyProfile()

  const navigation = [
    { name: t('home'), href: '/home', icon: Home },
    { name: t('boards'), href: '/boards', icon: MessageSquare },
    { name: t('directory'), href: '/directory', icon: Users },
    { name: t('messages'), href: '/messages', icon: MessageSquare },
    { name: t('myInfo'), href: '/profile', icon: User },
    { name: t('settings'), href: '/settings', icon: Settings },
  ]

  const userInitial = profile?.name?.charAt(0).toUpperCase() || 'U'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/home" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold">K</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">KGSCP</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn('gap-2', isActive && 'bg-indigo-100 dark:bg-indigo-950')}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-indigo-600 text-white">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">{t('myInfo')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/messages">{t('messages')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">{t('settings')}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut()
                  router.push('/login')
                }}
                className="text-red-600"
              >
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-2 mt-8">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        className={cn('w-full justify-start gap-2', isActive && 'bg-indigo-100 dark:bg-indigo-950')}
                      >
                        <Icon className="h-4 w-4" />
                        {item.name}
                      </Button>
                    </Link>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
