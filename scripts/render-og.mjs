// Render our existing, locally authored SVG; no generation API, font download or external asset.
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});await page.setContent('<!doctype html><html lang="ko"><meta charset="utf-8"><style>body{margin:0}</style><body>'+await fs.readFile('public/og.svg','utf8')+'</body></html>');await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'public/og.png'});console.log('Rendered local brand OG: 1200×630 PNG; external requests: 0.');}finally{await browser.close();}
