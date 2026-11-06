import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/overlays';
import { PathMap } from '@/components/PathMap';
import { AppText, Column, ProgressBar } from '@/components/ui';
import { courseData, pathItems } from '@/domain/course';
import { computePathLayout } from '@/domain/pathLayout';
import { getCourseStats, getItemStatuses, getStreak, getTotalXp } from '@/domain/progress';
import type { PathItem } from '@/domain/types';
import { useProgress } from '@/store/progressStore';
import { colors, radius, spacing } from '@/theme';

function lockedMessage(item: PathItem): string {
  if (item.unit.comingSoon) return 'Энэ бүлэг тун удахгүй нээгдэнэ';
  if (item.kind === 'quiz') return 'Бүлгийн 5 хичээлийг дуусгасны дараа шалгалт нээгдэнэ';
  return 'Өмнөх хичээлээ эхлээд дуусгана уу';
}

function StatPill({ icon, iconColor, value, label }: {
  icon: 'flash' | 'flame';
  iconColor: string;
  value: string;
  label: string;
}) {
  return (
    <View accessibilityLabel={label} style={styles.pill}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <AppText variant="heading" testID={`pill-${icon}`}>
        {value}
      </AppText>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const progress = useProgress();
  const { show, toast } = useToast();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [mapWidth, setMapWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const statuses = useMemo(() => getItemStatuses(pathItems, progress), [progress]);
  const stats = useMemo(() => getCourseStats(courseData, progress), [progress]);
  const totalXp = getTotalXp(progress);
  const streak = getStreak(progress.xpByDay, new Date());

  const layout = useMemo(() => (mapWidth ? computePathLayout(pathItems, mapWidth) : null), [mapWidth]);
  const activeNode = layout?.nodes.find((node) => statuses[node.item.id] === 'active');
  const activeY = activeNode?.y;

  // Brings the current lesson into view on open and whenever a finished lesson moves it.
  useFocusEffect(
    useCallback(() => {
      if (activeY === undefined || !viewportHeight) return;
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, activeY - viewportHeight * 0.42), animated: true });
      }, 250);
      return () => clearTimeout(timer);
    }, [activeY, viewportHeight]),
  );

  const openItem = (item: PathItem) => {
    if (statuses[item.id] === 'locked') {
      show(lockedMessage(item), 'lock-closed');
      return;
    }
    router.push(item.kind === 'lesson' ? `/lesson/${item.id}` : `/quiz/${item.id}`);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topBarInner}>
          <View style={styles.topRow}>
            <AppText numberOfLines={2} variant="heading" style={styles.courseTitle}>
              {courseData.course.title}
            </AppText>
            <StatPill icon="flame" iconColor={colors.flame} value={String(streak)} label={`${streak} өдрийн цуваа`} />
            <StatPill icon="flash" iconColor={colors.goldDark} value={String(totalXp)} label={`Нийт ${totalXp} XP`} />
          </View>
          <View style={styles.barRow}>
            <ProgressBar testID="course-progress" value={stats.percent / 100} />
            <AppText testID="course-percent" variant="heading" style={styles.percent}>
              {stats.percent}%
            </AppText>
          </View>
          <AppText testID="course-summary" variant="caption">
            {stats.lessonsDone} / {stats.lessonsTotal} хичээл · {stats.quizzesPassed} / {stats.quizzesTotal} шалгалт
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        <Column>
          <ScrollView
            testID="path-scroll"
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            onLayout={(event) => {
              setMapWidth(event.nativeEvent.layout.width);
              setViewportHeight(event.nativeEvent.layout.height);
            }}
          >
            {pathItems.length === 0 ? (
              <AppText color={colors.inkMuted} style={styles.empty}>
                Одоогоор хичээл байхгүй байна.
              </AppText>
            ) : layout ? (
              <PathMap layout={layout} width={mapWidth} statuses={statuses} onPressItem={openItem} />
            ) : null}
          </ScrollView>
          {toast}
        </Column>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  topBarInner: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  courseTitle: { flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  percent: { minWidth: 46, textAlign: 'right' },
  body: { flex: 1 },
  empty: { textAlign: 'center', marginTop: spacing.xxl },
});
