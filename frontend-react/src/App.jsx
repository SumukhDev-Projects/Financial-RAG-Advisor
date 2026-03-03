import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DocumentsPage from './pages/DocumentsPage'
import AskPage from './pages/AskPage'
import SummaryPage from './pages/SummaryPage'
import EmailPage from './pages/EmailPage'
import AuditPage from './pages/AuditPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/ask" replace />} />
        <Route path="/ask" element={<AskPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/summary" element={<SummaryPage />} />
        <Route path="/email" element={<EmailPage />} />
        <Route path="/audit" element={<AuditPage />} />
      </Routes>
    </Layout>
  )
}
