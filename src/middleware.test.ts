import { IMiddlewareFunction, executeMiddlewareFunctions } from './middleware'

describe('executeMiddlewareFunctions', () => {
  test('should work', async () => {
    interface Return { count: number }
    interface Options { increment: boolean, state: Return }
    type MyMiddleware = IMiddlewareFunction<Options, Return>

    const doNothing = jest.fn((a, next) => next(a))
    const increment = jest.fn((a, next) => {
      if (!a.increment) return next(a)
      return next({
        ...a,
        state: { count: a.state.count + 1 },
      })
    })
    const stopIncrementing = jest.fn((a, next) => next({
      ...a,
      increment: false,
    }))
    const stopPropagation = jest.fn(a => a.state)


    const middleware: MyMiddleware[] = [
      doNothing,
      increment,
      increment,
      stopIncrementing,
      increment,
      increment,
      stopPropagation,
      doNothing,
      doNothing,
    ]

    const state = { count: 1 }
    const result: Return = await executeMiddlewareFunctions(
      middleware,
      { increment: true, state },
      state,
    )

    expect(result).toStrictEqual({ count: 3 })
    expect(doNothing.mock.calls.length).toBe(1)
    expect(increment.mock.calls.length).toBe(4)
    expect(stopIncrementing.mock.calls.length).toBe(1)
    expect(stopPropagation.mock.calls.length).toBe(1)
  })

  test('passive middleware', async () => {
    interface Options { data: number }
    type MyMiddleware = IMiddlewareFunction<Options>
    const doNothing = jest.fn((a, next) => next(a))
    const stopPropagation = jest.fn(() => {})

    const middleware: MyMiddleware[] = [
      doNothing,
      stopPropagation,
      doNothing,
    ]
    await executeMiddlewareFunctions(
      middleware,
      { data: 1 },
      undefined,
    )
    expect(doNothing.mock.calls.length).toBe(1)
    expect(stopPropagation.mock.calls.length).toBe(1)
  })
})
