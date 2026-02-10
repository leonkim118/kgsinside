import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const getSupabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }
  return { url, anonKey }
}

export const supabaseBrowser = (): SupabaseClient => {
  const { url, anonKey } = getSupabaseEnv()
  return createClient(url, anonKey)
}

export const supabaseWithAuth = (accessToken?: string): SupabaseClient => {
  const { url, anonKey } = getSupabaseEnv()
  return createClient(url, anonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  })
}

