import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import api from '../services/api'

const STORAGE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'https://repositorio-backend-production.up.railway.app'

function avatarUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_URL}/storage/${path}`
}

function coverFromProject(project) {
  const media = project.media ?? []
  const coverItem = media.find(m => m.type === 'image' || m.mime_type?.startsWith('image/'))
  const coverPath = coverItem?.file_path || coverItem?.path
  if (!coverPath) return null
  if (coverPath.startsWith('http')) return coverPath
  return `${STORAGE_URL}/storage/${coverPath}`
}

export default function UserProfilePage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/users/${id}/projects`)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.status === 404 ? 'Usuario no encontrado.' : 'Error al cargar el perfil.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="page">
      <Navbar />
      <main className="content">
        <div className="empty">Cargando perfil...</div>
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

  const user = data.user ?? {}
  const projects = data.projects ?? (Array.isArray(data) ? data : [])
  const avatar = avatarUrl(user.profile_picture)
  const initials = (user.name || user.email || '?').charAt(0).toUpperCase()

  return (
    <div className="page">
      <Navbar />

      <header className="hero">
        <div className="hero__inner">
          <div className="hero__content" style={{ paddingBottom: '32px' }}>
            {/* Avatar grande en el hero */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', background: '#fff', border: '4px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                {avatar
                  ? <img src={avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d22020', fontSize: '36px', fontWeight: '900' }}>{initials}</div>}
              </div>
            </div>
            <h1 className="hero__title" style={{ fontSize: '36px' }}>{user.name || 'Usuario'}</h1>
            {user.bio && <p className="hero__subtitle" style={{ marginTop: '8px', fontSize: '16px' }}>{user.bio}</p>}
            <p style={{ color: 'rgba(155,176,208,0.8)', fontSize: '14px', marginTop: '8px' }}>
              {projects.length} proyecto{projects.length !== 1 ? 's' : ''} publicado{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </header>

      <main className="content">

        <div style={{ marginBottom: '16px' }}>
          <Link to="/" style={{ color: '#385e9d', textDecoration: 'none', fontSize: '14px', fontWeight: '700' }}>← Volver al inicio</Link>
        </div>

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '64px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>Este usuario no tiene proyectos publicados.</p>
          </div>
        ) : (
          <div className="grid">
            {projects.map(project => {
              const cover = coverFromProject(project)
              return (
                <Link key={project.id} to={`/projects/${project.id}`} className="cardLink">
                  <article className="card">
                    <div className="thumb">
                      {cover ? (
                        <img src={cover} alt={project.title} className="thumbImg"
                          onError={e => {
                            e.target.parentNode.innerHTML = '<div class="thumbFallback"><span class="thumbIcon">📁</span></div>'
                          }} />
                      ) : (
                        <div className="thumbFallback"><span className="thumbIcon">📁</span></div>
                      )}
                    </div>
                    <div className="cardBody">
                      <div className="cardTop">
                        <span className="badge">{project.subject?.name}</span>
                        {project.year && <span className="year">{project.year}</span>}
                      </div>
                      <h3 className="cardTitle">{project.title}</h3>
                      <p className="cardDesc">{project.description}</p>
                      {project.tags?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                          {project.tags.slice(0, 3).map(tag => (
                            <span key={tag} style={{ fontSize: '11px', background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '999px' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}