import { PlayCircle } from '@untitledui/icons'
import AppLayout from '@/layouts/AppLayout'
import { usePageTitle } from '@/hooks/usePageTitle'

const projects = [
  {
    label: 'Project 01',
    value: 'Web Pilar',
    detail: 'Project is available and ready to run.',
  },
  {
    label: 'Project 02',
    value: 'Ticketing',
    detail: 'Project is available and ready to run.',
  },
  {
    label: 'Project 03',
    value: 'Treeview',
    detail: 'Project is available and ready to run.',
  },
  {
    label: 'Project 04',
    value: 'Touch Point',
    detail: 'Project is available and ready to run.',
  },
  {
    label: 'Project 05',
    value: 'Snap IT',
    detail: 'Project is available and ready to run.',
  },
]

function DashboardPage() {
  usePageTitle('Pilar Group')

  return (
    <AppLayout
      headerProps={{
        title: 'Pilar Group',
        subtitle: 'Manage your recruitment process',
        breadcrumb: [
            { label: 'All', href: '#', active: true },
            { label: 'Finance', href: '#' },
            { label: 'Legal', href: '#' }, 
            { label: 'Product', href: '#' },
        ],
        primaryActionLabel: 'Create',
        activePath: '/dashboard',
      }}
    >
      <section className="dashboard-content">
        <div className="dashboard-overview">
          {projects.map((project) => (
            <article className="dashboard-card" key={project.value}>
              <p className="dashboard-card__label">{project.label}</p>
              <strong className="dashboard-card__value">{project.value}</strong>
              <p className="dashboard-card__detail">{project.detail}</p>
              <button type="button" className="dashboard-card__action">
                <PlayCircle size={16} />
                <span>Run</span>
              </button>
            </article>
          ))}
        </div>
      </section>
    </AppLayout>
  )
}

export default DashboardPage
