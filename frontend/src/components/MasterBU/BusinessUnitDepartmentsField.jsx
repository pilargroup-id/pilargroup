function BusinessUnitDepartmentsField({
  departments,
  isLoading,
  companyId,
  selectedIds,
  primaryId,
  onToggle,
  onSetPrimary,
}) {
  if (!companyId) {
    return (
      <p className="bu-departments-picker__hint">
        Pilih company terlebih dahulu untuk menampilkan daftar department.
      </p>
    )
  }

  if (isLoading) {
    return <p className="bu-departments-picker__hint">Memuat daftar department...</p>
  }

  if (departments.length === 0) {
    return (
      <p className="bu-departments-picker__hint">
        Tidak ada department untuk company ini.
      </p>
    )
  }

  return (
    <div className="bu-departments-picker">
      <div className="bu-departments-picker__row bu-departments-picker__row--header">
        <span>Department</span>
        <span>Primary</span>
      </div>
      {departments.map((department) => {
        const isSelected = selectedIds.includes(department.id)

        return (
          <label className="bu-departments-picker__row" key={department.id}>
            <span className="bu-departments-picker__checkbox">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(department.id)}
              />
              {department.name}
              {department.code ? ` (${department.code})` : ''}
            </span>
            <input
              type="radio"
              name="bu-primary-department"
              checked={isSelected && primaryId === department.id}
              disabled={!isSelected}
              onChange={() => onSetPrimary(department.id)}
            />
          </label>
        )
      })}
    </div>
  )
}

export default BusinessUnitDepartmentsField
