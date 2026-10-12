import { defineStore } from 'pinia';
import api from '@/lib/api';

export const useMemberStore = defineStore('member', {
  state: () => ({
    members: {} as Record<string, any[]>,
    invitations: {} as Record<string, any[]>,
    loading: false,
    invitationsLoading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchMembers(orgId: string, force = false) {
      if (!orgId) return;
      
      if (!force && this.members[orgId]) {
        return this.members[orgId];
      }

      this.loading = true;
      this.error = null;
      try {
        const response = await api.get(`/organizations/${orgId}/members`);
        this.members[orgId] = response.data;
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.error || 'Failed to fetch members';
        console.error('Failed to fetch members:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchInvitations(orgId: string, force = false) {
      if (!orgId) return;

      if (!force && this.invitations[orgId]) {
        return this.invitations[orgId];
      }

      this.invitationsLoading = true;
      try {
        const response = await api.get(`/organizations/${orgId}/invitations`);
        this.invitations[orgId] = response.data;
        return response.data;
      } catch (err: any) {
        console.error('Failed to fetch invitations:', err);
        throw err;
      } finally {
        this.invitationsLoading = false;
      }
    },

    clearCache() {
      this.members = {};
      this.invitations = {};
    }
  },
});
