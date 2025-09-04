'use client'

import { useState } from 'react'
import { Mic, Send, Check, AlertCircle, Loader2 } from 'lucide-react'

interface ConfirmationOptions {
  project?: Array<{ id: string; name: string }>
  assignee?: Array<{ id: string; name: string; email?: string | null }>
  section?: Array<{ id: string; name: string }>
}

interface SuccessData {
  task_id: string
  task_url: string
  project_name: string
  assignee_name?: string
  title: string
}

export default function Home() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<SuccessData | null>(null)
  const [confirmationNeeded, setConfirmationNeeded] = useState<ConfirmationOptions | null>(null)
  const [confirmedIds, setConfirmedIds] = useState<{
    project_id?: string
    assignee_id?: string
    section_id?: string
  }>({})

  const handleSubmit = async (retryWithConfirmed = false) => {
    if (!text.trim() && !retryWithConfirmed) return

    console.log('📝 Frontend: Submitting request:', { text, retryWithConfirmed, confirmedIds })

    setLoading(true)
    setError(null)
    setSuccess(null)
    if (!retryWithConfirmed) {
      setConfirmationNeeded(null)
      setConfirmedIds({})
    }

    try {
      const requestBody = {
        text,
        ...(retryWithConfirmed && { confirmed_ids: confirmedIds }),
      }
      console.log('🚀 Frontend: Sending to /api/ingest-opus:', requestBody)

      const response = await fetch('/api/ingest-opus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INGEST_BEARER_TOKEN || 'dev-token'}`,
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      console.log('📨 Frontend: Received response:', { 
        status: response.status, 
        ok: data.ok,
        data 
      })

      if (data.ok) {
        console.log('✅ Frontend: Task created successfully!')
        setSuccess(data)
        setText('')
        setConfirmationNeeded(null)
        setConfirmedIds({})
      } else if (data.needs_confirmation) {
        console.log('⚠️ Frontend: Confirmation needed:', data.options)
        setConfirmationNeeded(data.options)
      } else {
        console.error('❌ Frontend: Error:', data.error, data.details)
        setError(data.error || 'Something went wrong')
      }
    } catch (err) {
      console.error('❌ Frontend: Request failed:', err)
      setError('Failed to process request')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmation = (type: 'project' | 'assignee' | 'section', id: string) => {
    setConfirmedIds(prev => ({
      ...prev,
      [`${type}_id`]: id,
    }))
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Asana Operator</h1>
              <p className="text-gray-600">Create tasks with natural language</p>
            </div>
            <a
              href="/meeting-processor"
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
            >
              Process Meeting Transcript →
            </a>
          </div>

          {/* Input Section */}
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='Try: "Create a task in Onboarding Ops for Janelle to update the SOP for client upgrades"'
                className="w-full min-h-[120px] p-4 pr-12 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={loading || !text.trim()}
                className="absolute bottom-4 right-4 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Voice input hint */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Mic className="w-4 h-4" />
              <span>Tip: Use iOS Shortcuts to dictate and send tasks</span>
            </div>
          </div>

          {/* Confirmation Section */}
          {confirmationNeeded && (
            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="font-medium text-amber-900 mb-3">Please confirm:</h3>
              
              {confirmationNeeded.project && (
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">Select project:</p>
                  <div className="flex flex-wrap gap-2">
                    {confirmationNeeded.project.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleConfirmation('project', p.id)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          confirmedIds.project_id === p.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {confirmationNeeded.assignee && (
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">Select assignee:</p>
                  <div className="flex flex-wrap gap-2">
                    {confirmationNeeded.assignee.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleConfirmation('assignee', u.id)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          confirmedIds.assignee_id === u.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        {u.name}
                        {u.email && <span className="text-xs opacity-75 ml-1">({u.email})</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {confirmationNeeded.section && (
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">Select section:</p>
                  <div className="flex flex-wrap gap-2">
                    {confirmationNeeded.section.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleConfirmation('section', s.id)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          confirmedIds.section_id === s.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirm and Create Task
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-green-800 font-medium mb-2">Task created successfully!</p>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p><span className="font-medium">Title:</span> {success.title}</p>
                    <p><span className="font-medium">Project:</span> {success.project_name}</p>
                    {success.assignee_name && (
                      <p><span className="font-medium">Assignee:</span> {success.assignee_name}</p>
                    )}
                  </div>
                  <a
                    href={success.task_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    View in Asana →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}