import { describe, expect, it } from 'vitest'
import { matchesPersonSearch, normalizePersonSearch } from '../utils/personSearch'

const person = {
  id: 'p:zhang-mingyuan',
  name: '张明远',
  name_pinyin: 'zhangmingyuan',
  name_initials: 'zmy'
}

describe('人物检索规范化', () => {
  it.each([
    [' ZHANG\tMING\nYUAN ', 'zhangmingyuan'],
    [' 张\u3000明\u00a0远 ', '张明远'],
    [' LÜ\u3000YUN ', 'lvyun'],
    [' \t\n\u3000\u00a0', '']
  ])('将 %j 规范化为 %j', (input, expected) => {
    expect(normalizePersonSearch(input)).toBe(expected)
  })

  it('省略参数时得到空查询', () => {
    expect(normalizePersonSearch()).toBe('')
  })
})

describe('人物姓名、全拼与首拼检索', () => {
  it.each(['张明远', '明远', ' 张 明 远 ', 'zhangmingyuan', ' ZHANG MING YUAN ', 'mingyuan', 'zmy', ' Z\tM\nY '])('以 %j 命中同一人物', keyword => {
    expect(matchesPersonSearch(person, keyword)).toBe(true)
  })

  it('把 ü 拼写与 v 拼写视为同一全拼', () => {
    expect(matchesPersonSearch({ name: '吕云', name_pinyin: 'lvyun', name_initials: 'ly' }, ' LÜ YUN ')).toBe(true)
  })

  it.each(['', ' \t\n\u3000'])('空查询 %j 匹配全部人物', keyword => {
    expect(matchesPersonSearch(person, keyword)).toBe(true)
  })

  it('缺少可选检索字段的人物仍可按中文搜索', () => {
    expect(matchesPersonSearch({ name: '张明远' }, '明 远')).toBe(true)
    expect(matchesPersonSearch({ name: '张明远' }, 'zmy')).toBe(false)
  })

  it('不把人物 ID 或其它资料当作姓名检索字段', () => {
    const record = { ...person, occupation: '医生' }
    expect(matchesPersonSearch(record, '李')).toBe(false)
    expect(matchesPersonSearch(record, '医生')).toBe(false)
    expect(matchesPersonSearch(record, 'p:zhang-mingyuan')).toBe(false)
  })
})
