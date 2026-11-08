import { useState } from "react";
import { View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Chip, Copy, Feedback } from "../../components/ui";
import { usePreferences, designTokens } from "../../theme/preferences";
import { useSessionApi } from "../../services/session";
import { gardenData } from "../../services/garden-data";
export function RegionChoice() {
  const { t } = usePreferences();
  const { owner, api } = useSessionApi();
  const data = useQuery({
    queryKey: [owner, "garden-metadata"],
    queryFn: () => gardenData.read(owner, api),
  });
  const query = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  return (
    <View style={{ gap: designTokens.spacing.small }}>
      <Copy>{t("broadRegion")}</Copy>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: designTokens.spacing.small,
        }}
      >
        {(["us_nc", "other", undefined] as const).map((region) => (
          <Chip
            key={region ?? "skip"}
            title={t(
              region === "us_nc"
                ? "northCarolina"
                : region === "other"
                  ? "otherRegion"
                  : "skipRegion",
            )}
            selected={data.data?.region === region}
            onPress={() =>
              void gardenData
                .update(owner, api, (d) => ({ ...d, region }))
                .then(() =>
                  query.invalidateQueries({
                    queryKey: [owner, "garden-metadata"],
                  }),
                )
                .catch(setError)
            }
          />
        ))}
      </View>
      <Feedback error={data.error ?? error} />
    </View>
  );
}
