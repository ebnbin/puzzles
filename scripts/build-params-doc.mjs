// 生成 docs/params.md(生成物,不手改):手写源在 lib/params-doc.mjs,控件表来自 oracle 的
// --describe,「默认参数下的表」由模型现算,第七节的结果表是 check-params.mjs 当场跑出来的。
// 何时跑:改了任一游戏的 types.params、util/params.ts、lib/params-doc.mjs,或升级 vendor/ 之后。
//
//   node scripts/build-params-doc.mjs [--html <path>]   要 gcc(同 check-params.mjs)
//
// --html 另出一份带样式的单页(Artifact 用),不进仓库。
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { GAMES, DEVIATIONS } from './lib/params-doc.mjs'
import { ROOT, buildOracles, describe as describeBin, loadModel } from './lib/params-oracle.mjs'

const COMMIT = '3c3632259d298ab62aafa8a5858823569ab1af46'
const htmlAt = process.argv.indexOf('--html')
const HTML = htmlAt >= 0 ? process.argv[htmlAt + 1] : null

const model = await loadModel()
const { CAP } = model
const bins = buildOracles(GAMES.map((g) => g.id))

// ---------------------------------------------------------------- 取数

const describe = (name) => {
  const { controls, presets, params } = describeBin(bins[name])
  return { controls, presets, dflt: params }
}

// 一张表的紧凑写法:连续区间写 a..b,不连续的列出来(超过 12 个就折叠)。
function compact(list) {
  if (list.length === 0) return '(空)'
  if (list.length === 1) return String(list[0])
  const isInt = list.every((v) => Number.isInteger(v))
  const step = list[1] - list[0]
  const uniform = list.every((v, i) => i === 0 || Math.abs(v - list[i - 1] - step) < 1e-9)
  if (uniform && isInt && step === 1) return `${list[0]}..${list[list.length - 1]}(${list.length} 个)`
  if (uniform)
    return `${list[0]}, ${list[1]}, …, ${list[list.length - 1]}(步长 ${Number(step.toFixed(6))},${list.length} 个)`
  if (list.length <= 12) return `{${list.join(', ')}}`
  return `{${list.slice(0, 6).join(', ')}, …, ${list.slice(-3).join(', ')}}(${list.length} 个)`
}

// 默认参数下,模型给每个申报算出的表。
function defaultTables(game, controls) {
  const live = controls.map((c) => ({ kind: c.kind, label: c.label, value: c.initial }))
  const r = model.reader(live)
  const out = []
  for (const p of model.GAMES[game.id].types.params) {
    if (p.kind === 'span') {
      const los = p.lo(r)
      out.push({ label: p.label, text: `最少 ${compact(los)};最多(最少取 ${los[0]} 时)${compact(p.hi(r, los[0]))}` })
    } else out.push({ label: p.label, text: compact(p.allowed(r)) })
  }
  return out
}

// 当场跑一遍契约测试,拿逐游戏的结果行。
function checkLog() {
  const started = Date.now()
  const run = spawnSync('node', [join(ROOT, 'scripts', 'check-params.mjs')], { encoding: 'utf8', maxBuffer: 1 << 26 })
  const text = run.stdout + '\n' + run.stderr
  const rows = []
  for (const line of text.split('\n')) {
    const m = /^\s+(ok|FAIL)\s+(\w+)\s+combos=(\d+) vectors=(\d+) probes=(\d+) narrower=(\d+)\(expected\)/.exec(line)
    if (m) rows.push({ status: m[1], game: m[2], combos: +m[3], vectors: +m[4], probes: +m[5], narrower: +m[6] })
  }
  if (rows.length !== GAMES.length) throw new Error(`check-params 只报了 ${rows.length} 个游戏:\n${text}`)
  return { rows, elapsed: `${Math.round((Date.now() - started) / 1000)} 秒` }
}

const info = Object.fromEntries(GAMES.map((g) => [g.id, describe(g.id)]))
const tables = Object.fromEntries(GAMES.map((g) => [g.id, defaultTables(g, info[g.id].controls)]))
const check = checkLog()

const CAPSRC = { up: '上游自身', cap: 'CAP 100', grid: '棋盘 ≤ 100 宽', sem: '按语义补', local: '本游戏自定' }
// 已经逐个读上游 + 实测定过范围的游戏(params-doc 的 tuned),不再算「待调优」。
const TUNED = GAMES.filter((g) => g.tuned)
// 第五节那句「最该先看的」自己算出来:还没定夺、被 CAP 封顶、又不是网格维度的参数。
// 手写会过期——Sixteen / Twiddle / Netslide 定完之后那句话就错了一轮。
const COUNTS = GAMES.filter((g) => !g.tuned).flatMap((g) =>
  g.params
    .filter((p) => (p.c === 'cap' || p.c === 'grid') && p.label !== 'Width' && p.label !== 'Height')
    .map((p) => ({ game: g.title, label: p.label })),
)
const KIND = { int: '整数', float: '浮点', span: '区间「a-b」' }
const WIDGET = { int: '滑块 + 步进', float: '滑块 + 步进', span: '一对滑块(最少 / 最多)' }
const nStrings = GAMES.reduce((n, g) => n + g.params.length, 0)

// ---------------------------------------------------------------- 公共文案

