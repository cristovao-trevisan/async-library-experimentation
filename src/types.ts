import { State } from "./state"

interface RunOptions {
  reload?: boolean,
}

export type ISubscription<Data> = (state: State<Data>) => void
export type IUnsubscribeFunction = () => void

export interface IResource<Data, Props = any> {
  subscribe: (cb: ISubscription<Data>) => IUnsubscribeFunction,
  run: (props: Props, options?: RunOptions) => Promise<State<Data>>,
  abort: () => void,
}