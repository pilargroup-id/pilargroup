const fs = require('fs');

// manageUsers.js
let manageFile = fs.readFileSync('frontend/src/services/manageUsers.js', 'utf8');
manageFile = manageFile.replace('  importUsers,\n}', '  importUsers,\n  downloadUsersExport,\n}');
manageFile = manageFile.replace('  importUsers,\r\n}', '  importUsers,\r\n  downloadUsersExport,\r\n}');
fs.writeFileSync('frontend/src/services/manageUsers.js', manageFile);

// UserPage.jsx
let userFile = fs.readFileSync('frontend/src/pages/UserPage.jsx', 'utf8');
const buttonRegex = /<button[\s\S]*?onClick=\{\(\) => setIsRegisterPopupOpen\(true\)\}[\s\S]*?>[\s\S]*?<UserPlus01[\s\S]*?Registrasi User[\s\S]*?<\/button>/;

const buttonReplace = `<div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="users-table-card__action"
                style={{ backgroundColor: 'white', color: '#344054', border: '1px solid #D0D5DD' }}
                onClick={handleExportUsers}
              >
                Export xlsx
              </button>
              <button
                type="button"
                className="users-table-card__action"
                onClick={() => setIsRegisterPopupOpen(true)}
              >
                <UserPlus01 size={18} aria-hidden="true" />
                Registrasi User
              </button>
            </div>`;

userFile = userFile.replace(buttonRegex, buttonReplace);
fs.writeFileSync('frontend/src/pages/UserPage.jsx', userFile);
