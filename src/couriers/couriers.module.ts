import { Module } from '@nestjs/common';

import {
  CourierRegistry,
  MOCK_COURIER,
  URBANEBOLT_COURIER,
} from './courier.registry';

import { MockCourierAdapter } from './mock-courier.adapter';
import { UrbaneBoltAdapter } from './urbanebolt.adapter';

@Module({
  providers: [
    MockCourierAdapter,
    UrbaneBoltAdapter,

    {
      provide: MOCK_COURIER,
      useExisting: MockCourierAdapter,
    },

    {
      provide: URBANEBOLT_COURIER,
      useExisting: UrbaneBoltAdapter,
    },

    CourierRegistry,
  ],
  exports: [CourierRegistry],
})
export class CouriersModule {}