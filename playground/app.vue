<!-- eslint-disable no-console -->
<script setup lang="ts">
import { RegisterSchema } from './schemas'
import { useForm } from '#imports'

defineOptions({
  name: 'App',
  inheritAttrs: false,
})

const form = useForm(RegisterSchema, {
  username: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}, (data) => {
  return $fetch('/api/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
})

const { data, error } = useAsyncData('register', () => form.submit(), {
  immediate: false,
})

async function tryRegister() {
  try {
    const resp = await $fetch('/api/register', {
      method: 'POST',
      body: form.data(),
      headers: {
        Precognitive: 'true',
      },
    })
  }
  catch (error) {

  }
}
</script>

<template>
  <div id="view">
    <h1>Playground</h1>

    <button type="button" @click="tryRegister">
      call
    </button>
    <form @reset.prevent="form.reset" @submit.prevent="form.submit">
      <fieldset class="field">
        <label for="username">username</label>
        <div class="input-field">
          <input
            id="username" v-model="form.username" name="username" type="text"
            @change="form.validate('username')"
          >
          <p v-if="form.error('username')">
            {{ form.error('username') }}
          </p>
          <span v-if="form.isValid('username')">OK</span>
          <span v-else-if="form.isInvalid('username')">X</span>
        </div>
      </fieldset>

      <fieldset class="field">
        <label for="email">Email</label>
        <div class="input-field">
          <input
            id="email" v-model="form.email" name="email" type="text"
            @change="form.validate('email')"
          >
          <p v-if="form.error('email')">
            {{ form.error('email') }}
          </p>
          <span v-if="form.isValid('email')">OK</span>
          <span v-else-if="form.isInvalid('email')">X</span>
        </div>
      </fieldset>

      <fieldset class="field">
        <label for="password">Password</label>
        <div class="input-field">
          <input
            id="password" v-model="form.password" name="password" type="password"
            @change="form.validate('password')"
          >
          <p v-if="form.error('password')">
            {{ form.error('password') }}
          </p>
          <span v-if="form.isValid('password')">OK</span>
          <span v-else-if="form.isInvalid('password')">X</span>
        </div>
      </fieldset>

      <fieldset class="field">
        <label for="passwordConfirmation">Password Confirmation</label>
        <div class="input-field">
          <input
            id="passwordConfirmation" v-model="form.passwordConfirmation" name="passwordConfirmation" type="password"
            @change="form.validate('passwordConfirmation')"
          >
          <p v-if="form.error('passwordConfirmation')">
            {{ form.error('passwordConfirmation') }}
          </p>
          <span v-if="form.isValid('passwordConfirmation')">OK</span>
          <span v-else-if="form.isInvalid('passwordConfirmation')">X</span>
        </div>
      </fieldset>

      <div class="actions">
        <div>form valid: {{ form.isValid() }}</div>
        <button type="reset">
          Reset
        </button>
        <button>
          Submit
        </button>
      </div>
    </form>

    <pre>
      {{ form.errors.entries() }}
    </pre>
  </div>
</template>

<style>
  #view {
    margin-top: 4rem;
    margin-left: auto;
    margin-right: auto;
    max-width: 50rem;
  }

  form {
    display: flex;
    flex-direction: column;
    row-gap: 1rem;
    max-width: max-content;
  }

  .field {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    column-gap: 5rem;
    border: 0;
  }

  .actions {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    column-gap: 2rem;
  }

  .input-field {
    position: relative;
    display: flex;
  }

  .input-field p {
    position: absolute;
    color: red;
    padding-top: 6px;
  }

  .input-field span {
    position: absolute;
    left: 100%;
    padding-left: 0.5rem;
  }
</style>
