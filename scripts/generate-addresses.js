import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const outputPath = path.join(rootDir, "addresses.json");

const network = bitcoin.networks.testnet;
const ECPair = ECPairFactory(ecc);

function createVoteAddress(label) {
  const keyPair = ECPair.makeRandom({
    rng: (size) => crypto.randomBytes(size),
    network,
  });

  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(keyPair.publicKey),
    network,
  });

  if (!address) {
    throw new Error(`Failed to generate address for ${label}`);
  }

  return {
    label,
    address,
    purpose: label === "A" ? "Yes" : "No",
  };
}

const addresses = {
  network: "testnet",
  generatedAt: new Date().toISOString(),
  voteAddresses: {
    A: createVoteAddress("A"),
    B: createVoteAddress("B"),
  },
};

fs.writeFileSync(outputPath, `${JSON.stringify(addresses, null, 2)}\n`, "utf8");

console.log("Generated testnet vote addresses:");
console.log(`  Address A (Yes): ${addresses.voteAddresses.A.address}`);
console.log(`  Address B (No):  ${addresses.voteAddresses.B.address}`);
console.log(`\nSaved to ${outputPath}`);