const INTRO = [
  `Simon Tatham's Portable Puzzle Collection 四十个游戏的自定义参数面板里,全部 ${nStrings} 个 string 控件(上游 C_STRING)的取值范围:每一个的语义、上游 validate_params 的每一条规则(带源码行号)、本仓库最终给它的表、它看哪些别的控件、上限从哪来。choices 和 boolean 控件不在范围内,它们在上游本来就不是输入框。`,
  `**来源**:\`vendor/sgtpuzzles/\`,commit \`${COMMIT}\`(2026-07-19)。全部规则直接读 C 源码得出;每条带 \`文件:行号\`,升级上游后照着重查。**代码是 SSOT**:范围写在各 \`src/games/<game>.ts\` 的 \`types.params\`,词汇在 \`src/games/util/params.ts\`;这份文档是索引和理由,不是第二份真相;它本身是生成物,手写源在 \`scripts/lib/params-doc.mjs\`,生成器 \`scripts/build-params-doc.mjs\`。两者是否一致由 \`scripts/check-params.mjs\` 对着上游源码验证(第七节)。`,
]

const MECHANISM = [
  ['1.1 参数从哪来、到哪去', [
    '类型面板一打开,宿主就向后端要一份 config box,参数列表常驻。C 侧 `game_configure` 给出一组控件,wasm 胶水(`engine/puzzle-lib.js`)只把三样交到 JS:英文 label、类型(string / choices / boolean)、当前值的字符串。没有 kw,也没有任何范围信息(`emcc.c:616-637`)。',
    '提交时 JS 把每个控件的值原样交回(`dlg_return_sval`),C 侧 `custom_params` 用 atoi / atof / sscanf 解析成 `game_params`,再过 `validate_params(params, full)`。**自定义面板这条路 full 恒为 true**(`midend.c:2011`)——文中所有「full:」开头的规则都生效。不通过就把错误串回传显示成 Notice,box 保持打开;通过就开新局并重新要一次 box。',
    '所以范围知识只能放在 JS 侧,而且只能按 label 认控件。',
    '**预设与参数互相跟随**,两个方向都是上游算的:点一条预设时,C 侧只有一个 config box,所以宿主先让位(`dialogCancel`)、换参数(`selectPreset`)、再要一份——新的这份就是那条预设的值。反过来,每次参数落定后 `midend_set_config` 都会跟一次 `select_appropriate_preset`(`emcc.c:705`),它拿 `midend_which_preset` 按编码后的参数串逐个比对(`midend.c`),命中就报那条预设、不命中报 −1,界面照着它点亮「自定义」。所以选中态不是界面自己猜的。',
    '常驻的这份 box 占着 C 侧唯一的那个位置:键区的偏好键要借同一个 box 用,借之前先让位、借完再要回来(`useConfigBox` 的 `borrowPrefs`),否则那一借会被静默丢掉。',
  ]],
  ['1.2 范围模型', [
    '每个 string 控件在游戏文件里申报一条 `Param`:label、类型、一个函数 `allowed(read)`,输入其它控件的当前值,输出**升序的允许值表**。连续区间、偶数、约数、浮点等距取样、只有一个值(钉死)都是同一种东西:一张表。',
    '**申报顺序即依赖顺序**:一张表只许看排在它前面的数字参数,以及任意 choices / boolean。排在前面的是「主」,后面的跟着让。所以宽高总是可以自由拉动,雷数、区域大小、旋转块边长这类派生量随之被夹。',
    '**settle**:用户每动一个控件,宿主按申报顺序单趟走完所有表,值不在表内就吸到最近的表内值(等距取大),然后提交。表是按「后面的参数一定还有解」写的,所以走完必定是上游放行的组合;这条不变量由第七节的契约测试验证。',
    '当前值来自上游(预设、Game ID、旧存档),可能在表外(比如 Game ID 里输入过 200×200,或 full=false 才放行的 2×2 Range)。面板先照实显示,滑块停在最近的一档;用户第一次动任何控件时才会被 settle 夹进表。',
  ]],
  ['1.3 控件', [
    '**整数与浮点**:一个滑块,按表的**下标**走(表不连续也每一档都合法),两侧各一个 −/+ 步进按钮做精确微调,旁边显示当前值;表只有一个值时禁用。松手(change)才提交,拖动中只更新读数——和今天 checkbox / select 的「每次 change 即落定」一致。',
    '**区间「a-b」**(只有 Black Box 的球数):同一个 label 下两行滑块,最少 / 最多;两者相等时写回单个数,和上游回显格式一致。',
    '**附注**:两种。短的跟在读数后面(Mines 的雷数旁边显示占比,顶替下线的「20%」写法);'
      + '长的在轨道下面单独一行(Rectangles 那一档由枚举算出来的 e)。读数列的宽度按当前这张表最宽的一条现算——'
      + '宽度跟着值变的话,拖到一半轨道就缩水,滑块会从手指底下跑掉。',
    '**兜底**:没申报的 string 控件(比如模态对话框那条路)仍画成文本框;label 对不上上游时申报被忽略,同样回落到文本框。',
    '**上游那条「自定义」不画**:参数列表常驻之后它没有动作可做。参数不落在任何预设上时一条都不选中,那就是自定义。',
  ]],
  ['1.4 上限的规矩', [
    `上游自身有上限的用上游的。上游没有的:网格维度封顶 ${CAP}(棋盘最多 ${CAP}×${CAP} 格),其它计数类参数先同用 ${CAP}。第五节列出还没逐个定夺的那些——它们是占位,按游戏一个个读上游 + 实测来定。`,
    '几处故意与上游不同(补上游漏查的、或按语义封顶),全部列在第四节;契约测试把它们登记为「预期的收窄」,再多一处就 FAIL。',
  ]],
  ['1.5 语义参数:把上游的量换成有语义的量', [
    '有些上游参数不是玩家能理解的量。Rectangles 的「扩展因子 e」是个没有上限的实数,但生成只通过 `(base_w, base_h) = (⌊宽/(1+e)⌋, ⌊高/(1+e)⌋)` 这一对整数看见它(`rect.c:1165-1168`):**落在同一对 base 上的 e 是同一个输入**,同种子下局面逐字节相同;而同一个 e 在不同棋盘上又是完全不同的粒度。这种参数值得在界面上换成它背后那个离散量。',
    '四步(以 Rectangles 为例):① **找出真正影响生成的量**——把这个参数在上游源码里的每一次出现数一遍(`expandfactor` 共 11 处,只有 1165、1167 参与生成),看它经过什么变换进入生成,变换的像就是语义量。② **把语义量枚举出来,分界点用公式算**:`⌊边/(1+e)⌋ = k` 成立于 `1+e ∈ (边/(k+1), 边/k]`,分界点就是 `边/k`,两维并起来即全部;扫描是猜,公式才是证明,而且顺手能给出「一共几档」的闭式。③ **每个语义值反算一个上游认的原值当代表,再用同一套算法验回去**——代表值必须真的产出这个语义值,不验就等于假设。④ **控件里存的仍是上游的原值**:存档、Game ID、C 的回显只认它,语义值只活在界面和表里。',
    '三条硬约束,都是踩到过的:**回显精度**——上游把值写回参数框用的什么格式(Rectangles 是 `%g`,六位有效数字),代表值必须能原样回来;回不来,下一次 settle 就把它当表外值,用户的设置被悄悄改掉。**算术要学像**——上游用 `float` 就得 `Math.fround`,截尾就得 `Math.trunc`;差一个 ulp 就会显示一个和引擎不一样的语义值(18×6 在 e = 0.2 处 `(float)18/1.2 = 14.999999`,base 是 14×5 不是 15×5,真机 DESC 也确实不同)。**表外的落点**——值不在表里时是吸到最近一档(`snap`,默认)还是回第一档(`reset`),按语义选;Rectangles 选 reset,因为换了棋盘整套枚举都换了。',
    '**SSOT 是上游的原值**:它是唯一被持久化的东西(存档的 CPARAMS、Game ID、C 侧的 `game_params`);语义量是每次由别的控件现算出来的一张表,不落盘。两个方向不对称——`原值 → 语义值` 是全函数、和引擎逐位一致,任何值都算得出来;`语义值 → 原值` 是一对多里挑一个代表,只对枚举得到的那些语义值有定义。所以 `语义值 → 原值 → 语义值` 是恒等(表里每一档都是这么验出来的),`原值 → 语义值 → 原值` **不是**恒等,是一次规范化。跨棋盘更没有稳定性可言,也不该有:同一个原值在别的棋盘上就是另一个语义值。',
    '附带一条:**枚举的算法算持久化契约的一部分**。改了代表值的取法(精度、候选规则),老存档里的原值可能落到新表外面——当前那一局不受影响(局面由 DESC 定),但面板一动就会被 settle 挪走。',
    '**什么时候别做**:上游参数本身就有语义(宽、高、雷数、打乱步数)就别加这一层,加了只会让 Game ID 和界面对不上。',
  ]],
]

