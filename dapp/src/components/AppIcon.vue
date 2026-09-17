<script setup>
defineProps({ name: { type: String, required: true } });
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'coin'"><circle cx="12" cy="12" r="8"/><path d="M15 8.5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/></template>
    <template v-else-if="name === 'car'"><path d="m5 11 1.4-4h11.2l1.4 4M3.5 13h17v5h-2v2h-3v-2h-7v2h-3v-2h-2z"/><circle cx="7" cy="14.5" r="1"/><circle cx="17" cy="14.5" r="1"/></template>
    <template v-else-if="name === 'record'"><path d="M7 3h10v3h3v15H4V6h3z"/><path d="M8 11h8m-8 4h5M9 3v4m6-4v4"/></template>
    <template v-else-if="name === 'mail'"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m5 8 7 5 7-5m-5-5 2 2"/></template>
    <template v-else-if="name === 'users'"><circle cx="12" cy="8" r="3"/><path d="M6 20a6 6 0 0 1 12 0"/></template>
    <template v-else-if="name === 'coins'"><ellipse cx="9" cy="6" rx="5" ry="2.5"/><path d="M4 6v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V6M4 11v5c0 1.4 2.2 2.5 5 2.5 1 0 2-.2 2.8-.5"/><ellipse cx="16.5" cy="14" rx="4.5" ry="2.5"/><path d="M12 14v4.5c0 1.4 2 2.5 4.5 2.5s4.5-1.1 4.5-2.5V14"/></template>
    <template v-else-if="name === 'share'"><circle cx="6" cy="12" r="2.3"/><circle cx="17.5" cy="5" r="2.3"/><circle cx="17.5" cy="19" r="2.3"/><path d="m8 11 7.4-4.5M8 13l7.4 4.5"/></template>
    <template v-else-if="name === 'partner'"><circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M2.8 19a5.2 5.2 0 0 1 8.8-3.8M21.2 19a5.2 5.2 0 0 0-8.8-3.8M12 14v7"/></template>
    <template v-else-if="name === 'home'"><path d="m3 11 9-8 9 8v9h-6v-6H9v6H3z"/></template>
    <template v-else-if="name === 'compass'"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></template>
    <template v-else-if="name === 'stack'"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></template>
    <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></template>
    <template v-else-if="name === 'bell'"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></template>
    <template v-else-if="name === 'arrow'"><path d="M5 12h13m-5-5 5 5-5 5"/></template>
    <template v-else-if="name === 'globe'"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9"/></template>
    <template v-else-if="name === 'shield'"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/><path d="m9 12 2 2 4-4"/></template>
  </svg>
</template>
