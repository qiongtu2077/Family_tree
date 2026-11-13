<template>
  <aside v-if="person" class="detail-drawer" aria-label="人物详情">
    <div class="drawer-heading"><span>人物档案</span><button class="close-btn" aria-label="关闭人物详情" @click="$emit('close')">关闭 <span aria-hidden="true">×</span></button></div>
    <div class="person-identity">
      <div class="portrait" :class="person.gender === 'F' ? 'female' : 'male'">
        <img v-if="person.avatar" :src="person.avatar" :alt="person.name" />
        <span v-else>{{ person.name?.charAt(0) }}</span>
      </div>
      <div class="identity-text"><h2>{{ person.name }}</h2><p class="meta">{{ genderLabel }}<span v-if="lifeYears"> · {{ lifeYears }}</span></p></div>
    </div>
    <div class="drawer-actions"><button @click="$emit('focus', person.id)">以 TA 为中心</button><button class="secondary" @click="$emit('openRelation', person)">查询关系</button></div>
    <section><h3>人物简介</h3><p>{{ person.biography || '暂无生平简介。' }}</p></section>
    <section class="info-grid">
      <div><span>职业</span><strong>{{ person.occupation || '未填写' }}</strong></div>
      <div><span>居住地</span><strong>{{ person.address || '未填写' }}</strong></div>
      <div><span>名言</span><strong>{{ person.motto || '未填写' }}</strong></div>
      <div><span>成就</span><strong>{{ person.achievements || '未填写' }}</strong></div>
    </section>
    <section v-if="person.photos?.length" class="family-photos"><h3>家庭照片</h3><a v-for="photo in person.photos" :key="photo" :href="photo" target="_blank" rel="noreferrer"><img :src="photo" :alt="`${person.name}的家庭照片`" loading="lazy" /></a></section>
    <button v-if="person.can_edit" class="edit-profile" @click="$emit('edit', person)">编辑资料与照片</button>
  </aside>
</template>

<script setup>
/** 人物档案面板：桌面作为独立栏占位，窄屏作为底部抽屉。 */
import { computed } from 'vue'
const props = defineProps({ person: { type: Object, default: null } })
defineEmits(['close', 'focus', 'openRelation', 'edit'])

/** 按已有日期字段生成出生、逝世年份。 */
const lifeYears = computed(() => {
  if (!props.person) return ''
  const birth = props.person.birth_date?.slice(0, 4)
  const death = props.person.death_date?.slice(0, 4)
  if (birth && death) return `${birth} — ${death}`
  if (birth) return `${birth} 年出生`
  if (death) return `${death} 年逝世`
  return ''
})
const genderLabel = computed(() => ({ F: '女', M: '男', U: '性别未录入' })[props.person?.gender] || '性别未录入')
</script>

<style scoped>
.detail-drawer { position: relative; align-self: stretch; width: 312px; min-width: 0; min-height: 0; max-height: 100%; padding: 22px; overflow-y: auto; border: 1px solid var(--line); border-radius: 14px; color: var(--ink); background: #fff; }
.drawer-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 25px; color: var(--muted); font-size: 11px; letter-spacing: .06em; }
.close-btn { padding: 4px 0 4px 10px; border: 0; color: var(--muted); background: transparent; font-size: 11px; }
.close-btn span { margin-left: 5px; font-size: 18px; vertical-align: -1px; }
.person-identity { display: flex; gap: 14px; align-items: center; }
.portrait { flex-shrink: 0; width: 64px; height: 70px; border-radius: 12px; display: grid; place-items: center; overflow: hidden; color: #416e5b; background: #e9eee5; font-family: 'SimSun', serif; font-size: 30px; }
.portrait.female { color: #967350; background: #f3ece1; }
.portrait img { width: 100%; height: 100%; object-fit: cover; }
.identity-text { min-width: 0; }
h2 { margin: 0; font-size: 23px; font-weight: 600; overflow-wrap: anywhere; }
.meta { margin: 8px 0 0; color: var(--muted); font-size: 11px; line-height: 1.6; }
.drawer-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 23px; }
.drawer-actions button { padding: 10px 6px; border: 1px solid var(--green); border-radius: 7px; color: #fff; background: var(--green); font-size: 12px; }
.drawer-actions .secondary { color: var(--green); border-color: var(--line); background: #fff; }
section { margin-top: 26px; }
h3 { margin: 0 0 12px; padding-left: 9px; border-left: 2px solid var(--copper); font-size: 13px; font-weight: 600; }
section p { margin: 0; color: var(--muted); line-height: 1.9; font-size: 12px; overflow-wrap: anywhere; white-space: pre-line; }
.info-grid { display: grid; gap: 0; border-top: 1px solid var(--line); }
.info-grid div { padding: 15px 0; border-bottom: 1px solid #edf0e9; }
.info-grid span { display: block; margin-bottom: 7px; color: #89958b; font-size: 11px; }
.info-grid strong { display: block; color: #4e6257; font-size: 12px; font-weight: 400; line-height: 1.7; overflow-wrap: anywhere; white-space: pre-line; }
.family-photos a { display: block; margin-top: 10px; }
.family-photos img { width: 100%; max-height: 220px; object-fit: cover; border-radius: 8px; }
.edit-profile { width: 100%; margin-top: 22px; padding: 10px; background: var(--green-soft); color: var(--green); border: 1px solid var(--line); border-radius: 8px; font-size: 12px; }
@media (max-width: 1040px) {
  .detail-drawer { position: fixed; inset: auto 12px 12px; z-index: 35; width: auto; max-height: 64vh; max-height: 64dvh; padding: 20px 24px; border-radius: 18px; box-shadow: 0 -12px 70px rgba(32, 59, 50, .18); }
  .drawer-heading { margin-bottom: 15px; }
  .portrait { width: 50px; height: 54px; font-size: 24px; }
  .drawer-actions { margin-top: 16px; }
  section { margin-top: 20px; }
  .info-grid { grid-template-columns: 1fr 1fr; column-gap: 20px; }
}
@media (max-width: 480px) { .detail-drawer { padding: 18px 20px; } .info-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