const KNOWN = [
  '本文档里的耗时数字全部测自一台共享的 2.8 GHz Xeon(开发容器),比现代桌面 CPU 慢两三倍——同一组参数 owner 在自己机器上实测能快到三分之一。逐个游戏定范围时按这台机器的数字取,偏保守。',
  '生成已经不在主线程上了:`src/engine/dealer.ts` + `deal.worker.ts` 把三条会走到 `midend_new_game` 的路(New Game、选预设、自定义参数)全部交给一个镜像 worker,主线程那一局在镜像算完之前一动不动,超过 0.4 秒弹一个可取消的对话框。所以「参数大」现在是转圈等,不是页面变砖;取消即原地不动,连 undo 栈都在。还没定夺范围的游戏只记录,不为耗时调低上限。已知最慢的几处:Loopy(尤其 Penrose / Hats / Spectres 网格)、Solo 高阶(31 阶 Unreasonable 几乎不会结束)、Slant 100×100 Hard(本机 324 秒)、Untangle 100 点、Map 大盘多区域、Bridges / Tracks / Galaxies 100×100。',
  '**Mines 是唯一一处镜像盖不到的卡顿**:布雷不在「新游戏」里,而在**第一次点击**(要保证第一格不是雷),走的是 `midend_process_key`,不经过镜像那三扇门。真机实测 100×100:3000 雷(30%)卡住主线程约 4 秒、5000 雷(50%)超过 33 秒,全程没有转圈对话框。owner 看过实测后仍选择上限 100、雷数不设上限——那一下卡的是点击,不是开局。',
  '**已定夺的游戏里最慢的两个是 Pattern 和 Slant**,两个都是 owner 看过逐档实测后选择不设上限的:Pattern 顶格 50×50 本机平均 >70 秒(要收的话「面积 ≤ 2100」正好只砍掉 45×50 和 50×50 两格);Slant 顶格 100×100 是 Easy 208 秒、Hard 324 秒(要收的话「面积 ≤ 5625」= 75 见方,和大屏字号 8 px 那条线重合)。两个现在都由镜像扛着,卡的是等待不是页面。',
  '发牌期间存档不会写坏:镜像算的时候主线程那一局没被碰过,取消或失败都只是「什么都不做」;重开页面恢复的也是上一局(存档按序列化的局面存,不重新生成)。Mines 那一下仍是主线程,卡住时同理不写坏。',
  '每次松手都开一局:在滑块上用方向键连按,每按一下都生成一局。',
  '另一类不是「大」而是「小到无解」的不终止:浏览器探测到 Light Up 3×3、黑格 5%、4 向旋转、难度 Tricky / Hard,Galaxies 3×3 Unreasonable,Solo 2×2 Killer + X,上游生成器死循环重试(lightup.c:1558、galaxies.c:1456)。这几处上游放行、表也放行,还没定夺的先只记录;二阶 Solo 配对称 / Killer 与 Penrose 最小尺寸那几处因为一碰就死,已按第四节收窄。',
  'Solo 勾了 Jigsaw 之后,行数滑块每拉一档阶数就翻倍(上游语义,C 侧把两数相乘)。表允许,因为上游允许;要不要在界面上钉住行数,等定 Solo 的范围时再说。',
]

