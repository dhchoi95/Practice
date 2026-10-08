export type MockOrder={externalOrderId:string;menuId:string;quantity:number;unitPriceWon:bigint;discountWon:bigint};
export interface POSAdapter { fetchSales(businessDate:string,menuId:string,unitPriceWon:bigint):Promise<MockOrder[]> }
