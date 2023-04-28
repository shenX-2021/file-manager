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
}>({
  formData: {
    pageSize: 10,
    pageNumber: 1,
  },
  list: [],
});

async function getList() {
  const res = await fileRecordListApi(listState.formData);
  listState.total = res.total;
  listState.list = res.list;
}

export function useList() {
  return {
    listState,
    getList,
  };
}
