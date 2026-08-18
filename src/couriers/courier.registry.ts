import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';

import { MockCourierAdapter } from './mock-courier.adapter';
import { UrbaneBoltAdapter } from './urbanebolt.adapter';
import { CourierAdapter } from './courier.types';

export const MOCK_COURIER = 'MOCK_COURIER';
export const URBANEBOLT_COURIER = 'URBANEBOLT_COURIER';

@Injectable()
export class CourierRegistry {
  private readonly adapters: Map<string, CourierAdapter>;

  constructor(
    @Inject(MOCK_COURIER)
    private readonly mockCourier: MockCourierAdapter,

    @Inject(URBANEBOLT_COURIER)
    private readonly urbaneBolt: UrbaneBoltAdapter,
  ) {
    if (!mockCourier) {
      throw new Error('MockCourierAdapter was not injected.');
    }

    if (!urbaneBolt) {
      throw new Error('UrbaneBoltAdapter was not injected.');
    }

    this.adapters = new Map<string, CourierAdapter>([
      [mockCourier.partner.toLowerCase(), mockCourier],
      [urbaneBolt.partner.toLowerCase(), urbaneBolt],
    ]);
  }

  get(partner: string): CourierAdapter {
    const normalizedPartner = partner.toLowerCase();

    const adapter = this.adapters.get(normalizedPartner);

    if (!adapter) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_COURIER',
        message: 'The courier partner is not supported.',
        details: {
          supportedCouriers: [...this.adapters.keys()],
        },
      });
    }

    return adapter;
  }
}