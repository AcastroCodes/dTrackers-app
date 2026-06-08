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

const ClientMap = ({ client }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current || !client?.latitude || !client?.longitude) return;

        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapRef.current).setView([parseFloat(client.latitude), parseFloat(client.longitude)], 15);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapInstanceRef.current);
            const markerIcon = L.divIcon({
                className: '',
                html: `<div class="w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center font-bold text-white bg-indigo-500 text-xs"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            L.marker([parseFloat(client.latitude), parseFloat(client.longitude)], { icon: markerIcon }).addTo(mapInstanceRef.current);
        } else {
            mapInstanceRef.current.setView([parseFloat(client.latitude), parseFloat(client.longitude)], 15);
        }

        setTimeout(() => {
            if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, 100);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [client]);

    if (!client?.latitude || !client?.longitude) {
        return <div className="w-full h-full bg-gray-50 flex items-center justify-center text-sm text-gray-400">Sin coordenadas GPS</div>;
    }

    return <div ref={mapRef} className="w-full h-full z-0" style={{ isolation: 'isolate' }}></div>;
};

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

    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [selectedClientInfo, setSelectedClientInfo] = useState(null);

    const openClientInfoModal = (client) => {
        setSelectedClientInfo(client);
        setIsInfoModalOpen(true);
    };

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

    // Timer state
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    // Timer Logic
    useEffect(() => {
        let interval;
        if (activeRoute && activeRoute.started_at && activeRoute.status !== 'completada') {
            const start = new Date(activeRoute.started_at).getTime();
            interval = setInterval(() => {
                const now = new Date().getTime();
                const diff = now - start;
                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const secs = Math.floor((diff % (1000 * 60)) / 1000);
                    setElapsedTime(
                        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                    );
                }
            }, 1000);
        } else if (activeRoute && activeRoute.status === 'completada' && activeRoute.updated_at) {
            const start = new Date(activeRoute.started_at).getTime();
            const end = new Date(activeRoute.updated_at).getTime();
            const diff = end - start;
            if (diff > 0) {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((diff % (1000 * 60)) / 1000);
                setElapsedTime(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
            }
        } else {
            setElapsedTime('00:00:00');
        }
        return () => clearInterval(interval);
    }, [activeRoute]);

    const handleStartRoute = () => {
        if (!activeRoute) return;
        router.post(window.route('routes.start', activeRoute.id), {}, { preserveScroll: true });
    };

    const handleFinishRoute = () => {
        if (!activeRoute || !confirm('¿Estás seguro de finalizar esta ruta?')) return;
        router.post(window.route('routes.finish', activeRoute.id), {}, { preserveScroll: true });
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

    // Header Right (Selectors)
    const headerRight = (
        <div className="flex items-center gap-1 sm:gap-2">
            <select 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
                className="uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 pl-2 pr-8 sm:pl-3 sm:pr-10 py-1 sm:py-1.5 rounded-lg font-semibold text-xs sm:text-sm focus:ring-0 focus:border-indigo-300"
            >
                {uniqueDates.length === 0 && <option value="">SIN RUTAS</option>}
                {uniqueDates.map(date => (
                    <option key={date} value={date}>{new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</option>
                ))}
            </select>

            {routesForDate.length > 1 && (
                <select 
                    value={selectedRouteId} 
                    onChange={e => setSelectedRouteId(e.target.value)}
                    className="uppercase bg-white border border-gray-200 text-gray-700 pl-2 pr-8 sm:pl-3 sm:pr-10 py-1 sm:py-1.5 rounded-lg font-semibold text-xs sm:text-sm focus:ring-0 focus:border-indigo-300"
                >
                    {routesForDate.map((route, idx) => (
                        <option key={route.id} value={route.id}>
                            Ruta {idx + 1}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );

    // Footer Left (Action Button)
    const footerLeft = activeRoute ? (
        activeRoute.status === 'completada' ? (
            <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 border border-gray-200 text-xs font-bold flex items-center gap-1 shadow-sm opacity-90">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Finalizado
            </span>
        ) : activeRoute.started_at ? (
            <button
                onClick={handleFinishRoute}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white border border-red-700 text-xs font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
            >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                <span>Finalizar</span>
            </button>
        ) : (
            <button
                onClick={handleStartRoute}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 text-xs font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
            >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Comenzar</span>
            </button>
        )
    ) : null;

    // Footer Center (Timer)
    const footerCenter = (
        <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-none mb-0.5">
                Tiempo Total
            </span>
            <span className={`font-mono text-xs sm:text-sm font-bold leading-none tracking-tight ${
                activeRoute?.status === 'completada' ? 'text-gray-500' : 
                activeRoute?.started_at ? 'text-indigo-600' : 'text-gray-400'
            }`}>
                {elapsedTime}
            </span>
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
        <DriverLayout headerRight={headerRight} footerLeft={footerLeft} footerCenter={footerCenter}>
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
                                                    
                                                    {isDelivered && dispatch.dispatched_at && (
                                                        <div className="mt-2 text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-1 rounded inline-flex items-center gap-1">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            Entregado a las {new Date(dispatch.dispatched_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute:'2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {!isDelivered && (
                                                <div className="pl-14 flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => openClientInfoModal(dispatch.client)}
                                                        className="flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold flex items-center justify-center transition-transform active:scale-95 shadow-sm border border-gray-200"
                                                        title="Ver Detalles"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    {dispatch.client?.latitude && dispatch.client?.longitude && (
                                                        <a
                                                            href={`https://www.google.com/maps/dir/?api=1&destination=${dispatch.client.latitude},${dispatch.client.longitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center justify-center transition-transform active:scale-95 shadow-sm"
                                                            title="Navegar"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => openDispatchModal(dispatch)}
                                                        className="w-auto bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-sm"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
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

            {/* Modal de Información del Cliente */}
            <Modal show={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} maxWidth="md">
                <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Detalles del Cliente
                        </h3>
                        <button onClick={() => setIsInfoModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-full p-1 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-5">
                        <h4 className="font-bold text-xl text-gray-900 mb-1">{selectedClientInfo?.name || 'Cliente'}</h4>
                        <p className="text-sm text-gray-600 mb-4 flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {selectedClientInfo?.address || 'Sin dirección registrada'}
                        </p>
                        
                        <div className="w-full h-48 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                            {selectedClientInfo && <ClientMap client={selectedClientInfo} />}
                        </div>
                        
                        <div className="mt-5 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsInfoModalOpen(false)}
                                className="w-full sm:w-auto px-5 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none transition-colors shadow-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

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
