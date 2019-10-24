import fetch from 'node-fetch'
import { State, initialState, resolvedState, rejectedState } from "./state"
import { hashCode } from './hash'
import { IResource, ISubscription } from './types'
import { executeMiddlewareFunctions, IMiddleware, applyMiddlewareHook, IMiddlewareBuilder } from './middleware'
import { inMemoryCache } from './middleware-imp/in-memory-cache'


interface ICreateResourceParams<Data, Props> {
  fn: (props: Props, currentData?: Data, abort?: AbortController) => Promise<Data>,
  hash?: (props: Props) => string,
  abortController?: AbortController,
}

function createResource<Data, Props = any> (
  options: ICreateResourceParams<Data, Props>,
  _middleware: IMiddlewareBuilder<Data, Props>[] = [],
): IResource<Data, Props> {
  // types
  interface IRunHookProps {
    hash: string,
    props: Props,
    state: State<Data>
  }

  // options
  let abortController = options.abortController
  if (!abortController && typeof AbortController !== 'undefined') abortController = new AbortController()
  const hash = options.hash || hashCode
  const middleware: IMiddleware<Data, Props>[] = []
  // variables
  let state: State<Data> = { ...initialState }
  let currentHash: string | undefined
  let subscriptions: ISubscription<Data>[] = []

  const applyRunHook = <Return>(name: string, props: Props, value: Return) => applyMiddlewareHook<Data, Props, IRunHookProps, Return>
    (middleware, 'willLoad')
    ({ hash: currentHash!, props, state }, value)

  // functions
  const callSubscriptions = () => subscriptions.forEach(cb => cb(state))
  const doAbort = () => {
    if (abortController) abortController.abort()
    state = { ...state, aborted: true }
  }

  // api
  const API: IResource<Data, Props> = {
    abort() {
      // TODO: willAbort hook
      doAbort()
      // TODO: aborted hook
      callSubscriptions()
    },
    subscribe(cb) {
      subscriptions.push(cb)
      // TODO: new subs hook and first subs hook
      const unsubscribe = () => {
        // TODO: unsubs hook and no subs hook
        subscriptions = subscriptions.filter(x => x !== cb)
        if (subscriptions.length === 0) doAbort()
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
        if (!runOptions.reload) state = { ...initialState }
      }

      if (state.pending) return state
      currentHash = newHash
      try {
        state = { ...state, pending: true }
        // willLoad hook
        await applyMiddlewareHook<Data, Props, IRunHookProps, void>
          (middleware, 'willLoad')
          ({ hash: currentHash, props, state })
        callSubscriptions()
        // willRequest hook
        await applyMiddlewareHook<Data, Props, IRunHookProps, void>
          (middleware, 'willRequest')
          ({ hash: currentHash, props, state })
        // cache hook
        const cachedData = await applyMiddlewareHook<Data, Props, IRunHookProps, Data | undefined>
          (middleware, 'cache')
          ({ hash: currentHash, props, state }, undefined)
        if (cachedData) state = resolvedState(cachedData)
        else {
          const data = await options.fn(props, state.data, abortController)
          state = resolvedState(data)
        }
        // resolved hook
        state = await applyMiddlewareHook<Data, Props, IRunHookProps, State<Data>>
          (middleware, 'resolved')
          ({ hash: currentHash, props, state }, { ...state })
      } catch (error) {
        state = rejectedState(error as Error)
        // rejected hook
        state = await applyMiddlewareHook<Data, Props, IRunHookProps, State<Data>>
          (middleware, 'rejected')
          ({ hash: currentHash, props, state }, { ...state })
      }
      // finally hook
      state = await applyMiddlewareHook<Data, Props, IRunHookProps, State<Data>>
          (middleware, 'finally')
          ({ hash: currentHash, props, state }, { ...state })
      callSubscriptions()
      // finished hook
      await applyMiddlewareHook<Data, Props, IRunHookProps, void>
          (middleware, 'finished')
          ({ hash: currentHash, props, state })
      return state
    },
  }

  // create middleware
  _middleware.forEach(md => middleware.push(md(API)))
  return API
}



interface IUserInfo {
  id: number
  name: string
  phone: string
}
interface IUserInfoProps {
  id: number
}
const getUserInfo = async ({ id } : IUserInfoProps) : Promise<IUserInfo> => {
  console.log('fetch called')
  return (await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)).json()
}


async function main() {
  const middleware = [inMemoryCache()]
  // const middleware = undefined
  const resource = createResource({ fn: getUserInfo }, middleware)
  const userInfo = await resource.run({ id: 1 })
  await resource.run({ id: 2 }, { reload: true })
  console.log('1: ', userInfo.data!.name)
  const userInfo2 = await resource.run({ id: 2 }, { reload: true })
  console.log('2: ', userInfo2.data!.name)
}

main()
