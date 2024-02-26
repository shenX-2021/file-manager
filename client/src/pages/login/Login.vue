<template>
  <div class="page-login">
    <div class="box">
      <el-form
        ref="formRef"
        class="form"
        size="default"
        :rules="rules"
        :model="loginState"
        label-position="top"
        :loading="loginState.loading"
      >
        <el-form-item label="用户名" prop="account">
          <el-input
            v-model="loginState.account"
            placeholder="请输入用户名"
            auto-complete="off"
            @keyup.enter="loginHandle"
          />
        </el-form-item>

        <el-form-item label="密码" prop="pwd">
          <el-input
            v-model="loginState.pwd"
            type="password"
            placeholder="请输入密码"
            auto-complete="off"
            @keyup.enter="loginHandle"
          />
        </el-form-item>
      </el-form>

      <el-row>
        <el-text type="warning">
          此系统仅支持单个账号，首次登录即为注册！
        </el-text>
      </el-row>
      <el-button
        class="mt30"
        type="primary"
        size="default"
        auto-insert-space
        :loading="loginState.loading"
        @click="loginHandle"
      >
        登录
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLogin } from '@src/pages/login/composables/';
import { useRoute, useRouter } from 'vue-router';
const { rules, loginState, login, formRef } = useLogin();

const router = useRouter();
const route = useRoute();

async function loginHandle() {
  await login();
  await router.push('/');
}

function onCreated() {
  // 自动填充账号密码
  const { account, pwd } = route.query;
  if (account) {
    loginState.account = account.toString();
  }
  if (pwd) {
    loginState.pwd = pwd.toString();
  }
}
onCreated();
</script>

<style lang="scss" scoped>
.page-login {
  height: 100vh;
  width: 100vw;
  box-sizing: border-box;
  background-color: #337ecc;
  padding-top: 32vh;

  .box {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    :deep(.el-form) {
      width: 240px;

      .el-form-item {
        &__label {
          color: #ccc;
        }
      }

      .el-input {
        .el-input__inner {
          border: 0;
          border-bottom: 0.5px solid #999;
          padding: 0 8px;
          color: #ccc;
          transition: border-color 0.3s;

          &:focus {
            border-color: #fff;
            color: #fff;
          }

          &:-webkit-autofill {
            -webkit-text-fill-color: #fff !important;
            -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
            transition: background-color 50000s ease-in-out 0s;
          }
        }

        .el-input__wrapper {
          background-color: transparent;
          box-shadow: none;
        }
      }
    }
  }
}
</style>
