const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
let html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>\n'+fs.readFileSync(path.join(root,'dist/style.css'),'utf8')+'\n</style>');
for(const file of ['engine.js','music.js','app.js'])html=html.replace(`<script src="${file}"></script>`,()=>'<script>\n'+fs.readFileSync(path.join(root,'dist',file),'utf8')+'\n</script>');
fs.writeFileSync(path.join(root,'turn-burst.html'),html);
console.log(`Built turn-burst.html (${Buffer.byteLength(html)} bytes)`);
