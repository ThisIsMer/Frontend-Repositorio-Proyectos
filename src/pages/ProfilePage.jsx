import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const STORAGE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'https://repositorio-backend-production.up.railway.app'

function avatarUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_URL}/storage/${path}`
}

export default function ProfilePage() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)

  const [projects, setProjects]               = useState([])
  const [requests, setRequests]               = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)

  const [editing, setEditing]       = useState(false)
  const [form, setForm]             = useState({ name: user?.name || '', bio: user?.bio || '' })
  const [avatarFile, setAvatarFile] = useState(null)   // File object
  const [avatarPreview, setAvatarPreview] = useState(null) // ObjectURL
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError]     = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Modal editar proyecto
  const [editingProject, setEditingProject] = useState(null)
  const [editForm, setEditForm]             = useState({})
  const [editLoading, setEditLoading]       = useState(false)
  const [editError, setEditError]           = useState('')
  const [subjects, setSubjects]             = useState([])

  // Modal confirmar eliminar
  const [deletingProject, setDeletingProject] = useState(null)
  const [deleteLoading, setDeleteLoading]     = useState(false)

  useEffect(() => {
    api.get('/my-projects').then(r => setProjects(r.data)).catch(() => {}).finally(() => setLoadingProjects(false))
    api.get('/my-requests').then(r => setRequests(r.data)).catch(() => {}).finally(() => setLoadingRequests(false))
    api.get('/subjects').then(r => setSubjects(r.data)).catch(() => {})
  }, [])

  // Limpiar preview al desmontar
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }, [avatarPreview])

  // ── Foto de perfil ──────────────────────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg','image/png','image/jpg'].includes(file.type)) {
      setSaveError('Solo se permiten imágenes JPG o PNG.'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('La imagen no puede superar 5MB.'); return
    }
    setSaveError('')
    setAvatarFile(file)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(URL.createObjectURL(file))
  }

  // ── Guardar perfil ──────────────────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaveLoading(true); setSaveError(''); setSaveSuccess(false)
    try {
      let res
      if (avatarFile) {
        // Laravel no procesa archivos en PUT — method spoofing con POST + _method=PUT
        const fd = new FormData()
        fd.append('_method', 'PUT')
        fd.append('name', form.name)
        fd.append('bio', form.bio)
        fd.append('profile_picture', avatarFile)
        res = await api.post('/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        res = await api.put('/profile', form)
      }
      login(res.data.user, localStorage.getItem('token'))
      setSaveSuccess(true)
      setEditing(false)
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error al guardar el perfil.')
    } finally { setSaveLoading(false) }
  }

  const cancelEdit = () => {
    setEditing(false); setSaveError('')
    setAvatarFile(null)
    if (avatarPreview) { URL.revokeObjectURL(avatarPreview); setAvatarPreview(null) }
    setForm({ name: user?.name || '', bio: user?.bio || '' })
  }

  // ── Editar proyecto ─────────────────────────────────────────────────────────
  const openEdit = (project) => {
    setEditingProject(project)
    setEditForm({
      title: project.title || '',
      description: project.description || '',
      full_description: project.full_description || '',
      subject_id: project.subject?.id || '',
      year: project.year || '',
      tags: project.tags?.join(', ') || '',
      game_url: project.game_url || '',
      authorization: false,
    })
    setEditError('')
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editForm.authorization) { setEditError('Debes marcar la autorización.'); return }
    setEditLoading(true); setEditError('')
    try {
      const payload = {
        ...editForm,
        tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        authorization: true,
      }
      await api.post(`/requests/update-project/${editingProject.id}`, payload)
      setEditingProject(null)
      api.get('/my-requests').then(r => setRequests(r.data)).catch(() => {})
      alert('Solicitud de edición enviada. Un administrador la revisará.')
    } catch (err) {
      const errors = err.response?.data?.errors
      setEditError(errors ? Object.values(errors).flat().join(' ') : (err.response?.data?.message || 'Error al enviar la solicitud.'))
    } finally { setEditLoading(false) }
  }

  // ── Eliminar proyecto ───────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleteLoading(true)
    try {
      await api.post(`/requests/delete-project/${deletingProject.id}`)
      setDeletingProject(null)
      api.get('/my-requests').then(r => setRequests(r.data)).catch(() => {})
      alert('Solicitud de eliminación enviada. Un administrador la revisará.')
    } catch (err) {
      alert(err.response?.data?.message || 'Error al enviar la solicitud de eliminación.')
    } finally { setDeleteLoading(false) }
  }

  const statusLabel = (status) => ({
    pending:  { text: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
    approved: { text: 'Aprobada',  color: 'bg-green-100 text-green-700'  },
    rejected: { text: 'Rechazada', color: 'bg-red-100 text-red-700'      },
  }[status] || { text: status, color: 'bg-gray-100 text-gray-700' })

  const typeLabel = (type) => ({
    create: 'Crear proyecto', update: 'Editar proyecto', delete: 'Eliminar proyecto'
  }[type] || type)

  // Avatar actual (preview > backend > iniciales)
  const currentAvatar = avatarPreview || avatarUrl(user?.profile_picture)
  const initials = (user?.name || user?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* ── Perfil ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Mi Perfil</h2>
            {!editing && (
              <button onClick={() => { setEditing(true); setSaveSuccess(false) }}
                className="text-sm text-blue-600 hover:text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg transition">
                Editar
              </button>
            )}
          </div>

          {saveSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg mb-4">
              Perfil actualizado correctamente.
            </div>
          )}

          {editing ? (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {saveError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{saveError}</div>}

              {/* Avatar editable */}
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-100 border-2 border-blue-200">
                    {currentAvatar ? (
                      <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                        {initials}
                      </div>
                    )}
                  </div>
                  {/* Botón de cámara encima */}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow transition"
                    title="Cambiar foto"
                  >
                    📷
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Foto de perfil</p>
                  <p className="text-xs text-gray-400 mt-0.5">JPG o PNG · máx. 5MB</p>
                  {avatarFile && (
                    <p className="text-xs text-green-600 mt-1">✓ {avatarFile.name}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    {currentAvatar ? 'Cambiar foto' : 'Subir foto'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tu nombre completo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3} maxLength={1000}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Cuéntanos algo sobre ti..." />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saveLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                  {saveLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button type="button" onClick={cancelEdit}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            /* Vista del perfil */
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-100 border-2 border-gray-200 shrink-0">
                {currentAvatar ? (
                  <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                    {initials}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">{user?.name || '—'}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                {user?.bio && <p className="text-sm text-gray-600 mt-2">{user.bio}</p>}
              </div>
            </div>
          )}
        </div>

        {/* ── Mis proyectos ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Proyectos</h2>
          {loadingProjects ? (
            <p className="text-sm text-gray-400">Cargando proyectos...</p>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm mb-3">No tienes proyectos publicados aún.</p>
              <Link to="/submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                + Subir proyecto
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map(project => (
                <div key={project.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4">
                  <div className="min-w-0 flex-1">
                    <Link to={`/projects/${project.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition truncate block">
                      {project.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{project.subject?.name} · {project.year}</p>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-3">
                    <button onClick={() => openEdit(project)}
                      className="text-xs border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
                      ✏️ Editar
                    </button>
                    <button onClick={() => setDeletingProject(project)}
                      className="text-xs border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition">
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Mis solicitudes ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Solicitudes</h2>
          {loadingRequests ? (
            <p className="text-sm text-gray-400">Cargando solicitudes...</p>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">No has enviado ninguna solicitud aún.</p>
          ) : (
            <div className="space-y-3">
              {requests.map(req => {
                const { text, color } = statusLabel(req.status)
                return (
                  <div key={req.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{req.data?.title || `Solicitud #${req.id}`}</span>
                      <span className="text-gray-400 ml-2 text-xs">{typeLabel(req.type)}</span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(req.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {req.admin_message && (
                        <p className="text-xs text-red-500 mt-1">Motivo: {req.admin_message}</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-3 ${color}`}>{text}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal editar proyecto ── */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Solicitar edición</h3>
              <button onClick={() => setEditingProject(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Se enviará una solicitud de edición. Un administrador la revisará antes de aplicar los cambios.</p>
            {editError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{editError}</div>}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
                <input type="text" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción breve <span className="text-red-500">*</span></label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} required rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción completa</label>
                <textarea value={editForm.full_description} onChange={e => setEditForm(f => ({ ...f, full_description: e.target.value }))} rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asignatura</label>
                  <select value={editForm.subject_id} onChange={e => setEditForm(f => ({ ...f, subject_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Selecciona...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <input type="number" value={editForm.year} onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))} min={1900} max={2100}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enlace al juego / demo</label>
                <input type="url" value={editForm.game_url} onChange={e => setEditForm(f => ({ ...f, game_url: e.target.value }))}
                  placeholder="https://itch.io/tu-juego"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Etiquetas (separadas por coma)</label>
                <input type="text" value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="border border-gray-200 bg-gray-50 rounded-lg p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={editForm.authorization} onChange={e => setEditForm(f => ({ ...f, authorization: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 text-blue-600 rounded" />
                  <span className="text-sm text-gray-700">Confirmo que tengo autorización para editar este proyecto. <span className="text-red-500">*</span></span>
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={editLoading || !editForm.authorization}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition">
                  {editLoading ? 'Enviando...' : 'Enviar solicitud de edición'}
                </button>
                <button type="button" onClick={() => setEditingProject(null)}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminación ── */}
      {deletingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Solicitar eliminación?</h3>
            <p className="text-sm text-gray-500 mb-1">Vas a solicitar la eliminación de:</p>
            <p className="font-semibold text-gray-800 mb-4">"{deletingProject.title}"</p>
            <p className="text-xs text-gray-400 mb-6">Un administrador revisará la solicitud antes de eliminar el proyecto definitivamente.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingProject(null)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-medium transition">
                Cancelar
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition">
                {deleteLoading ? 'Enviando...' : 'Sí, solicitar eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}