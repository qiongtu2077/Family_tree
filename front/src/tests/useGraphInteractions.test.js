import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useGraphInteractions } from '../composables/useGraphInteractions'

describe('useGraphInteractions', () => {
  it('selects and clears a person', () => {
    const interactions = useGraphInteractions({})
    const person = { id: 'p1', name: '张三' }

    interactions.selectPerson(person)
    expect(interactions.selectedPerson.value).toEqual(person)
    expect(interactions.selectedPersonId.value).toBe('p1')

    interactions.clearSelection()
    expect(interactions.selectedPerson.value).toBeNull()
  })

  it('runs search through graph data service', async () => {
    const graphData = {
      searchPeople: vi.fn().mockResolvedValue([{ id: 'p1', name: '张三' }])
    }
    const interactions = useGraphInteractions(graphData)
    interactions.searchKeyword.value = '张'

    const result = await interactions.runSearch()
    await nextTick()

    expect(graphData.searchPeople).toHaveBeenCalledWith('张')
    expect(result).toHaveLength(1)
    expect(interactions.searchResults.value[0].name).toBe('张三')
  })
})
