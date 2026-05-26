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
    content = content.replace(/import (.*?) from 'react';?/, "import $1 from 'react';\nimport { createPortal } from 'react-dom';");
    
    // 2. Wrap return
    content = content.replace(/return \(\s*(<div className="dashboard-popup-overlay")/, "return createPortal(\n    $1");
    
    // 3. Fix closing
    // Match the final closing div and the closing parenthesis
    const newContent = content.replace(/(<\/\s*div>\s*)\)(?=\s*\}\s*export default)/, '$1), document.body)');
    
    if (newContent !== content) {
        fs.writeFileSync(file, newContent);
        console.log('Fixed ' + file);
    } else {
        console.log('Failed to find closing for ' + file);
    }
  }
}