const NEXT = [
  '`src/pages/puzzle/ParamField.tsx`:范围模型驱动的数字行。滑块按表的下标走,两侧 −/+ 单步,读数在行尾;区间型两行(最少 / 最多)。拖动只改读数,原生 change 才落定,方向键每按一下落定一次。',
  '`src/pages/puzzle/ConfigFields.tsx`:拿到范围模型后,有申报且表非空的 string 控件交给 ParamField;每次落定(滑块、步进、checkbox、select、回落的文本框)先 `settle` 再提交。没给模型的调用方(偏好面板、模态对话框)行为不变。',
  '`src/pages/puzzle/PuzzleTypes.tsx` / `PuzzleHost.tsx`:把当前游戏的 `types.params` 传进面板;参数列表常驻,选中态只认引擎报的那条预设(不命中就一条都不选),点预设走「让位、换参数、再要一份」三步。',
  '`src/ui/Dock.tsx` / `useMedia.ts`:够宽的桌面上类型面板停靠成右侧栏(360px),棋盘让出宽度而不是被盖住;非模态,面板开着照样能走子。',
  '`src/index.css`:`.sheet-custom .dialog-param*`,颜色全部走 tokens,两种主题同一套规则。',
  '`src/i18n/en.json` / `zh.json`:`types.min` / `max` / `decrease` / `increase` 四个键(区间小标与步进按钮的读法)。',
  '`scripts/check-custom.mjs`:playwright 走真实链路——四十个游戏的自定义面板没有文本框、动一档即开新局、Mines 缩到最小雷数被夹、Twiddle 宽降到 2 旋转块跟着降、Black Box 最少拉过最多时最多跟上、Mines 翻 Ensure solubility 时宽从 1 回到 3、步进按钮加一,全程不出错误 Notice。',
  '`scripts/build-params-doc.mjs`:本文档的生成器,手写源在 `scripts/lib/params-doc.mjs`;第七节的结果表每次生成时当场跑 check-params 得到。',
]

// ---------------------------------------------------------------- Markdown

const md = []
md.push('# 自定义参数的取值范围\n')
md.push(...INTRO.map((p) => p + '\n'))
md.push(`## 怎么读

分八节:**一、机制**是四十个游戏共有的那一层——值怎么进出 C、模型长什么样、控件怎么画、怎么把上游的量换成有语义的量;**二、总览**一张表横扫全部 ${nStrings} 个参数;**三、逐游戏详表**按上游收录序,每个游戏一节,列全该游戏的全部控件、每个 string 参数的语义与上游规则、本仓库的表、默认参数下模型算出的实际表、预设;**四、与上游的出入**;**五、被 CAP 封顶的参数**(还没定夺范围的清单);**六、已知问题**;**七、验证**;**八、实现**。

表里的「依赖」一栏写的是这个参数看谁:「主」= 不看别的数字参数;「看宽」= 表由宽算出,宽动了它可能被夹。
`)

md.push('## 一、机制\n')
for (const [h, ps] of MECHANISM) {
  md.push(`### ${h}\n`)
  md.push(...ps.map((p) => p + '\n'))
}

md.push('## 二、总览\n')
md.push('| 游戏 | 控件(上游 label) | 类型 | 最终范围 | 依赖 | 上限来源 |')
md.push('| --- | --- | --- | --- | --- | --- |')
for (const g of GAMES)
  for (const p of g.params)
    md.push(`| ${g.title} | \`${p.label}\` | ${KIND[p.kind]} | ${p.f} | ${p.d} | ${CAPSRC[p.c]} |`)
md.push('')

