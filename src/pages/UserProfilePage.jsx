import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import api from '../services/api'

export default function UserProfilePage() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/users/${id}/projects`)
      .then(r => {
        setUser(r.data.user)
        setProjects(r.data.projects)
      })
      .catch(err => {
        if (err.response?.status === 404) {
          setError('Usuario no encontrado.')
        } else {
          setError('Error al cargar el perfil.')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center py-32 text-gray-400">Cargando perfil...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">← Volver al inicio</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Tarjeta de perfil */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8 flex items-center gap-6">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-600 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {user.name || user.email}
            </h1>
            {user.name && (
              <p className="text-sm text-gray-400">{user.email}</p>
            )}
            {user.bio && (
              <p className="text-sm text-gray-600 mt-1">{user.bio}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {projects.length} proyecto{projects.length !== 1 ? 's' : ''} publicado{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Proyectos del usuario */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Proyectos</h2>

        {projects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl py-16 text-center text-gray-400">
            Este usuario aún no tiene proyectos publicados.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map(project => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200 overflow-hidden">
                  <div className="h-36 bg-gradient-to-br from-slate-700 to-blue-800 flex items-center justify-center">
                    <span className="text-white text-4xl">📁</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                        {project.subject?.name}
                      </span>
                      {project.year && (
                        <span className="text-xs text-gray-400">{project.year}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-2 mb-1 line-clamp-2">
                      {project.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">{project.description}</p>
                    {project.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {project.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}