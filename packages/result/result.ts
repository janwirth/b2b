/**
 * Custom Result type to replace ts-belt's R.Result
 * Simple discriminated union with success and failure variants
 */

export type Result<T, E> = Success<T> | Failure<E>;

export type Success<T> = {
  readonly _tag: "Success";
  readonly value: T;
};

export type Failure<E> = {
  readonly _tag: "Failure";
  readonly error: E;
};
