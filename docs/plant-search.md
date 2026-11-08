# Live plant search

Text search now uses `GET /public/plants/search?q=…&lang=…`. It is available to guests and authenticated profiles. Provider credentials remain on the backend. The existing authenticated search-history endpoint continues to save signed-in queries under their verified profile; public search never writes account or guest history.

## Providers and fallback

1. Pl@ntNet `/v2/species`, with a bounded, paginated name-prefix query. A response must match the scientific name/genus or an exact common name. This prevents a query such as “rose” returning an unrelated genus that happens to begin with those letters.
2. Tavily botanical web search, including source-associated representative images.
3. OpenAI hosted web search, using actual source citations rather than generated URLs.

Empty results, malformed responses, quota errors, network errors and timeouts advance to the next provider. A completed search with no sources can return an honest empty result. If any provider failed and no fallback supplied results, the API returns a retryable error rather than claiming no plant exists. Each provider has a bounded timeout; the client cancels old queries and exposes manual retry without automatic paid retries.

Pl@ntNet reference images require a Pro subscription. If image access is denied, text search retries without that option. Tavily can enrich a Pl@ntNet result only when its source names the same scientific species. Failed image enrichment never discards valid botanical results. Web photos retain their originating source link; the app does not claim an unknown creator or license. Before display, public reference images pass a visual plant-photo and relevance check using the existing OpenAI vision integration. Logos, icons, placeholders, illustrations, buildings, cars, unrelated plants and uncertain images are rejected. Failures remove images while preserving text results. Approved and rejected image checks are cached for up to 24 hours in a bounded process cache. The UI also refuses images without the verified-plant marker; curated reference photos no longer fall back to a static illustration. Broken photos disappear while the result and source remain available.

Public successful queries are coalesced and cached in process for five minutes, with at most 200 entries, to reduce repeated provider requests. This is shared public response caching, not personal search history. Responses are `no-store` and the endpoint has a per-IP rate limit. Query contents and credentials are omitted from provider failure logs.

## Experience and adversarial review

- The five curated profiles remain useful immediate/offline matches. They no longer define the search universe or appear as the search scope.
- Live cards show a representative photo when available, a readable excerpt and an explicit external source link. Curated matches still open their in-app profiles. External results do not fabricate an in-app profile, care facts, or pollinator claims.
- One guest “Sign in” control remains visible. No competing scan/sign-in action is added to loading, error or empty states. Existing login return handling and profile ownership remain intact.
- A stale request cannot replace a newer query; clearing the field removes results. Outages offer retry, while true empty responses suggest another spelling or a scientific name.
- The vivid background and glass surfaces apply to both guest and authenticated search screens. Images have text alternatives; source links and image credits have accessible labels.

Automated coverage includes provider errors/empty/malformed responses, misleading scientific prefixes, image-plan restrictions, image/source association, query caching, guest privacy, private endpoint protection, retry recovery, stale responses, broken images, and one sign-in control. Live smoke checks used lavender, basil, tomato, rose and Ocimum basilicum. The browser-tab automation host was unavailable, so native Safari was used to verify visible lavender photos, source links, exactly one Sign in control, Google/email authentication controls, and cancellation back to the same search. Real credential submission was not exercised.

## Production verification

Deployed READY revision `dpl_D3gjApRqCsJeR2aaPbzYoBk6cG1r` to [Plantopedia](https://plantopedia-nine.vercel.app/search?q=lavender). All 26 routes and 184 exported files passed candidate verification; public HTML and bundles match the tested export. Live public searches for lavender, marigold, rose, basil and tomato each returned results with verified plant photos. Private garden, history and image endpoints reject unsigned requests. The final runtime query returned zero error/fatal entries and no excluded intervals.

Validation: 175 component, 237 backend, 97 unit and 72 script tests (581 total), type checking, lint and the client-secret guard. See [release evidence](evidence/plant-search/release-verification.json).
