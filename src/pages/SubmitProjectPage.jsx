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
  const cls = collab.type === 'user' ? 'collab__chip collab__chip--user' : 'collab__chip collab__chip--text'
  return (
    <span className={cls}>
      {collab.type === 'user' && '👤 '}
      {collab.name || collab.value}
      {onRemove && <button type="button" onClick={onRemove} className="collab__chipBtn">✕</button>}
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
      <label className="collab__label">
        Colaboradores <span className="collab__optional">(opcional)</span>
      </label>
      <p className="collab__hint">
        Introduce un correo para buscar usuarios registrados, o un nombre para añadirlo como texto. Enter o coma para añadir.
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
          <input type="text" value={input} onChange={handleInput} onKeyDown={handleKeyDown}
            placeholder="correo@usal.es o Nombre Apellido..."
            className="collab__input" />
          {searching && <span className="collab__searching">Buscando...</span>}
        </div>
        <button type="button" onClick={handleAddClick}
          disabled={!input.trim() || (isEmail(input.trim()) && hint?.type !== 'found')}
          className="collab__addBtn">
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

  const inputCls = (hasError) => hasError ? 'authCard__input authCard__input--error' : 'authCard__input'

  if (success) return (
    <div className="page">
      <Navbar />
      <main className="content submitSuccess">
        <div className="submitSuccess__card">
          <div className="submitSuccess__icon"></div>
          <h2 className="submitSuccess__title">¡Solicitud enviada!</h2>
          <p className="submitSuccess__desc">Tu proyecto ha sido enviado para revisión. Un administrador lo aprobará próximamente.</p>
          <div className="submitSuccess__actions">
            <button onClick={() => navigate('/')} className="btn btn--primary">Volver al inicio</button>
            <button onClick={resetForm} className="submitSuccess__secondaryBtn">Enviar otro proyecto</button>
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
          </div>
        </div>
      </header>

      <main className="content submitWrap">
        <div className="submitCard">
          <p className="submitCard__intro">
            Rellena los datos de tu proyecto. Un administrador lo revisará antes de publicarlo.
          </p>

          {error && <div className="submitCard__error">{error}</div>}

          <form onSubmit={handleSubmit} className="submitForm">

            {/* Título */}
            <div>
              <label className="authCard__label">Título <span className="text-req">*</span></label>
              <input type="text" name="title" value={form.title} onChange={handleChange} required
                placeholder="Nombre del proyecto" className={inputCls(fieldErrors.title)} />
              {fieldErrors.title && <p className="submitForm__fieldError">{fieldErrors.title}</p>}
            </div>

            {/* Descripción breve */}
            <div>
              <label className="authCard__label">Descripción breve <span className="text-req">*</span></label>
              <textarea name="description" value={form.description} onChange={handleChange} required rows={2}
                placeholder="Una frase que resuma el proyecto"
                className={`modal__textarea${fieldErrors.description ? ' modal__textarea--error' : ''}`} />
            </div>

            {/* Descripción completa */}
            <div>
              <label className="authCard__label">Descripción completa <span className="authCard__optional">(opcional)</span></label>
              <textarea name="full_description" value={form.full_description} onChange={handleChange} rows={4}
                placeholder="Explica en detalle tu proyecto, tecnologías usadas, proceso de desarrollo..."
                className="modal__textarea" />
            </div>

            {/* Asignatura y Año */}
            <div className="modal__grid2">
              <div>
                <label className="authCard__label">Asignatura <span className="text-req">*</span></label>
                <select name="subject_id" value={form.subject_id} onChange={handleChange} required
                  className={inputCls(fieldErrors.subject_id)}>
                  <option value="">Selecciona...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="authCard__label">Año</label>
                <input type="number" name="year" value={form.year} onChange={handleChange} min={1900} max={2100}
                  className="authCard__input" />
              </div>
            </div>

            {/* Demo */}
            <div>
              <label className="authCard__label">Enlace al juego / demo <span className="authCard__optional">(opcional)</span></label>
              <input type="url" name="game_url" value={form.game_url} onChange={handleChange}
                placeholder="https://itch.io/tu-juego" className="authCard__input" />
            </div>

            {/* Tags */}
            <div>
              <label className="authCard__label">Etiquetas <span className="authCard__optional">(separadas por coma)</span></label>
              <input type="text" name="tags" value={form.tags} onChange={handleChange}
                placeholder="Unity, C#, Puzzle, 2D..." className="authCard__input" />
            </div>

            {/* Colaboradores */}
            <CollaboratorsField collaborators={collaborators} onChange={setCollaborators} />

            {/* Imágenes */}
            <div>
              <div className="submitForm__labelRow">
                <label className="authCard__label">
                  Imágenes <span className="authCard__optional">jpg, png, gif, webp · máx. {MAX_IMAGE_MB}MB</span>
                </label>
                {selectedImages > 0 && (
                  <button type="button" onClick={removeSelectedImages} className="submitForm__removeBtn">
                     Eliminar ({selectedImages})
                  </button>
                )}
              </div>
              <p className="submitForm__tip"> <strong>Medidas óptimas:</strong> 1920×1080px (16:9). Mínimo 1280×720px.</p>
              <button type="button" onClick={() => imageInputRef.current?.click()} className="submitForm__dropzone">
                + Añadir imágenes
              </button>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={handleAddImages} style={{ display: 'none' }} />
              {images.length > 0 && (
                <>
                  <div className="submitForm__fileGrid">
                    {images.map(img => (
                      <div key={img.id} onClick={() => toggleImageSelect(img.id)}
                        className={`submitForm__imgThumb${img.selected ? ' submitForm__imgThumb--selected' : ''}`}>
                        <img src={img.preview} alt={img.file.name} />
                        {img.selected && (
                          <div className="submitForm__imgOverlay"><span className="submitForm__imgCheck">✓</span></div>
                        )}
                        <div className="submitForm__imgSize">{formatBytes(img.file.size)}</div>
                      </div>
                    ))}
                  </div>
                  <p className="submitForm__fileHint">{images.length} imagen{images.length !== 1 ? 'es' : ''} · Haz clic para seleccionar y eliminar</p>
                </>
              )}
            </div>

            {/* Vídeos */}
            <div>
              <div className="submitForm__labelRow">
                <label className="authCard__label">
                  Vídeos <span className="authCard__optional">mp4, avi, mov · máx. {MAX_VIDEO_MB}MB</span>
                </label>
                {selectedVideos > 0 && (
                  <button type="button" onClick={removeSelectedVideos} className="submitForm__removeBtn">
                    🗑 Eliminar ({selectedVideos})
                  </button>
                )}
              </div>
              <p className="submitForm__tip"> <strong>Medidas óptimas:</strong> 1920×1080px a 30fps, formato MP4 (H.264). Duración: 1–3 minutos.</p>
              <button type="button" onClick={() => videoInputRef.current?.click()} className="submitForm__dropzone">
                + Añadir vídeos
              </button>
              <input ref={videoInputRef} type="file" accept="video/mp4,video/avi,video/quicktime" multiple onChange={handleAddVideos} style={{ display: 'none' }} />
              {videos.length > 0 && (
                <>
                  <div className="submitForm__videoList">
                    {videos.map(v => (
                      <div key={v.id} onClick={() => toggleVideoSelect(v.id)}
                        className={`submitForm__videoItem${v.selected ? ' submitForm__videoItem--selected' : ''}`}>
                        <span>{v.selected ? '✓' : '🎬'}</span>
                        <div>
                          <p className="submitForm__videoName">{v.file.name}</p>
                          <p className="submitForm__videoSize">{formatBytes(v.file.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="submitForm__fileHint">{videos.length} vídeo{videos.length !== 1 ? 's' : ''} · Haz clic para seleccionar y eliminar</p>
                </>
              )}
            </div>

            {/* Autorización */}
            <div className={`submitForm__authBox${fieldErrors.authorization ? ' submitForm__authBox--error' : ''}`}>
              <label className="submitForm__authLabel">
                <input type="checkbox" name="authorization" checked={form.authorization} onChange={handleChange} />
                <span className="submitForm__authText">
                  <strong>Autorizo la publicación de este proyecto</strong> en el repositorio académico.
                  Confirmo que soy autor o tengo permiso de los autores para compartirlo. <span className="text-req">*</span>
                </span>
              </label>
              {fieldErrors.authorization && <p className="submitForm__authError">{fieldErrors.authorization}</p>}
            </div>

            <button type="submit" disabled={loading || !form.authorization} className="btn btn--primary submitForm__submitBtn">
              {loading ? 'Enviando solicitud...' : 'Enviar solicitud de publicación'}
            </button>
            <p className="submitForm__submitNote">Tu proyecto será visible una vez que un administrador lo apruebe.</p>

          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}