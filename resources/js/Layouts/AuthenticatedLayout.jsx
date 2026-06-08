import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import DriverLayout from './DriverLayout';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;

    // Si el usuario es chofer, forzamos la nueva vista móvil (sin menú lateral)
    if (user.role === 'chofer') {
        return <DriverLayout>{children}</DriverLayout>;
    }
    
    // We can still use state to manage some basic toggles if needed, but Paper Dashboard
    // handles sidebar collapse via its core JS as well.
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [configOpen, setConfigOpen] = useState(route().current('users.*') || route().current('companies.*'));

    useEffect(() => {
        // Any setup for paper dashboard can be done here if needed
    }, []);

    return (
        <div className="wrapper">
            <div className="sidebar" data-color="white" data-active-color="danger">
                <div className="logo">
                    <Link href="/" className="simple-text logo-mini">
                        <div className="logo-image-small">
                            {/* Assuming we just put a placeholder D for dTrackers */}
                            <span style={{fontWeight: 'bold', fontSize: '18px'}}>D</span>
                        </div>
                    </Link>
                    <Link href="/" className="simple-text logo-normal">
                        dTrackers
                    </Link>
                </div>
                <div className="sidebar-wrapper">
                    <ul className="nav">
                        <SidebarLink href={route('dashboard')} active={route().current('dashboard')} icon="nc-bank">
                            Dashboard
                        </SidebarLink>
                        
                        {user.role === 'administrador' && (
                            <SidebarLink href={route('users.index')} active={route().current('users.*')} icon="nc-single-02">
                                Choferes
                            </SidebarLink>
                        )}
                        
                        {user.role !== 'chofer' && (
                            <>
                                <SidebarLink href={route('trucks.index')} active={route().current('trucks.*')} icon="nc-delivery-fast">
                                    Camiones
                                </SidebarLink>
                                <SidebarLink href={route('clients.index')} active={route().current('clients.*')} icon="nc-circle-10">
                                    Clientes
                                </SidebarLink>
                            </>
                        )}
                        
                        <SidebarLink href={route('routes.index')} active={route().current('routes.*')} icon="nc-pin-3">
                            Rutas
                        </SidebarLink>

                        {user.role === 'superadmin' && (
                            <li>
                                <a href="#" onClick={(e) => { e.preventDefault(); setConfigOpen(!configOpen); }}>
                                    <i className="nc-icon nc-settings-gear-65"></i>
                                    <p>Configuración <b className="caret" style={{float: 'right', marginTop: '10px'}}></b></p>
                                </a>
                                <div style={{ display: configOpen ? 'block' : 'none' }}>
                                    <ul className="nav" style={{ paddingLeft: '20px', marginTop: 0 }}>
                                        <SidebarLink href={route('users.index')} active={route().current('users.*')} icon="nc-single-02">
                                            Usuarios
                                        </SidebarLink>
                                        <SidebarLink href={route('companies.index')} active={route().current('companies.*')} icon="nc-bank">
                                            Empresas
                                        </SidebarLink>
                                    </ul>
                                </div>
                            </li>
                        )}
                    </ul>
                </div>
                
                {/* User Profile Footer */}
                <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: '15px 20px', borderTop: '1px solid #eee', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                        <img 
                            src={
                                user.company 
                                    ? (user.company.logo 
                                        ? (user.company.logo.startsWith('http') ? user.company.logo : `/storage/${user.company.logo}`) 
                                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.company.name)}&background=f4f3ef&color=66615b&rounded=true&bold=true`)
                                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f4f3ef&color=66615b&rounded=true&bold=true`
                            }
                            alt={user.company ? user.company.name : user.name}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '15px', flexShrink: 0, objectFit: 'cover', border: '1px solid #e3e3e3' }}
                        />
                        <div style={{ overflow: 'hidden', color: '#66615b' }}>
                            <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: '600', lineHeight: '1.2' }}>{user.name}</p>
                            <small style={{ fontSize: '12px', color: '#9a9a9a', textTransform: 'capitalize' }}>{user.role}</small>
                        </div>
                    </div>
                    <Link href={route('logout')} method="post" as="button" style={{ background: 'none', border: 'none', color: '#ef8157', cursor: 'pointer', padding: '5px' }} title="Cerrar Sesión">
                        <i className="nc-icon nc-button-power" style={{ fontSize: '20px', fontWeight: 'bold' }}></i>
                    </Link>
                </div>
            </div>

            <div className="main-panel">
                {/* Navbar */}
                <nav className="navbar navbar-expand-lg navbar-absolute fixed-top navbar-transparent">
                    <div className="container-fluid">
                        <div className="navbar-wrapper">
                            <div className="navbar-toggle">
                                <button type="button" className="navbar-toggler" onClick={() => {
                                    document.documentElement.classList.toggle('nav-open');
                                }}>
                                    <span className="navbar-toggler-bar bar1"></span>
                                    <span className="navbar-toggler-bar bar2"></span>
                                    <span className="navbar-toggler-bar bar3"></span>
                                </button>
                            </div>
                            <span className="navbar-brand">{header || 'Dashboard'}</span>
                        </div>
                        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navigation" aria-controls="navigation-index" aria-expanded="false" aria-label="Toggle navigation">
                            <span className="navbar-toggler-bar navbar-kebab"></span>
                            <span className="navbar-toggler-bar navbar-kebab"></span>
                            <span className="navbar-toggler-bar navbar-kebab"></span>
                        </button>
                        <div className="collapse navbar-collapse justify-content-end" id="navigation">
                            <ul className="navbar-nav">
                                <li className="nav-item btn-rotate dropdown">
                                    <a className="nav-link dropdown-toggle" href="#" id="navbarDropdownMenuLink" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                        <i className="nc-icon nc-settings-gear-65"></i>
                                        <p>
                                            <span className="d-lg-none d-md-block">Account</span>
                                        </p>
                                    </a>
                                    <div className="dropdown-menu dropdown-menu-right" aria-labelledby="navbarDropdownMenuLink">
                                        <Link href={route('profile.edit')} className="dropdown-item">Mi Perfil</Link>
                                        <Link href={route('logout')} method="post" as="button" className="dropdown-item">Cerrar Sesión</Link>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>
                {/* End Navbar */}

                <div className="content">
                    {children}
                </div>

                <footer className="footer footer-black footer-white">
                    <div className="container-fluid">
                        <div className="row">
                            <nav className="footer-nav">
                                <ul>
                                    <li><a href="#" target="_blank">dTrackers</a></li>
                                </ul>
                            </nav>
                            <div className="credits ml-auto">
                                <span className="copyright">
                                    © {new Date().getFullYear()}, made with <i className="fa fa-heart heart"></i> for dTrackers
                                </span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function SidebarLink({ href, active, icon, children }) {
    return (
        <li className={active ? 'active' : ''}>
            <Link href={href}>
                <i className={`nc-icon ${icon}`}></i>
                <p>{children}</p>
            </Link>
        </li>
    );
}
