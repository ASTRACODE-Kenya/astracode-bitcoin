import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const addressesPath = path.join(rootDir, "addresses.json");

const MEMPOOL_TESTNET_API = "https://mempool.space/testnet/api";
const MAX_VOTE_SATS = 10_000;

function loadAddresses() {
  if (!fs.existsSync(addressesPath)) {
    throw new Error(
      "addresses.json not found. Run `npm run generate-addresses` first.",
    );
  }

  const data = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  const yesAddress = data.voteAddresses?.A?.address;
  const noAddress = data.voteAddresses?.B?.address;

  if (!yesAddress || !noAddress) {
    throw new Error("addresses.json is missing Address A or Address B.");
  }

  return { yesAddress, noAddress };
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Mempool API error ${response.status} for ${url}`);
  }

  return response.json();
}

async function fetchAllTransactions(address) {
  const confirmed = await fetchJson(
    `${MEMPOOL_TESTNET_API}/address/${address}/txs`,
  );
  const mempool = await fetchJson(
    `${MEMPOOL_TESTNET_API}/address/${address}/txs/mempool`,
  );

  const seen = new Set();
  const transactions = [];

  for (const tx of [...confirmed, ...mempool]) {
    if (!seen.has(tx.txid)) {
      seen.add(tx.txid);
      transactions.push(tx);
    }
  }

  return transactions;
}

function countIncomingMicroVotes(transactions, address) {
  let votes = 0;

  for (const tx of transactions) {
    const incomingSats = tx.vout
      .filter((output) => output.scriptpubkey_address === address)
      .reduce((sum, output) => sum + output.value, 0);

    if (incomingSats > 0 && incomingSats <= MAX_VOTE_SATS) {
      votes += 1;
    }
  }

  return votes;
}

async function tallyAddress(address, label, purpose) {
  const transactions = await fetchAllTransactions(address);
  const votes = countIncomingMicroVotes(transactions, address);

  return {
    label,
    purpose,
    address,
    votes,
    transactionsSeen: transactions.length,
  };
}

async function main() {
  const { yesAddress, noAddress } = loadAddresses();

  console.log("Tallying Bitcoin testnet UTXO votes via Mempool.space...\n");

  const [yes, no] = await Promise.all([
    tallyAddress(yesAddress, "A", "Yes"),
    tallyAddress(noAddress, "B", "No"),
  ]);

  const totalVotes = yes.votes + no.votes;

  console.log("Vote addresses");
  console.log(`  Address A (Yes): ${yes.address}`);
  console.log(`  Address B (No):  ${no.address}`);
  console.log("");
  console.log("Results");
  console.log(`  Yes votes: ${yes.votes}`);
  console.log(`  No votes:  ${no.votes}`);
  console.log(`  Total:     ${totalVotes}`);

  if (totalVotes > 0) {
    const yesPct = ((yes.votes / totalVotes) * 100).toFixed(1);
    const noPct = ((no.votes / totalVotes) * 100).toFixed(1);
    console.log(`  Yes share: ${yesPct}%`);
    console.log(`  No share:  ${noPct}%`);
  }

  console.log("");
  console.log(
    `Note: counts incoming transactions of ${MAX_VOTE_SATS} sats or less as one vote.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
