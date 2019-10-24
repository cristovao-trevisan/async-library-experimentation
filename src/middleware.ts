import { IResource } from "./types"
import { State } from "./state"

interface IMiddlewareFunctionOptions<Options, Return> {
  options: Options,
  state: Return,
}

export interface IMiddlewareFunction<Options = any, Return = undefined | void> {
  (
    options: IMiddlewareFunctionOptions<Options, Return>,
    next: (opts: IMiddlewareFunctionOptions<Options, Return>) => Return | Promise<Return>,
  ): Return | Promise<Return>
}

interface IBasicRunProps<Props, Data> {
  props: Props
  hash: string
  state: State<Data>
}
/** Active means it's return sets a value (state, data, etc...) */
type IActiveMiddlewareFunction<Props, Data> = IMiddlewareFunction<IBasicRunProps<Props, Data>, Data>
/** Passive means it doesn't have any affect */
type IPassiveMiddlewareFunction<Props, Data> = IMiddlewareFunction<IBasicRunProps<Props, Data>, void>
/** List of all available hooks */
export type Hooks =
  'cache' | 'resolved' | 'rejected' | 'finished' | 'finally' | 'willLoad' | 'willRequest'
  | 'willAbort' | 'aborted'
  | 'subscription' | 'hasSubscription' | 'unsubscription' | 'noSubscriptions'

/** Middleware interface, returned by the builder and used by the Resource API */
export interface IMiddleware<Data, Props> {
  willAbort?: IPassiveMiddlewareFunction<Props, Data>
  aborted?: IActiveMiddlewareFunction<Props, Data>
  /** Called every time a subscription is added */
  subscription?: IPassiveMiddlewareFunction<Props, Data>
  /** Called when a subscription is added and there was none before */
  hasSubscription?: IPassiveMiddlewareFunction<Props, Data>
  unsubscription?: IPassiveMiddlewareFunction<Props, Data>
  /** Called when the only existing subscription is removed */
  noSubscriptions?: IPassiveMiddlewareFunction<Props, Data>
  /** Called when run will begin */
  willLoad?: IPassiveMiddlewareFunction<Props, Data>
  /** If a value is returned, it is used instead of calling fn  */
  cache?: IActiveMiddlewareFunction<Props, Data>
  /** Called before fn is called  */
  willRequest?: IPassiveMiddlewareFunction<Props, Data>
  resolved?: IActiveMiddlewareFunction<Props, Data>
  rejected?: IActiveMiddlewareFunction<Props, Data>
  finally?: IActiveMiddlewareFunction<Props, Data>
  finished?: IPassiveMiddlewareFunction<Props, Data>
}

/**
 * This is how Middleware should be declared, as createResource
 * creates the middleware using this signature
 */
export interface IMiddlewareBuilder<Data, Props> {
  (API: IResource<Data, Props>): IMiddleware<Data, Props>
}

/**
 * Wraps all middleware functions by linking each item as the next function
 * of the previous one, then executes everything
 */
export async function executeMiddlewareFunctions<Options, Return>(
  middlewareFunctions: IMiddlewareFunction<Options, Return>[],
  options: Options,
  initialState: Return,
) {
  const size = middlewareFunctions.length
  type ExecutionItem = (opts?: OptionalOptions) => Promise<Return> | Return
  let current: ExecutionItem = (opts = {}) => opts.state || initialState
  interface OptionalOptions {
    options?: Options
    state?: Return
  }

  for (let i = size - 1; i >= 0; i--) {
    const fn = middlewareFunctions[i]
    const next = current
    const wrapper = async (opts: OptionalOptions = {}) => {
      return await fn({
        options: opts.options || options,
        state: opts.state || initialState,
      }, next)
    }
    current = wrapper
  }

  return current({
    options,
    state: initialState,
  })
}

/**
 * TODO: improve type usage (remove any)
 * Selects and filter the middleware for the given hook, then executes it
 */
export function applyMiddlewareHook<Data, Props, Options, Return>(middlewareList: IMiddleware<Data, Props>[], key: Hooks) {
  const middleware = middlewareList.map(item => item[key]).filter(x => !!x) as IMiddlewareFunction<any, any>[]
  return (options: Options, initialState: Return) => executeMiddlewareFunctions<Options, Return>(middleware, options, initialState)
}