md.push('## 三、逐游戏详表\n')
md.push('每节先列 config box 的全部控件(下标、类型、初值),再逐个说 string 参数。「默认参数下的表」是模型对着上游默认参数实际算出来的,和上一栏的描述应当一致。\n')
for (const g of GAMES) {
  const { controls, presets, dflt } = info[g.id]
  md.push(`### ${g.title}(\`${g.file}\`)\n`)
  md.push(`默认参数 \`${dflt}\`。控件:\n`)
  md.push('| # | 类型 | label | 初值 |')
  md.push('| --- | --- | --- | --- |')
  for (const c of controls) {
    const kind = c.kind === 'string' ? 'string' : c.kind === 'boolean' ? 'boolean' : 'choices'
    const init = c.kind === 'choices' ? `${c.initial}(${c.choices.map((x, i) => `${i} ${x}`).join(' / ')})` : c.kind === 'boolean' ? (c.initial ? 'true' : 'false') : `\`${c.initial}\``
    md.push(`| ${c.index} | ${kind} | \`${c.label}\` | ${init} |`)
  }
  md.push('')
  for (const p of g.params) {
    md.push(`#### \`${p.label}\`(${KIND[p.kind]})\n`)
    md.push(`- **语义**:${p.sem}`)
    md.push(`- **上游**(\`${g.file}\`):`)
    for (const u of p.u) md.push(`  - ${u}`)
    md.push(`- **本仓库的表**:${p.f}`)
    md.push(`- **依赖**:${p.d};**上限来源**:${CAPSRC[p.c]};**控件**:${WIDGET[p.kind]}`)
    const t = tables[g.id].find((x) => x.label === p.label)
    md.push(`- **默认参数下的表**:${t.text}`)
    md.push('')
  }
  if (g.notes) for (const n of g.notes) md.push(`> ${n}\n`)
  md.push(`预设:${presets.map((p) => `${p.name} \`${p.params}\``).join(';')}。\n`)
}

md.push('## 四、与上游的出入\n')
md.push('本仓库故意比上游窄、或替上游补上漏查的地方。`scripts/check-params.mjs` 的 `EXPECTED_NARROWER` 逐条对应,除此之外的收窄都算 FAIL。\n')
md.push('| 游戏 | 出入 | 理由 |')
md.push('| --- | --- | --- |')
for (const d of DEVIATIONS) md.push(`| ${d.game} | ${d.what} | ${d.why} |`)
md.push('')

md.push('## 五、被 CAP 封顶的参数\n')
md.push(`上游没有上限、本仓库先用 ${CAP} 封顶的参数。网格维度按「棋盘最多 ${CAP}×${CAP} 格」定,其余计数类是占位,还没逐个定夺;每一个都是游戏文件里的一处 \`CAP\`,改起来一行。\n`)
md.push('| 游戏 | 控件 | 语义 | 现在的表 |')
md.push('| --- | --- | --- | --- |')
for (const g of GAMES)
  if (!g.tuned)
    for (const p of g.params)
      if (p.c === 'cap' || p.c === 'grid') md.push(`| ${g.title} | \`${p.label}\` | ${p.sem} | ${p.f} |`)
md.push('')
md.push(`已经逐个实测定夺过、不在此列的游戏:${TUNED.map((g) => g.title).join('、')}。\n`)
md.push(`不是网格维度的计数(最该先看的):${COUNTS.map((c) => `${c.game} 的 \`${c.label}\``).join('、')}。\n`)

md.push('## 六、已知问题\n')
md.push(...KNOWN.map((k) => `- ${k}`))
md.push('')

md.push('## 七、验证\n')
md.push(`\`scripts/check-params.mjs\`(何时跑见文件头)把 \`vendor/\` 的 C 源码和 \`scripts/lib/params-oracle.c\` 用 gcc 编成 40 个 oracle,不动 vendor 一行,也不生成棋盘,直接调 \`custom_params\` + \`validate_params(full=true)\`。对每个游戏做三件事:

1. **覆盖**:每个 string 控件都有申报,每条申报都能按 label 认到控件。
2. **健全**:choices × boolean 的全部组合(超过 96 种抽 96 种)下,按申报顺序把每张表走一遍(大表抽两头、等距、随机共 14 个),走出来的每个组合上游都放行;路上没有空表;settle 对表内组合是 no-op;另从随机乱值出发 settle 之后上游也放行。
3. **紧**:表外一格(下界减一、上界加一、表中间的洞)按界面做法钉住、后面的参数照 settle 落定,上游若放行就是「比上游窄」——只有第四节登记过的算预期。

最近一次全量结果(${check.elapsed ? `耗时 ${check.elapsed}` : ''}):
`)
md.push('| 游戏 | 结果 | 固定组合 | 走过的组合 | 表外探针 | 预期的收窄 |')
md.push('| --- | --- | --- | --- | --- | --- |')
for (const r of check.rows) md.push(`| ${r.game} | ${r.status} | ${r.combos} | ${r.vectors} | ${r.probes} | ${r.narrower} |`)
md.push('')
md.push('界面层的链路(滑块写回字符串 → dialogOk → 新局)由 `scripts/check-custom.mjs` 用 playwright 走一遍,见第八节。\n')

md.push('## 八、实现\n')
md.push('范围模型落地为控件,动到的文件:\n')
md.push(...NEXT.map((n) => `- ${n}`))
md.push('')

writeFileSync(join(ROOT, 'docs', 'params.md'), md.join('\n'))
console.log('docs/params.md written:', md.join('\n').length, 'chars')

if (!HTML) process.exit(0)

// ---------------------------------------------------------------- HTML

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// 只处理文中用到的行内记号:`code`、**bold**。
const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

