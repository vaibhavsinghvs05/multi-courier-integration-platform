import { MockCourierAdapter } from '../src/couriers/mock-courier.adapter';

describe('MockCourierAdapter', () => {
  it('returns a normalized shipment response', async () => {
    const result = await new MockCourierAdapter().createShipment({ orderId: 'ORD-1', courierPartner: 'mock', invoiceNumber: 'INV-1', invoiceDate: '2026-08-18', itemDescription: 'T-shirt', itemQuantity: 1, declaredValue: 100, paymentMode: 'PREPAID', collectableValue: 0, weightKg: 0.4, dimensionsCm: { length: 10, breadth: 10, height: 10 }, shipper: { name: 'A', addressLine1: 'A', city: 'A', state: 'A', pincode: '1', phone: '1' }, consignee: { name: 'B', addressLine1: 'B', city: 'B', state: 'B', pincode: '1', phone: '1' }, returnAddress: { name: 'A', addressLine1: 'A', city: 'A', state: 'A', pincode: '1', phone: '1' } });
    expect(result).toMatchObject({ status: 'CREATED', awbNumber: 'MOCK-ORD-1' });
  });
});
