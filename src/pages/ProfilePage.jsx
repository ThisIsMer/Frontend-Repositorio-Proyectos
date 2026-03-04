import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
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

function CollaboratorsField({ collaborators, onChange }) {
  const [input, setInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [hint, setHint] = useState(null)
  const debounceRef = useRef(null)

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
            setHint({ type: 'notfound', message: 'No hay ninguna cuenta registrada con ese correo.' })
          }
        } catch {
          setHint({ type: 'notfound', message: 'No hay ninguna cuenta registrada con ese correo.' })
        } finally { setSearching(false) }
      }, 600)
    } else {
      setSearching(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ',') return
    e.preventDefault()
    const val = input.trim()
    if (!val) return
    if (isEmail(val)) {
      if (hint?.type === 'found' && hint.user) {
        addCollaborator({ type: 'user', value: val, user_id: hint.user.id, name: hint.user.name || hint.user.email })
      }
    } else {
      addCollaborator({ type: 'text', value: val })
    }
  }

  const handleAddClick = () => {
    const val = input.trim()
    if (!val) return
    if (isEmail(val)) {
      if (hint?.type === 'found' && hint.user) {
        addCollaborator({ type: 'user', value: val, user_id: hint.user.id, name: hint.user.name || hint.user.email })
      }
    } else {
      addCollaborator({ type: 'text', value: val })
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Colaboradores</label>
      <p className="text-xs text-gray-400 mb-2">
        Correo para buscar usuarios registrados, o nombre/apellido como texto plano. Enter o coma para añadir.
      </p>
      {collaborators.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {collaborators.map((c, i) => (
            <CollaboratorChip key={i} collab={c}
              onRemove={() => onChange(collaborators.filter((_, idx) => idx !== i))} />
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input type="text" value={input} onChange={handleInput} onKeyDown={handleKeyDown}
            placeholder="correo@usal.es o Nombre Apellido..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">Buscando...</span>}
        </div>
        <button type="button" onClick={handleAddClick}
          disabled={!input.trim() || (isEmail(input.trim()) && hint?.type !== 'found')}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 rounded-lg transition border border-gray-300">
          Añadir
        </button>
      </div>
      {hint && (
        <p className={`text-xs mt-1.5 ${hint.type === 'found' ? 'text-green-600' : 'text-red-500'}`}>
          {hint.type === 'found' ? '✓ ' : '✗ '}{hint.message}
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

export default function ProfilePage() {
  const { user, login } = useAuth()
  const avatarInputRef = useRef(null)

  const [projects, setProjects] = useState([])
  const [requests, setRequests] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '' })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [editingProject, setEditingProject] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editCollaborators, setEditCollaborators] = useState([])
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [subjects, setSubjects] = useState([])

  const [deletingProject, setDeletingProject] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    api.get('/my-projects').then(r => setProjects(r.data)).catch(() => {}).finally(() => setLoadingProjects(false))
    api.get('/my-requests').then(r => setRequests(r.data)).catch(() => {}).finally(() => setLoadingRequests(false))
    api.get('/subjects').then(r => setSubjects(r.data)).catch(() => {})
  }, [])

  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }, [avatarPreview])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) { setSaveError('Solo JPG o PNG.'); return }
    if (file.size > 5 * 1024 * 1024) { setSaveError('Máximo 5MB.'); return }
    setSaveError('')
    setAvatarFile(file)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaveLoading(true); setSaveError(''); setSaveSuccess(false)
    try {
      let res
      if (avatarFile) {
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
      setSaveSuccess(true); setEditing(false); setAvatarFile(null); setAvatarPreview(null)
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
    const userCollabs = (project.users || [])
      .filter(u => u.id !== user?.id)
      .map(u => ({ type: 'user', value: u.email || '', user_id: u.id, name: u.name || u.email }))
    const textCollabs = (project.collaborators_text || [])
      .map(name => ({ type: 'text', value: name }))
    setEditCollaborators([...userCollabs, ...textCollabs])
    setEditError('')
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editForm.authorization) { setEditError('Debes marcar la autorización.'); return }
    setEditLoading(true); setEditError('')
    try {
      const fd = new FormData()
      fd.append('title', editForm.title)
      fd.append('description', editForm.description)
      if (editForm.full_description) fd.append('full_description', editForm.full_description)
      fd.append('subject_id', editForm.subject_id)
      if (editForm.year) fd.append('year', editForm.year)
      if (editForm.game_url) fd.append('game_url', editForm.game_url)
      fd.append('authorization', '1')
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
    pending: { text: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
    approved: { text: 'Aprobada', color: 'bg-green-100 text-green-700' },
    rejected: { text: 'Rechazada', color: 'bg-red-100 text-red-700' },
  }[status] || { text: status, color: 'bg-gray-100 text-gray-700' })

  const typeLabel = (type) => ({
    create: 'Crear proyecto', update: 'Editar proyecto', delete: 'Eliminar proyecto'
  }[type] || type)

  const currentAvatar = avatarPreview || avatarUrl(user?.profile_picture)
  const initials = (user?.name || user?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="page">
      <Navbar />

      <header className="hero">
        <div className="hero__inner">
          <div className="hero__content">
            <h1 className="hero__title">Mi Perfil</h1>
            <p className="hero__subtitle">Gestiona tu información y proyectos</p>
          </div>
        </div>
      </header>

      <main className="content" style={{ maxWidth: '900px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* ── Mi Perfil ── */}
          <div className="about__card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 className="about__h2" style={{ marginBottom: 0 }}>Información personal</h2>
              {!editing && (
                <button onClick={() => { setEditing(true); setSaveSuccess(false) }}
                  style={{ fontSize: '13px', color: '#385e9d', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Editar
                </button>
              )}
            </div>

            {saveSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '14px', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px' }}>
                Perfil actualizado correctamente.
              </div>
            )}

            {editing ? (
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {saveError && <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: '14px', padding: '12px 16px', borderRadius: '10px' }}>{saveError}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#dbeafe', border: '2px solid #bfdbfe' }}>
                      {currentAvatar
                        ? <img src={currentAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: '28px', fontWeight: '900' }}>{initials}</div>}
                    </div>
                    <button type="button" onClick={() => avatarInputRef.current?.click()}
                      style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#2563eb', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                      📷
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png" onChange={handleAvatarChange} style={{ display: 'none' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Foto de perfil</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>JPG o PNG · máx. 5MB</p>
                    {avatarFile && <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>✓ {avatarFile.name}</p>}
                  </div>
                </div>
                <div>
                  <label className="authCard__label">Nombre</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="authCard__input" placeholder="Tu nombre completo" />
                </div>
                <div>
                  <label className="authCard__label">Biografía</label>
                  <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} maxLength={1000}
                    style={{ width: '100%', border: '1px solid rgba(17,24,39,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                    placeholder="Cuéntanos algo sobre ti..." />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={saveLoading}
                    className="btn btn--primary btn--sm">
                    {saveLoading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button type="button" onClick={cancelEdit}
                    style={{ border: '1px solid #d1d5db', background: 'transparent', color: '#374151', padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#dbeafe', border: '2px solid #e5e7eb', flexShrink: 0 }}>
                  {currentAvatar
                    ? <img src={currentAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: '28px', fontWeight: '900' }}>{initials}</div>}
                </div>
                <div>
                  <p style={{ fontWeight: '700', color: '#111827', fontSize: '18px', marginBottom: '4px' }}>{user?.name || '—'}</p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>{user?.email}</p>
                  {user?.bio && <p style={{ fontSize: '14px', color: '#374151', marginTop: '8px' }}>{user.bio}</p>}
                </div>
              </div>
            )}
          </div>

          {/* ── Mis proyectos ── */}
          <div className="about__card">
            <h2 className="about__h2">Mis Proyectos</h2>
            {loadingProjects ? (
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>Cargando proyectos...</p>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '12px' }}>No tienes proyectos publicados aún.</p>
                <Link to="/submit" className="btn btn--primary btn--sm">+ Subir proyecto</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {projects.map(project => (
                  <div key={project.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '14px 16px', gap: '12px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Link to={`/projects/${project.id}`} style={{ fontWeight: '700', color: '#111827', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.title}
                      </Link>
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{project.subject?.name} · {project.year}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button onClick={() => openEdit(project)}
                        style={{ fontSize: '12px', border: '1px solid #bfdbfe', color: '#2563eb', background: 'transparent', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => setDeletingProject(project)}
                        style={{ fontSize: '12px', border: '1px solid #fecaca', color: '#dc2626', background: 'transparent', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Mis solicitudes ── */}
          <div className="about__card">
            <h2 className="about__h2">Mis Solicitudes</h2>
            {loadingRequests ? (
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>Cargando solicitudes...</p>
            ) : requests.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: '14px' }}>No has enviado ninguna solicitud aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {requests.map(req => {
                  const { text, color } = statusLabel(req.status)
                  return (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', gap: '12px' }}>
                      <div>
                        <span style={{ fontWeight: '700', color: '#111827' }}>{req.data?.title || `Solicitud #${req.id}`}</span>
                        <span style={{ color: '#9ca3af', marginLeft: '8px', fontSize: '12px' }}>{typeLabel(req.type)}</span>
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                          {new Date(req.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        {req.admin_message && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>Motivo: {req.admin_message}</p>}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${color}`}>{text}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />

      {/* Modal editar proyecto */}
      {editingProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: '900', fontSize: '18px', color: '#111827', margin: 0 }}>Solicitar edición</h3>
              <button onClick={() => setEditingProject(null)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
              Se enviará una solicitud de edición. Un administrador la revisará antes de aplicar los cambios.
            </p>
            {editError && <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: '14px', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px' }}>{editError}</div>}
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="authCard__label">Título *</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required className="authCard__input" />
              </div>
              <div>
                <label className="authCard__label">Descripción breve *</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} required rows={2}
                  style={{ width: '100%', border: '1px solid rgba(17,24,39,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label className="authCard__label">Descripción completa</label>
                <textarea value={editForm.full_description} onChange={e => setEditForm(f => ({ ...f, full_description: e.target.value }))} rows={3}
                  style={{ width: '100%', border: '1px solid rgba(17,24,39,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="authCard__label">Asignatura</label>
                  <select value={editForm.subject_id} onChange={e => setEditForm(f => ({ ...f, subject_id: e.target.value }))}
                    style={{ width: '100%', border: '1px solid rgba(17,24,39,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                    <option value="">Selecciona...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="authCard__label">Año</label>
                  <input type="number" value={editForm.year} onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))} min={1900} max={2100} className="authCard__input" />
                </div>
              </div>
              <div>
                <label className="authCard__label">Enlace al juego / demo</label>
                <input type="url" value={editForm.game_url} onChange={e => setEditForm(f => ({ ...f, game_url: e.target.value }))} placeholder="https://itch.io/tu-juego" className="authCard__input" />
              </div>
              <div>
                <label className="authCard__label">Etiquetas (separadas por coma)</label>
                <input type="text" value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} className="authCard__input" />
              </div>
              <CollaboratorsField collaborators={editCollaborators} onChange={setEditCollaborators} />
              <p style={{ fontSize: '12px', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', margin: 0 }}>
                ⚠️ La lista de colaboradores que envíes <strong>reemplazará</strong> la actual.
              </p>
              <div style={{ border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: '10px', padding: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editForm.authorization} onChange={e => setEditForm(f => ({ ...f, authorization: e.target.checked }))}
                    style={{ marginTop: '2px', width: '16px', height: '16px' }} />
                  <span style={{ fontSize: '14px', color: '#374151' }}>
                    Confirmo que tengo autorización para editar este proyecto. <span style={{ color: '#dc2626' }}>*</span>
                  </span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={editLoading || !editForm.authorization}
                  className="btn btn--primary" style={{ flex: 1, justifyContent: 'center', borderRadius: '10px' }}>
                  {editLoading ? 'Enviando...' : 'Enviar solicitud'}
                </button>
                <button type="button" onClick={() => setEditingProject(null)}
                  style={{ border: '1px solid #d1d5db', background: 'transparent', color: '#374151', padding: '12px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {deletingProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '360px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ fontWeight: '900', fontSize: '18px', color: '#111827', marginBottom: '8px' }}>¿Solicitar eliminación?</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Vas a solicitar la eliminación de:</p>
            <p style={{ fontWeight: '700', color: '#111827', marginBottom: '16px' }}>"{deletingProject.title}"</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '24px' }}>Un administrador revisará la solicitud antes de eliminar el proyecto.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeletingProject(null)}
                style={{ flex: 1, border: '1px solid #d1d5db', background: 'transparent', color: '#374151', padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleteLoading}
                style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: deleteLoading ? 0.5 : 1 }}>
                {deleteLoading ? 'Enviando...' : 'Sí, solicitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}