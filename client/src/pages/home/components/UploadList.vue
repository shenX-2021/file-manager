<template>
  <el-card header="正在上传的文件" shadow="never" body-style="padding: 6px;">
    <el-form>
      <el-card
        class="mb10"
        v-for="(item, idx) in uploadState.list"
        :key="item.fileHash"
      >
        <el-row>
          <el-col :span="14">
            <el-row v-for="(cols, rowIdx) in rows" :key="rowIdx">
              <el-col v-for="(col, colIdx) in cols" :key="colIdx" :span="span">
                <el-form-item :label="col.label">
                  <template v-if="col.type === 'component'">
                    <file-status
                      v-if="col.prop === 'status'"
                      :status="item[col.prop]"
                      :file-hash="item.fileHash"
                      :size="item.size"
                    />
                    <component
                      v-else
                      :[col.model]="item[col.prop]"
                      :is="col.component"
                    />
                  </template>
                  <span v-else-if="col.type === 'value'" v-bind="col.props">
                    {{ col.getValue(item[col.prop]) }}
                  </span>
                  <span v-else-if="col.type === 'prop'" v-bind="col.props">
                    {{ item[col.prop] }}
                  </span>
                </el-form-item>
              </el-col>
            </el-row>
          </el-col>

          <el-col :span="10">
            <upload-right-layout :file-record-data="item" :index="idx" />
          </el-col>
        </el-row>
      </el-card>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { useUpload } from '@src/pages/home/composables';
import { useConfigStore } from '@src/store';
import { computed, defineAsyncComponent } from 'vue';
import { transformByte } from '@src/utils';
import UploadRightLayout from '@src/pages/home/components/UploadRightLayout.vue';
import { ElCol, ElRow } from 'element-plus/es';
import FileStatus from '@src/pages/home/components/FileStatus.vue';

const { uploadState } = useUpload();
const configStore = useConfigStore();

const formItemList: FormItem[] = [
  {
    type: 'prop',
    label: '文件名',
    prop: 'filename',
    props: {
      class: 'singe-line-ellipsis',
    },
  },
  {
    type: 'value',
    label: '创建时间',
    prop: 'gmtCreated',
    getValue: (value: string) => new Date(value).toLocaleString(),
  },
  {
    type: 'component',
    label: '上传状态',
    prop: 'status',
    model: 'status',
    component: defineAsyncComponent(() => import('./FileStatus.vue')),
  },
  {
    type: 'value',
    label: '文件大小',
    prop: 'size',
    getValue: (value: number) => transformByte(value),
  },
];

const rows = computed<FormItem[][]>(() => {
  if (configStore.state.size === 'small') {
    return formItemList.map((item) => [item]);
  }

  const step = configStore.state.size === 'default' ? 2 : 4;

  const list: FormItem[][] = [];
  for (let i = 0; i < formItemList.length; i += step) {
    list.push(formItemList.slice(i, i + step));
  }

  return list;
});

const span = computed(() => {
  if (configStore.state.size === 'small') return 24;

  if (configStore.state.size === 'default') return 12;

  return 6;
});
</script>

<style lang="scss" scoped></style>
