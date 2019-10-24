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

interface IBasicRunProps<Props> {
  props: Props
  hash: string
}
type IActiveMiddlewareFunction<Props, Data> = IMiddlewareFunction<IBasicRunProps<Props>, State<Data>>
type IPassiveMiddlewareFunction<Props> = IMiddlewareFunction<IBasicRunProps<Props>, void>
export interface IMiddleware<Data, Props> {
  // willAbort
  // aborted
  // subscription
  // hasSubscription
  // unsubscription
  // noSubscriptions
  // willLoad
  // willRequest
  cache?: IActiveMiddlewareFunction<Props, Data>
  // resolved
  // rejected
  // finally
  finished?: IPassiveMiddlewareFunction<Props>
}

export interface IMiddlewareBuilder<Data, Props> {
  (API: IResource<Data, Props>): IMiddleware<Data, Props>
}

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

// export function applyMiddlewareHook<Data, Props>(middlewareList: IMiddleware<Data, Props>[]) {
// }
