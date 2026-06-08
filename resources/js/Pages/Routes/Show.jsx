import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Show({ route, isDriver }) {
    const { post, processing } = useForm();

    const handleMarkDelivered = (dispatchId) => {
        if (confirm('¿Confirmas que este despacho ha sido entregado?')) {
            post(window.route('dispatches.mark_delivered', dispatchId), {
                preserveScroll: true,
            });
        }
    };

    const completedCount = route.dispatches.filter(d => d.status === 'entregado').length;
    const progressPercent = route.dispatches.length > 0 
        ? Math.round((completedCount / route.dispatches.length) * 100) 
        : 0;

    return (
        <AuthenticatedLayout header={<h2 className="text-2xl font-bold text-gray-800 dark:text-white">Detalle de Ruta</h2>}>
            <Head title={`Ruta ${route.date}`} />

            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Header Card */}
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                                Ruta del {new Date(route.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                {route.company?.name} &bull; Estado: <span className="uppercase font-semibold text-indigo-500">{route.status}</span>
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Camión</p>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white">{route.truck?.license_plate}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Chofer</p>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white">{route.driver?.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Progress */}
                    <div>
                        <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">
                            <span>Progreso del viaje</span>
                            <span>{completedCount} de {route.dispatches.length} entregas</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Dispatches List */}
                <div className="space-y-4">
                    <h4 className="text-lg font-bold text-gray-800 dark:text-white px-2">Hoja de Despachos</h4>
                    
                    {route.dispatches.map((dispatch, index) => {
                        const isDelivered = dispatch.status === 'entregado';
                        return (
                            <div 
                                key={dispatch.id} 
                                className={`bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border transition-all duration-300 p-5 lg:p-6
                                    ${isDelivered ? 'border-green-200 dark:border-green-900/50 opacity-80 bg-green-50/10' : 'border-gray-100 dark:border-slate-700/50 hover:shadow-md'}`}
                            >
                                <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
                                    
                                    <div className="flex gap-4 items-start flex-1 w-full">
                                        <div className={`shrink-0 size-10 rounded-full flex items-center justify-center font-bold text-lg shadow-inner
                                            ${isDelivered ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'}`}>
                                            {isDelivered 
                                                ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                : index + 1}
                                        </div>
                                        
                                        <div className="flex-1">
                                            <h5 className={`text-base font-bold ${isDelivered ? 'text-gray-500 dark:text-slate-400' : 'text-gray-900 dark:text-white'}`}>
                                                {dispatch.client?.name || 'Cliente Eliminado'}
                                            </h5>
                                            
                                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 flex items-start gap-1">
                                                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                {dispatch.client?.address || 'Sin dirección registrada'}
                                            </p>
                                            
                                            {/* Productos listados si existen */}
                                            {dispatch.products?.length > 0 && (
                                                <div className="mt-3 bg-gray-50 dark:bg-[#0f172a] rounded-xl p-3 border border-gray-100 dark:border-slate-700/50">
                                                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Productos a entregar</p>
                                                    <ul className="space-y-1.5 min-w-[200px]">
                                                        {dispatch.products.map(p => (
                                                            <li key={p.id} className="text-sm flex items-center justify-between">
                                                                <span className="text-gray-600 dark:text-slate-300">{p.product_name}</span>
                                                                <span className="font-bold text-gray-900 dark:text-white px-2 py-0.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-gray-100 dark:border-slate-600 text-xs">{p.quantity} unid.</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            
                                            {isDelivered && dispatch.dispatched_at && (
                                                <div className="mt-3 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    Entregado a las {new Date(dispatch.dispatched_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute:'2-digit' })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Botón de Acción para el Chofer */}
                                    {isDriver && !isDelivered && (
                                        <button
                                            onClick={() => handleMarkDelivered(dispatch.id)}
                                            disabled={processing}
                                            className="w-full lg:w-auto mt-4 lg:mt-0 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 lg:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-green-500/30"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Ya Despachado
                                        </button>
                                    )}

                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="pb-10 pt-4 flex justify-center">
                    <Link href={route('routes.index')} className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                        &larr; Volver a las rutas
                    </Link>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
