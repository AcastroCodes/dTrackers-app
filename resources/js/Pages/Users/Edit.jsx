import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

const selectClass =
    'mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-[#0f172a] dark:text-white focus:border-indigo-500 focus:ring-indigo-500 shadow-sm transition-all text-sm';

const inputClass =
    'mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-[#0f172a] dark:text-white focus:border-indigo-500 focus:ring-indigo-500 shadow-sm transition-all';

export default function Edit({ user, companies }) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        role: user.role,
        company_id: user.company_id ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('users.update', user.id), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const needsCompany = data.role !== 'superadmin';

    return (
        <AuthenticatedLayout
            header={<h2 className="text-2xl font-bold text-gray-800 dark:text-white">Editar Usuario</h2>}
        >
            <Head title="Editar Usuario" />

            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden transition-colors duration-300">
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-transparent">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Actualizar Información</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Modifica los datos del usuario seleccionado.</p>
                    </div>

                    <form onSubmit={submit} className="p-8 space-y-6">
                        {/* Nombre */}
                        <div>
                            <InputLabel htmlFor="name" value="Nombre Completo" className="dark:text-slate-300" />
                            <TextInput
                                id="name"
                                name="name"
                                value={data.name}
                                className={inputClass}
                                autoComplete="name"
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        {/* Email */}
                        <div>
                            <InputLabel htmlFor="email" value="Correo Electrónico" className="dark:text-slate-300" />
                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className={inputClass}
                                autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />
                            <InputError message={errors.email} className="mt-2" />
                        </div>

                        {/* Cambio de contraseña (opcional) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 dark:bg-[#0f172a]/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 transition-colors duration-300">
                            <div className="col-span-full">
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Cambiar Contraseña (Opcional)</p>
                            </div>
                            <div>
                                <InputLabel htmlFor="password" value="Nueva Contraseña" className="dark:text-slate-300" />
                                <TextInput
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className={inputClass}
                                    autoComplete="new-password"
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                <InputError message={errors.password} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="password_confirmation" value="Confirmar Nueva Contraseña" className="dark:text-slate-300" />
                                <TextInput
                                    id="password_confirmation"
                                    type="password"
                                    name="password_confirmation"
                                    value={data.password_confirmation}
                                    className={inputClass}
                                    autoComplete="new-password"
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                />
                                <InputError message={errors.password_confirmation} className="mt-2" />
                            </div>
                        </div>

                        {/* Rol */}
                        <div>
                            <InputLabel htmlFor="role" value="Rol de Usuario" className="dark:text-slate-300" />
                            <select
                                id="role"
                                name="role"
                                value={data.role}
                                className={selectClass}
                                onChange={(e) => {
                                    setData('role', e.target.value);
                                    if (e.target.value === 'superadmin') {
                                        setData('company_id', '');
                                    }
                                }}
                                required
                            >
                                <option value="superadmin">Super Admin</option>
                                <option value="administrador">Administrador</option>
                                <option value="chofer">Chofer</option>
                            </select>
                            <InputError message={errors.role} className="mt-2" />
                        </div>

                        {/* Empresa — solo visible si NO es superadmin */}
                        {needsCompany && (
                            <div>
                                <InputLabel htmlFor="company_id" value="Empresa" className="dark:text-slate-300" />
                                <select
                                    id="company_id"
                                    name="company_id"
                                    value={data.company_id}
                                    className={selectClass}
                                    onChange={(e) => setData('company_id', e.target.value)}
                                    required
                                >
                                    <option value="">Seleccione una empresa</option>
                                    {companies.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.company_id} className="mt-2" />
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-slate-700/50">
                            <Link
                                href={route('users.index')}
                                className="text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                Cancelar
                            </Link>
                            <PrimaryButton className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-6 py-2.5 transition-all shadow-lg shadow-indigo-500/20" disabled={processing}>
                                Actualizar Usuario
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
