import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Index({ routes, isDriver }) {
    const { delete: destroy } = useForm();
    const [viewingRouteId, setViewingRouteId] = useState(null);
    const [routeDetails, setRouteDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [routeMetrics, setRouteMetrics] = useState(null);
    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [infoMessage, setInfoMessage] = useState('');
    
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const routeLayerRef = useRef(null);
    const markersRef = useRef([]);

    // Polling for real-time updates in the main list
    useEffect(() => {
        if (!isDriver) {
            const interval = setInterval(() => {
                router.reload({ only: ['routes'], preserveState: true, preserveScroll: true });
            }, 600000); // Refresca cada 10 minutos (600,000 ms)
            return () => clearInterval(interval);
        }
    }, [isDriver]);

    // Polling for real-time updates inside the tracking modal
    useEffect(() => {
        if (viewingRouteId) {
            const interval = setInterval(() => {
                axios.get(window.route('routes.show', viewingRouteId), {
                    headers: { Accept: 'application/json' }
                }).then(res => {
                    setRouteDetails(res.data.route);
                }).catch(e => console.error("Error al refrescar modal", e));
            }, 600000); // Refresca cada 10 minutos (600,000 ms)
            return () => clearInterval(interval);
        }
    }, [viewingRouteId]);

    const handleViewRoute = async (e, id) => {
        e.preventDefault();
        setViewingRouteId(id);
        setIsLoadingDetails(true);
        setRouteDetails(null);
        try {
            const response = await axios.get(route('routes.show', id), {
                headers: { Accept: 'application/json' }
            });
            setRouteDetails(response.data.route);
        } catch (error) {
            console.error("Error fetching route details", error);
            setViewingRouteId(null);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const closeViewModal = () => {
        setViewingRouteId(null);
        setRouteDetails(null);
        setRouteMetrics(null);
    };

    // Rendering map logic
    useEffect(() => {
        if (!viewingRouteId) {
            // Cleanup map when modal closes to prevent attaching to unmounted DOM nodes
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            return;
        }

        if (!routeDetails || !mapRef.current) return;

        // Give modal a tiny delay to render the ref completely
        const timer = setTimeout(() => {
            const coords = [];
            const companyCoords = routeDetails.company?.latitude && routeDetails.company?.longitude 
                ? [parseFloat(routeDetails.company.latitude), parseFloat(routeDetails.company.longitude)] 
                : null;
            
            if (companyCoords) coords.push(companyCoords);

            routeDetails.dispatches.forEach(d => {
                if (d.client?.latitude && d.client?.longitude) {
                    coords.push([parseFloat(d.client.latitude), parseFloat(d.client.longitude)]);
                }
            });

            if (companyCoords && coords.length > 1) coords.push(companyCoords);

            if (!mapInstanceRef.current) {
                mapInstanceRef.current = L.map(mapRef.current).setView(
                    coords.length > 0 ? coords[0] : [10.4806, -66.9036], 
                    12
                );
                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(mapInstanceRef.current);
            }

            markersRef.current.forEach(m => mapInstanceRef.current.removeLayer(m));
            markersRef.current = [];
            if (routeLayerRef.current) {
                mapInstanceRef.current.removeLayer(routeLayerRef.current);
                routeLayerRef.current = null;
            }

            if (coords.length > 0) {
                if (companyCoords) {
                    const companyIcon = L.divIcon({
                        className: '',
                        html: `<div class="bg-indigo-600 text-white font-bold text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap -ml-6 -mt-8 border border-white">🏠 ${routeDetails.company.name}</div>`,
                        iconSize: null
                    });
                    const m = L.marker(companyCoords, { icon: companyIcon }).addTo(mapInstanceRef.current);
                    markersRef.current.push(m);
                }

                routeDetails.dispatches.forEach((d, index) => {
                    if (d.client?.latitude && d.client?.longitude) {
                        const isDelivered = d.status === 'entregado';
                        const pointIndex = companyCoords ? index + 1 : index;
                        
                        const markerIcon = L.divIcon({
                            className: '',
                            html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center font-bold text-white
                                ${isDelivered ? 'bg-green-500' : 'bg-red-500'}">
                                ${isDelivered ? '✓' : index + 1}
                            </div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        });
                        
                        const m = L.marker(coords[pointIndex], { icon: markerIcon }).addTo(mapInstanceRef.current);
                        m.bindTooltip(d.client.name, { direction: 'top', offset: [0, -10] });
                        markersRef.current.push(m);
                    }
                });

                if (coords.length > 1) {
                    const waypoints = coords.map(c => `${c[1]},${c[0]}`).join(';');
                    axios.get(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`)
                        .then(res => {
                            if (res.data.routes && res.data.routes[0]) {
                                const geometry = res.data.routes[0].geometry;
                                const distance = res.data.routes[0].distance;
                                const duration = res.data.routes[0].duration;
                                setRouteMetrics({ distance, duration });
                                
                                routeLayerRef.current = L.geoJSON(geometry, {
                                    style: { color: '#4f46e5', weight: 5, opacity: 0.7 }
                                }).addTo(mapInstanceRef.current);
                                mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [30, 30] });
                            }
                        })
                        .catch(() => {
                            routeLayerRef.current = L.polyline(coords, { color: '#4f46e5', weight: 4, opacity: 0.5, dashArray: '10, 10' }).addTo(mapInstanceRef.current);
                            mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [30, 30] });
                        });
                } else {
                    mapInstanceRef.current.setView(coords[0], 14);
                }
                
                // Force leaflet to re-calculate layout inside modal
                setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 100);
                setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 400);
                setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 800);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [routeDetails, viewingRouteId]);

    const handleDelete = (id) => {
        if (confirm('¿Estás seguro de que deseas eliminar esta ruta?')) {
            destroy(route('routes.destroy', id));
        }
    };

    const timeStats = (() => {
        if (!routeDetails) return null;
        
        let startTime = routeDetails.started_at ? new Date(routeDetails.started_at) : null;
        const delivered = routeDetails.dispatches
            ?.filter(d => d.dispatched_at)
            .map(d => new Date(d.dispatched_at))
            .sort((a, b) => a - b) || [];
            
        if (!startTime) {
            if (delivered.length === 0) return null;
            startTime = delivered[0];
        }

        const lastTime = delivered.length > 0 ? delivered[delivered.length - 1] : null;
        const isCompleted = routeDetails.dispatches?.length > 0 && routeDetails.dispatches.every(d => d.status === 'entregado');
        const endTimeToUse = isCompleted && lastTime ? lastTime : new Date();

        const diffMs = endTimeToUse - startTime;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);

        return {
            start: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            end: isCompleted && lastTime ? lastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
            elapsed: `${diffHrs}h ${diffMins}m`
        };
    })();

    return (
        <AuthenticatedLayout
            header={<h2 className="text-2xl font-bold text-gray-800 dark:text-white">Planificador de Rutas</h2>}
        >
            <Head title="Rutas" />

            <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden transition-colors duration-300">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-transparent">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                            {isDriver ? 'Mis Entregas de Hoy' : 'Gestión de Rutas'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            {isDriver ? 'Aquí tienes la lista de lugares que debes despachar en tu ruta actual.' : 'Administra y planifica las hojas de ruta de la compañía.'}
                        </p>
                    </div>
                    
                    {!isDriver && (
                        <Link
                            href={route('routes.create')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Planificar Ruta
                        </Link>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Fecha</th>
                                {!isDriver && <th className="px-6 py-4 font-semibold">Chofer / Camión</th>}
                                {isDriver && <th className="px-6 py-4 font-semibold">Camión</th>}
                                <th className="px-6 py-4 font-semibold">Estado</th>
                                <th className="px-6 py-4 font-semibold text-center">Despachos</th>
                                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                            {routes.map((rt) => (
                                <tr key={rt.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {rt.date}
                                        </div>
                                    </td>
                                    
                                    {!isDriver && (
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900 dark:text-white text-sm">{rt.driver?.name || 'N/A'}</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">{rt.truck?.license_plate || 'N/A'}</p>
                                        </td>
                                    )}

                                    {isDriver && (
                                        <td className="px-6 py-4 text-gray-600 dark:text-slate-300 text-sm">
                                            {rt.truck?.model || 'N/A'} - <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{rt.truck?.license_plate}</span>
                                        </td>
                                    )}

                                    <td className="px-6 py-4">
                                        {(() => {
                                            let st = rt.status ? rt.status.toLowerCase().trim() : '';
                                            const totalCount = rt.dispatches?.length || 0;
                                            const deliveredCount = rt.dispatches?.filter(d => d.status && d.status.toLowerCase().trim() === 'entregado').length || 0;

                                            // Auto-heal status for older routes
                                            if (totalCount > 0 && deliveredCount === totalCount) {
                                                st = 'completada';
                                            } else if (deliveredCount > 0 && deliveredCount < totalCount && st === 'pendiente') {
                                                st = 'en curso';
                                            }

                                            if (st === 'pendiente') {
                                                return (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500">
                                                        PENDIENTE
                                                    </span>
                                                );
                                            } else if (st === 'en curso') {
                                                // La ruta completa tiene "Salida", "Clientes", y "Llegada" => totalCount + 2 pasos.
                                                const totalSteps = totalCount + 2;
                                                // Si está "en curso", ya salió (paso 1 completado) + los clientes que haya entregado.
                                                const currentStep = 1 + deliveredCount;
                                                const progress = Math.round((currentStep / totalSteps) * 100);

                                                return (
                                                    <div className="flex flex-col gap-1 w-28">
                                                        <span className="inline-flex w-fit items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                                            EN PROCESO
                                                        </span>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-slate-700 mt-1 overflow-hidden">
                                                            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                        <div className="flex justify-between items-center px-1">
                                                            <span className="text-[9px] text-gray-400 font-medium">{deliveredCount}/{totalCount} Entregas</span>
                                                            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">{progress}%</span>
                                                        </div>
                                                    </div>
                                                );
                                            } else if (st === 'completada' || st === 'entregado') {
                                                let timeStr = '';
                                                const delivered = rt.dispatches?.filter(d => d.dispatched_at).map(d => new Date(d.dispatched_at)).sort((a,b) => a - b) || [];
                                                
                                                let startTime = rt.started_at ? new Date(rt.started_at) : null;
                                                if (!startTime && delivered.length > 0) {
                                                    startTime = delivered[0];
                                                }

                                                if (startTime) {
                                                    const endTime = delivered.length > 0 ? delivered[delivered.length - 1] : new Date();
                                                    const diffMs = endTime - startTime;
                                                    const diffHrs = Math.floor(diffMs / 3600000);
                                                    const diffMins = Math.floor((diffMs % 3600000) / 60000);
                                                    timeStr = `${diffHrs}h ${diffMins}m`;
                                                }

                                                return (
                                                    <div className="flex flex-col gap-1 w-fit">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                                            ENTREGADO
                                                        </span>
                                                        {timeStr && (
                                                            <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5 ml-1">
                                                                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                {timeStr}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </td>
                                    
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="inline-flex items-center justify-center size-7 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold">
                                                {rt.dispatches?.length || 0}
                                            </span>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <a
                                            href="#"
                                            onClick={(e) => handleViewRoute(e, rt.id)}
                                            className="inline-flex items-center p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all cursor-pointer"
                                            title="Ver Detalles de Ruta"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </a>
                                        {!isDriver && (
                                            <>
                                                {st === 'pendiente' ? (
                                                    <Link
                                                        href={route('routes.edit', rt.id)}
                                                        className="inline-flex items-center p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                                                        title="Editar Ruta"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </Link>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setInfoMessage(`No es posible editar esta ruta porque se encuentra en estado "${st.toUpperCase()}". Solo se pueden editar rutas que están Pendientes.`);
                                                            setInfoModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center p-2 text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
                                                        title="Editar Ruta (No permitido)"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                <button
                                                onClick={() => handleDelete(rt.id)}
                                                className="inline-flex items-center p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                title="Cancelar/Eliminar Ruta"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {routes.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-slate-400 text-sm">
                                        No se encontraron rutas para el día de hoy.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal show={!!viewingRouteId} onClose={closeViewModal} maxWidth="4xl">
                <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden flex flex-col h-[85vh]">
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 shrink-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Rastreo de Ruta
                        </h3>
                        
                        <div className="flex items-center gap-4">
                            {timeStats && (
                                <div className="flex items-center gap-3 mr-4 text-sm bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Inicio</span>
                                        <span className="font-semibold text-gray-700 dark:text-slate-200">{timeStats.start}</span>
                                    </div>
                                    <div className="w-px h-6 bg-gray-200 dark:bg-slate-700"></div>
                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Final</span>
                                        <span className="font-semibold text-gray-700 dark:text-slate-200">{timeStats.end}</span>
                                    </div>
                                    <div className="w-px h-6 bg-gray-200 dark:bg-slate-700"></div>
                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wide">Transcurrido</span>
                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{timeStats.elapsed}</span>
                                    </div>
                                </div>
                            )}

                            <button onClick={closeViewModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-2 rounded-full">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                        {isLoadingDetails && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-50 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                            </div>
                        )}
                        
                        {/* Lado Izquierdo: Lista */}
                        <div className="w-full lg:w-5/12 border-r border-gray-100 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
                            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wide sticky top-0 bg-white dark:bg-slate-900 py-2 z-10">
                                Hoja de Ruta Detallada
                            </h4>

                            {routeDetails?.dispatches?.map((dispatch, index) => {
                                const isDelivered = dispatch.status === 'entregado';
                                const totalProducts = dispatch.products?.length || 0;
                                const deliveredProducts = dispatch.products?.filter(p => p.delivered)?.length || 0;
                                
                                return (
                                    <details key={dispatch.id} className={`group px-3 py-2.5 rounded-xl border transition-all ${isDelivered ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-900/10' : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}>
                                        <summary className="flex gap-2.5 items-center cursor-pointer list-none [&::-webkit-details-marker]:hidden outline-none">
                                            <div className={`shrink-0 size-7 rounded-full flex items-center justify-center font-bold text-xs shadow-sm border-2 border-white
                                                ${isDelivered ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                {isDelivered ? '✓' : index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0 flex justify-between items-center">
                                                <div className="pr-2">
                                                    <h5 className="font-bold text-gray-900 dark:text-white truncate text-[13px] leading-tight">
                                                        {dispatch.client?.name}
                                                    </h5>
                                                    {isDelivered && dispatch.dispatched_at ? (
                                                        <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 mt-0.5">
                                                            Entregado: {new Date(dispatch.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] font-medium text-gray-500 dark:text-slate-400 mt-0.5">
                                                            Pendiente
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="text-right">
                                                        <p className="text-[9px] uppercase text-gray-400 font-bold leading-none mb-0.5">Entrega</p>
                                                        <p className="text-[11px] font-bold text-gray-700 dark:text-slate-200 leading-none">
                                                            {deliveredProducts} <span className="text-gray-400 font-normal">/ {totalProducts} el.</span>
                                                        </p>
                                                    </div>
                                                    <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-full text-gray-400 group-open:rotate-180 transition-transform">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </summary>
                                        
                                        <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-slate-700/50 pl-9">
                                            {/* Productos */}
                                            {dispatch.products && dispatch.products.length > 0 ? (
                                                <div className="space-y-1">
                                                    <p className="text-[9px] uppercase font-bold text-gray-400 mb-1.5">Lista de Despacho</p>
                                                    {dispatch.products.map(prod => (
                                                        <div key={prod.id} className="flex justify-between items-center text-[11px] text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/50 px-2 py-1.5 rounded-md">
                                                            <span className={prod.delivered ? 'text-green-600 dark:text-green-400 font-semibold flex items-center gap-1.5' : 'line-through opacity-60 flex items-center gap-1.5 text-red-500'}>
                                                                {prod.delivered ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>}
                                                                {prod.product_name}
                                                            </span>
                                                            <span className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-gray-200 dark:border-slate-700 shadow-sm leading-none">x{prod.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-gray-500 italic">No hay productos registrados.</p>
                                            )}

                                            {/* Observacion */}
                                            {isDelivered && dispatch.observation && (
                                                <div className="mt-3">
                                                    <p className="text-[9px] uppercase font-bold text-gray-400 mb-1">Observaciones</p>
                                                    <div className="text-[11px] bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-md border border-yellow-100 dark:border-yellow-900/30 text-yellow-800 dark:text-yellow-500 italic shadow-sm">
                                                        "{dispatch.observation}"
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                );
                            })}

                            </div>

                            {/* Tarjeta de métricas fijada al fondo del lado izquierdo */}
                            {routeMetrics && (
                                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-indigo-500 mb-0.5">Distancia Total</span>
                                        <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{(routeMetrics.distance / 1000).toFixed(1)} km</span>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200 dark:bg-slate-700"></div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] uppercase font-bold text-indigo-500 mb-0.5">Tiempo Estimado</span>
                                        <span className="text-sm font-bold text-gray-800 dark:text-slate-200">
                                            {routeMetrics.duration > 3600 
                                                ? `${Math.floor(routeMetrics.duration / 3600)}h ${Math.floor((routeMetrics.duration % 3600) / 60)}m` 
                                                : `${Math.floor(routeMetrics.duration / 60)} min`}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lado Derecho: Mapa */}
                        <div className="w-full lg:w-7/12 h-64 lg:h-auto relative bg-slate-100 dark:bg-slate-800">
                            <div ref={mapRef} className="absolute inset-0 z-0"></div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Info Modal */}
            <Modal show={infoModalOpen} onClose={() => setInfoModalOpen(false)} maxWidth="sm">
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Acción no permitida
                        </h3>
                        <button onClick={() => setInfoModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-5">
                        <p className="text-sm text-gray-600 dark:text-slate-300">{infoMessage}</p>
                        <div className="mt-5 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setInfoModalOpen(false)}
                                className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
