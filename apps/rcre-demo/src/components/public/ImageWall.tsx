'use client'

import { useEffect, useRef, useState } from 'react'
import './image-wall.css'

// ---------------------------------------------------------------------------
// Image Wall — premium multi-column composition for the RCRE homepage.
// Each column drifts at a different rate on scroll (CSS custom property) and
// images reveal as they enter the viewport. Pure transform/opacity, no
// animation library. Respects prefers-reduced-motion.
// ---------------------------------------------------------------------------

interface WallImage {
  src: string
  alt: string
  variant?: 'editorial' | 'frame' | 'circle' | 'panel'
}

interface WallColumn {
  speed: number
  images: WallImage[]
  align?: 'start' | 'center' | 'end'
}

const COLUMNS: WallColumn[] = [
  {
    speed: 0.18,
    align: 'start',
    images: [
      {
        src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80',
        alt: 'Modern suburban home exterior with landscaped entry',
        variant: 'editorial',
      },
      {
        src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
        alt: 'Northeast Florida waterfront estate at dusk',
        variant: 'frame',
      },
      {
        src: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80',
        alt: 'Agent reviewing contracts with a client',
        variant: 'circle',
      },
    ],
  },
  {
    speed: -0.12,
    align: 'center',
    images: [
      {
        src: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=80',
        alt: 'Suburban Birmingham neighborhood street with mature trees',
        variant: 'frame',
      },
      {
        src: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=900&q=80',
        alt: 'Alabama pasture and fence line at sunrise',
        variant: 'editorial',
      },
      {
        src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80',
        alt: 'Jacksonville Riverside bungalow with wraparound porch',
        variant: 'frame',
      },
    ],
  },
  {
    speed: 0.22,
    align: 'end',
    images: [
      {
        src: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80',
        alt: 'Birmingham new construction home interior with natural light',
        variant: 'frame',
      },
      {
        src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80',
        alt: 'Luxury living room with floor-to-ceiling windows',
        variant: 'editorial',
      },
      {
        src: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=600&q=80',
        alt: 'Open house welcome sign in a manicured front yard',
        variant: 'circle',
      },
    ],
  },
  {
    speed: -0.18,
    align: 'start',
    images: [
      {
        src: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
        alt: 'Working farm in the Alabama Wiregrass',
        variant: 'frame',
      },
      {
        src: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80',
        alt: 'Jacksonville urban skyline over the St. Johns River',
        variant: 'editorial',
      },
      {
        src: 'https://images.unsplash.com/photo-1599423300746-b62529197396?w=600&q=80',
        alt: 'Birmingham historic Highland Park craftsman bungalow',
        variant: 'frame',
      },
    ],
  },
]

const MOBILE_RAIL: WallImage[] = [
  {
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    alt: 'Modern suburban home exterior with landscaped entry',
    variant: 'panel',
  },
  {
    src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    alt: 'Northeast Florida waterfront estate at dusk',
    variant: 'panel',
  },
  {
    src: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=800&q=80',
    alt: 'Alabama pasture and fence line at sunrise',
    variant: 'panel',
  },
  {
    src: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
    alt: 'Jacksonville urban skyline',
    variant: 'panel',
  },
  {
    src: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    alt: 'New construction interior with natural light',
    variant: 'panel',
  },
  {
    src: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
    alt: 'Working farm in the Wiregrass',
    variant: 'panel',
  },
]

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(m.matches)
    const handler = () => setReduced(m.matches)
    m.addEventListener?.('change', handler)
    return () => m.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

function useScrollReveal(): React.MutableRefObject<HTMLDivElement | null> {
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        el.classList.add('iw-revealed')
      })
      return
    }
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('iw-revealed')
            io.unobserve(e.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [])
  return rootRef
}

function useParallax(rootRef: React.MutableRefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let ticking = false
    const update = () => {
      const r = root.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      const progress = Math.max(-0.5, Math.min(1.5, (vh - r.top) / (r.height + vh)))
      const cols = root.querySelectorAll<HTMLElement>('.iw-column')
      cols.forEach((col) => {
        const speed = Number(col.style.getPropertyValue('--iw-speed')) || 0
        const offset = speed * 80 * (progress - 0.5)
        col.style.setProperty('--iw-parallax', offset.toFixed(1) + 'px')
      })
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [rootRef])
}

export function ImageWall() {
  const rootRef = useScrollReveal()
  useParallax(rootRef)
  const reduced = useReducedMotion()

  return (
    <section
      className="iw-root"
      aria-label="RCRE markets in motion: homes, places, and people across Alabama and Florida"
      ref={rootRef}
    >
      <div className="public-wrap iw-header" data-reveal>
        <p className="iw-kicker">A brokerage with range</p>
        <h2 className="iw-title">From the Wiregrass to the river.</h2>
        <p className="iw-lead">
          Alabama acreage. Northeast Florida estates. Urban Jacksonville. New construction. Historic
          Birmingham. Suburban family blocks. One brokerage, eight ways of working it — every one backed
          by a connected platform and a real human on the other end.
        </p>
      </div>

      {/* Desktop / laptop composition */}
      <div className={`iw-grid${reduced ? ' iw-reduced' : ''}`}>
        {COLUMNS.map((col, ci) => (
          <div
            key={ci}
            className="iw-column"
            data-reveal
            style={
              {
                '--iw-speed': col.speed,
                '--iw-align': col.align ?? 'start',
              } as React.CSSProperties
            }
          >
            {col.images.map((img, ii) => (
              <figure key={ii} className={`iw-tile iw-${img.variant ?? 'frame'}`} data-reveal>
                <img
                  src={img.src}
                  alt={img.alt}
                  loading={ii < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  width={900}
                  height={ii === 0 ? 1200 : 900}
                />
              </figure>
            ))}
          </div>
        ))}
      </div>

      {/* Mobile rail */}
      <div className="iw-rail" data-reveal>
        {MOBILE_RAIL.map((img, i) => (
          <figure key={i} className="iw-rail-tile" data-reveal>
            <img src={img.src} alt={img.alt} loading="lazy" decoding="async" />
          </figure>
        ))}
      </div>
    </section>
  )
}