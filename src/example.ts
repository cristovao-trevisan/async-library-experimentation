import fetch from 'node-fetch'
import { createResource, inMemoryCache } from "."

export interface IUserInfo {
  id: number
  name: string
  phone: string
}
export interface IUserInfoProps {
  id: number
}
const getUserInfo = async ({ id } : IUserInfoProps) : Promise<IUserInfo> => {
  console.log('fetch called')
  return (await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)).json()
}


async function main() {
  const middleware = [inMemoryCache<IUserInfo, IUserInfoProps>()]
  // const middleware = undefined
  const resource = createResource({ fn: getUserInfo }, middleware)
  const userInfo = await resource.run({ id: 1 })
  await resource.run({ id: 2 }, { reload: true })
  console.log('1: ', userInfo.data!.name)
  const userInfo2 = await resource.run({ id: 2 })
  console.log('2: ', userInfo2.data!.name)
}

main()
