export const COLORS = {
    good: 0x57f287,
    ok: 0xfee75c,
    bad: 0xed4245,
    pending: 0xe67e22,
} as const;

export function latencyColor(ms: number) {
    if (ms < 300) return COLORS.good; // could probably just not have this here but Okay
    if (ms < 600) return COLORS.ok;
    return COLORS.bad;
}
