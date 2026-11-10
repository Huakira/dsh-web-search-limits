# dsh-web-search-limits

DeepSeek Harness (DSH) 插件：按 agent 覆盖 `web_search` 工具，把上限提到默认 100 条结果、6 个查询，并支持在 Plugins 页里调整。

A DeepSeek Harness plugin that shadows `web_search` per agent to raise its caps (defaults: 100 sources, 6 queries per call), adjustable from the Plugins page.

## 为什么需要它 / Why

DSH 的搜索上限是预设里嵌套的配置，补丁机制只能整段覆盖预设，很不方便。本插件在 agent 创建时用同名工具覆盖 `web_search`，不依赖任何预设副本。

## 安装 / Install

```bash
dsh plugin add /path/to/dsh-web-search-limits   # 本地目录
# 或在 Plugins 页 → Add plugin → 填本目录或 Git 地址
```

## 配置 / Configuration

**Plugins 页 → 联网搜索上限 → Configure**，修改后点保存：

| 字段 | 默认 | 说明 |
|---|---|---|
| `maxResults` | `100` | 每次搜索合并后的最大结果数 |
| `maxQueries` | `6` | 每次搜索的最大查询数 |
| `summaryMaxChars` | `800` | 每条摘要保留的最大字符数 |

结果数和摘要长度在下一次搜索即生效；查询数上限写进工具说明，只对之后新建的会话生效。

## License

MIT
