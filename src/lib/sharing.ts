export type ShareOutcome='shared'|'copied'|'cancelled'|'manual';
export async function shareCategory(url:string,title:string):Promise<ShareOutcome>{
  if(window.isSecureContext&&typeof navigator.share==='function'){
    try{await navigator.share({title,url});return 'shared';}
    catch(e){if(e instanceof DOMException&&e.name==='AbortError')return 'cancelled';}
  }
  if(window.isSecureContext&&navigator.clipboard?.writeText){
    try{await navigator.clipboard.writeText(url);return 'copied';}catch{/* 수동 복사로 전환 */}
  }
  return 'manual';
}
