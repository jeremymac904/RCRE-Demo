import {publicRoutes,type PublicContent} from './content'
const custom=(p:string)=>/^\/(blog|resources|pages)\/[a-z0-9]+(?:[a-z0-9/-]*[a-z0-9])?$/.test(p)
export function validatePublicRedirect(source:string,target:string,records:PublicContent[]){
 if(['/', '/join','/financing'].includes(source))throw Error('This dedicated page does not support a redirect.');
 if(!target.startsWith('/')||target.includes('//')||target.includes('?')||target.includes('#')||target.includes('..'))throw Error('Choose a clean local public path.');
 const available=(p:string)=>(publicRoutes.includes(p)||custom(p)&&records.some(r=>r.id===p&&r.published))&&!records.some(r=>r.id===p&&r.status==='archived');
 if(!available(target)||target.startsWith('/academy-preview')||target.startsWith('/home-search/account')||target==='/thank-you')throw Error('Redirect target must be an available public page.');
 const seen=new Set([source]);let next:string|undefined=target;
 while(next){if(seen.has(next))throw Error('Redirect loops are not allowed.');seen.add(next);if(next==='/privacy-policy')next='/privacy';else if(next==='/home-search')next='/home-search/listings';else next=records.find(r=>r.id===next&&r.status!=='archived')?.published?.redirectTo;}
}
