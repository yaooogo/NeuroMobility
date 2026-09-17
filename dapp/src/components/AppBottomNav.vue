<script setup>
import AppIcon from "./AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";

const props = defineProps({
  items: {
    type: Array,
    default: () => [
      { key: "home", label: "首页", icon: "home" },
      { key: "invest", label: "投资", icon: "compass" },
      { key: "assets", label: "资产", icon: "stack" },
      { key: "mine", label: "我的", icon: "user" }
    ]
  },
  activeKey: {
    type: String,
    default: "home"
  },
  ariaLabel: {
    type: String,
    default: "Primary"
  }
});

const emit = defineEmits(["select", "update:activeKey"]);
const { lang } = useLocale();

function selectItem(item) {
  if (item.disabled) return;
  emit("update:activeKey", item.key);
  emit("select", item);
}
</script>

<template>
  <nav class="bottom-nav" :aria-label="ariaLabel">
    <button
      v-for="item in props.items"
      :key="item.key"
      type="button"
      :class="{ active: item.key === activeKey }"
      :disabled="item.disabled"
      :aria-current="item.key === activeKey ? 'page' : undefined"
      @click="selectItem(item)"
    >
      <AppIcon :name="item.icon" />
      <span>{{ lang(item.label) }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  z-index: 20;
  left: 50%;
  bottom: 0;
  width: min(100%, 480px);
  height: calc(78px + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 8px 13px env(safe-area-inset-bottom);
  border-top: 1px solid #efedf2;
  border-radius: 17px 17px 0 0;
  background: rgba(255, 255, 255, .95);
  box-shadow: 0 -7px 22px rgba(62, 45, 82, .06);
  transform: translateX(-50%);
  backdrop-filter: blur(16px);
}

.bottom-nav button {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 0;
  background: transparent;
  color: #8c898e;
  font-size: 12px;
  cursor: pointer;
}

.bottom-nav button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.bottom-nav button.active {
  color: #9a3fed;
  font-weight: 700;
}

.bottom-nav button :deep(svg) {
  width: 26px;
  height: 26px;
}

@media (min-width: 481px) {
  .bottom-nav { bottom: 18px; }
}
</style>
