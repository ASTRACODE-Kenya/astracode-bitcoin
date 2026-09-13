# astracode-bitcoin

Bitcoin testnet voting infrastructure for the ASTRACODE community.

## Vote addresses

Run once to create the shared testnet addresses (Address A = Yes, Address B = No):

```bash
npm install
npm run generate-addresses
```

This writes `addresses.json`. Commit that file so the docs guide and community use the same addresses.

## Tally votes

After voters send small testnet BTC to Address A or Address B:

```bash
npm run tally
```

The script queries the [Mempool.space testnet API](https://mempool.space/testnet/docs/api/rest) and counts incoming micro-transactions (10,000 sats or less) to each vote address.

## Project layout

- `scripts/generate-addresses.js` — creates testnet P2WPKH vote addresses
- `scripts/tally-votes.js` — counts Yes/No votes via Mempool.space
- `addresses.json` — shared vote addresses for the community
