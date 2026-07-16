# 🫙 Tithe Jar

**Set aside your tithe as you earn. Give it when you're ready. Remember every gift — forever.**

Tithe Jar is an onchain giving tool. The moment income comes in, you can put a
portion aside into your own jar. When you're ready, you give it to a cause or a
person, with an optional memo. Every gift is written to the chain as a permanent,
public record that no one — not even you — can quietly rewrite.

Built for the **Monad Spark** hackathon, live on **Monad testnet**.

**Contract:** [`0xD80E5C218f5520c5BF9495d960c2dBad6040BEdC`](https://testnet.monadexplorer.com/address/0xD80E5C218f5520c5BF9495d960c2dBad6040BEdC)

---

## Why this exists

I give a portion of what I earn, and I always wanted two things a bank account
never gave me:

1. **A place to actually set it aside** the moment money arrives, so it isn't
   spent by accident before it's given.
2. **An honest, permanent record** of what was given — not a spreadsheet I can
   edit later, but something the chain keeps for good.

That's the whole idea. The jar holds what you've set apart. The ledger remembers
what you poured out. The chain makes both honest.

> "Bring the whole tithe into the storehouse." — Malachi 3:10

---

## How it works

- **Set aside** — send MON into your personal jar (`jarBalance[msg.sender]`).
  Nothing leaves your control; it's just earmarked.
- **Give** — pour any amount from your jar to a recipient with a memo. It
  transfers the MON and records a `Gift` onchain.
- **Give now** — skip the jar and give directly in one transaction.
- **Withdraw** — changed your mind? Reclaim anything still sitting in your jar.
- **Remember** — every gift is stored in an append-only array and emitted as a
  `Given` event. Your personal ledger and a public "record of giving" feed both
  read straight from the chain.

There are no admins, no owner, no upgradeable proxy, and no fees. The contract
holds only what givers have set aside, and only a giver can move their own funds.

---

## Contract

`contracts/src/TitheJar.sol` — Solidity `^0.8.24`.

| Function | What it does |
|---|---|
| `setAside()` payable | Add `msg.value` to your jar |
| `give(recipient, amount, memo)` | Send `amount` from your jar + record the gift |
| `giveNow(recipient, memo)` payable | Give `msg.value` directly + record the gift |
| `withdraw(amount)` | Reclaim from your jar back to yourself |
| `giftsOf(giver)` / `recentGifts(n)` | Read the ledger |

Safety:
- **Checks-effects-interactions** + a custom `nonReentrant` guard on every
  function that moves value.
- No `delegatecall`, no `selfdestruct`, no owner privileges.
- Funds are partitioned per-giver; the contract can never pay out more than a
  giver set aside.

Tested with Foundry — **9/9 passing**, including a reentrancy-attacker test:

```bash
cd contracts
forge test -vvv
```

---

## App

`web/` — Next.js (App Router) + wagmi + viem. Connect an injected wallet
(MetaMask) on Monad testnet, then set aside, give, and watch the jar fill and
pour. Includes a small "what's a tithe?" calculator (10 / 15 / 20 %).

```bash
cd web
npm install
# after deploying, put the address in web/.env.local:
#   NEXT_PUBLIC_TITHE_JAR_ADDRESS=0x...
npm run dev
```

---

## Deploy to Monad testnet

```bash
cd contracts
export PATH="$PATH:/home/mute/.config/.foundry/bin"
# .env holds PRIVATE_KEY (gitignored) and MONAD_RPC
forge script script/Deploy.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast
```

Then copy the deployed address into `web/.env.local`.

| | |
|---|---|
| Chain | Monad Testnet (`10143`) |
| RPC | `https://testnet-rpc.monad.xyz` |
| Explorer | `https://testnet.monadexplorer.com` |
| Faucet | `https://faucet.monad.xyz` |

---

## Repo layout

```
tithe-jar/
├── contracts/          Foundry project
│   ├── src/TitheJar.sol
│   ├── test/TitheJar.t.sol
│   └── script/Deploy.s.sol
└── web/                Next.js app
    ├── app/            page, layout, providers, styles
    └── lib/            wagmi config, contract ABI + address
```

---

Built solo by **Zaphh Tech** ([@Zaphh](https://twitter.com/Zaphh)) for Monad Spark.
