import {
  ConflictException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';

import {
  CourierRegistry,
} from '../couriers/courier.registry';

import {
  CourierClientError,
  CourierUnavailableError,
} from '../couriers/courier.errors';

import { CreateOrderDto } from './dto/create-order.dto';

import {
  Batch,
  BatchDocument,
  BatchItem,
  BatchItemDocument,
} from './schemas/batch.schema';

import {
  Order as OrderEntity,
  OrderDocument,
} from './schemas/order.schema';

import {
  TrackingEvent as TrackingEventEntity,
  TrackingEventDocument,
} from './schemas/tracking-event.schema';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(OrderEntity.name)
    private readonly orders: Model<OrderDocument>,

    @InjectModel(TrackingEventEntity.name)
    private readonly tracking: Model<TrackingEventDocument>,

    @InjectModel(Batch.name)
    private readonly batches: Model<BatchDocument>,

    @InjectModel(BatchItem.name)
    private readonly batchItems: Model<BatchItemDocument>,

    @Inject(CourierRegistry)
    private readonly couriers: CourierRegistry,
  ) {}

  private present(order: OrderDocument): Record<string, unknown> {
    const value = order.toObject();

    return {
      orderId: value.orderId,
      courierPartner: value.courierPartner,
      courierOrderId: value.courierOrderId,
      awbNumber: value.awbNumber,
      status: value.status,
      errorCode: value.errorCode,
      errorMessage: value.errorMessage,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  async create(
    dto: CreateOrderDto,
    requestId: string,
  ): Promise<Record<string, unknown>> {
    const existing = await this.orders.findOne({
      orderId: dto.orderId,
    });

    if (existing) {
      return {
        ...this.present(existing),
        idempotentReplay: true,
      };
    }

    const adapter = this.couriers.get(dto.courierPartner);

    let saved: OrderDocument;

    try {
      saved = await this.orders.create({
        ...dto,
        status: 'PROCESSING',
        requestPayload: dto,
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000
      ) {
        const replay = await this.orders.findOne({
          orderId: dto.orderId,
        });

        if (replay) {
          return {
            ...this.present(replay),
            idempotentReplay: true,
          };
        }
      }

      throw error;
    }

    try {
      const result = await adapter.createShipment(dto);

      const updated = await this.orders.findByIdAndUpdate(
        saved._id,
        {
          courierOrderId: result.courierOrderId,
          awbNumber: result.awbNumber,
          status: result.status,
          courierResponse: result.rawResponse,
          $unset: {
            errorCode: 1,
            errorMessage: 1,
          },
        },
        {
          new: true,
        },
      );

      return this.present(updated!);
    } catch (error: unknown) {
      const code =
        error instanceof CourierClientError ||
        error instanceof CourierUnavailableError
          ? error.code
          : 'COURIER_FAILURE';

      this.logger.error({
        orderId: dto.orderId,
        courierPartner: dto.courierPartner,
        requestId,
        errorType: code,
        error,
      });

      await this.orders.findByIdAndUpdate(saved._id, {
        status: 'FAILED',
        errorCode: code,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Unknown courier error',
      });

      throw error;
    }
  }

  async track(
    orderId: string,
    requestId: string,
  ): Promise<Record<string, unknown>> {
    const order = await this.requireOrder(orderId);

    if (!order.awbNumber) {
      throw new ConflictException(
        'Tracking is unavailable until an AWB has been assigned.',
      );
    }

    const result = await this.couriers
      .get(order.courierPartner)
      .trackShipment(order.awbNumber);

    const events = [
      {
        status: result.status,
        rawPayload: result.rawResponse,
      },
      ...result.events.map((event) => ({
        status: String(event.status ?? result.status),
        rawPayload: event,
      })),
    ];

    await this.tracking.insertMany(
      events.map((event) => ({
        orderId,
        ...event,
        occurredAt: new Date(),
      })),
    );

    const updated = await this.orders.findByIdAndUpdate(
      order._id,
      {
        status: result.status,
      },
      {
        new: true,
      },
    );

    return {
      ...this.present(updated!),
      trackingHistory: await this.tracking
        .find({ orderId })
        .sort({ createdAt: 1 })
        .lean(),
    };
  }

  async cancel(
    orderId: string,
    requestId: string,
  ): Promise<Record<string, unknown>> {
    const order = await this.requireOrder(orderId);

    if (!order.awbNumber) {
      throw new ConflictException(
        'Cancellation is unavailable until an AWB has been assigned.',
      );
    }

    if (['CANCELLED', 'DELIVERED'].includes(order.status)) {
      throw new ConflictException(
        `An order with status ${order.status} cannot be cancelled.`,
      );
    }

    const result = await this.couriers
      .get(order.courierPartner)
      .cancelShipment(order.awbNumber);

    await this.tracking.create({
      orderId,
      status: result.status,
      occurredAt: new Date(),
      rawPayload: result.rawResponse,
    });

    const updated = await this.orders.findByIdAndUpdate(
      order._id,
      {
        status: result.status,
      },
      {
        new: true,
      },
    );

    return this.present(updated!);
  }

  async submitBulk(
    orders: CreateOrderDto[],
    requestId: string,
  ): Promise<Record<string, unknown>> {
    if (!orders.length || orders.length > 100) {
      throw new ConflictException(
        'Bulk requests must contain between 1 and 100 orders.',
      );
    }

    const batchId = randomUUID();

    await this.batches.create({
      batchId,
      totalOrders: orders.length,
    });

    setImmediate(() => {
      void Promise.allSettled(
        orders.map((order) =>
          this.processBulkItem(
            batchId,
            order,
            requestId,
          ),
        ),
      );
    });

    return {
      batchId,
      status: 'PROCESSING',
      totalOrders: orders.length,
    };
  }

  private async processBulkItem(
    batchId: string,
    dto: CreateOrderDto,
    requestId: string,
  ): Promise<void> {
    let status = 'FAILED';
    let errorMessage: string | undefined;

    try {
      status = String(
        (await this.create(dto, requestId)).status,
      );
    } catch (error: unknown) {
      errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error';
    }

    await this.batchItems.create({
      batchId,
      orderId: dto.orderId,
      status,
      errorMessage,
    });

    const completedOrders =
      await this.batchItems.countDocuments({
        batchId,
      });

    const failedOrders =
      await this.batchItems.countDocuments({
        batchId,
        status: 'FAILED',
      });

    const batch = await this.batches.findOne({
      batchId,
    });

    if (!batch) {
      return;
    }

    await this.batches.updateOne(
      { batchId },
      {
        completedOrders,
        failedOrders,
        status:
          completedOrders === batch.totalOrders
            ? 'COMPLETED'
            : 'PROCESSING',
      },
    );
  }

  async getBatch(
    batchId: string,
  ): Promise<Record<string, unknown>> {
    const batch = await this.batches
      .findOne({ batchId })
      .lean();

    if (!batch) {
      throw new NotFoundException(
        'The requested batch was not found.',
      );
    }

    return {
      ...batch,
      items: await this.batchItems
        .find({ batchId })
        .lean(),
    };
  }

  private async requireOrder(
    orderId: string,
  ): Promise<OrderDocument> {
    const order = await this.orders.findOne({
      orderId,
    });

    if (!order) {
      throw new NotFoundException(
        'The requested order was not found.',
      );
    }

    return order;
  }
}