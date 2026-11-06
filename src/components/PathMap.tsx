import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { courseData } from '@/domain/course';
import { computePathLayout, segmentPath, UNIT_HEADER_HEIGHT, type LayoutNode } from '@/domain/pathLayout';
import type { ItemStatus, PathItem, Unit } from '@/domain/types';
import { useAnimatedValue } from '@/lib/useAnimatedValue';
import { colors, fonts, radius, spacing, useNativeDriver } from '@/theme';

import { AppText, type IconName } from './ui';

const LESSON_SIZE = 72;
const QUIZ_SIZE = 64; // Rotated 45°, so its diagonal is about 90.
const CAPTION_WIDTH = 190;
const LIP = 6;

const lessonPalette: Record<ItemStatus, { face: string; lip: string; icon: IconName }> = {
  completed: { face: colors.success, lip: colors.successDark, icon: 'checkmark' },
  active: { face: colors.primary, lip: colors.primaryDark, icon: 'play' },
  locked: { face: colors.locked, lip: colors.lockedDark, icon: 'lock-closed' },
};

const quizPalette: Record<ItemStatus, { face: string; lip: string; icon: IconName }> = {
  completed: { face: colors.gold, lip: colors.goldDark, icon: 'trophy' },
  active: { face: colors.primary, lip: colors.primaryDark, icon: 'star' },
  locked: { face: colors.locked, lip: colors.lockedDark, icon: 'star' },
};

const statusLabels: Record<ItemStatus, string> = {
  completed: 'дууссан',
  active: 'идэвхтэй',
  locked: 'түгжээтэй',
};

function itemTitle(item: PathItem): string {
  return item.kind === 'lesson' ? item.lesson.title : 'Шалгалт';
}

function PulseRing({ shape }: { shape: 'circle' | 'diamond' }) {
  const pulse = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        shape === 'circle' ? styles.lessonShape : styles.quizShape,
        styles.ring,
        {
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
          transform: [
            { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) },
            ...(shape === 'diamond' ? [{ rotate: '45deg' }] : []),
          ],
        },
      ]}
    />
  );
}

function PathNode({ item, status, onPress }: { item: PathItem; status: ItemStatus; onPress: () => void }) {
  const isQuiz = item.kind === 'quiz';
  const palette = isQuiz ? quizPalette[status] : lessonPalette[status];
  const shape = isQuiz ? styles.quizShape : styles.lessonShape;
  const rotation = isQuiz ? [{ rotate: '45deg' }] : [];

  // A pop when a stop gets unlocked while the screen is mounted.
  const pop = useAnimatedValue(1);
  const previousStatus = useRef(status);
  useEffect(() => {
    if (previousStatus.current === 'locked' && status === 'active') {
      pop.setValue(0.6);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 110, useNativeDriver }).start();
    }
    previousStatus.current = status;
  }, [pop, status]);

  return (
    <Animated.View style={{ transform: [{ scale: pop }] }}>
      <Pressable
        testID={`node-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${itemTitle(item)}, ${statusLabels[status]}`}
        onPress={onPress}
        style={styles.nodeHit}
      >
        {({ pressed }) => (
          <>
            {status === 'active' ? <PulseRing shape={isQuiz ? 'diamond' : 'circle'} /> : null}
            <View style={[shape, { backgroundColor: palette.lip, transform: [{ translateY: LIP }, ...rotation] }]} />
            <View
              style={[
                shape,
                styles.nodeFace,
                { backgroundColor: palette.face, transform: [{ translateY: pressed ? LIP - 2 : 0 }, ...rotation] },
              ]}
            />
            <View pointerEvents="none" style={[styles.nodeIcon, { transform: [{ translateY: pressed ? LIP - 2 : 0 }] }]}>
              <Ionicons
                name={palette.icon}
                size={status === 'locked' && !isQuiz ? 26 : 34}
                color={status === 'locked' ? colors.lockedInk : colors.onColor}
              />
            </View>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

function ActiveBubble({ title }: { title: string }) {
  const bob = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver }),
        Animated.timing(bob, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  return (
    <Animated.View
      style={[
        styles.bubble,
        { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }] },
      ]}
    >
      <AppText numberOfLines={1} variant="caption" color={colors.onColor} style={styles.bubbleText}>
        {title}
      </AppText>
    </Animated.View>
  );
}

