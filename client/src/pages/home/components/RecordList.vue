<template>
  <el-form>
    <el-card
      class="mb10 ml10 mr10"
      v-for="(item, idx) in listState.list"
      :key="idx"
    >
      <el-row>
        <el-col :span="20">
          <el-row>
            <el-col :span="6">
              <el-form-item label="名称">
                {{ item.filename }}
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="上传状态">
                <file-status :status="item.status" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="校验状态">
                <file-check-status :check-status="item.checkStatus" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="创建时间">
                {{ new Date(item.gmtCreated).toLocaleString() }}
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="8">
              <el-form-item label="文件大小">
                {{ item.size }}
              </el-form-item>
            </el-col>
          </el-row>
        </el-col>

        <el-col :span="4"> 按钮 </el-col>
      </el-row>
    </el-card>
  </el-form>
</template>

<script setup lang="ts">
import { useList } from '@src/pages/home/composables';
const { listState, getList } = useList();
import FileStatus from './FileStatus.vue';
import FileCheckStatus from './FileCheckStatus.vue';

async function onCreated() {
  await getList();
}
onCreated();
</script>

<style lang="scss" scoped></style>
