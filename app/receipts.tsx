import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSession } from '../context/SessionContext';
import { API_BASE_URL } from '../utils/api';

type ReceiptRecord = {
  id?: number;
  store?: string;
  storeName?: string;
  date?: string;
  receiptDate?: string;
  purchaseDate?: string;
  total?: number;
  totalAmount?: number;
};

type GroupingMode = 'month' | 'week' | 'quarter';

const groupingOptions: { key: GroupingMode; label: string }[] = [
  { key: 'month', label: '1か月' },
  { key: 'week', label: '1週間' },
  { key: 'quarter', label: '3か月' },
];

const getReceiptDateValue = (receipt: ReceiptRecord) =>
  receipt.date ?? receipt.receiptDate ?? receipt.purchaseDate ?? '';

const parseReceiptDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
    2,
    '0'
  )}`;

const getWeekRangeLabel = (date: Date) => {
  const dayOfWeek = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatDate(start)}〜${formatDate(end)}`;
};

const getQuarterLabel = (date: Date) => {
  const quarterStart = Math.floor(date.getMonth() / 3) * 3;
  return `${date.getFullYear()}年${quarterStart + 1}〜${quarterStart + 3}月`;
};

const getMonthLabel = (date: Date) => `${date.getFullYear()}年${date.getMonth() + 1}月`;

const groupReceipts = (receipts: ReceiptRecord[], mode: GroupingMode) => {
  const groups = new Map<string, { title: string; data: ReceiptRecord[] }>();

  receipts.forEach((receipt) => {
    const dateValue = getReceiptDateValue(receipt);
    const parsed = parseReceiptDate(dateValue);
    if (!parsed) return;

    let title = '';
    switch (mode) {
      case 'week':
        title = getWeekRangeLabel(parsed);
        break;
      case 'quarter':
        title = getQuarterLabel(parsed);
        break;
      default:
        title = getMonthLabel(parsed);
    }

    const key = `${mode}-${title}`;
    if (!groups.has(key)) {
      groups.set(key, { title, data: [] });
    }
    groups.get(key)?.data.push(receipt);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    data: group.data.sort((a, b) => {
      const aDate = parseReceiptDate(getReceiptDateValue(a))?.getTime() ?? 0;
      const bDate = parseReceiptDate(getReceiptDateValue(b))?.getTime() ?? 0;
      return bDate - aDate;
    }),
  }));
};

