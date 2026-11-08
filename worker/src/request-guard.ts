/** Cheap per-isolate load shedding. It contains no IP/account/device identifiers.
 * It is deliberately NOT described as a global/Cloudflare-billing spending cap.
 */
export class RequestGuard {
 private window=0;private count=0;
 allow(now:number){const window=Math.floor(now/10000);if(window!==this.window){this.window=window;this.count=0;}return ++this.count<=200;}
}
