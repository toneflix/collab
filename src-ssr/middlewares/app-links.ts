import { defineSsrMiddleware } from "#q-app";

/**
 * Serves the files that let the Android and iOS apps open this site's links
 * (App Links and Universal Links). Each is only served once its build
 * variable is set: VITE_ANDROID_CERT_FINGERPRINTS (comma-separated SHA-256
 * fingerprints of the app signing keys) and VITE_IOS_TEAM_ID.
 */
class AppLinks {
  static readonly appId = "com.toneflix.music.app";

  static fingerprints(): string[] {
    return String(import.meta.env.VITE_ANDROID_CERT_FINGERPRINTS || "")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
  }

  static assetLinks() {
    return [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: AppLinks.appId,
          sha256_cert_fingerprints: AppLinks.fingerprints()
        }
      }
    ];
  }

  static appleAppSiteAssociation(teamId: string) {
    return {
      applinks: {
        details: [{ appIDs: [`${teamId}.${AppLinks.appId}`], components: [{ "/": "/*" }] }]
      }
    };
  }
}

export default defineSsrMiddleware(({ app }) => {
  app.get("/.well-known/assetlinks.json", (_req, res, next) => {
    if (!AppLinks.fingerprints().length) return next();

    res.json(AppLinks.assetLinks());
  });

  app.get(["/.well-known/apple-app-site-association", "/apple-app-site-association"], (_req, res, next) => {
    const teamId = String(import.meta.env.VITE_IOS_TEAM_ID || "").trim();

    if (!teamId) return next();

    res.json(AppLinks.appleAppSiteAssociation(teamId));
  });
});
