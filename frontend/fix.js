const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('Popup.jsx')) results.push(file);
    }
  });
  return results;
}
const files = walk('src/components');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('dashboard-popup-overlay') && !content.includes('createPortal')) {
    
    // 1. Add import
    content = content.replace(/import (.*?) from 'react';?/, "import \ from 'react';\nimport { createPortal } from 'react-dom';");
    
    // 2. Wrap return
    content = content.replace(/return \(\s*(<div className="dashboard-popup-overlay")/, "return createPortal(\n    \");
    
    // 3. Fix the closing
    // We want to replace the last occurrence of:
    //   )
    // }
    // export default
    
    const lastParenIndex = content.lastIndexOf('  )\n}\n\nexport default');
    if (lastParenIndex !== -1) {
        content = content.slice(0, lastParenIndex) + '  ), document.body)\n}\n\nexport default' + content.slice(lastParenIndex + 21);
        fs.writeFileSync(file, content);
        console.log('Fixed ' + file);
    } else {
        console.log('Failed to find closing for ' + file);
    }
  }
}
