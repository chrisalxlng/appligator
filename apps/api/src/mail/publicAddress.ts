import { lookup } from "node:dns/promises";
import { BlockList } from "node:net";

const nonPublicAddresses = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  nonPublicAddresses.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  nonPublicAddresses.addSubnet(network, prefix, "ipv6");
}

export type LookupAddresses = (host: string) => Promise<{ address: string; family: number }[]>;

// IPv4 comes first because the first address is used and not every deployment has IPv6 connectivity.
const lookupAddresses: LookupAddresses = (host) => lookup(host, { all: true, order: "ipv4first" });

function isPublic({ address, family }: { address: string; family: number }) {
  return !nonPublicAddresses.check(address, family === 6 ? "ipv6" : "ipv4");
}

// Users choose the host, so without this check the API could be made to connect to services in its
// own network. A host with a single non-public address is rejected as a whole, and the caller
// connects to the returned address so that the name can't resolve differently afterwards.
export async function resolvePublicAddress(host: string, lookupHost = lookupAddresses) {
  const addresses = await lookupHost(host);
  return addresses.length > 0 && addresses.every(isPublic) ? addresses[0]!.address : undefined;
}
