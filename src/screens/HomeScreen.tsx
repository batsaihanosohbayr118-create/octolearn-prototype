import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameIcon } from '@/components/GameIcon';
import { OctoMark } from '@/components/OctoMark';
import { useToast } from '@/components/feedback/useToast';
import { PathMap } from '@/components/path/PathMap';
import { AppText, Column, ProgressBar } from '@/components/ui';
import { courseData, pathItems } from '@/domain/course';
import { computePathLayout } from '@/domain/pathLayout';
import { getCourseStats, getItemStatuses, getStreak, getTotalXp } from '@/domain/progress';
import type { PathItem } from '@/domain/types';
import { useProgress } from '@/store/progressStore';
import { colors, radius, spacing } from '@/theme';

const [subject, level] = courseData.course.title.split(' — ');
const PROGRESS_ANIMATION_DELAY_MS = 350; // Дэлгэц шилжих үед явц өсөхийг харуулах хугацаа

function lockedMessage(item: PathItem): string {
  if (item.unit.comingSoon) return 'Энэ бүлэг тун удахгүй нээгдэнэ';
  if (item.kind === 'quiz') return 'Бүлгийн 5 хичээлийг дуусгасны дараа шалгалт нээгдэнэ';
  return 'Өмнөх хичээлээ эхлээд дуусгана уу';
}

interface StatPillProps {
  icon: ReactNode;
  testID: string;
  background: string;
  value: string;
  label: string;
}

function StatPill({ icon, testID, background, value, label }: StatPillProps) {
  return (
    <View accessibilityLabel={label} style={[styles.pill, { backgroundColor: background }]}>
      {icon}
      <AppText variant="heading" testID={testID}>
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

  // Идэвхтэй хичээлийг дэлгэцийн харагдах хэсэгт авчрах
  useFocusEffect(
    useCallback(() => {
      if (activeY === undefined || !viewportHeight) return;
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, activeY - viewportHeight * 0.42), animated: true });
      }, 250);
      return () => clearTimeout(timer);
    }, [activeY, viewportHeight]),
  );

  // Явцын хувийг шинэчлэх анимаци
  const [barPercent, setBarPercent] = useState(stats.percent);
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => setBarPercent(stats.percent), PROGRESS_ANIMATION_DELAY_MS);
      return () => clearTimeout(timer);
    }, [stats.percent]),
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
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topBarInner}>
          <View style={styles.topRow}>
            <OctoMark />
            <View style={styles.courseTitle}>
              <AppText numberOfLines={1} variant="heading">
                {subject}
              </AppText>
              {level !== undefined && (
                <AppText numberOfLines={1} variant="caption">
                  {level}
                </AppText>
              )}
            </View>
            <StatPill
              testID="pill-flame"
              icon={<GameIcon name="flame" size={22} />}
              background={colors.flameTint}
              value={String(streak)}
              label={`${streak} өдрийн цуваа`}
            />
            <StatPill
              testID="pill-flash"
              icon={<GameIcon name="bolt" size={22} />}
              background={colors.goldTint}
              value={String(totalXp)}
              label={`Нийт ${totalXp} XP`}
            />
          </View>

          <View style={styles.summaryRow}>
            <AppText testID="course-summary" variant="caption">
              {stats.lessonsDone} / {stats.lessonsTotal} хичээл · {stats.quizzesPassed} / {stats.quizzesTotal}{' '}
              шалгалт
            </AppText>
            <AppText testID="course-percent" variant="caption" color={colors.primaryDark}>
              {stats.percent}%
            </AppText>
          </View>

          <ProgressBar testID="course-progress" value={barPercent / 100} height={10} />
        </View>
      </View>

      {/* Main Body / Path Map */}
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
            {pathItems.length === 0 && (
              <AppText color={colors.inkMuted} style={styles.empty}>
                Одоогоор хичээл байхгүй байна.
              </AppText>
            )}
            {layout && (
              <PathMap layout={layout} width={mapWidth} statuses={statuses} onPressItem={openItem} />
            )}
          </ScrollView>
          {toast}
        </Column>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
  },
  courseTitle: {
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
