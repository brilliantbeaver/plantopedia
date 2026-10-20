import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { Message } from "@plantopedia/contracts";
import { usePreferences } from "../theme/preferences";
import { messageReferences } from "../features/ask/message-references";
import { PrivatePhoto } from "./PrivatePhoto";
import { AppIcon } from "./AppIcon";
import { Action, Copy } from "./ui";

function Disclosure({
  title,
  expanded,
  onPress,
}: {
  title: string;
  expanded: boolean;
  onPress(): void;
}) {
  const { colors } = usePreferences();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ expanded }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.disclosure,
        {
          borderColor: focused ? colors.primary : colors.border,
          borderWidth: focused ? 2 : 1,
          backgroundColor: pressed ? colors.muted : colors.surface,
        },
      ]}
    >
      <AppIcon
        name={expanded ? "chevron-down" : "chevron-forward"}
        size={18}
        color={colors.primary}
      />
      <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>
        {title}
      </Text>
    </Pressable>
  );
}

export function MessageContent({
  message,
  onOpenPlant,
}: {
  message: Message;
  onOpenPlant(plantId: string): void;
}) {
  const { t, colors } = usePreferences();
  const [expanded, setExpanded] = useState(false);
  const [technical, setTechnical] = useState(false);
  const { text, photos, plants, sources } = messageReferences(
    message,
    t("referencePhoto"),
  );
  const plantsWithoutPhotos = plants.filter(
    (id) => !photos.some((photo) => photo.plantId === id),
  );
  const count = photos.length + plantsWithoutPhotos.length + sources.length;
  const links = sources.flatMap((source) => {
    try {
      const url = new URL(source.url);
      return ["http:", "https:"].includes(url.protocol)
        ? [{ ...source, host: url.hostname.replace(/^www\./, "") }]
        : [];
    } catch {
      return [];
    }
  });
  return (
    <View style={styles.content}>
      <Copy>
        {message.role === "user"
          ? text
          : text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <Text key={index} style={{ fontWeight: "700" }}>
                  {part.slice(2, -2)}
                </Text>
              ) : (
                part
              ),
            )}
      </Copy>
      {links.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {links.map((source, index) => (
            <Pressable
              key={source.url}
              accessibilityRole="link"
              accessibilityLabel={source.title}
              onPress={() => {
                void Linking.openURL(source.url);
              }}
              style={styles.disclosure}
            >
              <Text
                style={{
                  color: colors.primary,
                  textDecorationLine: "underline",
                  fontSize: 14,
                }}
              >
                {`[${index + 1}] ${source.host}`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {count > 0 && (
        <Disclosure
          title={`${t("responseReferences")} · ${count}`}
          expanded={expanded}
          onPress={() => {
            setExpanded(!expanded);
            setTechnical(false);
          }}
        />
      )}
      {expanded && (
        <View style={[styles.references, { borderColor: colors.border }]}>
          {photos.map((photo) => (
            <View
              key={`${photo.plantId}/${photo.photoId}`}
              style={styles.content}
            >
              <Copy muted>{photo.label}</Copy>
              <PrivatePhoto
                plantId={photo.plantId}
                photoId={photo.photoId}
                resizeMode="contain"
              />
              <Action
                secondary
                title={t("details")}
                onPress={() => onOpenPlant(photo.plantId)}
              />
            </View>
          ))}
          {plantsWithoutPhotos.map((id) => (
            <Action
              key={id}
              secondary
              title={t("details")}
              onPress={() => onOpenPlant(id)}
            />
          ))}
          {sources.map((source) => (
            <Action
              key={source.url}
              secondary
              title={source.title}
              onPress={() => {
                if (/^https?:\/\//.test(source.url))
                  void Linking.openURL(source.url);
              }}
            />
          ))}
          {plants.length > 0 && (
            <Disclosure
              title={t("technicalDetails")}
              expanded={technical}
              onPress={() => setTechnical(!technical)}
            />
          )}
          {technical && (
            <View style={styles.content}>
              {photos.map((photo) => (
                <View key={`${photo.plantId}/${photo.photoId}`}>
                  <Copy muted>
                    {photo.label} · {t("photoIdentifier")}
                  </Copy>
                  <Text selectable style={{ color: colors.secondary }}>
                    {photo.photoId}
                  </Text>
                </View>
              ))}
              {plants.map((id) => (
                <View key={id}>
                  <Copy muted>{t("plantIdentifier")}</Copy>
                  <Text selectable style={{ color: colors.secondary }}>
                    {id}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  disclosure: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  references: { gap: 16, borderTopWidth: 1, paddingTop: 16 },
});
