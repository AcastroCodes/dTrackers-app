import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="Bienvenido a dTrackers" />
            <div className="relative min-h-screen bg-[#0f172a] text-white selection:bg-indigo-500 selection:text-white overflow-hidden font-sans">
                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col min-h-screen">
                    <header className="flex justify-between items-center py-8">
                        <div className="flex items-center gap-2">
                            <div className="size-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <span className="font-bold text-xl">D</span>
                            </div>
                            <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                dTrackers
                            </span>
                        </div>

                        <nav className="flex items-center gap-6">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 font-medium text-sm backdrop-blur-md"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-105 transition-all duration-300 font-semibold text-sm shadow-lg shadow-indigo-500/25"
                                >
                                    Iniciar Sesión
                                </Link>
                            )}
                        </nav>
                    </header>

                    <main className="flex-1 flex flex-col justify-center items-center text-center py-20">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Sistema de Seguimiento Avanzado
                        </div>
                        
                        <h1 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight leading-[1.1]">
                            El futuro del <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                                Seguimiento Digital
                            </span>
                        </h1>
                        
                        <p className="max-w-2xl text-lg md:text-xl text-gray-400 mb-12 leading-relaxed">
                            Potencia tu flujo de trabajo con dTrackers. La plataforma definitiva para gestionar 
                            usuarios y datos con una interfaz intuitiva y potentes herramientas de análisis.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            {!auth.user && (
                                <Link
                                    href={route('register')}
                                    className="px-8 py-4 rounded-2xl bg-white text-gray-900 font-bold hover:bg-gray-100 transition-all duration-300 shadow-xl shadow-white/5"
                                >
                                    Comenzar Ahora
                                </Link>
                            )}
                            <a
                                href="#features"
                                className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all duration-300 backdrop-blur-md"
                            >
                                Saber más
                            </a>
                        </div>
                    </main>

                    <footer className="py-12 border-t border-white/5 text-center text-gray-500 text-sm">
                        <p>© {new Date().getFullYear()} dTrackers. Todos los derechos reservados.</p>
                    </footer>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.8s ease-out forwards;
                }
            ` }} />
        </>
    );
}
