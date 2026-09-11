import type {Metadata} from 'next'
import Link from 'next/link'
import {PublicShell,Breadcrumbs} from '@/components/public/PublicShell'
const defaultMetadata:Metadata={title:'Frequently Asked Questions | RCRE Group',description:'Common questions about buying, selling, and working with RCRE Group in Alabama and Florida. Find clear answers before your next conversation.',alternates:{canonical:'https://rcregroup.com/faq'}}
export const dynamic='force-dynamic'
export async function generateMetadata():Promise<Metadata>{return {...defaultMetadata}}
const faq=[
  {q:'What should I do before I start looking at homes?',a:'Start with a lender conversation so you understand your price range and expected cash to close before you tour. That keeps the search focused and avoids disappointment.',path:'buying'},
  {q:'How much do I need for a down payment?',a:'Down payment requirements vary by loan program. Some programs allow as little as 3%–5%, while others require more. Your lender can explain the tradeoffs in mortgage insurance, fees, and qualification for each option.',path:'buying'},
  {q:'What is the difference between preapproval and final approval?',a:'Preapproval is an initial review of your credit and income, giving you a price range to shop within. Final approval happens after underwriting reviews the property, submitted documents, and program conditions.',path:'buying'},
  {q:'How do I know if a neighborhood is right for me?',a:'Visit at different times, review the commute routes that matter to you, check current property taxes and insurance for the area, and ask for the governing documents and disclosures for any home you are considering.',path:'buying'},
  {q:'What questions should I ask at a showing?',a:'Ask about age and condition of major systems, utility costs, any recent repairs or replacements, known issues with the property, and what the monthly ownership costs include. Confirm what fixtures and appliances convey.',path:'buying'},
  {q:'How is my home\'s value determined?',a:'An agent reviews recent comparable sales, current active listings, and pending transactions in your neighborhood. It is not a computer-generated estimate. A local conversation gives you context a formula cannot.',path:'selling'},
  {q:'Should I make repairs before I list?',a:'Discuss with your agent which repairs are likely to affect price and timeline in your market. Some issues are better addressed before listing; others may not recover their cost. Prioritize what buyers typically notice first.',path:'selling'},
  {q:'How long does it take to sell a home?',a:'Timelines depend on price, condition, market activity, and location. Your agent can discuss realistic expectations for your specific situation and market.',path:'selling'},
  {q:'What is included in closing costs for a seller?',a:'Seller closing costs typically include agent commissions, transfer taxes in your state, title and escrow fees, and any negotiated credits or repairs. Ask your agent for a net sheet based on your specific transaction.',path:'selling'},
  {q:'How do I prepare for showings and inspections?',a:'Declutter, depersonalize, and address obvious maintenance items. Your agent can walk the property with you before the first showing and help you understand what inspectors typically look for.',path:'selling'},
  {q:'How much income do I need to qualify for a mortgage?',a:'Qualification depends on the loan amount, interest rate, program type, and your overall financial picture — not just income. A lender reviews debt, assets, credit, and income together. Start the conversation early.',path:'first-time-buyers'},
  {q:'What is the difference between FHA and conventional loans?',a:'FHA loans are government-insured with their own credit and down payment requirements. Conventional loans follow guidelines set by Fannie Mae or Freddie Mac. The right choice depends on your credit, down payment, and overall situation.',path:'first-time-buyers'},
  {q:'What is mortgage insurance and when is it required?',a:'Mortgage insurance protects the lender if the loan goes unpaid. It is typically required when down payment is below 20% on most loan types. FHA has its own mortgage insurance premium structure. Ask your lender to compare the full cost.',path:'first-time-buyers'},
  {q:'How do I find a good real estate agent?',a:'Look for someone who knows your target market, answers your questions clearly, and explains the process without pressure. RCRE agents are available in Alabama and Florida — <a href="/team">meet the team</a>.',path:'first-time-buyers',safe:true},
  {q:'What happens at the closing?',a:'At closing, you sign the final loan documents and the deed. You will need to bring identification and funds for closing costs as specified in your closing disclosure. Your agent and lender will walk you through what to expect beforehand.',path:'first-time-buyers'},
  {q:'Do I need prior real estate experience to join RCRE?',a:'No. RCRE works with agents at every stage — new licensees, experienced agents transitioning from another brokerage, and those building toward production goals. The conversation starts with where you are.',path:'join'},
  {q:'What technology does RCRE provide its agents?',a:'Agents have access to a connected platform for contacts, appointments, property search, transaction tracking, and AI-assisted guidance. The goal is to reduce duplicated effort and keep the work organized.',path:'join'},
  {q:'How does the RCRE AI assistant work?',a:'The AI assistant draws on published public pages and brokerage-approved material. It does not access private client records or make final decisions. It drafts, explains, and summarizes — not executes.',path:'join'},
  {q:'What markets does RCRE serve?',a:'RCRE operates in Alabama and Florida, with active agents and offices supporting both states.',path:'join'},
  {q:'How is RCRE different from other brokerages?',a:'RCRE prioritizes coaching, accountability, and training alongside technology and market presence. Leadership focuses on agent development and growth rather than volume alone.',path:'join'},
  {q:'What kind of training does RCRE offer?',a:'Agents have access to the AI Advantage Realtor curriculum and brokerage-created material. Progress and assignments are tracked within the platform.',path:'join'},
  {q:'What does the RCRE platform include?',a:'A connected workspace covering contacts, appointments, property search, transaction milestones, AI-assisted guidance, and compliance records. It is designed to support the full real estate lifecycle.',path:'join'},
  {q:'Should I talk to a lender before touring homes?',a:'A financing conversation helps connect your search price with a comfortable payment and expected cash to close. You can begin with questions before submitting a full application. <a href="/financing">Talk with Jeremy McDonald</a>.',path:'financing',safe:true},
  {q:'Does preapproval guarantee I can close?',a:'No. Final approval depends on underwriting, the property, required documents, and program guidelines. Ask what has been reviewed and which conditions remain.',path:'financing',safe:true},
  {q:'Do I need a 20% down payment?',a:'Not every program requires 20% down. The available options and associated mortgage insurance, fees, and eligibility requirements depend on the borrower and property. Compare the complete costs.',path:'financing',safe:true},
  {q:'How do I compare two mortgage offers?',a:'Ask for comparable written Loan Estimates and review the same loan amount, term, lock assumptions, rate, annual percentage rate, fees, and cash to close. A lower rate can come with different upfront costs.',path:'financing',safe:true},
  {q:'Can I use another lender?',a:'Absolutely. You are free to choose any lender. Using Jeremy McDonald or Loan Factory is not required to work with RCRE or purchase a property.',path:'financing',safe:true},
  {q:'Can you confirm a program in my state?',a:'Ask Jeremy to confirm current licensing, program availability, and lender requirements for your property location. This page does not make a state-specific lending promise.',path:'financing',safe:true},
]
const sections=[
  {title:'Before you buy',paths:['buying','first-time-buyers']},
  {title:'When you\'re ready to sell',paths:['selling']},
  {title:'Financing questions',paths:['financing']},
  {title:'Joining RCRE',paths:['join']},
]
export default function Faq(){
  const jsonLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.filter(f=>!f.safe).map(({q,a})=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
  return <PublicShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,'\\u003c')}}/>
    <div className="public-wrap"><Breadcrumbs items={[{label:'Explore',href:'/'},{label:'FAQ'}]}/></div>
    <section className="public-hero public-wrap">
      <p className="public-kicker">Common questions</p>
      <h1>Find your answers here.</h1>
      <p className="public-lead">Questions about buying, selling, financing, and building your real estate career with RCRE. Select a topic or browse below.</p>
    </section>
    {sections.map(({title,paths})=>{
      const items=faq.filter(f=>paths.includes(f.path));
      if(!items.length)return null;
      return (
        <section key={title} className="public-wrap public-content">
          <h2>{title}</h2>
          <div className="public-faq">
            <div/>
            <div>{items.map(({q,a})=>(
              <details key={q}>
                <summary>{q}</summary>
                <p dangerouslySetInnerHTML={{__html:a}}/>
              </details>
            ))}</div>
          </div>
        </section>
      );
    })}
    <section className="public-wrap public-content">
      <h2>Still have questions?</h2>
      <p>The FAQ covers common starting points. If your situation is specific or you need a direct answer, <Link href="/contact">reach the team</Link> or <Link href="/team">connect with an agent</Link> directly.</p>
    </section>
  </PublicShell>
}
