import console from 'node:console'
import { RegisterSchema } from '../../schemas'

export default definePrecognitiveEventHandler({
  onRequest: async (event) => {
    const body = await readBody(event)

    RegisterSchema.parse(body)
  },
  handler: () => {
    console.log('handler')
  },
})
