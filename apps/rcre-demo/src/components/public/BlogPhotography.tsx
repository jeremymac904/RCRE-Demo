import {cinematicPhotos} from '@/lib/public/cinematic-media'
import type {PublishedContent} from '@/lib/public/content'
import './blog-photography.css'
export function blogPhoto(slug:string,category=''){
 const key: keyof typeof cinematicPhotos=/condo|building|hoa|cdd/.test(slug)?'living':/seller|market-ready|photograph|preparation/.test(slug)?'kitchen':/timeline|calendar|clock|first-time|steps/.test(slug)?'planning':/relocation|coast|duval|trail|restaurant|table/.test(slug)?'coast':/inspection|insurance/.test(slug)?'entry':category==='Selling'?'kitchen':'bedroom'
 return cinematicPhotos[key]
}
export function BlogPhotography({slug,category,override,compact=false}:{slug:string;category?:string;override?:PublishedContent;compact?:boolean}){const media=blogPhoto(slug,category);if(override?.image&&!override.image.src)return null;const image=override?.image||media;return <figure className={'blog-photography'+(compact?' compact':'')}><img src={image.src} alt={image.alt} width={1600} height={1000} loading={compact?'lazy':'eager'} decoding="async"/>{!compact&&<figcaption>{override?.image?<span>{override.image.alt}</span>:<><span>{media.sceneNote}</span><span>Photography: <a href={media.sourceUrl} target="_blank" rel="noreferrer">{media.credit}</a> · <a href={media.licenseUrl} target="_blank" rel="noreferrer">License</a></span></>}</figcaption>}</figure>}
