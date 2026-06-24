const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Users/TableUser.jsx', 'utf8');

content = content.replace(
  "canDeleteUser = () => true,\\r\\n  updatingStatusUserIds = [],\\r\\n}) {",
  "canDeleteUser = () => true,\\r\\n  updatingStatusUserIds = [],\\r\\n  onDownloadTemplate,\\r\\n  onUploadUsers,\\r\\n  isUploading = false,\\r\\n}) {"
);

content = content.replace(
  "canDeleteUser = () => true,\\n  updatingStatusUserIds = [],\\n}) {",
  "canDeleteUser = () => true,\\n  updatingStatusUserIds = [],\\n  onDownloadTemplate,\\n  onUploadUsers,\\n  isUploading = false,\\n}) {"
);

content = content.replace(
  "const [expandedUserId, setExpandedUserId] = useState(null)",
  "const fileInputRef = useRef(null);\\n  const [expandedUserId, setExpandedUserId] = useState(null)"
);

fs.writeFileSync('frontend/src/components/Users/TableUser.jsx', content);
