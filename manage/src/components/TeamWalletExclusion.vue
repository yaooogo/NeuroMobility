<script setup>
defineProps({ modelValue: { type: String, default: '' } });
defineEmits(['update:modelValue']);
</script>

<template>
  <textarea
    :value="modelValue"
    class="text-input team-wallet-exclusion"
    rows="2"
    aria-label="排除钱包地址"
    placeholder="排除钱包地址（多个地址用换行、逗号或空格分隔）"
    @input="$emit('update:modelValue', $event.target.value)"
  ></textarea>
</template>

<style scoped>
.team-wallet-exclusion { width: 380px; max-width: 100%; min-height: 44px; resize: vertical; }
</style>
