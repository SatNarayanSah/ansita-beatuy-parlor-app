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

export type PaymentMethod = 'cash' | 'upi' | 'card';

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
