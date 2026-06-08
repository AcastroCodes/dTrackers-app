import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Modal from '@/Components/Modal';
import MapPickerModal from '@/Components/MapPickerModal';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

const inputClass =
    'mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-[#0f172a] dark:text-white focus:border-indigo-500 focus:ring-indigo-500 shadow-sm transition-all text-sm py-2';

export default function Edit({ companies, clients, trucks, drivers, isSuperAdmin, defaultCompanyId, route: routeData, initialDispatches }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const routeLayerRef = useRef(null);
    const markersRef = useRef([]);

    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [expandedDispatches, setExpandedDispatches] = useState([]);
    
    const toggleDispatch = (id) => {
        setExpandedDispatches(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Modal State
    const [selectedClientId, setSelectedClientId] = useState('');
    const [modalProducts, setModalProducts] = useState([{ product_name: '', quantity: 1 }]);

    // Inline Client Creation State
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [clientSaveError, setClientSaveError] = useState('');
    const [clientSaving, setClientSaving] = useState(false);
    const [newClientData, setNewClientData] = useState({
        name: '', address: '', reference: '', latitude: null, longitude: null
    });

    // OSMR Totals
    const [routeStats, setRouteStats] = useState({ distance: 0, time: 0 });

    const { data, setData, put, processing, errors } = useForm({
        company_id: routeData.company_id || '',
        truck_id: routeData.truck_id || '',
        user_id: routeData.user_id || '',
        date: routeData.date || '',
        dispatches: initialDispatches || [],
        total_distance_km: routeData.total_distance_km || 0,
        estimated_time_mins: routeData.estimated_time_mins || 0,
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('routes.update', routeData.id));
    };

    const [isOptimizing, setIsOptimizing] = useState(false);

    const optimizeRoute = async () => {
        if (!hqCoords || data.dispatches.length < 2) return;
        
        setIsOptimizing(true);
        
        const points = [];
        points.push([hqCoords.lng, hqCoords.lat]);
        data.dispatches.forEach(d => {
            points.push([d.client_lng, d.client_lat]);
        });
        
        const coordsStr = points.map(p => `${p[0]},${p[1]}`).join(';');
        
        try {
            const res = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coordsStr}?source=first&roundtrip=true`);
            const tripData = await res.json();
            
            if (tripData.code === 'Ok' && tripData.waypoints) {
                const sortedDispatches = [...data.dispatches].map((dispatch, index) => {
                    const waypointInfo = tripData.waypoints[index + 1];
                    return {
                        dispatch,
                        orderIndex: waypointInfo.waypoint_index
                    };
                })
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map(item => item.dispatch);
                
                setData('dispatches', sortedDispatches);
            }
        } catch (err) {
            console.error("OSRM Trip Error:", err);
            alert("Hubo un error al conectar con el optimizador de rutas.");
        } finally {
            setIsOptimizing(false);
        }
    };

    const [extraClients, setExtraClients] = useState([]);
    const allClients = [...clients, ...extraClients];

    const selectedCompany = companies.find(c => c.id == data.company_id);
    const companyDisplayName = selectedCompany ? selectedCompany.name : 'Sede de la Empresa';

    // Filter dependent dropdowns based on selected company (for SuperAdmin)
    const filteredClients = isSuperAdmin && data.company_id 
        ? allClients.filter(c => c.company_id == data.company_id) 
        : allClients;
    
    const filteredTrucks = isSuperAdmin && data.company_id 
        ? trucks.filter(t => t.company_id == data.company_id) 
        : trucks;

    const filteredDrivers = isSuperAdmin && data.company_id 
        ? drivers.filter(d => d.company_id == data.company_id) 
        : drivers;

    const hqCoords = (selectedCompany && selectedCompany.latitude && selectedCompany.longitude)
        ? { lat: selectedCompany.latitude, lng: selectedCompany.longitude }
        : null;

    // --- Modal Configs ---
    const addProductRow = () => setModalProducts([...modalProducts, { product_name: '', quantity: 1 }]);
    
    const updateProductRow = (index, field, value) => {
        const updated = [...modalProducts];
        updated[index][field] = value;
        setModalProducts(updated);
    };

    const removeProductRow = (index) => {
        const updated = [...modalProducts];
        updated.splice(index, 1);
        setModalProducts(updated);
    };

    const handleSaveDispatch = () => {
        if (!selectedClientId) return;
        
        const clientObj = filteredClients.find(c => c.id == selectedClientId);
        
        if (!clientObj) {
            console.warn("clientObj no encontrado localmente aún", selectedClientId);
            return;
        }
        
        const newDispatch = {
            id: Date.now(), // temp ID for React keys
            client_id: selectedClientId,
            client_name: clientObj.name,
            client_lat: parseFloat(clientObj.latitude),
            client_lng: parseFloat(clientObj.longitude),
            products: modalProducts.filter(p => p.product_name.trim() !== '' && p.quantity > 0)
        };

        const updatedDispatches = [...data.dispatches, newDispatch];
        setData('dispatches', updatedDispatches);

        // Reset and close
        setSelectedClientId('');
        setModalProducts([{ product_name: '', quantity: 1 }]);
        setIsCreatingClient(false);
        setIsDispatchModalOpen(false);
    };

    const handleSaveNewClient = async () => {
        if (!newClientData.name || !newClientData.latitude || !newClientData.longitude) {
            setClientSaveError('El nombre y la ubicación GPS son obligatorios.');
            return;
        }

        if (isSuperAdmin && !data.company_id) {
            setClientSaveError('Debe seleccionar una Empresa primero antes de crear un cliente.');
            return;
        }
        
        setClientSaving(true);
        setClientSaveError('');

        try {
            const res = await axios.post(route('clients.store'), {
                ...newClientData,
                company_id: data.company_id
            }, {
                headers: { 'Accept': 'application/json' }
            });
            
            const client = res.data.client;
            
            // Bypass router.reload and directly push the new client into our local list
            setExtraClients(prev => [...prev, client]);
            setSelectedClientId(client.id);
            setIsClientModalOpen(false);
            setNewClientData({ name: '', address: '', reference: '', latitude: null, longitude: null });
            setClientSaving(false);
        } catch (e) {
            console.error(e);
            let msg = 'Error al guardar el cliente. Verifique los datos o permisos.';
            if (e.response?.data?.message) {
                msg = e.response.data.message;
            } else if (e.response?.data?.errors) {
                msg = Object.values(e.response.data.errors).flat().join(', ');
            }
            setClientSaveError(msg);
            setClientSaving(false);
        }
    };

    const removeDispatch = (index) => {
        const updated = [...data.dispatches];
        updated.splice(index, 1);
        setData('dispatches', updated);
    };

    const moveDispatch = (index, dir) => {
        if (dir === -1 && index === 0) return;
        if (dir === 1 && index === data.dispatches.length - 1) return;
        
        const updated = [...data.dispatches];
        const temp = updated[index];
        updated[index] = updated[index + dir];
        updated[index + dir] = temp;
        setData('dispatches', updated);
    };

    // --- Map & Routing Logic ---
    useEffect(() => {
        // Initialize Map once
        if (!mapInstanceRef.current && mapRef.current) {
            const map = L.map(mapRef.current).setView([8.9936, -79.5197], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);
            mapInstanceRef.current = map;
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Draw route whenever dispatches or HQ changes
    useEffect(() => {
        drawRoute();
    }, [data.dispatches, data.company_id]);

    const drawRoute = async () => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        // Clean previous layers
        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];
        setRouteStats({ distance: 0, time: 0 });
        setData(prev => ({ ...prev, total_distance_km: 0, estimated_time_mins: 0 }));

        // Gather points
        const points = [];
        
        if (hqCoords) {
            points.push([hqCoords.lng, hqCoords.lat]); // OSRM requires lng, lat
            
            // HQ Marker
            const hqMarker = L.marker([hqCoords.lat, hqCoords.lng], {
                icon: L.divIcon({ 
                    className: '', // Removes Leaflet's default white box
                    iconSize: null, // Allows div to grow automatically based on text width
                    html: `<div class="px-2.5 py-1 bg-indigo-600 rounded-md shadow-md border-2 border-white inline-flex items-center justify-center text-white text-xs font-bold whitespace-nowrap drop-shadow-lg"><svg class="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>${companyDisplayName}</div>` 
                })
            }).bindPopup('Sede Principal').addTo(map);
            markersRef.current.push(hqMarker);
        }

        data.dispatches.forEach((d, idx) => {
            if (d.client_lat && d.client_lng) {
                points.push([d.client_lng, d.client_lat]);
                
                const clientMarker = L.marker([d.client_lat, d.client_lng], {
                    icon: L.divIcon({ 
                        className: '', 
                        iconSize: null,
                        html: `<div class="size-6 bg-amber-500 rounded-full border-2 border-white shadow flex items-center justify-center text-white text-xs font-bold">${idx + 1}</div>` 
                    })
                }).bindPopup(`<b>${idx + 1}.</b> ${d.client_name}`).bindTooltip(d.client_name, { direction: 'top', offset: [0, -10] }).addTo(map);
                markersRef.current.push(clientMarker);
            }
        });

        // Add return trip to HQ (Llegada) if we have dispatches
        if (hqCoords && data.dispatches.length > 0) {
            points.push([hqCoords.lng, hqCoords.lat]);
        }

        // Need at least HQ and 1 client (or 2 clients) to route
        if (points.length < 2) {
            if (points.length === 1) {
                map.setView([points[0][1], points[0][0]], 13);
            } else if (hqCoords) {
                map.setView([hqCoords.lat, hqCoords.lng], 13);
            }
            return;
        }

        // Fetch OSRM
        const coordsStr = points.map(p => `${p[0]},${p[1]}`).join(';');
        try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`);
            const routeData = await res.json();

            if (routeData.code === 'Ok') {
                const routeInfo = routeData.routes[0];
                const distanceKm = (routeInfo.distance / 1000).toFixed(2);
                const timeMins = Math.round(routeInfo.duration / 60);
                
                setRouteStats({ distance: distanceKm, time: timeMins });
                
                // Directly set the form data without causing infinite re-renders by using the previous state precisely
                // We'll update the form data cautiously to avoid firing the effect too much
                // Because drawRoute only relies on dispatches and company_id, setting these shouldn't trigger it again 
                // UNLESS total_distance is in the dependency array (which it is not).
                setData(prev => {
                    if (prev.total_distance_km == distanceKm) return prev;
                    return { ...prev, total_distance_km: distanceKm, estimated_time_mins: timeMins };
                });

                const geojson = L.geoJSON(routeInfo.geometry, {
                    style: { color: '#4f46e5', weight: 4, opacity: 0.8, dashArray: '8, 8' }
                }).addTo(map);
                routeLayerRef.current = geojson;

                map.fitBounds(geojson.getBounds(), { padding: [50, 50] });
            }
        } catch (err) {
            console.error("OSRM Error:", err);
        }
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-2xl font-bold text-gray-800 dark:text-white">Editar Ruta</h2>}>
            <Head title="Editar Ruta" />

            <form onSubmit={submit} className="max-w-7xl mx-auto space-y-6 pb-20">
                
                {/* ── SECCION SUPERIOR (Configuración Base) ── */}
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            Ruta
                        </h3>
                        <div className="flex items-center gap-4">
                            {isSuperAdmin && (
                                <div className="flex items-center gap-2">
                                    <InputLabel htmlFor="company_id" value="Empresa:" className="dark:text-slate-300 text-xs m-0" />
                                    <select
                                        id="company_id"
                                        name="company_id"
                                        value={data.company_id}
                                        className="!mt-0 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-[#0f172a] dark:text-white focus:border-indigo-500 focus:ring-indigo-500 shadow-sm transition-all text-sm py-1.5"
                                        style={{ width: '220px' }}
                                        onChange={(e) => {
                                            setData((prev) => ({ ...prev, company_id: e.target.value, truck_id: '', user_id: '', dispatches: [] }));
                                        }}
                                        required
                                    >
                                        <option value="">Seleccione una Empresa</option>
                                        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <InputLabel htmlFor="date" value="Fecha:" className="dark:text-slate-300 text-xs m-0" />
                                <TextInput
                                    id="date"
                                    type="date"
                                    value={data.date}
                                    className="!mt-0 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-[#0f172a] dark:text-white focus:border-indigo-500 focus:ring-indigo-500 shadow-sm transition-all text-sm py-1.5"
                                    style={{ width: '140px' }}
                                    onChange={(e) => setData('date', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="truck_id" value="Camión" className="dark:text-slate-300 text-xs" />
                            <select
                                id="truck_id"
                                value={data.truck_id}
                                className={inputClass}
                                onChange={(e) => setData('truck_id', e.target.value)}
                                required
                                disabled={isSuperAdmin && !data.company_id}
                            >
                                <option value="">Seleccionar...</option>
                                {filteredTrucks.map(t => <option key={t.id} value={t.id}>{t.license_plate}</option>)}
                            </select>
                            <InputError message={errors.truck_id} />
                        </div>

                        <div>
                            <InputLabel htmlFor="user_id" value="Chofer" className="dark:text-slate-300 text-xs" />
                            <select
                                id="user_id"
                                value={data.user_id}
                                className={inputClass}
                                onChange={(e) => setData('user_id', e.target.value)}
                                required
                                disabled={isSuperAdmin && !data.company_id}
                            >
                                <option value="">Seleccionar Chofer...</option>
                                {filteredDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <InputError message={errors.user_id} />
                        </div>
                    </div>
                </div>

                {/* ── SECCION INFERIOR (Mapa y Puntos) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] min-h-[500px]">
                    
                    {/* COLUMNA IZQUIERDA (Lista) */}
                    <div className="lg:col-span-5 space-y-6 flex flex-col h-full">
                    


                    {/* Guías de Despacho */}
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col flex-1 overflow-hidden min-h-[300px]">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-transparent shrink-0">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                Puntos de Despacho
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsDispatchModalOpen(true)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                + Agregar
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-gray-50/30 dark:bg-slate-900/10">
                            
                            {/* Salida (Empresa) */}
                            {data.dispatches.length > 0 && (
                                <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl">
                                    <div className="size-6 rounded-full bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shadow-sm">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Salida</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{companyDisplayName}</p>
                                    </div>
                                </div>
                            )}

                            {data.dispatches.map((dispatch, idx) => (
                                <div key={dispatch.id} className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm group">
                                    <div 
                                        className={`flex items-center justify-between ${dispatch.products.length > 0 ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg -mx-2 px-2 py-1 transition-colors' : ''}`}
                                        onClick={() => dispatch.products.length > 0 && toggleDispatch(dispatch.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {dispatch.products.length > 0 ? (
                                                <button type="button" className="p-1 text-gray-400 hover:text-indigo-600 transition-colors">
                                                    <svg className={`w-4 h-4 transform transition-transform ${expandedDispatches.includes(dispatch.id) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <div className="w-6"></div> // spacer
                                            )}
                                            
                                            <div className="size-6 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shadow-inner">
                                                {idx + 1}
                                            </div>
                                            <span className="font-semibold text-sm text-gray-900 dark:text-white">{dispatch.client_name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                type="button" 
                                                onClick={() => moveDispatch(idx, -1)} 
                                                disabled={idx === 0} 
                                                title="Subir"
                                                className="p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 disabled:opacity-30 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => moveDispatch(idx, 1)} 
                                                disabled={idx === data.dispatches.length - 1} 
                                                title="Bajar"
                                                className="p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 disabled:opacity-30 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => removeDispatch(idx)} 
                                                title="Eliminar"
                                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {expandedDispatches.includes(dispatch.id) && dispatch.products.length > 0 && (
                                        <div className="mt-3 pl-12">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Guía de Despacho</h4>
                                            <ul className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                                                {dispatch.products.map((p, pIdx) => (
                                                    <li key={pIdx} className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                                                        <span className="font-medium text-gray-600 dark:text-slate-300">{p.quantity}x</span> {p.product_name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Llegada (Empresa) */}
                            {data.dispatches.length > 0 && (
                                <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl mt-2">
                                    <div className="size-6 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-sm">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Llegada</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{companyDisplayName}</p>
                                    </div>
                                </div>
                            )}

                            {data.dispatches.length === 0 && (
                                <div className="text-center py-10">
                                    <svg className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    <p className="text-sm text-gray-400 dark:text-slate-500">No hay despachos agregados. Añade el primer cliente.</p>
                                </div>
                            )}
                            <InputError message={errors.dispatches} />
                        </div>
                        
                        {/* Summary */}
                        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700/50 bg-indigo-50/50 dark:bg-indigo-900/10 shrink-0">
                            <div className="flex items-center justify-between text-xs font-medium text-indigo-800 dark:text-indigo-300">
                                <span>Distancia Est: {routeStats.distance} km</span>
                                <span>Tiempo Est: {Math.floor(routeStats.time / 60)}h {routeStats.time % 60}m</span>
                            </div>
                        </div>

                    </div>

                    <div className="flex gap-3">
                        {data.dispatches.length >= 2 && (
                            <button
                                type="button"
                                onClick={optimizeRoute}
                                disabled={isOptimizing || processing}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-xl text-sm shadow-xl shadow-amber-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isOptimizing ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Calculando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Optimizar
                                    </>
                                )}
                            </button>
                        )}
                        <PrimaryButton className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-2 rounded-xl justify-center text-sm shadow-xl shadow-indigo-500/20 transition-colors flex items-center justify-center gap-2" disabled={processing || data.dispatches.length === 0}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                            Actualizar Ruta
                        </PrimaryButton>
                    </div>
                    
                </div>

                {/* ── COLUMNA DERECHA (Mapa) ── */}
                <div className="lg:col-span-7 bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden relative h-full">
                    <div className="absolute top-0 inset-x-0 z-10 px-4 py-3 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
                        <span className="text-sm font-semibold text-white drop-shadow-md flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                            Trazado Interactivo
                        </span>
                    </div>


                    <div ref={mapRef} className="w-full h-full z-0" style={{ isolation: 'isolate' }}></div>
                </div>
                </div>
            </form>

            {/* Modal de Agregar Despacho */}
            <Modal show={isDispatchModalOpen} onClose={() => setIsDispatchModalOpen(false)} maxWidth="md">
                <div className="overflow-hidden bg-white dark:bg-[#1e293b] rounded-2xl">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-transparent flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Parada</h3>
                        <button
                            type="button"
                            onClick={() => setIsClientModalOpen(true)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            + Crear Cliente
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div>
                            <InputLabel value="Cliente a Visitar" className="dark:text-slate-300 text-xs font-bold mb-2 uppercase tracking-wider text-indigo-500" />
                            
                            <div className="space-y-3 p-4 bg-gray-50/50 dark:bg-slate-800/20 rounded-xl border border-gray-100 dark:border-slate-700/50">
                                <select
                                    id="modal_client"
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                    className={`${inputClass} w-full m-0`}
                                    style={{ marginTop: 0 }}
                                >
                                    <option value="">Buscar cliente guardado...</option>
                                    {filteredClients.map(c => (
                                        <option key={c.id} value={c.id} disabled={!c.latitude}>
                                            {c.name} {!c.latitude && '(Sin GPS)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="border border-gray-200 dark:border-slate-700/60 rounded-xl overflow-hidden flex flex-col">
                            <div className="bg-gray-50/80 dark:bg-slate-800/40 px-4 py-2 border-b border-gray-200 dark:border-slate-700/60 flex items-center justify-between shrink-0">
                                <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">Productos a Despachar</span>
                                <button type="button" onClick={addProductRow} className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">+ Fila</button>
                            </div>
                            <div className="p-3 space-y-2 max-h-[180px] overflow-y-auto flex-1">
                                {modalProducts.map((p, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Descripción..."
                                                value={p.product_name}
                                                onChange={e => updateProductRow(idx, 'product_name', e.target.value)}
                                                className="w-full text-xs rounded-lg border-gray-200 dark:border-slate-700 dark:bg-[#0f172a] dark:text-white focus:border-indigo-500 py-1.5"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <input
                                                type="number"
                                                min="1"
                                                value={p.quantity}
                                                onChange={e => updateProductRow(idx, 'quantity', parseInt(e.target.value))}
                                                className="w-full text-xs rounded-lg border-gray-200 dark:border-slate-700 dark:bg-[#0f172a] dark:text-white focus:border-indigo-500 py-1.5 text-center"
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeProductRow(idx)} disabled={modalProducts.length === 1} className="w-8 flex items-center justify-center text-red-400 hover:text-red-500 disabled:opacity-30">
                                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-transparent flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsDispatchModalOpen(false)}
                            className="px-4 py-2 text-sm text-gray-600 dark:text-slate-400 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <PrimaryButton 
                            type="button"
                            onClick={handleSaveDispatch} 
                            disabled={!selectedClientId}
                            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                        >
                            Agregar a Ruta
                        </PrimaryButton>
                    </div>
                </div>

                {/* Modal de Agregar Cliente */}
                <Modal show={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} maxWidth="md">
                    <div className="overflow-hidden bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-transparent">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Registrar Nuevo Cliente</h3>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div>
                                <InputLabel value="Nombre del Cliente *" />
                                <TextInput
                                    type="text"
                                    className="mt-1 block w-full text-sm"
                                    value={newClientData.name}
                                    onChange={e => setNewClientData({...newClientData, name: e.target.value})}
                                    required
                                />
                            </div>

                            <div>
                                <InputLabel value="Ubicación GPS *" />
                                <div className="mt-1 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsMapPickerOpen(true)}
                                        className="flex-1 flex justify-center items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-[#1e293b] hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                                    >
                                        <svg className={`w-5 h-5 ${newClientData.latitude ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {newClientData.latitude ? 'Modificar Ubicación' : 'Fijar en el Mapa'}
                                    </button>
                                </div>
                                {newClientData.latitude && (
                                    <p className="mt-2 text-xs text-green-600 dark:text-green-400 font-mono flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        {parseFloat(newClientData.latitude).toFixed(6)}, {parseFloat(newClientData.longitude).toFixed(6)}
                                    </p>
                                )}
                            </div>

                            {clientSaveError && <p className="text-xs text-red-500">{clientSaveError}</p>}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-transparent flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsClientModalOpen(false)}
                                className="px-4 py-2 text-sm text-gray-600 dark:text-slate-400 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <PrimaryButton 
                                type="button"
                                onClick={handleSaveNewClient} 
                                disabled={clientSaving || !newClientData.name || !newClientData.latitude}
                                className="bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-gray-100 dark:text-slate-900 rounded-xl disabled:opacity-50"
                            >
                                {clientSaving ? 'Guardando...' : 'Guardar Cliente'}
                            </PrimaryButton>
                        </div>
                    </div>

                    {/* Map Picker Modal for Client Creation - Nested so it doesn't close parent */}
                    <MapPickerModal
                        isOpen={isMapPickerOpen}
                        onClose={() => setIsMapPickerOpen(false)}
                        onConfirm={(lat, lng) => {
                            setNewClientData({ ...newClientData, latitude: lat, longitude: lng });
                        }}
                        initialLat={newClientData.latitude || (hqCoords ? hqCoords.lat : null)}
                        initialLng={newClientData.longitude || (hqCoords ? hqCoords.lng : null)}
                    />
                </Modal>
            </Modal>
        </AuthenticatedLayout>
    );
}
