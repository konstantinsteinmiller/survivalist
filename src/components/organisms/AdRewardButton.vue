<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCoin from '@/components/icons/IconCoin.vue'
import FHudButton from '@/components/atoms/FHudButton.vue'
import FHudBadge from '@/components/atoms/FHudBadge.vue'
import IconMovie from '@/components/icons/IconMovie.vue'
import { isRewardedReady, showRewardedAd } from '@/use/useAds'
import useTowerEconomy from '@/use/useTowerEconomy'
import { getState, setState } from '@/use/useTowerState'
import { AD_COOLDOWN_KEY } from '@/keys'

interface Props {
  coins?: number
}

const props = withDefaults(defineProps<Props>(), {
  coins: 125
})

const emit = defineEmits<{
  (e: 'coins-awarded', sourceEl: HTMLElement): void
}>()

const { t } = useI18n()
const { addCoins } = useTowerEconomy()
// Template ref onto the FHudButton component; the coin-explosion VFX flies
// from this element to the wallet badge.
const rootEl = ref<any>(null)

const COOLDOWN_MS = 30_000
const COOLDOWN_KEY = AD_COOLDOWN_KEY

const readReadyAt = (): number => {
  const v = getState<unknown>(COOLDOWN_KEY)
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : 0
}
const adReadyAt = ref(readReadyAt())
const tickNow = ref(Date.now())
let tickIntervalId: number | null = null

const cooldownActive = computed(() => tickNow.value < adReadyAt.value)
const isVisible = computed(() => isRewardedReady.value && !cooldownActive.value)

onMounted(() => {
  tickIntervalId = window.setInterval(() => {
    tickNow.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (tickIntervalId !== null) clearInterval(tickIntervalId)
})

const triggerAdReward = async () => {
  if (cooldownActive.value) return
  const ok = await showRewardedAd()
  if (ok) {
    addCoins(props.coins)
    const el = (rootEl.value?.$el ?? rootEl.value) as HTMLElement | null
    if (el) emit('coins-awarded', el)
    adReadyAt.value = Date.now() + COOLDOWN_MS
    setState(COOLDOWN_KEY, adReadyAt.value)
  }
}
</script>

<template lang="pug">
  //- Uses the shared HUD chip so it sits flush with its neighbours in the
  //- bottom row at every viewport. The reward amount rides in the badge slot.
  FHudButton(
    v-if="isVisible"
    ref="rootEl"
    tone="gold"
    attention
    :aria-label="t('ads.plusCoins', { n: coins })"
    @click="triggerAdReward"
  )
    IconMovie
    template(#badge)
      FHudBadge(tone="blue")
        span +{{ coins }}
        //- Sized explicitly, like every other `IconCoin` call site. It is an
        //- `<img>`, so a stylesheet that only sizes `svg` lets it render at its
        //- intrinsic 128×128 — belt and braces on top of the badge's own rule.
        IconCoin(class="w-3 h-3")
</template>
