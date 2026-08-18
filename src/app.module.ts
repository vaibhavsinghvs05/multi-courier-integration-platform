import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { CouriersModule } from './couriers/couriers.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'app', 'static'),
      exclude: ['/api/v1/{*splat}'],
    }),

    MongooseModule.forRoot(
      process.env.MONGODB_URI ??
        'mongodb://127.0.0.1:27017/courier_platform',
    ),

    CouriersModule,
    OrdersModule,
  ],
})
export class AppModule {}