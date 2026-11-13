/** 统一人物姓名、完整拼音和首拼的检索格式，不在前端推导拼音。 */

/** 忽略大小写和全部空白，并将 ü 与无声调拼音中的 v 统一。 */
export function normalizePersonSearch(text = '') {
  return text.toLowerCase().replace(/\s+/gu, '').replace(/ü/g, 'v')
}

/** 匹配姓名及后端随姓名生成的两个检索字段，空查询保留全部人物。 */
export function matchesPersonSearch(person, keyword) {
  const query = normalizePersonSearch(keyword)
  if (!query) return true
  if (!person) return false
  return [person.name, person.name_pinyin, person.name_initials]
    .some(value => normalizePersonSearch(value).includes(query))
}
