import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
for(const file of ['index.html','styles.css','app.mjs','model.mjs','config.js']) await copyFile(file,`dist/${file}`);
await cp('assets','dist/assets',{recursive:true});
await copyFile('node_modules/mqtt/dist/mqtt.min.js','dist/vendor/mqtt.min.js');
console.log('Painel pronto em dist/');
