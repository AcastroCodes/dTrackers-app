import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapViewer({ lat, lng }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!mapInstanceRef.current && mapRef.current) {
                const center = [parseFloat(lat), parseFloat(lng)];
                const map = L.map(mapRef.current).setView(center, 15);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap'
                }).addTo(map);

                markerRef.current = L.marker(center).addTo(map);
                
                mapInstanceRef.current = map;
                
                setTimeout(() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.invalidateSize();
                    }
                }, 100);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [lat, lng]);

    return <div ref={mapRef} style={{ width: '100%', height: '300px', borderRadius: '8px', zIndex: 1 }} />;
}

function MapPicker({ lat, lng, onLocationSelect, onAddressFound }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const [mapError, setMapError] = useState(null);

    const reverseGeocode = async (lat, lon, map) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
            const data = await res.json();
            if (data && data.display_name) {
                if (markerRef.current) {
                    markerRef.current.bindPopup(`📍 ${data.display_name}`).openPopup();
                }
                if (onAddressFound) {
                    onAddressFound(data.display_name);
                }
            } else {
                if (markerRef.current) {
                    markerRef.current.bindPopup('📍 Ubicación seleccionada').openPopup();
                }
            }
        } catch (error) {
            console.warn("Error reverse geocoding:", error);
            if (markerRef.current) {
                markerRef.current.bindPopup('📍 Ubicación seleccionada').openPopup();
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!mapInstanceRef.current && mapRef.current) {
                let initialCenter = [10.2469, -67.5958]; // Maracay, Venezuela
                let hasInitialCoords = false;

                if (lat && lng) {
                    initialCenter = [parseFloat(lat), parseFloat(lng)];
                    hasInitialCoords = true;
                }

                const map = L.map(mapRef.current).setView(initialCenter, 13);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap'
                }).addTo(map);

                if (hasInitialCoords) {
                    markerRef.current = L.marker(initialCenter).addTo(map);
                    reverseGeocode(initialCenter[0], initialCenter[1], map);
                } else {
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                setMapError(null);
                                const newLat = position.coords.latitude;
                                const newLng = position.coords.longitude;
                                const userCenter = [newLat, newLng];
                                
                                map.setView(userCenter, 15);
                                if (markerRef.current) {
                                    markerRef.current.setLatLng(userCenter);
                                } else {
                                    markerRef.current = L.marker(userCenter).addTo(map);
                                }
                                onLocationSelect(newLat, newLng);
                                reverseGeocode(newLat, newLng, map);
                            },
                            (error) => {
                                console.warn("No se pudo obtener la geolocalización:", error);
                                setMapError("No se pudo detectar tu ubicación. Se está mostrando Maracay por defecto.");
                            },
                            { timeout: 10000 }
                        );
                    } else {
                        setMapError("Tu navegador no soporta geolocalización.");
                    }
                }

                map.on('click', (e) => {
                    const { lat: newLat, lng: newLng } = e.latlng;
                    if (markerRef.current) {
                        markerRef.current.setLatLng([newLat, newLng]);
                    } else {
                        markerRef.current = L.marker([newLat, newLng]).addTo(map);
                    }
                    onLocationSelect(newLat, newLng);
                    reverseGeocode(newLat, newLng, map);
                });

                mapInstanceRef.current = map;
                
                setTimeout(() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.invalidateSize();
                    }
                }, 100);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, []);

    const centerToGPS = (e) => {
        e.preventDefault();
        setMapError(null);
        if (navigator.geolocation && mapInstanceRef.current) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLat = position.coords.latitude;
                    const newLng = position.coords.longitude;
                    const userCenter = [newLat, newLng];
                    
                    mapInstanceRef.current.setView(userCenter, 16);
                    if (markerRef.current) {
                        markerRef.current.setLatLng(userCenter);
                    } else {
                        markerRef.current = L.marker(userCenter).addTo(mapInstanceRef.current);
                    }
                    onLocationSelect(newLat, newLng);
                    reverseGeocode(newLat, newLng, mapInstanceRef.current);
                },
                (error) => {
                    setMapError("No se pudo obtener la ubicación. Por favor, revisa los permisos de tu navegador.");
                },
                { timeout: 10000 }
            );
        } else {
            setMapError("Tu navegador no soporta geolocalización.");
        }
    };

    return (
        <div className="relative" style={{ width: '100%' }}>
            {mapError && (
                <div className="alert alert-warning p-2 mb-2" style={{ fontSize: '12px' }}>
                    <i className="nc-icon nc-bell-55 mr-1"></i> {mapError}
                </div>
            )}
            <div className="relative" style={{ width: '100%', height: '250px' }}>
                <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '8px', zIndex: 1 }} />
                
                <button 
                    type="button"
                    onClick={centerToGPS}
                    className="btn btn-sm btn-info btn-icon btn-round shadow"
                    style={{ 
                        position: 'absolute', 
                        bottom: '15px', 
                        right: '15px', 
                        zIndex: 400
                    }}
                    title="Centrar en mi ubicación actual"
                >
                    <i className="fa fa-crosshairs" style={{ fontSize: '14px' }}></i>
                </button>
            </div>
        </div>
    );
}

export default function Index({ clients, companies, isSuperAdmin }) {
    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        company_id: '',
        name: '',
        address: '',
        reference: '',
        latitude: '',
        longitude: '',
    });

    const [modalMode, setModalMode] = useState(null); // 'create' or 'edit'
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [selectedGpsClient, setSelectedGpsClient] = useState(null);

    const openClientModal = (mode, client = null) => {
        clearErrors();
        setModalMode(mode);
        if (mode === 'edit' && client) {
            setSelectedClientId(client.id);
            setData({
                company_id: client.company_id || '',
                name: client.name || '',
                address: client.address || '',
                reference: client.reference || '',
                latitude: client.latitude || '',
                longitude: client.longitude || '',
            });
        } else {
            setSelectedClientId(null);
            reset();
            // Default company logic could be added here if needed for single-company admins
        }
        window.$('#clientModal').modal('show');
    };

    const closeClientModal = () => {
        window.$('#clientModal').modal('hide');
        setModalMode(null);
        reset();
        clearErrors();
    };

    const submitForm = (e) => {
        e.preventDefault();
        if (modalMode === 'create') {
            post(route('clients.store'), {
                onSuccess: () => closeClientModal(),
            });
        } else {
            put(route('clients.update', selectedClientId), {
                onSuccess: () => closeClientModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
            destroy(route('clients.destroy', id));
        }
    };

    const openGpsModal = (client) => {
        setSelectedGpsClient(client);
        window.$('#gpsModal').modal('show');
    };

    const closeGpsModal = () => {
        window.$('#gpsModal').modal('hide');
        setSelectedGpsClient(null);
    };

    const handleLocationSelect = useCallback((lat, lng) => {
        setData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    }, []);

    const hasLocation = data.latitude && data.longitude;

    return (
        <AuthenticatedLayout header="Gestión de Clientes">
            <Head title="Clientes" />

            <div className="row">
                <div className="col-md-12">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <div>
                                <h4 className="card-title">Listado de Clientes</h4>
                                <p className="card-category">Administra los clientes asociados a la empresa.</p>
                            </div>
                            <button 
                                className="btn btn-primary btn-round"
                                onClick={() => openClientModal('create')}
                            >
                                <i className="nc-icon nc-simple-add"></i> Registrar Cliente
                            </button>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table">
                                    <thead className="text-primary">
                                        <tr>
                                            <th>Cliente</th>
                                            <th>Dirección</th>
                                            <th>Empresa</th>
                                            <th className="text-center">GPS</th>
                                            <th className="text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.map((client) => (
                                            <tr key={client.id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="avatar mr-2" style={{width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#f4f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#66615B'}}>
                                                            {client.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        {client.name}
                                                    </div>
                                                </td>
                                                <td style={{ maxWidth: '250px' }}>
                                                    {client.address || '-'}
                                                </td>
                                                <td>
                                                    {client.company ? client.company.name : 'N/A'}
                                                </td>
                                                <td className="text-center">
                                                    {(client.latitude && client.longitude) ? (
                                                        <button 
                                                            className="btn btn-sm btn-success btn-icon btn-round"
                                                            title="Ver GPS"
                                                            onClick={() => openGpsModal(client)}
                                                        >
                                                            <i className="fa fa-map-marker"></i>
                                                        </button>
                                                    ) : (
                                                        <span className="text-muted small">-</span>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    <button 
                                                        className="btn btn-sm btn-info btn-icon btn-round"
                                                        title="Editar Cliente"
                                                        onClick={() => openClientModal('edit', client)}
                                                        style={{marginRight: '5px'}}
                                                    >
                                                        <i className="fa fa-edit"></i>
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm btn-danger btn-icon btn-round"
                                                        title="Eliminar Cliente"
                                                        onClick={() => handleDelete(client.id)}
                                                    >
                                                        <i className="fa fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {clients.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="text-center py-4 text-muted">
                                                    No se encontraron clientes registrados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bootstrap Modal for Add/Edit Client */}
            <div className="modal fade" id="clientModal" tabIndex="-1" role="dialog" aria-labelledby="clientModalLabel" aria-hidden="true" data-backdrop="static">
                <div className="modal-dialog modal-lg" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="clientModalLabel">
                                {modalMode === 'create' ? 'Crear Nuevo Cliente' : 'Editar Cliente'}
                            </h5>
                            <button type="button" className="close" aria-label="Close" onClick={closeClientModal}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={submitForm}>
                            <div className="modal-body">
                                <div className="row">
                                    {/* Izquierda: Info del Cliente */}
                                    <div className="col-md-6 border-right">
                                        <h6 className="text-muted mb-3">Información General</h6>
                                        
                                        {isSuperAdmin && (
                                            <div className="form-group">
                                                <label>Empresa</label>
                                                <select 
                                                    className={`form-control ${errors.company_id ? 'is-invalid' : ''}`}
                                                    value={data.company_id}
                                                    onChange={e => setData('company_id', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Seleccione una empresa</option>
                                                    {companies.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                                {errors.company_id && <div className="invalid-feedback">{errors.company_id}</div>}
                                            </div>
                                        )}

                                        <div className="form-group">
                                            <label>Nombre del Cliente</label>
                                            <input 
                                                type="text" 
                                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                                value={data.name} 
                                                onChange={e => setData('name', e.target.value)} 
                                                required
                                            />
                                            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label>Dirección</label>
                                            <input 
                                                type="text" 
                                                className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                                                value={data.address} 
                                                onChange={e => setData('address', e.target.value)} 
                                            />
                                            {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label>Referencia</label>
                                            <textarea 
                                                className={`form-control ${errors.reference ? 'is-invalid' : ''}`}
                                                value={data.reference} 
                                                onChange={e => setData('reference', e.target.value)} 
                                                rows="2"
                                            ></textarea>
                                            {errors.reference && <div className="invalid-feedback">{errors.reference}</div>}
                                        </div>
                                    </div>

                                    {/* Derecha: GPS */}
                                    <div className="col-md-6">
                                        <h6 className="text-muted mb-2">Ubicación GPS</h6>
                                        <p className="text-xs text-muted mb-2">Haz clic en el mapa o usa el botón de la mirilla para actualizar las coordenadas del cliente.</p>

                                        {modalMode && (
                                            <MapPicker 
                                                lat={data.latitude} 
                                                lng={data.longitude} 
                                                onLocationSelect={handleLocationSelect} 
                                                onAddressFound={(address) => {
                                                    if (!data.address || data.address.trim() === '') {
                                                        setData('address', address);
                                                    }
                                                }}
                                            />
                                        )}

                                        <div className="mt-2">
                                            {hasLocation ? (
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <small className="text-success font-weight-bold">
                                                        Lat: {parseFloat(data.latitude).toFixed(5)}, Lng: {parseFloat(data.longitude).toFixed(5)}
                                                    </small>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-sm btn-link text-danger p-0 m-0"
                                                        onClick={() => { setData('latitude', ''); setData('longitude', ''); }}
                                                    >
                                                        Quitar
                                                    </button>
                                                </div>
                                            ) : (
                                                <small className="text-warning">Ubicación no establecida</small>
                                            )}
                                            {errors.latitude && <div className="text-danger small">{errors.latitude}</div>}
                                            {errors.longitude && <div className="text-danger small">{errors.longitude}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary btn-round" onClick={closeClientModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary btn-round" disabled={processing}>
                                    {processing ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Bootstrap Modal for viewing GPS */}
            <div className="modal fade" id="gpsModal" tabIndex="-1" role="dialog" aria-labelledby="gpsModalLabel" aria-hidden="true" data-backdrop="static">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="gpsModalLabel">
                                Ubicación de Cliente: {selectedGpsClient?.name}
                            </h5>
                            <button type="button" className="close" aria-label="Close" onClick={closeGpsModal}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body p-0">
                            {selectedGpsClient && selectedGpsClient.latitude && selectedGpsClient.longitude && (
                                <MapViewer lat={selectedGpsClient.latitude} lng={selectedGpsClient.longitude} />
                            )}
                            <div className="p-3 bg-light border-top">
                                <strong><i className="nc-icon nc-pin-3 mr-1"></i> Dirección guardada:</strong><br/>
                                {selectedGpsClient?.address ? selectedGpsClient.address : <span className="text-muted">No se ha registrado dirección en texto.</span>}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary btn-round" onClick={closeGpsModal}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
        </AuthenticatedLayout>
    );
}
