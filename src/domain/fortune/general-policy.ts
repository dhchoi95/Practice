import {calculateSaju} from '../saju/calculate';
import {calculateAdvanced} from '../advanced/chart';
import type {BirthInput,SajuCalculationResult} from '../saju/types';
/** Public input policy only. Solar-time engines remain available to internal verification. */
export function generalInput(input:BirthInput):BirthInput{
 const luckClass=input.advanced?.luckClass;
 return {...input,advanced:{enabled:true,timePolicy:'standard',...(luckClass?{luckClass}:{})}};
}
export function hasLegacyCorrection(input:BirthInput){return !!input.advanced&&input.advanced.timePolicy!=='standard';}
export function generalChart(input:BirthInput){const normalized=generalInput(input);return calculateAdvanced(normalized,normalized.advanced!);}
export function generalSession(value:{input:BirthInput;calculation:SajuCalculationResult}|null){
 if(!value)return null;
 const input=generalInput(value.input);
 if(JSON.stringify(input.advanced)===JSON.stringify(value.input.advanced))return value;
 const {advanced,...base}=input;void advanced;
 return {input,calculation:calculateSaju(base)};
}
