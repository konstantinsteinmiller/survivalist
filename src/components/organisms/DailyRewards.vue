<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import FHudButton from '@/components/atoms/FHudButton.vue'
import FHudBadge from '@/components/atoms/FHudBadge.vue'
import { useI18n } from 'vue-i18n'
import FModal from '@/components/molecules/FModal.vue'
import FIconButton from '@/components/atoms/FIconButton.vue'
import IconCoin from '@/components/icons/IconCoin.vue'
import useTowerEconomy from '@/use/useTowerEconomy'
import useSounds from '@/use/useSound.ts'
import { spawnCoinExplosion } from '@/use/useCoinExplosion'
import { getState, setState } from '@/use/useTowerState'
import { DAILY_REWARDS_KEY } from '@/keys'
import { flushSaveNow } from '@/use/useSaveStatus'

const emit = defineEmits<{
  (e: 'coins-awarded', sourceEl: HTMLElement): void
}>()

const { addCoins } = useTowerEconomy()
const { t } = useI18n()
const dailyBtnRef = ref<HTMLElement | null>(null)
const { playSound } = useSounds()

// Scaled to the new, slower coin economy (~40 coins on a good early run): a
// daily login is a meaningful boost without trivialising upgrade costs.
// Each streak level pays 3× its prior baseline (was [10,15,25,40,60,90,150]).
const DAILY_REWARDS = [30, 45, 75, 120, 180, 270, 450]
const STORAGE_KEY = DAILY_REWARDS_KEY

interface DailyState {
  /** Index of next reward to collect (0..6). Wraps to 0 after day 7. */
  currentDay: number
  /** ISO date string of the last collection. */
  lastCollected: string | null
}

const loadState = (): DailyState => {
  const v = getState<DailyState | null>(STORAGE_KEY, null)
  if (v && typeof v.currentDay === 'number') return v
  return { currentDay: 0, lastCollected: null }
}

const saveState = (s: DailyState) => {
  setState(STORAGE_KEY, s)
}

const todayStr = () => new Date().toISOString().slice(0, 10)
const yesterdayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

const state = ref<DailyState>(loadState())
const isModalOpen = ref(false)

const isCollectableToday = computed(() => state.value.lastCollected !== todayStr())
const dayBroken = computed(() =>
  state.value.lastCollected !== null
  && state.value.lastCollected !== todayStr()
  && state.value.lastCollected !== yesterdayStr()
)

const onOpen = () => {
  isModalOpen.value = true
}

const claim = (sourceEl: HTMLElement) => {
  if (!isCollectableToday.value) return
  // streak break — restart from day 0
  if (dayBroken.value) state.value.currentDay = 0
  const reward = DAILY_REWARDS[state.value.currentDay] ?? 50
  addCoins(reward)
  emit('coins-awarded', sourceEl)
  playSound('reward-continue', 0.06)
  state.value.currentDay = (state.value.currentDay + 1) % DAILY_REWARDS.length
  state.value.lastCollected = todayStr()
  saveState(state.value)
  // Discrete daily-reward claim — flush immediately (the claim + its coins
  // must survive an instant reload, not ride the coin throttle).
  void flushSaveNow()
  setTimeout(() => { isModalOpen.value = false }, 700)
}

const onCardClick = (event: MouseEvent, idx: number) => {
  if (idx !== state.value.currentDay) return
  claim(event.currentTarget as HTMLElement)
}
</script>

<template lang="pug">
  FHudButton(
    ref="dailyBtnRef"
    tone="blue"
    :attention="isCollectableToday"
    :aria-label="t('dailyRewards.title')"
    @click="onOpen"
  )
    //- Calendar glyph with the current streak day stamped on it.
    svg(viewBox="0 0 24 24" fill="currentColor" class="text-white")
      rect(x="3" y="5" width="18" height="16" rx="2" fill="rgba(255,255,255,0.15)" stroke="currentColor" stroke-width="1.5")
      rect(x="3" y="5" width="18" height="4" fill="currentColor")
      rect(x="6" y="2" width="2" height="5" rx="0.5")
      rect(x="16" y="2" width="2" height="5" rx="0.5")
      circle(cx="8" cy="13" r="1.2")
      circle(cx="12" cy="13" r="1.2")
      circle(cx="16" cy="13" r="1.2")
      circle(cx="8" cy="17" r="1.2")
      circle(cx="12" cy="17" r="1.2")
    template(#badge)
      FHudBadge(v-if="isCollectableToday" tone="red") !

  FModal(
    v-model="isModalOpen"
    :title="t('dailyRewards.title')"
  )
    div.flex.flex-col.gap-3.p-3
      p.text-center.text-white.game-text(class="text-sm sm:text-base") {{ t('dailyRewards.subtitle') }}
      div.grid.grid-cols-7.gap-1(class="sm:gap-2")
        div(
          v-for="(reward, idx) in DAILY_REWARDS"
          :key="idx"
          class="daily-card relative rounded-lg border-2 px-1 py-2 flex flex-col items-center justify-center text-center"
          :class="{\
            'is-claimed': idx < state.currentDay,\
            'is-today': idx === state.currentDay && isCollectableToday,\
            'is-locked': idx > state.currentDay || (idx === state.currentDay && !isCollectableToday)\
          }"
          @click="onCardClick($event, idx)"
        )
          span.font-black.game-text.text-white(class="text-[10px] sm:text-xs") {{ t('dailyRewards.day', { n: idx + 1 }) }}
          IconCoin(class="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300 my-1")
          span.font-black.game-text.text-yellow-100(class="text-[10px] sm:text-xs") +{{ reward }}
</template>

<style scoped lang="sass">
.daily-card
  background: rgba(0, 0, 0, 0.35)
  border-color: rgba(255, 255, 255, 0.18)
  cursor: not-allowed
  transition: all 0.2s ease

  &.is-claimed
    background: rgba(80, 170, 80, 0.4)
    border-color: rgba(120, 220, 120, 0.6)
    opacity: 0.55

  &.is-today
    background: linear-gradient(180deg, #ffcd00, #f7a000)
    border-color: #fff7d6
    box-shadow: 0 0 12px rgba(255, 200, 0, 0.6)
    cursor: pointer
    animation: today-bounce 1s ease-in-out infinite alternate

  &.is-locked
    background: rgba(0, 0, 0, 0.45)
    opacity: 0.7

@keyframes today-bounce
  from
    transform: translateY(0)
  to
    transform: translateY(-3px)
</style>
