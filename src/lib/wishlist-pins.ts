export const WISH_STATUSES = ['WTB', 'OTW', 'HAVE'] as const;
export type WishStatus = typeof WISH_STATUSES[number];
export function markerPosition(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }) {
  if (rect.width <= 0 || rect.height <= 0) throw new Error('Imagem ainda não carregada.');
  return { x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)) };
}
export function wishProgress(pins: readonly { status: string }[]) {
  const have = pins.filter((p) => p.status === 'HAVE').length;
  return { have, total: pins.length, percent: pins.length ? Math.round(have / pins.length * 100) : 0 };
}
