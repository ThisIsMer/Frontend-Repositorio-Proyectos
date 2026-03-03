import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import api from '../services/api'

const STORAGE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') ??
  'https://repositorio-backend-production.up.railway.app'

function coverImageUrl(project) {
  const media = project.media ?? []
  const img = media.find(m => {
    if (m.type === 'image' || m.mime_type?.startsWith('image/')) return true
    const ext = (m.file_path || m.path || m.filename || '').split('.').pop().toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
  })
  if (!img) return null
  const path = img.file_path || img.path || img.filename
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_URL}/storage/${path}`
}

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')

  // menú lateral
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    // Si te falla por CORS, se quedará vacío. No pasa nada para la UI.
    api.get('/subjects').then(r => setSubjects(r.data)).catch(() => setSubjects([]))
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProjects = async (params = {}) => {
    setLoading(true)
    try {
      const res = await api.get('/projects', { params })
      setProjects(res.data.data)
    } catch (e) {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchProjects({
      search: search || undefined,
      subject_id: selectedSubject || undefined,
    })
  }

  // fallback demo si no hay subjects
  const subjectList =
    subjects?.length
      ? subjects.map(s => ({ id: s.id, name: s.name }))
      : [
          { id: 1, name: 'Programación' },
          { id: 2, name: 'Diseño' },
          { id: 3, name: 'Bases de Datos' },
          { id: 4, name: 'IA' },
          { id: 5, name: 'Redes' },
        ]

  return (
    <div className="page">
      {/* HERO */}
      <header className="hero">
        <div className="hero__inner">
          {/* Pasamos la función para abrir el menú */}
          <Navbar onOpenMenu={() => setIsMenuOpen(true)} />

          <div className="hero__content">
            <h1 className="hero__title">Repositorio de Proyectos</h1>
            <p className="hero__subtitle">Explora los proyectos académicos de los estudiantes</p>

            <form onSubmit={handleSearch} className="hero__form">
              <input
                type="text"
                placeholder="Buscar proyectos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="field"
              />
              <button type="submit" className="btn btn--primary">
                Buscar
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="content">
        {loading ? (
          <div className="empty">Cargando proyectos...</div>
        ) : projects.length === 0 ? (
          <div className="empty">No se encontraron proyectos</div>
        ) : (
          <div className="grid">
            {projects.map(project => {
              const cover = coverImageUrl(project)
              return (
                <Link key={project.id} to={`/projects/${project.id}`} className="cardLink">
                  <article className="card">
                    <div className="thumb">
                      {cover ? (
                        <img
                          src={cover}
                          alt={project.title}
                          className="thumbImg"
                          onError={e => e.currentTarget.remove()}
                        />
                      ) : (
                        <div className="thumbFallback">
                          <span className="thumbIcon">📁</span>
                        </div>
                      )}
                    </div>

                    <div className="cardBody">
                      <div className="cardTop">
                        <span className="badge">{project.subject?.name}</span>
                        {project.year && <span className="year">{project.year}</span>}
                      </div>

                      <h3 className="cardTitle">{project.title}</h3>
                      <p className="cardDesc">{project.description}</p>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* OVERLAY */}
      <div
        className={`overlay ${isMenuOpen ? 'is-open' : ''}`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* MENÚ LATERAL */}
      <aside className={`sideMenu ${isMenuOpen ? 'is-open' : ''}`}>
        <div className="sideMenu__top">
          <div className="sideMenu__title">Asignaturas</div>
          <button
            type="button"
            className="sideMenu__close"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <div className="sideMenu__list">
          {subjectList.map(s => (
            <button
              key={s.id}
              type="button"
              className={`sideMenu__item ${String(selectedSubject) === String(s.id) ? 'is-active' : ''}`}
              onClick={() => {
                setSelectedSubject(String(s.id))
                fetchProjects({ search: search || undefined, subject_id: s.id })
                setIsMenuOpen(false)
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}