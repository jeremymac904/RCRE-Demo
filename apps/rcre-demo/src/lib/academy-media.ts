import path from 'node:path'
export const protectedHref = (href: string) => href.replace(/^\/academy\/(handouts|downloads|video)\//, '/api/academy/media/$1/')
export function academyAssetPath(href: string) {
 const relative = decodeURIComponent(href).replace(/^\/api\/academy\/media\//, '/academy/')
 if (relative.includes('..')) throw new Error('Invalid asset path')
 if (/^\/academy\/(handouts|downloads|video)\//.test(relative)) return path.resolve(process.cwd(), '../../training-assets/protected', relative.replace('/academy/', ''))
 return path.join(process.cwd(), 'public', relative)
}
export function byteRange(header: string | null, size: number): {start:number;end:number}|null {
 if (!header) return null
 const match = /^bytes=(\d*)-(\d*)$/.exec(header)
 if (!match || (!match[1] && !match[2])) throw new Error('Invalid range')
 const start = match[1] ? Number(match[1]) : Math.max(0,size-Number(match[2]))
 const end = match[1] ? (match[2] ? Math.min(Number(match[2]),size-1) : size-1) : size-1
 if (start>=size || start<0 || end<start) throw new Error('Invalid range')
 return {start,end}
}