const h = []
h.push(`<title>参数范围手册</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root {
  --bg: #fafaf9; --surface: #ffffff; --surface-2: #f0f0ef; --edge: #e4e4e2; --edge-strong: #c2c2be;
  --text: #17171a; --text-2: #5b5b64; --text-3: #6b6b75;
  --accent: #2b2bd6; --accent-soft: #e7e7fb; --accent-soft-text: #1e1e9e;
  --ok: #1f7a3a; --ok-soft: #e3f3e8; --warn: #8a5a00; --warn-soft: #fbf1dc;
  --mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #101013; --surface: #17171b; --surface-2: #212128; --edge: #26262d; --edge-strong: #3a3a44;
    --text: #e9e9ec; --text-2: #a4a4ad; --text-3: #8b8b95;
    --accent: #9a9aff; --accent-soft: #24245a; --accent-soft-text: #c9c9ff;
    --ok: #7ed49a; --ok-soft: #173023; --warn: #f0c36a; --warn-soft: #3a2c10;
  }
}
:root[data-theme="dark"] {
  --bg: #101013; --surface: #17171b; --surface-2: #212128; --edge: #26262d; --edge-strong: #3a3a44;
  --text: #e9e9ec; --text-2: #a4a4ad; --text-3: #8b8b95;
  --accent: #9a9aff; --accent-soft: #24245a; --accent-soft-text: #c9c9ff;
  --ok: #7ed49a; --ok-soft: #173023; --warn: #f0c36a; --warn-soft: #3a2c10;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.65 var(--sans); }
a { color: var(--accent); text-decoration: none; }
a:hover, a:focus-visible { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
code { font-family: var(--mono); font-size: 0.86em; background: var(--surface-2); border: 1px solid var(--edge); border-radius: 4px; padding: 0.05em 0.35em; white-space: nowrap; }
.wrap { display: grid; grid-template-columns: 1fr; gap: 2rem; max-width: 76rem; margin: 0 auto; padding: 2rem 1.25rem 5rem; }
@media (min-width: 1080px) { .wrap { grid-template-columns: 15rem minmax(0, 1fr); } .toc { position: sticky; top: 1rem; align-self: start; max-height: calc(100vh - 2rem); overflow: auto; } }
.toc { font-size: 0.8125rem; line-height: 1.5; }
.toc h2 { font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); margin: 0 0 0.5rem; }
.toc ol { list-style: none; margin: 0 0 1rem; padding: 0; }
.toc li { margin: 0.15rem 0; }
.toc .games { columns: 2; column-gap: 1rem; }
.toc .games li { break-inside: avoid; }
main { min-width: 0; }
h1 { font-size: 2rem; line-height: 1.15; letter-spacing: -0.01em; margin: 0 0 0.5rem; text-wrap: balance; }
.lede { color: var(--text-2); font-size: 1rem; max-width: 66ch; margin: 0 0 0.75rem; }
.pin { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; font-size: 0.8125rem; color: var(--text-3); margin-bottom: 2rem; }
h2 { font-size: 1.375rem; line-height: 1.25; margin: 3rem 0 1rem; padding-top: 1rem; border-top: 1px solid var(--edge); text-wrap: balance; }
h3 { font-size: 1.0625rem; margin: 2rem 0 0.5rem; }
h4 { font-size: 0.9375rem; margin: 1.25rem 0 0.35rem; }
p, li { max-width: 72ch; }
main ul, main ol { padding-left: 1.4rem; }
main li { margin: 0.25rem 0; }
.table { overflow-x: auto; margin: 0.75rem 0 1.25rem; border: 1px solid var(--edge); border-radius: 8px; background: var(--surface); }
table { border-collapse: collapse; width: 100%; font-size: 0.8125rem; }
th, td { text-align: left; vertical-align: top; padding: 0.45rem 0.65rem; border-top: 1px solid var(--edge); }
thead th { border-top: 0; background: var(--surface-2); font-weight: 600; color: var(--text-2); font-size: 0.75rem; letter-spacing: 0.02em; white-space: nowrap; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
td.label { white-space: nowrap; }
.game { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--edge); }
.game h3 { display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap; margin-top: 0; font-size: 1.25rem; }
.game h3 .file { font: 500 0.75rem var(--mono); color: var(--text-3); }
.controls { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.5rem 0 1rem; }
.chip { font: 500 0.75rem var(--mono); padding: 0.15rem 0.5rem; border-radius: 999px; border: 1px solid var(--edge-strong); color: var(--text-2); background: var(--surface); white-space: nowrap; }
.chip.string { background: var(--accent-soft); color: var(--accent-soft-text); border-color: transparent; }
.chip small { opacity: 0.7; margin-right: 0.35em; }
.param { display: grid; grid-template-columns: 7.5rem minmax(0, 1fr); gap: 0.25rem 1rem; margin: 0.6rem 0 1.1rem; padding: 0.75rem 0.9rem; background: var(--surface); border: 1px solid var(--edge); border-radius: 8px; }
.param dt { font-size: 0.75rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-3); padding-top: 0.15rem; }
.param dd { margin: 0; }
.param dd ul { margin: 0; padding-left: 1.1rem; }
.param .head { grid-column: 1 / -1; display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
.param .head code { font-size: 0.9375rem; background: var(--accent-soft); color: var(--accent-soft-text); border-color: transparent; }
.param .head .kind { font-size: 0.75rem; color: var(--text-3); }
.note { margin: 0.75rem 0; padding: 0.6rem 0.9rem; border-left: 3px solid var(--accent); background: var(--surface-2); border-radius: 0 6px 6px 0; max-width: 72ch; }
.presets { font-size: 0.8125rem; color: var(--text-2); }
.status { font: 500 0.75rem var(--mono); padding: 0.1rem 0.45rem; border-radius: 999px; }
.status.ok { background: var(--ok-soft); color: var(--ok); }
.status.fail { background: var(--warn-soft); color: var(--warn); }
.summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.75rem; margin: 1rem 0 1.5rem; }
.summary div { padding: 0.7rem 0.9rem; background: var(--surface); border: 1px solid var(--edge); border-radius: 8px; }
.summary b { display: block; font-size: 1.5rem; font-variant-numeric: tabular-nums; line-height: 1.2; }
.summary span { font-size: 0.75rem; color: var(--text-3); }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
</style>
<div class="wrap">
<nav class="toc" aria-label="目录">
<h2>目录</h2>
<ol>
<li><a href="#s1">一、机制</a></li>
<li><a href="#s2">二、总览</a></li>
<li><a href="#s3">三、逐游戏详表</a></li>
<li><a href="#s4">四、与上游的出入</a></li>
<li><a href="#s5">五、被 CAP 封顶的参数</a></li>
<li><a href="#s6">六、已知问题</a></li>
<li><a href="#s7">七、验证</a></li>
<li><a href="#s8">八、实现</a></li>
</ol>
<h2>游戏</h2>
<ol class="games">${GAMES.map((g) => `<li><a href="#g-${g.id}">${esc(g.title)}</a></li>`).join('')}</ol>
</nav>
<main>
<h1>自定义参数的取值范围</h1>
<p class="lede">${inline(INTRO[0])}</p>
<div class="pin"><span>上游 commit <code>${COMMIT.slice(0, 7)}</code>(2026-07-19)</span><span>${GAMES.length} 个游戏</span><span>${nStrings} 个 string 控件</span><span>SSOT:<code>src/games/*.ts</code> 的 <code>types.params</code></span></div>
<p>${inline(INTRO[1].replace(/^\*\*来源\*\*:[^。]+。/, ''))}</p>
`)

