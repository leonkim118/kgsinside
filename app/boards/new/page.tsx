'use client'

import { useEffect, useState } from 'react'
import { MainNav } from '@/components/main-nav'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Upload, X, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useMyProfile } from '@/hooks/use-my-profile'

const categories = ['동아리', '학교 과제', '교과목', '교내 대회', '멘토 멘티', '기타']

export default function NewPostPage() {
  const router = useRouter()
  const { profile, isLoading, supabase } = useMyProfile()
  const [files, setFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
    isAnonymous: false,
  })

  useEffect(() => {
    if (!isLoading && !profile) router.push('/login')
  }, [router, isLoading, profile])

  if (isLoading) {
    return null
  }

  if (!profile) {
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.category || !formData.title.trim() || !formData.content.trim()) {
      alert('카테고리, 제목, 내용을 모두 입력해주세요')
      return
    }

    ;(async () => {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          author_id: profile.id,
          title: formData.title,
          content: formData.content,
          category: formData.category,
          is_anonymous: formData.isAnonymous,
        })
        .select('id')
        .single()

      if (error) {
        alert(error.message)
        return
      }

      // TODO: files upload to Supabase Storage
      router.push(`/boards/${data.id}`)
    })()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNav />
      
      <main className="container mx-auto py-6 max-w-3xl px-4">
        <Button variant="ghost" className="mb-4" asChild>
          <Link href="/boards">
            <ChevronLeft className="h-4 w-4 mr-2" />
            취소
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>새 게시글 작성</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category">카테고리 *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="카테고리를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  placeholder="게시글 제목을 입력하세요"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">내용 *</Label>
                <Textarea
                  id="content"
                  placeholder="내용을 입력하세요..."
                  className="min-h-64"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={formData.isAnonymous}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, isAnonymous: checked as boolean })
                  }
                />
                <Label 
                  htmlFor="anonymous" 
                  className="text-sm font-normal cursor-pointer"
                >
                  익명으로 작성하기
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="files">파일 업로드 (선택)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    id="files"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="files" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      클릭하여 파일을 선택하세요
                    </p>
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/boards">취소</Link>
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  게시글 올리기
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </main>
    </div>
  )
}
