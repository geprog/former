<template>
  <div class="g1">
    Hello from Group
    <div class="group">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.group {
  display: flex;
  flex-direction: row;
  gap: 1rem;
}
</style>
