<script setup lang="ts">
import { ref } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'vue-sonner';
import api from '@/lib/api';
import {
  Search,
  User,
  Mail,
  Building2,
  Share2,
  Calendar,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Hash,
  ExternalLink,
  ChevronRight,
  UserCircle,
} from 'lucide-vue-next';
import { formatDate } from '@/utils/formatters';

const searchQuery = ref('');
const loading = ref(false);
const sharing = ref<Record<string, boolean>>({});
const searchResult = ref<{
  user: any;
  organizations: any[];
} | null>(null);

const handleSearch = async () => {
  if (!searchQuery.value.trim()) return;

  loading.value = true;

  try {
    const { data } = await api.get(`/admin/users/search?query=${encodeURIComponent(searchQuery.value.trim())}`);
    searchResult.value = data;
    toast.success('User retrieved successfully');
  } catch (err: any) {
    console.error('Search error:', err);
    toast.error(err.response?.data?.error || 'User not found');
    searchResult.value = null;
  } finally {
    loading.value = false;
  }
};

const shareData = async (orgId: string) => {
  if (!searchResult.value?.user?.id) return;

  sharing.value[orgId] = true;
  try {
    await api.post(`/admin/organizations/${orgId}/share`, {
      userId: searchResult.value.user.id,
    });
    toast.success('Organization data shared successfully via email');
  } catch (err: any) {
    console.error('Share error:', err);
    toast.error(err.response?.data?.error || 'Failed to share data');
  } finally {
    sharing.value[orgId] = false;
  }
};
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Admin" />

      <main class="flex-1 overflow-y-auto bg-background flex flex-col custom-scrollbar">
        <div class="px-8 pt-4 md:pt-5 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full flex flex-col">
          <!-- Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div class="space-y-1">
              <h1 class="ui-page-title">Admin Panel</h1>
              <p class="ui-page-description">System administration and user management.</p>
            </div>
          </div>

          <!-- Search Card -->
          <Card class="bg-card border-border/50 shrink-0">
            <CardContent class="p-6">
              <div class="flex flex-col lg:flex-row items-center gap-4">
                <div class="relative flex-1 w-full">
                  <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    v-model="searchQuery"
                    placeholder="Search by User ID or Email address..."
                    class="w-full pl-10 h-11 bg-muted/20 border-border focus:border-primary rounded-xl"
                    @keyup.enter="handleSearch"
                  />
                </div>
                <Button
                  @click="handleSearch"
                  :disabled="loading"
                  class="h-11 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] w-full lg:w-auto"
                >
                  <Loader2 v-if="loading" class="w-4 h-4 animate-spin mr-2" />
                  {{ loading ? 'Searching...' : 'Search User' }}
                </Button>
              </div>
            </CardContent>
          </Card>

          <!-- Main Display Area -->
          <div class="flex-1 min-h-0">
            <!-- Results State -->
            <div v-if="searchResult && !loading" class="h-full animate-in fade-in duration-500">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-stretch">
                <!-- User Details Card -->
                <Card class="lg:col-span-1 bg-card border-border/50 overflow-hidden flex flex-col">
                  <CardContent class="p-0 flex-1 flex flex-col">
                    <div class="p-8 flex flex-col items-center text-center space-y-4 shrink-0">
                      <div
                        class="w-28 h-28 rounded-4xl bg-muted border border-border flex items-center justify-center overflow-hidden relative"
                      >
                        <img
                          v-if="searchResult.user.profile_picture"
                          :src="searchResult.user.profile_picture"
                          class="w-full h-full object-cover"
                        />
                        <UserCircle v-else class="w-12 h-12 text-muted-foreground/30" />
                      </div>
                      <div>
                        <h2 class="text-2xl font-bold text-foreground tracking-tight">
                          {{ searchResult.user.name || searchResult.user.full_name || 'Anonymous' }}
                        </h2>
                        <p
                          class="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1.5 flex items-center justify-center gap-1.5"
                        >
                          <ShieldCheck class="w-3.5 h-3.5" />
                          {{ searchResult.user.email }}
                        </p>
                      </div>
                    </div>

                    <div class="flex-1 px-8 py-6 space-y-6 border-t border-border/50">
                      <div class="space-y-1">
                        <p class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          Global Identifier
                        </p>
                        <p
                          class="text-[11px] font-mono font-bold text-foreground break-all bg-muted/30 p-2 rounded-lg border border-border/50"
                        >
                          {{ searchResult.user.id }}
                        </p>
                      </div>

                      <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                          <p class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Member Since
                          </p>
                          <p class="text-xs font-bold text-foreground">{{ formatDate(searchResult.user.createdAt) }}</p>
                        </div>
                        <div class="space-y-1">
                          <p class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Organizations
                          </p>
                          <p class="text-xs font-bold text-foreground">
                            {{ searchResult.organizations.length }} connected
                          </p>
                        </div>
                      </div>

                      <div class="space-y-1 pt-2">
                        <p class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          Verification Status
                        </p>
                        <div class="flex items-center gap-2">
                          <span
                            class="w-2 h-2 rounded-full"
                            :class="searchResult.user.emailVerified ? 'bg-success' : 'bg-warning'"
                          ></span>
                          <span class="text-xs font-bold">{{
                            searchResult.user.emailVerified ? 'Email verified' : 'Email verification pending'
                          }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="p-6 bg-muted/5 border-t border-border/50">
                      <p class="text-[10px] text-muted-foreground font-medium italic text-center">
                        User profiles are managed at the global account level.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <!-- Organizations Table Card -->
                <Card class="lg:col-span-2 bg-card border-border/50 overflow-hidden flex flex-col">
                  <div
                    class="px-6 py-5 border-b border-border/50 bg-muted/10 flex items-center justify-between shrink-0"
                  >
                    <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                      Associated Organizations
                    </h3>
                    <span
                      class="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold border border-primary/20"
                    >
                      {{ searchResult.organizations.length }} Results
                    </span>
                  </div>
                  <div class="flex-1 overflow-y-auto custom-scrollbar">
                    <table class="w-full text-left">
                      <thead class="sticky top-0 z-10 bg-card border-b border-border/50">
                        <tr class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/5">
                          <th class="py-4 px-6">Organization</th>
                          <th class="py-4 px-6">Role</th>
                          <th class="py-4 px-6">Joined Date</th>
                          <th class="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border/20">
                        <tr
                          v-for="org in searchResult.organizations"
                          :key="org.id"
                          class="hover:bg-muted/10 transition-colors group"
                        >
                          <td class="py-4 px-6">
                            <div class="flex items-center gap-4">
                              <div
                                class="w-10 h-10 rounded-xl bg-muted border border-border/50 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-primary/30 transition-colors"
                              >
                                <img v-if="org.logo_url" :src="org.logo_url" class="w-full h-full object-cover" />
                                <Building2 v-else class="w-5 h-5 text-muted-foreground/40" />
                              </div>
                              <div>
                                <p class="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                  {{ org.name }}
                                </p>
                                <div class="flex items-center gap-1.5">
                                  <span
                                    v-if="org.is_deleted"
                                    class="text-[9px] font-bold text-destructive uppercase tracking-widest"
                                    >Deleted</span
                                  >
                                  <span v-else class="text-[9px] font-bold text-success uppercase tracking-widest"
                                    >Active</span
                                  >
                                </div>
                              </div>
                            </div>
                          </td>
                          <td class="py-4 px-6">
                            <span
                              class="px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider border border-border bg-muted/40 group-hover:bg-accent transition-colors"
                            >
                              {{ org.role }}
                            </span>
                          </td>
                          <td class="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {{ formatDate(org.joined_at) }}
                          </td>
                          <td class="py-4 px-6 text-right">
                            <Button
                              @click="shareData(org.id)"
                              :disabled="sharing[org.id]"
                              variant="ghost"
                              size="sm"
                              class="h-9 px-4 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-primary hover:text-primary-foreground transition-all"
                            >
                              <Loader2 v-if="sharing[org.id]" class="w-3 h-3 animate-spin mr-2" />
                              <Share2 v-else class="w-3 h-3 mr-2" />
                              {{ sharing[org.id] ? 'Sharing...' : 'Share Data' }}
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>

            <!-- Loading or Empty State -->
            <div
              v-else
              class="flex-1 h-full flex flex-col items-center justify-center py-20 animate-in fade-in duration-500"
            >
              <div
                class="w-16 h-16 rounded-2xl bg-muted/20 border border-border/50 flex items-center justify-center mb-6"
              >
                <Loader2 v-if="loading" class="w-6 h-6 text-primary animate-spin" />
                <Search v-else class="w-6 h-6 text-muted-foreground/40" />
              </div>

              <template v-if="loading">
                <h3 class="text-xl font-bold text-foreground tracking-tight">Querying system records</h3>
                <p class="text-sm text-muted-foreground max-w-xs text-center mt-2 font-medium">
                  Please wait while we fetch the account and organization details.
                </p>
              </template>
              <template v-else>
                <h3 class="text-xl font-bold text-foreground tracking-tight">Search for a user</h3>
                <p class="text-sm text-muted-foreground max-w-xs text-center mt-2 font-medium">
                  Enter a user's email address or unique ID in the search bar above to view their details and
                  organizations.
                </p>
              </template>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: var(--muted-foreground);
}
</style>
