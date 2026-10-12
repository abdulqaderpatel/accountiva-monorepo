<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authClient } from '@/lib/auth-client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle2, XCircle, Mail, ArrowRight } from 'lucide-vue-next'
import { useAccountivaLogo } from '@/composables/useAccountivaLogo'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const { accountivaLogoSrc } = useAccountivaLogo()
const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref('')

const loginQuery = computed(() => ({
  email: route.query.email,
  redirect: route.query.redirect,
}))

onMounted(async () => {
  const token = route.query.token as string
  
  if (!token) {
    status.value = 'error'
    errorMessage.value = 'Verification token is missing.'
    return
  }

  try {
    const { error } = await authClient.verifyEmail({
      query: {
        token: token
      }
    })

    if (error) {
      status.value = 'error'
      errorMessage.value = error.message || 'Failed to verify email.'
      toast.error('Verification failed', {
        description: errorMessage.value
      })
    } else {
      status.value = 'success'
      toast.success('Email verified!', {
        description: 'You can now sign in to your account.'
      })
    }
  } catch (err: any) {
    status.value = 'error'
    errorMessage.value = err.message || 'An unexpected error occurred.'
  }
})
</script>

<template>
  <div class="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--color-primary-foreground),var(--background))] opacity-20 -z-10"></div>
    
    <!-- Branding -->
    <div class="mb-10 flex items-center gap-3 group cursor-default">
      <div class="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110">
        <img :src="accountivaLogoSrc" alt="Accountiva Logo" />
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">Accountiva™</h1>
    </div>

    <Card class="w-full max-w-md shrink-0 border-border/60 bg-card/70 text-foreground shadow-none backdrop-blur-xl">
      <CardHeader class="text-center">
        <div v-if="status === 'loading'" class="flex justify-center mb-4">
          <div class="p-4 rounded-full bg-primary/10 border border-primary/20">
            <Spinner size="lg" />
          </div>
        </div>
        <div v-else-if="status === 'success'" class="flex justify-center mb-4">
          <div class="p-4 rounded-full bg-green-500/10 border border-green-500/20">
            <CheckCircle2 class="h-10 w-10 text-green-500" />
          </div>
        </div>
        <div v-else class="flex justify-center mb-4">
          <div class="p-4 rounded-full bg-destructive/10 border border-destructive/20">
            <XCircle class="h-10 w-10 text-destructive" />
          </div>
        </div>
        
        <CardTitle class="text-2xl font-bold tracking-tight">
          {{ status === 'loading' ? 'Verifying your email' : status === 'success' ? 'Email Verified' : 'Verification Failed' }}
        </CardTitle>
        <CardDescription class="text-sm text-muted-foreground mt-2">
          {{ status === 'loading' ? 'Please wait while we confirm your account...' : status === 'success' ? 'Your email has been successfully verified.' : errorMessage }}
        </CardDescription>
      </CardHeader>

      <CardContent v-if="status === 'error'" class="text-center">
        <p class="text-sm text-muted-foreground">
          The link may have expired or been already used. Please try signing up again or contact support.
        </p>
      </CardContent>

      <CardFooter class="flex flex-col gap-3">
        <Button 
          v-if="status !== 'loading'"
          class="w-full font-bold h-11 rounded-xl group flex items-center justify-center relative overflow-hidden uppercase tracking-widest text-[10px]"
          @click="router.push({ path: '/login', query: loginQuery })"
        >
          <span>{{ status === 'success' ? 'Continue to Login' : 'Back to Login' }}</span>
          <ArrowRight class="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
        <p v-if="status === 'success'" class="text-[10px] text-muted-foreground text-center uppercase tracking-tighter">
          Redirecting you automatically in a few seconds...
        </p>
      </CardFooter>
    </Card>
  </div>
</template>
