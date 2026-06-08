<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\TruckController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\RouteController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    $authUser = Illuminate\Support\Facades\Auth::user();
    
    if ($authUser->isDriver()) {
        $driverRoutes = \App\Models\Route::with(['truck', 'company', 'dispatches.client', 'dispatches.products'])
            ->where('user_id', $authUser->id)
            ->where('date', '>=', today()->toDateString())
            ->orderBy('date', 'asc')
            ->get();

        return Inertia::render('Driver/Home', [
            'assignedRoutes' => $driverRoutes
        ]);
    }

    $companyId = $authUser->isSuperAdmin() ? null : $authUser->company_id;

    $stats = [
        'companies' => $authUser->isSuperAdmin() ? \App\Models\Company::count() : 0,
        'users' => \App\Models\User::when($companyId, fn($q) => $q->where('company_id', $companyId))->where('role', '!=', 'chofer')->count(),
        'drivers' => \App\Models\User::when($companyId, fn($q) => $q->where('company_id', $companyId))->where('role', 'chofer')->count(),
        'trucks' => \App\Models\Truck::when($companyId, fn($q) => $q->where('company_id', $companyId))->count(),
        'routes' => \App\Models\Route::when($companyId, fn($q) => $q->where('company_id', $companyId))->count(),
    ];

    $companiesStats = [];
    if ($authUser->isSuperAdmin()) {
        $companiesStats = \App\Models\Company::withCount([
            'users as users_count' => function ($query) {
                $query->where('role', '!=', 'chofer');
            },
            'users as drivers_count' => function ($query) {
                $query->where('role', 'chofer');
            },
            'trucks',
            'routes'
        ])->get();
    }

    $recentRoutes = \App\Models\Route::with(['company', 'driver', 'truck', 'dispatches'])
        ->when($companyId, fn($q) => $q->where('company_id', $companyId))
        ->latest()
        ->take(6)
        ->get();

    return Inertia::render('Dashboard', [
        'stats' => $stats,
        'companiesStats' => $companiesStats,
        'recentRoutes' => $recentRoutes,
        'isSuperAdmin' => $authUser->isSuperAdmin(),
        'isDriver' => false,
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::resource('users', UserController::class);
    Route::resource('companies', CompanyController::class);
    Route::resource('trucks', TruckController::class);
    Route::resource('clients', ClientController::class);
    Route::resource('routes', RouteController::class);
    Route::post('routes/{route}/start', [RouteController::class, 'startRoute'])->name('routes.start');
    Route::post('routes/{route}/finish', [RouteController::class, 'finishRoute'])->name('routes.finish');
    Route::post('routes/dispatches/{dispatch}/mark-delivered', [RouteController::class, 'markDispatchDelivered'])->name('dispatches.mark_delivered');

    Route::get('reports', [\App\Http\Controllers\ReportController::class, 'index'])->name('reports.index');
    Route::get('reports/{route}/pdf', [\App\Http\Controllers\ReportController::class, 'downloadPdf'])->name('reports.pdf');
});

require __DIR__.'/auth.php';
