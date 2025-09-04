'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

interface ProcessingResult {
  ok: boolean
  parentTaskId?: string
  parentTaskUrl?: string
  subtaskIds?: string[]
  intelligenceTaskId?: string
  processingTime?: number
  projectName?: string
  message?: string
  errors?: string[]
  error?: string
}

interface Project {
  asana_id: string
  name: string
}

// Hardcoded prospect projects (in production, these would come from an API)
const PROSPECT_PROJECTS: Project[] = [
  { asana_id: "1211174798540700", name: "[PROSPECT] True North" },
  { asana_id: "1211174795834324", name: "[PROSPECT] Family Houston" },
  { asana_id: "1211174795834322", name: "[PROSPECT] Shiloh Treatment Center" },
  { asana_id: "1211174795834328", name: "[PROSPECT] We Fix Brains" },
  { asana_id: "1211174795834326", name: "[PROSPECT] NeuPath Mind Wellness" },
  { asana_id: "1211174798540696", name: "[PROSPECT] Mindcare Solutions" },
  { asana_id: "1211174798540698", name: "[PROSPECT] Wellness Bridge" },
  { asana_id: "1211174798540694", name: "[PROSPECT] Healing Minds Institute" },
  { asana_id: "1211174798540702", name: "[PROSPECT] Serenity Springs" },
  { asana_id: "1211174798540704", name: "[PROSPECT] Phoenix Recovery" },
  { asana_id: "1211174798540706", name: "[PROSPECT] New Horizons Therapy" }
]

export default function MeetingProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [projectId, setProjectId] = useState('')
  const [grainLink, setGrainLink] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf') {
        setSelectedFile(file)
      } else {
        alert('Please upload a PDF file')
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile || !projectId) {
      alert('Please select a PDF file and a project')
      return
    }

    setIsProcessing(true)
    setResult(null)

    const formData = new FormData()
    formData.append('pdf', selectedFile)
    formData.append('projectId', projectId)
    if (grainLink) {
      formData.append('grainLink', grainLink)
    }

    try {
      const response = await fetch('/api/process-transcript', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INGEST_TOKEN || 'test-token-123'}`
        },
        body: formData
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to process transcript'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Meeting Transcript Processor</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PDF Transcript
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                  dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <div className="text-center">
                  {selectedFile ? (
                    <div className="flex items-center justify-center space-x-2">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Drag and drop your PDF here, or{' '}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-blue-600 hover:text-blue-500 font-medium"
                        >
                          browse
                        </button>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Project Selection */}
            <div>
              <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
                Select Prospect Project
              </label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose a project...</option>
                {PROSPECT_PROJECTS.map((project) => (
                  <option key={project.asana_id} value={project.asana_id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Grain Link */}
            <div>
              <label htmlFor="grainLink" className="block text-sm font-medium text-gray-700 mb-2">
                Grain Recording Link (Optional)
              </label>
              <input
                id="grainLink"
                type="url"
                value={grainLink}
                onChange={(e) => setGrainLink(e.target.value)}
                placeholder="https://grain.com/share/recording/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing || !selectedFile || !projectId}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Processing Transcript...
                </span>
              ) : (
                'Process Transcript'
              )}
            </button>
          </form>

          {/* Results */}
          {result && (
            <div className={`mt-8 p-6 rounded-lg ${result.ok ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-start space-x-3">
                {result.ok ? (
                  <CheckCircle className="w-6 h-6 text-green-500 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold ${result.ok ? 'text-green-900' : 'text-red-900'}`}>
                    {result.ok ? 'Processing Complete!' : 'Processing Failed'}
                  </h3>
                  
                  {result.ok ? (
                    <div className="mt-2 space-y-2 text-sm text-green-800">
                      <p>{result.message}</p>
                      {result.parentTaskUrl && (
                        <p>
                          <a
                            href={result.parentTaskUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View Parent Task in Asana
                            <ExternalLink className="ml-1 w-4 h-4" />
                          </a>
                        </p>
                      )}
                      {result.processingTime && (
                        <p className="text-gray-600">
                          Processing time: {(result.processingTime / 1000).toFixed(1)} seconds
                        </p>
                      )}
                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800">
                          <p className="font-medium">Some issues occurred:</p>
                          <ul className="list-disc list-inside mt-1">
                            {result.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-red-700">{result.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}