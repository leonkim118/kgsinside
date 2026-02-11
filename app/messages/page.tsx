'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MainNav } from '@/components/main-nav'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Send, Check, X, Clock, MessageSquare } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { useMyProfile } from '@/hooks/use-my-profile'

type MessageStatus = 'pending' | 'accepted' | 'rejected' | 'on_hold'

interface MessageRow {
  id: string
  sender_id: string
  receiver_id: string
  type: string
  content: string
  status: MessageStatus
  created_at: string
}

interface StudentOption {
  id: string
  name: string
  grade: number | null
}

const normalizeStatus = (value: unknown): MessageStatus => {
  if (value === 'accepted' || value === 'rejected' || value === 'on_hold' || value === 'pending') {
    return value
  }
  return 'pending'
}

const normalizeStudents = (rows: unknown): StudentOption[] => {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => {
      const record = row as Partial<StudentOption>
      if (!record.id || typeof record.name !== 'string') return null
      return {
        id: record.id,
        name: record.name || 'Unknown',
        grade: typeof record.grade === 'number' ? record.grade : null,
      }
    })
    .filter((row): row is StudentOption => row !== null)
}

const normalizeMessages = (rows: unknown): MessageRow[] => {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => {
      const record = row as Partial<MessageRow>
      if (!record.id || !record.sender_id || !record.receiver_id) return null
      return {
        id: record.id,
        sender_id: record.sender_id,
        receiver_id: record.receiver_id,
        type: typeof record.type === 'string' ? record.type : '메시지',
        content: typeof record.content === 'string' ? record.content : '',
        status: normalizeStatus(record.status),
        created_at: typeof record.created_at === 'string' ? record.created_at : new Date().toISOString(),
      }
    })
    .filter((row): row is MessageRow => row !== null)
}

