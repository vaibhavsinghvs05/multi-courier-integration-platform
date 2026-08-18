import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ type: String, required: true, unique: true, index: true })
  orderId!: string;

  @Prop({ type: String, required: true, index: true })
  courierPartner!: string;

  @Prop({ type: String })
  courierOrderId?: string;

  @Prop({ type: String })
  awbNumber?: string;

  @Prop({ type: String, required: true })
  status!: string;

  @Prop({ type: Object, required: true })
  requestPayload!: Record<string, unknown>;

  @Prop({ type: Object })
  courierResponse?: Record<string, unknown>;

  @Prop({ type: String })
  errorCode?: string;

  @Prop({ type: String })
  errorMessage?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);