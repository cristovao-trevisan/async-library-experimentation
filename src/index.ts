import fetch from 'node-fetch'
import { State, initialState, resolvedState, rejectedState } from "./state"
import { hashCode } from './hash'
import { IResource, ISubscription } from './types'


interface ICreateResourceParams<Data, Props> {
  fn: (props: Props, currentData?: Data, abort?: AbortController) => Promise<Data>,
  hash?: (props: Props) => string,
  abortController?: AbortController,
}

function createResource<Data, Props = any> (
  options: ICreateResourceParams<Data, Props>,
): IResource<Data, Props> {
  // options
  let abortController = options.abortController
  if (!abortController && typeof AbortController !== 'undefined') abortController = new AbortController()
  const hash = options.hash || hashCode

  // variables
  let state: State<Data> = { ...initialState }
  let currentHash: string | undefined
  let subscriptions: ISubscription<Data>[] = []

  // functions
  const callSubscriptions = () => subscriptions.forEach(cb => cb(state))
  const doAbort = () => {
    if (abortController) abortController.abort()
    state = { ...state, aborted: true }
  }

  // api
  const API: IResource<Data, Props> = {
    abort() {
      // TODO: abort hook
      doAbort()
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
      try {
        currentHash = newHash
        state = { ...state, pending: true }
        callSubscriptions()
        // TODO: pre-request hook
        const data = await options.fn(props, state.data, abortController) // TODO: cache hook
        // TODO: resolved hook
        state = resolvedState(data)
      } catch (error) {
        // TODO: rejected hook
        state = rejectedState(error as Error)
      }
      // TODO: finished hook
      callSubscriptions()
      return state
    },
  }

  // TODO: create middleware
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
const getUserInfo = async ({ id } : IUserInfoProps) : Promise<IUserInfo> => (await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)).json()


async function main() {
  const resource = createResource({ fn: getUserInfo })
  const userInfo = await resource.run({ id: 2 })
  console.log('1: ', userInfo.data!.name)
}

main()
