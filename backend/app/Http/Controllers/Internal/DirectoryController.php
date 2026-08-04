<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DirectoryController extends Controller
{
    public function users(Request $request)
    {
        $department = $request->query('department');
        $departmentId = $request->query('department_id');
        $companyId = $request->query('company_id');
        $active = $request->query('active', 1);
        $search = $request->query('search');

        $query = DB::connection('pilargroup')
            ->table('central_users as cu')
            ->leftJoin('master_job_levels as mjl', 'cu.job_level_id', '=', 'mjl.id')
            ->select([
                'cu.id',
                'cu.internal_id',
                'cu.username',
                'cu.email',
                'cu.phone',
                'cu.name',
                'cu.job_position',
                'cu.job_level_id',
                'mjl.name as job_level',
                'mjl.level as job_level_value',
                'cu.employment_type_code',
                'cu.is_active',
            ]);

        if ($active !== null && $active !== 'all') {
            $query->where('cu.is_active', (int) $active);
        }

        if ($department || $departmentId) {
            $query->whereExists(function ($subQuery) use ($department, $departmentId) {
                $subQuery
                    ->select(DB::raw(1))
                    ->from('central_user_departments as filter_cud')
                    ->join('master_departments as filter_md', 'filter_md.id', '=', 'filter_cud.department_id')
                    ->whereColumn('filter_cud.user_id', 'cu.id');

                if ($department) {
                    $subQuery->where(function ($departmentQuery) use ($department) {
                        $departmentQuery
                            ->where('filter_md.name', $department)
                            ->orWhere('filter_md.class', $department)
                            ->orWhere('filter_md.code', $department);
                    });
                }

                if ($departmentId) {
                    $subQuery->where('filter_md.id', (int) $departmentId);
                }
            });
        }

        if ($companyId) {
            $query->whereExists(function ($subQuery) use ($companyId) {
                $subQuery
                    ->select(DB::raw(1))
                    ->from('central_user_companies as filter_cuc')
                    ->whereColumn('filter_cuc.user_id', 'cu.id')
                    ->where('filter_cuc.company_id', $companyId);
            });
        }

        if ($search) {
            $query->where(function ($searchQuery) use ($search) {
                $searchQuery
                    ->where('cu.name', 'like', "%{$search}%")
                    ->orWhere('cu.username', 'like', "%{$search}%")
                    ->orWhere('cu.email', 'like', "%{$search}%")
                    ->orWhere('cu.internal_id', 'like', "%{$search}%");
            });
        }

        $users = $query
            ->orderBy('cu.name')
            ->get();

        $userIds = $users->pluck('id')->filter()->values();

        if ($userIds->isEmpty()) {
            return response()->json([
                'message' => 'Users fetched successfully',
                'data' => [],
            ]);
        }

        $departmentRows = DB::connection('pilargroup')
            ->table('central_user_departments as cud')
            ->join('master_departments as md', 'md.id', '=', 'cud.department_id')
            ->whereIn('cud.user_id', $userIds)
            ->select([
                'cud.user_id',
                'md.id',
                'md.name',
                'md.class',
                'md.code',
                'md.company_id',
                'md.parent_id',
                'md.is_active',
                'cud.is_primary',
            ])
            ->orderByDesc('cud.is_primary')
            ->orderBy('md.name')
            ->get()
            ->groupBy('user_id');

        $companyRows = DB::connection('pilargroup')
            ->table('central_user_companies as cuc')
            ->join('master_companies as mc', 'mc.id', '=', 'cuc.company_id')
            ->whereIn('cuc.user_id', $userIds)
            ->select([
                'cuc.user_id',
                'mc.id',
                'mc.code',
                'mc.name',
                'mc.is_active',
                'cuc.is_primary',
            ])
            ->orderByDesc('cuc.is_primary')
            ->orderBy('mc.name')
            ->get()
            ->groupBy('user_id');

        $data = $users->map(function ($user) use ($departmentRows, $companyRows) {
            $departments = collect($departmentRows->get($user->id, collect()))
                ->map(function ($department) {
                    return [
                        'id' => $department->id,
                        'name' => $department->name,
                        'class' => $department->class,
                        'code' => $department->code,
                        'company_id' => $department->company_id,
                        'parent_id' => $department->parent_id,
                        'is_active' => $department->is_active,
                        'is_primary' => $department->is_primary,
                    ];
                })
                ->values();

            $companies = collect($companyRows->get($user->id, collect()))
                ->map(function ($company) {
                    return [
                        'id' => $company->id,
                        'code' => $company->code,
                        'name' => $company->name,
                        'is_active' => $company->is_active,
                        'is_primary' => $company->is_primary,
                    ];
                })
                ->values();

            $primaryDepartment = $departments->firstWhere('is_primary', 1) ?? $departments->first();
            $primaryCompany = $companies->firstWhere('is_primary', 1) ?? $companies->first();

            return [
                'id' => $user->id,
                'internal_id' => $user->internal_id,
                'username' => $user->username,
                'email' => $user->email,
                'phone' => $user->phone,
                'name' => $user->name,
                'job_position' => $user->job_position,
                'job_level_id' => $user->job_level_id,
                'job_level' => $user->job_level,
                'job_level_value' => $user->job_level_value,
                'employment_type_code' => $user->employment_type_code,
                'is_active' => $user->is_active,

                // Backward-compatible primary fields.
                'department_id' => $primaryDepartment['id'] ?? null,
                'department_name' => $primaryDepartment['name'] ?? null,
                'department_class' => $primaryDepartment['class'] ?? null,
                'department_code' => $primaryDepartment['code'] ?? null,
                'company_id' => $primaryCompany['id'] ?? ($primaryDepartment['company_id'] ?? null),
                'is_primary' => $primaryDepartment['is_primary'] ?? null,

                // Complete organization memberships.
                'departments' => $departments,
                'companies' => $companies,
            ];
        })->values();

        return response()->json([
            'message' => 'Users fetched successfully',
            'data' => $data,
        ]);
    }

    public function departments(Request $request)
    {
        $companyId = $request->query('company_id');
        $active = $request->query('active', 1);

        $query = DB::connection('pilargroup')
            ->table('master_departments')
            ->select([
                'id',
                'name',
                'class',
                'code',
                'company_id',
                'parent_id',
                'is_active',
            ]);

        if ($active !== null && $active !== 'all') {
            $query->where('is_active', (int) $active);
        }

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $departments = $query
            ->orderBy('name')
            ->get();

        return response()->json([
            'message' => 'Departments fetched successfully',
            'data' => $departments,
        ]);
    }

    public function companies(Request $request)
    {
        $active = $request->query('active', 1);
        $search = $request->query('search');

        $query = DB::connection('pilargroup')
            ->table('master_companies')
            ->select([
                'id',
                'code',
                'name',
                'is_active',
            ]);

        if ($active !== null && $active !== 'all') {
            $query->where('is_active', (int) $active);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $companies = $query
            ->orderBy('name')
            ->get();

        return response()->json([
            'message' => 'Companies fetched successfully',
            'data' => $companies,
        ]);
    }

    public function businessUnits(Request $request)
    {
        $companyId = $request->query('company_id');
        $active = $request->query('active', 1);
        $search = $request->query('search');

        $query = DB::connection('pilargroup')
            ->table('master_business_units as bu')
            ->leftJoin('master_companies as mc', 'mc.id', '=', 'bu.company_id')
            ->select([
                'bu.id',
                'bu.company_id',
                'mc.code as company_code',
                'mc.name as company_name',
                'bu.code',
                'bu.name',
                'bu.is_active',
            ]);

        if ($active !== null && $active !== 'all') {
            $query->where('bu.is_active', (int) $active);
        }

        if ($companyId) {
            $query->where('bu.company_id', $companyId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('bu.code', 'like', "%{$search}%")
                    ->orWhere('bu.name', 'like', "%{$search}%");
            });
        }

        $businessUnits = $query
            ->orderBy('bu.name')
            ->get();

        return response()->json([
            'message' => 'Business units fetched successfully',
            'data' => $businessUnits,
        ]);
    }

    public function businessUnitDepartments(Request $request, string $id)
    {
        $active = $request->query('active', 1);
        $search = $request->query('search');

        $query = DB::connection('pilargroup')
            ->table('master_business_unit_departments as bud')
            ->join('master_business_units as bu', 'bu.id', '=', 'bud.business_unit_id')
            ->join('master_departments as md', 'md.id', '=', 'bud.department_id')
            ->select([
                'bud.id',
                'bud.business_unit_id',
                'bu.code as business_unit_code',
                'bu.name as business_unit_name',
                'bud.department_id',
                'md.code as department_code',
                'md.name as department_name',
                'bud.is_primary',
                'bud.is_active',
            ])
            ->where('bud.business_unit_id', $id);

        if ($active !== null && $active !== 'all') {
            $query->where('bud.is_active', (int) $active);
            $query->where('md.is_active', (int) $active);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('md.code', 'like', "%{$search}%")
                    ->orWhere('md.name', 'like', "%{$search}%");
            });
        }

        $departments = $query
            ->orderByDesc('bud.is_primary')
            ->orderBy('md.name')
            ->get();

        return response()->json([
            'message' => 'Business unit departments fetched successfully',
            'data' => $departments,
        ]);
    }
}
