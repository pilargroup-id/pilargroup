const fs = require('fs');
let content = fs.readFileSync('frontend/src/services/manageUsers.js', 'utf8');

content = content.replace("import api from '@/services/api'", "import api, { getToken, API_BASE_URL } from '@/services/api'");

const additions = `export async function downloadUserImportTemplate() {
  const url = \`\${API_BASE_URL}\${USERS_PATH}/import-template\`
  const token = getToken()
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', \`Bearer \${token}\`)
  }

  const response = await fetch(url, { method: 'GET', headers })
  if (!response.ok) {
    throw new Error('Failed to download template')
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.setAttribute('download', 'users_import_template.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
}

export async function importUsers(file) {
  const formData = new FormData()
  formData.append('file', file)

  const payload = await api.request(\`\${USERS_PATH}/import\`, {
    method: 'POST',
    body: formData,
  })

  return payload
}

export async function deleteManagedUser`;

content = content.replace("export async function deleteManagedUser", additions);

content = content.replace("resolveUserApps: resolveManagedUserApps,", `resolveUserApps: resolveManagedUserApps,
  downloadImportTemplate: downloadUserImportTemplate,
  importUsers,`);

fs.writeFileSync('frontend/src/services/manageUsers.js', content);
