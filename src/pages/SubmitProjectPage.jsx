import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import api from '../services/api'

const INITIAL_FORM = {
  title: '',
  description: '',
  long_description: '',
  subject_id: '',
  year: new Date().getFullYear(),
  url: '',
  github_url: '',
  tags: '',
  grade: '',
}

export default function SubmitProjectPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get('/subjects').then(res => setSubjects(res.data)).catch(() => {})
  }, [])

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setFieldErrors({ ...fieldErrors, [e.target.name]: '' })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setLoading(true)

    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      subject_id: form.subject_id || undefined,
      grade: form.grade || undefined,
      url: form.url || undefined,
      github_url: form.github_url || undefined,
      long_description: form.long_description || undefined,
    }

    try {
      const res = await api.post('/projects', payload)
      setSuccess(true)
      setTimeout(() => navigate(`/projects/${res.data.id}`), 1500)
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) {
        setFieldErrors(errors)
        setError('Revisa los campos marcados en rojo.')
      } else {
        setError(err.response?.data?.message || 'Error al crear el proyecto. Inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-40">
          <div className="text-center">
            <p className="text-6xl mb-4">🎉</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Proyecto publicado!</h2>
            <p className="text-gray-500 text-sm">Redirigiendo al proyecto...</p>
          </div>
        </div>
      </div>
    )
  }

  const Field = ({ label, name, type = 'text', required = false, hint, children }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {fieldErrors[name] && (
        <p className="text-xs text-red-500 mt-1">{Array.isArray(fieldErrors[name]) ? fieldErrors[name][0] : fieldErrors[name]}</p>
      )}
    </div>
  )

  const inputClass = name =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
      fieldErrors[name] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-slate-900 text-white py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Subir Proyecto</h1>
          <p className="text-slate-400 text-sm">Comparte tu trabajo con el resto de la comunidad</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Título */}
            <Field label="Título del proyecto" name="title" required>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Ej: Aplicación de gestión de tareas"
                className={inputClass('title')}
                required
              />
            </Field>

            {/* Descripción corta */}
            <Field label="Descripción breve" name="description" required hint="Máximo 2-3 frases. Aparece en la tarjeta del proyecto.">
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                placeholder="Describe brevemente de qué trata el proyecto..."
                className={inputClass('description')}
                required
              />
            </Field>

            {/* Descripción larga */}
            <Field label="Descripción detallada" name="long_description" hint="Opcional. Explica la arquitectura, tecnologías usadas, dificultades encontradas...">
              <textarea
                name="long_description"
                value={form.long_description}
                onChange={handleChange}
                rows={5}
                placeholder="Descripción más extensa del proyecto, objetivos, tecnologías..."
                className={inputClass('long_description')}
              />
            </Field>

            {/* Asignatura y Año */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Asignatura" name="subject_id">
                <select
                  name="subject_id"
                  value={form.subject_id}
                  onChange={handleChange}
                  className={inputClass('subject_id')}
                >
                  <option value="">Sin asignatura</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Año" name="year" required>
                <input
                  type="number"
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  min="2000"
                  max={new Date().getFullYear() + 1}
                  className={inputClass('year')}
                  required
                />
              </Field>
            </div>

            {/* URL y GitHub */}
            <Field label="URL del proyecto" name="url" hint="Opcional. Enlace a la demo o web del proyecto.">
              <input
                type="url"
                name="url"
                value={form.url}
                onChange={handleChange}
                placeholder="https://mi-proyecto.com"
                className={inputClass('url')}
              />
            </Field>

            <Field label="URL de GitHub" name="github_url" hint="Opcional. Enlace al repositorio del código.">
              <input
                type="url"
                name="github_url"
                value={form.github_url}
                onChange={handleChange}
                placeholder="https://github.com/usuario/repositorio"
                className={inputClass('github_url')}
              />
            </Field>

            {/* Tags */}
            <Field label="Etiquetas / Tecnologías" name="tags" hint="Separadas por comas. Ej: React, Node.js, MongoDB">
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="React, Tailwind, Laravel..."
                className={inputClass('tags')}
              />
            </Field>

            {/* Nota */}
            <Field label="Nota obtenida" name="grade" hint="Opcional. Ej: 9.5 o Sobresaliente.">
              <input
                type="text"
                name="grade"
                value={form.grade}
                onChange={handleChange}
                placeholder="Ej: 8.5"
                className={inputClass('grade')}
              />
            </Field>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? 'Publicando...' : '🚀 Publicar proyecto'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}