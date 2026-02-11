'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function MessagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border bg-white dark:bg-gray-900 p-6 space-y-4">
        <h1 className="text-xl font-bold">쪽지 페이지 오류</h1>
        <p className="text-sm text-muted-foreground">
          쪽지 기능 로딩 중 예외가 발생했습니다.
        </p>
        <p className="text-xs text-muted-foreground break-all">
          {error.message}
        </p>
        <div className="flex gap-2">
          <Button onClick={reset}>다시 시도</Button>
          <Button variant="outline" asChild>
            <Link href="/home">홈으로</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
