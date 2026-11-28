export const credentialFor = (username: string, pin: string) => `sasa::${username}::${pin}::collector`;
export function validatePinChange(current: string, next: string, confirm: string) {
  if (!/^\d{4}$/.test(current) || !/^\d{4}$/.test(next)) throw new Error('O PIN precisa ter exatamente 4 dígitos.');
  if (next !== confirm) throw new Error('A confirmação não corresponde ao novo PIN.');
  if (current === next) throw new Error('Escolha um PIN diferente do atual.');
}
