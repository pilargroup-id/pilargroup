const rawUser = {
        "id": "80384a23-ceb6-401a-98ad-cfb0b29e06b8",
        "internal_id": null,
        "username": "abdul.syukur",
        "name": "Abdul Syukur",
        "email": null,
        "phone": null,
        "job_position": null,
        "job_level_id": null,
        "job_level": null,
        "job_level_value": null,
        "is_active": 1,
        "created_at": "2026-04-21 03:45:01",
        "updated_at": "2026-05-07 07:57:34",
        "departments": [
            {
                "id": 1,
                "name": "HCGA",
                "class": "HCGA",
                "code": "HCG",
                "is_primary": 1
            }
        ],
        "companies": [
            {
                "id": "comp-pnm-0001",
                "code": "PNM",
                "name": "PT Pilar Niaga Makmur",
                "is_primary": 1
            }
        ],
        "apps": [
            "ticket"
        ]
    };

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null
  }
  const normalizedValue = String(value).trim()
  return normalizedValue || null
}

function normalizeText(value, fallback = '-') {
  return normalizeOptionalText(value) ?? fallback
}

const division = (() => {
  const depts = Array.isArray(rawUser.departments) ? rawUser.departments : (Array.isArray(rawUser.department) ? rawUser.department : null);
  if (depts && depts.length > 0) {
    const names = depts.map((d) => d.name).filter(Boolean).join(', ');
    if (names) return names;
  }
  return normalizeText(
    rawUser.department ??
      rawUser.department_name ??
      rawUser.departmentName ??
      rawUser.division,
  );
})();

console.log("division is: ", division);
