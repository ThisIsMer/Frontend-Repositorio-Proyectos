import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

export default function Navbar({ onOpenMenu }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await api.post('/logout') } catch (e) {}
    logout()
    navigate('/')
  }

  return (
    <nav className="siteNav">
      <div className="siteNav__inner">
        <div className="siteNav__left">
          {/* BOTÓN MENÚ */}
          <button
            type="button"
            className="hamburgerBtn"
            onClick={onOpenMenu}
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <Link to="/" className="siteNav__brand">
            Repositorio
          </Link>
        </div>

        <div className="siteNav__links">
          <Link to="/" className="siteNav__link">Proyectos</Link>
          <Link to="/about" className="siteNav__link">¿Qué es esto?</Link>

          {user ? (
            <>
              <Link to="/submit" className="btn btn--primary">+ Subir Proyecto</Link>
              <Link to="/profile" className="siteNav__link">{user.name || user.email}</Link>
              {user.is_admin && <Link to="/admin" className="siteNav__admin">Admin</Link>}
              <button onClick={handleLogout} className="siteNav__logout">Salir</button>
            </>
          ) : (
            <>
              <Link to="/login" className="siteNav__link">Iniciar sesión</Link>
              <Link to="/register" className="btn btn--primary">Registrarse</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}