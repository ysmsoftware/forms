const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') && !file.endsWith('layout.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'app', 'dashboard'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/import \{ DashboardLayout \} from "@\/components\/layout\/dashboard-layout"(\r?\n)?/g, '');
    content = content.replace(/import \{ ErrorBoundary \} from "@\/components\/error-boundary"(\r?\n)?/g, '');

    content = content.replace(/^[ \t]*<ErrorBoundary[^>]*>(\r?\n)?/gm, '');
    content = content.replace(/^[ \t]*<\/ErrorBoundary>(\r?\n)?/gm, '');

    content = content.replace(/^[ \t]*<DashboardLayout>(\r?\n)?/gm, '');
    content = content.replace(/^[ \t]*<\/DashboardLayout>(\r?\n)?/gm, '');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
    }
});
