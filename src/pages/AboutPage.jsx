import { Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

export default function AboutPage() {
  return (
    <div className="page">

      <Navbar />

      <header className="hero">
        <div className="hero__inner">
          <div className="hero__content">
            <h1 className="hero__title">¿Qué es este repositorio?</h1>
            <p className="hero__subtitle">Conoce el propósito y funcionamiento de esta plataforma</p>
          </div>
        </div>
      </header>

      <main className="content" style={{ maxWidth: '1100px' }}>

        {/* Fila 1: Propósito + Criterios — sin card, solo grid */}
        <div className="about__grid" style={{ marginBottom: '40px' }}>

          <section>
            <h2 className="about__h2">Propósito</h2>
            <p style={{ color: '#374151', lineHeight: '1.7', margin: 0 }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
          </section>

          <section>
            <h2 className="about__h2">Criterios de publicación</h2>
            <p style={{ color: '#374151', lineHeight: '1.7', marginBottom: '14px' }}>
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: 0, listStyle: 'none', margin: 0 }}>
              {[
                'Nemo enim ipsam voluptatem quia voluptas sit aspernatur.',
                'Neque porro quisquam est qui dolorem ipsum.',
                'Ut labore et dolore magnam aliquam quaerat.',
                'Quis autem vel eum iure reprehenderit.',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '15px', color: '#374151' }}>
                  <span style={{ background: '#d22020', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900', flexShrink: 0 }}>{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

        </div>

        {/* Divisor */}
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', marginBottom: '40px' }} />

        {/* ¿Cómo funciona? — sin card, solo los pasos tienen cuadrado */}
        <section style={{ marginBottom: '40px' }}>
          <h2 className="about__h2">¿Cómo funciona?</h2>
          <p style={{ color: '#374151', lineHeight: '1.7', marginBottom: '20px' }}>
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti.
          </p>
          <div className="about__steps">
            {[
              { img: 'document.png', title: 'Sube tu proyecto', desc: 'Rellena el formulario con los datos y archivos de tu proyecto.' },
              { img: 'search.png',   title: 'Revisión',         desc: 'Un administrador revisa que cumple los criterios del repositorio.' },
              { img: 'check.png',    title: 'Publicación',      desc: 'Si es aprobado, tu proyecto queda visible para toda la comunidad.' },
            ].map(({ img, title, desc }) => (
              <div key={title} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <img src={`${import.meta.env.BASE_URL}icons/${img}`} alt={title} className="aboutCard__icon" />
                <p style={{ fontWeight: '900', fontSize: '15px', marginBottom: '6px', color: '#111827' }}>{title}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Divisor */}
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', marginBottom: '40px' }} />

        {/* Sobre los autores — sin card */}
        <section style={{ marginBottom: '40px' }}>
          <h2 className="about__h2">Sobre los autores</h2>
          <p style={{ color: '#374151', lineHeight: '1.7', margin: 0 }}>
            Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.
          </p>
        </section>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/" style={{ color: '#385e9d', textDecoration: 'none', fontSize: '15px' }}>← Volver al repositorio</Link>
        </div>

      </main>

      <Footer />
    </div>
  )
}