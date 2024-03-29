import { State, initialState, resolvedState, rejectedState, loadingState } from './state'
import { hashCode } from './hash'
import { IResource, ISubscription } from './types'
import { IMiddleware, applyMiddlewareHook, IMiddlewareBuilder, Hooks, IRunHookProps, IAbortHookProps } from './middleware'


interface ICreateResourceParams<Data, Props> {
  fn: (props: Props, currentData?: Data, abort?: AbortController) => Promise<Data>,
  hash?: (props: Props) => string,
  abortController?: AbortController,
}

export function createResource<Data, Props = any> (
  options: ICreateResourceParams<Data, Props>,
  _middleware: IMiddlewareBuilder<Data, Props>[] = [],
): IResource<Data, Props> {
  // options
  let abortController = options.abortController
  if (!abortController && typeof AbortController !== 'undefined') abortController = new AbortController()
  const hash = options.hash || hashCode
  const middleware: IMiddleware<Data, Props>[] = []
  // variables
  let state: State<Data> = { ...initialState }
  let currentHash: string | undefined
  let subscriptions: ISubscription<Data>[] = []

  // helpers
  const applyRunHook = <Return>(name: Hooks, props: Props, value: Return) => applyMiddlewareHook<Data, Props, IRunHookProps<Data, Props>, Return>
    (middleware, name)
    ({ hash: currentHash!, props, state }, value)
  const applyAbortHook = <Return>(name: Hooks, value: Return) => applyMiddlewareHook<Data, Props, IAbortHookProps<Data>, Return>
    (middleware, name)
    ({ hash: currentHash!, state, abortController }, value)
  const applySubscriptionHook = (name: Hooks) => applyMiddlewareHook<Data, Props, IAbortHookProps<Data>, void>
    (middleware, name)
    ({ hash: currentHash!, state, abortController })
  
  // functions
  const callSubscriptions = () => subscriptions.forEach(cb => cb(state))
  const doAbort = () => {
    if (abortController) abortController.abort()
    state = { ...state, aborted: true }
  }

  // api
  const API: IResource<Data, Props> = {
    async abort() {
      await applyAbortHook('willAbort', undefined)
      doAbort()
      state = await applyAbortHook('aborted', state)
      callSubscriptions()
    },
    subscribe(cb) {
      cb(state)
      subscriptions.push(cb)
      applySubscriptionHook('subscription')
      if (subscriptions.length === 1) applySubscriptionHook('hasSubscription')
      const unsubscribe = () => {
        applySubscriptionHook('unsubscription')
        subscriptions = subscriptions.filter(x => x !== cb)
        if (subscriptions.length === 0) {
          applySubscriptionHook('noSubscriptions')
          doAbort()
        }
      }
      return unsubscribe
    },
    async run(props, runOptions = {}) {
      // check if prop changed
      const newHash = hash(props)
      if (currentHash === newHash) {
        if (!runOptions.reload) return state
      }
      // if we already have data
      if (currentHash) {
        if (state.pending) doAbort()
        // reset state if not reloading
        if (!runOptions.reload || currentHash !== newHash) state = { ...initialState }
      }

      if (state.pending) return state
      currentHash = newHash
      try {
        // loading phase
        state = loadingState(state)
        await applyRunHook('willLoad', props, undefined)
        callSubscriptions()
        
        // cache and fetch
        const cachedData = await applyRunHook<Data | undefined>('cache', props, state.data)
        if (cachedData) state = resolvedState(cachedData)
        else {
          await applyRunHook('willRequest', props, undefined)
          const data = await options.fn(props, state.data, abortController)
          state = resolvedState(data)
        }
        state = await applyRunHook('resolved', props, { ...state })
      } catch (error) {
        state = rejectedState(error as Error)
        state = await applyRunHook('rejected', props, { ...state })
      }
      state = await applyRunHook('finally', props, { ...state })
      callSubscriptions()
      await applyRunHook('finished', props, undefined)

      return state
    },
  }

  // create middleware
  _middleware.forEach(md => middleware.push(md(API)))
  return API
}
