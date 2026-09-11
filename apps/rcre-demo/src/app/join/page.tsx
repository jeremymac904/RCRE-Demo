import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {getPublished,getPublicRecord} from '@/lib/public/server'
import {PublicShell,PublicHero} from '@/components/public/PublicShell'
import {InquiryForm} from '@/components/public/PublicInteractions'

const defaultMetadata:Metadata={
  title:'Join RCRE | Build your real estate business',
  description:'Structure, coaching, accountability, training, multiple markets, and a plan for growth. Start a confidential career conversation with RCRE.',
  alternates:{canonical:'https://rcregroup.com/join'}
}

export const dynamic='force-dynamic'

const joinFaq: Array<[string,string]> =[
  ['Do I need prior real estate experience to join RCRE?','No. RCRE works with agents at every stage — new licensees, experienced agents transitioning from another brokerage, and those building toward production goals. The conversation starts with where you are.'],
  ['What technology does RCRE provide its agents?','Agents have access to a connected platform for contacts, appointments, property search, transaction tracking, and AI-assisted guidance. The goal is to reduce duplicated effort and keep the work organized.'],
  ['How does the RCRE AI assistant work?','The AI assistant draws on published public pages and brokerage-approved material. It does not access private client records or make final decisions. It drafts, explains, and summarizes — not executes.'],
  ['What markets does RCRE serve?','RCRE operates in Alabama and Florida, with active agents and offices supporting both states.'],
  ['How is RCRE different from other brokerages?','RCRE prioritizes coaching, accountability, and training alongside technology and market presence. Leadership focuses on agent development and growth rather than volume alone.'],
  ['What kind of training does RCRE offer?','Agents have access to the AI Advantage Realtor curriculum and brokerage-created material. Progress and assignments are tracked within the platform.'],
  ['What does the RCRE platform include?','A connected workspace covering contacts, appointments, property search, transaction milestones, AI-assisted guidance, and compliance records. It is designed to support the full real estate lifecycle.'],
]

const faqJsonLd={
  '@context':'https://schema.org',
  '@type':'FAQPage',
  mainEntity:joinFaq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))
}

const orgJsonLd={
  '@context':'https://schema.org',
  '@type':'Organization',
  name:'RCRE Group',
  url:'https://rcregroup.com',
  logo:'https://rcregroup.com/favicon.svg'
}
// JobPosting schema removed — recruiting independent-contractor real estate agents
// does not meet Google\u2019s structured data requirements for job postings.

export async function generateMetadata():Promise<Metadata>{
  const p=await getPublished('/join')
  return {
    ...defaultMetadata,
    robots:{index:p?.noIndex!==true,follow:true},
    openGraph:{
      title:p?.seoTitle||p?.title||String(defaultMetadata.title),
      description:p?.description||defaultMetadata.description||undefined,
      images:p?.image?.src?[{url:'https://rcregroup.com'+p.image.src,alt:p.image.alt}]:undefined
    },
    title:p?.seoTitle||p?.title||defaultMetadata.title,
    description:p?.description||defaultMetadata.description,
    alternates:{canonical:p?.canonical||'https://rcregroup.com/join'}
  }
}

