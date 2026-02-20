import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import api from '../services/api'

const STORAGE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'https://repositorio-backend-production.up.railway.app'

function mediaUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_URL}/storage/${path}`
}

function isImage(item) {
  if (item.type === 'image' || item.mime_type?.startsWith('image/')) return true
  const ext = (item.path || item.filename || '').split('.').pop().toLowerCase()
  return ['jpg','jpeg','png','gif','webp'].includes(ext)
}

function isVideo(item) {
  if (item.type === 'video' || item.mime_type?.startsWith('video/')) return true
  const ext = (item.path || item.filename || '').split('.').pop().toLowerCase()
  return ['mp4','avi','mov','quicktime'].includes(ext)
}

// ── Vídeo en slot destacado con controles al hover ───────────────────────────
function FeaturedVideo({ src }) {
  const videoRef = useRef(null)
  const [showControls, setShowControls] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.play().catch(() => {})
    const onTime = () => { setCurrentTime(v.currentTime); setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0) }
    const onMeta = () => setDuration(v.duration)
    const onPlay  = () => setPaused(false)
    const onPause = () => setPaused(true)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [src])

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
  }

  const togglePlay = () => { const v = videoRef.current; paused ? v.play() : v.pause() }

  const seek = (e) => {
    const v = videoRef.current
    if (!v || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const fullscreen = () => {
    const v = videoRef.current
    if (!v) return
    if (v.requestFullscreen) v.requestFullscreen()
    else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen()
  }

  return (
    <div
      className="relative w-full h-full bg-black rounded-xl overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video ref={videoRef} src={src} className="w-full h-full object-contain" loop muted playsInline />

      {/* Overlay con gradiente + controles */}
      <div
        className="absolute inset-0 flex flex-col justify-end transition-opacity duration-200"
        style={{ opacity: showControls ? 1 : 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }}
      >
        {/* Barra de progreso */}
        <div className="w-full h-1.5 bg-white/25 cursor-pointer" onClick={seek}>
          <div className="h-full bg-white rounded-full" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }} />
        </div>

        {/* Botones */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button onClick={togglePlay} className="text-white hover:text-blue-300 transition text-xl leading-none w-6">
            {paused ? '▶' : '⏸'}
          </button>
          <span className="text-white/80 text-xs font-mono select-none">
            {fmt(currentTime)} / {fmt(duration)}
          </span>
          <div className="flex-1" />
          <button onClick={fullscreen} className="text-white hover:text-blue-300 transition leading-none" title="Pantalla completa">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Galería: slot grande + thumbnails ────────────────────────────────────────
function MediaGallery({ allImages, allVideos }) {
  const hasVideos = allVideos.length > 0
  const [featured, setFeatured] = useState(hasVideos ? { type: 'video', index: 0 } : { type: 'image', index: 0 })

  // Construir lista de thumbnails (todo lo que no está en el slot destacado)
  const thumbnails = []
  allVideos.forEach((item, i) => {
    if (featured.type === 'video' && featured.index === i) return
    thumbnails.push({ type: 'video', index: i, item })
  })
  allImages.forEach((item, i) => {
    if (featured.type === 'image' && featured.index === i) return
    thumbnails.push({ type: 'image', index: i, item })
  })

  const featuredSrc = featured.type === 'video'
    ? mediaUrl(allVideos[featured.index].path || allVideos[featured.index].filename)
    : mediaUrl(allImages[featured.index].path || allImages[featured.index].filename)

  return (
    <div className="flex flex-col gap-2">
      {/* Slot principal — 4× más grande que los thumbnails */}
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
        {featured.type === 'video' ? (
          <FeaturedVideo key={`v${featured.index}`} src={featuredSrc} />
        ) : (
          <img
            src={featuredSrc}
            alt="Imagen destacada"
            className="w-full h-full object-cover"
            style={{ transition: 'transform 0.25s' }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.10)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            onError={e => { e.target.style.display = 'none' }}
          />
        )}
      </div>

      {/* Thumbnails — 1/4 del ancho del slot principal */}
      {thumbnails.length > 0 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {thumbnails.map((t, i) => {
            const src = mediaUrl(t.item.path || t.item.filename)
            return (
              <div
                key={`${t.type}-${t.index}-${i}`}
                onClick={() => setFeatured({ type: t.type, index: t.index })}
                className="aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer relative"
                style={{ transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.10)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {t.type === 'video' ? (
                  <>
                    <video src={src} className="w-full h-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                      <span className="text-white text-xl drop-shadow">▶</span>
                    </div>
                  </>
                ) : (
                  <img
                    src={src}
                    alt={`Miniatura ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────
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

  const allImages = (project.media ?? []).filter(isImage)
  const allVideos = (project.media ?? []).filter(isVideo)
  const hasMedia  = allImages.length > 0 || allVideos.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Breadcrumb */}
        <div className="text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-blue-600 transition">Proyectos</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-600">{project.title}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

          {/* Galería o gradiente */}
          {hasMedia ? (
            <div className="p-4 pb-2">
              <MediaGallery allImages={allImages} allVideos={allVideos} />
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
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">{project.subject.name}</span>
              )}
              {project.year && (
                <span className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">{project.year}</span>
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
                    <Link to={`/users/${u.id}/projects`} className="text-blue-600 hover:underline">{u.name || u.email}</Link>
                    {i < project.users.length - 1 && ', '}
                  </span>
                ))}
              </p>
            )}

            {/* Tagline */}
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
                <a href={project.game_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
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

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
              <span>Publicado el {new Date(project.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <Link to="/" className="text-blue-600 hover:underline">← Volver</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}