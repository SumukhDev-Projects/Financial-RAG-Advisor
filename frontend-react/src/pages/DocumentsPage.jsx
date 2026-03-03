import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileText, Upload, Trash2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import { uploadDocument, listDocuments, deleteDocument } from '../utils/api'

const DOC_TYPES = ['portfolio', 'report', 'statement', 'email', 'other']

export default function DocumentsPage() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [clientName, setClientName] = useState('')
  const [docType, setDocType] = useState('portfolio')
  const [filterClient, setFilterClient] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)

  const fetchDocs = async (filter = '') => {
    setLoading(true)
    try {
      const { data } = await listDocuments(filter)
      setDocs(data)
    } catch {
      toast.error('Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, [])

  const onDrop = useCallback(files => {
    if (files[0]) setSelectedFile(files[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'], 'text/csv': ['.csv'] },
    maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!selectedFile) return toast.error('Please select a file first.')
    setUploading(true)
    try {
      const { data } = await uploadDocument(selectedFile, clientName, docType)
      toast.success(data.message)
      setSelectedFile(null)
      setClientName('')
      fetchDocs()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id, filename) => {
    if (!confirm(`Delete "${filename}"?`)) return
    try {
      await deleteDocument(id)
      toast.success('Document deleted.')
      fetchDocs(filterClient)
    } catch {
      toast.error('Delete failed.')
    }
  }

  return (
    <div>
      <PageHeader
        icon={FileText}
        title="Documents"
        subtitle="Upload and manage client financial documents for RAG indexing."
      />

      {/* Upload card */}
      <div className="card p-5 mb-7">
        <h2 className="text-sm font-medium text-slate-300 mb-4">Upload Document</h2>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 mb-4
            ${isDragActive
              ? 'border-emerald-500/60 bg-emerald-500/5'
              : selectedFile
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-[#1f2a3c] hover:border-emerald-500/30 hover:bg-white/2'
            }`}
        >
          <input {...getInputProps()} />
          <Upload size={24} className={selectedFile ? 'text-emerald-400 mx-auto mb-2' : 'text-slate-600 mx-auto mb-2'} />
          {selectedFile ? (
            <>
              <p className="text-sm text-emerald-400 font-medium">{selectedFile.name}</p>
              <p className="text-xs text-slate-600 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB — click to replace</p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400">Drop PDF, TXT, or CSV here</p>
              <p className="text-xs text-slate-600 mt-1">or click to browse · max 20MB</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Client Name</label>
            <input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="e.g. John Smith"
              className="input"
            />
          </div>
          <div>
            <label className="label">Document Type</label>
            <div className="relative">
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="input appearance-none pr-9"
              >
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <button onClick={handleUpload} disabled={uploading || !selectedFile} className="btn-primary">
          {uploading ? <Spinner size="sm" /> : <Upload size={14} />}
          {uploading ? 'Indexing…' : 'Upload & Index'}
        </button>
      </div>

      {/* Documents list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-300">Indexed Documents</h2>
          <div className="flex items-center gap-2">
            <input
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              placeholder="Filter by client…"
              className="input w-44 text-xs py-1.5"
            />
            <button onClick={() => fetchDocs(filterClient)} className="btn-primary py-1.5 text-xs">
              Filter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : docs.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No documents indexed yet.</p>
            <p className="text-slate-600 text-xs mt-1">Upload a PDF above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id} className="card px-4 py-3.5 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <FileText size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-200 font-medium">{doc.filename}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {doc.client_name || 'No client'} · {doc.doc_type || 'unspecified'} · {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id, doc.filename)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
