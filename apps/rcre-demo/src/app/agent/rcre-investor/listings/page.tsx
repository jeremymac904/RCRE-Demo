/**
 * RCRE Investor — Listings Page
 * Route: /agent/investor/listings
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildListingsSEO } from '@/lib/agent-website/seo'
import { InvestorLayout } from '../InvestorLayout'
import { InvestorSEO } from '../InvestorSEO'
import '../rcre-investor.css'

export const metadata: Metadata = {
  title: 'Investment Properties | Jordan Mercer | RCRE Investment',
}

const INVESTOR_CONFIG = {
  theme: 'rcre-investor' as const,
  markets: ['Jacksonville', 'Birmingham', 'Florida Panhandle'],
  specialties: ['Rental Investment', 'BRRRR', 'Short-Term Rental'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
  seoTitle: 'Investment Properties | Jordan Mercer | RCRE Investment',
  seoDescription: 'Underwritten investment properties in Jacksonville, Birmingham, and the Florida panhandle. Cap rates and cash-on-cash estimates.',
}

const DEALS = [
  { id: 'd1', address: '1847 W. 9th St, Jacksonville, FL 32209', price: 48500, capRate: 8.4, cashOnCash: 12.1, beds: 2, baths: 1, sqft: 980, type: 'Single-family', market: 'Jacksonville, FL', image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80' },
  { id: 'd2', address: '2204 3rd Ave N, Birmingham, AL 35203', price: 78500, capRate: 7.9, cashOnCash: 10.5, beds: 3, baths: 2, sqft: 1420, type: 'Single-family', market: 'Birmingham, AL', image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80' },
  { id: 'd3', address: '408 Magnolia Dr, Pensacola, FL 32503', price: 125000, capRate: 8.1, cashOnCash: 11.3, beds: 4, baths: 2, sqft: 1850, type: 'Single-family', market: 'Pensacola, FL', image: 'https://images.unsplash.com/photo-1599427303058-f04cbcf4756f?w=600&q=80' },
  { id: 'd4', address: '1501 St. Louis Ave, Mobile, AL 36603', price: 62000, capRate: 9.2, cashOnCash: 13.4, beds: 3, baths: 1, sqft: 1200, type: 'Single-family', market: 'Mobile, AL', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80' },
  { id: 'd5', address: '3301 Pearl St, Jacksonville, FL 32206', price: 55000, capRate: 8.7, cashOnCash: 11.8, beds: 2, baths: 1, sqft: 1050, type: 'Single-family', market: 'Jacksonville, FL', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80' },
  { id: 'd6', address: '817 18th St S, Birmingham, AL 35205', price: 98000, capRate: 7.5, cashOnCash: 9.8, beds: 4, baths: 2, sqft: 1680, type: 'Single-family', market: 'Birmingham, AL', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80' },
]

export default function InvestorListingsPage() {
  const agent = getExampleAgent('rcre-signature-demo')!
  const seo = buildListingsSEO(agent, INVESTOR_CONFIG)

  return (
    <>
      <head><InvestorSEO seo={seo} /></head>
      <InvestorLayout agent={agent}>
        <section className="inv-section">
          <div className="inv-wrap">
            <p className="inv-section-label">Current Deals</p>
            <h1 className="inv-section-title">Investment Properties</h1>
            <p className="inv-section-sub" style={{ marginBottom: '2.5rem' }}>
              Actively underwritten income properties in Jacksonville, Birmingham, and the Florida panhandle.
              All figures are pre-calculated. Verify independently before making any investment decision.
            </p>

            {/* Filter */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              {['All Markets', 'Jacksonville', 'Birmingham', 'FL Panhandle'].map((f) => (
                <span
                  key={f}
                  style={{
                    fontFamily: 'var(--inv-font-mono)',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    color: f === 'All Markets' ? '#ffffff' : 'var(--inv-muted)',
                    backgroundColor: f === 'All Markets' ? 'var(--inv-primary)' : 'var(--inv-surface)',
                    border: '1px solid var(--inv-border)',
                    padding: '0.3rem 0.75rem',
                    borderRadius: 'var(--inv-radius)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {f}
                </span>
              ))}
            </div>

            <div className="inv-grid-3">
              {DEALS.map((d) => (
                <article key={d.id} className="inv-card">
                  <img src={d.image} alt={d.address} className="inv-card-img" loading="lazy" />
                  <div className="inv-card-body">
                    <p className="inv-card-price">${d.price.toLocaleString()}</p>
                    <p className="inv-card-address">{d.address}</p>

                    <div className="inv-card-metrics">
                      <div className="inv-metric">
                        <span className="inv-metric-label">Cap Rate</span>
                        <span className="inv-metric-value">{d.capRate}%</span>
                      </div>
                      <div className="inv-metric">
                        <span className="inv-metric-label">CoC Return</span>
                        <span className="inv-metric-value">{d.cashOnCash}%</span>
                      </div>
                      <div className="inv-metric">
                        <span className="inv-metric-label">Beds/Baths</span>
                        <span className="inv-metric-value" style={{ color: 'var(--inv-muted)', fontSize: '0.8rem' }}>{d.beds} bd · {d.baths} ba</span>
                      </div>
                      <div className="inv-metric">
                        <span className="inv-metric-label">Sq Ft</span>
                        <span className="inv-metric-value" style={{ color: 'var(--inv-muted)', fontSize: '0.8rem' }}>{d.sqft.toLocaleString()}</span>
                      </div>
                    </div>

                    <div>
                      <span className="inv-card-tag">{d.type}</span>
                      <span className="inv-card-tag">{d.market}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <p style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href="/agent/investor/contact" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--inv-accent)', textDecoration: 'none' }}>
                Get deal access — pre-qualify here →
              </Link>
            </p>
          </div>
        </section>
      </InvestorLayout>
    </>
  )
}
