import { useState } from "react";
import { useClerk } from "@clerk/expo";
import { Action, Feedback } from "../../components/ui";
import { usePreferences } from "../../theme/preferences";

export function SignIn() {
  const clerk = useClerk();
  const { t } = usePreferences();
  const [error, setError] = useState<unknown>(null);
  return (
    <>
      <Action
        title={t("signIn")}
        onPress={() => {
          setError(null);
          try {
            clerk.openSignIn({ withSignUp: true });
          } catch (error) {
            setError(error);
          }
        }}
      />
      <Feedback error={error} />
    </>
  );
}
