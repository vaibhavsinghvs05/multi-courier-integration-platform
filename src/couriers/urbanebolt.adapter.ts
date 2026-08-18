import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

import {
  CourierClientError,
  CourierUnavailableError,
} from './courier.errors';

import {
  CourierAdapter,
  NormalizedOrder,
  ShipmentResult,
  TrackingResult,
} from './courier.types';

@Injectable()
export class UrbaneBoltAdapter implements CourierAdapter {
  readonly partner = 'urbanebolt';

  private readonly logger = new Logger(UrbaneBoltAdapter.name);
  private token?: string;

  private get baseUrl(): string {
    return process.env.URBANEBOLT_BASE_URL ?? 'https://uat.urbanebolt.in';
  }

  private get retryAttempts(): number {
    return Number(process.env.COURIER_RETRY_ATTEMPTS ?? 3);
  }

  private get timeout(): number {
    return Number(process.env.COURIER_TIMEOUT_MS ?? 10000);
  }

  private get retryBackoff(): number {
    return Number(process.env.COURIER_RETRY_BACKOFF_MS ?? 250);
  }

  /**
   * Executes an HTTP request against the UrbaneBolt API.
   */
  private async request<T>(
    method: 'get' | 'post',
    path: string,
    data?: unknown,
    auth = true,
    retriedAuth = false,
  ): Promise<T> {
    for (let attempt = 0; attempt < this.retryAttempts; attempt += 1) {
      try {
        const token = auth ? await this.getToken() : undefined;

        const response = await axios.request<T>({
          method,
          url: `${this.baseUrl}${path}`,
          data,
          timeout: this.timeout,
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        });

        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;

        /**
         * Token may have expired.
         * Clear the cached token and retry authentication once.
         */
        if (
          axiosError.response?.status === 401 &&
          auth &&
          !retriedAuth
        ) {
          this.logger.warn(
            'UrbaneBolt authentication token expired. Refreshing token.',
          );

          this.token = undefined;

          return this.request<T>(
            method,
            path,
            data,
            true,
            true,
          );
        }

        /**
         * 4xx errors indicate that UrbaneBolt rejected the request.
         * Retrying normally will not help.
         */
        if (
          axiosError.response &&
          axiosError.response.status >= 400 &&
          axiosError.response.status < 500
        ) {
          this.logger.error(
            `UrbaneBolt rejected request: ${method.toUpperCase()} ${path} (${axiosError.response.status})`,
          );

          throw new CourierClientError(
            'UrbaneBolt rejected the request.',
          );
        }

        /**
         * Last retry failed.
         */
        if (attempt === this.retryAttempts - 1) {
          this.logger.error(
            `UrbaneBolt request failed after ${this.retryAttempts} attempts: ${method.toUpperCase()} ${path}`,
          );

          throw new CourierUnavailableError(
            'UrbaneBolt is temporarily unavailable.',
          );
        }

        const delay = this.retryBackoff * 2 ** attempt;

        this.logger.warn(
          `UrbaneBolt request failed. Retrying in ${delay}ms.`,
        );

        await this.sleep(delay);
      }
    }

    throw new CourierUnavailableError(
      'UrbaneBolt is temporarily unavailable.',
    );
  }

  /**
   * Retrieves and caches the UrbaneBolt authentication token.
   */
  private async getToken(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    const username = process.env.URBANEBOLT_USERNAME;
    const password = process.env.URBANEBOLT_PASSWORD;

    if (!username || !password) {
      throw new CourierUnavailableError(
        'UrbaneBolt credentials are not configured.',
      );
    }

    const response = await this.request<Record<string, string>>(
      'post',
      '/api/v1/auth/getToken/',
      {
        username,
        password,
      },
      false,
    );

    const token =
      response.token ??
      response.access ??
      response.access_token;

    if (!token) {
      throw new CourierUnavailableError(
        'UrbaneBolt authentication response did not contain a token.',
      );
    }

    this.token = token;

    return token;
  }

