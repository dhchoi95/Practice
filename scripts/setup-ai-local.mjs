import {randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
const path='.dev.vars';
try{await fs.access(path);console.log('Existing local-only .dev.vars retained.');}
catch{await fs.writeFile(path,['DATA_ENCRYPTION_KEY','IDENTITY_HMAC_KEY','REQUEST_HMAC_KEY'].map(k=>`${k}=${randomBytes(32).toString('base64')}`).join('\n')+'\n',{mode:0o600,flag:'wx'});console.log('Local development secrets created in ignored .dev.vars; values are not printed.');}
