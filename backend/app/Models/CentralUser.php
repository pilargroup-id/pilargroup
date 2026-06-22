<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class CentralUser extends Authenticatable implements JWTSubject
{
    protected $connection = 'pilargroup';
    protected $table = 'central_users';
    protected $hidden = ['password'];

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'internal_id'  => $this->internal_id,
            'username'     => $this->username,
            'name'         => $this->name,
            'email'        => $this->email,
            'phone'        => $this->phone,
            'job_position' => $this->job_position,
            'employment_type_code'  => $this->employment_type_code,
            'apps'         => $this->apps ?? [],
        ];
    }

    public function projects()
    {
        return $this->hasManyThrough(
            MasterProject::class,
            CentralUserProject::class,
            'user_id',
            'id',
            'id',
            'project_id'
        );
    }

    public function hasProjectAccess(string $slug): bool
    {
        return $this->projects()->where('slug', $slug)->exists();
    }
}