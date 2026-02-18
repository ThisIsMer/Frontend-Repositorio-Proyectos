import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function ProfilePage() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()

  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [saving, setSaving] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    api.get('/user/projects')
      .then(res => setProjects(res.data?.data || res.data || []))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false))
  }, [])

  const handleProfileSave = async e => {
    e.preventDefault()
    setSaving(true)
    setProfileMsg({ type: '', text: '' })
    try {
      const res = await api.put('/user', form)
      login(res.data.user || res.data, localStorage.getItem('token'))
      setProfileMsg({ type: 'success', text: 'Perfil actualizado correctamente.' })
      setEditMode(false)
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {}).flat().join(' ') || 'Error al actualizar el perfil.'
      setProfileMsg({ type: 'error', text: msg })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSave = async e => {
    e.preventDefault()
    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' })
      return
    }
    setSavingPass(true)
    setPasswordMsg({ type: '', text: '' })
    try {
      await api.put('/user/password', passwordForm)
      setPasswordMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' })
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' })
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al cambiar la contraseña.'
      setPasswordMsg({ type: 'error', text: msg })
    } finally {
      setSavingPass(false)
    }
  }

  const handleDeleteProject = async (id) => {
    if (!window.confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/projects/${id}`)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch {
      alert('Error al eliminar el proyecto.')
    }
  }

  const handleLogout = async () => {
    try { await api.post('/logout') } catch {}
    logout()
    navigate('/')
  }

  const msgClass = type =>
    type === 'success'
      ? 'bg-green-50 border border-green-200 text-green-700'
      : 'bg-red-50 border border-red-200 text-red-700'

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-slate-900 text-white py-10 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold shrink-0">
            {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.name || 'Mi perfil'}</h1>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            {user?.is_admin && (
              <span className="inline-block mt-1 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">
                Administrador
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Sidebar: datos de cuenta */}
        <div className="space-y-5">

          {/* Datos personales */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Mis datos</h2>
              {!editMode && (
                <button onClick={() => setEditMode(true)} className="text-xs text-blue-600 hover:underline">Editar</button>
              )}
            </div>

            {profileMsg.text && (
              <div className={`${msgClass(profileMsg.type)} text-xs px-3 py-2 rounded mb-3`}>{profileMsg.text}</div>
            )}

            {editMode ? (
              <form onSubmit={handleProfileSave} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className={inputClass} placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className={inputClass} required />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button type="button" onClick={() => { setEditMode(false); setProfileMsg({ type: '', text: '' }) }}
                    className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded-lg text-xs hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-400">Nombre</dt>
                  <dd className="text-gray-900 font-medium">{user?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Email</dt>
                  <dd className="text-gray-900 font-medium break-all">{user?.email}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* Cambiar contraseña */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Cambiar contraseña</h2>

            {passwordMsg.text && (
              <div className={`${msgClass(passwordMsg.type)} text-xs px-3 py-2 rounded mb-3`}>{passwordMsg.text}</div>
            )}

            <form onSubmit={handlePasswordSave} className="space-y-3">
              {[
                { label: 'Contraseña actual', name: 'current_password' },
                { label: 'Nueva contraseña', name: 'password', hint: 'Mín. 8 caracteres' },
                { label: 'Confirmar nueva', name: 'password_confirmation' },
              ].map(({ label, name, hint }) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="password" value={passwordForm[name]}
                    onChange={e => setPasswordForm({ ...passwordForm, [name]: e.target.value })}
                    className={inputClass} required />
                  {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
                </div>
              ))}
              <button type="submit" disabled={savingPass}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 mt-1">
                {savingPass ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </div>

          {/* Cerrar sesión */}
          <button onClick={handleLogout}
            className="w-full border border-red-200 text-red-500 hover:bg-red-50 py-2 rounded-lg text-sm transition">
            Cerrar sesión
          </button>
        </div>

        {/* Mis proyectos */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mis proyectos</h2>
            <Link to="/submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              + Subir proyecto
            </Link>
          </div>

          {loadingProjects ? (
            <div className="text-center py-16 text-gray-400 text-sm">Cargando...</div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500 text-sm mb-4">Todavía no has subido ningún proyecto.</p>
              <Link to="/submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
                Subir mi primer proyecto
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map(project => (
                <div key={project.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-blue-800 flex items-center justify-center text-2xl shrink-0">
                    📁
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/projects/${project.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 transition text-sm">
                        {project.title}
                      </Link>
                      {project.subject?.name && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{project.subject.name}</span>
                      )}
                      {project.year && (
                        <span className="text-xs text-gray-400">{project.year}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                    {project.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {project.tags.slice(0, 4).map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link to={`/projects/${project.id}`}
                      className="text-xs text-blue-600 hover:underline px-2 py-1">
                      Ver
                    </Link>
                    <button onClick={() => handleDeleteProject(project.id)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 transition">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}