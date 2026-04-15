<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CentralUserProject extends Model
{
    protected $connection = 'pilargroup';
    protected $table      = 'central_user_projects';
    protected $primaryKey = 'id';
    public $incrementing  = false;
    protected $keyType    = 'string';

    protected $fillable = ['id', 'user_id', 'project_id'];

    public function user()
    {
        return $this->belongsTo(CentralUser::class, 'user_id');
    }

    public function project()
    {
        return $this->belongsTo(MasterProject::class, 'project_id');
    }
}