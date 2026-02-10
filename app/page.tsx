'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'

export default function IndexPage() {
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      const supabase = supabaseBrowser()
      const { data } = await supabase.auth.getSession()
      router.replace(data.session ? '/home' : '/login')
    })()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-indigo-600">KGSCP</h1>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
