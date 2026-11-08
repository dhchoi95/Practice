import {test,expect} from '@playwright/test';

test('guided entry preserves choices, validates inputs and matches existing calculation',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.getByText('생년월일로 살펴보는 나의 운세')).toHaveCount(0);
 await expect(page.getByRole('link',{name:/올해 운세를/})).toHaveCount(1);
 await expect(page.getByRole('link',{name:/오늘의 운세 보기/})).toHaveAttribute('href','/fortune/day/');
 await page.getByRole('button',{name:/사주풀이 시작하기/}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('heading',{name:'하루사주와 함께 시작해보시겠어요?'})).toBeVisible();
 await dialog.getByRole('button',{name:'다음에 할게요'}).click();await expect(dialog).not.toBeVisible();
 await page.getByRole('button',{name:/사주풀이 시작하기/}).click();await dialog.getByRole('button',{name:'네, 시작할게요'}).click();
 await dialog.getByRole('button',{name:'여성'}).click();await dialog.getByRole('button',{name:'계속'}).click();
 await dialog.getByRole('button',{name:'싱글'}).click();await dialog.getByRole('button',{name:'계속'}).click();
 await dialog.getByRole('button',{name:'이전'}).click();await expect(dialog.getByRole('button',{name:'싱글'})).toHaveAttribute('aria-pressed','true');
 await dialog.getByRole('button',{name:'건너뛰기'}).click();await dialog.getByRole('button',{name:'건너뛰기'}).click();
 await dialog.getByRole('button',{name:'계속'}).click();await expect(dialog.getByRole('alert')).toBeVisible();
 await dialog.getByLabel('태어난 연도').fill('1995');await dialog.getByLabel('월',{exact:true}).selectOption('11');await dialog.getByLabel('일',{exact:true}).fill('8');await dialog.getByRole('button',{name:'계속'}).click();
 await expect(dialog.getByLabel('태어난 시간을 몰라요')).toBeChecked();await dialog.getByRole('button',{name:'계속'}).click();
 await dialog.getByRole('button',{name:'건너뛰기'}).click();await dialog.getByRole('button',{name:'건너뛰기'}).click();
 await expect(page).toHaveURL('/result/day/');const guided=await page.locator('.natal-table').innerText();await expect(page.locator('.sector-body')).toHaveCount(6);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto('/fortune/day/');await page.getByLabel('태어난 연도',{exact:true}).fill('1995');await page.getByRole('combobox',{name:'월',exact:true}).selectOption('11');await page.getByLabel('일',{exact:true}).fill('8');await page.getByRole('button',{name:/무료로 .* 보기/}).click();
 expect(await page.locator('.natal-table').innerText()).toBe(guided);
});

test('known time, lunar input, optional names and escape work without placing birth data in URLs',async({page})=>{
 const requests:string[]=[];page.on('request',request=>requests.push(request.url()+' '+(request.postData()??'')));
 await page.goto('/');await page.getByRole('button',{name:/사주풀이 시작하기/}).click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.getByRole('button',{name:/사주풀이 시작하기/}).click();const d=page.getByRole('dialog');await d.getByRole('button',{name:'네, 시작할게요'}).click();
 for(let i=0;i<3;i++)await d.getByRole('button',{name:'건너뛰기'}).click();
 await d.getByLabel('음력',{exact:true}).check();await d.getByLabel('태어난 연도').fill('1995');await d.getByLabel('월',{exact:true}).selectOption('10');await d.getByLabel('일',{exact:true}).fill('16');await d.getByRole('button',{name:'계속'}).click();
 await d.getByLabel('태어난 시간을 몰라요').uncheck();await d.getByLabel('시 (0~23)').fill('15');await d.getByLabel('분 (0~59)').fill('03');await d.getByRole('button',{name:'계속'}).click();
 await d.getByLabel(/태어난 지역/).fill('서울');await d.getByRole('button',{name:'계속'}).click();await d.getByLabel(/이름 또는 별명/).fill('별명');await d.getByRole('button',{name:'하루사주 결과 보기'}).click();
 await expect(page).toHaveURL('/result/day/');await expect(page.locator('.birth-summary')).toContainText('별명');await expect(page.locator('.natal-table')).toBeVisible();
 expect(page.url()).not.toMatch(/1995|서울|별명/);
 expect(requests.join('\n')).not.toMatch(/1995|서울|별명|%EC%84%9C%EC%9A%B8|%EB%B3%84%EB%AA%85/i);
});
