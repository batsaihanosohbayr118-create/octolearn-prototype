import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameIcon } from '@/components/GameIcon';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useToast } from '@/components/feedback/useToast';
import { AppText, Column, IconBadge, ProgressBar } from '@/components/ui';
import { WeeklyChart } from '@/components/WeeklyChart';
import { courseData } from '@/domain/course';
import { getCourseStats, getLevel, getStreak, getTotalXp, getWeeklyXp } from '@/domain/progress';
import { useProgress, useProgressStore } from '@/store/progressStore';
import { cardShadow, colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme';

interface StatTileProps {
  badge: ReactNode;
  value: string;
  label: string;
  testID: string;
}

function StatTile({ badge, value, label, testID }: StatTileProps) {
  return (
    <View style={styles.tile}>
      {badge}
      <AppText testID={testID} variant="title" style={styles.tileValue}>
        {value}
      </AppText>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const progress = useProgress();
  const reset = useProgressStore((state) => state.reset);
  const { show, toast } = useToast();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const { name, avatarUrl } = courseData.user;
  const stats = useMemo(() => getCourseStats(courseData, progress), [progress]);
  const totalXp = getTotalXp(progress);
  const { level, xpIntoLevel, xpPerLevel } = getLevel(totalXp);
  const now = new Date();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Column>
        <ScrollView testID="profile-scroll" contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} accessibilityLabel={name} style={styles.avatar} />
              ) : (
                <View accessibilityLabel={name} style={styles.avatar}>
                  <AppText variant="title" color={colors.primaryDark}>
                    {name.charAt(0)}
                  </AppText>
                </View>
              )}
              <View style={styles.heroName}>
                <AppText variant="title" color={colors.onColor} numberOfLines={1}>
                  {name}
                </AppText>
                <AppText testID="profile-level" variant="caption" color={colors.onColor}>
                  Түвшин {level}
                </AppText>
              </View>
              <View style={styles.heroXp}>
                <View style={styles.heroXpValue}>
                  <GameIcon name="bolt" size={22} />
                  <AppText testID="stat-xp" variant="title" color={colors.onColor}>
                    {totalXp}
                  </AppText>
                </View>
                <AppText variant="caption" color={colors.onColor}>
                  Нийт XP
                </AppText>
              </View>
            </View>
            <View style={styles.levelRow}>
              <AppText variant="caption" color={colors.onColor}>
                Дараагийн түвшин
              </AppText>
              <AppText variant="caption" color={colors.onColor}>
                {xpIntoLevel} / {xpPerLevel} XP
              </AppText>
            </View>
            <ProgressBar
              value={xpIntoLevel / xpPerLevel}
              height={8}
              color={colors.onColor}
              trackColor="rgba(255, 255, 255, 0.3)"
            />
          </View>

          <View style={styles.card}>
            <View style={styles.levelRow}>
              <AppText variant="heading">Курсийн ахиц</AppText>
              <AppText testID="profile-percent" variant="heading">
                {stats.percent}%
              </AppText>
            </View>
            <ProgressBar value={stats.percent / 100} height={10} />
          </View>

          <View style={styles.grid}>
            <StatTile
              testID="stat-streak"
              badge={
                <View style={[styles.artBadge, { backgroundColor: colors.flameTint }]}>
                  <GameIcon name="flame" size={26} />
                </View>
              }
              value={String(getStreak(progress.xpByDay, now))}
              label="Өдрийн цуваа"
            />
            <StatTile
              testID="stat-lessons"
              badge={
                <IconBadge icon="play" color={colors.primaryDark} background={colors.primaryTint} size={36} />
              }
              value={`${stats.lessonsDone} / ${stats.lessonsTotal}`}
              label="Дууссан хичээл"
            />
            <StatTile
              testID="stat-quizzes"
              badge={
                <View style={[styles.artBadge, { backgroundColor: colors.goldTint }]}>
                  <GameIcon name="trophy" size={26} />
                </View>
              }
              value={`${stats.quizzesPassed} / ${stats.quizzesTotal}`}
              label="Тэнцсэн шалгалт"
            />
            <StatTile
              testID="stat-average"
              badge={
                <View style={[styles.artBadge, { backgroundColor: colors.goldTint }]}>
                  <GameIcon name="medal" size={26} />
                </View>
              }
              value={stats.averageQuizPercent === null ? '—' : `${stats.averageQuizPercent}%`}
              label="Шалгалтын дундаж"
            />
          </View>

          <View style={styles.card}>
            <WeeklyChart days={getWeeklyXp(progress.xpByDay, now)} />
          </View>

          <Pressable
            testID="reset-button"
            accessibilityRole="button"
            accessibilityLabel="Ахиц дахин эхлүүлэх"
            onPress={() => setConfirmingReset(true)}
            style={styles.resetButton}
          >
            <Ionicons name="refresh" size={18} color={colors.inkMuted} />
            <AppText variant="caption">Ахиц дахин эхлүүлэх</AppText>
          </Pressable>
        </ScrollView>
        {toast}
      </Column>

      <ConfirmDialog
        visible={confirmingReset}
        title="Ахицаа устгах уу?"
        message="Бүх хичээл, шалгалт, XP устаж, эхнээс нь эхэлнэ."
        cancelLabel="Болих"
        confirmLabel="Тийм, устгах"
        onCancel={() => setConfirmingReset(false)}
        onConfirm={() => {
          reset();
          setConfirmingReset(false);
          show('Ахиц дахин эхэллээ', 'checkmark-circle');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...cardShadow,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  heroName: {
    flex: 1,
  },
  heroXp: {
    alignItems: 'flex-end',
  },
  heroXpValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...cardShadow,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 2,
    ...cardShadow,
  },
  artBadge: {
    width: 36,
    height: 36,
    borderRadius: 11.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: {
    marginTop: spacing.sm,
  },
  resetButton: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
