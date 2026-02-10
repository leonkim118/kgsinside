'use client'

import { useEffect, useState } from 'react'
import { MainNav } from '@/components/main-nav'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, Send, Check, X, Clock, MessageSquare } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { readJSON, writeJSON } from '@/lib/storage'
import { useMyProfile } from '@/hooks/use-my-profile'

interface IncomingMessage {
  id: string
  senderId: string
  senderName: string
  type: string
  content: string
  timestamp: string
  status: 'pending' | 'accepted' | 'rejected' | 'on-hold'
}

interface OutgoingMessage {
  id: string
  receiverId: string
  receiverName: string
  type: string
  content: string
  timestamp: string
  status: 'pending' | 'accepted' | 'rejected' | 'on-hold'
}

interface ChatRoom {
  id: string
  partnerId: string
  partnerName: string
  participants: string[]
  messages: ChatMessage[]
  createdAt: string
  messageType: string
}

interface ChatMessage {
  id: string
  senderId: string
  content: string
  timestamp: string
}

export default function MessagesPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('send')
  const { profile, isLoading: isAuthLoading } = useMyProfile()
  
  // Send message form
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [messageType, setMessageType] = useState('')
  const [messageContent, setMessageContent] = useState('')
  
  // Messages
  const [incomingMessages, setIncomingMessages] = useState<IncomingMessage[]>([])
  const [outgoingMessages, setOutgoingMessages] = useState<OutgoingMessage[]>([])
  const [onHoldMessages, setOnHoldMessages] = useState<IncomingMessage[]>([])
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [selectedChatRoom, setSelectedChatRoom] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')

  useEffect(() => {
    if (isAuthLoading) return
    if (!profile) {
      router.push('/login')
      return
    }
    
    const allMessages = readJSON<any[]>('kgscp_all_messages', [])
    const safeMessages = Array.isArray(allMessages) ? allMessages : []
    
    // Incoming: messages sent TO current user
    const incoming = safeMessages.filter((msg: any) => 
      msg.receiverId === profile.id && msg.status === 'pending'
    )
    
    // Outgoing: messages sent FROM current user
    const outgoing = safeMessages.filter((msg: any) => 
      msg.senderId === profile.id
    )
    
    // On-hold: messages current user put on hold
    const onHold = safeMessages.filter((msg: any) => 
      msg.receiverId === profile.id && msg.status === 'on-hold'
    )
    
    setIncomingMessages(incoming)
    setOutgoingMessages(outgoing)
    setOnHoldMessages(onHold)
    
    // Load chat rooms for current user
    const rooms = readJSON<any[]>('kgscp_chat_rooms', [])
    const safeRooms = Array.isArray(rooms) ? rooms : []
    const myRooms = safeRooms.filter((room: any) => 
      room.participants.includes(profile.id)
    )
    setChatRooms(myRooms)
  }, [router, isAuthLoading, profile])

  if (isAuthLoading) {
    return null
  }

  if (!profile) {
    return null
  }

  const registeredUsers = readJSON<any[]>('kgscp_registered_users', [])
  const safeRegisteredUsers = Array.isArray(registeredUsers) ? registeredUsers : []
  const gradeStudents = selectedGrade 
    ? safeRegisteredUsers.filter((s: any) => s.grade.toString() === selectedGrade && s.id !== profile.id)
    : []

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStudents.length || !messageType || !messageContent.trim()) {
      alert(t('fillAllFields'))
      return
    }

    const allMessages = readJSON<any[]>('kgscp_all_messages', [])
    const updatedMessages = Array.isArray(allMessages) ? [...allMessages] : []

    selectedStudents.forEach(studentId => {
      const student = safeRegisteredUsers.find((s: any) => s.id === studentId)
      if (!student) return

      const newMessage = {
        id: 'msg-' + Date.now() + '-' + studentId,
        senderId: profile.id,
        senderName: profile.name,
        receiverId: studentId,
        receiverName: student.name,
        type: messageType,
        content: messageContent,
        timestamp: new Date().toISOString(),
        status: 'pending'
      }

      updatedMessages.push(newMessage)
    })
    
    writeJSON('kgscp_all_messages', updatedMessages)

    // Update outgoing messages for current user
    const myOutgoing = updatedMessages.filter((msg: any) => msg.senderId === profile.id)
    setOutgoingMessages(myOutgoing)

    alert(t('messageSent'))
    setSelectedGrade('')
    setSelectedStudents([])
    setMessageType('')
    setMessageContent('')
  }

  const handleAcceptMessage = (messageId: string) => {
    const allMessages = readJSON<any[]>('kgscp_all_messages', [])
    const safeMessages = Array.isArray(allMessages) ? [...allMessages] : []
    const messageIndex = safeMessages.findIndex((m: any) => m.id === messageId)
    if (messageIndex === -1) return
    
    const message = safeMessages[messageIndex]

    safeMessages[messageIndex] = { ...message, status: 'accepted' }
    writeJSON('kgscp_all_messages', safeMessages)

    // Update local state
    const updatedIncoming = incomingMessages.filter(m => m.id !== messageId)
    setIncomingMessages(updatedIncoming)

    const newRoom: ChatRoom = {
      id: 'room-' + Date.now(),
      partnerId: message.senderId,
      partnerName: message.senderName,
      messageType: message.type, // Store message type
      participants: [profile.id, message.senderId],
      messages: [],
      createdAt: new Date().toISOString()
    }

    const rooms = readJSON<any[]>('kgscp_chat_rooms', [])
    const updatedRooms = Array.isArray(rooms) ? [...rooms, newRoom] : [newRoom]
    writeJSON('kgscp_chat_rooms', updatedRooms)
    setChatRooms(updatedRooms)

    alert(t('messageAccepted'))
  }

  const handleRejectMessage = (messageId: string) => {
    if (!confirm(t('confirmReject'))) return

    const allMessages = readJSON<any[]>('kgscp_all_messages', [])
    const safeMessages = Array.isArray(allMessages) ? [...allMessages] : []
    const messageIndex = safeMessages.findIndex((m: any) => m.id === messageId)
    if (messageIndex !== -1) {
      safeMessages[messageIndex] = { ...safeMessages[messageIndex], status: 'rejected' }
      writeJSON('kgscp_all_messages', safeMessages)
    }

    const updatedIncoming = incomingMessages.filter(m => m.id !== messageId)
    setIncomingMessages(updatedIncoming)

    alert(t('messageRejected'))
  }

  const handleHoldMessage = (messageId: string) => {
    const allMessages = readJSON<any[]>('kgscp_all_messages', [])
    const safeMessages = Array.isArray(allMessages) ? [...allMessages] : []
    const messageIndex = safeMessages.findIndex((m: any) => m.id === messageId)
    if (messageIndex === -1) return
    
    safeMessages[messageIndex] = { ...safeMessages[messageIndex], status: 'on-hold' }
    writeJSON('kgscp_all_messages', safeMessages)

    const message = incomingMessages.find(m => m.id === messageId)
    if (message) {
      const updatedMessage = { ...message, status: 'on-hold' as const }
      setOnHoldMessages([...onHoldMessages, updatedMessage])
    }

    const updatedIncoming = incomingMessages.filter(m => m.id !== messageId)
    setIncomingMessages(updatedIncoming)

    alert(t('messagePending'))
  }

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !selectedChatRoom) return

    const newChatMessage: ChatMessage = {
      id: 'chat-' + Date.now(),
      senderId: profile.id,
      content: chatInput,
      timestamp: new Date().toISOString()
    }

    const updatedRooms = chatRooms.map(room => {
      if (room.id === selectedChatRoom) {
        return {
          ...room,
          messages: [...room.messages, newChatMessage]
        }
      }
      return room
    })

    setChatRooms(updatedRooms)
    writeJSON('kgscp_chat_rooms', updatedRooms)
    setChatInput('')
  }

  const currentChatRoom = chatRooms.find(r => r.id === selectedChatRoom)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    return date.toLocaleDateString('ko-KR')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNav />
      
      <main className="container mx-auto py-6 max-w-7xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t('messages')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('sendAnonymousMessages')}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Send Message Form */}
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
                      gradeStudents.map((student: any) => (
                        <div key={student.id} className="flex items-center gap-2 p-2">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents([...selectedStudents, student.id])
                              } else {
                                setSelectedStudents(selectedStudents.filter(id => id !== student.id))
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
                      {selectedStudents.length}{t('selected')}
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

          {/* Message Lists and Chat Rooms */}
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
                            <p className="font-semibold">{t('to')}: {msg.receiverName}</p>
                            <Badge variant="outline" className="mt-1">{msg.type}</Badge>
                          </div>
                          <Badge 
                            variant={
                              msg.status === 'accepted' ? 'default' :
                              msg.status === 'rejected' ? 'destructive' :
                              msg.status === 'on-hold' ? 'secondary' : 'outline'
                            }
                          >
                            {msg.status === 'accepted' ? t('accepted') :
                             msg.status === 'rejected' ? t('rejected') :
                             msg.status === 'on-hold' ? t('onHold') : t('pending')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{msg.content}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(msg.timestamp)}</p>
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
                            <p className="font-semibold">{t('from')}: {t('anonymous')}</p>
                            <Badge variant="outline" className="mt-1">{msg.type}</Badge>
                          </div>
                        </div>
                        <p className="text-sm mb-3">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mb-3">{formatDate(msg.timestamp)}</p>
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
                            <p className="font-semibold">{t('from')}: {t('anonymous')}</p>
                            <Badge variant="outline" className="mt-1">{msg.type}</Badge>
                          </div>
                        </div>
                        <p className="text-sm mb-3">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mb-3">{formatDate(msg.timestamp)}</p>
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
                        {chatRooms.length > 0 ? (
                          <div className="space-y-2">
                            {chatRooms.map((room) => (
                              <Button
                                key={room.id}
                                variant={selectedChatRoom === room.id ? "secondary" : "ghost"}
                                className="w-full justify-start flex-col items-start h-auto py-2"
                                onClick={() => setSelectedChatRoom(room.id)}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <MessageSquare className="h-4 w-4" />
                                  <span className="font-medium">{room.partnerName}</span>
                                </div>
                                <span className="text-xs text-muted-foreground ml-6">
                                  {room.messageType}
                                </span>
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
                    {currentChatRoom ? (
                      <>
                        <CardHeader>
                          <CardTitle className="text-base">{currentChatRoom.partnerName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-80 mb-4 p-4 border rounded-md">
                            <div className="space-y-3">
                              {currentChatRoom.messages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={cn(
                                    'flex',
                                    msg.senderId === profile.id ? 'justify-end' : 'justify-start'
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'max-w-[70%] rounded-lg px-3 py-2',
                                      msg.senderId === profile.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800'
                                    )}
                                  >
                                    <p className="text-sm">{msg.content}</p>
                                  </div>
                                </div>
                              ))}
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
