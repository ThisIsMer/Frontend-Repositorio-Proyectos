import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/logout')
    } catch (e) {}
    logout()
    navigate('/')
  }

  return (
    <nav className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        
        <Link to="/" className="text-xl font-bold text-white hover:text-blue-400 transition">
          📚 Repositorio
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/" className="text-slate-300 hover:text-white transition text-sm">
            Proyectos
          </Link>

          {user ? (
            <>
              <Link to="/submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm transition">
                + Subir Proyecto
              </Link>
              <Link to="/profile" className="text-slate-300 hover:text-white transition text-sm">
                {user.name || user.email}
              </Link>
              {user.is_admin && (
                <Link to="/admin" className="text-yellow-400 hover:text-yellow-300 transition text-sm font-medium">
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition text-sm">
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-300 hover:text-white transition text-sm">
                Iniciar sesión
              </Link>
              <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm transition">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}