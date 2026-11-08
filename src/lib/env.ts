function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  token: required('DISCORD_TOKEN'),
  devGuildId: required('DEV_GUILD_ID'),
};
