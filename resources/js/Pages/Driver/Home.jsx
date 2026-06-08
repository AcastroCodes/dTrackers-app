import { useState, useEffect, useRef } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import DriverLayout from '@/Layouts/DriverLayout';
import Modal from '@/Components/Modal';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

// Fix for default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Home({ assignedRoutes }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const routeLayerRef = useRef(null);
    const markersRef = useRef([]);

    // Selectors State
    const uniqueDates = [...new Set(assignedRoutes.map(r => r.date))].sort();
    const [selectedDate, setSelectedDate] = useState(uniqueDates.length > 0 ? uniqueDates[0] : '');
    const [selectedRouteId, setSelectedRouteId] = useState('');

    const routesForDate = assignedRoutes.filter(r => r.date === selectedDate);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDispatch, setSelectedDispatch] = useState(null);

    // Form for dispatch button
    const { data, setData, post, processing, reset } = useForm({
        observation: '',
        products: []
    });

    // Automatically select the first route when date changes
    useEffect(() => {
        if (routesForDate.length > 0) {
            if (!routesForDate.find(r => r.id === parseInt(selectedRouteId))) {
                setSelectedRouteId(routesForDate[0].id.toString());
            }
        } else {
            setSelectedRouteId('');
        }
    }, [selectedDate, routesForDate]);

    const activeRoute = assignedRoutes.find(r => r.id === parseInt(selectedRouteId));

    const handleStartRoute = () => {
        if (!activeRoute) return;
        router.post(window.route('routes.start', activeRoute.id), {}, { preserveScroll: true });
    };

    const openDispatchModal = (dispatch) => {
        setSelectedDispatch(dispatch);
        setData({
            observation: '',
            products: dispatch.products?.map(p => ({
                id: p.id,
                product_name: p.product_name,
                quantity: p.quantity,
                delivered: true // By default, assume all products are delivered
            })) || []
        });
        setIsModalOpen(true);
    };

    const handleConfirmDelivery = (e) => {
        e.preventDefault();
        if (!selectedDispatch) return;

        post(window.route('dispatches.mark_delivered', selectedDispatch.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsModalOpen(false);
                reset();
                setSelectedDispatch(null);
            }
        });
    };

    const toggleProductDelivery = (index) => {
        const newProducts = [...data.products];
        newProducts[index].delivered = !newProducts[index].delivered;
        setData('products', newProducts);
    };

    // Header Content Component
    const headerLeft = (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
                <select 
                    value={selectedDate} 
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-semibold text-sm focus:ring-0 focus:border-indigo-300"
                >
                    {uniqueDates.length === 0 && <option value="">Sin rutas asignadas</option>}
                    {uniqueDates.map(date => (
                        <option key={date} value={date}>{new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</option>
                    ))}
                </select>

                {routesForDate.length > 1 && (
                    <select 
                        value={selectedRouteId} 
                        onChange={e => setSelectedRouteId(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-semibold text-sm focus:ring-0 focus:border-indigo-300"
                    >
                        {routesForDate.map((route, idx) => (
                            <option key={route.id} value={route.id}>
                                Ruta {idx + 1} (Camión: {route.truck?.license_plate})
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {activeRoute && (
                <button
                    onClick={handleStartRoute}
                    disabled={!!activeRoute.started_at || activeRoute.status === 'completada'}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${
                        activeRoute.status === 'completada'
                            ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed opacity-90'
                            : activeRoute.started_at
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed opacity-90'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
                    }`}
                >
                    {activeRoute.status === 'completada' ? (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                            Finalizado
                        </>
                    ) : activeRoute.started_at ? (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Iniciado: {new Date(activeRoute.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Comenzar Despacho
                        </>
                    )}
                </button>
            )}
        </div>
    );

    // Map Rendering Logic
    useEffect(() => {
        if (!activeRoute || !mapRef.current) return;

        const coords = [];
        const companyCoords = activeRoute.company?.latitude && activeRoute.company?.longitude 
            ? [parseFloat(activeRoute.company.latitude), parseFloat(activeRoute.company.longitude)] 
            : null;
        
        if (companyCoords) {
            coords.push(companyCoords);
        }

        activeRoute.dispatches.forEach(d => {
            if (d.client?.latitude && d.client?.longitude) {
                coords.push([parseFloat(d.client.latitude), parseFloat(d.client.longitude)]);
            }
        });

        if (companyCoords && coords.length > 1) {
            coords.push(companyCoords);
        }

        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapRef.current).setView(
                coords.length > 0 ? coords[0] : [10.4806, -66.9036], 
                12
            );
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
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
                    html: `<div class="bg-indigo-600 text-white font-bold text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap -ml-6 -mt-8 border border-white">🏠 ${activeRoute.company.name}</div>`,
                    iconSize: null
                });
                const m = L.marker(companyCoords, { icon: companyIcon }).addTo(mapInstanceRef.current);
                markersRef.current.push(m);
            }

            activeRoute.dispatches.forEach((d, index) => {
                if (d.client?.latitude && d.client?.longitude) {
                    const isDelivered = d.status === 'entregado';
                    const pointIndex = companyCoords ? index + 1 : index;
                    
                    const markerIcon = L.divIcon({
                        className: '',
                        html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center font-bold text-white
                            ${isDelivered ? 'bg-green-500' : 'bg-red-500'}">
                            ${index + 1}
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
        }
    }, [activeRoute]);

    return (
        <DriverLayout headerLeft={headerLeft}>
            <Head title="Mis Rutas" />

            {!activeRoute ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">No hay rutas para la fecha seleccionada</h2>
                    <p className="text-gray-500 max-w-md">Disfruta tu día o selecciona otra fecha en el menú superior.</p>
                </div>
            ) : (
                <div className="space-y-6 pb-20">
                    
                    {/* Interactive Map (Arriba) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative h-[50vh] w-full">
                        <div className="absolute top-0 inset-x-0 z-10 px-4 py-3 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
                            <span className="text-sm font-semibold text-white drop-shadow-md flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                Trazado Interactivo
                            </span>
                        </div>
                        <div ref={mapRef} className="w-full h-full z-0" style={{ isolation: 'isolate' }}></div>
                    </div>

                    {/* Dispatches List (Abajo) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Hoja de Ruta Detallada
                            </h3>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            
                            {/* Punto de Salida (Base) */}
                            {activeRoute.company && (
                                <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-4 relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                                    <div className="flex gap-4 items-start">
                                        <div className="shrink-0 size-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm bg-indigo-600 text-white">
                                            🏠
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">Punto de Salida</h5>
                                            <p className="text-base font-semibold text-gray-800 mt-0.5">{activeRoute.company.name}</p>
                                            <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                {activeRoute.company.address || 'Sede principal'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Puntos de Entrega */}
                            {activeRoute.dispatches.map((dispatch, index) => {
                                const isDelivered = dispatch.status === 'entregado';
                                return (
                                    <div 
                                        key={dispatch.id} 
                                        className={`bg-white rounded-xl shadow-sm border transition-all duration-300 p-4 
                                            ${isDelivered ? 'border-green-200 opacity-80 bg-green-50/10' : 'border-gray-200 hover:border-indigo-300'}`}
                                    >
                                        <div className="flex flex-col gap-3">
                                            <div className="flex gap-4 items-start">
                                                <div className={`shrink-0 size-10 rounded-full flex items-center justify-center font-bold text-base shadow-sm border-2 border-white
                                                    ${isDelivered ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                    {isDelivered 
                                                        ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                        : index + 1}
                                                </div>
                                                
                                                <div className="flex-1">
                                                    <h5 className={`text-base font-bold ${isDelivered ? 'text-gray-500' : 'text-gray-900'}`}>
                                                        {dispatch.client?.name || 'Cliente Eliminado'}
                                                    </h5>
                                                    <p className="text-sm text-gray-500 mt-0.5 flex items-start gap-1">
                                                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        {dispatch.client?.address || 'Sin dirección registrada'}
                                                    </p>
                                                    
                                                    {isDelivered && dispatch.dispatched_at && (
                                                        <div className="mt-2 text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-1 rounded inline-flex items-center gap-1">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            Entregado a las {new Date(dispatch.dispatched_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute:'2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {!isDelivered && (
                                                <div className="pl-14">
                                                    <button
                                                        onClick={() => openDispatchModal(dispatch)}
                                                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        Confirmar Entrega
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Punto de Llegada (Base) */}
                            {activeRoute.company && (
                                <div className="bg-gray-100 rounded-xl border border-gray-200 p-4 relative overflow-hidden mt-4">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-400"></div>
                                    <div className="flex gap-4 items-center">
                                        <div className="shrink-0 size-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm bg-gray-300 text-gray-700">
                                            🏁
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Punto de Retorno</h5>
                                            <p className="text-base font-semibold text-gray-800 mt-0.5">{activeRoute.company.name}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Entrega */}
            <Modal show={isModalOpen} onClose={() => !processing && setIsModalOpen(false)} maxWidth="md">
                <form onSubmit={handleConfirmDelivery} className="bg-white dark:bg-[#1e293b] rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Confirmar Recepción
                        </h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                                Seleccione los productos que se están entregando satisfactoriamente al cliente 
                                <strong className="text-gray-900 dark:text-white ml-1">{selectedDispatch?.client?.name}</strong>:
                            </p>
                            
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {data.products.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded-lg">No hay productos registrados para esta entrega.</p>
                                ) : (
                                    data.products.map((prod, index) => (
                                        <div 
                                            key={prod.id} 
                                            onClick={() => toggleProductDelivery(index)}
                                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                                                prod.delivered 
                                                    ? 'bg-green-50/50 border-green-200 dark:bg-green-900/20 dark:border-green-800/50' 
                                                    : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                                    prod.delivered 
                                                        ? 'bg-green-500 border-green-500 text-white' 
                                                        : 'bg-white border-gray-300 dark:bg-slate-900 dark:border-slate-600'
                                                }`}>
                                                    {prod.delivered && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <div>
                                                    <span className={`text-sm font-semibold ${prod.delivered ? 'text-green-900 dark:text-green-400' : 'text-gray-700 dark:text-slate-300'}`}>
                                                        {prod.product_name}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-gray-600 dark:text-slate-300">
                                                Cant: {prod.quantity}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                                Observaciones de la entrega
                            </label>
                            <textarea
                                value={data.observation}
                                onChange={e => setData('observation', e.target.value)}
                                rows="3"
                                className="w-full rounded-xl border-gray-300 dark:border-slate-600 dark:bg-[#0f172a] dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="Ej: Se entregó en portería, faltó firmar la guía, mercancía con daños..."
                            ></textarea>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            disabled={processing}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : 'Finalizar Entrega'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DriverLayout>
    );
}
