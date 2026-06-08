import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

const inputClass =
    'mt-1 block w-full rounded-lg border-gray-200 dark:border-slate-700 dark:bg-[#0f172a] dark:text-white focus:border-indigo-500 focus:ring-indigo-500 shadow-sm transition-all text-sm py-1.5';

export default function Edit({ truck, companies, isSuperAdmin }) {
    const { data, setData, patch, processing, errors } = useForm({
        company_id: truck.company_id,
        license_plate: truck.license_plate,
        model: truck.model,
        description: truck.description || '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('trucks.update', truck.id));
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-2xl font-bold text-gray-800 dark:text-white">Editar Camión</h2>}>
            <Head title={`Editar Camión ${truck.license_plate}`} />

            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden transition-colors duration-300">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-transparent">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Información del Camión</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Modifica los detalles del vehículo.</p>
                    </div>

                    <form onSubmit={submit} className="p-5 space-y-4">
                        
                        {/* Selector de Empresa para SuperAdmin */}
                        {isSuperAdmin && (
                            <div>
                                <InputLabel htmlFor="company_id" value="Empresa Propietaria" className="dark:text-slate-300 text-xs" />
                                <select
                                    id="company_id"
                                    name="company_id"
                                    value={data.company_id}
                                    className={`${inputClass} !py-2`}
                                    onChange={(e) => setData('company_id', e.target.value)}
                                    required
                                >
                                    <option value="">Seleccione una Empresa</option>
                                    {companies.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.company_id} className="mt-2" />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <InputLabel htmlFor="license_plate" value="Placa" className="dark:text-slate-300 text-xs" />
                                <TextInput
                                    id="license_plate"
                                    name="license_plate"
                                    value={data.license_plate}
                                    className={`${inputClass} uppercase`}
                                    isFocused={true}
                                    onChange={(e) => setData('license_plate', e.target.value.toUpperCase())}
                                    required
                                />
                                <InputError message={errors.license_plate} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="model" value="Modelo (Marca/Año/Tipo)" className="dark:text-slate-300 text-xs" />
                                <TextInput
                                    id="model"
                                    name="model"
                                    value={data.model}
                                    className={inputClass}
                                    onChange={(e) => setData('model', e.target.value)}
                                    required
                                />
                                <InputError message={errors.model} className="mt-2" />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="description" value="Descripción (Opcional)" className="dark:text-slate-300 text-xs" />
                            <textarea
                                id="description"
                                name="description"
                                value={data.description}
                                className={`${inputClass} min-h-[80px]`}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Detalles adicionales, capacidad de carga, color, etc."
                            />
                            <InputError message={errors.description} className="mt-2" />
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t border-gray-100 dark:border-slate-700/50">
                            <Link href={route('trucks.index')} className="text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 transition-colors">
                                Cancelar
                            </Link>
                            <PrimaryButton className="bg-indigo-600 hover:bg-indigo-700 rounded-lg px-6 py-2 transition-all" disabled={processing}>
                                Actualizar Camión
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
