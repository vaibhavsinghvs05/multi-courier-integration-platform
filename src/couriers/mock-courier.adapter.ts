import { Injectable } from '@nestjs/common';
import { CourierAdapter, NormalizedOrder, ShipmentResult, TrackingResult } from './courier.types';

@Injectable()
export class MockCourierAdapter implements CourierAdapter {
  readonly partner = 'mock';
  async createShipment(order: NormalizedOrder): Promise<ShipmentResult> { const awbNumber = `MOCK-${order.orderId}`; return { courierOrderId: order.orderId, awbNumber, status: 'CREATED', rawResponse: { shipment_id: order.orderId, awb: awbNumber } }; }
  async trackShipment(awb: string): Promise<TrackingResult> { return { status: 'IN_TRANSIT', events: [{ status: 'IN_TRANSIT', awb }], rawResponse: { awb, status: 'IN_TRANSIT' } }; }
  async cancelShipment(awb: string): Promise<ShipmentResult> { return { awbNumber: awb, status: 'CANCELLED', rawResponse: { awb, status: 'CANCELLED' } }; }
}
