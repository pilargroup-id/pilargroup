<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ITOnly
{
    protected array $itDepartmentAliases = [
        'it',
        'information technology',
        'department it',
        'departement it',
        'it department',
    ];

    public function handle(Request $request, Closure $next)
    {
        $department = strtolower(trim((string) $request->department));

        if (!in_array($department, $this->itDepartmentAliases, true)) {
            return response()->json(['message' => 'Access denied. IT division only.'], 403);
        }

        return $next($request);
    }
}
