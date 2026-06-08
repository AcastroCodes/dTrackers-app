import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';

export default function Index({ users, companies }) {
    const authUser = usePage().props.auth.user;
    const isSuperAdmin = authUser.role === 'superadmin';

    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [selectedUserId, setSelectedUserId] = useState(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'chofer',
        company_id: authUser.company_id || '',
    });

    // We can use a ref for the modal or simply use global jQuery since Bootstrap 4 uses it
    const openModal = (mode, user = null) => {
        clearErrors();
        setModalMode(mode);
        if (mode === 'edit' && user) {
            setSelectedUserId(user.id);
            setData({
                name: user.name,
                email: user.email,
                role: user.role,
                company_id: user.company_id || '',
                password: '',
                password_confirmation: '',
            });
        } else {
            setSelectedUserId(null);
            reset();
            // Default company_id if not superadmin
            if (!isSuperAdmin) {
                setData('company_id', authUser.company_id);
            }
        }
        window.$('#userModal').modal('show');
    };

    const closeModal = () => {
        window.$('#userModal').modal('hide');
        reset();
        clearErrors();
    };

    const submitForm = (e) => {
        e.preventDefault();
        if (modalMode === 'create') {
            post(route('users.store'), {
                onSuccess: () => closeModal(),
            });
        } else {
            put(route('users.update', selectedUserId), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
            destroy(route('users.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout header={isSuperAdmin ? "Gestión de Usuarios" : "Gestión de Choferes"}>
            <Head title={isSuperAdmin ? "Usuarios" : "Choferes"} />

            <div className="row">
                <div className="col-md-12">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <div>
                                <h4 className="card-title">Listado de {isSuperAdmin ? "Usuarios" : "Choferes"}</h4>
                                <p className="card-category">{isSuperAdmin ? "Administra los accesos y roles del sistema." : "Administra tu flota de choferes."}</p>
                            </div>
                            <button 
                                className="btn btn-primary btn-round" 
                                onClick={() => openModal('create')}
                            >
                                <i className="nc-icon nc-simple-add"></i> Nuevo {isSuperAdmin ? "Usuario" : "Chofer"}
                            </button>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table">
                                    <thead className="text-primary">
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Email</th>
                                            <th>Rol</th>
                                            {isSuperAdmin && <th>Empresa</th>}
                                            <th className="text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="avatar mr-2" style={{width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#f4f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#66615B'}}>
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        {user.name}
                                                    </div>
                                                </td>
                                                <td>{user.email}</td>
                                                <td className="text-capitalize">{user.role}</td>
                                                {isSuperAdmin && <td>{user.company ? user.company.name : 'N/A'}</td>}
                                                <td className="text-right">
                                                    <button 
                                                        className="btn btn-sm btn-info btn-icon btn-round"
                                                        title="Editar Usuario"
                                                        onClick={() => openModal('edit', user)}
                                                        style={{marginRight: '5px'}}
                                                    >
                                                        <i className="fa fa-edit"></i>
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm btn-danger btn-icon btn-round"
                                                        title="Eliminar Usuario"
                                                        onClick={() => handleDelete(user.id)}
                                                    >
                                                        <i className="fa fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bootstrap Modal for Add/Edit */}
            <div className="modal fade" id="userModal" tabIndex="-1" role="dialog" aria-labelledby="userModalLabel" aria-hidden="true">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="userModalLabel">
                                {modalMode === 'create' ? (isSuperAdmin ? 'Crear Nuevo Usuario' : 'Añadir Chofer') : (isSuperAdmin ? 'Editar Usuario' : 'Editar Chofer')}
                            </h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={closeModal}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={submitForm}>
                            <div className="modal-body">
                                
                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label>Nombre</label>
                                            <input 
                                                type="text" 
                                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                                value={data.name} 
                                                onChange={e => setData('name', e.target.value)} 
                                                required
                                            />
                                            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                        </div>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label>Email</label>
                                            <input 
                                                type="email" 
                                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                                value={data.email} 
                                                onChange={e => setData('email', e.target.value)} 
                                                required
                                            />
                                            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                                        </div>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label>Contraseña {modalMode === 'edit' && <small>(Opcional)</small>}</label>
                                            <input 
                                                type="password" 
                                                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                                value={data.password} 
                                                onChange={e => setData('password', e.target.value)} 
                                                required={modalMode === 'create'}
                                            />
                                            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label>Repetir Contraseña</label>
                                            <input 
                                                type="password" 
                                                className="form-control"
                                                value={data.password_confirmation} 
                                                onChange={e => setData('password_confirmation', e.target.value)} 
                                                required={modalMode === 'create'}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="row">
                                    {isSuperAdmin && (
                                        <>
                                            <div className={data.role !== 'superadmin' ? "col-md-6" : "col-md-12"}>
                                                <div className="form-group">
                                                    <label>Rol</label>
                                                    <select 
                                                        className={`form-control ${errors.role ? 'is-invalid' : ''}`}
                                                        value={data.role} 
                                                        onChange={e => setData('role', e.target.value)}
                                                        required
                                                    >
                                                        <option value="superadmin">Superadmin</option>
                                                        <option value="administrador">Administrador</option>
                                                        <option value="chofer">Chofer</option>
                                                    </select>
                                                    {errors.role && <div className="invalid-feedback">{errors.role}</div>}
                                                </div>
                                            </div>
                                            
                                            {data.role !== 'superadmin' && (
                                                <div className="col-md-6">
                                                    <div className="form-group">
                                                        <label>Empresa</label>
                                                        <select 
                                                            className={`form-control ${errors.company_id ? 'is-invalid' : ''}`}
                                                            value={data.company_id} 
                                                            onChange={e => setData('company_id', e.target.value)}
                                                            required={data.role !== 'superadmin'}
                                                        >
                                                            <option value="">Seleccione una empresa</option>
                                                            {companies?.map(c => (
                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                        {errors.company_id && <div className="invalid-feedback">{errors.company_id}</div>}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary btn-round" onClick={closeModal} data-dismiss="modal">
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
