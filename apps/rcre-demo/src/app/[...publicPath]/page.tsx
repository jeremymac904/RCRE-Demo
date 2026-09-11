import {CinematicGallery} from '@/components/public/CinematicGallery'
import {BlogPhotography} from '@/components/public/BlogPhotography'
import {metroJournals,metroArticles} from '@/lib/public/metro-journal'
import {MetroJournalIndex,MetroHub,MetroPeople,MetroSources} from '@/components/public/MetroJournal'
import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound,permanentRedirect} from 'next/navigation'
import {PublicShell,PublicHero,Breadcrumbs} from '@/components/public/PublicShell'
import {InquiryForm,AgentDirectory,ConsentPreferences} from '@/components/public/PublicInteractions'
import {PropertySearch} from '@/components/public/PropertySearch'
import {ListingVisual} from '@/components/ListingVisual'
import {guides,communities,articles,publicAgents} from '@/lib/public/content'
import {getPublished,publishedPages,getPublicRecord,getBrokerage,archivedPublicPaths} from '@/lib/public/server'
import {validatePublicRedirect} from '@/lib/public/redirects'
import {properties} from '@/lib/public/properties'
import legacyProperties from '@/lib/public/legacy-properties.json'

export const dynamic = 'force-dynamic'

const faqData: Record<string, Array<{ q: string; a: string }>> = {
  buying: [
    {
      q: 'What should I do before I start looking at homes?',
      a: 'Start with a lender conversation so you understand your price range and expected cash to close before you tour. That keeps the search focused and avoids disappointment.',
    },
    {
      q: 'How much do I need for a down payment?',
      a: 'Down payment requirements vary by loan program. Some programs allow as little as 3–5%, while others require more. Your lender can explain the tradeoffs in mortgage insurance, fees, and qualification for each option.',
    },
    {
      q: 'What is the difference between preapproval and final approval?',
      a: 'Preapproval is an initial review of your credit and income, giving you a price range to shop within. Final approval happens after underwriting reviews the property, submitted documents, and program conditions.',
    },
    {
      q: 'How do I know if a neighborhood is right for me?',
      a: 'Visit at different times, review the commute routes that matter to you, check current property taxes and insurance for the area, and ask for the governing documents and disclosures for any home you are considering.',
    },
    {
      q: 'What questions should I ask at a showing?',
      a: 'Ask about age and condition of major systems, utility costs, any recent repairs or replacements, known issues with the property, and what the monthly ownership costs include. Confirm which fixtures and appliances convey.',
    },
  ],
  selling: [
    {
      q: "How is my home's value determined?",
      a: "An agent reviews recent comparable sales, current active listings, and pending transactions in your neighborhood. It is not a computer-generated estimate. A local conversation gives you context a formula cannot.",
    },
    {
      q: 'Should I make repairs before I list?',
      a: 'Discuss with your agent which repairs are likely to affect price and timeline in your market. Some issues are better addressed before listing; others may not recover their cost. Prioritize what buyers typically notice first.',
    },
    {
      q: 'How long does it take to sell a home?',
      a: 'Timelines depend on price, condition, market activity, and location. Your agent can discuss realistic expectations for your specific situation and market.',
    },
    {
      q: 'What is included in closing costs for a seller?',
      a: 'Seller closing costs typically include agent commissions, transfer taxes in your state, title and escrow fees, and any negotiated credits or repairs. Ask your agent for a net sheet based on your specific transaction.',
    },
    {
      q: 'How do I prepare for showings and inspections?',
      a: 'Declutter, depersonalize, and address obvious maintenance items. Your agent can walk the property with you before the first showing and help you understand what inspectors typically look for.',
    },
  ],
  'first-time-buyers': [
    {
      q: 'How much income do I need to qualify for a mortgage?',
      a: 'Qualification depends on the loan amount, interest rate, program type, and your overall financial picture — not just income. A lender reviews debt, assets, credit, and income together. Start the conversation early.',
    },
    {
      q: 'What is the difference between FHA and conventional loans?',
      a: 'FHA loans are government-insured with their own credit and down payment requirements. Conventional loans follow guidelines set by Fannie Mae or Freddie Mac. The right choice depends on your credit, down payment, and overall situation.',
    },
    {
      q: 'What is mortgage insurance and when is it required?',
      a: 'Mortgage insurance protects the lender if the loan goes unpaid. It is typically required when down payment is below 20% on most loan types. FHA has its own mortgage insurance premium structure. Ask your lender to compare the full cost.',
    },
    {
      q: 'How do I find a good real estate agent?',
      a: 'Look for someone who knows your target market, answers your questions clearly, and explains the process without pressure. RCRE agents are available in Alabama and Florida.',
    },
    {
      q: 'What happens at the closing?',
      a: 'At closing, you sign the final loan documents and the deed. You will need to bring identification and funds for closing costs as specified in your closing disclosure. Your agent and lender will walk you through what to expect beforehand.',
    },
  ],
  join: [
    {
      q: 'Do I need prior real estate experience to join RCRE?',
      a: 'No. RCRE works with agents at every stage — new licensees, experienced agents transitioning from another brokerage, and those building toward production goals. The conversation starts with where you are.',
    },
    {
      q: 'What technology does RCRE provide its agents?',
      a: 'Agents have access to a connected platform for contacts, appointments, property search, transaction tracking, and AI-assisted guidance. The goal is to reduce duplicated effort and keep the work organized.',
    },
    {
      q: 'How does the RCRE AI assistant work?',
      a: 'The AI assistant draws on published public pages and brokerage-approved material. It does not access private client records or make final decisions. It drafts, explains, and summarizes — not executes.',
    },
    {
      q: 'What markets does RCRE serve?',
      a: 'RCRE operates in Alabama and Florida, with active agents and offices supporting both states.',
    },
    {
      q: 'How is RCRE different from other brokerages?',
      a: 'RCRE prioritizes coaching, accountability, and training alongside technology and market presence. Leadership focuses on agent development and growth rather than volume alone.',
    },
    {
      q: 'What kind of training does RCRE offer?',
      a: 'Agents have access to the AI Advantage Realtor curriculum and brokerage-created material. Progress and assignments are tracked within the platform.',
    },
    {
      q: 'What does the RCRE platform include?',
      a: 'A connected workspace covering contacts, appointments, property search, transaction milestones, AI-assisted guidance, and compliance records. It is designed to support the full real estate lifecycle.',
    },
  ],
}

