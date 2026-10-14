import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Trash2,
  FileText,
  Users,
  Mail,
  Info,
  AlertCircle,
  CheckCircle2,
  Package,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  NotificationItem,
} from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';

interface NotificationsScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function NotificationsScreen({ onNavigate }: NotificationsScreenProps) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'unread' | 'invitations'>('all');

  const { data: rawNotifications, isLoading, refetch, isRefetching } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const notifications: NotificationItem[] = useMemo(() => {
    if (Array.isArray(rawNotifications)) return rawNotifications;
    return [];
  }, [rawNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.is_read;
      if (filter === 'invitations') return n.category === 'invitation';
      return true;
    });
  }, [notifications, filter]);

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to mark all as read');
    }
  };

  const handleToggleRead = async (item: NotificationItem) => {
    try {
      await markReadMutation.mutateAsync({ id: item.id, isRead: !item.is_read });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update notification');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Notification', 'Remove this notification from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(id);
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete notification');
          }
        },
      },
    ]);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'invoice':
        return <FileText size={16} color={colors.primary} />;
      case 'customer':
        return <Users size={16} color="#0284c7" />;
      case 'item':
        return <Package size={16} color="#7c3aed" />;
      case 'invitation':
        return <Mail size={16} color="#d97706" />;
      default:
        return <Info size={16} color={colors.mutedForeground} />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => onNavigate('dashboard')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={[styles.subtitle, { color: colors.primary }]}>
                {unreadCount} unread update{unreadCount > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            style={[styles.markAllBtn, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}
            activeOpacity={0.7}
          >
            <CheckCheck size={14} color={colors.foreground} style={{ marginRight: 4 }} />
            <Text style={[styles.markAllText, { color: colors.foreground }]}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'unread', 'invitations'] as const).map((key) => {
            const isSelected = filter === key;
            const label =
              key === 'all'
                ? `All (${notifications.length})`
                : key === 'unread'
                ? `Unread (${unreadCount})`
                : 'Invitations';

            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFilter(key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? colors.primaryForeground : colors.foreground,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notifications List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isLoading && !isRefetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Loading notifications...
            </Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filter === 'unread' ? 'All caught up!' : 'No notifications'}
            description={
              filter === 'unread'
                ? 'You have read all updates and alerts across your workspaces.'
                : 'Workspace invitations, invoice status updates, and client activity will appear here.'
            }
            actionLabel="Back to Dashboard"
            onAction={() => onNavigate('dashboard')}
          />
        ) : (
          filteredNotifications.map((n) => (
            <Card
              key={n.id}
              style={[
                styles.itemCard,
                {
                  borderColor: !n.is_read ? colors.primary : colors.border,
                  backgroundColor: !n.is_read ? colors.surfaceSubtle : colors.card,
                },
              ]}
            >
              <View style={styles.itemTop}>
                <View style={styles.itemHeaderLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    {getCategoryIcon(n.category)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.itemTitle,
                          {
                            color: colors.foreground,
                            fontWeight: !n.is_read ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {n.title}
                      </Text>
                      {!n.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>
                      {formatTimeAgo(n.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={() => handleToggleRead(n)}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <CheckCheck size={16} color={!n.is_read ? colors.primary : colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(n.id)}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.itemMessage, { color: colors.mutedForeground }]}>
                {n.message}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 1,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  markAllText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  filterWrapper: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  filterScroll: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 30,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  itemCard: {
    padding: 14,
    gap: 8,
    borderRadius: 12,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemTime: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  itemMessage: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
});
