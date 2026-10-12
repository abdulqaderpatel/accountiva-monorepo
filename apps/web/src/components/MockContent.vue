<script setup lang="ts">
import { computed } from 'vue';
import { type Module } from '@/composables/usePermissions';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const props = defineProps<{
  module: Module;
}>();

const mockRows = 8;
const mockCols = computed(() => {
  switch (props.module) {
    case 'invoices': return ['Invoice #', 'Customer', 'Date', 'Amount', 'Status'];
    case 'expenses': return ['Date', 'Category', 'Vendor', 'Amount', 'Status'];
    case 'customers': return ['Name', 'Company', 'Email', 'Phone', 'Balance'];
    case 'items': return ['Item Name', 'SKU', 'Description', 'Price', 'Tax'];
    case 'estimates': return ['Estimate #', 'Client', 'Date', 'Amount', 'Expiry'];
    default: return ['Column 1', 'Column 2', 'Column 3', 'Column 4', 'Column 5'];
  }
});

const mockData = computed(() => {
  return Array.from({ length: mockRows }).map((_, i) => ({
    id: i,
    cells: mockCols.value.map(() => '••••••••••')
  }));
});
</script>

<template>
  <div class="p-8 md:p-10 lg:p-12 max-w-7xl mx-auto space-y-8 w-full opacity-40">
    <!-- Mock Header -->
    <div class="flex items-center justify-between">
      <div class="space-y-2">
        <div class="h-8 w-48 bg-muted rounded-lg animate-pulse"></div>
        <div class="h-4 w-64 bg-muted/60 rounded-md animate-pulse"></div>
      </div>
      <div class="h-10 w-32 bg-muted rounded-xl animate-pulse"></div>
    </div>

    <!-- Mock Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card v-for="i in 3" :key="i" class="bg-card border-border/50">
        <CardContent class="p-6 space-y-3">
          <div class="h-3 w-20 bg-muted rounded animate-pulse"></div>
          <div class="h-8 w-32 bg-muted rounded-lg animate-pulse"></div>
          <div class="h-3 w-40 bg-muted/60 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    </div>

    <!-- Mock Table/Grid -->
    <div class="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div class="p-6 flex justify-between gap-6 border-b border-border/50">
        <div class="h-10 flex-1 max-w-md bg-muted/40 rounded-xl animate-pulse"></div>
        <div class="h-10 w-48 bg-muted/40 rounded-xl animate-pulse"></div>
      </div>
      
      <table class="w-full">
        <thead>
          <tr class="bg-muted/5 border-b border-border/50">
            <th v-for="col in mockCols" :key="col" class="py-4 px-6">
              <div class="h-2 w-16 bg-muted rounded animate-pulse"></div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in mockData" :key="row.id" class="border-b border-border/10">
            <td v-for="(cell, idx) in row.cells" :key="idx" class="py-5 px-6">
              <div class="h-3 bg-muted/40 rounded animate-pulse" :style="{ width: `${48 + ((row.id + idx) % 4) * 10}%` }"></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
