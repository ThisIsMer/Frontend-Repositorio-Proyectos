import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const fetchProjects = async (params = {}) => {
    setLoading(true)
    try {
      const res = await api.get('/projects', { params })
      const data = res.data.data
      setProjects(data)
      const uniqueSubjects = []
      const seen = new Set()
      data.forEach(p => {
        if (p.subject && !seen.has(p.subject.id)) {
          seen.add(p.subject.id)
          uniqueSubjects.push({ id: p.subject.id, name: p.subject.name })
        }
      })
      setSubjects(uniqueSubjects)
    } catch (e) {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProjects() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchProjects({ search: search || undefined, subject_id: selectedSubject || undefined })
  }

  return (
    <div className="page">

      <Navbar />

      <header className="hero">
        <div className="hero__inner">
          <div className="hero__content">
            <h1 className="hero__title">Repositorio de Proyectos</h1>
            <div className="hero__logo">
              <img src={`${import.meta.env.BASE_URL}icons/marca-UniversidadSalamanca-blanco.png`} alt="Universidad de Salamanca" />
            </div>
            <p className="hero__subtitle">Explora los proyectos académicos de los estudiantes</p>
            <form onSubmit={handleSearch} className="hero__form">
              <button
                type="button"
                className="btn btn--filters"
                onClick={() => setIsMenuOpen(true)}
              >
                <img
                  src={`${import.meta.env.BASE_URL}icons/filtro.png`}
                  alt=""
                  style={{ width: '18px', height: '18px', filter: 'brightness(0) invert(1)' }}
                />
                Filtros
              </button>
              <input
                type="text"
                placeholder="Buscar proyectos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="field"
              />
              <button type="submit" className="btn btn--primary">Buscar</button>
            </form>
            {selectedSubject && (
              <div className="hero__activeFilter">
                <span>
                  Filtrando por: <strong>{subjects.find(s => String(s.id) === String(selectedSubject))?.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject('')
                    fetchProjects({ search: search || undefined })
                  }}
                  className="hero__clearFilter"
                >
                  ✕ Quitar filtro
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

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
                        <img src={cover} alt={project.title} className="thumbImg" onError={e => e.currentTarget.remove()} />
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
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <Footer />

      <div className={`overlay ${isMenuOpen ? 'is-open' : ''}`} onClick={() => setIsMenuOpen(false)} />

      <aside className={`sideMenu ${isMenuOpen ? 'is-open' : ''}`}>
        <div className="sideMenu__top">
          <div className="sideMenu__title">Filtros</div>
          <button type="button" className="sideMenu__close" onClick={() => setIsMenuOpen(false)}>✕</button>
        </div>
        <div className="sideMenu__list">
          <div className="sideMenu__section">
            <p className="sideMenu__sectionLabel">Asignatura</p>
            <button
              type="button"
              className={`sideMenu__item ${selectedSubject === '' ? 'is-active' : ''}`}
              onClick={() => {
                setSelectedSubject('')
                fetchProjects({ search: search || undefined })
                setIsMenuOpen(false)
              }}
            >
              Todas las asignaturas
            </button>
            {subjects.map(s => (
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
        </div>
      </aside>
    </div>
  )
}