import { PrismaClient } from '@prisma/client'

const RETRYABLE_CODES = new Set(['P1001', 'P1008', 'P1017', 'P2024'])

const isTransientError = (error: unknown) => {
  const code = (error as { code?: string })?.code
  if (code && RETRYABLE_CODES.has(code)) return true
  const message = (error as Error)?.message ?? ''
  return (
    message.includes('Pinging has failed') ||
    message.includes('ECONNREFUSED') ||
    message.includes('Connection terminated') ||
    message.includes('terminating connection') ||
    message.includes('Timed out fetching a new connection') ||
    message.includes('TLS connection') ||
    message.includes('unexpected EOF')
  )
}

const prismaClientSingleton = () => {
  const client = new PrismaClient()
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const maxRetries = 3
          for (let attempt = 0; ; attempt++) {
            try {
              return await query(args)
            } catch (error) {
              if (!isTransientError(error) || attempt >= maxRetries) throw error
              await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt))
            }
          }
        },
      },
    },
  })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
