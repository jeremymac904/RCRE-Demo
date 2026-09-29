import {describe,expect,it} from 'vitest'
import {fitZoom,geoPoint,viewportBounds,worldPixel,wrappedTileX} from '@/lib/property/geo'

describe('provider-agnostic geographic map calculations',()=>{
 it('round-trips representative Florida and Alabama coordinates at different zooms',()=>{
  for(const zoom of [5,9,13])for(const point of [{latitude:30.3322,longitude:-81.6557},{latitude:33.5186,longitude:-86.8104}]){
   const result=geoPoint(worldPixel(point,zoom),zoom)
   expect(result.latitude).toBeCloseTo(point.latitude,6)
   expect(result.longitude).toBeCloseTo(point.longitude,6)
  }
 })
 it('builds viewport search bounds that contain the map center',()=>{
  const center={latitude:30.3322,longitude:-81.6557},bounds=viewportBounds(center,10,900,490)
  expect(bounds.north).toBeGreaterThan(center.latitude)
  expect(bounds.south).toBeLessThan(center.latitude)
  expect(bounds.west).toBeLessThan(center.longitude)
  expect(bounds.east).toBeGreaterThan(center.longitude)
 })
 it('wraps world tiles and selects regional zoom for multi-market points',()=>{
  expect(wrappedTileX(-1,4)).toBe(15)
  expect(wrappedTileX(16,4)).toBe(0)
  expect(fitZoom([{latitude:30.3,longitude:-81.6},{latitude:33.5,longitude:-86.8}])).toBeLessThan(fitZoom([{latitude:30.31,longitude:-81.65},{latitude:30.35,longitude:-81.6}]))
 })
})
