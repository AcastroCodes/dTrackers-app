<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Company;
use App\Models\User;
use Inertia\Inertia;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     * Superadmin ve todos los usuarios; otros solo ven los de su empresa.
     */
    public function index()
    {
        $authUser = auth()->user();

        if ($authUser->isSuperAdmin()) {
            $users = User::with('company')->get();
        } else {
            $users = User::with('company')
                ->where('company_id', $authUser->company_id)
                ->where('role', 'chofer')
                ->get();
        }

        return Inertia::render('Users/Index', [
            'users' => $users,
            'companies' => Company::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Users/Create', [
            'companies' => Company::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $authUser = auth()->user();

        // Security Override: If not Superadmin, force role and company_id
        if (!$authUser->isSuperAdmin()) {
            $request->merge([
                'role' => 'chofer',
                'company_id' => $authUser->company_id,
            ]);
        }

        $rules = [
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|lowercase|email|max:255|unique:' . User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role'     => 'required|string|in:superadmin,administrador,chofer',
        ];

        // Si no es superadmin, la empresa es obligatoria
        if ($request->role !== 'superadmin') {
            $rules['company_id'] = 'required|exists:companies,id';
        }

        $request->validate($rules);

        User::create([
            'name'       => $request->name,
            'email'      => $request->email,
            'password'   => Hash::make($request->password),
            'role'       => $request->role,
            'company_id' => $request->role === 'superadmin' ? null : $request->company_id,
        ]);

        return redirect()->route('users.index')->with('message', 'Usuario creado exitosamente.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $user)
    {
        return Inertia::render('Users/Edit', [
            'user'      => $user->load('company'),
            'companies' => Company::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        $authUser = auth()->user();

        // Security Override: If not Superadmin, force role and company_id
        if (!$authUser->isSuperAdmin()) {
            $request->merge([
                'role' => 'chofer',
                'company_id' => $authUser->company_id,
            ]);
        }

        $rules = [
            'name'  => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users,email,' . $user->id,
            'role'  => 'required|string|in:superadmin,administrador,chofer',
        ];

        if ($request->role !== 'superadmin') {
            $rules['company_id'] = 'required|exists:companies,id';
        }

        $request->validate($rules);

        $user->update([
            'name'       => $request->name,
            'email'      => $request->email,
            'role'       => $request->role,
            'company_id' => $request->role === 'superadmin' ? null : $request->company_id,
        ]);

        if ($request->filled('password')) {
            $request->validate([
                'password' => ['confirmed', Rules\Password::defaults()],
            ]);
            $user->update([
                'password' => Hash::make($request->password),
            ]);
        }

        return redirect()->route('users.index')->with('message', 'Usuario actualizado exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        $authUser = auth()->user();

        // No permitir borrar si es de otra empresa (si no es superadmin)
        if (!$authUser->isSuperAdmin() && $user->company_id !== $authUser->company_id) {
            abort(403, 'No tienes permiso para eliminar este usuario.');
        }

        $user->delete();

        return redirect()->route('users.index')->with('message', 'Usuario eliminado exitosamente.');
    }
}
