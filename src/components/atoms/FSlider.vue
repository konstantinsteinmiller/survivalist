<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  label?: string
  colorFrom?: string
  colorTo?: string
  trackColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 50,
  min: 0,
  max: 100,
  step: 1,
  colorFrom: '#ffcd00', // Brawl Yellow
  colorTo: '#f7a000',
  trackColor: '#1a2b4b' // Dark Blue depth
})

const emit = defineEmits(['update:modelValue'])

const progress = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100
})

const updateValue = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', Number(target.value))
}
</script>

<template lang="pug">
  div.f-slider-container(class="w-full")
    //- Label (Optional)
    div(v-if="label" class="slider-label mb-2 text-white font-black uppercase italic tracking-wider") {{ label }}

    div.f-slider__row(class="relative flex items-center")
      //- Custom Track Background (The 3D "Well")
      div(
        class="f-slider__track absolute inset-0 my-auto rounded-full border-[3px] border-[#0f1a30] overflow-hidden bg-[#0a1425]"
      )
        //- Progress Fill
        div(
          class="h-full transition-all duration-75 relative"
          :style="{ \
            width: `${progress}%`, \
            backgroundImage: `linear-gradient(to bottom, ${colorFrom}, ${colorTo})` \
          }"
        )
          //- Inner Shine for the fill
          span(class="absolute inset-x-0 top-0 h-1/2 bg-white/20")

      //- Native Input (Invisible but functional)
      input(
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        @input="updateValue"
        class="f-slider__input absolute inset-0 w-full opacity-0 cursor-pointer z-10 touch-manipulation"
      )

      //- Custom Thumb (Visual Only)
      div(
        class="thumb-visual pointer-events-none absolute flex items-center justify-center transition-transform"
        :style="{ left: `calc(${progress}% - var(--fsl-thumb) / 2)` }"
      )
        //- The "3D Shadow" of the thumb
        span(class="absolute inset-0 translate-y-[3px] bg-[#102e7a] rounded-xl border-[3px] border-[#0f1a30]")
        //- The Main Thumb Body
        span(class="relative block inset-0 w-full h-full bg-[#50aaff] rounded-xl border-[3px] border-[#0f1a30] overflow-hidden")
          //- Thumb Shine
          span(class="absolute inset-x-0 top-0 h-1/2 bg-white/30")
          //- Little Detail (Vertical Line)
          span(class="absolute inset-0 flex items-center justify-center")
            span(class="w-1.5 h-4 bg-white/50 rounded-full")
</template>

<style scoped lang="sass">
.slider-label
  font-size: clamp(0.75rem, 3.2vw, 1.1rem)
  text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000

.f-slider-container
  // Thumb size drives the row height, the track height AND the left offset, so
  // all three stay in sync at any viewport instead of the old hard-coded 40px.
  --fsl-thumb: clamp(2rem, 9vw, 2.5rem)
  padding-block: clamp(0.4rem, 2vw, 1rem)
  -webkit-tap-highlight-color: transparent

.f-slider__row
  height: var(--fsl-thumb)

.f-slider__track
  height: calc(var(--fsl-thumb) * 0.6)

.f-slider__input
  height: var(--fsl-thumb)

.thumb-visual
  width: var(--fsl-thumb)
  height: var(--fsl-thumb)

/* Ensure the native range covers the whole area for better hitboxes */
input[type="range"]
  -webkit-appearance: none
  background: transparent

  &::-webkit-slider-thumb
    -webkit-appearance: none
    width: var(--fsl-thumb)
    height: var(--fsl-thumb)
    cursor: pointer

  &::-moz-range-thumb
    width: var(--fsl-thumb)
    height: var(--fsl-thumb)
    cursor: pointer
    border: none
    background: transparent
</style>