/* eslint-disable no-console */
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin(() => {
  const precFetch = $fetch.create({
    onResponseError: (response) => {
      console.log('onResponseError', response)
    },
  })

  return {
    provide: { precFetch },
  }
})
