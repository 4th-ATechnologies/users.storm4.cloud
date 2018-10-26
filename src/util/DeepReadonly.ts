
// tslint:disable:ban-types
// tslint:disable:no-shadowed-variable

type DeepReadonly<T> =
  T extends Array<infer A>        ? DeepReadonlyArray<A> :
  T extends Function              ? T :
  T extends Map<infer U, infer V> ? ReadonlyMap<DeepReadonlyObject<U>, DeepReadonlyObject<V>> :
  T extends Set<infer U>          ? ReadonlySet<DeepReadonlyObject<U>> :
  T extends Uint8Array            ? Readonly<T> :
  T extends Uint16Array           ? Readonly<T> :
  T extends Uint32Array           ? Readonly<T> :
  T extends Int8Array             ? Readonly<T> :
  T extends Int16Array            ? Readonly<T> :
  T extends Int32Array            ? Readonly<T> :
  T extends Float32Array          ? Readonly<T> :
  T extends Float64Array          ? Readonly<T> :
  T extends object                ? DeepReadonlyObject<T> :
  T

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}
type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }
