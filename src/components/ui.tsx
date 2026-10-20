import {
  useEffect,
  useState,
  useContext,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import {
  SafeAreaView,
  SafeAreaInsetsContext,
} from "react-native-safe-area-context";
import { usePreferences } from "../theme/preferences";
import { useReducedMotion } from "../theme/use-reduced-motion";
import { navigationLayout } from "../theme/navigation-layout";
import { AppIcon, IconBadge, type IconName } from "./AppIcon";

export function Screen({
  children,
  scrollRef,
}: {
  children: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const { colors } = usePreferences();
  const { width, fontScale } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext);
  const navigation = navigationLayout(
    width,
    fontScale,
    insets?.left,
    insets?.right,
  );
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.canvas }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.screen,
            {
              paddingBottom:
                navigation.height + Math.max(insets?.bottom ?? 0, 10) + 32,
            },
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Copy({
  children,
  large = false,
  muted = false,
}: {
  children: ReactNode;
  large?: boolean;
  muted?: boolean;
}) {
  const { colors } = usePreferences();
  return (
    <Text
      accessibilityRole={large ? "header" : undefined}
      style={[
        { color: muted ? colors.secondary : colors.text },
        large ? styles.heading : styles.copy,
      ]}
    >
      {children}
    </Text>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = usePreferences();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Action({
  title,
  onPress,
  secondary = false,
  disabled = false,
  busy = false,
  accessibilityLabel,
  icon,
  destructive = false,
  compact = false,
  selected,
  style,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
  icon?: IconName | undefined;
  destructive?: boolean;
  compact?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = usePreferences();
  const [focused, setFocused] = useState(false);
  const ink = destructive
    ? colors.danger
    : secondary
      ? colors.text
      : colors.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{
        disabled: disabled || busy,
        busy,
        ...(selected !== undefined ? { selected } : {}),
      }}
      disabled={disabled || busy}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compactButton,
        {
          opacity: disabled || busy ? 0.55 : pressed ? 0.8 : 1,
          backgroundColor: destructive
            ? colors.surface
            : secondary
              ? colors.muted
              : colors.primary,
          borderColor:
            focused || selected
              ? colors.primary
              : destructive
                ? colors.danger
                : "transparent",
          transform: [{ scale: pressed ? 0.98 : 1 }],
          ...(focused && Platform.OS === "web"
            ? {
                outlineColor: colors.primary,
                outlineStyle: "solid" as const,
                outlineWidth: 2,
                outlineOffset: 3,
              }
            : {}),
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={ink} size="small" />
      ) : icon ? (
        <AppIcon name={icon} size={21} color={ink} />
      ) : null}
      <Text style={[styles.buttonText, { color: ink }]}>{title}</Text>
    </Pressable>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  expanded,
}: {
  icon: IconName;
  label: string;
  onPress(): void;
  disabled?: boolean;
  expanded?: boolean;
}) {
  const { colors } = usePreferences();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled,
        ...(expanded !== undefined ? { expanded } : {}),
      }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: colors.surface,
          borderColor: focused ? colors.primary : colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <AppIcon name={icon} size={24} color={colors.primary} />
    </Pressable>
  );
}
export function Chip({
  title,
  selected = false,
  icon,
  onPress,
  disabled = false,
}: {
  title: string;
  selected?: boolean;
  icon?: IconName | undefined;
  onPress(): void;
  disabled?: boolean;
}) {
  return (
    <Action
      title={title}
      icon={icon}
      secondary={!selected}
      selected={selected}
      onPress={onPress}
      disabled={disabled}
      compact
    />
  );
}
export function Field({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  const { colors } = usePreferences();
  const [focused, setFocused] = useState(false);
  const input = (
    <TextInput
      {...props}
      accessibilityLabel={
        props.accessibilityLabel ?? label ?? props.placeholder
      }
      placeholderTextColor={colors.secondary}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      style={[
        styles.field,
        {
          color: colors.text,
          borderColor: focused ? colors.primary : colors.border,
          backgroundColor: colors.surface,
        },
        props.style,
      ]}
    />
  );
  return label ? (
    <View style={{ gap: 7 }}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {input}
    </View>
  ) : (
    input
  );
}
export function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  const { colors } = usePreferences();
  return (
    <View style={styles.sectionHeader}>
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: colors.text }]}
      >
        {title}
      </Text>
      {action && onPress ? (
        <Action
          secondary
          compact
          title={action}
          icon="arrow-forward"
          onPress={onPress}
        />
      ) : null}
    </View>
  );
}
function Reveal({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [value] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: 180,
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, value]);
  return (
    <Animated.View
      style={{
        gap: 12,
        opacity: value,
        transform: [
          {
            translateY: value.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
export function Disclosure({
  title,
  summary,
  icon = "information-circle-outline",
  children,
  initiallyOpen = false,
  open,
  onChange,
}: {
  title: string;
  summary?: string;
  icon?: IconName | undefined;
  children: ReactNode;
  initiallyOpen?: boolean;
  open?: boolean;
  onChange?(open: boolean): void;
}) {
  const { colors } = usePreferences();
  const [localOpen, setLocalOpen] = useState(initiallyOpen);
  const [focused, setFocused] = useState(false);
  const expanded = open ?? localOpen;
  return (
    <View style={{ gap: expanded ? 12 : 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        onPress={() => {
          setLocalOpen(!expanded);
          onChange?.(!expanded);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed }) => [
          styles.disclosure,
          {
            borderColor: focused ? colors.primary : "transparent",
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <AppIcon name={icon} size={22} color={colors.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.label, { color: colors.text }]}>{title}</Text>
          {summary && !expanded ? (
            <Text style={[styles.small, { color: colors.secondary }]}>
              {summary}
            </Text>
          ) : null}
        </View>
        <AppIcon
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.secondary}
        />
      </Pressable>
      {expanded ? <Reveal>{children}</Reveal> : null}
    </View>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: string;
  onPress?(): void;
}) {
  return (
    <Card style={{ alignItems: "center", paddingVertical: 28 }}>
      <IconBadge name={icon} size={64} />
      <SectionHeader title={title} />
      <Copy muted>{description}</Copy>
      {action && onPress ? (
        <Action
          title={action}
          icon="arrow-forward"
          onPress={onPress}
          style={{ alignSelf: "stretch" }}
        />
      ) : null}
    </Card>
  );
}
export function Feedback({
  error,
  loading,
}: {
  error?: unknown;
  loading?: boolean;
}) {
  const { t, colors } = usePreferences();
  return loading ? (
    <View style={styles.inline}>
      <ActivityIndicator
        accessibilityLabel={t("loading")}
        color={colors.primary}
      />
      <Copy muted>{t("loading")}</Copy>
    </View>
  ) : error ? (
    <View accessibilityLiveRegion="polite" style={styles.inline}>
      <AppIcon name="alert-circle-outline" color={colors.danger} />
      <View style={{ flex: 1 }}>
        <Copy>{t("error")}</Copy>
      </View>
    </View>
  ) : null;
}
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
  destructive = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel(): void;
  onConfirm(): Promise<unknown>;
  destructive?: boolean;
}) {
  const { colors, t } = usePreferences();
  const reducedMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const cancel = () => {
    setError(null);
    onCancel();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? "none" : "fade"}
      onRequestClose={() => {
        if (!busy) cancel();
      }}
    >
      <View style={styles.scrim}>
        <View
          accessibilityViewIsModal
          style={[
            styles.dialog,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <AppIcon
            name={destructive ? "trash-outline" : "help-circle-outline"}
            size={30}
            color={destructive ? colors.danger : colors.primary}
          />
          <ScrollView>
            <Copy large>{title}</Copy>
            <Copy>{message}</Copy>
          </ScrollView>
          <Feedback error={error} />
          <Action
            title={confirmLabel}
            destructive={destructive}
            busy={busy}
            onPress={() => {
              setBusy(true);
              setError(null);
              void onConfirm()
                .then(onCancel)
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          />
          <Action
            secondary
            title={t("cancel")}
            disabled={busy}
            onPress={cancel}
          />
        </View>
      </View>
    </Modal>
  );
}
export const styles = StyleSheet.create({
  screen: {
    padding: 20,
    gap: 18,
    paddingBottom: 140,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  heading: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 37,
    letterSpacing: -0.6,
  },
  copy: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  card: { borderWidth: 1, borderRadius: 26, padding: 20, gap: 12 },
  button: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 2,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  compactButton: {
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },
  iconButton: {
    minHeight: 48,
    minWidth: 48,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    minHeight: 52,
    borderWidth: 2,
    borderRadius: 18,
    padding: 14,
    fontSize: 16,
    lineHeight: 23,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inline: { flexDirection: "row", gap: 10, alignItems: "center" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "700",
    flexShrink: 1,
  },
  disclosure: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  photo: { width: "100%", height: 260, borderRadius: 24 },
  scrim: {
    flex: 1,
    backgroundColor: "rgba(7,20,13,0.48)",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "85%",
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    gap: 16,
  },
});
