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
            ->leftJoin('central_user_departments as cud', 'cud.user_id', '=', 'cu.id')
            ->leftJoin('master_departments as md', 'md.id', '=', 'cud.department_id')
            ->select([
                'cu.id',
                'cu.internal_id',
                'cu.username',
                'cu.email',
                'cu.phone',
                'cu.name',
                'cu.job_position',
                'cu.job_level_id',
                'cu.is_active',
                'md.id as department_id',
                'md.name as department_name',
                'md.class as department_class',
                'md.code as department_code',
                'md.company_id',
                'cud.is_primary',
            ]);

        if ($active !== null && $active !== 'all') {
            $query->where('cu.is_active', (int) $active);
        }

        if ($department) {
            $query->where(function ($q) use ($department) {
                $q->where('md.name', $department)
                    ->orWhere('md.class', $department)
                    ->orWhere('md.code', $department);
            });
        }

        if ($departmentId) {
            $query->where('md.id', (int) $departmentId);
        }

        if ($companyId) {
            $query->where('md.company_id', $companyId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('cu.name', 'like', "%{$search}%")
                    ->orWhere('cu.username', 'like', "%{$search}%")
                    ->orWhere('cu.email', 'like', "%{$search}%");
            });
        }

        $users = $query
            ->orderBy('cu.name')
            ->get();

        return response()->json([
            'message' => 'Users fetched successfully',
            'data' => $users,
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