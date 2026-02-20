import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import api from '../services/api'

// La URL base del backend para construir URLs de archivos
const STORAGE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'https://repositorio-backend-production.up.railway.app'

function mediaUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_URL}/storage/${path}`
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(null) // índice de imagen en lightbox

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

  // Separar media por tipo
  const images = project.media?.filter(m => m.type === 'image' || m.mime_type?.startsWith('image/')) ?? []
  const videos = project.media?.filter(m => m.type === 'video' || m.mime_type?.startsWith('video/')) ?? []
  // Si no hay tipo definido, usar extensión
  const allImages = images.length > 0 ? images : (project.media?.filter(m => {
    const ext = (m.path || m.filename || '').split('.').pop().toLowerCase()
    return ['jpg','jpeg','png','gif','webp'].includes(ext)
  }) ?? [])
  const allVideos = videos.length > 0 ? videos : (project.media?.filter(m => {
    const ext = (m.path || m.filename || '').split('.').pop().toLowerCase()
    return ['mp4','avi','mov','quicktime'].includes(ext)
  }) ?? [])

  const coverImage = allImages[0] ? mediaUrl(allImages[0].path || allImages[0].filename) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white text-3xl leading-none">&times;</button>
          {lightbox > 0 && (
            <button
              className="absolute left-4 text-white text-4xl leading-none px-2"
              onClick={e => { e.stopPropagation(); setLightbox(l => l - 1) }}
            >‹</button>
          )}
          {lightbox < allImages.length - 1 && (
            <button
              className="absolute right-4 text-white text-4xl leading-none px-2"
              onClick={e => { e.stopPropagation(); setLightbox(l => l + 1) }}
            >›</button>
          )}
          <img
            src={mediaUrl(allImages[lightbox].path || allImages[lightbox].filename)}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Breadcrumb */}
        <div className="text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-blue-600 transition">Proyectos</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-600">{project.title}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

          {/* Hero: imagen de portada o gradiente */}
          {coverImage ? (
            <div className="h-64 sm:h-80 overflow-hidden bg-gray-100 cursor-pointer" onClick={() => setLightbox(0)}>
              <img
                src={coverImage}
                alt={project.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="h-48 bg-gradient-to-br from-slate-700 to-blue-800 flex items-center justify-center">
              <span className="text-white text-6xl">📁</span>
            </div>
          )}

          <div className="p-6 sm:p-8">

            {/* Asignatura + año */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {project.subject && (
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                  {project.subject.name}
                </span>
              )}
              {project.year && (
                <span className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">
                  {project.year}
                </span>
              )}
            </div>

            {/* Título */}
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{project.title}</h1>

            {/* Autores */}
            {project.users?.length > 0 && (
              <p className="text-sm text-gray-500 mb-4">
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

            {/* Descripción breve (tagline) */}
            <p className="text-gray-700 text-base leading-relaxed mb-6 pb-6 border-b border-gray-100">
              {project.description}
            </p>

            {/* Descripción completa */}
            {project.full_description && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{project.full_description}</p>
              </div>
            )}

            {/* Enlace al juego */}
            {project.game_url && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Demo / Juego</h2>
                <a
                  href={project.game_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
                >
                  🎮 Jugar / Ver demo
                  <span className="text-blue-200 text-xs truncate max-w-[200px]">{project.game_url}</span>
                </a>
              </div>
            )}

            {/* Tags */}
            {project.tags?.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-500 mb-2">Etiquetas</h2>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Galería de imágenes */}
            {allImages.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Imágenes <span className="text-sm text-gray-400 font-normal">({allImages.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {allImages.map((img, i) => (
                    <div
                      key={img.id ?? i}
                      className="aspect-video overflow-hidden rounded-lg bg-gray-100 cursor-pointer border border-gray-200 hover:opacity-90 transition"
                      onClick={() => setLightbox(i)}
                    >
                      <img
                        src={mediaUrl(img.path || img.filename)}
                        alt={`Imagen ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Haz clic en una imagen para ampliarla</p>
              </div>
            )}

            {/* Vídeos */}
            {allVideos.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Vídeos <span className="text-sm text-gray-400 font-normal">({allVideos.length})</span>
                </h2>
                <div className="space-y-4">
                  {allVideos.map((vid, i) => (
                    <video
                      key={vid.id ?? i}
                      src={mediaUrl(vid.path || vid.filename)}
                      controls
                      className="w-full rounded-lg bg-black max-h-[400px]"
                      preload="metadata"
                    >
                      Tu navegador no soporta la reproducción de vídeo.
                    </video>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
              <span>
                Publicado el {new Date(project.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              <Link to="/" className="text-blue-600 hover:underline">← Volver</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}