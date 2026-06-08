<?php

namespace App\Http\Controllers;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CompanyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $companies = Company::with('users:id,name,company_id,role')->get();
        return Inertia::render('Companies/Index', [
            'companies' => $companies,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Companies/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'      => 'required|string|max:255',
            'tax_id'    => 'required|string|max:50|unique:companies,tax_id',
            'address'   => 'nullable|string|max:1000',
            'phone'     => 'nullable|string|max:20',
            'latitude'  => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'logo'      => 'nullable|image|max:2048', // up to 2MB
        ]);

        $logoPath = null;
        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $filename = 'logo_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $logoPath = $file->storeAs('companies', $filename, 'public');
        }

        Company::create([
            'name'      => $request->name,
            'logo'      => $logoPath,
            'tax_id'    => $request->tax_id,
            'address'   => $request->address,
            'phone'     => $request->phone,
            'latitude'  => $request->latitude,
            'longitude' => $request->longitude,
        ]);

        return redirect()->route('companies.index')
            ->with('message', 'Empresa creada con éxito.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Company $company)
    {
        return Inertia::render('Companies/Edit', [
            'company' => $company,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Company $company)
    {
        $request->validate([
            'name'      => 'required|string|max:255',
            'tax_id'    => 'required|string|max:50|unique:companies,tax_id,' . $company->id,
            'address'   => 'nullable|string|max:1000',
            'phone'     => 'nullable|string|max:20',
            'latitude'  => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'logo'      => 'nullable|image|max:2048',
        ]);

        $data = [
            'name'      => $request->name,
            'tax_id'    => $request->tax_id,
            'address'   => $request->address,
            'phone'     => $request->phone,
            'latitude'  => $request->latitude,
            'longitude' => $request->longitude,
        ];

        if ($request->hasFile('logo')) {
            if ($company->logo) {
                Storage::disk('public')->delete($company->logo);
            }
            $file = $request->file('logo');
            $filename = 'logo_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $data['logo'] = $file->storeAs('companies', $filename, 'public');
        }

        $company->update($data);

        return redirect()->route('companies.index')
            ->with('message', 'Empresa actualizada con éxito.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Company $company)
    {
        $company->delete();
        return redirect()->route('companies.index')
            ->with('message', 'Empresa eliminada con éxito.');
    }
}
