/**
 * Modified from: https://github.com/LinusU/base32-decode#readme
**/

const RFC4648     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const RFC4648_HEX = '0123456789ABCDEFGHIJKLMNOPQRSTUV'
const CROCKFORD   = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const ZBASE32     = 'ybndrfg8ejkmcpqxot1uwisza345h769'

function readChar(alphabet: string, char: string): number {
  const idx = alphabet.indexOf(char)

  if (idx === -1) {
    throw new Error('Invalid character found: ' + char)
  }

  return idx
}

export function base32Decode(
	input   : string,
	variant : 'RFC3548'|'RFC4648'|'RFC4648-HEX'|'Crockford'|'zBase32'|string
): ArrayBuffer
{
  let alphabet

  switch (variant) {
    case 'RFC3548':
    case 'RFC4648':
      alphabet = RFC4648
      input = input.replace(/=+$/, '')
      break
    case 'RFC4648-HEX':
      alphabet = RFC4648_HEX
      input = input.replace(/=+$/, '')
      break
    case 'Crockford':
      alphabet = CROCKFORD
      input = input.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')
		break
	case 'zBase32':
      alphabet = ZBASE32
      input = input.toLowerCase().replace(/0/g, 'o').replace(/2/g, 'z')
      break
    default:
      throw new Error('Unknown base32 variant: ' + variant)
  }

  const length = input.length

  let bits = 0
  let value = 0

  let index = 0
  const output = new Uint8Array((length * 5 / 8) | 0)

  for (let i = 0; i < length; i++) {
    value = (value << 5) | readChar(alphabet, input[i])
    bits += 5

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
  }

  return output.buffer
}
