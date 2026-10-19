import type { Candidate } from "@plantopedia/contracts";
import { StyleSheet, Text, View } from "react-native";
import { usePreferences } from "../theme/preferences";
import { Card, Action } from "./ui";
export function CandidateCard({
  candidate,
  onSelect,
  busy = false,
  selecting = false,
  top = false,
  current = false,
}: {
  candidate: Candidate;
  onSelect: () => void;
  busy?: boolean;
  selecting?: boolean;
  top?: boolean;
  current?: boolean;
}) {
  const { t, colors, preferences } = usePreferences();
  const score = new Intl.NumberFormat(preferences.locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(candidate.score);
  return (
    <Card
      style={{
        borderColor: top || current ? colors.primary : colors.border,
        gap: 10,
        padding: 16,
      }}
    >
      {(top || current) && (
        <Text style={[candidateStyles.label, { color: colors.primary }]}>
          {current ? `✓ ${t("currentIdentification")}` : t("bestMatch")}
        </Text>
      )}
      <Text style={[candidateStyles.name, { color: colors.text }]}>
        {candidate.commonNames[0] ?? candidate.scientificName}
      </Text>
      {candidate.commonNames.length > 0 && (
        <Text style={[candidateStyles.scientific, { color: colors.secondary }]}>
          {candidate.scientificName}
        </Text>
      )}
      <View style={candidateStyles.scoreRow}>
        <Text style={[candidateStyles.label, { color: colors.secondary }]}>
          {t("confidence")} · Pl@ntNet
        </Text>
        <Text style={[candidateStyles.score, { color: colors.text }]}>
          {score}
        </Text>
      </View>
      <View
        accessible={false}
        style={[candidateStyles.track, { backgroundColor: colors.muted }]}
      >
        <View
          style={{
            height: 4,
            width: `${candidate.score * 100}%`,
            backgroundColor: colors.primary,
            borderRadius: 2,
          }}
        />
      </View>
      <Action
        secondary={!top}
        title={t(current ? "currentIdentification" : "select")}
        accessibilityLabel={`${t(current ? "currentIdentification" : "select")}: ${candidate.scientificName}`}
        disabled={busy || current}
        busy={selecting}
        onPress={onSelect}
      />
    </Card>
  );
}
const candidateStyles = StyleSheet.create({
  label: { fontSize: 13, lineHeight: 20, fontWeight: "500" },
  name: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  scientific: { fontSize: 15, lineHeight: 22, fontStyle: "italic" },
  scoreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  score: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
});
