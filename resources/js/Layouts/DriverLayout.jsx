import { Link, usePage } from '@inertiajs/react';

export default function DriverLayout({ children, headerRight, footerLeft, footerCenter }) {
    const user = usePage().props.auth.user;

    const avatarSrc = user.company 
        ? (user.company.logo 
            ? (user.company.logo.startsWith('http') ? user.company.logo : `/storage/${user.company.logo}`) 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.company.name)}&background=f4f3ef&color=66615b&rounded=true&bold=true`)
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f4f3ef&color=66615b&rounded=true&bold=true`;

    const companyLogoSrc = user.company?.logo
        ? (user.company.logo.startsWith('http') ? user.company.logo : `/storage/${user.company.logo}`)
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.company?.name || user.name)}&background=4f46e5&color=fff&rounded=true&bold=true`;

    const avatarAlt = user.company ? user.company.name : user.name;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-24">
            {/* Top Navigation Bar */}
            <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 inset-x-0 z-50">
                <div className="w-full px-4 sm:px-6">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        
                        {/* Left Side: Company Logo */}
                        <div className="flex items-center gap-3">
                            <img 
                                src={companyLogoSrc}
                                alt="Company Logo"
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-200 shadow-sm shrink-0"
                            />
                            <span className="font-bold text-gray-900 truncate max-w-[120px] sm:max-w-xs text-sm sm:text-base hidden sm:block">
                                {user.company?.name || 'dTrackers'}
                            </span>
                        </div>

                        {/* Right Side: Date / Route Selector (headerRight) */}
                        <div className="flex items-center gap-2">
                            {headerRight}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-6">
                {children}
            </main>

            {/* Bottom Navigation / Footer */}
            <footer className="bg-white border-t border-gray-200 fixed bottom-0 inset-x-0 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="w-full px-4 py-3 flex items-center justify-between">
                    
                    {/* Left: Action Button */}
                    <div className="flex-shrink-0 flex items-center">
                        {footerLeft}
                    </div>

                    {/* Center: Timer */}
                    <div className="flex-1 flex justify-center px-2">
                        {footerCenter}
                    </div>

                    {/* Right: Driver Info & Sign Out */}
                    <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
                        <div className="flex flex-col text-right hidden sm:flex">
                            <span className="font-semibold text-gray-900 text-xs sm:text-sm truncate max-w-[100px]">{user.name}</span>
                            <span className="text-[10px] sm:text-xs text-gray-500 capitalize">{user.role}</span>
                        </div>
                        <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
                        <Link 
                            href={route('logout')} 
                            method="post" 
                            as="button" 
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center focus:outline-none"
                            title="Cerrar Sesión"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </Link>
                    </div>

                </div>
            </footer>
        </div>
    );
}