const okCount = check.rows.filter((r) => r.status === 'ok').length
const totVec = check.rows.reduce((n, r) => n + r.vectors, 0)
const totProbe = check.rows.reduce((n, r) => n + r.probes, 0)
h.push(`<div class="summary">
<div><b>${okCount} / ${check.rows.length}</b><span>游戏通过契约测试</span></div>
<div><b>${totVec.toLocaleString('en-US')}</b><span>走过的参数组合,上游全部放行</span></div>
<div><b>${totProbe.toLocaleString('en-US')}</b><span>表外探针,上游全部拒绝(预期收窄除外)</span></div>
<div><b>${DEVIATIONS.length}</b><span>处与上游的出入,逐条登记</span></div>
</div>`)

h.push(`<h2 id="s1">一、机制</h2>`)
for (const [t, ps] of MECHANISM) {
  h.push(`<h3>${esc(t)}</h3>`)
  for (const p of ps) h.push(`<p>${inline(p)}</p>`)
}

h.push(`<h2 id="s2">二、总览</h2>
<p>「依赖」写的是这个参数看谁:「主」= 不看别的数字参数;「看宽」= 表由宽算出,宽动了它可能被夹。</p>
<div class="table"><table><thead><tr><th>游戏</th><th>控件</th><th>类型</th><th>最终范围</th><th>依赖</th><th>上限来源</th></tr></thead><tbody>`)
for (const g of GAMES)
  for (const p of g.params)
    h.push(`<tr><td><a href="#g-${g.id}">${esc(g.title)}</a></td><td class="label"><code>${esc(p.label)}</code></td><td>${KIND[p.kind]}</td><td>${inline(p.f)}</td><td>${inline(p.d)}</td><td>${CAPSRC[p.c]}</td></tr>`)
h.push('</tbody></table></div>')

h.push(`<h2 id="s3">三、逐游戏详表</h2>
<p>每节先列 config box 的全部控件(下标、类型、初值),再逐个说 string 参数。「默认参数下的表」是模型对着上游默认参数实际算出来的,和「本仓库的表」应当一致。</p>`)
for (const g of GAMES) {
  const { controls, presets, dflt } = info[g.id]
  h.push(`<section class="game" id="g-${g.id}"><h3>${esc(g.title)} <span class="file">${esc(g.file)} · 默认 ${esc(dflt)}</span></h3>`)
  h.push('<div class="controls">')
  for (const c of controls) {
    const init = c.kind === 'choices' ? `= ${c.choices[c.initial]}` : c.kind === 'boolean' ? `= ${c.initial}` : `= ${c.initial}`
    const title = c.kind === 'choices' ? c.choices.map((x, i) => `${i} ${x}`).join(' / ') : c.kind
    h.push(`<span class="chip ${c.kind}" title="${esc(title)}"><small>${c.index}</small>${esc(c.label)} ${esc(init)}</span>`)
  }
  h.push('</div>')
  for (const p of g.params) {
    const t = tables[g.id].find((x) => x.label === p.label)
    h.push(`<dl class="param">
<div class="head"><code>${esc(p.label)}</code><span class="kind">${KIND[p.kind]} · ${WIDGET[p.kind]} · 上限:${CAPSRC[p.c]}</span></div>
<dt>语义</dt><dd>${inline(p.sem)}</dd>
<dt>上游</dt><dd><ul>${p.u.map((u) => `<li>${inline(u)}</li>`).join('')}</ul></dd>
<dt>本仓库的表</dt><dd>${inline(p.f)}</dd>
<dt>依赖</dt><dd>${inline(p.d)}</dd>
<dt>默认参数下</dt><dd>${inline(t.text)}</dd>
</dl>`)
  }
  if (g.notes) for (const n of g.notes) h.push(`<p class="note">${inline(n)}</p>`)
  h.push(`<p class="presets">预设:${presets.map((p) => `${esc(p.name)} <code>${esc(p.params)}</code>`).join(';')}</p>`)
  h.push('</section>')
}

