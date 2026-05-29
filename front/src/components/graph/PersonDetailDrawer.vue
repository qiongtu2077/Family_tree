<template>
  <aside v-if="person" class="detail-drawer">
    <button class="close-btn" @click="$emit('close')">关闭</button>
    <div class="portrait" :class="person.gender === 'F' ? 'female' : 'male'">
      <img v-if="person.avatar" :src="person.avatar" :alt="person.name" />
      <span v-else>{{ person.name?.charAt(0) }}</span>
    </div>

    <h2>{{ person.name }}</h2>
    <p class="meta">
      {{ person.gender === 'F' ? '女' : person.gender === 'M' ? '男' : '未知性别' }}
      <span v-if="lifeYears"> · {{ lifeYears }}</span>
    </p>

    <section>
      <h3>人物简介</h3>
      <p>{{ person.biography || '暂无生平简介。' }}</p>
    </section>

    <section class="info-grid">
      <div>
        <span>职业</span>
        <strong>{{ person.occupation || '未填写' }}</strong>
      </div>
      <div>
        <span>居住地</span>
        <strong>{{ person.address || '未填写' }}</strong>
      </div>
      <div>
        <span>名言</span>
        <strong>{{ person.motto || '未填写' }}</strong>
      </div>
      <div>
        <span>成就</span>
        <strong>{{ person.achievements || '未填写' }}</strong>
      </div>
    </section>

    <div class="drawer-actions">
      <button @click="$emit('focus', person.id)">以 TA 为中心</button>
      <button @click="$emit('openRelation', person)">查询关系</button>
    </div>
  </aside>
</template>

<script setup>
/**
 * 人物详情侧栏。
 */
import { computed } from 'vue'

const props = defineProps({
  person: { type: Object, default: null }
})

defineEmits(['close', 'focus', 'openRelation'])

const lifeYears = computed(() => {
  if (!props.person) return ''
  const birth = props.person.birth_date?.slice(0, 4)
  const death = props.person.death_date?.slice(0, 4)
  return [birth, death].filter(Boolean).join('-')
})
</script>

<style scoped>
.detail-drawer {
  position: absolute;
  top: 18px;
  right: 18px;
  bottom: 18px;
  z-index: 5;
  width: 360px;
  padding: 24px;
  overflow-y: auto;
  color: #f0f0f0;
  background: rgba(25, 25, 25, 0.9);
  border: 1px solid rgba(255, 250, 0, 0.18);
  border-radius: 26px;
  box-shadow: -18px 0 50px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(16px);
  animation: drawerIn 0.24s ease both;
}

.close-btn {
  float: right;
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  color: #101010;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  cursor: pointer;
}

.portrait {
  width: 108px;
  height: 108px;
  margin: 18px 0;
  border-radius: 34px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 42px;
  font-weight: 800;
  overflow: hidden;
}

.portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.portrait.male {
  background: linear-gradient(135deg, #3b74b7, #82a9d8);
}

.portrait.female {
  background: linear-gradient(135deg, #c75b7a, #e5a0b4);
}

h2 {
  margin: 0;
  font-size: 28px;
}

.meta {
  margin-top: 6px;
  color: #888;
}

section {
  margin-top: 24px;
}

h3 {
  margin: 0 0 8px;
  font-size: 15px;
}

section p {
  color: #aaa;
  line-height: 1.8;
}

.info-grid {
  display: grid;
  gap: 12px;
}

.info-grid div {
  padding: 13px;
  border-radius: 16px;
  border: 1px solid rgba(255, 250, 0, 0.12);
  background: #252525;
}

.info-grid span {
  display: block;
  margin-bottom: 5px;
  color: #888;
  font-size: 12px;
}

.info-grid strong {
  font-size: 14px;
  line-height: 1.6;
}

.drawer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 24px;
}

.drawer-actions button {
  border: 0;
  border-radius: 14px;
  padding: 12px;
  color: #101010;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  cursor: pointer;
}

@keyframes drawerIn {
  from { opacity: 0; transform: translateX(18px); }
  to { opacity: 1; transform: translateX(0); }
}

@media (max-width: 1040px) {
  .detail-drawer {
    position: fixed;
    inset: auto 12px 12px 12px;
    width: auto;
    max-height: min(72vh, 620px);
    border-left: 1px solid rgba(255, 250, 0, 0.18);
  }
}
</style>
