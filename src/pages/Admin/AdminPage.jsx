import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import api from '../../services/api'

export default function AdminPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null) // id de la solicitud en proceso

  const fetchRequests = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/requests/pending')
      setRequests(res.data)
    } catch (err) {
      if (err.response?.status === 403) {
        setError('No tienes permisos de administrador.')
      } else {
        setError('Error al cargar las solicitudes.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleAction = async (id, action) => {
    setActionLoading(id + action)
    try {
      await api.post(`/admin/requests/${id}/${action}`)
      // Quitar la solicitud procesada de la lista
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      alert(err.response?.data?.message || `Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} la solicitud.`)
    } finally {
      setActionLoading(null)
    }
  }

  const typeLabel = (type) => ({
    create: { text: 'Crear proyecto', color: 'bg-green-100 text-green-700' },
    update: { text: 'Editar proyecto', color: 'bg-blue-100 text-blue-700' },
    delete: { text: 'Eliminar proyecto', color: 'bg-red-100 text-red-700' },
  }[type] || { text: type, color: 'bg-gray-100 text-gray-700' })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-sm text-gray-500 mt-1">Solicitudes pendientes de revisión</p>
          </div>
          <button
            onClick={fetchRequests}
            className="text-sm text-blue-600 hover:text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg transition"
          >
            ↻ Actualizar
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-20">Cargando solicitudes...</div>
        ) : requests.length === 0 ? (
          <div className="text-center bg-white border border-gray-200 rounded-xl py-20 text-gray-400">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-medium text-gray-600">No hay solicitudes pendientes</p>
            <p className="text-sm mt-1">Todas las solicitudes han sido procesadas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => {
              const { text, color } = typeLabel(req.type)
              const data = req.data || {}
              return (
                <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Cabecera */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
                          {text}
                        </span>
                        <span className="text-xs text-gray-400">
                          #{req.id} · {new Date(req.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Usuario solicitante */}
                      <p className="text-sm text-gray-500 mb-3">
                        Solicitado por: <span className="font-medium text-gray-700">{req.user?.name || req.user?.email || `Usuario #${req.user_id}`}</span>
                      </p>

                      {/* Datos del proyecto */}
                      {data.title && (
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">{data.title}</h3>
                      )}
                      {data.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-3">{data.description}</p>
                      )}

                      {/* Metadatos */}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                        {data.subject_id && (
                          <span>📚 Asignatura ID: {data.subject_id}</span>
                        )}
                        {data.year && (
                          <span>📅 {data.year}</span>
                        )}
                        {data.tags?.length > 0 && (
                          <span>🏷️ {data.tags.join(', ')}</span>
                        )}
                        {data.collaborators?.length > 0 && (
                          <span>👥 {data.collaborators.length} colaborador(es)</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleAction(req.id, 'approve')}
                        disabled={actionLoading !== null}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap"
                      >
                        {actionLoading === req.id + 'approve' ? 'Aprobando...' : '✓ Aprobar'}
                      </button>
                      <button
                        onClick={() => handleAction(req.id, 'reject')}
                        disabled={actionLoading !== null}
                        className="bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap"
                      >
                        {actionLoading === req.id + 'reject' ? 'Rechazando...' : '✕ Rechazar'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}