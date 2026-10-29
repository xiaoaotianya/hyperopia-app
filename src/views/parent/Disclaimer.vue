<script setup lang="ts">
import PageHeader from '../../components/PageHeader.vue'
</script>

<template>
  <div class="page">
    <PageHeader title="使用声明" back="/parent" back-label="‹" />
    <article class="card">
      <p>本工具用于戴镜状态下的近距离视觉功能训练与戴镜习惯养成，不能降低远视度数，不能代替配镜和医院复查；训练中如出现眼痛、头痛、恶心等不适请停止使用并就医；对比度类游戏最低约 1%，受屏幕限制。</p>
      <p>游戏中的等级和曲线只反映孩子在本设备上的训练表现，仅供家长参考，不作为医学检查结论。请遵医嘱坚持佩戴眼镜，并按时到医院复查。</p>
    </article>
  </div>
</template>

<style scoped>
.card p { font-size: 18px; line-height: 1.8; margin: 0 0 12px; user-select: text; -webkit-user-select: text; }
.card p:last-child { margin-bottom: 0; }
</style>
