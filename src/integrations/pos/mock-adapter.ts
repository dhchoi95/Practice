import type {MockOrder,POSAdapter} from './adapter';
export class MockPOSAdapter implements POSAdapter {async fetchSales(businessDate:string,menuId:string,unitPriceWon:bigint):Promise<MockOrder[]>{return [{externalOrderId:`mock:${businessDate}:a`,menuId,quantity:2,unitPriceWon,discountWon:0n},{externalOrderId:`mock:${businessDate}:b`,menuId,quantity:3,unitPriceWon,discountWon:0n}]}}
