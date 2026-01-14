'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [founders, setFounders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFounders() {
      try {
        const { data, error } = await supabase
          .from('founders')
          .select('*')
          .limit(10)

        if (error) throw error
        setFounders(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFounders()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Supabase Connection Test</h1>
      <p className="mb-4 text-green-600">✅ Connected successfully!</p>
      
      <h2 className="text-xl font-semibold mb-2">Sample Founders:</h2>
      <div className="space-y-2">
        {founders.map((founder) => (
          <div key={founder.id} className="p-4 border rounded">
            <p className="font-bold">{founder.name}</p>
            <p className="text-gray-600">{founder.company} - {founder.batch}</p>
          </div>
        ))}
      </div>
    </div>
  )
}