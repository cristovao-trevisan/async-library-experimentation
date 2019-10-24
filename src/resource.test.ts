import { createResource } from '.'
import { IUserInfo, IUserInfoProps } from './example'
import { IMiddleware } from './middleware'
import { initialState } from './state'

const runMiddleware = ['cache', 'resolved', 'rejected', 'finished', 'finally', 'willLoad', 'willRequest']
const abortMiddleware = ['willAbort', 'aborted']
const subscriptionMiddleware = ['subscription', 'hasSubscription', 'unsubscription', 'noSubscriptions']

test('e2e', async () => {
  const expectedUserInfo = {
    id: 1,
    name: 'Lucifer MorningStar',
    phone: '+66 (666) 666',
  }
  const getUser = jest.fn(async ({ id }: IUserInfoProps) : Promise<IUserInfo> => ({
    ...expectedUserInfo,
    id,
  }))
  const middleware = {
    resolved: jest.fn((options) => options.state),
    willLoad: jest.fn(),
    willRequest: jest.fn(),
  }

  const userInfoResource = createResource({ fn: getUser }, [() => middleware])
  const subscription = jest.fn()
  userInfoResource.subscribe(subscription)

  Object.values(middleware).forEach(md => expect(md.mock.calls.length).toBe(0))

  const userInfo = await userInfoResource.run({ id: 1 })
  
  const loadingState = { resolved: false, data: undefined, error: undefined, pending: true, aborted: false }
  expect(middleware['willLoad'].mock.calls[0][0].options.state).toStrictEqual(loadingState)
  expect(middleware['willRequest'].mock.calls[0][0].options.state).toStrictEqual(loadingState)
  
  const resolvedState = { resolved: true, data: expectedUserInfo, error: undefined, pending: false, aborted: false }
  expect(middleware['resolved'].mock.calls[0][0].state).toStrictEqual(resolvedState)
  
  expect(userInfo).toStrictEqual(resolvedState)
  expect(subscription.mock.calls.length).toBe(3)
  expect(subscription.mock.calls[0][0]).toStrictEqual(initialState)
  expect(subscription.mock.calls[1][0]).toStrictEqual(loadingState)
  expect(subscription.mock.calls[2][0]).toStrictEqual(resolvedState)
})
