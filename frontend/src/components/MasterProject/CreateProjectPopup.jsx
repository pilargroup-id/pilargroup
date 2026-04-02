import { useEffect, useState } from 'react'
import { Folder, SearchMd, XClose } from '@untitledui/icons'

const initialFormState = {
  name: '',
  code: '',
  projectUrl: '',
  status: 'Active',
  description: '',
  divisions: [],
  userIds: [],
}

function toggleItem(items, value) {
  if (items.includes(value)) {
    return items.filter((item) => item !== value)
  }

  return [...items, value]
}

function CreateProjectPopup({
  isOpen,
  onClose,
  onSubmit,
  availableDivisions,
  availableUsers,
}) {
  const [formState, setFormState] = useState(initialFormState)
  const [userSearchQuery, setUserSearchQuery] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setFormState(initialFormState)
      setUserSearchQuery('')
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const selectedUsers = availableUsers.filter((user) => formState.userIds.includes(user.id))
    const divisions = Array.from(
      new Set([...formState.divisions, ...selectedUsers.map((user) => user.division)]),
    )

    onSubmit?.({
      name: formState.name.trim(),
      code: formState.code.trim().toUpperCase(),
      projectUrl: formState.projectUrl.trim(),
      status: formState.status,
      description:
        formState.description.trim() ||
        'Project baru untuk mendukung kebutuhan operasional lintas divisi.',
      divisions,
      users: selectedUsers,
    })
  }

  const isSubmitDisabled = !formState.name.trim() || !formState.code.trim()
  const normalizedUserSearchQuery = userSearchQuery.trim().toLowerCase()
  const filteredUsers = availableUsers.filter((user) => {
    if (!normalizedUserSearchQuery) {
      return true
    }

    return [user.name, user.division, user.role, user.id].some((field) =>
      field.toLowerCase().includes(normalizedUserSearchQuery),
    )
  })

  return (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={() => onClose?.()}
    >
      <div
        className="dashboard-popup register-user-popup master-project-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Master Project</p>
            <h2 className="dashboard-popup__title" id="create-project-popup-title">
              Create Project
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Close create project popup"
            onClick={() => onClose?.()}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <div className="master-project-popup__layout">
              <div className="master-project-popup__main">
                <div className="register-user-popup__grid">
                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Project Name</span>
                    <input
                      type="text"
                      className="register-user-popup__input"
                      value={formState.name}
                      placeholder="Contoh: Core Finance Portal"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Project Code</span>
                    <input
                      type="text"
                      className="register-user-popup__input"
                      value={formState.code}
                      placeholder="Contoh: FIN-OPS"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          code: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Url Project</span>
                    <input
                      type="url"
                      className="register-user-popup__input"
                      value={formState.projectUrl}
                      placeholder="Contoh: https://project.pilar.group"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          projectUrl: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Status</span>
                    <select
                      className="register-user-popup__select"
                      value={formState.status}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Review">Review</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </label>
                </div>

                <label className="register-user-popup__field">
                  <span className="register-user-popup__label">Description</span>
                  <textarea
                    className="register-user-popup__input master-project-popup__textarea"
                    value={formState.description}
                    placeholder="Jelaskan fungsi project dan tim yang akan menggunakannya."
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <section
                className="master-project-popup__section master-project-popup__section--sidebar"
                aria-labelledby="division-options"
              >
                <div className="master-project-popup__section-header">
                  <span className="register-user-popup__label" id="division-options">
                    Divisions
                  </span>
                  <p className="master-project-popup__hint">
                    Pilih divisi yang menggunakan project ini.
                  </p>
                </div>

                <div className="master-project-popup__options">
                  {availableDivisions.map((division) => (
                    <label className="master-project-popup__option" key={division}>
                      <input
                        type="checkbox"
                        checked={formState.divisions.includes(division)}
                        onChange={() =>
                          setFormState((current) => ({
                            ...current,
                            divisions: toggleItem(current.divisions, division),
                          }))
                        }
                      />
                      <span>{division}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <section className="master-project-popup__section" aria-labelledby="user-options">
              <div className="master-project-popup__section-header master-project-popup__section-header--split">
                <div className="master-project-popup__section-copy">
                  <span className="register-user-popup__label" id="user-options">
                    Users
                  </span>
                  <p className="master-project-popup__hint">
                    User terpilih otomatis ikut menambahkan divisinya ke detail project.
                  </p>
                </div>

                <div className="master-project-popup__search">
                  <SearchMd
                    size={16}
                    className="master-project-popup__search-icon"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    className="master-project-popup__search-input"
                    value={userSearchQuery}
                    placeholder="Search users..."
                    aria-label="Search users"
                    onChange={(event) => setUserSearchQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="master-project-popup__options master-project-popup__options--users">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <label className="master-project-popup__option" key={user.id}>
                    <input
                      type="checkbox"
                      checked={formState.userIds.includes(user.id)}
                      onChange={() =>
                        setFormState((current) => ({
                          ...current,
                          userIds: toggleItem(current.userIds, user.id),
                        }))
                      }
                    />

                    <div className="master-project-popup__option-copy">
                      <span>{user.name}</span>
                      <small>
                        {user.division} · {user.role}
                      </small>
                    </div>
                    </label>
                  ))
                ) : (
                  <div className="users-table__empty master-project-popup__users-empty">
                    Tidak ada user yang cocok dengan pencarian.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="dashboard-popup__actions">
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--secondary"
              onClick={() => onClose?.()}
            >
              Batal
            </button>
            <button
              type="submit"
              className="dashboard-popup__button dashboard-popup__button--primary"
              disabled={isSubmitDisabled}
            >
              <Folder size={16} />
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateProjectPopup
