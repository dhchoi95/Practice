import { expect,type Page } from '@playwright/test';

/** Category changes use the global menu; they are not controls inside a reading. */
export async function switchReading(page:Page,name:string){
  await page.getByRole('button',{name:'메뉴',exact:true}).click();
  await page.getByRole('dialog').getByRole('link',{name,exact:true}).click();
  await page.getByRole('link',{name:`같은 정보로 ${name} 보기`,exact:true}).click();
  await expect(page.locator('.natal-table')).toBeVisible();
}
