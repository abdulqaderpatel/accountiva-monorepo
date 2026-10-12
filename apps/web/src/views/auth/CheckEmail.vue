<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, ArrowLeft } from 'lucide-vue-next'
import { useAccountivaLogo } from '@/composables/useAccountivaLogo'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const { accountivaLogoSrc } = useAccountivaLogo()
</script>

<template>
 <div class="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8">
 <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,var(--color-primary-foreground),var(--background))] opacity-20 -z-10"></div>
 
<!-- Branding -->
 <div class="mb-10 flex items-center gap-3 group cursor-default">
 <div class="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 ">
 <img :src="accountivaLogoSrc" alt="Accountiva Logo">
 </div>
 <h1 class="text-2xl font-bold tracking-tight text-foreground">Accountiva™</h1>
 </div>

 <Card class="w-full max-w-md shrink-0 border-border/60 bg-card/70 text-foreground shadow-none backdrop-blur-xl">
 <CardHeader class="space-y-4 flex flex-col items-center">
 <div class="p-4 rounded-full bg-primary/10 border border-primary/20">
 <Mail class="h-10 w-10 text-primary" />
 </div>
 <div class="text-center">
 <CardTitle class="text-3xl font-bold tracking-tight">Check your email</CardTitle>
 <CardDescription class="text-sm text-muted-foreground mt-2">
 We've sent a verification link to your email address. 
 </CardDescription>
 </div>
 </CardHeader>
 
 <CardContent class="text-center space-y-4">
 <p class="text-sm text-muted-foreground">
 Please click on the link in the email to confirm your account. If you don't see the email, check your spam folder.
 </p>
 </CardContent>
 
 <CardFooter>
 <Button 
 variant="ghost" 
 class="w-full text-muted-foreground hover:text-foreground "
 @click="router.push({ path: '/login', query: { email: route.query.email, redirect: route.query.redirect } })"
 >
 <ArrowLeft class="mr-2 h-4 w-4" />
 Back to login
 </Button>
 </CardFooter>
 </Card>
 </div>
</template>
