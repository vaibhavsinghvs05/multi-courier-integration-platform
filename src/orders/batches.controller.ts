import { Controller, Get, Param } from '@nestjs/common'; import { OrdersService } from './orders.service';
@Controller('batches') export class BatchesController { constructor(private readonly orders: OrdersService) {} @Get(':batchId') async get(@Param('batchId') batchId: string) { return { data: await this.orders.getBatch(batchId) }; } }
