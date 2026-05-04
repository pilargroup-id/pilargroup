<?php
// config/cors.php

return [
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://pilargroup.id',
        'https://treeview.pilargroup.id',
        'https://touchpoint.pilargroup.id',
        'https://framelens.pilargroup.id',
        'https://billforge.pilargroup.id',
        'https://ticket.pilargroup.id',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Authorization', 'Content-Type'],

    'exposed_headers' => ['GET', 'POST', 'OPTIONS'],

    'max_age' => 0,

    'supports_credentials' => false,
];