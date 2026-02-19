import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function ProfilePage() {
  const { user, login } = useAuth()

  const [projects, setProjects] = useState([])
  const [requests, setRequests] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '' })
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Cargar mis proyectos aprobados
  useEffect(() => {
    api.get('/my-projects')
      .then(r => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoadingProjects(false))
  }, [])

  // Cargar mis solicitudes
  useEffect(() => {
    api.get('/my-requests')
      .then(r => setRequests(r.data))
      .catch(() => {})
      .finally(() => setLoadingRequests(false))
  }, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaveLoading(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const res = await api.put('/profile', form)
      // Actualizar usuario en contexto
      login(res.data.user, localStorage.getItem('token'))
      setSaveSuccess(true)
      setEditing(false)
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error al guardar el perfil.')
    } finally {
      setSaveLoading(false)
    }
  }

  const statusLabel = (status) => ({
    pending:  { text: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700' },
    approved: { text: 'Aprobada',   color: 'bg-green-100 text-green-700'  },
    rejected: { text: 'Rechazada',  color: 'bg-red-100 text-red-700'      },
  }[status] || { text: status, color: 'bg-gray-100 text-gray-700' })

  const typeLabel = (type) => ({
    create: 'Crear proyecto',
    update: 'Editar proyecto',
    delete: 'Eliminar proyecto',
  }[type] || type)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Datos del perfil */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Mi Perfil</h2>
            {!editing && (
              <button
                onClick={() => { setEditing(true); setSaveSuccess(false) }}
                className="text-sm text-blue-600 hover:text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg transition"
              >
                Editar
              </button>
            )}
          </div>

          {saveSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg mb-4">
              Perfil actualizado correctamente.
            </div>
          )}

          {editing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {saveError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{saveError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tu nombre completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  maxLength={1000}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Cuéntanos algo sobre ti..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  {saveLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setForm({ name: user?.name || '', bio: user?.bio || '' }) }}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex gap-2">
                <span className="text-gray-400 w-20 shrink-0">Email</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-20 shrink-0">Nombre</span>
                <span>{user?.name || <span className="text-gray-400 italic">Sin nombre</span>}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-20 shrink-0">Bio</span>
                <span>{user?.bio || <span className="text-gray-400 italic">Sin biografía</span>}</span>
              </div>
              {user?.is_admin && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Rol</span>
                  <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">Administrador</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mis proyectos */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Proyectos</h2>
          {loadingProjects ? (
            <p className="text-sm text-gray-400">Cargando proyectos...</p>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="mb-3">Aún no tienes proyectos publicados.</p>
              <Link to="/submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                + Subir proyecto
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map(project => (
                <Link key={project.id} to={`/projects/${project.id}`}>
                  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                        {project.subject?.name}
                      </span>
                      {project.year && <span className="text-xs text-gray-400">{project.year}</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-2 mb-1 line-clamp-1">{project.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">{project.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mis solicitudes */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Solicitudes</h2>
          {loadingRequests ? (
            <p className="text-sm text-gray-400">Cargando solicitudes...</p>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">No has enviado ninguna solicitud aún.</p>
          ) : (
            <div className="space-y-3">
              {requests.map(req => {
                const { text, color } = statusLabel(req.status)
                return (
                  <div key={req.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{req.data?.title || `Solicitud #${req.id}`}</span>
                      <span className="text-gray-400 ml-2 text-xs">{typeLabel(req.type)}</span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(req.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${color}`}>{text}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}