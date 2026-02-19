import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import api from '../services/api'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/projects/${id}`)
      .then(r => setProject(r.data))
      .catch(err => setError(err.response?.status === 404 ? 'Proyecto no encontrado.' : 'Error al cargar el proyecto.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center py-32 text-gray-400">Cargando proyecto...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">← Volver al inicio</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10">

        <div className="text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-blue-600 transition">Proyectos</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-600">{project.title}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-48 bg-gradient-to-br from-slate-700 to-blue-800 flex items-center justify-center">
            <span className="text-white text-6xl">📁</span>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {project.subject && (
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">{project.subject.name}</span>
              )}
              {project.year && (
                <span className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">{project.year}</span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>

            {project.users?.length > 0 && (
              <p className="text-sm text-gray-500 mb-6">
                Por{' '}
                {project.users.map((u, i) => (
                  <span key={u.id}>
                    <Link to={`/users/${u.id}/projects`} className="text-blue-600 hover:underline">
                      {u.name || u.email}
                    </Link>
                    {i < project.users.length - 1 && ', '}
                  </span>
                ))}
              </p>
            )}

            <p className="text-gray-700 text-base mb-6 leading-relaxed">{project.description}</p>

            {project.full_description && (
              <div className="border-t border-gray-100 pt-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Descripción completa</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{project.full_description}</p>
              </div>
            )}

            {/* Enlace al juego */}
            {project.game_url && (
              <div className="border-t border-gray-100 pt-6 mb-6">
                <a href={project.game_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
                  🎮 Jugar / Ver demo
                </a>
              </div>
            )}

            {project.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {project.tags.map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            )}

            {project.media?.length > 0 && (
              <div className="border-t border-gray-100 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Archivos adjuntos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {project.media.map(m => (
                    <div key={m.id} className="border border-gray-200 rounded-lg p-3 text-sm text-gray-600 truncate">
                      📎 {m.filename || m.path}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 mt-6 flex items-center justify-between text-xs text-gray-400">
              <span>Publicado el {new Date(project.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <Link to="/" className="text-blue-600 hover:underline">← Volver</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}