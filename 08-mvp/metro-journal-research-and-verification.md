# Metro journals — implementation and source register

Local date: September 8, 2026. All implementation is original. No production actions or listing-photo redistribution.

## Delivered

- `/blog` adds a regional journal index, text search, region/topic filters, results count, and resettable empty state.
- Hubs: `/blog/metros/birmingham`, `/blog/metros/jacksonville`, `/blog/metros/south-florida`.
- Six original guides are registered in `src/lib/public/metro-journal.ts`; each has four substantive sections, related region/agent links, a local inquiry, source notes, descriptive metadata, canonical URL, Article/BreadcrumbList structured data. Hubs have WebPage/BreadcrumbList schema.
- Hubs and articles honor durable published CMS snapshots, archive, redirects, indexing, metadata, image alternatives, and body overrides. Existing legacy articles remain accessible. New paths join generated sitemap and studio route selector.
- Licensed city photos and linked attribution use the shared `MetroPhotoCredit`. Jacksonville image is historical 2014 (former Landing remains visible); South Florida image is Miami/Biscayne Bay2011, not Fort Lauderdale. Birmingham image2026. These are editorial geography images, not listing photographs.

## Geographic conclusions

The current RCRE `/neighborhoods` directory lists Jefferson, Blount, St Clair, Shelby, Duval, Clay, St Johns, Nassau, Miami Dade, and Broward. These support three editorial regions. They are not definitions of Census metro boundaries.

Birmingham: Alabama roster and office support Julio, Taquilla, Lekeshia, Urban as conversation links. Regiena is omitted from metro assignment pending Alabama-directory versus Jacksonville-profile conflict.

Jacksonville/Northeast Florida: Alex biography mentions Jacksonville; Delonda biography North Florida; Margie biography NEFlorida; Molly biography Jacksonville; Vito biography PonteVedra. Johann and Sarah profiles explicitly show Jacksonville addresses. Each remains a link to the factual source-derived profile, not a claim of current availability or every-county specialization.

South Florida: current Miami-Dade/Broward county pages support regional reading. No specific South Florida-based agent is established by the public biographies reviewed. Brokerage matching CTA replaces invented assignments. Miami/CoconutCreek/PembrokePark/FortLauderdale past transactions show historical activity only. PalmBeach and PortStLucie past transactions do not establish a current separate metro agent footprint, so no unsupported hub/agent claim is made.

## Research access

Reopened current `https://rcregroup.com/team`, `/neighborhoods`, all13 `/agent/{slug}` paths, all10 `/neighborhoods/{slug}` paths through web retrieval. Agent pages Alex, Johann, Julio, Margie, Molly, Regiena, Sarah, Taquilla, Urban, Vito returned content. Delonda/Lekeshia/Rodrigo returned cache errors; existing full archived source profiles supplied bios and the current team page confirmed roster inclusion. County pages Shelby, Duval, Clay, Nassau, Miami-Dade, Broward returned content. Jefferson/Blount/StClair/StJohns retrieval failed; current neighborhood directory establishes their link presence. Failed fetches were recorded, not bypassed. Shared sitewide past-transaction carousels were not treated as individual agent sales.

Original editorial articles use practical decision frameworks, not copied vendor copy, demographic steering, rankings, current market-price claims, legal guarantees, or fabricated local experiences. Source links on each hub/article identify the brokerage evidence behind geographic coverage. No agent is asserted as article author. Public article author is RCRE editorial desk unless a published approved CMS attribution overrides it.

## Verification

`tests/metro-journal.test.ts`:4 passing checks: unique registered9routes, all6articles over200words/foursections, agent/county referential integrity, no SouthFlorida historical-sale-to-agent inference.

HTTP evidence: `.runtime/public-source/metro-verification.json`; checks canonicalSSR, correct article/hub schemas, source/image content, all9sitemap entries, index controls/links, and private metro draft preview preserving public content. One explicitly private synthetic Birmingham hub draft is retained as CMS test evidence; it does not replace visible default content.

Typecheck passed during implementation. Parent performs final integrated browser/build checks. No claim of interactive browser verification is substituted for HTTP checks here.
