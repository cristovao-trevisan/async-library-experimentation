
export function stringHashCode(value: string){
	let hash = 0
	if (value.length == 0) return '0'
	for (let i = 0; i < value.length; i++) {
		const char = value.charCodeAt(i)
		hash = ((hash<<5)-hash)+char
		hash = hash & hash // Convert to 32bit integer
	}
	return String(hash)
}

export function hashCode(value: any) {
  let stringValue: string
  if (typeof value === 'object') stringValue = JSON.stringify(value)
  else stringValue = String(value)

  return stringHashCode(stringValue)
}
