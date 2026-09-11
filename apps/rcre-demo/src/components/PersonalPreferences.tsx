'use client'
import {useEffect} from 'react'
export function PersonalPreferences(){useEffect(()=>{fetch('/api/platform/settings/personal').then(r=>r.ok?r.json():null).then(s=>{if(!s)return;const p=s.value;if(p.theme){document.documentElement.dataset.theme=p.theme;localStorage.setItem('rcre-theme',p.theme)}document.documentElement.dataset.largeText=String(!!p.largeText);document.documentElement.dataset.reducedMotion=String(!!p.reducedMotion)}).catch(()=>{})},[]);return null}
