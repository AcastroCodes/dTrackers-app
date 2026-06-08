<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Company;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class ClientController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $authUser = Auth::user();

        if ($authUser->isSuperAdmin()) {
            $clients = Client::with('company')->get();
        } else {
            $clients = Client::with('company')
                ->where('company_id', $authUser->company_id)
                ->get();
        }

        $companies = $authUser->isSuperAdmin() ? Company::orderBy('name')->get(['id', 'name']) : [];

        return Inertia::render('Clients/Index', [
            'clients' => $clients,
            'companies' => $companies,
            'isSuperAdmin' => $authUser->isSuperAdmin(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $authUser = Auth::user();
        $companies = $authUser->isSuperAdmin() ? Company::orderBy('name')->get(['id', 'name']) : [];

        return Inertia::render('Clients/Create', [
            'companies' => $companies,
            'isSuperAdmin' => $authUser->isSuperAdmin(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $authUser = Auth::user();

        $rules = [
            'name'      => 'required|string|max:255',
            'address'   => 'nullable|string|max:1000',
            'reference' => 'nullable|string|max:1000',
            'latitude'  => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ];

        if ($authUser->isSuperAdmin()) {
            $rules['company_id'] = 'required|exists:companies,id';
        }

        $request->validate($rules);

        $client = Client::create([
            'company_id' => $authUser->isSuperAdmin() ? $request->company_id : $authUser->company_id,
            'name'       => $request->name,
            'address'    => $request->address,
            'reference'  => $request->reference,
            'latitude'   => $request->latitude,
            'longitude'  => $request->longitude,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Cliente registrado.', 'client' => $client]);
        }

        return redirect()->route('clients.index')->with('message', 'Cliente registrado exitosamente.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Client $client)
    {
        $authUser = Auth::user();
        
        // Authorization check
        if (!$authUser->isSuperAdmin() && $client->company_id !== $authUser->company_id) {
            abort(403, 'No autorizado.');
        }

        $companies = $authUser->isSuperAdmin() ? Company::orderBy('name')->get(['id', 'name']) : [];

        return Inertia::render('Clients/Edit', [
            'client'       => $client->load('company'),
            'companies'    => $companies,
            'isSuperAdmin' => $authUser->isSuperAdmin(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Client $client)
    {
        $authUser = Auth::user();

        // Authorization check
        if (!$authUser->isSuperAdmin() && $client->company_id !== $authUser->company_id) {
            abort(403, 'No autorizado.');
        }

        $rules = [
            'name'      => 'required|string|max:255',
            'address'   => 'nullable|string|max:1000',
            'reference' => 'nullable|string|max:1000',
            'latitude'  => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ];

        if ($authUser->isSuperAdmin()) {
            $rules['company_id'] = 'required|exists:companies,id';
        }

        $request->validate($rules);

        $client->update([
            'company_id' => $authUser->isSuperAdmin() ? $request->company_id : $authUser->company_id,
            'name'       => $request->name,
            'address'    => $request->address,
            'reference'  => $request->reference,
            'latitude'   => $request->latitude,
            'longitude'  => $request->longitude,
        ]);

        return redirect()->route('clients.index')->with('message', 'Cliente actualizado exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Client $client)
    {
        $authUser = Auth::user();

        // Authorization check
        if (!$authUser->isSuperAdmin() && $client->company_id !== $authUser->company_id) {
            abort(403, 'No autorizado.');
        }

        $client->delete();
        return redirect()->route('clients.index')->with('message', 'Cliente eliminado exitosamente.');
    }
}
