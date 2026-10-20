# iOS installation integrity failure

## Confirmed diagnosis, 2026-10-19

The device build `ef9630b5-eaaf-46e6-a63f-3ea411701022` finished at 18:40 PDT. Its embedded ad hoc profile was created at 18:32 and included the registered iPhone (identifier ending `C0401E`). The connected iPad (ending `3B402E`) was registered at 18:50, after that build, and was absent from its profile. EAS independently reported the missing iPad when asked to re-sign the build.

Installing Expo's registration profile collects the device identifier. It does not add that device to the provisioning profile already embedded in a downloaded app. Developer Mode does not bypass device provisioning.

The original IPA was checked locally: deep/strict signature verification passed; bundle ID and signed/profile entitlements matched; the certificate and profile expire in October 2027; it is an iPhoneOS build supporting both iPhone and iPad, with minimum iOS 16.4. The connected iPad runs iPadOS 18.6.2 with Developer Mode enabled. These checks establish a missing-device problem for this iPad. If the originally reported failure was on the included iPhone, its specific installation log is still needed; the iPad finding alone does not explain that case.

## Implemented repair

The existing Apple session and signing certificate were reused. The ad hoc profile was refreshed to include both registered devices, preserving existing access. Re-sign job: `ca05ff8e-603f-40a6-b3dd-a52c73303015`. The re-sign job finished successfully. Its downloaded IPA passes deep/strict signature verification and its embedded profile includes both registered devices. [Install the corrected build](https://expo.dev/accounts/theodoremui/projects/plantopedia/builds/ca05ff8e-603f-40a6-b3dd-a52c73303015); the original IPA remains unchanged.

```bash
npm run ios:resign -- --id <existing-device-build-id> --wait
```

This pins EAS CLI 24.8.0 and explicitly selects the internal `development` target profile. A globally installed EAS 25.x fails this repository's exact version constraint. Do not omit the target profile in a raw re-sign command: EAS can otherwise default to the production/store profile.

When prompted to select devices, include the intended iPhone/iPad. The build must be a physical-device IPA, not a simulator archive. Re-signing updates the provisioning/signature without recompiling app code. It does not require exporting an uncommitted working tree.

## Device verification

The corrected `.app` was installed successfully through `xcrun devicectl` on the connected iPad 9a (iPadOS 18.6.2), then launched successfully. A subsequent installed-app query confirmed `app.plantopedia.companion`, version 0.1.0/build 1. Installation/launch JSON evidence is under ignored `artifacts/ios-install/`. The registered iPhone is included in the signed profile but was not connected, so its installation has not been independently tested. This verifies native installation and launch, not Google login or the full app data flows.

## If installation still fails

1. Confirm the new IPA's embedded device list contains the affected device. Use the new EAS installation link, not the old QR/link.
2. Check profile/certificate expiration, application identifier and entitlement alignment. Never revoke a valid shared distribution certificate merely to troubleshoot one device.
3. If Apple reports a newly registered device as processing, wait for that state to finish, then refresh/re-sign. Apple's documented processing delay may be 24–72 hours for some registrations; it is not a reason to wait when a device is already accepted into the refreshed profile.
4. For a correctly provisioned device, reproduce using Xcode/`devicectl` and inspect the installation error. It distinguishes device-list, entitlement, signature, existing-app identifier, and OS compatibility failures. Avoid deleting an existing working installation without preserving its local data.
5. If the device reports developer trust/network verification failure, use a network that can reach Apple's verification services. Do not disable integrity checking or install unrelated certificates/profiles. A Mac HTTP probe does not establish connectivity from the device.

Private IPA/profile/device details are kept under ignored `artifacts/ios-install/`; full device identifiers and credential artifacts are not committed.

## Sources

- [Expo internal distribution and device provisioning](https://docs.expo.dev/build/internal-distribution/)
- [Expo re-signing an existing build](https://docs.expo.dev/develop/development-builds/share-with-your-team/)
- [Apple installation failure troubleshooting](https://developer.apple.com/library/archive/technotes/tn2319/_index.html)
- [Apple device registration processing](https://developer.apple.com/help/account/reference/device-registration-updates/)
- [Apple developer trust and network verification](https://help.apple.com/xcode/mac/current/en.lproj/dev96a12fb84.html)
