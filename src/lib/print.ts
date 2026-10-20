'use client';
import { useEffect } from 'react';

/** Native beforeprint also covers browser menu/keyboard printing and page.pdf(). */
export function usePrintDetails(){
  useEffect(()=>{
    let previous:Map<HTMLDetailsElement,boolean>|undefined;
    const restore=()=>{previous?.forEach((open,element)=>{element.open=open;});previous=undefined;};
    const expand=()=>{
      if(previous)return;
      previous=new Map(Array.from(document.querySelectorAll<HTMLDetailsElement>('details.disclosure')).map(element=>[element,element.open]));
      previous.forEach((_,element)=>{element.open=true;});
    };
    window.addEventListener('beforeprint',expand);
    window.addEventListener('afterprint',restore);
    return ()=>{window.removeEventListener('beforeprint',expand);window.removeEventListener('afterprint',restore);restore();};
  },[]);
}
