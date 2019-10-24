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
type IActiveMiddlewareFunction<Props, Data> = IMiddlewareFunction<IBasicRunProps<Props, Data>, Data>
type IPassiveMiddlewareFunction<Props, Data> = IMiddlewareFunction<IBasicRunProps<Props, Data>, void>
export type Hooks =
  'cache' | 'resolved' | 'rejected' | 'finished' | 'finally' | 'willLoad' | 'willRequest'
  | 'willAbort' | 'aborted'
  | 'subscription' | 'hasSubscription' | 'unsubscription' | 'noSubscriptions'
export interface IMiddleware<Data, Props> {
  willAbort?: IPassiveMiddlewareFunction<Props, Data>
  aborted?: IActiveMiddlewareFunction<Props, Data>
  subscription?: IPassiveMiddlewareFunction<Props, Data>
  hasSubscription?: IPassiveMiddlewareFunction<Props, Data>
  unsubscription?: IPassiveMiddlewareFunction<Props, Data>
  noSubscriptions?: IPassiveMiddlewareFunction<Props, Data>
  willLoad?: IPassiveMiddlewareFunction<Props, Data>
  willRequest?: IPassiveMiddlewareFunction<Props, Data>
  cache?: IActiveMiddlewareFunction<Props, Data>
  resolved?: IActiveMiddlewareFunction<Props, Data>
  rejected?: IActiveMiddlewareFunction<Props, Data>
  finally?: IActiveMiddlewareFunction<Props, Data>
  finished?: IPassiveMiddlewareFunction<Props, Data>
}

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

export function applyMiddlewareHook<Data, Props, Options, Return>(middlewareList: IMiddleware<Data, Props>[], key: Hooks) {
  const middleware = middlewareList.map(item => item[key]).filter(x => !!x) as IMiddlewareFunction<any, any>[]
  return (options: Options, initialState: Return) => executeMiddlewareFunctions<Options, Return>(middleware, options, initialState)
}