h.push(`<h2 id="s4">四、与上游的出入</h2>
<p>本仓库故意比上游窄、或替上游补上漏查的地方。契约测试的 <code>EXPECTED_NARROWER</code> 逐条对应,除此之外的收窄都算 FAIL。</p>
<div class="table"><table><thead><tr><th>游戏</th><th>出入</th><th>理由</th></tr></thead><tbody>`)
for (const d of DEVIATIONS) h.push(`<tr><td>${esc(d.game)}</td><td>${inline(d.what)}</td><td>${inline(d.why)}</td></tr>`)
h.push('</tbody></table></div>')

h.push(`<h2 id="s5">五、被 CAP 封顶的参数</h2>
<p>上游没有上限、本仓库先用 ${CAP} 封顶的参数。网格维度按「棋盘最多 ${CAP}×${CAP} 格」定,其余计数类是占位,还没逐个定夺;每一个都是游戏文件里的一处 <code>CAP</code>,改起来一行。</p>
<div class="table"><table><thead><tr><th>游戏</th><th>控件</th><th>语义</th><th>现在的表</th></tr></thead><tbody>`)
for (const g of GAMES)
  if (!g.tuned)
    for (const p of g.params)
      if (p.c === 'cap' || p.c === 'grid') h.push(`<tr><td><a href="#g-${g.id}">${esc(g.title)}</a></td><td class="label"><code>${esc(p.label)}</code></td><td>${inline(p.sem)}</td><td>${inline(p.f)}</td></tr>`)
h.push(`</tbody></table></div>
<p>已经逐个实测定夺过、不在此列的游戏:${TUNED.map((g) => esc(g.title)).join('、')}。</p>
<p>不是网格维度的计数,最该先看:${COUNTS.map((c) => `${esc(c.game)} 的 <code>${esc(c.label)}</code>`).join('、')}。</p>`)

h.push(`<h2 id="s6">六、已知问题</h2><ul>${KNOWN.map((k) => `<li>${inline(k)}</li>`).join('')}</ul>`)

h.push(`<h2 id="s7">七、验证</h2>
<p><code>scripts/check-params.mjs</code> 把 <code>vendor/</code> 的 C 源码和 <code>scripts/lib/params-oracle.c</code> 用 gcc 编成 40 个 oracle(不动 vendor 一行,也不生成棋盘),直接调 <code>custom_params</code> + <code>validate_params(full=true)</code>。对每个游戏做三件事:</p>
<ol>
<li><strong>覆盖</strong>:每个 string 控件都有申报,每条申报都能按 label 认到控件。</li>
<li><strong>健全</strong>:choices × boolean 的全部组合(超过 96 种抽 96 种)下,按申报顺序把每张表走一遍(大表抽两头、等距、随机共 14 个),走出来的每个组合上游都放行;路上没有空表;settle 对表内组合是 no-op;另从随机乱值出发 settle 之后上游也放行。</li>
<li><strong>紧</strong>:表外一格(下界减一、上界加一、表中间的洞)按界面做法钉住、后面的参数照 settle 落定,上游若放行就是「比上游窄」,只有第四节登记过的算预期。</li>
</ol>
<p>最近一次全量结果${check.elapsed ? `(耗时 ${esc(check.elapsed)})` : ''}:</p>
<div class="table"><table><thead><tr><th>游戏</th><th>结果</th><th class="num">固定组合</th><th class="num">走过的组合</th><th class="num">表外探针</th><th class="num">预期的收窄</th></tr></thead><tbody>`)
for (const r of check.rows)
  h.push(`<tr><td><a href="#g-${r.game}">${esc(r.game)}</a></td><td><span class="status ${r.status === 'ok' ? 'ok' : 'fail'}">${r.status}</span></td><td class="num">${r.combos}</td><td class="num">${r.vectors.toLocaleString('en-US')}</td><td class="num">${r.probes.toLocaleString('en-US')}</td><td class="num">${r.narrower}</td></tr>`)
h.push(`</tbody></table></div>
<p>界面层的链路(滑块写回字符串 → dialogOk → 新局)由 <code>scripts/check-custom.mjs</code> 用 playwright 走一遍,见第八节。</p>`)

h.push(`<h2 id="s8">八、实现</h2><p>范围模型落地为控件,动到的文件:</p><ul>${NEXT.map((n) => `<li>${inline(n)}</li>`).join('')}</ul>`)
h.push('</main></div>')

writeFileSync(HTML, h.join('\n'))
console.log(`${HTML} written:`, h.join('\n').length, 'chars')
