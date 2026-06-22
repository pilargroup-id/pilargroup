<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BusinessUnitController extends Controller
{
    // ─────────────────────────────────────────────
    // HELPER: get nested departments
    // ─────────────────────────────────────────────
    private function getBusinessUnitDepartments(string $businessUnitId)
    {
        return DB::connection('pilargroup')
            ->table('master_business_unit_departments as bud')
            ->join('master_departments as md', 'bud.department_id', '=', 'md.id')
            ->where('bud.business_unit_id', $businessUnitId)
            ->select(
                'bud.id as pivot_id',
                'md.id',
                'md.name',
                'md.class',
                'md.code',
                'md.company_id',
                'md.parent_id',
                'bud.is_primary',
                'bud.is_active',
                'bud.created_at',
                'bud.updated_at'
            )
            ->orderByRaw('bud.is_primary DESC')
            ->orderBy('md.name')
            ->get();
    }

    // ─────────────────────────────────────────────
    // HELPER: normalize departments
    // ─────────────────────────────────────────────
    private function normalizeDepartments(array $departments): array
    {
        $normalized = collect($departments)
            ->filter(fn ($department) => isset($department['id']))
            ->unique('id')
            ->values()
            ->map(function ($department) {
                return [
                    'id' => (int) $department['id'],
                    'is_primary' => !empty($department['is_primary']) ? 1 : 0,
                    'is_active' => array_key_exists('is_active', $department)
                        ? (int) (bool) $department['is_active']
                        : 1,
                ];
            })
            ->toArray();

        if (count($normalized) === 0) {
            return [];
        }

        $primaryIndex = null;

        foreach ($normalized as $index => $department) {
            if ((int) $department['is_primary'] === 1) {
                $primaryIndex = $index;
                break;
            }
        }

        if ($primaryIndex === null) {
            $primaryIndex = 0;
        }

        foreach ($normalized as $index => &$department) {
            $department['is_primary'] = $index === $primaryIndex ? 1 : 0;
        }

        return $normalized;
    }

    // ─────────────────────────────────────────────
    // HELPER: validate department company relation
    // ─────────────────────────────────────────────
    private function departmentsBelongToCompany(array $departmentIds, string $companyId): bool
    {
        if (count($departmentIds) === 0) {
            return false;
        }

        $validCount = DB::connection('pilargroup')
            ->table('master_departments')
            ->whereIn('id', $departmentIds)
            ->where('company_id', $companyId)
            ->count();

        return $validCount === count(array_unique($departmentIds));
    }

    // ─────────────────────────────────────────────
    // HELPER: sync nested departments
    // ─────────────────────────────────────────────
    private function syncBusinessUnitDepartments(string $businessUnitId, array $departments, string $now): void
    {
        DB::connection('pilargroup')
            ->table('master_business_unit_departments')
            ->where('business_unit_id', $businessUnitId)
            ->delete();

        foreach ($departments as $department) {
            DB::connection('pilargroup')
                ->table('master_business_unit_departments')
                ->insert([
                    'id'               => Str::uuid()->toString(),
                    'business_unit_id' => $businessUnitId,
                    'department_id'    => $department['id'],
                    'is_primary'       => $department['is_primary'],
                    'is_active'        => $department['is_active'],
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ]);
        }
    }

    // ─────────────────────────────────────────────
    // GET /api/master/business-units
    // ─────────────────────────────────────────────
    public function index(Request $request)
    {
        $query = DB::connection('pilargroup')
            ->table('master_business_units as bu')
            ->join('master_companies as mc', 'bu.company_id', '=', 'mc.id')
            ->select(
                'bu.id',
                'bu.company_id',
                'mc.code as company_code',
                'mc.name as company_name',
                'bu.code',
                'bu.name',
                'bu.is_active',
                'bu.created_at',
                'bu.updated_at'
            );

        if ($request->filled('search')) {
            $search = $request->input('search');

            $query->where(function ($q) use ($search) {
                $q->where('bu.code', 'like', "%{$search}%")
                    ->orWhere('bu.name', 'like', "%{$search}%")
                    ->orWhere('mc.code', 'like', "%{$search}%")
                    ->orWhere('mc.name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('company_id')) {
            $query->where('bu.company_id', $request->input('company_id'));
        }

        if ($request->has('is_active') && $request->input('is_active') !== '') {
            $query->where('bu.is_active', (int) $request->boolean('is_active'));
        }

        $businessUnits = $query
            ->orderBy('bu.name')
            ->get()
            ->map(function ($businessUnit) {
                $businessUnit->departments = $this->getBusinessUnitDepartments($businessUnit->id);
                return $businessUnit;
            });

        return response()->json([
            'message' => 'Business units fetched successfully',
            'data' => $businessUnits,
        ]);
    }

    // ─────────────────────────────────────────────
    // GET /api/master/business-units/{id}
    // ─────────────────────────────────────────────
    public function show($id)
    {
        $businessUnit = DB::connection('pilargroup')
            ->table('master_business_units as bu')
            ->join('master_companies as mc', 'bu.company_id', '=', 'mc.id')
            ->where('bu.id', $id)
            ->select(
                'bu.id',
                'bu.company_id',
                'mc.code as company_code',
                'mc.name as company_name',
                'bu.code',
                'bu.name',
                'bu.is_active',
                'bu.created_at',
                'bu.updated_at'
            )
            ->first();

        if (!$businessUnit) {
            return response()->json(['message' => 'Business unit not found'], 404);
        }

        $businessUnit->departments = $this->getBusinessUnitDepartments($businessUnit->id);

        return response()->json([
            'message' => 'Business unit fetched successfully',
            'data' => $businessUnit,
        ]);
    }

    // ─────────────────────────────────────────────
    // POST /api/master/business-units
    // ─────────────────────────────────────────────
    public function store(Request $request)
    {
        $request->validate([
            'company_id'                 => 'required|string|exists:pilargroup.master_companies,id',
            'code'                       => 'required|string|max:30|unique:pilargroup.master_business_units,code',
            'name'                       => 'required|string|max:100|unique:pilargroup.master_business_units,name',
            'is_active'                  => 'nullable|boolean',
            'departments'                => 'required|array|min:1',
            'departments.*.id'           => 'required|integer|exists:pilargroup.master_departments,id',
            'departments.*.is_primary'   => 'nullable|boolean',
            'departments.*.is_active'    => 'nullable|boolean',
        ]);

        $departments = $this->normalizeDepartments($request->input('departments'));
        $departmentIds = collect($departments)->pluck('id')->toArray();

        if (!$this->departmentsBelongToCompany($departmentIds, $request->input('company_id'))) {
            return response()->json([
                'message' => 'All selected departments must belong to the selected company.',
            ], 422);
        }

        $businessUnitId = Str::uuid()->toString();
        $now = now()->toDateTimeString();

        try {
            DB::connection('pilargroup')->transaction(function () use ($request, $businessUnitId, $departments, $now) {
                DB::connection('pilargroup')
                    ->table('master_business_units')
                    ->insert([
                        'id'         => $businessUnitId,
                        'company_id' => $request->input('company_id'),
                        'code'       => strtoupper(trim($request->input('code'))),
                        'name'       => trim($request->input('name')),
                        'is_active'  => $request->has('is_active')
                            ? (int) $request->boolean('is_active')
                            : 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);

                $this->syncBusinessUnitDepartments($businessUnitId, $departments, $now);
            });

            return response()->json([
                'message' => 'Business unit created successfully',
                'data' => [
                    'id' => $businessUnitId,
                ],
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error while creating business unit',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────
    // PUT /api/master/business-units/{id}
    // ─────────────────────────────────────────────
    public function update(Request $request, $id)
    {
        $businessUnit = DB::connection('pilargroup')
            ->table('master_business_units')
            ->where('id', $id)
            ->first();

        if (!$businessUnit) {
            return response()->json(['message' => 'Business unit not found'], 404);
        }

        foreach (['company_id', 'code', 'name'] as $field) {
            if ($request->has($field) && $request->input($field) === '') {
                $request->merge([$field => null]);
            }
        }

        $request->validate([
            'company_id'                 => 'nullable|string|exists:pilargroup.master_companies,id',
            'code'                       => [
                'nullable',
                'string',
                'max:30',
                Rule::unique('pilargroup.master_business_units', 'code')->ignore($id, 'id'),
            ],
            'name'                       => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('pilargroup.master_business_units', 'name')->ignore($id, 'id'),
            ],
            'is_active'                  => 'nullable|boolean',
            'departments'                => 'nullable|array|min:1',
            'departments.*.id'           => 'required_with:departments|integer|exists:pilargroup.master_departments,id',
            'departments.*.is_primary'   => 'nullable|boolean',
            'departments.*.is_active'    => 'nullable|boolean',
        ]);

        $finalCompanyId = $request->has('company_id')
            ? $request->input('company_id')
            : $businessUnit->company_id;

        $departments = null;

        if ($request->has('departments')) {
            $departments = $this->normalizeDepartments($request->input('departments'));
            $departmentIds = collect($departments)->pluck('id')->toArray();

            if (!$this->departmentsBelongToCompany($departmentIds, $finalCompanyId)) {
                return response()->json([
                    'message' => 'All selected departments must belong to the selected company.',
                ], 422);
            }
        } elseif ($request->has('company_id') && $request->input('company_id') !== $businessUnit->company_id) {
            $existingDepartmentIds = DB::connection('pilargroup')
                ->table('master_business_unit_departments')
                ->where('business_unit_id', $id)
                ->pluck('department_id')
                ->toArray();

            if (!$this->departmentsBelongToCompany($existingDepartmentIds, $finalCompanyId)) {
                return response()->json([
                    'message' => 'Existing departments do not belong to the selected company. Please send departments payload when changing company.',
                ], 422);
            }
        }

        $now = now()->toDateTimeString();
        $updates = ['updated_at' => $now];

        if ($request->has('company_id')) {
            $updates['company_id'] = $request->input('company_id');
        }

        if ($request->has('code')) {
            $updates['code'] = strtoupper(trim($request->input('code')));
        }

        if ($request->has('name')) {
            $updates['name'] = trim($request->input('name'));
        }

        if ($request->has('is_active')) {
            $updates['is_active'] = (int) $request->boolean('is_active');
        }

        try {
            DB::connection('pilargroup')->transaction(function () use ($id, $updates, $departments, $now) {
                DB::connection('pilargroup')
                    ->table('master_business_units')
                    ->where('id', $id)
                    ->update($updates);

                if (!is_null($departments)) {
                    $this->syncBusinessUnitDepartments($id, $departments, $now);
                }
            });

            return response()->json([
                'message' => 'Business unit updated successfully',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error while updating business unit',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────
    // PATCH /api/master/business-units/{id}/status
    // ─────────────────────────────────────────────
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'is_active' => 'required|boolean',
        ]);

        $businessUnit = DB::connection('pilargroup')
            ->table('master_business_units')
            ->where('id', $id)
            ->first();

        if (!$businessUnit) {
            return response()->json(['message' => 'Business unit not found'], 404);
        }

        $isActive = (int) $request->boolean('is_active');

        DB::connection('pilargroup')
            ->table('master_business_units')
            ->where('id', $id)
            ->update([
                'is_active' => $isActive,
                'updated_at' => now()->toDateTimeString(),
            ]);

        return response()->json([
            'message' => $isActive
                ? 'Business unit activated successfully'
                : 'Business unit deactivated successfully',
            'data' => [
                'id' => $id,
                'is_active' => $isActive,
            ],
        ]);
    }

    // ─────────────────────────────────────────────
    // DELETE /api/master/business-units/{id}
    // ─────────────────────────────────────────────
    public function destroy($id)
    {
        $businessUnit = DB::connection('pilargroup')
            ->table('master_business_units')
            ->where('id', $id)
            ->first();

        if (!$businessUnit) {
            return response()->json(['message' => 'Business unit not found'], 404);
        }

        try {
            DB::connection('pilargroup')->transaction(function () use ($id) {
                DB::connection('pilargroup')
                    ->table('master_business_unit_departments')
                    ->where('business_unit_id', $id)
                    ->delete();

                DB::connection('pilargroup')
                    ->table('master_business_units')
                    ->where('id', $id)
                    ->delete();
            });

            return response()->json([
                'message' => 'Business unit deleted successfully',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error while deleting business unit',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}