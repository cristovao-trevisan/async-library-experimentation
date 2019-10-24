type Metadata = {} | {
  startedAt: Date,
  duration: number,
  runs: number,
  // ...
}
interface IInitialState {
  data: undefined,
  error: undefined,
  pending: false,
  resolved: false,
  aborted: false,
}
interface ILoadingState {
  data: undefined,
  error: undefined,
  pending: true,
  resolved: false,
  aborted: false,
}
interface IResolvedState<Data> {
  data: Data,
  error: undefined,
  pending: false,
  resolved: true,
  aborted: false,
}
interface IRejectedState {
  data: undefined,
  error: Error,
  pending: false,
  resolved: false,
  aborted: false,
}
interface IReloadingState<Data> {
  data?: Data,
  error?: Error,
  pending: true,
  resolved: boolean,
  aborted: false,
}
interface IAbortedState<Data> {
  data?: Data,
  error?: Error,
  pending: boolean,
  resolved: boolean,
  aborted: true,
}

export type State<Data> = /* Metadata & */ (
  IInitialState
  | ILoadingState
  | IResolvedState<Data>
  | IRejectedState
  | IReloadingState<Data>
  | IAbortedState<Data>
)

export const initialState: IInitialState = {
  data: undefined,
  error: undefined,
  pending: false,
  resolved: false,
  aborted: false,
}
export const resolvedState = <Data>(data: Data) : IResolvedState<Data> => ({
  data,
  error: undefined,
  pending: false,
  resolved: true,
  aborted: false,
})
export const rejectedState = (error: Error): IRejectedState => ({
  data: undefined,
  error,
  pending: false,
  resolved: false,
  aborted: false,
})
export const reloadingState = <Data>(data?: Data, error?: Error) : IReloadingState<Data> => ({
  data,
  error,
  pending: true,
  resolved: true,
  aborted: false,
})
