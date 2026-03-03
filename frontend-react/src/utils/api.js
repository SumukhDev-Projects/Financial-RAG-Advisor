import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 60000,
})

// ── Documents ─────────────────────────────────────────────────────────────────

export const uploadDocument = (file, clientName, docType) => {
  const form = new FormData()
  form.append('file', file)
  if (clientName) form.append('client_name', clientName)
  if (docType) form.append('doc_type', docType)
  return api.post('/api/documents/upload', form)
}

export const listDocuments = (clientName = '') =>
  api.get('/api/documents/', { params: clientName ? { client_name: clientName } : {} })

export const deleteDocument = (id) => api.delete(`/api/documents/${id}`)

// ── Advisor ───────────────────────────────────────────────────────────────────

export const askAdvisor = (payload) => api.post('/api/advisor/ask', payload)

export const summarizePortfolio = (payload) => api.post('/api/advisor/summarize', payload)

export const draftEmail = (payload) => api.post('/api/advisor/draft-email', payload)

// ── Health ────────────────────────────────────────────────────────────────────

export const getHealth = () => api.get('/health')

export default api
