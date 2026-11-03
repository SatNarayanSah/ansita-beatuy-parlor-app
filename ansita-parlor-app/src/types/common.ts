/** Unique identifier for any entity (prefixed, e.g. `cus_k3j9x2`). */
export type ID = string;

/** Calendar date in `yyyy-MM-dd` format. */
export type ISODate = string;

/** Full timestamp in ISO-8601 format (`new Date().toISOString()`). */
export type ISODateTime = string;

/** 24-hour clock time in `HH:mm` format. */
export type TimeString = string;

/** Remote URL or local file URI of an image. */
export type ImageUri = string;

export type Gender = 'female' | 'male' | 'other';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Common in Nepal: cash, the eSewa / Khalti wallets, Fonepay QR, cards and bank transfer. */
export type PaymentMethod = 'cash' | 'esewa' | 'khalti' | 'fonepay' | 'card' | 'bank';

/** Methods a customer can pay by themselves (outside the app) and then ask the parlour to verify. */
export type OnlinePaymentMethod = 'esewa' | 'khalti' | 'fonepay' | 'bank';

/** What a customer can send "I've paid" for: an online method, or cash paid at the parlour that isn't on the bill yet. */
export type PaymentRequestMethod = OnlinePaymentMethod | 'cash';

/** Fields every persisted entity carries. */
export interface BaseEntity {
  id: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Payload for creating an entity: server-managed fields are omitted. */
export type CreateInput<T extends BaseEntity> = Omit<T, keyof BaseEntity>;

/** Payload for updating an entity: any subset of the editable fields. */
export type UpdateInput<T extends BaseEntity> = Partial<CreateInput<T>>;
