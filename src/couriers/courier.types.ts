export type ShipmentStatus = 'CREATED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'FAILED';

export interface NormalizedOrder {
  orderId: string; courierPartner: string; invoiceNumber: string; invoiceDate: string;
  itemDescription: string; itemQuantity: number; declaredValue: number; paymentMode: 'PREPAID' | 'COD';
  collectableValue: number; weightKg: number; dimensionsCm: { length: number; breadth: number; height: number };
  shipper: Address; consignee: Address; returnAddress: Address;
}
export interface Address { name: string; addressLine1: string; city: string; state: string; pincode: string; phone: string; email?: string; country?: string; }
export interface ShipmentResult { courierOrderId?: string; awbNumber?: string; status: ShipmentStatus; rawResponse: Record<string, unknown>; }
export interface TrackingResult { status: ShipmentStatus; events: Array<Record<string, unknown>>; rawResponse: Record<string, unknown>; }
export interface CourierAdapter { readonly partner: string; createShipment(order: NormalizedOrder): Promise<ShipmentResult>; trackShipment(awb: string): Promise<TrackingResult>; cancelShipment(awb: string): Promise<ShipmentResult>; }
