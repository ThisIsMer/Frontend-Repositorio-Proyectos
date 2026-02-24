import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
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

// ── Chip de colaborador ──────────────────────────────────────────────────────
function CollaboratorChip({ collab, onRemove }) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium'
  if (collab.type === 'user') {
    return (
      <span className={`${base} bg-blue-100 text-blue-800`}>
        👤 {collab.name || collab.value}
        <button type="button" onClick={onRemove} className="hover:text-blue-600 ml-0.5">✕</button>
      </span>
    )
  }
  return (
    <span className={`${base} bg-gray-100 text-gray-700`}>
      {collab.value}
      <button type="button" onClick={onRemove} className="hover:text-gray-500 ml-0.5">✕</button>
    </span>
  )
}

// ── Campo de colaboradores ───────────────────────────────────────────────────
function CollaboratorsField({ collaborators, onChange }) {
  const [input, setInput]         = useState('')
  const [searching, setSearching] = useState(false)
  const [hint, setHint]           = useState(null)  // { type: 'found'|'notfound'|'text', message, user? }
  const debounceRef = useRef(null)

  const addCollaborator = (collab) => {
    // Evitar duplicados
    if (collaborators.some(c => c.value === collab.value)) return
    onChange([...collaborators, collab])
    setInput('')
    setHint(null)
  }

  const handleInput = (e) => {
    const val = e.target.value
    setInput(val)
    setHint(null)
    clearTimeout(debounceRef.current)

    if (!val.trim()) return

    if (isEmail(val.trim())) {
      // Buscar el email en el backend con debounce
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
        } finally {
          setSearching(false)
        }
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
      } else if (hint?.type === 'notfound') {
        // No añadir email que no existe
      }
      // Si aún está buscando, esperar
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
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Colaboradores <span className="text-gray-400 font-normal">(opcional)</span>
      </label>
      <p className="text-xs text-gray-400 mb-2">
        Introduce un correo para buscar usuarios registrados, o un nombre/apellido para añadirlo como texto. Pulsa Enter o coma para añadir.
      </p>

      {/* Chips de colaboradores añadidos */}
      {collaborators.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {collaborators.map((c, i) => (
            <CollaboratorChip
              key={i}
              collab={c}
              onRemove={() => onChange(collaborators.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="correo@usal.es o Nombre Apellido..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">
              Buscando...
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          disabled={!input.trim() || (isEmail(input.trim()) && hint?.type !== 'found')}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 rounded-lg transition border border-gray-300"
        >
          Añadir
        </button>
      </div>

      {/* Hint */}
      {hint && (
        <p className={`text-xs mt-1.5 ${hint.type === 'found' ? 'text-green-600' : hint.type === 'notfound' ? 'text-red-500' : 'text-gray-500'}`}>
          {hint.type === 'found' ? '✓ ' : hint.type === 'notfound' ? '✗ ' : ''}{hint.message}
          {hint.type === 'found' && (
            <button
              type="button"
              onClick={() => addCollaborator({ type: 'user', value: input.trim(), user_id: hint.user.id, name: hint.user.name || hint.user.email })}
              className="ml-2 underline hover:no-underline"
            >
              Añadir
            </button>
          )}
        </p>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function SubmitProjectPage() {
  const navigate = useNavigate()
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const [subjects, setSubjects]       = useState([])
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [images, setImages]           = useState([])
  const [videos, setVideos]           = useState([])
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

    // Colaboradores como JSON en el campo collaborators_json
    // (FormData no soporta arrays de objetos directamente)
    fd.append('collaborators_json', JSON.stringify(collaborators))

    images.forEach(img => fd.append('images[]', img.file))
    videos.forEach(v => fd.append('videos[]', v.file))

    try {
      await api.post('/requests/create-project', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess(true)
    } catch (err) {
      const data = err.response?.data
      console.error('Error:', JSON.stringify(data, null, 2))
      if (data?.errors) {
        setFieldErrors(data.errors)
        setError('Errores: ' + Object.entries(data.errors).map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(', ') : m}`).join(' | '))
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

  if (success) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="max-w-lg mx-auto mt-24 bg-white p-10 rounded-xl shadow border border-gray-200 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Solicitud enviada!</h2>
        <p className="text-gray-500 text-sm mb-6">Tu proyecto ha sido enviado para revisión. Un administrador lo aprobará próximamente.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition">Volver al inicio</button>
          <button onClick={resetForm} className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium transition">Enviar otro proyecto</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Subir proyecto</h1>
          <p className="text-sm text-gray-500 mb-6">Rellena los datos de tu proyecto. Un administrador lo revisará antes de publicarlo.</p>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-4 rounded-lg mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
              <input type="text" name="title" value={form.title} onChange={handleChange} required
                placeholder="Nombre del proyecto"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.title ? 'border-red-400' : 'border-gray-300'}`} />
              {fieldErrors.title && <p className="text-red-500 text-xs mt-1">{fieldErrors.title}</p>}
            </div>

            {/* Descripción breve */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción breve <span className="text-red-500">*</span></label>
              <textarea name="description" value={form.description} onChange={handleChange} required rows={2}
                placeholder="Una frase que resuma el proyecto"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${fieldErrors.description ? 'border-red-400' : 'border-gray-300'}`} />
            </div>

            {/* Descripción completa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción completa <span className="text-gray-400 font-normal">(opcional)</span></label>
              <textarea name="full_description" value={form.full_description} onChange={handleChange} rows={4}
                placeholder="Explica en detalle tu proyecto, tecnologías usadas, proceso de desarrollo..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {/* Asignatura y Año */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asignatura <span className="text-red-500">*</span></label>
                <select name="subject_id" value={form.subject_id} onChange={handleChange} required
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${fieldErrors.subject_id ? 'border-red-400' : 'border-gray-300'}`}>
                  <option value="">Selecciona...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                <input type="number" name="year" value={form.year} onChange={handleChange} min={1900} max={2100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Demo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enlace al juego / demo <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input type="url" name="game_url" value={form.game_url} onChange={handleChange}
                placeholder="https://itch.io/tu-juego"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Etiquetas <span className="text-gray-400 font-normal">(separadas por coma)</span></label>
              <input type="text" name="tags" value={form.tags} onChange={handleChange}
                placeholder="Unity, C#, Puzzle, 2D..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Colaboradores */}
            <CollaboratorsField collaborators={collaborators} onChange={setCollaborators} />

            {/* ── IMÁGENES ── */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Imágenes <span className="text-gray-400 font-normal">(jpg, png, gif, webp · máx. {MAX_IMAGE_MB}MB c/u)</span>
                </label>
                {selectedImages > 0 && (
                  <button type="button" onClick={removeSelectedImages}
                    className="text-xs text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-2 py-1 rounded-lg transition">
                    🗑 Eliminar ({selectedImages})
                  </button>
                )}
              </div>
              {/* Aviso medidas óptimas */}
              <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-2">
                💡 <strong>Medidas óptimas:</strong> Imágenes de <strong>1920×1080 px</strong> (16:9) para el slot principal, o <strong>1280×720 px</strong> como mínimo. Evita imágenes muy verticales, se recortarán.
              </p>
              <button type="button" onClick={() => imageInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg py-3 text-sm text-gray-500 hover:text-blue-600 transition">
                + Añadir imágenes
              </button>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                multiple onChange={handleAddImages} className="hidden" />
              {images.length > 0 && (
                <>
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {images.map(img => (
                      <div key={img.id} onClick={() => toggleImageSelect(img.id)}
                        className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition aspect-square ${img.selected ? 'border-red-500 opacity-70' : 'border-transparent hover:border-blue-400'}`}>
                        <img src={img.preview} alt={img.file.name} className="w-full h-full object-cover" />
                        {img.selected && (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">✓</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 truncate">{formatBytes(img.file.size)}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{images.length} imagen{images.length !== 1 ? 'es' : ''} · Haz clic para seleccionar y eliminar</p>
                </>
              )}
            </div>

            {/* ── VÍDEOS ── */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Vídeos <span className="text-gray-400 font-normal">(mp4, avi, mov · máx. {MAX_VIDEO_MB}MB c/u)</span>
                </label>
                {selectedVideos > 0 && (
                  <button type="button" onClick={removeSelectedVideos}
                    className="text-xs text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-2 py-1 rounded-lg transition">
                    🗑 Eliminar ({selectedVideos})
                  </button>
                )}
              </div>
              {/* Aviso medidas óptimas */}
              <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-2">
                💡 <strong>Medidas óptimas:</strong> Vídeos en <strong>1920×1080 px</strong> a <strong>30fps</strong>, formato <strong>MP4 (H.264)</strong> para máxima compatibilidad. Duración recomendada: 1–3 minutos.
              </p>
              <button type="button" onClick={() => videoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg py-3 text-sm text-gray-500 hover:text-blue-600 transition">
                + Añadir vídeos
              </button>
              <input ref={videoInputRef} type="file" accept="video/mp4,video/avi,video/quicktime"
                multiple onChange={handleAddVideos} className="hidden" />
              {videos.length > 0 && (
                <>
                  <div className="mt-3 space-y-2">
                    {videos.map(v => (
                      <div key={v.id} onClick={() => toggleVideoSelect(v.id)}
                        className={`flex items-center gap-3 border rounded-lg px-3 py-2 cursor-pointer transition ${v.selected ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                        <span className="text-xl shrink-0">{v.selected ? '✓' : '🎬'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{v.file.name}</p>
                          <p className="text-xs text-gray-400">{formatBytes(v.file.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{videos.length} vídeo{videos.length !== 1 ? 's' : ''} · Haz clic para seleccionar y eliminar</p>
                </>
              )}
            </div>

            {/* Autorización */}
            <div className={`border rounded-lg p-4 ${fieldErrors.authorization ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="authorization" checked={form.authorization} onChange={handleChange}
                  className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">Autorizo la publicación de este proyecto</span> en el repositorio académico.
                  Confirmo que soy autor o tengo permiso de los autores para compartirlo. <span className="text-red-500">*</span>
                </span>
              </label>
              {fieldErrors.authorization && <p className="text-red-500 text-xs mt-2 ml-7">{fieldErrors.authorization}</p>}
            </div>

            <button type="submit" disabled={loading || !form.authorization}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-medium transition">
              {loading ? 'Enviando solicitud...' : 'Enviar solicitud de publicación'}
            </button>
            <p className="text-xs text-gray-400 text-center">Tu proyecto será visible una vez que un administrador lo apruebe.</p>
          </form>
        </div>
      </div>
    </div>
  )
}