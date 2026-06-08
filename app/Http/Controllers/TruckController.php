<?php

namespace App\Http\Controllers;

use App\Models\Truck;
use App\Models\Company;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TruckController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $authUser = auth()->user();

        if ($authUser->isSuperAdmin()) {
            $trucks = Truck::with('company')->get();
        } else {
            $trucks = Truck::with('company')
                ->where('company_id', $authUser->company_id)
                ->get();
        }

        $companies = $authUser->isSuperAdmin() ? Company::orderBy('name')->get(['id', 'name']) : [];

        return Inertia::render('Trucks/Index', [
            'trucks' => $trucks,
            'companies' => $companies,
            'isSuperAdmin' => $authUser->isSuperAdmin(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $authUser = auth()->user();
        $companies = $authUser->isSuperAdmin() ? Company::orderBy('name')->get(['id', 'name']) : [];

        return Inertia::render('Trucks/Create', [
            'companies' => $companies,
            'isSuperAdmin' => $authUser->isSuperAdmin(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $authUser = auth()->user();

        $rules = [
            'license_plate' => 'required|string|max:50|unique:trucks,license_plate',
            'model' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ];

        if ($authUser->isSuperAdmin()) {
            $rules['company_id'] = 'required|exists:companies,id';
        }

        $request->validate($rules);

        Truck::create([
            'company_id' => $authUser->isSuperAdmin() ? $request->company_id : $authUser->company_id,
            'license_plate' => strtoupper($request->license_plate),
            'model' => $request->model,
            'description' => $request->description,
        ]);

        return redirect()->route('trucks.index')->with('message', 'Camión registrado exitosamente.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Truck $truck)
    {
        $authUser = auth()->user();
        
        // Authorization check
        if (!$authUser->isSuperAdmin() && $truck->company_id !== $authUser->company_id) {
            abort(403, 'No autorizado.');
        }

        $companies = $authUser->isSuperAdmin() ? Company::orderBy('name')->get(['id', 'name']) : [];

        return Inertia::render('Trucks/Edit', [
            'truck' => $truck->load('company'),
            'companies' => $companies,
            'isSuperAdmin' => $authUser->isSuperAdmin(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Truck $truck)
    {
        $authUser = auth()->user();

        // Authorization check
        if (!$authUser->isSuperAdmin() && $truck->company_id !== $authUser->company_id) {
            abort(403, 'No autorizado.');
        }

        $rules = [
            'license_plate' => 'required|string|max:50|unique:trucks,license_plate,' . $truck->id,
            'model' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ];

        if ($authUser->isSuperAdmin()) {
            $rules['company_id'] = 'required|exists:companies,id';
        }

        $request->validate($rules);

        $truck->update([
            'company_id' => $authUser->isSuperAdmin() ? $request->company_id : $authUser->company_id,
            'license_plate' => strtoupper($request->license_plate),
            'model' => $request->model,
            'description' => $request->description,
        ]);

        return redirect()->route('trucks.index')->with('message', 'Camión actualizado exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Truck $truck)
    {
        $authUser = auth()->user();

        // Authorization check
        if (!$authUser->isSuperAdmin() && $truck->company_id !== $authUser->company_id) {
            abort(403, 'No autorizado.');
        }

        $truck->delete();
        return redirect()->route('trucks.index')->with('message', 'Camión eliminado exitosamente.');
    }
}
