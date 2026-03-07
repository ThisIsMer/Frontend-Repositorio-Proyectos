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
  const cls = collab.type === 'user' ? 'collab__chip collab__chip--user' : 'collab__chip collab__chip--text'
  return (
    <span className={cls}>
      {collab.type === 'user' && '👤 '}
      {collab.name || collab.value}
      {onRemove && (
        <button type="button" onClick={onRemove} className="collab__chipBtn">✕</button>
      )}
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
      if (hint?.type === 'found' && hint.user)
        addCollaborator({ type: 'user', value: val, user_id: hint.user.id, name: hint.user.name || hint.user.email })
    } else {
      addCollaborator({ type: 'text', value: val })
    }
  }

  const handleAddClick = () => {
    const val = input.trim()
    if (!val) return
    if (isEmail(val)) {
      if (hint?.type === 'found' && hint.user)
        addCollaborator({ type: 'user', value: val, user_id: hint.user.id, name: hint.user.name || hint.user.email })
    } else {
      addCollaborator({ type: 'text', value: val })
    }
  }

  return (
    <div className="collab__wrap">
      <label className="collab__label">Colaboradores</label>
      <p className="collab__hint">
        Correo para buscar usuarios registrados, o nombre/apellido como texto plano. Enter o coma para añadir.
      </p>
      {collaborators.length > 0 && (
        <div className="collab__chips">
          {collaborators.map((c, i) => (
            <CollaboratorChip key={i} collab={c}
              onRemove={() => onChange(collaborators.filter((_, idx) => idx !== i))} />
          ))}
        </div>
      )}
      <div className="collab__row">
        <div className="collab__inputWrap">
          <input
            type="text" value={input} onChange={handleInput} onKeyDown={handleKeyDown}
            placeholder="correo@usal.es o Nombre Apellido..."
            className="collab__input"
          />
          {searching && <span className="collab__searching">Buscando...</span>}
        </div>
        <button
          type="button" onClick={handleAddClick}
          disabled={!input.trim() || (isEmail(input.trim()) && hint?.type !== 'found')}
          className="collab__addBtn"
        >
          Añadir
        </button>
      </div>
      {hint && (
        <p className={hint.type === 'found' ? 'collab__hint--found' : 'collab__hint--notfound'}>
          {hint.type === 'found' ? '✓ ' : '✗ '}{hint.message}
          {hint.type === 'found' && (
            <button type="button" className="collab__hintBtn"
              onClick={() => addCollaborator({ type: 'user', value: input.trim(), user_id: hint.user.id, name: hint.user.name || hint.user.email })}>
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
  const bannerInputRef = useRef(null)

  const [projects, setProjects] = useState([])
  const [requests, setRequests] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '' })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
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

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    if (bannerPreview) URL.revokeObjectURL(bannerPreview)
  }, [avatarPreview, bannerPreview])

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

  const handleBannerChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) { setSaveError('Solo JPG, PNG o WebP.'); return }
    if (file.size > 8 * 1024 * 1024) { setSaveError('Máximo 8MB para el banner.'); return }
    setSaveError('')
    setBannerFile(file)
    if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    setBannerPreview(URL.createObjectURL(file))
    // Open edit form so user can save
    setEditing(true)
    setSaveSuccess(false)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaveLoading(true); setSaveError(''); setSaveSuccess(false)
    try {
      const fd = new FormData()
      fd.append('_method', 'PUT')
      fd.append('name', form.name)
      fd.append('bio', form.bio)
      if (avatarFile) fd.append('profile_picture', avatarFile)
      if (bannerFile) fd.append('banner_image', bannerFile)
      const res = await api.post('/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
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
    pending:  { text: 'Pendiente', cls: 'statusBadge statusBadge--pending' },
    approved: { text: 'Aprobada',  cls: 'statusBadge statusBadge--approved' },
    rejected: { text: 'Rechazada', cls: 'statusBadge statusBadge--rejected' },
  }[status] || { text: status, cls: 'statusBadge' })

  const typeLabel = (type) => ({
    create: 'Crear proyecto', update: 'Editar proyecto', delete: 'Eliminar proyecto'
  }[type] || type)

  const currentAvatar = avatarPreview || avatarUrl(user?.profile_picture)
  const currentBanner = bannerPreview || avatarUrl(user?.banner_image)

  return (
    <div className="page">
      <Navbar />
      <main className="main">

        {/* Banner + Avatar */}
        <div className="profileBanner__wrap">
          <div className="profileBanner">
            {currentBanner && (
              <img src={currentBanner} alt="Banner" className="profileBanner__img" />
            )}
            <svg className="profileBanner__svg" viewBox="0 0 420 420">
              <circle cx="300" cy="100" r="220" fill="white" />
              <circle cx="180" cy="340" r="140" fill="white" />
            </svg>
            {/* Banner edit button — always visible */}
            <button
              type="button"
              className="profileBanner__editBtn"
              onClick={() => bannerInputRef.current?.click()}
            >
              🖼️ Cambiar portada
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleBannerChange}
              style={{ display: 'none' }}
            />
          </div>
          <div className="profileAvatar__anchor">
            <div className="profileAvatar">
              {currentAvatar
                ? <img src={currentAvatar} alt="Avatar" />
                : <img src={`${import.meta.env.BASE_URL}icons/user.png`} alt="Avatar" className="profileAvatar__placeholder" />
              }
            </div>
            <button
              type="button"
              className="profileAvatar__cameraBtn"
              onClick={() => { setEditing(true); setSaveSuccess(false); setTimeout(() => avatarInputRef.current?.click(), 50) }}
            >
              📷
            </button>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </div>
        </div>

        {/* Info del usuario */}
        <div className="profileInfo">
          <h1 className="profileInfo__name">{user?.name || '—'}</h1>
          <p className="profileInfo__email">{user?.email}</p>
          {user?.bio && <p className="profileInfo__bio">{user.bio}</p>}

          {!editing ? (
            <button className="profileInfo__editBtn" onClick={() => { setEditing(true); setSaveSuccess(false) }}>
              ✏️ Editar perfil
            </button>
          ) : (
            <div className="profileInfo__editSpacer" />
          )}

          {saveSuccess && (
            <div className="profileInfo__successMsg">Perfil actualizado correctamente.</div>
          )}

          {editing && (
            <div className="profileEditForm">
              <h3 className="profileEditForm__title">Editar perfil</h3>
              {saveError && <div className="profileEditForm__error">{saveError}</div>}
              <form onSubmit={handleSaveProfile} className="profileEditForm__fields">
                {avatarFile && <p className="profileEditForm__avatarHint">✓ Nueva foto de perfil: {avatarFile.name}</p>}
                {bannerFile && <p className="profileEditForm__avatarHint">✓ Nueva portada: {bannerFile.name}</p>}
                <div>
                  <label className="authCard__label">Nombre</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="authCard__input" placeholder="Tu nombre completo" />
                </div>
                <div>
                  <label className="authCard__label">Biografía</label>
                  <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} maxLength={1000} className="modal__textarea" placeholder="Cuéntanos algo sobre ti..." />
                </div>
                <div className="profileEditForm__actions">
                  <button type="submit" disabled={saveLoading} className="btn btn--primary btn--sm">
                    {saveLoading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button type="button" onClick={cancelEdit} className="profileEditForm__cancelBtn">Cancelar</button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="profileDivider"><hr /></div>

        {/* Contenido */}
        <div className="profileContent">

          {/* Mis proyectos */}
          <div className="profileCard">
            <div className="profileCard__header">
              <h2 className="profileCard__title">Mis Proyectos</h2>
            </div>
            {loadingProjects ? (
              <p className="about__meta">Cargando proyectos...</p>
            ) : projects.length === 0 ? (
              <div className="profileCard__empty">
                <p className="profileCard__emptyText">No tienes proyectos publicados aún.</p>
                <Link to="/submit" className="btn btn--primary btn--sm">+ Subir proyecto</Link>
              </div>
            ) : (
              <div className="profileCard__list">
                {projects.map(project => (
                  <div key={project.id} className="profileCard__item">
                    <div className="profileCard__itemInfo">
                      <Link to={`/projects/${project.id}`} className="profileCard__itemTitle">{project.title}</Link>
                      <p className="profileCard__itemMeta">{project.subject?.name} · {project.year}</p>
                    </div>
                    <div className="profileCard__itemActions">
                      <button onClick={() => openEdit(project)} className="profileCard__editBtn">✏️ Editar</button>
                      <button onClick={() => setDeletingProject(project)} className="profileCard__deleteBtn">🗑️ Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mis solicitudes */}
          <div className="profileCard">
            <div className="profileCard__header">
              <h2 className="profileCard__title">Mis Solicitudes</h2>
            </div>
            {loadingRequests ? (
              <p className="about__meta">Cargando solicitudes...</p>
            ) : requests.length === 0 ? (
              <p className="profileCard__empty">No has enviado ninguna solicitud aún.</p>
            ) : (
              <div className="profileCard__list">
                {requests.map(req => {
                  const { text, cls } = statusLabel(req.status)
                  return (
                    <div key={req.id} className="profileCard__reqItem">
                      <div>
                        <span className="profileCard__reqTitle">{req.data?.title || `Solicitud #${req.id}`}</span>
                        <span className="profileCard__reqType">{typeLabel(req.type)}</span>
                        <p className="profileCard__reqDate">
                          {new Date(req.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        {req.admin_message && <p className="profileCard__reqReason">Motivo: {req.admin_message}</p>}
                      </div>
                      <span className={cls}>{text}</span>
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
        <div className="modal__overlay">
          <div className="modal__box">
            <div className="modal__header">
              <h3 className="modal__title">Solicitar edición</h3>
              <button onClick={() => setEditingProject(null)} className="modal__closeBtn">✕</button>
            </div>
            <p className="modal__subtitle">
              Se enviará una solicitud de edición. Un administrador la revisará antes de aplicar los cambios.
            </p>
            {editError && <div className="modal__error">{editError}</div>}
            <form onSubmit={handleEditSubmit} className="modal__form">
              <div>
                <label className="authCard__label">Título *</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required className="authCard__input" />
              </div>
              <div>
                <label className="authCard__label">Descripción breve *</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} required rows={2} className="modal__textarea" />
              </div>
              <div>
                <label className="authCard__label">Descripción completa</label>
                <textarea value={editForm.full_description} onChange={e => setEditForm(f => ({ ...f, full_description: e.target.value }))} rows={3} className="modal__textarea" />
              </div>
              <div className="modal__grid2">
                <div>
                  <label className="authCard__label">Asignatura</label>
                  <select value={editForm.subject_id} onChange={e => setEditForm(f => ({ ...f, subject_id: e.target.value }))} className="modal__select">
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
              <p className="modal__warn">
                ⚠️ La lista de colaboradores que envíes <strong>reemplazará</strong> la actual.
              </p>
              <div className="modal__authBox">
                <label className="modal__authLabel">
                  <input type="checkbox" checked={editForm.authorization} onChange={e => setEditForm(f => ({ ...f, authorization: e.target.checked }))} />
                  <span className="modal__authText">Confirmo que tengo autorización para editar este proyecto. <span style={{color:'#dc2626'}}>*</span></span>
                </label>
              </div>
              <div className="modal__actions">
                <button type="submit" disabled={editLoading || !editForm.authorization} className="btn btn--primary modal__submitBtn">
                  {editLoading ? 'Enviando...' : 'Enviar solicitud'}
                </button>
                <button type="button" onClick={() => setEditingProject(null)} className="modal__cancelBtn">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {deletingProject && (
        <div className="modal__overlay">
          <div className="modal__box modal__box--sm">
            <div className="modal__icon">🗑️</div>
            <h3 className="modal__deleteTitle">¿Solicitar eliminación?</h3>
            <p className="modal__deleteDesc">Vas a solicitar la eliminación de:</p>
            <p className="modal__deleteTarget">"{deletingProject.title}"</p>
            <p className="modal__deleteNote">Un administrador revisará la solicitud antes de eliminar el proyecto.</p>
            <div className="modal__deleteActions">
              <button onClick={() => setDeletingProject(null)} className="modal__cancelBtnAlt">Cancelar</button>
              <button onClick={handleDeleteConfirm} disabled={deleteLoading} className="modal__confirmBtn">
                {deleteLoading ? 'Enviando...' : 'Sí, solicitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}