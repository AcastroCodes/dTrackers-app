import { useEffect, useRef, useState } from 'react';
import Modal from '@/Components/Modal';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with bundlers
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapPickerModal({ isOpen, onClose, onConfirm, initialLat, initialLng }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    const [coords, setCoords] = useState({
        lat: initialLat !== null && initialLat !== undefined ? parseFloat(initialLat) : null,
        lng: initialLng !== null && initialLng !== undefined ? parseFloat(initialLng) : null,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [locating, setLocating] = useState(false);

    // Default center: Maracay, Aragua, Venezuela
    const DEFAULT_CENTER = [10.2469, -67.5958];
    const DEFAULT_ZOOM = 14;

    useEffect(() => {
        if (!isOpen) return;

        // Small delay to allow modal DOM to render
        const timer = setTimeout(() => {
            if (mapInstanceRef.current) return; // already initialized

            const center = (initialLat && initialLng)
                ? [parseFloat(initialLat), parseFloat(initialLng)]
                : DEFAULT_CENTER;

            const map = L.map(mapRef.current).setView(center, DEFAULT_ZOOM);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(map);

            // Place initial marker if coords exist
            if (initialLat && initialLng) {
                markerRef.current = L.marker([parseFloat(initialLat), parseFloat(initialLng)])
                    .addTo(map)
                    .bindPopup('📍 Ubicación actual')
                    .openPopup();
                setCoords({ lat: parseFloat(initialLat), lng: parseFloat(initialLng) });
            }

            // Click to place / move marker
            map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                if (markerRef.current) {
                    markerRef.current.setLatLng([lat, lng]);
                } else {
                    markerRef.current = L.marker([lat, lng]).addTo(map);
                }
                markerRef.current.bindPopup(`📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();
                setCoords({ lat: parseFloat(lat.toFixed(8)), lng: parseFloat(lng.toFixed(8)) });
            });

            mapInstanceRef.current = map;
            
            // Force Leaflet to recalculate size in case it was initialized in a hidden state
            setTimeout(() => {
                map.invalidateSize();
            }, 50);
            
        }, 100);

        return () => clearTimeout(timer);
    }, [isOpen]);

    // Cleanup + reset locating state when modal closes
    useEffect(() => {
        if (!isOpen && mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            markerRef.current = null;
            setLocating(false);
        }
    }, [isOpen]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        setSearchError('');

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
                { headers: { 'Accept-Language': 'es' } }
            );
            const data = await response.json();

            if (data.length === 0) {
                setSearchError('Dirección no encontrada. Intenta con otro término.');
                setSearching(false);
                return;
            }

            const { lat, lon, display_name } = data[0];
            const numLat = parseFloat(lat);
            const numLng = parseFloat(lon);

            mapInstanceRef.current.setView([numLat, numLng], 16);

            if (markerRef.current) {
                markerRef.current.setLatLng([numLat, numLng]);
            } else {
                markerRef.current = L.marker([numLat, numLng]).addTo(mapInstanceRef.current);
            }
            markerRef.current.bindPopup(`📍 ${display_name}`).openPopup();
            setCoords({ lat: parseFloat(numLat.toFixed(8)), lng: parseFloat(numLng.toFixed(8)) });
        } catch {
            setSearchError('Error al buscar. Verifica tu conexión.');
        } finally {
            setSearching(false);
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            setSearchError('Tu navegador no soporta geolocalización. Usando Maracay por defecto.');
            fallbackToMaracay();
            return;
        }

        setLocating(true);
        setSearchError('');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const lat = parseFloat(latitude.toFixed(8));
                const lng = parseFloat(longitude.toFixed(8));

                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([lat, lng], 16);
                    if (markerRef.current) {
                        markerRef.current.setLatLng([lat, lng]);
                    } else {
                        markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
                    }
                    markerRef.current.bindPopup('📍 Mi ubicación actual').openPopup();
                }
                setCoords({ lat, lng });
                setLocating(false);
            },
            (error) => {
                console.error("Geolocalización fallida", error);
                setSearchError('No se pudo obtener la ubicación (GPS bloqueado o no disponible). Usando Maracay por defecto.');
                fallbackToMaracay();
                setLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    };

    const fallbackToMaracay = () => {
        const lat = 10.2469;
        const lng = -67.5958;
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 14);
            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            } else {
                markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
            }
            markerRef.current.bindPopup('📍 Maracay, Aragua (Por defecto)').openPopup();
        }
        setCoords({ lat, lng });
    };

    const handleConfirm = () => {
        if (coords.lat !== null && coords.lng !== null) {
            onConfirm(coords.lat, coords.lng);
            onClose();
        }
    };

    // We do not return early so Modal can handle its own enter/leave transitions, 
    // but since we rely on `isOpen` for map initialization, we just pass it to `show`.

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl" zIndex="z-[1060]">
            <div className="w-full bg-white dark:bg-[#1e293b] rounded-2xl overflow-hidden flex flex-col"
                style={{ maxHeight: '90vh' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-transparent">
                    <div className="flex items-center gap-3">
                        <div className="size-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Seleccionar Ubicación</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Haz clic en el mapa o busca una dirección</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search bar */}
                <form onSubmit={handleSearch} className="px-6 py-3 border-b border-gray-100 dark:border-slate-700/50 flex gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar dirección o ciudad..."
                        className="flex-1 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-[#0f172a] dark:text-white text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={searching}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2"
                    >
                        {searching ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        )}
                        Buscar
                    </button>
                    
                    <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={locating}
                        title="Centrar en mi ubicación"
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center shrink-0 border border-transparent dark:border-slate-600"
                    >
                        {locating ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 12h-3m-14 0H2m10-10v3m0 14v3" />
                            </svg>
                        )}
                    </button>
                </form>

                {searchError && (
                    <div className="mx-6 mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl text-xs text-red-600 dark:text-red-400">
                        {searchError}
                    </div>
                )}

                {/* Map */}
                <div className="relative" style={{ height: '300px', minHeight: '300px' }}>
                    {locating && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 gap-2">
                            <svg className="w-6 h-6 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span className="text-xs text-gray-500 dark:text-slate-400">Obteniendo tu ubicación…</span>
                        </div>
                    )}
                    <div ref={mapRef} className="w-full h-full" />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-transparent flex items-center justify-between gap-4">
                    {/* Coordinates preview */}
                    <div className="flex items-center gap-2">
                        {coords.lat !== null ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-mono text-green-700 dark:text-green-400">
                                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                                </span>
                            </div>
                        ) : (
                            <span className="text-xs text-gray-400 dark:text-slate-500 italic">
                                Haz clic en el mapa para seleccionar
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={coords.lat === null}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                        >
                            Confirmar Ubicación
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
