import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LayoutDashboard, FileText, Plus, Users, Settings } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/typography';

export type ScreenType = 'dashboard' | 'items' | 'invoices' | 'create_invoice' | 'customers' | 'settings';

interface BottomNavProps {
  currentScreen: ScreenType;
  onSelectScreen: (screen: ScreenType) => void;
}

export function BottomNav({ currentScreen, onSelectScreen }: BottomNavProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      {/* Home / Dashboard */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectScreen('dashboard')}
        activeOpacity={0.7}
      >
        <LayoutDashboard
          size={20}
          color={currentScreen === 'dashboard' ? colors.foreground : colors.mutedForeground}
        />
        <Text
          style={[
            styles.label,
            {
              color: currentScreen === 'dashboard' ? colors.foreground : colors.mutedForeground,
              fontWeight: currentScreen === 'dashboard' ? '700' : '500',
            },
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* Invoices */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectScreen('invoices')}
        activeOpacity={0.7}
      >
        <FileText
          size={20}
          color={currentScreen === 'invoices' ? colors.foreground : colors.mutedForeground}
        />
        <Text
          style={[
            styles.label,
            {
              color: currentScreen === 'invoices' ? colors.foreground : colors.mutedForeground,
              fontWeight: currentScreen === 'invoices' ? '700' : '500',
            },
          ]}
        >
          Invoices
        </Text>
      </TouchableOpacity>

      {/* Center + CTA */}
      <TouchableOpacity
        style={[
          styles.centerButton,
          {
            backgroundColor: colors.primary,
            borderColor: colors.background,
          },
        ]}
        onPress={() => onSelectScreen('create_invoice')}
        activeOpacity={0.8}
      >
        <Plus size={24} color={colors.primaryForeground} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Customers */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectScreen('customers')}
        activeOpacity={0.7}
      >
        <Users
          size={20}
          color={currentScreen === 'customers' ? colors.foreground : colors.mutedForeground}
        />
        <Text
          style={[
            styles.label,
            {
              color: currentScreen === 'customers' ? colors.foreground : colors.mutedForeground,
              fontWeight: currentScreen === 'customers' ? '700' : '500',
            },
          ]}
        >
          Customers
        </Text>
      </TouchableOpacity>

      {/* Settings */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectScreen('settings')}
        activeOpacity={0.7}
      >
        <Settings
          size={20}
          color={currentScreen === 'settings' ? colors.foreground : colors.mutedForeground}
        />
        <Text
          style={[
            styles.label,
            {
              color: currentScreen === 'settings' ? colors.foreground : colors.mutedForeground,
              fontWeight: currentScreen === 'settings' ? '700' : '500',
            },
          ]}
        >
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 64,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: fonts.semiBold,
  },
  centerButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
});

