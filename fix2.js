const fs = require('fs');

let userFile = fs.readFileSync('frontend/src/pages/UserPage.jsx', 'utf8');

// Add DownloadCloud02 to imports
userFile = userFile.replace(
  'import { UserPlus01 } from \'@untitledui/icons\'',
  'import { UserPlus01, DownloadCloud02 } from \'@untitledui/icons\''
);

const buttonRegex = /<button[\s\S]*?Export xlsx[\s\S]*?<\/button>/;

const buttonReplace = `<button
                type="button"
                className="users-table-card__action"
                style={{ background: '#fff', color: '#1a2a57', border: '1px solid rgba(26, 42, 87, 0.12)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                onClick={handleExportUsers}
              >
                <DownloadCloud02 size={18} aria-hidden="true" />
                Export xlsx
              </button>`;

userFile = userFile.replace(buttonRegex, buttonReplace);
fs.writeFileSync('frontend/src/pages/UserPage.jsx', userFile);
