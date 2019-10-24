import { IMiddleware } from "../middleware"

export const inMemoryCache = <Data = any, Props = any>() => () : IMiddleware<Data, Props> => {
  const cache: { [k: string]: Data | undefined } = {}
  return {
    cache: (args, next) => {
      const value = cache[args.options.hash]
      if (value === undefined) return next(args)
      return next({
        ...args,
        state: value,
      })
    },
    finished: ({ options: { hash, state } }) => {
      cache[hash] = state.data
    },
  }
}
