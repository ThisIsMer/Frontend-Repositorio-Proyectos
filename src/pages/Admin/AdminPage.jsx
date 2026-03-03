import { useState, useEffect } from 'react'
import Navbar from '../../components/layout/Navbar'
import api from '../../services/api'

const STORAGE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'https://repositorio-backend-production.up.railway.app'

function mediaUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_URL}/storage/${path}`
}

function isImage(item) {
  if (item.type === 'image' || item.mime_type?.startsWith('image/')) return true
  const ext = (item.file_path || '').split('.').pop().toLowerCase()
  return ['jpg','jpeg','png','gif','webp'].includes(ext)
}

function isVideo(item) {
  if (item.type === 'video' || item.mime_type?.startsWith('video/')) return true
  const ext = (item.file_path || '').split('.').pop().toLowerCase()
  return ['mp4','avi','mov'].includes(ext)
}

// ── Preview del proyecto (datos del request, no del proyecto real) ────────────
function ProjectPreview({ req, onClose }) {
  const data  = req.data || {}
  const media = data.media || []
  const images = media.filter(isImage)
  const videos = media.filter(isVideo)
  const [featured, setFeatured] = useState(
    videos.length > 0 ? { type: 'video', src: mediaUrl(videos[0].file_path) }
                      : images.length > 0 ? { type: 'image', src: mediaUrl(images[0].file_path) }
                      : null
  )

  const thumbnails = [
    ...videos.map((v, i) => ({ type: 'video', src: mediaUrl(v.file_path), key: `v${i}` })),
    ...images.map((img, i) => ({ type: 'image', src: mediaUrl(img.file_path), key: `i${i}` })),
  ].filter(t => t.src !== featured?.src)

  const collaborators = data.collaborators || []
  const collaboratorsText = collaborators.filter(c => c.type === 'text').map(c => c.value)
  const collaboratorUsers = collaborators.filter(c => c.type === 'user').map(c => c.name || c.value)
  const allAuthors = [
    req.user?.name || req.user?.email || `Usuario #${req.user_id}`,
    ...collaboratorUsers,
    ...collaboratorsText,
  ]

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Vista previa de solicitud #{req.id}</p>
            <h2 className="text-lg font-bold text-gray-900">{data.title || 'Sin título'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
        </div>

        <div className="overflow-hidden">
          {featured ? (
            <div className="p-4 pb-2">
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200 mb-2">
                {featured.type === 'video' ? (
                  <video src={featured.src} className="w-full h-full object-cover" controls muted playsInline />
                ) : (
                  <img src={featured.src} alt="Preview" className="w-full h-full object-cover" />
                )}
              </div>
              {thumbnails.length > 0 && (
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {thumbnails.map(t => (
                    <div key={t.key} onClick={() => setFeatured(t)}
                      className="aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer hover:opacity-80 transition relative">
                      {t.type === 'video' ? (
                        <>
                          <video src={t.src} className="w-full h-full object-cover" muted preload="metadata" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <span className="text-white text-lg">▶</span>
                          </div>
                        </>
                      ) : (
                        <img src={t.src} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-40 bg-gradient-to-br from-slate-700 to-blue-800 flex items-center justify-center">
              <span className="text-white text-5xl">📁</span>
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {data.subject_id && (
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                  Asignatura ID: {data.subject_id}
                </span>
              )}
              {data.year && (
                <span className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">{data.year}</span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-1">{data.title}</h1>
            <p className="text-sm text-gray-500 mb-4">Por {allAuthors.join(', ')}</p>
            <p className="text-gray-700 leading-relaxed mb-6 pb-6 border-b border-gray-100">{data.description}</p>

            {data.full_description && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{data.full_description}</p>
              </div>
            )}

            {data.game_url && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Demo / Juego</h2>
                <a href={data.game_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                  🎮 Ver demo
                </a>
              </div>
            )}

            {data.tags?.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-medium text-gray-500 mb-2">Etiquetas</h2>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sección: Proyectos publicados ─────────────────────────────────────────────
function PublishedProjectsSection() {
  const [projects, setProjects]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState(new Set())
  const [deleteModal, setDeleteModal]   = useState(false)  // single or bulk
  const [targetProject, setTargetProject] = useState(null) // null = bulk
  const [deleting, setDeleting]         = useState(false)

  const fetchProjects = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get('/projects', { params: { per_page: 200 } })
      setProjects(res.data.data ?? res.data)
    } catch {
      setError('Error al cargar los proyectos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProjects() }, [])

  const filtered = projects.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.subject?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.users?.some(u => (u.name || u.email)?.toLowerCase().includes(search.toLowerCase()))
  )

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id))

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(p => next.delete(p.id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(p => next.add(p.id))
        return next
      })
    }
  }

  const openDeleteSingle = (project) => {
    setTargetProject(project)
    setDeleteModal(true)
  }

  const openDeleteBulk = () => {
    setTargetProject(null)
    setDeleteModal(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      const ids = targetProject ? [targetProject.id] : [...selected]
      await Promise.all(ids.map(id => api.delete(`/admin/projects/${id}`)))
      setProjects(prev => prev.filter(p => !ids.includes(p.id)))
      setSelected(prev => {
        const next = new Set(prev)
        ids.forEach(id => next.delete(id))
        return next
      })
      setDeleteModal(false)
      setTargetProject(null)
    } catch {
      alert('Error al eliminar los proyectos. Comprueba que el endpoint de admin existe.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Proyectos en el repositorio</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? 'Cargando...' : `${projects.length} proyecto${projects.length !== 1 ? 's' : ''} publicado${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <button
              onClick={openDeleteBulk}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition">
              🗑️ Eliminar seleccionados ({selected.size})
            </button>
          )}
          <button
            onClick={fetchProjects}
            className="text-sm text-blue-600 hover:text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg transition">
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <input
          type="text"
          placeholder="Filtrar por título, asignatura o autor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Tabla */}
      {error ? (
        <div className="p-6 text-sm text-red-500 bg-red-50">{error}</div>
      ) : loading ? (
        <div className="text-center text-gray-400 py-16">Cargando proyectos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          {search ? 'No hay proyectos que coincidan con la búsqueda.' : 'No hay proyectos publicados.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 font-medium">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 accent-blue-600 cursor-pointer"
                    title="Seleccionar todos"
                  />
                </th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Asignatura</th>
                <th className="px-4 py-3">Autores</th>
                <th className="px-4 py-3">Año</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(project => {
                const authors = project.users?.map(u => u.name || u.email).join(', ') || '—'
                const isChecked = selected.has(project.id)
                return (
                  <tr
                    key={project.id}
                    className={`hover:bg-gray-50 transition-colors ${isChecked ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(project.id)}
                        className="rounded border-gray-300 accent-red-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 line-clamp-1">{project.title}</span>
                      {project.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {project.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tag}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{project.subject?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{authors}</td>
                    <td className="px-4 py-3 text-gray-500">{project.year || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDeleteSingle(project)}
                        className="text-xs text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition font-medium">
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmación */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {targetProject ? '¿Eliminar este proyecto?' : `¿Eliminar ${selected.size} proyecto${selected.size !== 1 ? 's' : ''}?`}
            </h3>
            {targetProject ? (
              <p className="text-sm text-gray-600 mb-1">
                Vas a eliminar permanentemente: <span className="font-semibold">"{targetProject.title}"</span>
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-1">
                Vas a eliminar permanentemente {selected.size} proyecto{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}.
              </p>
            )}
            <p className="text-xs text-red-500 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteModal(false); setTargetProject(null) }}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-medium transition">
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition">
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [requests, setRequests]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectModal, setRejectModal]     = useState(null)
  const [previewReq, setPreviewReq]       = useState(null)
  const [activeTab, setActiveTab]         = useState('requests') // 'requests' | 'projects'

  const fetchRequests = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get('/admin/requests/pending')
      setRequests(res.data)
    } catch (err) {
      setError(err.response?.status === 403 ? 'No tienes permisos de administrador.' : 'Error al cargar las solicitudes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [])

  const handleApprove = async (id) => {
    setActionLoading(id + 'approve')
    try {
      await api.post(`/admin/requests/${id}/approve`)
      setRequests(prev => prev.filter(r => r.id !== id))
      if (previewReq?.id === id) setPreviewReq(null)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error al aprobar la solicitud.'
      alert(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectModal?.message?.trim()) return
    setActionLoading(rejectModal.id + 'reject')
    try {
      await api.post(`/admin/requests/${rejectModal.id}/reject`, { admin_message: rejectModal.message })
      setRequests(prev => prev.filter(r => r.id !== rejectModal.id))
      if (previewReq?.id === rejectModal.id) setPreviewReq(null)
      setRejectModal(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Error al rechazar la solicitud.')
    } finally {
      setActionLoading(null)
    }
  }

  const typeLabel = (type) => ({
    create: { text: 'Crear proyecto',    color: 'bg-green-100 text-green-700' },
    update: { text: 'Editar proyecto',   color: 'bg-blue-100 text-blue-700'  },
    delete: { text: 'Eliminar proyecto', color: 'bg-red-100 text-red-700'    },
  }[type] || { text: type, color: 'bg-gray-100 text-gray-700' })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Modal de preview */}
      {previewReq && (
        <ProjectPreview req={previewReq} onClose={() => setPreviewReq(null)} />
      )}

      {/* Modal de rechazo */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Rechazar solicitud</h2>
            <p className="text-sm text-gray-500 mb-4">Indica el motivo del rechazo. El usuario lo recibirá como feedback.</p>
            <textarea
              value={rejectModal.message}
              onChange={e => setRejectModal(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              placeholder="Ej: Las imágenes no cumplen los requisitos mínimos de calidad..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleReject}
                disabled={!rejectModal.message?.trim() || actionLoading !== null}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium transition">
                {actionLoading ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión del repositorio de proyectos</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'requests'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Solicitudes pendientes
            {requests.length > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'projects'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📁 Proyectos publicados
          </button>
        </div>

        {/* Tab: Solicitudes pendientes */}
        {activeTab === 'requests' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={fetchRequests}
                className="text-sm text-blue-600 hover:text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg transition">
                ↻ Actualizar
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 text-sm">{error}</div>
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
                  const mediaCount = data.media?.length || 0
                  const collaborators = data.collaborators || []
                  const allAuthors = [
                    req.user?.name || req.user?.email || `Usuario #${req.user_id}`,
                    ...collaborators.filter(c => c.type === 'user').map(c => c.name || c.value),
                    ...collaborators.filter(c => c.type === 'text').map(c => c.value),
                  ]

                  return (
                    <div key={req.id}
                      className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <div onClick={() => setPreviewReq(req)} className="p-6 cursor-pointer">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{text}</span>
                              <span className="text-xs text-gray-400">
                                #{req.id} · {new Date(req.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {data.title && <h3 className="font-semibold text-gray-900 text-lg mb-1">{data.title}</h3>}
                            {data.description && <p className="text-sm text-gray-500 line-clamp-2 mb-2">{data.description}</p>}
                            <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                              <span>👤 {allAuthors.join(', ')}</span>
                              {data.subject_id && <span>📚 Asignatura ID: {data.subject_id}</span>}
                              {data.year && <span>📅 {data.year}</span>}
                              {data.tags?.length > 0 && <span>🏷️ {data.tags.join(', ')}</span>}
                              {mediaCount > 0 && <span>📎 {mediaCount} archivo(s)</span>}
                              {data.game_url && <span>🎮 Demo incluida</span>}
                            </div>
                            <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
                              <span>🔍</span> Haz clic para ver la vista previa completa
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={actionLoading !== null}
                              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap">
                              {actionLoading === req.id + 'approve' ? 'Aprobando...' : '✓ Aprobar'}
                            </button>
                            <button
                              onClick={() => setRejectModal({ id: req.id, message: '' })}
                              disabled={actionLoading !== null}
                              className="bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap">
                              ✕ Rechazar
                            </button>
                          </div>
                        </div>
                      </div>
                      {req.user_message && (
                        <div className="px-6 pb-4">
                          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <span className="font-medium text-gray-700">Mensaje del usuario: </span>{req.user_message}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Tab: Proyectos publicados */}
        {activeTab === 'projects' && <PublishedProjectsSection />}
      </div>
    </div>
  )
}