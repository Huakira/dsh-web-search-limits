import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Resolve schemastery from the profile: this bundle is linked from outside it.
const profileDir = process.env.DSH_PROFILE_DIR ?? join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'profiles', process.env.DSH_PROFILE ?? 'default')
const Schema = (await import(pathToFileURL(createRequire(join(profileDir, 'package.json')).resolve('@deepseek-ai/schemastery')).href)).default

export const name = 'web-search-limits'

export const Config = Schema.object({
  maxResults: Schema.number().step(1).min(1).default(100).volatile().description('Maximum merged sources per web_search call.'),
  maxQueries: Schema.number().step(1).min(1).default(6).volatile().description('Maximum queries per web_search call.'),
  summaryMaxChars: Schema.number().step(1).min(50).default(800).volatile().description('Maximum characters kept from each source summary.'),
})
export const inject = ['tools', 'web']

function merge(queries, results, max) {
  const seen = new Set(), sources = []
  let ranks = 0, dropped = false
  for (const r of results) ranks = Math.max(ranks, r.sources.length)
  outer: for (let k = 0; k < ranks; k++) for (const r of results) {
    const s = r.sources[k]
    if (s && !seen.has(s.url)) {
      seen.add(s.url)
      if (sources.length === max) { dropped = true; break outer }
      sources.push(s)
    }
  }
  const contents = results.flatMap((r, i) => r.content ? [`### ${queries[i]}\n\n${r.content}`] : [])
  return { ...(contents.length ? { content: contents.join('\n\n') } : {}), sources, truncated: results.some(r => r.truncated) || dropped }
}

function bound(source, cap) {
  const out = { url: source.url }
  for (const k of ['title', 'snippet', 'publishedAt']) if (source[k] !== undefined) out[k] = source[k]
  const s = source.summary?.replace(/\s+/gu, ' ').trim() ?? ''
  if (s) out.summary = s.length <= cap ? s : s.slice(0, cap - 1) + '…'
  return out
}

export function apply(ctx, config) {
  const num = (field, fallback) => { const v = config?.[field]?.get?.(); return Number.isFinite(v) && v > 0 ? v : fallback }
  const cfg = {
    get maxResults() { return num('maxResults', 100) },
    get maxQueries() { return num('maxQueries', 6) },
    get summaryMaxChars() { return num('summaryMaxChars', 800) },
  }
  const installed = new WeakMap()
  ctx.on('agent/created', function ({ agent }) {
    const actx = agent.ctx
    if (!actx?.tools) return
    const orig = actx.tools.get('web_search', agent)
    if (!orig) { ctx.logger?.('web-search-limits')?.warn?.('web_search not visible; skipped'); return }
    const parameters = structuredClone(orig.parameters)
    const q = parameters.queries ?? parameters.properties?.queries
    if (q) q.description = `1–${cfg.maxQueries} search queries; their results are merged.`
    const def = {
      ...orig,
      parameters,
      async execute(args, exec) {
        const qs = args.queries
        if (qs.length === 0) throw new Error('queries must contain at least one query')
        if (qs.length > cfg.maxQueries) throw new Error(`queries must contain at most ${cfg.maxQueries} ${cfg.maxQueries === 1 ? 'query' : 'queries'}`)
        if (qs.some(x => x.trim().length === 0)) throw new Error('each query must be a non-empty string')
        const uniq = [...new Set(qs)]
        let result
        if (uniq.length === 1) result = await ctx.web.search({ query: uniq[0], maxResults: cfg.maxResults }, exec.signal)
        else {
          const ctl = new AbortController()
          const sig = AbortSignal.any([exec.signal, ctl.signal])
          let fail
          const res = []
          await Promise.allSettled(uniq.map(async (query, i) => {
            try { res[i] = await ctx.web.search({ query, maxResults: cfg.maxResults }, sig) }
            catch (error) { fail ??= { error }; ctl.abort(error); throw error }
          }))
          if (fail) throw fail.error
          result = merge(uniq, res, cfg.maxResults)
        }
        return {
          ...(result.content !== undefined ? { content: result.content } : {}),
          sources: result.sources.map(s => bound(s, cfg.summaryMaxChars)),
          truncated: result.truncated
        }
      }
    }
    const dispose = actx.tools.register(def, { when: ({ modelSelection }) => ctx.web.searchReady(modelSelection.provider) })
    installed.set(agent, dispose)
  })
  return () => { /* registrations are agent-scoped effects */ }
}