type Props = { params: Promise<{ publicPath: string[] }> }

const titles: Record<string, string> = {
  team: 'Meet the people behind your next move.',
  neighborhoods: 'A place for the life you want.',
  'markets/alabama': 'Make your next chapter Alabama.',
  'markets/florida': 'Find your place in Florida.',
  'home-search/listings': 'Find a home that fits your life.',
  'home-search/account': 'Your shortlist, kept together.',
  'properties/sale': 'Explore the possibilities.',
  'properties/sold': 'A look at completed moves.',
  blog: 'Local perspective. Practical guidance.',
  'home-valuation': 'What is your home worth?',
  contact: 'Good conversations start here.',
  privacy: 'Your privacy matters.',
  'terms-and-conditions': 'Terms & conditions',
  accessibility: 'A website everyone can use.',
  'privacy/preferences': 'Your consent preferences',
  testimonials: 'Relationships are at the heart of RCRE.',
  'thank-you': 'Your next step is recorded.',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicPath } = await params
  const path = publicPath.join('/')

  const edited = await getPublished('/' + path)
  const originalAgent = publicAgents.find(a => path === 'agent/' + a.slug)
  const agent = originalAgent
    ? {
        ...originalAgent,
        ...edited?.profile,
        name: edited?.title ?? originalAgent.name,
        image: edited?.image ? edited.image.src : originalAgent.image,
      }
    : undefined
  const community = communities.find(c => path === 'neighborhoods/' + c.slug)
  const article = [...articles, ...metroArticles].find(a => path === 'blog/' + a.slug)
  const metro = metroJournals.find(m => path === 'blog/metros/' + m.slug)
  const guide = guides.find(g => g.slug === path)

  return {
    title:
      (
        edited?.seoTitle ??
        edited?.title ??
        agent?.name ??
        community?.name ??
        article?.title ??
        metro?.name ??
        guide?.title ??
        titles[path] ??
        'Page not found'
      ) + ' | RCRE Group',
    description:
      edited?.description ??
      article?.description ??
      metro?.description ??
      guide?.description ??
      'Explore RCRE Group in Alabama and Florida. Connect with a local real estate professional.',
    alternates: {
      canonical: edited?.canonical ?? 'https://rcregroup.com/' + path,
    },
    openGraph: {
      title:
        edited?.seoTitle ??
        edited?.title ??
        agent?.name ??
        article?.title ??
        metro?.name ??
        guide?.title ??
        titles[path],
      description:
        edited?.description ??
        article?.description ??
        metro?.description ??
        guide?.description,
      images: edited?.image?.src
        ? [{ url: 'https://rcregroup.com' + edited.image.src, alt: edited.image.alt }]
        : undefined,
    },
    robots:
      edited?.noIndex === true ||
      path.startsWith('academy-preview') ||
      path.startsWith('home-search') ||
      path.startsWith('properties/demo-') ||
      path === 'thank-you'
        ? { index: false, follow: true }
        : { index: true, follow: true },
  }
}

