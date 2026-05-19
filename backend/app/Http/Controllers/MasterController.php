<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MasterController extends Controller
{
    // ===== DEPARTMENTS =====

    public function getDepartments(Request $request)
    {
        $query = DB::connection('pilargroup')
            ->table('master_departments as md')
            ->leftJoin('master_companies as mc', 'md.company_id', '=', 'mc.id')
            ->leftJoin('master_departments as parent', 'md.parent_id', '=', 'parent.id')
            ->select(
                'md.id',
                'md.name',
                'md.class',
                'md.code',
                'md.company_id',
                'mc.name as company_name',
                'mc.code as company_code',
                'md.parent_id',
                'parent.name as parent_name',
                'md.is_active',
                'md.created_at',
                'md.updated_at'
            )
            ->orderBy('md.company_id')
            ->orderBy('md.parent_id')
            ->orderBy('md.name');

        // Optional filter by company
        if ($request->filled('company_id')) {
            $query->where('md.company_id', $request->input('company_id'));
        }

        // Optional: hanya parent departments (tanpa sub)
        if ($request->boolean('root_only')) {
            $query->whereNull('md.parent_id');
        }

        return response()->json($query->get());
    }

    public function storeDepartment(Request $request)
    {
        $request->validate([
            'name'       => 'required|string|max:100',
            'class'      => 'nullable|string|max:100',
            'code'       => 'required|string|max:10',
            'company_id' => 'required|string|exists:pilargroup.master_companies,id',
            'parent_id'  => 'nullable|integer|exists:pilargroup.master_departments,id',
            'is_active'  => 'nullable|boolean',
        ]);

        $maxId = DB::connection('pilargroup')
            ->table('master_departments')
            ->max('id') ?? 0;

        $newId = $maxId + 1;

        DB::connection('pilargroup')
            ->table('master_departments')
            ->insert([
                'id'         => $newId,
                'name'       => $request->input('name'),
                'class'      => $request->input('class', $request->input('name')),
                'code'       => strtoupper($request->input('code')),
                'company_id' => $request->input('company_id'),
                'parent_id'  => $request->input('parent_id'),
                'is_active'  => (int) $request->input('is_active', 1),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json([
            'id'      => $newId,
            'message' => 'Department created'
        ], 201);
    }

    public function updateDepartment(Request $request, $id)
    {
        $request->validate([
            'name'       => 'nullable|string|max:100',
            'class'      => 'nullable|string|max:100',
            'code'       => 'nullable|string|max:10',
            'company_id' => 'nullable|string|exists:pilargroup.master_companies,id',
            'parent_id'  => 'nullable|integer|exists:pilargroup.master_departments,id',
            'is_active'  => 'nullable|boolean',
        ]);

        $dept = DB::connection('pilargroup')
            ->table('master_departments')
            ->where('id', $id)
            ->first();

        if (!$dept) {
            return response()->json(['message' => 'Department not found'], 404);
        }

        // Cegah parent_id nunjuk ke dirinya sendiri
        if ($request->filled('parent_id') && (int)$request->input('parent_id') === (int)$id) {
            return response()->json(['message' => 'Department tidak bisa jadi parent dirinya sendiri'], 422);
        }

        $updates = ['updated_at' => now()];
        if ($request->filled('name'))       $updates['name']       = $request->input('name');
        if ($request->filled('class'))      $updates['class']      = $request->input('class');
        if ($request->filled('code'))       $updates['code']       = strtoupper($request->input('code'));
        if ($request->filled('company_id')) $updates['company_id'] = $request->input('company_id');
        if ($request->has('parent_id'))     $updates['parent_id']  = $request->input('parent_id'); // bisa null
        if ($request->has('is_active'))     $updates['is_active']  = (int) $request->input('is_active');

        DB::connection('pilargroup')
            ->table('master_departments')
            ->where('id', $id)
            ->update($updates);

        return response()->json(['message' => 'Department updated']);
    }

    public function deleteDepartment($id)
    {
        $dept = DB::connection('pilargroup')
            ->table('master_departments')->where('id', $id)->first();

        if (!$dept) {
            return response()->json(['message' => 'Department not found'], 404);
        }

        // Cek apakah masih ada user di dept ini
        $inUse = DB::connection('pilargroup')
            ->table('central_user_departments')
            ->where('department_id', $id)
            ->exists();

        if ($inUse) {
            return response()->json(['message' => 'Department masih digunakan oleh user'], 422);
        }

        // Cek apakah ada sub-departments
        $hasSubs = DB::connection('pilargroup')
            ->table('master_departments')
            ->where('parent_id', $id)
            ->exists();

        if ($hasSubs) {
            return response()->json(['message' => 'Department masih punya sub-department, hapus sub-department dulu'], 422);
        }

        DB::connection('pilargroup')->table('master_departments')->where('id', $id)->delete();

        return response()->json(['message' => 'Department deleted']);
    }

    // ===== PROJECTS =====

    public function getProjects(Request $request)
    {
        // Get all projects, ignoring any default limits
        $limit = $request->input('limit', null);
        $query = DB::connection('pilargroup')
            ->table('master_projects')
            ->orderBy('name');
        
        if ($limit && $limit != -1) {
            $query->limit($limit);
        }
        
        $projects = $query->get();
        
        \Log::info('Projects fetched', [
            'count' => count($projects),
            'limit' => $limit
        ]);
        
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

    public function getJobLevels()
    {
        $jobLevels = DB::connection('pilargroup')
            ->table('master_job_levels')
            ->orderBy('level', 'desc')
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'level']);

        return response()->json($jobLevels);
    }

    public function storeJobLevel(Request $request)
    {
        $request->validate([
            'name'  => 'required|string|max:100',
            'level' => 'required|integer|min:1',
        ]);

        $exists = DB::connection('pilargroup')
            ->table('master_job_levels')
            ->where('name', $request->name)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Job level already exists'], 422);
        }

        $id = DB::connection('pilargroup')
            ->table('master_job_levels')
            ->insertGetId([
                'name'       => $request->name,
                'level'      => $request->level,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'Job level created successfully',
            'id'      => $id,
        ], 201);
    }

    // PUT /api/master/job-levels/{id}
    public function updateJobLevel(Request $request, $id)
    {
        $request->validate([
            'name'  => 'nullable|string|max:100',
            'level' => 'nullable|integer|min:1',
        ]);

        $jobLevel = DB::connection('pilargroup')
            ->table('master_job_levels')
            ->where('id', $id)
            ->first();

        if (!$jobLevel) {
            return response()->json(['message' => 'Job level not found'], 404);
        }

        $updates = ['updated_at' => now()];

        if ($request->filled('name')) {
            $exists = DB::connection('pilargroup')
                ->table('master_job_levels')
                ->where('name', $request->name)
                ->where('id', '!=', $id)
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'Job level name already exists'], 422);
            }

            $updates['name'] = $request->name;
        }

        if ($request->filled('level')) {
            $updates['level'] = $request->level;
        }

        DB::connection('pilargroup')
            ->table('master_job_levels')
            ->where('id', $id)
            ->update($updates);

        return response()->json(['message' => 'Job level updated successfully']);
    }

    // DELETE /api/master/job-levels/{id}
    public function destroyJobLevel($id)
    {
        $jobLevel = DB::connection('pilargroup')
            ->table('master_job_levels')
            ->where('id', $id)
            ->first();

        if (!$jobLevel) {
            return response()->json(['message' => 'Job level not found'], 404);
        }

        // Cek apakah job level masih dipakai user
        $inUse = DB::connection('pilargroup')
            ->table('central_users')
            ->where('job_level_id', $id)
            ->exists();

        if ($inUse) {
            return response()->json([
                'message' => 'Job level masih digunakan oleh user, tidak bisa dihapus'
            ], 422);
        }

        DB::connection('pilargroup')
            ->table('master_job_levels')
            ->where('id', $id)
            ->delete();

        return response()->json(['message' => 'Job level deleted successfully']);
    }

    // ===== COMPANIES =====

    public function getCompanies()
    {
        $companies = DB::connection('pilargroup')
            ->table('master_companies')
            ->orderBy('name')
            ->get();

        return response()->json($companies);
    }

    public function storeCompany(Request $request)
    {
        $request->validate([
            'code'      => 'required|string|max:10|unique:pilargroup.master_companies,code',
            'name'      => 'required|string|max:150',
            'is_active' => 'nullable|boolean',
        ]);

        $id = Str::uuid()->toString();

        DB::connection('pilargroup')
            ->table('master_companies')
            ->insert([
                'id'         => $id,
                'code'       => strtoupper($request->input('code')),
                'name'       => $request->input('name'),
                'is_active'  => (int) $request->input('is_active', 1),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json(['id' => $id, 'message' => 'Company created'], 201);
    }

    public function updateCompany(Request $request, $id)
    {
        $company = DB::connection('pilargroup')
            ->table('master_companies')->where('id', $id)->first();

        if (!$company) {
            return response()->json(['message' => 'Company not found'], 404);
        }

        $request->validate([
            'code'      => 'nullable|string|max:10|unique:pilargroup.master_companies,code,' . $id . ',id',
            'name'      => 'nullable|string|max:150',
            'is_active' => 'nullable|boolean',
        ]);

        $updates = ['updated_at' => now()];
        if ($request->filled('code'))   $updates['code']      = strtoupper($request->input('code'));
        if ($request->filled('name'))   $updates['name']      = $request->input('name');
        if ($request->has('is_active')) $updates['is_active'] = (int) $request->input('is_active');

        DB::connection('pilargroup')->table('master_companies')->where('id', $id)->update($updates);

        return response()->json(['message' => 'Company updated']);
    }

    public function deleteCompany($id)
    {
        $company = DB::connection('pilargroup')
            ->table('master_companies')->where('id', $id)->first();

        if (!$company) {
            return response()->json(['message' => 'Company not found'], 404);
        }

        $hasDepts = DB::connection('pilargroup')
            ->table('master_departments')
            ->where('company_id', $id)
            ->exists();

        if ($hasDepts) {
            return response()->json(['message' => 'Company masih punya department, pindahkan atau hapus department dulu'], 422);
        }

        DB::connection('pilargroup')->table('master_companies')->where('id', $id)->delete();

        return response()->json(['message' => 'Company deleted']);
    }
    
}
