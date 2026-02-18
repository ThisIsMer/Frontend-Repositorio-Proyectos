import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import api from '../services/api'

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')

  useEffect(() => {
    api.get('/subjects').then(r => setSubjects(r.data))
    fetchProjects()
  }, [])

  const fetchProjects = async (params = {}) => {
    setLoading(true)
    try {
      const res = await api.get('/projects', { params })
      setProjects(res.data.data)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-slate-900 text-white py-14 px-4 text-center">
        <h1 className="text-4xl font-bold mb-3">Repositorio de Proyectos</h1>
        <p className="text-slate-400 text-lg mb-8">Explora los proyectos académicos de los estudiantes</p>

        {/* Buscador */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            placeholder="Buscar proyectos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg text-gray-900 text-sm focus:outline-none"
          />
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="px-3 py-2.5 rounded-lg text-gray-900 text-sm focus:outline-none"
          >
            <option value="">Todas las asignaturas</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg text-sm font-medium transition">
            Buscar
          </button>
        </form>
      </div>

      {/* Proyectos */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {loading ? (
          <div className="text-center text-gray-500 py-20">Cargando proyectos...</div>
        ) : projects.length === 0 ? (
          <div className="text-center text-gray-500 py-20">No se encontraron proyectos</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200 overflow-hidden">
                  {/* Thumbnail */}
                  <div className="h-44 bg-gradient-to-br from-slate-700 to-blue-800 flex items-center justify-center">
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
                    <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {project.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      Por {project.users?.map(u => u.name || u.email).join(', ')}
                    </div>
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