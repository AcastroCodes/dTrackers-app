import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';

export default function Index({ auth, routes, filters }) {
    const { data, setData, get } = useForm({
        date: filters.date || '',
        driver: filters.driver || '',
    });

    const handleFilter = (e) => {
        e.preventDefault();
        get(route('reports.index'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Módulo de Reportes</h2>}
        >
            <Head title="Reportes" />

            <div className="row">
                <div className="col-md-12">
                    <div className="card">
                        <div className="card-header flex justify-between items-center">
                            <h4 className="card-title">Rutas Finalizadas</h4>
                            
                            <form onSubmit={handleFilter} className="flex gap-2 items-end">
                                <div>
                                    <label className="text-sm font-medium">Fecha:</label>
                                    <TextInput
                                        type="date"
                                        className="block w-full mt-1 h-9 text-sm"
                                        value={data.date}
                                        onChange={(e) => setData('date', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Chofer:</label>
                                    <TextInput
                                        type="text"
                                        className="block w-full mt-1 h-9 text-sm"
                                        value={data.driver}
                                        onChange={(e) => setData('driver', e.target.value)}
                                        placeholder="Nombre del chofer..."
                                    />
                                </div>
                                <div>
                                    <PrimaryButton type="submit" className="h-9">
                                        Filtrar
                                    </PrimaryButton>
                                    {(data.date || data.driver) && (
                                        <button 
                                            type="button" 
                                            className="ml-2 text-sm text-gray-500 hover:text-gray-700 underline"
                                            onClick={() => {
                                                setData('date', '');
                                                setData('driver', '');
                                                router.get(route('reports.index'));
                                            }}
                                        >
                                            Limpiar
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table">
                                    <thead className="text-primary">
                                        <tr>
                                            <th>Fecha</th>
                                            {auth.user.role === 'superadmin' && <th>Empresa</th>}
                                            <th>Chofer</th>
                                            <th>Vehículo</th>
                                            <th>Distancia</th>
                                            <th className="text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {routes.data.length > 0 ? (
                                            routes.data.map((r) => (
                                                <tr key={r.id}>
                                                    <td>{new Date(r.date + 'T00:00:00').toLocaleDateString()}</td>
                                                    {auth.user.role === 'superadmin' && <td>{r.company?.name || 'N/A'}</td>}
                                                    <td>{r.driver?.name || 'No Asignado'}</td>
                                                    <td>{r.truck?.license_plate || 'No Asignado'}</td>
                                                    <td>{r.total_distance_km ? `${r.total_distance_km} km` : '-'}</td>
                                                    <td className="text-right">
                                                        <a
                                                            href={route('reports.pdf', r.id)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="btn btn-sm btn-danger btn-round btn-icon"
                                                            title="Descargar Reporte PDF"
                                                        >
                                                            <i className="fa fa-file-pdf-o"></i>
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={auth.user.role === 'superadmin' ? 6 : 5} className="text-center py-4">
                                                    No se encontraron rutas finalizadas.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination */}
                            {routes.links && routes.links.length > 3 && (
                                <div className="mt-4 flex justify-center">
                                    <div className="join">
                                        {routes.links.map((link, index) => (
                                            <Link
                                                key={index}
                                                href={link.url || '#'}
                                                className={`join-item btn btn-sm ${link.active ? 'btn-active bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300'} ${!link.url ? 'btn-disabled text-gray-400' : ''}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                preserveScroll
                                                preserveState
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
