const dashboardSummary = [
  {
    label: 'Projects',
    value: '03',
    change: 'siap dibuka',
    tone: 'positive',
  },
  {
    label: 'Links',
    value: '08',
    change: 'repo dan docs',
    tone: 'warning',
  },
  {
    label: 'Alerts',
    value: '02',
    change: 'butuh tindak lanjut',
    tone: 'negative',
  },
]

const setupChecklist = [
  {
    title: 'Tiket masuk',
    description: 'Tampilkan tiket baru atau antrian issue harian agar tim bisa langsung melihat permintaan yang perlu direspons.',
  },
  {
    title: 'Eskalasi prioritas',
    description: 'Pisahkan issue yang butuh tindak lanjut cepat, koordinasi vendor, atau bantuan lintas tim supaya tidak tertahan di antrian umum.',
  },
  {
    title: 'SLA dan follow-up',
    description: 'Simpan ringkasan owner, status penanganan, dan target waktu agar progres helpdesk mudah dipantau dari satu layar.',
  },
]

export function getDashboardSummary() {
  return dashboardSummary
}

export function getSetupChecklist() {
  return setupChecklist
}

export function getLastUpdatedAt() {
  return new Date()
}