function UnitHeader({ unit, statuses, top }: { unit: Unit; statuses: Record<string, ItemStatus>; top: number }) {
  const ids = [...unit.lessons.map((lesson) => lesson.id), unit.quiz.id];
  const done = ids.filter((id) => statuses[id] === 'completed').length;
  const isOpen = ids.some((id) => statuses[id] !== 'locked');
  const isDone = done === ids.length;

  const background = !isOpen ? colors.locked : isDone ? colors.success : colors.primary;
  const foreground = isOpen ? colors.onColor : colors.ink;
  const subtitle = unit.comingSoon
    ? 'Тун удахгүй нээгдэнэ'
    : isDone
      ? 'Бүлэг дууссан'
      : `${done} / ${ids.length} алхам дууссан`;

  return (
    <View testID={`unit-${unit.id}`} style={[styles.unitHeader, { top, backgroundColor: background }]}>
      <View style={styles.unitText}>
        <AppText numberOfLines={1} variant="heading" color={foreground}>
          {unit.title}
        </AppText>
        <AppText numberOfLines={1} variant="caption" color={foreground}>
          {subtitle}
        </AppText>
      </View>
      <Ionicons
        name={!isOpen ? 'lock-closed' : isDone ? 'checkmark-circle' : 'book'}
        size={28}
        color={foreground}
      />
    </View>
  );
}

function NodeCaption({ node, status, width }: { node: LayoutNode; status: ItemStatus; width: number }) {
  // Clamped so a stop at the edge of the zigzag can't push its caption off a narrow screen.
  const left = Math.min(Math.max(node.x - CAPTION_WIDTH / 2, spacing.sm), width - CAPTION_WIDTH - spacing.sm);
  const top = node.y + LESSON_SIZE / 2 + (node.item.kind === 'quiz' ? 14 : 10);
  return (
    <View pointerEvents="none" style={[styles.caption, { left, top }]}>
      {status === 'active' ? (
        <ActiveBubble title={itemTitle(node.item)} />
      ) : (
        <AppText
          numberOfLines={1}
          variant="caption"
          color={status === 'locked' ? colors.lockedInk : colors.ink}
          style={styles.captionText}
        >
          {itemTitle(node.item)}
        </AppText>
      )}
    </View>
  );
}

type PathMapProps = {
  layout: ReturnType<typeof computePathLayout>;
  width: number;
  statuses: Record<string, ItemStatus>;
  onPressItem: (item: PathItem) => void;
};

export function PathMap({ layout, width, statuses, onPressItem }: PathMapProps) {
  return (
    <View style={{ width, height: layout.height }}>
      <Svg width={width} height={layout.height} style={StyleSheet.absoluteFill}>
        {layout.nodes.slice(0, -1).map((node, index) => (
          <Path
            key={node.item.id}
            d={segmentPath(node, layout.nodes[index + 1])}
            stroke={statuses[node.item.id] === 'completed' ? colors.primarySoft : colors.track}
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </Svg>

      {layout.headers.map((header) => {
        const unit = courseData.units.find(({ id }) => id === header.unitId);
        return unit ? <UnitHeader key={unit.id} unit={unit} statuses={statuses} top={header.y} /> : null;
      })}

      {layout.nodes.map((node) => (
        <View key={node.item.id} style={[styles.nodePosition, { left: node.x - 48, top: node.y - 48 }]}>
          <PathNode item={node.item} status={statuses[node.item.id]} onPress={() => onPressItem(node.item)} />
        </View>
      ))}

      {layout.nodes.map((node) => (
        <NodeCaption key={node.item.id} node={node} status={statuses[node.item.id]} width={width} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nodePosition: { position: 'absolute', width: 96, height: 96 },
  nodeHit: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  lessonShape: { position: 'absolute', width: LESSON_SIZE, height: LESSON_SIZE, borderRadius: LESSON_SIZE / 2 },
  quizShape: { position: 'absolute', width: QUIZ_SIZE, height: QUIZ_SIZE, borderRadius: radius.md },
  nodeFace: { alignItems: 'center', justifyContent: 'center' },
  nodeIcon: { position: 'absolute' },
  ring: { backgroundColor: colors.primary },
  caption: { position: 'absolute', width: CAPTION_WIDTH, alignItems: 'center' },
  // The page colour behind the text keeps it readable where the path passes underneath.
  captionText: {
    textAlign: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  bubble: {
    maxWidth: CAPTION_WIDTH,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  bubbleText: { fontFamily: fonts.heavy, textAlign: 'center' },
  unitHeader: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    height: UNIT_HEADER_HEIGHT,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  unitText: { flex: 1, gap: 2 },
});
