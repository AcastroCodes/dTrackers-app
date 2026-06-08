<?php

namespace App\Http\Controllers;

use App\Models\Route;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    /**
     * Display a listing of completed routes for reporting.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = Route::with(['company', 'driver', 'truck'])
            ->where('status', 'completada');

        // Filter by company if not superadmin
        if (!$user->isSuperAdmin()) {
            $query->where('company_id', $user->company_id);
        }

        // Apply filters
        if ($request->filled('date')) {
            $query->whereDate('date', '>=', $request->date);
        }

        if ($request->filled('driver')) {
            $query->whereHas('driver', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->driver . '%');
            });
        }

        $routes = $query->latest('date')->paginate(15)->withQueryString();

        return Inertia::render('Reports/Index', [
            'routes' => $routes,
            'filters' => $request->only(['date', 'driver']),
        ]);
    }

    /**
     * Generate and download a PDF report for a specific route.
     */
    public function downloadPdf(Request $request, Route $route)
    {
        $user = $request->user();

        // Ensure the user has access to this route
        if (!$user->isSuperAdmin() && $route->company_id !== $user->company_id) {
            abort(403, 'Unauthorized action.');
        }

        // Load all necessary relationships for the report
        $route->load([
            'company',
            'driver',
            'truck',
            'dispatches' => function ($query) {
                $query->where('status', 'entregado')->orderBy('order_index');
            },
            'dispatches.client',
            'dispatches.products'
        ]);

        $pdf = Pdf::loadView('reports.route_pdf', compact('route'));
        
        // Return the PDF to download
        return $pdf->download('reporte-ruta-' . $route->id . '.pdf');
    }
}
