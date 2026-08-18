import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BatchDocument = HydratedDocument<Batch>;
export type BatchItemDocument = HydratedDocument<BatchItem>;

@Schema({ timestamps: true, collection: 'batches' })
export class Batch {
  @Prop({ type: String, required: true, unique: true })
  batchId!: string;

  @Prop({ type: Number, required: true })
  totalOrders!: number;

  @Prop({ type: Number, default: 0 })
  completedOrders!: number;

  @Prop({ type: Number, default: 0 })
  failedOrders!: number;

  @Prop({ type: String, default: 'PROCESSING' })
  status!: string;
}

export const BatchSchema = SchemaFactory.createForClass(Batch);

@Schema({ timestamps: true, collection: 'batch_items' })
export class BatchItem {
  @Prop({ type: String, required: true, index: true })
  batchId!: string;

  @Prop({ type: String, required: true })
  orderId!: string;

  @Prop({ type: String, required: true })
  status!: string;

  @Prop({ type: String })
  errorMessage?: string;
}

export const BatchItemSchema =
  SchemaFactory.createForClass(BatchItem);