export default async function PublicPage({ params }: Props) {
  const { publicPath } = await params
  const path = publicPath.join('/')

  if (path === 'home-search') permanentRedirect('/home-search/listings')
  if (path === 'privacy-policy') permanentRedirect('/privacy')
  if (path === 'terms') permanentRedirect('/terms-and-conditions')
  if (path === 'markets') permanentRedirect('/neighborhoods')
  if (path === 'search') permanentRedirect('/home-search/listings')
  if (path === '404') notFound()

  const stored = await getPublicRecord('/' + path)
  if (stored?.status === 'archived') notFound()

  const edited = await getPublished('/' + path)
  const brokerage = await getBrokerage()
  const published = await publishedPages()
  const archived = await archivedPublicPaths()

  if (edited?.redirectTo) {
    try {
      validatePublicRedirect('/' + path, edited.redirectTo, published)
    } catch {
      notFound()
    }
    permanentRedirect(edited.redirectTo)
  }

  const displayedAgents = publicAgents
    .filter(a => !archived.includes('/agent/' + a.slug))
    .map(a => {
      const p = published.find(p => p.id === '/agent/' + a.slug)?.published
      return p
        ? { ...a, ...p.profile, name: p.title, bio: p.body, image: p.image ? p.image.src : a.image }
        : a
    })

  const guide = guides.find(g => g.slug === path)
  const originalAgent = publicAgents.find(a => path === 'agent/' + a.slug)
  const agent = originalAgent
    ? {
        ...originalAgent,
        ...edited?.profile,
        name: edited?.title ?? originalAgent.name,
        image: edited?.image ? edited.image.src : originalAgent.image,
      }
    : undefined
  const community = communities.find(c => path === 'neighborhoods/' + c.slug)
  const article = [...articles, ...metroArticles].find(a => path === 'blog/' + a.slug)
  const metro = metroJournals.find(m => path === 'blog/metros/' + m.slug)
  const property = properties.find(p => path === 'properties/' + p.id)
  const legacy = legacyProperties.includes('/' + path)
  const guideFaq = guide ? faqData[guide.slug] : undefined

  if (!edited && !titles[path] && !guide && !agent && !community && !article && !metro && !property && !legacy) {
    notFound()
  }

  const pageTitle =
    edited?.title ??
    guide?.title ??
    agent?.name ??
    community?.name ??
    article?.title ??
    metro?.name ??
    property?.title ??
    titles[path] ??
    'Archived property reference'
  const body = edited?.body

  let content: React.ReactNode
  const overrides = Object.fromEntries(published.map(p => [p.id, p.published!]))
  const metroArticle = metroArticles.find(a => a.slug === article?.slug)

  if (metro) {
    content = (
      <div className="public-wrap">
        <MetroHub metro={metro} agents={displayedAgents} edited={edited} hidden={archived} overrides={overrides} />
        <InquiryForm
          kind="consultation"
          market={metro.state}
          referrer={'/' + path}
          title={'Plan your move in ' + metro.name}
        />
      </div>
    )
  } else if (metroArticle) {
    const region = metroJournals.find(m => m.slug === metroArticle.metroSlug)!

    content = (
      <>
        <PublicHero
          title={pageTitle}
          description={edited?.description ?? metroArticle.description}
          label={region.name + ' · ' + metroArticle.category}
        />
        <div className="public-wrap public-article-cover">
          <BlogPhotography slug={metroArticle.slug} category={metroArticle.category} override={edited} />
        </div>
        <div className="public-wrap public-editorial">
          <article className="public-prose">
            <p className="public-small">{metroArticle.readMinutes} minute read · Original RCRE guidance</p>
            {body
              ? body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)
              : metroArticle.sections.map(s => (
                  <section key={s.title}>
                    <h2>{s.title}</h2>
                    <p>{s.text}</p>
                  </section>
                ))}
            <MetroSources sources={metroArticle.sources} />
          </article>
          <aside>
            <h2>Keep exploring</h2>
            <Link href={'/blog/metros/' + region.slug}>{region.name} journal →</Link>
            <Link href="/financing">Understand your financing →</Link>
            <Link href="/home-search/listings">Explore homes →</Link>
            <Link href="/home-valuation">Plan your sale →</Link>
          </aside>
        </div>
        <div className="public-wrap">
          <MetroPeople metro={region} agents={displayedAgents} />
          <InquiryForm
            kind="consultation"
            market={region.state}
            referrer={'/' + path}
            title="Bring your questions to RCRE"
          />
        </div>
      </>
    )
  } else if (agent) {
    content = (
      <>
        <section className="public-profile public-wrap">
          <div>
            {agent.image ? (
              <img src={agent.image} alt={edited?.image?.alt ?? agent.name} width={480} height={560} />
            ) : (
              <div className="public-monogram large" aria-hidden>
                {agent.name
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
            )}
          </div>
          <div>
            <p className="public-kicker">
              {agent.role} · {agent.market}
            </p>
            <h1>{pageTitle}</h1>
            <p className="public-lead">{edited?.description ?? 'Clear communication. A personal approach to your next move.'}</p>
            <p>{body ?? agent.bio}</p>
            <dl className="public-profile-details">
              <div>
                <dt>Phone</dt>
                <dd>
                  <a href={'tel:' + agent.phone.replace(/\D/g, '')}>{agent.phone}</a>
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={'mailto:' + agent.email}>{agent.email}</a>
                </dd>
              </div>
              <div>
                <dt>License as shown on source profile</dt>
                <dd>{agent.license}</dd>
              </div>
            </dl>
            <a className="public-button" href="#inquiry">
              Connect with {agent.name.split(' ')[0]} ↗
            </a>
            <p className="public-small">
              Profile details from RCRE&apos;s public directory. Roster and license details are subject to brokerage
              review.{' '}
              <a href={'https://rcregroup.com/agent/' + agent.slug} target="_blank" rel="noreferrer">
                Source profile ↗
              </a>
            </p>
          </div>
        </section>
        <div className="public-wrap">
          <InquiryForm
            recipient={agent.email}
            market={agent.market === 'Alabama & Florida' ? '' : agent.market}
            referrer={'/agent/' + agent.slug}
            title={'Talk with ' + agent.name}
          />
          <p className="public-financing-link">
            Planning your financing?{' '}
            <Link href="/financing">Meet Preferred Lender Jeremy McDonald ↗</Link> You may choose any lender.
          </p>
        </div>
      </>
    )
  } else if (property) {
    content = (
      <>
        <PublicHero
          title={property.title}
          description={property.location}
          label="Synthetic property · Local review"
        />
        <div className="public-wrap">
          <ListingVisual seed={property.id} className="public-detail-art" />
          <div className="public-feature">
            <div>
              <h2>${property.price.toLocaleString()}</h2>
              <p className="public-lead">
                {property.beds} beds · {property.baths} baths · {property.area.toLocaleString()} sq ft
              </p>
              <p>{property.description}</p>
              <p className="public-notice">
                This is a synthetic property, not an available listing. Dimensions, price, status, location,
                and illustration exist only to demonstrate local workflows.
              </p>
            </div>
            <aside className="public-detail-aside">
              <h2>Explore the next step</h2>
              <a className="public-button" href="#inquiry">
                Request a showing ↗
              </a>
              <Link href="/financing">Estimate financing with Jeremy →</Link>
              <Link href="/home-search/listings">Return to home search →</Link>
            </aside>
          </div>
          <InquiryForm
            kind="showing"
            market={property.market}
            referrer={'/properties/' + property.id}
            title="Request a local demonstration showing"
          />
        </div>
      </>
    )
  } else if (legacy) {
    content = (
      <>
        <PublicHero
          title="An existing property reference, preserved."
          description="This address was included in the RCRE property archive. Current listing information is not connected in this local build."
          label="Property archive"
        />
        <div className="public-wrap public-prose">
          <p>
            Property listings and photographs require an approved MLS or IDX source. This page preserves the
            original URL without inventing a price, sale, status, or availability.
          </p>
          <p>
            <a href={'https://rcregroup.com/' + path} target="_blank" rel="noreferrer">
              View the original RCRE property page ↗
            </a>
          </p>
          <InquiryForm kind="property" referrer={'/' + path} title="Ask about this property reference" />
        </div>
      </>
    )
  } else if (path === 'about') {
    content = (
      <>
        <PublicHero
          title={pageTitle}
          description={
            edited?.description ??
            'River City Real Estate Group connects buyers, sellers, and real estate professionals across Alabama and Florida.'
          }
          label="About RCRE"
        />
        <div className="public-wrap public-content public-prose">
          <h2>Guidance that starts by listening</h2>
          <p>
            Every move has its own timing, questions, and priorities. RCRE brings a relationship-focused
            approach to buying and selling: understand the goal, organize the information, and keep the next
            step clear.
          </p>
          <h2>Two markets. A connected team.</h2>
          <p>
            The brokerage serves Alabama and Florida, with a public directory organized by market. Speak with
            the team about the right professional for your location and property. The office contact listed on
            the RCRE site is 1 Chase Corporate Dr # 400, Birmingham AL 35244.
          </p>
          <h2>A brokerage built for its people</h2>
          <p>
            Leadership has identified structure, coaching, accountability, training, multiple markets, and
            business growth as the reasons to build at RCRE. The working platform brings those priorities
            into one place, with human review of consequential actions.
          </p>
        </div>
        <section className="public-wrap public-content">
          <p className="public-kicker">RCRE Leadership</p>
          <h2>The people guiding the team.</h2>
          <div className="public-agent-grid">
            {[
              {
                name: 'Julio Arango',
                role: 'Qualifying Broker',
                market: 'Alabama &amp; Florida',
                slug: 'julio-arango',
                bio: 'Julio Arango brings dual-state market expertise to RCRE, covering Alabama and Florida with a focus on transaction structure, compliance, and the practical realities of cross-market practice. He works closely with agents on deal analysis and market entry strategy.',
              },
              {
                name: 'Taquilla Allen',
                role: 'Managing Broker',
                market: 'RCRE',
                slug: 'taquilla-allen',
                bio: 'Taquilla Allen manages team performance, coaching accountability, and day-to-day broker oversight at RCRE. Her focus is on helping agents build consistent habits, maintain compliance, and grow their business through structured check-ins and practical support.',
              },
            ].map(a => (
              <Link className="public-agent" href={'/agent/' + a.slug} key={a.slug}>
                <div className="public-monogram" aria-hidden>
                  {a.name
                    .split(' ')
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <p className="public-small">
                    {a.role} · {a.market}
                  </p>
                  <h2>{a.name}</h2>
                  <p>{a.bio}</p>
                  <span className="public-text-link">Get to know {a.name.split(' ')[0]} →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="public-market-band">
          <div className="public-wrap public-feature">
            <div>
              <p className="public-kicker">Your business operating system</p>
              <h2>The platform that earns its place.</h2>
              <p>
                RCRE is built to be the agent&apos;s primary workspace: contacts, appointments, property
                search, transaction milestones, AI assistance, and compliance records in one connected place.
                The goal is not to add tools to a scattered workflow — it is to replace the scattered workflow
                with a structure that holds the work together.
              </p>
            </div>
            <div>
              <p className="public-lead">What the platform covers:</p>
              <ul>
                <li>
                  <strong>The Command platform</strong> — Broker accountability lives here. Leadership reviews
                  activity, transactions, and compliance records through structured visibility. Nothing
                  happens in a vacuum.
                </li>
                <li>
                  <strong>The AI Assistant</strong> — Draft follow-up messages, summarize market context,
                  review conversation scripts, and prepare for appointments. The AI organizes and prepares;
                  the agent decides and acts.
                </li>
                <li>
                  <strong>Academy (Classroom)</strong> — The imported AI Advantage Realtor curriculum with 14
                  courses and 181 lessons. Foundation through Advanced levels. Progress tracked, assignments
                  reviewed.
                </li>
                <li>
                  <strong>Community</strong> — Peer discussions, coaching conversations, and resource
                  sharing. Practical accountability that shows up before a deal goes sideways, not after.
                </li>
              </ul>
              <Link href="/login" className="public-text-link">
                Explore the local platform →
              </Link>
            </div>
          </div>
        </section>
        <div className="public-wrap">
          <InquiryForm
            kind="consultation"
            referrer="/about"
            title="Questions about RCRE? Start a conversation."
          />
        </div>
      </>
    )
  } else if (guide || article) {
    const entry = guide ?? article!
    content = (
      <>
        <PublicHero title={pageTitle} description={edited?.description ?? entry.description} label={entry.category} />
        {article && (
          <div className="public-wrap public-article-cover">
            <BlogPhotography slug={article.slug} category={article.category} override={edited} />
          </div>
        )}
        <div className="public-wrap public-editorial">
          <article className="public-prose">
            {!article && edited?.image?.src && (
              <img className="public-editorial-image" src={edited.image.src} alt={edited.image.alt} />
            )}
            {article && (
              <p className="public-small">
                Local editorial content · Brokerage approval required before production
              </p>
            )}
            {body
              ? body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)
              : entry.sections.map(s => (
                  <section key={s.title}>
                    <h2>{s.title}</h2>
                    <p>{s.text}</p>
                  </section>
                ))}
            {article && (
              <p className="public-small">
                Original educational copy for local review, informed by RCRE&apos;s existing topic coverage.
                Property-specific facts and legal or financing questions should be confirmed with the relevant
                professional.
              </p>
            )}
            {article && (
              <p className="public-small">
                <a href={'https://rcregroup.com/blog/' + article.slug} target="_blank" rel="noreferrer">
                  Existing RCRE article source ↗
                </a>
              </p>
            )}
            {guide && (
              <p>
                <a
                  className="public-button secondary"
                  href={
                    '/api/public/resources/' +
                    (guide.slug === 'selling' ? 'seller-checklist' : 'buyer-checklist')
                  }
                >
                  Download the {guide.slug === 'selling' ? 'seller' : 'buyer'} checklist ↓
                </a>
              </p>
            )}
            <p>
              <Link className="public-text-link" href="/financing">
                Explore financing with Jeremy McDonald ↗
              </Link>
            </p>
          </article>
          <aside>
            <h2>Your next step</h2>
            <Link href="/home-search/listings">Explore homes →</Link>
            <Link href="/team">Find your agent →</Link>
            <Link href="/home-valuation">Request a home valuation →</Link>
            <Link href="/blog">More insights →</Link>
          </aside>
        </div>
        <div className="public-wrap">
          <InquiryForm
            kind={path === 'selling' ? 'seller' : 'consultation'}
            referrer={'/' + path}
            title={path === 'selling' ? 'Plan your sale with RCRE' : "Let's put your plan in motion"}
          />
        </div>
        {guideFaq && guideFaq.length > 0 && (
          <div className="public-wrap public-content">
            <section className="public-faq">
              <div>
                <p className="public-kicker">Common questions</p>
                <h2>Before you go.</h2>
              </div>
              <div>
                {guideFaq.map(f => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
            <Link href="/faq" className="public-text-link">
              More questions and answers →
            </Link>
          </div>
        )}
      </>
    )
  } else if (community) {
    content = (
      <>
        <PublicHero
          title={pageTitle}
          description={edited?.description ?? community.intro}
          label={community.market + ' · Neighborhood guide'}
        />
        <div className="public-wrap public-editorial">
          <article className="public-prose">
            {edited?.image?.src && (
              <img className="public-editorial-image" src={edited.image.src} alt={edited.image.alt} />
            )}
            {body ? (
              body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <>
                <h2>A search built around you</h2>
                <p>{community.intro}</p>
                <h2>Questions to ask before you choose</h2>
                <p>{community.considerations}</p>
                <h2>Put the address in context</h2>
                <p>
                  Gather current property information, travel the routes that matter to you, and ask for the
                  relevant disclosures and governing documents. Use official address-based sources for school
                  assignments, flood information, taxes, and local services. County-wide figures do not
                  describe an individual home.
                </p>
                <h2>Prepare your ownership budget</h2>
                <p>
                  Compare taxes, insurance, association charges, maintenance, and financing together. Obtain
                  property-specific quotes and confirm which expenses are already included in a tax or escrow
                  estimate.
                </p>
              </>
            )}
            <Link className="public-button" href={'/home-search/listings?market=' + community.market}>
              Explore {community.market} homes ↗
            </Link>
          </article>
          <aside>
            <h2>Keep exploring</h2>
            {communities
              .filter(c => c.market === community.market && c.slug !== community.slug)
              .slice(0, 3)
              .map(c => (
                <Link key={c.slug} href={'/neighborhoods/' + c.slug}>
                  {c.name} →
                </Link>
              ))}
            <Link href="/relocation">Relocation guide →</Link>
            <Link href="/financing">Plan your financing →</Link>
            <p className="public-small">
              County coverage preserved from the RCRE public site. No school, safety, demographic, or
              investment rankings are inferred.
            </p>
          </aside>
        </div>
        <div className="public-wrap">
          <InquiryForm
            market={community.market}
            referrer={'/' + path}
            title={'Start your ' + community.name + ' conversation'}
          />
        </div>
      </>
    )
  } else {
    const joinFaq = faqData[path]

    content = (
      <>
        {path !== 'blog' && (
          <PublicHero
            title={pageTitle}
            description={
              edited?.description ??
              (
                {
                  team: 'Local knowledge is personal. Find the professional for your market and your next move.',
                  neighborhoods: 'Explore the communities RCRE serves, then build a shortlist around your own priorities.',
                  blog: 'Useful questions, local context, and a clearer path to your next decision.',
                  'home-valuation': 'Get an informed pricing conversation based on your property. No instant value is invented.',
                  contact: 'Reach the team in Alabama or Florida, ask a question, or request a time to talk.',
                }[path] ?? 'River City Real Estate Group · Alabama & Florida'
              )
            }
          />
        )}
        <div className={path === 'blog' ? 'public-wrap' : 'public-wrap public-content'}>
          {body && (
            <div className="public-prose">
              {edited?.image?.src && (
                <img className="public-editorial-image" src={edited.image.src} alt={edited.image.alt} />
              )}
              {body.split('\n\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
          {path === 'team' && <AgentDirectory agents={displayedAgents} />}
          {(path === 'neighborhoods' || path.startsWith('markets/')) && (
            <>
              {['Alabama', 'Florida']
                .filter(m => path === 'neighborhoods' || path.endsWith(m.toLowerCase()))
                .map(m => (
                  <section key={m} className="public-county-section">
                    <h2>{m}</h2>
                    <p>
                      {m === 'Alabama'
                        ? 'Explore Birmingham and the surrounding county markets.'
                        : 'Explore Northeast Florida and South Florida county markets.'}
                    </p>
                    <div className="public-county-grid">
                      {communities
                        .filter(c => c.market === m && !archived.includes('/neighborhoods/' + c.slug))
                        .map(c => (
                          <Link key={c.slug} href={'/neighborhoods/' + c.slug}>
                            <h3>
                              {published.find(p => p.id === '/neighborhoods/' + c.slug)?.published?.title ??
                                c.name}
                            </h3>
                            <p>
                              {published.find(p => p.id === '/neighborhoods/' + c.slug)?.published
                                ?.description ?? c.intro}
                            </p>
                            <span>Explore the guide ↗</span>
                          </Link>
                        ))}
                    </div>
                  </section>
                ))}
            </>
          )}
          {['home-search/listings', 'home-search/account', 'properties/sale', 'properties/sold'].includes(
            path
          ) && <PropertySearch sold={path === 'properties/sold'} account={path === 'home-search/account'} />}
          {path === 'blog' && (
            <>
              <MetroJournalIndex hidden={archived} overrides={overrides} title={edited?.title} description={edited?.description} />
              <CinematicGallery journal />
            </>
          )}
          {path === 'home-valuation' && (
            <>
              <div className="public-feature">
                <div>
                  <h2>Context makes a valuation useful.</h2>
                  <p>
                    Tell us the address, condition, recent improvements, and your timing. An agent can review
                    relevant comparable properties and discuss a sensible next step.
                  </p>
                </div>
                <div>
                  <h3>What happens next?</h3>
                  <p>
                    The inquiry is saved locally with your source and contact permission. A live comparative
                    market analysis requires an authorized agent and current market data. This tool does not
                    return a fabricated appraisal or cash offer.
                  </p>
                </div>
              </div>
              <InquiryForm
                kind="valuation"
                recipient={brokerage.publicEmail}
                title="Request a property review"
              />
            </>
          )}
          {path === 'contact' && (
            <>
              <div className="public-contact-grid">
                <section>
                  <h2>Alabama</h2>
                  <a href={'tel:' + brokerage.publicPhone.replace(/\D/g, '')}>{brokerage.publicPhone}</a>
                  <p>{brokerage.alOfficeAddress}</p>
                </section>
                <section>
                  <h2>Florida</h2>
                  <a href={'tel:' + brokerage.flPhone.replace(/\D/g, '')}>{brokerage.flPhone}</a>
                  <p>{brokerage.flOfficeAddress ?? 'Speak with the team about your Florida market and appointment location.'}</p>
                </section>
                <section>
                  <h2>Email</h2>
                  <a href={'mailto:' + brokerage.publicEmail}>{brokerage.publicEmail}</a>
                  <p>For sensitive documents, request an approved secure channel.</p>
                </section>
              </div>
              <InquiryForm
                kind="appointment"
                recipient={brokerage.publicEmail}
                title="Ask a question or request an appointment"
              />
            </>
          )}
          {path === 'privacy/preferences' && <ConsentPreferences />}
          {path === 'privacy' && (
            <div className="public-prose">
              <p className="public-notice">
                Draft privacy information for local review. Brokerage and legal approval required before public launch.
              </p>
              <h2>What this local site stores</h2>
              <p>
                Inquiry records contain the information you enter, the intended recipient, source page, market,
                time, and communication permission. Saved property searches are associated with an opaque browser
                cookie. Theme and consent choices use browser storage. The local application is not connected to
                production FUB or external messaging.
              </p>
              <h2>Public chat</h2>
              <p>
                Opening Ask RCRE creates a separate browser-specific, HttpOnly cookie. Up to 20 recent questions
                and responses are stored in this local application, with access expiring after 30 days without
                chat activity. Clear history removes the conversation for this browser. The site guide searches
                published public pages. If a permitted local model is configured, it receives those public
                excerpts and recent chat context; private brokerage records are not provided. No paid provider
                fallback is enabled.
              </p>
              <h2>Your control</h2>
              <p>
                Only submit synthetic information during review. Do not use marketing forms to send financial
                documents. You can manage optional local engagement consent, delete saved searches, or submit a
                data request. Requests are recorded for review rather than silently deleting records.
              </p>
              <Link href="/privacy/preferences" className="public-button secondary">
                Manage consent preferences
              </Link>
              <InquiryForm kind="data-request" title="Request access, correction, or deletion" />
            </div>
          )}
          {path === 'terms-and-conditions' && (
            <div className="public-prose">
              <p className="public-notice">Draft terms for local review. Not approved for production publication.</p>
              <h2>Purpose of the site</h2>
              <p>
                This application demonstrates RCRE&apos;s website and local working interface. Public educational
                material provides general information. Property demonstrations do not establish availability,
                market value, a completed sale, or a lending offer.
              </p>
              <h2>Verify before relying</h2>
              <p>
                Confirm property details, licensing, professional advice, and contractual terms with the
                appropriate source. Calculators use user-entered assumptions. External sites have their own
                terms and privacy practices.
              </p>
              <h2>Content and use</h2>
              <p>
                RCRE branding and locally approved material remain subject to their applicable rights. MLS data,
                listing photography, service activation, and public publishing require separate authorization. Do
                not submit real sensitive client data in this review environment.
              </p>
              <h2>Questions</h2>
              <p>
                Contact <a href={'mailto:' + brokerage.publicEmail}>{brokerage.publicEmail}</a> for site
                questions.
              </p>
            </div>
          )}
          {path === 'accessibility' && (
            <div className="public-prose">
              <h2>Designed for access</h2>
              <p>
                The site uses semantic headings, labeled forms, keyboard-operable controls, visible focus,
                responsive layouts, and a persistent light or dark preference. Motion respects reduced-motion
                preferences. Use your browser&apos;s zoom and text settings as needed.
              </p>
              <h2>If something gets in the way</h2>
              <p>
                Tell us which page and task caused difficulty, your device or assistive technology if you wish,
                and the format that would help. Do not include sensitive personal information.
              </p>
              <InquiryForm kind="contact" title="Report an accessibility issue" />
            </div>
          )}
          {path === 'testimonials' && (
            <div className="public-prose">
              <h2>Hear directly from the people who worked with the team.</h2>
              <p>
                The existing RCRE site maintains client testimonials. Their permissions and current display terms
                need review before migrating the complete collection. No new testimonials or review scores have
                been invented for this build.
              </p>
              <a
                className="public-button"
                href="https://rcregroup.com/testimonials"
                target="_blank"
                rel="noreferrer"
              >
                Read RCRE&apos;s existing testimonials ↗
              </a>
              <p>
                <Link href="/team">Meet the team behind the relationships →</Link>
              </p>
            </div>
          )}
          {path === 'thank-you' && (
            <div className="public-prose">
              <p>
                Check the form confirmation for your local inquiry reference. No appointment, financing approval,
                or external message is implied by visiting this page.
              </p>
              <Link href="/">Return home →</Link>
            </div>
          )}
          {joinFaq && joinFaq.length > 0 && (
            <div className="public-wrap public-content">
              <section className="public-faq">
                <div>
                  <p className="public-kicker">Common questions</p>
                  <h2>Before you go.</h2>
                </div>
                <div>
                  {joinFaq.map(f => (
                    <details key={f.q}>
                      <summary>{f.q}</summary>
                      <p>{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
              <Link href="/faq" className="public-text-link">
                More questions and answers →
              </Link>
            </div>
          )}
        </div>
      </>
    )
  }

  const articlePage = !metro && (!!article || path.startsWith('blog/'))
  const crumbLabel = agent ? 'Our people' : articlePage ? 'Insights' : community ? 'Our markets' : 'Explore'
  const crumbPath = agent ? '/team' : articlePage ? '/blog' : community ? '/neighborhoods' : '/'
  const canonical = edited?.canonical ?? 'https://rcregroup.com/' + path
  const orgEntry = {
    '@type': 'Organization',
    name: 'RCRE Group',
    url: 'https://rcregroup.com',
    logo: 'https://rcregroup.com/favicon.svg',
  }
  const json = {
    '@context': 'https://schema.org',
    '@graph': [
      orgEntry,
      {
        '@type': agent ? 'Person' : articlePage ? 'Article' : 'WebPage',
        name: pageTitle,
        url: canonical,
        ...(agent ? { telephone: agent.phone, email: agent.email } : {}),
        ...(articlePage
          ? {
              headline: pageTitle,
              author: { '@type': 'Organization', name: edited?.schema?.authorName ?? 'RCRE editorial desk' },
              ...(edited?.schema?.datePublished ? { datePublished: edited.schema.datePublished } : {}),
            }
          : {}),
      },
      ...(guideFaq && guideFaq.length > 0
        ? [
            {
              '@type': 'FAQPage',
              mainEntity: guideFaq.map(f => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ]
        : []),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: crumbLabel,
            item: 'https://rcregroup.com' + crumbPath,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: pageTitle,
            item: canonical,
          },
        ],
      },
    ],
  }

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }} />
      <div className="public-wrap">
        <Breadcrumbs items={[{ label: crumbLabel, href: crumbPath }, { label: pageTitle }]} />
      </div>
      {articlePage && (
        <p className="public-wrap public-small">
          {edited?.schema?.authorName ?? 'RCRE editorial desk'}
          {edited?.schema?.datePublished ? ' · ' + edited.schema.datePublished : ''}
        </p>
      )}
      {content}
    </PublicShell>
  )
}
