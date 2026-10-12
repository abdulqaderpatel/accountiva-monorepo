import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { formatCurrency, isFeatureEnabled } from '@accountiva/shared';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function MainScreen() {
  const sampleFormatted = formatCurrency(12500, 'INR');
  const invoicesEnabled = isFeatureEnabled('invoices');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Accountiva Mobile</Text>
        <Text style={styles.subtitle}>Unified Accounting Platform</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            Invoice Feature: {invoicesEnabled ? 'Active (Invoice-Only MVP)' : 'Disabled'}
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Sample Revenue</Text>
          <Text style={styles.statValue}>{sampleFormatted}</Text>
        </View>

        <Text style={styles.infoText}>
          Connected to @accountiva/shared & @accountiva/api with TanStack Query.
        </Text>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainScreen />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22c55e',
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
  },
  badgeText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  statBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  infoText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
