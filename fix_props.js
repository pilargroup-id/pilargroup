const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend/src/components/Users/TableUser.jsx');
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /updatingStatusUserIds = \[\],\r?\n\}\) \{/,
  "updatingStatusUserIds = [],\n  onDownloadTemplate,\n  onUploadUsers,\n  isUploading = false,\n}) {"
);
fs.writeFileSync(file, content);
