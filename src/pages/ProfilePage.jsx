import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const STORAGE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'https://repositorio-backend-production.up.railway.app'

function avatarUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_URL}/storage/${path}`
}

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim())
}

// ── Chip de colaborador ───────────────────────────────────────────────────────
function CollaboratorChip({ collab, onRemove }) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium'
  if (collab.type === 'user') {
    return (
      <span className={`${base} bg-blue-100 text-blue-800`}>
        👤 {collab.name || collab.value}
        {onRemove && <button type="button" onClick={onRemove} className="hover:text-blue-600 ml-0.5">✕</button>}
      </span>
    )
  }
  return (
    <span className={`${base} bg-gray-100 text-gray-700`}>
      {collab.value}
      {onRemove && <button type="button" onClick={onRemove} className="hover:text-gray-500 ml-0.5">✕</button>}
    </span>
  )
}

// ── Campo de colaboradores ────────────────────────────────────────────────────
function CollaboratorsField({ collaborators, onChange }) {
  const [input, setInput]         = useState('')
  const [searching, setSearching] = useState(false)
  const [hint, setHint]           = useState(null)
  const debounceRef               = useRef(null)

  const addCollaborator = (collab) => {
    if (collaborators.some(c => c.value === collab.value)) return
    onChange([...collaborators, collab])
    setInput(''); setHint(null)
  }

  const handleInput = (e) => {
    const val = e.target.value
    setInput(val); setHint(null)
    clearTimeout(debounceRef.current)
    if (!val.trim()) return
    if (isEmail(val.trim())) {
      setSearching(true)
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await api.get(`/users/search?email=${encodeURIComponent(val.trim())}`)
          if (res.data?.id) {
            setHint({ type: 'found', message: `Cuenta encontrada: ${res.data.name || res.data.email}`, user: res.data })
          } else {
            setHint({ type: 'notfound', message: 'No hay ninguna cuenta registrada con ese correo, revise que esté bien escrito.' })
          }
        } catch {
          setHint({ type: 'notfound', message: 'No hay ninguna cuenta registrada con ese correo, revise que esté bien escrito.' })
        } finally { setSearching(false) }
      }, 500)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = input.trim()
      if (!val) return
      if (hint?.type === 'found') {
        addCollaborator({ type: 'user', value: val, user_id: hint.user.id, name: hint.user.name || hint.user.email })
      } else if (!isEmail(val)) {
        addCollaborator({ type: 'text', value: val })
      }
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Colaboradores</label>
      {collaborators.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {collaborators.map((c, i) => (
            <CollaboratorChip key={i} collab={c} onRemove={() => onChange(collaborators.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}
      <input
        type="text" value={input}
        onChange={handleInput} onKeyDown={handleKeyDown}
        placeholder="Nombre o correo electrónico + Enter"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {searching && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
      {hint && (
        <p className={`text-xs mt-1 ${hint.type === 'found' ? 'text-green-600' : hint.type === 'notfound' ? 'text-red-500' : 'text-gray-500'}`}>
          {hint.type === 'found' ? '✓ ' : hint.type === 'notfound' ? '✗ ' : ''}{hint.message}
          {hint.type === 'found' && (
            <button type="button"
              onClick={() => addCollaborator({ type: 'user', value: input.trim(), user_id: hint.user.id, name: hint.user.name || hint.user.email })}
              className="ml-2 underline hover:no-underline">
              Añadir
            </button>
          )}
        </p>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, login } = useAuth()
  const avatarInputRef  = useRef(null)
  const bannerInputRef  = useRef(null)

  const [projects, setProjects]               = useState([])
  const [requests, setRequests]               = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)

  const [editing, setEditing]           = useState(false)
  const [form, setForm]                 = useState({ name: user?.name || '', bio: user?.bio || '' })

  const [avatarFile, setAvatarFile]       = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [bannerFile, setBannerFile]       = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)

  const [saveLoading, setSaveLoading]   = useState(false)
  const [saveError, setSaveError]       = useState('')
  const [saveSuccess, setSaveSuccess]   = useState(false)

  // Modal editar proyecto
  const [editingProject, setEditingProject]       = useState(null)
  const [editForm, setEditForm]                   = useState({})
  const [editCollaborators, setEditCollaborators] = useState([])
  const [editLoading, setEditLoading]             = useState(false)
  const [editError, setEditError]                 = useState('')
  const [subjects, setSubjects]                   = useState([])

  // Modal confirmar eliminar
  const [deletingProject, setDeletingProject] = useState(null)
  const [deleteLoading, setDeleteLoading]     = useState(false)

  useEffect(() => {
    api.get('/my-projects').then(r => setProjects(r.data)).catch(() => {}).finally(() => setLoadingProjects(false))
    api.get('/my-requests').then(r => setRequests(r.data)).catch(() => {}).finally(() => setLoadingRequests(false))
    api.get('/subjects').then(r => setSubjects(r.data)).catch(() => {})
  }, [])

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    if (bannerPreview) URL.revokeObjectURL(bannerPreview)
  }, [avatarPreview, bannerPreview])

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg','image/png','image/jpg'].includes(file.type)) { setSaveError('Solo JPG o PNG.'); return }
    if (file.size > 5 * 1024 * 1024) { setSaveError('Máximo 5MB.'); return }
    setSaveError('')
    setAvatarFile(file)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(URL.createObjectURL(file))
  }

  // ── Banner ──────────────────────────────────────────────────────────────────
  const handleBannerChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg','image/png','image/jpg'].includes(file.type)) { setSaveError('Solo JPG o PNG.'); return }
    if (file.size > 5 * 1024 * 1024) { setSaveError('Máximo 5MB.'); return }
    setSaveError('')
    setBannerFile(file)
    if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    setBannerPreview(URL.createObjectURL(file))
  }

  // ── Guardar perfil ──────────────────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaveLoading(true); setSaveError(''); setSaveSuccess(false)
    try {
      let res
      if (avatarFile || bannerFile) {
        const fd = new FormData()
        fd.append('_method', 'PUT')
        fd.append('name', form.name)
        fd.append('bio', form.bio)
        if (avatarFile) fd.append('profile_picture', avatarFile)
        if (bannerFile) fd.append('profile_banner', bannerFile)
        res = await api.post('/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        res = await api.put('/profile', form)
      }
      login(res.data.user, localStorage.getItem('token'))
      setSaveSuccess(true); setEditing(false)
      setAvatarFile(null); setAvatarPreview(null)
      setBannerFile(null); setBannerPreview(null)
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error al guardar el perfil.')
    } finally { setSaveLoading(false) }
  }

  const cancelEdit = () => {
    setEditing(false); setSaveError('')
    setAvatarFile(null)
    if (avatarPreview) { URL.revokeObjectURL(avatarPreview); setAvatarPreview(null) }
    setBannerFile(null)
    if (bannerPreview) { URL.revokeObjectURL(bannerPreview); setBannerPreview(null) }
    setForm({ name: user?.name || '', bio: user?.bio || '' })
  }

  // ── Abrir modal de edición de proyecto ──────────────────────────────────────
  const openEdit = (project) => {
    setEditingProject(project)
    setEditForm({
      title:            project.title || '',
      description:      project.description || '',
      full_description: project.full_description || '',
      subject_id:       project.subject?.id || '',
      year:             project.year || '',
      tags:             project.tags?.join(', ') || '',
      game_url:         project.game_url || '',
      authorization:    false,
    })
    const userCollabs = (project.users || [])
      .filter(u => u.id !== user?.id)
      .map(u => ({ type: 'user', value: u.email || '', user_id: u.id, name: u.name || u.email }))
    const textCollabs = (project.collaborators_text || [])
      .map(name => ({ type: 'text', value: name }))
    setEditCollaborators([...userCollabs, ...textCollabs])
    setEditError('')
  }

  // ── Enviar solicitud de edición ─────────────────────────────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editForm.authorization) { setEditError('Debes marcar la autorización.'); return }
    setEditLoading(true); setEditError('')
    try {
      const fd = new FormData()
      fd.append('title',            editForm.title)
      fd.append('description',      editForm.description)
      if (editForm.full_description) fd.append('full_description', editForm.full_description)
      fd.append('subject_id',       editForm.subject_id)
      if (editForm.year)     fd.append('year',     editForm.year)
      if (editForm.game_url) fd.append('game_url', editForm.game_url)
      fd.append('authorization',    '1')
      editForm.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => fd.append('tags[]', t))
      fd.append('collaborators_json', JSON.stringify(editCollaborators))
      await api.post(`/requests/update-project/${editingProject.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
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

  const currentAvatar = avatarPreview || avatarUrl(user?.profile_picture)
  const currentBanner = bannerPreview || avatarUrl(user?.profile_banner)
  const initials      = (user?.name || user?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* ── Mi Perfil ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm" style={{ overflow: 'hidden' }}>

          {/* ── Banner ── */}
          <div style={{
            position: 'relative',
            height: '144px',
            overflow: 'hidden',
            background: currentBanner ? 'none' : 'linear-gradient(to right, #334155, #1e3a8a)',
          }}>
            {currentBanner && (
              <img src={currentBanner} alt="Banner"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
            {editing && (
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: 'rgba(0,0,0,0.55)', color: 'white',
                  border: 'none', borderRadius: '8px',
                  padding: '6px 12px', fontSize: '12px',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '6px',
                }}
              >
                🖼 Cambiar banner
              </button>
            )}
            <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png" onChange={handleBannerChange} className="hidden" />
          </div>

          <div className="p-6">
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

                {/* Banner info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
                  <span>🖼 Haz clic en <strong>"Cambiar banner"</strong> en la imagen de arriba para actualizarlo.</span>
                  {bannerFile && <span className="text-green-600 ml-auto">✓ {bannerFile.name}</span>}
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-100 border-2 border-blue-200">
                      {currentAvatar
                        ? <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-blue-600 text-2xl font-bold">{initials}</div>}
                    </div>
                    <button type="button" onClick={() => avatarInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow transition"
                      title="Cambiar foto">📷</button>
                    <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png" onChange={handleAvatarChange} className="hidden" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Foto de perfil</p>
                    <p className="text-xs text-gray-400 mt-0.5">JPG o PNG · máx. 5MB</p>
                    {avatarFile && <p className="text-xs text-green-600 mt-1">✓ {avatarFile.name}</p>}
                    <button type="button" onClick={() => avatarInputRef.current?.click()}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline">
                      {currentAvatar ? 'Cambiar foto' : 'Subir foto'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tu nombre completo" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
                  <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} maxLength={1000}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Cuéntanos algo sobre ti..." />
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
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-100 border-2 border-gray-200 shrink-0">
                  {currentAvatar
                    ? <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-blue-600 text-2xl font-bold">{initials}</div>}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">{user?.name || '—'}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  {user?.bio && <p className="text-sm text-gray-600 mt-2">{user.bio}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Mis proyectos ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Proyectos</h2>
          {loadingProjects ? (
            <p className="text-sm text-gray-400">Cargando proyectos...</p>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">📁</p>
              <p className="text-sm">Aún no has subido ningún proyecto.</p>
              <Link to="/submit" className="text-blue-600 hover:underline text-sm mt-1 inline-block">Subir un proyecto</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map(project => (
                <div key={project.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                  <div className="flex-1 min-w-0">
                    <Link to={`/projects/${project.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition text-sm block truncate">
                      {project.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{project.subject?.name} · {project.year}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button onClick={() => openEdit(project)}
                      className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg transition">
                      Editar
                    </button>
                    <button onClick={() => setDeletingProject(project)}
                      className="text-xs text-red-500 hover:text-red-600 border border-red-200 px-2.5 py-1 rounded-lg transition">
                      Eliminar
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
            <p className="text-sm text-gray-400 text-center py-6">No tienes solicitudes pendientes.</p>
          ) : (
            <div className="space-y-3">
              {requests.map(req => {
                const sl = statusLabel(req.status)
                const tl = typeLabel(req.type)
                return (
                  <div key={req.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tl}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{req.project?.title || '—'}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sl.color}`}>{sl.text}</span>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">Solicitar edición del proyecto</h3>
                <button onClick={() => setEditingProject(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                {editError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{editError}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input required type="text" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción corta *</label>
                  <textarea required rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción completa</label>
                  <textarea rows={4} value={editForm.full_description} onChange={e => setEditForm(f => ({ ...f, full_description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asignatura *</label>
                    <select required value={editForm.subject_id} onChange={e => setEditForm(f => ({ ...f, subject_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecciona...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                    <input type="number" min="2000" max="2100" value={editForm.year} onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (separados por coma)</label>
                  <input type="text" value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="unity, 2d, plataformas"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enlace al juego / demo</label>
                  <input type="url" value={editForm.game_url} onChange={e => setEditForm(f => ({ ...f, game_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <CollaboratorsField collaborators={editCollaborators} onChange={setEditCollaborators} />
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.authorization} onChange={e => setEditForm(f => ({ ...f, authorization: e.target.checked }))}
                    className="mt-0.5 rounded" />
                  <span className="text-xs text-gray-600">
                    Confirmo que tengo autorización para publicar este proyecto y que la información es correcta.
                  </span>
                </label>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={editLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                    {editLoading ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                  <button type="button" onClick={() => setEditingProject(null)}
                    className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar ── */}
      {deletingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar proyecto?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Se enviará una solicitud de eliminación de <strong>"{deletingProject.title}"</strong>. Un administrador la revisará.
            </p>
            <div className="flex gap-2">
              <button onClick={handleDeleteConfirm} disabled={deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition">
                {deleteLoading ? 'Enviando...' : 'Sí, eliminar'}
              </button>
              <button onClick={() => setDeletingProject(null)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-medium transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}