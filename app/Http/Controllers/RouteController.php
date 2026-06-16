<?php

namespace App\Http\Controllers;

use App\Models\Route;
use App\Models\Company;
use App\Models\Truck;
use App\Models\User;
use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class RouteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $authUser = Auth::user();

        if ($authUser->isDriver()) {
            return redirect()->route('dashboard');
        }

        if ($authUser->isSuperAdmin()) {
            $routes = Route::with(['company', 'truck', 'driver', 'dispatches'])->latest()->get();
        } else {
            // Admin
            $routes = Route::with(['company', 'truck', 'driver', 'dispatches'])
                ->where('company_id', $authUser->company_id)
                ->latest()
                ->get();
        }

        return Inertia::render('Routes/Index', [
            'routes' => $routes,
            'isDriver' => false,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $authUser = Auth::user();
        if ($authUser->isDriver()) {
            abort(403, 'No tienes permiso para crear rutas.');
        }

        $companies = $authUser->isSuperAdmin() 
            ? Company::orderBy('name')->get(['id', 'name', 'latitude', 'longitude']) 
            : Company::where('id', $authUser->company_id)->get(['id', 'name', 'latitude', 'longitude']);
        
        $companyId = $authUser->isSuperAdmin() ? null : $authUser->company_id;

        $clients = Client::when($companyId, function ($q) use ($companyId) {
            $q->where('company_id', $companyId);
        })->get();

        $trucks = Truck::when($companyId, function ($q) use ($companyId) {
            $q->where('company_id', $companyId);
        })->get();

        $drivers = User::when($companyId, function ($q) use ($companyId) {
            $q->where('company_id', $companyId);
        })->where('role', 'chofer')->get();

        return Inertia::render('Routes/Create', [
            'companies' => $companies,
            'clients' => $clients,
            'trucks' => $trucks,
            'drivers' => $drivers,
            'isSuperAdmin' => $authUser->isSuperAdmin(),
            'defaultCompanyId' => $companyId,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $authUser = Auth::user();
        if ($authUser->isDriver()) {
            abort(403);
        }

        $rules = [
            'truck_id' => 'required|exists:trucks,id',
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'total_distance_km' => 'nullable|numeric',
            'estimated_time_mins' => 'nullable|numeric',
            'dispatches' => 'required|array|min:1',
            'dispatches.*.client_id' => 'required|exists:clients,id',
            'dispatches.*.products' => 'nullable|array',
            'dispatches.*.products.*.product_name' => 'required|string',
            'dispatches.*.products.*.quantity' => 'required|integer|min:1',
        ];

        if ($authUser->isSuperAdmin()) {
            $rules['company_id'] = 'required|exists:companies,id';
        }

        $request->validate($rules);

        $companyId = $authUser->isSuperAdmin() ? $request->company_id : $authUser->company_id;

        $route = Route::create([
            'company_id' => $companyId,
            'truck_id' => $request->truck_id,
            'user_id' => $request->user_id,
            'date' => $request->date,
            'status' => 'pendiente',
            'total_distance_km' => $request->total_distance_km,
            'estimated_time_mins' => $request->estimated_time_mins,
            'estimated_fuel_liters' => $request->total_distance_km ? ($request->total_distance_km * 0.15) : null,
        ]);

        foreach ($request->dispatches as $index => $dispatchData) {
            $dispatch = $route->dispatches()->create([
                'client_id' => $dispatchData['client_id'],
                'order_index' => $index,
                'status' => 'pendiente',
            ]);

            if (!empty($dispatchData['products'])) {
                foreach ($dispatchData['products'] as $product) {
                    $dispatch->products()->create([
                        'product_name' => $product['product_name'],
                        'quantity' => $product['quantity'],
                    ]);
                }
            }
        }

        return redirect()->route('routes.index')->with('message', 'Ruta creada exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(\Illuminate\Http\Request $request, Route $route)
    {
        $authUser = Auth::user();
        
        // Authorization check
        if (!$authUser->isSuperAdmin() && $route->company_id !== $authUser->company_id) {
            abort(403);
        }
        if ($authUser->isDriver() && $route->user_id !== $authUser->id) {
            abort(403);
        }

        $route->load(['company', 'truck', 'driver', 'dispatches.client', 'dispatches.products']);

        if ($request->wantsJson()) {
            return response()->json([
                'route' => $route
            ]);
        }

        return Inertia::render('Routes/Show', [
            'route' => $route,
            'isDriver' => $authUser->isDriver(),
        ]);
    }

    public function edit(Route $route)
    {
        $authUser = Auth::user();
        if ($authUser->isDriver()) {
            abort(403, 'No tienes permiso para editar rutas.');
        }
        if (!$authUser->isSuperAdmin() && $route->company_id !== $authUser->company_id) {
            abort(403);
        }

        if ($route->status !== 'pendiente') {
            return redirect()->route('routes.index')->with('error', 'Solo se pueden editar rutas en estado Pendiente.');
        }

        $companies = $authUser->isSuperAdmin() 
            ? Company::orderBy('name')->get(['id', 'name', 'latitude', 'longitude']) 
            : Company::where('id', $authUser->company_id)->get(['id', 'name', 'latitude', 'longitude']);
        
        $companyId = $authUser->isSuperAdmin() ? null : $authUser->company_id;

        $clients = Client::when($companyId, function ($q) use ($companyId) {
            $q->where('company_id', $companyId);
        })->get();

        $trucks = Truck::when($companyId, function ($q) use ($companyId) {
            $q->where('company_id', $companyId);
        })->get();

        $drivers = User::when($companyId, function ($q) use ($companyId) {
            $q->where('company_id', $companyId);
        })->where('role', 'chofer')->get();

        // Load relations and format dispatches for React
        $route->load(['dispatches.client', 'dispatches.products']);
        
        $formattedDispatches = $route->dispatches->map(function ($dispatch) {
            return [
                'id' => $dispatch->id,
                'client_id' => $dispatch->client_id,
                'client_name' => $dispatch->client ? $dispatch->client->name : 'Cliente Eliminado',
                'client_lat' => $dispatch->client ? (float) $dispatch->client->latitude : 0,
                'client_lng' => $dispatch->client ? (float) $dispatch->client->longitude : 0,
                'products' => $dispatch->products->map(function ($product) {
                    return [
                        'product_name' => $product->product_name,
                        'quantity' => $product->quantity,
                    ];
                })->toArray(),
            ];
        })->toArray();

        return Inertia::render('Routes/Edit', [
            'companies' => $companies,
            'clients' => $clients,
            'trucks' => $trucks,
            'drivers' => $drivers,
            'isSuperAdmin' => $authUser->isSuperAdmin(),
            'defaultCompanyId' => $companyId,
            'route' => $route,
            'initialDispatches' => $formattedDispatches,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Route $route)
    {
        $authUser = Auth::user();
        if ($authUser->isDriver()) abort(403);
        if (!$authUser->isSuperAdmin() && $route->company_id !== $authUser->company_id) {
            abort(403);
        }

        // Allow status updates from driver (via API or other means), but for full edits it must be pendiente
        // If this is a partial update (like changing status to 'completada'), we could handle it here.
        // But since this receives the full form:
        if ($request->has('dispatches')) {
            if ($route->status !== 'pendiente') {
                return redirect()->route('routes.index')->with('error', 'Solo se pueden editar rutas en estado Pendiente.');
            }

            $rules = [
                'truck_id' => 'required|exists:trucks,id',
                'user_id' => 'required|exists:users,id',
                'date' => 'required|date',
                'dispatches' => 'required|array|min:1',
            ];
            if ($authUser->isSuperAdmin()) {
                $rules['company_id'] = 'required|exists:companies,id';
            }
            $request->validate($rules);

            $route->update([
                'company_id' => $authUser->isSuperAdmin() ? $request->company_id : $authUser->company_id,
                'truck_id' => $request->truck_id,
                'user_id' => $request->user_id,
                'date' => $request->date,
                'total_distance_km' => $request->total_distance_km,
                'estimated_time_mins' => $request->estimated_time_mins,
                'estimated_fuel_liters' => $request->total_distance_km ? ($request->total_distance_km * 0.15) : null,
            ]);

            // Wipe existing dispatches and recreate them
            $route->dispatches()->delete(); // Depends on cascade delete or manually deleting products

            foreach ($request->dispatches as $index => $dispatchData) {
                $dispatch = $route->dispatches()->create([
                    'client_id' => $dispatchData['client_id'],
                    'order_index' => $index,
                    'status' => 'pendiente',
                ]);

                if (!empty($dispatchData['products'])) {
                    foreach ($dispatchData['products'] as $product) {
                        $dispatch->products()->create([
                            'product_name' => $product['product_name'],
                            'quantity' => $product['quantity'],
                        ]);
                    }
                }
            }

            return redirect()->route('routes.index')->with('message', 'Ruta actualizada exitosamente.');
        } else {
            // Simple status update
            $request->validate([
                'status' => 'required|in:pendiente,en curso,completada'
            ]);
            $route->update(['status' => $request->status]);
            return redirect()->back()->with('message', 'Estado de ruta actualizado.');
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Route $route)
    {
        $authUser = Auth::user();
        if ($authUser->isDriver() || (!$authUser->isSuperAdmin() && $route->company_id !== $authUser->company_id)) {
            abort(403);
        }

        $route->delete();
        return redirect()->route('routes.index')->with('message', 'Ruta eliminada.');
    }

    public function markDispatchDelivered(Request $request, \App\Models\Dispatch $dispatch)
    {
        $authUser = Auth::user();
        // Add basic security check
        if ($authUser->isDriver()) {
            if ($dispatch->route->user_id !== $authUser->id) abort(403);
        } else if (!$authUser->isSuperAdmin()) {
            if ($dispatch->route->company_id !== $authUser->company_id) abort(403);
        }

        $request->validate([
            'observation' => 'nullable|string',
            'products' => 'nullable|array',
            'products.*.id' => 'required|exists:dispatch_products,id',
            'products.*.delivered' => 'required|boolean',
        ]);

        $dispatch->update([
            'status' => 'entregado',
            'dispatched_at' => now(),
            'observation' => $request->observation,
        ]);

        if ($request->has('products')) {
            foreach ($request->products as $prodData) {
                \App\Models\DispatchProduct::where('id', $prodData['id'])
                    ->where('dispatch_id', $dispatch->id)
                    ->update(['delivered' => $prodData['delivered']]);
            }
        }

        // Set route started_at if not set and status to en curso
        $route = $dispatch->route;
        if (is_null($route->started_at)) {
            $route->started_at = now();
            $route->status = 'en curso';
            $route->save();
        } else if ($route->status === 'pendiente') {
            $route->status = 'en curso';
            $route->save();
        }

        // Check if all dispatches are delivered to mark route as completada
        $allDelivered = $route->dispatches()->where('status', '!=', 'entregado')->doesntExist();
        if ($allDelivered) {
            $route->status = 'completada';
            $route->save();
        }

        return redirect()->back()->with('message', 'Entrega confirmada exitosamente.');
    }

    public function startRoute(Request $request, Route $route)
    {
        $authUser = Auth::user();
        if ($authUser->isDriver() && $route->user_id !== $authUser->id) abort(403);
        if (!$authUser->isSuperAdmin() && !$authUser->isDriver() && $route->company_id !== $authUser->company_id) abort(403);

        if (is_null($route->started_at)) {
            $route->started_at = now();
            $route->status = 'en curso';
            $route->save();
        }

        return redirect()->back()->with('message', 'Ruta iniciada correctamente.');
    }
    public function finishRoute(Request $request, Route $route)
    {
        $authUser = Auth::user();
        if ($authUser->isDriver() && $route->user_id !== $authUser->id) abort(403);
        if (!$authUser->isSuperAdmin() && !$authUser->isDriver() && $route->company_id !== $authUser->company_id) abort(403);

        $route->status = 'completada';
        $route->save();

        return redirect()->back()->with('message', 'Ruta finalizada correctamente.');
    }
}
