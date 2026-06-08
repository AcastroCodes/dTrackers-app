import { Link, usePage } from '@inertiajs/react';

export default function DriverLayout({ children, headerLeft }) {
    const user = usePage().props.auth.user;

    const avatarSrc = user.company 
        ? (user.company.logo 
            ? (user.company.logo.startsWith('http') ? user.company.logo : `/storage/${user.company.logo}`) 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.company.name)}&background=f4f3ef&color=66615b&rounded=true&bold=true`)
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f4f3ef&color=66615b&rounded=true&bold=true`;

    const avatarAlt = user.company ? user.company.name : user.name;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Top Navigation Bar */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        
                        {/* Left Side: Date / Route Selector */}
                        <div className="flex items-center gap-2">
                            {headerLeft || (
                                <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-indigo-100 transition-colors">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="font-semibold text-sm">Hoy, {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                </div>
                            )}
                        </div>

                        {/* Right Side: User Profile & Logout */}
                        <div className="flex items-center gap-4">
                            {/* User Profile Info */}
                            <div className="flex items-center gap-3 overflow-hidden text-right">
                                <div className="flex flex-col overflow-hidden hidden sm:flex">
                                    <span className="font-semibold text-gray-900 text-sm truncate">{user.name}</span>
                                    <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                                </div>
                                <img 
                                    src={avatarSrc}
                                    alt={avatarAlt}
                                    className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm shrink-0"
                                />
                            </div>

                            <div className="h-6 w-px bg-gray-200"></div>

                            {/* Logout Button */}
                            <Link 
                                href={route('logout')} 
                                method="post" 
                                as="button" 
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center focus:outline-none"
                                title="Cerrar Sesión"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </Link>
                        </div>
                        
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>
        </div>
    );
}
