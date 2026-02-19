import { useState, useEffect } from 'react'
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

export default function SubmitProjectPage() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [images, setImages] = useState([])
  const [videos, setVideos] = useState([])

  const [form, setForm] = useState({
    title: '', description: '', full_description: '',
    subject_id: '', year: new Date().getFullYear(),
    tags: '', collaborators: '', game_url: '', authorization: false,
  })

  useEffect(() => {
    api.get('/subjects').then(r => setSubjects(r.data)).catch(() => setError('No se pudieron cargar las asignaturas'))
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: null }))
  }

  const handleImages = (e) => {
    const files = Array.from(e.target.files)
    const errs = validateFiles(files, ACCEPTED_IMAGES, MAX_IMAGE_MB)
    if (errs.length) { setError(errs.join(' ')); e.target.value = ''; return }
    setImages(files); setError('')
  }

  const handleVideos = (e) => {
    const files = Array.from(e.target.files)
    const errs = validateFiles(files, ACCEPTED_VIDEOS, MAX_VIDEO_MB)
    if (errs.length) { setError(errs.join(' ')); e.target.value = ''; return }
    setVideos(files); setError('')
  }

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
    form.collaborators.split(',').map(id => id.trim()).filter(Boolean).forEach(id => fd.append('collaborators[]', id))
    images.forEach(f => fd.append('images[]', f))
    videos.forEach(f => fd.append('videos[]', f))

    try {
      await api.post('/requests/create-project', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess(true)
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) { setFieldErrors(errors); setError('Corrige los errores del formulario.') }
      else setError(err.response?.data?.message || 'Error al enviar la solicitud.')
    } finally { setLoading(false) }
  }

  const resetForm = () => {
    setSuccess(false); setImages([]); setVideos([])
    setForm({ title: '', description: '', full_description: '', subject_id: '', year: new Date().getFullYear(), tags: '', collaborators: '', game_url: '', authorization: false })
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
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Subir Proyecto</h1>
          <p className="text-sm text-gray-500 mb-6">Tu solicitud será revisada por un administrador antes de publicarse.</p>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-5 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
              <input type="text" name="title" value={form.title} onChange={handleChange} maxLength={255} required
                placeholder="Ej: Aplicación de gestión de tareas"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.title ? 'border-red-400' : 'border-gray-300'}`} />
              {fieldErrors.title && <p className="text-red-500 text-xs mt-1">{fieldErrors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción breve <span className="text-red-500">*</span></label>
              <textarea name="description" value={form.description} onChange={handleChange} required rows={3}
                placeholder="Un resumen corto de qué trata el proyecto"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${fieldErrors.description ? 'border-red-400' : 'border-gray-300'}`} />
              {fieldErrors.description && <p className="text-red-500 text-xs mt-1">{fieldErrors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción completa <span className="text-gray-400 font-normal">(opcional)</span></label>
              <textarea name="full_description" value={form.full_description} onChange={handleChange} rows={5}
                placeholder="Tecnologías usadas, objetivos, resultados..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asignatura <span className="text-red-500">*</span></label>
                <select name="subject_id" value={form.subject_id} onChange={handleChange} required
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${fieldErrors.subject_id ? 'border-red-400' : 'border-gray-300'}`}>
                  <option value="">Selecciona una asignatura</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {fieldErrors.subject_id && <p className="text-red-500 text-xs mt-1">{fieldErrors.subject_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input type="number" name="year" value={form.year} onChange={handleChange} min={1900} max={2100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enlace al juego / demo <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input type="url" name="game_url" value={form.game_url} onChange={handleChange}
                placeholder="https://itch.io/tu-juego"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Etiquetas <span className="text-gray-400 font-normal">(separadas por coma)</span></label>
              <input type="text" name="tags" value={form.tags} onChange={handleChange}
                placeholder="Ej: Unity, C#, Puzzle"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IDs de colaboradores <span className="text-gray-400 font-normal">(separados por coma)</span></label>
              <input type="text" name="collaborators" value={form.collaborators} onChange={handleChange}
                placeholder="Ej: 3, 7, 12"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imágenes <span className="text-gray-400 font-normal">(jpg, png, gif, webp · máx. {MAX_IMAGE_MB}MB c/u)</span>
              </label>
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={handleImages}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              {images.length > 0 && <p className="text-xs text-green-600 mt-1">✓ {images.length} imagen(es) seleccionada(s): {images.map(f => f.name).join(', ')}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vídeos <span className="text-gray-400 font-normal">(mp4, avi, mov · máx. {MAX_VIDEO_MB}MB c/u)</span>
              </label>
              <input type="file" accept="video/mp4,video/avi,video/quicktime" multiple onChange={handleVideos}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              {videos.length > 0 && <p className="text-xs text-green-600 mt-1">✓ {videos.length} vídeo(s) seleccionado(s): {videos.map(f => f.name).join(', ')}</p>}
            </div>

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