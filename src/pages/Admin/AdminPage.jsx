import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import api from '../../services/api'

const TABS = ['Proyectos', 'Usuarios', 'Asignaturas']

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('Proyectos')

  // ── Proyectos ───────────────────────────────────────────────
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [projectSearch, setProjectSearch] = useState('')

  // ── Usuarios ────────────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  // ── Asignaturas ─────────────────────────────────────────────
  const [subjects, setSubjects] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [newSubject, setNewSubject] = useState('')
  const [savingSubject, setSavingSubject] = useState(false)
  const [subjectMsg, setSubjectMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    api.get('/projects', { params: { per_page: 100 } })
      .then(res => setProjects(res.data?.data || res.data || []))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false))

    api.get('/users')
      .then(res => setUsers(res.data?.data || res.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false))

    api.get('/subjects')
      .then(res => setSubjects(res.data || []))
      .catch(() => setSubjects([]))
      .finally(() => setLoadingSubjects(false))
  }, [])

  // ── Acciones proyectos ──────────────────────────────────────
  const handleDeleteProject = async id => {
    if (!window.confirm('¿Eliminar este proyecto?')) return
    try {
      await api.delete(`/projects/${id}`)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch { alert('Error al eliminar.') }
  }

  // ── Acciones usuarios ───────────────────────────────────────
  const handleToggleAdmin = async user => {
    try {
      const res = await api.put(`/users/${user.id}`, { is_admin: !user.is_admin })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_admin: res.data?.is_admin ?? !user.is_admin } : u))
    } catch { alert('Error al actualizar el usuario.') }
  }

  const handleDeleteUser = async id => {
    if (!window.confirm('¿Eliminar este usuario? Se eliminarán también sus proyectos.')) return
    try {
      await api.delete(`/users/${id}`)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch { alert('Error al eliminar el usuario.') }
  }

  // ── Acciones asignaturas ────────────────────────────────────
  const handleCreateSubject = async e => {
    e.preventDefault()
    if (!newSubject.trim()) return
    setSavingSubject(true)
    setSubjectMsg({ type: '', text: '' })
    try {
      const res = await api.post('/subjects', { name: newSubject.trim() })
      setSubjects(prev => [...prev, res.data])
      setNewSubject('')
      setSubjectMsg({ type: 'success', text: 'Asignatura creada correctamente.' })
    } catch (err) {
      setSubjectMsg({ type: 'error', text: err.response?.data?.message || 'Error al crear la asignatura.' })
    } finally {
      setSavingSubject(false)
    }
  }

  const handleDeleteSubject = async id => {
    if (!window.confirm('¿Eliminar esta asignatura?')) return
    try {
      await api.delete(`/subjects/${id}`)
      setSubjects(prev => prev.filter(s => s.id !== id))
    } catch { alert('Error al eliminar.') }
  }

  // ── Filtrado ─────────────────────────────────────────────────
  const filteredProjects = projects.filter(p =>
    p.title?.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.users?.some(u => (u.name || u.email)?.toLowerCase().includes(projectSearch.toLowerCase()))
  )

  // ── Stats ────────────────────────────────────────────────────
  const stats = [
    { label: 'Proyectos', value: projects.length, icon: '📁', color: 'bg-blue-50 text-blue-700' },
    { label: 'Usuarios', value: users.length, icon: '👤', color: 'bg-purple-50 text-purple-700' },
    { label: 'Asignaturas', value: subjects.length, icon: '📚', color: 'bg-green-50 text-green-700' },
    { label: 'Admins', value: users.filter(u => u.is_admin).length, icon: '🛡️', color: 'bg-yellow-50 text-yellow-700' },
  ]

  const msgClass = type =>
    type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-slate-900 text-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Panel de Administración</h1>
          <p className="text-slate-400 text-sm">Gestiona proyectos, usuarios y asignaturas</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${s.color}`}>{s.icon}</span>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit shadow-sm">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── TAB PROYECTOS ─────────────────────────────────────── */}
        {activeTab === 'Proyectos' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
              <h2 className="font-semibold text-gray-900">Todos los proyectos ({filteredProjects.length})</h2>
              <input
                type="text"
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                placeholder="Buscar por título o autor..."
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {loadingProjects ? (
              <div className="text-center py-16 text-gray-400 text-sm">Cargando proyectos...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">No se encontraron proyectos.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredProjects.map(project => (
                  <div key={project.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/projects/${project.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 transition text-sm truncate">
                          {project.title}
                        </Link>
                        {project.subject?.name && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full shrink-0">{project.subject.name}</span>
                        )}
                        {project.year && <span className="text-xs text-gray-400 shrink-0">{project.year}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Por: {project.users?.map(u => u.name || u.email).join(', ') || '—'}
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <Link to={`/projects/${project.id}`} className="text-xs text-blue-600 hover:underline">Ver</Link>
                      <button onClick={() => handleDeleteProject(project.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB USUARIOS ──────────────────────────────────────── */}
        {activeTab === 'Usuarios' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Usuarios registrados ({users.length})</h2>
            </div>

            {loadingUsers ? (
              <div className="text-center py-16 text-gray-400 text-sm">Cargando usuarios...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">No hay usuarios.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {users.map(u => (
                  <div key={u.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {(u.name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.name || '—'}</p>
                        {u.is_admin && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium shrink-0">Admin</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => handleToggleAdmin(u)}
                        className={`text-xs px-3 py-1 rounded-lg border transition ${
                          u.is_admin
                            ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}>
                        {u.is_admin ? 'Quitar admin' : 'Hacer admin'}
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB ASIGNATURAS ───────────────────────────────────── */}
        {activeTab === 'Asignaturas' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Crear asignatura */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Nueva asignatura</h2>

              {subjectMsg.text && (
                <div className={`${msgClass(subjectMsg.type)} text-xs px-3 py-2 rounded mb-3`}>{subjectMsg.text}</div>
              )}

              <form onSubmit={handleCreateSubject} className="flex gap-2">
                <input
                  type="text"
                  value={newSubject}
                  onChange={e => { setNewSubject(e.target.value); setSubjectMsg({ type: '', text: '' }) }}
                  placeholder="Nombre de la asignatura"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button type="submit" disabled={savingSubject}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                  {savingSubject ? '...' : 'Añadir'}
                </button>
              </form>
            </div>

            {/* Lista asignaturas */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Asignaturas ({subjects.length})</h2>
              </div>

              {loadingSubjects ? (
                <div className="text-center py-10 text-gray-400 text-sm">Cargando...</div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No hay asignaturas.</div>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {subjects.map(s => (
                    <li key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                      <span className="text-sm text-gray-800">{s.name}</span>
                      <button onClick={() => handleDeleteSubject(s.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition">
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}