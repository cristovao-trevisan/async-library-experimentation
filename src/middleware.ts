import { IResource } from "./types"
import { State } from "./state"

export type IMiddlewareFunction<Options = any, Return = undefined | void> =
  (
    options: Options,
    next: (opts: Options) => Return | Promise<Return>,
  )
  => Return | Promise<Return>

interface IBasicHookProps<Data> {
  hash: string
  state: State<Data>
}
export interface IRunHookProps<Data, Props> extends IBasicHookProps<Data> {
  props: Props
}
export interface IAbortHookProps<Data> extends IBasicHookProps<Data> {
  abortController?: AbortController
}
export interface ISubscriptionHookProps<Data> extends IBasicHookProps<Data> {}

type IRunHookFunction<Props, Data, Return = void | undefined> = IMiddlewareFunction<IRunHookProps<Data, Props>, Return>
type IAbortHookFunction<Data, Return = void | undefined> = IMiddlewareFunction<IAbortHookProps<Data>, Return>
type ISubscriptionHookFunction<Data> = IMiddlewareFunction<ISubscriptionHookProps<Data>>

/** List of all available hooks */
export type Hooks =
  'cache' | 'resolved' | 'rejected' | 'finished' | 'finally' | 'willLoad' | 'willRequest'
  | 'willAbort' | 'aborted'
  | 'subscription' | 'hasSubscription' | 'unsubscription' | 'noSubscriptions'

/** Middleware interface, returned by the builder and used by the Resource instance */
export interface IMiddleware<Data, Props> {
  // ABORT HOOKS
  willAbort?: IAbortHookFunction<Data>
  aborted?: IAbortHookFunction<Data, State<Data>>

  // SUBSCRIPTION HOOKS
  /** Called every time a subscription is added */
  subscription?: ISubscriptionHookFunction<Data>
  /** Called when a subscription is added and there was none before */
  hasSubscription?: ISubscriptionHookFunction<Data>
  unsubscription?: ISubscriptionHookFunction<Data>
  /** Called when the only existing subscription is removed */
  noSubscriptions?: ISubscriptionHookFunction<Data>

  // RUN HOOKS
  /** Called when run will begin */
  willLoad?: IRunHookFunction<Props, Data>
  /** If a value is returned, it is used instead of calling fn  */
  cache?: IRunHookFunction<Props, Data, Data>
  /** Called before fn is called  */
  willRequest?: IRunHookFunction<Props, Data>
  resolved?: IRunHookFunction<Props, Data, State<Data>>
  rejected?: IRunHookFunction<Props, Data, State<Data>>
  finally?: IRunHookFunction<Props, Data, State<Data>>
  finished?: IRunHookFunction<Props, Data>
}

/**
 * This is how Middleware should be declared, as createResource
 * creates the middleware using this signature
 */
export type IMiddlewareBuilder<Data, Props> =
  (API: IResource<Data, Props>) => IMiddleware<Data, Props>

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
  type ExecutionItem = (opts?: Options) => Promise<Return> | Return
  let current: ExecutionItem = () => initialState

  for (let i = size - 1; i >= 0; i--) {
    const fn = middlewareFunctions[i]
    const next = current
    const wrapper = async (opts?: Options) => fn(opts || options, next)
    current = wrapper
  }

  return current(options)
}

/**
 * TODO: improve type usage (remove any)
 * Selects and filter the middleware for the given hook, then executes it
 */
export function applyMiddlewareHook<Data, Props, Options, Return>(middlewareList: IMiddleware<Data, Props>[], key: Hooks) {
  const middleware = middlewareList.map(item => item[key]).filter(x => !!x) as IMiddlewareFunction<any, any>[]
  return (options: Options, initialState: Return) => executeMiddlewareFunctions<Options, Return>(middleware, options, initialState)
}
