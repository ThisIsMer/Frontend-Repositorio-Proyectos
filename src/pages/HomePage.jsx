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
  const [allProjects, setAllProjects] = useState([]) // cache for client-side filter
  const [subjects, setSubjects] = useState([])
  const [allTags, setAllTags] = useState([])
  const [allYears, setAllYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Filters state
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedTags, setSelectedTags] = useState([]) // stackeable

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const res = await api.get('/projects', { params: { per_page: 500 } })
      const data = res.data.data ?? res.data
      setAllProjects(data)

      // Build subjects
      const seenS = new Set()
      const subjectList = []
      data.forEach(p => {
        if (p.subject && !seenS.has(p.subject.id)) {
          seenS.add(p.subject.id)
          subjectList.push({ id: p.subject.id, name: p.subject.name })
        }
      })
      subjectList.sort((a, b) => a.name.localeCompare(b.name))
      setSubjects(subjectList)

      // Build years
      const years = [...new Set(data.map(p => p.year).filter(Boolean))].sort((a, b) => b - a)
      setAllYears(years)

      // Build tags
      const tagSet = new Set()
      data.forEach(p => p.tags?.forEach(t => tagSet.add(t)))
      setAllTags([...tagSet].sort())

    } catch {
      setAllProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProjects() }, [])

  // Client-side filtering
  useEffect(() => {
    let result = allProjects
    const q = search.trim().toLowerCase()
    if (q) result = result.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q))
    )
    if (selectedSubject) result = result.filter(p => String(p.subject?.id) === String(selectedSubject))
    if (selectedYear) result = result.filter(p => String(p.year) === String(selectedYear))
    if (selectedTags.length > 0) result = result.filter(p => selectedTags.every(tag => p.tags?.includes(tag)))
    setProjects(result)
  }, [search, selectedSubject, selectedYear, selectedTags, allProjects])

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const clearAll = () => {
    setSelectedSubject('')
    setSelectedYear('')
    setSelectedTags([])
    setSearch('')
  }

  const activeFilterCount = (selectedSubject ? 1 : 0) + (selectedYear ? 1 : 0) + selectedTags.length

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
            <form onSubmit={e => e.preventDefault()} className="hero__form">
              <button type="button" className="btn btn--filters" onClick={() => setIsMenuOpen(true)}>
                {/* SVG filter icon — no external image needed */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                  <line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                Filtros
                {activeFilterCount > 0 && (
                  <span className="btn--filters__badge">{activeFilterCount}</span>
                )}
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

            {/* Active filters summary */}
            {activeFilterCount > 0 && (
              <div className="hero__activeFilters">
                {selectedSubject && (
                  <span className="hero__filterPill">
                     {subjects.find(s => String(s.id) === String(selectedSubject))?.name}
                    <button onClick={() => setSelectedSubject('')} className="hero__filterPillClose">✕</button>
                  </span>
                )}
                {selectedYear && (
                  <span className="hero__filterPill">
                     {selectedYear}
                    <button onClick={() => setSelectedYear('')} className="hero__filterPillClose">✕</button>
                  </span>
                )}
                {selectedTags.map(tag => (
                  <span key={tag} className="hero__filterPill">
                     {tag}
                    <button onClick={() => toggleTag(tag)} className="hero__filterPillClose">✕</button>
                  </span>
                ))}
                <button onClick={clearAll} className="hero__clearAll">Limpiar todo</button>
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
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <Footer />

      {/* Overlay */}
      <div className={`overlay ${isMenuOpen ? 'is-open' : ''}`} onClick={() => setIsMenuOpen(false)} />

      {/* Filter drawer */}
      <aside className={`sideMenu ${isMenuOpen ? 'is-open' : ''}`}>
        <div className="sideMenu__top">
          <div className="sideMenu__title">Filtros</div>
          <div className="sideMenu__topRight">
            {activeFilterCount > 0 && (
              <button type="button" className="sideMenu__clearBtn" onClick={clearAll}>Limpiar</button>
            )}
            <button type="button" className="sideMenu__close" onClick={() => setIsMenuOpen(false)}>✕</button>
          </div>
        </div>

        <div className="sideMenu__list">

          {/* Asignatura */}
          <div className="sideMenu__section">
            <p className="sideMenu__sectionLabel">Asignatura</p>
            <button
              type="button"
              className={`sideMenu__item ${selectedSubject === '' ? 'is-active' : ''}`}
              onClick={() => setSelectedSubject('')}
            >
              Todas
            </button>
            {subjects.map(s => (
              <button
                key={s.id}
                type="button"
                className={`sideMenu__item ${String(selectedSubject) === String(s.id) ? 'is-active' : ''}`}
                onClick={() => setSelectedSubject(prev => String(prev) === String(s.id) ? '' : String(s.id))}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Año */}
          {allYears.length > 0 && (
            <div className="sideMenu__section">
              <p className="sideMenu__sectionLabel">Año</p>
              <button
                type="button"
                className={`sideMenu__item ${selectedYear === '' ? 'is-active' : ''}`}
                onClick={() => setSelectedYear('')}
              >
                Todos
              </button>
              {allYears.map(year => (
                <button
                  key={year}
                  type="button"
                  className={`sideMenu__item ${String(selectedYear) === String(year) ? 'is-active' : ''}`}
                  onClick={() => setSelectedYear(prev => String(prev) === String(year) ? '' : String(year))}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {/* Etiquetas — stackeables */}
          {allTags.length > 0 && (
            <div className="sideMenu__section">
              <p className="sideMenu__sectionLabel">
                Etiquetas
                {selectedTags.length > 0 && (
                  <span className="sideMenu__tagCount"> ({selectedTags.length} activas)</span>
                )}
              </p>
              <div className="sideMenu__tagGrid">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={`sideMenu__tagChip ${selectedTags.includes(tag) ? 'is-active' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && <span className="sideMenu__tagCheck">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Apply button */}
        <div className="sideMenu__footer">
          <button type="button" className="btn btn--primary sideMenu__applyBtn" onClick={() => setIsMenuOpen(false)}>
            Ver resultados {projects.length > 0 && `(${projects.length})`}
          </button>
        </div>
      </aside>
    </div>
  )
}