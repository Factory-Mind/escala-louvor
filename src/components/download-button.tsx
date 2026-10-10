'use client'

import { useState } from 'react'
import { Download, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

function fileNameFrom(header: string | null, fallback: string) {
  const match = header?.match(/filename="?([^";]+)"?/i)
  return match?.[1] ?? fallback
}

export function DownloadButton({ year, month }: { year: number; month: number }) {
  const [pending, setPending] = useState(false)

  const download = async () => {
    setPending(true)

    try {
      const response = await fetch(`/api/export?year=${year}&month=${month}&format=xlsx`)
      if (!response.ok) throw new Error()

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileNameFrom(
        response.headers.get('Content-Disposition'),
        `escala-louvor-${year}-${String(month).padStart(2, '0')}.xlsx`,
      )
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Não foi possível baixar a planilha.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      size="lg"
      variant="outline"
      className="bg-card"
      onClick={download}
      disabled={pending}
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <Download />}
      {pending ? 'Baixando…' : 'Baixar .xlsx'}
    </Button>
  )
}
