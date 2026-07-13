/**
 * Runtime type-safe translation keys.
 *
 * Generated manually to match the `vi.json` reference locale. Used as
 * `t(keyof typeof TKey | (string & {}))` so both autocomplete AND free-form
 * strings (for new keys added in other locales) work.
 *
 * The leading `as const` makes each entry a literal type so IDEs surface the
 * exact list of valid dotted paths.
 */
export const TKey = {
  common: {
    close: "common.close",
    cancel: "common.cancel",
    save: "common.save",
    buy: "common.buy",
    saving: "common.saving",
    saved: "common.saved",
    error: "common.error",
    errorRetry: "common.errorRetry",
    tryAgain: "common.tryAgain",
    loading: "common.loading",
    back: "common.back",
    exit: "common.exit",
    next: "common.next",
    done: "common.done",
    confirm: "common.confirm",
    ok: "common.ok",
    yes: "common.yes",
    no: "common.no",
    points: "common.points",
    exp: "common.exp",
    rank: "common.rank",
    rankOf: "common.rankOf",
    you: "common.you",
    noData: "common.noData",
    connectionError: "common.connectionError",
    failed: "common.failed",
  },
} as const;

export type TKeyUnion = (typeof TKey)[keyof typeof TKey][keyof (typeof TKey)[keyof typeof TKey]];