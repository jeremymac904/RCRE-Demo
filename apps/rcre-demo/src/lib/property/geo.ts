const TILE_SIZE = 256
const MAX_LATITUDE = 85.05112878
export type GeoPoint = { latitude: number; longitude: number }
export type MapBounds = { north: number; south: number; east: number; west: number }

export function worldPixel(point: GeoPoint, zoom: number) {
  const scale = TILE_SIZE * 2 ** Math.max(0, Math.min(20, Math.floor(zoom)))
  const latitude = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, point.latitude)) * Math.PI / 180
  return {
    x: (point.longitude + 180) / 360 * scale,
    y: (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2 * scale,
  }
}

export function geoPoint(pixel: { x: number; y: number }, zoom: number): GeoPoint {
  const scale = TILE_SIZE * 2 ** Math.max(0, Math.min(20, Math.floor(zoom)))
  const longitude = pixel.x / scale * 360 - 180
  const n = Math.PI - 2 * Math.PI * pixel.y / scale
  const latitude = 180 / Math.PI * Math.atan(Math.sinh(n))
  return { latitude: Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude)), longitude }
}

export function viewportBounds(center: GeoPoint, zoom: number, width: number, height: number): MapBounds {
  const middle = worldPixel(center, zoom)
  const northWest = geoPoint({ x: middle.x - width / 2, y: middle.y - height / 2 }, zoom)
  const southEast = geoPoint({ x: middle.x + width / 2, y: middle.y + height / 2 }, zoom)
  return { north: northWest.latitude, west: northWest.longitude, south: southEast.latitude, east: southEast.longitude }
}

export function fitZoom(points: GeoPoint[]) {
  if (points.length < 2) return 10
  const latitudes = points.map(point => point.latitude)
  const longitudes = points.map(point => point.longitude)
  const latSpan = Math.max(...latitudes) - Math.min(...latitudes)
  const lonSpan = Math.max(...longitudes) - Math.min(...longitudes)
  return Math.max(5, Math.min(13, Math.floor(Math.log2(220 / Math.max(latSpan * 52, lonSpan * 43, 1)))))
}

export function wrappedTileX(x: number, zoom: number) {
  const dimension = 2 ** Math.max(0, Math.min(20, Math.floor(zoom)))
  return ((x % dimension) + dimension) % dimension
}
