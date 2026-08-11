<script setup lang="ts">
export interface TabOption {
  label: string
  value: string | number
  /** Optional image icon shown instead of the label. */
  icon?: string
}

interface Props {
  modelValue: string | number
  options: TabOption[]
}

defineProps<Props>()
const emit = defineEmits(['update:modelValue'])

const selectTab = (value: string | number): void => {
  emit('update:modelValue', value)
}
</script>

<template lang="pug">
  //- The row scrolls horizontally rather than wrapping: on a 320px phone with
  //- four tabs, wrapping would push the modal content down and the previous
  //- fixed padding compensation would no longer clear the header.
  div.f-tabs(role="tablist")
    button.f-tabs__tab(
      v-for="tab in options"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.value"
      :class="{ 'is-active': modelValue === tab.value }"
      @click="selectTab(tab.value)"
    )
      span.f-tabs__shadow(aria-hidden="true")
      span.f-tabs__body
        img.f-tabs__icon(v-if="tab.icon" :src="tab.icon" :alt="tab.label" draggable="false")
        span.f-tabs__label(v-else) {{ tab.label }}
</template>

<style scoped lang="sass">
.f-tabs
  display: flex
  align-items: flex-end
  justify-content: center
  gap: 0
  max-width: 100%
  padding-inline: clamp(0.25rem, 2vw, 1rem)
  overflow-x: auto
  overflow-y: hidden
  scrollbar-width: none

  &::-webkit-scrollbar
    display: none

.f-tabs__tab
  position: relative
  flex: 0 0 auto
  // Floor so a tab can never render as an invisible sliver.
  min-width: 3.25rem
  min-height: 2.1rem
  padding: 0
  border: 0
  background: none
  cursor: pointer
  opacity: 0.8
  transition: transform 140ms ease-out, opacity 140ms ease-out
  -webkit-tap-highlight-color: transparent

  &:hover
    opacity: 1

  &:active
    transform: scale(0.94)

  &.is-active
    z-index: 10
    opacity: 1
    translate: 0 -0.25rem

.f-tabs__shadow
  position: absolute
  inset: 0
  transform: translateY(3px)
  border-radius: clamp(0.5rem, 2.4vw, 1rem) clamp(0.5rem, 2.4vw, 1rem) 0 0
  background-color: #0f1a30

.f-tabs__body
  position: relative
  display: flex
  align-items: center
  justify-content: center
  min-height: 2.1rem
  padding: clamp(0.2rem, 1vw, 0.4rem) clamp(0.6rem, 3.2vw, 1.35rem)
  border-inline: 4px solid #0f1a30
  border-top: 4px solid #0f1a30
  border-radius: clamp(0.5rem, 2.4vw, 1rem) clamp(0.5rem, 2.4vw, 1rem) 0 0
  background-color: #2a4372
  color: #8fa7d1
  transition: background-color 140ms ease-out

  .f-tabs__tab:hover &
    background-color: #34538d

  .f-tabs__tab.is-active &
    background-image: linear-gradient(to bottom, #ffcd00, #f7a000)
    color: #fff
    box-shadow: inset 0 4px 0 rgba(255, 255, 255, 0.4)

.f-tabs__label
  font-weight: 900
  font-style: italic
  text-transform: uppercase
  letter-spacing: 0.05em
  white-space: nowrap
  font-size: clamp(0.65rem, 2.9vw, 1rem)
  text-shadow: 2px 2px 0 #000

.f-tabs__icon
  width: clamp(1.15rem, 5vw, 1.75rem)
  height: clamp(1.15rem, 5vw, 1.75rem)
  object-fit: contain
  pointer-events: none
</style>
