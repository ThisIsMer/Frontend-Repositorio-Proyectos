import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import api from '../services/api'

const STORAGE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'https://repositorio-backend-production.up.railway.app'

function getItemPath(item) {
  return item.file_path || item.path || item.filename || ''
}

function mediaUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_URL}/storage/${path}`
}

function isImage(item) {
  if (item.type === 'image' || item.mime_type?.startsWith('image/')) return true
  const ext = getItemPath(item).split('.').pop().toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
}

function isVideo(item) {
  if (item.type === 'video' || item.mime_type?.startsWith('video/')) return true
  const ext = getItemPath(item).split('.').pop().toLowerCase()
  return ['mp4', 'avi', 'mov', 'quicktime'].includes(ext)
}

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
    const onPlay = () => setPaused(false)
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
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
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
      style={{ position: 'relative', width: '100%', height: '100%', background: '#000', borderRadius: '12px', overflow: 'hidden' }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video ref={videoRef} src={src} style={{ width: '100%', height: '100%', objectFit: 'contain' }} loop muted playsInline />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', opacity: showControls ? 1 : 0, transition: 'opacity 0.2s', background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }}>
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.25)', cursor: 'pointer' }} onClick={seek}>
          <div style={{ height: '100%', background: '#fff', borderRadius: '999px', width: `${progress}%`, transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
          <button onClick={togglePlay} style={{ color: '#fff', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1, width: '24px' }}>
            {paused ? '▶' : '⏸'}
          </button>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontFamily: 'monospace' }}>
            {fmt(currentTime)} / {fmt(duration)}
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={fullscreen} style={{ color: '#fff', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function MediaGallery({ allImages, allVideos }) {
  const hasVideos = allVideos.length > 0
  const [featured, setFeatured] = useState(hasVideos ? { type: 'video', index: 0 } : { type: 'image', index: 0 })

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
    ? mediaUrl(getItemPath(allVideos[featured.index]))
    : mediaUrl(getItemPath(allImages[featured.index]))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden', background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
        {featured.type === 'video' ? (
          <FeaturedVideo key={`v${featured.index}`} src={featuredSrc} />
        ) : (
          <img src={featuredSrc} alt="Imagen destacada" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.25s' }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            onError={e => { e.target.style.display = 'none' }} />
        )}
      </div>
      {thumbnails.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {thumbnails.map((t, i) => {
            const src = mediaUrl(getItemPath(t.item))
            return (
              <div key={`${t.type}-${t.index}-${i}`}
                onClick={() => setFeatured({ type: t.type, index: t.index })}
                style={{ aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', background: '#f3f4f6', border: '1px solid #e5e7eb', cursor: 'pointer', position: 'relative', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {t.type === 'video' ? (
                  <>
                    <video src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                      <span style={{ color: '#fff', fontSize: '18px' }}>▶</span>
                    </div>
                  </>
                ) : (
                  <img src={src} alt={`Miniatura ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none' }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
    <div className="page">
      <Navbar />
      <main className="content">
        <div className="empty">Cargando proyecto...</div>
      </main>
      <Footer />
    </div>
  )

  if (error) return (
    <div className="page">
      <Navbar />
      <main className="content" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>{error}</p>
        <Link to="/" style={{ color: '#385e9d', textDecoration: 'none', fontSize: '14px' }}>← Volver al inicio</Link>
      </main>
      <Footer />
    </div>
  )

  const allImages = (project.media ?? []).filter(isImage)
  const allVideos = (project.media ?? []).filter(isVideo)
  const hasMedia = allImages.length > 0 || allVideos.length > 0

  return (
    <div className="page">
      <Navbar />

      <main className="content" style={{ maxWidth: '900px' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>
          <Link to="/" style={{ color: '#385e9d', textDecoration: 'none' }}>Proyectos</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <span style={{ color: '#374151' }}>{project.title}</span>
        </div>

        <div className="about__card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Galería o gradiente */}
          {hasMedia ? (
            <div style={{ padding: '16px 16px 8px' }}>
              <MediaGallery allImages={allImages} allVideos={allVideos} />
            </div>
          ) : (
            <div style={{ height: '200px', background: 'linear-gradient(135deg, #334155, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '64px', color: 'rgba(255,255,255,0.9)' }}>📁</span>
            </div>
          )}

          <div style={{ padding: '24px 28px 28px' }}>

            {/* Asignatura + año */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {project.subject && (
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#385e9d', background: 'rgba(56,94,157,0.1)', padding: '4px 10px', borderRadius: '999px' }}>
                  {project.subject.name}
                </span>
              )}
              {project.year && (
                <span style={{ fontSize: '12px', color: '#9ca3af', border: '1px solid #e5e7eb', padding: '4px 10px', borderRadius: '999px' }}>
                  {project.year}
                </span>
              )}
            </div>

            {/* Título */}
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#111827', margin: '0 0 8px' }}>{project.title}</h1>

            {/* Autores */}
            {((project.users?.length > 0) || (project.collaborators_text?.length > 0)) && (
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                Por{' '}
                {project.users?.map((u, i, arr) => (
                  <span key={u.id}>
                    <Link to={`/users/${u.id}/projects`} style={{ color: '#385e9d', textDecoration: 'none' }}>
                      {u.name || u.email}
                    </Link>
                    {(i < arr.length - 1 || project.collaborators_text?.length > 0) && ', '}
                  </span>
                ))}
                {project.collaborators_text?.map((name, i) => (
                  <span key={`text-${i}`}>
                    {name}{i < project.collaborators_text.length - 1 && ', '}
                  </span>
                ))}
              </p>
            )}

            {/* Tagline */}
            <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.7', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
              {project.description}
            </p>

            {/* Descripción completa */}
            {project.full_description && (
              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '900', color: '#111827', marginBottom: '10px', marginTop: 0 }}>Descripción</h2>
                <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 }}>{project.full_description}</p>
              </div>
            )}

            {/* Demo */}
            {project.game_url && (
              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '900', color: '#111827', marginBottom: '10px', marginTop: 0 }}>Demo / Juego</h2>
                <a href={project.game_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#385e9d', color: '#fff', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '700' }}>
                  🎮 Jugar / Ver demo
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.game_url}</span>
                </a>
              </div>
            )}

            {/* Tags */}
            {project.tags?.length > 0 && (
              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 0 }}>Etiquetas</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {project.tags.map(tag => (
                    <span key={tag} style={{ fontSize: '12px', background: '#f3f4f6', color: '#4b5563', padding: '4px 12px', borderRadius: '999px' }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer de la card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
              <span>Publicado el {new Date(project.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <Link to="/" style={{ color: '#385e9d', textDecoration: 'none', fontWeight: '700' }}>← Volver</Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}