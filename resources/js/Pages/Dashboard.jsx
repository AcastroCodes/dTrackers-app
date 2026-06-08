import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useEffect } from 'react';

export default function Dashboard({ stats, companiesStats, recentRoutes, isSuperAdmin, isDriver }) {
    
    useEffect(() => {
        // Initialize charts if demo.js is loaded
        if (window.demo) {
            window.demo.initChartsPages();
        }
    }, []);

    return (
        <AuthenticatedLayout header="Dashboard Analytics">
            <Head title="Dashboard" />

            <div className="row">
                <div className="col-lg-3 col-md-6 col-sm-6">
                    <div className="card card-stats">
                        <div className="card-body">
                            <div className="row">
                                <div className="col-5 col-md-4">
                                    <div className="icon-big text-center icon-warning">
                                        <i className="nc-icon nc-single-02 text-warning"></i>
                                    </div>
                                </div>
                                <div className="col-7 col-md-8">
                                    <div className="numbers">
                                        <p className="card-category">Usuarios Registrados</p>
                                        <p className="card-title">{stats?.users || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer">
                            <hr />
                            <div className="stats">
                                <i className="fa fa-refresh"></i> Update Now
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6 col-sm-6">
                    <div className="card card-stats">
                        <div className="card-body">
                            <div className="row">
                                <div className="col-5 col-md-4">
                                    <div className="icon-big text-center icon-warning">
                                        <i className="nc-icon nc-circle-10 text-success"></i>
                                    </div>
                                </div>
                                <div className="col-7 col-md-8">
                                    <div className="numbers">
                                        <p className="card-category">Clientes Activos</p>
                                        <p className="card-title">{stats?.clients || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer">
                            <hr />
                            <div className="stats">
                                <i className="fa fa-calendar-o"></i> Last day
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6 col-sm-6">
                    <div className="card card-stats">
                        <div className="card-body">
                            <div className="row">
                                <div className="col-5 col-md-4">
                                    <div className="icon-big text-center icon-warning">
                                        <i className="nc-icon nc-delivery-fast text-danger"></i>
                                    </div>
                                </div>
                                <div className="col-7 col-md-8">
                                    <div className="numbers">
                                        <p className="card-category">Camiones</p>
                                        <p className="card-title">{stats?.trucks || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer">
                            <hr />
                            <div className="stats">
                                <i className="fa fa-clock-o"></i> In the last hour
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6 col-sm-6">
                    <div className="card card-stats">
                        <div className="card-body">
                            <div className="row">
                                <div className="col-5 col-md-4">
                                    <div className="icon-big text-center icon-warning">
                                        <i className="nc-icon nc-pin-3 text-primary"></i>
                                    </div>
                                </div>
                                <div className="col-7 col-md-8">
                                    <div className="numbers">
                                        <p className="card-category">Rutas para Hoy</p>
                                        <p className="card-title">{stats?.routes_today || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer">
                            <hr />
                            <div className="stats">
                                <i className="fa fa-refresh"></i> Update now
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isSuperAdmin && companiesStats && companiesStats.length > 0 && (
                <div className="row mt-2 mb-4">
                    <div className="col-12">
                        <h5 className="card-title mb-3" style={{ fontWeight: '600', color: '#51cbce' }}>
                            <i className="nc-icon nc-bank mr-2"></i> Resumen por Empresas
                        </h5>
                    </div>
                    {companiesStats.map(company => (
                        <div key={company.id} className="col-12 mb-4">
                            <div className="card shadow-sm" style={{ borderLeft: '4px solid #51cbce' }}>
                                <div className="card-header pb-0">
                                    <h5 className="card-title text-dark font-weight-bold mb-0">{company.name}</h5>
                                </div>
                                <div className="card-body pt-3">
                                    <div className="row text-center">
                                        <div className="col-md-3 col-6 mb-2">
                                            <div className="p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                                                <i className="nc-icon nc-single-02 text-secondary d-block mb-2" style={{ fontSize: '28px' }}></i>
                                                <h3 className="mb-1 font-weight-bold" style={{ color: '#2c2c2c' }}>{company.users_count}</h3>
                                                <span className="text-muted text-uppercase font-weight-bold" style={{ fontSize: '11px', letterSpacing: '1px' }}>Usuarios</span>
                                            </div>
                                        </div>
                                        <div className="col-md-3 col-6 mb-2">
                                            <div className="p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                                                <i className="nc-icon nc-badge text-info d-block mb-2" style={{ fontSize: '28px' }}></i>
                                                <h3 className="mb-1 font-weight-bold" style={{ color: '#2c2c2c' }}>{company.drivers_count}</h3>
                                                <span className="text-muted text-uppercase font-weight-bold" style={{ fontSize: '11px', letterSpacing: '1px' }}>Choferes</span>
                                            </div>
                                        </div>
                                        <div className="col-md-3 col-6 mb-2">
                                            <div className="p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                                                <i className="nc-icon nc-delivery-fast text-danger d-block mb-2" style={{ fontSize: '28px' }}></i>
                                                <h3 className="mb-1 font-weight-bold" style={{ color: '#2c2c2c' }}>{company.trucks_count}</h3>
                                                <span className="text-muted text-uppercase font-weight-bold" style={{ fontSize: '11px', letterSpacing: '1px' }}>Camiones</span>
                                            </div>
                                        </div>
                                        <div className="col-md-3 col-6 mb-2">
                                            <div className="p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                                                <i className="nc-icon nc-pin-3 text-success d-block mb-2" style={{ fontSize: '28px' }}></i>
                                                <h3 className="mb-1 font-weight-bold" style={{ color: '#2c2c2c' }}>{company.routes_count}</h3>
                                                <span className="text-muted text-uppercase font-weight-bold" style={{ fontSize: '11px', letterSpacing: '1px' }}>Rutas</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="row">
                <div className="col-md-12">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="card-title">Comportamiento del Sistema</h5>
                            <p className="card-category">Rendimiento en 24 Horas</p>
                        </div>
                        <div className="card-body">
                            <canvas id="chartHours" width="400" height="100"></canvas>
                        </div>
                        <div className="card-footer">
                            <hr />
                            <div className="stats">
                                <i className="fa fa-history"></i> Updated 3 minutes ago
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="card-title">Estadísticas de Entrega</h5>
                            <p className="card-category">Estado Actual</p>
                        </div>
                        <div className="card-body">
                            <canvas id="chartEmail"></canvas>
                        </div>
                        <div className="card-footer">
                            <div className="legend">
                                <i className="fa fa-circle text-primary"></i> Completado
                                <i className="fa fa-circle text-warning"></i> En Curso
                                <i className="fa fa-circle text-danger"></i> Pendiente
                                <i className="fa fa-circle text-gray"></i> Cancelado
                            </div>
                            <hr />
                            <div className="stats">
                                <i className="fa fa-calendar"></i> Número de entregas
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-8">
                    <div className="card card-chart">
                        <div className="card-header">
                            <h5 className="card-title">Trafico Logístico Reciente</h5>
                            <p className="card-category">Rutas Recientes</p>
                        </div>
                        <div className="card-body" style={{overflowX: 'auto'}}>
                            <table className="table">
                                <thead className="text-primary">
                                    <tr>
                                        <th>Responsable</th>
                                        <th>Progreso</th>
                                        <th>Operación</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentRoutes && recentRoutes.length > 0 ? recentRoutes.map((route, i) => {
                                        const total = route.dispatches.length;
                                        const done = route.dispatches.filter(d => d.status === 'entregado').length;
                                        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                                        return (
                                            <tr key={route.id}>
                                                <td>{route.driver?.name}</td>
                                                <td>
                                                    <div className="progress">
                                                        <div className="progress-bar" role="progressbar" style={{width: `${percent}%`}} aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100"></div>
                                                    </div>
                                                </td>
                                                <td>{route.total_distance_km ? route.total_distance_km + ' KM' : 'Sin mapa'}</td>
                                                <td>{route.status}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="4" className="text-center">No hay rutas registradas recientemente.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="card-footer">
                            <hr />
                            <div className="card-stats">
                                <i className="fa fa-check"></i> Data information certified
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
