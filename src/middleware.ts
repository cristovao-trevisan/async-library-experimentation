import { IResource } from "./types"

interface IFinishNextFunction { (): void }
interface IMiddlewareFunction<Args = any, Options = any, Return = void> {
  (args: Args, options: Options, next: IMiddlewareFunction | IFinishNextFunction): Return
}

interface ICacheProps<Props> {
  props: Props
  hash: string
}

export interface IMiddleware<Data, Props> {
  (API: IResource<Data, Props>): ({
    // willAbort
    // aborted
    // subscription
    // hasSubscription
    // unsubscription
    // noSubscriptions
    // willLoad
    // willRequest
    cache?: IMiddlewareFunction<ICacheProps<Props>, void, Data | undefined>
    // resolved
    // rejected
    // finally
    // finished
  })
}
