type ArrayKeys<T extends unknown[]> =
T extends [unknown, ...unknown[]]
  ? T extends Record<infer Index, unknown>
    ? Index extends `${number}`
      ? Index
      : never
    : never
  : `${number}`

type ObjectKeys<T extends object> =
T extends unknown[]
  ? ArrayKeys<T>
  : keyof T & string

interface HasConstructor {
  new (...args: any[]): any
}

export type NestedKeyOf<T> = T extends Record<infer Key, unknown>
  ? T extends HasConstructor
    ? never
    : T extends CallableFunction
      ? never
      : Key extends string | number
        ? ObjectKeys<T> | (T[Key] extends object
          ? `${ObjectKeys<Pick<T, Key>>}.${NestedKeyOf<T[Key]>}`
          : T extends unknown[]
            ? T extends [unknown, ...unknown[]]
              ? never
              : T[number] extends object
                ? `${number}.${NestedKeyOf<T[number]>}`
                : never
            : never
        )
        : never
  : never

interface SuccessValidation<TData> {
  success: true
  data: TData
  keys?: NestedKeyOf<TData>[]
}

export interface ValidateOptions<TData> {
  keys?: NestedKeyOf<TData>[]
}

export interface ErrorValidation<TData> {
  success: false
  errors: {
      path: string[]
      message: string
  }[]
}

export interface ErrorResponseData<TData> {
  success: false
  errors: Record<NestedKeyOf<TData>, string>
  error: string
  keys?: NestedKeyOf<TData>[]
}

export type ValidationResult<TData extends object> =
 SuccessValidation<TData> | ErrorValidation<TData> 

export type ValidationResponseData<TData extends object> = {
  success: true,
  data: TData
} | ErrorResponseData<TData>

interface Validator<TData extends object> {
  validateForm: () => TData
  validateKeys: (...keys: (NestedKeyOf<TData>)[]) => void
}

interface SubmitOptions<TData extends object, TResp> {
  validate?: boolean
  onError?: (error: Error, data: TData) => Promise<Error|null>
  onBefore?: (data: TData) => Promise<boolean>
  onSuccess?: <T = TResp>(resp: T, data: TData) => Promise<TResp>
}

export interface Form<TData extends object, Tresp> {
  data: () => TData
  setData: (data: TData) => void
  errors: Map<NestedKeyOf<TData>, string>
  validatedKeys: Set<NestedKeyOf<TData>>
  submitting: boolean
  validating: boolean
  error: (key?: NestedKeyOf<TData>) => string | undefined
  validate: (...keys: (NestedKeyOf<TData>)[]) => Promise<TData|false>
  reset: () => void
  submit: (options?: SubmitOptions<TData, Tresp>) => Promise<Tresp|null>
  isValid: (...keys: (NestedKeyOf<TData>)[]) => boolean
  isInvalid: (...keys: (NestedKeyOf<TData>)[]) => boolean
  isTouched: (...keys: (NestedKeyOf<TData>)[]) => boolean
  touch(...key: (NestedKeyOf<TData>)[]): void
  forgetErrors: (...keys: (NestedKeyOf<TData>)[]) => void
}
