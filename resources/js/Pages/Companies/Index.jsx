import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
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
                
                {/* Botón flotante para re-centrar el GPS */}
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

export default function Index({ companies }) {
    const [modalMode, setModalMode] = useState(null); // 'create' or 'edit'
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    const { data, setData, post, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        name: '',
        tax_id: '',
        address: '',
        phone: '',
        latitude: '',
        longitude: '',
        logo: null,
    });

    const openModal = (mode, company = null) => {
        clearErrors();
        setModalMode(mode);
        if (mode === 'edit' && company) {
            setSelectedCompanyId(company.id);
            if (company.logo) {
                setLogoPreview(`/storage/${company.logo}`);
            } else {
                setLogoPreview(null);
            }
            setData({
                name: company.name,
                tax_id: company.tax_id,
                address: company.address || '',
                phone: company.phone || '',
                latitude: company.latitude || '',
                longitude: company.longitude || '',
                logo: null,
            });
        } else {
            setSelectedCompanyId(null);
            setLogoPreview(null);
            reset();
        }
        window.$('#companyModal').modal('show');
    };

    const closeModal = () => {
        window.$('#companyModal').modal('hide');
        setModalMode(null);
        setLogoPreview(null);
        reset();
        clearErrors();
    };

    const submitForm = (e) => {
        e.preventDefault();
        if (modalMode === 'create') {
            post(route('companies.store'), {
                onSuccess: () => closeModal(),
            });
        } else {
            // Because we are uploading files, we must use POST with _method: put
            router.post(route('companies.update', selectedCompanyId), {
                _method: 'put',
                ...data
            }, {
                onSuccess: () => closeModal(),
                onError: (errs) => {
                    // Inject errors back into useForm if using router manually
                    for (const key in errs) {
                        setData(key, data[key]); // Trigger error render (useForm handles this automatically, but router doesn't)
                    }
                }
            });
        }
    };

    const handleDelete = (id) => {
        if (confirm('¿Estás seguro de que deseas eliminar esta empresa?')) {
            destroy(route('companies.destroy', id));
        }
    };

    // Use useCallback to prevent map re-renders on every keystroke in other inputs
    const handleLocationSelect = useCallback((lat, lng) => {
        setData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    }, []);

    const hasLocation = data.latitude && data.longitude;

    return (
        <AuthenticatedLayout header="Gestión de Empresas">
            <Head title="Empresas" />

            <div className="row">
                <div className="col-md-12">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <div>
                                <h4 className="card-title">Listado de Empresas</h4>
                                <p className="card-category">Administra las organizaciones registradas en el sistema.</p>
                            </div>
                            <button 
                                className="btn btn-primary btn-round" 
                                onClick={() => openModal('create')}
                            >
                                <i className="nc-icon nc-simple-add"></i> Nueva Empresa
                            </button>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table">
                                    <thead className="text-primary">
                                        <tr>
                                            <th>Empresa</th>
                                            <th>RUC / NIT</th>
                                            <th className="text-center">Administradores</th>
                                            <th className="text-center">Choferes</th>
                                            <th>Teléfono</th>
                                            <th className="text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {companies.map((company) => (
                                            <tr key={company.id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="avatar mr-2" style={{width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#f4f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#66615B', overflow: 'hidden'}}>
                                                            {company.logo ? (
                                                                <img src={`/storage/${company.logo}`} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                company.name.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        {company.name}
                                                    </div>
                                                </td>
                                                <td>{company.tax_id}</td>
                                                <td className="text-center" style={{ maxWidth: '150px' }}>
                                                    {company.users && company.users.filter(u => u.role === 'administrador').length > 0 ? (
                                                        <div className="d-flex flex-wrap justify-content-center" style={{ gap: '4px' }}>
                                                            {company.users.filter(u => u.role === 'administrador').map(u => (
                                                                <span key={u.id} className="badge badge-pill badge-info">
                                                                    {u.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted small">-</span>
                                                    )}
                                                </td>
                                                <td className="text-center" style={{ maxWidth: '150px' }}>
                                                    {company.users && company.users.filter(u => u.role === 'chofer').length > 0 ? (
                                                        <div className="d-flex flex-wrap justify-content-center" style={{ gap: '4px' }}>
                                                            {company.users.filter(u => u.role === 'chofer').map(u => (
                                                                <span key={u.id} className="badge badge-pill badge-primary">
                                                                    {u.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted small">-</span>
                                                    )}
                                                </td>
                                                <td>{company.phone || '-'}</td>
                                                <td className="text-right">
                                                    <button 
                                                        className="btn btn-sm btn-info btn-icon btn-round"
                                                        title="Editar Empresa"
                                                        onClick={() => openModal('edit', company)}
                                                        style={{marginRight: '5px'}}
                                                    >
                                                        <i className="fa fa-edit"></i>
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm btn-danger btn-icon btn-round"
                                                        title="Eliminar Empresa"
                                                        onClick={() => handleDelete(company.id)}
                                                    >
                                                        <i className="fa fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {companies.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="text-center py-4 text-muted">
                                                    No se encontraron empresas registradas.
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

            {/* Bootstrap Modal for Add/Edit */}
            <div className="modal fade" id="companyModal" tabIndex="-1" role="dialog" aria-labelledby="companyModalLabel" aria-hidden="true" data-backdrop="static">
                <div className="modal-dialog modal-lg" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="companyModalLabel">
                                {modalMode === 'create' ? 'Crear Nueva Empresa' : 'Editar Empresa'}
                            </h5>
                            <button type="button" className="close" aria-label="Close" onClick={closeModal}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={submitForm}>
                            <div className="modal-body">
                                <div className="row">
                                    {/* Izquierda: Info de la Empresa */}
                                    <div className="col-md-6 border-right">
                                        <h6 className="text-muted mb-3">Información General</h6>
                                        
                                        <div className="form-group text-center mb-4">
                                            <div className="d-flex justify-content-center">
                                                <label 
                                                    htmlFor="logo-upload" 
                                                    style={{
                                                        width: '100px', 
                                                        height: '100px', 
                                                        borderRadius: '50%', 
                                                        border: '2px dashed #ccc', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        cursor: 'pointer',
                                                        overflow: 'hidden',
                                                        backgroundColor: '#f8f9fa',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    {logoPreview ? (
                                                        <img src={logoPreview} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div className="text-muted text-center" style={{ fontSize: '12px' }}>
                                                            <i className="fa fa-camera fa-2x mb-1"></i><br/>
                                                            Subir
                                                        </div>
                                                    )}
                                                    <input 
                                                        id="logo-upload"
                                                        type="file" 
                                                        className="d-none"
                                                        accept="image/*"
                                                        onChange={e => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                setData('logo', file);
                                                                setLogoPreview(URL.createObjectURL(file));
                                                            }
                                                        }} 
                                                    />
                                                </label>
                                            </div>
                                            <small className="d-block text-muted mt-2" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logo de la Empresa</small>
                                            {errors.logo && <div className="text-danger small mt-1">{errors.logo}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label>Nombre de la Empresa</label>
                                            <input 
                                                type="text" 
                                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                                value={data.name} 
                                                onChange={e => setData('name', e.target.value)} 
                                                required
                                            />
                                            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                        </div>

                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>RUC / NIT (ID Fiscal)</label>
                                                    <input 
                                                        type="text" 
                                                        className={`form-control ${errors.tax_id ? 'is-invalid' : ''}`}
                                                        value={data.tax_id} 
                                                        onChange={e => setData('tax_id', e.target.value)} 
                                                        required
                                                    />
                                                    {errors.tax_id && <div className="invalid-feedback">{errors.tax_id}</div>}
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Teléfono</label>
                                                    <input 
                                                        type="text" 
                                                        className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                                                        value={data.phone} 
                                                        onChange={e => setData('phone', e.target.value)} 
                                                    />
                                                    {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                                                </div>
                                            </div>
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
                                    </div>

                                    {/* Derecha: GPS */}
                                    <div className="col-md-6">
                                        <h6 className="text-muted mb-2">Ubicación GPS</h6>
                                        <p className="text-xs text-muted mb-2">Haz clic en el mapa o usa el botón de la mirilla para actualizar las coordenadas de la empresa.</p>

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
                                <button type="button" className="btn btn-secondary btn-round" onClick={closeModal}>
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

        </AuthenticatedLayout>
    );
}
