const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
        callback(dirPath);
      }
    }
  });
}

function replacePatterns() {
  const dir = path.join(__dirname, '../src/features');
  walkDir(dir, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Standardize Page Container
    content = content.replace(/className="[^"]*p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 pb-20[^"]*"/g, 'className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6"');
    
    // 2. Standardize Page Title (H1)
    content = content.replace(/className="[^"]*text-2xl font-bold text-slate-900 tracking-tight[^"]*"/g, (match) => {
      // Check if it's an H1
      if (match.includes('flex items-center gap-2')) {
        return 'className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight flex items-center gap-2"';
      }
      return 'className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight"';
    });
    
    // 3. Standardize Page Subtitle
    content = content.replace(/className="[^"]*text-sm text-slate-500 mt-1 font-medium[^"]*"/g, 'className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5"');

    // 4. Standardize metric cards (text-3xl -> text-[28px])
    content = content.replace(/className="[^"]*text-3xl font-semibold text-slate-900 tracking-tight[^"]*"/g, 'className="text-[28px] font-bold text-slate-900 tracking-tight"');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  });
}

replacePatterns();
