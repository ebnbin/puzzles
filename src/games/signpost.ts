// Signpost:按箭头连出访问序。上游 signpost.c。
// 标签四态(signpost.c:1479):光标隐藏两词俱空;闲着 From here / To here;
// 拖拽中两键同词——目标合法时报「落点方向」的词,不合法报 Cancel。
// 「哪个键开的连接」标签说不出来,自己记一位;拖拽中开拖的键是勾(确认落点),
// 另一键要么 Cancel(能取消)要么陪跑置灰。
import type { Game, Labels, View } from './game'
import { keyOf, plain } from './game'
import { samePages, verbatim } from './util/declare'
import type { FaceSpec } from './util/pad'
import { act, cross, wordOf } from './util/pad'

type Facts = { opened: string | null }

const WORDS = ['From here', 'To here', 'Cancel']

const PENDING = '\0pending'
const IDLING = '\0idling'

// 拖拽中两键同词;闲着两词不同;隐藏两词俱空。
const dragging = (labels: Labels) => labels.enter === labels.space && !!labels.enter

const opener = (labels: Labels, was: string | null) => {
  if (!dragging(labels)) return null
  // 报「To here」= 正在从起点往外连(From here 开的,即 Enter);反之亦然。
  if (labels.enter === 'To here') return 'Enter'
  if (labels.enter === 'From here') return ' '
  return labels.enter === 'Cancel' ? was : null
}

const opens = (key: string, labels: Labels) =>
  (key === 'Enter' || key === ' ') && labels.enter !== labels.space

const word = (key: string) => (view: View<Facts>) => {
  const own = wordOf(key, view.labels)
  if (dragging(view.labels) && own && view.facts.opened) {
    if (key === view.facts.opened) return own === 'Cancel' ? PENDING : own
    return own === 'Cancel' ? own : IDLING
  }
  return own
}

const linkKey = (
  id: string,
  slot: 4 | 6,
  key: string,
  idle: FaceSpec,
  other: FaceSpec,
) =>
  act<Facts>({
    id,
    slot,
    key,
    idle,
    words: WORDS,
    word: word(key),
    faces: {
      [idle.word === 'linkFrom' ? 'From here' : 'To here']: idle,
      [idle.word === 'linkFrom' ? 'To here' : 'From here']: other,
      [PENDING]: { glyph: 'done', word: 'endLink', idle: true },
      [IDLING]: { glyph: 'cancel', word: 'cancelLink', idle: true },
      Cancel: { glyph: 'cancel', word: 'cancelLink', on: true },
    },
  })

const signpost: Game<Facts> = {
  id: 'signpost',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('signpost'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross<Facts>(),
      linkKey(
        'from', 4, 'Enter',
        { glyph: 'linkFrom', word: 'linkFrom' },
        { glyph: 'done', word: 'endLink', on: true },
      ),
      linkKey(
        'to', 6, ' ',
        { glyph: 'linkTo', word: 'linkTo' },
        { glyph: 'done', word: 'endLink', on: true },
      ),
    ],
  },
  observe: {
    init: { opened: null },
    next: (facts, saw) => {
      if ('spoke' in saw) return { opened: opener(saw.spoke, facts.opened) }
      if ('sent' in saw && plain(saw.sent) && opens(keyOf(saw.sent), saw.before))
        return { opened: keyOf(saw.sent) }
      if ('deal' in saw) return { opened: null }
      return facts
    },
  },
}

export default signpost
