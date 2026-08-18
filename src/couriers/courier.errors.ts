export class CourierClientError extends Error { readonly code = 'COURIER_REJECTED_REQUEST'; }
export class CourierUnavailableError extends Error { readonly code = 'COURIER_UNAVAILABLE'; }
