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
      <main className="content"><div className="empty">Cargando perfil...</div></main>
      <Footer />
    </div>
  )

  if (error) return (
    <div className="page">
      <Navbar />
      <main className="content userProfile__error">
        <div className="userProfile__errorIcon"></div>
        <p className="userProfile__errorText">{error}</p>
        <Link to="/" className="about__backLink">← Volver al inicio</Link>
      </main>
      <Footer />
    </div>
  )

  const user = data.user ?? {}
  const projects = data.projects ?? (Array.isArray(data) ? data : [])
  const avatar = avatarUrl(user.profile_picture)

  return (
    <div className="page">
      <Navbar />
      <main className="main">

        {/* Banner + Avatar */}
        <div className="profileBanner__wrap">
          <div className="profileBanner">
            <svg className="profileBanner__svg" viewBox="0 0 420 420">
              <circle cx="300" cy="100" r="220" fill="white" />
              <circle cx="180" cy="340" r="140" fill="white" />
            </svg>
          </div>
          <div className="profileAvatar__anchor">
            <div className="profileAvatar">
              {avatar
                ? <img src={avatar} alt={user.name} />
                : <img src={`${import.meta.env.BASE_URL}icons/user.png`} alt="Avatar" className="profileAvatar__placeholder" />
              }
            </div>
          </div>
        </div>

        {/* Info del usuario */}
        <div className="profileInfo">
          <h1 className="profileInfo__name">{user.name || 'Usuario'}</h1>
          {user.email && <p className="profileInfo__email">{user.email}</p>}
          {user.bio && <p className="profileInfo__bio">{user.bio}</p>}
          <div className="profileInfo__pill">
             {projects.length} proyecto{projects.length !== 1 ? 's' : ''} publicado{projects.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Divisor */}
        <div className="profileDivider"><hr /></div>

        {/* Proyectos */}
        <div className="userProfile__projects">
          <div className="userProfile__projectsHeader">
            <h2 className="userProfile__projectsTitle">Proyectos</h2>
            <Link to="/" className="userProfile__backLink">← Volver al inicio</Link>
          </div>

          {projects.length === 0 ? (
            <div className="userProfile__empty">
              <div className="userProfile__emptyIcon">📭</div>
              <p className="userProfile__emptyText">Este usuario no tiene proyectos publicados.</p>
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
                            onError={e => { e.target.parentNode.innerHTML = '<div class="thumbFallback"><span class="thumbIcon"></span></div>' }} />
                        ) : (
                          <div className="thumbFallback"><span className="thumbIcon"></span></div>
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
                          <div className="detail__tagsList" style={{ marginTop: '8px' }}>
                            {project.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="detail__tagChip">{tag}</span>
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
        </div>

      </main>
      <Footer />
    </div>
  )
}