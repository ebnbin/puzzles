// 注册表:全项目唯一的「游戏名 → 行为」映射。顺序照上游收录序(Net 第一、
// Mosaic 最后),和 games.json、手册章节一致。名单和 games.json 的对账由
// vite.config.ts 里的构建期检查把守。
import type { Game, GameName } from './game'

import net from './net'
import cube from './cube'
import fifteen from './fifteen'
import sixteen from './sixteen'
import twiddle from './twiddle'
import rect from './rect'
import netslide from './netslide'
import pattern from './pattern'
import solo from './solo'
import mines from './mines'
import samegame from './samegame'
import flip from './flip'
import guess from './guess'
import pegs from './pegs'
import dominosa from './dominosa'
import untangle from './untangle'
import blackbox from './blackbox'
import slant from './slant'
import lightup from './lightup'
import map from './map'
import loopy from './loopy'
import inertia from './inertia'
import tents from './tents'
import bridges from './bridges'
import unequal from './unequal'
import galaxies from './galaxies'
import filling from './filling'
import keen from './keen'
import towers from './towers'
import singles from './singles'
import magnets from './magnets'
import signpost from './signpost'
import range from './range'
import pearl from './pearl'
import undead from './undead'
import unruly from './unruly'
import flood from './flood'
import tracks from './tracks'
import palisade from './palisade'
import mosaic from './mosaic'

// F 逐游戏不同,表里只能收敛到 Game<any>;每个文件内部自身是全类型检查的。
/* eslint-disable @typescript-eslint/no-explicit-any */
export const GAMES: Readonly<Record<GameName, Game<any>>> = {
  net, cube, fifteen, sixteen, twiddle, rect, netslide, pattern, solo, mines,
  samegame, flip, guess, pegs, dominosa, untangle, blackbox, slant, lightup,
  map, loopy, inertia, tents, bridges, unequal, galaxies, filling, keen,
  towers, singles, magnets, signpost, range, pearl, undead, unruly, flood,
  tracks, palisade, mosaic,
}

export const gameOf = (name: string): Game<unknown> | null =>
  Object.hasOwn(GAMES, name) ? (GAMES[name as GameName] as Game<unknown>) : null
