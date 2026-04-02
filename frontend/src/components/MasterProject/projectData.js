export const availableUsers = [
  {
    id: 'USR-001',
    name: 'Al Fatih',
    email: 'alfatih@pilar.group',
    division: 'Finance',
    role: 'Frontend Developer',
  },
  {
    id: 'USR-002',
    name: 'Rina Aprilia',
    email: 'rina.aprilia@pilar.group',
    division: 'Legal',
    role: 'UI Designer',
  },
  {
    id: 'USR-003',
    name: 'Dimas Pratama',
    email: 'dimas.pratama@pilar.group',
    division: 'Product',
    role: 'Backend Engineer',
  },
  {
    id: 'USR-004',
    name: 'Nadia Putri',
    email: 'nadia.putri@pilar.group',
    division: 'Finance',
    role: 'Business Analyst',
  },
  {
    id: 'USR-005',
    name: 'Bagas Wicaksono',
    email: 'bagas.wicaksono@pilar.group',
    division: 'Product',
    role: 'QA Engineer',
  },
  {
    id: 'USR-006',
    name: 'Salsa Maharani',
    email: 'salsa.maharani@pilar.group',
    division: 'Legal',
    role: 'Project Manager',
  },
]

const usersById = Object.fromEntries(availableUsers.map((user) => [user.id, user]))

function pickUsers(...userIds) {
  return userIds.map((userId) => usersById[userId]).filter(Boolean)
}

export const availableDivisions = Array.from(
  new Set(availableUsers.map((user) => user.division)),
)

export const initialProjects = [
  {
    id: 'PRJ-001',
    code: 'WEB-PLR',
    name: 'Web Pilar',
    projectUrl: 'https://web.pilar.group',
    category: 'Internal Portal',
    status: 'Active',
    lastUpdated: '2 jam lalu',
    description:
      'Dashboard utama untuk monitoring recruitment, progress operasional, dan aktivitas tim lintas divisi.',
    divisions: ['Finance', 'Legal', 'Product'],
    users: pickUsers('USR-001', 'USR-002', 'USR-006'),
  },
  {
    id: 'PRJ-002',
    code: 'TCK-OPS',
    name: 'Ticketing',
    projectUrl: 'https://ticketing.pilar.group',
    category: 'Support System',
    status: 'Review',
    lastUpdated: 'Hari ini',
    description:
      'Sistem tiket untuk request internal sehingga eskalasi antar tim lebih terstruktur dan mudah dilacak.',
    divisions: ['Legal', 'Product'],
    users: pickUsers('USR-002', 'USR-005', 'USR-006'),
  },
  {
    id: 'PRJ-003',
    code: 'TRV-DOC',
    name: 'Treeview',
    projectUrl: 'https://treeview.pilar.group',
    category: 'Document Explorer',
    status: 'Draft',
    lastUpdated: 'Kemarin',
    description:
      'Explorer dokumen bertingkat untuk membantu tim produk dan finance melihat struktur data project secara cepat.',
    divisions: ['Finance', 'Product'],
    users: pickUsers('USR-001', 'USR-003'),
  },
  {
    id: 'PRJ-004',
    code: 'TPC-CRM',
    name: 'Touch Point',
    projectUrl: 'https://touchpoint.pilar.group',
    category: 'Client Tracking',
    status: 'Active',
    lastUpdated: '4 jam lalu',
    description:
      'Aplikasi tracking komunikasi client agar tiap touch point terdokumentasi dan mudah diteruskan ke tim terkait.',
    divisions: ['Finance', 'Legal'],
    users: pickUsers('USR-004', 'USR-006'),
  },
  {
    id: 'PRJ-005',
    code: 'SNP-IT',
    name: 'Snap IT',
    projectUrl: 'https://snap-it.pilar.group',
    category: 'Internal Ops',
    status: 'Active',
    lastUpdated: '30 menit lalu',
    description:
      'Workspace cepat untuk operasional IT yang dipakai saat maintenance, validasi, dan monitoring issue harian.',
    divisions: ['Finance', 'Product'],
    users: pickUsers('USR-001', 'USR-003', 'USR-005'),
  },
]
