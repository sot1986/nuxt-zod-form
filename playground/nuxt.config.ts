export default defineNuxtConfig({
  modules: ['../src/module'],
  nuxtZodForm: {},
  devtools: { enabled: true },
  typescript: {
    typeCheck: true,
    strict: true,
  },
})
