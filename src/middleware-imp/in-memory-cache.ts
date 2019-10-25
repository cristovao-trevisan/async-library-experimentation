import { IMiddleware } from "../middleware"
import { resolvedState } from "../state"

export const inMemoryCache = <Data = any, Props = any>() => () : IMiddleware<Data, Props> => {
  const cache: { [k: string]: Data | undefined } = {}
  return {
    cache: (args, next) => {
      const value = cache[args.hash]
      if (value === undefined) return next(args)
      return next({
        ...args,
        state: resolvedState(value),
      })
    },
    finished: ({ hash, state }) => {
      cache[hash] = state.data
    },
  }
}
