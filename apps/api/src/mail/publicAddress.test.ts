import { expect, test } from "vite-plus/test";
import { resolvePublicAddress } from "./publicAddress.ts";

function resolvingTo(...addresses: string[]) {
  return async () =>
    addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
}

test("returns the first address of a public host", async () => {
  const address = await resolvePublicAddress(
    "imap.example.com",
    resolvingTo("93.184.216.34", "2606:2800:220:1::1"),
  );

  expect(address).toBe("93.184.216.34");
});

test.each([
  "0.0.0.0",
  "10.0.0.5",
  "100.64.0.1",
  "127.0.0.1",
  "169.254.169.254",
  "172.16.0.1",
  "192.168.1.1",
  "::1",
  "::ffff:127.0.0.1",
  "::ffff:10.0.0.5",
  "64:ff9b::a00:1",
  "2002:a00:1::",
  "fc00::1",
  "fd12:3456::1",
  "fe80::1",
])("rejects the non-public address %s", async (address) => {
  expect(await resolvePublicAddress("imap.example.com", resolvingTo(address))).toBeUndefined();
});

test("rejects a host when one of its addresses is not public", async () => {
  const address = await resolvePublicAddress(
    "imap.example.com",
    resolvingTo("93.184.216.34", "10.0.0.5"),
  );

  expect(address).toBeUndefined();
});

test("rejects a host without addresses", async () => {
  expect(await resolvePublicAddress("imap.example.com", resolvingTo())).toBeUndefined();
});