export default function MessagesPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { profile, isLoading: isAuthLoading, supabase } = useMyProfile()

  const [activeTab, setActiveTab] = useState('send')
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [messageType, setMessageType] = useState('')
  const [messageContent, setMessageContent] = useState('')

  const [students, setStudents] = useState<StudentOption[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])

  const [selectedChatPartner, setSelectedChatPartner] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')

  const loadPageData = useCallback(async () => {
    if (!profile) return

    setIsDataLoading(true)
    setLoadError(null)

    try {
      const [{ data: profileRows, error: profileError }, { data: messageRows, error: messageError }] =
        await Promise.all([
          supabase.from('profiles').select('id, name, grade').order('name', { ascending: true }),
          supabase
            .from('messages')
            .select('id, sender_id, receiver_id, type, content, status, created_at')
            .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
            .order('created_at', { ascending: false }),
        ])

      if (profileError || messageError) {
        setStudents([])
        setMessages([])
        setLoadError(profileError?.message || messageError?.message || '알 수 없는 오류')
        setIsDataLoading(false)
        return
      }

      const safeProfiles = normalizeStudents(profileRows).filter((s) => s.id !== profile.id)
      const safeMessages = normalizeMessages(messageRows)
      setStudents(safeProfiles)
      setMessages(safeMessages)
      setIsDataLoading(false)
    } catch (error) {
      setStudents([])
      setMessages([])
      setLoadError(error instanceof Error ? error.message : '알 수 없는 오류')
      setIsDataLoading(false)
    }
  }, [profile, supabase])

  useEffect(() => {
    if (isAuthLoading) return
    if (!profile) {
      router.push('/login')
      return
    }
    void loadPageData()
  }, [router, isAuthLoading, profile, loadPageData])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const toId = new URLSearchParams(window.location.search).get('to')
    if (!toId || selectedStudents.length > 0) return
    const receiver = students.find((student) => student.id === toId)
    if (!receiver) return

    setSelectedStudents([toId])
    setActiveTab('send')
    if (typeof receiver.grade === 'number') {
      setSelectedGrade(receiver.grade.toString())
    }
  }, [students, selectedStudents.length])

  if (isAuthLoading) {
    return null
  }

  if (!profile) {
    return null
  }

  const studentNameMap = useMemo(() => {
    const map = new Map<string, string>()
    map.set(profile.id, profile.name)
    students.forEach((student) => map.set(student.id, student.name))
    return map
  }, [profile, students])

  const gradeStudents = selectedGrade
    ? students.filter((s) => typeof s.grade === 'number' && s.grade.toString() === selectedGrade)
    : []

  const incomingMessages = messages.filter(
    (msg) => msg.receiver_id === profile.id && msg.status === 'pending'
  )
  const outgoingMessages = messages.filter((msg) => msg.sender_id === profile.id)
  const onHoldMessages = messages.filter(
    (msg) => msg.receiver_id === profile.id && msg.status === 'on_hold'
  )

  const chatPartnerIds = useMemo(() => {
    const ids: string[] = []
    const seen = new Set<string>()
    for (const msg of messages) {
      if (msg.status !== 'accepted') continue
      if (msg.sender_id !== profile.id && msg.receiver_id !== profile.id) continue
      const partnerId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id
      if (!seen.has(partnerId)) {
        seen.add(partnerId)
        ids.push(partnerId)
      }
    }
    return ids
  }, [messages, profile.id])

  const currentChatMessages = useMemo(() => {
    if (!selectedChatPartner) return []
    return messages
      .filter((msg) => {
        if (msg.status !== 'accepted') return false
        const mineToPartner = msg.sender_id === profile.id && msg.receiver_id === selectedChatPartner
        const partnerToMine = msg.sender_id === selectedChatPartner && msg.receiver_id === profile.id
        return mineToPartner || partnerToMine
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [messages, profile.id, selectedChatPartner])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    return date.toLocaleDateString('ko-KR')
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStudents.length || !messageType || !messageContent.trim()) {
      alert(t('fillAllFields'))
      return
    }

    const payload = selectedStudents.map((receiverId) => ({
      sender_id: profile.id,
      receiver_id: receiverId,
      type: messageType,
      content: messageContent.trim(),
      status: 'pending' as const,
    }))

    const { error } = await supabase.from('messages').insert(payload)
    if (error) {
      alert(error.message)
      return
    }

    setSelectedGrade('')
    setSelectedStudents([])
    setMessageType('')
    setMessageContent('')
    await loadPageData()
    alert(t('messageSent'))
  }

  const updateMessageStatus = async (messageId: string, nextStatus: MessageStatus) => {
    const { error } = await supabase
      .from('messages')
      .update({ status: nextStatus })
      .eq('id', messageId)
      .eq('receiver_id', profile.id)
    if (error) {
      alert(error.message)
      return false
    }
    await loadPageData()
    return true
  }

  const handleAcceptMessage = async (messageId: string) => {
    const target = incomingMessages.find((msg) => msg.id === messageId)
    const success = await updateMessageStatus(messageId, 'accepted')
    if (!success) return
    if (target) {
      setSelectedChatPartner(target.sender_id)
      setActiveTab('chat')
    }
    alert(t('messageAccepted'))
  }

  const handleRejectMessage = async (messageId: string) => {
    if (!confirm(t('confirmReject'))) return
    const success = await updateMessageStatus(messageId, 'rejected')
    if (!success) return
    alert(t('messageRejected'))
  }

  const handleHoldMessage = async (messageId: string) => {
    const success = await updateMessageStatus(messageId, 'on_hold')
    if (!success) return
    alert(t('messagePending'))
  }

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChatPartner || !chatInput.trim()) return

    const { error } = await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: selectedChatPartner,
      type: '채팅',
      content: chatInput.trim(),
      status: 'accepted',
    })

    if (error) {
      alert(error.message)
      return
    }

    setChatInput('')
    await loadPageData()
  }

  const statusLabel = (status: MessageStatus) => {
    if (status === 'accepted') return t('accepted')
    if (status === 'rejected') return t('rejected')
    if (status === 'on_hold') return t('onHold')
    return t('pending')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNav />

      <main className="container mx-auto py-6 max-w-7xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t('messages')}</h1>
          <p className="text-muted-foreground mt-1">{t('sendAnonymousMessages')}</p>
        </div>

        {isDataLoading && (
          <Card className="mb-6">
            <CardContent className="py-8 text-center text-muted-foreground">로딩중...</CardContent>
          </Card>
        )}

        {!isDataLoading && loadError && (
          <Card className="mb-6">
            <CardContent className="py-8 text-center text-muted-foreground">
              데이터 로드 실패: {loadError}
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('sendMessage')}</CardTitle>
              <CardDescription>{t('sendAnonymously')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('searchStudent')}</Label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger>
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
                  <Label>{t('receiver')}</Label>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    {gradeStudents.length > 0 ? (
                      gradeStudents.map((student) => (
                        <div key={student.id} className="flex items-center gap-2 p-2">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents((prev) => [...prev, student.id])
                              } else {
                                setSelectedStudents((prev) => prev.filter((id) => id !== student.id))
                              }
                            }}
                          />
                          <span className="text-sm">{student.name}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {selectedGrade ? t('noStudents') : t('selectGrade')}
                      </p>
                    )}
                  </ScrollArea>
                  {selectedStudents.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedStudents.length}
                      {t('selected')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('type')}</Label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="과제 제안">{t('projectProposal')}</SelectItem>
                      <SelectItem value="멘토 멘티">{t('mentorMentee')}</SelectItem>
                      <SelectItem value="교내 대회">{t('schoolContest')}</SelectItem>
                      <SelectItem value="동아리">{t('club')}</SelectItem>
                      <SelectItem value="기타 질문">{t('otherQuestion')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('content')}</Label>
                  <Textarea
                    placeholder={t('enterMessageContent')}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <Send className="h-4 w-4 mr-2" />
                  {t('send')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="send">{t('sentMessages')}</TabsTrigger>
                <TabsTrigger value="receive">{t('receivedMessages')}</TabsTrigger>
                <TabsTrigger value="hold">{t('onHold')}</TabsTrigger>
                <TabsTrigger value="chat">{t('chatRooms')}</TabsTrigger>
              </TabsList>

              <TabsContent value="send" className="space-y-3 mt-4">
                {outgoingMessages.length > 0 ? (
                  outgoingMessages.map((msg) => (
                    <Card key={msg.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">
                              {t('to')}: {studentNameMap.get(msg.receiver_id) || '알 수 없음'}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {msg.type}
                            </Badge>
                          </div>
                          <Badge
                            variant={
                              msg.status === 'accepted'
                                ? 'default'
                                : msg.status === 'rejected'
                                  ? 'destructive'
                                  : msg.status === 'on_hold'
                                    ? 'secondary'
                                    : 'outline'
                            }
                          >
                            {statusLabel(msg.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{msg.content}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      {t('noSentMessages')}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="receive" className="space-y-3 mt-4">
                {incomingMessages.length > 0 ? (
                  incomingMessages.map((msg) => (
                    <Card key={msg.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">
                              {t('from')}: {t('anonymous')}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {msg.type}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm mb-3">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mb-3">{formatDate(msg.created_at)}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAcceptMessage(msg.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {t('accept')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectMessage(msg.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            {t('reject')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleHoldMessage(msg.id)}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            {t('hold')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      {t('noReceivedMessages')}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="hold" className="space-y-3 mt-4">
                {onHoldMessages.length > 0 ? (
                  onHoldMessages.map((msg) => (
                    <Card key={msg.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">
                              {t('from')}: {t('anonymous')}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {msg.type}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm mb-3">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mb-3">{formatDate(msg.created_at)}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAcceptMessage(msg.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {t('accept')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectMessage(msg.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            {t('reject')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      {t('noPendingMessages')}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="chat" className="mt-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="md:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-base">{t('chatRoomList')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-96">
                        {chatPartnerIds.length > 0 ? (
                          <div className="space-y-2">
                            {chatPartnerIds.map((partnerId) => (
                              <Button
                                key={partnerId}
                                variant={selectedChatPartner === partnerId ? 'secondary' : 'ghost'}
                                className="w-full justify-start flex-col items-start h-auto py-2"
                                onClick={() => setSelectedChatPartner(partnerId)}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <MessageSquare className="h-4 w-4" />
                                  <span className="font-medium">
                                    {studentNameMap.get(partnerId) || '알 수 없음'}
                                  </span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            {t('noChatRooms')}
                          </p>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    {selectedChatPartner ? (
                      <>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {studentNameMap.get(selectedChatPartner) || '알 수 없음'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-80 mb-4 p-4 border rounded-md">
                            <div className="space-y-3">
                              {currentChatMessages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={cn(
                                    'flex',
                                    msg.sender_id === profile.id ? 'justify-end' : 'justify-start'
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'max-w-[70%] rounded-lg px-3 py-2',
                                      msg.sender_id === profile.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800'
                                    )}
                                  >
                                    <p className="text-sm">{msg.content}</p>
                                  </div>
                                </div>
                              ))}
                              {currentChatMessages.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  아직 대화가 없습니다
                                </p>
                              )}
                            </div>
                          </ScrollArea>
                          <form onSubmit={handleSendChatMessage} className="flex gap-2">
                            <Input
                              placeholder={t('enterMessage')}
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                            />
                            <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-700">
                              <Send className="h-4 w-4" />
                            </Button>
                          </form>
                        </CardContent>
                      </>
                    ) : (
                      <CardContent className="h-full flex items-center justify-center py-24">
                        <p className="text-muted-foreground">{t('selectChatRoom')}</p>
                      </CardContent>
                    )}
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
