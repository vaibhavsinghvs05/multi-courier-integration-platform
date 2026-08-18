import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import {
  BulkOrdersDto,
  CreateOrderDto,
} from './dto/create-order.dto';

import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(OrdersService)
    private readonly orders: OrdersService,
  ) {}

  private requestId(value?: string): string {
    return value ?? randomUUID();
  }

  @Post()
  async create(
    @Body() dto: CreateOrderDto,
    @Headers('x-request-id') id?: string,
  ) {
    return {
      data: await this.orders.create(
        dto,
        this.requestId(id),
      ),
    };
  }

  @Get(':orderId/track')
  async track(
    @Param('orderId') orderId: string,
    @Headers('x-request-id') id?: string,
  ) {
    return {
      data: await this.orders.track(
        orderId,
        this.requestId(id),
      ),
    };
  }

  @Post(':orderId/cancel')
  async cancel(
    @Param('orderId') orderId: string,
    @Headers('x-request-id') id?: string,
  ) {
    return {
      data: await this.orders.cancel(
        orderId,
        this.requestId(id),
      ),
    };
  }

  @Post('bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  async bulk(
    @Body() dto: BulkOrdersDto,
    @Headers('x-request-id') id?: string,
  ) {
    return {
      data: await this.orders.submitBulk(
        dto.orders,
        this.requestId(id),
      ),
    };
  }
}