import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import MapPickerModal from '@/Components/MapPickerModal';

const inputClass =
    'mt-1 block w-full rounded-lg border-gray-200 dark:border-slate-700 dark:bg-[#0f172a] dark:text-white focus:border-indigo-500 focus:ring-indigo-500 shadow-sm transition-all text-sm py-1.5';

export default function Create({ companies, isSuperAdmin }) {
    const [mapOpen, setMapOpen] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        company_id: '',
        name: '',
        address: '',
        reference: '',
        latitude: '',
        longitude: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('clients.store'));
    };

    const handleLocationConfirm = (lat, lng) => {
        setData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    };

    const clearLocation = () => {
        setData((prev) => ({ ...prev, latitude: '', longitude: '' }));
    };

    const hasLocation = data.latitude !== '' && data.longitude !== '';

    return (
        <AuthenticatedLayout header={<h2 className="text-2xl font-bold text-gray-800 dark:text-white">Registrar Cliente</h2>}>
            <Head title="Registrar Cliente" />

            <MapPickerModal
                isOpen={mapOpen}
                onClose={() => setMapOpen(false)}
                onConfirm={handleLocationConfirm}
                initialLat={data.latitude || null}
                initialLng={data.longitude || null}
            />

            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden transition-colors duration-300">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-transparent">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Información del Cliente</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Proporciona los datos y ubicación exacta del cliente.</p>
                    </div>

                    <form onSubmit={submit} className="p-5 space-y-4">
                        
                        {/* Selector de Empresa para SuperAdmin */}
                        {isSuperAdmin && (
                            <div>
                                <InputLabel htmlFor="company_id" value="Empresa" className="dark:text-slate-300 text-xs" />
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

                        <div>
                            <InputLabel htmlFor="name" value="Nombre del Cliente" className="dark:text-slate-300 text-xs" />
                            <TextInput
                                id="name"
                                name="name"
                                value={data.name}
                                className={inputClass}
                                isFocused={true}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <InputLabel htmlFor="address" value="Dirección" className="dark:text-slate-300 text-xs" />
                                <textarea
                                    id="address"
                                    name="address"
                                    value={data.address}
                                    rows={2}
                                    className={`${inputClass} resize-none`}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder="Ingrese la calle, zona o numeración..."
                                />
                                <InputError message={errors.address} className="mt-2" />
                            </div>

                            <div className="md:col-span-2">
                                <InputLabel htmlFor="reference" value="Punto de Referencia" className="dark:text-slate-300 text-xs" />
                                <textarea
                                    id="reference"
                                    name="reference"
                                    value={data.reference}
                                    rows={2}
                                    className={`${inputClass} resize-none`}
                                    onChange={(e) => setData('reference', e.target.value)}
                                    placeholder="Frente a un parque, al lado de la tienda, color de la casa..."
                                />
                                <InputError message={errors.reference} className="mt-2" />
                            </div>
                        </div>

                        {/* ── Sección GPS ── */}
                        <div className="rounded-xl border border-gray-100 dark:border-slate-700/50 overflow-hidden">
                            <div className="px-4 py-2.5 bg-gray-50/80 dark:bg-slate-800/40 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">Ubicación GPS</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMapOpen(true)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-all shadow shadow-indigo-500/20"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    {hasLocation ? 'Cambiar en mapa' : 'Abrir mapa'}
                                </button>
                            </div>

                            <div className="px-4 py-2.5">
                                {hasLocation ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="size-6 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Ubicación seleccionada</p>
                                                <p className="text-xs font-mono text-gray-500 dark:text-slate-400">
                                                    {parseFloat(data.latitude).toFixed(6)}, {parseFloat(data.longitude).toFixed(6)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={clearLocation}
                                            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 dark:text-slate-500 italic">
                                        Sin ubicación. Haz clic en "Abrir mapa" para seleccionarla.
                                    </p>
                                )}
                            </div>
                        </div>

                        <input type="hidden" name="latitude" value={data.latitude} />
                        <input type="hidden" name="longitude" value={data.longitude} />
                        <InputError message={errors.latitude} className="-mt-4" />
                        <InputError message={errors.longitude} className="-mt-4" />

                        <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t border-gray-100 dark:border-slate-700/50">
                            <Link href={route('clients.index')} className="text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 transition-colors">
                                Cancelar
                            </Link>
                            <PrimaryButton className="bg-indigo-600 hover:bg-indigo-700 rounded-lg px-6 py-2 transition-all" disabled={processing}>
                                Registrar Cliente
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
