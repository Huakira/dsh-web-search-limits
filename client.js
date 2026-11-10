window.__ModuleLoader__.load({
  id: '@local/dsh-web-search-limits',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const KEY = '@local/dsh-web-search-limits#web-search-limits';
    const zh = (navigator.language || '').toLowerCase().startsWith('zh');
    const T = zh ? {
      summary: '调整 web_search 的结果数、查询数和摘要长度上限。',
      loading: '加载中…', unavailable: '该插件当前未加载，无法配置。', readOnly: '当前配置为只读。',
      hint: '修改后点保存，对之后新建的会话生效（查询数上限写进工具说明，旧会话不变）。',
      save: '保存', discard: '放弃修改', saving: '保存中…', failed: '保存失败，已恢复为服务器上的值。', invalid: '请输入不小于下限的整数。',
      fields: { maxResults: ['每次搜索的最大结果数', 1], maxQueries: ['每次搜索的最大查询数', 1], summaryMaxChars: ['每条摘要的最大字符数', 50] },
    } : {
      summary: 'Adjust the result, query and summary-length caps of web_search.',
      loading: 'Loading…', unavailable: 'This plugin is not loaded, so it cannot be configured right now.', readOnly: 'The configuration is read-only.',
      hint: 'Save to apply to sessions created afterwards (the query cap is written into the tool description, so existing sessions keep theirs).',
      save: 'Save', discard: 'Discard', saving: 'Saving…', failed: 'Saving failed; showing the values stored on the host.', invalid: 'Enter a whole number at or above the minimum.',
      fields: { maxResults: ['Maximum results per search', 1], maxQueries: ['Maximum queries per search', 1], summaryMaxChars: ['Maximum characters per summary', 50] },
    };
    const st = {
      root: { display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0', color: 'var(--dsw-alias-label-primary)', fontSize: 13 },
      muted: { opacity: 0.6, fontSize: 12 },
      row: { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
      input: { font: 'inherit', width: 110, padding: '4px 8px', border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: 6, background: 'transparent', color: 'inherit', fontVariantNumeric: 'tabular-nums' },
      btn: { font: 'inherit', padding: '4px 12px', border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: 6, background: 'transparent', color: 'inherit', cursor: 'pointer' },
    };
    const FIELDS = ['maxResults', 'maxQueries', 'summaryMaxChars'];

    function Page({ form }) {
      const state = form && form.state;
      const [draft, setDraft] = React.useState({});
      const [saving, setSaving] = React.useState(false);
      const [error, setError] = React.useState(false);
      if (!state || state.status === 'loading') return h('div', { style: st.muted }, T.loading);
      if (state.status === 'unavailable' || !state.value) return h('div', { style: st.muted }, T.unavailable);
      const writable = state.writable !== false;
      const text = f => draft[f] !== undefined ? draft[f] : String(state.value[f] ?? '');
      const parsed = f => { const n = Number(text(f)); return Number.isInteger(n) && n >= T.fields[f][1] ? n : undefined; };
      const dirty = FIELDS.some(f => draft[f] !== undefined && parsed(f) !== state.value[f]);
      const invalid = FIELDS.some(f => draft[f] !== undefined && parsed(f) === undefined);
      const save = async () => {
        if (!dirty || invalid || saving) return;
        setSaving(true); setError(false);
        const ops = FIELDS.filter(f => draft[f] !== undefined && parsed(f) !== state.value[f]).map(f => ({ op: 'set', path: [f], value: parsed(f) }));
        try {
          const ok = await form.mutate(ops, state.revision);
          if (ok) setDraft({}); else setError(true);
        } catch { setError(true); }
        setSaving(false);
      };
      return h('div', { style: st.root },
        h('div', { style: st.muted }, T.hint),
        !writable ? h('div', { style: st.muted, role: 'status' }, T.readOnly) : null,
        FIELDS.map(f => h('label', { key: f, style: st.row },
          h('span', null, T.fields[f][0]),
          h('input', { type: 'number', min: T.fields[f][1], step: 1, style: st.input, value: text(f), disabled: !writable || saving,
            onChange: e => setDraft({ ...draft, [f]: e.target.value }) }))),
        invalid ? h('div', { style: { color: 'var(--dsw-alias-label-error, #d1242f)' }, role: 'alert' }, T.invalid) : null,
        error ? h('div', { style: { color: 'var(--dsw-alias-label-error, #d1242f)' }, role: 'alert' }, T.failed) : null,
        h('div', { style: { display: 'flex', gap: 8 } },
          h('button', { type: 'button', style: st.btn, disabled: !writable || !dirty || invalid || saving, onClick: save }, saving ? T.saving : T.save),
          h('button', { type: 'button', style: st.btn, disabled: !dirty || saving, onClick: () => { setDraft({}); setError(false); } }, T.discard)));
    }

    function ConfigEntry(props) { return props.view === 'summary' ? T.summary : h(Page, { form: props.form }); }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('plugins.row.config', () => ctx.slots.register({ name: 'plugins.row.config', key: KEY }, ConfigEntry));
      },
    };
  },
});