export default function ReceiptsScreen() {
  const { user } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('month');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));

  const fetchReceipts = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ useId: user.id }),
      });

      if (!response.ok) {
        throw new Error(`Receipt API error: ${response.status}`);
      }

      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.receipts)
          ? data.receipts
          : Array.isArray(data?.data)
            ? data.data
            : [];
      setReceipts(list);
    } catch (error) {
      console.error('レシート取得エラー:', error);
      setErrorMessage('レシートの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchReceipts();
    }
  }, [user, fetchReceipts]);

  const groupedReceipts = useMemo(() => {
    const validReceipts = receipts
      .map((receipt) => ({
        ...receipt,
        date: getReceiptDateValue(receipt),
      }))
      .filter((receipt) => !!parseReceiptDate(receipt.date ?? ''));

    const sorted = [...validReceipts].sort((a, b) => {
      const aDate = parseReceiptDate(getReceiptDateValue(a))?.getTime() ?? 0;
      const bDate = parseReceiptDate(getReceiptDateValue(b))?.getTime() ?? 0;
      return bDate - aDate;
    });
    return groupReceipts(sorted, groupingMode);
  }, [receipts, groupingMode]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = new Date(year, month, 1).getDay();
    const days: Array<number | null> = [];

    for (let i = 0; i < startWeekday; i += 1) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(day);
    }
    return days;
  }, [calendarMonth]);

  const selectedReceipts = useMemo(() => {
    return receipts
      .filter((receipt) => {
        const parsed = parseReceiptDate(getReceiptDateValue(receipt));
        if (!parsed) return false;
        return formatDate(parsed) === selectedDate;
      })
      .sort((a, b) => {
        const aDate = parseReceiptDate(getReceiptDateValue(a))?.getTime() ?? 0;
        const bDate = parseReceiptDate(getReceiptDateValue(b))?.getTime() ?? 0;
        return bDate - aDate;
      });
  }, [receipts, selectedDate]);

  const handleMonthChange = (direction: -1 | 1) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  const formatTotal = (receipt: ReceiptRecord) => {
    const totalValue = receipt.total ?? receipt.totalAmount ?? 0;
    return `${Number(totalValue).toLocaleString()}円`;
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>ログインが必要です。</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>登録レシート一覧</Text>
        <Pressable style={styles.refreshButton} onPress={fetchReceipts}>
          <Text style={styles.refreshText}>更新</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>年月日でソートし、期間ごとにリスト表示します。</Text>

      <View style={styles.toggleRow}>
        {groupingOptions.map((option) => (
          <Pressable
            key={option.key}
            style={[
              styles.toggleButton,
              groupingMode === option.key && styles.toggleButtonActive,
            ]}
            onPress={() => setGroupingMode(option.key)}
          >
            <Text
              style={[
                styles.toggleButtonText,
                groupingMode === option.key && styles.toggleButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.calendarToggle, showCalendar && styles.calendarToggleActive]}
        onPress={() => setShowCalendar((prev) => !prev)}
      >
        <Text style={[styles.calendarToggleText, showCalendar && styles.calendarToggleTextActive]}>
          {showCalendar ? 'リスト表示に戻る' : 'カレンダー表示'}
        </Text>
      </Pressable>

      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>レシート取得中...</Text>
        </View>
      )}

      {!isLoading && errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      {!isLoading && !showCalendar && (
        <SectionList
          sections={groupedReceipts}
          keyExtractor={(item, index) => `${item.id ?? getReceiptDateValue(item)}-${index}`}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.cardTitle}>{item.store ?? item.storeName ?? '店舗名未登録'}</Text>
                <Text style={styles.cardSubtitle}>{getReceiptDateValue(item)}</Text>
              </View>
              <Text style={styles.cardAmount}>{formatTotal(item)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>レシートがありません。</Text>}
          contentContainerStyle={styles.listContent}
        />
      )}

      {!isLoading && showCalendar && (
        <ScrollView contentContainerStyle={styles.calendarContent}>
          <View style={styles.calendarHeader}>
            <Pressable style={styles.calendarNav} onPress={() => handleMonthChange(-1)}>
              <Text style={styles.calendarNavText}>◀</Text>
            </Pressable>
            <Text style={styles.calendarTitle}>
              {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月
            </Text>
            <Pressable style={styles.calendarNav} onPress={() => handleMonthChange(1)}>
              <Text style={styles.calendarNavText}>▶</Text>
            </Pressable>
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              if (!day) {
                return <View key={`empty-${index}`} style={styles.calendarCell} />;
              }
              const dateValue = formatDate(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
              );
              const isSelected = dateValue === selectedDate;
              return (
                <Pressable
                  key={`day-${day}`}
                  style={[styles.calendarCell, isSelected && styles.calendarCellActive]}
                  onPress={() => setSelectedDate(dateValue)}
                >
                  <Text style={[styles.calendarCellText, isSelected && styles.calendarCellTextActive]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.selectedList}>
            <Text style={styles.selectedTitle}>{selectedDate} のレシート</Text>
            {selectedReceipts.length === 0 && <Text style={styles.emptyText}>レシートがありません。</Text>}
            {selectedReceipts.map((receipt, index) => (
              <View key={`${receipt.id ?? index}`} style={styles.card}>
                <View>
                  <Text style={styles.cardTitle}>{receipt.store ?? receipt.storeName ?? '店舗名未登録'}</Text>
                  <Text style={styles.cardSubtitle}>{getReceiptDateValue(receipt)}</Text>
                </View>
                <Text style={styles.cardAmount}>{formatTotal(receipt)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F4F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
  },
  refreshButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
  },
  refreshText: {
    color: '#4338CA',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4F46E5',
  },
  toggleButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  calendarToggle: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calendarToggleActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  calendarToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
  },
  calendarToggleTextActive: {
    color: '#FFFFFF',
  },
  loading: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#4338CA',
  },
  errorText: {
    marginTop: 12,
    color: '#DC2626',
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  emptyText: {
    marginTop: 20,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContent: {
    paddingBottom: 24,
  },
  calendarHeader: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  calendarNav: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  calendarNavText: {
    color: '#4338CA',
    fontSize: 14,
  },
  calendarGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 4,
  },
  calendarCellActive: {
    backgroundColor: '#4F46E5',
  },
  calendarCellText: {
    fontSize: 12,
    color: '#374151',
  },
  calendarCellTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  selectedList: {
    marginTop: 16,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
});
