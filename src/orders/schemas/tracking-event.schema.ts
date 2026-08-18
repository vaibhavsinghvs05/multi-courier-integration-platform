import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TrackingEventDocument =
  HydratedDocument<TrackingEvent>;

@Schema({
  timestamps: true,
  collection: 'tracking_events',
})
export class TrackingEvent {
  @Prop({ type: String, required: true, index: true })
  orderId!: string;

  @Prop({ type: String, required: true })
  status!: string;

  @Prop({ type: Date, required: true })
  occurredAt!: Date;

  @Prop({ type: Object, required: true })
  rawPayload!: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TrackingEventSchema =
  SchemaFactory.createForClass(TrackingEvent);