'use client'
import { useRef } from 'react'
import { useAcademyProgress } from './AcademyProgressProvider'
export function AcademyVideo({lessonId,src,poster,captions}:{lessonId:string;src:string;poster?:string;captions?:string}){
 const {record,savePosition}=useAcademyProgress();const last=useRef(0)
 return <video controls preload="metadata" playsInline poster={poster} className="block h-auto w-full" onLoadedMetadata={e=>{const seconds=record.positions?.[lessonId];if(seconds)e.currentTarget.currentTime=seconds}} onTimeUpdate={e=>{const seconds=Math.floor(e.currentTarget.currentTime);if(Math.abs(seconds-last.current)>10){last.current=seconds;void savePosition(lessonId,seconds)}}} onPause={e=>void savePosition(lessonId,e.currentTarget.currentTime)}><source src={src} type="video/mp4"/>{captions&&<track kind="captions" src={captions} srcLang="en" label="English" default/>}Your browser cannot play this lesson.</video>
}
