'use client'

import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase'
import { useCallback } from 'react'

export type Profile = {
  id: string
  username: string | null
  name: string
  grade: number | null
  class_number: string | null
  bio: string | null
  interests: string[] | null
  mbti: string | null
  toefl: string | null
  sat: string | null
  ap: string | null
  other_scores: string | null
  gpa: string | null
  best_subject: string | null
}

export function useMyProfile() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (sessionUser: User | null) => {
      setError(null)
      setUser(sessionUser)

      if (!sessionUser) {
        setProfile(null)
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, username, name, grade, class_number, bio, interests, mbti, toefl, sat, ap, other_scores, gpa, best_subject'
        )
        .eq('id', sessionUser.id)
        .maybeSingle()

      if (error) {
        setProfile(null)
        setError(error.message)
      } else if (!data) {
        const fallbackName =
          (sessionUser.user_metadata?.name as string | undefined) ||
          sessionUser.email ||
          'User'
        const fallbackUsername = sessionUser.user_metadata?.username as string | undefined

        const { error: insertError } = await supabase.from('profiles').insert({
          id: sessionUser.id,
          name: fallbackName,
          username: fallbackUsername ?? null,
        })

        if (insertError) {
          setProfile(null)
          setError(insertError.message)
        } else {
          const { data: retryData } = await supabase
            .from('profiles')
            .select(
              'id, username, name, grade, class_number, bio, interests, mbti, toefl, sat, ap, other_scores, gpa, best_subject'
            )
            .eq('id', sessionUser.id)
            .maybeSingle()
          setProfile((retryData as Profile) || null)
        }
      } else {
        setProfile((data as Profile) || null)
      }
      setIsLoading(false)
    },
    [supabase]
  )

  useEffect(() => {
    let isActive = true

    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!isActive) return
      await load(data.session?.user ?? null)
    })()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Re-load profile when session changes.
      load(session?.user ?? null)
    })

    return () => {
      isActive = false
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refresh = async () => {
    const { data } = await supabase.auth.getSession()
    await load(data.session?.user ?? null)
  }

  return { isLoading, user, profile, error, signOut, refresh, supabase }
}
