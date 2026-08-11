<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AchievementsModal from '@/components/organisms/AchievementsModal.vue'
import FHudButton from '@/components/atoms/FHudButton.vue'
import FHudBadge from '@/components/atoms/FHudBadge.vue'
import useAchievements from '@/use/useAchievements'

const emit = defineEmits<{
  (e: 'coins-awarded', sourceEl: HTMLElement): void
}>()

const { t } = useI18n()
const { pendingCount, hasUnclaimed } = useAchievements()
const isModalOpen = ref(false)
</script>

<template lang="pug">
  FHudButton(
    tone="gold"
    :attention="hasUnclaimed"
    :aria-label="t('achievements.title')"
    @click="isModalOpen = true"
  )
    //- Trophy glyph — distinct from the Battle Pass chevrons.
    svg(viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
      path(d="M7 4 h10 v3 a5 5 0 0 1 -10 0 Z")
      path(d="M7 5 H4 v1 a3 3 0 0 0 3 3")
      path(d="M17 5 h3 v1 a3 3 0 0 1 -3 3")
      path(d="M12 12 v4")
      path(d="M9 20 h6 l-1 -4 h-4 Z")
    template(#badge)
      FHudBadge(v-if="pendingCount > 0" tone="red") {{ pendingCount }}

  AchievementsModal(
    v-model="isModalOpen"
    @coins-awarded="(el) => emit('coins-awarded', el)"
  )
</template>