  /**
   * Creates a shipment in UrbaneBolt.
   */
  async createShipment(
    order: NormalizedOrder,
  ): Promise<ShipmentResult> {
    const payload = {
      orderNumber: order.orderId,

      declaredValue: order.declaredValue,
      itemDescription: order.itemDescription,
      collectableValue: order.collectableValue,

      height: order.dimensionsCm.height,
      length: order.dimensionsCm.length,
      breadth: order.dimensionsCm.breadth,

      pieces: 1,
      weight: order.weightKg,

      serviceType: 'SDD',

      payMode:
        order.paymentMode === 'COD'
          ? 'COD'
          : 'PPD',

      invoiceNumber: order.invoiceNumber,
      invoiceDate: order.invoiceDate,
      invoiceValue: order.declaredValue,
      itemQuantity: order.itemQuantity,

      // Shipper
      shprName: order.shipper.name,
      shprAddress: order.shipper.addressLine1,
      shprCity: order.shipper.city,
      shprState: order.shipper.state,
      shprPincode: order.shipper.pincode,
      shprMobile: order.shipper.phone,
      shprEmail: order.shipper.email,
      shprCountry: order.shipper.country ?? 'India',
      shprAddressType: 'Seller',

      // Consignee
      consName: order.consignee.name,
      consAddress: order.consignee.addressLine1,
      consCity: order.consignee.city,
      consState: order.consignee.state,
      consPincode: order.consignee.pincode,
      consMobile: order.consignee.phone,
      consEmail: order.consignee.email,
      consCountry: order.consignee.country ?? 'India',
      consAddressType: 'Home',

      // Return address
      rtnName: order.returnAddress.name,
      rtnAddress: order.returnAddress.addressLine1,
      rtnCity: order.returnAddress.city,
      rtnState: order.returnAddress.state,
      rtnPincode: order.returnAddress.pincode,
      rtnMobile: order.returnAddress.phone,
      rtnEmail: order.returnAddress.email,
      rtnCountry: order.returnAddress.country ?? 'India',
      rtnAddressType: 'Seller',
    };

    const response = await this.request<
      Record<string, unknown>[]
    >(
      'post',
      '/api/v1/services/manifest/',
      [payload],
    );

    const item = response[0] ?? {};

    const awb =
      item.awb ??
      item.awbNumber ??
      item.waybill;

    if (!awb) {
      throw new CourierClientError(
        'UrbaneBolt did not return an AWB.',
      );
    }

    return {
      courierOrderId: String(
        item.orderNumber ?? order.orderId,
      ),
      awbNumber: String(awb),
      status: 'CREATED',
      rawResponse: item,
    };
  }

  /**
   * Retrieves shipment tracking information.
   */
  async trackShipment(
    awb: string,
  ): Promise<TrackingResult> {
    const response = await this.request<
      Record<string, unknown>
    >(
      'get',
      `/api/v1/services/tracking-pub/?awb=${encodeURIComponent(awb)}`,
    );

    const status = String(
      response.status ??
        response.shipmentStatus ??
        'IN_TRANSIT',
    ).toUpperCase() as TrackingResult['status'];

    const events = Array.isArray(response.history)
      ? (response.history as Array<Record<string, unknown>>)
      : [];

    return {
      status,
      events,
      rawResponse: response,
    };
  }

  /**
   * Cancels an existing shipment.
   */
  async cancelShipment(
    awb: string,
  ): Promise<ShipmentResult> {
    const response = await this.request<
      Record<string, unknown>
    >(
      'post',
      '/api/v1/services/cancel/',
      {
        awbs: awb,
      },
    );

    return {
      awbNumber: awb,
      status: 'CANCELLED',
      rawResponse: response,
    };
  }

  /**
   * Utility for exponential retry backoff.
   */
  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}