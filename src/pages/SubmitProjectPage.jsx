import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import api from '../services/api'

const MAX_IMAGE_MB = 5
const MAX_VIDEO_MB = 50
const ACCEPTED_IMAGES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ACCEPTED_VIDEOS = ['video/mp4', 'video/avi', 'video/quicktime']

function validateFiles(files, accepted, maxMB) {
  const errors = []
  for (const f of files) {
    if (!accepted.includes(f.type)) errors.push(`"${f.name}" tiene un formato no permitido.`)
    else if (f.size > maxMB * 1024 * 1024) errors.push(`"${f.name}" supera el máximo de ${maxMB}MB.`)
  }
  return errors
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim())
}

function CollaboratorChip({ collab, onRemove }) {
  const base = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }
  if (collab.type === 'user') {
    return (
      <span style={{ ...base, background: '#dbeafe', color: '#1e40af' }}>
        👤 {collab.name || collab.value}
        <button type="button" onClick={onRemove} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e40af', fontSize: '12px', padding: 0 }}>✕</button>
      </span>
    )
  }
  return (
    <span style={{ ...base, background: '#f3f4f6', color: '#374151' }}>
      {collab.value}
      <button type="button" onClick={onRemove} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '12px', padding: 0 }}>✕</button>
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
      <label className="authCard__label">
        Colaboradores <span style={{ fontWeight: '400', color: '#9ca3af' }}>(opcional)</span>
      </label>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', marginTop: '2px' }}>
        Introduce un correo para buscar usuarios registrados, o un nombre para añadirlo como texto. Enter o coma para añadir.
      </p>
      {collaborators.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {collaborators.map((c, i) => (
            <CollaboratorChip key={i} collab={c}
              onRemove={() => onChange(collaborators.filter((_, idx) => idx !== i))} />
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input type="text" value={input} onChange={handleInput} onKeyDown={handleKeyDown}
            placeholder="correo@usal.es o Nombre Apellido..."
            className="authCard__input" style={{ width: '100%' }} />
          {searching && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#9ca3af' }}>Buscando...</span>}
        </div>
        <button type="button" onClick={handleAddClick}
          disabled={!input.trim() || (isEmail(input.trim()) && hint?.type !== 'found')}
          style={{ padding: '10px 14px', fontSize: '13px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', opacity: (!input.trim() || (isEmail(input.trim()) && hint?.type !== 'found')) ? 0.4 : 1 }}>
          Añadir
        </button>
      </div>
      {hint && (
        <p style={{ fontSize: '12px', marginTop: '6px', color: hint.type === 'found' ? '#16a34a' : '#dc2626' }}>
          {hint.type === 'found' ? '✓ ' : '✗ '}{hint.message}
          {hint.type === 'found' && (
            <button type="button"
              onClick={() => addCollaborator({ type: 'user', value: input.trim(), user_id: hint.user.id, name: hint.user.name || hint.user.email })}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#16a34a', fontSize: '12px', textDecoration: 'underline', marginLeft: '6px', fontFamily: 'inherit' }}>
              Añadir
            </button>
          )}
        </p>
      )}
    </div>
  )
}

export default function SubmitProjectPage() {
  const navigate = useNavigate()
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [images, setImages] = useState([])
  const [videos, setVideos] = useState([])
  const [collaborators, setCollaborators] = useState([])

  const [form, setForm] = useState({
    title: '', description: '', full_description: '',
    subject_id: '', year: new Date().getFullYear(),
    tags: '', game_url: '', authorization: false,
  })

  useEffect(() => {
    api.get('/subjects').then(r => setSubjects(r.data)).catch(() => setError('No se pudieron cargar las asignaturas'))
    return () => images.forEach(img => URL.revokeObjectURL(img.preview))
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: null }))
  }

  const handleAddImages = (e) => {
    const newFiles = Array.from(e.target.files)
    if (!newFiles.length) return
    const errs = validateFiles(newFiles, ACCEPTED_IMAGES, MAX_IMAGE_MB)
    if (errs.length) { setError(errs.join(' ')); e.target.value = ''; return }
    setError('')
    setImages(prev => [...prev, ...newFiles.map(file => ({
      file, preview: URL.createObjectURL(file),
      id: `${file.name}-${file.lastModified}-${Math.random()}`, selected: false,
    }))])
    e.target.value = ''
  }

  const handleAddVideos = (e) => {
    const newFiles = Array.from(e.target.files)
    if (!newFiles.length) return
    const errs = validateFiles(newFiles, ACCEPTED_VIDEOS, MAX_VIDEO_MB)
    if (errs.length) { setError(errs.join(' ')); e.target.value = ''; return }
    setError('')
    setVideos(prev => [...prev, ...newFiles.map(file => ({
      file, id: `${file.name}-${file.lastModified}-${Math.random()}`, selected: false,
    }))])
    e.target.value = ''
  }

  const toggleImageSelect = (id) => setImages(prev => prev.map(img => img.id === id ? { ...img, selected: !img.selected } : img))
  const toggleVideoSelect = (id) => setVideos(prev => prev.map(v => v.id === id ? { ...v, selected: !v.selected } : v))
  const removeSelectedImages = () => setImages(prev => { prev.filter(i => i.selected).forEach(i => URL.revokeObjectURL(i.preview)); return prev.filter(i => !i.selected) })
  const removeSelectedVideos = () => setVideos(prev => prev.filter(v => !v.selected))

  const selectedImages = images.filter(i => i.selected).length
  const selectedVideos = videos.filter(v => v.selected).length

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setFieldErrors({})
    if (!form.authorization) { setFieldErrors({ authorization: 'Debes aceptar los términos.' }); return }
    setLoading(true)
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('description', form.description)
    if (form.full_description) fd.append('full_description', form.full_description)
    fd.append('subject_id', form.subject_id)
    if (form.year) fd.append('year', form.year)
    if (form.game_url) fd.append('game_url', form.game_url)
    fd.append('authorization', '1')
    form.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => fd.append('tags[]', t))
    fd.append('collaborators_json', JSON.stringify(collaborators))
    images.forEach(img => fd.append('images[]', img.file))
    videos.forEach(v => fd.append('videos[]', v.file))
    try {
      await api.post('/requests/create-project', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess(true)
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) {
        setFieldErrors(data.errors)
        setError('Revisa los campos marcados en rojo.')
      } else {
        setError(data?.message || `Error ${err.response?.status}: ${err.message}`)
      }
    } finally { setLoading(false) }
  }

  const resetForm = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview))
    setSuccess(false); setImages([]); setVideos([]); setCollaborators([])
    setForm({ title: '', description: '', full_description: '', subject_id: '', year: new Date().getFullYear(), tags: '', game_url: '', authorization: false })
  }

  const inputStyle = (hasError) => ({
    width: '100%',
    border: `1px solid ${hasError ? '#fca5a5' : 'rgba(17,24,39,0.15)'}`,
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '15px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    background: hasError ? '#fef2f2' : '#fff',
  })

  if (success) return (
    <div className="page">
      <Navbar />
      <main className="content" style={{ maxWidth: '560px', textAlign: 'center', paddingTop: '80px' }}>
        <div className="about__card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#111827', marginBottom: '8px' }}>¡Solicitud enviada!</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>Tu proyecto ha sido enviado para revisión. Un administrador lo aprobará próximamente.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/')} className="btn btn--primary">Volver al inicio</button>
            <button onClick={resetForm}
              style={{ border: '1px solid #d1d5db', background: 'transparent', color: '#374151', padding: '12px 18px', borderRadius: '999px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit' }}>
              Enviar otro proyecto
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )

  return (
    <div className="page">
      <Navbar />

      <header className="hero">
        <div className="hero__inner">
          <div className="hero__content">
            <h1 className="hero__title">Subir Proyecto</h1>
            <p className="hero__subtitle">Comparte tu trabajo con la comunidad académica</p>
          </div>
        </div>
      </header>

      <main className="content" style={{ maxWidth: '700px' }}>
        <div className="about__card">
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', marginTop: 0 }}>
            Rellena los datos de tu proyecto. Un administrador lo revisará antes de publicarlo.
          </p>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '14px', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Título */}
            <div>
              <label className="authCard__label">Título <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="text" name="title" value={form.title} onChange={handleChange} required
                placeholder="Nombre del proyecto" style={inputStyle(fieldErrors.title)} />
              {fieldErrors.title && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{fieldErrors.title}</p>}
            </div>

            {/* Descripción breve */}
            <div>
              <label className="authCard__label">Descripción breve <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea name="description" value={form.description} onChange={handleChange} required rows={2}
                placeholder="Una frase que resuma el proyecto"
                style={{ ...inputStyle(fieldErrors.description), resize: 'none' }} />
            </div>

            {/* Descripción completa */}
            <div>
              <label className="authCard__label">Descripción completa <span style={{ fontWeight: '400', color: '#9ca3af' }}>(opcional)</span></label>
              <textarea name="full_description" value={form.full_description} onChange={handleChange} rows={4}
                placeholder="Explica en detalle tu proyecto, tecnologías usadas, proceso de desarrollo..."
                style={{ ...inputStyle(false), resize: 'none' }} />
            </div>

            {/* Asignatura y Año */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="authCard__label">Asignatura <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="subject_id" value={form.subject_id} onChange={handleChange} required
                  style={{ ...inputStyle(fieldErrors.subject_id), appearance: 'auto' }}>
                  <option value="">Selecciona...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="authCard__label">Año</label>
                <input type="number" name="year" value={form.year} onChange={handleChange} min={1900} max={2100}
                  style={inputStyle(false)} />
              </div>
            </div>

            {/* Demo */}
            <div>
              <label className="authCard__label">Enlace al juego / demo <span style={{ fontWeight: '400', color: '#9ca3af' }}>(opcional)</span></label>
              <input type="url" name="game_url" value={form.game_url} onChange={handleChange}
                placeholder="https://itch.io/tu-juego" style={inputStyle(false)} />
            </div>

            {/* Tags */}
            <div>
              <label className="authCard__label">Etiquetas <span style={{ fontWeight: '400', color: '#9ca3af' }}>(separadas por coma)</span></label>
              <input type="text" name="tags" value={form.tags} onChange={handleChange}
                placeholder="Unity, C#, Puzzle, 2D..." style={inputStyle(false)} />
            </div>

            {/* Colaboradores */}
            <CollaboratorsField collaborators={collaborators} onChange={setCollaborators} />

            {/* Imágenes */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="authCard__label" style={{ marginBottom: 0 }}>
                  Imágenes <span style={{ fontWeight: '400', color: '#9ca3af', fontSize: '12px' }}>jpg, png, gif, webp · máx. {MAX_IMAGE_MB}MB</span>
                </label>
                {selectedImages > 0 && (
                  <button type="button" onClick={removeSelectedImages}
                    style={{ fontSize: '12px', color: '#dc2626', border: '1px solid #fecaca', background: 'transparent', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    🗑 Eliminar ({selectedImages})
                  </button>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px' }}>
                💡 <strong>Medidas óptimas:</strong> 1920×1080px (16:9). Mínimo 1280×720px.
              </div>
              <button type="button" onClick={() => imageInputRef.current?.click()}
                style={{ width: '100%', border: '2px dashed #d1d5db', background: 'transparent', borderRadius: '10px', padding: '14px', fontSize: '14px', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#385e9d'; e.currentTarget.style.color = '#385e9d' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280' }}>
                + Añadir imágenes
              </button>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={handleAddImages} style={{ display: 'none' }} />
              {images.length > 0 && (
                <>
                  <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {images.map(img => (
                      <div key={img.id} onClick={() => toggleImageSelect(img.id)}
                        style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: `2px solid ${img.selected ? '#dc2626' : 'transparent'}`, aspectRatio: '1', opacity: img.selected ? 0.7 : 1, transition: 'all 0.15s' }}>
                        <img src={img.preview} alt={img.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {img.selected && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ background: '#dc2626', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900' }}>✓</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '10px', padding: '2px 4px' }}>{formatBytes(img.file.size)}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{images.length} imagen{images.length !== 1 ? 'es' : ''} · Haz clic para seleccionar y eliminar</p>
                </>
              )}
            </div>

            {/* Vídeos */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="authCard__label" style={{ marginBottom: 0 }}>
                  Vídeos <span style={{ fontWeight: '400', color: '#9ca3af', fontSize: '12px' }}>mp4, avi, mov · máx. {MAX_VIDEO_MB}MB</span>
                </label>
                {selectedVideos > 0 && (
                  <button type="button" onClick={removeSelectedVideos}
                    style={{ fontSize: '12px', color: '#dc2626', border: '1px solid #fecaca', background: 'transparent', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    🗑 Eliminar ({selectedVideos})
                  </button>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px' }}>
                💡 <strong>Medidas óptimas:</strong> 1920×1080px a 30fps, formato MP4 (H.264). Duración: 1–3 minutos.
              </div>
              <button type="button" onClick={() => videoInputRef.current?.click()}
                style={{ width: '100%', border: '2px dashed #d1d5db', background: 'transparent', borderRadius: '10px', padding: '14px', fontSize: '14px', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#385e9d'; e.currentTarget.style.color = '#385e9d' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280' }}>
                + Añadir vídeos
              </button>
              <input ref={videoInputRef} type="file" accept="video/mp4,video/avi,video/quicktime" multiple onChange={handleAddVideos} style={{ display: 'none' }} />
              {videos.length > 0 && (
                <>
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {videos.map(v => (
                      <div key={v.id} onClick={() => toggleVideoSelect(v.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${v.selected ? '#fca5a5' : '#e5e7eb'}`, background: v.selected ? '#fef2f2' : '#f9fafb', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <span style={{ fontSize: '20px', flexShrink: 0 }}>{v.selected ? '✓' : '🎬'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.file.name}</p>
                          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{formatBytes(v.file.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{videos.length} vídeo{videos.length !== 1 ? 's' : ''} · Haz clic para seleccionar y eliminar</p>
                </>
              )}
            </div>

            {/* Autorización */}
            <div style={{ border: `1px solid ${fieldErrors.authorization ? '#fca5a5' : '#e5e7eb'}`, background: fieldErrors.authorization ? '#fef2f2' : '#f9fafb', borderRadius: '10px', padding: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" name="authorization" checked={form.authorization} onChange={handleChange}
                  style={{ marginTop: '2px', width: '16px', height: '16px', flexShrink: 0 }} />
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  <strong>Autorizo la publicación de este proyecto</strong> en el repositorio académico.
                  Confirmo que soy autor o tengo permiso de los autores para compartirlo. <span style={{ color: '#dc2626' }}>*</span>
                </span>
              </label>
              {fieldErrors.authorization && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px', marginLeft: '26px' }}>{fieldErrors.authorization}</p>}
            </div>

            <button type="submit" disabled={loading || !form.authorization}
              className="btn btn--primary"
              style={{ width: '100%', justifyContent: 'center', borderRadius: '10px', padding: '14px', fontSize: '15px', opacity: (loading || !form.authorization) ? 0.5 : 1, cursor: (loading || !form.authorization) ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Enviando solicitud...' : 'Enviar solicitud de publicación'}
            </button>
            <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', margin: '-8px 0 0' }}>Tu proyecto será visible una vez que un administrador lo apruebe.</p>

          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}