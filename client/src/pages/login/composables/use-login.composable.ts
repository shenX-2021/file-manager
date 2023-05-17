import { reactive, ref } from 'vue';
import Sha from 'jssha';
import { loginApi } from '@src/http/apis';
import { ElForm, FormRules } from 'element-plus/es';

interface LoginData {
  loading: boolean;
  account: string;
  pwd: string;
}

const formRef = ref<InstanceType<typeof ElForm>>();
const loginLoading = ref(false);
const loginState = reactive<LoginData>({
  loading: false,
  account: '',
  pwd: '',
});
const rules = reactive<FormRules>({
  account: [
    {
      required: true,
      message: '用户名是必填的',
    },
    {
      validator(rule, value: string, callback) {
        if (/\s/.test(value)) {
          callback(new Error('用户名不应该有空格'));
        } else {
          callback();
        }
      },
    },
  ],
  pwd: [
    {
      required: true,
      message: '密码是必填的',
    },
  ],
});

async function login() {
  if (formRef.value) {
    await formRef.value.validate();

    const sha = new Sha('SHA-256', 'TEXT', { encoding: 'UTF8' });
    sha.update(loginState.pwd);
    const pwd = sha.getHash('HEX');

    loginLoading.value = true;
    try {
      await loginApi({
        account: loginState.account,
        pwd,
      });
    } finally {
      loginLoading.value = false;
    }
  }
}

export function useLogin() {
  return {
    rules,
    loginState,
    login,
    formRef,
  };
}
