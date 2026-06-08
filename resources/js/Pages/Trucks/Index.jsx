import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ trucks, companies, isSuperAdmin }) {
    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        company_id: '',
        license_plate: '',
        model: '',
        description: '',
    });

    const [modalMode, setModalMode] = useState(null); // 'create' or 'edit'
    const [selectedTruckId, setSelectedTruckId] = useState(null);

    const openModal = (mode, truck = null) => {
        clearErrors();
        setModalMode(mode);
        if (mode === 'edit' && truck) {
            setSelectedTruckId(truck.id);
            setData({
                company_id: truck.company_id || '',
                license_plate: truck.license_plate || '',
                model: truck.model || '',
                description: truck.description || '',
            });
        } else {
            setSelectedTruckId(null);
            reset();
        }
        window.$('#truckModal').modal('show');
    };

    const closeModal = () => {
        window.$('#truckModal').modal('hide');
        setModalMode(null);
        reset();
        clearErrors();
    };

    const submitForm = (e) => {
        e.preventDefault();
        if (modalMode === 'create') {
            post(route('trucks.store'), {
                onSuccess: () => closeModal(),
            });
        } else {
            put(route('trucks.update', selectedTruckId), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (confirm('¿Estás seguro de que deseas eliminar este camión?')) {
            destroy(route('trucks.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout header="Gestión de Camiones">
            <Head title="Camiones" />

            <div className="row">
                <div className="col-md-12">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <div>
                                <h4 className="card-title">Listado de Camiones</h4>
                                <p className="card-category">Administra la flota de vehículos registrados.</p>
                            </div>
                            <button 
                                className="btn btn-primary btn-round"
                                onClick={() => openModal('create')}
                            >
                                <i className="nc-icon nc-simple-add"></i> Registrar Camión
                            </button>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table">
                                    <thead className="text-primary">
                                        <tr>
                                            <th>Placa</th>
                                            <th>Modelo</th>
                                            <th>Descripción</th>
                                            <th>Empresa</th>
                                            <th className="text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trucks.map((truck) => (
                                            <tr key={truck.id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="avatar mr-2" style={{width: '35px', height: '35px', borderRadius: '8px', backgroundColor: '#eef2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#51cbce'}}>
                                                            <i className="nc-icon nc-delivery-fast"></i>
                                                        </div>
                                                        <span className="font-weight-bold">{truck.license_plate}</span>
                                                    </div>
                                                </td>
                                                <td>{truck.model}</td>
                                                <td style={{ maxWidth: '250px' }}>
                                                    {truck.description || '-'}
                                                </td>
                                                <td>
                                                    {truck.company ? truck.company.name : 'N/A'}
                                                </td>
                                                <td className="text-right">
                                                    <button 
                                                        className="btn btn-sm btn-info btn-icon btn-round"
                                                        title="Editar Camión"
                                                        onClick={() => openModal('edit', truck)}
                                                        style={{marginRight: '5px'}}
                                                    >
                                                        <i className="fa fa-edit"></i>
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm btn-danger btn-icon btn-round"
                                                        title="Eliminar Camión"
                                                        onClick={() => handleDelete(truck.id)}
                                                    >
                                                        <i className="fa fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {trucks.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="text-center py-4 text-muted">
                                                    No se encontraron camiones registrados.
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

            {/* Bootstrap Modal for Add/Edit Truck */}
            <div className="modal fade" id="truckModal" tabIndex="-1" role="dialog" aria-labelledby="truckModalLabel" aria-hidden="true" data-backdrop="static">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="truckModalLabel">
                                {modalMode === 'create' ? 'Registrar Nuevo Camión' : 'Editar Camión'}
                            </h5>
                            <button type="button" className="close" aria-label="Close" onClick={closeModal}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={submitForm}>
                            <div className="modal-body">
                                
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

                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label>Placa</label>
                                            <input 
                                                type="text" 
                                                className={`form-control ${errors.license_plate ? 'is-invalid' : ''}`}
                                                value={data.license_plate} 
                                                onChange={e => setData('license_plate', e.target.value.toUpperCase())} 
                                                placeholder="Ej: ABC-123"
                                                required
                                            />
                                            {errors.license_plate && <div className="invalid-feedback">{errors.license_plate}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label>Modelo / Marca</label>
                                            <input 
                                                type="text" 
                                                className={`form-control ${errors.model ? 'is-invalid' : ''}`}
                                                value={data.model} 
                                                onChange={e => setData('model', e.target.value)} 
                                                required
                                            />
                                            {errors.model && <div className="invalid-feedback">{errors.model}</div>}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Descripción / Observaciones</label>
                                    <textarea 
                                        className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                                        value={data.description} 
                                        onChange={e => setData('description', e.target.value)} 
                                        rows="3"
                                    ></textarea>
                                    {errors.description && <div className="invalid-feedback">{errors.description}</div>}
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
