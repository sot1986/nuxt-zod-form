<script setup lang="ts">
import { z } from 'zod'
import { useForm } from '#imports'

defineOptions({
  name: 'App',
  inheritAttrs: false,
})

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  passwordConfirmation: z.string().min(8),
}).refine((data) => {
  return data.password === data.passwordConfirmation
}, {
  message: 'Passwords do not match',
  path: ['passwordConfirmation'],
})

const form = useForm(RegisterSchema, {
  email: '',
  password: '',
  passwordConfirmation: '',
}, (form) => {
  console.log(form)
  return Promise.resolve(form)
})
</script>

<template>
  <div id="view">
    <h1>Playground</h1>
    <form @reset.prevent="form.reset" @submit.prevent="form.submit">
      <div class="field">
        <label for="email">Email</label>
        <div>
          <input
            id="email" v-model="form.email" name="email" type="text"
            @change="form.validate('email')"
          >
          <p v-if="form.error('email')">
            {{ form.error('email') }}
          </p>
          <span>{{ form.isValid('email') }}</span>
        </div>
      </div>

      <div class="field">
        <label for="password">Password</label>
        <div>
          <input
            id="password" v-model="form.password" name="password" type="password"
            @change="form.validate('password')"
          >
          <p v-if="form.error('password')">
            {{ form.error('password') }}
          </p>
          <span>{{ form.isValid('password') }}</span>
        </div>
      </div>

      <div class="field">
        <label for="passwordConfirmation">Password Confirmation</label>
        <div>
          <input
            id="passwordConfirmation" v-model="form.passwordConfirmation" name="passwordConfirmation" type="password"
            @change="form.validate('passwordConfirmation')"
          >
          <p v-if="form.error('passwordConfirmation')">
            {{ form.error('passwordConfirmation') }}
          </p>
          <span>{{ form.isValid('passwordConfirmation') }}</span>
        </div>
      </div>

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
  }

  .field p {
    color: red;
    position: absolute;;
  }

  .actions {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    column-gap: 2rem;
  }
</style>
