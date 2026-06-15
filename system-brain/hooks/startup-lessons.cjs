const fs = require('fs');
const path = require('path');

function main() {
  const lessonsDir = path.join(process.cwd(), 'learned-lessons');
  
  if (!fs.existsSync(lessonsDir) || !fs.statSync(lessonsDir).isDirectory()) {
    process.exit(0);
  }

  const files = fs.readdirSync(lessonsDir).filter(f => {
    const filePath = path.join(lessonsDir, f);
    return f.endsWith('.md') && fs.statSync(filePath).isFile();
  });
  if (files.length === 0) {
    process.exit(0);
  }

  // 2. Discover Tier 2 Categories (Hint)
  const subdirs = fs.readdirSync(lessonsDir).filter(f => {
    return fs.statSync(path.join(lessonsDir, f)).isDirectory() && f !== 'archive';
  });
  
  let combinedLessons = "# 🧠 Project Learned Lessons (Injected at Startup)\n\n";
  if (subdirs.length > 0) {
    combinedLessons += `> 📚 **Librarian Hint**: Deep knowledge available for categories: [${subdirs.join(', ')}].\n`;
    combinedLessons += `> Use 'list_directory' on 'learned-lessons/<category>' to explore.\n\n`;
  }

  for (const file of files) {
    const content = fs.readFileSync(path.join(lessonsDir, file), 'utf8');
    combinedLessons += `## ${file}\n${content}\n\n`;
  }

  console.log(JSON.stringify({
    hookSpecificOutput: {
      additionalContext: combinedLessons
    },
    systemMessage: "✅ Learned lessons from ./learned-lessons/ injected."
  }));
}

main();
