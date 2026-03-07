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
      className="featuredVideo"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video ref={videoRef} src={src} className="featuredVideo__video" loop muted playsInline />
      <div className={`featuredVideo__controls${showControls ? ' featuredVideo__controls--visible' : ''}`}>
        <div className="featuredVideo__progress" onClick={seek}>
          <div className="featuredVideo__progressBar" style={{ width: `${progress}%` }} />
        </div>
        <div className="featuredVideo__bar">
          <button onClick={togglePlay} className="featuredVideo__playBtn">{paused ? '▶' : '⏸'}</button>
          <span className="featuredVideo__time">{fmt(currentTime)} / {fmt(duration)}</span>
          <div className="featuredVideo__spacer" />
          <button onClick={fullscreen} className="featuredVideo__fsBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
    <div className="mediaGallery">
      <div className="mediaGallery__featured">
        {featured.type === 'video' ? (
          <FeaturedVideo key={`v${featured.index}`} src={featuredSrc} />
        ) : (
          <img src={featuredSrc} alt="Imagen destacada" className="mediaGallery__featuredImg"
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            onError={e => { e.target.style.display = 'none' }} />
        )}
      </div>
      {thumbnails.length > 0 && (
        <div className="mediaGallery__thumbGrid">
          {thumbnails.map((t, i) => {
            const src = mediaUrl(getItemPath(t.item))
            return (
              <div key={`${t.type}-${t.index}-${i}`}
                onClick={() => setFeatured({ type: t.type, index: t.index })}
                className="mediaGallery__thumb"
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {t.type === 'video' ? (
                  <>
                    <video src={src} className="mediaGallery__thumbMedia" muted preload="metadata" />
                    <div className="mediaGallery__thumbPlay"><span>▶</span></div>
                  </>
                ) : (
                  <img src={src} alt={`Miniatura ${i + 1}`} className="mediaGallery__thumbMedia"
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
      <main className="content"><div className="empty">Cargando proyecto...</div></main>
      <Footer />
    </div>
  )

  if (error) return (
    <div className="page">
      <Navbar />
      <main className="content userProfile__error">
        <p className="userProfile__errorText">{error}</p>
        <Link to="/" className="about__backLink">← Volver al inicio</Link>
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
      <main className="content detail__wrap">

        {/* Breadcrumb */}
        <div className="detail__breadcrumb">
          <Link to="/">Proyectos</Link>
          <span className="detail__sep">›</span>
          <span>{project.title}</span>
        </div>

        <div className="detail__card">

          {hasMedia ? (
            <div className="detail__mediaWrap">
              <MediaGallery allImages={allImages} allVideos={allVideos} />
            </div>
          ) : (
            <div className="detail__noMedia">
              <span className="detail__noMediaIcon"></span>
            </div>
          )}

          <div className="detail__body">

            {/* Asignatura + año */}
            <div className="detail__tags">
              {project.subject && <span className="detail__subjectBadge">{project.subject.name}</span>}
              {project.year && <span className="detail__yearBadge">{project.year}</span>}
            </div>

            {/* Título */}
            <h1 className="detail__title">{project.title}</h1>

            {/* Autores */}
            {((project.users?.length > 0) || (project.collaborators_text?.length > 0)) && (
              <p className="detail__authors">
                Por{' '}
                {project.users?.map((u, i, arr) => (
                  <span key={u.id}>
                    <Link to={`/users/${u.id}/projects`}>{u.name || u.email}</Link>
                    {(i < arr.length - 1 || project.collaborators_text?.length > 0) && ', '}
                  </span>
                ))}
                {project.collaborators_text?.map((name, i) => (
                  <span key={`text-${i}`}>{name}{i < project.collaborators_text.length - 1 && ', '}</span>
                ))}
              </p>
            )}

            {/* Tagline */}
            <p className="detail__description">{project.description}</p>

            {/* Descripción completa */}
            {project.full_description && (
              <div className="detail__section">
                <h2 className="detail__sectionTitle">Descripción</h2>
                <p className="detail__sectionText">{project.full_description}</p>
              </div>
            )}

            {/* Demo */}
            {project.game_url && (
              <div className="detail__section">
                <h2 className="detail__sectionTitle">Demo / Juego</h2>
                <a href={project.game_url} target="_blank" rel="noopener noreferrer" className="detail__demoBtn">
                   Jugar / Ver demo
                  <span className="detail__demoUrl">{project.game_url}</span>
                </a>
              </div>
            )}

            {/* Tags */}
            {project.tags?.length > 0 && (
              <div className="detail__section">
                <p className="detail__tagsLabel">Etiquetas</p>
                <div className="detail__tagsList">
                  {project.tags.map(tag => (
                    <span key={tag} className="detail__tagChip">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="detail__footer">
              <span>Publicado el {new Date(project.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <Link to="/" className="detail__footerLink">← Volver</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}