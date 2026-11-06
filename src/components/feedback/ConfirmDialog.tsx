import { Modal, StyleSheet, View } from 'react-native';

import { AppText, GameButton } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal transparent statusBarTranslucent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <AppText variant="title" style={styles.centered}>
            {title}
          </AppText>
          <AppText color={colors.inkMuted} style={styles.centered}>
            {message}
          </AppText>
          <View style={styles.actions}>
            <GameButton testID="confirm-cancel" label={cancelLabel} onPress={onCancel} />
            <GameButton testID="confirm-ok" variant="secondary" label={confirmLabel} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  centered: {
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
