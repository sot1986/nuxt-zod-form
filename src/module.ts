import { addImports, addPlugin, addServerImports, createResolver, defineNuxtModule } from '@nuxt/kit'
import { defu } from 'defu'

// Module options TypeScript interface definition
export interface ModuleOptions {
  /** base validation timeout, @default 1500 ms */
  validationTimeout: number
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-zod-form',
    configKey: 'nuxtZodForm',
    compatibility: {
      nuxt: '^3.0.0',
    },
  },
  // Default configuration options of the Nuxt module
  defaults: {
    validationTimeout: 1500,
  },
  setup(options, nuxt) {
    nuxt.options.runtimeConfig.public.nuxtZodForm = defu(
      nuxt.options.runtimeConfig.public.nuxtZodForm as Partial<ModuleOptions>,
      {
        validationTimeout: options.validationTimeout,
      },
    )

    const resolver = createResolver(import.meta.url)

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))

    addServerImports([
      {
        from: resolver.resolve('./runtime/definePrecognitiveEventHandler'),
        name: 'definePrecognitiveEventHandler',
      },
    ])

    addImports({
      name: 'useForm',
      from: resolver.resolve('./runtime/useForm'),
      as: 'useForm',
    })
  },
})
