import { reactive } from 'vue';
import {
  FileRecordData,
  fileRecordListApi,
  FileRecordListFormData,
} from '@src/http/apis';

const listState = reactive<{
  formData: FileRecordListFormData;
  list: FileRecordData[];
  total?: number;
  mergeTimer?: ReturnType<typeof setTimeout>;
}>({
  formData: {
    pageSize: 9999,
    pageNumber: 1,
  },
  list: [],
});

async function getList() {
  const res = await fileRecordListApi(listState.formData);
  listState.total = res.total;
  listState.list = res.list.map((item) => ({
    ...item,
    loading: false,
  }));
}

export function useList() {
  return {
    listState,
    getList,
  };
}
