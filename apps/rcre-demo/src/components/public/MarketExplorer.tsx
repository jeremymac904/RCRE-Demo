'use client'
import {useState} from 'react'
import Link from 'next/link'
import './market-explorer.css'
import {MetroPhotoCredit} from './MetroPhotoCredit'
const regions=[
 {id:'birmingham',name:'Birmingham',region:'Birmingham & surrounding counties',state:'Alabama',line:'City energy. Room to breathe.',description:'Explore Jefferson, Shelby, St. Clair, and Blount counties through a local lens.',image:'birmingham',alt:'Birmingham, Alabama cityscape',journal:'birmingham'},
 {id:'jacksonville',name:'Northeast Florida',region:'Jacksonville & Northeast Florida',state:'Florida',line:'A new chapter, from river to coast.',description:'Get to know Duval, Clay, St. Johns, and Nassau counties before your next move.',image:'jacksonville',alt:'Historical Jacksonville skyline beside the St. Johns River, photographed in 2014',journal:'jacksonville'},
 {id:'south-florida',name:'South Florida',region:'Miami–Fort Lauderdale',state:'Florida',line:'Find your rhythm in South Florida.',description:'Explore RCRE’s source-listed Miami-Dade and Broward communities. Ask the team for the right local introduction.',image:'south-florida',alt:'Miami skyline from Biscayne Bay, photographed in 2011',journal:'south-florida'},
]
export function MarketExplorer({title,description,image}:{title?:string;description?:string;image?:{src:string;alt:string}}){
 const [selected,setSelected]=useState(0),[intent,setIntent]=useState('buy'),[location,setLocation]=useState('');const region=regions[selected]
 const destination=intent==='sell'?'/home-valuation':intent==='relocate'?'/relocation':'/home-search/listings'
 return <section className="market-explorer" aria-label="Explore RCRE markets">
  <div className="market-explorer-scene" key={image?.src||region.image}><img src={image?.src||'/brand/metros/'+region.image+'.webp'} alt={image?.alt||region.alt} width={1600} height={1000} fetchPriority="high"/></div>
  <div className="market-explorer-shade"/>
  <div className="market-explorer-content">
   <div className="market-explorer-intro"><p className="market-explorer-eyebrow">River City Real Estate Group · Alabama & Florida</p><h1>{title||<>Find your place.<br/><em>Build your next chapter.</em></>}</h1><p>{description||'Local perspective. Real relationships. A clearer path to the place you call home.'}</p><div className="market-explorer-cta"><a className="market-explorer-start" href="#plan-your-move">Plan your next chapter <span aria-hidden="true">↘</span></a><a className="market-explorer-start" href="#rcre-films">Watch the films <span aria-hidden="true">▷</span></a></div></div>
   <div className="market-explorer-place" aria-live="polite" aria-atomic="true"><p>{region.region}</p><h2>{region.line}</h2><Link href={'/blog/metros/'+region.journal}>Read the local journal <span aria-hidden="true">↗</span></Link></div>
   <div className="market-explorer-tabs" aria-label="Choose a market">{regions.map((r,i)=><button key={r.id} type="button" aria-pressed={selected===i} onClick={()=>setSelected(i)}><span className="market-explorer-index" aria-hidden="true">0{i+1}</span>{r.name}<span className="market-explorer-indicator" aria-hidden="true">↗</span></button>)}</div>
  </div>
  <div className="market-photo-credit">{!image?.src&&<MetroPhotoCredit metro={region.id}/>}</div>
  <form className="market-move-planner" id="plan-your-move" action={destination}>
   <div className="market-planner-title"><span>Your next move</span><strong>Starts with you.</strong></div>
   <label>I’m looking to<select value={intent} onChange={e=>setIntent(e.target.value)} name="interest"><option value="buy">Buy a home</option><option value="sell">Sell my home</option><option value="relocate">Plan a relocation</option></select></label>
   <label>Market<select name="market" value={region.state} onChange={e=>setSelected(e.target.value==='Alabama'?0:1)}><option>Alabama</option><option>Florida</option></select></label>
   {intent==='buy'?<label>Location or keyword<input name="q" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Start your shortlist" maxLength={100}/></label>:<p className="market-planner-context">{intent==='sell'?'Start with a thoughtful valuation and a plan for your property.':'Build your move around the places and routines that matter to you.'}</p>}
   <button type="submit" className="public-button">{intent==='buy'?'Explore homes':intent==='sell'?'Plan my sale':'Plan my move'} <span aria-hidden="true">↗</span></button>
  </form>
 </section>
}
