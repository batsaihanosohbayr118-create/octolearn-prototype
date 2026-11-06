import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog, useToast } from '@/components/overlays';
import { AppText, Column, GameButton, ProgressBar, type IconName } from '@/components/ui';
import { WeeklyChart } from '@/components/WeeklyChart';
import { courseData } from '@/domain/course';
import { getCourseStats, getLevel, getStreak, getTotalXp, getWeeklyXp } from '@/domain/progress';
import { useProgress, useProgressStore } from '@/store/progressStore';
import { colors, radius, spacing } from '@/theme';

function StatTile({ icon, iconColor, value, label, testID }: {
  icon: IconName;
  iconColor: string;
  value: string;
  label: string;
  testID: string;
}) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={22} color={iconColor} />
      <AppText testID={testID} variant="title">
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
          <View style={styles.identity}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} accessibilityLabel={name} style={styles.avatar} />
            ) : (
              <View accessibilityLabel={name} style={styles.avatar}>
                <AppText variant="title" color={colors.onColor}>
                  {name.charAt(0)}
                </AppText>
              </View>
            )}
            <View style={styles.identityText}>
              <AppText variant="title">{name}</AppText>
              <View style={styles.levelRow}>
                <AppText testID="profile-level" variant="caption" color={colors.primaryDark}>
                  Түвшин {level}
                </AppText>
                <AppText variant="caption">
                  {xpIntoLevel} / {xpPerLevel} XP
                </AppText>
              </View>
              <ProgressBar value={xpIntoLevel / xpPerLevel} height={8} />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.levelRow}>
              <AppText variant="heading">Курсийн ахиц</AppText>
              <AppText testID="profile-percent" variant="heading">
                {stats.percent}%
              </AppText>
            </View>
            <ProgressBar value={stats.percent / 100} />
          </View>

          <View style={styles.grid}>
            <StatTile testID="stat-xp" icon="flash" iconColor={colors.goldDark} value={String(totalXp)} label="Нийт XP" />
            <StatTile
              testID="stat-streak"
              icon="flame"
              iconColor={colors.flame}
              value={String(getStreak(progress.xpByDay, now))}
              label="Өдрийн цуваа"
            />
            <StatTile
              testID="stat-lessons"
              icon="play-circle"
              iconColor={colors.primary}
              value={`${stats.lessonsDone} / ${stats.lessonsTotal}`}
              label="Дууссан хичээл"
            />
            <StatTile
              testID="stat-quizzes"
              icon="trophy"
              iconColor={colors.goldDark}
              value={`${stats.quizzesPassed} / ${stats.quizzesTotal}`}
              label="Тэнцсэн шалгалт"
            />
            <StatTile
              testID="stat-average"
              icon="ribbon"
              iconColor={colors.success}
              value={stats.averageQuizPercent === null ? '—' : `${stats.averageQuizPercent}%`}
              label="Шалгалтын дундаж"
            />
          </View>

          <View style={styles.card}>
            <WeeklyChart days={getWeeklyXp(progress.xpByDay, now)} />
          </View>

          <GameButton
            testID="reset-button"
            variant="secondary"
            icon="refresh"
            label="Ахиц дахин эхлүүлэх"
            onPress={() => setConfirmingReset(true)}
          />
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
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: 4 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 2,
  },
});
