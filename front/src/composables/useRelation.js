/**
 * @file useRelation.js
 * @description 家族关系查询功能的组合式函数
 * 
 * 功能说明：
 * - 查询两个人物之间的家族关系
 * - 支持的关系类型：
 *   - 直系：父母、子女、祖父母、孙子女
 *   - 兄弟姐妹
 *   - 配偶：丈夫、妻子
 *   - 姻亲：公婆、岳父母、儿媳、女婿
 *   - 旁系：叔伯、姑姑、舅舅、姨妈、侄子女、堂/表兄弟姐妹
 * 
 * 使用方式：
 * import { useRelation } from '@/composables/useRelation'
 * const { showRelationQuery, queryRelation, ... } = useRelation(personList)
 */

import { ref, computed } from 'vue'

/**
 * 关系查询组合式函数
 * @param {Ref<Array>} personList - 人员列表的响应式引用
 */
export function useRelation(personList) {
  // ========== 响应式状态 ==========
  
  /** 是否显示关系查询弹窗 */
  const showRelationQuery = ref(false)
  
  /** 选中的人物A */
  const relationPersonA = ref(null)
  
  /** 选中的人物B */
  const relationPersonB = ref(null)
  
  /** 人物A搜索文本 */
  const relationPersonASearch = ref('')
  
  /** 人物B搜索文本 */
  const relationPersonBSearch = ref('')
  
  /** 是否显示人物A下拉框 */
  const showRelationADropdown = ref(false)
  
  /** 是否显示人物B下拉框 */
  const showRelationBDropdown = ref(false)
  
  /** 关系查询结果 */
  const relationResult = ref('')
  
  /** 从族谱选择模式：'A' | 'B' | null */
  const relationSelectMode = ref(null)

  // ========== 计算属性 ==========
  
  /** 过滤后的人物A候选列表（根据搜索文本过滤，最多显示10个） */
  const filteredRelationPersonsA = computed(() => {
    const searchText = relationPersonASearch.value.toLowerCase().trim()
    if (!searchText) return personList.value.slice(0, 10)
    return personList.value.filter(p => p.name.toLowerCase().includes(searchText)).slice(0, 10)
  })

  /** 过滤后的人物B候选列表 */
  const filteredRelationPersonsB = computed(() => {
    const searchText = relationPersonBSearch.value.toLowerCase().trim()
    if (!searchText) return personList.value.slice(0, 10)
    return personList.value.filter(p => p.name.toLowerCase().includes(searchText)).slice(0, 10)
  })

  // ========== 弹窗控制方法 ==========
  
  /**
   * 打开关系查询弹窗
   * @param {Function} loadPersonListFn - 加载人员列表的函数（可选）
   */
  const openRelationQuery = async (loadPersonListFn) => {
    showRelationQuery.value = true
    // 重置状态
    relationPersonA.value = null
    relationPersonB.value = null
    relationPersonASearch.value = ''
    relationPersonBSearch.value = ''
    relationResult.value = ''
    // 确保人员列表已加载
    if (personList.value.length === 0 && loadPersonListFn) {
      await loadPersonListFn()
    }
  }

  // ========== 人物选择方法 ==========
  
  /** 选择人物A */
  const selectRelationPersonA = (person) => {
    relationPersonA.value = person
    relationPersonASearch.value = ''
    showRelationADropdown.value = false
    relationResult.value = ''  // 清除之前的结果
  }

  /** 选择人物B */
  const selectRelationPersonB = (person) => {
    relationPersonB.value = person
    relationPersonBSearch.value = ''
    showRelationBDropdown.value = false
    relationResult.value = ''
  }

  /** 开始从族谱中选择人物 */
  const startRelationSelect = (target) => {
    relationSelectMode.value = target  // 'A' 或 'B'
    showRelationQuery.value = false    // 暂时隐藏弹窗
  }

  /** 取消从族谱中选择 */
  const cancelRelationSelect = () => {
    relationSelectMode.value = null
  }

  /** 完成从族谱中选择人物（点击节点时调用） */
  const completeRelationSelect = (person) => {
    if (relationSelectMode.value === 'A') {
      relationPersonA.value = person
      relationPersonASearch.value = ''
    } else if (relationSelectMode.value === 'B') {
      relationPersonB.value = person
      relationPersonBSearch.value = ''
    }
    relationSelectMode.value = null
    relationResult.value = ''
    showRelationQuery.value = true  // 重新显示弹窗
  }

  // ========== 关系计算辅助函数 ==========
  
  /**
   * 构建家族关系图
   * @returns {Map} 人员ID -> 人员信息（包含children数组）
   */
  const buildFamilyMap = () => {
    const familyMap = new Map()
    
    // 初始化所有人员
    personList.value.forEach(person => {
      familyMap.set(person.id, { ...person, children: [] })
    })
    
    // 建立父子关系
    personList.value.forEach(person => {
      if (person.father_id && familyMap.has(person.father_id)) {
        familyMap.get(person.father_id).children.push(person.id)
      }
      if (person.mother_id && familyMap.has(person.mother_id)) {
        familyMap.get(person.mother_id).children.push(person.id)
      }
    })
    
    return familyMap
  }

  /**
   * 获取某人的所有祖先
   * @param {number} personId - 人员ID
   * @param {Map} familyMap - 家族关系图
   * @param {Set} visited - 已访问的节点（防止循环）
   * @returns {Map} 祖先ID -> 代数距离
   */
  const getAncestors = (personId, familyMap, visited = new Set()) => {
    const ancestors = new Map()
    if (visited.has(personId)) return ancestors
    visited.add(personId)
    
    const person = familyMap.get(personId)
    if (!person) return ancestors
    
    // 添加父亲及其祖先
    if (person.father_id && familyMap.has(person.father_id)) {
      ancestors.set(person.father_id, 1)
      const fatherAncestors = getAncestors(person.father_id, familyMap, visited)
      fatherAncestors.forEach((dist, id) => {
        if (!ancestors.has(id) || ancestors.get(id) > dist + 1) {
          ancestors.set(id, dist + 1)
        }
      })
    }
    
    // 添加母亲及其祖先
    if (person.mother_id && familyMap.has(person.mother_id)) {
      ancestors.set(person.mother_id, 1)
      const motherAncestors = getAncestors(person.mother_id, familyMap, visited)
      motherAncestors.forEach((dist, id) => {
        if (!ancestors.has(id) || ancestors.get(id) > dist + 1) {
          ancestors.set(id, dist + 1)
        }
      })
    }
    
    return ancestors
  }

  /**
   * 获取某人的所有后代
   * @param {number} personId - 人员ID
   * @param {Map} familyMap - 家族关系图
   * @param {Set} visited - 已访问的节点
   * @returns {Map} 后代ID -> 代数距离
   */
  const getDescendants = (personId, familyMap, visited = new Set()) => {
    const descendants = new Map()
    if (visited.has(personId)) return descendants
    visited.add(personId)
    
    const person = familyMap.get(personId)
    if (!person) return descendants
    
    person.children.forEach(childId => {
      descendants.set(childId, 1)
      const childDescendants = getDescendants(childId, familyMap, visited)
      childDescendants.forEach((dist, id) => {
        if (!descendants.has(id) || descendants.get(id) > dist + 1) {
          descendants.set(id, dist + 1)
        }
      })
    })
    
    return descendants
  }

  /**
   * 获取辈分前缀
   * @param {number} dist - 代数距离
   * @returns {string} 辈分前缀（曾、高、远等）
   */
  const getGenerationPrefix = (dist) => {
    if (dist <= 1) return ''
    if (dist === 2) return ''
    if (dist === 3) return '曾'
    if (dist === 4) return '高'
    return '远'
  }

  // ========== 核心：关系查询方法 ==========
  
  /**
   * 查询两人之间的关系
   * 判断顺序：本人 -> 父母 -> 子女 -> 祖先 -> 后代 -> 兄弟姐妹 -> 配偶 -> 姻亲 -> 旁系
   */
  const queryRelation = () => {
    if (!relationPersonA.value || !relationPersonB.value) return
    
    const personA = relationPersonA.value
    const personB = relationPersonB.value
    
    // 1. 同一人
    if (personA.id === personB.id) {
      relationResult.value = '本人'
      return
    }
    
    const familyMap = buildFamilyMap()
    const ancestorsOfA = getAncestors(personA.id, familyMap)
    const descendantsOfA = getDescendants(personA.id, familyMap)
    const ancestorsOfB = getAncestors(personB.id, familyMap)
    
    // 2. A是B的父母
    if (personB.father_id === personA.id) {
      relationResult.value = '父亲'
      return
    }
    if (personB.mother_id === personA.id) {
      relationResult.value = '母亲'
      return
    }
    
    // 3. A是B的子女
    if (personA.father_id === personB.id || personA.mother_id === personB.id) {
      relationResult.value = personA.gender === 'M' ? '儿子' : '女儿'
      return
    }
    
    // 4. A是B的祖先（祖父母、曾祖父母等）
    if (ancestorsOfB.has(personA.id)) {
      const dist = ancestorsOfB.get(personA.id)
      const prefix = getGenerationPrefix(dist)
      relationResult.value = prefix + (personA.gender === 'M' ? '祖父' : '祖母')
      return
    }
    
    // 5. A是B的后代（孙子女、曾孙等）
    if (descendantsOfA.has(personB.id)) {
      const dist = descendantsOfA.get(personB.id)
      const prefix = getGenerationPrefix(dist)
      relationResult.value = prefix + (personA.gender === 'M' ? '孙子' : '孙女')
      return
    }
    
    // 6. B是A的祖先（反向检查）
    if (ancestorsOfA.has(personB.id)) {
      const dist = ancestorsOfA.get(personB.id)
      const prefix = getGenerationPrefix(dist)
      relationResult.value = prefix + (personA.gender === 'M' ? '孙子' : '孙女')
      return
    }
    
    // 7. 兄弟姐妹（同父或同母）
    const personAData = familyMap.get(personA.id)
    const personBData = familyMap.get(personB.id)
    if (personAData && personBData) {
      const sameParent = (personAData.father_id && personAData.father_id === personBData.father_id) ||
                         (personAData.mother_id && personAData.mother_id === personBData.mother_id)
      if (sameParent) {
        relationResult.value = personA.gender === 'M' ? '兄弟' : '姐妹'
        return
      }
    }
    
    // 8. 配偶（有共同子女）
    const childrenOfA = familyMap.get(personA.id)?.children || []
    const childrenOfB = familyMap.get(personB.id)?.children || []
    const commonChildren = childrenOfA.filter(c => childrenOfB.includes(c))
    if (commonChildren.length > 0) {
      relationResult.value = personA.gender === 'M' ? '丈夫' : '妻子'
      return
    }
    
    // 9. 公婆/岳父母（A是B配偶的父母）
    const spouseOfB = personList.value.find(p => {
      const pChildren = familyMap.get(p.id)?.children || []
      return p.id !== personB.id && pChildren.some(c => childrenOfB.includes(c))
    })
    if (spouseOfB) {
      if (spouseOfB.father_id === personA.id || spouseOfB.mother_id === personA.id) {
        if (spouseOfB.gender === 'M') {
          relationResult.value = personA.gender === 'M' ? '公公' : '婆婆'
        } else {
          relationResult.value = personA.gender === 'M' ? '岳父' : '岳母'
        }
        return
      }
    }
    
    // 10. 儿媳/女婿（A是B子女的配偶）
    for (const childId of childrenOfB) {
      const child = familyMap.get(childId)
      if (child) {
        const childChildren = child.children || []
        const childSpouse = personList.value.find(p => {
          const pChildren = familyMap.get(p.id)?.children || []
          return p.id !== childId && pChildren.some(c => childChildren.includes(c))
        })
        if (childSpouse && childSpouse.id === personA.id) {
          relationResult.value = child.gender === 'M' ? '儿媳' : '女婿'
          return
        }
      }
    }
    
    // 11. 叔伯/姑姨（A是B父母的兄弟姐妹）
    const parentsOfB = []
    if (personBData?.father_id) parentsOfB.push(personBData.father_id)
    if (personBData?.mother_id) parentsOfB.push(personBData.mother_id)
    
    for (const parentId of parentsOfB) {
      const parent = familyMap.get(parentId)
      if (parent) {
        const parentFather = parent.father_id
        const parentMother = parent.mother_id
        if ((parentFather && personAData?.father_id === parentFather) ||
            (parentMother && personAData?.mother_id === parentMother)) {
          if (parent.gender === 'M') {
            relationResult.value = personA.gender === 'M' ? '叔伯' : '姑姑'
          } else {
            relationResult.value = personA.gender === 'M' ? '舅舅' : '姨妈'
          }
          return
        }
      }
    }
    
    // 12. 侄子/侄女（A是B兄弟姐妹的子女）
    const siblingsOfB = personList.value.filter(p => {
      if (p.id === personB.id) return false
      return (p.father_id && p.father_id === personBData?.father_id) ||
             (p.mother_id && p.mother_id === personBData?.mother_id)
    })
    
    for (const sibling of siblingsOfB) {
      if (personA.father_id === sibling.id || personA.mother_id === sibling.id) {
        relationResult.value = personA.gender === 'M' ? '侄子' : '侄女'
        return
      }
    }
    
    // 13. 堂/表兄弟姐妹（有共同祖父母）
    const grandparentsOfA = new Set()
    if (personAData?.father_id) {
      const father = familyMap.get(personAData.father_id)
      if (father?.father_id) grandparentsOfA.add(father.father_id)
      if (father?.mother_id) grandparentsOfA.add(father.mother_id)
    }
    if (personAData?.mother_id) {
      const mother = familyMap.get(personAData.mother_id)
      if (mother?.father_id) grandparentsOfA.add(mother.father_id)
      if (mother?.mother_id) grandparentsOfA.add(mother.mother_id)
    }
    
    const grandparentsOfB = new Set()
    if (personBData?.father_id) {
      const father = familyMap.get(personBData.father_id)
      if (father?.father_id) grandparentsOfB.add(father.father_id)
      if (father?.mother_id) grandparentsOfB.add(father.mother_id)
    }
    if (personBData?.mother_id) {
      const mother = familyMap.get(personBData.mother_id)
      if (mother?.father_id) grandparentsOfB.add(mother.father_id)
      if (mother?.mother_id) grandparentsOfB.add(mother.mother_id)
    }
    
    const commonGrandparents = [...grandparentsOfA].filter(g => grandparentsOfB.has(g))
    if (commonGrandparents.length > 0) {
      relationResult.value = personA.gender === 'M' ? '堂/表兄弟' : '堂/表姐妹'
      return
    }
    
    // 14. 无法确定
    relationResult.value = '暂无法确定具体关系'
  }

  // 返回所有需要暴露的状态和方法
  return {
    // 状态
    showRelationQuery,
    relationPersonA,
    relationPersonB,
    relationPersonASearch,
    relationPersonBSearch,
    showRelationADropdown,
    showRelationBDropdown,
    relationResult,
    relationSelectMode,
    // 计算属性
    filteredRelationPersonsA,
    filteredRelationPersonsB,
    // 方法
    openRelationQuery,
    selectRelationPersonA,
    selectRelationPersonB,
    startRelationSelect,
    cancelRelationSelect,
    completeRelationSelect,
    queryRelation
  }
}
