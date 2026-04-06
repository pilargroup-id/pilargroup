<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MasterController extends Controller
{
    // ===== DEPARTMENTS =====

    public function getDepartments()
    {
        $departments = DB::connection('pilargroup')
            ->table('master_departments')
            ->orderBy('name')
            ->get();
        return response()->json($departments);
    }

    public function storeDepartment(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:pilargroup.master_departments,name',
        ]);

        $maxId = DB::connection('pilargroup')
            ->table('master_departments')
            ->max('id') ?? 0;

        $newId = $maxId + 1;

        DB::connection('pilargroup')
            ->table('master_departments')
            ->insert([
                'id'   => $newId,
                'name' => $request->input('name'),
            ]);

        return response()->json([
            'id' => $newId,
            'name' => $request->input('name'),
            'message' => 'Department created'
        ], 201);
    }

    public function updateDepartment(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|unique:pilargroup.master_departments,name,' . $id,
        ]);

        DB::connection('pilargroup')
            ->table('master_departments')
            ->where('id', $id)
            ->update(['name' => $request->input('name')]);

        return response()->json(['message' => 'Department updated']);
    }

    public function deleteDepartment($id)
    {
        $inUse = DB::connection('pilargroup')
            ->table('central_users')
            ->where('department_id', $id)
            ->exists();

        if ($inUse) {
            return response()->json(['message' => 'Department masih digunakan oleh user'], 422);
        }

        DB::connection('pilargroup')
            ->table('master_departments')
            ->where('id', $id)
            ->delete();

        return response()->json(['message' => 'Department deleted']);
    }

    // ===== PROJECTS =====

    public function getProjects()
    {
        $projects = DB::connection('pilargroup')
            ->table('master_projects')
            ->orderBy('name')
            ->get();
        return response()->json($projects);
    }

    public function storeProject(Request $request)
    {
        $request->validate([
            'name'        => 'required|string',
            'url'         => 'nullable|url',
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ]);

        // Slug otomatis dari name
        $slug = strtolower(str_replace(' ', '', $request->input('name')));

        // Cek slug sudah ada
        $slugExists = DB::connection('pilargroup')
            ->table('master_projects')
            ->where('slug', $slug)
            ->exists();

        if ($slugExists) {
            return response()->json(['message' => 'Project dengan nama ini sudah ada'], 422);
        }

        DB::connection('pilargroup')
            ->table('master_projects')
            ->insert([
                'id'          => Str::uuid()->toString(),
                'name'        => $request->input('name'),
                'slug'        => $slug,
                'url'         => $request->input('url'),
                'description' => $request->input('description'),
                'is_active'   => (int) $request->input('is_active', 1),
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);

        return response()->json(['message' => 'Project created'], 201);
    }

    public function updateProject(Request $request, $id)
    {
        $request->validate([
            'name'        => 'nullable|string',
            'url'         => 'nullable|url',
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ]);

        $updates = ['updated_at' => now()];

        if ($request->input('name')) {
            $newSlug = strtolower(str_replace(' ', '', $request->input('name')));

            $slugExists = DB::connection('pilargroup')
                ->table('master_projects')
                ->where('slug', $newSlug)
                ->where('id', '!=', $id)
                ->exists();

            if ($slugExists) {
                return response()->json(['message' => 'Project dengan nama ini sudah ada'], 422);
            }

            $updates['name'] = $request->input('name');
            $updates['slug'] = $newSlug;
        }

        if ($request->input('url') !== null) $updates['url']         = $request->input('url');
        if ($request->input('description'))  $updates['description'] = $request->input('description');
        if (!is_null($request->input('is_active'))) $updates['is_active'] = (int) $request->input('is_active');

        DB::connection('pilargroup')
            ->table('master_projects')
            ->where('id', $id)
            ->update($updates);

        return response()->json(['message' => 'Project updated']);
    }

    public function deleteProject($id)
    {
        $inUse = DB::connection('pilargroup')
            ->table('central_user_projects')
            ->where('project_id', $id)
            ->exists();

        if ($inUse) {
            return response()->json(['message' => 'Project masih digunakan oleh user'], 422);
        }

        DB::connection('pilargroup')
            ->table('master_projects')
            ->where('id', $id)
            ->delete();

        return response()->json(['message' => 'Project deleted']);
    }
}
