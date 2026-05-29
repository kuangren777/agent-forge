aMeL-Business

# 自配置企业操作中间件 — 完整技术设计文档

> **Capabilities for Machine Learning, in Business**
>
> 一个通过自主探索"学会"企业系统、并以能力安全模型保护每一次操作的 AI 中间件
>
> 版本 v2.0 · 2026年5月

---

## 文档导航

1. [设计动机与定位](#一设计动机与定位)
2. [核心范式：探索—构建—服务](#二核心范式探索构建服务)
3. [安全模型：从 CaMeL 论文到企业落地](#三安全模型从-camel-论文到企业落地)
4. [系统架构总览](#四系统架构总览)
5. [内核组件一：Explorer Engine](#五内核组件一explorer-engine)
6. [内核组件二：Operation Registry](#六内核组件二operation-registry)
7. [内核组件三：API Synthesizer（能力合成器）](#七内核组件三api-synthesizer)
8. [内核组件四：P-LLM 规划器](#八内核组件四p-llm-规划器)
9. [内核组件五：CaMeL-Business 解释器](#九内核组件五camel-business-解释器)
10. [内核组件六：Policy Engine](#十内核组件六policy-engine)
11. [内核组件七：Execution Engine](#十一内核组件七execution-engine)
12. [内核组件八：Audit Pipeline](#十二内核组件八audit-pipeline)
13. [会话上下文与多轮对话](#十三会话上下文与多轮对话)
14. [权限与角色模型](#十四权限与角色模型)
15. [Web 可视化界面](#十五web-可视化界面)
16. [插件化与可扩展性](#十六插件化与可扩展性)
17. [技术选型](#十七技术选型)
18. [开发路线图](#十八开发路线图)
19. [安全性分析](#十九安全性分析)
20. [待讨论与开放问题](#二十待讨论与开放问题)

---

## 一、设计动机与定位

### 1.1 问题

企业每引入一个新系统，就要为它培训人、写文档、配权限。这些系统的能力（增删改查、业务联动）散落在代码、数据库、API 和管理后台中，只有少数熟悉系统的人能高效操作。新员工要花数周理解系统，客户要翻文档找答案，管理者要等各部门汇总数据。

现有的企业 AI 助手没有解决这个问题。它们做的是文档检索——把文档喂给 RAG，用户提问，AI 返回一段文字。这只解决了"查"，没有解决"做"。用户仍然要自己去系统里点按钮、填表单、走流程。

更深层的问题是安全。少数尝试让 AI "做事"的方案，把权限控制放在应用层：一个 AI 引擎连接所有数据和接口，运行时查一下权限表，决定让不让做。这种设计在 AI 被 prompt injection 攻击时完全失效——攻击者可以诱导 AI 执行任意操作，因为 AI 本身就持有所有接口的调用能力。

### 1.2 定位

CaMeL-Business 是一个**自配置的企业操作中间件**。它不是聊天机器人，而是企业所有系统之上的一层智能操作层。

```
目标系统（企业已有的）        CaMeL-Business（本产品）           使用者
┌──────────────┐           ┌──────────────────────┐         ┌────────┐
│ 源代码       │           │                      │  自然语言│        │
│ 数据库       │──自主探索→ │  Operation Registry  │ ←────── │ 客户   │
│ API 文档     │           │  (所有可执行操作)      │  执行结果│ 员工   │
│ 管理后台网页 │           │                      │ ──────→ │ 管理员 │
│ 内部文档     │           │  CaMeL 安全执行内核    │         │        │
└──────────────┘           └──────────────────────┘         └────────┘
       ↑                            ↑
   被管理的系统              本产品（内核 + 可视化界面）
   (产品不拥有)
```

产品由两部分组成：**一个内核**（探索、构建、安全执行）和**一个 Web 可视化界面**（配置、对话、操作管理、审计）。部署到新环境时，内核读取该环境的文档、代码、数据库、API，自动构建出一整套可执行操作。之后，企业的客户、员工、管理员通过自然语言操作和查询这个系统。

### 1.3 与现有方案的本质区别

| 维度 | 传统 AI 助手 | CaMeL-Business |
|---|---|---|
| 能力 | 检索文档，返回文字 | 理解系统，执行操作 |
| 配置 | 人工整理知识库 | 自主探索自动构建 |
| 安全模型 | 应用层权限检查 | 能力安全 + 数据流控制 |
| 抗注入 | 弱（AI 持有所有权限） | 强（规划与数据处理分离） |
| 联动 | 不支持或预定义 | P-LLM 运行时编排 |
| 审计 | 操作日志 | 完整数据流图 |

---

## 二、核心范式：探索—构建—服务

CaMeL-Business 的工作分三个阶段，借鉴 Claude Code 的"先理解项目，再执行任务"范式。

### 2.1 探索阶段（Explore）

管理员在 Web 控制台挂载企业数据源：代码仓库、数据库连接、API 文档、管理后台地址、内部文档。点击"开始探索"后，Explorer Engine 自主工作：

- 读取代码仓库的目录结构和关键文件，理解系统架构
- 逐模块阅读源代码，提取业务实体、API 路由、业务规则
- 连接数据库，读取表结构和关系
- 解析 API 文档，理解每个接口的语义和权限级别
- 爬取管理后台页面，理解功能布局

整个过程在 Web 界面实时可视化。

### 2.2 构建阶段（Build）

Explorer 把探索到的理解转化为 **Operation Registry**——一个存储所有可执行操作的注册表。每个 Operation 是一条结构化定义，包含：语义描述、参数定义、前置条件、数据来源、权限标签、执行方式。

读操作（query）自动激活。写操作（mutation）生成后处于待审核状态，管理员在 Web 上确认后才能被调用。

### 2.3 服务阶段（Serve）

用户用自然语言提出需求。系统的处理流程：

1. **P-LLM** 接收用户请求，查询 Operation Registry，生成一段 Python 执行计划
2. **CaMeL-Business 解释器** 逐步执行这段计划，维护数据流图和能力标签
3. 每次工具调用前，**Policy Engine** 检查数据能否流向该操作
4. 写操作触发用户确认，在 Web 上展示执行计划，用户确认后执行
5. **Execution Engine** 在沙箱中执行操作，调用目标系统的 API、SQL 或网页操作
6. 全程事件写入 **Audit Pipeline**

---

## 三、安全模型：从 CaMeL 论文到企业落地

CaMeL-Business 的安全模型直接采用 Google DeepMind 的 CaMeL 论文（Debenedetti et al., "Defeating Prompt Injections by Design", 2025）提出的能力安全架构，并将其从"个人 Agent 助手"场景扩展到"企业多角色操作中间件"场景。

### 3.1 论文的核心思想

CaMeL 论文解决的问题是：LLM Agent 处理不可信数据（邮件、文档、网页）时，会被其中隐藏的恶意指令劫持。论文的解法建立在三个机制上。

**Dual LLM 模式。** 系统使用两个 LLM。Privileged LLM（P-LLM）只看用户的可信请求，生成执行计划，永远不接触不可信数据。Quarantined LLM（Q-LLM）负责解析不可信数据，但没有任何工具调用权限。恶意数据因此无法影响执行计划——它最多只能影响 Q-LLM 的解析结果，而 Q-LLM 无法执行任何操作。

**能力标签（Capabilities）。** 系统给每一个值打上元数据标签，记录它的来源（sources）和允许的读者（readers）。数据库返回的订单数据标记为"来自 database.orders，可被 employee 和 admin 读取"；用户直接输入的值标记为"来自 user，可信，公开可读"。

**安全策略（Security Policies）。** 每次工具调用前，系统检查相关数据的能力标签是否满足策略。策略关心的不是"这个人有没有权限"，而是"这个数据能不能流向这个工具"。例如发送邮件时，邮件内容的 readers 必须包含收件人；否则拒绝。

论文用一个自定义 Python 解释器把这三个机制串起来：P-LLM 生成 Python 代码，解释器逐步执行，维护数据流图，在每次工具调用前检查策略。论文在 AgentDojo 基准上以可证明的安全性解决了 77% 的任务。

### 3.2 为什么这个模型适合企业操作中间件

CaMeL 论文的场景是个人助手（一个用户、一个邮箱、一个日历）。CaMeL-Business 的场景是企业中间件（多角色、多系统、海量数据）。能力安全模型在企业场景下的价值反而更大：

**抗注入对企业是刚需。** 企业系统连接真实的数据库和业务接口，一次成功的 prompt injection 可能导致数据泄露或错误的业务操作。Dual LLM 模式从架构上隔离了规划和数据处理，恶意数据无法影响执行计划。

**能力标签天然映射企业权限。** 企业数据本身就有权限属性（HR 数据只有管理员能看，公开文档所有人能看）。Explorer 探索时把这些权限抽取为能力标签，Policy Engine 在每次操作时检查，效果等价于物理隔离，但灵活得多。

**数据流图就是审计记录。** 企业对审计有强需求（等保、SOC 2、合规）。CaMeL 解释器维护的数据流图完整记录了每一步操作用了什么数据、数据从哪来、流向哪里，是天然的、防篡改的审计数据结构。

### 3.3 四个关键扩展

CaMeL-Business 在论文基础上做四个扩展，以适应企业场景。

**扩展一：操作不预定义，而是自动探索生成。** 论文假设工具集是预先给定的（发邮件、查日历）。CaMeL-Business 的 Explorer Engine 自主探索企业系统，自动发现操作。当目标系统缺少某个操作的 API 时，API Synthesizer 进一步合成带业务校验的新操作。这是产品化的核心——客户不需要手写工具定义。

**扩展二：能力标签编码多角色，而非单用户。** 论文的 readers 是邮箱地址。CaMeL-Business 的 readers 是角色（customer、employee、admin）和细粒度约束（"只能读自己的数据"）。同一个 Operation 在不同角色下受不同策略约束。

**扩展三：用户确认分级，而非二元。** 论文中策略 deny 时请求用户确认。CaMeL-Business 把确认级别做成三级：auto（直接执行）、confirm（用户确认）、dual_approval（双人确认），按操作的风险等级配置。

**扩展四：写操作可逆，通过补偿操作而非状态回滚。** 论文不处理操作回滚。CaMeL-Business 为每个写操作声明补偿操作（compensating operation）：可回滚的操作记录 before 状态直接还原，不可逆的操作（如已发送的通知）通过执行反向操作补偿（如撤回通知）。

---

## 四、系统架构总览

### 4.1 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web UI (React)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ 探索配置  │ │ 对话界面  │ │ 操作管理  │ │ 审计查看  │ │数据流  │ │
│  │          │ │          │ │          │ │          │ │可视化  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   FastAPI Gateway                                │
│        认证 + 身份(identity) + 会话上下文 + WebSocket 流式         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    CaMeL-Business 内核                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  ④ P-LLM 规划器（Privileged，只看用户请求 + 会话引用）    │     │
│  │     用户自然语言 + Registry Schema → Python 执行计划      │     │
│  └──────────────────────────┬─────────────────────────────┘     │
│                             │ 执行计划（Python 代码）            │
│  ┌──────────────────────────▼─────────────────────────────┐     │
│  │  ⑤ CaMeL-Business 解释器（核心执行引擎）                 │     │
│  │     逐步执行计划 · 维护数据流图 · 传播能力标签            │     │
│  │     ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │     │
│  │     │ Q-LLM   │  │ ⑥Policy │  │ ⑦Exec   │  │ 确认流   │  │     │
│  │     │ 数据解析 │  │ Engine  │  │ Engine  │  │ 暂停/恢复│  │     │
│  │     │ (无工具) │  │ 策略判定 │  │ 沙箱执行 │  │          │  │     │
│  │     └─────────┘  └─────────┘  └─────────┘  └─────────┘  │     │
│  └──────────────────────────┬─────────────────────────────┘     │
│                             │                                    │
│  ┌──────────────────────────▼─────────────────────────────┐     │
│  │  ② Operation Registry（操作注册表）                      │     │
│  │     Explorer 发现 + API Synthesizer 合成 + 管理员审核     │     │
│  └──────────────────────────────────────────────────────────┘     │
│              ▲                          ▲                        │
│  ┌───────────┴──────────┐  ┌────────────┴──────────────────┐     │
│  │ ① Explorer Engine     │  │ ③ API Synthesizer（能力合成器）│     │
│  │ 代码·DB·API·后台·文档  │  │ API 缺失时合成带业务校验的     │     │
│  │ → 发现已有操作         │  │ 新 API → 自动测试 → 待审核     │     │
│  └───────────────────────┘  └───────────────────────────────┘     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  ⑧ Audit Pipeline（审计管道）                             │    │
│  │     接收所有层事件 · 数据流图 · 链式 hash · 可查询可回滚   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Connector（HTTP/SQL/GraphQL/RPA）
                           │ + 内部生成的 API 层（直连目标 DB）
┌──────────────────────────▼───────────────────────────────────────┐
│              目标系统（被管理的企业系统，产品不拥有）              │
│      [PostgreSQL] [MySQL] [REST API] [管理后台] [内部文档]        │
└───────────────────────────────────────────────────────────────────┘
```

### 4.2 内核八大组件职责

| 编号 | 组件 | 输入 | 输出 | 职责 |
|---|---|---|---|---|
| ① | Explorer Engine | 数据源 | 操作草稿 | 自主探索系统，发现已有操作，提取业务规则 |
| ② | Operation Registry | Explorer + Synthesizer 输出 + 审核 | 操作集 | 存储所有可执行操作的 Schema |
| ③ | API Synthesizer | 业务规则 + DB schema | 生成的 API + 测试 | API 缺失时合成带校验的新操作 |
| ④ | P-LLM 规划器 | 用户请求 + Registry + 会话引用 | Python 执行计划 | 把意图翻译为执行计划 |
| ⑤ | CaMeL 解释器 | 执行计划 | 执行结果 + 数据流图 | 逐步执行，传播能力，调度其他组件 |
| ⑥ | Policy Engine | (identity, operation, capabilities) | allow/deny + 确认级别 | 判定数据能否流向操作 |
| ⑦ | Execution Engine | 操作 + 参数 | 执行结果 + before/after | 沙箱中执行实际操作 |
| ⑧ | Audit Pipeline | 所有层事件 | 审计链 | 记录、验证、回滚 |

---

## 五、内核组件一：Explorer Engine

### 5.1 职责

Explorer Engine 自主探索企业系统，把散落在代码、数据库、API、后台、文档中的能力，转化为结构化的 Operation Registry。它借鉴 Claude Code 的工作范式：先建立全局认知，再按需深入，最后产出结构化理解。

### 5.2 五个探索器

Explorer Engine 由五个探索器组成，每个针对一类数据源。所有探索器实现统一的 `Explorer` 接口，因此可以独立替换或新增。

```
Explorer Engine
├── CodeExplorer      — 探索源代码仓库
├── DatabaseExplorer  — 探索数据库 schema
├── APIExplorer       — 探索 API 接口（OpenAPI/GraphQL/代码路由）
├── AdminPanelExplorer — 探索管理后台网页
└── DocExplorer       — 探索文档（Confluence/飞书/本地）
```

#### 5.2.1 CodeExplorer

CodeExplorer 分四个阶段工作，模拟资深工程师阅读新项目的过程。

**阶段一（全局认知）：** 克隆仓库，读取目录树（深度 3），识别并阅读入口文件（README、package.json、pyproject.toml、docker-compose.yml、main.py 等），让 LLM 建立初始心智模型——项目类型、语言、框架、模块划分、入口点。

**阶段二（深度探索）：** LLM 根据初始模型规划探索路径，按模块优先级逐文件阅读。每个文件提取：业务实体（class/model 定义）、API 路由（endpoint 定义）、服务依赖（import/调用关系）、业务规则（条件判断、校验逻辑）、错误处理（异常类型、错误码）。

**阶段三（操作生成）：** 把提取的知识转化为 Operation 草稿。一个 `orders` 表加上对应的 CRUD 代码，生成 `order.create`、`order.query`、`order.update`、`order.cancel` 等 Operation。

**阶段四（能力标注）：** 为每个 Operation 标注权限级别和数据来源标签。带 `/admin/` 前缀的接口标为 admin，需要用户认证的接口标为 employee 或 customer。

```python
class CodeExplorer(Explorer):
    async def explore(self, repo: GitRepo, ws: WebSocket) -> list[OperationDraft]:
        # 阶段一: 全局认知
        tree = await self.read_tree(repo, depth=3)
        entry_files = await self.find_entry_files(tree)
        contents = {f: await self.read(repo, f) for f in entry_files}
        mental_model = await self.llm.analyze(
            system=INITIAL_UNDERSTANDING_PROMPT,
            user=f"目录树:\n{tree}\n\n入口文件:\n{format(contents)}"
        )
        await ws.send_json({"phase": 1, "model": mental_model})

        # 阶段二: 深度探索
        plan = await self.llm.plan_exploration(mental_model)
        knowledge = []
        for module, priority in plan:
            for filepath in await self.list_files(repo, module):
                code = await self.read(repo, filepath)
                await ws.send_json({"phase": 2, "reading": filepath})
                nodes = await self.llm.extract_knowledge(
                    system=CODE_EXTRACTION_PROMPT,
                    user=f"文件: {filepath}\n{code}\n\n已有模型:\n{mental_model}"
                )
                knowledge.extend(nodes)

        # 阶段三: 操作生成
        operations = await self.llm.generate_operations(knowledge)

        # 阶段四: 能力标注
        for op in operations:
            op.permission = await self.classify_permission(op)
            op.source_tag = self.derive_source_tag(op)
            await ws.send_json({"phase": 4, "operation": op.name,
                               "permission": op.permission})
        return operations
```

#### 5.2.2 DatabaseExplorer

DatabaseExplorer 用只读账户连接数据库，读取所有表/视图的 schema（列名、类型、外键、索引、注释），抽样查询每张表的前几行（脱敏）以理解实际数据含义，让 LLM 分析每张表的业务含义和表间关系，构建 ER 图。

外键关系直接转化为 Operation 之间的数据关联：`order_items.order_id → orders.id` 意味着查询订单项时可以关联查询订单。

读操作（SELECT）自动生成为参数化查询模板，默认激活。写操作不直接生成裸 SQL，而是优先匹配已有 API；只有当 API 缺失时，才把这个"缺口"交给 API Synthesizer（组件三）合成一个带业务校验的内部 API，而不是退化为无校验的 SQL 写入。这个决策来自一个安全考量：裸 SQL 写入跳过了目标系统在业务层的校验逻辑（如"用户被封禁时不能下单"），而 API Synthesizer 会把从代码中提取的业务规则编进生成的操作。

#### 5.2.3 APIExplorer

APIExplorer 从三种来源发现 API。OpenAPI/Swagger spec 直接解析出路由、参数、响应格式。GraphQL schema 通过 introspection 提取类型、查询、变更。无文档的 API 通过分析代码中的路由定义（FastAPI routers、Django urls.py、Express routes）提取。

每个发现的 endpoint 由 LLM 生成自然语言描述，并按认证级别和路由前缀分类权限。

#### 5.2.4 AdminPanelExplorer

AdminPanelExplorer 用 Playwright 无头浏览器登录管理后台，爬取页面 DOM 结构，提取导航菜单、表单字段、表格列，对每个页面截图。LLM 分析每个页面的功能含义，判断它是面向客户、员工还是管理员的。

后台页面的操作（提交表单、点击按钮）在没有对应 API、且 API Synthesizer 也无法合成（例如操作只存在于第三方后台、无法直连数据库）时，可以生成为 RPA 执行计划——通过 Playwright 模拟操作。这是执行优先级中的最后手段。

#### 5.2.5 DocExplorer

DocExplorer 对接文档源（Confluence、飞书文档、本地上传），分块、嵌入、索引。文档不生成 Operation，而是作为 P-LLM 和 Q-LLM 的知识背景——帮助理解业务术语、流程规范、字段含义。

#### 5.2.6 业务规则提取（供 API Synthesizer 使用）

CodeExplorer 在阅读代码时，除了发现已有 API，还额外提取**业务规则**——写操作执行前后的校验和约束。这些规则是 API Synthesizer 合成新 API 的依据。

```python
# CodeExplorer 从一段订单创建代码中提取的业务规则
business_rules = [
    BusinessRule(
        entity="order",
        operation="create",
        rule_type="precondition",
        description="用户被封禁时不能下单",
        source_location="src/services/order.py:34",
        code_snippet="if user.is_banned: raise ForbiddenError(...)",
    ),
    BusinessRule(
        entity="order",
        operation="create",
        rule_type="side_effect",
        description="创建订单后扣减库存",
        source_location="src/services/order.py:52",
        code_snippet="inventory.deduct(item.product_id, item.quantity)",
    ),
    BusinessRule(
        entity="order",
        operation="create",
        rule_type="validation",
        description="订单金额必须等于订单项金额之和",
        source_location="src/services/order.py:41",
    ),
]
```

这些规则连同数据库 schema 一起，作为 API Synthesizer 的输入。

### 5.3 增量更新

Explorer 不是一次性的。代码提交、数据库迁移、API 文档更新、后台配置变更、文档更新，都会触发增量探索。

| 触发器 | 更新范围 | 机制 |
|---|---|---|
| Git Webhook | 变更文件的增量重探索 | 对比 diff，仅重新分析变更文件 |
| 数据库 migration | 重新映射 schema | 检测 migration 文件 / schema version 变更 |
| API spec 更新 | 重新解析 | OpenAPI spec hash 变更触发 |
| 后台配置变更 | 重爬变更页面 | 定时全量 + 页面 hash 对比 |
| 文档更新 | 增量索引 | Webhook / 定时拉取 + 文档 hash 对比 |
| 管理员手动 | 全量或选择性 | Web 控制台触发 |

---

## 六、内核组件二：Operation Registry

### 6.1 职责

Operation Registry 存储所有可执行操作的结构化定义。它是 Explorer 的输出，也是 P-LLM 的输入——P-LLM 看到 Registry 中的操作签名，才能生成调用它们的执行计划。

### 6.2 Operation 数据结构

每个 Operation 是一条声明式定义。关键设计：Operation 声明"做什么"和"约束是什么"，但不绑定"怎么执行"。执行方式由 `executors` 字段按优先级列出，运行时由 Execution Engine 选择。

```python
@dataclass
class Operation:
    # ── 标识与语义 ──
    name: str                      # "order.cancel"
    semantic: str                  # "取消一个订单" (给 P-LLM 理解用)
    description: str               # LLM 生成的详细说明

    # ── 类型与参数 ──
    op_type: OpType                # query | mutation
    params: dict                   # JSON Schema 形式的参数定义
    returns: dict                  # 返回值 schema

    # ── 业务约束 ──
    pre_conditions: list[str]      # ["order.status == 'active'"]
    side_effects: list[str]        # 声明会影响哪些数据（给审计用）
    business_rules: list[str]      # 从代码提取的业务规则（合成 API 时编入）

    # ── 能力与权限 ──
    source_tag: str                # 操作结果的来源标签 "database.orders"
    permission: str                # 默认权限级别（可被 Policy 覆盖）
    confirm_level: ConfirmLevel    # auto | confirm | dual_approval

    # ── 可逆性（用于回滚）──
    reversibility: Reversibility   # reversible | compensable | irreversible
    compensating_op: str = None    # 补偿操作名（如 "notification.recall"）
    # reversible:   记录 before 状态，回滚时直接还原
    # compensable:  不可还原状态，但可执行反向操作补偿（如撤回通知）
    # irreversible: 无法回滚也无法补偿（如已扣款且已发货），执行前强制 dual_approval

    # ── 执行方式（按优先级 fallback）──
    executors: list[Executor]
    # [
    #   APIExecutor(method="POST", url="/api/orders/{order_id}/cancel"),
    #   SynthesizedAPIExecutor(module="synthesized.orders", func="cancel_order"),
    #   RPAExecutor(page="/admin/orders/{order_id}", actions=[...]),
    # ]

    # ── 来源（用于审计与审核）──
    origin: OpOrigin               # discovered | synthesized
    # discovered: Explorer 从已有 API/代码发现
    # synthesized: API Synthesizer 合成（写操作，必须过测试 + 审核）

    # ── 状态 ──
    status: OpStatus               # active | pending_review | disabled
    # query 类型默认 active；mutation 类型默认 pending_review
    # synthesized 的操作无论读写，都默认 pending_review
```

### 6.3 激活策略

按之前确认的决策：

- **discovered 的 query 操作**：Explorer 发现后默认 `active`，立即可被 P-LLM 调用
- **discovered 的 mutation 操作**：Explorer 发现后默认 `pending_review`，管理员审核确认后变为 `active`
- **synthesized 的操作（无论读写）**：API Synthesizer 合成后默认 `pending_review`，必须通过自动测试 + 管理员审核才变为 `active`。合成的写操作风险最高，审核最严格

管理员在"操作管理"页面看到所有 Operation，可以审核、调整参数定义、修改权限级别、调整确认级别、查看合成操作的源代码和测试结果、禁用某个操作。

### 6.4 P-LLM 可见性

P-LLM 只能看到 `active` 状态的 Operation，且只能看到当前用户角色有权访问的操作。Registry 向 P-LLM 暴露的是 Python 函数签名形式：

```python
# Registry 向 P-LLM 暴露的接口（employee 角色视角）
def order_query(user_id: str = None, status: str = None,
                date_range: str = None) -> list[Order]:
    """查询订单。可按用户、状态、时间范围过滤。"""

def order_cancel(order_id: str, reason: str = None) -> CancelResult:
    """取消一个订单。要求订单状态为 active。会触发库存恢复和退款。"""

def customer_query(name: str = None, email: str = None) -> Customer:
    """查询客户信息。"""

# ... 该角色可见的所有 active Operation
```

---

## 七、内核组件三：API Synthesizer

### 7.1 职责

API Synthesizer 在目标系统缺少某个操作的 API 时，合成一个新的操作。合成的 API 运行在 CaMeL-Business 进程内，内部直连目标数据库，并包含从代码中提取的业务校验逻辑。所有合成的操作必须通过自动测试和管理员审核才能上线。

这是 CaMeL-Business 从"调用已有能力"到"合成新能力"的关键升级。它解决的问题是：很多企业系统的 API 覆盖不全，关键操作只能通过管理后台手工完成。与其退化为不稳定的 RPA 或无校验的裸 SQL，不如合成一个带业务校验的内部 API。

### 7.2 合成的边界

明确三条边界，避免 API Synthesizer 越界：

**运行位置：** 合成的 API 运行在 CaMeL-Business 进程内，不写入、不部署到目标系统的代码库。CaMeL-Business 内部维护一个"合成 API 层"，这些 API 通过只配置了必要权限的数据库账户直连目标数据库。

**业务校验来源：** 合成的 API 不是简单的 SQL 包装。它把 CodeExplorer 提取的业务规则（前置条件、校验、副作用）编进代码。如果代码里写明"下单前检查用户是否被封禁"，合成的 `create_order` 也包含这条检查。这是合成 API 区别于裸 SQL 的核心价值。

**上线门槛：** 合成的操作无论读写，默认 `pending_review`。必须通过自动测试（见 7.4）和管理员审核才能激活。合成的写操作是整个系统中审核最严格的对象。

### 7.3 合成流程

```
触发: DatabaseExplorer 发现某写操作无对应 API
  │
  ▼
1. 收集合成输入:
   - 数据库 schema（目标表的结构、外键、约束）
   - CodeExplorer 提取的业务规则（该实体的校验、副作用）
   - 相关的已有 API（参考其参数风格和返回格式）
  │
  ▼
2. LLM 生成 API 代码:
   - 输入: schema + 业务规则 + 风格参考
   - 输出: 一个 Python 函数（FastAPI 风格），包含:
     a. 参数校验
     b. 业务规则检查（前置条件）
     c. 数据库操作（参数化，事务包裹）
     d. 副作用处理（如扣库存）
     e. 补偿操作定义（用于回滚）
  │
  ▼
3. 静态检查:
   - AST 分析：禁止危险调用（eval/exec/文件/网络）
   - SQL 注入检查：所有 SQL 必须参数化
   - 事务完整性：多表写入必须在事务内
  │
  ▼
4. 自动测试（见 7.4）:
   - 在隔离的测试数据库副本上运行生成的测试用例
   - 验证：正常路径、边界条件、业务规则触发、回滚
  │
  ▼
5. 进入 pending_review:
   - 管理员在 Web 上看到：生成的代码、业务规则来源、测试结果
   - 审核通过 → 激活，注册为 SynthesizedAPIExecutor
   - 审核拒绝 → 丢弃或要求重新生成
```

### 7.4 生成后自动测试

合成的操作（以及 Explorer 发现的操作）在上线前必须通过自动测试。这是按之前确认的决策引入的机制。测试针对不同操作类型采用不同策略。

**读操作的测试：** 自动执行验证。在测试数据库副本上运行查询，验证返回结构符合声明的 schema、参数过滤生效、不报错。读操作测试通过后可自动激活（discovered 的读操作甚至跳过此步直接激活，synthesized 的读操作需通过）。

**写操作的测试：** 生成测试用例供审核。Synthesizer 为每个写操作生成一组测试用例，覆盖：

```python
# 为合成的 create_order 生成的测试用例（在测试库副本上运行）
test_cases = [
    # 正常路径
    TestCase(
        name="正常创建订单",
        setup="插入一个正常用户和有库存的商品",
        input={"user_id": "u1", "items": [{"product_id": "p1", "qty": 2}]},
        expect="订单创建成功，库存减2",
    ),
    # 业务规则触发
    TestCase(
        name="封禁用户不能下单",
        setup="插入一个 is_banned=true 的用户",
        input={"user_id": "u_banned", "items": [...]},
        expect="抛出 ForbiddenError，无订单创建，库存不变",
    ),
    # 边界条件
    TestCase(
        name="库存不足",
        setup="商品库存为1",
        input={"user_id": "u1", "items": [{"product_id": "p1", "qty": 5}]},
        expect="抛出 InsufficientStockError，事务回滚",
    ),
    # 补偿操作
    TestCase(
        name="取消已创建的订单可恢复库存",
        setup="创建订单后调用补偿操作",
        input={"compensate": True},
        expect="订单状态变为 cancelled，库存恢复",
    ),
]
```

测试在隔离的测试数据库副本上运行，绝不碰生产数据。测试结果连同生成的代码一起呈现给管理员审核。

### 7.5 合成代码示例

```python
# API Synthesizer 为缺失的"创建订单"操作合成的代码
# 业务规则来源: src/services/order.py:34, :41, :52

async def synthesized_create_order(
    db: Connection,
    user_id: str,
    items: list[OrderItem],
) -> Order:
    """合成操作: 创建订单。
    业务规则:
    - [src:34] 封禁用户不能下单
    - [src:41] 订单金额 = 订单项之和
    - [src:52] 创建后扣减库存
    """
    async with db.transaction():  # 事务包裹（静态检查要求）
        # 业务规则 [src:34]: 检查用户状态
        user = await db.fetchrow(
            "SELECT id, is_banned FROM users WHERE id = $1", user_id
        )
        if user is None:
            raise NotFoundError("用户不存在")
        if user["is_banned"]:
            raise ForbiddenError("封禁用户不能下单")

        # 业务规则 [src:41]: 计算并校验金额
        total = sum(item.price * item.qty for item in items)

        # 创建订单（参数化 SQL）
        order_id = await db.fetchval(
            "INSERT INTO orders (user_id, status, total) "
            "VALUES ($1, 'active', $2) RETURNING id",
            user_id, total,
        )
        for item in items:
            await db.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, price) "
                "VALUES ($1, $2, $3, $4)",
                order_id, item.product_id, item.qty, item.price,
            )
            # 业务规则 [src:52]: 扣减库存
            updated = await db.execute(
                "UPDATE inventory SET stock = stock - $1 "
                "WHERE product_id = $2 AND stock >= $1",
                item.qty, item.product_id,
            )
            if updated == "UPDATE 0":
                raise InsufficientStockError(item.product_id)  # 触发事务回滚

        return await db.fetchrow("SELECT * FROM orders WHERE id = $1", order_id)

# 补偿操作（reversibility = compensable）
async def synthesized_create_order_compensate(db, order_id):
    """补偿: 取消订单并恢复库存"""
    async with db.transaction():
        items = await db.fetch(
            "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
            order_id,
        )
        for item in items:
            await db.execute(
                "UPDATE inventory SET stock = stock + $1 WHERE product_id = $2",
                item["quantity"], item["product_id"],
            )
        await db.execute(
            "UPDATE orders SET status = 'cancelled' WHERE id = $1", order_id
        )
```

---

## 八、内核组件四：P-LLM 规划器

### 8.1 职责

P-LLM（Privileged LLM）接收用户的自然语言请求，生成一段 Python 执行计划。它是 CaMeL 安全模型的第一道防线：**P-LLM 只看用户请求和 Operation 签名，永远不接触任何工具返回的数据内容。**

### 8.2 为什么 P-LLM 不能看数据

如果 P-LLM 能看到工具返回的数据，那么数据中隐藏的恶意指令就能影响 P-LLM 的后续规划，这正是 prompt injection 的攻击路径。CaMeL 通过让 P-LLM 只看代码、不看数据内容来切断这条路径。

P-LLM 生成代码后，工具返回值存储在变量中，P-LLM 只能看到自己生成的代码，看不到变量的实际内容。需要解析数据内容时，P-LLM 在代码中调用 Q-LLM。

### 8.3 生成的执行计划形态

按之前确认的决策，P-LLM 生成**受限的 Python 代码**。一个完整的例子：

```python
# 用户: "帮我查客户张伟上个月退货的订单，把还在 pending 的退款加急处理"

# P-LLM 生成的执行计划:
customer = customer_query(name="张伟")
orders = order_query(user_id=customer.id, date_range="last_month")

# 调用 Q-LLM 解析订单数据，找出退货订单
refund_orders = query_quarantined_llm(
    f"从以下订单中找出状态为退货的订单",
    data=orders,
    output_schema=list[Order]
)

# 对每个 pending 的退款执行加急
for order in refund_orders:
    if order.refund_status == "pending":
        expedite_refund(order_id=order.id)
        notify_customer(
            user_id=customer.id,
            message=f"您的订单 {order.id} 退款已加急"
        )
    else:
        print(f"订单 {order.id} 退款状态为 {order.refund_status}")
```

代码中的 `customer`、`orders`、`refund_orders` 等变量的实际内容 P-LLM 看不到。P-LLM 只是写出了"如何处理"的逻辑。实际数据在解释器执行时才填入。

### 8.4 受限 Python 子集

P-LLM 生成的代码运行在一个受限的 Python 子集中，由解释器约束（详见组件五）。允许：变量赋值、函数调用（仅 Registry 中的 Operation 和 Q-LLM）、if/else、for 循环、基本运算、print。禁止：import、定义新函数/类、eval/exec、文件操作、网络操作、访问 Python 内置危险函数。

### 8.5 错误处理

参考 CaMeL 论文的做法：解释器执行计划时若抛出异常，将异常类型和位置反馈给 P-LLM，请它重新生成代码，最多重试 10 次。异常内容若依赖不可信数据，先脱敏再反馈（防止异常信息成为注入通道）。

### 8.6 多轮对话中的会话引用

P-LLM 除了看到当前用户请求和 Operation 签名，还能看到本次会话的"引用清单"——之前轮次产生过哪些实体（见第十三章）。当用户说"把刚才那个订单取消了"时，P-LLM 从引用清单知道"刚才那个订单"指向哪个实体，但**不直接使用旧数据**，而是生成重新查询的代码。详见第十三章。

---

## 九、内核组件五：CaMeL-Business 解释器

### 9.1 职责

解释器是内核的中枢。它逐步执行 P-LLM 生成的 Python 计划，同时维护数据流图、传播能力标签、调度 Q-LLM 解析数据、调用 Policy Engine 检查策略、触发用户确认、调用 Execution Engine 执行操作、向 Audit Pipeline 输出事件。

### 9.2 执行流程

```
接收 P-LLM 生成的 Python 代码
  │
  ▼
用 Python ast 库解析为抽象语法树
  │
  ▼
递归解释每个 AST 节点:
  │
  ├─ 变量赋值 (a = b + c)
  │    → 计算值
  │    → 新值的能力 = 依赖值的能力的并集
  │    → 在数据流图中记录依赖边
  │
  ├─ Operation 调用 (order_cancel(order_id=x))
  │    → 收集参数的能力标签
  │    → 调用 Policy Engine 检查（数据能否流向此操作？）
  │    │    ├─ deny → 抛出 PolicyViolation
  │    │    └─ allow → 继续
  │    → 检查 confirm_level
  │    │    ├─ auto → 直接执行
  │    │    ├─ confirm → 暂停，推送执行计划到 Web，等用户确认
  │    │    └─ dual_approval → 暂停，等第二管理员确认
  │    → 调用 Execution Engine 执行
  │    → 返回值打上能力标签（source = operation.source_tag）
  │    → 记录到数据流图
  │    → 输出 OPERATION_EXECUTED 事件到审计
  │
  ├─ Q-LLM 调用 (query_quarantined_llm(...))
  │    → 把 data 传给 Q-LLM 解析
  │    → Q-LLM 无工具权限，只返回结构化结果
  │    → 返回值的能力 = 输入 data 的能力（继承，不放宽）
  │    → 记录到数据流图
  │
  ├─ 控制流 (if / for)
  │    → STRICT 模式: 条件依赖的能力传播给块内所有赋值变量
  │      (防止通过条件分支泄露信息)
  │
  └─ print(...)
       → 输出展示给用户
       → 内容的能力标签用于审计（标记信息来源）
```

### 9.3 数据流图

解释器执行时维护一个有向图，节点是变量和操作调用，边是数据依赖。这个图有两个用途：

**用途一：策略检查。** 检查某个操作的输入能否流向它时，解释器递归遍历输入变量的所有依赖，收集完整的能力标签集合。

**用途二：审计。** 数据流图完整记录了"每一步用了什么数据、数据从哪来、流向哪里"，是天然的审计数据结构。执行完毕后，整个图写入 Audit Pipeline，并可在 Web 上可视化。

```
用户: "查张伟退货订单并加急退款"

数据流图:
  user_input("张伟")
       │ [source: user, readers: *]
       ▼
  customer_query ──→ customer
       │            [source: database.customers, readers: employee/admin]
       ▼
  order_query ──→ orders
       │          [source: database.orders, readers: employee/admin]
       ▼
  Q-LLM ──→ refund_orders
       │    [继承 orders 的能力: source: database.orders]
       ▼
  expedite_refund(order_id=refund_orders[i].id)
       │ Policy 检查: order_id 来源 = database.orders ✅
       │ confirm_level = confirm → 用户确认
       ▼
  执行 ──→ result [source: api.refund_service]
```

### 9.4 能力标签的传播规则

| 操作 | 能力传播规则 |
|---|---|
| 字面量（用户代码中的常量） | source = user, readers = *, trusted = true |
| 变量赋值 a = b | a 继承 b 的能力 |
| 运算 a = b + c | a 的能力 = b 和 c 能力的并集（readers 取交集，sources 取并集） |
| Operation 返回值 | source = operation.source_tag, readers 按数据源权限 |
| Q-LLM 返回值 | 继承输入数据的能力（不放宽，防止洗白） |
| 控制流块内变量（STRICT） | 额外继承条件表达式的能力 |

readers 取交集是关键：如果一个值依赖了两个数据源，一个 readers 是 [employee, admin]，另一个是 [admin]，那么合成值的 readers 是 [admin]——只有能读所有来源的角色才能读合成结果。

---

## 十、内核组件六：Policy Engine

### 10.1 职责

Policy Engine 在每次 Operation 执行前判定：当前 identity、这个 operation、这些参数的能力标签，是否满足安全策略。它返回 allow/deny 和确认级别。

### 10.2 策略的两个层次

**数据流策略（来自 CaMeL 模型）：** 检查数据能否流向操作。例如发送通知时，内容的 readers 必须包含接收者。

**角色权限策略（企业扩展）：** 检查当前角色能否执行该操作，以及附加什么约束（如"只能操作自己的数据"）。

### 10.3 策略定义形式

按之前确认的决策，策略用 Python 函数表达（参考 CaMeL 论文的选择，Python 比 DSL 更灵活，可表达任意逻辑）。

```python
# ── 数据流策略示例 ──
def notify_customer_policy(identity, operation, kwargs, dataflow):
    """发送通知：内容来源必须可被接收者读取"""
    content = kwargs["message"]
    recipient_id = kwargs["user_id"]

    # 内容的 readers 必须包含接收者
    if not can_read(recipient_id, content.capability.readers):
        return Denied("通知内容的来源不允许该接收者读取")
    return Allowed()


def expedite_refund_policy(identity, operation, kwargs, dataflow):
    """加急退款：写操作，订单ID来源必须可信"""
    order_id = kwargs["order_id"]

    # order_id 必须来自可信查询，不能来自 Q-LLM 输出或未知来源
    trusted_sources = {"database.orders", "user"}
    if not order_id.capability.sources.issubset(trusted_sources):
        return Denied("订单ID来源不可信，可能来自注入数据")

    return Allowed()  # 通过，但 Operation 的 confirm_level=confirm 仍要求用户确认


# ── 角色权限策略示例 ──
def order_query_policy(identity, operation, kwargs, dataflow):
    """查询订单：不同角色不同约束"""
    if identity.role == "customer":
        # 客户只能查自己的订单——强制注入约束
        kwargs["user_id"] = identity.user_id  # 覆盖任何传入值
        return Allowed(modified_kwargs=kwargs)
    elif identity.role in ("employee", "admin"):
        return Allowed()
    else:
        return Denied(f"角色 {identity.role} 无权查询订单")
```

### 10.4 关键安全机制：参数约束注入

`order_query_policy` 展示了一个关键机制：对于 customer 角色，Policy Engine **强制覆盖** `user_id` 参数为当前登录用户。这意味着即使 P-LLM 被诱导生成了查询别人订单的代码，Policy Engine 也会在执行前把 `user_id` 改回当前用户。

这个约束在执行层强制，不依赖 P-LLM 的正确性。这是抗注入的最后一道保险。

### 10.5 策略的可插拔性

Policy Engine 实现统一接口，支持多种后端：

- **内置 Python 策略**：默认，策略写成 Python 函数
- **OPA（Open Policy Agent）**：对接企业已有的 OPA 策略
- **Casbin**：对接 Casbin 权限模型

管理员在 Web "操作管理"页面看到每个 Operation 关联的策略，以及每条策略过去的触发统计（allow/deny 分布）。

---

## 十一、内核组件七：Execution Engine

### 11.1 职责

Execution Engine 接收解释器传来的操作和参数，选择执行后端，在沙箱中执行，返回结果和 before/after 状态。

### 11.2 执行后端选择

每个 Operation 的 `executors` 字段按优先级列出执行方式。Execution Engine 依次尝试，直到成功：

```
优先级 1: APIExecutor          — 调用目标系统已有 API（最安全，复用系统校验）
优先级 2: SynthesizedAPIExecutor — 调用 API Synthesizer 合成的内部 API（含业务校验）
优先级 3: RPAExecutor          — Playwright 模拟网页操作（最后手段）
```

设计原则：优先走目标系统已有的 API，因为 API 背后有系统自己的业务校验和权限控制。其次是 API Synthesizer 合成的内部 API，它也包含业务校验。RPA 是最后手段，仅用于无法直连数据库的第三方后台操作。

### 11.3 Connector 插件

每种执行后端是一个 Connector 插件，实现统一的 `Executor` 接口：

```python
class Executor(ABC):
    @abstractmethod
    async def execute(self, operation: Operation, params: dict) -> ExecutionResult:
        """执行操作，返回结果 + before/after 状态"""

    @abstractmethod
    async def compensate(self, operation: Operation, execution_id: str) -> bool:
        """补偿一次执行（回滚状态 或 执行反向操作）"""

    @abstractmethod
    async def capture_state(self, operation: Operation, params: dict) -> dict:
        """执行前捕获 before 状态（用于 diff 和回滚）"""


class APIExecutor(Executor):
    async def execute(self, operation, params):
        # 可逆/可补偿的写操作先捕获 before 状态
        before = None
        if operation.op_type == OpType.MUTATION and \
           operation.reversibility != Reversibility.IRREVERSIBLE:
            before = await self.capture_state(operation, params)

        url = operation.api_spec.url.format(**params)
        async with self.sandbox(operation.resource_limits):
            resp = await self.http.request(
                operation.api_spec.method, url,
                json=params, timeout=operation.timeout
            )

        after = None
        if operation.op_type == OpType.MUTATION:
            after = await self.capture_state(operation, params)

        return ExecutionResult(data=resp, before=before, after=after)
```

### 11.4 沙箱

每次执行在隔离环境中进行：网络只能访问该 Operation 声明的 endpoint；文件系统是临时 tmpfs，执行后销毁；有硬性超时和资源限制。即使某个 Operation 被攻陷，爆炸半径被限制在该次执行内。

### 11.5 写操作的可逆性与补偿

按之前确认的决策，写操作的回滚分三种情况处理，由 Operation 的 `reversibility` 字段决定。

**reversible（可逆）：** 操作只改变数据库状态，可以直接还原。执行前捕获 before 状态，回滚时用 before 状态覆盖。例如修改订单备注。

**compensable（可补偿）：** 操作产生了无法直接还原的效果，但可以执行一个反向操作来补偿。例如已发送的通知无法"收回状态"，但可以发送一条撤回通知；已创建的订单可以通过取消订单并恢复库存来补偿。每个这类 Operation 声明它的 `compensating_op`。

**irreversible（不可逆）：** 操作的效果既无法还原也无法补偿。例如已经完成扣款且已发货的交易。这类操作执行前强制 `dual_approval`（双人确认），因为一旦执行就无法撤销。

```python
# 补偿操作的执行逻辑
class ExecutionEngine:
    async def compensate(self, execution_id: str) -> CompensationResult:
        record = await self.audit.get_execution(execution_id)
        op = self.registry.get(record.operation_name)

        if op.reversibility == Reversibility.REVERSIBLE:
            # 用 before 状态直接还原
            executor = self.select_executor(op)
            await executor.restore_state(record.before_state)
            return CompensationResult(method="state_restore", success=True)

        elif op.reversibility == Reversibility.COMPENSABLE:
            # 执行声明的补偿操作（如撤回通知）
            comp_op = self.registry.get(op.compensating_op)
            await self.execute(comp_op, {"target": record.params})
            return CompensationResult(method="compensating_op", success=True)

        else:  # IRREVERSIBLE
            return CompensationResult(
                method="none", success=False,
                reason="该操作不可逆，无法补偿。这正是它执行前要求双人确认的原因。"
            )
```

例如已发送的通知，补偿方式是执行 `notification.recall` 撤回这条通知，而不是试图回滚通知系统的状态。

---

## 十二、内核组件八：Audit Pipeline

### 12.1 职责

Audit Pipeline 接收内核所有层输出的事件，组装为防篡改的审计链，支持查询、完整性验证、操作回滚。

### 12.2 审计事件类型

| 事件 | 触发点 | 记录内容 |
|---|---|---|
| `REQUEST_RECEIVED` | Gateway | who, when, role, message |
| `PLAN_GENERATED` | P-LLM | 生成的执行计划代码 |
| `POLICY_EVALUATED` | Policy Engine | operation, role, 能力标签, allow/deny, 应用的策略, 约束 |
| `ACCESS_DENIED` | Policy Engine | operation, role, 拒绝原因 |
| `CONFIRMATION_REQUESTED` | 解释器 | 执行计划, 确认级别 |
| `USER_CONFIRMED` / `USER_CANCELLED` | Web | plan_id, 用户动作 |
| `OPERATION_EXECUTED` | Execution Engine | operation, executor, params, before, after, 耗时, 成功/失败 |
| `QLLM_INVOKED` | 解释器 | 输入数据来源, 输出 schema（不记录内容明文） |
| `DATAFLOW_SNAPSHOT` | 解释器 | 完整数据流图 |
| `RESPONSE_SENT` | Gateway | 响应摘要, token 用量, 总耗时 |

### 12.3 链式完整性

每条审计记录包含前一条记录的 hash，形成链。任何篡改都会破坏 hash 链。

```python
@dataclass
class AuditRecord:
    event_id: str
    timestamp: datetime
    trace_id: str          # 同一次用户交互的所有事件共享
    session_id: str
    actor: dict            # {user_id, role, ip}
    event_type: str
    payload: dict
    prev_hash: str         # 前一条记录的 hash
    hash: str              # sha256(prev_hash + serialize(self))


class AuditPipeline:
    async def emit(self, event: AuditEvent):
        prev = await self.get_latest_hash()
        record = AuditRecord(
            event_id=uuid4(), timestamp=utcnow(),
            trace_id=event.trace_id, session_id=event.session_id,
            actor=event.actor, event_type=event.type,
            payload=event.payload, prev_hash=prev,
            hash=sha256(prev + serialize(event)),
        )
        await self.sink.write(record)          # 主存储（append-only）
        await self.archive_sink.write(record)  # S3 Object Lock 归档

    async def verify_integrity(self, start, end) -> bool:
        records = await self.sink.query_range(start, end)
        for i in range(1, len(records)):
            expected = sha256(records[i-1].hash + serialize(records[i]))
            if records[i].hash != expected:
                raise TamperDetected(records[i].event_id)
        return True
```

### 12.4 可插拔的审计后端

Audit Pipeline 的存储后端实现统一接口（`AuditSink`），支持 PostgreSQL（主存储）、S3 Object Lock（不可变归档）、Elasticsearch（全文搜索）、企业 SIEM（对接已有安全运营）。

### 12.5 操作回滚与补偿

每个 mutation 的 before/after 状态记录在审计中。管理员在 Web 审计查看器中可以对任何一次写操作发起撤销，Execution Engine 按操作的 `reversibility` 选择方式：可逆操作用 before 状态还原，可补偿操作执行补偿操作（如撤回通知），不可逆操作无法撤销（这类操作执行前已要求双人确认）。详见 11.5。

---

## 十三、会话上下文与多轮对话

### 13.1 问题

用户在多轮对话中引用之前的结果："把刚才那个订单也取消了"、"第二个客户的邮箱发一份"。系统需要记得"刚才那个订单""第二个客户"指向什么。这要求跨轮持久化会话上下文。

按之前确认的决策：会话上下文只做"参考"，使用时必须重新查最新数据。

### 13.2 会话上下文存储

每个用户会话维护一个上下文，存储这一轮产生的实体引用。关键设计：**只持久化引用（实体类型 + 标识 + 能力标签），不持久化数据快照。**

```python
@dataclass
class SessionContext:
    session_id: str
    user_identity: Identity
    # 引用清单：之前轮次产生过哪些实体
    references: list[EntityReference]
    last_active: datetime


@dataclass
class EntityReference:
    """一个实体引用——记住'存在过什么'，不记住'内容是什么'"""
    entity_type: str       # "order"
    entity_id: str         # "3847"（标识符，不是完整数据）
    capability: Capability # 当时的能力标签（角色权限依据）
    referenced_in_turn: int
    description: str        # "张伟的第一个退货订单"（供 P-LLM 理解指代）
```

### 13.3 为什么只存引用不存数据

只存引用、用时重查，是一个安全和正确性的决策：

**正确性：** 第一轮查到订单时它是 active，第二轮要取消时它可能已经被别人取消了。如果用第一轮的旧数据做写操作，会基于过期状态执行，导致错误。重新查最新数据保证操作基于当前真实状态。

**安全性：** 数据快照长期留存增加泄露面。只存标识符和能力标签，把数据留在源系统，需要时重查。

### 13.4 多轮引用的执行流程

```
第一轮: "查张伟上个月的退货订单"
  → 执行查询，返回订单 [#3847, #3901]
  → 会话上下文记录两个引用:
    EntityReference(type=order, id=3847, capability=[database.orders/emp+admin],
                    description="张伟的退货订单1")
    EntityReference(type=order, id=3901, ...)
  → 数据本身不持久化

第二轮: "把第二个取消了"
  → P-LLM 看到会话引用清单，知道"第二个"= order #3901
  → P-LLM 生成代码:
      # 重新查询最新状态，不使用上一轮的旧数据
      order = order_query(order_id="3901")
      if order.status == "active":
          order_cancel(order_id=order.id, reason="用户要求")
      else:
          print(f"订单 #3901 当前状态为 {order.status}，无法取消")
  → 解释器执行：先重查 #3901 的最新状态
  → 能力标签从会话引用恢复（角色权限检查照常）
  → order_cancel 是写操作 → confirm → 用户确认 → 执行
```

P-LLM 用会话引用解析"第二个"指向 #3901，但生成的代码先重新查询 #3901 的最新状态，再基于最新状态决定是否取消。

### 13.5 持久化时长

按之前确认的决策：

- 会话活跃期间，上下文保留在内存（或 Redis，按 session_id 隔离）
- 会话结束（用户主动关闭或超时 30 分钟无活动）后清除
- 不跨会话持久化——新会话从空上下文开始

### 13.6 能力标签的会话内持久化

引用的能力标签必须一起持久化。否则第二轮引用第一轮的实体时，Policy Engine 失去判定依据。能力标签随引用存入会话上下文，第二轮恢复时，角色权限检查、数据流策略照常进行，安全性不因跨轮而削弱。

---

## 十四、权限与角色模型

### 14.1 单内核 + Policy 驱动

CaMeL-Business 不为每个角色部署独立基础设施。它用单一内核，由 Policy Engine 根据 identity 决定每个角色能调用哪些操作、能看到什么数据、附加什么约束。

角色不硬编码。Policy 配置中可以随时增加新角色（auditor、partner、contractor 等），无需改代码或重新部署。

### 14.2 默认三角色

| 角色 | 可调用操作 | 数据约束 | 默认确认级别 |
|---|---|---|---|
| **customer** | 公开查询 + 自己数据的操作 | 强制注入 `user_id=self` | 写操作 confirm |
| **employee** | 内部查询 + 受限写操作 | 部门级约束（可选） | 写操作 confirm |
| **admin** | 全部操作 | 无约束 | 敏感操作 dual_approval |

### 14.3 能力标签实现隔离

角色隔离不靠物理隔离，靠能力标签 + Policy 检查实现。customer 角色调用任何操作时，Policy Engine 检查操作结果的能力标签——如果数据的 readers 不包含 customer，直接拒绝。

效果等价于物理隔离：customer 永远拿不到 readers 不含 customer 的数据。但实现上灵活得多——新增角色、调整权限都是配置变更。

### 14.4 物理隔离作为可选部署

对于有强隔离要求的客户（金融、政府），可以在部署层把某个角色的请求路由到独立的内核实例。这是部署配置，不是内核架构。内核本身角色无关。

---

## 十五、Web 可视化界面

### 15.1 探索配置页面

管理员挂载数据源、触发探索、查看探索状态。

```
┌─────────────────────────────────────────────────────────┐
│  数据源管理                                    [+ 添加]  │
├─────────────────────────────────────────────────────────┤
│  🔗 源代码    GitHub: company/backend    ✅ 已探索        │
│  🗄️ 数据库    PostgreSQL: prod-db        ✅ 已映射(34表)  │
│  📡 API       OpenAPI: /api/v1/docs      ✅ 已解析(47路由)│
│  🖥️ 后台      admin.company.com          ⏳ 爬取中(45%)  │
│  📄 文档      Confluence: Engineering    ✅ 已索引(128页) │
│                                                         │
│                           [▶ 开始探索]  [⟳ 增量更新]    │
└─────────────────────────────────────────────────────────┘
```

### 15.2 实时探索页面

探索过程实时可视化：进度、当前阅读的文件、提取的知识、生成的操作。

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Explorer — 实时探索                                       │
├──────────────────────────┬────────────────────────────────────┤
│  进度: ▓▓▓▓▓▓▓░░░ 73%    │  📄 正在读: src/services/order.py   │
│                          │                                    │
│  Phase 1 全局认知 ✅      │  🤖 提取到:                         │
│  Phase 2 深度探索 ⏳      │    • 实体: Order, OrderItem        │
│    src/api/      ✅       │    • 操作: create, cancel, query   │
│    src/models/   ✅       │    • 规则: 取消需检查退款条件        │
│    src/services/ ⏳      │    • 联动: cancel → 恢复库存+退款   │
│  Phase 3 操作生成 ◻       │                                    │
│  Phase 4 能力标注 ◻       │  生成操作: 23 个                    │
│                          │  待审核(写操作): 8 个                │
└──────────────────────────┴────────────────────────────────────┘
```

### 15.3 对话界面

用户与 AI 对话。写操作展示执行计划，等用户确认。

```
┌─────────────────────────────────────────────────────────┐
│  🧑 帮我查张伟退货订单，把 pending 的退款加急               │
│                                                         │
│  🤖 我将执行以下操作：                                   │
│     ┌─────────────────────────────────────────────┐     │
│     │ 📋 执行计划                                  │     │
│     │ 1. 查询客户「张伟」                          │     │
│     │ 2. 查询其上月订单                            │     │
│     │ 3. 筛选退货订单                              │     │
│     │ 4. 对 pending 退款执行加急 ⚠️ 写操作         │     │
│     │    ↳ 订单 #3901 退款 ¥299 → 加急            │     │
│     │ 5. 通知客户 ⚠️ 写操作                        │     │
│     └─────────────────────────────────────────────┘     │
│                                                         │
│     涉及 2 个写操作，需要您确认                          │
│     [✅ 确认执行] [✏️ 修改] [❌ 取消]                    │
└─────────────────────────────────────────────────────────┘
```

### 15.4 数据流可视化页面

每次交互的数据流图，节点表示变量/操作，边表示依赖，颜色表示能力。

```
┌─────────────────────────────────────────────────────────┐
│  📊 数据流图 — trace: abc123                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   🟢 user_input("张伟")                                  │
│        │                                                │
│        ▼                                                │
│   🔵 customer_query → customer [database.customers]      │
│        │                                                │
│        ▼                                                │
│   🔵 order_query → orders [database.orders]              │
│        │                                                │
│        ▼                                                │
│   🟡 Q-LLM → refund_orders [继承 orders]                 │
│        │                                                │
│        ▼                                                │
│   🟠 expedite_refund [需确认] → result                   │
│                                                         │
│  图例: 🟢可信  🔵内部数据  🟡解析结果  🟠写操作          │
└─────────────────────────────────────────────────────────┘
```

### 15.5 操作管理页面

管理员审核 Explorer 生成的操作，调整权限和策略。

```
┌─────────────────────────────────────────────────────────┐
│  ⚙️ 操作管理                       [全部] [待审核(8)]     │
├─────────────────────────────────────────────────────────┤
│  操作          │类型    │权限    │确认级别 │状态          │
│  ─────────────────────────────────────────────────────  │
│  order.query   │query   │emp+    │auto     │✅ active     │
│  order.cancel  │mutation│emp+    │confirm  │⏳ 待审核     │
│  hr.salary_set │mutation│admin   │dual     │⏳ 待审核     │
│  user.ban      │mutation│admin   │confirm  │⏳ 待审核     │
│                                                         │
│  选中: order.cancel                                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 语义: 取消一个订单                               │    │
│  │ 参数: order_id (string), reason (string, 可选)   │    │
│  │ 前置: order.status == 'active'                   │    │
│  │ 联动: 恢复库存, 发起退款                          │    │
│  │ 执行: API POST /orders/{id}/cancel               │    │
│  │ 关联策略: expedite_refund_policy                 │    │
│  │ [✅ 批准激活] [✏️ 调整] [🚫 禁用]                │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 15.6 审计查看器

完整审计链，可展开每个 trace，可验证完整性，可回滚操作。（界面结构见前述 trace 时间线，此处略。）

---

## 十六、插件化与可扩展性

### 16.1 设计原则

内核定义稳定的接口，所有具体实现可插拔。新增数据源、执行方式、策略后端、审计后端、LLM，都只需实现对应接口并注册，内核代码不改。

### 16.2 六个可扩展点

```
接口（稳定）              内置实现                    扩展方式
─────────────────       ──────────────────────      ──────────────
Explorer                CodeExplorer                实现 Explorer 接口
  .explore()            DatabaseExplorer            注册新数据源探索器
                        APIExplorer
                        AdminPanelExplorer
                        DocExplorer

APISynthesizer          DefaultSynthesizer          实现 Synthesizer 接口
  .synthesize()         (LLM 合成 + 自动测试)        定制合成/测试策略
  .test()

Executor                APIExecutor                 实现 Executor 接口
  .execute()            SynthesizedAPIExecutor      支持新执行方式
  .compensate()         RPAExecutor                 (gRPC/消息队列等)

PolicyEngine            PythonPolicyEngine          实现 PolicyEngine 接口
  .evaluate()           OPAPolicyEngine             对接企业权限系统
                        CasbinPolicyEngine

AuditSink               PostgresAuditSink           实现 AuditSink 接口
  .write()              S3AuditSink                 对接企业日志系统
  .query()              ElasticAuditSink
                        SIEMAuditSink

LLMAdapter              OpenAIAdapter               实现 LLMAdapter 接口
  .chat()               AnthropicAdapter            BYOK，接入任意模型
  .structured_output()  VLLMAdapter
                        DeepseekAdapter
```

### 16.3 灵活性的来源

产品的灵活性来自两个层面。

**P-LLM 生成代码的灵活性。** P-LLM 生成的是 Python 代码，能表达 if/else、循环、多步编排、条件联动。能力上限是 Python 能表达的一切，而不是预定义的工具调用序列。联动关系由 P-LLM 运行时编排，不需要 Explorer 预先定义。

**插件架构的灵活性。** 客户用什么数据库、什么权限系统、什么模型、什么日志系统，都通过对应的 Connector/Adapter 插件接入。内核保持稳定。

### 16.4 模型 BYOK

按之前确认的决策，产品支持 BYOK（Bring Your Own Key）。客户自己配置 P-LLM 和 Q-LLM 使用哪个模型、用自己的 API Key。P-LLM 需要强推理（默认推荐 Claude / GPT-4o / Qwen-72B），Q-LLM 任务简单可用轻量模型并本地部署。CaMeL-Business 与任何特定模型或中转服务无绑定关系。

---

## 十七、技术选型

| 层级 | 选型 | 理由 |
|---|---|---|
| 前端 | React + TypeScript + TailwindCSS + D3.js | 组件化；数据流图/知识图谱可视化 |
| 后端 | Python + FastAPI | 异步高性能；LLM 生态成熟；与解释器同语言 |
| 解释器 | 自研（基于 Python `ast`） | 受限 Python 子集，逐节点解释，能力传播 |
| API 合成 | LLM 生成 + AST 静态检查 + 测试库副本验证 | 合成带业务校验的内部 API |
| P-LLM | 可插拔 BYOK（默认 Claude / GPT-4o / Qwen-72B） | 规划需强推理能力 |
| Q-LLM | 可插拔 BYOK（默认轻量模型，可本地部署） | 解析任务简单，轻量模型即可，本地部署增强隐私 |
| 向量库（文档检索） | Milvus / pgvector | 文档语义检索 |
| 关系库 | PostgreSQL | Operation Registry、审计主存储 |
| 会话上下文 | Redis（按 session_id 隔离） | 会话内引用清单持久化 |
| 图谱存储 | Neo4j / NetworkX | 业务理解图谱、数据流图 |
| 后台爬取 | Playwright | 管理后台 DOM/截图/RPA |
| 沙箱 | gVisor / 容器隔离 | 工具执行隔离 + 合成 API 测试隔离 |
| 审计归档 | S3 Object Lock | 不可变审计 |
| 实时通信 | WebSocket | 探索过程、对话流式 |
| 部署 | Docker Compose / K8s | 灵活部署 |

---

## 十八、开发路线图

### Phase 1：内核骨架（第 1–4 周）

构建最小可用内核：Operation Registry 数据结构、P-LLM 规划器、CaMeL 解释器（基本执行 + 数据流图）、APIExecutor。手动定义几个 Operation，验证"自然语言 → P-LLM 生成代码 → 解释器执行 → 调用 API"的完整链路。

**交付标准：** 手动注册 5 个 Operation，用户用自然语言能驱动它们执行，数据流图正确生成。

### Phase 2：安全模型（第 5–8 周）

实现 CaMeL 安全核心：Q-LLM 集成、能力标签传播、Policy Engine（Python 策略）、参数约束注入、用户确认流（三级）、Audit Pipeline（链式 hash）、补偿操作机制（可逆/可补偿/不可逆三类）。

**交付标准：** Prompt injection 测试——注入恶意数据无法改变执行计划；customer 角色无法查询他人数据；写操作必须确认；可逆操作可回滚、可补偿操作可撤回。

### Phase 3：Explorer Engine 与 API Synthesizer（第 9–14 周）

实现自主探索与能力合成：CodeExplorer（四阶段 + 业务规则提取）、DatabaseExplorer、APIExplorer，操作自动发现 + 权限标注，Web 探索可视化。API Synthesizer——API 缺失时合成带业务校验的内部 API。生成后自动测试机制——读操作自动验证，写操作生成测试用例在测试库副本上运行。

**交付标准：** 挂载一个真实 Git 仓库 + 数据库，自动发现操作；对缺失的写操作能合成带校验的内部 API 并通过自动测试；读操作可用，合成的写操作进入待审核。

### Phase 4：会话、Web 界面与扩展（第 15–18 周）

会话上下文（跨轮引用、重查最新数据）、完善 Web 界面（操作管理、审计查看器、数据流可视化、合成 API 审核界面）、AdminPanelExplorer（RPA）、DocExplorer，插件接口标准化。

**交付标准：** 支持多轮对话引用；管理员通过 Web 完成从挂载到审核（含合成 API 代码审核）到上线的全流程。

### Phase 5：加固与发布（第 19–21 周）

全面安全测试、性能优化（含简单查询的快速路径）、文档、私有化部署包。

**交付标准：** 可在客户环境私有化部署，通过安全审计。

---

## 十九、安全性分析

### 19.1 威胁模型

CaMeL-Business 假设：用户的自然语言请求可信（用户不会故意攻击自己有权限的系统），但工具返回的数据可能不可信（数据库中可能存有被注入的内容，API 可能返回恶意数据，文档可能含隐藏指令）。这与 CaMeL 论文的威胁模型一致。

### 19.2 防御能力

| 威胁 | 攻击路径 | 防御 |
|---|---|---|
| Prompt injection 劫持规划 | 数据中的恶意指令影响 AI 的后续操作 | P-LLM 不接触数据内容，规划无法被数据影响 |
| Prompt injection 篡改参数 | 诱导 AI 用恶意参数调用操作 | 能力标签 + Policy 检查；参数约束强制注入 |
| 越权访问数据 | customer 试图查他人数据 | Policy 强制注入 `user_id=self`；能力 readers 检查 |
| 数据洗白 | 通过 Q-LLM 解析"洗白"不可信数据 | Q-LLM 输出继承输入能力，不放宽 |
| 静默写操作 | AI 未经确认执行写操作 | 写操作强制 confirm/dual_approval |
| 错误操作 | AI 执行了错误的写操作 | 可逆操作 before/after 回滚；可补偿操作执行补偿；不可逆操作执行前双人确认 |
| 合成 API 缺陷 | 合成的 API 含漏洞或绕过业务校验 | AST 静态检查 + 自动测试 + 管理员审核源代码后才上线 |
| 合成 API 注入 | 合成代码含 SQL 注入 | 静态检查强制所有 SQL 参数化 |
| 审计篡改 | 攻击者篡改审计日志 | 链式 hash + S3 Object Lock |
| 操作被攻陷 | 单个 Operation 执行被劫持 | 沙箱隔离，爆炸半径受限 |

### 19.3 合成 API 的特别考量

API Synthesizer 让系统能合成新的写操作，这是能力的提升，也是新的攻击面。三道防线保证合成 API 的安全：

**静态检查。** 合成代码经过 AST 分析，禁止危险调用（eval/exec/文件/网络），强制所有 SQL 参数化，要求多表写入在事务内。不通过静态检查的代码直接丢弃。

**自动测试。** 合成代码在测试数据库副本上运行测试用例，验证业务规则触发、边界条件、事务回滚、补偿操作。测试不碰生产数据。

**人工审核。** 合成的操作默认 `pending_review`，管理员在 Web 上审核生成的源代码、业务规则来源、测试结果后才能激活。合成的写操作是系统中审核最严格的对象。

### 19.4 局限

与 CaMeL 论文一致，CaMeL-Business 不防御不影响数据流和控制流的攻击。例如诱导 AI 把一段数据总结成错误内容（只要不导致数据外流）。这类 text-to-text 攻击超出能力安全模型的范围。但数据流图能追踪展示给用户的内容来源，可在 Web 上标注信息出处，帮助用户识别。

CaMeL-Business 也不追求完全无人工干预。模糊的请求、需要基于不可信数据决策的任务，可能需要用户澄清或确认。

---

## 二十、待讨论与开放问题

下列问题已在前序讨论中确认了方向，记录于此并说明决策。

**1. Operation 生成的准确性（已确认）。** Phase 3 引入"生成后自动测试"机制：读操作自动执行验证，写操作生成测试用例在测试数据库副本上运行，测试结果供管理员审核。详见 7.4。

**2. 联动关系的边界（待实现时细化）。** 当前设计：P-LLM 运行时编排联动，靠 Policy 检查 + 用户确认 + 数据流图可视化三层防护。是否需要在 Operation 定义中加"允许的联动"白名单，作为实现 Phase 4 时根据测试反馈决定的细化点。倾向先不加白名单，靠三层防护，若发现 P-LLM 编排出非预期联动再补白名单。

**3. 写操作的可逆性（已确认）。** 分三类处理：可逆操作捕获 before 状态直接还原；可补偿操作执行反向操作（如已发送的通知通过撤回通知补偿）；不可逆操作执行前强制双人确认。详见 11.5。

**4. API 覆盖不全时的策略（已确认）。** 不退化为无校验的裸 SQL，而是由 API Synthesizer 合成带业务校验的内部 API（运行在 CaMeL-Business 进程内、直连目标数据库），经自动测试 + 管理员审核后上线。RPA 仅用于无法直连数据库的第三方后台。详见第七章。

**5. P-LLM 的成本与延迟（已确认需要快速路径）。** Phase 5 实现"快速路径"：简单的单步查询绕过完整代码生成流程，直接匹配 Operation 执行，降低延迟和成本。复杂请求走完整 P-LLM 编排。

**6. 多轮对话的会话持久化（已确认）。** 会话上下文只持久化"引用"（实体标识 + 能力标签），不持久化数据快照。使用时必须重新查最新数据。会话内有效，超时 30 分钟或主动关闭后清除，不跨会话。详见第十三章。

**7. 与 CaMeL relay 平台的关系（已确认无实质关系）。** 产品支持 BYOK，客户自己配置模型和 API Key。CaMeL-Business 与任何特定模型或中转服务无绑定。详见 16.4。

**8. 跨系统联动（已确认列为未来扩展）。** 本期聚焦单系统探索与操作。跨系统联动（CRM 查客户 → ERP 下单 → 工单系统建记录）、跨系统实体对齐列为未来扩展功能，本期不做。

剩余需在实现中持续关注的点：合成 API 的生成质量（复杂业务逻辑可能合成不准，依赖自动测试拦截）、合成 API 测试用例的覆盖度（测试用例本身由 LLM 生成，可能遗漏边界）、高频写场景下 before 状态捕获的性能成本。这些在对应开发阶段通过实测数据调整。