export default async function Join(){
  if((await getPublicRecord('/join'))?.status==='archived')notFound()
  const edited=await getPublished('/join')

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify([orgJsonLd,faqJsonLd]).replace(/</g,'\\u003c')}}/>
      <PublicHero
        label="Build your business with RCRE"
        title={edited?.title||'Your ambition. A team behind it.'}
        description={edited?.description||'You bring the commitment. RCRE brings structure, coaching, training, and a connected way to work.'}
      >
        <div className="public-actions">
          <a href="#inquiry" className="public-button">Start a confidential conversation</a>
          <Link href="/login" className="public-text-link">Explore the local platform</Link>
        </div>
      </PublicHero>
      {edited?.image?.src&&(
        <figure className="public-wrap public-content">
          <img src={edited.image.src} alt={edited.image.alt} style={{display:'block',maxWidth:'100%',width:'auto',height:'auto',maxHeight:360,objectFit:'contain'}}/>
        </figure>
      )}
      {edited?.body&&(
        <section className="public-wrap public-content public-prose">
          {edited.body.split('\n\n').map((p,i)=><p key={i}>{p}</p>)}
        </section>
      )}
      <section className="public-wrap public-feature">
        <div><h2>A brokerage should help you move forward.</h2></div>
        <div>
          <p className="public-lead">Leadership&apos;s priorities are clear: structure, coaching, accountability, training, multiple markets, and growth.</p>
          <p>Those are the questions to bring to your first conversation: How will I build a repeatable week? Who helps when a deal gets complicated? How do I keep improving? What does support look like in my market?</p>
        </div>
      </section>
      <section className="public-wrap public-programs">
        {[
          ['Structure','Bring priorities, appointments, contacts, and next actions into a consistent daily rhythm.'],
          ['Coaching','Make space to examine the work, ask better questions, and practice the conversations that matter.'],
          ['Accountability','Understand the expectations, see the evidence, and address what needs attention with your team.'],
          ['Training','Learn from the real AI Advantage Realtor curriculum and brokerage-created material, with progress and assignments in one place.'],
          ['Multiple markets','Connect with a brokerage serving Alabama and Florida while respecting licensing and local responsibilities.'],
          ['Business growth','Build the habits, client relationships, and business development plan that support your own goals.'],
        ].map(([title,text])=><article key={title}><h2>{title}</h2><p>{text}</p></article>)}
      </section>
      <section className="public-market-band">
        <div className="public-wrap public-feature">
          <div>
            <p className="public-kicker">AI Advantage Realtor Curriculum</p>
            <h2>RCRE Academy — training that earns its place.</h2>
            <p>The imported curriculum covers 14 courses and 181 lessons. Agents work through structured AI training at Foundation, Practitioner, and Advanced levels — from setting up the workspace to investor analysis and tax preparation. Every lesson has a written description in Jeremy&apos;s own voice. Progress and assignments stay in one place.</p>
          </div>
          <div>
            <p className="public-lead">Three course themes from the curriculum:</p>
            <ul>
              <li><strong>AI-Powered Real Estate Foundations</strong> — Set up a usable AI workspace, learn prompting that produces useful work, and build a portable identity system that gives the AI the agent&apos;s voice, market knowledge, and contact information across every session.</li>
              <li><strong>Lead Generation and Marketing Systems</strong> — Use persona, local knowledge, and content history to create marketing that starts real conversations. Turn listing information into a complete visual package while preserving property accuracy.</li>
              <li><strong>Listing Mastery and CMA Intelligence</strong> — Organize market data, rank comparables, prepare pricing conversations, and roleplay difficult seller discussions. The CMA assistant explains the work without replacing the agent&apos;s judgment.</li>
            </ul>
            <Link href="/login" className="public-text-link">Explore the Classroom</Link>
          </div>
        </div>
      </section>
      <section className="public-wrap public-content">
        <p className="public-kicker">Peer support and practical accountability</p>
        <h2>RCRE Community — conversations worth having.</h2>
        <p>The Community space gives agents a shared place to discuss what&apos;s working, share resources, and ask questions that have practical answers. Coaching conversations happen here — not just when something goes wrong, but as part of a regular rhythm of reflection and adjustment. Community posts, attachments, and questions stay organized by topic so nothing important disappears into a group chat.</p>
        <p>Accountability shows up through peer review and structured check-ins: see what the team is working on, share wins honestly, and bring forward what needs attention before it becomes a problem.</p>
      </section>
      <section className="public-market-band">
        <div className="public-wrap public-feature">
          <div>
            <p className="public-kicker">Your daily co-pilot</p>
            <h2>RCRE AI — draft, explain, and prepare. Not decide.</h2>
            <p>The AI assistant draws on published public pages and brokerage-approved material. It does not access private client records or make consequential decisions. It drafts follow-up messages, explains contract language, summarizes market context, and reviews scripts before a conversation — then the agent takes the next step.</p>
          </div>
          <div>
            <p className="public-lead">What the AI helps with:</p>
            <ul>
              <li><strong>Daily priorities</strong> — Review what&apos;s active, what&apos;s approaching, and what needs attention today. The assistant prepares the overview so the agent can act on it.</li>
              <li><strong>Follow-up drafting</strong> — Draft responses to leads, past clients, and in-progress deals. The agent reviews and sends — nothing goes out without human review.</li>
              <li><strong>Market research</strong> — Summarize property details, neighborhood context, and listing information from published sources. No invented comparables or pricing opinions.</li>
              <li><strong>Script review</strong> — Walk through a conversation approach before a buyer presentation or listing appointment. Identify gaps, test counter-arguments, and prepare for what typically comes up.</li>
            </ul>
            <Link href="/login" className="public-text-link">See the Assistant in the platform</Link>
          </div>
        </div>
      </section>
      <section className="public-wrap public-journey">
        <h2>A conversation, then a considered next step.</h2>
        <ol>
          {[
            ['Tell us about your goals','Share your market, experience, and what you want from a brokerage. Your recruiting inquiry is restricted from ordinary agent access.'],
            ['Discuss the fit','Talk with leadership about support, responsibilities, the working model, and questions specific to your business.'],
            ['Review the details','Request the current written terms and onboarding steps. No splits, fees, income outcomes, or guarantees are invented on this page.'],
          ].map(([title,text],i)=>
            <li key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{text}</p></div></li>
          )}
        </ol>
      </section>
      <section className="public-faq">
        <div className="public-wrap">
          <div><p className="public-kicker">Common questions</p><h2>Before you reach out.</h2></div>
          <div>{joinFaq.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </div>
      </section>
      <div className="public-wrap"><Link href="/faq" className="public-text-link">More questions and answers</Link></div>
      <div className="public-wrap"><InquiryForm kind="recruiting" title="Let's talk about what you're building." referrer="/join"/></div>
      <p className="public-wrap public-small">Platform access, training, and consumer treatment are not conditioned on referring mortgage business.</p>
    </PublicShell>
  )
}
