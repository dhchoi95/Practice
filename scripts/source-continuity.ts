import fs from 'node:fs';
import {createHash} from 'node:crypto';
/** Preserve the historical baseline. Only an explicitly recorded current source hash
 * may supersede a baseline source. Prose/condition invariants are audited separately. */
export function recordedMigration(path:string,beforeHash:string){
 const manifest=JSON.parse(fs.readFileSync('content-review/final-editing/source-migrations.json','utf8')) as {sources:{path:string;beforeHashes:string[];afterHash:string;reason:string}[]};
 const row=manifest.sources.find(r=>r.path===path),actual=createHash('sha256').update(fs.readFileSync(path)).digest('hex');
 return !!row&&row.beforeHashes.includes(beforeHash)&&row.afterHash===actual&&!!row.reason;
}
